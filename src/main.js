// Boot: wire storage, sound, speech and the world together and start.
import { idbBackend, openStore } from './save/store.js';
import { createSound } from './audio/sound.js';
import { createSpeech } from './world/speech.js';
import { createWorld } from './world/world.js';
import { studioRoom } from './rooms/studio/room.js';
import { ACTIVITIES } from './activities/registry.js';

// ?still freezes ambient motion and randomness so screenshots are repeatable.
const params = new URLSearchParams(location.search);
const still = params.has('still');
const reducedMotion = still || matchMedia('(prefers-reduced-motion: reduce)').matches;

async function boot() {
  const store = await openStore(await idbBackend());
  const sound = createSound();
  const world = createWorld({
    canvas: document.getElementById('scene'),
    room: studioRoom,
    factories: ACTIVITIES,
    store,
    sound,
    speech: createSpeech(),
    reducedMotion,
    still,
  });
  world.start();
  sound.start();

  // Never lose a stroke: write out as soon as the page is hidden or closed.
  addEventListener('pagehide', () => store.flush());
  document.addEventListener('visibilitychange', () => { if (document.hidden) store.flush(); });

  // Ask the browser to keep the paintings even when space runs low. Chrome and Safari answer silently;
  // Firefox shows a prompt, which a child must never see, so it is left out there. See docs/saving.md.
  try { if (!/Firefox/.test(navigator.userAgent) && navigator.storage && navigator.storage.persist) Promise.resolve(navigator.storage.persist()).catch(() => {}); } catch (e) { /* not available: fine */ }

  if (params.has('test') || still) window.__studio = world; // for tests/ only
}
boot();
