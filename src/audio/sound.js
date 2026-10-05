// All sound is made here, in code (no audio files). Nothing plays until the child
// first touches the screen (browsers insist), and nothing ever plays on its own:
// every sound answers a touch.
const PENTATONIC = [0, 2, 4, 7, 9]; // semitones, so any run of pots sounds friendly

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
    // Sadie's trill when the child starts: a rolled "brrrrp" that climbs, then a
    // second, shorter one on top (a cat's hello).
    greet: () => {
      tone(560, 0, 0.5, { type: 'triangle', gain: 0.42, to: 880, vibrato: 170, rate: 27 });
      tone(840, 0.5, 0.32, { type: 'triangle', gain: 0.4, to: 1180, vibrato: 200, rate: 29 });
    },
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

  return {
    // Call from a touch or key handler. Safe to call every time.
    unlock() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { ctx = null; return; }
      }
      if (ctx.state === 'suspended') ctx.resume();
    },
    // Sadie's hello, once, on the very first touch.
    greetOnce() { if (!greeted) { greeted = true; this.play('greet'); } },
    play(name, arg) {
      if (!ctx) return; // a context still resuming queues the note
      try { sounds[name](arg); } catch (e) { /* sound is never worth a crash */ }
    },
    names: () => Object.keys(sounds),
  };
}
