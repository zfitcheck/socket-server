import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));

// Health check
app.get("/", (req, res) => {
    res.status(200).json({ status: "Socket Server Running ✅" });
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
    transports: ["websocket"], // Force websocket only
});

io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // Join personal room
    socket.on("join", (userId) => {
        socket.join(userId);
        socket.userId = userId;

        console.log(`👤 User ${userId} joined`);

        io.emit("user-online", { userId });
    });

    // Send message
    socket.on("send_message", async (data) => {
        const { senderId, receiverId, content } = data;

        // Emit to receiver room
        io.to(receiverId).emit("receive_message", {
            id: Date.now(),
            content,
            sender_id: senderId,
            receiver_id: receiverId,
            created_at: new Date(),
        });
    });

    // Typing indicator
    socket.on("typing", (data) => {
        socket.to(data.receiverId).emit("typing", {
            senderId: data.senderId,
        });
    });

    socket.on("disconnect", () => {
        console.log("❌ Disconnected:", socket.id);

        if (socket.userId) {
            io.emit("user-offline", { userId: socket.userId });
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Socket server running on port ${PORT}`);
});