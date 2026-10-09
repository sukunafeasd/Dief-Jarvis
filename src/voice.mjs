export class VoiceChannel {
  constructor({
    onTranscript,
    onPhase,
    onError,
    onLevel = () => {},
    onSpokenEnd = () => {},
  }) {
    Object.assign(this, {
      onTranscript,
      onPhase,
      onError,
      onLevel,
      onSpokenEnd,
    });
    this.recognition = null;
    this.utterance = null;
    this.closed = false;
    this.startTimeout = null;
  }
  available() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
  start() {
    if (this.closed || this.recognition) return;
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      this.onError(
        "Reconhecimento de voz indisponivel neste ambiente. A conversa por texto continua ativa.",
      );
      return;
    }
    this.utterance = null;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const recognition = new API();
    this.recognition = recognition;
    const current = () => !this.closed && this.recognition === recognition;
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      if (current()) this.onPhase("listening");
    };
    recognition.onresult = (event) => {
      if (!current()) return;
      let text = "";
      let final = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
        final ||= event.results[i].isFinal;
      }
      this.onTranscript(text, final);
    };
    recognition.onerror = (event) => {
      if (current() && event.error !== "aborted")
        this.onError(
          event.error === "not-allowed"
            ? "Microfone nao autorizado."
            : "Nao consegui reconhecer a fala. Tente novamente ou use texto.",
        );
    };
    recognition.onend = () => {
      if (!current()) return;
      this.recognition = null;
      this.onPhase("idle");
    };
    try {
      recognition.start();
    } catch {
      this.recognition = null;
      this.onError("Nao foi possivel iniciar o microfone.");
    }
  }
  stop() {
    if (this.preparing) {
      this.preparing = null;
      this.cancelling = (
        window.jarvisDesktop?.voice
          ? window.jarvisDesktop.voice({ op: "cancel-speech" })
          : fetch("/__jarvis_voice/cancel-speech", { method: "POST" })
      ).catch(() => {});
    }
    clearTimeout(this.startTimeout);
    const recognition = this.recognition;
    this.recognition = null;
    this.utterance = null;
    this.audio?.pause();
    this.audio = null;
    this.audioContext?.close().catch(() => {});
    this.audioContext = null;
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = null;
    this.onLevel(0);
    if (recognition) {
      recognition.onstart =
        recognition.onresult =
        recognition.onerror =
        recognition.onend =
          null;
      recognition.abort();
    }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (!this.closed) this.onPhase("idle");
  }
  speak(text, options = {}) {
    if (
      options.voiceEngine === "neural" &&
      !window.jarvisDesktop?.voice &&
      !window.jarvisPreviewVoice
    ) {
      this.onPhase("idle");
      this.onError(
        "Voz neural requer o aplicativo preparado ou a previa local; selecione Voz do sistema para este ambiente.",
      );
      return;
    }
    if (
      options.voiceEngine === "neural" &&
      (window.jarvisDesktop?.voice || window.jarvisPreviewVoice)
    ) {
      this.speakNeural(text, options);
      return;
    }
    if (this.closed || !("speechSynthesis" in window)) {
      this.onPhase("idle");
      return;
    }
    clearTimeout(this.startTimeout);
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    this.utterance = utterance;
    utterance.lang = options.voiceLang || "pt-BR";
    utterance.rate = options.voiceRate ?? 0.96;
    utterance.pitch = options.voicePitch ?? 0.9;
    utterance.volume = options.voiceVolume ?? 0.85;
    const voices = speechSynthesis.getVoices();
    const voice =
      voices.find(
        (voice) =>
          voice.voiceURI === options.voiceURI &&
          voice.lang.toLowerCase().startsWith(utterance.lang.toLowerCase()),
      ) ||
      voices.find((voice) =>
        voice.lang.toLowerCase().startsWith(utterance.lang.toLowerCase()),
      );
    if (voice) utterance.voice = voice;
    const current = () => !this.closed && this.utterance === utterance;
    utterance.onstart = () => {
      if (current()) {
        clearTimeout(this.startTimeout);
        this.onPhase("speaking");
      }
    };
    utterance.onend = () => {
      if (current()) {
        clearTimeout(this.startTimeout);
        this.utterance = null;
        this.onPhase("idle");
        this.onSpokenEnd();
      }
    };
    utterance.onerror = () => {
      if (current()) {
        clearTimeout(this.startTimeout);
        this.utterance = null;
        this.onPhase("idle");
        this.onError(
          "A voz nao conseguiu reproduzir a resposta. O texto foi preservado.",
        );
      }
    };
    this.startTimeout = setTimeout(() => {
      if (current()) {
        this.utterance = null;
        speechSynthesis.cancel();
        this.onPhase("idle");
        this.onError(
          "A voz nao iniciou. Verifique as vozes instaladas; a resposta continua no texto.",
        );
      }
    }, 5000);
    try {
      speechSynthesis.speak(utterance);
    } catch {
      utterance.onerror();
    }
  }
  async speakNeural(text, options) {
    this.stop();
    const utterance = {};
    this.utterance = utterance;
    const current = () => !this.closed && this.utterance === utterance;
    this.onPhase("working");
    try {
      await this.cancelling;
      if (!current()) return;
      this.preparing = utterance;
      const wav = window.jarvisDesktop?.voice
        ? await window.jarvisDesktop.voice({
            op: "speak",
            text,
            profile: options.voiceProfile,
            speed: options.voiceRate,
          })
        : await window.jarvisPreviewVoice.speak(
            text,
            options.voiceProfile,
            options.voiceRate,
          );
      if (this.preparing === utterance) this.preparing = null;
      if (!current()) return;
      this.audioUrl = URL.createObjectURL(
        new Blob([wav], { type: "audio/wav" }),
      );
      const audio = new Audio(this.audioUrl);
      this.audio = audio;
      audio.volume = options.voiceVolume ?? 0.85;
      const context = new (window.AudioContext || window.webkitAudioContext)();
      this.audioContext = context;
      const source = context.createMediaElementSource(audio),
        analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(context.destination);
      const samples = new Float32Array(analyser.fftSize);
      const meter = () => {
        if (!current() || audio.paused) return;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        this.onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 5));
        setTimeout(meter, 80);
      };
      audio.onplay = () => {
        if (current()) {
          this.onPhase("speaking");
          meter();
        }
      };
      audio.onended = () => {
        if (current()) {
          this.stop();
          this.onSpokenEnd();
        }
      };
      audio.onerror = () => {
        if (current()) {
          this.stop();
          this.onError(
            "Nao consegui reproduzir a voz; a resposta permanece no texto.",
          );
        }
      };
      await context.resume();
      await audio.play();
    } catch (error) {
      if (current()) {
        this.stop();
        this.onError(
          `Voz neural indisponivel: ${error.message}. A resposta foi preservada.`,
        );
      }
    }
  }
  dispose() {
    this.closed = true;
    this.stop();
  }
}
