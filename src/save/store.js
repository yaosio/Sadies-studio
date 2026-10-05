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
  const locked = new Set(opts.locked || []); // records written by a newer app: never overwritten
  let failing = false, onFail = null, lockedAll = false;
  const failed = () => { if (!failing) { failing = true; if (onFail) try { onFail(); } catch (e) { /* a listener must never break saving */ } } };
  const worked = () => { failing = false; };

  const read = (key) => {
    try { const text = storage && storage.getItem(key); return text ? JSON.parse(text) : null; } catch (e) { return null; }
  };
  if (opts.seed) data = migrate(opts.seed);
  else for (const key of [KEY, ...LEGACY_KEYS]) {
    const found = read(key);
    if (found) {
      if (found.version > CURRENT_VERSION) lockedAll = true; // saved by a newer app: read nothing, overwrite nothing
      else data = migrate(found);
      break;
    }
  }

  function write() {
    clearTimeout(timer);
    timer = 0;
    if (!dirty && !dirtyIds.size) return;
    dirty = false;
    if (opts.sink) {
      const ids = [...dirtyIds];
      dirtyIds.clear();
      for (const id of ids) {
        if (locked.has(id)) { failed(); continue; }
        try { Promise.resolve(opts.sink(id, data.activities[id])).then(worked, failed); } catch (e) { failed(); } // blocked or full: keep going
      }
      return;
    }
    dirtyIds.clear();
    if (lockedAll) { failed(); return; }
    try { if (storage) { storage.setItem(KEY, JSON.stringify(data)); worked(); } else failed(); } catch (e) { failed(); } // full or blocked: keep going
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
    // Called once each time saving starts failing (full or blocked storage); the app can tell the child.
    onFail(fn) { onFail = fn; },
    // True while the last write failed, or while a newer app's records are being protected.
    isFailing: () => failing,
    isLocked: () => lockedAll || locked.size > 0,
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
      // Resolves when the write is safely done; rejects if the database refuses (full, blocked, closed).
      put: (id, state) => { try { return wrap(store('readwrite').put({ id, version: CURRENT_VERSION, state })); } catch (e) { return Promise.reject(e); } },
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
  const activities = {}, locked = [];
  for (const r of records || []) {
    if (!r || !r.state) continue;
    if (r.version === CURRENT_VERSION) activities[r.id] = r.state;
    else locked.push(r.id); // another version (a newer app wrote it): leave it exactly as it is
  }
  let seed = { version: CURRENT_VERSION, activities }, seedDirty = [];
  if (!Object.keys(activities).length && !locked.length) {
    const old = createStore(local, delay).all();
    seed = old; seedDirty = Object.keys(old.activities);
  }
  return createStore(local, delay, { seed, seedDirty, locked, sink: backend.put });
}
