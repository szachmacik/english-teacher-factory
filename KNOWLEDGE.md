# EduFactory — Knowledge Base for Manus Projects

> This document captures architectural decisions, integration patterns, and reusable solutions
> from the English Teacher Digital Product Factory. Other Manus projects can reference or
> copy these patterns directly.

---

## 1. Multi-Source Content Ingestion Pipeline

### Pattern: Unified Source Ingestion

All content sources (YouTube, URL, PDF, Audio, Image, Text, AI Topic, Voice Note, Song, Multi-blend)
are normalized into a single `SourceContext` object before AI processing.

```typescript
// server/services/pipeline.ts
interface SourceContext {
  transcript: string;       // Raw extracted text from any source
  sourceType: string;       // Original source type
  title?: string;           // Auto-detected or provided title
  metadata?: Record<string, unknown>;
}

// Source handlers:
// - YouTube: youtube-transcript npm package → getTranscript(videoId)
// - URL: cheerio web scraping → extractTextFromUrl(url)
// - PDF: pdf-parse npm package → extractTextFromPDF(buffer)
// - Audio: Whisper API via transcribeAudio(audioUrl) from server/_core/voiceTranscription.ts
// - Image: invokeLLM with image_url content type (vision)
// - Text/Song: direct pass-through
// - AI Topic: invokeLLM generates source content first, then processes it
// - Multi: combine multiple sources with [type] prefix markers
```

### Key Lesson: invokeLLM vs OpenAI SDK

**Always use `invokeLLM` from `server/_core/llm.ts`** — never import openai directly.
The built-in helper uses `BUILT_IN_FORGE_API_KEY` which is always available in Manus projects.

```typescript
import { invokeLLM } from "./_core/llm";

const response = await invokeLLM({
  messages: [
    { role: "system", content: "You are an expert..." },
    { role: "user", content: prompt }
  ],
  response_format: {
    type: "json_schema",
    json_schema: { name: "output", strict: true, schema: { /* zod-like schema */ } }
  }
});
const content = response.choices[0].message.content;
const parsed = JSON.parse(content);
```

---

## 2. Canva MCP Integration

### Available Tools (21 tools via manus-mcp-cli)

```bash
manus-mcp-cli tool list --server canva
```

Key tools used in this project:
- `create-design` — create new design from template search
- `get-design` — get design details and edit URL
- `export-design` — export to PDF/PNG/PPTX
- `get-export-formats` — check available formats before exporting
- `search-designs` — find existing designs
- `autofill-design` — fill template with data

### Pattern: Async execFile with Retry

```typescript
// server/services/canva-mcp.ts
import { execFile } from "child_process";
import { promisify } from "util";
const execFileAsync = promisify(execFile);

async function callCanvaMCP(toolName: string, args: Record<string, unknown>, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { stdout } = await execFileAsync(
        "manus-mcp-cli",
        ["tool", "call", toolName, "--server", "canva", "--input", JSON.stringify(args)],
        { timeout: 60000 }
      );
      return JSON.parse(stdout);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * attempt)); // exponential backoff
    }
  }
}
```

### Pattern: Generate Canva Design by Product Type

```typescript
// Map product types to Canva design queries
const CANVA_DESIGN_QUERIES: Record<string, string> = {
  worksheet: "educational worksheet template",
  flashcards: "vocabulary flashcard set",
  lesson_plan: "lesson plan template teacher",
  // ... etc
};

async function generateCanvaDesignForType(type: string, content: string, title: string) {
  const query = CANVA_DESIGN_QUERIES[type] || "educational material template";
  // 1. Search for template
  const searchResult = await callCanvaMCP("search-designs", { query, limit: 5 });
  // 2. Create design
  const design = await callCanvaMCP("create-design", { title, designType: "document" });
  return { designId: design.id, editUrl: design.editUrl };
}
```

---

## 3. ZIP Bundle Download

### Pattern: Express endpoint + archiver

```typescript
// server/services/zip-bundle.ts
import archiver from "archiver";
import { PassThrough } from "stream";

export async function generateProjectZipBundle({ projectId, userId }) {
  const db = await getDb();
  // Fetch project + products + games + vocabulary
  const archive = archiver("zip", { zlib: { level: 9 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  // Add product content as .txt files
  for (const product of products) {
    archive.append(product.content || "", { name: `products/${product.type}.txt` });
  }
  // Add vocabulary as CSV
  archive.append(vocabularyCSV, { name: "vocabulary.csv" });
  // Add Anki deck (TSV format)
  archive.append(ankiTSV, { name: "anki_deck.txt" });
  // Add marketplace listings
  archive.append(etsyListing, { name: "marketplace/etsy_listing.txt" });
  archive.append(tptListing, { name: "marketplace/tpt_listing.txt" });
  // Add game links
  archive.append(gameLinks, { name: "game_links.txt" });

  archive.finalize();
  return { stream: passthrough, filename: `${safeTitle}_Bundle.zip` };
}
```

### Register as Express endpoint (not tRPC — returns binary stream)

```typescript
// server/_core/index.ts
import { sdk } from "./sdk";

app.get("/api/download/bundle/:projectId", async (req, res) => {
  const user = await sdk.authenticateRequest(req).catch(() => null);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { stream, filename } = await generateProjectZipBundle({ projectId, userId: user.id });
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  stream.pipe(res);
});
```

---

## 4. Voice Recording in Browser

### Pattern: Web Audio API → Upload → Whisper

```typescript
// client/src/components/VoiceRecorder.tsx
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus" : "audio/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  // Collect chunks → on stop → create Blob → upload to /api/upload/audio
};

// Upload endpoint: server/_core/index.ts
app.post("/api/upload/audio", async (req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", async () => {
    const buffer = Buffer.concat(chunks);
    const { url } = await storagePut(`audio/${userId}-${Date.now()}.webm`, buffer, "audio/webm");
    res.json({ url });
  });
});
```

---

## 5. AI Content Generation — Structured JSON Responses

### Pattern: Parallel product generation

```typescript
// Generate multiple products in parallel using Promise.allSettled
const productTypes = ["worksheet", "vocabulary_list", "flashcards", ...];

const results = await Promise.allSettled(
  productTypes.map(type => generateProductContent(type, sourceContext))
);

// Process results — don't fail entire pipeline if one product fails
for (const [i, result] of results.entries()) {
  if (result.status === "fulfilled") {
    await db.update(products).set({ content: result.value, status: "completed" });
  } else {
    await db.update(products).set({ status: "error", errorMessage: result.reason?.message });
  }
}
```

### Pattern: CEFR-aware prompting

```typescript
const systemPrompt = `You are an expert EFL/ESL teacher creating ${productType} for ${cefrLevel} students.
Target age: ${targetAge}. Teaching style: ${lessonStyle}. Goal: ${lessonGoal}.
Always calibrate vocabulary, sentence complexity, and task difficulty to ${cefrLevel} level.`;
```

---

## 6. Database Schema — Multi-Source Projects

```typescript
// drizzle/schema.ts key tables:

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceType: mysqlEnum("sourceType", ["youtube","url","pdf","audio","image","text","ai_topic","voice_note","google_doc","multi"]),
  youtubeUrl: text("youtubeUrl"),
  sourceUrl: text("sourceUrl"),
  sourceFileUrl: text("sourceFileUrl"),
  sourceRawText: text("sourceRawText"),
  sourceSources: json("sourceSources"),  // for multi-source
  status: mysqlEnum("status", ["pending","transcribing","analyzing","generating","designing","completed","error"]),
  cefrLevel: varchar("cefrLevel", { length: 10 }),
  title: text("title"),
  topics: json("topics"),
  transcript: text("transcript"),
  thumbnailUrl: text("thumbnailUrl"),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  type: mysqlEnum("type", ["worksheet","vocabulary_list","flashcards","grammar_guide","writing_exercise",
    "listening_comprehension","lesson_plan","mini_textbook","discussion_questions","homework","teacher_notes",
    "song_worksheet","crossword","word_search","role_play_cards","pronunciation_guide","debate_cards",
    "error_correction","reading_passage","assessment_rubric","parent_newsletter"]),
  status: mysqlEnum("status", ["pending","generating","designing","completed","error"]),
  content: text("content"),
  canvaDesignId: varchar("canvaDesignId", { length: 255 }),
  canvaEditUrl: text("canvaEditUrl"),
  canvaExportUrl: text("canvaExportUrl"),
});

export const games = mysqlTable("games", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  type: mysqlEnum("type", ["quiz","memory","matching","fill_blanks","spelling_bee","sentence_scramble"]),
  shareToken: varchar("shareToken", { length: 64 }).unique(),  // public access without login
  gameData: json("gameData"),  // questions, pairs, words etc.
  plays: int("plays").default(0),
  highScore: int("highScore").default(0),
});
```

---

## 7. Public Game Links (No Auth Required)

### Pattern: Share token for public access

```typescript
// Generate unique token on game creation
import { nanoid } from "nanoid";
const shareToken = nanoid(16);

// Public procedure (no auth) for game access
games: router({
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const [game] = await db.select().from(games).where(eq(games.shareToken, input.token));
      if (!game) throw new TRPCError({ code: "NOT_FOUND" });
      // Increment play count
      await db.update(games).set({ plays: sql`${games.plays} + 1` }).where(eq(games.id, game.id));
      return game;
    }),
})
```

---

## 8. Marketplace Listing Generator

### Pattern: Auto-generate platform-specific listings

For each project, auto-generate ready-to-paste listings for:
- **Etsy**: Title (140 chars max), description with bullet points, tags
- **Teachers Pay Teachers**: Title, description with grade levels and standards
- **Gumroad/Payhip**: Short description + price suggestion

Key SEO terms for English teaching resources:
`esl worksheet, english lesson plan, [level] english, teaching resources, efl materials,
printable flashcards, vocabulary activities, english games, lesson pack, instant download`

---

## 9. Frontend Architecture — 3-Step Creator

```
Step 1: Source Selection
  → 10 source types with visual cards
  → Type-specific input (URL, file upload, textarea, voice recorder)

Step 2: Context Configuration
  → CEFR Level (A1-C2)
  → Age Group (Kids/Tweens/Teens/Adults/Mixed)
  → Teaching Style (8 methods)
  → Lesson Goal (10 goals)
  → School Type (8 types)
  → Product count slider

Step 3: Product Selection
  → 21 product types with emoji icons
  → 6 game types
  → "Select All" / "Clear All" buttons
  → Estimated generation time
```

---

## 10. Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 19 + Tailwind 4 + shadcn/ui + Wouter |
| Backend | Express 4 + tRPC 11 + Drizzle ORM |
| Database | MySQL/TiDB via DATABASE_URL |
| AI | invokeLLM (BUILT_IN_FORGE_API_KEY) + Whisper (transcribeAudio) |
| Storage | S3 via storagePut/storageGet |
| Canva | manus-mcp-cli --server canva |
| ZIP | archiver npm package |
| YouTube | youtube-transcript npm package |
| PDF | pdf-parse npm package |
| Web scraping | cheerio npm package |
| Testing | Vitest |

---

## 11. Reusable Components

| Component | Path | Description |
|---|---|---|
| VoiceRecorder | client/src/components/VoiceRecorder.tsx | Web Audio API recording with upload |
| ProductPreviewModal | client/src/components/ProductPreviewModal.tsx | Modal for viewing AI-generated content |
| AIChatBox | client/src/components/AIChatBox.tsx | Full chat interface (template built-in) |
| DashboardLayout | client/src/components/DashboardLayout.tsx | Sidebar layout (template built-in) |

---

## 12. Common Pitfalls & Solutions

### Problem: openai SDK not available
**Solution**: Always use `invokeLLM` from `server/_core/llm.ts` — never `import OpenAI from "openai"`.

### Problem: Canva MCP timeout
**Solution**: Use `execFileAsync` with `timeout: 60000` and retry logic with exponential backoff.

### Problem: Binary file download via tRPC
**Solution**: Use Express endpoint directly (not tRPC) for streaming binary responses (ZIP, PDF).
Register in `server/_core/index.ts` before the tRPC middleware.

### Problem: Database migration interactive prompts
**Solution**: Use `webdev_execute_sql` to run ALTER TABLE statements directly instead of `pnpm db:push`
when adding columns to existing tables.

### Problem: YouTube transcript extraction
**Solution**: `youtube-transcript` package works for most videos. Extract video ID from URL first:
```typescript
const videoId = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
```

### Problem: PDF text extraction
**Solution**: `pdf-parse` package. Import as:
```typescript
import pdfParse from "pdf-parse/lib/pdf-parse.js";
```
(Use the direct lib path to avoid ESM issues)

---

---

## 13. Stripe Integration Patterns

### Critical: Webhook MUST be registered BEFORE express.json()

```typescript
// server/_core/index.ts — ORDER MATTERS
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), webhookHandler);
app.use(express.json({ limit: "50mb" })); // After webhook!
```

### Test Event Detection (Required for Stripe test webhooks)

```typescript
if (event.id.startsWith("evt_test_")) {
  return res.json({ verified: true }); // Must return this exact structure
}
```

### Checkout Session Pattern

```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  line_items: [{ price_data: { currency: "usd", product_data: { name }, unit_amount: priceInCents }, quantity: 1 }],
  mode: "payment",
  customer_email: ctx.user.email || undefined,
  client_reference_id: ctx.user.id.toString(),
  metadata: { user_id: ctx.user.id.toString(), project_id: projectId.toString() },
  allow_promotion_codes: true,
  success_url: `${origin}/orders?success=true`,
  cancel_url: `${origin}/marketplace/${projectId}?cancelled=true`,
});
// Frontend: window.open(session.url, "_blank")
```

### Minimal DB Schema for Orders

```typescript
// Only store Stripe IDs + business data
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  amount: int("amount").notNull().default(0), // cents
  currency: varchar("currency", { length: 3 }).default("usd"),
  status: mysqlEnum("status", ["pending", "paid", "failed", "refunded"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

---

## 14. Bulk Processing Pattern

### Pattern: Job Queue with DB Status Tracking

```typescript
// 1. Create job record immediately — return jobId to client
const [result] = await db.insert(bulkJobs).values({
  userId, title, totalItems: items.length, status: "running"
});
const jobId = result.insertId;

// 2. Process in background (don't await — fire and forget)
processBulkJobInBackground(jobId, items, config).catch(console.error);

// 3. Return jobId immediately
return { jobId };

// Background processor updates DB as items complete
async function processBulkJobInBackground(jobId, items, config) {
  for (const item of items) {
    try {
      await runPipeline(item);
      await db.update(bulkJobs).set({ completedItems: sql`completedItems + 1` }).where(eq(bulkJobs.id, jobId));
    } catch {
      await db.update(bulkJobs).set({ failedItems: sql`failedItems + 1` }).where(eq(bulkJobs.id, jobId));
    }
  }
  await db.update(bulkJobs).set({ status: "completed" }).where(eq(bulkJobs.id, jobId));
}
```

### Frontend: Polling for Status

```typescript
const { data: jobStatus } = trpc.bulk.status.useQuery(
  { jobId: jobId! },
  {
    enabled: !!jobId,
    refetchInterval: (data) => 
      data?.status === "completed" || data?.status === "error" ? false : 3000,
  }
);
```

---

## 15. Crossword & Word Search Games

### Crossword Grid Generator

```typescript
// Place words on a grid with intersection detection
function generateCrosswordGrid(words: string[], gridSize: number) {
  const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(""));
  const placed: PlacedWord[] = [];

  // Place first word horizontally in center
  const firstWord = words[0];
  const startCol = Math.floor((gridSize - firstWord.length) / 2);
  const startRow = Math.floor(gridSize / 2);
  placed.push({ word: firstWord, row: startRow, col: startCol, direction: "across" });

  // For each subsequent word, find intersections with placed words
  for (const word of words.slice(1)) {
    for (const placedWord of placed) {
      for (let i = 0; i < word.length; i++) {
        for (let j = 0; j < placedWord.word.length; j++) {
          if (word[i] === placedWord.word[j]) {
            // Try to place at intersection
            const newDirection = placedWord.direction === "across" ? "down" : "across";
            // ... placement logic
          }
        }
      }
    }
  }
  return { grid, placed };
}
```

### Word Search Grid Generator

```typescript
// Place words in random directions in a grid
const DIRECTIONS = [
  [0, 1], [1, 0], [1, 1], [-1, 1],  // right, down, diagonal-right, diagonal-left
  [0, -1], [-1, 0], [-1, -1], [1, -1]  // left, up, diagonal-up-left, diagonal-up-right
];

function placeWordInGrid(grid: string[][], word: string, size: number): boolean {
  const shuffledDirections = [...DIRECTIONS].sort(() => Math.random() - 0.5);
  for (const [dr, dc] of shuffledDirections) {
    const startRow = Math.floor(Math.random() * size);
    const startCol = Math.floor(Math.random() * size);
    if (canPlaceWord(grid, word, startRow, startCol, dr, dc, size)) {
      placeWord(grid, word, startRow, startCol, dr, dc);
      return true;
    }
  }
  return false;
}
```

---

## 16. Key Metrics (Sprint 4)

- **16 vitest tests** passing
- **10 source types** supported
- **21 product types** generated by AI
- **8 game types** (Quiz, Memory, Matching, Fill-Blanks, Spelling Bee, Sentence Scramble, Crossword, Word Search)
- **3 export formats** (PDF, PNG, PPTX) via Canva MCP
- **ZIP bundle** with marketplace-ready listings (Etsy, TPT, Gumroad, Payhip)
- **Stripe checkout** with webhook handling and orders history
- **Bulk processing** up to 20 sources simultaneously
- **Voice recording** in browser via Web Audio API → Whisper
- **Zero TypeScript errors**

---

*Generated by EduFactory v3.0 — English Teacher Digital Product Factory*
*Last updated: March 2026 — Sprint 4*
