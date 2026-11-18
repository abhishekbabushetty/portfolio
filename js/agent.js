/* =========================================================
   abhi.agent — a tiny local intent agent. No server, no LLM:
   keyword-scored intents + a visible plan/retrieve/respond trace.
   ========================================================= */
(function () {
  const AS = (window.AS = window.AS || {});

  const go = (href, txt) => `<button class="act" data-goto="${href}">${txt} →</button>`;
  const mail = '<a href="mailto:abhishetty1506@gmail.com">abhishetty1506@gmail.com</a>';

  const INTENTS = [
    { id: 'greet', kw: ['hi', 'hello', 'hey', 'yo', 'sup', 'namaste', 'hola'], ans: () =>
      `<p>Hey! I'm <strong>abhi.agent</strong> — I know everything on this site about Abhishek. Ask me about his projects, stack, wins, or how to hire him.</p>` },
    { id: 'about', kw: ['who', 'about', 'yourself', 'introduce', 'background', 'summary', 'abhishek', 'tell me'], ans: () =>
      `<p>Abhishek Babu Shetty is the <strong>Co-Founder &amp; Principal Engineer of Keskur Technologies</strong>, based in Hyderabad — he built Keskur's entire product from scratch, single-handedly: web, backend, Android and iOS apps, cloud and AI. He builds agentic AI systems that reason, plan, collaborate and act.</p><p>He works across MCP, RAG, multi-agent workflows, LLMs, voice AI and computer vision, moves fast from prototype to scalable apps with FastAPI + React, and has <strong>6 national competition wins</strong>.</p>${go('#about', 'Read more')}` },
    { id: 'founder', kw: ['founder', 'cofounder', 'co-founder', 'keskur', 'startup', 'android', 'ios', 'mobile', 'scratch', 'solo', 'alone', 'end to end', 'principal', 'designation', 'title', 'role', 'position', 'current', 'now', 'company', 'ceo', 'cto'], ans: () =>
      `<p>Abhishek is the <strong>Co-Founder &amp; Principal Engineer of Keskur Technologies</strong> (since Apr 2026) — and he built the <strong>entire product from scratch, by himself</strong>:</p><ul><li><strong>Android &amp; iOS apps</strong> (React Native) and a <strong>Next.js web platform</strong></li><li><strong>FastAPI + PostgreSQL</strong> backend with Celery + Redis async pipelines</li><li>An <strong>AI layer</strong> — embeddings, semantic search, auto-organization</li><li>Firebase realtime, secure sharing, and <strong>AWS/GCP</strong> deployment</li></ul><p>One engineer, every layer.</p>${go('#founder', 'See the stack')}` },
    { id: 'projects', kw: ['project', 'projects', 'built', 'build', 'best', 'portfolio', 'work', 'lab', 'show'], ans: () =>
      `<p>20+ systems in total — 8 flagship builds with interactive models in the lab, plus 14 more in the archive. Highlights:</p><ul><li><strong>EduAI Platform</strong> — adaptive learning + AI mentor + autonomous recruiter (CrewAI, LangGraph, Graph RAG)</li><li><strong>Darwin Pilot</strong> — A* ocean routing with LSTM forecasts</li><li><strong>Medical Knowledge Retrieval</strong> — RAG over 1000+ medical pages</li></ul>${go('#projects', 'Open the lab')}` },
    { id: 'archive', kw: ['archive', 'more projects', 'other projects', 'gemma', 'reflex', 'teachpulse', 'freshguard', 'iot', 'esp32', 'aethel', 'argo', 'codemind', 'interviewer', 'steganography', 'mobius', 'colabnet', 'discharge', 'cli', 'command line'], ans: () =>
      `<p>Beyond the lab, the archive holds 14 more systems. A few standouts:</p><ul><li><strong>Gemma Reflex</strong> — autonomous workspace agent that plans, acts, verifies and self-recovers</li><li><strong>TeachPulse AI</strong> — real-time classroom engagement from live video</li><li><strong>Post-Discharge Care AI</strong> — multi-agent LangGraph care team with agentic RAG</li><li><strong>AI Command-Line Dev</strong> — a whole project from a single prompt</li><li><strong>FreshGuard</strong> — ESP32 IoT spoilage detection with Twilio voice alerts</li></ul>${go('#archive', 'Open the archive')}` },
    { id: 'eduai', kw: ['eduai', 'edu', 'learning', 'recruit', 'recruiter', 'mentor'], ans: () =>
      `<p><strong>EduAI Platform</strong> is an AI-powered learning & recruitment platform: an adaptive learning engine, a context-aware AI mentor, and an autonomous AI recruiter. Built with CrewAI, LangGraph, Graph RAG, Gemini, FastAPI, React Native, Twilio and pg_vector. It also won at HackXcelerate 2K25.</p><p><a href="https://abhishekbabushetty-ccbp.netlify.app/" target="_blank" rel="noopener">Live demo ↗</a></p>` },
    { id: 'medical', kw: ['medical', 'health', 'faiss', 'flan', 'medicine'], ans: () =>
      `<p><strong>Medical Knowledge Retrieval</strong> indexes 1000+ medical pages and uses FAISS, Sentence Transformers and Flan-T5 for precise, grounded answers. In the lab, your cursor becomes the query vector.</p>${go('#projects', 'See it')}` },
    { id: 'darwin', kw: ['darwin', 'ship', 'route', 'routing', 'ocean', 'a*', 'astar', 'marine'], ans: () =>
      `<p><strong>Darwin Pilot</strong> is a multi-role ocean routing system: A* pathfinding for safe, fuel-efficient marine routes using live ocean conditions, with LSTM/RNN predictions. The same ideas powered his ship-route optimization entry at Hacknite Bangalore.</p>${go('#projects', 'Route a ship')}` },
    { id: 'synthetic', kw: ['synthetic', 'diffusion', 'stable', 'yolo', 'yolov8', 'llama', 'generate data'], ans: () =>
      `<p>The <strong>Synthetic Data Pipeline</strong> uses LLaMA + Stable Diffusion to generate training data that boosts YOLOv8. At MulticoreWare, a pipeline in this spirit improved YOLO accuracy by <strong>32%</strong>.</p>` },
    { id: 'ide', kw: ['ide', 'editor', 'monaco', 'vscode', 'code editor'], ans: () =>
      `<p>The <strong>Full-Stack Online IDE</strong> is a VS Code-inspired web IDE with a real-time terminal, multi-language support and Gemini-powered code assistance (React, Node.js, Monaco).</p>` },
    { id: 'messaging', kw: ['messaging', 'whatsapp', 'message', 'voice app', 'translate', 'language'], ans: () =>
      `<p>The <strong>Messaging Assistant</strong> is a voice-activated AI app: speak in any language and it refines the message into polished English for WhatsApp.</p>` },
    { id: 'interior', kw: ['interior', 'room', 'controlnet', 'design room', 'furniture'], ans: () =>
      `<p><strong>Room Interior Designer</strong> takes a photo of an empty room and generates professional interior designs with Stable Diffusion + ControlNet. Drag across its lab card for a before/after.</p>` },
    { id: 'skills', kw: ['skill', 'skills', 'stack', 'tech', 'technologies', 'language', 'framework', 'know', 'tools', 'python'], ans: () =>
      `<p>Core stack:</p><ul><li><strong>AI</strong> — CrewAI, LangGraph, AutoGen, LangChain, RAG, PyTorch, TensorFlow, YOLOv8, OpenCV</li><li><strong>Backend</strong> — Python, FastAPI, Node.js, PostgreSQL, MongoDB, FAISS, Redis, Celery</li><li><strong>Frontend</strong> — React, React Native, Next.js</li><li><strong>Ops</strong> — Docker, GCP/AWS, LangSmith, Linux</li></ul>${go('#skills', 'Explore the graph')}` },
    { id: 'agentic', kw: ['agent', 'agents', 'agentic', 'crewai', 'langgraph', 'autogen', 'mcp', 'multi-agent', 'multiagent', 'llm', 'rag'], ans: () =>
      `<p>Agentic AI is Abhishek's home turf. Recent example: at Haystek he built an <strong>autonomous SQL Intelligence Agent</strong> with a multi-agent pipeline (clarify → plan → generate SQL → self-heal), validated on 500+ tables across 3 production databases.</p><p>Like me, a little — but with real LLMs.</p>${go('#experience', 'See the trace')}` },
    { id: 'experience', kw: ['experience', 'job', 'jobs', 'intern', 'internship', 'companies', 'haystek', 'multicoreware', 'career', 'history', 'previous'], ans: () =>
      `<ul><li><strong>Keskur Technologies</strong> — Co-Founder &amp; Principal Engineer (Apr 2026 – now)</li><li><strong>Haystek Technologies</strong> — AI/ML Intern (Jan – Apr 2026)</li><li><strong>MulticoreWare</strong> — AI Intern (Jul 2023 – May 2025)</li><li><strong>Kareoss</strong> — Web Development Lead (Jan 2024 – Aug 2025)</li></ul>${go('#experience', 'Full trace')}` },
    { id: 'wins', kw: ['hackathon', 'hackathons', 'win', 'wins', 'won', 'award', 'awards', 'achievement', 'achievements', 'prize', 'competition'], ans: () =>
      `<p><strong>6 national competition wins</strong>, including CodeConflict (1st Prize), Synergia 2K25 (1st Place), InnovArc '25 (2nd Prize), HackXcelerate 2K25, Hacknite Bangalore and Brilliant Bharath.</p>${go('#achievements', 'Spin the ring')}` },
    { id: 'education', kw: ['education', 'college', 'degree', 'cgpa', 'gpa', 'study', 'university', 'btech', 'school', 'marks'], ans: () =>
      `<p><strong>B.Tech, CSE (AI & ML)</strong> at Kalasalingam Academy of Research and Education — CGPA <strong>9.11</strong> (2022–2026). Before that: 96.3% in Intermediate (MPC) and a perfect 10.0 CGPA in Class X.</p>${go('#education', 'Foundations')}` },
    { id: 'hire', kw: ['hire', 'hiring', 'contact', 'email', 'reach', 'phone', 'call', 'available', 'opportunity', 'job offer', 'recruit him', 'connect', 'linkedin'], ans: () =>
      `<p>He's open to new opportunities. Fastest route: ${mail}</p><p>Also on <a href="https://www.linkedin.com/in/abhishek-babu-shetty/" target="_blank" rel="noopener">LinkedIn ↗</a> and <a href="https://github.com/abhishekbabushetty" target="_blank" rel="noopener">GitHub ↗</a>.</p>${go('#contact', 'Contact section')}` },
    { id: 'location', kw: ['where', 'location', 'based', 'hyderabad', 'city', 'relocate', 'remote', 'india'], ans: () =>
      `<p>Based in <strong>Hyderabad, India</strong> (IST, UTC+5:30). For relocation or remote setups, just ask him at ${mail}.</p>` },
    { id: 'resume', kw: ['resume', 'cv', 'pdf'], ans: () =>
      `<p>There's no PDF on this page yet — but this whole site is the résumé, in executable form. For a copy, email ${mail}.</p>` },
    { id: 'joke', kw: ['joke', 'funny', 'fun fact', 'fun'], ans: () =>
      `<p>Why did the multi-agent system break up? Too many <strong>handoffs</strong>, not enough <strong>context</strong>.</p><p>Fun fact: try the Konami code on this page.</p>` },
    { id: 'help', kw: ['help', 'commands', 'what can you do', '?'], ans: () =>
      `<p>Try asking:</p><ul><li>"What's his best project?"</li><li>"What's his tech stack?"</li><li>"Tell me about the hackathon wins"</li><li>"How do I hire him?"</li></ul><p>Commands: <strong>/clear</strong>, <strong>sudo hire abhishek</strong>.</p>` }
  ];

  const CHIPS = ['What does he do now?', 'Best project?', 'Tech stack', 'Agentic AI work', 'Hackathon wins', 'Experience', 'How to hire him'];

  // edit distance ≤ 1 (or ≤ 2 for long words) so "hackthon", "experiance", "projcts" still land
  function near(a, b) {
    if (Math.abs(a.length - b.length) > 2) return false;
    const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n] <= (b.length >= 8 ? 2 : 1);
  }
  function score(q) {
    const s = ' ' + q.toLowerCase().replace(/[^\w*?\s-]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const tokens = s.trim().split(' ').filter((t) => t.length >= 5);
    let best = null, bs = 0;
    for (const it of INTENTS) {
      let sc = 0;
      for (const k of it.kw) {
        if (k.includes(' ')) { if (s.includes(k)) sc += 2; }
        else if (s.includes(' ' + k + ' ') || (k.length > 4 && s.includes(k))) sc += k.length > 3 ? 1.2 : 1;
        else if (k.length >= 5 && tokens.some((t) => near(t, k))) sc += 0.9;
      }
      if (sc > bs) { bs = sc; best = it; }
    }
    return { intent: best, score: bs };
  }

  AS.agent = {
    init() {
      const root = document.getElementById('agent');
      if (!root) return;
      const log = document.getElementById('agentLog');
      const form = document.getElementById('agentForm');
      const input = document.getElementById('agentInput');
      const chips = document.getElementById('agentChips');
      let lastFocus = null, greeted = false, busy = false;

      CHIPS.forEach((c) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = c;
        b.addEventListener('click', () => ask(c));
        chips.appendChild(b);
      });

      function open() {
        if (root.classList.contains('is-open')) return;
        lastFocus = document.activeElement;
        root.classList.add('is-open'); root.setAttribute('aria-hidden', 'false');
        AS.lenis && AS.lenis.stop();
        setTimeout(() => input.focus(), 80);
        if (!greeted) {
          greeted = true;
          bot(`<p>Hi, I'm <strong>abhi.agent</strong> 👋 — a small intent agent that knows Abhishek's work. Ask anything, or tap a suggestion.</p>`, null, true);
        }
      }
      function close() {
        if (!root.classList.contains('is-open')) return;
        root.classList.remove('is-open'); root.setAttribute('aria-hidden', 'true');
        AS.lenis && AS.lenis.start();
        lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
      }
      AS.agent.open = open; AS.agent.close = close;

      document.addEventListener('click', (e) => {
        const o = e.target.closest('[data-agent-open]');
        if (o) { e.preventDefault(); open(); return; }
        if (e.target.closest('[data-agent-close]')) close();
        const g = e.target.closest('[data-goto]');
        if (g && root.contains(g)) { close(); setTimeout(() => AS.scrollTo && AS.scrollTo(g.dataset.goto), 250); }
      });
      document.addEventListener('keydown', (e) => {
        const typing = /input|textarea|select/i.test(document.activeElement && document.activeElement.tagName);
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); root.classList.contains('is-open') ? close() : open(); }
        else if (e.key === '/' && !typing) { e.preventDefault(); open(); }
        else if (e.key === 'Escape') close();
        else if (e.key === 'Tab' && root.classList.contains('is-open')) {
          const f = [...root.querySelectorAll('button, input, a[href]')].filter((x) => x.offsetParent !== null);
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });

      form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value.trim(); if (v) ask(v); });

      function scrollDown() { log.scrollTop = log.scrollHeight; }

      function user(txt) {
        const d = document.createElement('div'); d.className = 'msg msg--user'; d.textContent = txt;
        log.appendChild(d); scrollDown();
      }

      function wordify(el) {
        let i = 0;
        const walk = (node) => {
          [...node.childNodes].forEach((c) => {
            if (c.nodeType === 3) {
              const frag = document.createDocumentFragment();
              c.textContent.split(/(\s+)/).forEach((w) => {
                if (!w) return;
                if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
                const s = document.createElement('span'); s.className = 'wd'; s.style.animationDelay = `${Math.min(i++ * 18, 1400)}ms`; s.textContent = w;
                frag.appendChild(s);
              });
              c.replaceWith(frag);
            } else if (c.nodeType === 1 && c.tagName !== 'BUTTON') walk(c);
            else if (c.nodeType === 1) { c.classList.add('wd'); c.style.animationDelay = `${Math.min(i++ * 18, 1400)}ms`; }
          });
        };
        walk(el);
      }

      function bot(html, meta, instant) {
        const d = document.createElement('div'); d.className = 'msg msg--bot'; d.innerHTML = html;
        if (!instant) wordify(d);
        log.appendChild(d);
        if (meta) { const m = document.createElement('div'); m.className = 'trace'; m.innerHTML = `<span class="step done">${meta}</span>`; log.insertBefore(m, d); }
        scrollDown();
        setTimeout(scrollDown, 400);
      }

      function ask(q) {
        if (busy) return;
        input.value = '';
        user(q);
        const lower = q.toLowerCase().trim();
        if (lower === '/clear' || lower === 'clear') { log.innerHTML = ''; return; }
        if (lower.includes('sudo') && lower.includes('hire')) {
          bot(`<p>[sudo] permission granted ✓</p><p>Executing <strong>hire --candidate="Abhishek Babu Shetty" --priority=max</strong>… opening your mail client.</p>`);
          AS.particles && AS.particles.burst();
          setTimeout(() => { window.location.href = 'mailto:abhishetty1506@gmail.com?subject=Let%27s%20work%20together'; }, 1400);
          return;
        }
        busy = true; root.classList.add('is-thinking');
        const t0 = performance.now();
        const { intent, score: sc } = score(q);
        const tr = document.createElement('div'); tr.className = 'trace';
        const steps = ['parsing intent', 'retrieving memory · k=3', 'composing answer'];
        tr.innerHTML = steps.map((s) => `<span class="step">${s}</span>`).join('');
        log.appendChild(tr); scrollDown();
        const els = tr.querySelectorAll('.step');
        steps.forEach((_, i) => setTimeout(() => els[i].classList.add('done'), 180 + i * 220));
        setTimeout(() => {
          tr.remove();
          const ms = Math.round(performance.now() - t0);
          if (intent && sc >= 1) bot(intent.ans(), `intent: ${intent.id} · confidence ${Math.min(0.99, 0.55 + sc * 0.15).toFixed(2)} · ${ms}ms`);
          else bot(`<p>I couldn't map that to my memory yet. I'm a small local agent, not an LLM — try asking about <strong>projects</strong>, <strong>stack</strong>, <strong>experience</strong>, <strong>wins</strong> or <strong>hiring</strong>.</p><p>Or ask the real Abhishek: ${mail}</p>`, `intent: unknown · fallback · ${ms}ms`);
          busy = false; root.classList.remove('is-thinking');
        }, 900);
      }
    }
  };
})();
