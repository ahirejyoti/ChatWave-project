import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// socketId -> { id, name }
const users = new Map();
// conversationKey (sorted socketIds) -> [{ from, text, at }]
const conversations = new Map();

function conversationKey(a, b) {
  return [a, b].sort().join("::");
}

function broadcastUserList() {
  io.emit("users", Array.from(users.values()));
}

io.on("connection", (socket) => {
  socket.on("join", (name) => {
    const displayName = String(name || "Anonymous").slice(0, 40);
    users.set(socket.id, { id: socket.id, name: displayName });
    broadcastUserList();
  });

  socket.on("message:send", ({ toId, text }) => {
    const from = users.get(socket.id);
    if (!from || !text) return;
    const key = conversationKey(socket.id, toId);
    const message = { from: socket.id, fromName: from.name, text: String(text).slice(0, 2000), at: Date.now() };
    if (!conversations.has(key)) conversations.set(key, []);
    conversations.get(key).push(message);

    socket.emit("message:new", { peerId: toId, message });
    io.to(toId).emit("message:new", { peerId: socket.id, message });
  });

  socket.on("history:get", (peerId) => {
    const key = conversationKey(socket.id, peerId);
    socket.emit("history:data", { peerId, messages: conversations.get(key) || [] });
  });

  // --- WebRTC signaling for voice calls ---
  socket.on("call:invite", ({ toId }) => {
    const from = users.get(socket.id);
    if (!from) return;
    io.to(toId).emit("call:incoming", { fromId: socket.id, fromName: from.name });
  });

  socket.on("call:accept", ({ toId }) => {
    io.to(toId).emit("call:accepted", { fromId: socket.id });
  });

  socket.on("call:decline", ({ toId }) => {
    io.to(toId).emit("call:declined", { fromId: socket.id });
  });

  socket.on("call:end", ({ toId }) => {
    io.to(toId).emit("call:ended", { fromId: socket.id });
  });

  socket.on("call:signal", ({ toId, data }) => {
    io.to(toId).emit("call:signal", { fromId: socket.id, data });
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
    broadcastUserList();
  });
});

server.listen(PORT, () => {
  console.log(`Signaling/chat server listening on :${PORT}`);
});
