import http from "http";
import express from "express";
import { startBot, startServer, stopBot } from "./server.js";
import { Server } from "socket.io";
import connectDB from "./database/index.js";
import dotenv from "dotenv";
import { signal } from "./classBasedTrade.js";
dotenv.config();

const io = new Server();
const app = express();
const server = http.createServer(app);
const PORT = 5000;

//Attach socket to server
io.attach(server, {
  cors: {
    origin: "*",
  },
});

//====================================================================
// Define a Socket object to abstract socket-related functionality
const Socket = {
  // Emit a message to all connected sockets
  emit: function (event, data) {
    io.sockets.emit(event, data);
  },

  // Set up an event listener for a specific event
  on: function (event, callback) {
    io.on(event, callback);
  },

  // Remove an event listener for a specific event
  // Note: Socket.IO versions may use 'removeListener' instead of 'off'
  off: function (event, callback) {
    io.off(event, callback);
  },
};
//====================================================================
//If we want to send message to one user if we have their UserId as recipientId
const getRecipientSocketId = (recipientId) => userSocketMap[recipientId];

const userSocketMap = {};
io.on("connection", (socket) => {
  console.log("Connected user : ", socket.id);

  const userId = socket.handshake.query.userId;

  if (userId && userId != "undefined") {
    userSocketMap[userId] = socket.id;
    Socket.emit("getOnlineUsers", Object.keys(userSocketMap));
  }
  // Handle incoming signals from the client
  socket.on("handleBot", (data) => {
    // Send a response back to the client if needed
    if (data.activate) {
      startBot(data);
    } else {
      stopBot(data);
    }
  });

  socket.on("signal", (data) => {
    signal(data);
  });
  socket.on("manualSignal", (data) => {
    //Broadcast the signal here
    Socket.emit("broadcastedSignal", data);
  });
  socket.on("deleteSignal", (data) => {
    Socket.emit("deleteSignal", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    delete userSocketMap[userId];
    Socket.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

app.get("/", (req, res) => {
  res.send("How are you please this is not for you :)");
});

server.listen(PORT, "0.0.0.0", () => {
  // connectDB();
  // startServer(); //Start the server that receives signals from MT5
  console.log(`Main Server is running on http://localhost:${PORT}`);
});

export { Socket, io, getRecipientSocketId };
