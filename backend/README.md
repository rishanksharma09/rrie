# RRIE — Backend API Service 🛰️

The core orchestration engine for the Rural Referral Intelligence Engine. Built with Node.js, Express, and Socket.io, this service handles clinical triage weighting, geospatial provider discovery, and real-time state synchronization across the medical network.

---

## 🚀 Key Features

### 1. Intelligent Clinical Triage
- **Gemini 1.5 Pro Integration**: Processes natural language symptoms (multilingual) to extract clinical context, severity, and required resources.
- **Dynamic Weighting**: Ranks hospitals not just by distance, but by real-time specialist availability and equipment status.

### 2. High-Performance Orchestration
- **Redis-Backed Sockets**: Uses a Redis adapter to ensure WebSocket events are synchronized across multiple server instances.
- **Geospatial Intelligence**: Leverages MongoDB `2dsphere` indexes for rapid proximity searches and Redis for live ambulance coordinate tracking.

### 3. Production Hardening
- **Monitoring**: Sentry SDK for real-time error reporting and performance tracing.
- **Structured Logging**: Winston-based logging with file rotation and colored console output.
- **Rate Limiting**: Multi-tier Redis-backed rate limiting to prevent API abuse and brute-force attacks.
- **Security**: Helmet.js for secure HTTP headers and CORS configuration.
- **Graceful Shutdown**: Handlers for `SIGTERM`/`SIGINT` to cleanly close DB connections and drain active sockets.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Real-time**: Socket.io (with Redis Adapter)
- **AI**: Google Generative AI (Gemini)
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis (Rate limiting & Geospatial)
- **Auth**: Firebase Admin SDK
- **Docs**: Swagger UI (OpenAPI 3.0)
- **Testing**: Jest & Supertest

---

## 🚦 Getting Started

### Prerequisites
Ensure you have the following environment variables in `.env`:
```bash
PORT=5000
MONGODB_URI=your_mongodb_uri
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_key
SENTRY_DSN=your_sentry_dsn (production only)
FIREBASE_SERVICE_ACCOUNT=path_to_json
```

### Scripts
- `npm install`: Install dependencies.
- `npm run dev`: Start development server with Nodemon and Sentry instrumentation.
- `npm start`: Start production server.
- `npm test`: Run the Jest/Supertest suite.

---

## 📖 API Documentation
Once the server is running, visit `http://localhost:5000/api-docs` to access the interactive Swagger documentation and test the endpoints.

---

## 📂 Architecture
- `/config`: Sentry, Winston, Database, and Socket.io initialization.
- `/controllers`: Request handling logic.
- `/models`: Mongoose schemas with geospatial indexes.
- `/middlewares`: Error handling, Auth verification, and Rate limiting.
- `/routes`: API endpoint definitions.
- `/services`: Core business logic (Gemini triage, Socket orchestration).
- `/utils`: Helper functions and loggers.
