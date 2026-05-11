import { XMLParser } from "fast-xml-parser";
import type { NFeDoc } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
});

export function decodeLote(base64List: string[]): NFeDoc[] {
  const docs: NFeDoc[] = [];
  for (const str of base64List) {
    try {
      const xml = Buffer.from(str, "base64").toString("utf-8");
      const parsed = parser.parse(xml) as NFeDoc;
      docs.push(parsed);
    } catch (err) {
      console.error("decodeLote: parse error", err);
    }
  }
  return docs;
}
