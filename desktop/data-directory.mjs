import fs from "node:fs/promises";
import path from "node:path";
export async function safeDirectory(directory, create = false) {
  const absolute = path.resolve(directory);
  let current = path.parse(absolute).root;
  for (const segment of absolute
    .slice(current.length)
    .split(path.sep)
    .filter(Boolean)) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = await fs.lstat(current);
    } catch (error) {
      if (error.code !== "ENOENT" || !create) throw error;
      await fs.mkdir(current, { mode: 0o700 }).catch((problem) => {
        if (problem.code !== "EEXIST") throw problem;
      });
      stat = await fs.lstat(current);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw Error("Diretorio redirecionado ou invalido; instalacao bloqueada.");
  }
  return absolute;
}
export async function requireDisk(directory, bytes) {
  const stat = await fs.statfs(directory, { bigint: true });
  if (stat.bavail * stat.bsize < BigInt(bytes) + 67108864n)
    throw Error("Espaco livre insuficiente para preparar o componente.");
}
