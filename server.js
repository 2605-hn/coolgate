
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use("/vendor/three", express.static(path.join(__dirname, "node_modules", "three", "build")));

const rooms = new Map();

function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, new Map());
  return rooms.get(code);
}

io.on("connection", (socket) => {
  socket.on("join-room", (data, callback) => {
    const code = String(data?.room || "")
      .trim()
      .toUpperCase()
      .slice(0, 12);

    const name = String(data?.name || "Người lạ")
      .trim()
      .slice(0, 18);

    if (!/^[A-Z0-9-]{2,12}$/.test(code)) {
      return callback?.({
        ok: false,
        error: "Mã phòng cần từ 2–12 ký tự."
      });
    }

    if (socket.data.room) {
      const oldRoom = rooms.get(socket.data.room);
      oldRoom?.delete(socket.id);
      socket.leave(socket.data.room);
      io.to(socket.data.room).emit("players", 
        Object.fromEntries(oldRoom || [])
      );
      if (oldRoom?.size === 0) rooms.delete(socket.data.room);
    }

    const room = getRoom(code);
    socket.join(code);
    socket.data.room = code;

    room.set(socket.id, {
      id: socket.id,
      name,
      x: 100 + Math.random() * 80,
      y: 100 + Math.random() * 80
    });

    callback?.({
      ok: true,
      id: socket.id,
      players: Object.fromEntries(room)
    });

    io.to(code).emit("players", Object.fromEntries(room));
  });

  socket.on("move", (pos) => {
    const code = socket.data.room;
    const room = rooms.get(code);
    const player = room?.get(socket.id);

    if (!player || !pos) return;

    // Giới hạn tọa độ hợp lệ của bản đồ.
    const x = Number(pos.x);
    const y = Number(pos.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    player.x = Math.max(24, Math.min(776, x));
    player.y = Math.max(24, Math.min(576, y));

    // Chỉ phát vị trí đến những người cùng phòng.
    socket.to(code).emit("player-moved", player);
  });

  socket.on("disconnect", () => {
    const code = socket.data.room;
    const room = rooms.get(code);

    if (!room) return;

    room.delete(socket.id);
    io.to(code).emit("players", Object.fromEntries(room));

    if (room.size === 0) rooms.delete(code);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Game đang chạy tại http://localhost:${PORT}`);
});
