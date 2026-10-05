// The one place that touches browser storage. Every read and write is guarded:
// if storage is missing, full or corrupt the app still runs, just without saving.
// Paintings live in IndexedDB (room for big paper); localStorage is the fallback
// when IndexedDB is missing or blocked. See docs/saving.md.
import { migrate, emptySave, CURRENT_VERSION } from './migrate.js';

export const KEY = 'sadies-studio';
export const LEGACY_KEYS = ['sadies-studio-v1'];
const SAVE_DELAY_MS = 500;

function browserStorage() {
  try { return window.localStorage; } catch (e) { return null; }
}

// storage: anything with getItem / setItem (defaults to localStorage).
// opts.seed: a save to start from instead of reading storage.
// opts.sink(id, state): where changed activities go instead of storage (IndexedDB).
export function createStore(storage = browserStorage(), delay = SAVE_DELAY_MS, opts = {}) {
  let data = emptySave();
  let timer = 0;
  let dirty = false;
  const dirtyIds = new Set(opts.seedDirty || []);

  const read = (key) => {
    try { const text = storage && storage.getItem(key); return text ? JSON.parse(text) : null; } catch (e) { return null; }
  };
  if (opts.seed) data = migrate(opts.seed);
  else for (const key of [KEY, ...LEGACY_KEYS]) {
    const found = read(key);
    if (found) { data = migrate(found); break; }
  }

  function write() {
    clearTimeout(timer);
    timer = 0;
    if (!dirty && !dirtyIds.size) return;
    dirty = false;
    if (opts.sink) {
      const ids = [...dirtyIds];
      dirtyIds.clear();
      for (const id of ids) try { opts.sink(id, data.activities[id]); } catch (e) { /* blocked: keep going */ }
      return;
    }
    dirtyIds.clear();
    try { if (storage) storage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* full or blocked: keep going */ }
  }

  return {
    // The saved state of one activity, or undefined if it has none yet.
    get: (id) => data.activities[id],
    // Remember an activity's state and write it to storage shortly after.
    set(id, state) {
      data = { version: CURRENT_VERSION, activities: { ...data.activities, [id]: state } };
      dirty = true;
      dirtyIds.add(id);
      clearTimeout(timer);
      timer = setTimeout(write, delay);
    },
    flush: write,
    // Everything saved, for moving it between storages.
    all: () => data,
  };
}

/* ---- IndexedDB ---- */
const DB_NAME = 'sadies-studio';
const DB_STORE = 'activities';

const wrap = (req) => new Promise((done, fail) => { req.onsuccess = () => done(req.result); req.onerror = () => fail(req.error); });

// Opens the database and returns { readAll(), put(id, state) }, or null if
// IndexedDB is missing or blocked. One record per activity.
export async function idbBackend(factory = globalThis.indexedDB) {
  try {
    if (!factory) return null;
    const open = factory.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(DB_STORE, { keyPath: 'id' });
    const db = await wrap(open);
    const store = (mode) => db.transaction(DB_STORE, mode).objectStore(DB_STORE);
    return {
      readAll: () => wrap(store('readonly').getAll()),
      put: (id, state) => { wrap(store('readwrite').put({ id, version: CURRENT_VERSION, state })).catch(() => {}); },
    };
  } catch (e) { return null; }
}

// The store the app uses: IndexedDB when it works (the first time, anything
// found in localStorage moves over), otherwise localStorage alone.
// backend: from idbBackend(), or null; local: a localStorage-like object.
export async function openStore(backend, local = browserStorage(), delay = SAVE_DELAY_MS) {
  const fallback = () => createStore(local, delay);
  if (!backend) return fallback();
  let records;
  try { records = await backend.readAll(); } catch (e) { return fallback(); }
  const activities = {};
  for (const r of records || []) if (r && r.version === CURRENT_VERSION && r.state) activities[r.id] = r.state;
  let seed = { version: CURRENT_VERSION, activities }, seedDirty = [];
  if (!Object.keys(activities).length) {
    const old = createStore(local, delay).all();
    seed = old; seedDirty = Object.keys(old.activities);
  }
  return createStore(local, delay, { seed, seedDirty, sink: backend.put });
}
