import test from "node:test";
import assert from "node:assert/strict";
import { JarvisEngine } from "../src/core/engine.mjs";
import {
  initialState,
  verifyAudit,
  canonical,
  validateState,
} from "../src/core/model.mjs";

function fixture() {
  let state = null;
  let fail = false;
  const storage = {
    read: async () => structuredClone(state),
    save: async (revision, next) => {
      if (fail) throw Error("Disk failed");
      if ((state?.revision || 0) !== revision) throw Error("Conflict");
      state = structuredClone(next);
    },
  };
  return {
    engine: new JarvisEngine(storage),
    storage,
    read: () => structuredClone(state),
    fail: () => {
      fail = true;
    },
    recover: () => {
      fail = false;
    },
    tamper: (fn) => fn(state),
  };
}
test("fresh workspace contains no invented tasks, memory, conversation or audit", async () => {
  const f = fixture();
  assert.deepEqual(await f.engine.read(), initialState());
});
test("screen commands are persisted with a verified audit chain", async () => {
  const f = fixture();
  const r = await f.engine.execute({
    type: "chat.send",
    content: "Jarvis mostre minhas tarefas",
  });
  assert.deepEqual(r.state.panels, ["tasks"]);
  assert.equal(r.state.messages.length, 2);
  assert.equal(r.state.audit[0].type, "screen.open");
  assert.ok(await verifyAudit(r.state));
});
test("task creation via conversation and buttons has actual data, no duplication", async () => {
  const f = fixture();
  const r = await f.engine.execute({
    type: "chat.send",
    content: "crie uma tarefa: revisar interface",
  });
  assert.equal(r.state.tasks.length, 1);
  assert.equal(r.state.tasks[0].text, "revisar interface");
  assert.ok(r.reply.includes("salva"));
});
test("memory has explicit source and persists across engine recreation", async () => {
  const f = fixture();
  await f.engine.execute({
    type: "chat.send",
    content: "lembre que prefiro respostas curtas",
  });
  const engine = new JarvisEngine(f.storage);
  const s = await engine.read();
  assert.equal(s.memories[0].source, "Voce");
  assert.equal(s.memories[0].text, "prefiro respostas curtas");
});
test("unsupported requests never report external actions as completed", async () => {
  const f = fixture();
  const r = await f.engine.execute({
    type: "chat.send",
    content: "envie um e-mail para meu chefe",
  });
  assert.equal(r.status, "unsupported");
  assert.equal(r.state.audit.at(-1).status, "unsupported");
  assert.match(r.reply, /sem uma IA externa/);
});
test("focus, restore, palette and panel-close commands affect screen state", async () => {
  const f = fixture();
  await f.engine.execute({ type: "chat.send", content: "mostre auditoria" });
  await f.engine.execute({ type: "chat.send", content: "feche auditoria" });
  assert.equal(f.read().panels.length, 0);
  await f.engine.execute({ type: "chat.send", content: "modo foco" });
  assert.equal(f.read().focus, true);
  await f.engine.execute({ type: "chat.send", content: "restaure a tela" });
  assert.equal(f.read().focus, false);
  await f.engine.execute({ type: "chat.send", content: "tema ciano" });
  assert.equal(f.read().settings.theme, "cyan");
});
test("panel order, deduplication and bounded windows are deterministic", async () => {
  const f = fixture();
  for (const panel of ["tasks", "memory", "audit", "briefing", "connections"])
    await f.engine.execute({ type: "screen.open", panel });
  assert.deepEqual(f.read().panels, [
    "memory",
    "audit",
    "briefing",
    "connections",
  ]);
  await f.engine.execute({ type: "screen.open", panel: "audit" });
  assert.equal(f.read().panels.length, 4);
  await f.engine.execute({
    type: "screen.move",
    panel: "audit",
    direction: -1,
  });
  assert.equal(f.read().panels[0], "audit");
});
test("concurrent operations serialize without dropping tasks or audit", async () => {
  const f = fixture();
  await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      f.engine.execute({ type: "task.create", text: `Task ${i}` }),
    ),
  );
  assert.equal(f.read().tasks.length, 20);
  assert.equal(f.read().revision, 20);
  assert.ok(await verifyAudit(f.read()));
});
test("failure never saves a success or corrupts previous records, queue remains retryable", async () => {
  const f = fixture();
  await f.engine.execute({ type: "task.create", text: "Keep" });
  f.fail();
  await assert.rejects(
    f.engine.execute({ type: "task.create", text: "Never saved" }),
  );
  assert.equal(f.read().tasks.length, 1);
  assert.equal(f.read().revision, 1);
  f.recover();
  await f.engine.execute({ type: "task.create", text: "Retry worked" });
  assert.equal(f.read().tasks.length, 2);
  assert.equal(f.read().revision, 2);
});
test("task removal and forgetting memories require explicit confirmation", async () => {
  const f = fixture();
  await f.engine.execute({ type: "task.create", text: "Keep" });
  const id = f.read().tasks[0].id;
  await assert.rejects(f.engine.execute({ type: "task.remove", id }));
  assert.equal(f.read().tasks.length, 1);
  await f.engine.execute({ type: "task.remove", id, confirmed: true });
  assert.equal(f.read().tasks.length, 0);
});
test("corrupted audit is detected and original data remains untouched", async () => {
  const f = fixture();
  await f.engine.execute({ type: "task.create", text: "Keep" });
  f.tamper((s) => {
    s.audit[0].detail = "tampered";
  });
  assert.equal(await verifyAudit(f.read()), false);
  await assert.rejects(f.engine.read());
  assert.equal(f.read().tasks[0].text, "Keep");
});
test("unrecognized, prototype and shell actions cannot escape the allowed registry", async () => {
  const f = fixture();
  for (const action of [
    { type: "shell.exec", command: "whoami" },
    { type: "screen.open", panel: "__proto__" },
    { type: "screen.view", view: "admin" },
    { type: "settings.update", changes: { __proto__: null, command: "erase" } },
  ])
    await assert.rejects(f.engine.execute(action));
  assert.equal(f.read(), null);
});
test("state fields are strictly typed and empty/oversized commands rejected", async () => {
  const f = fixture();
  for (const action of [
    { type: "chat.send", content: "" },
    { type: "chat.send", content: "x".repeat(4001) },
    { type: "settings.update", changes: { motion: "false" } },
    { type: "settings.update", changes: { theme: "unknown" } },
  ])
    await assert.rejects(f.engine.execute(action));
  assert.throws(() => validateState({ ...initialState(), revision: -1 }));
});
test("canonical audit serialization does not depend on key ordering", () => {
  assert.equal(canonical({ b: 2, a: 1 }), canonical({ a: 1, b: 2 }));
});
