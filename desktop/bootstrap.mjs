import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ollamaModels } from "../src/core/ollama.mjs";
import { runtimeRoot, ComponentInstaller, hashFile } from "./components.mjs";
import { safeDirectory, requireDisk } from "./data-directory.mjs";
export const LOCAL_MODEL = "qwen3:1.7b";
export const OLLAMA_INSTALLER = Object.freeze({
  url: "https://github.com/ollama/ollama/releases/download/v0.40.1/OllamaSetup.exe",
  sha: "5a157ce5a0697bd885186f0683f39c55deb4bf3eebd28ab90bab0ffeccb6132a",
  size: 1578290696,
});
export async function bootstrapStatus(installer, state, helper) {
  const components = await installer.status();
  let models = [],
    brainError = "";
  try {
    models = await ollamaModels();
  } catch (error) {
    brainError = error.message;
  }
  let helperReady = false;
  try {
    const manifest = JSON.parse(
      await fs.readFile(
        path.join(path.dirname(helper), "helper-integrity.json"),
        "utf8",
      ),
    );
    const stat = await fs.lstat(helper);
    helperReady =
      process.platform === "win32" &&
      stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.size === manifest.size &&
      (await hashFile(helper)) === manifest.sha;
  } catch {}
  const selected =
    state.agent.model && models.includes(state.agent.model)
      ? state.agent.model
      : models.includes(LOCAL_MODEL)
        ? LOCAL_MODEL
        : "";
  return {
    components,
    brain: { running: !brainError, models, selected, error: brainError },
    desktop: { ready: helperReady },
    memoryGB: Math.round(os.totalmem() / 1073741824),
    ready: components.ready && !!selected && helperReady,
    installerBytes: OLLAMA_INSTALLER.size,
    model: LOCAL_MODEL,
  };
}
export async function pullModel(signal, progress, fetcher = fetch) {
  const root = await safeDirectory(runtimeRoot(), true);
  await requireDisk(root, 2000000000);
  signal = AbortSignal.any([signal, AbortSignal.timeout(1200000)]);
  const response = await fetcher("http://127.0.0.1:11434/api/pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "error",
    signal,
    body: JSON.stringify({ model: LOCAL_MODEL, stream: true }),
  });
  if (!response.ok || !response.body)
    throw Error("Ollama nao iniciou o download do modelo.");
  let pending = "",
    successful = false;
  const decoder = new TextDecoder();
  for await (const bytes of response.body) {
    signal.throwIfAborted();
    pending += decoder.decode(bytes, { stream: true });
    if (pending.length > 64000)
      throw Error("Resposta do instalador de modelo invalida.");
    const lines = pending.split("\n");
    pending = lines.pop();
    for (const line of lines)
      if (line.trim()) {
        const value = JSON.parse(line);
        if (value.error) throw Error(value.error);
        progress({
          name: value.status,
          received: value.completed || 0,
          total: value.total || 0,
        });
        successful ||= value.status === "success";
      }
  }
  if (pending.trim()) {
    const value = JSON.parse(pending);
    if (value.error) throw Error(value.error);
    successful ||= value.status === "success";
  }
  if (!successful) throw Error("Download do modelo nao confirmou conclusao.");
  return ollamaModels(fetcher);
}
export async function downloadOllama(signal, progress, fetcher = fetch) {
  const installer = new ComponentInstaller(runtimeRoot(), {
    files: [{ ...OLLAMA_INSTALLER, file: "OllamaSetup-v0.40.1.exe" }],
    fetch: fetcher,
    progress,
  });
  signal.throwIfAborted();
  const cancel = () => installer.cancel();
  signal.addEventListener("abort", cancel, { once: true });
  try {
    await installer.install();
    signal.throwIfAborted();
    return installer.target(installer.files[0]);
  } finally {
    signal.removeEventListener("abort", cancel);
  }
}
