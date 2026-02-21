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

import connectDB from './config/db.js';

const startServer = async () => {
    try {
        // 1. Connect to Database FIRST
        await connectDB();

        // 2. Start the Server
        server.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

            // 3. Initialize Socket.IO after DB is ready
            setIO(io);
            initSocketService(io);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();