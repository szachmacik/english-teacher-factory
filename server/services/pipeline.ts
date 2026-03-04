/**
 * Multi-Source Production Pipeline
 * Orchestrates: source ingestion → AI analysis → product generation → Canva design
 * Supports: YouTube, URL, PDF, Audio, Image, Text, AI Topic, Voice Note, Google Doc, Multi-source
 */
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { games, products, projects, vocabularyItems } from "../../drizzle/schema";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { transcribeAudio } from "../_core/voiceTranscription";
import { generateImage } from "../_core/imageGeneration";
import {
  fetchYouTubeMetadata,
  fetchYouTubeTranscript,
  extractYouTubeId,
  estimateCEFRLevel,
} from "./youtube";
import {
  generateWorksheet,
  generateVocabularyList,
  generateFlashcards,
  generateGrammarGuide,
  generateWritingExercise,
  generateListeningComprehension,
  generateLessonPlan,
  generateMiniTextbook,
  generateDiscussionQuestions,
  generateHomework,
  generateTeacherNotes,
  generateSongWorksheet,
  generateCrossword,
  generateWordSearch,
  generateRolePlayCards,
  generatePronunciationGuide,
  generateDebateCards,
  generateErrorCorrection,
  generateReadingPassage,
  generateAssessmentRubric,
  generateParentNewsletter,
  generateQuizGame,
  generateMemoryGame,
  generateMatchingGame,
  generateFillBlanksGame,
  generateSpellingBeeGame,
  generateSentenceScrambleGame,
} from "./ai-generator";
import { generateWorksheetDesign, generateFlashcardsDesign, generateLessonPlanDesign, generateGrammarGuideDesign, generateVocabularyPoster, generateMiniTextbookDesign, generateWritingExerciseDesign, generateListeningTaskDesign, generateDiscussionQuestionsDesign, generateHomeworkDesign, generateTeacherNotesDesign } from "./canva-mcp";

type ProjectStatus = "pending" | "ingesting" | "analyzing" | "generating" | "designing" | "completed" | "error";
type ProductStatus = "pending" | "generating" | "designing" | "completed" | "error";

async function updateProjectStatus(projectId: number, status: ProjectStatus, errorMessage?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set({ status, errorMessage: errorMessage ?? null } as any).where(eq(projects.id, projectId));
}

async function updateProductStatus(
  productId: number,
  status: ProductStatus,
  content?: Record<string, unknown>,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { status, errorMessage: errorMessage ?? null };
  if (content !== undefined) updateData.content = content;
  await db.update(products).set(updateData).where(eq(products.id, productId));
}

function generateShareToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

// ─── Source Ingestors ────────────────────────────────────────────────────────

async function ingestYouTube(project: any): Promise<{ text: string; title?: string; thumbnailUrl?: string; language?: string; cefrLevel?: string }> {
  const videoId = extractYouTubeId(project.youtubeUrl ?? "");
  if (!videoId) throw new Error("Invalid YouTube URL");
  const [metadata, transcriptData] = await Promise.all([
    fetchYouTubeMetadata(videoId),
    fetchYouTubeTranscript(videoId),
  ]);
  return {
    text: transcriptData.transcript,
    title: metadata.title,
    thumbnailUrl: metadata.thumbnailUrl,
    language: transcriptData.language,
    cefrLevel: estimateCEFRLevel(transcriptData.transcript),
  };
}

async function ingestUrl(project: any): Promise<{ text: string; title?: string }> {
  const url = project.sourceUrl ?? "";
  if (!url) throw new Error("No URL provided");
  const cheerio = await import("cheerio");
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EduFactory/1.0)" },
  });
  const html = await response.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, aside, .ad, .advertisement").remove();
  const title = $("title").text() || $("h1").first().text();
  const mainText =
    $("article").text() ||
    $("main").text() ||
    $(".content, .post-content, .entry-content").first().text() ||
    $("body").text();
  const cleanText = mainText.replace(/\s+/g, " ").trim().slice(0, 8000);
  return { text: cleanText, title };
}

async function ingestPdf(project: any): Promise<{ text: string; title?: string }> {
  const fileUrl = project.sourceFileUrl ?? "";
  if (!fileUrl) throw new Error("No PDF file URL provided");
  const response = await fetch(fileUrl);
  const buffer = await response.arrayBuffer();
  const pdfModule = await import("pdf-parse");
  const pdfParse = (pdfModule as any).default ?? pdfModule;
  const data = await pdfParse(Buffer.from(buffer));
  return { text: data.text.slice(0, 8000), title: project.sourceFileName ?? "PDF Document" };
}

async function ingestAudio(project: any): Promise<{ text: string }> {
  const fileUrl = project.sourceFileUrl ?? "";
  if (!fileUrl) throw new Error("No audio file URL provided");
  const result = await transcribeAudio({ audioUrl: fileUrl, language: "en" });
  const transcriptText = (result as any).text ?? "";
  return { text: transcriptText };
}

async function ingestImage(project: any): Promise<{ text: string }> {
  const fileUrl = project.sourceFileUrl ?? "";
  if (!fileUrl) throw new Error("No image file URL provided");
  const response = await invokeLLM({
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: fileUrl, detail: "high" } },
          { type: "text", text: "Extract ALL text visible in this image. Return only the extracted text, nothing else. If it's a blackboard, book page, worksheet, or educational material, extract every word." },
        ],
      },
    ],
  });
  const rawContent = response.choices[0]?.message?.content;
  const text = typeof rawContent === "string" ? rawContent : "";
  return { text };
}
async function ingestText(project: any): Promise<{ text: string }> {
  return { text: project.sourceRawText ?? "" };
}

async function ingestAiTopic(project: any): Promise<{ text: string; title?: string }> {
  const topic = project.sourceRawText ?? "";
  if (!topic) throw new Error("No topic provided");
  const contextPrompt = buildContextPrompt(project);
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert EFL content creator. Generate rich educational context passages for teaching English." },
      { role: "user", content: `Generate a detailed educational context passage (600-800 words) about: "${topic}"\n${contextPrompt}\nInclude: vocabulary in context, grammar examples, cultural notes, discussion points. Write as if this is a reading passage/article for a complete lesson.` },
    ],
  });
  const rawContent2 = response.choices[0]?.message?.content;
  const text = typeof rawContent2 === "string" ? rawContent2 : "";
  return { text, title: topic };
}

async function ingestMulti(project: any): Promise<{ text: string; title?: string }> {
  const sources: string[] = project.sourceSources ?? [];
  const texts: string[] = [];
  for (const src of sources.slice(0, 5)) {
    try {
      if (src.includes("youtube.com") || src.includes("youtu.be")) {
        const videoId = extractYouTubeId(src);
        if (videoId) {
          const t = await fetchYouTubeTranscript(videoId);
          texts.push(t.transcript.slice(0, 2000));
        }
      } else if (src.startsWith("http")) {
        const r = await ingestUrl({ sourceUrl: src });
        texts.push(r.text.slice(0, 2000));
      } else {
        texts.push(src.slice(0, 2000));
      }
    } catch (e) {
      console.warn("Multi-source ingestion error for:", src, e);
    }
  }
  return { text: texts.join("\n\n---\n\n"), title: "Multi-Source Lesson" };
}

export function buildContextPrompt(project: any): string {
  const parts: string[] = [];
  if (project.cefrLevel) parts.push(`CEFR Level: ${project.cefrLevel}`);
  if (project.targetAge) parts.push(`Target age: ${project.targetAge.replace(/_/g, " ")}`);
  if (project.lessonGoal) parts.push(`Lesson goal: ${project.lessonGoal.replace(/_/g, " ")}`);
  if (project.teachingStyle) parts.push(`Teaching style: ${project.teachingStyle.replace(/_/g, " ")}`);
  if (project.lessonDuration) parts.push(`Lesson duration: ${project.lessonDuration} minutes`);
  if (project.groupSize) parts.push(`Group size: ${project.groupSize.replace(/_/g, " ")}`);
  if (project.nativeLanguage) parts.push(`Students' native language: ${project.nativeLanguage}`);
  if (project.focusSkills?.length) parts.push(`Focus skills: ${project.focusSkills.join(", ")}`);
  if (project.schoolType) parts.push(`School type: ${project.schoolType.replace(/_/g, " ")}`);
  return parts.length > 0 ? "\n\nTeaching Context:\n" + parts.join("\n") : "";
}

// ─── Product Type Selection ───────────────────────────────────────────────────

export function getProductTypesForSource(sourceType: string, project: any): string[] {
  const core = [
    "worksheet", "vocabulary_list", "flashcards", "grammar_guide",
    "writing_exercise", "listening_comprehension", "lesson_plan",
    "discussion_questions", "homework", "teacher_notes", "assessment_rubric",
  ];
  const extras: string[] = [];

  if (sourceType === "ai_topic") extras.push("mini_textbook", "reading_passage", "pronunciation_guide");
  if (["youtube", "audio", "voice_note"].includes(sourceType)) extras.push("mini_textbook", "pronunciation_guide");
  if (["pdf", "url", "text", "google_doc"].includes(sourceType)) extras.push("reading_passage", "error_correction");
  if (sourceType === "image") extras.push("reading_passage", "infographic_vocab");

  const goal = project.lessonGoal ?? "general_english";
  if (goal === "business_english") extras.push("role_play_cards", "debate_cards");
  if (["exam_prep_fce", "exam_prep_ielts", "exam_prep_toefl"].includes(goal)) extras.push("error_correction", "reading_passage");
  if (goal === "kids_fun") extras.push("word_search", "crossword");
  if (goal === "conversation") extras.push("role_play_cards", "debate_cards");

  const age = project.targetAge ?? "adults";
  if (age === "young_learners") extras.push("song_worksheet", "word_search", "crossword");
  if (age === "teenagers") extras.push("debate_cards", "role_play_cards");
  if (["young_learners", "teenagers"].includes(age)) extras.push("parent_newsletter");
  if (project.schoolType === "corporate") extras.push("role_play_cards", "debate_cards");

  return Array.from(new Set([...core, ...extras]));
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export async function runProductionPipeline(projectId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) throw new Error("Project not found");

    // ===== STEP 1: Ingest Source =====
    await updateProjectStatus(projectId, "ingesting");
    let ingested: { text: string; title?: string; thumbnailUrl?: string; language?: string; cefrLevel?: string } = { text: "" };

    switch (project.sourceType) {
      case "youtube":     ingested = await ingestYouTube(project); break;
      case "url":         ingested = await ingestUrl(project); break;
      case "pdf":         ingested = await ingestPdf(project); break;
      case "audio":
      case "voice_note":  ingested = await ingestAudio(project); break;
      case "image":       ingested = await ingestImage(project); break;
      case "text":        ingested = await ingestText(project); break;
      case "ai_topic":    ingested = await ingestAiTopic(project); break;
      case "multi":       ingested = await ingestMulti(project); break;
      case "google_doc":  ingested = await ingestUrl({ sourceUrl: project.sourceUrl }); break;
      default:            ingested = await ingestText(project); break;
    }

    const extractedText = ingested.text;
    const cefrLevel = project.cefrLevel || ingested.cefrLevel || estimateCEFRLevel(extractedText);

    await db.update(projects).set({
      title: project.title || ingested.title || "Untitled Lesson",
      thumbnailUrl: project.thumbnailUrl || ingested.thumbnailUrl || null,
      extractedText,
      transcript: extractedText,
      language: ingested.language || "en",
      cefrLevel,
    } as any).where(eq(projects.id, projectId));

    // ===== STEP 2: AI Analysis =====
    await updateProjectStatus(projectId, "analyzing");
    const contextPrompt = buildContextPrompt({ ...project, cefrLevel });
    const analysis = await analyzeContent(extractedText, project.title || ingested.title || "Lesson", contextPrompt);

    if (analysis.vocabulary?.length > 0) {
      const vocabRows = analysis.vocabulary.slice(0, 30).map((v: any) => ({
        projectId,
        word: v.word,
        partOfSpeech: v.partOfSpeech,
        definition: v.definition,
        exampleSentence: v.exampleSentence,
        polishTranslation: v.polishTranslation,
        cefrLevel: v.cefrLevel,
      }));
      await db.insert(vocabularyItems).values(vocabRows);
    }

    await db.update(projects).set({ topics: analysis.topics } as any).where(eq(projects.id, projectId));

    // ===== STEP 3: Generate Products =====
    await updateProjectStatus(projectId, "generating");
    const productTypes = getProductTypesForSource(project.sourceType, project);
    const productIds: number[] = [];

    for (const type of productTypes) {
      const [inserted] = await db.insert(products).values({
        projectId,
        type: type as any,
        status: "pending",
      }).$returningId();
      productIds.push(inserted.id);
    }

    // Generate in batches of 4
    const BATCH = 4;
    for (let i = 0; i < productIds.length; i += BATCH) {
      const batch = productIds.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (productId, idx) => {
          const type = productTypes[i + idx];
          await updateProductStatus(productId, "generating");
          try {
            const content = await generateProductContent(type, extractedText, analysis, project, contextPrompt);
            await updateProductStatus(productId, "designing", content);
            try {
              const canvaResult = await generateCanvaDesignForType(type, content, project.title || "Lesson");
              await db.update(products).set({
                canvaDesignId: canvaResult?.designId ?? null,
                canvaEditUrl: canvaResult?.editUrl ?? null,
                canvaViewUrl: canvaResult?.viewUrl ?? null,
                title: (content.title as string) || type,
                shareToken: generateShareToken(),
                status: "completed",
              } as any).where(eq(products.id, productId));
            } catch {
              await db.update(products).set({
                title: (content.title as string) || type,
                shareToken: generateShareToken(),
                status: "completed",
              } as any).where(eq(products.id, productId));
            }
          } catch (err: any) {
            await updateProductStatus(productId, "error", undefined, err.message);
          }
        })
      );
    }

    // ===== STEP 4: Generate Games =====
    const gameGenerators = [
      { type: "quiz", fn: generateQuizGame },
      { type: "memory", fn: generateMemoryGame },
      { type: "matching", fn: generateMatchingGame },
      { type: "fill_blanks", fn: generateFillBlanksGame },
      { type: "spelling_bee", fn: generateSpellingBeeGame },
      { type: "sentence_scramble", fn: generateSentenceScrambleGame },
    ];

    await Promise.all(
      gameGenerators.map(async ({ type, fn }) => {
        try {
          const config = await fn(extractedText, analysis);
          await db.insert(games).values({
            projectId,
            type: type as any,
            title: `${type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — ${project.title || "Lesson"}`,
            config,
            shareToken: generateShareToken(),
            isPublic: true,
          });
        } catch (err) {
          console.warn(`Game generation failed for ${type}:`, err);
        }
      })
    );

    // ===== STEP 5: AI Cover Image =====
    try {
      const { url: coverUrl } = await generateImage({
        prompt: `Professional educational material cover for English language learning. Topic: ${project.title || ingested.title || "English Lesson"}. Style: modern, clean, academic, colorful. No text.`,
      });
      await db.update(projects).set({ coverImageUrl: coverUrl } as any).where(eq(projects.id, projectId));
    } catch (e) {
      console.warn("Cover image generation failed:", e);
    }

    await updateProjectStatus(projectId, "completed");
  } catch (err: any) {
    console.error(`Pipeline error for project ${projectId}:`, err);
    await updateProjectStatus(projectId, "error", err.message);
  }
}

// ─── Content Analysis ─────────────────────────────────────────────────────────

async function analyzeContent(text: string, title: string, contextPrompt: string): Promise<any> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert EFL/ESL curriculum designer. Analyze educational content and extract structured data for lesson material generation." },
      {
        role: "user",
        content: `Analyze this content for English language teaching:\n\nTitle: ${title}\nContent: ${text.slice(0, 4000)}\n${contextPrompt}\n\nReturn JSON with topics, grammarPoints, keyThemes, difficulty, vocabulary (word/partOfSpeech/definition/exampleSentence/polishTranslation/cefrLevel), keyFacts, discussionTopics, culturalNotes, hasSong, hasDialogue.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "content_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            topics: { type: "array", items: { type: "string" } },
            grammarPoints: { type: "array", items: { type: "string" } },
            keyThemes: { type: "array", items: { type: "string" } },
            difficulty: { type: "string" },
            vocabulary: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  word: { type: "string" },
                  partOfSpeech: { type: "string" },
                  definition: { type: "string" },
                  exampleSentence: { type: "string" },
                  polishTranslation: { type: "string" },
                  cefrLevel: { type: "string" },
                },
                required: ["word", "partOfSpeech", "definition", "exampleSentence", "polishTranslation", "cefrLevel"],
                additionalProperties: false,
              },
            },
            keyFacts: { type: "array", items: { type: "string" } },
            discussionTopics: { type: "array", items: { type: "string" } },
            culturalNotes: { type: "string" },
            hasSong: { type: "boolean" },
            hasDialogue: { type: "boolean" },
          },
          required: ["topics", "grammarPoints", "keyThemes", "difficulty", "vocabulary", "keyFacts", "discussionTopics", "culturalNotes", "hasSong", "hasDialogue"],
          additionalProperties: false,
        },
      },
    },
  });
  try {
    const rawMsg = response.choices[0]?.message?.content;
    return JSON.parse(typeof rawMsg === "string" ? rawMsg : "{}");
  } catch {
    return { topics: [], grammarPoints: [], vocabulary: [], keyFacts: [], discussionTopics: [], hasSong: false, hasDialogue: false };
  }
}

// ─── Product Content Generator ────────────────────────────────────────────────

async function generateProductContent(
  type: string,
  text: string,
  analysis: any,
  project: any,
  contextPrompt: string
): Promise<Record<string, unknown>> {
  const ctx = { text, analysis, project, contextPrompt };
  switch (type) {
    case "worksheet":               return generateWorksheet(ctx);
    case "vocabulary_list":         return generateVocabularyList(ctx);
    case "flashcards":              return generateFlashcards(ctx);
    case "grammar_guide":           return generateGrammarGuide(ctx);
    case "writing_exercise":        return generateWritingExercise(ctx);
    case "listening_comprehension": return generateListeningComprehension(ctx);
    case "lesson_plan":             return generateLessonPlan(ctx);
    case "mini_textbook":           return generateMiniTextbook(ctx);
    case "discussion_questions":    return generateDiscussionQuestions(ctx);
    case "homework":                return generateHomework(ctx);
    case "teacher_notes":           return generateTeacherNotes(ctx);
    case "song_worksheet":          return generateSongWorksheet(ctx);
    case "crossword":               return generateCrossword(ctx);
    case "word_search":             return generateWordSearch(ctx);
    case "role_play_cards":         return generateRolePlayCards(ctx);
    case "pronunciation_guide":     return generatePronunciationGuide(ctx);
    case "debate_cards":            return generateDebateCards(ctx);
    case "error_correction":        return generateErrorCorrection(ctx);
    case "reading_passage":         return generateReadingPassage(ctx);
    case "assessment_rubric":       return generateAssessmentRubric(ctx);
    case "parent_newsletter":       return generateParentNewsletter(ctx);
    case "infographic_vocab":       return generateVocabularyList(ctx);
    default:                        return generateWorksheet(ctx);
  }
}

// ─── Canva Design Router ──────────────────────────────────────────────────────
async function generateCanvaDesignForType(type: string, content: Record<string, unknown>, title: string): Promise<{ designId?: string; editUrl?: string; viewUrl?: string } | null> {
  try {
    // Extract common fields from content
    const level = (content.cefrLevel as string) || "B1";
    const vocab = (content.vocabulary as Array<{ word: string; definition: string; polishTranslation?: string }>) || [];
    const words = (content.words as Array<{ word: string; definition: string }>) || vocab;
    const objectives = (content.objectives as string[]) || [];
    const grammarPoints = (content.grammarPoints as string[]) || [];
    const topics = (content.topics as string[]) || [];
    const questions = (content.questions as string[]) || [];
    switch (type) {
      case "worksheet":               return await generateWorksheetDesign(title, content, level);
      case "flashcards":              return await generateFlashcardsDesign(title, vocab, level);
      case "lesson_plan":             return await generateLessonPlanDesign(title, level, objectives);
      case "grammar_guide":           return await generateGrammarGuideDesign(title, level, grammarPoints);
      case "vocabulary_list":
      case "infographic_vocab":       return await generateVocabularyPoster(title, words.length > 0 ? words : vocab, level);
      case "mini_textbook":           return await generateMiniTextbookDesign(title, level, topics);
      case "writing_exercise":        return await generateWritingExerciseDesign(title, level);
      case "listening_comprehension": return await generateListeningTaskDesign(title, level);
      case "discussion_questions":    return await generateDiscussionQuestionsDesign(title, level, questions);
      case "homework":                return await generateHomeworkDesign(title, level);
      case "teacher_notes":           return await generateTeacherNotesDesign(title, level);
      default:                        return await generateWorksheetDesign(title, content, level);
    }
  } catch (e) {
    console.warn(`Canva design failed for ${type}:`, e);
    return null;
  }
}
