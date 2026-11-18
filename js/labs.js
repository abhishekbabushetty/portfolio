/* =========================================================
   THE LAB — each project card renders a small model of the project's core algorithm.
   Each viz: { setup(W,H), frame(t, dt), click?(x,y) } on a 2D canvas.
   ========================================================= */
(function () {
  const AS = (window.AS = window.AS || {});
  const ACC = '#c8f542', ACC_RGB = '200,245,66', INK = '#eef1ee', VIO = '#3fe0c5';
  const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';
  const SANS = 'Geist, system-ui, sans-serif';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = Math.random;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const ink = (a) => `rgba(238,241,238,${a})`;
  const acc = (a) => `rgba(${ACC_RGB},${a})`;

  function label(ctx, txt, x, y, color, size, align) {
    ctx.font = `${size || 11}px ${MONO}`;
    ctx.fillStyle = color || ink(0.6);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }

  /* ---------------- 1 · multi-agent graph (EduAI) ---------------- */
  function agents(ctx, P) {
    const names = ['Learner', 'AI Mentor', 'Recruiter', 'Planner', 'RAG memory', 'Graph RAG', 'Voice · Twilio', 'Gemini'];
    const edges = [[0,1],[0,3],[1,4],[1,7],[3,4],[3,5],[2,5],[2,6],[2,7],[1,3],[4,5],[6,0],[7,3]];
    let W, H, nodes = [], pulses = [], last = 0;
    return {
      setup(w, h) {
        W = w; H = h;
        nodes = names.map((n, i) => {
          const a = (i / names.length) * Math.PI * 2 - Math.PI / 2;
          const bx = W / 2 + Math.cos(a) * W * 0.32, by = H / 2 + Math.sin(a) * H * 0.32;
          return { n, bx, by, x: bx, y: by, ph: rnd() * 6, flash: 0, hub: i === 1 || i === 3 };
        });
      },
      frame(t, dt) {
        ctx.clearRect(0, 0, W, H);
        let hover = -1;
        nodes.forEach((o, i) => {
          let tx = o.bx + Math.sin(t * 0.6 + o.ph) * 12, ty = o.by + Math.cos(t * 0.5 + o.ph) * 10;
          if (P.in) {
            const dx = P.x - tx, dy = P.y - ty, d = Math.hypot(dx, dy);
            const f = clamp(1 - d / (W * 0.35), 0, 1) * 0.35;
            tx += dx * f; ty += dy * f;
            if (d < 40) hover = i;
          }
          o.x = lerp(o.x, tx, 0.08); o.y = lerp(o.y, ty, 0.08);
          o.flash = Math.max(0, o.flash - dt * 1.6);
        });
        // edges
        edges.forEach(([a, b]) => {
          const A = nodes[a], B = nodes[b];
          const hot = hover === a || hover === b;
          ctx.strokeStyle = hot ? acc(0.6) : ink(0.1);
          ctx.lineWidth = hot ? 1.4 : 1;
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        });
        // spawn pulses
        if (t - last > (P.in ? 0.12 : 0.28)) {
          last = t;
          const e = edges[(rnd() * edges.length) | 0];
          const dir = rnd() > 0.5;
          pulses.push({ a: dir ? e[0] : e[1], b: dir ? e[1] : e[0], p: 0, sp: 0.8 + rnd() * 0.8 });
        }
        pulses = pulses.filter((q) => {
          q.p += dt * q.sp;
          const A = nodes[q.a], B = nodes[q.b];
          if (q.p >= 1) { B.flash = 1; return false; }
          for (let k = 0; k < 6; k++) {
            const pp = q.p - k * 0.025; if (pp < 0) break;
            ctx.fillStyle = acc(0.9 - k * 0.15);
            ctx.beginPath(); ctx.arc(lerp(A.x, B.x, pp), lerp(A.y, B.y, pp), 2.6 - k * 0.35, 0, 7); ctx.fill();
          }
          return true;
        });
        // nodes
        nodes.forEach((o, i) => {
          const r = o.hub ? 9 : 6;
          if (o.flash > 0) {
            ctx.strokeStyle = acc(o.flash * 0.7); ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(o.x, o.y, r + (1 - o.flash) * 22, 0, 7); ctx.stroke();
          }
          ctx.fillStyle = i === hover || o.flash > 0.5 ? ACC : '#11161a';
          ctx.strokeStyle = o.hub ? ACC : ink(0.6); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 7); ctx.fill(); ctx.stroke();
          const below = o.y > H / 2;
          label(ctx, o.n, o.x, o.y + (below ? 22 : -22), i === hover ? ACC : ink(0.75), 11, 'center');
        });
        label(ctx, 'agents hand off tasks', 16, H - 18, ink(0.35), 10);
      }
    };
  }

  /* ---------------- 2 · vector retrieval (Medical RAG) ---------------- */
  function rag(ctx, P) {
    const topics = ['cardiology', 'neurology', 'oncology', 'pharmacology', 'pediatrics'];
    let W, H, pts = [], centers = [], q = { x: 0, y: 0 };
    return {
      setup(w, h) {
        W = w; H = h; pts = [];
        centers = topics.map((tp, i) => ({ tp, x: W * (0.18 + 0.64 * ((i * 0.37 + 0.13) % 1)), y: H * (0.22 + 0.56 * ((i * 0.61 + 0.3) % 1)) }));
        for (let i = 0; i < 260; i++) {
          const c = centers[i % centers.length];
          const a = rnd() * 6.283, r = Math.pow(rnd(), 0.7) * Math.min(W, H) * 0.17;
          pts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.8, c: i % centers.length, id: 100 + i * 3, hl: 0 });
        }
        q.x = W / 2; q.y = H / 2;
      },
      frame(t) {
        ctx.clearRect(0, 0, W, H);
        const tx = P.in ? P.x : W / 2 + Math.sin(t * 0.37) * W * 0.33;
        const ty = P.in ? P.y : H / 2 + Math.sin(t * 0.53 + 1) * H * 0.3;
        q.x = lerp(q.x, tx, 0.12); q.y = lerp(q.y, ty, 0.12);
        centers.forEach((c) => label(ctx, c.tp, c.x, c.y - Math.min(W, H) * 0.2, ink(0.22), 10, 'center'));
        const ds = pts.map((p, i) => [Math.hypot(p.x - q.x, p.y - q.y), i]).sort((a, b) => a[0] - b[0]);
        const K = 5, top = ds.slice(0, K);
        const topSet = new Set(top.map((d) => d[1]));
        pts.forEach((p, i) => {
          p.hl = lerp(p.hl, topSet.has(i) ? 1 : 0, 0.2);
          ctx.fillStyle = p.hl > 0.05 ? acc(0.4 + p.hl * 0.6) : ink(0.28);
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 + p.hl * 2.4, 0, 7); ctx.fill();
        });
        const rad = top[K - 1][0];
        ctx.setLineDash([3, 5]); ctx.strokeStyle = acc(0.35); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        top.forEach(([d, i]) => {
          const p = pts[i];
          ctx.strokeStyle = acc(0.55); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        });
        // query point
        ctx.fillStyle = VIO; ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(63,224,197,0.4)'; ctx.beginPath(); ctx.arc(q.x, q.y, 11 + Math.sin(t * 4) * 2, 0, 7); ctx.stroke();
        label(ctx, 'query', q.x + 14, q.y - 12, VIO, 10);
        // results panel
        const maxD = Math.hypot(W, H) * 0.5;
        const px = W - 172, py = 52;
        ctx.fillStyle = 'rgba(7,9,11,0.72)'; ctx.strokeStyle = ink(0.1);
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, 156, 28 + K * 20, 10) : ctx.rect(px, py, 156, 28 + K * 20); ctx.fill(); ctx.stroke();
        label(ctx, 'TOP-K · COSINE', px + 12, py + 15, ink(0.45), 9);
        top.forEach(([d, i], k) => {
          const p = pts[i];
          const sim = clamp(1 - d / maxD, 0, 1) * 0.35 + 0.62;
          label(ctx, `${topics[p.c].slice(0, 6)}#${p.id}`, px + 12, py + 36 + k * 20, ink(0.75), 10);
          label(ctx, sim.toFixed(3), px + 144, py + 36 + k * 20, ACC, 10, 'right');
        });
        label(ctx, 'top-k retrieval over embeddings', 16, H - 18, ink(0.35), 10);
      }
    };
  }

  /* ---------------- 3 · A* ship routing (Darwin Pilot) ---------------- */
  function astar(ctx, P) {
    let W, H, cs, cols, rows, land, start, goal, open, came, g, closed, path, state, timer, ship, explored, seed;
    function valueNoise(x, y, grid) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const at = (i, j) => grid[((j % grid.length) + grid.length) % grid.length][((i % grid[0].length) + grid[0].length) % grid[0].length];
      const s = (v) => v * v * (3 - 2 * v);
      const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return lerp(lerp(a, b, s(xf)), lerp(c, d, s(xf)), s(yf));
    }
    function genMap() {
      const grid = Array.from({ length: 12 }, () => Array.from({ length: 12 }, rnd));
      const grid2 = Array.from({ length: 12 }, () => Array.from({ length: 12 }, rnd));
      land = new Uint8Array(cols * rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const n = valueNoise(x / 7, y / 7, grid) * 0.7 + valueNoise(x / 3, y / 3, grid2) * 0.3;
        land[y * cols + x] = n > 0.69 ? 1 : 0;
      }
    }
    function water(x, y) { return x >= 0 && y >= 0 && x < cols && y < rows && !land[y * cols + x]; }
    function pickWater(xmin, xmax) {
      for (let k = 0; k < 400; k++) {
        const x = (xmin + rnd() * (xmax - xmin)) | 0, y = (rnd() * rows) | 0;
        if (water(x, y)) return { x, y };
      }
      return { x: xmin | 0, y: 0 };
    }
    const h = (a, b) => { const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
    function begin(s, gl) {
      start = s; goal = gl;
      open = [start]; came = new Map(); g = new Map([[start.y * cols + start.x, 0]]); closed = new Set(); explored = [];
      path = null; state = 'search'; timer = 0;
    }
    function reset() {
      genMap();
      const s = pickWater(1, cols * 0.2), gl = pickWater(cols * 0.78, cols - 1);
      ship = { x: s.x, y: s.y, i: 0 };
      begin(s, gl);
    }
    function step() {
      if (!open.length) { state = 'fail'; timer = 0; return; }
      let bi = 0, bf = Infinity;
      for (let i = 0; i < open.length; i++) {
        const o = open[i], f = g.get(o.y * cols + o.x) + h(o, goal) * 1.05;
        if (f < bf) { bf = f; bi = i; }
      }
      const cur = open.splice(bi, 1)[0];
      const ck = cur.y * cols + cur.x;
      if (closed.has(ck)) return;
      closed.add(ck); explored.push({ x: cur.x, y: cur.y, t: 0 });
      if (cur.x === goal.x && cur.y === goal.y) {
        path = [cur]; let k = ck;
        while (came.has(k)) { const p = came.get(k); path.unshift(p); k = p.y * cols + p.x; }
        state = 'path'; timer = 0; ship.i = 0; return;
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cur.x + dx, ny = cur.y + dy;
        if (!water(nx, ny)) continue;
        if (dx && dy && (!water(cur.x + dx, cur.y) || !water(cur.x, cur.y + dy))) continue;
        const nk = ny * cols + nx;
        if (closed.has(nk)) continue;
        const ng = g.get(ck) + (dx && dy ? Math.SQRT2 : 1);
        if (!g.has(nk) || ng < g.get(nk)) { g.set(nk, ng); came.set(nk, cur); open.push({ x: nx, y: ny }); }
      }
    }
    return {
      setup(w, hh) {
        W = w; H = hh; cs = Math.max(10, Math.round(Math.min(W, H) / 26));
        cols = Math.floor(W / cs); rows = Math.floor(H / cs);
        reset();
      },
      click(x, y) {
        const cx = Math.floor(x / cs), cy = Math.floor(y / cs);
        if (!water(cx, cy)) return;
        const s = { x: Math.round(ship.x), y: Math.round(ship.y) };
        begin(water(s.x, s.y) ? s : start, { x: cx, y: cy });
      },
      frame(t, dt) {
        ctx.clearRect(0, 0, W, H);
        const ox = (W - cols * cs) / 2, oy = (H - rows * cs) / 2;
        ctx.save(); ctx.translate(ox, oy);
        // sea shimmer + land
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          if (land[y * cols + x]) {
            ctx.fillStyle = 'rgba(238,241,238,0.09)';
            ctx.fillRect(x * cs + 1.5, y * cs + 1.5, cs - 3, cs - 3);
          } else {
            const s = Math.sin(x * 0.5 + y * 0.3 + t * 1.5) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(63,224,197,${0.03 + s * 0.04})`;
            ctx.fillRect(x * cs + cs / 2 - 1, y * cs + cs / 2 - 1, 2, 2);
          }
        }
        if (state === 'search') { const n = reduced ? 40 : 6; for (let i = 0; i < n && state === 'search'; i++) step(); }
        // explored
        explored.forEach((e) => {
          e.t = Math.min(1, e.t + dt * 2.5);
          ctx.fillStyle = acc(0.06 + (1 - e.t) * 0.35);
          ctx.fillRect(e.x * cs + 2, e.y * cs + 2, cs - 4, cs - 4);
        });
        // frontier
        if (state === 'search') open.forEach((o) => { ctx.strokeStyle = acc(0.5); ctx.strokeRect(o.x * cs + 3, o.y * cs + 3, cs - 6, cs - 6); });
        // path
        if (path) {
          timer += dt;
          const shown = state === 'path' ? Math.min(path.length, Math.floor(timer * 60)) : path.length;
          ctx.strokeStyle = ACC; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.shadowColor = ACC; ctx.shadowBlur = 10;
          ctx.beginPath();
          for (let i = 0; i < shown; i++) { const p = path[i]; const px = p.x * cs + cs / 2, py = p.y * cs + cs / 2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
          ctx.stroke(); ctx.shadowBlur = 0;
          if (state === 'path' && shown >= path.length) { state = 'sail'; timer = 0; }
          if (state === 'sail' || state === 'done') {
            ship.i = Math.min(path.length - 1, ship.i + dt * 9);
            const i0 = Math.floor(ship.i), i1 = Math.min(path.length - 1, i0 + 1), f = ship.i - i0;
            ship.x = lerp(path[i0].x, path[i1].x, f); ship.y = lerp(path[i0].y, path[i1].y, f);
            if (ship.i >= path.length - 1 && state === 'sail') { state = 'done'; timer = 0; }
          }
        }
        if (state === 'done' || state === 'fail') { timer += dt; if (timer > 2.2) reset(); }
        // markers
        const sx = start.x * cs + cs / 2, sy = start.y * cs + cs / 2, gx = goal.x * cs + cs / 2, gy = goal.y * cs + cs / 2;
        ctx.strokeStyle = ink(0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, cs * 0.45, 0, 7); ctx.stroke();
        ctx.strokeStyle = VIO; ctx.beginPath(); ctx.arc(gx, gy, cs * 0.45 + Math.sin(t * 5) * 2, 0, 7); ctx.stroke();
        ctx.fillStyle = VIO; ctx.beginPath(); ctx.arc(gx, gy, 3, 0, 7); ctx.fill();
        // ship
        const shx = ship.x * cs + cs / 2, shy = ship.y * cs + cs / 2;
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(shx, shy, cs * 0.3, 0, 7); ctx.fill();
        ctx.restore();
        const cost = path ? path.length : explored.length;
        label(ctx, state === 'search' ? `A* expanding · nodes ${explored.length}` : path ? `route found · ${cost} hops · ${explored.length} expanded` : 'no route — regenerating', 16, H - 18, ink(0.45), 10);
      }
    };
  }

  /* ---------------- 4 · diffusion denoise → YOLO detect (Synthetic data) ---------------- */
  function diffusion(ctx, P) {
    let W, H, cs, cols, rows, targets = [], cur = 0, vals, noise, t0 = 0, bbox;
    const names = [['car', 0.94], ['person', 0.91], ['traffic sign', 0.96]];
    function makeMask(kind) {
      const c = document.createElement('canvas'); c.width = cols; c.height = rows;
      const x = c.getContext('2d'); x.fillStyle = '#fff';
      const u = Math.min(cols, rows * 1.4);
      const cx = cols / 2, cy = rows / 2;
      if (kind === 0) {
        x.beginPath(); x.roundRect ? x.roundRect(cx - u * 0.42, cy - u * 0.02, u * 0.84, u * 0.2, u * 0.05) : x.rect(cx - u * 0.42, cy, u * 0.84, u * 0.2); x.fill();
        x.beginPath(); x.moveTo(cx - u * 0.24, cy); x.lineTo(cx - u * 0.12, cy - u * 0.17); x.lineTo(cx + u * 0.16, cy - u * 0.17); x.lineTo(cx + u * 0.27, cy); x.fill();
        x.beginPath(); x.arc(cx - u * 0.24, cy + u * 0.2, u * 0.08, 0, 7); x.arc(cx + u * 0.24, cy + u * 0.2, u * 0.08, 0, 7); x.fill();
      } else if (kind === 1) {
        x.beginPath(); x.arc(cx, cy - u * 0.24, u * 0.08, 0, 7); x.fill();
        x.fillRect(cx - u * 0.09, cy - u * 0.14, u * 0.18, u * 0.26);
        x.fillRect(cx - u * 0.08, cy + u * 0.12, u * 0.06, u * 0.22); x.fillRect(cx + u * 0.02, cy + u * 0.12, u * 0.06, u * 0.22);
        x.fillRect(cx - u * 0.15, cy - u * 0.13, u * 0.05, u * 0.2); x.fillRect(cx + u * 0.1, cy - u * 0.13, u * 0.05, u * 0.2);
      } else {
        x.beginPath(); x.moveTo(cx, cy - u * 0.3); x.lineTo(cx + u * 0.27, cy + u * 0.17); x.lineTo(cx - u * 0.27, cy + u * 0.17); x.closePath(); x.fill();
        x.fillRect(cx - u * 0.025, cy + u * 0.17, u * 0.05, u * 0.2);
      }
      const d = x.getImageData(0, 0, cols, rows).data;
      const m = new Float32Array(cols * rows);
      let minx = cols, miny = rows, maxx = 0, maxy = 0;
      for (let i = 0; i < m.length; i++) {
        m[i] = d[i * 4 + 3] / 255;
        if (m[i] > 0.4) { const xx = i % cols, yy = (i / cols) | 0; minx = Math.min(minx, xx); maxx = Math.max(maxx, xx); miny = Math.min(miny, yy); maxy = Math.max(maxy, yy); }
      }
      return { m, box: [minx, miny, maxx + 1, maxy + 1] };
    }
    return {
      setup(w, h) {
        W = w; H = h; cs = Math.max(6, Math.round(Math.min(W, H) / 36));
        cols = Math.floor(W / cs); rows = Math.floor(H / cs);
        targets = [0, 1, 2].map(makeMask);
        vals = new Float32Array(cols * rows); noise = new Float32Array(cols * rows).map(rnd);
        t0 = performance.now() / 1000;
      },
      frame(t, dt) {
        ctx.clearRect(0, 0, W, H);
        const el = t - t0, D = 3.6, HOLD = 2.2;
        if (el > D + HOLD) { t0 = t; cur = (cur + 1) % targets.length; }
        const prog = clamp(el / D, 0, 1), a = Math.pow(prog, 1.6);
        const T = targets[cur].m;
        const ox = (W - cols * cs) / 2, oy = (H - rows * cs) / 2;
        const step = Math.floor(prog * 50);
        for (let i = 0; i < vals.length; i++) {
          if (rnd() < 0.25) noise[i] = rnd();
          const x = i % cols, y = (i / cols) | 0;
          let local = 0;
          if (P.in) { const d = Math.hypot(ox + x * cs - P.x, oy + y * cs - P.y); local = clamp(1 - d / 70, 0, 1); }
          const aa = a * (1 - local);
          vals[i] = lerp(noise[i] * 0.85, T[i], aa);
          const v = vals[i];
          if (v < 0.06) continue;
          const on = T[i] > 0.5 && aa > 0.6;
          ctx.fillStyle = on ? acc(0.25 + v * 0.75) : ink(v * 0.3);
          const s = cs - 2.5;
          ctx.fillRect(ox + x * cs, oy + y * cs, s, s);
        }
        if (prog >= 1) {
          const [x0, y0, x1, y1] = targets[cur].box;
          const k = clamp((el - D) / 0.4, 0, 1);
          const bx = ox + x0 * cs - 6, by = oy + y0 * cs - 6, bw = (x1 - x0) * cs + 12, bh = (y1 - y0) * cs + 12;
          ctx.strokeStyle = VIO; ctx.lineWidth = 2;
          ctx.strokeRect(bx + bw / 2 * (1 - k), by + bh / 2 * (1 - k), bw * k, bh * k);
          if (k >= 1) {
            const [nm, conf] = names[cur];
            const txt = nm;
            ctx.font = `11px ${MONO}`; const tw = ctx.measureText(txt).width + 12;
            ctx.fillStyle = VIO; ctx.fillRect(bx - 1, by - 20, tw, 20);
            label(ctx, txt, bx + 5, by - 10, '#0b0b10', 11);
          }
        }
        label(ctx, prog < 1 ? `diffusion · denoise step ${String(step).padStart(2, '0')}/50` : 'YOLOv8 · detection on synthetic sample', 16, H - 18, ink(0.45), 10);
      }
    };
  }

  /* ---------------- 5 · AI pair-programmer (Online IDE) ---------------- */
  function ide(ctx, P) {
    const code = [
      'from fastapi import FastAPI',
      'from agents import Planner, Coder',
      '',
      'app = FastAPI()',
      '',
      '@app.post("/run")',
      'async def run(task: str):',
      '    plan = await Planner().think(task)',
      '    return await Coder().act(plan)'
    ];
    const typedUntil = 7; // lines typed by "human"; rest suggested by AI
    const term = ['$ uvicorn main:app --reload', 'INFO  Uvicorn running on http://127.0.0.1:8000', 'INFO  Gemini assist · 2 lines accepted', 'POST /run  200 OK'];
    let W, H, t0 = 0, fs;
    const KW = /\b(from|import|async|def|await|return)\b/g;
    function drawLine(txt, x, y, ghost) {
      ctx.font = `${fs}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      if (ghost) { ctx.fillStyle = ink(0.28); ctx.fillText(txt, x, y); return; }
      // tokenise: strings, decorators, keywords, rest
      const parts = [];
      let rest = txt;
      const re = /("[^"]*"?)|(@\w+(\.\w+)*)|\b(from|import|async|def|await|return)\b|(\w+)(?=\()/g;
      let m, last = 0;
      while ((m = re.exec(txt))) {
        if (m.index > last) parts.push([txt.slice(last, m.index), ink(0.85)]);
        const col = m[1] ? ACC : m[2] ? VIO : m[4] ? '#ff8f6b' : '#7fd4ff';
        parts.push([m[0], col]); last = m.index + m[0].length;
      }
      if (last < txt.length) parts.push([txt.slice(last), ink(0.85)]);
      let cx = x;
      parts.forEach(([s, c]) => { ctx.fillStyle = c; ctx.fillText(s, cx, y); cx += ctx.measureText(s).width; });
      return cx;
    }
    return {
      setup(w, h) { W = w; H = h; fs = clamp(Math.round(W / 46), 10, 15); t0 = performance.now() / 1000; },
      click() { t0 = performance.now() / 1000; },
      frame(t) {
        ctx.clearRect(0, 0, W, H);
        const el = t - t0;
        const Y0 = 50, pad = 18, top = Y0 + 46, lh = fs * 1.75;
        // window chrome
        ctx.fillStyle = 'rgba(7,9,11,0.6)'; ctx.fillRect(0, Y0, W, 34);
        ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(pad + i * 16, Y0 + 17, 4.5, 0, 7); ctx.fill(); });
        ctx.fillStyle = 'rgba(238,241,238,0.06)'; ctx.fillRect(86, Y0 + 6, 96, 28);
        label(ctx, 'main.py', 100, Y0 + 20, ink(0.8), 11);
        label(ctx, 'agents.py', 200, Y0 + 20, ink(0.35), 11);
        // typing
        const cps = 26;
        let budget = Math.floor(el * cps);
        let curLine = 0, curCol = 0, doneTyping = false;
        const typedChars = code.slice(0, typedUntil).reduce((s, l) => s + l.length + 1, 0);
        const termH = H * 0.3, codeBottom = H - termH;
        for (let i = 0; i < code.length; i++) {
          const y = top + i * lh + lh / 2;
          if (y > codeBottom - 8) break;
          label(ctx, String(i + 1).padStart(2, ' '), pad, y, ink(0.2), fs - 1);
          const x = pad + fs * 2.4;
          if (i < typedUntil) {
            const n = Math.min(code[i].length, Math.max(0, budget));
            budget -= code[i].length + 1;
            if (n > 0) drawLine(code[i].slice(0, n), x, y);
            if (n < code[i].length && budget < 0 && budget > -code[i].length - 2) { curLine = i; curCol = n; }
          } else {
            const sinceTyped = el - typedChars / cps;
            if (sinceTyped > 0.4 && sinceTyped < 1.9) drawLine(code[i], x, y, true);
            if (sinceTyped >= 1.9) drawLine(code[i], x, y);
            if (i === typedUntil && sinceTyped > 0.4 && sinceTyped < 1.9) {
              ctx.font = `10px ${MONO}`; const tx = 'Tab ⇥ accept · Gemini';
              const wv = ctx.measureText(tx).width + 14;
              ctx.fillStyle = acc(0.14); ctx.fillRect(W - wv - 16, y - 11, wv, 22);
              label(ctx, tx, W - wv - 9, y, ACC, 10);
            }
            if (sinceTyped < 0.4) { curLine = typedUntil - 1; curCol = code[typedUntil - 1].length; }
            else doneTyping = true;
          }
        }
        // caret
        if (!doneTyping && Math.floor(t * 2.4) % 2 === 0) {
          ctx.font = `${fs}px ${MONO}`;
          const cx = pad + fs * 2.4 + ctx.measureText(code[curLine].slice(0, curCol)).width;
          ctx.fillStyle = ACC; ctx.fillRect(cx + 1, top + curLine * lh + lh / 2 - fs * 0.6, 2, fs * 1.2);
        }
        // terminal
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, codeBottom, W, termH);
        ctx.strokeStyle = ink(0.08); ctx.beginPath(); ctx.moveTo(0, codeBottom); ctx.lineTo(W, codeBottom); ctx.stroke();
        label(ctx, 'TERMINAL', pad, codeBottom + 16, ink(0.35), 9);
        const tStart = typedChars / cps + 2.3;
        term.forEach((ln, i) => {
          if (el > tStart + i * 0.6) label(ctx, ln, pad, codeBottom + 38 + i * (fs + 6), i === 0 ? INK : i === 2 ? ACC : ink(0.55), fs - 2);
        });
        if (el > tStart + term.length * 0.6 + 3) t0 = t;
      }
    };
  }

  /* ---------------- 6 · voice → refined English (Messaging Assistant) ---------------- */
  function voice(ctx, P) {
    const ex = [
      { lang: 'Hindi', src: 'kal subah milte hai, late mat karna', out: "Let's meet tomorrow morning — please don't be late." },
      { lang: 'Telugu', src: 'nenu vasthunna, five minutes lo', out: "I'm on my way — I'll be there in five minutes." },
      { lang: 'Kannada', src: 'oota aytha? free aadmele call maadu', out: "Have you eaten? Call me when you're free." },
      { lang: 'Spanish', src: '¿nos vemos en la oficina a las 6?', out: 'Shall we meet at the office at 6?' }
    ];
    const glyphs = 'abcdefghijklmnopqrstuvwxyz—·';
    let W, H, t0 = 0, idx = 0, bars = new Float32Array(48);
    function wrap(txt, maxW) {
      const words = txt.split(' '), lines = []; let line = '';
      words.forEach((w) => { const tst = line ? line + ' ' + w : w; if (ctx.measureText(tst).width > maxW && line) { lines.push(line); line = w; } else line = tst; });
      if (line) lines.push(line);
      return lines;
    }
    return {
      setup(w, h) { W = w; H = h; t0 = performance.now() / 1000; },
      frame(t, dt) {
        ctx.clearRect(0, 0, W, H);
        const e = ex[idx], el = t - t0;
        const LISTEN = 1.8, TRANS = LISTEN + e.src.length / 22, REFINE = TRANS + 1.6, HOLD = REFINE + 2.2;
        if (el > HOLD) { t0 = t; idx = (idx + 1) % ex.length; }
        // waveform
        const listening = el < TRANS;
        const near = P.in ? clamp(1 - Math.hypot(P.x - W / 2, P.y - H * 0.25) / (W * 0.6), 0, 1) : 0;
        const n = bars.length, bw = Math.min(8, (W * 0.7) / n - 3), total = n * (bw + 3), sx = (W - total) / 2, cy = H * 0.24;
        for (let i = 0; i < n; i++) {
          const target = listening ? (0.15 + Math.abs(Math.sin(t * 7 + i * 0.55) * Math.sin(t * 2.3 + i * 0.21)) * (0.6 + near * 0.9)) : 0.06 + near * 0.2;
          bars[i] = lerp(bars[i], target, 0.25);
          const bh = Math.max(3, bars[i] * H * 0.22);
          ctx.fillStyle = listening ? acc(0.5 + bars[i] * 0.5) : ink(0.25);
          ctx.fillRect(sx + i * (bw + 3), cy - bh / 2, bw, bh);
        }
        label(ctx, listening ? `● listening · ${e.lang}` : '✓ captured', W / 2, cy + H * 0.15, listening ? '#ff6b6b' : ink(0.45), 10, 'center');
        // transcript bubble (source)
        const maxW = Math.min(W - 64, 520);
        ctx.font = `${clamp(W / 34, 12, 16)}px ${SANS}`;
        const srcN = clamp(Math.floor((el - LISTEN + 0.3) * 22), 0, e.src.length);
        const by = H * 0.52;
        if (srcN > 0) {
          const lines = wrap(e.src.slice(0, srcN), maxW - 28);
          ctx.fillStyle = 'rgba(238,241,238,0.06)'; ctx.strokeStyle = ink(0.1);
          const bh = lines.length * 22 + 20;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(32, by, maxW, bh, 14) : ctx.rect(32, by, maxW, bh); ctx.fill(); ctx.stroke();
          ctx.fillStyle = ink(0.6); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          lines.forEach((l, i) => ctx.fillText(l, 46, by + 20 + i * 22));
        }
        // refined output (scramble into place)
        if (el > TRANS) {
          const k = clamp((el - TRANS) / (REFINE - TRANS), 0, 1);
          const reveal = Math.floor(k * e.out.length);
          let s = '';
          for (let i = 0; i < e.out.length; i++) s += i < reveal || e.out[i] === ' ' ? e.out[i] : glyphs[(Math.random() * glyphs.length) | 0];
          ctx.font = `500 ${clamp(W / 30, 13, 18)}px ${SANS}`;
          const lines = wrap(s, maxW - 28);
          const oy = H * 0.74, bh = lines.length * 24 + 22;
          const ox = W - 32 - maxW;
          ctx.fillStyle = acc(0.92);
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(ox, oy, maxW, bh, 14) : ctx.rect(ox, oy, maxW, bh); ctx.fill();
          ctx.fillStyle = '#0b0c05'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          lines.forEach((l, i) => ctx.fillText(l, ox + 14, oy + 22 + i * 24));
          if (k >= 1) label(ctx, 'sent to WhatsApp ✓✓', W - 32, oy + bh + 14, ink(0.45), 10, 'right');
        }
      }
    };
  }

  /* ---------------- 7 · class rebalancing (Image Data Balancing) ---------------- */
  function balance(ctx, P) {
    const classes = ['car', 'person', 'truck', 'bike', 'bus', 'sign'];
    const start = [1, 0.66, 0.2, 0.09, 0.07, 0.13];
    let W, H, t0 = 0, cur = start.slice(), flyers = [];
    return {
      setup(w, h) { W = w; H = h; t0 = performance.now() / 1000; cur = start.slice(); flyers = []; },
      click() { t0 = performance.now() / 1000; cur = start.slice(); flyers = []; },
      frame(t, dt) {
        ctx.clearRect(0, 0, W, H);
        const el = t - t0;
        const DETECT = 1.4, BAL = 4.6, HOLD = 7;
        if (el > HOLD + 1) { t0 = t; cur = start.slice(); flyers = []; }
        const target = 0.55;
        const k = clamp((el - DETECT) / (BAL - DETECT), 0, 1), ek = ease(k);
        const n = classes.length, left = W * 0.1, right = W * 0.9, base = H * 0.78, maxH = H * 0.56;
        const slot = (right - left) / n, bw = slot * 0.52;
        for (let i = 0; i < n; i++) cur[i] = lerp(start[i], target, ek);
        // target line
        if (el > DETECT * 0.6) {
          const ty = base - target * maxH;
          ctx.setLineDash([4, 6]); ctx.strokeStyle = acc(0.5); ctx.beginPath(); ctx.moveTo(left - 10, ty); ctx.lineTo(right, ty); ctx.stroke(); ctx.setLineDash([]);
          label(ctx, 'balanced target', right, ty - 12, acc(0.8), 10, 'right');
        }
        // spawn flyers during balancing
        if (k > 0 && k < 1 && rnd() < 0.6) {
          const to = 2 + ((rnd() * 4) | 0);
          flyers.push({ x: left + slot * (rnd() < 0.5 ? 0.5 : 1.5), y: base - start[0] * maxH * 0.6, tx: left + slot * (to + 0.5) + (rnd() - 0.5) * bw * 0.6, ty: base - cur[to] * maxH, p: 0 });
        }
        flyers = flyers.filter((f) => {
          f.p += dt * 1.6; if (f.p >= 1) return false;
          const e = ease(f.p);
          const x = lerp(f.x, f.tx, e), y = lerp(f.y, f.ty, e) - Math.sin(e * Math.PI) * H * 0.18;
          ctx.fillStyle = VIO; ctx.fillRect(x - 3, y - 3, 6, 6);
          return true;
        });
        for (let i = 0; i < n; i++) {
          const x = left + slot * i + (slot - bw) / 2, h = cur[i] * maxH;
          const over = start[i] > target + 0.1 && el > DETECT * 0.6 && k < 1;
          const under = start[i] < target - 0.1;
          ctx.fillStyle = over ? 'rgba(255,107,107,0.75)' : under && k > 0 ? acc(0.35 + ek * 0.6) : ink(0.45);
          ctx.fillRect(x, base - h, bw, h);
          if (under && k > 0) { ctx.fillStyle = acc(0.9); ctx.fillRect(x, base - start[i] * maxH, bw, 2); }
          label(ctx, classes[i], x + bw / 2, base + 16, ink(0.6), 10, 'center');
        }
        ctx.strokeStyle = ink(0.2); ctx.beginPath(); ctx.moveTo(left - 10, base); ctx.lineTo(right, base); ctx.stroke();
        const ratio = Math.max(...cur) / Math.min(...cur);
        const phase = el < DETECT ? 'scanning class distribution' : k < 1 ? 'augmenting minority · undersampling majority' : 'balanced · ready for YOLOv8';
        label(ctx, `imbalance ${ratio.toFixed(1)}×`, 16, 54, ratio < 1.2 ? ACC : INK, 13);
        label(ctx, phase, 16, H - 18, ink(0.45), 10);
      }
    };
  }

  /* ---------------- 8 · empty room → designed (Room Interior Designer) ---------------- */
  function room(ctx, P) {
    let W, H, split = 0.5;
    function geom() {
      const bx0 = W * 0.27, by0 = H * 0.22, bx1 = W * 0.73, by1 = H * 0.68;
      return { bx0, by0, bx1, by1 };
    }
    function wire(g, a) {
      ctx.strokeStyle = ink(a); ctx.lineWidth = 1;
      ctx.strokeRect(g.bx0, g.by0, g.bx1 - g.bx0, g.by1 - g.by0);
      [[0, 0, g.bx0, g.by0], [W, 0, g.bx1, g.by0], [0, H, g.bx0, g.by1], [W, H, g.bx1, g.by1]].forEach(([x0, y0, x1, y1]) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); });
      // window on left wall
      ctx.beginPath(); ctx.moveTo(W * 0.08, H * 0.22); ctx.lineTo(W * 0.2, H * 0.28); ctx.lineTo(W * 0.2, H * 0.52); ctx.lineTo(W * 0.08, H * 0.56); ctx.closePath(); ctx.stroke();
      // floor grid
      for (let i = 1; i < 6; i++) { const f = i / 6; ctx.beginPath(); ctx.moveTo(lerp(g.bx0, 0, f), lerp(g.by1, H, f)); ctx.lineTo(lerp(g.bx1, W, f), lerp(g.by1, H, f)); ctx.stroke(); }
    }
    function designed(g) {
      // walls
      ctx.fillStyle = '#1a1916'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#26231e'; ctx.fillRect(g.bx0, g.by0, g.bx1 - g.bx0, g.by1 - g.by0);
      // floor
      ctx.fillStyle = '#3a2c20'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(g.bx0, g.by1); ctx.lineTo(g.bx1, g.by1); ctx.lineTo(W, H); ctx.fill();
      // window glow
      const wg = ctx.createLinearGradient(W * 0.08, 0, W * 0.2, 0); wg.addColorStop(0, '#f6e7b8'); wg.addColorStop(1, '#c9b27a');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(W * 0.08, H * 0.22); ctx.lineTo(W * 0.2, H * 0.28); ctx.lineTo(W * 0.2, H * 0.52); ctx.lineTo(W * 0.08, H * 0.56); ctx.fill();
      ctx.fillStyle = 'rgba(246,231,184,0.08)'; ctx.beginPath(); ctx.moveTo(W * 0.2, H * 0.52); ctx.lineTo(W * 0.08, H * 0.56); ctx.lineTo(W * 0.35, H); ctx.lineTo(W * 0.62, H); ctx.fill();
      // rug
      ctx.fillStyle = '#5b4a7a'; ctx.beginPath(); ctx.moveTo(W * 0.3, H * 0.76); ctx.lineTo(W * 0.7, H * 0.76); ctx.lineTo(W * 0.8, H * 0.92); ctx.lineTo(W * 0.2, H * 0.92); ctx.fill();
      // art frame
      ctx.fillStyle = '#c8f542'; ctx.fillRect(W * 0.43, H * 0.29, W * 0.14, H * 0.13);
      ctx.fillStyle = '#26231e'; ctx.fillRect(W * 0.445, H * 0.305, W * 0.11, H * 0.1);
      ctx.fillStyle = '#3fe0c5'; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.355, H * 0.03, 0, 7); ctx.fill();
      // sofa
      ctx.fillStyle = '#c8b9a6'; ctx.fillRect(W * 0.34, H * 0.55, W * 0.32, H * 0.1);
      ctx.fillStyle = '#b3a38f'; ctx.fillRect(W * 0.32, H * 0.6, W * 0.36, H * 0.12);
      ctx.fillStyle = '#e8dccb'; ctx.fillRect(W * 0.36, H * 0.6, W * 0.13, H * 0.05); ctx.fillRect(W * 0.51, H * 0.6, W * 0.13, H * 0.05);
      // lamp
      ctx.fillStyle = '#e9e2d3'; ctx.fillRect(W * 0.735, H * 0.42, 2, H * 0.32);
      ctx.fillStyle = '#f4d58d'; ctx.beginPath(); ctx.moveTo(W * 0.715, H * 0.42); ctx.lineTo(W * 0.765, H * 0.42); ctx.lineTo(W * 0.755, H * 0.36); ctx.lineTo(W * 0.725, H * 0.36); ctx.fill();
      const lg = ctx.createRadialGradient(W * 0.74, H * 0.42, 0, W * 0.74, H * 0.42, W * 0.18); lg.addColorStop(0, 'rgba(244,213,141,0.28)'); lg.addColorStop(1, 'rgba(244,213,141,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      // plant
      ctx.fillStyle = '#6b4f3a'; ctx.fillRect(W * 0.23, H * 0.66, W * 0.05, H * 0.08);
      ctx.fillStyle = '#4f7a4a';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(W * 0.255 + Math.cos(i) * W * 0.025, H * 0.6 - i * H * 0.012, W * 0.018, H * 0.05, i * 0.6 - 1.5, 0, 7); ctx.fill(); }
      // shelf
      ctx.fillStyle = '#4a3a2c'; ctx.fillRect(W * 0.6, H * 0.25, W * 0.1, 4); ctx.fillRect(W * 0.6, H * 0.33, W * 0.1, 4);
      ctx.fillStyle = '#3fe0c5'; ctx.fillRect(W * 0.61, H * 0.22, 6, H * 0.03); ctx.fillStyle = '#c8f542'; ctx.fillRect(W * 0.625, H * 0.215, 6, H * 0.035);
    }
    return {
      setup(w, h) { W = w; H = h; },
      frame(t) {
        ctx.clearRect(0, 0, W, H);
        const target = P.in ? P.x / W : 0.5 + Math.sin(t * 0.55) * 0.42;
        split = lerp(split, clamp(target, 0, 1), 0.12);
        const g = geom(), sx = split * W;
        // left: designed
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, sx, H); ctx.clip(); designed(g); ctx.restore();
        // right: empty wireframe
        ctx.save(); ctx.beginPath(); ctx.rect(sx, 0, W - sx, H); ctx.clip(); wire(g, 0.35);
        // controlnet edge scan
        const scan = (t * 0.35) % 1;
        ctx.strokeStyle = acc(0.6); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(lerp(g.bx0, 0, scan), lerp(g.by1, H, scan)); ctx.lineTo(lerp(g.bx1, W, scan), lerp(g.by1, H, scan)); ctx.stroke();
        ctx.restore();
        // divider
        ctx.fillStyle = ACC; ctx.fillRect(sx - 1, 0, 2, H);
        ctx.beginPath(); ctx.arc(sx, H / 2, 16, 0, 7); ctx.fill();
        ctx.fillStyle = '#0b0c05'; ctx.font = `bold 12px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⟷', sx, H / 2 + 1);
        if (sx > 90) label(ctx, 'GENERATED', 16, H - 18, '#f4d58d', 10);
        if (sx < W - 120) label(ctx, 'INPUT · EMPTY ROOM', W - 16, H - 18, ink(0.5), 10, 'right');
      }
    };
  }

  const VIZ = { agents, rag, astar, diffusion, ide, voice, balance, room };

  /* ---------------- runner ---------------- */
  AS.labs = {
    init() {
      const items = [];
      document.querySelectorAll('.proj[data-viz]').forEach((card) => {
        const kind = card.dataset.viz;
        const wrap = card.querySelector('.proj__viz');
        const canvas = wrap.querySelector('canvas');
        if (!VIZ[kind] || !canvas) return;
        const ctx = canvas.getContext('2d');
        const P = { x: 0, y: 0, in: false };
        const viz = VIZ[kind](ctx, P);
        const item = { canvas, ctx, viz, P, visible: false, W: 0, H: 0, ready: false };
        function resize() {
          const r = canvas.getBoundingClientRect();
          if (r.width < 10 || r.height < 10) return;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          item.W = r.width; item.H = r.height;
          viz.setup(r.width, r.height);
          item.ready = true;
        }
        item.resize = resize;
        new ResizeObserver(resize).observe(canvas);
        const io = new IntersectionObserver((es) => es.forEach((e) => { item.visible = e.isIntersecting; if (e.isIntersecting && !item.ready) resize(); }), { rootMargin: '100px' });
        io.observe(canvas);
        const pos = (e) => { const r = canvas.getBoundingClientRect(); P.x = e.clientX - r.left; P.y = e.clientY - r.top; };
        canvas.addEventListener('pointermove', (e) => { pos(e); P.in = true; });
        canvas.addEventListener('pointerenter', (e) => { pos(e); P.in = true; });
        canvas.addEventListener('pointerleave', () => { P.in = false; });
        canvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') P.in = false; });
        canvas.addEventListener('click', (e) => { pos(e); viz.click && viz.click(P.x, P.y); });
        // spotlight on card
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${e.clientX - r.left}px`);
          card.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
        items.push(item);
      });

      let last = performance.now();
      function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now;
        const t = now / 1000;
        for (const it of items) {
          if (!it.visible || !it.ready) continue;
          try { it.viz.frame(t, dt); } catch (err) { it.visible = false; console.warn('viz error', err); }
        }
      }
      requestAnimationFrame(loop);
      AS.labs.items = items;
    }
  };
})();
