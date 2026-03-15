/**
 * LLM Router — English Teacher Factory
 * Claude integration for: lesson generation, content analysis, CEFR assessment
 * Uses shared ofshore claude module pattern
 */
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.LLM_MODEL || "claude-haiku-4-5-20251001";

async function askClaude(system: string, prompt: string, maxTokens = 1500): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  return ((await res.json()).content[0].text) as string;
}

export const llmRouter = router({
  /**
   * Generate lesson plan from topic or text
   */
  generateLesson: protectedProcedure
    .input(z.object({
      topic: z.string().min(3).max(500),
      level: z.enum(["A1","A2","B1","B2","C1","C2"]).default("B1"),
      duration: z.number().min(15).max(120).default(45),
      focusArea: z.enum(["vocabulary","grammar","speaking","writing","reading"]).default("vocabulary"),
    }))
    .mutation(async ({ input }) => {
      const system = `You are an expert English teacher creating structured lesson plans.
Return JSON: { "title": string, "objectives": string[], "activities": [{name,duration,instructions}], "vocabulary": [{word,definition,example}], "homework": string }`;
      const prompt = `Create a ${input.duration}-min ${input.level} English lesson about: "${input.topic}". Focus: ${input.focusArea}.`;
      const raw = await askClaude(system, prompt, 2000);
      const clean = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    }),

  /**
   * Analyze text and extract CEFR level + vocabulary
   */
  analyzeText: protectedProcedure
    .input(z.object({ text: z.string().min(10).max(5000) }))
    .mutation(async ({ input }) => {
      const system = `Analyze English text. Return JSON: { "cefrLevel": "A1-C2", "difficulty": 1-10, "keyVocabulary": [{word,definition}], "grammarPoints": string[], "summary": string }`;
      const raw = await askClaude(system, `Analyze this text:\n\n${input.text}`, 1500);
      const clean = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    }),

  /**
   * Generate quiz questions from content
   */
  generateQuiz: protectedProcedure
    .input(z.object({
      content: z.string().min(10).max(3000),
      questionCount: z.number().min(3).max(20).default(5),
      type: z.enum(["multiple_choice","true_false","fill_blank"]).default("multiple_choice"),
    }))
    .mutation(async ({ input }) => {
      const system = `Create English learning quiz questions. Return JSON array: [{ "question": string, "options": string[], "correct": string, "explanation": string }]`;
      const raw = await askClaude(system,
        `Create ${input.questionCount} ${input.type} questions from:\n\n${input.content}`, 2000);
      const clean = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    }),

  /**
   * AI feedback on student writing
   */
  reviewWriting: protectedProcedure
    .input(z.object({
      text: z.string().min(10).max(2000),
      targetLevel: z.enum(["A1","A2","B1","B2","C1","C2"]).default("B1"),
    }))
    .mutation(async ({ input }) => {
      const system = `You are an English teacher giving constructive feedback. Return JSON: { "score": 1-10, "strengths": string[], "improvements": string[], "correctedVersion": string, "tips": string[] }`;
      const raw = await askClaude(system,
        `Review this ${input.targetLevel} student writing:\n\n${input.text}`, 1500);
      const clean = raw.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    }),

  /** Health check */
  ping: publicProcedure.query(() => ({ ok: true, model: MODEL })),
});
