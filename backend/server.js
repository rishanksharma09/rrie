import http from 'http';
import { Server } from 'socket.io';
import express from 'express';   // 👈 ADD THIS
import app from './app.js';
import { initSocketService } from './services/socketService.js';
import whatsappRoutes from "./routes/whatsapp.routes.js";



app.post("/test", (req, res) => {
    console.log("Test route hit");
    console.log(req.body);
    res.send("OK");
});

// 👇 ADD THESE TWO LINES (CRITICAL FOR TWILIO)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Init socket service
initSocketService(io);

export { io };

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});