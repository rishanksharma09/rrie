import './config/instrument.js';
import http from 'http';
import logger from './config/logger.js';
import { Server } from 'socket.io';
import app from './app.js';
import { initSocketService } from './services/socketService.js';
import { setIO } from './config/socket.js';
import redisClient from './config/redis.js';
import { createAdapter } from '@socket.io/redis-adapter';
import mongoose from 'mongoose';

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


        try {
            const pubClient = redisClient.duplicate();
            const subClient = redisClient.duplicate();

            await Promise.all([
                pubClient.connect(),
                subClient.connect()
            ]);

            io.adapter(createAdapter(pubClient, subClient));
            logger.info('Redis adapter connected successfully for Socket.io');
        } catch (redisError) {
            logger.warn('Failed to connect to Redis for Socket.io adapter. Falling back to in-memory adapter.');
        }


        // 2. Start the Server
        server.listen(PORT, () => {
            logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

            // 3. Initialize Socket.IO after DB is ready
            setIO(io);
            initSocketService(io);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

const shutdownServer = async () => {
    const forceExit = setTimeout(() => {
        logger.error('[System] Graceful shutdown timed out, forcing exit.');
        process.exit(1);
    }, 10000);
    try {
        logger.info(`[Socket] Server shutting down`);
        io.emit('serverShutdown', { message: 'Maintaining the system. Back soon!' });
        await io.close();
        await redisClient.quit();
        await mongoose.connection.close();
        clearTimeout(forceExit);
    } catch (error) {
        logger.error(`[Socket] Failed to shutdown server: ${error}`);
    } finally {
        server.close(() => {
            logger.info(`[Socket] Server closed`);
            process.exit(0);
        });
    }
};

process.on('SIGTERM', shutdownServer);
process.on('SIGINT', shutdownServer);


startServer();