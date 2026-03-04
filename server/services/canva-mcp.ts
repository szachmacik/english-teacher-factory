import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface CanvaGenerateResult {
  jobId: string;
  candidateId: string;
  designId?: string;
  editUrl?: string;
  viewUrl?: string;
  thumbnailUrl?: string;
}

export interface CanvaExportResult {
  downloadUrl: string;
  format: string;
}

/**
 * Call Canva MCP tool via CLI with retry logic for long sessions
 */
async function callCanvaMCP(
  toolName: string,
  input: Record<string, unknown>,
  retries = 2
): Promise<unknown> {
  const inputJson = JSON.stringify(input);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { stdout } = await execFileAsync(
        "manus-mcp-cli",
        ["tool", "call", toolName, "--server", "canva", "--input", inputJson],
        { timeout: 180000, maxBuffer: 10 * 1024 * 1024 }
      );

      const lines = stdout.trim().split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          try {
            return JSON.parse(trimmed);
          } catch {
            continue;
          }
        }
      }
      try {
        return JSON.parse(stdout.trim());
      } catch {
        return { raw: stdout };
      }
    } catch (err: any) {
      console.error(`Canva MCP call ${toolName} attempt ${attempt + 1} failed:`, err.message);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw new Error(`Canva MCP call ${toolName} failed after ${retries + 1} attempts`);
}

/**
 * Core function to generate a Canva design with full pipeline:
 * generate-design → create-design-from-candidate
 */
async function generateCanvaDesign(
  query: string,
  designType: string,
  title: string
): Promise<CanvaGenerateResult> {
  try {
    const generateResult = await callCanvaMCP("generate-design", {
      query,
      design_type: designType,
      user_intent: `Generate ${designType} design for English teacher: ${title.slice(0, 100)}`,
    }) as any;

    const jobId =
      generateResult?.job?.id ||
      generateResult?.job_id ||
      generateResult?.id ||
      "";

    const candidates =
      generateResult?.job?.designs ||
      generateResult?.candidates ||
      generateResult?.designs ||
      [];

    const candidateId =
      candidates[0]?.id ||
      candidates[0]?.candidate_id ||
      "";

    if (!jobId || !candidateId) {
      console.warn(`Canva generate-design returned no candidates for: ${title}`);
      return { jobId: "", candidateId: "", designId: "", editUrl: "", viewUrl: "", thumbnailUrl: "" };
    }

    const designResult = await callCanvaMCP("create-design-from-candidate", {
      job_id: jobId,
      candidate_id: candidateId,
      user_intent: `Create editable design from candidate for: ${title.slice(0, 100)}`,
    }) as any;

    const designId =
      designResult?.design?.id ||
      designResult?.id ||
      "";

    const editUrl =
      designResult?.design?.urls?.edit_url ||
      designResult?.design?.edit_url ||
      designResult?.edit_url ||
      "";

    const viewUrl =
      designResult?.design?.urls?.view_url ||
      designResult?.design?.view_url ||
      designResult?.view_url ||
      "";

    const thumbnailUrl =
      designResult?.design?.thumbnail?.url ||
      designResult?.thumbnail_url ||
      "";

    return { jobId, candidateId, designId, editUrl, viewUrl, thumbnailUrl };
  } catch (err: any) {
    console.error(`Canva design generation failed for "${title}":`, err.message);
    return { jobId: "", candidateId: "", designId: "", editUrl: "", viewUrl: "", thumbnailUrl: "" };
  }
}

// ===== PRODUCT-SPECIFIC DESIGN GENERATORS =====

export async function generateWorksheetDesign(
  title: string,
  content: Record<string, unknown>,
  level: string
): Promise<CanvaGenerateResult> {
  const query = `Create a professional English language learning worksheet titled "${title}" for ${level} level students. 
Include sections for vocabulary, comprehension questions, and writing tasks. 
Use a clean, educational design with clear headings and plenty of white space for student answers.
Color scheme: blue and white, professional academic style. A4 document format.`;
  return generateCanvaDesign(query, "worksheet", title);
}

export async function generateFlashcardsDesign(
  title: string,
  vocabulary: Array<{ word: string; definition: string; polishTranslation?: string }>,
  level: string
): Promise<CanvaGenerateResult> {
  const wordList = vocabulary.slice(0, 5).map(v => `${v.word}: ${v.definition}`).join("; ");
  const query = `Create a vibrant vocabulary flashcard presentation titled "${title}" for English learners at ${level} level.
Sample vocabulary: ${wordList}.
Design: colorful cards with word on front, definition and example on back.
Style: modern, engaging, suitable for language learning. Presentation format.`;
  return generateCanvaDesign(query, "presentation", title);
}

export async function generateLessonPlanDesign(
  title: string,
  level: string,
  objectives: string[]
): Promise<CanvaGenerateResult> {
  const query = `Create a professional lesson plan document titled "${title}" for English teachers.
Level: ${level}. Duration: 60 minutes.
Learning objectives: ${objectives.slice(0, 3).join("; ")}.
Design: structured layout with clear sections (Objectives, Materials, Procedure, Assessment).
Style: professional teacher resource, clean and organized. A4 document format.`;
  return generateCanvaDesign(query, "worksheet", title);
}

export async function generateGrammarGuideDesign(
  title: string,
  level: string,
  grammarPoints: string[]
): Promise<CanvaGenerateResult> {
  const query = `Create a clear grammar reference guide titled "${title}" for ${level} English learners.
Grammar points covered: ${grammarPoints.slice(0, 4).join(", ")}.
Design: organized reference sheet with examples, rules, and practice boxes.
Style: educational, clear typography, suitable for classroom display or student handout.`;
  return generateCanvaDesign(query, "worksheet", title);
}

export async function generateVocabularyPoster(
  title: string,
  words: Array<{ word: string; definition: string }>,
  level: string
): Promise<CanvaGenerateResult> {
  const wordList = words.slice(0, 8).map(w => w.word).join(", ");
  const query = `Create a colorful classroom vocabulary poster titled "${title}" for ${level} English learners.
Key words to feature: ${wordList}.
Design: large, eye-catching poster suitable for classroom display.
Style: bright colors, clear typography, educational and engaging. Poster format.`;
  return generateCanvaDesign(query, "poster", title);
}

export async function generateMiniTextbookDesign(
  title: string,
  level: string,
  topics: string[]
): Promise<CanvaGenerateResult> {
  const query = `Create a professional mini textbook cover and layout titled "${title}" for ${level} English learners.
Topics covered: ${topics.slice(0, 4).join(", ")}.
Design: professional textbook style with cover page, chapter headings, and content sections.
Style: academic, clean, suitable for self-study materials. A4 document format.`;
  return generateCanvaDesign(query, "worksheet", title);
}

export async function generateWritingExerciseDesign(
  title: string,
  level: string
): Promise<CanvaGenerateResult> {
  const query = `Create an English writing exercise worksheet titled "${title}" for ${level} level students.
Include: writing prompt, model text section, vocabulary bank, and lined writing space.
Design: clean, motivating layout with clear instructions and ample writing space.
Style: modern educational worksheet. A4 document format.`;
  return generateCanvaDesign(query, "worksheet", title);
}

export async function generateListeningTaskDesign(
  title: string,
  level: string
): Promise<CanvaGenerateResult> {
  const query = `Create a listening comprehension worksheet titled "${title}" for ${level} English learners.
Include: pre-listening vocabulary, while-listening tasks (T/F, multiple choice), post-listening discussion.
Design: organized worksheet with audio icon graphics and clear task sections.
Style: modern language learning worksheet. A4 document format.`;
  return generateCanvaDesign(query, "worksheet", title);
}

export async function generateDiscussionQuestionsDesign(
  title: string,
  level: string,
  questions: string[]
): Promise<CanvaGenerateResult> {
  const sampleQ = questions.slice(0, 2).join(" | ");
  const query = `Create a discussion questions card set titled "${title}" for ${level} English learners.
Sample questions: ${sampleQ}.
Design: attractive discussion prompt cards with speech bubble graphics.
Style: engaging, colorful, suitable for pair/group work activities.`;
  return generateCanvaDesign(query, "presentation", title);
}

export async function generateHomeworkDesign(
  title: string,
  level: string
): Promise<CanvaGenerateResult> {
  const query = `Create a homework assignment sheet titled "${title}" for ${level} English students.
Include: clear task instructions, vocabulary review section, writing task, and self-assessment checklist.
Design: friendly, motivating layout with due date box and teacher feedback space.
Style: student-friendly homework sheet. A4 document format.`;
  return generateCanvaDesign(query, "worksheet", title);
}

export async function generateTeacherNotesDesign(
  title: string,
  level: string
): Promise<CanvaGenerateResult> {
  const query = `Create a teacher notes and answer key document titled "${title}" for ${level} English lesson.
Include: lesson overview, teaching tips, answer key, differentiation suggestions.
Design: professional teacher resource with clear sections and annotation space.
Style: clean, professional, easy to navigate. A4 document format.`;
  return generateCanvaDesign(query, "worksheet", title);
}

export async function generateSocialMediaPost(
  videoTitle: string,
  level: string,
  topics: string[]
): Promise<CanvaGenerateResult> {
  const query = `Create an engaging Instagram/Facebook post for an English teacher promoting their lesson materials.
Lesson topic: "${videoTitle}" for ${level} level students.
Topics covered: ${topics.slice(0, 3).join(", ")}.
Design: eye-catching social media post with text overlay and teacher branding.
Style: modern, professional, appealing to teachers and language learners.`;
  return generateCanvaDesign(query, "instagram_post", videoTitle);
}

export async function generateYouTubeThumbnail(
  videoTitle: string,
  level: string
): Promise<CanvaGenerateResult> {
  const query = `Create a professional YouTube thumbnail for an English teaching channel.
Video title: "${videoTitle}" - ${level} level English lesson.
Design: bold text, clear visuals, high contrast.
Style: professional education channel thumbnail, eye-catching.`;
  return generateCanvaDesign(query, "youtube_thumbnail", videoTitle);
}

/**
 * Export a Canva design to a specific format
 * Always calls get-export-formats first as required by Canva MCP docs
 */
export async function exportCanvaDesign(
  designId: string,
  format: "pdf" | "png" | "pptx" | "jpg"
): Promise<CanvaExportResult> {
  try {
    const formatsResult = await callCanvaMCP("get-export-formats", {
      design_id: designId,
      user_intent: `Check export formats for design ${designId}`,
    }) as any;

    const availableFormats: string[] = (formatsResult?.export_formats || [])
      .map((f: any) => (typeof f === "string" ? f : f?.type || "").toLowerCase());

    const formatMap: Record<string, string> = { pdf: "pdf", png: "png", pptx: "pptx", jpg: "jpg" };
    const targetFormat = formatMap[format] || "pdf";
    const exportFormat = availableFormats.some(f => f.includes(targetFormat))
      ? targetFormat
      : (availableFormats[0] || "pdf");

    const exportResult = await callCanvaMCP("export-design", {
      design_id: designId,
      format: {
        type: exportFormat,
        export_quality: "pro",
      },
      user_intent: `Export design ${designId} as ${exportFormat} for English teacher materials`,
    }) as any;

    const downloadUrl =
      exportResult?.job?.urls?.[0] ||
      exportResult?.download_url ||
      exportResult?.urls?.[0] ||
      exportResult?.url ||
      "";

    return { downloadUrl, format: exportFormat };
  } catch (err: any) {
    console.error(`Canva export failed for design ${designId}:`, err.message);
    return { downloadUrl: "", format };
  }
}

export async function getCanvaDesign(designId: string): Promise<any> {
  try {
    return await callCanvaMCP("get-design", {
      design_id: designId,
      user_intent: `Get design info for ${designId}`,
    });
  } catch {
    return null;
  }
}

export async function searchCanvaDesigns(query: string): Promise<any[]> {
  try {
    const result = await callCanvaMCP("search-designs", {
      query,
      user_intent: `Search for designs matching: ${query}`,
    }) as any;
    return result?.designs || result?.items || [];
  } catch {
    return [];
  }
}

export function getDesignTypeForProduct(productType: string): string {
  const typeMap: Record<string, string> = {
    worksheet: "worksheet",
    vocabulary_list: "poster",
    flashcards: "presentation",
    grammar_guide: "worksheet",
    writing_exercise: "worksheet",
    listening_comprehension: "worksheet",
    lesson_plan: "worksheet",
    mini_textbook: "worksheet",
    discussion_questions: "presentation",
    homework: "worksheet",
    teacher_notes: "worksheet",
    song_worksheet: "worksheet",
  };
  return typeMap[productType] || "worksheet";
}
