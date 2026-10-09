import path from "node:path";
import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { checkedPath, checkedPcPath } from "./workspace.mjs";
import { validateStep } from "../src/core/tools.mjs";
export function powerShellSource(script) {
  return `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)\n$OutputEncoding = [Console]::OutputEncoding\n${script}`;
}

export async function commandTool(root, step, signal, options = {}) {
  validateStep(step);
  if (step.tool !== "command.execute") throw Error("Comando desconhecido.");
  if ((options.platform || process.platform) !== "win32")
    throw Error("Executor PowerShell disponivel no Windows.");
  const cwd = await (options.fullAccess ? checkedPcPath : checkedPath)(
    root,
    step.args.directory,
  );
  signal.throwIfAborted();
  if (/\x00/.test(step.args.script)) throw Error("Script invalido.");
  const launch = options.spawn || spawn,
    windows = options.windowsRoot || process.env.SystemRoot || "C:/Windows";
  const executable = path.join(
    windows,
    "System32/WindowsPowerShell/v1.0/powershell.exe",
  );
  return new Promise((resolve, reject) => {
    const child = launch(
      executable,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        Buffer.from(powerShellSource(step.args.script), "utf16le").toString(
          "base64",
        ),
      ],
      {
        cwd,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "",
      bytes = 0,
      settled = false,
      stopping = false;
    const outDecoder = new StringDecoder("utf8"),
      errDecoder = new StringDecoder("utf8");
    const stop = () => {
      if (stopping || settled) return;
      stopping = true;
      const interrupted = () =>
        finish(
          Error(
            signal.aborted
              ? "Comando interrompido; confira os efeitos ja realizados."
              : "Comando excedeu tempo ou tamanho; confira os efeitos ja realizados.",
          ),
        );
      if (Number.isInteger(child.pid) && child.pid > 0) {
        const killer = launch(
          path.join(windows, "System32/taskkill.exe"),
          ["/PID", String(child.pid), "/T", "/F"],
          { shell: false, windowsHide: true, stdio: "ignore" },
        );
        let killTimer = setTimeout(() => {
          child.kill();
          interrupted();
        }, 5000);
        killer.once("close", () => {
          clearTimeout(killTimer);
          interrupted();
        });
        killer.once("error", () => {
          clearTimeout(killTimer);
          child.kill();
          interrupted();
        });
      } else {
        child.kill();
        interrupted();
      }
    };
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", stop);
      error ? reject(error) : resolve(value);
    };
    const collect = (chunk, decoder) => {
      bytes += chunk.length;
      const text = decoder.write(chunk);
      if (output.length < 64000) output += text.slice(0, 64000 - output.length);
    };
    const timer = options.timeoutMs
      ? setTimeout(stop, options.timeoutMs)
      : null;
    child.stdout?.on("data", (chunk) => collect(chunk, outDecoder));
    child.stderr?.on("data", (chunk) => collect(chunk, errDecoder));
    child.once("error", (error) => finish(error));
    child.once("close", (code) => {
      if (!stopping)
        finish(
          null,
          JSON.stringify({
            exitCode: code,
            output: output + outDecoder.end() + errDecoder.end(),
            truncated: bytes > 256000 || output.length >= 64000,
            status: code === 0 ? "completed" : "error",
            workingDirectory: cwd,
            note: "Codigo de saida nao prova que o objetivo foi atingido; verifique o resultado. Nenhuma alteracao e desfeita automaticamente.",
          }),
        );
    });
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) stop();
  });
}
