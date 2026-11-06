import type { Turn } from "./types";

export type { Turn };

const LINE = /^(T\d+)\s+\[([^\]]*)\]\s+([^:]+?):\s?(.*)$/;

/** Parses "T01 [00:00] Agent: text" lines. Lines that don't match are kept, not dropped. */
export function parseTranscript(raw: string): Turn[] {
  const turns: Turn[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const m = LINE.exec(line);
    if (m) {
      turns.push({ turnId: m[1], timestamp: m[2], speaker: m[3].trim(), text: m[4] });
    } else {
      turns.push({ turnId: "", timestamp: "", speaker: "", text: line, unparsed: true });
    }
  }
  return turns;
}
