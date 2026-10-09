import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { JarvisEngine } from "../src/core/engine.mjs";
import { AgentController } from "../src/core/agent.mjs";
import { AssistantSession } from "../src/core/assistant.mjs";
import {
  verifyAudit,
  VOICE_DEFAULTS,
  initialState,
} from "../src/core/model.mjs";
import {
  autoExecute,
  approvalRequired,
  criticalInteraction,
} from "../src/core/execution-policy.mjs";
import { weatherForecast } from "../desktop/weather.mjs";
import { hardwareStatus } from "../desktop/hardware.mjs";
import { commandTool, powerShellSource } from "../desktop/command-service.mjs";
import { blendStyles, NeuralVoice } from "../desktop/neural-voice.mjs";
import { speechChunks } from "../src/core/speech.mjs";
import { VoiceChannel } from "../src/voice.mjs";
import { workspaceTool } from "../desktop/workspace.mjs";
import { createRequire } from "node:module";
const { WebSession } = createRequire(import.meta.url)(
  "../desktop/web-session.cjs",
);
const signal = () => new AbortController().signal;
function fixture(options = {}) {
  let state;
  const engine = new JarvisEngine({
    read: async () => structuredClone(state),
    save: async (_rev, next) => {
      state = structuredClone(next);
    },
  });
  const agent = new AgentController(engine, options);
  return { engine, agent };
}
async function full(engine) {
  await engine.execute({
    type: "permissions.update",
    access: {
      mode: "full",
      files: true,
      web: true,
      desktop: true,
      commands: true,
    },
    confirmed: true,
  });
  await engine.execute({
    type: "agent.autonomy",
    value: true,
    confirmed: true,
  });
  await engine.execute({ type: "agent.workspace", path: "C:/fixture" });
}
async function folder(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dief-alpha5-"));
  assert.ok(!path.relative(os.tmpdir(), root).startsWith(".."));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
test("full autonomy runs routine operations, never converts trash or shell into blanket approval", async () => {
  const { engine } = fixture();
  await full(engine);
  const state = await engine.read();
  const routine = { tool: "web.fill", args: { ref: "x", text: "texto" } },
    sensitive = { tool: "workspace.trash", args: { path: "x.txt" } };
  assert.equal(autoExecute({ steps: [routine] }, state), true);
  assert.equal(approvalRequired(routine, state), false);
  assert.equal(autoExecute({ steps: [sensitive] }, state), false);
  assert.equal(
    approvalRequired(
      { tool: "command.execute", args: { script: "Get-Date", directory: "." } },
      state,
    ),
    true,
  );
  assert.equal(criticalInteraction({ control: "Comprar agora" }), true);
  assert.equal(criticalInteraction({ control: "Próxima página" }), false);
});
test("native preflight can require critical interaction approval even under full autonomy", async () => {
  let effects = 0,
    approvals = 0;
  const { engine, agent } = fixture({
    requiresApproval: async () => true,
    approve: async () => {
      approvals++;
      return false;
    },
    execute: async () => {
      effects++;
      return "done";
    },
  });
  await full(engine);
  const prepared = await agent.prepare("abrir checkout", {
    summary: "Checkout",
    steps: [{ tool: "web.click", args: { ref: "checkout" } }],
  });
  const done = await agent.run(prepared.state.runs[0].id);
  assert.equal(done.state.runs[0].status, "failed");
  assert.equal(effects, 0);
  assert.equal(approvals, 1);
});
test("policy changes during async preflight stop effects before execution", async () => {
  let effects = 0;
  const { engine, agent } = fixture({
    requiresApproval: async () => {
      await engine.execute({
        type: "permissions.update",
        access: { mode: "supervised" },
      });
      return false;
    },
    execute: async () => {
      effects++;
      return "done";
    },
  });
  await full(engine);
  const plan = await agent.prepare("escrever", {
    summary: "Write",
    steps: [{ tool: "web.fill", args: { ref: "x", text: "y" } }],
  });
  const result = await agent.run(plan.state.runs[0].id);
  assert.equal(effects, 0);
  assert.match(result.state.runs[0].error, /politica mudou/);
});
test("task IDs and memory retrieval are real, durable and audited", async () => {
  const { engine, agent } = fixture();
  await engine.execute({ type: "task.create", text: "testar voz" });
  await engine.execute({
    type: "memory.create",
    text: "Minha cidade e Porto Alegre",
  });
  const task = (await engine.read()).tasks[0];
  const prepared = await agent.prepare("consultar e concluir", {
    summary: "Tasks",
    steps: [
      { tool: "task.list", args: {} },
      { tool: "memory.search", args: { query: "cidade Porto Alegre" } },
      { tool: "task.complete", args: { id: task.id } },
    ],
  });
  const result = await agent.run(prepared.state.runs[0].id);
  assert.ok(result.state.tasks[0].done);
  assert.equal(result.state.runs[0].status, "completed");
  assert.equal(
    JSON.parse(result.state.runs[0].steps[0].output).tasks[0].id,
    task.id,
  );
  assert.equal(
    JSON.parse(result.state.runs[0].steps[1].output)[0].text,
    "Minha cidade e Porto Alegre",
  );
  assert.ok(await verifyAudit(result.state));
});
test("task search reaches older tasks outside the first list page and never invents IDs", async () => {
  const { engine, agent } = fixture();
  const old = await engine.execute({
    type: "task.create",
    text: "consultar dentista",
  });
  const id = old.state.tasks[0].id;
  for (let index = 0; index < 26; index++)
    await engine.execute({ type: "task.create", text: `tarefa ${index}` });
  const plan = await agent.prepare("busque tarefa dentista", {
    summary: "Busca",
    steps: [{ tool: "task.search", args: { query: "dentista" } }],
  });
  const result = await agent.run(plan.state.runs[0].id),
    found = JSON.parse(result.state.runs[0].steps[0].output);
  assert.equal(found.tasks[0].id, id);
  assert.equal(found.total, 1);
});
test("local task queries summarize real data without a long JSON reply or losing the execution result", async () => {
  const { engine, agent } = fixture();
  for (let index = 0; index < 10; index++)
    await engine.execute({
      type: "task.create",
      text: `tarefa ${index} ${"a".repeat(400)}`,
    });
  const assistant = new AssistantSession(engine, agent);
  const result = await assistant.respond("consulte tarefas");
  assert.ok(result.reply.length < 2000);
  assert.match(result.reply, /Encontrei 10/);
  assert.equal(
    JSON.parse(result.state.runs[0].steps[0].output).tasks.length,
    10,
  );
});
test("assistant continues after an approved plan without executing its old effect twice", async () => {
  const { engine, agent } = fixture({
    approve: async () => true,
    execute: async () => "file created",
  });
  await full(engine);
  await engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "fixture",
  });
  const plan = await agent.prepare("crie arquivo", {
    summary: "Create",
    steps: [
      { tool: "workspace.create", args: { path: "x.txt", content: "abc" } },
    ],
  });
  const id = plan.state.runs[0].id;
  await agent.run(id);
  const assistant = new AssistantSession(engine, agent, {
    decide: async (_goal, _state, observations) => {
      assert.equal(observations[0].output, "file created");
      return { summary: "Arquivo criado e conferido.", steps: [] };
    },
  });
  const result = await assistant.resume(id);
  assert.equal(result.state.runs.length, 1);
  assert.equal(
    result.state.messages.filter((item) => item.role === "user").length,
    0,
  );
  const repeating = new AssistantSession(engine, agent, {
    decide: async () => ({
      summary: "Create",
      steps: [
        { tool: "workspace.create", args: { content: "abc", path: "x.txt" } },
      ],
    }),
  });
  assert.match((await repeating.resume(id)).reply, /repetir uma alteracao/);
  assert.equal((await engine.read()).runs.length, 1);
});
test("assistant can complete more than the old eight-step ceiling without replaying writes", async () => {
  const { engine, agent } = fixture();
  await engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "fixture",
  });
  let turn = 0;
  const assistant = new AssistantSession(engine, agent, {
    decide: async () =>
      ++turn <= 10
        ? {
            summary: "Task",
            steps: [{ tool: "task.create", args: { text: `tarefa ${turn}` } }],
          }
        : { summary: "Dez tarefas salvas.", steps: [] },
  });
  const done = await assistant.respond("crie dez tarefas");
  assert.equal(done.state.tasks.length, 10);
  assert.equal(done.state.runs.length, 10);
  assert.match(done.reply, /Dez/);
});
test("forecast validates real daily fields and rejects missing/range-invalid data", async () => {
  const daily = {
    time: ["2026-10-09"],
    temperature_2m_max: [28],
    temperature_2m_min: [15],
    precipitation_probability_max: [60],
    weather_code: [3],
  };
  const fetcher = async (url) =>
    new Response(
      JSON.stringify(
        url.includes("geocoding")
          ? {
              results: [
                { name: "Porto Alegre", latitude: -30, longitude: -51 },
              ],
            }
          : { daily, timezone: "America/Sao_Paulo" },
      ),
    );
  const result = await weatherForecast("Porto Alegre", signal(), fetcher);
  assert.equal(result.days[0].precipitationChance, 60);
  assert.ok(result.source.includes("forecast_days=7"));
  daily.precipitation_probability_max[0] = 120;
  await assert.rejects(
    weatherForecast("Porto Alegre", signal(), fetcher),
    /Dados incompletos/,
  );
});
test("hardware telemetry contains actual injected OS values, not simulated CPU load", () => {
  const result = hardwareStatus({
    totalmem: () => 1000,
    freemem: () => 250,
    cpus: () => [{ model: "CPU" }, { model: "CPU" }],
    platform: () => "win32",
    arch: () => "x64",
    uptime: () => 300,
  });
  assert.equal(result.memory.usedPercent, 75);
  assert.equal(result.logicalCores, 2);
  assert.equal(result.cpu, "CPU");
  assert.equal(result.cpuUsage, undefined);
});
test("PT default voice blends native Portuguese embeddings and chunks spoken prose without truncation", async () => {
  assert.equal(VOICE_DEFAULTS.voiceProfile, "dief_pt");
  const a = new Float32Array(510 * 256).fill(1),
    b = new Float32Array(510 * 256).fill(2);
  assert.ok(
    Math.abs(
      blendStyles([
        { values: a, weight: 0.8 },
        { values: b, weight: 0.2 },
      ])[0] - 1.2,
    ) < 0.001,
  );
  assert.throws(() => blendStyles([{ values: a, weight: 2 }]), /invalida/);
  assert.deepEqual(
    speechChunks("**Temperatura**: 27°C. Voce correu 2km, total 50%."),
    [
      "Temperatura: 27 graus Celsius.",
      "Voce correu 2 quilometros, total 50 por cento.",
    ],
  );
  await assert.rejects(new NeuralVoice("none").speak("x", "path/evil"));
});
test("legacy Alex default migrates to PT Dief without replacing later explicit voice choices or user data", async () => {
  let raw = initialState();
  delete raw.settings.voicePresetVersion;
  raw.settings.voiceProfile = "pm_alex";
  const engine = new JarvisEngine({
    read: async () => structuredClone(raw),
    save: async (_rev, next) => {
      raw = structuredClone(next);
    },
  });
  assert.equal((await engine.read()).settings.voiceProfile, "dief_pt");
  assert.equal(raw.settings.voiceProfile, "pm_alex");
  await engine.execute({
    type: "settings.update",
    changes: { voiceProfile: "pm_alex" },
  });
  assert.equal((await engine.read()).settings.voiceProfile, "pm_alex");
  assert.ok(await verifyAudit(raw));
});
test("text/code creation permits an explicit script file but never overwrites or runs it", async (t) => {
  const root = await folder(t),
    step = {
      tool: "workspace.create",
      args: { path: "project.js", content: "console.log('hello')" },
    };
  await workspaceTool(root, step, signal());
  assert.equal(
    await fs.readFile(path.join(root, "project.js"), "utf8"),
    step.args.content,
  );
  await assert.rejects(workspaceTool(root, step, signal()), /EEXIST/);
});
test("approved command executor uses a fixed binary, explicit cwd, Unicode-safe output and no shell bypass", async (t) => {
  const root = await folder(t),
    launches = [];
  const launch = (file, args, options) => {
    launches.push({ file, args, options });
    const child = new EventEmitter();
    child.pid = 123;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    process.nextTick(() => {
      const bytes = Buffer.from("ação");
      child.stdout.emit("data", bytes.subarray(0, 2));
      child.stdout.emit("data", bytes.subarray(2));
      child.emit("close", 0);
    });
    return child;
  };
  const result = JSON.parse(
    await commandTool(
      root,
      { tool: "command.execute", args: { directory: ".", script: "Get-Date" } },
      signal(),
      { platform: "win32", spawn: launch, windowsRoot: "C:/Windows" },
    ),
  );
  assert.equal(result.output, "ação");
  assert.equal(launches[0].options.shell, false);
  assert.equal(launches[0].options.windowsHide, true);
  assert.equal(
    Buffer.from(launches[0].args.at(-1), "base64").toString("utf16le"),
    powerShellSource("Get-Date"),
  );
  assert.ok(!launches[0].args.join(" ").includes("ExecutionPolicy"));
  await assert.rejects(
    commandTool(
      root,
      {
        tool: "command.execute",
        args: { directory: "../", script: "Get-Date" },
      },
      signal(),
      { platform: "win32", spawn: launch },
    ),
  );
  assert.equal(launches.length, 1);
});
test("command cancellation waits for the attempted process-tree stop and retains an honest failure", async (t) => {
  const root = await folder(t),
    abort = new AbortController(),
    launches = [];
  const launch = (file, args) => {
    const child = new EventEmitter();
    child.pid = 321;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    launches.push({ file, args, child });
    return child;
  };
  const running = commandTool(
    root,
    { tool: "command.execute", args: { directory: ".", script: "Get-Date" } },
    abort.signal,
    { platform: "win32", spawn: launch },
  );
  while (!launches.length)
    await new Promise((resolve) => setTimeout(resolve, 1));
  const rejected = assert.rejects(running, /interrompido/);
  abort.abort();
  assert.equal(launches.length, 2);
  assert.ok(launches[1].file.endsWith("taskkill.exe"));
  assert.deepEqual(launches[1].args, ["/PID", "321", "/T", "/F"]);
  launches[0].child.emit("close", 0);
  launches[1].child.emit("close", 0);
  await rejected;
});
test("web action receipts include fresh observations; failed verification never erases an effect", async () => {
  const web = new WebSession(null, async (url) => url);
  web.act = async () => "click sent";
  web.observe = async () =>
    JSON.stringify({ title: "After", text: "resultado real" });
  assert.equal(
    JSON.parse(await web.actAndObserve("click", { ref: "x" }, signal())).after
      .title,
    "After",
  );
  web.observe = async () => {
    throw Error("closed");
  };
  const result = JSON.parse(
    await web.actAndObserve("click", { ref: "x" }, signal()),
  );
  assert.equal(result.action, "click sent");
  assert.equal(result.after.verified, false);
});
test("speech playback starts while the next part is still preparing, cancellation discards all late audio", async (t) => {
  const previous = { window: globalThis.window, Audio: globalThis.Audio };
  t.after(() => {
    globalThis.window = previous.window;
    globalThis.Audio = previous.Audio;
  });
  const played = [],
    requests = [],
    phases = [];
  let later,
    spokenEnd = 0;
  class AudioMock {
    constructor() {
      this.paused = true;
      played.push(this);
    }
    async play() {
      this.paused = false;
      this.onplay?.();
    }
    pause() {
      this.paused = true;
    }
  }
  class ContextMock {
    async resume() {}
    async close() {}
    createMediaElementSource() {
      return { connect() {}, disconnect() {} };
    }
    createAnalyser() {
      return {
        fftSize: 256,
        connect() {},
        disconnect() {},
        getFloatTimeDomainData(samples) {
          samples.fill(0.1);
        },
      };
    }
  }
  globalThis.Audio = AudioMock;
  globalThis.window = {
    AudioContext: ContextMock,
    jarvisDesktop: {
      voice: async (request) => {
        requests.push(request);
        if (request.op === "cancel-speech") return true;
        if (requests.filter((item) => item.op === "speak").length === 1)
          return new Uint8Array([1]);
        return new Promise((resolve) => {
          later = resolve;
        });
      },
    },
  };
  const channel = new VoiceChannel({
    onTranscript() {},
    onError(message) {
      assert.fail(message);
    },
    onPhase: (phase) => phases.push(phase),
    onSpokenEnd: () => spokenEnd++,
  });
  const done = channel.speakNeural(
    "Este e um primeiro trecho suficientemente longo. Este e um segundo trecho suficientemente longo. Este e um terceiro trecho suficientemente longo.",
    { voiceProfile: "dief_pt" },
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(played.length, 1);
  assert.equal(phases.at(-1), "speaking");
  assert.equal(requests.filter((item) => item.op === "speak").length, 2);
  channel.stop();
  later(new Uint8Array([2]));
  await done;
  assert.equal(played.length, 1);
  assert.equal(spokenEnd, 0);
  assert.ok(requests.some((item) => item.op === "cancel-speech"));
  channel.dispose();
});
