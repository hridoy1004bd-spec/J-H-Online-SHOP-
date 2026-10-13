import { useSyncExternalStore } from "react";

const KEY = "jh-favorites";

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

let ids: string[] = read();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return ids;
}

export function toggleFavorite(id: string): boolean {
  const adding = !ids.includes(id);
  ids = adding ? [id, ...ids] : ids.filter((x) => x !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  return adding;
}

export function useFavorites() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ids: list, isFav: (id: string) => list.includes(id), toggle: toggleFavorite };
}
