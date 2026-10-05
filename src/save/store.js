// The one place that touches browser storage. Every read and write is guarded:
// if storage is missing, full or corrupt the app still runs, just without saving.
import { migrate, emptySave, CURRENT_VERSION } from './migrate.js';

export const KEY = 'sadies-studio';
export const LEGACY_KEYS = ['sadies-studio-v1'];
const SAVE_DELAY_MS = 500;

function browserStorage() {
  try { return window.localStorage; } catch (e) { return null; }
}

// storage: anything with getItem / setItem (defaults to localStorage).
export function createStore(storage = browserStorage(), delay = SAVE_DELAY_MS) {
  let data = emptySave();
  let timer = 0;
  let dirty = false;

  const read = (key) => {
    try { const text = storage && storage.getItem(key); return text ? JSON.parse(text) : null; } catch (e) { return null; }
  };
  for (const key of [KEY, ...LEGACY_KEYS]) {
    const found = read(key);
    if (found) { data = migrate(found); break; }
  }

  function write() {
    clearTimeout(timer);
    timer = 0;
    if (!dirty) return;
    dirty = false;
    try { if (storage) storage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* full or blocked: keep going */ }
  }

  return {
    // The saved state of one activity, or undefined if it has none yet.
    get: (id) => data.activities[id],
    // Remember an activity's state and write it to storage shortly after.
    set(id, state) {
      data = { version: CURRENT_VERSION, activities: { ...data.activities, [id]: state } };
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(write, delay);
    },
    flush: write,
  };
}
