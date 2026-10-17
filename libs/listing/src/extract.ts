// Calls to an OpenAI-compatible chat endpoint (NInfer serving
// Qwen3.8-27B on chili, D-017). The engine has no constrained decoding,
// so the schema is in the prompt and validate.ts enforces it; a reply that
// is not JSON is retried once. The ad goes in as data inside tags, and the
// prompt says so: an ad that contains instructions is still only an ad.
//
// A screenshot is first transcribed word for word, then the transcript is
// analysed like a pasted ad. Quotes are checked against the transcript,
// and the app shows the transcript, so what the model read is visible.

import { SYSTEM_PROMPT, TRANSCRIBE_PROMPT } from "./prompt.ts";
import { type Validated, validate } from "./validate.ts";

export interface ExtractOptions {
  /** Base URL of the OpenAI-compatible server, e.g. http://127.0.0.1:8010. */
  baseUrl: string;
  model: string;
  /** Let Qwen think before answering. Off by default: slower, and the benchmark decides whether it helps. */
  thinking?: boolean;
  maxTokens?: number;
  fetch?: typeof fetch;
}

export interface Extraction extends Validated {
  ms: number;
  attempts: number;
  reply: string;
  /** The text the quotes were checked against: the ad as given, or the screenshot's transcript. */
  text: string;
}

export const MAX_AD_CHARS = 4000;

type Content = string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

async function chat(options: ExtractOptions, messages: { role: string; content: Content }[], maxTokens: number): Promise<string> {
  const res = await (options.fetch ?? fetch)(`${options.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: options.model,
      messages,
      temperature: 0,
      max_tokens: options.maxTokens ?? (options.thinking ? 4096 : maxTokens),
      chat_template_kwargs: { enable_thinking: options.thinking ?? false },
    }),
  });
  if (!res.ok) throw new Error(`model server ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return body.choices?.[0]?.message?.content ?? "";
}

/** The words in a screenshot (a data: URL or an http URL to an image), as written. */
export async function transcribe(image: string, options: ExtractOptions): Promise<string> {
  const text = await chat(
    { ...options, thinking: false },
    [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: image } },
          { type: "text", text: TRANSCRIBE_PROMPT },
        ],
      },
    ],
    1500,
  );
  return text.trim().slice(0, MAX_AD_CHARS);
}

export async function extractListing(ad: string, options: ExtractOptions): Promise<Extraction> {
  const text = ad.slice(0, MAX_AD_CHARS);
  const started = Date.now();
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const reply = await chat(
      options,
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `<ad>\n${text}\n</ad>` },
      ],
      1500,
    );
    try {
      return { ...validate(reply, text), ms: Date.now() - started, attempts: attempt, reply, text };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** A screenshot: transcribe, then extract from the transcript. */
export async function extractFromImage(image: string, options: ExtractOptions): Promise<Extraction> {
  const started = Date.now();
  const text = await transcribe(image, options);
  const out = await extractListing(text, options);
  return { ...out, ms: Date.now() - started };
}
