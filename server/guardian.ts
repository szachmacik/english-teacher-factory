/**
 * AI Guardian Bot — English Teacher Factory
 * POST /api/guardian  → AI chat
 * GET  /api/guardian/health → status check
 */
import { Router, Request, Response } from "express";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.LLM_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are the AI Guardian for English Teacher Factory — AI-powered English lesson and content generator.
You help users with:
- Generating lesson plans from YouTube/PDF/topics
- Creating vocabulary lists and flashcards
- CEFR level assessment
- Quiz and game creation
- Bulk content generation for teachers

Be concise (2-4 sentences max per answer), practical, and friendly.
If unsure, suggest checking the app dashboard or documentation.
Never invent specific data you don't have access to.`;

async function askClaude(message: string, history: {role:string,content:string}[] = []): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return "AI Guardian not configured — ANTHROPIC_API_KEY missing.";
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},
    body: JSON.stringify({
      model: MODEL, max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [...history.slice(-6), {role:"user",content:message}],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const d = await res.json() as any;
  return d.content[0].text;
}

export const guardianRouter = Router();

const sessions = new Map<string, {history:{role:string,content:string}[],ts:number}>();

function getHistory(userId: string) {
  const now = Date.now();
  const s = sessions.get(userId);
  if (!s || now - s.ts > 600_000) { sessions.set(userId, {history:[],ts:now}); return []; }
  s.ts = now;
  return s.history;
}

function addToHistory(userId: string, role: string, content: string) {
  const s = sessions.get(userId) || {history:[],ts:Date.now()};
  s.history.push({role,content});
  if (s.history.length > 12) s.history = s.history.slice(-12);
  sessions.set(userId, {...s,ts:Date.now()});
}

guardianRouter.post("/", async (req: Request, res: Response) => {
  const { message, userId = "anon", reset = false } = req.body as any;
  if (!message || typeof message !== "string" || !message.trim())
    return res.status(400).json({error:"message required"});
  if (reset) sessions.delete(userId);
  try {
    const history = getHistory(userId);
    const reply = await askClaude(message.trim(), history);
    addToHistory(userId, "user", message.trim());
    addToHistory(userId, "assistant", reply);
    return res.json({reply, userId, model: MODEL, ts: new Date().toISOString()});
  } catch (err: any) {
    return res.status(500).json({error: err.message});
  }
});

guardianRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status:"ok", model:MODEL,
    aiEnabled:!!process.env.ANTHROPIC_API_KEY,
    sessions:sessions.size
  });
});
