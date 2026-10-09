import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { VoiceService } from "../desktop/voice-service.mjs";
import { createRequire } from "node:module";
import { ComponentInstaller } from "../desktop/components.mjs";
import { publicAddress, publicUrl } from "../desktop/web-policy.mjs";
import { desktopRequest } from "../desktop/desktop-service.mjs";
import { currentWeather } from "../desktop/weather.mjs";
import { techHeadlines } from "../desktop/news.mjs";
import { publicJson } from "../desktop/public-json.mjs";
import {
  speechChunks,
  wavEncode,
  NeuralVoice,
} from "../desktop/neural-voice.mjs";
import { WakeGate } from "../src/wake-gate.mjs";
import { JarvisEngine } from "../src/core/engine.mjs";
import { AgentController } from "../src/core/agent.mjs";
import { AssistantSession, mayAutoExecute } from "../src/core/assistant.mjs";
import { ollamaAssistant } from "../src/core/ollama.mjs";
import { localPlan } from "../src/core/tools.mjs";
import { verifyAudit } from "../src/core/model.mjs";
const { allowAudioCheck, allowAudioRequest } = createRequire(import.meta.url)(
  "../desktop/policy.cjs",
);
const json = (value) => new Response(JSON.stringify(value));
const signal = () => new AbortController().signal;
test("speech worker cancels queued/active synthesis, refuses concurrency and remains reusable", async () => {
  let worker;
  const service = new VoiceService("unused", {
    workerFactory: () => {
      worker = new EventEmitter();
      worker.postMessage = (request) => {
        worker.request = request;
      };
      worker.terminate = async () => {
        worker.emit("exit", 1);
        return 1;
      };
      return worker;
    },
  });
  const queued = service.speak("x");
  await service.stop();
  await assert.rejects(queued, /cancelada/);
  const active = service.speak("x");
  await Promise.resolve();
  await assert.rejects(service.speak("duplicate"), /preparada/);
  const cancelled = assert.rejects(active, /interrompido/);
  await service.stop();
  await cancelled;
  const next = service.speak("ok");
  await Promise.resolve();
  worker.emit("message", { id: worker.request.id, wav: Buffer.from("RIFF") });
  assert.equal((await next).toString(), "RIFF");
  worker.emit("error", Error("idle worker failure"));
  assert.equal(service.worker, null);
  await service.stop();
});
function fixture(options = {}) {
  let saved;
  const engine = new JarvisEngine({
    read: async () => saved && structuredClone(saved),
    save: async (_revision, value) => {
      saved = structuredClone(value);
    },
  });
  const agent = new AgentController(engine, options);
  return { engine, agent };
}
async function temporary(fn) {
  const base = path.resolve(os.tmpdir()),
    root = await fs.mkdtemp(path.join(base, "dief-voice-test-"));
  try {
    await fn(root);
  } finally {
    assert.equal(path.dirname(root), base);
    assert.ok(path.basename(root).startsWith("dief-voice-test-"));
    await fs.rm(root, { recursive: true, force: true });
  }
}
function fileManifest(data) {
  return [
    {
      file: "models/test.bin",
      url: "https://example.com/model",
      size: data.length,
      sha: crypto.createHash("sha256").update(data).digest("hex"),
    },
  ];
}
test("components validate SHA256, reuse verified files and repair corrupt files", () =>
  temporary(async (root) => {
    const bytes = Buffer.from("verified model data"),
      files = fileManifest(bytes);
    let calls = 0;
    const installer = new ComponentInstaller(root, {
      files,
      fetch: async () => {
        calls++;
        return new Response(bytes);
      },
    });
    assert.equal((await installer.status()).ready, false);
    assert.equal((await installer.install()).ready, true);
    await installer.install();
    assert.equal(calls, 1);
    await fs.writeFile(installer.target(files[0]), "corrupt");
    assert.equal((await installer.status()).ready, false);
    await installer.install();
    assert.equal(calls, 2);
  }));
test("failed integrity never activates a model or leaves partial files", () =>
  temporary(async (root) => {
    const data = Buffer.from("expected"),
      files = fileManifest(data);
    const installer = new ComponentInstaller(root, {
      files,
      fetch: async () => new Response(Buffer.from("bad data")),
    });
    await assert.rejects(installer.install(), /SHA256/);
    assert.equal((await installer.status()).ready, false);
    assert.deepEqual(await fs.readdir(path.join(root, "models")), []);
  }));
test("oversized and cancelled component downloads do not become ready", () =>
  temporary(async (root) => {
    const data = Buffer.from("test"),
      files = fileManifest(data);
    const oversized = new ComponentInstaller(root, {
      files,
      fetch: async () => new Response(Buffer.alloc(20)),
    });
    await assert.rejects(oversized.install(), /tamanho/);
    let cancelled;
    cancelled = new ComponentInstaller(root, {
      files,
      fetch: async () => new Response(data),
      progress: () => cancelled.cancel(),
    });
    await assert.rejects(cancelled.install(), /cancelada/);
    assert.deepEqual(await fs.readdir(path.join(root, "models")), []);
  }));
test("component destinations and linked directories cannot escape the runtime", () =>
  temporary(async (root) => {
    const installer = new ComponentInstaller(root);
    for (const file of [
      "../x",
      "C:/evil",
      "/x",
      "x:stream",
      "x\\y",
      "x/./y",
      "x//y",
    ])
      assert.throws(() => installer.target({ file }));
    const outside = path.join(root, "outside");
    await fs.mkdir(outside);
    await fs.symlink(
      outside,
      path.join(root, "models"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const linked = new ComponentInstaller(root, {
      files: fileManifest(Buffer.from("x")),
      fetch: async () => {
        throw Error("must not download");
      },
    });
    await assert.rejects(linked.install(), /redirecionado/);
    assert.deepEqual(await fs.readdir(outside), []);
  }));
test("microphone grant never grants camera, screen capture, subframes or foreign apps", () => {
  const contents = {},
    own = { webContents: contents, isDestroyed: () => false };
  const details = {
    requestingUrl: "jarvis://app/",
    isMainFrame: true,
    mediaType: "audio",
    mediaTypes: ["audio"],
  };
  assert.ok(
    allowAudioCheck(contents, own, true, "media", "jarvis://app/", details),
  );
  assert.ok(allowAudioRequest(contents, own, true, "media", details));
  for (const changed of [
    { mediaType: "video", mediaTypes: ["video"] },
    { mediaTypes: ["audio", "video"] },
    { isMainFrame: false },
    { requestingUrl: "https://evil.example" },
  ]) {
    assert.equal(
      allowAudioRequest(contents, own, true, "media", {
        ...details,
        ...changed,
      }),
      false,
    );
  }
  assert.equal(
    allowAudioCheck(contents, own, true, "media", "jarvis://app/", {
      ...details,
      mediaType: "unknown",
    }),
    false,
  );
  assert.equal(allowAudioRequest({}, own, true, "media", details), false);
  assert.equal(
    allowAudioRequest(contents, own, false, "media", details),
    false,
  );
  assert.equal(
    allowAudioRequest(contents, own, true, "display-capture", details),
    false,
  );
});
test("public browser policy blocks private, reserved and IPv4-mapped IPv6 destinations", async () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.1.1",
    "192.168.1.1",
    "169.254.1.2",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "2001:db8::1",
    "198.18.0.1",
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.ok(publicAddress("8.8.8.8"));
  assert.ok(publicAddress("2606:4700:4700::1111"));
  for (const url of [
    "http://example.com",
    "https://user:pass@example.com",
    "https://localhost",
    "https://example.com:8080",
    "file:///secret",
  ])
    await assert.rejects(publicUrl(url, async () => [{ address: "8.8.8.8" }]));
  await assert.rejects(
    publicUrl("https://example.com", async () => [
      { address: "8.8.8.8" },
      { address: "127.0.0.1" },
    ]),
  );
  assert.equal(
    await publicUrl("https://example.com/path", async () => [
      { address: "8.8.8.8" },
    ]),
    "https://example.com/path",
  );
});
test("desktop requests are typed, contain no shell and refuse forged operations", () => {
  assert.deepEqual(
    desktopRequest({
      tool: "desktop.type",
      args: { window: "10:20", ref: "42,-10", text: "test" },
    }),
    { window: "10:20", ref: "42,-10", text: "test", op: "type" },
  );
  for (const step of [
    { tool: "desktop.list", args: { op: "exec" } },
    { tool: "desktop.type", args: { window: "10:20", ref: "42,1", text: "" } },
    { tool: "desktop.invoke", args: { window: "powershell", ref: "42,1" } },
    { tool: "shell.exec", args: {} },
  ])
    assert.throws(() => desktopRequest(step));
});
test("wake gate correlates model clocks in either arrival order and never wakes without the name", () => {
  const transcript = {
    text: "jardim se minhas tarefas",
    result: [
      { word: "jardim", start: 0.1, end: 0.5 },
      { word: "se", start: 0.5, end: 0.63 },
      { word: "minhas", start: 0.7, end: 1 },
      { word: "tarefas", start: 1, end: 1.4 },
    ],
  };
  const keyword = {
    result: [{ word: "jarvis", conf: 0.95, start: 0.1, end: 0.65 }],
  };
  const first = new WakeGate();
  assert.deepEqual(first.transcript(transcript), []);
  assert.deepEqual(first.keyword(keyword), ["minhas tarefas"]);
  assert.deepEqual(first.keyword(keyword), []);
  const second = new WakeGate();
  assert.deepEqual(second.keyword(keyword), []);
  assert.deepEqual(second.transcript(transcript), ["minhas tarefas"]);
  const negative = new WakeGate();
  negative.keyword({ result: [{ ...keyword.result[0], conf: 0.2 }] });
  assert.deepEqual(negative.transcript(transcript), []);
  const late = new WakeGate();
  late.keyword({ result: [{ ...keyword.result[0], start: 1, end: 1.4 }] });
  assert.deepEqual(late.transcript(transcript), []);
});
test("neural synthesis validates profiles, chunks without truncation and emits real WAV headers", async () => {
  const text = "Palavras para testar. ".repeat(20).trim();
  const chunks = speechChunks(text);
  assert.equal(chunks.join(" "), text);
  assert.ok(chunks.every((part) => part.length <= 140));
  assert.throws(() => speechChunks("x".repeat(141)));
  assert.throws(() => speechChunks("x".repeat(4001)));
  const wav = wavEncode(Float32Array.from([0, 0.5, -1, 2]));
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt32LE(40), 8);
  assert.equal(wav.readInt16LE(50), 32767);
  await assert.rejects(
    new NeuralVoice("unused").speak("hello", "actor-clone"),
    /Perfil/,
  );
});
test("weather uses explicit city and actual service data, never fake location or temperature", async () => {
  const urls = [];
  const weather = await currentWeather(
    "Porto Alegre",
    signal(),
    async (url) => {
      urls.push(url);
      return urls.length === 1
        ? json({
            results: [
              {
                name: "Porto Alegre",
                country: "Brasil",
                latitude: -30,
                longitude: -51,
              },
            ],
          })
        : json({ current: { temperature_2m: 22.5, time: "2026-10-08T12:00" } });
    },
  );
  assert.equal(weather.temperature, 22.5);
  assert.ok(weather.title.includes("Porto Alegre"));
  assert.ok(urls[0].includes("Porto%20Alegre"));
  await assert.rejects(
    currentWeather("x", signal(), async () => json({ results: [] })),
    /Cidade/,
  );
  await assert.rejects(
    publicJson(
      "https://example.com",
      signal(),
      async () => new Response("x".repeat(64001)),
    ),
    /grande/,
  );
});
test("news comes from the official feed and retains source and publication timestamp", async () => {
  const headlines = await techHeadlines(signal(), async (url) =>
    url.endsWith("topstories.json")
      ? json([1, 2, 3])
      : json({ type: "story", title: "Actual headline", time: 1700000000 }),
  );
  assert.equal(headlines.length, 3);
  assert.equal(headlines[0].source, "https://news.ycombinator.com/item?id=1");
  await assert.rejects(
    techHeadlines(signal(), async () => json(["../../evil"])),
    /invalido/,
  );
});
test("ordinary conversation saves real local tasks and self-reported hologram metrics", async () => {
  const { engine, agent } = fixture(),
    assistant = new AssistantSession(engine, agent);
  const task = await assistant.respond("crie uma tarefa: validar a voz");
  assert.equal(task.state.tasks.length, 1);
  assert.ok(task.state.panels.includes("tasks"));
  const run = await assistant.respond("hoje eu corri dois quilometros");
  assert.equal(run.state.cards[0].value, "2");
  assert.equal(run.state.cards[0].unit, "km");
  assert.ok(run.state.cards[0].source.includes("nao recebido"));
  assert.ok(await verifyAudit(run.state));
  assert.equal(localPlan("mostra minhas tarefas").steps[0].tool, "screen.open");
});
test("agent prepare takes its lock before awaiting storage", async () => {
  const { agent } = fixture();
  const first = agent.prepare("one", localPlan("mostre tarefas"));
  await assert.rejects(
    agent.prepare("two", localPlan("mostre tarefas")),
    /ativa/,
  );
  assert.equal((await first).state.runs.length, 1);
});
test("stopping at the end of preparation cancels the pending plan without effects", async () => {
  const { engine, agent } = fixture();
  const assistant = new AssistantSession(engine, agent),
    prepare = agent.prepare.bind(agent);
  agent.prepare = async (...args) => {
    const result = await prepare(...args);
    assistant.stop();
    return result;
  };
  const result = await assistant.respond("crie uma tarefa: nao executar");
  assert.equal(result.state.tasks.length, 0);
  assert.equal(result.state.runs[0].status, "cancelled");
});
test("assistant reobserves completed native results but sensitive actions await explicit authorization", async () => {
  const { engine, agent } = fixture({
    execute: async () => "Actual observed page",
    approve: async () => true,
  });
  await engine.execute({
    type: "permissions.update",
    access: { web: true, mode: "full" },
    confirmed: true,
  });
  await engine.execute({
    type: "agent.autonomy",
    value: true,
    confirmed: true,
  });
  await engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "test",
  });
  let calls = 0;
  const assistant = new AssistantSession(engine, agent, {
    decide: async (_goal, _state, observations) => {
      calls++;
      if (!observations.length)
        return {
          summary: "Observe",
          steps: [{ tool: "web.observe", args: {} }],
        };
      assert.equal(observations[0].output, "Actual observed page");
      return { summary: "Pagina observada.", steps: [] };
    },
  });
  const result = await assistant.respond("observe a pagina");
  assert.equal(calls, 2);
  assert.equal(result.state.runs[0].status, "completed");
  const plan = {
    summary: "Click",
    steps: [{ tool: "web.click", args: { ref: "x" } }],
  };
  assert.equal(mayAutoExecute(plan, result.state), true);
  await engine.execute({ type: "agent.autonomy", value: false });
  assert.equal(mayAutoExecute(plan, await engine.read()), false);
  const supervised = new AssistantSession(engine, agent, {
    decide: async () => plan,
  });
  const pending = await supervised.respond("clique");
  assert.equal(pending.state.runs[0].status, "planned");
  assert.ok(pending.reply.includes("nenhuma etapa"));
});
test("assistant cancellation aborts model inference and persists an honest interruption", async () => {
  const { engine, agent } = fixture();
  await engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "test",
  });
  let began;
  const entered = new Promise((resolve) => {
    began = resolve;
  });
  const assistant = new AssistantSession(engine, agent, {
    decide: async (_goal, _state, _observations, abort) => {
      began();
      await new Promise((_resolve, reject) =>
        abort.addEventListener("abort", () => reject(abort.reason), {
          once: true,
        }),
      );
    },
  });
  const responding = assistant.respond("hello");
  await entered;
  assistant.stop();
  const result = await responding;
  assert.ok(result.reply.includes("Interrompi"));
  assert.equal(result.state.runs.length, 0);
});
test("assistant provider rejects unknown commands and matches the selected voice language", async () => {
  const { engine } = fixture();
  await engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "test",
  });
  const result = await ollamaAssistant(
    "hello",
    await engine.read(),
    [],
    signal(),
    async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.think, false);
      assert.ok(body.messages[0].content.includes("portugues"));
      return json({
        done: true,
        message: { content: '{"summary":"Ola.","steps":[]}' },
      });
    },
  );
  assert.equal(result.summary, "Ola.");
  await assert.rejects(
    ollamaAssistant("hello", await engine.read(), [], signal(), async () =>
      json({
        done: true,
        message: {
          content: '{"summary":"x","steps":[{"tool":"shell.exec","args":{}}]}',
        },
      }),
    ),
  );
});
