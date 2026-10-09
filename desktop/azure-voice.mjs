import { speechChunks, pronunciationText } from "../src/core/speech.mjs";

const REGIONS = new Set([
  "brazilsouth",
  "eastus",
  "eastus2",
  "westus",
  "westus2",
  "westus3",
  "southcentralus",
  "centralus",
  "northeurope",
  "westeurope",
  "uksouth",
  "southeastasia",
  "australiaeast",
]);
export const AZURE_VOICES = ["pt-BR-AntonioNeural", "pt-BR-CaioNeural"];
export function validateAzureConfig(value) {
  if (
    !value ||
    !REGIONS.has(value.region) ||
    typeof value.key !== "string" ||
    !/^[a-zA-Z0-9_-]{20,200}$/.test(value.key)
  )
    throw Error("Regiao ou chave Azure Speech invalida.");
  return { region: value.region, key: value.key };
}
export function azureSSML(text, profile = AZURE_VOICES[0], speed = 1) {
  if (
    !AZURE_VOICES.includes(profile) ||
    !Number.isFinite(speed) ||
    speed < 0.6 ||
    speed > 1.4
  )
    throw Error("Voz Azure invalida.");
  const spoken = pronunciationText(speechChunks(text).join(" "));
  const escape = (value) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[char],
    );
  return `<speak version="1.0" xml:lang="pt-BR"><voice name="${profile}"><prosody rate="${Math.round((speed - 1) * 100)}%">${escape(spoken)}</prosody></voice></speak>`;
}
export class AzureVoice {
  constructor(readConfig, fetcher = fetch) {
    this.readConfig = readConfig;
    this.fetcher = fetcher;
    this.active = new Set();
    this.generation = 0;
  }
  stop() {
    this.generation++;
    for (const controller of this.active) controller.abort();
    this.active.clear();
  }
  async speak(text, profile, speed) {
    const generation = this.generation;
    const body = azureSSML(text, profile, speed);
    const config = validateAzureConfig(await this.readConfig());
    if (generation !== this.generation) throw Error("Sintese Azure cancelada.");
    const controller = new AbortController();
    this.active.add(controller);
    try {
      const response = await this.fetcher(
        `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(20000),
          ]),
          headers: {
            "Ocp-Apim-Subscription-Key": config.key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
            "User-Agent": "DiefJarvis",
          },
          body,
        },
      );
      if (!response.ok)
        throw Error(
          `Azure Speech respondeu HTTP ${response.status}. Confira a chave, regiao e cota.`,
        );
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 6 * 1024 * 1024)
            throw Error("Audio Azure excedeu o limite.");
          chunks.push(Buffer.from(part.value));
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      const wav = Buffer.concat(chunks);
      if (
        wav.length < 44 ||
        wav.toString("ascii", 0, 4) !== "RIFF" ||
        wav.toString("ascii", 8, 12) !== "WAVE"
      )
        throw Error("Azure nao retornou audio WAV valido.");
      return wav;
    } finally {
      this.active.delete(controller);
    }
  }
}
