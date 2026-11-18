/* =========================================================
   Background — the dots are data, and the page is the system they flow through.

   OPENING   dots start scattered through deep space, swirl together and
             assemble into a portrait.

   SCROLL    the same dots rebuild into the stage of an AI system that
             matches each section. Every stage animates all the time, the
             scrollbar drives its story forward and turns it, and the change
             between stages is spread across most of a screen of scrolling.

     portrait  hero       — you
     embed     about      — embedding space: new points are pulled into semantic clusters
     flow      founder    — full-stack data flow: requests down client → API → AI → data, responses up
     agents    experience — multi-agent orchestration: tasks out, results back, hand-offs
     surface   lab        — a wave floor under the project cards, rolling with the scroll
     rag       archive    — retrieval: query beam → top-k chunks fly out → answer forms
     nnet      stack      — deep network: activations stream layer to layer, forward-pass wave
     globe     wins       — rotating lat/long globe with a scanning band
     descent   education  — gradient descent: the optimiser spirals to the loss minimum
     hello     contact    — the dots write "hello."

   Transitions rotate between four styles: scan rebuild · radial burst · wave wipe · vortex.
   ========================================================= */
(function () {
  const AS = (window.AS = window.AS || {});
  const api = { ready: false, setShape() {}, burst() {}, setVelocity() {}, reveal() {}, shock() {} };
  AS.particles = api;

  api.init = function () {
    if (!window.THREE) return;
    const canvas = document.getElementById('gl');
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { canvas.remove(); return; }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = () => window.innerWidth < 900;
    const mobile = isMobile();
    const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    renderer.setPixelRatio(DPR);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x07090b, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 9);

    const C_INK = '#eef1ee', C_ACC = '#c8f542', C_ACC2 = '#3fe0c5';
    const TAU = Math.PI * 2;
    const PLANE_Y = -2.7, Z_FAR = -26, Z_RANGE = 30;

    /* ================= backdrop: glow + hairline grid ================= */
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        depthTest: false, depthWrite: false,
        uniforms: {
          uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: DPR },
          uMouse: { value: new THREE.Vector2(0.7, 0.5) }, uGlow: { value: 0 }, uGrid: { value: 0 }, uScrollPx: { value: 0 },
          uA: { value: new THREE.Color(C_ACC) }, uB: { value: new THREE.Color(C_ACC2) }
        },
        vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `
          precision highp float;
          uniform float uTime, uGlow, uGrid, uScrollPx, uDpr; uniform vec2 uRes, uMouse; uniform vec3 uA, uB;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main(){
            vec2 uv = gl_FragCoord.xy / uRes;
            float asp = uRes.x / uRes.y;
            vec2 p = vec2(uv.x * asp, uv.y);
            vec3 col = vec3(0.027, 0.035, 0.043);
            vec2 c1 = vec2(asp * (0.80 + sin(uTime * 0.05) * 0.04), 0.66 + cos(uTime * 0.04) * 0.04);
            vec2 c2 = vec2(asp * (0.10 + cos(uTime * 0.045) * 0.04), 0.12 + sin(uTime * 0.05) * 0.04);
            col += uB * exp(-pow(distance(p, c1) * 1.35, 2.0)) * 0.075 * uGlow;
            col += uA * exp(-pow(distance(p, c2) * 1.55, 2.0)) * 0.040 * uGlow;
            vec2 m = vec2(uMouse.x * asp, uMouse.y);
            col += mix(uB, uA, 0.35) * exp(-distance(p, m) * 3.2) * 0.035;
            vec2 g = gl_FragCoord.xy - vec2(0.0, uScrollPx);
            float cell = 64.0 * uDpr, aa = 1.0 * uDpr;
            vec2 gv = abs(fract(g / cell - 0.5) - 0.5) * cell;
            vec2 gm = abs(fract(g / (cell * 4.0) - 0.5) - 0.5) * cell * 4.0;
            float minor = 1.0 - smoothstep(0.0, aa, min(gv.x, gv.y));
            float major = 1.0 - smoothstep(0.0, aa, min(gm.x, gm.y));
            float spot = exp(-distance(gl_FragCoord.xy, uMouse * uRes) / (300.0 * uDpr));
            float mask = smoothstep(1.1, 0.25, length((uv - 0.5) * vec2(1.0, 1.2)) * 1.4);
            col += vec3(0.86, 0.92, 0.9) * (minor * 0.012 + major * 0.022) * (0.55 + spot * 1.5) * mask * uGrid;
            col *= smoothstep(1.3, 0.3, length((uv - 0.5) * vec2(1.0, 1.15)) * 1.2);
            col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
            gl_FragColor = vec4(col, 1.0);
          }`
      })
    );
    backdrop.frustumCulled = false; backdrop.renderOrder = -1;
    scene.add(backdrop);
    const BU = backdrop.material.uniforms;

    /* ================= formations ================= */
    const COLS = mobile ? 60 : 150, ROWS = mobile ? 56 : 62;
    const COUNT = COLS * ROWS;

    // A formation stores per dot: position · look (alpha, size, tone 0 ink · .5 teal · 1 lime)
    // · signal (−1 none) · aux (formation-specific coordinates its animation needs)
    function blank() {
      return { pos: new Float32Array(COUNT * 3), look: new Float32Array(COUNT * 3), sig: new Float32Array(COUNT).fill(-1), aux: new Float32Array(COUNT * 3), n: 0 };
    }
    function put(f, x, y, z, alpha, size, tone, sig, ax, ay, az) {
      if (f.n >= COUNT) return false;
      const i = f.n++;
      f.pos[i * 3] = x; f.pos[i * 3 + 1] = y; f.pos[i * 3 + 2] = z;
      f.look[i * 3] = alpha; f.look[i * 3 + 1] = size; f.look[i * 3 + 2] = tone;
      f.sig[i] = sig === undefined ? -1 : sig;
      f.aux[i * 3] = ax || 0; f.aux[i * 3 + 1] = ay || 0; f.aux[i * 3 + 2] = az || 0;
      return true;
    }
    function line(f, ax, ay, az, bx, by, bz, n, alpha, size, tone, s0, s1, aux) {
      for (let k = 0; k < n; k++) {
        const t = n > 1 ? k / (n - 1) : 0;
        put(f, ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, alpha, size, tone,
          s0 === undefined ? -1 : s0 + (s1 - s0) * t, aux && aux[0], aux && aux[1], aux && aux[2]);
      }
    }
    function ringOf(f, cx, cy, cz, r, n, alpha, size, tone, sig, aux) {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        put(f, cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz, alpha, size, tone, sig, aux && aux[0], aux && aux[1], aux && aux[2]);
      }
    }
    const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

    let halfW = 3.73 * (window.innerWidth / window.innerHeight);

    const GEN = {
      /* ---- scatter: deep-space starting state */
      scatter() {
        const f = blank(), w = halfW * 1.25;
        for (let i = 0; i < COUNT; i++) {
          const z = -14 + hash(i * 1.3 + 2) * 17;
          const k = (9 - z) / 9;                       // spread wider with depth so the frame stays full
          put(f, (hash(i * 2.1) * 2 - 1) * w * k, (hash(i * 3.7 + 5) * 2 - 1) * 3.9 * k, z,
            0.25 + hash(i * 5.3) * 0.75, 0.024 + hash(i * 7.1) * 0.02, hash(i * 9.7) > 0.86 ? 1 : (hash(i * 9.7) > 0.7 ? 0.5 : 0), hash(i * 11.3));
        }
        return f;
      },

      /* ---- globe: dots on latitude rings, equal spacing, two orbit rings */
      globe() {
        const f = blank(), ringN = mobile ? 200 : 420, globePts = COUNT - ringN * 2;
        const R = Math.floor(Math.sqrt((globePts * Math.PI) / 4)), M = R * 2, rad = 2.1;
        for (let r = 0, i = 0; r < R; r++) {
          const lat = -Math.PI / 2 + ((r + 0.5) / R) * Math.PI;
          const n = Math.max(1, Math.round(M * Math.cos(lat))), off = (r % 2) * 0.5;
          for (let k = 0; k < n && f.n < globePts; k++, i++) {
            const lon = ((k + off) / n) * TAU, node = hash(i) < 0.011;
            put(f, Math.cos(lat) * Math.cos(lon) * rad, Math.sin(lat) * rad, Math.cos(lat) * Math.sin(lon) * rad,
              node ? 0.9 : 1, node ? 0.05 : 0.026, node ? 1 : 0, node ? hash(i + 9) : -1, 0, 0, 0);
          }
        }
        f.n = globePts;
        [{ r: 2.72, tx: 1.18, tz: 0.0 }, { r: 3.12, tx: -0.95, tz: 0.55 }].forEach((rg, ri) => {
          for (let k = 0; k < ringN; k++) {
            const a = (k / ringN) * TAU, x = Math.cos(a) * rg.r, z = Math.sin(a) * rg.r;
            const y1 = -z * Math.sin(rg.tx), z1 = z * Math.cos(rg.tx);
            put(f, x * Math.cos(rg.tz) - y1 * Math.sin(rg.tz), x * Math.sin(rg.tz) + y1 * Math.cos(rg.tz), z1,
              0.4, 0.02, 0.75, (k / ringN + ri * 0.37) % 1, 0, 0, 1);
          }
        });
        return f;
      },

      /* ---- embed: semantic clusters in an embedding space; aux = the cluster centre.
              sig: −1 member · [0,1) a new point being assigned (it flows into its cluster) · [2,3) similarity link */
      embed() {
        const f = blank(), K = 7, C = [];
        for (let k = 0; k < K; k++) {
          const y = 1 - ((k + 0.5) / K) * 2, r = Math.sqrt(1 - y * y), a = k * 2.39996;
          C.push([Math.cos(a) * r * 1.8, y * 1.4, Math.sin(a) * r * 1.8]);
        }
        const links = [];
        C.forEach((a, i) => {
          const d = C.map((b, j) => [Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), j]).filter((x) => x[1] !== i).sort((q, w) => q[0] - w[0]);
          [d[0][1], d[1][1]].forEach((j) => { const key = i < j ? i + '-' + j : j + '-' + i; if (!links.includes(key)) links.push(key); });
        });
        const linkDots = mobile ? 16 : 32;
        links.forEach((key) => {
          const [i, j] = key.split('-').map(Number), a = C[i], b = C[j];
          for (let t = 0; t < linkDots; t++) { const u = t / (linkDots - 1); put(f, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, 0.3, 0.014, 0.5, 2 + u * 0.999, 0, 0, 0); }
        });
        const drift = Math.floor(COUNT * 0.16), members = COUNT - f.n - drift;
        const g = (i, s2) => (hash(i * 3.1 + s2) + hash(i * 5.7 + s2 * 2.3) + hash(i * 7.3 + s2 * 4.1) - 1.5) * 0.4;
        for (let i = 0; i < members; i++) {
          const k = i % K, c = C[k];
          put(f, c[0] + g(i, 1), c[1] + g(i, 2), c[2] + g(i, 3), 0.8, 0.02, k === 2 ? 1 : (k % 3 === 0 ? 0.5 : 0.05), -1, c[0], c[1], c[2]);
        }
        for (let i = 0; f.n < COUNT; i++) {
          const c = C[i % K], th = hash(i * 1.7) * TAU, ph = Math.acos(2 * hash(i * 2.9) - 1), r = 2.3 + hash(i * 4.1) * 0.9;
          put(f, Math.sin(ph) * Math.cos(th) * r, Math.cos(ph) * r * 0.8, Math.sin(ph) * Math.sin(th) * r, 0.95, 0.022, 0.5, hash(i * 6.3) * 0.999, c[0], c[1], c[2]);
        }
        return f;
      },

      /* ---- flow: four layers of the product (client · API · AI/workers · data); packets stream through them.
              plates: sig −1 · requests (down): sig [0,1) · responses (up): sig [2,3) */
      flow() {
        const f = blank(), side = 2.7, ys = [1.5, 0.5, -0.5, -1.5], border = mobile ? 24 : 56, g = mobile ? 8 : 17;
        ys.forEach((y, pi) => {
          [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]].forEach(([ax, az, bx, bz]) =>
            line(f, ax * side / 2, y, az * side / 2, bx * side / 2, y, bz * side / 2, border, 0.9, 0.022, 0.5, undefined, undefined, [pi / 3, 0, 0]));
          for (let r = 0; r < g; r++) for (let c = 0; c < g; c++)
            put(f, (c / (g - 1) - 0.5) * side * 0.9, y, (r / (g - 1) - 0.5) * side * 0.9, 0.24, 0.015, 0.1, -1, pi / 3, 0, 0);
        });
        const trail = mobile ? 9 : 15, lanes = Math.floor((COUNT - f.n) / trail);
        for (let l = 0; l < lanes; l++) {
          const x = (hash(l * 3.3) - 0.5) * side * 0.82, z = (hash(l * 7.7) - 0.5) * side * 0.82, up = l % 3 === 0, ph = hash(l * 11.1);
          for (let j = 0; j < trail; j++)
            put(f, x, 0, z, 0.95 * (1 - j / trail), 0.025 - j * 0.0009, up ? 0.5 : 0.92, (up ? 2 : 0) + (((ph - j * 0.005) % 1) + 1) % 1 * 0.999, 0, 0, 0);
        }
        while (f.n < COUNT) put(f, 0, 0, 0, 0, 0.01, 0, -1, 0, 0, 0);
        return f;
      },

      /* ---- agents: an orchestrator, six orbiting agents, and the traffic between them.
              aux = (agent k | −1 orchestrator, role 0 body · 1 orbit path · 2 message · 3 spare, direction 0 task · 1 result · 2 hand-off) */
      agents() {
        const f = blank(), K = 6;
        const fib = (n, r, cb) => { const gg = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - ((i + 0.5) / n) * 2, rr = Math.sqrt(1 - y * y), a = i * gg; cb(Math.cos(a) * rr * r, y * r, Math.sin(a) * rr * r); } };
        const coreN = mobile ? 240 : 650, agentN = mobile ? 60 : 170, orbitN = mobile ? 110 : 340;
        fib(coreN, 0.5, (x, y, z) => put(f, x, y, z, 0.95, 0.022, 0.92, -1, -1, 0, 0));
        for (let k = 0; k < K; k++) fib(agentN, 0.21, (x, y, z) => put(f, x, y, z, 1, 0.022, k % 2 ? 0.5 : 0.08, -1, k, 0, 0));
        for (let i = 0; i < orbitN; i++) { const a = (i / orbitN) * TAU; put(f, Math.cos(a) * 2.15, Math.sin(a * 2) * 0.25, Math.sin(a) * 2.15, 0.28, 0.013, 0.3, -1, -1, 1, 0); }
        const trail = mobile ? 6 : 9, streams = Math.floor((COUNT - f.n) / trail);
        for (let st = 0; st < streams; st++) {
          const k = st % K, dir = st % 5 === 4 ? 2 : st % 2, ph = hash(st * 5.13);
          for (let j = 0; j < trail; j++)
            put(f, 0, 0, 0, 0.95 * (1 - j / trail), 0.022 - j * 0.0011, dir === 1 ? 0.5 : 1, (((ph - j * 0.006) % 1) + 1) % 1, k, 2, dir);
        }
        while (f.n < COUNT) put(f, 0, 0, 0, 0, 0.01, 0, -1, -1, 3, 0);
        return f;
      },

      /* ---- rag: a knowledge sphere of chunks, a query beam, the top-k chunks flying out to form the answer.
              aux = (role 0 chunk · 1 top-k chunk · 2 query beam · 3 answer ring, param, 0) */
      rag() {
        const f = blank(), Rs = 1.55, cx = 0.75, beamN = mobile ? 110 : 300, ringN = mobile ? 60 : 140, docN = COUNT - beamN - ringN;
        const gg = Math.PI * (3 - Math.sqrt(5));
        let qd = [-0.86, 0.32, 0.4]; const ql = Math.hypot(...qd); qd = qd.map((v) => v / ql);
        for (let i = 0; i < docN; i++) {
          const y = 1 - ((i + 0.5) / docN) * 2, r = Math.sqrt(1 - y * y), a = i * gg, x = Math.cos(a) * r, z = Math.sin(a) * r;
          const hit = x * qd[0] + y * qd[1] + z * qd[2] > 0.935;
          put(f, cx + x * Rs, y * Rs, z * Rs, hit ? 1 : 0.5, hit ? 0.025 : 0.018, hit ? 0.5 : 0.05, hash(i * 1.3), hit ? 1 : 0, 0, 0);
        }
        const entry = [cx + qd[0] * Rs * 1.02, qd[1] * Rs * 1.02, qd[2] * Rs * 1.02], src = [-3.7, -0.7, 0.3];
        for (let i = 0; i < beamN; i++) { const u = i / (beamN - 1); put(f, src[0] + (entry[0] - src[0]) * u, src[1] + (entry[1] - src[1]) * u, src[2] + (entry[2] - src[2]) * u, 0.9, 0.022, 1, -1, 2, u, 0); }
        for (let i = 0; i < ringN; i++) put(f, 0, 0, 0, 0.9, 0.02, 1, -1, 3, i / ringN, 0);
        return f;
      },

      /* ---- nnet: a deep network — layer planes of neurons, activations streaming between layers.
              neurons/frames: sig −1, aux = (layer 0..1, weight, role 0 neuron · 1 ring · 2 frame) · activations: sig = phase, aux = target */
      nnet() {
        const f = blank(), sizes = mobile ? [5, 4, 4, 3, 2] : [8, 7, 7, 5, 3], L = sizes.length, sp = 0.36;
        const xs = sizes.map((_, i) => (i / (L - 1) - 0.5) * 5.4);
        const neurons = sizes.map((n, li) => { const a = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) a.push([xs[li], (r - (n - 1) / 2) * sp, (c - (n - 1) / 2) * sp]); return a; });
        const ringN = mobile ? 4 : 6;
        neurons.forEach((layer, li) => layer.forEach(([x, y, z], ni) => {
          const w = hash(li * 31 + ni);
          put(f, x, y, z, 1, 0.04, li === L - 1 ? 1 : 0.5, -1, li / (L - 1), w, 0);
          for (let k = 0; k < ringN; k++) { const a = (k / ringN) * TAU; put(f, x, y + Math.cos(a) * 0.09, z + Math.sin(a) * 0.09, 0.6, 0.016, 0.3, -1, li / (L - 1), w, 1); }
        }));
        const edgeN = mobile ? 14 : 26;
        sizes.forEach((n, li) => {
          const e = ((n - 1) / 2) * sp + 0.22, x = xs[li];
          [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]].forEach(([ay, az, by, bz]) => line(f, x, ay * e, az * e, x, by * e, bz * e, edgeN, 0.5, 0.016, 0.5, undefined, undefined, [li / (L - 1), 0, 2]));
        });
        const trail = mobile ? 5 : 8, streams = Math.floor((COUNT - f.n) / trail);
        for (let st = 0; st < streams; st++) {
          const li = st % (L - 1), A = neurons[li][Math.floor(hash(st * 2.7) * neurons[li].length)], B = neurons[li + 1][Math.floor(hash(st * 4.9) * neurons[li + 1].length)], ph = hash(st * 8.3);
          for (let j = 0; j < trail; j++) put(f, A[0], A[1], A[2], 0.9 * (1 - j / trail), 0.02 - j * 0.0012, 0.75, (((ph - j * 0.012) % 1) + 1) % 1, B[0], B[1], B[2]);
        }
        while (f.n < COUNT) put(f, 0, 0, 0, 0, 0.01, 0, -1, 0, 0, 2);
        return f;
      },

      /* ---- descent: a loss bowl with contour lines; the optimiser rolls to the minimum leaving a trail.
              surface: sig −1 · trail: sig [2,3) · optimiser: sig 4, aux = offset */
      descent() {
        const f = blank(), trailN = mobile ? 90 : 260, ballN = mobile ? 30 : 80, surfN = COUNT - trailN - ballN, Rb = 2.5;
        const bowl = (x, z) => 0.26 * (x * x + z * z) - 1.35 + 0.16 * Math.sin(x * 2.2) * Math.cos(z * 2.0);
        const N = Math.floor(Math.sqrt(surfN / 0.785));
        for (let r = 0; r < N && f.n < surfN; r++) for (let c = 0; c < N && f.n < surfN; c++) {
          const x = (c / (N - 1) * 2 - 1) * Rb, z = (r / (N - 1) * 2 - 1) * Rb;
          if (Math.hypot(x, z) > Rb) continue;
          put(f, x, bowl(x, z), z, 0.45, 0.017, 0.02, -1, x, z, 0);
        }
        while (f.n < surfN) put(f, 0, -1.35, 0, 0, 0.01, 0, -1, 0, 0, 0);
        for (let j = 0; j < trailN; j++) put(f, 0, 0, 0, 0.95 * (1 - j / trailN), 0.022, 1, 2 + (j / trailN) * 0.999, 0, 0, 1);
        const gg = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < ballN; i++) { const y = 1 - ((i + 0.5) / ballN) * 2, rr = Math.sqrt(1 - y * y), a = i * gg; put(f, 0, 0, 0, 1, 0.03, 1, 4, Math.cos(a) * rr * 0.1, y * 0.1, Math.sin(a) * rr * 0.1); }
        return f;
      },

      /* ---- surface: a live 3D surface plot; heights are computed in the shader; aux = grid coordinates −1..1 */
      surface() {
        const f = blank(), N = Math.floor(Math.sqrt(COUNT)), S = 2.3, every = mobile ? 6 : 8;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const gx = (c / (N - 1)) * 2 - 1, gz = (r / (N - 1)) * 2 - 1, gridLine = r % every === 0 || c % every === 0;
          put(f, gx * S, 0, gz * S, gridLine ? 0.85 : 0.32, gridLine ? 0.022 : 0.016, 0, -1, gx, gz, gridLine ? 1 : 0);
        }
        return f;
      },

      /* ---- field: regular dot matrix on the ground plane (fallback) */
      field() {
        const f = blank(), XH = Math.max(7.5, 15.5 * (window.innerWidth / window.innerHeight));
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
          put(f, ((c + (r % 2) * 0.5) / (COLS - 1) - 0.5) * 2 * XH, 0, Z_FAR + (r / ROWS) * Z_RANGE, 1, 0.036, 0, -1);
        f.xh = XH;
        return f;
      },

      /* ---- hello: sampled from the display serif */
      hello() {
        const f = blank(), c = document.createElement('canvas'), cw = 900, ch = 380;
        c.width = cw; c.height = ch;
        const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.font = 'italic 400 300px "Instrument Serif", Georgia, serif';
        x.fillText('hello.', cw / 2, ch / 2);
        const d = x.getImageData(0, 0, cw, ch).data, pts = [];
        for (let yy = 0; yy < ch; yy += 3) for (let xx = 0; xx < cw; xx += 3) if (d[(yy * cw + xx) * 4 + 3] > 120) pts.push(xx, yy);
        const n = pts.length / 2, k = 7.2 / cw;
        if (!n) return f;
        for (let i = 0; i < COUNT; i++) {
          const j = (Math.floor((i / COUNT) * n) % n) * 2;
          put(f, (pts[j] - cw / 2) * k, -(pts[j + 1] - ch / 2) * k, 0, 0.85, 0.03, hash(i) > 0.8 ? 1 : 0, pts[j] / cw, pts[j] / cw, pts[j + 1] / ch, 0);
        }
        return f;
      }
    };

    /* ---- portrait: halftone dot portrait sampled from the cut-out; aux = (u, v) */
    function portraitFrom(img) {
      const f = blank();
      const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
      const aspect = img.width / img.height;
      let gh = Math.round(Math.sqrt((COUNT / aspect) / 0.62)), data, gw, kept;
      for (let guard = 0; guard < 60; guard++) {
        gw = Math.round(gh * aspect); cv.width = gw; cv.height = gh;
        cx.clearRect(0, 0, gw, gh); cx.drawImage(img, 0, 0, gw, gh);
        data = cx.getImageData(0, 0, gw, gh).data;
        kept = 0;
        for (let i = 0; i < gw * gh; i++) if (data[i * 4 + 3] > 96) kept++;
        if (kept <= COUNT - 96) break;
        gh = Math.floor(gh * 0.975);
      }
      const HGT = 4.7;
      for (let r = 0; r < gh; r++) for (let c = 0; c < gw; c++) {
        const i = r * gw + c, a = data[i * 4 + 3] / 255;
        if (a <= 0.376) continue;
        const lum = data[i * 4] / 255, u = c / gw - 0.5, v = r / gh;
        const dome = Math.sqrt(Math.max(0, 1 - Math.pow(u / 0.31, 2) - Math.pow((v - 0.4) / 0.38, 2)));
        const fade = 1 - Math.min(1, Math.max(0, (v - 0.7) / 0.3));
        put(f, ((c + (r % 2) * 0.5) / gh - 0.5 * aspect) * HGT, (0.5 - v) * HGT, dome * 0.75 + lum * 0.14,
          (0.2 + 1.0 * Math.pow(lum, 1.05)) * a * (0.12 + 0.88 * fade), 0.021 + lum * 0.017, (1 - lum) * 0.4, v * 0.9, u + 0.5, v, 0);
      }
      const spare = COUNT - f.n, arm = Math.min(12, Math.floor(spare / 8));
      if (arm >= 5) {
        const x0 = -0.37 * aspect * HGT * 1.05, x1 = -x0, y1 = 0.5 * HGT + 0.12, y0 = (0.5 - 0.8) * HGT, len = 0.42;
        [[x0, y1, 1, -1], [x1, y1, -1, -1], [x0, y0, 1, 1], [x1, y0, -1, 1]].forEach(([x, y, sx, sy]) => {
          line(f, x, y, 0.3, x + sx * len, y, 0.3, arm, 0.85, 0.022, 1, 0, 0, [0, -1, 0]);
          line(f, x, y, 0.3, x, y + sy * len, 0.3, arm, 0.85, 0.022, 1, 0, 0, [0, -1, 0]);
        });
      }
      return f;
    }

    // how each formation sits in the frame and moves. type selects its live animation in the shader.
    const CFG = {
      scatter:  { type: 10, side: 0, y: 0, scale: 1, yaw: 0, pitch: 0, spin: 0, sy: 0, mouse: 0.02, lit: 0, depth: 0, R: 6, sig: [0.05, 0.08, 1.2], settle: 0.6, label: 'SIGNAL · SCATTERED' },
      portrait: { type: 1,  side: 1, y: 0.0,  scale: 1.0,  yaw: 0,     pitch: 0,    spin: 0,    sy: 0,    mouse: 0.07, lit: 0, depth: 0,    R: 2.4, sig: [0.10, 0.07, 0.55], settle: 1.0,  label: 'PORTRAIT · DOT MATRIX' },
      embed:    { type: 20, side: 1, y: 0.0,  scale: 1.12, yaw: 0.3,   pitch: 0.22, spin: 0.35, sy: 2.2,  mouse: 0.08, lit: 0, depth: 0.55, R: 2.8, sig: [0, 1, 0], settle: 0.82, label: 'EMBEDDING SPACE · SEMANTIC CLUSTERS' },
      flow:     { type: 21, side: 1, y: 0.0,  scale: 1.05, yaw: 0.62,  pitch: 0.38, spin: 0.2,  sy: 1.4,  mouse: 0.08, lit: 0, depth: 0.5,  R: 2.2, sig: [0, 1, 0], settle: 0.82, label: 'FULL-STACK DATA FLOW · CLIENT → API → AI → DATA' },
      agents:   { type: 22, side: 1, y: 0.0,  scale: 1.0,  yaw: 0,     pitch: 0.48, spin: 0.08, sy: 1.0,  mouse: 0.08, lit: 0, depth: 0.55, R: 2.4, sig: [0, 1, 0], settle: 0.85, label: 'MULTI-AGENT ORCHESTRATION · TASKS ↔ RESULTS' },
      surface:  { type: 14, side: 0, y: -2.75, scale: 2.7, yaw: 0,   pitch: 0.3,  spin: 0,    sy: 0,    mouse: 0.03, lit: 0, depth: 0.35, R: 6.0, sig: [0, 1, 0], settle: 0.9,  label: 'LOSS SURFACE · LIVE 3D PLOT', floor: true },
      rag:      { type: 23, side: 1, y: 0.0,  scale: 1.05, yaw: -0.2,  pitch: 0.12, spin: 0.04, sy: 0.8,  mouse: 0.08, lit: 0, depth: 0.45, R: 2.2, sig: [0, 1, 0], settle: 0.85, label: 'RETRIEVAL-AUGMENTED GENERATION · QUERY → TOP-K → ANSWER' },
      nnet:     { type: 24, side: 1, y: 0.0,  scale: 0.95, yaw: -0.8,  pitch: 0.28, spin: 0.06, sy: 1.1,  mouse: 0.08, lit: 0, depth: 0.5,  R: 2.8, sig: [0, 1, 0], settle: 0.8,  label: 'DEEP NEURAL NETWORK · FORWARD PASS' },
      globe:    { type: 7,  side: 1, y: 0.05, scale: 1.0,  yaw: 0,     pitch: 0.3,  spin: 1,    sy: 1.5,  mouse: 0.1,  lit: 1, depth: 0,    R: 2.1, sig: [0.06, 0.30, 1.6], settle: 0.7, label: 'GLOBE · LAT / LONG SCAN' },
      descent:  { type: 25, side: 1, y: 0.1,  scale: 1.05, yaw: 0.3,   pitch: 0.55, spin: 0.08, sy: 1.2,  mouse: 0.08, lit: 0, depth: 0.4,  R: 2.6, sig: [0, 1, 0], settle: 0.85, label: 'GRADIENT DESCENT · FINDING THE MINIMUM' },
      field:    { type: 5, field: true, sig: [0, 1, 0], settle: 0.85, label: 'LOSS LANDSCAPE · CONTOURS' },
      hello:    { type: 9, side: 0, y: 0, scale: 0.95, yaw: 0, pitch: 0, spin: 0, sy: 0, mouse: 0.05, lit: 0, depth: 0, R: 4, sig: [0.12, 0.12, 0.7], settle: 0.9, label: 'HELLO', hello: true }
    };
    // transition style used to arrive at each section: 0 scan · 1 radial burst · 2 wave wipe · 3 vortex
    const TRANS_SEQ = [3, 0, 1, 3, 2, 1, 0, 3, 2, 1, 0, 3];

    /* ================= sections → formations ================= */
    const sections = [...document.querySelectorAll('main section[data-shape]')];
    const names = sections.map((s) => (CFG[s.dataset.shape] ? s.dataset.shape : 'field'));
    if (!names.length) names.push('globe');
    const cache = {};
    function formation(name) {
      if (!cache[name]) cache[name] = name === 'portrait' ? GEN.globe() : GEN[name]();
      return cache[name];
    }
    const cfgOf = (name) => (name === 'portrait' && !cache.portraitReady ? Object.assign({}, CFG.globe, { settle: 1 }) : CFG[name]);

    /* ================= geometry + shader ================= */
    const geo = new THREE.BufferGeometry();
    const rand = new Float32Array(COUNT); for (let i = 0; i < COUNT; i++) rand[i] = hash(i * 3.7 + 1);
    const mk = (n) => new THREE.BufferAttribute(new Float32Array(COUNT * n), n);
    const A = { pos: mk(3), look: mk(3), sig: mk(1), aux: mk(3) }, B = { pos: mk(3), look: mk(3), sig: mk(1), aux: mk(3) };
    geo.setAttribute('position', mk(3));
    geo.setAttribute('aFrom', A.pos); geo.setAttribute('aFromLook', A.look); geo.setAttribute('aFromSig', A.sig); geo.setAttribute('aFromAux', A.aux);
    geo.setAttribute('aTo', B.pos); geo.setAttribute('aToLook', B.look); geo.setAttribute('aToSig', B.sig); geo.setAttribute('aToAux', B.aux);
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 80);
    const loaded = { A: null, B: null };
    function load(side, name) {
      const f = formation(name), S = side === 'A' ? A : B;
      S.pos.array.set(f.pos); S.look.array.set(f.look); S.sig.array.set(f.sig); S.aux.array.set(f.aux);
      S.pos.needsUpdate = S.look.needsUpdate = S.sig.needsUpdate = S.aux.needsUpdate = true;
      loaded[side] = name;
    }

    const noiseGLSL = `
      vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
      vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
      float snoise(vec3 v){
        const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
        vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
        vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
        vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
        i=mod289(i);
        vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
        float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
        vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
        vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
        vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
        vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
        vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
        vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
        vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
        p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
        vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
        return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
      }`;

    const V3 = () => new THREE.Vector3(), V4 = () => new THREE.Vector4();
    const U = {
      uTime: { value: 0 }, uMorph: { value: 0 }, uTrans: { value: 3 }, uTurb: { value: 0 }, uFly: { value: 0 },
      uPixel: { value: 1 }, uDpr: { value: DPR }, uPlaneY: { value: PLANE_Y }, uXH: { value: 24 },
      uMouse: { value: new THREE.Vector3(99, 99, 0) }, uMouseStrength: { value: 0 },
      uHit: { value: new THREE.Vector3(0, PLANE_Y, -200) }, uHitStrength: { value: 0 },
      uShock: { value: V3() }, uShockG: { value: new THREE.Vector2(0, -200) },
      uACen: { value: V3() }, uAPar: { value: V4() }, uALit: { value: V4() }, uASig: { value: V3() }, uAType: { value: 0 }, uAProg: { value: 0 },
      uBCen: { value: V3() }, uBPar: { value: V4() }, uBLit: { value: V4() }, uBSig: { value: V3() }, uBType: { value: 0 }, uBProg: { value: 0 },
      uOpacity: { value: 0 },
      uInk: { value: new THREE.Color(C_INK) }, uAcc: { value: new THREE.Color(C_ACC) }, uAcc2: { value: new THREE.Color(C_ACC2) }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aFrom, aTo, aFromLook, aToLook, aFromAux, aToAux; attribute float aFromSig, aToSig, aRand;
        uniform float uTime, uMorph, uTrans, uTurb, uFly, uPixel, uDpr, uPlaneY, uXH, uMouseStrength, uHitStrength, uAType, uBType, uAProg, uBProg;
        uniform vec3 uMouse, uHit, uShock, uInk, uAcc, uAcc2; uniform vec2 uShockG;
        uniform vec3 uACen, uBCen, uASig, uBSig;   // sig: speed, width, gain
        uniform vec4 uAPar, uBPar;                 // scale, yaw, pitch, isField
        uniform vec4 uALit, uBLit;                 // lit, depthDim, radius, (unused)
        varying vec3 vCol; varying float vA;
        ${noiseGLSL}
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
        vec3 rotX(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z); }
        vec3 agentC(float k, float prog){ float a = k / 6.0 * 6.2832 + uTime * 0.13 + prog * 1.6; return vec3(cos(a) * 2.15, sin(a * 2.0) * 0.25, sin(a) * 2.15); }
        float bowlF(vec2 q){ return 0.26 * dot(q, q) - 1.35 + 0.16 * sin(q.x * 2.2) * cos(q.y * 2.0); }
        vec2 pathP(float u){ float r = 2.15 * pow(1.0 - u, 1.15); float a = u * 12.0 + 0.6; return vec2(cos(a), sin(a)) * r; }
        float pulseAt(float sig, float speed, float width){ float w = fract(sig - uTime * speed); return pow(max(0.0, 1.0 - w / width), 2.0); }

        void form(vec3 p, vec3 look, float sig, vec3 aux, float type, float prog, vec3 cen, vec4 par, vec4 lit, vec3 sg,
                  out vec3 pos, out float alpha, out float size, out float tone) {
          float T = uTime;
          if (par.w > 0.5) {
            // ---- FIELD: loss landscape with live contour lines, cursor bump, click ring
            vec3 pl = p;
            pl.z = mod(pl.z + 26.0 + uFly, 30.0) - 26.0;
            float h = sin(pl.x * 0.38 + T * 0.30) * 0.20 + sin(pl.z * 0.34 - T * 0.26) * 0.24
                    + snoise(vec3(pl.x * 0.11, pl.z * 0.11, T * 0.045)) * 0.62;
            h *= 1.0 + uTurb * 1.3;
            float dm = distance(pl.xz, uHit.xz);
            float bump = exp(-dm * dm * 0.22) * uHitStrength;
            float ripple = sin(dm * 2.4 - T * 3.2) * exp(-dm * 0.42) * 0.09 * uHitStrength;
            float ring = 0.0;
            if (uShock.z > 0.0) { float ds = distance(pl.xz, uShockG); ring = exp(-pow(ds - uShock.z * 20.0, 2.0) * 0.45) * (1.0 - uShock.z); }
            pl.y = uPlaneY + h + bump * 0.95 + ripple + ring * 1.1;
            float hN = clamp(h * 0.62 + 0.5, 0.0, 1.0);
            float glow = clamp(bump + ring * 1.2, 0.0, 1.0);
            float contour = 1.0 - smoothstep(0.0, 0.07, abs(fract(h * 2.4 + 0.5) - 0.5));
            float depth = distance(cameraPosition, pl);
            float fog = smoothstep(33.0, 9.0, depth) * smoothstep(2.0, 5.0, depth);
            float edge = 1.0 - smoothstep(0.82, 1.0, abs(p.x) / uXH);
            pos = pl;
            alpha = (0.16 + hN * 0.45 + contour * 0.55 + glow * 0.6) * fog * edge;
            size = 0.034 + hN * 0.02 + contour * 0.012 + glow * 0.04;
            tone = max(max(mix(smoothstep(0.45, 0.85, hN) * 0.5, 1.0, smoothstep(0.82, 1.0, hN)), contour * 0.55), glow);
            return;
          }

          alpha = look.x; size = look.y; tone = look.z;
          float extra = 0.0, teal = 0.0;

          // ---- live animation per formation, in local coordinates
          if (abs(type - 1.0) < 0.5) {
            // PORTRAIT: the scan line carries a digital glitch through the rows it passes
            if (aux.y >= 0.0) {
              float scanV = fract(T * sg.x) / 0.9;
              float g = exp(-pow((aux.y - scanV) * 34.0, 2.0));
              float band = step(0.5, fract(aux.y * 60.0 + T * 3.0));
              p.x += g * 0.09 * (band * 2.0 - 1.0);
              p.z += g * 0.35 + sin(T * 0.7 + aux.y * 7.0) * 0.025;
              extra = g * 0.5;
            }
          } else if (abs(type - 14.0) < 0.5) {
            // SURFACE: a wide wave floor under the Lab cards. Scrolling drives the waves forward,
            // a ripple pulses from the centre, and peaks light up teal → lime.
            float r = length(aux.xy) * 3.0;
            float roll = sin(aux.y * 7.0 + uFly * 3.2 - T * 0.9) * 0.34;
            float cross = sin(aux.x * 5.0 - uFly * 1.6 + T * 0.5) * cos(aux.y * 4.0 + T * 0.4) * 0.16;
            float ripple = sin(r * 2.3 - T * 1.7 - uFly * 2.0) * exp(-r * 0.32) * 0.42;
            float h = roll + cross + ripple;
            p.y = h * 0.42;
            tone = mix(0.04, 0.55, smoothstep(-0.35, 0.45, h));
            extra = smoothstep(0.38, 0.7, h);
            alpha *= (0.55 + smoothstep(-0.4, 0.5, h) * 0.75) * (1.0 - smoothstep(0.72, 1.0, max(abs(aux.x), abs(aux.y))));
          } else if (abs(type - 20.0) < 0.5) {
            // EMBED: new points are pulled into their semantic cluster (clustering, live); links carry similarity pulses
            if (sig >= 2.0) {
              extra = pow(max(0.0, 1.0 - fract(sig - 2.0 - T * 0.45) / 0.18), 2.0);
            } else if (sig >= 0.0) {
              float u = fract(sig + T * 0.075 + prog * 0.9);
              float e = u * u * (3.0 - 2.0 * u);
              p = mix(p, aux + (p - aux) * 0.06, e);
              alpha *= sin(u * 3.14159);
              tone = mix(0.5, 1.0, e);
              extra = e * 0.5;
            } else {
              p = aux + (p - aux) * (1.0 + 0.09 * sin(T * 0.9 + aux.x * 3.0 + aux.y * 2.0));
            }
          } else if (abs(type - 21.0) < 0.5) {
            // FLOW: requests stream down through client → API → AI → data; responses climb back; packets flare at each layer
            if (sig >= 0.0) {
              float up = step(1.5, sig);
              float u = fract(fract(sig) + T * 0.16 + prog * 0.9);
              float y = mix(1.7, -1.7, u) * (1.0 - 2.0 * up);
              p.y = y;
              p.x += sin(y * 4.0 + fract(sig) * 20.0) * 0.05;
              float d = abs(fract(y - 0.5 + 0.5) - 0.5);
              extra = exp(-d * d * 260.0);
              alpha *= smoothstep(0.0, 0.05, u) * smoothstep(1.0, 0.95, u);
            } else {
              float wave = exp(-pow(fract(aux.x - T * 0.18) - 0.5, 2.0) * 50.0);
              alpha *= 0.85 + wave * 0.5;
            }
          } else if (abs(type - 22.0) < 0.5) {
            // AGENTS: six agents orbit the orchestrator; tasks fly out, results fly back, agents hand off to each other
            if (aux.y < 0.5) {
              if (aux.x > -0.5) { p += agentC(aux.x, prog); extra = 0.25 + 0.25 * sin(T * 2.2 + aux.x * 1.7); }
              else { p *= 1.0 + 0.07 * sin(T * 1.6); extra = 0.2 + 0.2 * sin(T * 1.6); }
            } else if (aux.y > 1.5 && aux.y < 2.5) {
              float u = fract(sig + T * 0.42);
              vec3 A = vec3(0.0), B = agentC(aux.x, prog);
              if (aux.z > 1.5) { A = agentC(aux.x, prog); B = agentC(mod(aux.x + 1.0, 6.0), prog); }
              else if (aux.z > 0.5) { vec3 t = A; A = B; B = t; }
              p = mix(A, B, u) + vec3(0.0, sin(u * 3.14159) * 0.5, 0.0);
              alpha *= smoothstep(0.0, 0.08, u) * smoothstep(1.0, 0.9, u);
            } else if (aux.y > 2.5) { alpha = 0.0; }
          } else if (abs(type - 23.0) < 0.5) {
            // RAG: query beam → the closest chunks light up → they fly out and assemble the answer → back to the index
            float c = fract(T * 0.1 + prog * 0.55);
            vec3 ans = vec3(-1.9, 1.15, 0.3);
            if (aux.x < 0.5) {
              alpha *= 0.8 + 0.2 * sin(T * 1.3 + sig * 30.0);
            } else if (aux.x < 1.5) {
              float e = smoothstep(0.38, 0.58, c) - smoothstep(0.82, 0.97, c);
              vec3 off = vec3(h21(vec2(sig, 1.0)) - 0.5, h21(vec2(sig, 2.0)) - 0.5, h21(vec2(sig, 3.0)) - 0.5) * 0.6;
              p = mix(p, ans + off, e) + vec3(0.0, sin(e * 3.14159) * 0.6, 0.0);
              float flash = exp(-pow((c - 0.33) * 16.0, 2.0));
              extra = max(e * 0.9, flash);
            } else if (aux.x < 2.5) {
              float on = smoothstep(0.0, 0.04, c) * (1.0 - smoothstep(0.34, 0.4, c));
              float w = fract(aux.y - T * 0.9);
              alpha *= on * (0.25 + 1.5 * pow(max(0.0, 1.0 - w / 0.25), 2.0));
              extra = on * 0.6;
            } else {
              float a = aux.y * 6.2832 + T * 0.8;
              p = ans + vec3(cos(a) * 0.6, sin(a) * 0.2, sin(a) * 0.6);
              float on2 = smoothstep(0.45, 0.6, c) * (1.0 - smoothstep(0.85, 0.97, c));
              alpha *= 0.15 + on2 * 0.85;
              extra = on2 * 0.6;
            }
          } else if (abs(type - 24.0) < 0.5) {
            // NNET: activations stream layer to layer; a forward-pass wave lights each layer in turn; the output layer fires
            if (sig >= 0.0) {
              float u = fract(sig + T * 0.55 + prog * 0.6);
              p = mix(p, aux, u);
              alpha *= smoothstep(0.0, 0.1, u) * smoothstep(1.0, 0.85, u);
            } else {
              float w = fract(aux.x * 0.85 - T * 0.3 - prog * 0.5);
              float act = exp(-w * w * 40.0) + exp(-(1.0 - w) * (1.0 - w) * 40.0);
              if (aux.z < 1.5) extra = act * (0.45 + aux.y * 0.8);
              else alpha *= 0.6 + act * 0.6;
            }
          } else if (abs(type - 25.0) < 0.5) {
            // DESCENT: contour lines on the loss bowl; the optimiser spirals to the minimum leaving a trail
            float u0 = fract(T * 0.065 + prog * 0.4);
            if (sig < 0.0) {
              float cl = 1.0 - smoothstep(0.0, 0.07, abs(fract(p.y * 3.2 + 0.5) - 0.5));
              alpha *= 0.55 + cl * 1.1;
              tone = max(tone, cl * 0.5);
              float db = distance(p.xz, pathP(u0));
              extra = exp(-db * db * 5.0) * 0.8;
            } else if (sig < 3.5) {
              float uj = u0 - (sig - 2.0) * 0.32;
              float vis = step(0.0, uj);
              vec2 q = pathP(max(uj, 0.0));
              p = vec3(q.x, bowlF(q) + 0.05, q.y);
              alpha *= vis;
            } else {
              vec2 q = pathP(u0);
              p = vec3(q.x, bowlF(q) + 0.13, q.y) + aux;
              extra = 1.0;
            }
          } else if (type > 9.5 && type < 10.5) {
            // SCATTER: slow drift and twinkle in deep space
            p += vec3(sin(T * 0.11 + aRand * 40.0), cos(T * 0.09 + aRand * 31.0), sin(T * 0.07 + aRand * 17.0)) * 0.18;
            alpha *= 0.55 + 0.45 * sin(T * (0.6 + aRand * 1.6) + aRand * 60.0);
          }

          vec3 q = rotX(rotY(p, par.y), par.z);
          float R = max(lit.z, 0.001);
          float litMask = lit.x * step(tone, 0.6);
          vec3 nrm = normalize(q + 0.0001);
          float l = smoothstep(-0.25, 0.9, dot(nrm, normalize(vec3(-0.55, 0.5, 0.68))));
          alpha *= mix(1.0, (0.10 + 0.90 * l) * mix(0.16, 1.0, smoothstep(-0.45, 0.3, nrm.z)), litMask);
          tone = mix(tone, mix(0.5, 0.0, smoothstep(0.05, 0.85, l)), litMask);
          if (type > 6.5 && type < 7.5) {
            float sy = sin(T * 0.45) * 0.85;
            float band = exp(-pow((nrm.y - sy) * 16.0, 2.0)) * (1.0 - step(0.5, aux.z));
            extra = max(extra, band * smoothstep(-0.2, 0.4, nrm.z));
          }
          alpha *= mix(1.0, 0.28 + 0.72 * smoothstep(-R, R, q.z), lit.y);
          if (sig >= 0.0 && sg.z > 0.0) {
            float pulse = pulseAt(sig, sg.x, sg.y);
            alpha *= 1.0 + sg.z * pulse;
            size *= 1.0 + 0.45 * pulse * min(sg.z, 1.6);
            tone = mix(tone, 1.0, clamp(pulse * 0.9, 0.0, 1.0));
          }
          alpha *= 1.0 + extra * 1.3 + teal * 1.6;
          size *= 1.0 + extra * 0.45 + teal * 0.4;
          tone = mix(tone, 1.0, clamp(extra, 0.0, 1.0));
          tone = mix(tone, 0.5, clamp(teal, 0.0, 1.0));
          pos = q * par.x + cen;
        }

        void main(){
          vec3 pA, pB; float aA, aB, sA, sB, tA, tB;
          form(aFrom, aFromLook, aFromSig, aFromAux, uAType, uAProg, uACen, uAPar, uALit, uASig, pA, aA, sA, tA);
          form(aTo, aToLook, aToSig, aToAux, uBType, uBProg, uBCen, uBPar, uBLit, uBSig, pB, aB, sB, tB);

          // ---- transition: four styles, each dot travels in its own window and glows while in flight
          vec3 midP = mix(pA, pB, 0.5);
          vec3 cen = mix(uACen, uBCen, 0.5);
          float key, win;
          if (uTrans < 0.5)      { key = 1.0 - smoothstep(-3.6, 3.6, midP.y); win = 0.46; }           // scan top → bottom
          else if (uTrans < 1.5) { key = smoothstep(0.0, 4.2, length(midP.xy - cen.xy)); win = 0.48; } // radial, centre → out
          else if (uTrans < 2.5) { key = smoothstep(-7.5, 7.5, midP.x); win = 0.48; }                // wipe left → right
          else                   { key = aRand; win = 0.62; }                                          // vortex swarm
          key = clamp(key * 0.86 + aRand * 0.14, 0.0, 1.0);
          float m = clamp((uMorph - key * (1.0 - win)) / win, 0.0, 1.0);
          m = m * m * m * (m * (m * 6.0 - 15.0) + 10.0);
          float transit = sin(m * 3.14159);
          vec3 pos = mix(pA, pB, m);
          if (uTrans < 0.5) {
            pos.z += transit * 0.9;
          } else if (uTrans < 1.5) {
            vec3 dir = normalize(pos - cen + vec3(0.0001));
            pos += dir * transit * 1.5;
          } else if (uTrans < 2.5) {
            pos.y += transit * 1.2 * sin(midP.x * 0.55 + 1.3);
            pos.z += transit * 0.7;
          } else {
            vec3 rel = pos - cen;
            float ang = transit * (2.4 + aRand * 1.6);
            float c = cos(ang), s = sin(ang);
            rel = vec3(c * rel.x + s * rel.z, rel.y + transit * (aRand - 0.5) * 1.2, -s * rel.x + c * rel.z);
            pos = cen + rel;
            pos.z += transit * 1.2;
          }
          float fieldness = mix(uAPar.w, uBPar.w, m);
          if (transit > 0.001 || uTurb > 0.001) {
            vec3 q = pos * 0.28; float t = uTime * 0.05;
            vec3 n = vec3(snoise(q + t), snoise(q + vec3(31.4) + t), snoise(q + vec3(71.9) - t));
            pos += n * (transit * 0.07 + uTurb * 0.22 * (1.0 - fieldness));
          }
          float nearF = 1.0 - fieldness;
          vec2 d = pos.xy - uMouse.xy; float dist = length(d);
          float f = smoothstep(1.5, 0.0, dist) * uMouseStrength * nearF;
          pos.xy += normalize(d + 0.0001) * f * 0.35; pos.z += f * 0.35;
          float sw = 0.0;
          if (uShock.z > 0.0) {
            vec2 sd = pos.xy - uShock.xy; float dd = length(sd);
            sw = exp(-pow(dd - uShock.z * 9.0, 2.0) * 1.2) * (1.0 - uShock.z) * nearF;
            pos.xy += normalize(sd + 0.0001) * sw * 0.6; pos.z += sw * 0.9;
          }
          vec4 mv = viewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = max(mix(sA, sB, m) * (1.0 + transit * 0.35) * uPixel / -mv.z, 1.25 * uDpr);
          float tone = clamp(mix(tA, tB, m) + (f + sw) * 0.9 + transit * 0.7, 0.0, 1.0);
          vCol = tone < 0.5 ? mix(uInk, uAcc2, tone * 2.0) : mix(uAcc2, uAcc, (tone - 0.5) * 2.0);
          vA = mix(max(aA, 0.0), max(aB, 0.0), m) * (1.0 + (f + sw) * 0.8 + transit * 0.45);
        }`,
      fragmentShader: `
        uniform float uOpacity; varying vec3 vCol; varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float disc = 1.0 - smoothstep(0.30, 0.5, d);
          gl_FragColor = vec4(vCol, disc * vA * uOpacity);
        }`
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    /* ================= layout ================= */
    function sizeAll() {
      U.uPixel.value = (window.innerHeight * DPR) / 2 / Math.tan((camera.fov * Math.PI) / 360);
      BU.uRes.value.set(window.innerWidth * DPR, window.innerHeight * DPR);
      halfW = 3.73 * (window.innerWidth / window.innerHeight);
      delete cache.field; delete cache.scatter;
      U.uXH.value = formation('field').xh;
    }
    sizeAll();

    const mouseNDC = new THREE.Vector2(0, 0);
    let spin = 0;
    function applySide(name, cenU, parU, litU, sigU, typeU, prog) {
      const c = cfgOf(name);
      typeU.value = c.type;
      if (c.field) { parU.value.set(1, 0, 0, 1); litU.value.set(0, 0, 1, 1); sigU.value.set(0, 1, 0); cenU.value.set(0, 0, 0); return; }
      const m = isMobile();
      let x, y, scale;
      if (name === 'scatter') { x = 0; y = 0; scale = 1; }
      else if (c.floor) { x = 0; y = c.y; scale = c.scale * Math.max(0.75, Math.min(1.15, halfW / 5.6)); }
      else if (c.hello) {
        if (m) { x = 0; y = -2.6; scale = Math.min(0.42, window.innerWidth / 900); } else { x = 3.0; y = 1.15; scale = 0.95; }
      } else if (m) {
        x = 0; y = name === 'portrait' ? 1.25 : 0.9; scale = c.scale * Math.min(0.62, halfW / 3.6);
      } else {
        x = c.side * halfW * (name === 'portrait' ? 0.56 : 0.5); y = c.y; scale = c.scale * Math.max(0.7, Math.min(1, halfW / 6.3));
      }
      cenU.value.set(x, y, 0);
      parU.value.set(scale, c.yaw + spin * c.spin + (prog || 0) * (c.sy || 0) + mouseNDC.x * c.mouse, c.pitch - mouseNDC.y * c.mouse * 0.6, 0);
      litU.value.set(c.lit, c.depth, c.R, 1);
      sigU.value.set(c.sig[0], c.sig[1], reduced ? 0 : c.sig[2]);
    }

    /* ================= opening + scroll ================= */
    const introObj = { v: 0 };
    let introDone = false, revealed = false;
    let pairA = -1, pairB = -1, morph = 0, morphTarget = 0, figure = -1, sideA = 'scatter', sideB = names[0];
    load('A', 'scatter'); load('B', names[0]);

    function setPair(a, b) {
      if (a === pairA && b === pairB) return false;
      pairA = a; pairB = b; sideA = names[a]; sideB = names[b];
      if (loaded.A !== sideA) load('A', sideA);
      if (loaded.B !== sideB) load('B', sideB);
      U.uTrans.value = TRANS_SEQ[b % TRANS_SEQ.length];
      return true;
    }
    // section tops in page coordinates, measured once and refreshed when layout changes (no per-frame layout reads)
    let tops = [];
    function measure() { const y = window.scrollY; tops = sections.map((el) => el.getBoundingClientRect().top + y); }
    measure();
    window.addEventListener('load', measure);
    if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', measure);
    if (window.ResizeObserver) new ResizeObserver(() => measure()).observe(document.body);
    function readScroll() {
      const vh = window.innerHeight, y = window.scrollY;
      let j = 0;
      for (let i = 1; i < tops.length; i++) { if (tops[i] - y < vh) j = i; else break; }
      if (j === 0) { if (setPair(0, 0)) morph = 0; morphTarget = 0; return; }
      const top = tops[j] - y;
      const t = Math.min(1, Math.max(0, (vh - top) / (vh * 0.8)));
      if (setPair(j - 1, j)) morph = t;
      morphTarget = t;
    }
    // how far the reader is through a given section (0 entering … 1 leaving): drives each formation's own story
    const progs = { A: 0, B: 0 };
    function sectionProg(i) {
      if (i < 0 || !tops.length) return 0;
      const y = window.scrollY + window.innerHeight * 0.5;
      const end = i + 1 < tops.length ? tops[i + 1] : document.documentElement.scrollHeight;
      return Math.min(1, Math.max(0, (y - tops[i]) / Math.max(1, end - tops[i])));
    }
    function announce() {
      const name = !introDone ? (introObj.v > 0.5 ? names[0] : 'scatter') : (morph > 0.5 ? sideB : sideA);
      const idx = !introDone ? 0 : (morph > 0.5 ? pairB : pairA);
      const key = name + idx;
      if (key === figure) return;
      figure = key;
      window.dispatchEvent(new CustomEvent('as:figure', { detail: { index: idx, label: cfgOf(name).label } }));
    }

    // the portrait loads in the background; until then (or if it fails) the globe stands in
    (function loadPortrait() {
      if (!names.includes('portrait')) return;
      const img = new Image();
      img.onload = () => {
        try {
          const p = portraitFrom(img);
          if (p.n < COUNT * 0.3) throw new Error('portrait too sparse');
          cache.portrait = p; cache.portraitReady = true;
          if (loaded.A === 'portrait') load('A', 'portrait');
          if (loaded.B === 'portrait') load('B', 'portrait');
          figure = -1;
        } catch (e) { /* keep the globe */ }
      };
      img.src = 'assets/face.png';
    })();

    /* ================= public controls ================= */
    const burstObj = { v: 0 };
    (function prebuild() {
      const queue = [...new Set(names.filter((n) => n !== 'portrait')), 'globe'];
      const idle = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 60));
      const step = (dl) => {
        while (queue.length && (dl.timeRemaining() > 4 || !window.requestIdleCallback)) { formation(queue.shift()); if (!window.requestIdleCallback) break; }
        if (queue.length) idle(step);
      };
      idle(step);
    })();
    api.reveal = function () {
      revealed = true;
      if (!window.gsap || reduced) { introObj.v = 1; return; }
      gsap.to(introObj, { v: 1, duration: 4.2, ease: 'power2.inOut', delay: 0.5 });
    };
    api.burst = function () {
      if (!window.gsap) return;
      gsap.killTweensOf(burstObj); burstObj.v = 2.2;
      gsap.to(burstObj, { v: 0, duration: 3.5, ease: 'expo.out' });
    };
    let velTurb = 0;
    api.setVelocity = function (v) { velTurb = Math.min(Math.abs(v) * 0.006, 0.35); };

    /* ================= input ================= */
    const mouseWorld = new THREE.Vector3(99, 99, 0), hit = new THREE.Vector3(0, PLANE_Y, -200);
    const tmp = new THREE.Vector3(), bgTarget = new THREE.Vector2(0.72, 0.55);
    let mouseActive = 0, hitActive = 0;
    function castRay(cx, cy) {
      return tmp.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
    }
    function toWorld(cx, cy, out) { const d = castRay(cx, cy); return out.copy(camera.position).add(d.multiplyScalar(-camera.position.z / d.z)); }
    function toGround(cx, cy, out) {
      const d = castRay(cx, cy);
      if (d.y > -0.03) return false;
      const t = (PLANE_Y - camera.position.y) / d.y;
      if (t > 60) return false;
      out.copy(camera.position).add(d.multiplyScalar(t));
      return true;
    }
    window.addEventListener('pointermove', (e) => {
      mouseNDC.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      toWorld(e.clientX, e.clientY, mouseWorld);
      hitActive = toGround(e.clientX, e.clientY, hit) ? 1 : 0;
      bgTarget.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
      mouseActive = e.pointerType === 'mouse' ? 1 : 0.6;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { mouseActive = 0; hitActive = 0; });

    api.shock = function (cx, cy) {
      if (reduced || !window.gsap) return;
      const p = toWorld(cx, cy, new THREE.Vector3()), g = new THREE.Vector3();
      if (toGround(cx, cy, g)) U.uShockG.value.set(g.x, g.z); else U.uShockG.value.set(0, -200);
      U.uShock.value.set(p.x, p.y, 0.001);
      gsap.killTweensOf(U.uShock.value);
      gsap.to(U.uShock.value, { z: 1, duration: 2.0, ease: 'power2.out', onComplete: () => (U.uShock.value.z = 0) });
    };

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      sizeAll();
      const a = loaded.A, b = loaded.B; loaded.A = loaded.B = null;
      load('A', a); load('B', b);
    });

    /* ================= loop ================= */
    const clock = new THREE.Clock();
    let fly = 0, opacity = 0, glow = 0, grid = 0;
    const smooth = (x) => x * x * (3 - 2 * x);
    function tick() {
      requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05), speed = reduced ? 0.15 : 1;
      U.uTime.value += dt * speed; BU.uTime.value += dt * speed;
      spin += dt * 0.11 * speed;

      let m;
      // a visitor who scrolls past the hero before the opening ends shouldn't wait for it
      if (!introDone && revealed && window.scrollY > window.innerHeight * 0.3 && introObj.v < 1) {
        if (window.gsap) gsap.killTweensOf(introObj);
        introObj.v = 1;
      }
      if (!introDone) {
        // opening: scattered dots swarm in a vortex and assemble into the portrait
        U.uTrans.value = 3;
        sideA = 'scatter'; sideB = names[0];
        if (loaded.A !== 'scatter') load('A', 'scatter');
        if (loaded.B !== names[0]) load('B', names[0]);
        m = introObj.v; morph = m;
        if (introObj.v >= 1) { introDone = true; pairA = pairB = -1; readScroll(); morph = morphTarget; }
      } else {
        readScroll();
        morph += (morphTarget - morph) * (1 - Math.pow(0.004, dt));
        m = smooth(Math.min(1, Math.max(0, morph)));
      }
      U.uMorph.value = m;
      const kp = 1 - Math.pow(0.01, dt);
      progs.A += ((introDone ? sectionProg(pairA) : 0) - progs.A) * kp;
      progs.B += ((introDone ? sectionProg(pairB) : 0) - progs.B) * kp;
      U.uAProg.value = progs.A; U.uBProg.value = progs.B;
      applySide(sideA, U.uACen, U.uAPar, U.uALit, U.uASig, U.uAType, progs.A);
      applySide(sideB, U.uBCen, U.uBPar, U.uBLit, U.uBSig, U.uBType, progs.B);
      announce();

      const cA = cfgOf(sideA), cB = cfgOf(sideB);
      const settle = cA.settle + (cB.settle - cA.settle) * m;
      const mobileK = isMobile() ? 0.62 : 1;
      const targetO = revealed ? Math.max(settle * mobileK, introDone ? Math.sin(m * Math.PI) * 0.95 : 0) : 0;
      const k = 1 - Math.pow(0.002, dt);
      opacity += (targetO - opacity) * k;
      const fieldness = (cA.field ? 1 : 0) + ((cB.field ? 1 : 0) - (cA.field ? 1 : 0)) * m;
      glow += ((revealed ? 1 - fieldness * 0.25 : 0.5) - glow) * k * 0.6;
      grid += ((revealed ? 1 - fieldness * 0.45 : 0.4) - grid) * k * 0.6;
      U.uOpacity.value = opacity; BU.uGlow.value = glow; BU.uGrid.value = grid;

      fly += (window.scrollY * 0.004 - fly) * 0.09;
      U.uFly.value = fly;
      BU.uScrollPx.value = window.scrollY * 0.25 * DPR;

      camera.position.x += (mouseNDC.x * 0.14 - camera.position.x) * 0.03;
      camera.position.y += (mouseNDC.y * 0.09 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      BU.uMouse.value.lerp(bgTarget, 0.05);
      U.uMouse.value.lerp(mouseWorld, 0.12);
      U.uHit.value.lerp(hit, 0.14);
      U.uMouseStrength.value += (mouseActive - U.uMouseStrength.value) * 0.06;
      U.uHitStrength.value += (hitActive * mouseActive - U.uHitStrength.value) * 0.06;
      U.uTurb.value += (velTurb + burstObj.v - U.uTurb.value) * 0.08;
      velTurb *= 0.93;
      renderer.render(scene, camera);
    }
    tick();
    api.ready = true;
  };
})();
