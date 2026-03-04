import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock getDb
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

// Mock pipeline
vi.mock("./services/pipeline", () => ({
  runProductionPipeline: vi.fn().mockResolvedValue(undefined),
}));

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-123",
      name: "Test Teacher",
      email: "teacher@test.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("factory.projects", () => {
  it("list returns empty array when db is not available", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.factory.projects.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("create throws when YouTube URL is invalid", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.factory.projects.create({ youtubeUrl: "not-a-youtube-url" })
    ).rejects.toThrow();
  });

  it("create throws when db is not available", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.factory.projects.create({ youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
    ).rejects.toThrow("Database not available");
  });

  it("requires authentication for list", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.factory.projects.list()).rejects.toThrow();
  });

  it("requires authentication for create", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.factory.projects.create({ youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
    ).rejects.toThrow();
  });
});

describe("factory.games", () => {
  it("getByToken returns error for non-existent token when db unavailable", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.factory.games.getByToken({ token: "nonexistent-token" })
    ).rejects.toThrow("Database not available");
  });

  it("submitScore requires valid input", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.factory.games.submitScore({
        gameId: 1,
        score: 8,
        maxScore: 10,
        playerName: "Student",
        timeSeconds: 45,
      })
    ).rejects.toThrow("Database not available");
  });

  it("getLeaderboard returns empty array when db unavailable", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.factory.games.getLeaderboard({ gameId: 1, limit: 10 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe("factory.vocabulary", () => {
  it("listByProject requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.factory.vocabulary.listByProject({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("listByProject returns empty array when db unavailable", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.factory.vocabulary.listByProject({ projectId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("factory.canva", () => {
  it("exportAll requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.factory.canva.exportAll({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("exportAll throws when db unavailable", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.factory.canva.exportAll({ projectId: 1 })
    ).rejects.toThrow("Database not available");
  });
});

describe("auth", () => {
  it("me returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Test Teacher");
    expect(result?.role).toBe("user");
  });

  it("logout clears session cookie", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
