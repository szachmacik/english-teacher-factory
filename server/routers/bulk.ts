import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { bulkJobs, projects } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { runProductionPipeline } from "../services/pipeline";

async function processBulkJob(jobId: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  const [job] = await db.select().from(bulkJobs).where(eq(bulkJobs.id, jobId)).limit(1);
  if (!job) return;

  await db.update(bulkJobs).set({ status: "running" }).where(eq(bulkJobs.id, jobId));

  const createdProjectIds: number[] = [];
  let completed = 0;
  let failed = 0;

  for (const item of job.items) {
    try {
      // Create project for this item
      const insertResult = await db.insert(projects).values({
        userId,
        sourceType: item.sourceType as any,
        title: item.title || `Bulk: ${item.value.substring(0, 60)}`,
        status: "pending",
        cefrLevel: job.cefrLevel || "B1",
        targetAge: (job.targetAge as any) || "adults",
        schoolType: (job.schoolType as any) || "language_school",
        lessonGoal: (job.lessonGoal as any) || "general_english",
        teachingStyle: (job.teachingStyle as any) || "communicative",
        // Set source based on type
        ...(item.sourceType === "youtube" ? { youtubeUrl: item.value } :
           item.sourceType === "url" ? { sourceUrl: item.value } :
           item.sourceType === "text" || item.sourceType === "ai_topic" ? { sourceRawText: item.value } :
           { sourceUrl: item.value }),
      });

      const projectId = Number((insertResult as any).insertId);
      createdProjectIds.push(projectId);

      // Run pipeline for this project
      await runProductionPipeline(projectId);
      completed++;

      // Update progress
      await db.update(bulkJobs).set({
        completedItems: completed,
        projectIds: [...createdProjectIds],
      }).where(eq(bulkJobs.id, jobId));

    } catch (err) {
      failed++;
      await db.update(bulkJobs).set({ failedItems: failed }).where(eq(bulkJobs.id, jobId));
      console.error(`[BulkJob ${jobId}] Failed item:`, item.value, err);
    }
  }

  await db.update(bulkJobs).set({
    status: completed > 0 ? "completed" : "error",
    projectIds: createdProjectIds,
    completedItems: completed,
    failedItems: failed,
  }).where(eq(bulkJobs.id, jobId));
}

export const bulkRouter = router({
  create: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      cefrLevel: z.string().optional(),
      targetAge: z.string().optional(),
      schoolType: z.string().optional(),
      lessonGoal: z.string().optional(),
      teachingStyle: z.string().optional(),
      selectedProducts: z.array(z.string()).optional(),
      selectedGames: z.array(z.string()).optional(),
      items: z.array(z.object({
        sourceType: z.string(),
        value: z.string(),
        title: z.string().optional(),
      })).min(1).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const insertResult = await db.insert(bulkJobs).values({
        userId: ctx.user.id,
        title: input.title || `Bulk Job — ${input.items.length} items`,
        cefrLevel: input.cefrLevel,
        targetAge: input.targetAge,
        schoolType: input.schoolType,
        lessonGoal: input.lessonGoal,
        teachingStyle: input.teachingStyle,
        selectedProducts: input.selectedProducts || [],
        selectedGames: input.selectedGames || [],
        items: input.items,
        totalItems: input.items.length,
        completedItems: 0,
        failedItems: 0,
        status: "pending",
      });

      const jobId = Number((insertResult as any).insertId);

      // Start processing in background (non-blocking)
      processBulkJob(jobId, ctx.user.id).catch(err =>
        console.error(`[BulkJob ${jobId}] Fatal error:`, err)
      );

      return { jobId };
    }),

  status: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [job] = await db.select().from(bulkJobs)
        .where(eq(bulkJobs.id, input.jobId))
        .limit(1);
      if (!job || job.userId !== ctx.user.id) throw new Error("Not found");
      return job;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(bulkJobs)
      .where(eq(bulkJobs.userId, ctx.user.id))
      .orderBy(desc(bulkJobs.createdAt))
      .limit(20);
  }),
});
