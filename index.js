const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const app = express();
const socket = require("socket.io");
require("dotenv").config();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connetion Successfull");
  })
  .catch((err) => {
    console.log(err.message);
  });

app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
);
const io = socket(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

global.onlineUsers = new Map();

io.on("connection", (socket) => {
  global.chatSocket = socket;

  // map userId -> socketId
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  // typing indicator: { to: <userId>, isTyping: true/false, from: <userId> }
  socket.on("typing", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("typing", { from: data.from, isTyping: data.isTyping });
    }
  });

  // when sender emits send-msg with payload { to, from, msg, messageId? }
  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    // forward message to recipient
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-receive", {
        from: data.from,
        msg: data.msg,
        messageId: data.messageId || null,
      });

      // notify sender that message was delivered (recipient socket is online)
      socket.emit("msg-delivered", {
        to: data.to,
        messageId: data.messageId || null,
      });
    } else {
      // recipient not online - sender will rely on API polling or DB state
      socket.emit("msg-delivered", {
        to: data.to,
        messageId: data.messageId || null,
        online: false,
      });
    }
  });

  // recipient informs server they have seen a message
  // payload: { messageId, from: <senderId>, to: <recipientId> }
  socket.on("message-seen", (data) => {
    const senderSocketId = onlineUsers.get(data.from);
    // forward to original sender that this message was seen
    if (senderSocketId) {
      socket.to(senderSocketId).emit("msg-seen", {
        messageId: data.messageId,
        by: data.to,
        seenAt: new Date(),
      });
    }
  });

  socket.on("disconnect", () => {
    // remove any user mapping that had this socket id
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});