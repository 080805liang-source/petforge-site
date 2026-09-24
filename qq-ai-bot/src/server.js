import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReplyEngine } from "./reply-engine.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(root, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const port = Number(process.env.PORT || 8788);
const engine = createReplyEngine();

function json(response, status, body) {
  const data = JSON.stringify(body);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(data) });
  response.end(data);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch (error) { reject(error); } });
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { ok: true, service: "petforge-qq-ai-bot" });
  if (request.method !== "POST" || url.pathname !== "/events") return json(response, 404, { error: "Not found" });
  try {
    const event = await readBody(request);
    const result = await engine.handle(event, async (groupId, message) => {
      // The official QQ adapter will replace this callback with its send API.
      console.log(JSON.stringify({ type: "outgoing_group_message", groupId, message }));
    });
    json(response, 200, result);
  } catch (error) {
    console.error(error);
    json(response, 500, { error: error.message || "Bot request failed" });
  }
});

server.listen(port, "127.0.0.1", () => console.log(`PET FORGE QQ AI bot listening on http://127.0.0.1:${port}`));
