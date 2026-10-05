// Boot: wire storage, sound, speech and the world together and start.
import { createStore } from './save/store.js';
import { createSound } from './audio/sound.js';
import { createSpeech } from './world/speech.js';
import { createWorld } from './world/world.js';
import { studioRoom } from './rooms/studio/room.js';
import { ACTIVITIES } from './activities/registry.js';

// ?still freezes ambient motion and randomness so screenshots are repeatable.
const params = new URLSearchParams(location.search);
const still = params.has('still');
const reducedMotion = still || matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = createStore();
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

if (params.has('test') || still) window.__studio = world; // for tests/ only
