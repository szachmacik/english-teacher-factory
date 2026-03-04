import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects — each project = one source input + generated ecosystem
 * sourceType determines how the content was ingested
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // === SOURCE ===
  sourceType: mysqlEnum("sourceType", [
    "youtube",        // YouTube video URL
    "url",            // Any webpage / article / BBC Learning English / TED Talk
    "pdf",            // Uploaded PDF (textbook, article, worksheet)
    "audio",          // Uploaded audio file (podcast, recording)
    "image",          // Uploaded image (photo of board, book page, infographic)
    "text",           // Pasted raw text
    "ai_topic",       // AI-generated from topic prompt only
    "voice_note",     // Recorded voice note in browser
    "google_doc",     // Google Docs public URL
    "multi",          // Combined from multiple sources
  ]).notNull().default("youtube"),

  // Raw source inputs
  youtubeUrl: text("youtubeUrl"),
  sourceUrl: text("sourceUrl"),         // generic URL
  sourceFileUrl: text("sourceFileUrl"), // S3 URL for uploaded file
  sourceFileName: text("sourceFileName"),
  sourceRawText: text("sourceRawText"), // pasted text or AI topic
  sourceSources: json("sourceSources").$type<string[]>(), // for multi-source

  // === EXTRACTED CONTENT ===
  title: text("title"),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  transcript: text("transcript"),
  extractedText: text("extractedText"), // from PDF/URL/image/audio
  language: varchar("language", { length: 10 }).default("en"),

  // === CONTEXT (teacher's configuration) ===
  cefrLevel: varchar("cefrLevel", { length: 5 }),       // A1-C2
  targetAge: mysqlEnum("targetAge", [
    "young_learners",   // 6-10
    "teenagers",        // 11-16
    "young_adults",     // 17-25
    "adults",           // 26-60
    "seniors",          // 60+
    "mixed",
  ]).default("adults"),
  schoolType: mysqlEnum("schoolType", [
    "public_school",
    "private_school",
    "language_school",
    "corporate",
    "online",
    "tutoring",
    "university",
  ]).default("language_school"),
  lessonGoal: mysqlEnum("lessonGoal", [
    "general_english",
    "exam_prep_fce",
    "exam_prep_ielts",
    "exam_prep_toefl",
    "business_english",
    "conversation",
    "travel",
    "academic",
    "kids_fun",
  ]).default("general_english"),
  teachingStyle: mysqlEnum("teachingStyle", [
    "communicative",
    "grammar_translation",
    "tpr",
    "clil",
    "task_based",
    "eclectic",
  ]).default("communicative"),
  lessonDuration: int("lessonDuration").default(60), // minutes
  groupSize: mysqlEnum("groupSize", [
    "individual",
    "pair",
    "small_group",
    "class",
  ]).default("class"),
  nativeLanguage: varchar("nativeLanguage", { length: 30 }).default("Polish"),
  focusSkills: json("focusSkills").$type<string[]>(), // speaking, listening, reading, writing, grammar, vocabulary
  topics: json("topics").$type<string[]>(),

  // === AI COVER IMAGE ===
  coverImageUrl: text("coverImageUrl"),

  // === STATUS ===
  status: mysqlEnum("status", [
    "pending",
    "ingesting",      // extracting content from source
    "analyzing",      // AI analyzing content
    "generating",     // generating products
    "designing",      // Canva designs
    "completed",
    "error",
  ]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Products — generated educational materials
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  type: mysqlEnum("type", [
    // Original 11
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
    // New 11
    "song_worksheet",
    "crossword",
    "word_search",
    "role_play_cards",
    "pronunciation_guide",
    "debate_cards",
    "error_correction",
    "reading_passage",
    "infographic_vocab",
    "assessment_rubric",
    "parent_newsletter",
  ]).notNull(),
  title: text("title"),
  content: json("content").$type<Record<string, unknown>>(),
  coverImageUrl: text("coverImageUrl"),    // AI-generated cover
  canvaDesignId: varchar("canvaDesignId", { length: 100 }),
  canvaEditUrl: text("canvaEditUrl"),
  canvaViewUrl: text("canvaViewUrl"),
  pdfUrl: text("pdfUrl"),
  pngUrl: text("pngUrl"),
  pptxUrl: text("pptxUrl"),
  shareToken: varchar("shareToken", { length: 32 }).unique(),
  status: mysqlEnum("status", ["pending", "generating", "designing", "completed", "error"])
    .default("pending")
    .notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Vocabulary items extracted from source
 */
export const vocabularyItems = mysqlTable("vocabulary_items", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  word: varchar("word", { length: 100 }).notNull(),
  partOfSpeech: varchar("partOfSpeech", { length: 30 }),
  definition: text("definition"),
  exampleSentence: text("exampleSentence"),
  polishTranslation: varchar("polishTranslation", { length: 200 }),
  cefrLevel: varchar("cefrLevel", { length: 5 }),
  audioUrl: text("audioUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VocabularyItem = typeof vocabularyItems.$inferSelect;
export type InsertVocabularyItem = typeof vocabularyItems.$inferInsert;

/**
 * Interactive games
 */
export const games = mysqlTable("games", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  type: mysqlEnum("type", [
    "quiz",
    "memory",
    "matching",
    "fill_blanks",
    "spelling_bee",
    "sentence_scramble",
    "crossword_game",
    "word_search_game",
  ]).notNull(),
  title: text("title"),
  config: json("config").$type<Record<string, unknown>>().notNull(),
  shareToken: varchar("shareToken", { length: 32 }).notNull().unique(),
  plays: int("plays").default(0),
  isPublic: boolean("isPublic").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

/**
 * Game scores / leaderboard
 */
export const gameScores = mysqlTable("game_scores", {
  id: int("id").autoincrement().primaryKey(),
  gameId: int("gameId").notNull(),
  playerName: varchar("playerName", { length: 100 }),
  score: int("score").notNull(),
  maxScore: int("maxScore").notNull(),
  timeSeconds: int("timeSeconds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GameScore = typeof gameScores.$inferSelect;
export type InsertGameScore = typeof gameScores.$inferInsert;

/**
 * Canva designs linked to products
 */
export const canvaDesigns = mysqlTable("canva_designs", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  designId: varchar("designId", { length: 100 }).notNull(),
  designType: varchar("designType", { length: 50 }),
  editUrl: text("editUrl"),
  viewUrl: text("viewUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  pdfDownloadUrl: text("pdfDownloadUrl"),
  pngDownloadUrl: text("pngDownloadUrl"),
  pptxDownloadUrl: text("pptxDownloadUrl"),
  exportStatus: mysqlEnum("exportStatus", ["pending", "exporting", "ready", "error"])
    .default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CanvaDesign = typeof canvaDesigns.$inferSelect;
export type InsertCanvaDesign = typeof canvaDesigns.$inferInsert;

/**
 * Bundles — group multiple projects into a sellable package
 */
export const bundles = mysqlTable("bundles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  coverImageUrl: text("coverImageUrl"),
  projectIds: json("projectIds").$type<number[]>().notNull(),
  shareToken: varchar("shareToken", { length: 32 }).unique(),
  price: int("price"), // in cents, for marketplace
  isPublic: boolean("isPublic").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Bundle = typeof bundles.$inferSelect;
export type InsertBundle = typeof bundles.$inferInsert;
