// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import morgan from "morgan";
import cors from "cors";
import { body, validationResult } from "express-validator";

//comment
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: "http://127.0.0.1:5500",
      methods: ["GET", "POST"],
      credentials: true
    }
  });
// const io = new Server(server);

// Middleware
app.use(express.json());
pp.use(express.urlencoded({ extended: true }));  // Handle form-urlencoded requests
app.use(morgan("dev"));
// app.use(cors());
app.use(cors({ origin: "http://127.0.0.1:5500", credentials: true }));

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/shikaku");

const GameSchema = new mongoose.Schema({
  board: Array,
  rectangles: Array,
  startTime: Date,
  isCompleted: Boolean,
});

const Game = mongoose.model("Game", GameSchema);

// Initialize Board
app.post("/initialize-board", async (req, res) => {
  const board = Array(5).fill(null).map(() => Array(5).fill(0));
  const game = new Game({ board, rectangles: [], startTime: new Date(), isCompleted: false });
  await game.save();
  res.json({ gameId: game._id, board });
});

// Generate Rectangles
app.post("/generate-rectangles", async (req, res) => {
 
  const game = await Game.findById(req.body.gameId);
  if (!game) return res.status(404).json({ error: "Game not found" });
  
  game.rectangles = [
    { x: 0, y: 0, width: 2, height: 2 },
    { x: 2, y: 0, width: 3, height: 2 },
  ];
  await game.save();
  res.json({ rectangles: game.rectangles });
});

// Handle Player Input
app.post("/select-rectangle", async (req, res) => {
  const { gameId, x, y } = req.body;
  const game = await Game.findById(gameId);
  if (!game) return res.status(404).json({ error: "Game not found" });

  const selectedRectangle = game.rectangles.find(r => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);
  res.json({ selectedRectangle });
});

// Snap and Lock Rectangles
app.post("/snap-lock", async (req, res) => {
  const { gameId, rectangle } = req.body;
  const game = await Game.findById(gameId);
  if (!game) return res.status(404).json({ error: "Game not found" });
  
  game.rectangles = game.rectangles.map(r => (r.x === rectangle.x && r.y === rectangle.y ? rectangle : r));
  await game.save();
  res.json({ success: true });
});

// Check Win Condition
app.get("/check-win/:gameId", async (req, res) => {
  const game = await Game.findById(req.params.gameId);
  if (!game) return res.status(404).json({ error: "Game not found" });
  
  const isComplete = game.rectangles.length > 0;
  if (isComplete) {
    game.isCompleted = true;
    await game.save();
    return res.json({ message: "You won!" });
  }
  res.json({ message: "Keep going!" });
});

// Reset Game
app.post("/reset-game", async (req, res) => {
  await Game.deleteMany({});
  res.json({ message: "Game reset successful" });
});

// Track Time
app.get("/track-time/:gameId", async (req, res) => {
  const game = await Game.findById(req.params.gameId);
  if (!game) return res.status(404).json({ error: "Game not found" });
  const elapsedTime = (new Date() - game.startTime) / 1000;
  res.json({ elapsedTime });
});

// Socket.io Connection
io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("move", (data) => {
    io.emit("update", data);
  });
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
