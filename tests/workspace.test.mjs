import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkedPath, workspaceTool } from "../desktop/workspace.mjs";

async function folder(t) {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "jarvis-workspace-test-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const signal = () => new AbortController().signal;
test("real file executor creates, reads and lists text without overwriting", async (t) => {
  const root = await folder(t);
  await workspaceTool(
    root,
    {
      tool: "workspace.create",
      args: { path: "hello.txt", content: "Hello Jarvis" },
    },
    signal(),
  );
  assert.equal(
    await workspaceTool(
      root,
      { tool: "workspace.read", args: { path: "hello.txt" } },
      signal(),
    ),
    "Hello Jarvis",
  );
  assert.match(
    await workspaceTool(
      root,
      { tool: "workspace.list", args: { path: "." } },
      signal(),
    ),
    /hello.txt/,
  );
  await assert.rejects(
    workspaceTool(
      root,
      {
        tool: "workspace.create",
        args: { path: "hello.txt", content: "Replace" },
      },
      signal(),
    ),
    /EEXIST/,
  );
  assert.equal(
    await fs.readFile(path.join(root, "hello.txt"), "utf8"),
    "Hello Jarvis",
  );
});
test("path guards reject escapes, device names, executable creation and root deletion", async (t) => {
  const root = await folder(t);
  for (const relative of [
    "../outside",
    "a/../../outside",
    "C:/Windows/x",
    "\\\\host\\share",
    "a\\b",
    "NUL.txt",
    "foo:bar",
    "x.",
    "a//b",
  ])
    await assert.rejects(checkedPath(root, relative, true));
  await assert.rejects(
    workspaceTool(
      root,
      {
        tool: "workspace.create",
        args: { path: "run.exe", content: "echo x" },
      },
      signal(),
    ),
  );
  await assert.rejects(
    workspaceTool(
      root,
      { tool: "workspace.trash", args: { path: "." } },
      signal(),
      async () => {},
    ),
  );
});
test("junctions and linked root folders cannot escape the authorized root", async (t) => {
  const root = await folder(t),
    outside = await folder(t);
  await fs.symlink(
    outside,
    path.join(root, "escape"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(
    checkedPath(root, "escape/file.txt", true),
    /Links|link|junction/,
  );
  await assert.rejects(
    checkedPath(path.join(root, "escape"), "."),
    /link|atalho/,
  );
});
test("binary, huge and invalid UTF-8 files are refused without leaking data", async (t) => {
  const root = await folder(t);
  for (const [name, content] of [
    ["binary.txt", Buffer.from([0, 1])],
    ["big.txt", Buffer.alloc(16001, 65)],
    ["invalid.txt", Buffer.from([0xff])],
  ]) {
    await fs.writeFile(path.join(root, name), content);
    await assert.rejects(
      workspaceTool(
        root,
        { tool: "workspace.read", args: { path: name } },
        signal(),
      ),
    );
  }
});
test("trash delegates only a checked regular file to the OS; cancelled operations have no effects", async (t) => {
  const root = await folder(t);
  await fs.writeFile(path.join(root, "trash.txt"), "x");
  let target;
  await workspaceTool(
    root,
    { tool: "workspace.trash", args: { path: "trash.txt" } },
    signal(),
    async (file) => {
      target = file;
    },
  );
  assert.equal(target, path.join(root, "trash.txt"));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    workspaceTool(
      root,
      { tool: "workspace.create", args: { path: "never.txt", content: "x" } },
      controller.signal,
    ),
  );
  await assert.rejects(fs.stat(path.join(root, "never.txt")));
});
