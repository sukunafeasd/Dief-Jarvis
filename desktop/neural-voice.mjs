// SPDX-License-Identifier: GPL-3.0-or-later
import fs from "node:fs/promises";
import path from "node:path";

export const VOICE_PROFILES = Object.freeze({
  pm_alex: { name: "Alex / Portugues", language: "pt-BR", locale: "pt-BR" },
  bm_george: { name: "George / British", language: "en", locale: "en-GB" },
});
export function speechChunks(text, limit = 140) {
  if (typeof text !== "string" || !text.trim() || text.length > 4000)
    throw Error("Texto de voz invalido.");
  const chunks = [];
  let chunk = "";
  for (const word of text.trim().split(/\s+/)) {
    if (word.length > limit) throw Error("Palavra longa demais para sintese.");
    if (chunk.length + word.length + 1 > limit) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += (chunk ? " " : "") + word;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}
export function wavEncode(samples, rate = 24000) {
  const data = Buffer.alloc(44 + samples.length * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index++)
    data.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[index] || 0)) * 32767),
      44 + index * 2,
    );
  return data;
}
export class NeuralVoice {
  constructor(root) {
    this.root = root;
    this.ready = null;
    this.queue = Promise.resolve();
  }
  async load() {
    this.ready ||= (async () => {
      const { env, StyleTextToSpeech2Model, AutoTokenizer, Tensor } =
        await import("@huggingface/transformers");
      env.allowRemoteModels = false;
      env.allowLocalModels = true;
      env.localModelPath = this.root + path.sep;
      const model = await StyleTextToSpeech2Model.from_pretrained("kokoro", {
        dtype: "q8",
        device: "cpu",
        local_files_only: true,
      });
      const tokenizer = await AutoTokenizer.from_pretrained("kokoro", {
        local_files_only: true,
      });
      const { default: createEphone, roa, en_all } = await import("ephone");
      const phones = await createEphone([roa, en_all]);
      return { model, tokenizer, Tensor, phones };
    })().catch((error) => {
      this.ready = null;
      throw error;
    });
    return this.ready;
  }
  speak(text, profile = "pm_alex", speed = 0.94) {
    if (
      !Object.hasOwn(VOICE_PROFILES, profile) ||
      !Number.isFinite(speed) ||
      speed < 0.6 ||
      speed > 1.4
    )
      return Promise.reject(Error("Perfil de voz invalido."));
    const chunks = speechChunks(text);
    const task = this.queue.then(async () => {
      const { model, tokenizer, Tensor, phones } = await this.load();
      const bytes = await fs.readFile(
        path.join(this.root, "kokoro", "voices", profile + ".bin"),
      );
      const styles = new Float32Array(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
      );
      const audio = [];
      let length = 0;
      for (const chunk of chunks) {
        phones.setVoice(VOICE_PROFILES[profile].language);
        const ipa = phones.textToIpa(chunk);
        const { input_ids } = tokenizer(ipa, { truncation: false });
        const count = input_ids.dims.at(-1) - 2;
        if (count < 1 || count > 509)
          throw Error(
            "Trecho excedeu o contexto da voz; nada foi cortado silenciosamente.",
          );
        const style = styles.slice(count * 256, (count + 1) * 256);
        const result = await model({
          input_ids,
          style: new Tensor("float32", style, [1, 256]),
          speed: new Tensor("float32", [speed], [1]),
        });
        const samples = Float32Array.from(result.waveform.data);
        if (!samples.length || samples.length > 24000 * 120)
          throw Error("Audio gerado invalido.");
        audio.push(samples, new Float32Array(1440));
        length += samples.length + 1440;
      }
      const samples = new Float32Array(length);
      let offset = 0;
      for (const part of audio) {
        samples.set(part, offset);
        offset += part.length;
      }
      return wavEncode(samples);
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
