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
  gameSessions,
  chatMessages,
} from "../../drizzle/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { runProductionPipeline } from "../services/pipeline";
import { extractYouTubeId } from "../services/youtube";
import { exportCanvaDesign, getCanvaDesign, generateSocialMediaPost, generateYouTubeThumbnail } from "../services/canva-mcp";
import { generateImage } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";
import { nanoid } from "nanoid";

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
        youtubeUrl: z.string().optional(),
        sourceUrl: z.string().optional(),
        sourceFileUrl: z.string().optional(),
        sourceFileName: z.string().optional(),
        sourceRawText: z.string().optional(),
        sourceSources: z.array(z.string()).optional(),
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

        if (input.youtubeUrl) insertValues.youtubeUrl = input.youtubeUrl;
        if (input.sourceUrl) insertValues.sourceUrl = input.sourceUrl;
        if (input.sourceFileUrl) insertValues.sourceFileUrl = input.sourceFileUrl;
        if (input.sourceFileName) insertValues.sourceFileName = input.sourceFileName;
        if (input.sourceRawText) insertValues.sourceRawText = input.sourceRawText;
        if (input.sourceSources) insertValues.sourceSources = input.sourceSources;
        if (input.title) insertValues.title = input.title;
        if (input.description) insertValues.description = input.description;
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
        return { downloadUrl: result.downloadUrl };
      }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const userProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, ctx.user!.id));
      if (userProjects.length === 0) return [];
      const allProducts = [];
      for (const p of userProjects) {
        const ps = await db.select().from(products).where(eq(products.projectId, p.id));
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

  // ===== COVER IMAGE =====
  cover: router({
    regenerate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [project] = await db.select().from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) throw new Error("Project not found");
        const topicStr = (project.topics as string[] | null)?.[0] || "English language";
        const prompt = `Colorful educational cover image for an English lesson. Topic: "${project.title || topicStr}". Level: ${project.cefrLevel || "B1"}. Style: modern flat design, vibrant colors, educational icons, books, speech bubbles, no text, no letters.`;
        const { url } = await generateImage({ prompt });
        await db.update(projects).set({ coverImageUrl: url } as any).where(eq(projects.id, input.projectId));
        return { coverImageUrl: url };
      }),
  }),

  // ===== GAME SESSIONS (Teacher Share / Live Stats) =====
  sessions: router({
    submit: publicProcedure
      .input(z.object({
        gameId: z.number(),
        playerName: z.string().min(1).max(100).default("Anonymous"),
        score: z.number(),
        maxScore: z.number(),
        timeSeconds: z.number().optional(),
        completed: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const certToken = input.completed ? nanoid(32) : undefined;
        const [result] = await db.insert(gameSessions).values({
          gameId: input.gameId,
          playerName: input.playerName,
          score: input.score,
          maxScore: input.maxScore,
          timeSeconds: input.timeSeconds ?? 0,
          completed: input.completed ? 1 : 0,
          certificateToken: certToken,
        }).$returningId();
        await db.update(games).set({ plays: sql`plays + 1` }).where(eq(games.id, input.gameId));
        return { sessionId: (result as any).id, certificateToken: certToken };
      }),

    byGame: protectedProcedure
      .input(z.object({ gameId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const [game] = await db.select().from(games).where(eq(games.id, input.gameId));
        if (!game) return [];
        const [project] = await db.select().from(projects)
          .where(and(eq(projects.id, game.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) return [];
        return db.select().from(gameSessions)
          .where(eq(gameSessions.gameId, input.gameId))
          .orderBy(desc(gameSessions.createdAt))
          .limit(100);
      }),

    byProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { sessions: [], stats: { totalPlays: 0, avgScore: 0, completionRate: 0, topPlayers: [] as Array<{name: string; plays: number; bestScore: number}> } };
        const [project] = await db.select().from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) return { sessions: [], stats: { totalPlays: 0, avgScore: 0, completionRate: 0, topPlayers: [] as Array<{name: string; plays: number; bestScore: number}> } };
        const projectGames = await db.select().from(games).where(eq(games.projectId, input.projectId));
        const gameIds = projectGames.map(g => g.id);
        if (gameIds.length === 0) return { sessions: [], stats: { totalPlays: 0, avgScore: 0, completionRate: 0, topPlayers: [] as Array<{name: string; plays: number; bestScore: number}> } };
        const allSessions: typeof gameSessions.$inferSelect[] = [];
        for (const gid of gameIds) {
          const s = await db.select().from(gameSessions).where(eq(gameSessions.gameId, gid)).orderBy(desc(gameSessions.createdAt)).limit(50);
          allSessions.push(...s);
        }
        const totalPlays = allSessions.length;
        const avgScore = totalPlays > 0 ? Math.round(allSessions.reduce((sum, s) => sum + (s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0), 0) / totalPlays) : 0;
        const completionRate = totalPlays > 0 ? Math.round((allSessions.filter(s => s.completed === 1).length / totalPlays) * 100) : 0;
        const playerMap = new Map<string, { name: string; plays: number; bestScore: number }>();
        for (const s of allSessions) {
          const existing = playerMap.get(s.playerName) ?? { name: s.playerName, plays: 0, bestScore: 0 };
          existing.plays++;
          const pct = s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0;
          if (pct > existing.bestScore) existing.bestScore = pct;
          playerMap.set(s.playerName, existing);
        }
        const topPlayers = Array.from(playerMap.values()).sort((a, b) => b.bestScore - a.bestScore).slice(0, 10);
        return { sessions: allSessions.slice(0, 50), stats: { totalPlays, avgScore, completionRate, topPlayers } };
      }),

    getCertificate: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [session] = await db.select().from(gameSessions)
          .where(eq(gameSessions.certificateToken, input.token));
        if (!session) throw new Error("Certificate not found");
        const [game] = await db.select().from(games).where(eq(games.id, session.gameId));
        if (!game) throw new Error("Game not found");
        const [project] = await db.select().from(projects).where(eq(projects.id, game.projectId));
        return { session, game, project };
      }),
  }),

  // ===== AI CHAT ASSISTANT =====
  chat: router({
    history: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const [project] = await db.select().from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) return [];
        return db.select().from(chatMessages)
          .where(eq(chatMessages.projectId, input.projectId))
          .orderBy(chatMessages.createdAt)
          .limit(50);
      }),

    send: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        message: z.string().min(1).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [project] = await db.select().from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) throw new Error("Project not found");
        await db.insert(chatMessages).values({
          projectId: input.projectId,
          userId: ctx.user!.id,
          role: "user",
          content: input.message,
        } as any);
        const history = await db.select().from(chatMessages)
          .where(eq(chatMessages.projectId, input.projectId))
          .orderBy(chatMessages.createdAt)
          .limit(20);
        const systemPrompt = `You are an expert English teaching assistant helping a teacher with their educational project.

Project: "${project.title || "English Lesson"}"
Source type: ${project.sourceType}
CEFR Level: ${project.cefrLevel || "B1"}
Target age: ${project.targetAge || "adults"}
Lesson goal: ${project.lessonGoal || "general_english"}
Teaching style: ${project.teachingStyle || "communicative"}
Topics: ${(project.topics as string[] | null)?.join(", ") || "English"}

You help teachers:
- Modify and improve generated content
- Suggest additional activities and differentiation strategies
- Adapt materials for different levels or learning styles
- Answer questions about teaching methodology (CLT, TBL, CLIL, etc.)
- Provide feedback on lesson plans and worksheets
- Suggest exam preparation strategies (FCE, IELTS, TOEFL)
- Recommend resources and extensions

Be concise, practical, and teacher-focused. Use markdown formatting. Always give actionable advice.`;

        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: systemPrompt },
          ...history.slice(-10).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ];
        const response = await invokeLLM({ messages });
        const rawContent = response.choices?.[0]?.message?.content;
        const assistantContent = typeof rawContent === "string" ? rawContent : "I apologize, I couldn't generate a response. Please try again.";
        await db.insert(chatMessages).values({
          projectId: input.projectId,
          userId: ctx.user!.id,
          role: "assistant",
          content: assistantContent,
        } as any);
        return { content: assistantContent };
      }),

    clear: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [project] = await db.select().from(projects)
          .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
        if (!project) throw new Error("Access denied");
        await db.delete(chatMessages).where(eq(chatMessages.projectId, input.projectId));
        return { success: true };
      }),
  }),

  // ===== ANALYTICS =====
  analytics: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { projectsOverTime: [], productTypeBreakdown: [], topGames: [], studentActivity: [] };
      const userProjects = await db.select().from(projects)
        .where(eq(projects.userId, ctx.user!.id))
        .orderBy(projects.createdAt);
      const now = new Date();
      // Projects over time (last 30 days)
      const projectsOverTime: { date: string; count: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0]!;
        const cnt = userProjects.filter(p => p.createdAt.toISOString().startsWith(dateStr)).length;
        projectsOverTime.push({ date: dateStr, count: cnt });
      }
      // Product type breakdown
      const productTypeMap = new Map<string, number>();
      for (const p of userProjects) {
        const prods = await db.select({ type: products.type }).from(products).where(eq(products.projectId, p.id));
        for (const prod of prods) {
          productTypeMap.set(prod.type, (productTypeMap.get(prod.type) ?? 0) + 1);
        }
      }
      const productTypeBreakdown = Array.from(productTypeMap.entries())
        .map(([type, cnt]) => ({ type, count: cnt }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      // Top games by plays
      const allGames: typeof games.$inferSelect[] = [];
      for (const p of userProjects) {
        const g = await db.select().from(games).where(eq(games.projectId, p.id));
        allGames.push(...g);
      }
      const topGames = allGames
        .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))
        .slice(0, 5)
        .map(g => ({ id: g.id, title: g.title, type: g.type, plays: g.plays ?? 0 }));
      // Student activity (sessions per day, last 14 days)
      const studentActivity: { date: string; sessions: number }[] = [];
      const gameIds = allGames.map(g => g.id);
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0]!;
        let sessionCount = 0;
        for (const gid of gameIds) {
          const s = await db.select({ id: gameSessions.id, createdAt: gameSessions.createdAt }).from(gameSessions)
            .where(eq(gameSessions.gameId, gid));
          sessionCount += s.filter(sess => sess.createdAt.toISOString().startsWith(dateStr)).length;
        }
        studentActivity.push({ date: dateStr, sessions: sessionCount });
      }
      return { projectsOverTime, productTypeBreakdown, topGames, studentActivity };
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
