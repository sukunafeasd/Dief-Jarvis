import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { runtimeRoot } from "../desktop/components.mjs";
const root = process.cwd();
const revision = "6c2b0d75eae4b7047358e3b6bd9325f857d43f77";
const files = [
  [
    "model.pth",
    1867929118,
    "c7ea20001c6a0a841c77e252d8409f6a74fb423e79b3206a0771ba5989776187",
  ],
  [
    "speakers_xtts.pth",
    7754818,
    "f0f6137c19a4eab0cbbe4c99b5babacf68b1746e50da90807708c10e645b943b",
  ],
  ["config.json", 4368],
  ["vocab.json", 361219],
  ["LICENSE.txt", 4014],
];
const directory = path.join(root, "artifacts", "xtts-v2");
await fs.mkdir(directory, { recursive: true });
for (const [name, size, expected] of files) {
  const target = path.join(directory, name);
  const verify = async () => {
    try {
      if ((await fs.stat(target)).size !== size) return false;
      if (!expected) return true;
      const hash = crypto.createHash("sha256");
      const file = await fs.open(target);
      try {
        for await (const bytes of file.createReadStream()) hash.update(bytes);
      } finally {
        await file.close();
      }
      return hash.digest("hex") === expected;
    } catch {
      return false;
    }
  };
  if (await verify()) {
    console.log(`Verified ${name}`);
    continue;
  }
  const response = await fetch(
    `https://huggingface.co/coqui/XTTS-v2/resolve/${revision}/${name}`,
    { signal: AbortSignal.timeout(600000) },
  );
  if (!response.ok) throw Error(`Model HTTP ${response.status}: ${name}`);
  const partial = target + ".partial";
  const file = await fs.open(partial, "w");
  let received = 0,
    shown = 0;
  try {
    for await (const bytes of response.body) {
      received += bytes.length;
      if (received > size) throw Error(`Unexpected model size: ${name}`);
      await file.write(bytes);
      if (Date.now() - shown > 8000) {
        shown = Date.now();
        console.log(`${name}: ${Math.round((received / size) * 100)}%`);
      }
    }
    await file.sync();
  } finally {
    await file.close();
  }
  if (received !== size) throw Error(`Incomplete model: ${name}`);
  await fs.rename(partial, target);
  if (!(await verify())) throw Error(`Model integrity failed: ${name}`);
}
const python = path.join(
  root,
  "artifacts",
  "clone-runtime",
  "Scripts",
  "python.exe",
);
const reference = path.join(root, "artifacts", "jarvis-reference-clean.wav");
await fs.access(python);
await fs.access(reference);
await fs.mkdir(runtimeRoot(), { recursive: true });
await fs.writeFile(
  path.join(runtimeRoot(), "clone-voice.json"),
  JSON.stringify(
    { python, model: directory, reference, language: "pt", revision },
    null,
    2,
  ),
);
console.log(
  "Local clone configuration prepared. Reference/model stay outside Git.",
);
