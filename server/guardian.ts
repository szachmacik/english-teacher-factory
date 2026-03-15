/**
 * AI Guardian Bot — english-teacher-factory
 * POST /api/guardian  { message, userId?, reset? }
 * GET  /api/guardian/health
 *
 * Zarządza aplikacją przez naturalne polecenia.
 * SmokeTester i zewnętrzni klienci (Telegram, ManyChat) mogą go używać.
 */
import { Router, Request, Response } from "express";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.LLM_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are the AI Guardian for English Teacher Factory — an AI-powered educational content generator.
You help teachers:
- Generate lessons, worksheets, flashcards, grammar guides from YouTube/PDF/text/audio
- Create games and quizzes for students
- Use the Bulk Factory for mass content generation
- Generate Canva designs and social media posts
- Manage projects and marketplace products
- Understand CEFR levels and pedagogical approaches
- Set up Stripe payments for selling content

You're knowledgeable about English language teaching methodology. Be helpful and encouraging.`;

// Session store: userId → { history, ts }
const sessions = new Map<string, { history: {role:string,content:string}[], ts:number }>();

function getHistory(userId: string): {role:string,content:string}[] {
  const now = Date.now();
  const s = sessions.get(userId);
  if (!s || now - s.ts > 600_000) {
    sessions.set(userId, { history: [], ts: now });
    return [];
  }
  s.ts = now;
  return s.history;
}

function saveHistory(userId: string, role: string, content: string) {
  const s = sessions.get(userId) || { history: [], ts: Date.now() };
  s.history.push({ role, content });
  if (s.history.length > 12) s.history = s.history.slice(-12);
  sessions.set(userId, { ...s, ts: Date.now() });
}

async function askClaude(message: string, history: {role:string,content:string}[]): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return "AI Guardian nie jest skonfigurowany. Ustaw ANTHROPIC_API_KEY.";

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [...history.slice(-8), { role: "user", content: message }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0,100)}`);
  }

  const data = await res.json() as any;
  return data.content[0].text as string;
}

export const guardianRouter = Router();

guardianRouter.post("/", async (req: Request, res: Response) => {
  const { message, userId = "anonymous", reset = false } = req.body as any;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  if (reset) sessions.delete(userId);

  try {
    const history = getHistory(userId);
    const reply = await askClaude(message.trim(), history);
    saveHistory(userId, "user", message.trim());
    saveHistory(userId, "assistant", reply);
    return res.json({ reply, userId, model: MODEL, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("[Guardian] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

guardianRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    model: MODEL,
    aiEnabled: !!process.env.ANTHROPIC_API_KEY,
    activeSessions: sessions.size,
  });
});
