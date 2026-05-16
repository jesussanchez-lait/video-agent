/**
 * Stub worker Fase 2 — sustituir por @hyperframes/producer en producción.
 * POST /render { uid, compositionId, storagePath }
 */
import http from "node:http";

const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/render") {
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const payload = JSON.parse(body || "{}");
      console.log("[hyperframes-render] job received", payload);
      res.writeHead(501, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error:
            "Worker stub: instala @hyperframes/producer y hyperframes CLI en esta imagen.",
        })
      );
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "hyperframes-render" }));
});

server.listen(PORT, () => {
  console.log(`hyperframes-render listening on ${PORT}`);
});
