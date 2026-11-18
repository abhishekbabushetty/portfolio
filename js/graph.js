/* =========================================================
   Knowledge graph — a hand-rolled force simulation of the stack.
   Data is read from #skillsData so the HTML stays the source of truth.
   ========================================================= */
(function () {
  const AS = (window.AS = window.AS || {});
  const MONO = '"Geist Mono", ui-monospace, Menlo, monospace';
  const SANS = 'Geist, system-ui, sans-serif';

  const CROSS = [
    ['Python', 'FastAPI'], ['Python', 'PyTorch'], ['Python', 'LangChain'], ['JavaScript', 'React.js'], ['JavaScript', 'Node.js'],
    ['React.js', 'React Native'], ['Node.js', 'Express.js'], ['LangChain', 'LangGraph'], ['LangChain', 'RAG Systems'],
    ['RAG Systems', 'FAISS'], ['CrewAI', 'Multi-agent Workflows'], ['AutoGen', 'Multi-agent Workflows'], ['LangGraph', 'Multi-agent Workflows'],
    ['PyTorch', 'YOLOv8'], ['OpenCV', 'YOLOv8'], ['SQL', 'PostgreSQL'], ['Docker', 'GCP'], ['LangSmith', 'LangGraph'],
    ['Deep Learning', 'PyTorch'], ['Deep Learning', 'TensorFlow'], ['Machine Learning', 'Scikit-learn'], ['Quantization', 'PyTorch'],
    ['Conversational AI', 'Twilio Voice Agents'], ['Team Leadership', 'Mentoring'], ['Project Management', 'Agile'], ['FastAPI', 'PostgreSQL'],
    ['Supabase', 'PostgreSQL'], ['React Native', 'Android'], ['React Native', 'iOS'], ['React.js', 'Next.js'], ['Redis', 'Celery'], ['FastAPI', 'Celery'], ['Firebase', 'React Native'], ['MCP', 'Agentic Frameworks'], ['ChromaDB', 'RAG Systems'], ['AWS', 'Docker'], ['FastAPI', 'WebSockets'], ['Agentic Frameworks', 'CrewAI'], ['Agentic Frameworks', 'LangGraph'], ['Agentic Frameworks', 'AutoGen']
  ];

  AS.graph = {
    init() {
      const canvas = document.getElementById('graphCanvas');
      const data = document.getElementById('skillsData');
      if (!canvas || !data) return;
      const ctx = canvas.getContext('2d');
      const tip = document.getElementById('graphTip');
      const filters = document.getElementById('graphFilters');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const nodes = [], links = [], byName = {};
      const cats = [];
      data.querySelectorAll('[data-cat]').forEach((el) => {
        const cat = el.dataset.cat;
        cats.push(cat);
        const hub = { id: cat, label: cat, hub: true, cat, x: 0, y: 0, vx: 0, vy: 0, r: 26, deg: 0 };
        nodes.push(hub); byName[cat] = hub;
        el.querySelectorAll('span').forEach((s) => {
          const name = s.textContent.trim();
          const n = { id: name, label: name, hub: false, cat, x: 0, y: 0, vx: 0, vy: 0, r: 5, deg: 0 };
          nodes.push(n); byName[name] = n;
          links.push({ a: hub, b: n, len: 78, k: 0.03 });
        });
      });
      CROSS.forEach(([a, b]) => { if (byName[a] && byName[b]) links.push({ a: byName[a], b: byName[b], len: 120, k: 0.006, cross: true }); });
      links.forEach((l) => { l.a.deg++; l.b.deg++; });
      nodes.forEach((n) => { if (!n.hub) n.r = 4 + Math.min(n.deg, 5) * 0.9; });
      const neighbors = new Map(nodes.map((n) => [n, new Set()]));
      links.forEach((l) => { neighbors.get(l.a).add(l.b); neighbors.get(l.b).add(l.a); });

      // filter chips
      let active = null;
      const mk = (txt, val) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = txt;
        if (val === null) b.classList.add('is-active');
        b.addEventListener('click', () => {
          active = val; filters.querySelectorAll('button').forEach((x) => x.classList.toggle('is-active', x === b));
          kick(0.6);
        });
        filters.appendChild(b);
      };
      mk('All', null); cats.forEach((c) => mk(c, c));

      let W = 0, H = 0, alpha = 1;
      function kick(a) { alpha = Math.max(alpha, a); }
      function resize() {
        const r = canvas.getBoundingClientRect();
        if (r.width < 10) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const first = !W;
        W = r.width; H = r.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (first) {
          cats.forEach((c, i) => {
            const a = (i / cats.length) * Math.PI * 2;
            const hub = byName[c];
            hub.x = W / 2 + Math.cos(a) * W * 0.3; hub.y = H / 2 + Math.sin(a) * H * 0.34;
          });
          nodes.forEach((n) => { if (!n.hub) { const h = byName[n.cat]; n.x = h.x + (Math.random() - 0.5) * 80; n.y = h.y + (Math.random() - 0.5) * 80; } });
        }
        kick(1);
      }
      new ResizeObserver(resize).observe(canvas);

      // interaction
      let hover = null, drag = null, P = { x: -999, y: -999 };
      function pick(x, y) {
        let best = null, bd = 1e9;
        for (const n of nodes) { const d = Math.hypot(n.x - x, n.y - y); if (d < Math.max(n.r + 10, 16) && d < bd) { bd = d; best = n; } }
        return best;
      }
      const pos = (e) => { const r = canvas.getBoundingClientRect(); P.x = e.clientX - r.left; P.y = e.clientY - r.top; };
      canvas.addEventListener('pointermove', (e) => {
        pos(e);
        if (drag) { drag.x = P.x; drag.y = P.y; drag.vx = drag.vy = 0; kick(0.4); }
        else hover = pick(P.x, P.y);
        canvas.style.cursor = hover ? 'grab' : '';
      });
      canvas.addEventListener('pointerdown', (e) => {
        pos(e); const n = pick(P.x, P.y);
        if (n) { drag = n; hover = n; canvas.setPointerCapture(e.pointerId); }
      });
      const end = () => { drag = null; };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      canvas.addEventListener('pointerleave', () => { if (!drag) hover = null; });

      let visible = false;
      new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; if (visible) kick(0.5); })).observe(canvas);

      function sim() {
        const cx = W / 2, cy = H / 2;
        const scale = Math.min(1.25, Math.max(0.5, Math.sqrt(W * H) / 820));
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.01;
            if (d2 > 90000) continue;
            const s = (a.hub && b.hub ? 9000 : a.hub || b.hub ? 1600 : 700) * scale * scale;
            const f = s / d2, d = Math.sqrt(d2);
            dx /= d; dy /= d;
            a.vx += dx * f * alpha; a.vy += dy * f * alpha; b.vx -= dx * f * alpha; b.vy -= dy * f * alpha;
          }
        }
        for (const l of links) {
          const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, d = Math.hypot(dx, dy) || 1;
          const f = (d - l.len * scale) * l.k * alpha;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          l.a.vx += fx; l.a.vy += fy; l.b.vx -= fx; l.b.vy -= fy;
        }
        const t = performance.now() / 1000;
        for (const n of nodes) {
          n.vx += (cx - n.x) * 0.0019 * Math.min(2.2, Math.max(0.7, H / W)) * alpha * (n.hub ? 2 : 1);
          n.vy += (cy - n.y) * 0.0019 * Math.min(2.2, Math.max(0.45, W / H)) * alpha * (n.hub ? 2 : 1);
          if (!reduced) { n.vx += Math.sin(t * 0.7 + n.x * 0.01) * 0.02; n.vy += Math.cos(t * 0.6 + n.y * 0.01) * 0.02; }
          if (n === drag) continue;
          n.vx *= 0.82; n.vy *= 0.82;
          n.x += n.vx; n.y += n.vy;
          const m = n.r + 14;
          n.x = Math.max(m, Math.min(W - m, n.x)); n.y = Math.max(m + 10, Math.min(H - m - 20, n.y));
        }
        alpha = Math.max(0.12, alpha * 0.99);
      }

      function inFocus(n) {
        if (hover) return n === hover || neighbors.get(hover).has(n);
        if (active) return n.cat === active;
        return true;
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        const focusSet = new Set(nodes.filter(inFocus));
        for (const l of links) {
          const on = focusSet.has(l.a) && focusSet.has(l.b);
          const hot = hover && (l.a === hover || l.b === hover);
          ctx.strokeStyle = hot ? 'rgba(200,245,66,0.75)' : on ? (l.cross ? 'rgba(63,224,197,0.22)' : 'rgba(238,241,238,0.14)') : 'rgba(238,241,238,0.03)';
          ctx.lineWidth = hot ? 1.5 : 1;
          if (l.cross && !hot) ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(l.a.x, l.a.y); ctx.lineTo(l.b.x, l.b.y); ctx.stroke();
          ctx.setLineDash([]);
        }
        for (const n of nodes) {
          const on = focusSet.has(n);
          const isH = n === hover;
          ctx.globalAlpha = on ? 1 : 0.12;
          if (n.hub) {
            ctx.fillStyle = isH ? '#c8f542' : '#0d1013';
            ctx.strokeStyle = '#c8f542'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7); ctx.fill(); ctx.stroke();
            ctx.font = `600 ${W < 520 ? 11 : 13}px ${SANS}`; ctx.fillStyle = '#eef1ee'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(n.label, n.x, n.y + n.r + 16);
            ctx.fillStyle = isH ? '#0b0c05' : '#c8f542'; ctx.font = `${W < 520 ? 9 : 11}px ${MONO}`;
            ctx.fillText(String(n.deg), n.x, n.y + 1);
          } else {
            ctx.fillStyle = isH ? '#c8f542' : hover && on ? '#c8f542' : '#eef1ee';
            ctx.beginPath(); ctx.arc(n.x, n.y, isH ? n.r + 3 : n.r, 0, 7); ctx.fill();
            ctx.font = `${W < 520 ? 9 : 11}px ${MONO}`; ctx.fillStyle = on ? 'rgba(238,241,238,0.82)' : 'rgba(238,241,238,0.5)';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(n.label, n.x + n.r + 6, n.y);
          }
          ctx.globalAlpha = 1;
        }
        if (hover) {
          const nb = neighbors.get(hover).size;
          tip.innerHTML = `<b>${hover.label}</b>${hover.hub ? `${nb} skills in this cluster` : `${hover.cat} · ${nb} connection${nb === 1 ? '' : 's'}`}`;
          tip.style.left = `${hover.x}px`; tip.style.top = `${hover.y - hover.r}px`; tip.style.opacity = 1;
        } else tip.style.opacity = 0;
      }

      function loop() {
        requestAnimationFrame(loop);
        if (!visible || !W) return;
        sim(); draw();
      }
      loop();
    }
  };
})();
