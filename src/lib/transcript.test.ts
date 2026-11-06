import { describe, expect, it } from "vitest";
import { parseTranscript } from "./transcript";

describe("parseTranscript", () => {
  it("parses id, timestamp, speaker and text", () => {
    expect(parseTranscript("T01 [00:04] Customer: Hi there")).toEqual([
      { turnId: "T01", timestamp: "00:04", speaker: "Customer", text: "Hi there" },
    ]);
  });

  it.each(["Mother", "Father", "Partner", "Unclear speaker", "Transcript note"])("keeps the %s label", (label) => {
    const [t] = parseTranscript(`T02 [01:10] ${label}: hello`);
    expect(t.speaker).toBe(label);
    expect(t.unparsed).toBeUndefined();
  });

  it("keeps colons inside the text", () => {
    const [t] = parseTranscript("T03 [00:30] Agent: Note: the time is 2:30 pm");
    expect(t.speaker).toBe("Agent");
    expect(t.text).toBe("Note: the time is 2:30 pm");
  });

  it("skips blank lines and handles CRLF", () => {
    const turns = parseTranscript("T01 [00:00] Agent: a\r\n\r\nT02 [00:05] Customer: b\r\n");
    expect(turns.map((t) => t.turnId)).toEqual(["T01", "T02"]);
    expect(turns[0].text).toBe("a");
  });

  it("keeps lines it cannot parse", () => {
    const turns = parseTranscript("T01 [00:00] Agent: a\nsomething odd\nT02 [00:05] Customer: b");
    expect(turns).toHaveLength(3);
    expect(turns[1]).toMatchObject({ unparsed: true, text: "something odd", turnId: "" });
  });
});
