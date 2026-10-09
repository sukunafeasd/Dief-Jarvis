import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { runtimeRoot } from "./components.mjs";
import { pronunciationText } from "../src/core/speech.mjs";
export class ClonedVoice {
  constructor(options = {}) {
    this.configPath =
      options.configPath ||
      process.env.JARVIS_CLONE_CONFIG ||
      path.join(runtimeRoot(), "clone-voice.json");
    this.launch = options.spawn || spawn;
    this.workerPath =
      options.workerPath ||
      fileURLToPath(new URL("./clone-worker.py", import.meta.url));
    this.child = null;
    this.pending = null;
    this.generation = 0;
  }
  async configuration() {
    let config;
    try {
      config = JSON.parse(await fs.readFile(this.configPath, "utf8"));
    } catch {
      throw Error(
        "Prepare a voz de referencia local primeiro (prepare:clone). Nenhuma voz substituta foi usada.",
      );
    }
    for (const key of ["python", "model", "reference"])
      if (
        typeof config[key] !== "string" ||
        !path.isAbsolute(config[key]) ||
        config[key].includes("\0")
      )
        throw Error("Configuracao de voz local invalida.");
    if (!["pt", "en"].includes(config.language))
      throw Error("Idioma de clonagem invalido.");
    await Promise.all([
      fs.access(config.python),
      fs.access(config.reference),
      fs.access(path.join(config.model, "model.pth")),
    ]);
    return config;
  }
  async speak(text, _profile, speed = 1) {
    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 600 ||
      !Number.isFinite(speed) ||
      speed < 0.6 ||
      speed > 1.4
    )
      throw Error("Pedido de voz invalido.");
    const generation = this.generation;
    const config = await this.configuration();
    if (generation !== this.generation)
      throw Error("Fala cancelada antes de iniciar.");
    if (this.pending) throw Error("Uma fala ja esta sendo preparada.");
    clearTimeout(this.idle);
    if (!this.child) {
      const child = this.launch(
        config.python,
        [
          "-u",
          this.workerPath,
          "--model",
          config.model,
          "--reference",
          config.reference,
          "--language",
          config.language,
        ],
        {
          shell: false,
          windowsHide: true,
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            ...process.env,
            HF_HUB_OFFLINE: "1",
            TRANSFORMERS_OFFLINE: "1",
          },
        },
      );
      this.child = child;
      let buffer = "",
        diagnostic = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        buffer += chunk;
        if (buffer.length > 12 * 1024 * 1024) {
          this.stop();
          return;
        }
        const newline = buffer.indexOf("\n");
        if (newline < 0) return;
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        try {
          const result = JSON.parse(line),
            pending = this.pending;
          if (!pending || result.id !== pending.id) return;
          if (result.error) return pending.finish(Error(result.error));
          const wav = Buffer.from(result.wav, "base64");
          if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.length < 44)
            return pending.finish(Error("Audio clonado invalido."));
          pending.finish(null, wav);
        } catch {
          this.pending?.finish(Error("Resposta invalida do motor de voz."));
        }
      });
      child.stderr.on("data", (chunk) => {
        diagnostic = (diagnostic + chunk.toString()).slice(-2000);
      });
      child.stdin.on("error", (error) => this.pending?.finish(error));
      child.on("error", (error) => {
        if (this.child !== child) return;
        this.child = null;
        this.pending?.finish(error);
      });
      child.on("exit", (code) => {
        if (this.child !== child) return;
        this.child = null;
        this.pending?.finish(
          Error(`Motor de voz encerrado (${code}). ${diagnostic.slice(-600)}`),
        );
      });
    }
    return new Promise((resolve, reject) => {
      const child = this.child,
        id = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.pending?.finish(
          Error(
            "Sintese de referencia excedeu 180s; nao foi usada voz substituta.",
          ),
        );
        this.stop();
      }, 180000);
      const finish = (error, wav) => {
        clearTimeout(timeout);
        if (this.pending?.id !== id) return;
        this.pending = null;
        if (this.child === child) {
          this.idle = setTimeout(() => this.stop(), 300000);
          this.idle.unref?.();
        }
        error ? reject(error) : resolve(wav);
      };
      this.pending = { id, finish };
      child.stdin.write(
        JSON.stringify({ id, text: pronunciationText(text), speed }) + "\n",
      );
    });
  }
  stop() {
    this.generation++;
    clearTimeout(this.idle);
    this.pending?.finish(Error("Fala interrompida."));
    clearTimeout(this.idle);
    const child = this.child;
    this.child = null;
    if (!child) return Promise.resolve();
    return new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill();
    });
  }
}
