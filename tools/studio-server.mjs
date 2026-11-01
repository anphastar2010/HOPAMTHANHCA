#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import {
  computeDiff,
  deleteDraft,
  ensureStudioDirs,
  getDraft,
  getPublishStatus,
  isAllowedHost,
  isAllowedOrigin,
  listBackups,
  readCurrentRevision,
  readSongsFromDisk,
  restoreBackup,
  saveDraft,
  updateLibrary
} from "../src/studio-service.js";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".musicxml": "application/xml; charset=utf-8"
};

const ALLOWED_STATIC_FILES = new Set([
  "/index.html",
  "/studio.html",
  "/editor.html",
  "/songs.js",
  "/data-revision.js",
  "/style.css",
  "/studio.css",
  "/app.js",
  "/studio.js",
  "/favicon.ico"
]);

const ALLOWED_STATIC_PREFIXES = [
  "/src/",
  "/tests/",
  "/fixtures/",
  "/qa/",
  "/assets/",
  "/media/"
];

function isStaticPathAllowed(pathname) {
  if (ALLOWED_STATIC_FILES.has(pathname)) return true;
  for (const prefix of ALLOWED_STATIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error("Request payload quá lớn (> 5MB)."));
      }
    });
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error("JSON không hợp lệ."));
      }
    });
    req.on("error", reject);
  });
}

export function createStudioApp(rootDir, { port = 4174 } = {}) {
  return async function requestHandler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${port}`}`);
    const pathname = decodeURIComponent(url.pathname);
    const host = req.headers.host;
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // 1. Host header validation
    if (!isAllowedHost(host, port)) {
      return sendJson(res, 403, { ok: false, error: "Host không được phép truy cập." });
    }

    // 2. CSRF / Origin protection for all write requests
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      const originToCheck = origin || (referer ? new URL(referer).origin : null);
      if (originToCheck && !isAllowedOrigin(originToCheck, port)) {
        return sendJson(res, 403, { ok: false, error: "Origin bị từ chối (CSRF protection)." });
      }
    }

    // 3. API Routes
    if (pathname.startsWith("/api/")) {
      try {
        if (req.method === "GET" && pathname === "/api/status") {
          const { songs, hash } = await readSongsFromDisk(rootDir);
          const revision = await readCurrentRevision(rootDir);
          const draft = await getDraft(rootDir);
          const backups = await listBackups(rootDir);
          return sendJson(res, 200, {
            ok: true,
            revision,
            libraryHash: hash,
            songCount: songs.length,
            hasDraft: Boolean(draft && draft.hasContent),
            draftRevision: draft?.draftRevision || 0,
            draftSummary: (draft && draft.hasContent) ? {
              updatedAt: draft.updatedAt,
              draftRevision: draft.draftRevision,
              activeSongId: draft.activeSongId,
              title: draft.formState?.title || draft.song?.title
            } : null,
            backupCount: backups.length
          });
        }

        if (req.method === "GET" && pathname === "/api/songs") {
          const { songs, hash } = await readSongsFromDisk(rootDir);
          const revision = await readCurrentRevision(rootDir);
          return sendJson(res, 200, { ok: true, revision, libraryHash: hash, songs });
        }

        if (req.method === "GET" && pathname === "/api/draft") {
          const draft = await getDraft(rootDir);
          return sendJson(res, 200, { ok: true, draft });
        }

        if (req.method === "PUT" && pathname === "/api/draft") {
          const body = await parseJsonBody(req);
          const saved = await saveDraft(rootDir, body);
          return sendJson(res, 200, { ok: true, draftRevision: saved.draftRevision, savedAt: saved.updatedAt });
        }

        if (req.method === "DELETE" && pathname === "/api/draft") {
          const body = await parseJsonBody(req).catch(() => ({}));
          const queryRev = url.searchParams.get("expectedDraftRevision");
          const expectedDraftRevision = typeof body?.expectedDraftRevision === "number"
            ? body.expectedDraftRevision
            : (queryRev !== null && !isNaN(Number(queryRev)) ? Number(queryRev) : undefined);

          if (typeof expectedDraftRevision !== "number" || isNaN(expectedDraftRevision)) {
            return sendJson(res, 400, {
              ok: false,
              code: "INVALID_DRAFT_REVISION",
              error: "Yêu cầu xóa nháp bắt buộc phải có expectedDraftRevision hợp lệ."
            });
          }

          const result = await deleteDraft(rootDir, expectedDraftRevision);
          return sendJson(res, 200, { ok: true, ...result });
        }

        if (req.method === "POST" && pathname === "/api/diff") {
          const body = await parseJsonBody(req);
          const result = await computeDiff(rootDir, body);
          return sendJson(res, 200, { ok: true, ...result });
        }

        if (req.method === "POST" && pathname === "/api/update-library") {
          const body = await parseJsonBody(req);
          const result = await updateLibrary(rootDir, body);
          return sendJson(res, 200, { ok: true, ...result });
        }

        if (req.method === "GET" && pathname === "/api/backups") {
          const backups = await listBackups(rootDir);
          return sendJson(res, 200, { ok: true, backups });
        }

        if (req.method === "POST" && pathname === "/api/restore-backup") {
          const body = await parseJsonBody(req);
          const result = await restoreBackup(rootDir, body);
          return sendJson(res, 200, { ok: true, ...result });
        }

        if (req.method === "GET" && pathname === "/api/publish-status") {
          const status = await getPublishStatus(rootDir);
          return sendJson(res, 200, { ok: true, ...status });
        }

        return sendJson(res, 404, { ok: false, error: "Endpoint API không tồn tại." });
      } catch (error) {
        const statusCode = error.statusCode || 500;
        return sendJson(res, statusCode, {
          ok: false,
          error: error.message,
          code: error.code || "INTERNAL_ERROR",
          findings: error.findings || null,
          serverRevision: error.serverRevision || null
        });
      }
    }

    // 4. Static Files with Strict Allowlist & Security Checks
    if (req.method === "GET" || req.method === "HEAD") {
      let targetPath = pathname === "/" ? "/studio.html" : pathname;

      // Check allowlist
      if (!isStaticPathAllowed(targetPath)) {
        return sendJson(res, 403, { ok: false, error: "Truy cập bị từ chối (tài nguyên không thuộc allowlist)." });
      }

      // Explicitly block internal, private, or dangerous files
      if (
        targetPath.includes(".git") ||
        targetPath.includes(".studio") ||
        targetPath.includes("node_modules") ||
        targetPath.includes(".github") ||
        targetPath.includes("package") ||
        targetPath.endsWith(".tmp")
      ) {
        return sendJson(res, 403, { ok: false, error: "Không được phép truy cập tệp nội bộ hoặc riêng tư." });
      }

      const safePath = path.normalize(targetPath).replace(/^(\.\.[/\\])+/, "");
      const fullPath = path.join(rootDir, safePath);

      // Path traversal check
      if (!fullPath.startsWith(path.resolve(rootDir))) {
        return sendJson(res, 403, { ok: false, error: "Đường dẫn không hợp lệ." });
      }

      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          return sendJson(res, 403, { ok: false, error: "Không hỗ trợ duyệt thư mục." });
        }
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        const content = await fs.readFile(fullPath);
        res.writeHead(200, {
          "Content-Type": contentType,
          "Content-Length": content.length,
          "X-Content-Type-Options": "nosniff"
        });
        if (req.method === "HEAD") {
          return res.end();
        }
        return res.end(content);
      } catch (error) {
        if (error.code === "ENOENT") {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          return res.end("404 Không tìm thấy tài nguyên");
        }
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end(`500 Lỗi máy chủ: ${error.message}`);
      }
    }

    return sendJson(res, 405, { ok: false, error: "Phương thức không được hỗ trợ." });
  };
}

export function startStudioServer(rootDir, { port = 4174, host = "127.0.0.1", open = false } = {}) {
  return new Promise((resolve, reject) => {
    const app = createStudioApp(rootDir, { port });
    const server = http.createServer(app);

    server.listen(port, host, () => {
      const studioUrl = `http://${host}:${port}/studio.html`;
      console.log(`\n======================================================`);
      console.log(`  🎼 HOPAMTHANHCA Studio Server đang chạy`);
      console.log(`  Địa chỉ: ${studioUrl}`);
      console.log(`  Trang chủ tra cứu: http://${host}:${port}/index.html`);
      console.log(`  Lắng nghe cục bộ loopback: ${host}:${port}`);
      console.log(`======================================================\n`);

      if (open) {
        const startCmd = process.platform === "win32"
          ? `start "" "${studioUrl}"`
          : process.platform === "darwin"
            ? `open "${studioUrl}"`
            : `xdg-open "${studioUrl}"`;
        exec(startCmd, () => {});
      }
      resolve({ server, port, studioUrl });
    });

    server.on("error", reject);
  });
}

// Direct execution from CLI
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  await ensureStudioDirs(root);
  const args = process.argv.slice(2);
  const portArgIndex = args.indexOf("--port");
  const port = portArgIndex >= 0 ? parseInt(args[portArgIndex + 1], 10) : (process.env.PORT ? parseInt(process.env.PORT, 10) : 4174);
  const open = args.includes("--open");

  try {
    await startStudioServer(root, { port, host: "127.0.0.1", open });
  } catch (err) {
    console.error("Không thể khởi động Studio Server:", err.message);
    process.exit(1);
  }
}
