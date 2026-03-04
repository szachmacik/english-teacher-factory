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
import { eq, and, desc, count } from "drizzle-orm";
import { runProductionPipeline } from "../services/pipeline";
import { extractYouTubeId } from "../services/youtube";
import { exportCanvaDesign, getCanvaDesign, generateSocialMediaPost, generateYouTubeThumbnail } from "../services/canva-mcp";

export const factoryRouter = router({
  // ===== PROJECTS =====
  projects: router({

    // ─── Create from YouTube URL (legacy, kept for backward compat) ───────────
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
            sourceType: "youtube",
            status: "pending",
          })
          .$returningId();
        runProductionPipeline(inserted.id).catch((err) =>
          console.error(`Pipeline error for project ${inserted.id}:`, err)
        );
        return { projectId: inserted.id, message: "Production pipeline started!" };
      }),

    // ─── Universal multi-source create ───────────────────────────────────────
    createFromSource: protectedProcedure
      .input(z.object({
        sourceType: z.enum(["youtube", "url", "pdf", "audio", "image", "text", "ai_topic", "voice_note", "google_doc", "multi"]),
        // Source inputs (one or more depending on type)
        youtubeUrl: z.string().optional(),
        sourceUrl: z.string().optional(),
        sourceFileUrl: z.string().optional(),
        sourceFileName: z.string().optional(),
        sourceRawText: z.string().optional(),
        sourceSources: z.array(z.string()).optional(), // for multi
        // Context / configuration
        cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
        targetAge: z.enum(["young_learners", "teenagers", "young_adults", "adults", "seniors", "mixed"]).optional(),
        schoolType: z.enum(["public_school", "private_school", "language_school", "corporate", "online", "tutoring", "university"]).optional(),
        lessonGoal: z.enum(["general_english", "exam_prep_fce", "exam_prep_ielts", "exam_prep_toefl", "business_english", "conversation", "travel", "academic", "kids_fun"]).optional(),
        teachingStyle: z.enum(["communicative", "grammar_translation", "tpr", "clil", "task_based", "eclectic"]).optional(),
        lessonDuration: z.number().min(15).max(180).optional(),
        groupSize: z.enum(["individual", "pair", "small_group", "class"]).optional(),
        nativeLanguage: z.string().optional(),
        focusSkills: z.array(z.string()).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Validate source-specific required fields
        if (input.sourceType === "youtube" && !input.youtubeUrl) throw new Error("YouTube URL is required");
        if (input.sourceType === "url" && !input.sourceUrl) throw new Error("URL is required");
        if (input.sourceType === "google_doc" && !input.sourceUrl) throw new Error("Google Docs URL is required");
        if (["pdf", "audio", "image", "voice_note"].includes(input.sourceType) && !input.sourceFileUrl) throw new Error("File URL is required");
        if (["text", "ai_topic"].includes(input.sourceType) && !input.sourceRawText) throw new Error("Text/topic is required");
        if (input.sourceType === "multi" && (!input.sourceSources || input.sourceSources.length === 0)) throw new Error("At least one source is required for multi-source");

        const insertValues: any = {
          userId: ctx.user!.id,
          sourceType: input.sourceType,
          status: "pending",
        };

        // Copy all optional source fields
        if (input.youtubeUrl) insertValues.youtubeUrl = input.youtubeUrl;
        if (input.sourceUrl) insertValues.sourceUrl = input.sourceUrl;
        if (input.sourceFileUrl) insertValues.sourceFileUrl = input.sourceFileUrl;
        if (input.sourceFileName) insertValues.sourceFileName = input.sourceFileName;
        if (input.sourceRawText) insertValues.sourceRawText = input.sourceRawText;
        if (input.sourceSources) insertValues.sourceSources = input.sourceSources;
        if (input.title) insertValues.title = input.title;
        if (input.description) insertValues.description = input.description;
        // Context
        if (input.cefrLevel) insertValues.cefrLevel = input.cefrLevel;
        if (input.targetAge) insertValues.targetAge = input.targetAge;
        if (input.schoolType) insertValues.schoolType = input.schoolType;
        if (input.lessonGoal) insertValues.lessonGoal = input.lessonGoal;
        if (input.teachingStyle) insertValues.teachingStyle = input.teachingStyle;
        if (input.lessonDuration) insertValues.lessonDuration = input.lessonDuration;
        if (input.groupSize) insertValues.groupSize = input.groupSize;
        if (input.nativeLanguage) insertValues.nativeLanguage = input.nativeLanguage;
        if (input.focusSkills) insertValues.focusSkills = input.focusSkills;

        const [inserted] = await db.insert(projects).values(insertValues).$returningId();

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
        await db.delete(projects).where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user!.id)));
        return { success: true };
      }),

    getStatus: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [project] = await db
          .select({ id: projects.id, status: projects.status, title: projects.title, errorMessage: projects.errorMessage, sourceType: projects.sourceType })
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
        const [product] = await db.select().from(products).where(eq(products.id, input.id));
        if (!product) throw new Error("Product not found");
        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, product.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) throw new Error("Access denied");
        const productCanvaDesigns = await db.select().from(canvaDesigns).where(eq(canvaDesigns.productId, input.id));
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
        await db.update(products).set({ status: "pending", content: null } as any).where(eq(products.id, input.id));
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
        const updateData: any = {};
        if (input.format === "pdf") updateData.pdfUrl = result.downloadUrl;
        if (input.format === "png") updateData.pngUrl = result.downloadUrl;
        if (input.format === "pptx") updateData.pptxUrl = result.downloadUrl;
        await db.update(products).set(updateData).where(eq(products.id, input.productId));
        return { downloadUrl: result.downloadUrl, format: result.format };
      }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const userProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, ctx.user!.id));
      if (userProjects.length === 0) return [];
      const projectIds = userProjects.map((p) => p.id);
      const allProducts = [];
      for (const pid of projectIds) {
        const ps = await db.select().from(products).where(eq(products.projectId, pid));
        allProducts.push(...ps);
      }
      return allProducts;
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
        await db.update(games).set({ plays: (game.plays || 0) + 1 }).where(eq(games.id, game.id));
        return game;
      }),

    submitScore: publicProcedure
      .input(z.object({
        gameId: z.number(),
        playerName: z.string().max(100).optional(),
        score: z.number(),
        maxScore: z.number(),
        timeSeconds: z.number().optional(),
      }))
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

    listAll: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const userProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, ctx.user!.id));
      if (userProjects.length === 0) return [];
      const allGames = [];
      for (const p of userProjects) {
        const gs = await db.select().from(games).where(eq(games.projectId, p.id));
        allGames.push(...gs);
      }
      return allGames;
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
      .input(z.object({ projectId: z.number(), format: z.enum(["pdf", "png", "pptx"]).default("pdf") }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) throw new Error("Access denied");
        const projectProducts = await db.select().from(products).where(eq(products.projectId, input.projectId));
        const results = [];
        for (const product of projectProducts) {
          if (product.canvaDesignId) {
            try {
              const result = await exportCanvaDesign(product.canvaDesignId, input.format);
              results.push({ productId: product.id, type: product.type, downloadUrl: result.downloadUrl });
            } catch (e) {
              results.push({ productId: product.id, type: product.type, error: String(e) });
            }
          }
        }
        return { results, total: results.length };
      }),

    generateSocialPost: protectedProcedure
      .input(z.object({ projectId: z.number(), platform: z.enum(["instagram", "facebook", "linkedin", "twitter"]).default("instagram") }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) throw new Error("Access denied");
        return generateSocialMediaPost(project.title || "English Lesson", project.cefrLevel || "B1", []);
      }),

    generateThumbnail: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) throw new Error("Access denied");
        return generateYouTubeThumbnail(project.title || "English Lesson", project.cefrLevel || "B1");
      }),
  }),

  // ===== STATS =====
  stats: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { totalProjects: 0, totalProducts: 0, totalGames: 0, totalVocabulary: 0, completedProjects: 0 };
      const userProjects = await db.select({ id: projects.id, status: projects.status }).from(projects).where(eq(projects.userId, ctx.user!.id));
      const projectIds = userProjects.map((p) => p.id);
      let totalProducts = 0;
      let totalGames = 0;
      let totalVocabulary = 0;
      for (const pid of projectIds) {
        const [pc] = await db.select({ c: count() }).from(products).where(eq(products.projectId, pid));
        const [gc] = await db.select({ c: count() }).from(games).where(eq(games.projectId, pid));
        const [vc] = await db.select({ c: count() }).from(vocabularyItems).where(eq(vocabularyItems.projectId, pid));
        totalProducts += Number(pc?.c ?? 0);
        totalGames += Number(gc?.c ?? 0);
        totalVocabulary += Number(vc?.c ?? 0);
      }
      return {
        totalProjects: userProjects.length,
        completedProjects: userProjects.filter((p) => p.status === "completed").length,
        totalProducts,
        totalGames,
        totalVocabulary,
      };
    }),
  }),
});
