import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ─── ZIP Bundle Download ──────────────────────────────────────────────────
  app.get("/api/download/bundle/:projectId", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req as unknown as Parameters<typeof sdk.authenticateRequest>[0]).catch(() => null);
      if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) { res.status(400).json({ error: "Invalid project ID" }); return; }
      const { generateProjectZipBundle } = await import("../services/zip-bundle");
      const { stream, filename } = await generateProjectZipBundle({ projectId, userId: user.id });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      stream.pipe(res);
      stream.on("error", (err) => { console.error("ZIP stream error:", err); if (!res.headersSent) res.status(500).end(); });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (!res.headersSent) res.status(500).json({ error: msg });
    }
  });

  // ─── Audio Upload for Voice Note source ──────────────────────────────────
  app.post("/api/upload/audio", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req as unknown as Parameters<typeof sdk.authenticateRequest>[0]).catch(() => null);
      if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { storagePut } = await import("../storage");
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", async () => {
        const buffer = Buffer.concat(chunks);
        const ext = req.headers["x-file-ext"] || "webm";
        const key = `audio/${user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, `audio/${ext}`);
        res.json({ url, key });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: msg });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
