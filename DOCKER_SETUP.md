# Docker Setup Guide

This project includes complete Docker support for the frontend, backend, and MongoDB database.

## Prerequisites

- Docker & Docker Compose installed
- Environment variables configured (see below)

## Project Structure

```
rrie/
├── frontend/          # React + Vite application
├── backend/           # Express.js API server
├── docker-compose.yml # Orchestration file
└── .env              # Environment variables
```

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys:
- Firebase credentials
- OpenAI API key
- Google Generative AI key
- Twilio credentials
- Mapbox token
- MongoDB credentials (if customizing)

### 2. Build and Run All Services

```bash
# Start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Service Details

### Frontend (React/Vite)
- **Port**: 3000
- **Dockerfile**: `frontend/Dockerfile`
- **Status**: http://localhost:3000

### Backend (Express.js)
- **Port**: 5000
- **Dockerfile**: `backend/Dockerfile`
- **API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### MongoDB
- **Port**: 27017
- **Data**: Persisted in `mongodb_data` volume
- **Credentials**: See `.env` file

## Common Commands

```bash
# View all running containers
docker-compose ps

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Access MongoDB shell
docker exec -it rrie-mongodb mongosh -u admin -p password

# Rebuild a specific service
docker-compose build backend
docker-compose up -d backend

# Remove all containers and volumes
docker-compose down -v

# Restart a service
docker-compose restart backend
```

## Development vs Production

### Development Mode
```bash
# Use docker-compose for local development with live reload
docker-compose up --build

# Or run locally without Docker
npm run dev        # frontend
npm run dev        # backend (from backend directory)
```

### Production Mode
```bash
# Build images
docker-compose build

# Run containers
docker-compose up -d
```

## Troubleshooting

### Port already in use
```bash
# Change port in docker-compose.yml or stop conflicting service
docker-compose down

# Or use different ports
# Update ports in docker-compose.yml (e.g., "3001:3000")
```

### MongoDB connection issues
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Verify connection
docker exec -it rrie-mongodb mongosh -u admin -p password
```

### Backend not connecting to MongoDB
Ensure the `MONGO_ROOT_PASSWORD` in `.env` matches the backend's connection string.

### Environment variables not loaded
- Make sure `.env` file is in the project root
- Restart containers: `docker-compose down && docker-compose up -d`

## Performance Tips

- Use `.dockerignore` to exclude unnecessary files
- Both Dockerfiles use multi-stage builds for optimization
- MongoDB data is persisted in a named volume for data retention

## Networking

Services communicate via the `rrie-network` bridge:
- Frontend → Backend: `http://backend:5000`
- Backend → MongoDB: `mongodb://admin:password@mongodb:27017`

Update API URLs in frontend if needed to point to `http://backend:5000` when running in Docker.
