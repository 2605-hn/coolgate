
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const game = document.getElementById("game");
const status = document.getElementById("status");
const menuStatus = document.getElementById("menuStatus");

const socket = typeof io === "function" ? io() : null;

let mode = "solo";
let myId = "solo";
let roomCode = "";
let running = false;
let won = false;
let lost = false;
let lastTime = 0;
let lastSync = 0;

const keys = {};
const players = {};
const collected = new Set();

const player = {
  x: 80, y: 80, r: 12, speed: 165,
  name: "Người điều tra"
};

const clues = [
  {
    x: 680, y: 100, emoji: "📜",
    title: "Lá thư nhàu",
    detail: "Lá thư viết: 'Đừng mở cửa sau khi tiếng mõ vang lên lần thứ ba.'"
  },
  {
    x: 660, y: 480, emoji: "🕯️",
    title: "Chân nhang lạ",
    detail: "Nhang cháy ngược chiều gió. Có ai đó vừa đứng trước bàn thờ."
  },
  {
    x: 120, y: 500, emoji: "🔑",
    title: "Chìa khóa rỉ",
    detail: "Mặt sau khắc hai chữ: 'Bến Đò'."
  }
];

// Tường và đồ vật cản đường.
const walls = [
  { x: 180, y: 0, w: 24, h: 230 },
  { x: 180, y: 290, w: 24, h: 310 },
  { x: 360, y: 120, w: 24, h: 360 },
  { x: 520, y: 0, w: 24, h: 200 },
  { x: 520, y: 260, w: 24, h: 340 },
  { x: 220, y: 220, w: 100, h: 24 },
  { x: 400, y: 380, w: 90, h: 24 }
];

const ghost = { x: 420, y: 300, speed: 48 };
let ghostTimer = 0;

function setStatus(text) {
  status.textContent = text;
}

function resetGame() {
  player.x = 80;
  player.y = 80;
  collected.clear();
  ghost.x = 420;
  ghost.y = 300;
  ghostTimer = 0;
  won = false;
  lost = false;

  for (const id of Object.keys(players)) {
    if (id !== myId) delete players[id];
  }

  players[myId] = {
    id: myId, name: player.name,
    x: player.x, y: player.y
  };

  setStatus("Đêm đầu tiên. Hãy tìm ba manh mối.");
}

function startGame(nextMode) {
  mode = nextMode;
  player.name =
    document.getElementById("name").value.trim() ||
    "Người điều tra";

  if (mode === "online") {
    if (!socket) {
      menuStatus.textContent = "Không thể kết nối máy chủ.";
      return;
    }

    roomCode =
      document.getElementById("room").value.trim().toUpperCase();

    if (roomCode.length < 2) {
      menuStatus.textContent = "Nhập mã phòng ít nhất 2 ký tự.";
      return;
    }

    menuStatus.textContent = "Đang vào phòng...";

    socket.emit("join-room", {
      name: player.name,
      room: roomCode
    }, (result) => {
      if (!result?.ok) {
        menuStatus.textContent =
          result?.error || "Không thể vào phòng.";
        return;
      }

      myId = result.id;

      for (const id of Object.keys(players)) delete players[id];
      Object.assign(players, result.players);

      begin();
    });

    return;
  }

  myId = "solo";
  begin();
}

function begin() {
  menu.style.display = "none";
  game.style.display = "block";
  running = true;
  lastTime = performance.now();
  resetGame();

  if (mode === "online") {
    setStatus("Phòng " + roomCode + " — đang chơi online.");
  }
}

document.getElementById("solo").onclick =
  () => startGame("solo");

document.getElementById("online").onclick =
  () => startGame("online");

document.getElementById("back").onclick = () => {
  running = false;
  game.style.display = "none";
  menu.style.display = "block";

  if (socket) socket.emit("leave-room");
};

if (socket) {
  socket.on("players", (data) => {
    for (const id of Object.keys(players)) {
      if (id !== myId && !data[id]) delete players[id];
    }

    for (const [id, p] of Object.entries(data)) {
      if (id === myId) continue;

      players[id] = {
        ...players[id],
        ...p
      };
    }
  });

  socket.on("player-moved", (p) => {
    if (p.id === myId) return;

    players[p.id] = {
      ...players[p.id],
      ...p
    };
  });
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if ([
    "arrowup", "arrowdown", "arrowleft", "arrowright", " "
  ].includes(k)) e.preventDefault();

  keys[k] = true;

  if (k === "e" && running && !won && !lost) investigate();
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function investigate() {
  const clue = clues.find((c, i) =>
    !collected.has(i) &&
    Math.hypot(player.x - c.x, player.y - c.y) < 42
  );

  if (!clue) {
    setStatus("Không có gì gần đây để điều tra.");
    return;
  }

  const index = clues.indexOf(clue);
  collected.add(index);

  setStatus(
    "Đã tìm thấy: " + clue.title + " — " + clue.detail
  );

  if (collected.size === clues.length) {
    won = true;
    setStatus(
      "BÍ MẬT ĐÃ SÁNG TỎ! Mày tìm đủ ba manh mối. " +
      "Bản demo hoàn thành!"
    );
  }
}

function blocked(x, y, r) {
  if (x - r < 0 || y - r < 0 ||
      x + r > canvas.width || y + r > canvas.height) {
    return true;
  }

  return walls.some(w => {
    const cx = Math.max(w.x, Math.min(x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(y, w.y + w.h));

    return Math.hypot(x - cx, y - cy) < r;
  });
}

function movePlayer(dx, dy, dt) {
  const distance = player.speed * dt;
  const nx = player.x + dx * distance;
  const ny = player.y + dy * distance;

  if (!blocked(nx, player.y, player.r)) player.x = nx;
  if (!blocked(player.x, ny, player.r)) player.y = ny;

  players[myId] = {
    id: myId, name: player.name,
    x: player.x, y: player.y
  };
}

function update(dt, now) {
  if (!running || won || lost) return;

  let dx = 0, dy = 0;

  if (keys["w"] || keys["arrowup"]) dy--;
  if (keys["s"] || keys["arrowdown"]) dy++;
  if (keys["a"] || keys["arrowleft"]) dx--;
  if (keys["d"] || keys["arrowright"]) dx++;

  if (dx && dy) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  movePlayer(dx, dy, dt);

  // Gửi vị trí định kỳ cho các người chơi khác.
  if (mode === "online" && socket?.connected &&
      now - lastSync > 60) {
    socket.emit("move", {
      x: player.x, y: player.y
    });
    lastSync = now;
  }

  // Hồn ma đuổi theo người chơi hiện tại.
  ghostTimer += dt;

  if (ghostTimer > 1.8) {
    ghostTimer = 0;
    ghost.speed = 48 + Math.random() * 18;
  }

  const gx = player.x - ghost.x;
  const gy = player.y - ghost.y;
  const distance = Math.hypot(gx, gy) || 1;

  const nextX = ghost.x + gx / distance * ghost.speed * dt;
  const nextY = ghost.y + gy / distance * ghost.speed * dt;

  if (!blocked(nextX, ghost.y, 13)) ghost.x = nextX;
  if (!blocked(ghost.x, nextY, 13)) ghost.y = nextY;

  if (Math.hypot(player.x - ghost.x, player.y - ghost.y) < 22) {
    lost = true;
    setStatus("HỒN MA ĐÃ BẮT ĐƯỢC MÀY! Nhấn chơi lại bằng cách tải lại trang.");
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Nền đất.
  ctx.fillStyle = "#19251d";
  ctx.fillRect(0, 0, 800, 600);

  // Gạch lát nền.
  ctx.strokeStyle = "rgba(170,180,135,0.07)";
  for (let x = 0; x < 800; x += 40) {
    for (let y = 0; y < 600; y += 40) {
      ctx.strokeRect(x, y, 40, 40);
    }
  }

  // Ngôi nhà ma.
  ctx.fillStyle = "#342b25";
  ctx.fillRect(220, 80, 280, 400);
  ctx.strokeStyle = "#786344";
  ctx.lineWidth = 4;
  ctx.strokeRect(220, 80, 280, 400);

  ctx.fillStyle = "#ad8952";
  ctx.font = "18px serif";
  ctx.fillText("NHÀ TỪ ĐƯỜNG", 278, 108);

  // Vật cản.
  for (const w of walls) {
    ctx.fillStyle = "#574635";
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = "#806847";
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }

  // Bàn thờ.
  ctx.fillStyle = "#76502f";
  ctx.fillRect(390, 145, 100, 48);
  ctx.fillStyle = "#f5a64b";
  ctx.beginPath();
  ctx.arc(440, 136, 7, 0, Math.PI * 2);
  ctx.fill();

  // Các manh mối chưa tìm thấy.
  clues.forEach((c, i) => {
    if (collected.has(i)) return;

    ctx.font = "25px serif";
    ctx.textAlign = "center";
    ctx.fillText(c.emoji, c.x, c.y + 8);

    ctx.fillStyle = "#e3d9b8";
    ctx.font = "11px sans-serif";
    ctx.fillText("Manh mối", c.x, c.y + 23);
  });

  // Hồn ma.
  ctx.fillStyle = "rgba(210,225,220,0.20)";
  ctx.beginPath();
  ctx.arc(ghost.x, ghost.y, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c5d2c9";
  ctx.beginPath();
  ctx.arc(ghost.x, ghost.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8e2020";
  ctx.fillRect(ghost.x - 6, ghost.y - 3, 4, 4);
  ctx.fillRect(ghost.x + 3, ghost.y - 3, 4, 4);

  // Người chơi.
  for (const [id, p] of Object.entries(players)) {
    ctx.fillStyle = id === myId ? "#e6bb69" : "#7eb6ce";

    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f5eddb";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.name || "Người chơi", p.x, p.y - 19);
  }

  // Hiệu ứng tối với vùng sáng quanh nhân vật.
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.84)";
  ctx.fillRect(0, 0, 800, 600);

  ctx.globalCompositeOperation = "destination-out";
  const light = ctx.createRadialGradient(
    player.x, player.y, 20,
    player.x, player.y, 145
  );

  light.addColorStop(0, "rgba(0,0,0,1)");
  light.addColorStop(0.65, "rgba(0,0,0,0.8)");
  light.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 145, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // HUD.
  ctx.textAlign = "left";
  ctx.fillStyle = "#f0d5a1";
  ctx.font = "15px sans-serif";
  ctx.fillText(`Manh mối: ${collected.size}/3`, 14, 25);

  if (won || lost) {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 250, 800, 100);

    ctx.fillStyle = won ? "#f1d18d" : "#f18a8a";
    ctx.textAlign = "center";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(won ? "BÍ MẬT ĐƯỢC PHƠI BÀY" : "MÀY ĐÃ BỊ BẮT", 400, 295);

    ctx.font = "15px sans-serif";
    ctx.fillText("Tải lại trang để chơi lại.", 400, 325);
  }
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  update(dt, now);
  draw();

  requestAnimationFrame(loop);
}

requestAnimationFrame((now) => {
  lastTime = now;
  loop(now);
});
