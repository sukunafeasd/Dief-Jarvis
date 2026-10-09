import { spawn } from "node:child_process";
import { validatePlan } from "../src/core/tools.mjs";
export function desktopRequest(step) {
  validatePlan({ summary: "Validar comando desktop", steps: [step] });
  const map = {
    "desktop.list": "list",
    "desktop.observe": "observe",
    "desktop.focus": "focus",
    "desktop.invoke": "invoke",
    "desktop.type": "type",
  };
  if (!Object.hasOwn(map, step.tool))
    throw Error("Operacao de desktop desconhecida.");
  const args = step.args;
  if (map[step.tool] !== "list" && !/^\d+:\d+$/.test(args.window))
    throw Error("ID de janela invalido.");
  if (
    ["invoke", "type"].includes(map[step.tool]) &&
    !/^-?\d+(,-?\d+){1,12}$/.test(args.ref)
  )
    throw Error("Referencia UIA invalida.");
  if (
    map[step.tool] === "type" &&
    (typeof args.text !== "string" ||
      !args.text.trim() ||
      args.text.length > 2000)
  )
    throw Error("Texto invalido.");
  return { ...args, op: map[step.tool] };
}
export function desktopTool(step, helper, signal, launch = spawn) {
  const request = desktopRequest(step);
  if (process.platform !== "win32")
    return Promise.reject(
      Error("Controle desktop disponivel apenas no Windows."),
    );
  return new Promise((resolve, reject) => {
    const child = launch(helper, [], {
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      signal,
    });
    let output = "",
      error = "";
    const timer = setTimeout(() => child.kill(), 20000);
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      if (output.length > 20000) child.kill();
    });
    child.stderr.on("data", (chunk) => {
      error += chunk.toString().slice(0, 1000);
    });
    child.on("error", (problem) => {
      clearTimeout(timer);
      reject(problem);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        const data = JSON.parse(output);
        if (code !== 0 || data.error)
          throw Error(data.error || error || "Helper nao concluiu.");
        resolve(JSON.stringify(data));
      } catch (problem) {
        reject(Error(problem.message || "Resposta desktop invalida."));
      }
    });
    child.stdin.end(JSON.stringify(request));
  });
}
