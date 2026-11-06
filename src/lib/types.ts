export type Turn = {
  /** Turn ID such as "T05". Empty string when the line could not be parsed. */
  turnId: string;
  /** Timestamp such as "00:44". Empty string when the line could not be parsed. */
  timestamp: string;
  /** Speaker label as written: Agent, Customer, Mother, Father, Partner, Unclear speaker, Transcript note, ... */
  speaker: string;
  text: string;
  /** True when the line did not match the expected format and is kept verbatim in `text`. */
  unparsed?: boolean;
};

export type Call = {
  id: string;
  date: string;
  turns: Turn[];
  summary: string;
};
