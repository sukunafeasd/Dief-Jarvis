import test from "node:test";
import assert from "node:assert/strict";
import { VoiceChannel } from "../src/voice.mjs";
test("voice only starts explicitly, cancellation discards late recognition and does not send automatically", () => {
  let starts = 0,
    aborts = 0;
  const phases = [],
    transcripts = [];
  class Recognition {
    start() {
      starts++;
    }
    abort() {
      aborts++;
    }
  }
  globalThis.window = { SpeechRecognition: Recognition };
  const channel = new VoiceChannel({
    onTranscript: (text) => transcripts.push(text),
    onPhase: (phase) => phases.push(phase),
    onError: () => {},
  });
  assert.equal(starts, 0);
  channel.start();
  assert.equal(starts, 1);
  channel.start();
  assert.equal(starts, 1);
  const old = channel.recognition;
  const result = old.onresult,
    end = old.onend;
  result({
    resultIndex: 0,
    results: [
      Object.assign([{ transcript: "mostre tarefas" }], { isFinal: true }),
    ],
  });
  assert.deepEqual(transcripts, ["mostre tarefas"]);
  channel.stop();
  assert.equal(aborts, 1);
  channel.start();
  result({
    resultIndex: 0,
    results: [Object.assign([{ transcript: "stale" }], { isFinal: true })],
  });
  end();
  assert.deepEqual(transcripts, ["mostre tarefas"]);
  assert.ok(channel.recognition);
  channel.dispose();
  const count = phases.length;
  end();
  assert.equal(phases.length, count);
  delete globalThis.window;
});
test("speech cancellation and old utterance callbacks cannot reset a newer speech state", () => {
  const phases = [];
  const utterances = [];
  globalThis.window = { speechSynthesis: {} };
  globalThis.speechSynthesis = {
    cancel() {},
    getVoices: () => [],
    speak: (item) => utterances.push(item),
  };
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  const channel = new VoiceChannel({
    onTranscript: () => {},
    onPhase: (phase) => phases.push(phase),
    onError: () => {},
  });
  channel.speak("first");
  channel.speak("second");
  utterances[1].onstart();
  utterances[0].onend();
  assert.equal(phases.at(-1), "speaking");
  channel.stop();
  utterances[1].onstart();
  assert.equal(phases.at(-1), "idle");
  channel.dispose();
  delete globalThis.window;
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
});
