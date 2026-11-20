import { SAVE_VERSION, type RunState } from './run';

export const SAVE_KEY = 'mbop.save.v1';
export const SETTINGS_KEY = 'mbop.settings.v1';

export function serializeRun(run: RunState): string {
  return JSON.stringify(run);
}

export function deserializeRun(json: string | null): RunState | null {
  if (!json) return null;
  try {
    const data = JSON.parse(json) as RunState;
    if (!data || data.version !== SAVE_VERSION || !data.map || !data.res) return null;
    return data;
  } catch {
    return null;
  }
}

/** Minimal storage interface so this works with localStorage or an in-memory stub. */
export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function saveRun(store: KeyValueStore, run: RunState): void {
  try {
    store.setItem(SAVE_KEY, serializeRun(run));
  } catch {
    // Storage full or disabled: the game still works, just without continue.
  }
}

export function loadRun(store: KeyValueStore): RunState | null {
  try {
    return deserializeRun(store.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function clearRun(store: KeyValueStore): void {
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
