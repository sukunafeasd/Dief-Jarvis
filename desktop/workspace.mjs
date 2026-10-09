import path from "node:path";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import { validateStep } from "../src/core/tools.mjs";

export async function checkedPath(root, relative, create = false) {
  if (typeof root !== "string" || !path.isAbsolute(root))
    throw Error("Pasta autorizada invalida.");
  if (
    typeof relative !== "string" ||
    !relative ||
    relative.length > 240 ||
    path.isAbsolute(relative) ||
    /[\\:\x00-\x1f]/.test(relative)
  )
    throw Error("Use um caminho relativo, sem caminhos absolutos ou atalhos.");
  const parts = relative === "." ? [] : relative.split("/");
  if (
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part) ||
        /[<>"|?*]/.test(part),
    )
  )
    throw Error("Caminho nao permitido.");
  const original = await fs.lstat(root);
  if (!original.isDirectory() || original.isSymbolicLink())
    throw Error("A pasta nao pode ser um link ou atalho.");
  const canonical = await fs.realpath(root);
  if (path.resolve(root).toLowerCase() !== canonical.toLowerCase())
    throw Error("A pasta atravessa um link ou junction.");
  let target = canonical;
  for (let index = 0; index < parts.length; index++) {
    target = path.join(target, parts[index]);
    try {
      const item = await fs.lstat(target);
      if (item.isSymbolicLink())
        throw Error("Links e junctions nao sao permitidos.");
      if (index < parts.length - 1 && !item.isDirectory())
        throw Error("Pasta intermediaria invalida.");
      const real = await fs.realpath(target);
      if (real.toLowerCase() !== target.toLowerCase())
        throw Error("Caminho atravessa link ou junction.");
    } catch (error) {
      if (!(create && index === parts.length - 1 && error.code === "ENOENT"))
        throw error;
    }
  }
  const diff = path.relative(canonical, target);
  if (diff.startsWith("..") || path.isAbsolute(diff))
    throw Error("Caminho fora da pasta autorizada.");
  return target;
}
export async function workspaceTool(root, step, signal, trashItem) {
  validateStep(step);
  signal.throwIfAborted();
  const target = await checkedPath(
    root,
    step.args.path,
    step.tool === "workspace.create",
  );
  signal.throwIfAborted();
  if (step.tool === "workspace.list") {
    const entries = [],
      directory = await fs.opendir(target);
    for await (const item of directory) {
      if (entries.length === 200) {
        entries.push("[listagem limitada a 200 entradas]");
        break;
      }
      entries.push(
        `${item.isSymbolicLink() ? "[link bloqueado]" : item.isDirectory() ? "[pasta]" : "[arquivo]"} ${item.name}`,
      );
    }
    return entries.join("\n") || "Pasta vazia.";
  }
  if (step.args.path === ".")
    throw Error("Esta operacao exige um arquivo, nao a pasta raiz.");
  if (step.tool === "workspace.create") {
    if (
      !/\.(txt|md|json|csv|html|css|js|mjs|ts|tsx|jsx|py|ps1|cs|xml|yaml|yml|toml)$/i.test(
        target,
      )
    )
      throw Error(
        "Crie um arquivo de texto ou codigo suportado. Binarios nao sao criados nem executados.",
      );
    // Exclusive creation never overwrites an existing file, including a link raced into place.
    const file = await fs.open(
      target,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      0o600,
    );
    try {
      await file.writeFile(step.args.content, "utf8");
      await file.sync();
    } catch (error) {
      throw Error(
        `Falha ao gravar. Pode existir um arquivo parcial em ${step.args.path}; confira antes de tentar novamente. ${error.code || ""}`,
      );
    } finally {
      await file.close();
    }
    return `Arquivo criado: ${step.args.path}. Nenhum arquivo existente foi substituido.`;
  }
  const info = await fs.lstat(target);
  if (!info.isFile() || info.isSymbolicLink())
    throw Error("Selecione um arquivo regular, nao uma pasta ou link.");
  if (step.tool === "workspace.read") {
    if (info.size > 16000)
      throw Error("Arquivo muito grande para leitura nesta versao (16 KB).");
    const file = await fs.open(
      target,
      constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
    );
    try {
      const opened = await file.stat();
      if (
        !opened.isFile() ||
        opened.ino !== info.ino ||
        opened.dev !== info.dev ||
        opened.size > 16000
      )
        throw Error("O arquivo mudou durante a leitura.");
      const bytes = Buffer.alloc(16001);
      const { bytesRead } = await file.read(bytes, 0, bytes.length, 0);
      if (bytesRead > 16000 || bytes.subarray(0, bytesRead).includes(0))
        throw Error("Arquivo nao e um texto pequeno suportado.");
      return (
        new TextDecoder("utf-8", { fatal: true }).decode(
          bytes.subarray(0, bytesRead),
        ) || "Arquivo vazio."
      );
    } finally {
      await file.close();
    }
  }
  if (step.tool === "workspace.trash") {
    if (typeof trashItem !== "function")
      throw Error("Lixeira do sistema indisponivel.");
    await checkedPath(root, step.args.path);
    await trashItem(target);
    return `Arquivo enviado para a Lixeira do sistema: ${step.args.path}.`;
  }
  throw Error("Ferramenta de arquivos desconhecida.");
}
