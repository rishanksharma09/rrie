import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { initSocketService } from './services/socketService.js';
import whatsappRoutes from "./routes/whatsapp.routes.js";

app.use("/api/whatsapp", whatsappRoutes);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for now, restrict in production
        methods: ["GET", "POST"]
    }
});

// Attach Socket.IO to global object if needed for orchestration
// Or better, pass it to orchestration if we change its signature
// For now, init the socket service which handles its own logic
initSocketService(io);

// Export io for use in other services (like orchestration)
export { io };

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
