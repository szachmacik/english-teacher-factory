import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  projects,
  products,
  games,
  gameScores,
  vocabularyItems,
  canvaDesigns,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { runProductionPipeline } from "../services/pipeline";
import { extractYouTubeId } from "../services/youtube";
import { exportCanvaDesign, getCanvaDesign, generateSocialMediaPost, generateYouTubeThumbnail } from "../services/canva-mcp";

export const factoryRouter = router({
  // ===== PROJECTS =====
  projects: router({
    create: protectedProcedure
      .input(z.object({ youtubeUrl: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const videoId = extractYouTubeId(input.youtubeUrl);
        if (!videoId) throw new Error("Invalid YouTube URL. Please provide a valid YouTube link.");

        const [inserted] = await db
          .insert(projects)
          .values({
            userId: ctx.user!.id,
            youtubeUrl: input.youtubeUrl,
            youtubeId: videoId,
            status: "pending",
          })
          .$returningId();

        // Start pipeline in background (non-blocking)
        runProductionPipeline(inserted.id).catch((err) =>
          console.error(`Pipeline error for project ${inserted.id}:`, err)
        );

        return { projectId: inserted.id, message: "Production pipeline started!" };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(projects)
        .where(eq(projects.userId, ctx.user!.id))
        .orderBy(desc(projects.createdAt));
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user!.id)));

        if (!project) throw new Error("Project not found");

        const [projectProducts, projectGames, projectVocab] = await Promise.all([
          db.select().from(products).where(eq(products.projectId, input.id)).orderBy(products.type),
          db.select().from(games).where(eq(games.projectId, input.id)),
          db.select().from(vocabularyItems).where(eq(vocabularyItems.projectId, input.id)),
        ]);

        return { project, products: projectProducts, games: projectGames, vocabulary: projectVocab };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db
          .delete(projects)
          .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user!.id)));
        return { success: true };
      }),

    getStatus: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [project] = await db
          .select({ id: projects.id, status: projects.status, title: projects.title, errorMessage: projects.errorMessage })
          .from(projects)
          .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user!.id)));

        if (!project) throw new Error("Project not found");

        const projectProducts = await db
          .select({ id: products.id, type: products.type, status: products.status, title: products.title })
          .from(products)
          .where(eq(products.projectId, input.id));

        const projectGames = await db
          .select({ id: games.id, type: games.type, title: games.title, shareToken: games.shareToken })
          .from(games)
          .where(eq(games.projectId, input.id));

        return { project, products: projectProducts, games: projectGames };
      }),
  }),

  // ===== PRODUCTS =====
  products: router({
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, input.id));

        if (!product) throw new Error("Product not found");

        // Verify ownership via project
        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, product.projectId), eq(projects.userId, ctx.user!.id)));

        if (!project) throw new Error("Access denied");

        const productCanvaDesigns = await db
          .select()
          .from(canvaDesigns)
          .where(eq(canvaDesigns.productId, input.id));

        return { product, canvaDesigns: productCanvaDesigns };
      }),

    regenerate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [product] = await db.select().from(products).where(eq(products.id, input.id));
        if (!product) throw new Error("Product not found");

        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, product.projectId), eq(projects.userId, ctx.user!.id)));

        if (!project) throw new Error("Access denied");

        await db.update(products).set({ status: "pending", content: null }).where(eq(products.id, input.id));

        return { success: true, message: "Product queued for regeneration" };
      }),

    exportCanva: protectedProcedure
      .input(z.object({ productId: z.number(), format: z.enum(["pdf", "png", "pptx", "jpg"]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [product] = await db.select().from(products).where(eq(products.id, input.productId));
        if (!product) throw new Error("Product not found");
        if (!product.canvaDesignId) throw new Error("No Canva design available for this product");

        const result = await exportCanvaDesign(product.canvaDesignId, input.format);

        // Save download URL
        const updateData: any = {};
        if (input.format === "pdf") updateData.pdfUrl = result.downloadUrl;
        if (input.format === "png") updateData.pngUrl = result.downloadUrl;
        if (input.format === "pptx") updateData.pptxUrl = result.downloadUrl;

        await db.update(products).set(updateData).where(eq(products.id, input.productId));

        return { downloadUrl: result.downloadUrl, format: result.format };
      }),
  }),

  // ===== GAMES =====
  games: router({
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [game] = await db
          .select()
          .from(games)
          .where(and(eq(games.shareToken, input.token), eq(games.isPublic, true)));

        if (!game) throw new Error("Game not found or not public");

        // Increment plays
        await db.update(games).set({ plays: (game.plays || 0) + 1 }).where(eq(games.id, game.id));

        return game;
      }),

    submitScore: publicProcedure
      .input(
        z.object({
          gameId: z.number(),
          playerName: z.string().max(100).optional(),
          score: z.number(),
          maxScore: z.number(),
          timeSeconds: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [inserted] = await db
          .insert(gameScores)
          .values({
            gameId: input.gameId,
            playerName: input.playerName || "Anonymous",
            score: input.score,
            maxScore: input.maxScore,
            timeSeconds: input.timeSeconds,
          })
          .$returningId();

        return { scoreId: inserted.id };
      }),

    getLeaderboard: publicProcedure
      .input(z.object({ gameId: z.number(), limit: z.number().default(10) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return db
          .select()
          .from(gameScores)
          .where(eq(gameScores.gameId, input.gameId))
          .orderBy(desc(gameScores.score))
          .limit(input.limit);
      }),

    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));

        if (!project) throw new Error("Access denied");

        return db.select().from(games).where(eq(games.projectId, input.projectId));
      }),
  }),

  // ===== VOCABULARY =====
  vocabulary: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];

        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));

        if (!project) throw new Error("Access denied");

        return db.select().from(vocabularyItems).where(eq(vocabularyItems.projectId, input.projectId));
      }),
  }),

  // ===== CANVA =====
  canva: router({
    getDesignInfo: protectedProcedure
      .input(z.object({ designId: z.string() }))
      .query(async ({ input }) => {
        return getCanvaDesign(input.designId);
      }),

    exportAll: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));

        if (!project) throw new Error("Access denied");

        const projectProducts = await db
          .select()
          .from(products)
          .where(and(eq(products.projectId, input.projectId)));

        const results = [];
        for (const product of projectProducts) {
          if (product.canvaDesignId) {
            const pdfResult = await exportCanvaDesign(product.canvaDesignId, "pdf");
            if (pdfResult.downloadUrl) {
              await db.update(products).set({ pdfUrl: pdfResult.downloadUrl }).where(eq(products.id, product.id));
              results.push({ productId: product.id, type: product.type, pdfUrl: pdfResult.downloadUrl });
            }
          }
        }

        return { exported: results.length, results };
      }),

    exportProduct: protectedProcedure
      .input(z.object({
        productId: z.number(),
        formats: z.array(z.enum(["pdf", "png", "pptx", "jpg"])),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [product] = await db.select().from(products).where(eq(products.id, input.productId));
        if (!product) throw new Error("Product not found");
        if (!product.canvaDesignId) throw new Error("No Canva design for this product");
        const results: Record<string, string> = {};
        await Promise.allSettled(
          input.formats.map(async (fmt) => {
            const r = await exportCanvaDesign(product.canvaDesignId!, fmt);
            if (r.downloadUrl) results[fmt] = r.downloadUrl;
          })
        );
        const updateData: Record<string, string> = {};
        if (results.pdf) updateData.pdfUrl = results.pdf;
        if (results.png) updateData.pngUrl = results.png;
        if (results.pptx) updateData.pptxUrl = results.pptx;
        if (Object.keys(updateData).length > 0) {
          await db.update(products).set(updateData).where(eq(products.id, input.productId));
        }
        return results;
      }),

    generateSocialMedia: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [project] = await db
          .select().from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) throw new Error("Access denied");
        return generateSocialMediaPost(
          project.title || "English Lesson",
          project.cefrLevel || "B1",
          (project.topics as string[]) || []
        );
      }),

    generateThumbnail: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [project] = await db
          .select().from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) throw new Error("Access denied");
        return generateYouTubeThumbnail(
          project.title || "English Lesson",
          project.cefrLevel || "B1"
        );
      }),
  }),

  // ===== STATS =====
  stats: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { projects: 0, completed: 0, products: 0, games: 0, vocabulary: 0 };
      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, ctx.user!.id));
      const completed = userProjects.filter(p => p.status === "completed").length;
      return {
        projects: userProjects.length,
        completed,
        products: completed * 11,
        games: completed * 6,
        vocabulary: completed * 20,
      };
    }),
  }),
});
