export class VoiceChannel {
  constructor({ onTranscript, onPhase, onError }) {
    Object.assign(this, { onTranscript, onPhase, onError });
    this.recognition = null;
    this.utterance = null;
    this.closed = false;
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
    const recognition = this.recognition;
    this.recognition = null;
    this.utterance = null;
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
  speak(text) {
    if (this.closed || !("speechSynthesis" in window)) {
      this.onPhase("idle");
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    this.utterance = utterance;
    utterance.lang = "pt-BR";
    utterance.rate = 1.04;
    const voice = speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith("pt"));
    if (voice) utterance.voice = voice;
    const current = () => !this.closed && this.utterance === utterance;
    utterance.onstart = () => {
      if (current()) this.onPhase("speaking");
    };
    utterance.onend = utterance.onerror = () => {
      if (current()) {
        this.utterance = null;
        this.onPhase("idle");
      }
    };
    speechSynthesis.speak(utterance);
  }
  dispose() {
    this.closed = true;
    this.stop();
  }
}
