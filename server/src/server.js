import { createServer } from "node:http";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
    cors({
        origin: CLIENT_URL,
        credentials: true,
    }),
);

app.use(express.json());

app.get("/api/health", (request, response) => {
    response.status(200).json({
        success: true,
        message: "TeamPulse API is running",
    });
});

const io = new Server(httpServer, {
    cors: {
        origin: CLIENT_URL,
        credentials: true,
    },
});

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.emit("connection:ready", {
        socketId: socket.id,
    });

    socket.on("disconnect", (reason) => {
        console.log(`Socket disconnected: ${socket.id}; reason: ${reason}`);
    });
});

async function startServer() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected");

        httpServer.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();