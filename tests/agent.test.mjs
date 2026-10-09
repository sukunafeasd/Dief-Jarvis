import test from "node:test";
import assert from "node:assert/strict";
import { JarvisEngine } from "../src/core/engine.mjs";
import { AgentController } from "../src/core/agent.mjs";
import { localPlan, validatePlan } from "../src/core/tools.mjs";
import { verifyAudit } from "../src/core/model.mjs";
import { ollamaModels, ollamaPlan } from "../src/core/ollama.mjs";

function fixture(options = {}) {
  let saved = null;
  const storage = {
    read: async () => structuredClone(saved),
    save: async (revision, next) => {
      assert.equal(saved?.revision || 0, revision);
      saved = structuredClone(next);
    },
  };
  const engine = new JarvisEngine(storage);
  const agent = new AgentController(engine, options);
  return { engine, agent, storage, saved: () => saved };
}
const json = (value) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });

test("planning never executes; approved steps persist actual effects and verified audit", async () => {
  const f = fixture();
  const result = await f.agent.plan("crie uma tarefa: testar; mostre tarefas");
  assert.equal(result.state.tasks.length, 0);
  const id = result.state.runs[0].id;
  assert.equal(result.state.runs[0].status, "planned");
  const completed = await f.agent.run(id);
  assert.equal(completed.state.tasks.length, 1);
  assert.equal(completed.state.runs[0].status, "completed");
  assert.ok(
    completed.state.runs[0].steps.every((item) => item.status === "completed"),
  );
  await assert.rejects(f.agent.run(id));
  assert.equal((await f.engine.read()).tasks.length, 1);
  assert.ok(await verifyAudit(await f.engine.read()));
});
test("catalog rejects injected permissions, unknown tools, extra arguments and oversized plans", () => {
  for (const plan of [
    {
      summary: "x",
      steps: [{ tool: "shell.exec", args: { command: "erase" } }],
    },
    {
      summary: "x",
      steps: [{ tool: "task.create", args: { text: "x", confirmed: true } }],
    },
    { summary: "x", steps: [], confirmed: true },
    {
      summary: "x",
      steps: Array.from({ length: 9 }, () => ({
        tool: "task.create",
        args: { text: "x" },
      })),
    },
    {
      summary: "x",
      steps: [{ tool: "screen.open", args: { panel: "__proto__" } }],
    },
    { summary: "x", steps: [{ tool: "task.create", args: { text: 4 } }] },
  ])
    assert.throws(() => validatePlan(plan));
});
test("concurrent run requests cannot poison or duplicate a legitimate execution", async () => {
  const f = fixture();
  const plan = await f.agent.plan("crie uma tarefa: only once");
  const id = plan.state.runs[0].id;
  const first = f.agent.run(id);
  await assert.rejects(f.agent.run(id), /ativa/);
  const result = await first;
  assert.equal(result.state.runs[0].status, "completed");
  assert.equal(result.state.tasks.length, 1);
});
test("unsupported local goal is a durable failed run, never a fake success", async () => {
  const f = fixture();
  const result = await f.agent.plan("controle todo meu PC");
  assert.equal(result.state.runs[0].status, "failed");
  assert.equal(result.state.tasks.length, 0);
});
test("browser refuses native tools and cancellation before approval has no effects", async () => {
  const f = fixture();
  const native = await f.agent.plan("pesquise x");
  assert.equal(native.state.runs[0].status, "failed");
  const planned = await f.agent.plan("crie uma tarefa: nao criar");
  await f.agent.cancel(planned.state.runs[0].id);
  assert.equal((await f.engine.read()).tasks.length, 0);
});
test("permission revocation after planning prevents any external execution", async () => {
  let calls = 0;
  const f = fixture({
    execute: async () => {
      calls++;
      return "done";
    },
  });
  await f.engine.execute({
    type: "permissions.update",
    access: { web: true, mode: "full" },
    confirmed: true,
  });
  const plan = await f.agent.plan("pesquise algo");
  await f.engine.execute({
    type: "permissions.update",
    access: { web: false },
  });
  await assert.rejects(f.agent.run(plan.state.runs[0].id), /Autorize/);
  assert.equal(calls, 0);
});
test("supervised refusal stops effects and retains failure history", async () => {
  let calls = 0;
  const f = fixture({
    execute: async () => {
      calls++;
      return "done";
    },
    approve: async () => false,
  });
  await f.engine.execute({
    type: "permissions.update",
    access: { web: true },
    confirmed: true,
  });
  const plan = await f.agent.plan("pesquise algo");
  const result = await f.agent.run(plan.state.runs[0].id);
  assert.equal(calls, 0);
  assert.equal(result.state.runs[0].status, "failed");
});
test("failed second step preserves the completed first step and cancels later work", async () => {
  const f = fixture({
    execute: async () => {
      throw Error("Network failed");
    },
  });
  await f.engine.execute({
    type: "permissions.update",
    access: { web: true, mode: "full" },
    confirmed: true,
  });
  const plan = await f.agent.plan(
    "crie uma tarefa: Keep; pesquise something; lembre que never",
  );
  const result = await f.agent.run(plan.state.runs[0].id);
  assert.equal(result.state.tasks[0].text, "Keep");
  assert.equal(result.state.memories.length, 0);
  assert.deepEqual(
    result.state.runs[0].steps.map((step) => step.status),
    ["completed", "failed", "cancelled"],
  );
  assert.equal(result.state.runs[0].status, "failed");
});
test("cancelling a model request leaves a cancelled run, not a late executable plan", async () => {
  let entered;
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  const f = fixture({
    planner: async (_goal, _state, signal) => {
      entered();
      await new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    },
  });
  await f.engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "test",
  });
  const planning = f.agent.plan("something");
  await started;
  await f.agent.cancel((await f.engine.read()).runs[0].id);
  const result = await planning;
  assert.equal(result.state.runs[0].status, "cancelled");
  assert.equal(result.state.runs[0].steps.length, 0);
});
test("cancellation mid-effect records completed work and never executes later steps", async () => {
  let unblock, began;
  const started = new Promise((resolve) => {
    began = resolve;
  });
  const f = fixture({
    execute: async () => {
      began();
      await new Promise((resolve) => {
        unblock = resolve;
      });
      return "Opened";
    },
  });
  await f.engine.execute({
    type: "permissions.update",
    access: { web: true, mode: "full" },
    confirmed: true,
  });
  const plan = await f.agent.plan("pesquise algo; crie uma tarefa: nao criar");
  const id = plan.state.runs[0].id;
  const running = f.agent.run(id);
  await started;
  await f.agent.cancel(id);
  unblock();
  const result = await running;
  assert.equal(result.state.runs[0].status, "cancelled");
  assert.equal(result.state.runs[0].steps[0].status, "completed");
  assert.equal(result.state.tasks.length, 0);
});
test("recovery marks interrupted work once and does not replay external effects", async () => {
  const f = fixture();
  const plan = await f.agent.plan("crie uma tarefa: nao repetir");
  const id = plan.state.runs[0].id;
  await f.engine.execute({ type: "agent.start", id, confirmed: true });
  await f.engine.execute({
    type: "agent.step",
    id,
    index: 0,
    status: "running",
  });
  const reloaded = new AgentController(new JarvisEngine(f.storage));
  await Promise.all([reloaded.recover(), reloaded.recover()]);
  const state = await f.engine.read();
  assert.equal(state.runs[0].status, "interrupted");
  assert.equal(state.runs[0].steps[0].status, "interrupted");
  assert.equal(state.tasks.length, 0);
  assert.ok(await verifyAudit(state));
});
test("permission is checked again after a native approval dialog", async () => {
  let calls = 0,
    f;
  f = fixture({
    execute: async () => {
      calls++;
      return "done";
    },
    approve: async () => {
      await f.engine.execute({
        type: "permissions.update",
        access: { web: false },
      });
      return true;
    },
  });
  await f.engine.execute({
    type: "permissions.update",
    access: { web: true },
    confirmed: true,
  });
  const plan = await f.agent.plan("pesquise algo");
  await f.agent.run(plan.state.runs[0].id);
  assert.equal(calls, 0);
});
test("older workspaces add empty agent history without rewriting user data or audit", async () => {
  const f = fixture();
  await f.engine.execute({ type: "task.create", text: "Keep" });
  delete f.saved().agent;
  delete f.saved().runs;
  const audit = structuredClone(f.saved().audit);
  const loaded = await f.engine.read();
  assert.deepEqual(loaded.runs, []);
  assert.equal(loaded.tasks[0].text, "Keep");
  assert.deepEqual(loaded.audit, audit);
  assert.equal(f.saved().agent, undefined);
});
test("Ollama adapter uses fixed loopback endpoint, structured schema and validates output", async () => {
  const f = fixture();
  await f.engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "test:local",
  });
  const fetcher = async (url, options) => {
    assert.equal(url, "http://127.0.0.1:11434/api/chat");
    assert.equal(options.redirect, "error");
    const body = JSON.parse(options.body);
    assert.equal(body.stream, false);
    assert.equal(body.format.type, "object");
    assert.ok(
      !body.format.properties.steps.items.oneOf.some((item) =>
        item.properties.tool.const.startsWith("workspace."),
      ),
    );
    return json({
      done: true,
      done_reason: "stop",
      message: { content: JSON.stringify(localPlan("mostre tarefas")) },
    });
  };
  const plan = await ollamaPlan(
    "show tasks",
    await f.engine.read(),
    new AbortController().signal,
    fetcher,
  );
  assert.equal(plan.steps[0].tool, "screen.open");
});
test("Ollama refuses truncated, malicious, oversized and failed provider responses", async () => {
  const f = fixture();
  await f.engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "test",
  });
  for (const response of [
    json({ done: false, message: { content: "{}" } }),
    json({ done: true, done_reason: "length", message: { content: "{}" } }),
    json({
      done: true,
      message: {
        content: '{"summary":"x","steps":[{"tool":"shell.exec","args":{}}]}',
      },
    }),
    new Response("x".repeat(128001)),
    new Response("error", { status: 503 }),
  ])
    await assert.rejects(
      ollamaPlan(
        "x",
        await f.engine.read(),
        new AbortController().signal,
        async () => response,
      ),
    );
});
test("model discovery has a timeout and filters invalid model names", async () => {
  const models = await ollamaModels(async (url, options) => {
    assert.equal(url, "http://127.0.0.1:11434/api/tags");
    assert.ok(options.signal);
    return json({
      models: [{ name: "local:test" }, { name: null }, { name: "bad model" }],
    });
  });
  assert.deepEqual(models, ["local:test"]);
});
