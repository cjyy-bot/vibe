(() => {
  const panel = document.getElementById("contra-panel");
  const toggle = document.getElementById("contra-toggle");
  const closeBtn = document.getElementById("contra-close");
  const canvas = document.getElementById("contra-canvas");
  const hint = document.getElementById("contra-hint");
  if (!panel || !toggle || !canvas) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const GROUND = H - 28;

  let open = false;
  let raf = 0;
  let lastTs = 0;

  const keys = Object.create(null);
  const state = {
    score: 0,
    lives: 3,
    wave: 1,
    over: false,
    started: false,
  };

  const player = {
    x: 40,
    y: GROUND - 28,
    w: 14,
    h: 28,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    shootCd: 0,
    invuln: 0,
    duck: false,
  };

  /** @type {{x:number,y:number,vx:number,vy:number,from:string}[]} */
  let bullets = [];
  /** @type {{x:number,y:number,w:number,h:number,vx:number,hp:number,shootCd:number,facing:number}[]} */
  let enemies = [];
  let spawnTimer = 0;
  let flash = 0;

  function resetGame() {
    state.score = 0;
    state.lives = 3;
    state.wave = 1;
    state.over = false;
    state.started = true;
    Object.assign(player, {
      x: 40,
      y: GROUND - 28,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: true,
      shootCd: 0,
      invuln: 90,
      duck: false,
    });
    bullets = [];
    enemies = [];
    spawnTimer = 40;
    flash = 0;
  }

  function openPanel() {
    open = true;
    panel.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    if (!state.started || state.over) resetGame();
    lastTs = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    canvas.focus({ preventScroll: true });
  }

  function closePanel() {
    open = false;
    panel.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    cancelAnimationFrame(raf);
    Object.keys(keys).forEach((k) => {
      keys[k] = false;
    });
  }

  toggle.addEventListener("click", () => {
    if (open) closePanel();
    else openPanel();
  });

  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    closePanel();
  });

  function isGameKey(event) {
    const k = event.key;
    return (
      k === "ArrowLeft" ||
      k === "ArrowRight" ||
      k === "ArrowUp" ||
      k === "ArrowDown" ||
      k === " " ||
      k === "a" ||
      k === "A" ||
      k === "d" ||
      k === "D" ||
      k === "w" ||
      k === "W" ||
      k === "s" ||
      k === "S" ||
      k === "j" ||
      k === "J" ||
      k === "z" ||
      k === "Z" ||
      k === "Control" ||
      k === "Enter" ||
      k === "r" ||
      k === "R"
    );
  }

  window.addEventListener("keydown", (event) => {
    if (!open) return;
    if (!isGameKey(event)) return;
    event.preventDefault();
    keys[event.key] = true;

    if ((event.key === "Enter" || event.key === "r" || event.key === "R") && state.over) {
      resetGame();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (!open) return;
    keys[event.key] = false;
  });

  function pressed(...list) {
    return list.some((k) => keys[k]);
  }

  function spawnEnemy() {
    const fromRight = Math.random() > 0.25;
    const x = fromRight ? W + 10 : -20;
    const speed = 0.55 + Math.min(state.wave, 8) * 0.08 + Math.random() * 0.25;
    enemies.push({
      x,
      y: GROUND - 26,
      w: 13,
      h: 26,
      vx: fromRight ? -speed : speed,
      hp: 1 + (state.wave > 5 && Math.random() > 0.7 ? 1 : 0),
      shootCd: 60 + Math.random() * 90,
      facing: fromRight ? -1 : 1,
    });
  }

  function shoot(from, x, y, dir, speed = 5.2) {
    bullets.push({
      x,
      y,
      vx: dir * speed,
      vy: 0,
      from,
    });
  }

  function hurtPlayer() {
    if (player.invuln > 0 || state.over) return;
    state.lives -= 1;
    flash = 12;
    player.invuln = 90;
    if (state.lives <= 0) {
      state.over = true;
      state.lives = 0;
    } else {
      player.x = 40;
      player.y = GROUND - 28;
      player.vx = 0;
      player.vy = 0;
    }
  }

  function update(dt) {
    if (state.over) return;

    const left = pressed("ArrowLeft", "a", "A");
    const right = pressed("ArrowRight", "d", "D");
    const jump = pressed("ArrowUp", "w", "W", " ");
    const duck = pressed("ArrowDown", "s", "S");
    const fire = pressed("j", "J", "z", "Z", "Control");

    player.duck = duck && player.onGround;
    const speed = player.duck ? 0.9 : 1.85;

    if (left && !right) {
      player.vx = -speed;
      player.facing = -1;
    } else if (right && !left) {
      player.vx = speed;
      player.facing = 1;
    } else {
      player.vx *= 0.6;
      if (Math.abs(player.vx) < 0.05) player.vx = 0;
    }

    if (jump && player.onGround && !player.duck) {
      player.vy = -6.4;
      player.onGround = false;
    }

    player.vy += 0.32;
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (player.x < 4) player.x = 4;
    if (player.x + player.w > W - 4) player.x = W - 4 - player.w;

    if (player.y + player.h >= GROUND) {
      player.y = GROUND - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    if (player.shootCd > 0) player.shootCd -= dt;
    if (player.invuln > 0) player.invuln -= dt;
    if (flash > 0) flash -= dt;

    if (fire && player.shootCd <= 0) {
      const bh = player.duck ? player.y + 16 : player.y + 10;
      shoot("player", player.x + (player.facing > 0 ? player.w : 0), bh, player.facing);
      player.shootCd = 10;
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      const base = Math.max(28, 95 - state.wave * 6);
      spawnTimer = base + Math.random() * 35;
    }

    if (state.score > 0 && state.score % 500 === 0) {
      // wave bump handled below via threshold
    }
    state.wave = 1 + Math.floor(state.score / 400);

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
        bullets.splice(i, 1);
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.x += e.vx * dt;
      e.facing = e.vx >= 0 ? 1 : -1;
      e.shootCd -= dt;

      if (e.shootCd <= 0 && Math.abs(e.x - player.x) < 220) {
        shoot("enemy", e.x + (e.facing > 0 ? e.w : 0), e.y + 12, e.facing, 3.4);
        e.shootCd = 70 + Math.random() * 80;
      }

      if (e.x < -40 || e.x > W + 40) {
        enemies.splice(i, 1);
        continue;
      }

      const ph = player.duck ? player.h * 0.55 : player.h;
      const py = player.duck ? player.y + player.h - ph : player.y;
      if (
        player.invuln <= 0 &&
        rects(player.x, py, player.w, ph, e.x, e.y, e.w, e.h)
      ) {
        hurtPlayer();
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.from === "player") {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (rects(b.x - 2, b.y - 2, 4, 4, e.x, e.y, e.w, e.h)) {
            e.hp -= 1;
            bullets.splice(i, 1);
            if (e.hp <= 0) {
              enemies.splice(j, 1);
              state.score += 100;
            }
            break;
          }
        }
      } else if (b.from === "enemy") {
        const ph = player.duck ? player.h * 0.55 : player.h;
        const py = player.duck ? player.y + player.h - ph : player.y;
        if (rects(b.x - 2, b.y - 2, 4, 4, player.x, py, player.w, ph)) {
          bullets.splice(i, 1);
          hurtPlayer();
        }
      }
    }
  }

  function rects(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function drawBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a3a28");
    g.addColorStop(0.55, "#0f2418");
    g.addColorStop(1, "#0a1810");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#163222";
    for (let i = 0; i < 6; i++) {
      const tx = (i * 70 + (performance.now() / 40) % 70) % (W + 40) - 20;
      ctx.beginPath();
      ctx.moveTo(tx, GROUND);
      ctx.lineTo(tx + 18, GROUND - 46 - (i % 3) * 8);
      ctx.lineTo(tx + 36, GROUND);
      ctx.fill();
    }

    ctx.fillStyle = "#2d6b3a";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#3f8a4c";
    ctx.fillRect(0, GROUND, W, 3);

    for (let i = 0; i < W; i += 16) {
      ctx.fillStyle = i % 32 === 0 ? "#275c34" : "#326f3f";
      ctx.fillRect(i, GROUND + 8, 10, 3);
    }
  }

  function drawSoldier(x, y, w, h, facing, color, duck, blink) {
    if (blink && Math.floor(performance.now() / 80) % 2 === 0) return;

    const bodyH = duck ? h * 0.55 : h;
    const by = duck ? y + h - bodyH : y;

    ctx.fillStyle = color;
    ctx.fillRect(x + 3, by + 8, w - 6, bodyH - 12);
    ctx.fillStyle = "#f0d2a8";
    ctx.fillRect(x + 4, by, w - 8, 9);
    ctx.fillStyle = color;
    ctx.fillRect(x + 3, by - 1, w - 6, 4);

    ctx.fillStyle = "#1a1a1a";
    const eyeX = facing > 0 ? x + w - 6 : x + 3;
    ctx.fillRect(eyeX, by + 3, 2, 2);

    ctx.fillStyle = "#c9a06a";
    const gunY = by + (duck ? 10 : 12);
    if (facing > 0) {
      ctx.fillRect(x + w - 2, gunY, 10, 3);
    } else {
      ctx.fillRect(x - 8, gunY, 10, 3);
    }

    ctx.fillStyle = "#1e3d28";
    if (!duck) {
      ctx.fillRect(x + 3, y + h - 8, 4, 8);
      ctx.fillRect(x + w - 7, y + h - 8, 4, 8);
    } else {
      ctx.fillRect(x + 2, y + h - 6, w - 4, 6);
    }
  }

  function drawHud() {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, W, 18);
    ctx.fillStyle = "#9dffb0";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${String(state.score).padStart(6, "0")}`, 6, 12);
    ctx.textAlign = "right";
    ctx.fillText(`♥ ${state.lives}  WAVE ${state.wave}`, W - 6, 12);

    if (!state.started) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffe566";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CONTRA", W / 2, H / 2 - 10);
      ctx.fillStyle = "#cfe8d6";
      ctx.font = "10px monospace";
      ctx.fillText("按任意方向键开始", W / 2, H / 2 + 12);
    }

    if (state.over) {
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 8);
      ctx.fillStyle = "#d7e8dc";
      ctx.font = "10px monospace";
      ctx.fillText("按 Enter / R 重开", W / 2, H / 2 + 12);
    }
  }

  function draw() {
    drawBg();

    if (flash > 0) {
      ctx.fillStyle = "rgba(255,80,60,0.18)";
      ctx.fillRect(0, 0, W, H);
    }

    for (const e of enemies) {
      drawSoldier(e.x, e.y, e.w, e.h, e.facing, e.hp > 1 ? "#c44b2f" : "#d9693d", false, false);
    }

    const blink = player.invuln > 0;
    drawSoldier(
      player.x,
      player.y,
      player.w,
      player.h,
      player.facing,
      "#3d8cff",
      player.duck,
      blink
    );

    for (const b of bullets) {
      ctx.fillStyle = b.from === "player" ? "#ffe566" : "#ff7a7a";
      ctx.fillRect(b.x - 2, b.y - 1, 4, 2);
    }

    drawHud();
  }

  function loop(ts) {
    if (!open) return;
    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 16.67;
    lastTs = ts;
    if (dt > 2.5) dt = 2.5;

    if (!state.started) {
      if (pressed("ArrowLeft", "ArrowRight", "ArrowUp", "a", "A", "d", "D", "w", "W", " ", "j", "J")) {
        resetGame();
      }
    } else {
      update(dt);
    }

    draw();
    raf = requestAnimationFrame(loop);
  }

  drawBg();
  drawHud();
  if (hint) {
    hint.textContent = "←→移动  ↑跳  ↓蹲  J射击";
  }
})();
