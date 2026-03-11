(() => {
  // ── Debug flag ──────────────────────────────────────────────
  const GOD_MODE = false; // set true to test levels without dying

  // ── Ko-fi donation URL — swap this when your account is set up ──
  const KOFI_URL = "https://ko-fi.com/findepstein";

  // ── DOM refs ────────────────────────────────────────────────
  const canvas       = document.getElementById("game");
  const ctx          = canvas.getContext("2d");
  const levelNameEl  = document.getElementById("levelName");
  const scoreEl      = document.getElementById("score");
  const livesEl      = document.getElementById("lives");
  const statusEl     = document.getElementById("status");
  const enemyListEl  = document.getElementById("enemyList");
  const soundToggle  = document.getElementById("soundToggle");
  const showDpadTog  = document.getElementById("showDpad");
  const showMmTog    = document.getElementById("showMinimap");
  const timerToggle  = document.getElementById("timerToggle");
  const timerWrap    = document.getElementById("timerWrap");
  const timeLeftEl   = document.getElementById("timeLeft");
  const dpadEl       = document.getElementById("dpad");
  const restartLvlBtn = document.getElementById("restartLevel");
  const restartGameBtn = document.getElementById("restartGame");
  const modal        = document.getElementById("modal");
  const modalTitle   = document.getElementById("modalTitle");
  const modalText    = document.getElementById("modalText");
  const modalBtn     = document.getElementById("modalBtn");
  const modalBonus   = document.getElementById("modalBonus");
  const modalBonusVal = document.getElementById("modalBonusVal");
  const startScreen  = document.getElementById("startScreen");
  const startBtn     = document.getElementById("startBtn");
  const hsBanner     = document.getElementById("hsBanner");
  const comboHud     = document.getElementById("comboHud");
  const comboEl      = document.getElementById("combo");
  const donateOverlay = document.getElementById("donateOverlay");
  const donateBtn    = document.getElementById("donateBtn");
  const donateClose  = document.getElementById("donateClose");
  const kofiLink     = document.getElementById("kofiLink");

  // ── High scores ─────────────────────────────────────────────
  const HS_KEY = "findEpstine_hs_v1";
  const getHS  = () => parseInt(localStorage.getItem(HS_KEY) || "0", 10);
  const saveHS = (s) => { if (s > getHS()) localStorage.setItem(HS_KEY, String(s)); };

  const hs = getHS();
  if (hs > 0) hsBanner.textContent = `Best Score: ${hs.toLocaleString()}`;

  // ── Start screen ────────────────────────────────────────────
  let gameStarted = false;
  startBtn.addEventListener("click", () => {
    startScreen.style.animation = "fadeOut 0.38s ease-out forwards";
    setTimeout(() => { startScreen.style.display = "none"; gameStarted = true; }, 380);
  });

  // ── Donate modal ─────────────────────────────────────────────
  kofiLink.href = KOFI_URL;
  donateBtn.addEventListener("click", () => donateOverlay.classList.remove("hidden"));
  donateClose.addEventListener("click", () => donateOverlay.classList.add("hidden"));
  donateOverlay.addEventListener("click", (e) => {
    if (e.target === donateOverlay) donateOverlay.classList.add("hidden");
  });

  // ── Sound ───────────────────────────────────────────────────
  let audioCtx = null;
  function beep(freq = 440, dur = 0.05, type = "sine", vol = 0.05) {
    if (!soundToggle.checked) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }

  // ── Canvas resizing ─────────────────────────────────────────
  function resizeCanvas() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w    = Math.max(320, Math.floor(rect.width));
    const h    = Math.max(320, Math.floor(rect.height));
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // ── Config ──────────────────────────────────────────────────
  const TILE  = 24;
  const WALL  = "#";
  const DOT   = ".";
  const POWER = "o";
  const START = "S";
  const EXIT  = "X";

  const clamp   = (v, a, b) => Math.max(a, Math.min(b, v));
  const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const choice  = (arr)  => arr[randInt(0, arr.length - 1)];
  const key     = (tx, ty) => `${tx},${ty}`;

  // ── Camera ──────────────────────────────────────────────────
  let cameraX = 0, cameraY = 0;
  function updateCamera(px, py, mpW, mpH) {
    const vw = canvas.clientWidth, vh = canvas.clientHeight;
    cameraX = clamp(px - vw / 2, 0, Math.max(0, mpW - vw));
    cameraY = clamp(py - vh / 2, 0, Math.max(0, mpH - vh));
  }
  function w2s(x, y)    { return { x: x - cameraX, y: y - cameraY }; }
  function tileCenter(tx, ty) { return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }; }

  // ── Level Themes ────────────────────────────────────────────
  const THEMES = [
    null, // 0 unused
    { // 1 — Private Jet
      floorA: '#0b1526', floorB: '#0d1c38',
      wallTop: '#1a3766', wallFront: '#102b52', wallEdge: '#2a5299',
      exitGlow: '#00cfff', accentCol: '#60a5fa'
    },
    { // 2 — Dock / Harbour
      floorA: '#130d05', floorB: '#1a1108',
      wallTop: '#3e2710', wallFront: '#2e1c0b', wallEdge: '#60391a',
      exitGlow: '#48cae4', accentCol: '#81c784'
    },
    { // 3 — Jungle Path
      floorA: '#081208', floorB: '#0b180b',
      wallTop: '#1b3c1b', wallFront: '#132c13', wallEdge: '#285c28',
      exitGlow: '#69f0ae', accentCol: '#86efac'
    },
    { // 4 — The Island
      floorA: '#131005', floorB: '#1b1607',
      wallTop: '#3b2e0a', wallFront: '#2c2207', wallEdge: '#5c4912',
      exitGlow: '#ffd54f', accentCol: '#fbbf24'
    },
    { // 5 — The Mansion
      floorA: '#0d0918', floorB: '#110d22',
      wallTop: '#2c1a52', wallFront: '#201040', wallEdge: '#46228c',
      exitGlow: '#d8b4fe', accentCol: '#c084fc'
    },
    { // 6 — The Bedroom
      floorA: '#090204', floorB: '#110407',
      wallTop: '#2a0808', wallFront: '#1c0505', wallEdge: '#481010',
      exitGlow: '#ff5252', accentCol: '#fca5a5'
    }
  ];
  function getTheme() { return THEMES[clamp(levelIndex + 1, 1, THEMES.length - 1)]; }

  // ── Particles ────────────────────────────────────────────────
  let particles = [];
  function spawnParticles(wx, wy, color, count = 8, spd = 55) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const s = spd * (0.55 + Math.random() * 0.8);
      particles.push({ wx, wy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.0, color, r: 1.6 + Math.random() * 2.4 });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.wx += p.vx * dt; p.wy += p.vy * dt;
      p.vx *= 0.86; p.vy *= 0.86;
      p.life -= dt * 2.2;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }
  function drawParticles() {
    for (const p of particles) {
      const sp = w2s(p.wx, p.wy);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, p.r * Math.max(0.1, p.life), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Hit flash + game tick ────────────────────────────────────
  let hitFlash = 0;
  const HIT_FLASH_DUR = 0.45;
  let gameTick = 0;

  // ── Combo system ─────────────────────────────────────────────
  let combo = 1, comboTimer = 0;
  const COMBO_TIMEOUT = 3.0, MAX_COMBO = 8;
  function addCombo() {
    combo = Math.min(combo + 1, MAX_COMBO);
    comboTimer = COMBO_TIMEOUT;
    comboHud.classList.remove("hidden");
    comboEl.textContent = `x${combo}`;
  }
  function resetCombo() {
    combo = 1; comboTimer = 0;
    comboHud.classList.add("hidden");
  }
  function updateCombo(dt) {
    if (combo > 1) { comboTimer -= dt; if (comboTimer <= 0) resetCombo(); }
  }

  // ── Pizza attack ────────────────────────────────────────────────
  let pizzas = [];
  const PIZZA_SPEED_PX  = TILE * 18; // crosses a 31-wide map in ~1.4s

  function firePizza() {
    if (!gameStarted || state !== "playing") return;
    const d = player.lastDir;
    if (!d.x && !d.y) return;
    const wc = tileCenter(player.tx, player.ty);
    const initAngle = Math.atan2(d.y, d.x);
    pizzas.push({ wx: wc.x, wy: wc.y, dir: { x: d.x, y: d.y }, angle: initAngle });
    beep(380, 0.06, "sawtooth", 0.04);
  }

  function updatePizzas(dt) {
    for (let i = pizzas.length - 1; i >= 0; i--) {
      const pz = pizzas[i];
      pz.wx    += pz.dir.x * PIZZA_SPEED_PX * dt;
      pz.wy    += pz.dir.y * PIZZA_SPEED_PX * dt;
      pz.angle += 9 * dt; // spin!

      // Wall hit
      const tx = Math.floor(pz.wx / TILE), ty = Math.floor(pz.wy / TILE);
      if (!isWalkable(tx, ty)) {
        spawnParticles(pz.wx, pz.wy, "#f97316", 8, 45);
        pizzas.splice(i, 1); continue;
      }

      // Enemy hit
      let hit = false;
      for (const e of enemies) {
        if (e.dead) continue;
        const dx = e.x - pz.wx, dy = e.y - pz.wy;
        if (Math.sqrt(dx * dx + dy * dy) < TILE * 0.85) {
          spawnParticles(pz.wx, pz.wy, "#f97316", 12, 70);
          spawnParticles(pz.wx, pz.wy, e.color,  10, 55);
          e.dead = true; e.deadTimer = 10.0; e.dir = { x:0, y:0 };
          addScore(25);
          statusEl.textContent = `Pizza hit ${e.name}! Out for 10 seconds.`;
          beep(660, 0.07, "triangle", 0.05);
          hit = true; break;
        }
      }
      if (hit) { pizzas.splice(i, 1); }
    }
  }

  function drawPizzas() {
    for (const pz of pizzas) {
      const sp   = w2s(pz.wx, pz.wy);
      const r    = TILE * 0.40;
      const span = Math.PI * 0.62;
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(pz.angle);
      // crust
      ctx.fillStyle = "#b45309";
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,r,-span/2,span/2); ctx.closePath(); ctx.fill();
      // sauce
      ctx.fillStyle = "#dc2626";
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,r*0.84,-span/2,span/2); ctx.closePath(); ctx.fill();
      // cheese
      ctx.fillStyle = "#fde047";
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,r*0.70,-span/2+0.08,span/2-0.08); ctx.closePath(); ctx.fill();
      // pepperoni
      ctx.fillStyle = "#991b1b";
      for (const [px,py] of [[r*0.44,0],[r*0.50,r*0.20],[r*0.50,-r*0.20]]) {
        ctx.beginPath(); ctx.arc(px,py,r*0.10,0,Math.PI*2); ctx.fill();
      }
      // crust highlight
      ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0,0,r,-span/2,span/2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawPizzaHUD() {
    const VH = canvas.clientHeight;
    const x0 = 12, y0 = VH - 52;
    const r = 11, span = Math.PI * 0.62;
    ctx.save();
    ctx.translate(x0 + r + 2, y0 + r + 2);
    ctx.fillStyle = "#b45309";
    ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,r,-span/2,span/2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#dc2626";
    ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,r*0.84,-span/2,span/2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fde047";
    ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,r*0.70,-span/2+0.08,span/2-0.08); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 0.90;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("SPACE", x0 + r*2 + 6, y0 + 2);
    ctx.globalAlpha = 1;
  }

  // ── Wall cache (off-screen canvas per level) ──────────────────
  let wallCache = null;
  function buildWallCache() {
    const theme = getTheme();
    const oc  = document.createElement("canvas");
    oc.width  = mapPxW;
    oc.height = mapPxH;
    const oc2 = oc.getContext("2d");
    const fH  = Math.round(TILE * 0.22);

    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const px = x * TILE, py = y * TILE;
        if (map[y][x] === WALL) {
          // top face
          oc2.fillStyle = theme.wallTop;
          oc2.fillRect(px, py, TILE, TILE - fH);
          // front face (bottom strip)
          oc2.fillStyle = theme.wallFront;
          oc2.fillRect(px, py + TILE - fH, TILE, fH);
          // top-left highlight edge
          oc2.fillStyle = theme.wallEdge;
          oc2.fillRect(px, py, TILE, 1.5);
          oc2.fillRect(px, py, 1.5, TILE);
          // bottom shadow
          oc2.fillStyle = "rgba(0,0,0,0.30)";
          oc2.fillRect(px, py + TILE - 1, TILE, 1);
          oc2.fillRect(px + TILE - 1, py, 1, TILE);
        } else {
          // floor — checkerboard
          oc2.fillStyle = (x + y) % 2 === 0 ? theme.floorA : theme.floorB;
          oc2.fillRect(px, py, TILE, TILE);
        }
      }
    }
    wallCache = oc;
  }

  // ── Level 1 map builder ───────────────────────────────────────
  function buildPlaneCabinMap() {
    const W = 31, H = 13;
    const aisleX = Math.floor(W / 2);
    const g = Array.from({ length: H }, () => Array.from({ length: W }, () => WALL));
    const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const carve = (x, y, c = DOT) => {
      if (!inB(x, y) || x === 0 || y === 0 || x === W - 1 || y === H - 1) return;
      g[y][x] = c;
    };
    for (let y = 1; y <= H - 2; y++) carve(aisleX, y, DOT);
    const seatRowsY = [2, 4, 6, 8, 10];
    const leftLen = 6, rightLen = 6;
    for (const y of seatRowsY) {
      for (let x = aisleX - 1; x >= aisleX - leftLen; x--)  carve(x, y, DOT);
      for (let x = aisleX + 1; x <= aisleX + rightLen; x++) carve(x, y, DOT);
      for (let x = aisleX - leftLen; x <= aisleX - 2; x++) {
        if (inB(x, y - 1)) g[y - 1][x] = WALL;
        if (inB(x, y + 1)) g[y + 1][x] = WALL;
      }
      for (let x = aisleX + 2; x <= aisleX + rightLen; x++) {
        if (inB(x, y - 1)) g[y - 1][x] = WALL;
        if (inB(x, y + 1)) g[y + 1][x] = WALL;
      }
    }
    for (let x = aisleX - 3; x <= aisleX + 3; x++) carve(x, H - 2, DOT);
    g[1][aisleX] = START;
    g[H - 2][aisleX] = EXIT;
    g[seatRowsY[1]][aisleX - leftLen] = POWER;
    g[seatRowsY[3]][aisleX + rightLen] = POWER;
    return g.map(r => r.join(""));
  }

  // ── Enemy templates ──────────────────────────────────────────
  const ENEMY_TEMPLATES = {
    financier:    { id: "financier",    name: "The Financier",         color: "#60a5fa", speed: 7.8, behavior: "unpredictable", mods: [] },
    royal:        { id: "royal",        name: "The Royal Guest",       color: "#a78bfa", speed: 7.2, behavior: "hunter",        mods: [] },
    tech:         { id: "tech",         name: "The Tech Baron",        color: "#22c55e", speed: 6.6, behavior: "roamer",        mods: ["teleport"] },
    fixer:        { id: "fixer",        name: "The Fixer",             color: "#ef4444", speed: 5.8, behavior: "blocker",       mods: [] },
    space:        { id: "space",        name: "The Space Entrepreneur",color: "#f59e0b", speed: 6.8, behavior: "erratic",       mods: [] },
    archivist:    { id: "archivist",    name: "The Archivist",         color: "#eab308", speed: 6.0, behavior: "guardian",      mods: [] },
    ex_pres:      { id: "ex_pres",      name: "The Ex President",      color: "#f97316", speed: 5.6, behavior: "route_shifter", mods: [] },
    current_pres: { id: "current_pres", name: "The Current President", color: "#f8fafc", speed: 6.4, behavior: "chaos",         mods: [] }
  };
  const POWER_MODIFIERS = ["teleport","hunter_boost","burst","route_shift_aura","guardian_lock"];

  // ── Levels ───────────────────────────────────────────────────
  const LEVELS = [
    { id:1, name:"Level 1 — The Private Jet",       enemies:["fixer"],                                                            timeLimit:45,  map: buildPlaneCabinMap() },
    { id:2, name:"Level 2 — The Dock / Harbour",    enemies:["fixer","ex_pres"],                                                   timeLimit:60,
      map:[
        "#################################",
        "#S...............#.............X#",
        "#################.#.#############",
        "#.....#.....#...#.#.#...#.....#.#",
        "#.....#.....#...#.#.#...#.....#.#",
        "#.....#.....#...#.#.#...#.....#.#",
        "#####.#.#####.#.###.#.#####.#.###",
        "#.....#.....#.#.....#.....#.#...#",
        "#..o..#..o..#.#.....#..o..#.#...#",
        "#.....#.....#.#.....#.....#.#...#",
        "#####.#.#####.#.###.#.#####.#.###",
        "#.....#.....#...#.#.#...#.....#.#",
        "#.....#.....#...#.#.#...#.....#.#",
        "#.....#.....#...#.#.#...#.....#.#",
        "#################################"
      ]},
    { id:3, name:"Level 3 — The Jungle Path",       enemies:["royal","fixer","ex_pres"],                                          timeLimit:75,
      map:[
        "###################################",
        "#S#..#....#..#....#..#....#..#....#",
        "#.#..#.##.#..#.##.#..#.##.#..#.##.#",
        "#....#..#....#..#....#..#....#..#.#",
        "#.#######.#######.#######.#######.#",
        "#..#.....#.....#.....#.....#.....##",
        "##.#.###.#####.#.###.#.#####.###.##",
        "#..#...#.....#.#...#.#.....#...#..#",
        "#.###.#####.#.#.###.#.#.#####.###.#",
        "#...#.....#.#.#...#.#.#.....#...#.#",
        "##.#.###.###.#.###.#.###.###.###.##",
        "#..#...#.....#..o..#.....#...#...##",
        "#.###.#####.#######.#####.###.###.#",
        "#...#.....#.....#.....#.....#...#.#",
        "##.#####.###.###.#.###.###.####...##",
        "#....#.....#.....#.....#.....#..X.#",
        "###################################"
      ]},
    { id:4, name:"Level 4 — The Island",            enemies:["royal","fixer","ex_pres","tech","space"],                           timeLimit:90,
      map:[
        "###################################",
        "#S....#.....#.........#.....#....X#",
        "#.###.#.###.#.#######.#.###.#.#####",
        "#...#...#...#...o...#...#...#.....#",
        "###.#####.#######.#.#####.#######.#",
        "#.....#.........#.#.....#.......#.#",
        "#.###.#.#######.#.###.#.#######.#.#",
        "#...#.#.....#...#...#.#.....#...#.#",
        "#.###.#####.#.#####.#.#####.#.###.#",
        "#.....#.....#.......#.....#.......#",
        "###################################"
      ]},
    { id:5, name:"Level 5 — The Mansion",           enemies:["royal","fixer","ex_pres","tech","space","archivist","current_pres"], timeLimit:105,
      map:[
        "###################################",
        "#S....#....o....#.......#........X#",
        "#.###.#.#######.#.#####.#.#########",
        "#...#.#.....#...#...#...#.....#...#",
        "###.#.#####.#.#####.#.#####.#.#.#.#",
        "#...#.....#.#.....#.#.....#.#.#.#.#",
        "#.#######.#.#####.#.###.#.#.#.#.#.#",
        "#.....#...#...#...#...#.#...#...#.#",
        "#.###.#.#####.#.#####.#.#########.#",
        "#...#.#.....#.#.....#.#.....o.....#",
        "###################################"
      ]},
    { id:6, name:"Level 6 — The Bedroom (Final)",   enemies:["financier"],                                                        timeLimit:120,
      map:[
        "###################################",
        "#S..o....#.......#.......#......X#",
        "#.#####.###.###.###.###.###.#####.#",
        "#.....#.....#...#...#...#.....#...#",
        "###.#.#######.###.###.#######.#.###",
        "#...#.......#.....#.....#.....#...#",
        "#.#########.#.#####.#####.#.#####.#",
        "#.....o.....#...#.....#...#.....o.#",
        "###################################"
      ],
      onCompleteModal: {
        title: "Safe Room",
        text:  "You reached the Safe Room and survived the island.\n\nHold tight. Authorities will collect your evidence."
      }}
  ];

  // ── Map connectivity helpers ─────────────────────────────────
  function normalizeMapRows(rows) {
    const maxW = Math.max(...rows.map(r => r.length));
    return rows.map(r => r.length === maxW ? r : r + WALL.repeat(maxW - r.length));
  }
  function toGrid(rows)  { return rows.map(r => r.split("")); }
  function toRows(grid)  { return grid.map(r => r.join("")); }
  function isWalkableChar(c) { return c !== WALL; }
  function findChar(grid, ch) {
    for (let y = 0; y < grid.length; y++)
      for (let x = 0; x < grid[0].length; x++)
        if (grid[y][x] === ch) return { tx: x, ty: y };
    return null;
  }
  function bfsReachable(grid, start) {
    const H = grid.length, W = grid[0].length;
    const q = [start], seen = new Set([key(start.tx, start.ty)]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (q.length) {
      const cur = q.shift();
      for (const [dx, dy] of dirs) {
        const nx = cur.tx + dx, ny = cur.ty + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!isWalkableChar(grid[ny][nx])) continue;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        seen.add(k); q.push({ tx: nx, ty: ny });
      }
    }
    return seen;
  }
  function carveCorridor(grid, s, x) {
    const H = grid.length, W = grid[0].length;
    const dig = (tx, ty) => {
      if (tx <= 0 || ty <= 0 || tx >= W - 1 || ty >= H - 1) return;
      if (grid[ty][tx] === "#") grid[ty][tx] = ".";
    };
    grid[s.ty][s.tx] = "S"; grid[x.ty][x.tx] = "X";
    let cx = s.tx, cy = s.ty, guard = 0;
    const bp = (tx, ty) => { const d = Math.min(tx, ty, (W-1)-tx, (H-1)-ty); return d<=2?8:d===3?3:0; };
    while ((cx !== x.tx || cy !== x.ty) && guard++ < 5000) {
      dig(cx, cy);
      if (Math.random() < 0.35) dig(cx+1, cy);
      if (Math.random() < 0.35) dig(cx-1, cy);
      if (Math.random() < 0.35) dig(cx, cy+1);
      if (Math.random() < 0.35) dig(cx, cy-1);
      const moves = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}]
        .filter(m => { const nx=cx+m.dx,ny=cy+m.dy; return nx>0&&ny>0&&nx<W-1&&ny<H-1; });
      let best = null, bestScore = Infinity;
      for (const m of moves) {
        const nx=cx+m.dx, ny=cy+m.dy;
        const score = (Math.abs(x.tx-nx)+Math.abs(x.ty-ny))*0.6
          + (Math.abs(x.tx-nx)*0.55+Math.abs(x.ty-ny)*0.55)*0.6
          + bp(nx,ny) + Math.random()*1.2;
        if (score < bestScore) { bestScore = score; best = m; }
      }
      if (!best) break;
      cx += best.dx; cy += best.dy;
    }
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { dig(s.tx+dx,s.ty+dy); dig(x.tx+dx,x.ty+dy); }
    grid[s.ty][s.tx] = "S"; grid[x.ty][x.tx] = "X";
  }
  function sanitizeLevelRows(rawRows) {
    const rows = normalizeMapRows(rawRows);
    const grid = toGrid(rows);
    const H = grid.length, W = grid[0].length;
    let s = findChar(grid, START) || { tx:1, ty:1 };
    let x = findChar(grid, EXIT)  || { tx:W-2, ty:H-2 };
    if (!findChar(grid, START)) grid[s.ty][s.tx] = START;
    if (!findChar(grid, EXIT))  grid[x.ty][x.tx] = EXIT;
    // Ensure exit is enterable
    let open = false;
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx=x.tx+dx, ny=x.ty+dy;
      if (ny>=0&&ny<H&&nx>=0&&nx<W&&grid[ny][nx]!==WALL) { open=true; break; }
    }
    if (!open) {
      for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx=x.tx+dx, ny=x.ty+dy;
        if (ny>0&&ny<H-1&&nx>0&&nx<W-1) { grid[ny][nx]="."; break; }
      }
    }
    let reachable = bfsReachable(grid, s);
    if (!reachable.has(key(x.tx, x.ty))) { carveCorridor(grid, s, x); reachable = bfsReachable(grid, s); }
    for (let y=0;y<H;y++) for (let tx=0;tx<W;tx++) {
      const c = grid[y][tx];
      if (!isWalkableChar(c)||c===START||c===EXIT) continue;
      if (!reachable.has(key(tx,y))) grid[y][tx] = WALL;
    }
    grid[s.ty][s.tx] = START; grid[x.ty][x.tx] = EXIT;
    return toRows(grid);
  }

  // ── Map state ────────────────────────────────────────────────
  let map = null, mapW = 0, mapH = 0, mapPxW = 0, mapPxH = 0;
  let dots = new Set(), powers = new Set();
  let startTile = { tx:1, ty:1 }, exitTile = { tx:1, ty:1 };

  function isWall(tx, ty)     { if (ty<0||ty>=mapH||tx<0||tx>=mapW) return true; return map[ty][tx]===WALL; }
  function isWalkable(tx, ty) { return !isWall(tx, ty); }
  function neighbors(tx, ty)  {
    return [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]
      .map(d => ({ tx:tx+d.x, ty:ty+d.y, d }))
      .filter(n => isWalkable(n.tx, n.ty));
  }
  function listWalkableTiles() {
    const out = [];
    for (let y=0;y<mapH;y++) for (let x=0;x<mapW;x++) if (isWalkable(x,y)) out.push({tx:x,ty:y});
    return out;
  }

  // ── Game state ───────────────────────────────────────────────
  let levelIndex    = 0;
  let deathHandicap = 0; // enemies removed due to repeated deaths on this level
  let score         = 0;
  let lives         = 3;
  let state       = "playing"; // playing | modal | game_over
  let frightenedTimer = 0;
  const FRIGHTENED_DURATION = 6.0;

  let timerEnabled = false, timeRemaining = Infinity;
  function formatTime(s) {
    if (!isFinite(s)) return "--";
    const ss = Math.max(0, Math.ceil(s));
    const m  = Math.floor(ss / 60);
    return m > 0 ? `${m}:${String(ss%60).padStart(2,"0")}` : `${ss}s`;
  }
  function setTimerForLevel(level) {
    timerEnabled = !!timerToggle.checked;
    if (!timerEnabled) { timeRemaining = Infinity; timerWrap.style.opacity = "0.55"; timeLeftEl.textContent = "--"; return; }
    const lim = typeof level.timeLimit === "number" ? level.timeLimit : 0;
    timeRemaining = lim > 0 ? lim : Infinity;
    timerWrap.style.opacity = "1";
    timeLeftEl.textContent = formatTime(timeRemaining);
  }
  timerToggle.addEventListener("change", () => {
    setTimerForLevel(LEVELS[levelIndex]);
    statusEl.textContent = timerToggle.checked ? "Timer enabled." : "Timer disabled.";
  });

  // ── Player ───────────────────────────────────────────────────
  const player = { tx:1, ty:1, x:0, y:0, r: TILE*0.38, heldDir:{x:0,y:0}, stepCooldown:0, lastDir:{x:0,y:1} };
  const STEP_INTERVAL = 0.10;

  function setPlayerAt(tile) {
    player.tx = tile.tx; player.ty = tile.ty;
    const p = tileCenter(player.tx, player.ty);
    player.x = p.x; player.y = p.y;
    player.stepCooldown = 0;
  }
  function tryPlayerStep(dx, dy) {
    if (state !== "playing" || !gameStarted) return;
    const nx = player.tx + dx, ny = player.ty + dy;
    if (!isWalkable(nx, ny)) return;
    player.tx = nx; player.ty = ny;
    if (dx||dy) player.lastDir = { x:dx, y:dy };
    const p = tileCenter(player.tx, player.ty);
    player.x = p.x; player.y = p.y;
    checkEvidencePickup();
    checkExit();
    checkEnemyContacts();
    beep(620, 0.02, "square", 0.02);
  }
  function updatePlayerHeld(dt) {
    const d = player.heldDir;
    if (!d.x && !d.y) return;
    player.stepCooldown -= dt;
    if (player.stepCooldown <= 0) { tryPlayerStep(d.x, d.y); player.stepCooldown = STEP_INTERVAL; }
  }

  // ── Enemies ──────────────────────────────────────────────────
  let enemies = [];

  function makeEnemy(template, spawnTile, allWalkables) {
    const p = tileCenter(spawnTile.tx, spawnTile.ty);
    return {
      id: template.id, name: template.name, color: template.color,
      tx: spawnTile.tx, ty: spawnTile.ty, x: p.x, y: p.y,
      r: TILE * 0.38, dir: { x:1, y:0 },
      speedTiles: template.speed, baseSpeedTiles: template.speed,
      behavior: template.behavior, mods: new Set(template.mods || []),
      spawn: { tx:spawnTile.tx, ty:spawnTile.ty }, home: { tx:spawnTile.tx, ty:spawnTile.ty },
      allWalkables, teleportCd: randInt(2,4), burstTimer: 0, chaosCd: 0
    };
  }
  function randomDir(e) {
    const opts = neighbors(e.tx, e.ty).map(n => n.d);
    if (!opts.length) return { x:0, y:0 };
    const rev  = { x:-e.dir.x, y:-e.dir.y };
    const nr   = opts.filter(d => !(d.x===rev.x&&d.y===rev.y));
    return choice(nr.length ? nr : opts);
  }
  function bestDirToward(e, ttx, tty, rnd=0.15) {
    const opts = neighbors(e.tx, e.ty).map(n => n.d);
    if (!opts.length) return { x:0, y:0 };
    const rev  = { x:-e.dir.x, y:-e.dir.y };
    const pool = opts.filter(d => !(d.x===rev.x&&d.y===rev.y));
    const cands = pool.length ? pool : opts;
    if (Math.random() < rnd) return choice(cands);
    let best = cands[0], bs = Infinity;
    for (const d of cands) {
      const nx=e.tx+d.x, ny=e.ty+d.y;
      const s = Math.abs(nx-ttx)+Math.abs(ny-tty);
      if (s < bs) { bs = s; best = d; }
    }
    return best;
  }
  function enemyChooseDir(e) {
    const has = m => e.mods.has(m);
    if (e.behavior==="hunter"||has("hunter_boost")) return bestDirToward(e, player.tx, player.ty, 0.10);
    if (e.behavior==="blocker") return bestDirToward(e, Math.floor(mapW/2), Math.floor(mapH/2), 0.35);
    if (e.behavior==="guardian"||has("guardian_lock")) {
      const dh = Math.abs(e.tx-e.home.tx)+Math.abs(e.ty-e.home.ty);
      return dh>6 ? bestDirToward(e,e.home.tx,e.home.ty,0.10)
        : (Math.random()<0.45 ? randomDir(e) : bestDirToward(e,e.home.tx,e.home.ty,0.30));
    }
    if (e.behavior==="unpredictable") return randomDir(e);
    if (e.behavior==="erratic")       return Math.random()<0.65 ? randomDir(e) : bestDirToward(e,player.tx,player.ty,0.40);
    if (e.behavior==="route_shifter") return Math.random()<0.55 ? randomDir(e) : bestDirToward(e,player.tx,player.ty,0.55);
    if (e.behavior==="chaos")         return bestDirToward(e, player.tx, player.ty, 0.25);
    return Math.random()<0.55 ? randomDir(e) : bestDirToward(e,player.tx,player.ty,0.55);
  }
  function stepEnemyContinuous(e, dt) {
    const spd = e.speedTiles * TILE;
    const cen = tileCenter(e.tx, e.ty);
    const near = Math.abs(e.x-cen.x)<1.2 && Math.abs(e.y-cen.y)<1.2;
    if (near) {
      e.x = cen.x; e.y = cen.y;
      e.dir = enemyChooseDir(e);
      const nx=e.tx+e.dir.x, ny=e.ty+e.dir.y;
      if (!isWalkable(nx,ny)) e.dir = { x:0, y:0 };
    }
    e.x += e.dir.x * spd * dt;
    e.y += e.dir.y * spd * dt;
    const ntx = Math.floor(e.x/TILE), nty = Math.floor(e.y/TILE);
    if (isWalkable(ntx,nty)) { e.tx=ntx; e.ty=nty; }
    else { e.x=cen.x; e.y=cen.y; e.dir={x:0,y:0}; }
  }
  function updateEnemy(e, dt) {
    if (e.dead) return;
    const fr = frightenedTimer > 0;
    e.speedTiles = e.baseSpeedTiles * (fr ? 0.68 : 1.0);
    if (e.mods.has("burst")) {
      if (e.burstTimer>0) { e.burstTimer-=dt; e.speedTiles*=1.55; }
      else if (Math.random()<0.05) e.burstTimer=0.35;
    }
    if (e.mods.has("teleport")) {
      e.teleportCd -= dt;
      if (e.teleportCd<=0 && Math.random()<0.35 && !fr) {
        let pick = null;
        for (let i=0;i<12;i++) {
          const t = choice(e.allWalkables);
          if (Math.abs(t.tx-player.tx)+Math.abs(t.ty-player.ty)>6) { pick=t; break; }
        }
        if (pick) {
          const p = tileCenter(pick.tx, pick.ty);
          e.tx=pick.tx; e.ty=pick.ty; e.x=p.x; e.y=p.y;
          e.teleportCd = randInt(2,4);
          beep(740, 0.04, "square", 0.03);
        } else e.teleportCd = 1.5;
      }
    }
    stepEnemyContinuous(e, dt);
  }
  function applyChaosStacking(dt) {
    for (const c of enemies.filter(e=>e.behavior==="chaos")) {
      c.chaosCd = Math.max(0, c.chaosCd-dt);
      if (c.chaosCd>0) continue;
      for (const e of enemies) {
        if (e===c) continue;
        if (e.tx===c.tx&&e.ty===c.ty) {
          const pool = POWER_MODIFIERS.filter(m=>!e.mods.has(m));
          if (pool.length) { const m=choice(pool); e.mods.add(m); statusEl.textContent=`Chaos: ${e.name} gained "${m}"!`; beep(260,0.06,"sawtooth",0.035); }
          c.chaosCd=1.2; break;
        }
      }
    }
  }

  // ── UI toggles ───────────────────────────────────────────────
  function applyToggles() { dpadEl.classList.toggle("hidden", !showDpadTog.checked); }
  showDpadTog.addEventListener("change", () => { applyToggles(); resizeCanvas(); });
  applyToggles();

  // ── Parse / load level ───────────────────────────────────────
  function parseLevel(level) {
    const safeRows = sanitizeLevelRows(level.map);
    map = safeRows; mapH = map.length; mapW = map[0].length;
    mapPxW = mapW * TILE; mapPxH = mapH * TILE;
    dots = new Set(); powers = new Set();

    for (let y=0;y<mapH;y++) for (let x=0;x<mapW;x++) {
      const c = map[y][x];
      if (c===DOT)   dots.add(key(x,y));
      if (c===POWER) powers.add(key(x,y));
      if (c===START) startTile = { tx:x, ty:y };
      if (c===EXIT)  exitTile  = { tx:x, ty:y };
    }
    setPlayerAt(startTile);
    player.heldDir = { x:0, y:0 };
    player.lastDir = { x:0, y:1 };

    const allW   = listWalkableTiles();
    const pool0  = allW.filter(t => Math.abs(t.tx-startTile.tx)+Math.abs(t.ty-startTile.ty)>6 && !(t.tx===exitTile.tx&&t.ty===exitTile.ty));
    const pool   = pool0.slice();
    for (let i=pool.length-1;i>0;i--) { const j=randInt(0,i); [pool[i],pool[j]]=[pool[j],pool[i]]; }

    enemies = [];
    const fullRoster = (level.enemies||[]).map(id=>ENEMY_TEMPLATES[id]).filter(Boolean);
    const roster = deathHandicap > 0
      ? fullRoster.slice(0, Math.max(1, fullRoster.length - deathHandicap))
      : fullRoster;
    for (let i=0;i<roster.length;i++) {
      const t = roster[i];
      const spawn = pool[i%pool.length]||pool0[0]||{ tx:startTile.tx+1, ty:startTile.ty };
      const e = makeEnemy(t, spawn, allW);
      if (e.id==="archivist"&&powers.size) {
        const [sx,sy] = choice(Array.from(powers)).split(",").map(Number);
        e.home = { tx:sx, ty:sy };
      } else e.home = { tx:spawn.tx, ty:spawn.ty };
      enemies.push(e);
    }

    frightenedTimer = 0;
    particles = [];
    pizzas = [];
    wallCache = null;
    buildWallCache();

    levelNameEl.textContent = level.name;
    enemyListEl.textContent = enemies.map(e=>e.name).join(" · ");
    const handicapNote = deathHandicap > 0
      ? ` · Handicap: ${deathHandicap} ${deathHandicap===1?"enemy":"enemies"} removed`
      : "";
    statusEl.textContent = `${level.name} — reach the EXIT!${handicapNote}`;
    setTimerForLevel(level);
  }

  // ── Modal ────────────────────────────────────────────────────
  function showModal(title, text, btnLabel="Continue", bonus=0) {
    modalTitle.textContent = title;
    modalText.textContent  = text;
    modalBtn.textContent   = btnLabel;
    if (bonus > 0) {
      modalBonus.classList.remove("hidden");
      modalBonusVal.textContent = `+${bonus.toLocaleString()} pts`;
    } else {
      modalBonus.classList.add("hidden");
    }
    modal.classList.remove("hidden");
    state = "modal";
  }
  function hideModal() { modal.classList.add("hidden"); state = "playing"; }

  // ── Progression ──────────────────────────────────────────────
  function addScore(n) { score += n; scoreEl.textContent = score.toLocaleString(); }
  function lvlBonus(id) { return 250 * id; }

  function nextLevel() {
    const cur = LEVELS[levelIndex];
    const bon = lvlBonus(cur.id);
    addScore(bon);
    saveHS(score);
    beep(520, 0.09, "sine", 0.05);
    deathHandicap = 0; // fresh start on the next level
    levelIndex++;
    if (levelIndex >= LEVELS.length) {
      showModal("Investigation Complete!", "You completed all 6 levels.\n\nThe truth is out there.", "Play Again", bon);
      return;
    }
    showModal(
      `Level ${cur.id} Complete!`,
      `You escaped: ${cur.name}\n\nNext: ${LEVELS[levelIndex].name}`,
      "Continue", bon
    );
  }

  // ── Pickups / collisions ─────────────────────────────────────
  function checkEvidencePickup() {
    const k = key(player.tx, player.ty);
    const wc = tileCenter(player.tx, player.ty);
    if (dots.has(k)) {
      dots.delete(k);
      addScore(10 * combo);
      addCombo();
      spawnParticles(wc.x, wc.y, "#e2e8f0", 6, 38);
    }
    if (powers.has(k)) {
      powers.delete(k);
      frightenedTimer = FRIGHTENED_DURATION;
      addScore(50);
      spawnParticles(wc.x, wc.y, "#f59e0b", 14, 75);
      statusEl.textContent = "Power evidence collected — enemies weakened!";
      beep(220, 0.09, "sawtooth", 0.06);
    }
  }
  function checkExit() {
    if (player.tx===exitTile.tx && player.ty===exitTile.ty) {
      const lvl = LEVELS[levelIndex];
      if (lvl.onCompleteModal) {
        const bon = lvlBonus(lvl.id);
        addScore(bon);
        saveHS(score);
        showModal(lvl.onCompleteModal.title, lvl.onCompleteModal.text, "Restart Game", bon);
      } else nextLevel();
    }
  }
  function resetPositionsOnly() {
    setPlayerAt(startTile);
    player.heldDir = { x:0, y:0 };
    for (const e of enemies) {
      const p = tileCenter(e.spawn.tx, e.spawn.ty);
      e.tx=e.spawn.tx; e.ty=e.spawn.ty; e.x=p.x; e.y=p.y;
      e.dir={x:1,y:0}; e.teleportCd=randInt(2,4); e.burstTimer=0; e.chaosCd=0;
      e.mods = new Set(ENEMY_TEMPLATES[e.id]?.mods||[]);
    }
    frightenedTimer = 0;
    particles = [];
    resetCombo();
    setTimerForLevel(LEVELS[levelIndex]);
  }
  function handlePlayerCaught(by) {
    if (GOD_MODE) { statusEl.textContent=`GOD MODE: hit by ${by}`; beep(900,0.03,"triangle",0.03); return; }
    hitFlash = HIT_FLASH_DUR;
    const wc = tileCenter(player.tx, player.ty);
    spawnParticles(wc.x, wc.y, "#ef4444", 16, 100);
    lives--; livesEl.textContent = String(lives); beep(140,0.10,"square",0.06);
    resetCombo();
    if (lives<=0) { state="game_over"; saveHS(score); statusEl.textContent=`Caught by ${by}. Game over. Score: ${score.toLocaleString()}`; }
    else          { statusEl.textContent=`Caught by ${by}. Lives left: ${lives}.`; resetPositionsOnly(); }
  }
  function checkEnemyContacts() {
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.tx===player.tx && e.ty===player.ty) {
        if (frightenedTimer>0) {
          spawnParticles(e.x, e.y, e.color, 12, 70);
          e.dead = true; e.deadTimer = 10.0; e.dir = { x:0, y:0 };
          addScore(150*combo); addCombo();
          beep(880, 0.06, "triangle", 0.05);
        } else handlePlayerCaught(e.name);
        break;
      }
    }
  }
  function onTimeout() {
    statusEl.textContent = "Time's up!"; beep(160,0.13,"square",0.06);
    handlePlayerCaught("TIME");
  }

  // ── Input ────────────────────────────────────────────────────
  const keysDown = new Set();
  function dirFromKeys() {
    if (keysDown.has("arrowup")||keysDown.has("w"))    return { x:0, y:-1 };
    if (keysDown.has("arrowdown")||keysDown.has("s"))  return { x:0, y:1  };
    if (keysDown.has("arrowleft")||keysDown.has("a"))  return { x:-1, y:0 };
    if (keysDown.has("arrowright")||keysDown.has("d")) return { x:1, y:0  };
    return { x:0, y:0 };
  }
  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k)) {
      e.preventDefault();
      if (!gameStarted) return;
      keysDown.add(k);
      player.heldDir = dirFromKeys();
      if (player.stepCooldown<=0) {
        const d=player.heldDir;
        if (d.x||d.y) { tryPlayerStep(d.x,d.y); player.stepCooldown=STEP_INTERVAL; }
      }
    }
    if (k==="r") { e.preventDefault(); if (gameStarted) restartLevel(); }
    if (k===" ") { e.preventDefault(); firePizza(); }
  });
  window.addEventListener("keyup", e => {
    keysDown.delete(e.key.toLowerCase());
    player.heldDir = dirFromKeys();
  });

  document.querySelectorAll(".dpad-btn").forEach(btn => {
    btn.addEventListener("pointerdown", e => {
      e.preventDefault(); btn.setPointerCapture(e.pointerId);
      if (!gameStarted) return;
      const dir=btn.dataset.dir;
      const d = dir==="up"?{x:0,y:-1}:dir==="down"?{x:0,y:1}:dir==="left"?{x:-1,y:0}:{x:1,y:0};
      player.heldDir=d;
      if (player.stepCooldown<=0&&(d.x||d.y)) { tryPlayerStep(d.x,d.y); player.stepCooldown=STEP_INTERVAL; }
    });
    btn.addEventListener("pointerup",     e => { e.preventDefault(); player.heldDir=dirFromKeys(); });
    btn.addEventListener("pointercancel", ()  => { player.heldDir=dirFromKeys(); });
  });

  let touchActive=false, touchOrigin=null;
  canvas.addEventListener("pointerdown", e => {
    if (e.pointerType!=="touch") return;
    touchActive=true; touchOrigin={x:e.clientX,y:e.clientY};
    canvas.setPointerCapture(e.pointerId);
  }, { passive:false });
  canvas.addEventListener("pointermove", e => {
    if (!touchActive||!touchOrigin||!gameStarted) return;
    e.preventDefault();
    const dx=e.clientX-touchOrigin.x, dy=e.clientY-touchOrigin.y;
    const adx=Math.abs(dx), ady=Math.abs(dy);
    if (Math.max(adx,ady)<20) return;
    if (adx>=ady) tryPlayerStep(dx>0?1:-1,0); else tryPlayerStep(0,dy>0?1:-1);
    touchOrigin={x:e.clientX,y:e.clientY};
  }, { passive:false });
  canvas.addEventListener("pointerup",     e => { if (e.pointerType==="touch") { touchActive=false; touchOrigin=null; }}, {passive:true});
  canvas.addEventListener("pointercancel", e => { if (e.pointerType==="touch") { touchActive=false; touchOrigin=null; }}, {passive:true});

  // ── Buttons ──────────────────────────────────────────────────
  function restartLevel() {
    if (state === "modal") hideModal();
    if (state === "game_over") deathHandicap++; // one fewer enemy each death-restart
    lives=3; livesEl.textContent="3"; frightenedTimer=0;
    parseLevel(LEVELS[levelIndex]); resetCombo();
    state="playing";
  }
  function restartGame() {
    hideModal(); levelIndex=0; score=0; lives=3; deathHandicap=0;
    scoreEl.textContent="0"; livesEl.textContent="3";
    parseLevel(LEVELS[0]); resetCombo();
    state="playing";
  }
  restartLvlBtn.addEventListener("click", restartLevel);
  restartGameBtn.addEventListener("click", restartGame);
  modalBtn.addEventListener("click", () => {
    const lbl = modalBtn.textContent.trim();
    if (lbl === "Play Again" || lbl === "Restart Game") {
      restartGame();
    } else {
      // "Continue" — load the already-incremented next level
      if (levelIndex < LEVELS.length) parseLevel(LEVELS[levelIndex]);
      hideModal();
    }
  });

  // ════════════════════════════════════════════════════
  //  RENDERING
  // ════════════════════════════════════════════════════

  // ── Draw map (walls + floor from cache + animated tiles) ─────
  function drawMap() {
    const VW = canvas.clientWidth, VH = canvas.clientHeight;
    const theme = getTheme();

    // Background fill
    ctx.fillStyle = theme.floorA;
    ctx.fillRect(0, 0, VW, VH);

    // Blit cached wall/floor image
    if (wallCache) ctx.drawImage(wallCache, -cameraX, -cameraY);

    // Animated start tile
    const sp = w2s(startTile.tx * TILE, startTile.ty * TILE);
    if (sp.x+TILE>0 && sp.x<VW && sp.y+TILE>0 && sp.y<VH) {
      const a = 0.28 + 0.12 * Math.sin(gameTick * 2.2);
      ctx.fillStyle = `rgba(96,165,250,${a})`;
      ctx.fillRect(sp.x, sp.y, TILE, TILE);
      ctx.fillStyle = "rgba(255,255,255,0.70)";
      ctx.font = `bold ${Math.floor(TILE * 0.44)}px monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("S", sp.x + TILE/2, sp.y + TILE/2);
    }

    // Animated exit tile
    drawExitTile(theme);
  }

  function drawExitTile(theme) {
    const VW = canvas.clientWidth, VH = canvas.clientHeight;
    const ep = w2s(exitTile.tx * TILE, exitTile.ty * TILE);
    if (ep.x+TILE<0||ep.x>VW||ep.y+TILE<0||ep.y>VH) return;

    const pulse = 0.45 + 0.30 * Math.sin(gameTick * 3.5);
    const gR    = TILE * 1.6;

    // radial glow
    const gr = ctx.createRadialGradient(ep.x+TILE/2, ep.y+TILE/2, 0, ep.x+TILE/2, ep.y+TILE/2, gR);
    gr.addColorStop(0, `rgba(34,197,94,${pulse * 0.45})`);
    gr.addColorStop(1, "rgba(34,197,94,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(ep.x - gR, ep.y - gR, gR*2+TILE, gR*2+TILE);

    // door fill
    ctx.fillStyle = `rgba(34,197,94,${pulse * 0.55})`;
    ctx.fillRect(ep.x+2, ep.y+2, TILE-4, TILE-4);

    // bright border
    ctx.strokeStyle = `rgba(134,239,172,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ep.x+1.5, ep.y+1.5, TILE-3, TILE-3);

    // EXIT text
    ctx.fillStyle = `rgba(255,255,255,${0.75 + 0.20 * Math.sin(gameTick * 4)})`;
    ctx.font = `bold ${Math.floor(TILE * 0.35)}px monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("EXIT", ep.x + TILE/2, ep.y + TILE/2);
  }

  // ── Draw evidence ────────────────────────────────────────────
  function drawEvidence() {
    const VW = canvas.clientWidth, VH = canvas.clientHeight;

    // Dot = small document icon
    ctx.fillStyle = "rgba(230,230,230,0.85)";
    for (const k of dots) {
      const [tx,ty] = k.split(",").map(Number);
      const cx = tx*TILE + TILE/2 - cameraX;
      const cy = ty*TILE + TILE/2 - cameraY;
      if (cx<-10||cx>VW+10||cy<-10||cy>VH+10) continue;
      const dw=5, dh=6;
      ctx.fillRect(cx-dw/2, cy-dh/2, dw, dh);
      ctx.fillStyle = "rgba(60,60,60,0.55)";
      ctx.fillRect(cx-dw/2+1, cy-dh/2+1.5, dw-2, 0.8);
      ctx.fillRect(cx-dw/2+1, cy-dh/2+3.2, dw-2, 0.8);
      ctx.fillStyle = "rgba(230,230,230,0.85)";
    }

    // Power = glowing folder
    for (const k of powers) {
      const [tx,ty] = k.split(",").map(Number);
      const cx = tx*TILE + TILE/2 - cameraX;
      const cy = ty*TILE + TILE/2 - cameraY;
      if (cx<-20||cx>VW+20||cy<-20||cy>VH+20) continue;

      const pulse = 0.55 + 0.35 * Math.sin(gameTick * 4.2);
      const sc    = 1 + 0.10 * Math.sin(gameTick * 3.0);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);

      // outer glow
      const gr = ctx.createRadialGradient(0,0,0, 0,0,13);
      gr.addColorStop(0, `rgba(245,158,11,${pulse * 0.7})`);
      gr.addColorStop(1, "rgba(245,158,11,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI*2); ctx.fill();

      // folder body
      ctx.fillStyle = `rgba(251,191,36,${0.85 + pulse * 0.15})`;
      ctx.fillRect(-8, -4, 16, 10);
      // folder tab
      ctx.fillRect(-8, -7, 7, 4);
      // star
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("★", 0, 1);

      ctx.restore();
    }
  }

  // ── Draw player sprite ────────────────────────────────────────
  function drawPlayer(sx, sy) {
    const r = player.r;
    ctx.save();
    ctx.translate(sx, sy);

    // Hit flash tint
    if (hitFlash > 0) ctx.globalAlpha = 0.55 + 0.45 * (hitFlash / HIT_FLASH_DUR);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath(); ctx.ellipse(1, r*0.88, r*0.72, r*0.22, 0, 0, Math.PI*2); ctx.fill();

    // Trenchcoat body
    const bw = r*0.78, bh = r*1.05;
    ctx.fillStyle = "#b8892a";
    ctx.beginPath();
    ctx.moveTo(-bw, 0); ctx.lineTo(-bw*1.12, bh); ctx.lineTo(bw*1.12, bh); ctx.lineTo(bw, 0);
    ctx.closePath(); ctx.fill();
    // Lapels
    ctx.fillStyle = "#96701e";
    ctx.beginPath();
    ctx.moveTo(-bw*0.38, 0); ctx.lineTo(0, bh*0.48); ctx.lineTo(bw*0.38, 0);
    ctx.closePath(); ctx.fill();

    // Head
    ctx.fillStyle = "#fde68a";
    ctx.beginPath(); ctx.arc(0, -r*0.18, r*0.44, 0, Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = "#1c1917";
    ctx.beginPath();
    ctx.arc(-r*0.16, -r*0.22, r*0.08, 0, Math.PI*2);
    ctx.arc( r*0.16, -r*0.22, r*0.08, 0, Math.PI*2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.beginPath();
    ctx.arc(-r*0.14, -r*0.25, r*0.04, 0, Math.PI*2);
    ctx.arc( r*0.18, -r*0.25, r*0.04, 0, Math.PI*2);
    ctx.fill();

    // Hat brim
    ctx.fillStyle = "#292524";
    ctx.beginPath(); ctx.ellipse(0, -r*0.59, r*0.64, r*0.13, 0, 0, Math.PI*2); ctx.fill();
    // Hat crown
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(-r*0.35, -r*1.14, r*0.70, r*0.57);
    // Hat band
    ctx.fillStyle = "#78350f";
    ctx.fillRect(-r*0.35, -r*0.73, r*0.70, r*0.10);

    // Magnifying glass
    const mgx = player.lastDir.x * r * 0.5 + r * 0.55;
    const mgy = player.lastDir.y * r * 0.3 + r * 0.22;
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.arc(mgx, mgy, r*0.25, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mgx + r*0.18, mgy + r*0.18);
    ctx.lineTo(mgx + r*0.40, mgy + r*0.40);
    ctx.lineWidth = 2.6; ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Draw enemy sprite (ghost-style + symbol) ──────────────────
  function drawEnemy(e, sx, sy) {
    const r   = e.r;
    const fr  = frightenedTimer > 0;
    const flashing = fr && frightenedTimer < 2.2 && Math.floor(frightenedTimer*4)%2===0;
    const col = fr ? (flashing ? "#94a3b8" : "#1d4ed8") : e.color;

    ctx.save();
    ctx.translate(sx, sy);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.ellipse(1, r*0.92, r*0.68, r*0.20, 0, 0, Math.PI*2); ctx.fill();

    // Ghost body
    const gw = r*1.42;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, -r*0.15, gw/2, Math.PI, 0); // top dome
    ctx.lineTo(gw/2, r*0.72);
    // wavy skirt (3 bumps)
    const bw2 = gw/3;
    for (let i=2;i>=0;i--) {
      const bx = gw/2 - i*bw2 - bw2/2;
      ctx.arc(bx, r*0.72, bw2/2, 0, Math.PI, true);
    }
    ctx.closePath();
    ctx.fill();

    // Subtle glow outline when frightened
    if (fr) {
      ctx.strokeStyle = flashing ? "rgba(255,255,255,0.6)" : "rgba(96,165,250,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (fr) {
      // Scared X eyes
      ctx.strokeStyle = "rgba(255,255,255,0.80)"; ctx.lineWidth = 1.3;
      for (const ex of [-r*0.22, r*0.22]) {
        ctx.beginPath();
        ctx.moveTo(ex-r*0.10, -r*0.28-r*0.10); ctx.lineTo(ex+r*0.10, -r*0.28+r*0.10);
        ctx.moveTo(ex+r*0.10, -r*0.28-r*0.10); ctx.lineTo(ex-r*0.10, -r*0.28+r*0.10);
        ctx.stroke();
      }
      // Wavy mouth
      ctx.beginPath(); ctx.strokeStyle="rgba(255,255,255,0.55)"; ctx.lineWidth=1.2;
      ctx.moveTo(-r*0.32, -r*0.04);
      for (let i=0;i<=6;i++) {
        ctx.lineTo(-r*0.32+(r*0.64*i/6), -r*0.04+(i%2===0?r*0.09:-r*0.09));
      }
      ctx.stroke();
    } else {
      // Normal eyes (pupils track player direction)
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-r*0.22, -r*0.28, r*0.20, 0, Math.PI*2);
      ctx.arc( r*0.22, -r*0.28, r*0.20, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = "#1e1b4b";
      const ox = e.dir.x*r*0.07, oy = e.dir.y*r*0.07;
      ctx.beginPath();
      ctx.arc(-r*0.22+ox, -r*0.28+oy, r*0.11, 0, Math.PI*2);
      ctx.arc( r*0.22+ox, -r*0.28+oy, r*0.11, 0, Math.PI*2);
      ctx.fill();
      // Pupil shine
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(-r*0.20+ox, -r*0.31+oy, r*0.05, 0, Math.PI*2);
      ctx.arc( r*0.24+ox, -r*0.31+oy, r*0.05, 0, Math.PI*2);
      ctx.fill();

      // Enemy-specific symbol
      drawEnemySymbol(e.id, r);
    }
    ctx.restore();
  }

  function drawEnemySymbol(id, r) {
    ctx.save();
    ctx.fillStyle   = "rgba(255,255,255,0.82)";
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    switch (id) {
      case "financier":
        ctx.font = `bold ${Math.round(r*0.68)}px sans-serif`;
        ctx.fillText("$", 0, r*0.28); break;

      case "royal":
        // crown outline
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-r*0.33, r*0.32); ctx.lineTo(-r*0.33, r*0.08);
        ctx.lineTo(-r*0.16, r*0.22); ctx.lineTo(0, r*0.06);
        ctx.lineTo( r*0.16, r*0.22); ctx.lineTo( r*0.33, r*0.08);
        ctx.lineTo( r*0.33, r*0.32); ctx.closePath();
        ctx.stroke(); break;

      case "tech":
        // circuit nodes
        ctx.lineWidth = 1.0;
        [[-0.28,0.18],[0,0.18],[0.28,0.18]].forEach(([x,y]) => {
          ctx.beginPath(); ctx.arc(x*r, y*r, r*0.07, 0, Math.PI*2); ctx.fill();
        });
        ctx.beginPath();
        ctx.moveTo(-r*0.28, r*0.18); ctx.lineTo(r*0.28, r*0.18);
        ctx.moveTo(0, r*0.02); ctx.lineTo(0, r*0.18);
        ctx.stroke(); break;

      case "fixer":
        // cross / fix symbol
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-r*0.22, r*0.10); ctx.lineTo(r*0.22, r*0.10);
        ctx.moveTo(0, r*0.10-r*0.22); ctx.lineTo(0, r*0.10+r*0.22);
        ctx.stroke(); break;

      case "space":
        ctx.font = `bold ${Math.round(r*0.60)}px sans-serif`;
        ctx.fillText("★", 0, r*0.24); break;

      case "archivist":
        // book lines
        ctx.fillRect(-r*0.28, r*0.08, r*0.56, r*0.06);
        ctx.fillRect(-r*0.28, r*0.18, r*0.56, r*0.06);
        ctx.fillRect(-r*0.28, r*0.28, r*0.40, r*0.06); break;

      case "ex_pres":
        // tie shape
        ctx.beginPath();
        ctx.moveTo(0, r*0.06); ctx.lineTo(-r*0.12, r*0.20);
        ctx.lineTo(0, r*0.38); ctx.lineTo(r*0.12, r*0.20);
        ctx.closePath(); ctx.fill(); break;

      case "current_pres":
        // squiggle hair
        ctx.strokeStyle = "rgba(255,200,50,0.9)"; ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-r*0.32, r*0.10);
        ctx.bezierCurveTo(-r*0.32, -r*0.08, r*0.32, -r*0.08, r*0.32, r*0.10);
        ctx.stroke(); break;
    }
    ctx.restore();
  }

  // ── Draw all entities ────────────────────────────────────────
  function drawEntities() {
    // Enemies
    for (const e of enemies) {
      if (e.dead) continue;
      const sp = w2s(e.x, e.y);
      drawEnemy(e, sp.x, sp.y);
    }
    // Player on top
    const pp = w2s(player.x, player.y);
    drawPlayer(pp.x, pp.y);
  }

  // ── Draw minimap overlay ─────────────────────────────────────
  function drawOverlay() {
    if (!showMmTog.checked) return;
    const VW = canvas.clientWidth, VH = canvas.clientHeight;
    const pad = 10, mmW = 140;
    const mmH = Math.max(70, Math.round((mapH / mapW) * mmW));
    const x0  = VW - mmW - pad, y0 = pad;
    const sx  = mmW / (mapW * TILE), sy = mmH / (mapH * TILE);

    // bg
    ctx.fillStyle = "rgba(0,0,0,0.60)";
    roundRect(ctx, x0, y0, mmW, mmH, 8); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1;
    roundRect(ctx, x0, y0, mmW, mmH, 8); ctx.stroke();

    // walls (small blocks)
    const theme = getTheme();
    ctx.fillStyle = theme.wallTop;
    for (let y=0;y<mapH;y++) for (let x=0;x<mapW;x++) {
      if (map[y][x]===WALL) ctx.fillRect(x0+x*(mmW/mapW), y0+y*(mmH/mapH), mmW/mapW, mmH/mapH);
    }

    // exit dot
    const ex = tileCenter(exitTile.tx, exitTile.ty);
    ctx.fillStyle = `rgba(134,239,172,0.9)`;
    ctx.fillRect(x0+ex.x*sx-2.5, y0+ex.y*sy-2.5, 5, 5);

    // enemy dots
    const fr = frightenedTimer > 0;
    for (const e of enemies) {
      ctx.fillStyle = fr ? "#374151" : e.color;
      ctx.beginPath(); ctx.arc(x0+e.x*sx, y0+e.y*sy, 2.5, 0, Math.PI*2); ctx.fill();
    }

    // player dot
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x0+player.x*sx, y0+player.y*sy, 3.5, 0, Math.PI*2); ctx.fill();

    // label
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "9px sans-serif"; ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillText("MAP", x0+4, y0+3);
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x+r, y); c.lineTo(x+w-r, y); c.arcTo(x+w, y, x+w, y+r, r);
    c.lineTo(x+w, y+h-r); c.arcTo(x+w, y+h, x+w-r, y+h, r);
    c.lineTo(x+r, y+h); c.arcTo(x, y+h, x, y+h-r, r);
    c.lineTo(x, y+r); c.arcTo(x, y, x+r, y, r);
    c.closePath();
  }

  // ── Draw game over overlay ────────────────────────────────────
  function drawGameOver() {
    const VW = canvas.clientWidth, VH = canvas.clientHeight;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, VW, VH);

    const cx = VW/2, cy = VH/2;

    // Card
    const cw=320, ch=160;
    ctx.fillStyle = "rgba(20,8,8,0.95)";
    roundRect(ctx, cx-cw/2, cy-ch/2, cw, ch, 16); ctx.fill();
    ctx.strokeStyle = "rgba(239,68,68,0.45)"; ctx.lineWidth=1.5;
    roundRect(ctx, cx-cw/2, cy-ch/2, cw, ch, 16); ctx.stroke();

    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText("GAME OVER", cx, cy-40);

    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(`Final Score: ${score.toLocaleString()}`, cx, cy-10);

    const hs = getHS();
    ctx.fillStyle = "#f59e0b";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(`Best: ${hs.toLocaleString()}`, cx, cy+14);

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Press Restart Level or Restart Game", cx, cy+44);
  }

  // ── Main loop ────────────────────────────────────────────────
  let last = performance.now();

  function loop(now) {
    const dt = clamp((now - last) / 1000, 0, 1/20);
    last = now;
    gameTick += dt;

    if (state === "playing") {
      frightenedTimer = Math.max(0, frightenedTimer - dt);
      hitFlash = Math.max(0, hitFlash - dt);
      updateCombo(dt);
      updateParticles(dt);

      // Timer
      if (timerEnabled && isFinite(timeRemaining)) {
        timeRemaining -= dt;
        timeLeftEl.textContent = formatTime(timeRemaining);
        timerWrap.classList.toggle("timer-urgent", timeRemaining <= 10);
        if (timeRemaining <= 0) onTimeout();
      } else {
        timeLeftEl.textContent = timerEnabled ? formatTime(timeRemaining) : "--";
        timerWrap.classList.remove("timer-urgent");
      }

      updatePlayerHeld(dt);
      updatePizzas(dt);
      for (const e of enemies) updateEnemy(e, dt);
      // Respawn dead enemies after 10-second delay at a random floor tile
      for (const e of enemies) {
        if (!e.dead) continue;
        e.deadTimer -= dt;
        if (e.deadTimer <= 0) {
          let pick = null;
          for (let i = 0; i < 20; i++) {
            const t = choice(e.allWalkables);
            if (Math.abs(t.tx - player.tx) + Math.abs(t.ty - player.ty) > 5 &&
                !(t.tx === exitTile.tx && t.ty === exitTile.ty)) { pick = t; break; }
          }
          if (!pick) pick = choice(e.allWalkables);
          const p = tileCenter(pick.tx, pick.ty);
          e.tx = pick.tx; e.ty = pick.ty; e.x = p.x; e.y = p.y;
          e.dir = { x: 1, y: 0 }; e.dead = false;
          spawnParticles(p.x, p.y, e.color, 10, 55);
          statusEl.textContent = `${e.name} is back!`;
        }
      }
      applyChaosStacking(dt);
      checkEnemyContacts();

    } else if (state === "game_over") {
      updateParticles(dt);
    } else {
      timeLeftEl.textContent = timerEnabled ? formatTime(timeRemaining) : "--";
    }

    updateCamera(player.x, player.y, mapPxW, mapPxH);

    drawMap();
    drawEvidence();
    drawEntities();
    drawPizzas();
    drawParticles();
    drawOverlay();
    drawPizzaHUD();

    if (state === "game_over") drawGameOver();

    requestAnimationFrame(loop);
  }

  // ── Boot ─────────────────────────────────────────────────────
  parseLevel(LEVELS[0]);
  scoreEl.textContent = "0";
  livesEl.textContent = String(lives);
  statusEl.textContent = `${LEVELS[0].name} — reach the EXIT!`;
  requestAnimationFrame(loop);

})();
