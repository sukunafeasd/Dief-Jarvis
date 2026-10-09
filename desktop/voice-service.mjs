import { Worker } from "node:worker_threads";
export class VoiceService {
  constructor(root, options = {}) {
    this.root = root;
    this.worker = null;
    this.active = false;
    this.generation = 0;
    this.createWorker =
      options.workerFactory || ((url, settings) => new Worker(url, settings));
  }
  async speak(text, profile, speed) {
    const generation = this.generation;
    await this.stopping;
    if (generation !== this.generation)
      throw Error("Fala cancelada antes de iniciar.");
    if (this.active) throw Error("Uma fala ja esta sendo preparada.");
    this.active = true;
    clearTimeout(this.idle);
    try {
      if (!this.worker) {
        const created = this.createWorker(
          new URL("./tts-worker.mjs", import.meta.url),
          { workerData: { root: this.root } },
        );
        this.worker = created;
        created.on("error", () => {
          if (this.worker === created) this.worker = null;
        });
      }
      const worker = this.worker,
        id = crypto.randomUUID();
      return await new Promise((resolve, reject) => {
        const clear = () => {
          clearTimeout(timeout);
          worker.off("message", message);
          worker.off("error", failed);
          worker.off("exit", exited);
        };
        const message = (result) => {
          if (result.id !== id) return;
          clear();
          result.error
            ? reject(Error(result.error))
            : resolve(Buffer.from(result.wav));
        };
        const failed = (error) => {
          clear();
          if (this.worker === worker) this.worker = null;
          reject(error);
        };
        const exited = () => failed(Error("Motor de voz interrompido."));
        const timeout = setTimeout(() => {
          clear();
          this.stop();
          reject(Error("O motor de voz excedeu o tempo permitido."));
        }, 60000);
        worker.on("message", message);
        worker.once("error", failed);
        worker.once("exit", exited);
        worker.postMessage({ id, text, profile, speed });
      });
    } finally {
      this.active = false;
      if (this.worker) {
        this.idle = setTimeout(() => this.stop(), 120000);
        this.idle.unref?.();
      }
    }
  }
  stop() {
    this.generation++;
    clearTimeout(this.idle);
    const worker = this.worker;
    this.worker = null;
    this.stopping = worker
      ? worker.terminate()
      : this.stopping || Promise.resolve();
    return this.stopping;
  }
}
