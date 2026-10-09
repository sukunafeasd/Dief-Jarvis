import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  validateState,
  verifyAudit,
} from "../src/core/model.mjs";
import { JarvisEngine } from "../src/core/engine.mjs";
import { AgentController } from "../src/core/agent.mjs";
import { AssistantSession } from "../src/core/assistant.mjs";
import {
  presentationFor,
  spokenItem,
  weatherScene,
  availableTopics,
} from "../src/core/presentation.mjs";
import {
  speechRate,
  speechMode,
  limiterCurve,
  VOICE_STYLE,
} from "../src/core/voice-style.mjs";
import { weatherCondition } from "../desktop/weather.mjs";
import { EventEmitter } from "node:events";
import { VoiceService } from "../desktop/voice-service.mjs";
function fixture() {
  let state;
  const storage = {
    read: async () => state && structuredClone(state),
    save: async (_revision, value) => {
      state = structuredClone(value);
    },
  };
  const engine = new JarvisEngine(storage);
  return {
    engine,
    storage,
    assistant: new AssistantSession(engine, new AgentController(engine)),
  };
}
test("short phrase cache skips synthesis, separates modes and never retains personal speech", async () => {
  let calls = 0;
  const service = new VoiceService("unused", {
    workerFactory: () => {
      const worker = new EventEmitter();
      worker.postMessage = (request) => {
        calls++;
        queueMicrotask(() =>
          worker.emit("message", { id: request.id, wav: Buffer.from("RIFF") }),
        );
      };
      worker.terminate = async () => {
        worker.emit("exit", 0);
      };
      return worker;
    },
  });
  try {
    const original = await service.speak("Entendido.", "dief_pt", 0.94);
    original[0] = 0;
    assert.equal(
      (await service.speak("Entendido.", "dief_pt", 0.94)).toString(),
      "RIFF",
    );
    assert.equal(calls, 1);
    await service.speak("Entendido.", "dief_pt", 1.1);
    await service.speak("Tenho uma consulta pessoal.", "dief_pt", 0.94);
    await service.speak("Tenho uma consulta pessoal.", "dief_pt", 0.94);
    assert.equal(calls, 4);
    assert.equal(service.cache.size, 2);
  } finally {
    await service.stop();
  }
  assert.equal(service.cache.size, 0);
});
test("spoken task questions produce real names/counts and keep full records", async () => {
  const f = fixture();
  await f.engine.execute({ type: "task.create", text: "Revisar voz" });
  const result = await f.assistant.respond("quais tarefas temos");
  assert.match(result.reply, /Revisar voz/);
  assert.match(result.reply, /1 tarefa/);
  assert.equal(result.state.tasks.length, 1);
  assert.ok(await verifyAudit(result.state));
});
test("pins persist, reject forged topics and never fabricate data or privilege", async () => {
  const f = fixture();
  await f.engine.execute({ type: "chat.send", content: "fixe clima" });
  const state = await new JarvisEngine(f.storage).read();
  assert.deepEqual(state.pins, ["weather"]);
  assert.equal(state.settings.access.commands, false);
  assert.deepEqual(presentationFor(state, "weather").items, []);
  await assert.rejects(
    f.engine.execute({ type: "screen.pin", topic: "gmail", value: true }),
  );
  await f.engine.execute({
    type: "screen.pin",
    topic: "weather",
    value: false,
  });
  assert.deepEqual((await f.engine.read()).pins, []);
  const agent = new AgentController(f.engine);
  const planned = await agent.prepare("fixe tarefas", {
    summary: "Fixar tarefas",
    steps: [{ tool: "screen.pin", args: { topic: "tasks", mode: "pin" } }],
  });
  assert.deepEqual(planned.state.pins, []);
  await agent.run(planned.state.runs[0].id);
  assert.deepEqual((await f.engine.read()).pins, ["tasks"]);
});
test("automatic pinning requires repeated user interest and actual consulted data", async () => {
  const f = fixture();
  for (let count = 0; count < 3; count++)
    await f.engine.execute({ type: "chat.send", content: "mostre tarefas" });
  assert.deepEqual((await f.engine.read()).pins, ["tasks"]);
  for (let count = 0; count < 3; count++)
    await f.engine.execute({ type: "chat.send", content: "noticias" });
  assert.ok(!(await f.engine.read()).pins.includes("news"));
});
test("presentation uses actual weather condition, newsroom titles and speech segment highlight", () => {
  const state = initialState();
  state.cards = [
    {
      id: "rain",
      kind: "weather",
      title: "Porto Alegre",
      value: "16",
      unit: "C",
      source: "Open-Meteo",
      at: new Date().toISOString(),
      weatherCode: 61,
    },
  ];
  validateState(state);
  const deck = presentationFor(state);
  assert.equal(deck.scene, "rain");
  assert.equal(deck.items[0].value, "16");
  assert.equal(
    spokenItem(deck, { text: "Porto Alegre: 16 graus", index: 0, total: 1 }),
    0,
  );
  assert.equal(weatherScene(undefined), "weather");
  assert.equal(weatherScene(0), "sun");
  assert.equal(weatherScene(73), "snow");
  assert.equal(weatherCondition(61), "Chuva");
  state.cards[0].weatherCode = 1000;
  assert.throws(() => validateState(state));
});
test("topics and visual selections do not lose other existing panels", () => {
  const state = initialState();
  state.panels = ["tasks", "memory"];
  assert.deepEqual(availableTopics(state), ["tasks", "memory"]);
  assert.equal(presentationFor(state, "memory").topic, "memory");
  state.panels = [];
  state.tasks = [{ id: "task", text: "Revisar", done: false }];
  assert.deepEqual(availableTopics(state), ["tasks"]);
  assert.equal(presentationFor(state, "tasks").items[0].title, "Revisar");
  state.pins = ["tasks"];
  assert.equal(presentationFor(state).topic, "tasks");
  state.focus = true;
  assert.equal(presentationFor(state), null);
});
test("voice style stays original, bounded and one identity across nine modes", () => {
  assert.equal(VOICE_STYLE.identity, "original");
  assert.equal(Object.keys(VOICE_STYLE.modes).length, 9);
  assert.equal(speechMode("Temperatura critica"), "urgent");
  assert.ok(
    speechRate("Ola", { voiceRate: 0.94, voiceMode: "analysis" }) < 0.94,
  );
  assert.ok(speechRate("Ola", { voiceRate: 1.4, voiceMode: "urgent" }) <= 1.4);
  const curve = limiterCurve();
  assert.ok(curve.every(Number.isFinite));
  assert.ok(Math.max(...curve.map(Math.abs)) <= 0.921);
});
