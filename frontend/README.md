# RRIE — Frontend Dashboard Service 🏥📱

The user-facing platform for the Rural Referral Intelligence Engine. Built with React 19, TypeScript, and Vite, this application provides specialized portals for emergency triage, hospital resource management, and ambulance dispatch coordination.

---

## 🌟 Key Features

### 1. Emergency Portal (`/user`)
- **Multilingual Triage**: Speak symptoms in English or Hindi to receive an AI-reasoned clinical triage score.
- **Real-Time Orchestration**: Automatically requests the optimal hospital and ambulance based on the AI assessment.
- **Live Status Feed**: Dynamic progress bars and status indicators linked to the backend orchestrator.

### 2. Provider Dashboards (`/hospital` & `/ambulance`)
- **Hospital Command Center**: High-fidelity alert feed for incoming patients, complete with AI-generated clinical handover reports.
- **Official Summaries**: Professional print-ready medical reports for physical documentation.
- **Ambulance Tracking**: Integrated **Mapbox GL** for real-time geospatial navigation and status syncing.

### 3. Global Network View (`/network`)
- **Digital Twin**: A premium Bento-style dashboard providing a regional overview of hospital capacity, active nodes, and systemic load.
- **WebSocket Sync**: Instant UI updates reflecting changes anywhere in the medical network.

### 4. Reliability & UX
- **Maintenance Awareness**: Built-in state management via **Zustand** that listens for backend shutdown signals, automatically display high-fidelity maintenance overlays.
- **Responsive Design**: Mobile-first architecture using **Tailwind CSS** for frontline healthcare workers.

---

## 🛠️ Technology Stack

- **Framework**: React 19 (Vite Build System)
- **Language**: TypeScript (Strict Mode)
- **State Management**: Zustand
- **Styling**: Tailwind CSS & Framer Motion
- **Maps**: Mapbox GL JS & React Map GL
- **Communication**: Socket.io-client (Real-time updates)
- **Auth**: Firebase Google OAuth

---

## 🚦 Getting Started

### Prerequisites
Ensure you have the following environment variables in `.env`:
```bash
VITE_BACKEND_URL=http://localhost:5000
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
VITE_FIREBASE_API_KEY=your_firebase_key
```

### Scripts
- `npm install`: Install dependencies.
- `npm run dev`: Start Vite development server with HMR.
- `npm run build`: Type-check and build the production bundle.
- `npm run preview`: Preview the production build locally.

---

## 📂 Project Structure
- `/src/components`: Reusable UI components, layout elements, and specific portal modules.
- `/src/store`: Zustand stores for global state (Maintenance mode, Auth, Hospital-Patient context).
- `/src/services`: API clients and Socket.io initialization.
- `/src/hooks`: Custom React hooks for geospatial logic and real-time listeners.
- `/src/assets`: Icons, images, and global styles.
