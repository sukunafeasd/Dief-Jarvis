import profile from "./voice_profile.json" with { type: "json" };
export { profile as VOICE_STYLE };
export function speechMode(text, preference = "auto") {
  if (Object.hasOwn(profile.modes, preference)) return preference;
  const value = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/critica|interrompa imediatamente|urgente/.test(value)) return "urgent";
  if (/nao consegui|falhou|risco|recomendo interromper/.test(value))
    return "warning";
  if (/hipotese|possiveis causas|estou verificando/.test(value))
    return "analysis";
  if (/^(concluido|feito|pronto|salvei|tarefa salva)/.test(value))
    return "confirmation";
  if (/^(bom dia|boa tarde|boa noite|estou aqui)/.test(value))
    return "greeting";
  return "informative";
}
export function speechRate(text, options = {}) {
  const mode = speechMode(text, options.voiceMode);
  return Math.max(
    0.6,
    Math.min(1.4, (options.voiceRate ?? profile.pace) * profile.modes[mode]),
  );
}
export function limiterCurve(size = 2048) {
  return Float32Array.from({ length: size }, (_, index) => {
    const x = (index * 2) / (size - 1) - 1;
    return (Math.tanh(x * 1.05) / Math.tanh(1.05)) * profile.audio.ceiling;
  });
}
export function voiceEffects(context, enabled = true) {
  if (!enabled || typeof context.createBiquadFilter !== "function")
    return { input: null, output: null, dispose() {} };
  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = profile.audio.highpassHz;
  highpass.Q.value = 0.707;
  const presence = context.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = profile.audio.presenceHz;
  presence.Q.value = 0.7;
  presence.gain.value = profile.audio.presenceDb;
  const shelf = context.createBiquadFilter();
  shelf.type = "highshelf";
  shelf.frequency.value = profile.audio.shelfHz;
  shelf.gain.value = profile.audio.shelfDb;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = profile.audio.thresholdDb;
  compressor.knee.value = 12;
  compressor.ratio.value = profile.audio.ratio;
  compressor.attack.value = profile.audio.attackSeconds;
  compressor.release.value = profile.audio.releaseSeconds;
  const limiter = context.createWaveShaper();
  limiter.curve = limiterCurve();
  limiter.oversample = "2x";
  const nodes = [highpass, presence, shelf, compressor, limiter];
  nodes.slice(0, -1).forEach((node, index) => node.connect(nodes[index + 1]));
  return {
    input: highpass,
    output: limiter,
    dispose() {
      nodes.forEach((node) => node.disconnect());
    },
  };
}
