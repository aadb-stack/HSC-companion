// Loads & caches the versioned JSON content files in /data.
const cache = new Map();

export async function loadData(name) {
  if (cache.has(name)) return cache.get(name);
  const res = await fetch(`data/${name}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Could not load data/${name}.json (HTTP ${res.status})`);
  const json = await res.json();
  cache.set(name, json);
  return json;
}

export function clearDataCache() { cache.clear(); }
