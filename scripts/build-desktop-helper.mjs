import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { hashFile } from "../desktop/components.mjs";
if (process.platform !== "win32") {
  console.log("Helper Windows: compilacao disponivel no Windows.");
  process.exit(0);
}
const framework = path.join(
  process.env.SystemRoot || "C:/Windows",
  "Microsoft.NET/Framework64/v4.0.30319",
);
execFileSync(
  path.join(framework, "csc.exe"),
  [
    "/nologo",
    "/target:exe",
    "/optimize+",
    `/out:${path.resolve("desktop/native/DiefJarvis.Desktop.exe")}`,
    `/reference:${path.join(framework, "System.Web.Extensions.dll")}`,
    `/reference:${path.join(framework, "WPF/UIAutomationClient.dll")}`,
    `/reference:${path.join(framework, "WPF/UIAutomationTypes.dll")}`,
    path.resolve("desktop/native/DesktopHelper.cs"),
  ],
  { stdio: "inherit", windowsHide: true },
);
console.log(
  "Helper UI Automation compilado; nenhuma janela foi controlada pelo build.",
);
const binary = path.resolve("desktop/native/DiefJarvis.Desktop.exe");
await fs.writeFile(
  "desktop/native/helper-integrity.json",
  JSON.stringify({
    sha: await hashFile(binary),
    size: (await fs.stat(binary)).size,
  }),
);
