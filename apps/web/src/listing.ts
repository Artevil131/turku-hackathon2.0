import type { Dropped, Listing, Risk, Timeline } from "@ahead/listing";
import { API_URL } from "./share.ts";

export type ListingInput = { text: string } | { image: string };

export interface ListingAnalysis {
  text: string;
  listing: Listing;
  dropped: Dropped[];
  ms: number;
  risks: Risk[];
  timeline: Timeline;
}

/** Uses the same fetch path as sharing, so the outbound counter measures this request too. */
export async function analyseListing(input: ListingInput, signal?: AbortSignal): Promise<ListingAnalysis> {
  const res = await fetch(`${API_URL}/api/listing`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()) as ListingAnalysis;
}

/** Decode locally and send only the resized JPEG, never the original file or its metadata. */
export async function screenshotData(file: File): Promise<string> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = data;
  await image.decode();
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}
