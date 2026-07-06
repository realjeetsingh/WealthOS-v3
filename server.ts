import express from 'express';
import path from "path";
import { createServer as createViteServer } from "vite";
import app from "./api/index"; // Import the centralized backend router app

// Vercel Runtime Hint
export const runtime = 'nodejs';

const PORT = 3000;

async function startServer() {
  console.info(`[Startup] Initializing WealthOS full-stack app...`);

  if (process.env.NODE_ENV !== "production") {
    // Development mode: Inject Vite middleware for HMR and asset building
    console.info("[Startup] Development Mode Detected. Mount Vite Dev Middleware.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve pre-built static client assets
    console.info("[Startup] Production Mode Detected. Serve static assets.");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.info(`[Startup] WealthOS Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Startup] Fatal server crash during bootstrap:", err);
});
