import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { safeDirectory, requireDisk } from "./data-directory.mjs";

const REVISION = "1939ad2a8e416c0acfeecc08a694d14ef25f2231";
const HUB = `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/${REVISION}/`;
export const COMPONENTS = Object.freeze([
  {
    file: "kokoro/config.json",
    url: HUB + "config.json",
    size: 44,
    sha: "df34b4f930b23447cd4dc410fabfb42eb3f24e803e6c3f97d618fb359380a36f",
  },
  {
    file: "kokoro/tokenizer.json",
    url: HUB + "tokenizer.json",
    size: 3497,
    sha: "77a02c8e164413299b4b4c403b14f8e0e1c1b727db4d46a09d6327b861060a34",
  },
  {
    file: "kokoro/tokenizer_config.json",
    url: HUB + "tokenizer_config.json",
    size: 113,
    sha: "be1cb066d6ef6b074b3f15e6a6dd21ac88ff3cdaedf325f0aaed686c70f75d20",
  },
  {
    file: "kokoro/onnx/model_quantized.onnx",
    url: HUB + "onnx/model_quantized.onnx",
    size: 92361116,
    sha: "fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478",
  },
  {
    file: "kokoro/voices/bm_george.bin",
    url: HUB + "voices/bm_george.bin",
    size: 522240,
    sha: "c4b235a4c1f2cd3b939fed08b899ce9385638b763f7b73a59616c4fc9bd6c9bc",
  },
  {
    file: "kokoro/voices/pm_alex.bin",
    url: HUB + "voices/pm_alex.bin",
    size: 522240,
    sha: "0175c753f59c54e7fd5a995bedef0c5ff2fb67e0043dd3dcb2ae74ec2acbeb2a",
  },
  {
    file: "kokoro/voices/pm_santa.bin",
    url: HUB + "voices/pm_santa.bin",
    size: 522240,
    sha: "8b012db3185778afe2e45a62cbad69db73021774fe68dda634bcc748a982eede",
  },
  {
    file: "stt-pt.tar.gz",
    url: "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-pt-0.3.tar.gz",
    size: 32440432,
    sha: "499771532fc4c5fc9d7657003a4193275c7f3561a6ccda9226f1d427c010887c",
  },
  {
    file: "stt-wake-en.tar.gz",
    url: "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz",
    size: 41184862,
    sha: "f0b24bb92a48ca575b6a96500d6b543f0f079c573dfe85bbe16001fc0404e1d8",
  },
]);
export function runtimeRoot() {
  return path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), ".local", "share"),
    "DiefJarvis",
    "components",
  );
}
export async function hashFile(file) {
  const hash = crypto.createHash("sha256");
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return hash.digest("hex");
}
export class ComponentInstaller {
  constructor(root = runtimeRoot(), options = {}) {
    this.root = path.resolve(root);
    this.files = options.files || COMPONENTS;
    this.fetch = options.fetch || fetch;
    this.progress = options.progress || (() => {});
    this.active = null;
  }
  target(item) {
    if (
      !item ||
      typeof item.file !== "string" ||
      !/^[a-zA-Z0-9_./-]+$/.test(item.file) ||
      item.file
        .split("/")
        .some((part) => !part || part === "." || part === "..")
    )
      throw Error("Nome de componente invalido.");
    const file = path.resolve(this.root, item.file);
    if (!file.startsWith(this.root + path.sep) || path.isAbsolute(item.file))
      throw Error("Destino de componente invalido.");
    return file;
  }
  async valid(item) {
    try {
      const file = this.target(item),
        stat = await fs.lstat(file);
      await safeDirectory(path.dirname(file));
      return (
        stat.isFile() &&
        !stat.isSymbolicLink() &&
        stat.size === item.size &&
        (await hashFile(file)) === item.sha
      );
    } catch {
      return false;
    }
  }
  async status() {
    const items = [];
    for (const item of this.files)
      items.push({
        name: item.file,
        ready: await this.valid(item),
        bytes: item.size,
      });
    return {
      items,
      ready: items.every((item) => item.ready),
      totalBytes: this.files.reduce((sum, item) => sum + item.size, 0),
      installing: !!this.active,
    };
  }
  async install() {
    if (this.active) throw Error("Uma instalacao ja esta em andamento.");
    const abort = new AbortController();
    this.active = abort;
    try {
      await safeDirectory(this.root, true);
      let needed = 0;
      for (const item of this.files)
        if (!(await this.valid(item))) needed += item.size;
      if (needed) await requireDisk(this.root, needed);
      let completed = 0;
      const total = this.files.reduce((sum, item) => sum + item.size, 0);
      for (const item of this.files) {
        abort.signal.throwIfAborted();
        if (await this.valid(item)) {
          completed += item.size;
          continue;
        }
        const target = this.target(item);
        await safeDirectory(path.dirname(target), true);
        // Model files are data, never installers or code supplied by a prompt.
        const part = target + "." + crypto.randomUUID() + ".part";
        const file = await fs.open(part, "wx", 0o600);
        let received = 0;
        try {
          const response = await this.fetch(item.url, {
            signal: AbortSignal.any([
              abort.signal,
              AbortSignal.timeout(600000),
            ]),
          });
          if (!response.ok || !response.body)
            throw Error(`Download falhou: HTTP ${response.status}`);
          const hash = crypto.createHash("sha256");
          for await (const bytes of response.body) {
            abort.signal.throwIfAborted();
            received += bytes.length;
            if (received > item.size)
              throw Error("Download excedeu o tamanho esperado.");
            hash.update(bytes);
            await file.writeFile(bytes);
            this.progress({
              name: item.file,
              received: completed + received,
              total,
            });
          }
          if (received !== item.size || hash.digest("hex") !== item.sha)
            throw Error(
              "Componente nao passou na verificacao SHA256. Nada sera ativado.",
            );
          await file.sync();
          await file.close();
          abort.signal.throwIfAborted();
          await safeDirectory(path.dirname(target));
          await fs.rename(part, target);
          completed += item.size;
        } catch (error) {
          await file.close().catch(() => {});
          await fs.unlink(part).catch(() => {});
          throw error;
        }
      }
      this.progress({ name: "Pronto", received: total, total });
      return this.status();
    } finally {
      this.active = null;
    }
  }
  cancel() {
    this.active?.abort(Error("Instalacao cancelada."));
  }
}
