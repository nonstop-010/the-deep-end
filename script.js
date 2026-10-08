/* =============================================================
   THE DEEP END: interactive parts
   The page still reads fine without JavaScript. This file adds
   the depth gauge, bubbles, and the games.
   ============================================================= */

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const rand = (min, max) => min + Math.random() * (max - min);

  /* ---------- Depth gauge ----------
     Every section has data-depth-start / data-depth-end (in meters).
     As you scroll through a section, the depth slides between the two. */

  const zones = $$("[data-zone]");
  const gDepth = $("#gDepth");
  const gFt = $("#gFt");
  const gAtm = $("#gAtm");
  const gZone = $("#gZone");
  const pillDepth = $("#pillDepth");
  const pillZone = $("#pillZone");
  const gSub = $("#gSub");
  const zoneLinks = $$("#gaugeTrack a");
  let ticking = false;

  function updateGauge() {
    ticking = false;
    const line = window.innerHeight * 0.45;
    let idx = 0;
    let progress = 0;

    zones.forEach((zone, i) => {
      const box = zone.getBoundingClientRect();
      if (box.top <= line) {
        idx = i;
        progress = Math.min(1, Math.max(0, (line - box.top) / box.height));
      }
    });

    const zone = zones[idx];
    const start = Number(zone.dataset.depthStart);
    const end = Number(zone.dataset.depthEnd);
    const depth = start + (end - start) * progress;
    const atm = 1 + depth / 10; // about +1 atmosphere every 10 m of seawater

    gDepth.textContent = fmt(depth);
    gFt.textContent = fmt(depth * 3.28084);
    gAtm.textContent = fmt(atm);
    gZone.textContent = zone.dataset.zone;
    pillDepth.textContent = `${fmt(depth)} m`;
    pillZone.textContent = zone.dataset.zone;

    // Slide the little sub between the zone labels on the gauge
    if (zoneLinks.length) {
      const centers = zoneLinks.map((a) => a.offsetTop + a.offsetHeight / 2);
      const next = Math.min(idx + 1, centers.length - 1);
      const y = centers[idx] + (centers[next] - centers[idx]) * progress;
      gSub.style.top = `${y}px`;
      zoneLinks.forEach((a, i) => a.classList.toggle("active", i === idx));
    }
  }

  function requestGauge() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateGauge);
    }
  }

  if (zones.length && gDepth) {
    window.addEventListener("scroll", requestGauge, { passive: true });
    window.addEventListener("resize", requestGauge);
    updateGauge();
  }

  /* ---------- Bubbles + marine snow ---------- */

  function sprinkle(container, count, make) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) frag.appendChild(make());
    container.appendChild(frag);
  }

  const small = window.innerWidth < 700;

  $$(".bubbles").forEach((el) =>
    sprinkle(el, small ? 10 : 18, () => {
      const b = document.createElement("span");
      const d = rand(10, 20);
      b.className = "bubble";
      b.style.cssText =
        `--x:${rand(0, 100)}%;--b:${rand(-5, 60)}%;--s:${rand(6, 18)}px;` +
        `--d:${d}s;--delay:${-rand(0, d)}s;--drift:${rand(-40, 40)}px`;
      return b;
    })
  );

  $$(".snow").forEach((el) =>
    sprinkle(el, small ? 20 : 38, () => {
      const f = document.createElement("span");
      const d = rand(24, 48);
      f.className = "flake";
      f.style.cssText =
        `--x:${rand(0, 100)}%;--t:${rand(-10, 95)}%;--s:${rand(1.5, 3.5)}px;` +
        `--o:${rand(0.12, 0.45)};--d:${d}s;--delay:${-rand(0, d)}s;--drift:${rand(-30, 30)}px`;
      return f;
    })
  );

  /* ---------- Breathe button ---------- */

  const breathBtn = $("#breathBtn");
  const breathCount = $("#breathCount");
  const breathMsg = $("#breathMsg");
  let breaths = 0;

  breathBtn?.addEventListener("click", () => {
    breaths += 1;
    const fromOcean = breaths % 2 === 0;
    breathCount.textContent = `Breath #${breaths}`;
    breathMsg.textContent = fromOcean
      ? "Picture this one as the ocean's. About half of Earth's oxygen is made at sea."
      : "Picture this one as land's: trees, grass, maybe a houseplant.";
    breathBtn.classList.toggle("ocean", fromOcean);
    breathBtn.querySelector("span").textContent = "Breathe again";
    breathBtn.classList.remove("inhale");
    void breathBtn.offsetWidth; // restart the animation
    breathBtn.classList.add("inhale");
    setTimeout(() => breathBtn.classList.remove("inhale"), 800);
  });

  /* ---------- Flashlight hunt ---------- */

  const stage = $("#stage");

  if (stage) {
    const critters = $$(".critter", stage);
    const countEl = $("#huntCount");
    const lightsBtn = $("#lightsBtn");
    const found = new Set();

    const radius = () => parseFloat(getComputedStyle(stage).getPropertyValue("--lr")) || 120;

    function centerOf(critter) {
      const art = $(".critter-art", critter);
      return {
        x: critter.offsetLeft + art.offsetLeft + art.offsetWidth / 2,
        y: critter.offsetTop + art.offsetTop + art.offsetHeight / 2,
      };
    }

    function updateCount() {
      countEl.textContent =
        found.size === critters.length
          ? `All ${critters.length} found. You'd make a great deep-sea biologist.`
          : `${found.size} of ${critters.length} found`;
    }

    function markFound(critter) {
      if (found.has(critter)) return;
      found.add(critter);
      critter.classList.add("found");
      updateCount();
    }

    function shine(x, y, discover = true) {
      stage.style.setProperty("--lx", `${x}px`);
      stage.style.setProperty("--ly", `${y}px`);
      if (!discover) return;
      const reach = radius() * 0.7;
      critters.forEach((c) => {
        const p = centerOf(c);
        if (Math.hypot(p.x - x, p.y - y) < reach) markFound(c);
      });
    }

    function fromPointer(e) {
      const box = stage.getBoundingClientRect();
      shine(e.clientX - box.left, e.clientY - box.top);
    }

    stage.addEventListener("pointermove", fromPointer);
    stage.addEventListener("pointerdown", fromPointer);

    critters.forEach((c) => {
      const spotlight = () => {
        const p = centerOf(c);
        shine(p.x, p.y, false);
        markFound(c);
      };
      c.addEventListener("focus", spotlight);
      c.addEventListener("click", spotlight);
    });

    lightsBtn.addEventListener("click", () => {
      const on = stage.classList.toggle("lit");
      lightsBtn.setAttribute("aria-pressed", String(on));
      lightsBtn.textContent = on ? "Turn off the lights" : "Turn on the lights";
    });

    // Start the beam in an empty patch of water so there's something to discover
    shine(stage.clientWidth * 0.5, stage.clientHeight * 0.5, false);
    updateCount();
  }

  /* ---------- Myth or fact ---------- */

  const mfCards = $$(".mf-card");
  const mfScore = $("#mfScore");
  let answered = 0;
  let correct = 0;

  mfCards.forEach((card) => {
    const buttons = $$("[data-guess]", card);
    buttons.forEach((btn) =>
      btn.addEventListener("click", () => {
        if (card.dataset.done) return;
        card.dataset.done = "yes";
        const right = btn.dataset.guess === card.dataset.answer;
        answered += 1;
        if (right) correct += 1;

        card.classList.add(right ? "right" : "wrong");
        $(".mf-result", card).textContent = right ? "You got it." : "Not quite.";
        $(".mf-reveal", card).hidden = false;
        buttons.forEach((b) => {
          b.disabled = true;
          b.classList.toggle("picked", b === btn);
        });

        let text = `${correct} of ${answered} right`;
        if (answered === mfCards.length) {
          text += correct === mfCards.length ? ": perfect score" : `: nice dive`;
        }
        mfScore.textContent = text;
      })
    );
  });

  /* ---------- Which earth scientist are you? ---------- */

  const PATHS = {
    explorer: {
      name: "Ocean Explorer",
      blurb: "You want to see things nobody has seen before. Deep-sea biologists and ROV pilots get to do exactly that, and new species turn up on almost every expedition.",
    },
    storm: {
      name: "Storm Tracker",
      blurb: "You're drawn to the sky's drama. Meteorologists and atmospheric scientists turn chaos into forecasts that keep millions of people safe.",
    },
    detective: {
      name: "Planet Detective",
      blurb: "You like figuring out why. Geologists read rocks like a history book and work out how earthquakes, volcanoes, and glaciers shaped the world.",
    },
    coder: {
      name: "Climate Coder",
      blurb: "You trust data. Climate and ocean data scientists use satellites, sensors, and code to predict what the planet will do next.",
    },
    guardian: {
      name: "Coast Guardian",
      blurb: "You want to fix things. Coastal engineers, planners, and restoration ecologists protect cities like New York from flooding while bringing nature back.",
    },
    storyteller: {
      name: "Science Storyteller",
      blurb: "You can make people care. Science communicators, journalists, and educators are how discoveries actually reach the rest of the world. (Kind of like this website.)",
    },
  };

  const QUIZ = [
    {
      q: "It's Saturday. Where are you?",
      a: [
        ["detective", "Hiking somewhere with cool rock layers"],
        ["storyteller", "Editing a video for my friends"],
        ["explorer", "At the beach, flipping rocks to see what lives under them"],
        ["guardian", "Volunteering at a park or beach cleanup"],
        ["coder", "Building something on my laptop"],
        ["storm", "Glued to the radar app because a storm is rolling in"],
      ],
    },
    {
      q: "Pick a superpower.",
      a: [
        ["coder", "Predict the future"],
        ["explorer", "Breathe underwater"],
        ["storm", "Control the weather"],
        ["storyteller", "Make anyone care about anything"],
        ["detective", "See through solid rock"],
        ["guardian", "Protect a whole city"],
      ],
    },
    {
      q: "In a group project, you're the one who...",
      a: [
        ["guardian", "Makes the plan and keeps everyone on track"],
        ["detective", "Figures out why our results look weird"],
        ["storm", "Stays calm when everything goes wrong at the last minute"],
        ["explorer", "Volunteers for the hands-on part"],
        ["storyteller", "Gives the presentation"],
        ["coder", "Finds the data and makes the graphs"],
      ],
    },
    {
      q: "Which headline do you click first?",
      a: [
        ["storm", "Hurricane jumps from Category 1 to 5 in a day"],
        ["guardian", "Oyster reefs could help protect NYC from storms"],
        ["coder", "New AI model predicts floods days earlier"],
        ["explorer", "Glowing new species found 3 km down"],
        ["storyteller", "Why nobody's talking about the deep sea"],
        ["detective", "Volcano erupts beneath the ice"],
      ],
    },
    {
      q: "Pick your gear.",
      a: [
        ["explorer", "An underwater robot"],
        ["coder", "A laptop full of satellite data"],
        ["detective", "A rock hammer"],
        ["storm", "A weather balloon"],
        ["storyteller", "A camera and a mic"],
        ["guardian", "A hard hat and blueprints"],
      ],
    },
  ];

  const quizBody = $("#quizBody");
  const quizProgress = $("#quizProgress");
  const quizBar = $("#quizBar");
  let picks = [];

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function renderQuestion(i) {
    const item = QUIZ[i];
    quizProgress.textContent = `Question ${i + 1} of ${QUIZ.length}`;
    quizBar.style.setProperty("--p", `${(i / QUIZ.length) * 100}%`);
    quizBody.replaceChildren();

    const q = el("p", "quiz-q", item.q);
    q.id = "quizQ";
    const opts = el("div", "quiz-opts");
    opts.setAttribute("role", "group");
    opts.setAttribute("aria-labelledby", "quizQ");

    item.a.forEach(([path, label]) => {
      const b = el("button", "quiz-opt", label);
      b.type = "button";
      b.addEventListener("click", () => {
        picks.push(path);
        if (i + 1 < QUIZ.length) {
          renderQuestion(i + 1);
          $(".quiz-opt", quizBody)?.focus({ preventScroll: true });
        } else {
          renderResult();
        }
      });
      opts.appendChild(b);
    });

    quizBody.append(q, opts);
  }

  function winner() {
    const score = {};
    picks.forEach((p) => (score[p] = (score[p] || 0) + 1));
    const best = Math.max(...Object.values(score));
    // On a tie, the most recent answer wins
    for (let i = picks.length - 1; i >= 0; i--) {
      if (score[picks[i]] === best) return picks[i];
    }
    return picks[0];
  }

  function renderResult() {
    const key = winner();
    const path = PATHS[key];
    quizProgress.textContent = "Done";
    quizBar.style.setProperty("--p", "100%");
    quizBody.replaceChildren();

    const box = el("div", "quiz-result");
    box.setAttribute("tabindex", "-1");
    box.append(el("p", "eyebrow", "You're a..."), el("h4", "", path.name), el("p", "", path.blurb));

    const actions = el("div", "hero-actions");
    const see = el("a", "btn btn-coral", "See your path");
    see.href = `#path-${key}`;
    const again = el("button", "btn btn-glass", "Take it again");
    again.type = "button";
    again.addEventListener("click", startQuiz);
    actions.append(see, again);
    box.append(actions);
    quizBody.append(box);
    box.focus({ preventScroll: true });

    $$(".path").forEach((p) => p.classList.toggle("match", p.id === `path-${key}`));
  }

  function startQuiz() {
    picks = [];
    $$(".path").forEach((p) => p.classList.remove("match"));
    renderQuestion(0);
  }

  if (quizBody) startQuiz();

  /* ---------- Spread the word ---------- */

  const FACTS = [
    "About half of Earth's oxygen is made in the ocean, mostly by tiny drifting phytoplankton.",
    "The ocean has soaked up about 90% of the extra heat trapped by greenhouse gases.",
    "As of 2026, only 28.7% of the seafloor has been mapped in high detail.",
    "Explorers have seen less than 0.001% of the deep seafloor, according to NOAA.",
    "Mount Everest would fit inside the Mariana Trench with about 2 km of water still above its peak.",
    "Long Island is made largely of rock and sand left behind by melting glaciers about 20,000 years ago.",
    "The Hudson River is tidal all the way to Troy, about 153 miles north of New York Harbor.",
    "In 17 years of deep-sea video off California, 76% of the animals scientists filmed could make their own light.",
    "Every night, huge numbers of deep-sea animals swim up toward the surface to feed. It's the biggest migration on Earth.",
    "A cancer drug called trabectedin was first discovered in a sea squirt.",
    "Life at hydrothermal vents runs on chemicals instead of sunlight. Scientists first saw it in 1977.",
    "Many deep-sea animals are red, because red light doesn't reach the deep. Down there, red looks black.",
    "One Cuvier's beaked whale was recorded holding its breath for 222 minutes. That's over 3.5 hours.",
    "The 2024 New Jersey earthquake got more 'Did You Feel It?' reports to the USGS than any earthquake on record.",
  ];

  const factEl = $("#shareFact");
  const newFactBtn = $("#newFact");
  const copyFactBtn = $("#copyFact");
  const shareStatus = $("#shareStatus");
  let factIndex = 0;

  function showFact(i) {
    factIndex = (i + FACTS.length) % FACTS.length;
    factEl.textContent = FACTS[factIndex];
    shareStatus.textContent = "";
  }

  newFactBtn?.addEventListener("click", () => showFact(factIndex + 1));

  copyFactBtn?.addEventListener("click", () => {
    const text = `Did you know? ${FACTS[factIndex]}`;
    const selectFallback = () => {
      const range = document.createRange();
      range.selectNodeContents(factEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      shareStatus.textContent = "Selected. Press Ctrl+C (or Cmd+C) to copy.";
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => (shareStatus.textContent = "Copied. Now send it to one person."))
        .catch(selectFallback);
    } else {
      selectFallback();
    }
  });

  if (factEl) showFact(Math.floor(Math.random() * FACTS.length));

  /* ---------- Back to the surface ---------- */

  $("#ascendBtn")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    $("#surface h1")?.setAttribute("tabindex", "-1");
    $("#surface h1")?.focus({ preventScroll: true });
  });
})();
