/**
 * Main socket service entry point
 * Re-exports the modular socket service and shared state
 */

// Re-export the main socket service
export { initSocketService } from './sockets/index.js';

// Re-export the driver sockets map for orchestration service
export { driverSockets } from './sockets/socketMaps.js';
