import { createClient } from 'redis';
import logger from './logger.js';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Connected to Redis'));

let isRedisConnected = false;

try {
    await redisClient.connect();
    isRedisConnected = true;
} catch (error) {
    logger.warn('Redis is unavailable at ' + (process.env.REDIS_URL || 'localhost:6379') + '. Falling back to in-memory mode.');
}

export { isRedisConnected };


export default redisClient;
