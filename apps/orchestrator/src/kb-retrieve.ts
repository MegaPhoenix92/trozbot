import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KbRetrieveInputSchema,
  KbRetrieveOutputSchema,
  type KbRetrieveInput,
  type KbRetrieveOutput,
} from "@trozbot/core";

export interface KbDocument {
  id: string;
  title: string;
  body: string;
  tags: string[];
}

export interface KbRetriever {
  retrieve(input: KbRetrieveInput): KbRetrieveOutput;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 1);
}

function scoreDoc(queryTokens: string[], doc: KbDocument): number {
  const hay = tokenize(`${doc.title} ${doc.body} ${doc.tags.join(" ")}`);
  let score = 0;
  for (const t of queryTokens) {
    if (hay.includes(t)) score += 1;
  }
  return score;
}

function loadDefaultFixture(): KbDocument[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "..", "fixtures", "kb.json"),
    join(here, "..", "..", "fixtures", "kb.json"),
  ];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, "utf8");
      return JSON.parse(raw) as KbDocument[];
    } catch {
      // try next
    }
  }
  throw new Error("KB fixture kb.json not found relative to orchestrator package");
}

/** File-backed KB retriever — hits are grounded; misses invent no sources. */
export class FixtureKbRetriever implements KbRetriever {
  private readonly docs: KbDocument[];

  constructor(docs?: KbDocument[]) {
    this.docs = docs ?? loadDefaultFixture();
  }

  retrieve(rawInput: KbRetrieveInput): KbRetrieveOutput {
    const input = KbRetrieveInputSchema.parse(rawInput);
    const queryTokens = tokenize(input.query);
    const ranked = this.docs
      .map((doc) => ({ doc, score: scoreDoc(queryTokens, doc) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    const top = ranked[0]?.doc;
    if (!top) {
      return KbRetrieveOutputSchema.parse({
        answer:
          "I did not find a matching knowledge base article for that question. " +
          "Try different words, or create a support ticket so a human operator can follow up. " +
          "I will not invent sources that are not in the knowledge base.",
        sources: [],
        grounded: false,
        hit: false,
      });
    }

    const excerpt =
      top.body.length > 240 ? `${top.body.slice(0, 237)}...` : top.body;

    return KbRetrieveOutputSchema.parse({
      answer: top.body,
      sources: [
        {
          id: top.id,
          title: top.title,
          excerpt,
        },
      ],
      grounded: true,
      hit: true,
    });
  }
}
