import { getDb } from "../db";
import {
  projects,
  products,
  vocabularyItems,
  games,
  canvaDesigns,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  extractYouTubeId,
  fetchYouTubeMetadata,
  fetchYouTubeTranscript,
  estimateCEFRLevel,
} from "./youtube";
import {
  analyzeTranscript,
  generateWorksheet,
  generateGrammarGuide,
  generateLessonPlan,
  generateMiniTextbook,
  generateWritingExercises,
  generateListeningComprehension,
  generateDiscussionQuestions,
  generateHomework,
  generateTeacherNotes,
  generateQuiz,
  generateMemoryGame,
  generateMatchingGame,
  generateFillBlanks,
  generateSpellingBee,
  generateSentenceScramble,
} from "./ai-generator";
import {
  generateWorksheetDesign,
  generateFlashcardsDesign,
  generateLessonPlanDesign,
  generateVocabularyPoster,
  generateSocialMediaPost,
  generateYouTubeThumbnail,
} from "./canva-mcp";
import crypto from "crypto";

async function updateProjectStatus(
  projectId: number,
  status: "pending" | "transcribing" | "analyzing" | "generating" | "completed" | "error",
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(projects)
    .set({ status, errorMessage: errorMessage || null })
    .where(eq(projects.id, projectId));
}

async function updateProductStatus(
  productId: number,
  status: "pending" | "generating" | "designing" | "completed" | "error",
  content?: Record<string, unknown>,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { status, errorMessage: errorMessage || null };
  if (content !== undefined) updateData.content = content;
  await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, productId));
}

function generateShareToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function runProductionPipeline(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) throw new Error("Project not found");

    // ===== STEP 1: Transcribe =====
    await updateProjectStatus(projectId, "transcribing");

    const videoId = extractYouTubeId(project.youtubeUrl);
    if (!videoId) throw new Error("Invalid YouTube URL");

    const [metadata, transcriptData] = await Promise.all([
      fetchYouTubeMetadata(videoId),
      fetchYouTubeTranscript(videoId),
    ]);

    const cefrEstimate = estimateCEFRLevel(transcriptData.transcript);

    await db
      .update(projects)
      .set({
        title: metadata.title,
        description: metadata.description,
        thumbnailUrl: metadata.thumbnailUrl,
        duration: metadata.duration,
        transcript: transcriptData.transcript,
        language: transcriptData.language,
        cefrLevel: cefrEstimate,
        youtubeId: videoId,
      })
      .where(eq(projects.id, projectId));

    // ===== STEP 2: AI Analysis =====
    await updateProjectStatus(projectId, "analyzing");

    const analysis = await analyzeTranscript(transcriptData.transcript, metadata.title);

    if (analysis.keyVocabulary?.length > 0) {
      await db.insert(vocabularyItems).values(
        analysis.keyVocabulary.map((v) => ({
          projectId,
          word: v.word,
          partOfSpeech: v.partOfSpeech,
          definition: v.definition,
          exampleSentence: v.exampleSentence,
          polishTranslation: v.polishTranslation,
          cefrLevel: v.cefrLevel,
        }))
      );
    }

    await db
      .update(projects)
      .set({
        cefrLevel: analysis.cefrLevel || cefrEstimate,
        topics: analysis.mainTopics,
      })
      .where(eq(projects.id, projectId));

    // ===== STEP 3: Create product placeholders =====
    await updateProjectStatus(projectId, "generating");

    const productTypes = [
      "worksheet",
      "vocabulary_list",
      "flashcards",
      "grammar_guide",
      "writing_exercise",
      "listening_comprehension",
      "lesson_plan",
      "mini_textbook",
      "discussion_questions",
      "homework",
      "teacher_notes",
    ] as const;

    const productIds: Record<string, number> = {};

    for (const type of productTypes) {
      const [inserted] = await db
        .insert(products)
        .values({
          projectId,
          type,
          title: `${type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — ${metadata.title}`,
          status: "pending",
        })
        .$returningId();
      productIds[type] = inserted.id;
    }

    // ===== STEP 4: Generate all products in parallel =====
    const productTasks = [
      // Worksheet
      (async () => {
        try {
          await updateProductStatus(productIds["worksheet"], "generating");
          const content = await generateWorksheet(transcriptData.transcript, analysis);
          await updateProductStatus(productIds["worksheet"], "designing", content as any);
          const canvaResult = await generateWorksheetDesign(metadata.title, content as any, analysis.cefrLevel);
          if (canvaResult.designId) {
            const dbInner = await getDb();
            if (dbInner) {
              await dbInner.insert(canvaDesigns).values({
                productId: productIds["worksheet"],
                designId: canvaResult.designId,
                editUrl: canvaResult.editUrl,
                viewUrl: canvaResult.viewUrl,
                thumbnailUrl: canvaResult.thumbnailUrl,
                designType: "worksheet",
              });
              await dbInner.update(products).set({
                canvaDesignId: canvaResult.designId,
                canvaEditUrl: canvaResult.editUrl,
                canvaViewUrl: canvaResult.viewUrl,
              }).where(eq(products.id, productIds["worksheet"]));
            }
          }
          await updateProductStatus(productIds["worksheet"], "completed", content as any);
        } catch (err: any) {
          await updateProductStatus(productIds["worksheet"], "error", undefined, err.message);
        }
      })(),

      // Vocabulary list
      (async () => {
        try {
          await updateProductStatus(productIds["vocabulary_list"], "generating");
          const content = { title: `Vocabulary List — ${metadata.title}`, level: analysis.cefrLevel, words: analysis.keyVocabulary };
          await updateProductStatus(productIds["vocabulary_list"], "designing", content);
          const canvaResult = await generateVocabularyPoster(metadata.title, analysis.keyVocabulary, analysis.cefrLevel);
          if (canvaResult.designId) {
            const dbInner = await getDb();
            if (dbInner) {
              await dbInner.insert(canvaDesigns).values({
                productId: productIds["vocabulary_list"],
                designId: canvaResult.designId,
                editUrl: canvaResult.editUrl,
                viewUrl: canvaResult.viewUrl,
                thumbnailUrl: canvaResult.thumbnailUrl,
                designType: "poster",
              });
              await dbInner.update(products).set({
                canvaDesignId: canvaResult.designId,
                canvaEditUrl: canvaResult.editUrl,
                canvaViewUrl: canvaResult.viewUrl,
              }).where(eq(products.id, productIds["vocabulary_list"]));
            }
          }
          await updateProductStatus(productIds["vocabulary_list"], "completed", content);
        } catch (err: any) {
          await updateProductStatus(productIds["vocabulary_list"], "error", undefined, err.message);
        }
      })(),

      // Flashcards
      (async () => {
        try {
          await updateProductStatus(productIds["flashcards"], "generating");
          const content = {
            title: `Flashcard Set — ${metadata.title}`,
            level: analysis.cefrLevel,
            cards: analysis.keyVocabulary.map((v, i) => ({
              id: i + 1,
              front: v.word,
              back: `${v.definition}\n\nExample: ${v.exampleSentence}\n\nPolish: ${v.polishTranslation}`,
            })),
          };
          await updateProductStatus(productIds["flashcards"], "designing", content);
          const canvaResult = await generateFlashcardsDesign(metadata.title, analysis.keyVocabulary, analysis.cefrLevel);
          if (canvaResult.designId) {
            const dbInner = await getDb();
            if (dbInner) {
              await dbInner.insert(canvaDesigns).values({
                productId: productIds["flashcards"],
                designId: canvaResult.designId,
                editUrl: canvaResult.editUrl,
                viewUrl: canvaResult.viewUrl,
                thumbnailUrl: canvaResult.thumbnailUrl,
                designType: "presentation",
              });
              await dbInner.update(products).set({
                canvaDesignId: canvaResult.designId,
                canvaEditUrl: canvaResult.editUrl,
                canvaViewUrl: canvaResult.viewUrl,
              }).where(eq(products.id, productIds["flashcards"]));
            }
          }
          await updateProductStatus(productIds["flashcards"], "completed", content);
        } catch (err: any) {
          await updateProductStatus(productIds["flashcards"], "error", undefined, err.message);
        }
      })(),

      // Grammar guide
      (async () => {
        try {
          await updateProductStatus(productIds["grammar_guide"], "generating");
          const content = await generateGrammarGuide(transcriptData.transcript, analysis);
          await updateProductStatus(productIds["grammar_guide"], "completed", content as any);
        } catch (err: any) {
          await updateProductStatus(productIds["grammar_guide"], "error", undefined, err.message);
        }
      })(),

      // Writing exercises
      (async () => {
        try {
          await updateProductStatus(productIds["writing_exercise"], "generating");
          const content = await generateWritingExercises(analysis);
          await updateProductStatus(productIds["writing_exercise"], "completed", content);
        } catch (err: any) {
          await updateProductStatus(productIds["writing_exercise"], "error", undefined, err.message);
        }
      })(),

      // Listening comprehension
      (async () => {
        try {
          await updateProductStatus(productIds["listening_comprehension"], "generating");
          const content = await generateListeningComprehension(transcriptData.transcript, analysis);
          await updateProductStatus(productIds["listening_comprehension"], "completed", content);
        } catch (err: any) {
          await updateProductStatus(productIds["listening_comprehension"], "error", undefined, err.message);
        }
      })(),

      // Lesson plan
      (async () => {
        try {
          await updateProductStatus(productIds["lesson_plan"], "generating");
          const content = await generateLessonPlan(analysis, metadata.title);
          await updateProductStatus(productIds["lesson_plan"], "designing", content as any);
          const canvaResult = await generateLessonPlanDesign(metadata.title, analysis.cefrLevel, (content as any).objectives || []);
          if (canvaResult.designId) {
            const dbInner = await getDb();
            if (dbInner) {
              await dbInner.insert(canvaDesigns).values({
                productId: productIds["lesson_plan"],
                designId: canvaResult.designId,
                editUrl: canvaResult.editUrl,
                viewUrl: canvaResult.viewUrl,
                thumbnailUrl: canvaResult.thumbnailUrl,
                designType: "doc",
              });
              await dbInner.update(products).set({
                canvaDesignId: canvaResult.designId,
                canvaEditUrl: canvaResult.editUrl,
                canvaViewUrl: canvaResult.viewUrl,
              }).where(eq(products.id, productIds["lesson_plan"]));
            }
          }
          await updateProductStatus(productIds["lesson_plan"], "completed", content as any);
        } catch (err: any) {
          await updateProductStatus(productIds["lesson_plan"], "error", undefined, err.message);
        }
      })(),

      // Mini textbook
      (async () => {
        try {
          await updateProductStatus(productIds["mini_textbook"], "generating");
          const content = await generateMiniTextbook(transcriptData.transcript, analysis);
          await updateProductStatus(productIds["mini_textbook"], "completed", content);
        } catch (err: any) {
          await updateProductStatus(productIds["mini_textbook"], "error", undefined, err.message);
        }
      })(),

      // Discussion questions
      (async () => {
        try {
          await updateProductStatus(productIds["discussion_questions"], "generating");
          const content = await generateDiscussionQuestions(analysis);
          await updateProductStatus(productIds["discussion_questions"], "completed", content);
        } catch (err: any) {
          await updateProductStatus(productIds["discussion_questions"], "error", undefined, err.message);
        }
      })(),

      // Homework
      (async () => {
        try {
          await updateProductStatus(productIds["homework"], "generating");
          const content = await generateHomework(analysis, metadata.title);
          await updateProductStatus(productIds["homework"], "completed", content);
        } catch (err: any) {
          await updateProductStatus(productIds["homework"], "error", undefined, err.message);
        }
      })(),

      // Teacher notes
      (async () => {
        try {
          await updateProductStatus(productIds["teacher_notes"], "generating");
          const content = await generateTeacherNotes(analysis, metadata.title);
          await updateProductStatus(productIds["teacher_notes"], "completed", content);
        } catch (err: any) {
          await updateProductStatus(productIds["teacher_notes"], "error", undefined, err.message);
        }
      })(),
    ];

    // ===== STEP 5: Generate games in parallel =====
    const gameTasks = [
      (async () => {
        try {
          const config = await generateQuiz(transcriptData.transcript, analysis);
          const dbInner = await getDb();
          if (dbInner) await dbInner.insert(games).values({ projectId, type: "quiz", title: config.title, config: config as any, shareToken: generateShareToken() });
        } catch (err: any) { console.error("Quiz failed:", err.message); }
      })(),
      (async () => {
        try {
          const config = await generateMemoryGame(analysis);
          const dbInner = await getDb();
          if (dbInner) await dbInner.insert(games).values({ projectId, type: "memory", title: config.title, config: config as any, shareToken: generateShareToken() });
        } catch (err: any) { console.error("Memory failed:", err.message); }
      })(),
      (async () => {
        try {
          const config = await generateMatchingGame(analysis);
          const dbInner = await getDb();
          if (dbInner) await dbInner.insert(games).values({ projectId, type: "matching", title: config.title, config: config as any, shareToken: generateShareToken() });
        } catch (err: any) { console.error("Matching failed:", err.message); }
      })(),
      (async () => {
        try {
          const config = await generateFillBlanks(transcriptData.transcript, analysis);
          const dbInner = await getDb();
          if (dbInner) await dbInner.insert(games).values({ projectId, type: "fill_blanks", title: config.title, config: config as any, shareToken: generateShareToken() });
        } catch (err: any) { console.error("Fill blanks failed:", err.message); }
      })(),
      (async () => {
        try {
          const config = await generateSpellingBee(analysis);
          const dbInner = await getDb();
          if (dbInner) await dbInner.insert(games).values({ projectId, type: "spelling_bee", title: config.title, config: config as any, shareToken: generateShareToken() });
        } catch (err: any) { console.error("Spelling bee failed:", err.message); }
      })(),
      (async () => {
        try {
          const config = await generateSentenceScramble(analysis);
          const dbInner = await getDb();
          if (dbInner) await dbInner.insert(games).values({ projectId, type: "sentence_scramble", title: config.title, config: config as any, shareToken: generateShareToken() });
        } catch (err: any) { console.error("Scramble failed:", err.message); }
      })(),
    ];

    await Promise.allSettled([...productTasks, ...gameTasks]);

    // ===== STEP 6: Mark completed =====
    await updateProjectStatus(projectId, "completed");
  } catch (err: any) {
    console.error(`Pipeline failed for project ${projectId}:`, err);
    await updateProjectStatus(projectId, "error", err.message);
  }
}
