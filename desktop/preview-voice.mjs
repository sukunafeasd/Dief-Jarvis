import fs from "node:fs/promises";
import { ComponentInstaller, runtimeRoot } from "./components.mjs";
import { VoiceService } from "./voice-service.mjs";
import { AzureVoice } from "./azure-voice.mjs";
import { ClonedVoice } from "./clone-voice.mjs";
export function previewVoicePlugin() {
  const root = runtimeRoot(),
    installer = new ComponentInstaller(root),
    voice = new VoiceService(root),
    clone = new ClonedVoice(),
    azure = new AzureVoice(async () => ({
      region: process.env.JARVIS_AZURE_REGION,
      key: process.env.JARVIS_AZURE_KEY,
    }));
  return {
    name: "dief-preview-voice",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__jarvis_voice/")) return next();
        const expected = `http://${req.headers.host}`;
        if (
          !/^(?:127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(
            req.headers.host || "",
          )
        ) {
          res.writeHead(403);
          return res.end();
        }
        if (req.headers.origin && req.headers.origin !== expected) {
          res.writeHead(403);
          return res.end();
        }
        if (
          req.headers["sec-fetch-site"] &&
          !["same-origin", "none"].includes(req.headers["sec-fetch-site"])
        ) {
          res.writeHead(403);
          return res.end();
        }
        if (
          !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
            req.socket.remoteAddress,
          )
        ) {
          res.writeHead(403);
          return res.end();
        }
        try {
          if (req.url === "/__jarvis_voice/status" && req.method === "GET") {
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify(await installer.status()));
          }
          if (
            [
              "/__jarvis_voice/stt-pt.tar.gz",
              "/__jarvis_voice/stt-wake-en.tar.gz",
            ].includes(req.url) &&
            req.method === "GET"
          ) {
            const name = req.url.split("/").at(-1);
            if (
              !(await installer.valid(
                installer.files.find((item) => item.file === name),
              ))
            )
              throw Error("Prepare os componentes de voz primeiro.");
            res.setHeader("Content-Type", "application/gzip");
            return res.end(await fs.readFile(root + "/" + name));
          }
          if (req.url === "/__jarvis_voice/speak" && req.method === "POST") {
            let body = "";
            for await (const chunk of req) {
              body += chunk;
              if (body.length > 7000) throw Error("Pedido muito grande.");
            }
            const request = JSON.parse(body);
            const wav = await (
              request.engine === "azure"
                ? azure
                : request.engine === "clone"
                  ? clone
                  : voice
            ).speak(request.text, request.profile, request.speed);
            res.setHeader("Content-Type", "audio/wav");
            res.setHeader("Cache-Control", "no-store");
            return res.end(wav);
          }
          if (
            req.url === "/__jarvis_voice/cancel-speech" &&
            req.method === "POST"
          ) {
            await voice.stop();
            await clone.stop();
            azure.stop();
            res.writeHead(204);
            return res.end();
          }
          res.writeHead(404);
          res.end();
        } catch (error) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      server.httpServer?.on("close", () => {
        voice.stop();
        clone.stop();
        azure.stop();
      });
    },
  };
}
