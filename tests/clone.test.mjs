import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { ClonedVoice } from "../desktop/clone-voice.mjs";
import { initialState } from "../src/core/model.mjs";
import { JarvisEngine } from "../src/core/engine.mjs";
import { wavEncode } from "../desktop/neural-voice.mjs";
test("clone mode is default, migrates Kokoro once and preserves later explicit voice selection", async () => {
  let state = initialState();
  assert.equal(state.settings.voiceEngine, "clone");
  delete state.settings.clonePresetVersion;
  state.settings.voiceEngine = "neural";
  const engine = new JarvisEngine({
    read: async () => structuredClone(state),
    save: async (_revision, value) => {
      state = structuredClone(value);
    },
  });
  assert.equal((await engine.read()).settings.voiceEngine, "clone");
  await engine.execute({
    type: "settings.update",
    changes: { voiceEngine: "neural" },
  });
  assert.equal((await engine.read()).settings.voiceEngine, "neural");
  await engine.execute({
    type: "settings.update",
    changes: { voiceEngine: "azure" },
  });
  assert.equal((await engine.read()).settings.voiceEngine, "azure");
});
test("clone worker is isolated, serial, cancellable and reusable", async () => {
  let child;
  const service = new ClonedVoice({
    spawn: (file, args, options) => {
      assert.equal(options.windowsHide, true);
      assert.equal(options.shell, false);
      assert.equal(options.env.HF_HUB_OFFLINE, "1");
      child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdin = new EventEmitter();
      child.stdout.setEncoding = () => {};
      child.stdin.write = (line) => {
        child.request = JSON.parse(line);
      };
      child.kill = () => queueMicrotask(() => child.emit("exit", 0));
      return child;
    },
  });
  service.configuration = async () => ({
    python: "C:/test/python.exe",
    model: "C:/test/model",
    reference: "C:/test/reference.wav",
    language: "pt",
  });
  const active = service.speak("Ola", "reference", 1);
  await Promise.resolve();
  await assert.rejects(service.speak("duplicate", "reference", 1), /preparada/);
  const failed = assert.rejects(active, /interrompida/);
  await service.stop();
  await failed;
  const wav = wavEncode(new Float32Array(24).fill(0.1), 24000);
  const pending = service.speak("Entendido.", "reference", 0.96);
  await Promise.resolve();
  child.stdout.emit(
    "data",
    JSON.stringify({ id: child.request.id, wav: wav.toString("base64") }) +
      "\n",
  );
  assert.deepEqual(await pending, wav);
  await service.stop();
});
test("missing clone setup and invalid requests fail explicitly without falling back to another voice", async () => {
  const service = new ClonedVoice({
    configPath: "C:/missing-dief-fixture/config.json",
  });
  await assert.rejects(
    service.speak("Teste", "reference", 1),
    /Nenhuma voz substituta/,
  );
  await assert.rejects(service.speak("Teste", "reference", NaN), /invalido/);
  await service.stop();
});
