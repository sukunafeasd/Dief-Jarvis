import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";
import { ComponentInstaller } from "../desktop/components.mjs";
const status = await new ComponentInstaller().status();
if (!status.ready) {
  console.log(
    "SKIP: real offline speech test requires locally prepared voice components.",
  );
  process.exit(0);
}
const server = await createServer({
  cacheDir: "node_modules/.vite/test-voice",
  server: { host: "127.0.0.1", port: 0 },
});
let browser;
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      (process.platform === "win32"
        ? "C:/Users/cafe/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
        : undefined),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error")
      console.log("browser:", msg.text().slice(0, 500));
  });
  await page.goto(base);
  const result = await page.evaluate(async () => {
    const { loadSpeechModel } = await import("/src/wake-listener.mjs");
    const { WakeGate } = await import("/src/wake-gate.mjs");
    const gate = new WakeGate(),
      commands = [];
    const model = await loadSpeechModel("/__jarvis_voice/stt-pt.tar.gz");
    const keywordModel = await loadSpeechModel(
      "/__jarvis_voice/stt-wake-en.tar.gz",
    );
    const context = new AudioContext({ sampleRate: 24000 });
    const audio = await context.decodeAudioData(
      await (await fetch("/artifacts/jarvis-wake-pt.wav")).arrayBuffer(),
    );
    const recognizer = new model.KaldiRecognizer(audio.sampleRate);
    recognizer.setWords(true);
    const keywordRecognizer = new keywordModel.KaldiRecognizer(
      audio.sampleRate,
      JSON.stringify(["jarvis", "[unk]"]),
    );
    keywordRecognizer.setWords(true);
    const finals = [],
      partials = [];
    const keywords = [];
    keywordRecognizer.on("result", (message) => {
      keywords.push(message.result);
      commands.push(...gate.keyword(message.result));
    });
    recognizer.on("result", (message) => {
      finals.push(message.result);
      commands.push(...gate.transcript(message.result));
    });
    recognizer.on("partialresult", (message) => {
      if (message.result.partial) partials.push(message.result.partial);
    });
    const samples = audio.getChannelData(0);
    for (let i = 0; i < samples.length; i += 2048) {
      recognizer.acceptWaveformFloat(
        samples.slice(i, i + 2048),
        audio.sampleRate,
      );
      keywordRecognizer.acceptWaveformFloat(
        samples.slice(i, i + 2048),
        audio.sampleRate,
      );
      if (i % 20480 === 0)
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    recognizer.acceptWaveformFloat(
      new Float32Array(audio.sampleRate),
      audio.sampleRate,
    );
    recognizer.retrieveFinalResult();
    keywordRecognizer.acceptWaveformFloat(
      new Float32Array(audio.sampleRate),
      audio.sampleRate,
    );
    keywordRecognizer.retrieveFinalResult();
    await new Promise((resolve) => setTimeout(resolve, 10000));
    recognizer.remove();
    keywordRecognizer.remove();
    const negative = await context.decodeAudioData(
      await (await fetch("/artifacts/jarvis-no-wake.wav")).arrayBuffer(),
    );
    const negativeGate = new WakeGate(),
      unwanted = [];
    const npt = new model.KaldiRecognizer(negative.sampleRate),
      nen = new keywordModel.KaldiRecognizer(
        negative.sampleRate,
        JSON.stringify(["jarvis", "[unk]"]),
      );
    npt.setWords(true);
    nen.setWords(true);
    npt.on("result", (message) =>
      unwanted.push(...negativeGate.transcript(message.result)),
    );
    nen.on("result", (message) =>
      unwanted.push(...negativeGate.keyword(message.result)),
    );
    const ns = negative.getChannelData(0);
    for (let i = 0; i < ns.length; i += 2048) {
      npt.acceptWaveformFloat(ns.slice(i, i + 2048), negative.sampleRate);
      nen.acceptWaveformFloat(ns.slice(i, i + 2048), negative.sampleRate);
    }
    npt.acceptWaveformFloat(
      new Float32Array(negative.sampleRate),
      negative.sampleRate,
    );
    nen.acceptWaveformFloat(
      new Float32Array(negative.sampleRate),
      negative.sampleRate,
    );
    npt.retrieveFinalResult();
    nen.retrieveFinalResult();
    await new Promise((resolve) => setTimeout(resolve, 6000));
    npt.remove();
    nen.remove();
    keywordModel.terminate();
    model.terminate();
    await context.close();
    return {
      finals,
      partials: partials.slice(-8),
      keywords,
      commands,
      unwanted,
    };
  });
  console.log(JSON.stringify(result));
  assert.ok(
    result.finals.some((item) => item.text),
    "actual model generated transcripts",
  );
  assert.ok(
    result.keywords.some((item) =>
      item.result?.some((word) => word.word === "jarvis" && word.conf > 0.65),
    ),
    "keyword model detected actual Jarvis audio",
  );
  assert.ok(
    result.commands.some(
      (command) =>
        command.includes("minhas tarefas") && !command.includes("jardim"),
    ),
    "actual dual models produced an addressed command without the misrecognized wake name",
  );
  assert.deepEqual(
    result.unwanted,
    [],
    "ordinary speech without Jarvis must not execute a command",
  );
  console.log(
    "PASS: offline model loaded and transcribed synthetic audio; no physical microphone used.",
  );
} finally {
  await browser?.close();
  await server.close();
}
