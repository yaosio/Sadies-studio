// All sound is made here, in code (no audio files). Sadie's trill plays as the
// page loads when the browser allows sound, otherwise on the very first touch
// (browsers insist on one). Nothing else ever plays on its own: every other sound
// answers a touch.
const PENTATONIC = [0, 2, 4, 7, 9]; // semitones, so any run of pots sounds friendly

// Sadie's trill: a rolled "brrrrp" that rises. A buzzy tone is switched on and
// off about 28 times a second (the roll), shaped by two vowel-like resonances,
// with a short soft chirp at the end. Starts at time t0 on audio context ctx.
export function trill(ctx, out, t0) {
  const roll = 0.42, dur = 0.58;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(470, t0);
  osc.frequency.linearRampToValueAtTime(690, t0 + roll);
  osc.frequency.linearRampToValueAtTime(930, t0 + dur);
  const gate = ctx.createGain(); // the roll: gain flips between 0 and 1
  gate.gain.value = 0.5;
  const lfo = ctx.createOscillator(), depth = ctx.createGain();
  lfo.type = 'square'; lfo.frequency.value = 28; depth.gain.value = 0.5;
  lfo.connect(depth); depth.connect(gate.gain);
  const body = ctx.createGain(), env = ctx.createGain(), sum = ctx.createGain();
  [[950, 4], [2300, 5]].forEach(([f, q]) => { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; gate.connect(bp); bp.connect(sum); });
  osc.connect(gate);
  sum.gain.value = 1.6;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.7, t0 + 0.03);
  env.gain.setValueAtTime(0.7, t0 + roll);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  sum.connect(env); env.connect(body); body.connect(out);
  [osc, lfo].forEach((o) => { o.start(t0); o.stop(t0 + dur + 0.05); });
}

export function createSound() {
  let ctx = null, master = null, greeted = false, purring = null;

  function tone(freq, at, dur, { type = 'triangle', gain = 0.5, to = 0, vibrato = 0, rate = 22 } = {}) {
    const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    if (vibrato) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = rate; lg.gain.value = vibrato;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const hz = (semi) => 440 * Math.pow(2, (semi - 9) / 12); // semitones above middle C

  const sounds = {
    // Sadie's trill when the child starts.
    greet: () => trill(ctx, master, ctx.currentTime),
    // Sadie petted: a purr, a low rumble that swells and fades. Touch again and
    // the old purr gives way to the new one.
    purr: () => {
      if (purring) purring();
      const t0 = ctx.currentTime, dur = 1.8, out = ctx.createGain(), low = ctx.createBiquadFilter();
      low.type = 'lowpass'; low.frequency.value = 260;
      out.gain.setValueAtTime(0.0001, t0);
      out.gain.exponentialRampToValueAtTime(0.5, t0 + 0.25);
      out.gain.setValueAtTime(0.5, t0 + dur - 0.7);
      out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      const pulse = ctx.createGain(); // the rumble: loudness pulsing about 25 times a second
      pulse.gain.value = 0.55;
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 25; depth.gain.value = 0.45; lfo.connect(depth); depth.connect(pulse.gain);
      const oscs = [lfo, ...[62, 93, 124].map((f, i) => { const o = ctx.createOscillator(); o.type = i ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.connect(pulse); return o; })];
      pulse.connect(low); low.connect(out); out.connect(master);
      oscs.forEach((o) => { o.start(t0); o.stop(t0 + dur + 0.05); });
      purring = () => { out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05); purring = null; };
      setTimeout(() => { if (purring) purring = null; }, dur * 1000);
    },
    // Something in the room touched: a soft wooden pop.
    pop: () => tone(520, 0, 0.09, { type: 'sine', gain: 0.35, to: 300 }),
    // A paint pot: a note from the pentatonic scale, one pot per note.
    pot: (i) => tone(hz(PENTATONIC[i % 5] + 12 * Math.floor(i / 5)), 0, 0.22, { type: 'triangle', gain: 0.4 }),
    tool: () => tone(220, 0, 0.08, { type: 'square', gain: 0.1, to: 160 }),
    tab: () => tone(380, 0, 0.06, { type: 'sine', gain: 0.25 }),
    // Painting hung up: a little rising sparkle.
    hang: () => [12, 16, 19, 24].forEach((s, k) => tone(hz(s), k * 0.09, 0.25, { type: 'sine', gain: 0.3 })),
  };

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { ctx = null; return false; }
    return true;
  }
  function greetIfRunning() {
    if (ctx && ctx.state === 'running' && !greeted) { greeted = true; sounds.greet(); }
  }
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().then(greetIfRunning, () => {});
  }

  return {
    unlock,
    // Call once at boot: Sadie trills as soon as the browser lets sound start,
    // which is at once if the page is allowed to autoplay, else on the first
    // touch, key or click anywhere.
    start() {
      if (!ensure()) return;
      ctx.addEventListener('statechange', greetIfRunning);
      for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) document.addEventListener(ev, unlock, { capture: true });
      unlock();
      greetIfRunning();
    },
    play(name, arg) {
      if (!ensure()) return;
      const run = () => { try { sounds[name](arg); } catch (e) { /* sound is never worth a crash */ } };
      if (ctx.state === 'running') { run(); return; }
      // Still waking up (the first touch is what wakes it): play if it wakes at once, never late.
      const asked = performance.now();
      ctx.resume().then(() => { if (performance.now() - asked < 400) run(); }, () => {});
    },
    names: () => Object.keys(sounds),
    state: () => ({ ctx: ctx && ctx.state, greeted }),
  };
}
