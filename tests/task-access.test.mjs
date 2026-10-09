import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { JarvisEngine } from "../src/core/engine.mjs";
import { AgentController } from "../src/core/agent.mjs";
import { AssistantSession } from "../src/core/assistant.mjs";
import { initialState, verifyAudit } from "../src/core/model.mjs";
import { workspaceTool, checkedPcPath } from "../desktop/workspace.mjs";
import { commandTool } from "../desktop/command-service.mjs";
function fixture(saved) {
  const storage = {
    read: async () => saved && structuredClone(saved),
    save: async (_revision, state) => {
      saved = structuredClone(state);
    },
  };
  return { engine: new JarvisEngine(storage), storage };
}
test("fresh task preset enables all executors and migrates old preferences once without replaying work", async () => {
  const fresh = initialState();
  assert.equal(fresh.settings.access.mode, "full");
  assert.ok(
    ["files", "commands", "desktop", "web", "admin", "taskAuthorization"].every(
      (key) => fresh.settings.access[key],
    ),
  );
  assert.equal(fresh.agent.autonomy, true);
  const old = structuredClone(fresh);
  delete old.settings.executionPresetVersion;
  old.settings.theme = "cyan";
  old.settings.access = {
    mode: "restricted",
    web: false,
    files: false,
    desktop: false,
    commands: false,
    admin: false,
  };
  old.agent.autonomy = false;
  const { engine } = fixture(old);
  const migrated = await engine.read();
  assert.equal(migrated.settings.access.commands, true);
  assert.equal(migrated.settings.theme, "cyan");
  assert.deepEqual(migrated.runs, old.runs);
  assert.deepEqual(migrated.audit, old.audit);
  await engine.execute({
    type: "permissions.update",
    access: { commands: false },
  });
  assert.equal((await engine.read()).settings.access.commands, false);
});
test("given task executes sensitive native steps without folder or duplicate approval, with real receipts", async () => {
  const { engine } = fixture();
  await engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "test:local",
  });
  let decisions = 0,
    effects = 0;
  const agent = new AgentController(engine, {
    requiresApproval: async () => {
      throw Error("redundant preflight");
    },
    approve: async () => {
      throw Error("redundant approval");
    },
    execute: async (step) => {
      assert.equal(step.tool, "command.execute");
      effects++;
      return "Test fixture executed; no actual PowerShell launched.";
    },
  });
  const assistant = new AssistantSession(engine, agent, {
    decide: async () =>
      ++decisions === 1
        ? {
            summary: "Consultar",
            steps: [
              {
                tool: "command.execute",
                args: { directory: ".", script: "Get-Date" },
              },
            ],
          }
        : { summary: "Consulta concluida.", steps: [] },
  });
  const done = await assistant.respond("consulte a data usando PowerShell");
  assert.equal(effects, 1);
  assert.equal(done.state.runs[0].status, "completed");
  assert.ok(await verifyAudit(done.state));
});
test("turning off execution prepares a plan instead of running it; revoked capability still blocks it", async () => {
  const { engine } = fixture();
  await engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "test:local",
  });
  await engine.execute({ type: "agent.autonomy", value: false });
  let effects = 0;
  const agent = new AgentController(engine, {
    execute: async () => {
      effects++;
      return "done";
    },
  });
  const assistant = new AssistantSession(engine, agent, {
    decide: async () => ({
      summary: "Consulta",
      steps: [
        {
          tool: "command.execute",
          args: { directory: ".", script: "Get-Date" },
        },
      ],
    }),
  });
  const prepared = await assistant.respond("consulte data");
  assert.equal(prepared.state.runs[0].status, "planned");
  assert.equal(effects, 0);
  await engine.execute({
    type: "permissions.update",
    access: { commands: false },
  });
  await assert.rejects(agent.run(prepared.state.runs[0].id), /Autorize/);
  assert.equal(effects, 0);
});
test("full filesystem accepts absolute paths outside starting folder without changing existing files", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dief-task-path-"));
  const base = path.join(root, "start"),
    outside = path.join(root, "elsewhere");
  await fs.mkdir(base);
  await fs.mkdir(outside);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const target = path.join(outside, "notes.txt");
  const signal = new AbortController().signal;
  await workspaceTool(
    base,
    {
      tool: "workspace.create",
      args: { path: target, content: "Local test only" },
    },
    signal,
    null,
    { fullAccess: true },
  );
  assert.equal(
    await workspaceTool(
      "",
      { tool: "workspace.read", args: { path: target } },
      signal,
      null,
      { fullAccess: true },
    ),
    "Local test only",
  );
  await assert.rejects(
    workspaceTool(
      base,
      {
        tool: "workspace.create",
        args: { path: target, content: "overwrite" },
      },
      signal,
      null,
      { fullAccess: true },
    ),
    /EEXIST/,
  );
  assert.equal(await checkedPcPath(base, outside), await fs.realpath(outside));
  await assert.rejects(checkedPcPath(base, "C:ambiguous"), /invalido/);
  await assert.rejects(checkedPcPath(base, "NUL"), /invalido/);
});
test("PowerShell full path option chooses requested absolute cwd with fixed executable, no real process", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dief-task-command-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let launch;
  const result = await commandTool(
    "",
    { tool: "command.execute", args: { directory: root, script: "Get-Date" } },
    new AbortController().signal,
    {
      fullAccess: true,
      platform: "win32",
      spawn: (file, args, options) => {
        launch = { file, args, options };
        const child = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        queueMicrotask(() => child.emit("close", 0));
        return child;
      },
    },
  );
  assert.equal(JSON.parse(result).workingDirectory, await fs.realpath(root));
  assert.ok(launch.file.endsWith("powershell.exe"));
  assert.equal(launch.options.shell, false);
  assert.equal(launch.options.windowsHide, true);
});
test("a requested task continues beyond former 24-cycle/64-step caps without repeating effects", async () => {
  const { engine } = fixture();
  await engine.execute({
    type: "agent.configure",
    provider: "ollama",
    model: "test:local",
  });
  let count = 0,
    effects = 0;
  const agent = new AgentController(engine, {
    execute: async () => {
      effects++;
      return "Synthetic result; no process launched.";
    },
  });
  const assistant = new AssistantSession(engine, agent, {
    decide: async () =>
      ++count <= 70
        ? {
            summary: "Etapa de teste",
            steps: [
              {
                tool: "command.execute",
                args: { directory: ".", script: `Write-Output ${count}` },
              },
            ],
          }
        : { summary: "70 etapas de teste concluidas.", steps: [] },
  });
  const result = await assistant.respond(
    "execute as etapas do teste sintetico",
  );
  assert.equal(effects, 70);
  assert.match(result.reply, /70 etapas/);
  assert.ok(await verifyAudit(result.state));
});
test("large PowerShell output is marked partial without stopping the requested process", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dief-command-output-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await commandTool(
    "",
    {
      tool: "command.execute",
      args: { directory: root, script: "Write-Output fixture" },
    },
    new AbortController().signal,
    {
      fullAccess: true,
      platform: "win32",
      spawn: () => {
        const child = new EventEmitter();
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        child.kill = () => {
          throw Error("Unexpected process stop");
        };
        queueMicrotask(() => {
          child.stdout.emit("data", Buffer.alloc(300000, 65));
          child.emit("close", 0);
        });
        return child;
      },
    },
  );
  const output = JSON.parse(result);
  assert.equal(output.status, "completed");
  assert.equal(output.truncated, true);
  assert.equal(output.output.length, 64000);
});
