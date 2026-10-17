import type { DetectedEvent, EventType, IsoDate } from "@ahead/contract";

/** The only message that can ever leave the phone, and only when the user presses Share (apps/api). */
export interface SharePayload {
  type: EventType;
  date?: IsoDate;
  municipality?: string;
}

export interface ShareResult {
  received: SharePayload;
  total: number;
}

/** Where the demo's If side runs; `VITE_AHEAD_API` overrides it. */
export const API_URL: string = (import.meta.env.VITE_AHEAD_API as string | undefined) ?? "http://localhost:8787";

export function payloadFor(event: DetectedEvent): SharePayload {
  const p: SharePayload = { type: event.type };
  if (event.estimatedDate) p.date = event.estimatedDate;
  if (event.place) p.municipality = event.place;
  return p;
}

/** One POST with the three fields. The outbound counter sees it, which is the point. */
export async function share(payload: SharePayload): Promise<ShareResult> {
  const res = await fetch(`${API_URL}/api/share`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const body = (await res.json()) as { received: SharePayload; total: number };
  return { received: body.received, total: body.total };
}
