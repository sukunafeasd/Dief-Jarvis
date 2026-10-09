// Correlate the wake detector and command recognizer on their shared PCM clock.
// Portuguese often transcribes the name incorrectly, so words are cut by time.
export class WakeGate {
  constructor() {
    this.keywords = [];
    this.pending = [];
  }
  keyword(result) {
    for (const word of result?.result || []) {
      if (
        word.word === "jarvis" &&
        word.conf >= 0.72 &&
        Number.isFinite(word.start) &&
        Number.isFinite(word.end)
      )
        this.keywords.push(word);
    }
    this.keywords = this.keywords.slice(-12);
    return this.drain();
  }
  transcript(result) {
    if (result?.result?.length && result.text?.trim())
      this.pending.push(result);
    this.pending = this.pending.slice(-3);
    return this.drain();
  }
  drain() {
    const commands = [];
    for (const result of [...this.pending]) {
      const words = result.result,
        start = words[0].start,
        end = words.at(-1).end;
      const wake = this.keywords.find(
        (word) =>
          word.start >= start - 0.15 &&
          word.start <= end &&
          word.end <= end + 0.2,
      );
      if (!wake) continue;
      const next = this.keywords.find(
        (word) => word.start > wake.end && word.start <= end,
      );
      let spoken = words.filter(
        (word) =>
          word.start >= wake.end - 0.04 &&
          (!next || word.end <= next.start + 0.04),
      );
      if (!spoken.length)
        spoken = words.filter((word) => word.end <= wake.start + 0.04);
      commands.push(
        spoken
          .map((word) => word.word)
          .join(" ")
          .trim(),
      );
      this.pending.splice(this.pending.indexOf(result), 1);
      this.keywords = this.keywords.filter((word) => word.start > end + 0.2);
    }
    return commands;
  }
}
