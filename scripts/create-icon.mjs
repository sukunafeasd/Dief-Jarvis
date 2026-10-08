import { PNG } from "pngjs";
import { mkdir, writeFile } from "node:fs/promises";
const size = 256;
const png = new PNG({ width: size, height: size });
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const dx = x - 127.5,
      dy = y - 127.5,
      r = Math.hypot(dx, dy),
      angle = Math.atan2(dy, dx);
    const i = (y * size + x) * 4;
    const ring =
      Math.abs(r - 91) < 1.3 || Math.abs(r - 72) < 1 || Math.abs(r - 40) < 1.5;
    const spokes = r > 74 && r < 90 && Math.abs(Math.sin(angle * 12)) < 0.05;
    const core =
      r < 16 || (r < 55 && Math.abs(Math.sin(angle * 8 + r * 0.08)) < 0.018);
    const glow = Math.max(0, 1 - r / 128) * 0.065;
    const bright = ring || spokes || core;
    png.data[i] = bright ? 255 : Math.round(8 + glow * 180);
    png.data[i + 1] = bright ? 180 : Math.round(13 + glow * 80);
    png.data[i + 2] = bright ? 88 : 17;
    png.data[i + 3] = 255;
  }
await mkdir("public", { recursive: true });
const buffer = PNG.sync.write(png);
await writeFile("public/jarvis-mark.png", buffer);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(buffer.length, 14);
header.writeUInt32LE(22, 18);
await writeFile("public/jarvis-mark.ico", Buffer.concat([header, buffer]));
