import http from 'http';
import { Server } from 'socket.io';
import express from 'express';
import app from './app.js';
import { initSocketService } from './services/socketService.js';
import whatsappRoutes from "./routes/whatsapp.routes.js";
import { setIO } from './config/socket.js';

// 👇 ADD THESE TWO LINES (CRITICAL FOR TWILIO)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use("/api/whatsapp", whatsappRoutes);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store for cross-module access
setIO(io);

// Init socket service
initSocketService(io);

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});