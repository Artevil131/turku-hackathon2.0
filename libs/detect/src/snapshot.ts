// Embedded vectors are derived personal data and stay on the device. The
// app may persist the detector's cache so "Check now" is instant after
// a reload; this is the compact form for IndexedDB: one Float32Array for
// all vectors plus the ids, tagged with the model so a different model
// never reads another's vectors. Erase-all drops it with everything else.

export interface VectorSnapshot {
  modelId: string;
  dim: number;
  ids: string[];
  /** ids.length × dim floats, row-major. Store the underlying ArrayBuffer. */
  data: Float32Array;
}

export function toSnapshot(modelId: string, dim: number, cache: ReadonlyMap<string, Float32Array>): VectorSnapshot {
  const ids = [...cache.keys()];
  const data = new Float32Array(ids.length * dim);
  for (const [i, id] of ids.entries()) data.set(cache.get(id) as Float32Array, i * dim);
  return { modelId, dim, ids, data };
}

/** Returns the vectors of a snapshot made with the same model, or nothing if the model differs. */
export function fromSnapshot(snapshot: VectorSnapshot, modelId: string, dim: number): Map<string, Float32Array> {
  const out = new Map<string, Float32Array>();
  if (snapshot.modelId !== modelId || snapshot.dim !== dim || snapshot.data.length !== snapshot.ids.length * dim) return out;
  for (const [i, id] of snapshot.ids.entries()) out.set(id, snapshot.data.subarray(i * dim, (i + 1) * dim));
  return out;
}
