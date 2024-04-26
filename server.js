const express = require("express");
const cors = require("cors");
const app = express();
const port = 4040;
const chatRoutes = require("./app/routes/chat.routes");

const { createServer } = require("node:http");
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server, { cors: { origin: `http://localhost:${port}` } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = require("./app/models");
db.sequelize.sync();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/chat", chatRoutes);

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("message", (data) => {
    socket.broadcast.emit("receiver-" + data.receiver, data);
  });

  socket.on("set-seen", (data) => {
    socket.broadcast.emit("receive-seen-" + data.receiver, data);
  });

  socket.on("set-update-unseen", (data) => {
    socket.emit("receive-unseen-" + data.receiver, data);
  });

  socket.on("set-update-self", (data) => {
    console.log(data);
    socket.emit("receive-update-self-" + data.receiver, data);
  });
});

server.listen(port, () => {
  console.log("server running at http://localhost:" + port);
});
