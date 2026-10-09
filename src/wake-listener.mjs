import { WakeGate } from "./wake-gate.mjs";
export function wakeCommand(text) {
  if (typeof text !== "string") return null;
  const match = text
    .trim()
    .match(/\b(?:jarvis|javis|jarves|jarvi|javes)\b[,\s.!?:-]*(.*)$/i);
  return match ? match[1].trim() || text.slice(0, match.index).trim() : null;
}
export async function loadSpeechModel(modelUrl, signal) {
  signal?.throwIfAborted();
  const { Model } = await import("vosk-browser");
  signal?.throwIfAborted();
  const model = new Model(modelUrl, -1);
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      model.terminate();
      reject(Error(message));
    };
    const cancel = () => fail("Carregamento da escuta cancelado.");
    const timer = setTimeout(
      () => fail("O reconhecimento local nao carregou dentro de 60 segundos."),
      60000,
    );
    signal?.addEventListener("abort", cancel, { once: true });
    model.on("error", (event) =>
      fail(event.error || "Modelo de reconhecimento indisponivel."),
    );
    model.on("load", (event) => {
      if (settled) return;
      clearTimeout(timer);
      if (!event.result)
        return fail("Modelo de reconhecimento nao foi carregado.");
      settled = true;
      signal?.removeEventListener("abort", cancel);
      resolve(model);
    });
  });
}
export class WakeListener {
  constructor({ onCommand, onState, onLevel, onError, modelUrl, keywordUrl }) {
    Object.assign(this, {
      onCommand,
      onState,
      onLevel,
      onError,
      modelUrl,
      keywordUrl,
    });
    this.enabled = false;
    this.muted = false;
    this.generation = 0;
    this.awaiting = 0;
  }
  async start(language = "pt-BR") {
    if (this.enabled) return;
    const generation = ++this.generation;
    this.enabled = true;
    this.loadingAbort = new AbortController();
    this.onState("loading");
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      await this.context.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
        video: false,
      });
      if (!this.enabled || generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      stream.getAudioTracks().forEach((track) => {
        track.addEventListener(
          "ended",
          () => {
            if (this.enabled && generation === this.generation) {
              this.stop();
              this.onError("O acesso ao microfone foi encerrado.");
            }
          },
          { once: true },
        );
      });
      const english = language === "en-GB";
      const model = await loadSpeechModel(
        english ? this.keywordUrl : this.modelUrl,
        this.loadingAbort.signal,
      );
      if (!this.enabled || generation !== this.generation) {
        model.terminate();
        return;
      }
      this.model = model;
      model.setLogLevel(-1);
      const keywordModel = english
        ? model
        : await loadSpeechModel(this.keywordUrl, this.loadingAbort.signal);
      if (!this.enabled || generation !== this.generation) {
        keywordModel.terminate();
        return;
      }
      this.keywordModel = keywordModel;
      this.resetRecognizer();
      const source = this.context.createMediaStreamSource(stream);
      await this.context.audioWorklet.addModule(
        new URL("audio-capture.worklet.js", document.baseURI).href,
      );
      if (!this.enabled || generation !== this.generation) return;
      const processor = new AudioWorkletNode(this.context, "dief-capture");
      const silent = this.context.createGain();
      silent.gain.value = 0;
      this.nodes = [source, processor, silent];
      processor.port.onmessage = ({ data: samples }) => {
        if (
          !this.enabled ||
          generation !== this.generation ||
          this.muted ||
          !this.recognizer
        )
          return;
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        this.onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 7));
        this.recognizer.acceptWaveformFloat(samples, this.context.sampleRate);
        this.keywordRecognizer?.acceptWaveformFloat(
          samples,
          this.context.sampleRate,
        );
      };
      source.connect(processor);
      processor.connect(silent);
      silent.connect(this.context.destination);
      this.onState("listening");
    } catch (error) {
      if (generation === this.generation) {
        this.stop();
        this.onError(`Microfone nao iniciou: ${error.message}`);
      }
    }
  }
  resetRecognizer() {
    this.recognizer?.remove();
    this.keywordRecognizer?.remove();
    this.keywordRecognizer = null;
    this.recognizer = null;
    if (
      !this.enabled ||
      this.muted ||
      !this.model ||
      !this.keywordModel ||
      !this.context
    )
      return;
    const gate = new WakeGate();
    const recognizer = new this.model.KaldiRecognizer(this.context.sampleRate);
    recognizer.setWords(true);
    this.recognizer = recognizer;
    const keywords = new this.keywordModel.KaldiRecognizer(
      this.context.sampleRate,
      JSON.stringify(["jarvis", "[unk]"]),
    );
    keywords.setWords(true);
    this.keywordRecognizer = keywords;
    const deliver = (commands) => {
      if (
        !commands.length ||
        !this.enabled ||
        this.muted ||
        this.recognizer !== recognizer
      )
        return;
      const command = commands[0];
      this.awaiting = 0;
      this.wakePending = !command;
      this.onState("addressed");
      this.onCommand(command || "jarvis");
    };
    keywords.on("result", (event) => {
      if (this.keywordRecognizer === keywords && !this.muted)
        deliver(gate.keyword(event.result));
    });
    recognizer.on("result", (event) => {
      if (!this.enabled || this.muted || this.recognizer !== recognizer) return;
      const text = event.result.text;
      if (this.awaiting > Date.now() && text?.trim())
        deliver([wakeCommand(text) ?? text.trim()]);
      else deliver(gate.transcript(event.result));
    });
  }
  setMuted(value) {
    if (this.muted !== value) {
      if (value) this.awaiting = 0;
      this.muted = value;
      this.resetRecognizer();
    }
  }
  afterSpeech() {
    if (!this.enabled || !this.wakePending) return;
    this.wakePending = false;
    this.awaiting = Date.now() + 8000;
    this.onState("addressed");
    clearTimeout(this.followup);
    this.followup = setTimeout(() => {
      if (this.enabled) this.onState("listening");
    }, 8000);
  }
  arm() {
    if (!this.enabled || this.muted || !this.recognizer) return;
    this.wakePending = false;
    this.awaiting = Date.now() + 12000;
    this.onState("addressed");
    clearTimeout(this.followup);
    this.followup = setTimeout(() => {
      this.awaiting = 0;
      if (this.enabled) this.onState("listening");
    }, 12000);
  }
  stop() {
    this.enabled = false;
    this.loadingAbort?.abort();
    this.generation++;
    this.awaiting = 0;
    this.wakePending = false;
    clearTimeout(this.followup);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    for (const node of this.nodes || []) {
      if (node.port) node.port.onmessage = null;
      node.disconnect();
    }
    this.nodes = [];
    this.recognizer?.remove();
    this.recognizer = null;
    this.keywordRecognizer?.remove();
    this.keywordRecognizer = null;
    if (this.keywordModel !== this.model) this.keywordModel?.terminate();
    this.keywordModel = null;
    this.model?.terminate();
    this.model = null;
    this.context?.close().catch(() => {});
    this.context = null;
    this.onLevel(0);
    this.onState("off");
  }
}
