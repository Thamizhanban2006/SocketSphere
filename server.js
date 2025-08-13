const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const mongoose = require("mongoose");


mongoose.connect("mongodb://localhost:27017/chatApp")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const messageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  type: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

let onlineUsers = {}; 

io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);


  const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
  socket.emit("load_old_messages", messages);

 
  socket.on("set_username", (username) => {
    onlineUsers[socket.id] = username;
    io.emit("update_user_list", Object.values(onlineUsers));
  });

 
  socket.on("send_message", async (data) => {
    const newMessage = new Message(data);
    await newMessage.save(); 
    io.emit("receive_message", data);
  });

 
  socket.on("typing", (username) => {
    socket.broadcast.emit("user_typing", username);
  });

  socket.on("stop_typing", () => {
    socket.broadcast.emit("user_stopped_typing");
  });
  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    io.emit("update_user_list", Object.values(onlineUsers));
    console.log("User disconnected:", socket.id);
  });
});


server.listen(5000, () => {
  console.log("Server running on port 5000");
});
