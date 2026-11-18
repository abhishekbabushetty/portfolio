/* =========================================================
   Sound design — fully synthesized with WebAudio (no files).
   Off by default; remembers the visitor's choice.
   ambient pad · hover ticks · click blips · section chimes
   ========================================================= */
(function () {
  const AS = (window.AS = window.AS || {});
  let ctx = null, master = null, pad = null, on = false, lastTick = 0;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

    // ambient pad: detuned triangles through a breathing low-pass
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 520; filter.Q.value = 0.7;
    const padGain = ctx.createGain(); padGain.gain.value = 0.05;
    filter.connect(padGain); padGain.connect(master);
    [110, 164.81, 220.4, 329.2].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f;
      o.detune.value = (i - 1.5) * 6;
      const g = ctx.createGain(); g.gain.value = i < 2 ? 0.5 : 0.18;
      o.connect(g); g.connect(filter); o.start();
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 260;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start();
    pad = padGain;
    return true;
  }

  function blip(freq, dur, vol, type, glideTo) {
    if (!on || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }

  function set(state, btn) {
    on = state;
    if (on && !ctx && !build()) { on = false; return; }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.4);
    btn && btn.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('as-sound', on ? '1' : '0'); } catch (e) {}
    if (on) setTimeout(() => blip(660, 0.25, 0.05, 'sine', 990), 60);
  }

  AS.sound = {
    init() {
      const btn = document.getElementById('soundBtn');
      if (!btn) return;
      btn.addEventListener('click', () => set(!on, btn));
      // resume the visitor's previous choice on their first interaction (autoplay rules)
      let wanted = false;
      try { wanted = localStorage.getItem('as-sound') === '1'; } catch (e) {}
      if (wanted) {
        const resume = (e) => { if (!e.target.closest('#soundBtn')) set(true, btn); window.removeEventListener('pointerdown', resume); window.removeEventListener('keydown', resume); };
        window.addEventListener('pointerdown', resume); window.addEventListener('keydown', resume);
      }
      document.addEventListener('pointerover', (e) => {
        if (!on) return;
        const el = e.target.closest('a, button, [data-cursor]');
        if (!el || el === e.relatedTarget || (e.relatedTarget && el.contains(e.relatedTarget))) return;
        const now = performance.now(); if (now - lastTick < 70) return; lastTick = now;
        blip(2400 + Math.random() * 400, 0.04, 0.018, 'sine');
      });
      document.addEventListener('click', (e) => {
        if (!on || e.target.closest('#soundBtn')) return;
        blip(520, 0.12, 0.05, 'triangle', 880);
      });
      let first = true;
      window.addEventListener('as:section', () => {
        if (first) { first = false; return; }
        blip(880, 0.9, 0.025, 'sine'); setTimeout(() => blip(1318.5, 1.1, 0.018, 'sine'), 90);
      });
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
      });
    }
  };
})();
