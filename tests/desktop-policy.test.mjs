import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const { requireSender, assetPath } = require("../desktop/policy.cjs");
test("only the own local top-frame renderer can call the desktop broker", () => {
  const frame = { url: "jarvis://app/" };
  const contents = { mainFrame: frame };
  const win = { isDestroyed: () => false, webContents: contents };
  requireSender({ sender: contents, senderFrame: frame }, win);
  assert.throws(() => requireSender({ sender: {}, senderFrame: frame }, win));
  assert.throws(() =>
    requireSender(
      { sender: contents, senderFrame: { url: "jarvis://app/" } },
      win,
    ),
  );
  frame.url = "https://example.com/";
  assert.throws(() =>
    requireSender({ sender: contents, senderFrame: frame }, win),
  );
});
test("asset protocol never escapes the build directory or serves a foreign authority", () => {
  const root = path.resolve("dist");
  assert.equal(assetPath(root, "jarvis://app/"), path.join(root, "index.html"));
  for (const url of [
    "https://app/index.html",
    "jarvis://other/index.html",
    "jarvis://app/%2e%2e%2fpackage.json",
    "jarvis://app/..%5cpackage.json",
    "jarvis://user@app/index.html",
  ])
    assert.throws(() => assetPath(root, url));
});
