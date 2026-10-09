import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as asar from "@electron/asar";

const archive = process.argv[2];
if (!archive || !fs.existsSync(archive))
  throw Error("Informe o app.asar do build que deseja conferir.");
const files = [
  ...fs
    .readdirSync("desktop")
    .filter((name) => /\.(cjs|mjs)$/.test(name))
    .map((name) => `desktop/${name}`),
  ...fs
    .readdirSync("src/core")
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => `src/core/${name}`),
  "dist/index.html",
  "dist/audio-capture.worklet.js",
  ...fs.readdirSync("dist/assets").map((name) => `dist/assets/${name}`),
];
for (const name of files)
  assert.ok(
    fs
      .readFileSync(name)
      .equals(asar.extractFile(archive, path.normalize(name))),
    `Fonte divergente: ${name}`,
  );
const expected = JSON.parse(fs.readFileSync("package.json", "utf8"));
const actual = JSON.parse(asar.extractFile(archive, "package.json"));
for (const key of ["name", "version", "main"])
  assert.equal(actual[key], expected[key]);
const names = asar
  .listPackage(archive)
  .map((name) => name.split(path.sep).join("/"));
assert.ok(
  !names.some((name) =>
    /\/(?:\.env(?:\.[^/]+)?|workspace\.sqlite(?:[^/]*)|test-result\.json)$/.test(
      name,
    ),
  ),
  "Dados privados no pacote",
);
console.log(
  JSON.stringify({
    ok: true,
    checkedFiles: files.length,
    version: actual.version,
  }),
);
