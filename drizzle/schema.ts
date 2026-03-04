import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
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
 * Projects — each project is based on a YouTube video
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  youtubeUrl: text("youtubeUrl").notNull(),
  youtubeId: varchar("youtubeId", { length: 20 }),
  title: text("title"),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  duration: int("duration"), // seconds
  transcript: text("transcript"),
  language: varchar("language", { length: 10 }).default("en"),
  cefrLevel: varchar("cefrLevel", { length: 5 }), // A1-C2
  topics: json("topics").$type<string[]>(),
  status: mysqlEnum("status", ["pending", "transcribing", "analyzing", "generating", "completed", "error"])
    .default("pending")
    .notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Products — generated educational materials for each project
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  type: mysqlEnum("type", [
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
    "song_worksheet",
  ]).notNull(),
  title: text("title"),
  content: json("content").$type<Record<string, unknown>>(),
  canvaDesignId: varchar("canvaDesignId", { length: 100 }),
  canvaEditUrl: text("canvaEditUrl"),
  canvaViewUrl: text("canvaViewUrl"),
  pdfUrl: text("pdfUrl"),
  pngUrl: text("pngUrl"),
  pptxUrl: text("pptxUrl"),
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
 * Vocabulary items extracted from video
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
 * Interactive games generated from project content
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
