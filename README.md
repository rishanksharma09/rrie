# RRIE — Rural Referral Intelligence Engine 🛰️🚑

> **Bridging the Great Divide: Orchestrating Life-Saving Referrals in Real-Time.**

RRIE is a mission-critical infrastructure designed to solve the "referral bottleneck" in rural healthcare. By combining **Generative AI Triage**, **Geospatial Intelligence**, and **Live Resource Orchestration**, RRIE ensures that every patient reaches the right facility, with the right specialists, at the right time.

---

## 🌟 The Vision
In rural areas, seconds save lives. Yet, 60% of emergency delays are caused by manual referral coordination and "blind" hospital transfers. RRIE eliminates the guesswork by creating a living, breathing digital twin of the healthcare network.

---

## 🚀 Key Features

### 1. User Emergency Portal (Multilingual Triage) 📱
- **Intelligent Voice Triage**: Speak symptoms naturally in **English or Hindi**. The system uses Google Gemini to translate, analyze, and reason through the clinical presentation.
- **AI Severity Grading**: Instantly classifies emergencies (e.g., Cardiac, Stroke, Trauma) and assigns a priority level.
- **Dynamic Resource Matching**: The engine doesn't just find the *closest* hospital; it finds the closest hospital that *actually has* the required specialists (Neurologists, Cardiologists) and equipment (CT Scans, MRI).
- **One-Tap Assistance**: Requests both a hospital referral and an automated ambulance dispatch simultaneously.

### 2. Hospital Command Center 🏥
- **Live Alert Feed**: Real-time notifications of incoming patients via WebSockets.
- **AI Medical Handover Report**: Generates a professional, structured clinical summary including:
    - Patient context and primary complaint.
    - AI-reasoned triage classification.
    - Risk flags (e.g., High Stroke Risk).
    - Clinical reasoning for the referral.
- **Official Documentation**: Includes a "Print Official Summary" feature with professional document styling for physical record-keeping.
- **Resource Management**: Hospitals can update their live state (Beds available, Specialists on-duty, Equipment status) to inform the global orchestration engine.

### 3. Ambulance Dispatch Portal 🚑
- **Real-Time Assignments**: Drivers receive instant push-notifications for new patient pick-ups.
- **Live Geospatial Tracking**: Integrated **Mapbox GL** for precise navigation to the patient's exact coordinates.
- **Communication Bridge**: Direct "Contact Patient" and "Contact Hospital" shortcuts to streamline field coordination.
- **Status Syncing**: Updates the entire network when the ambulance is dispatched, on-site, or en route to the hospital.

### 4. Network Explorer (Demonstration Mode) 🌐
- **Global Command View**: A premium Bento-style dashboard for judges and administrators to monitor the entire regional network at once.
- **Live WebSocket Sync**: Resource progress bars and status indicators update instantly as data changes anywhere in the system.
- **Health Indicators**: Aggregated metrics for total network capacity, active nodes, and systemic surge.
- **Logic Visualization**: Transparent view into how the RRIE Orchestration Engine ranks facilities based on geospatial and clinical data.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express, Socket.io (Real-time updates) |
| **AI / ML** | Google Gemini 1.5 Pro (Clinical Triage & Language Translation) |
| **Database** | MongoDB & Mongoose |
| **Location** | Mapbox GL JS (Precision Geospatial Intelligence) |
| **Authentication**| Firebase Google OAuth (Secure staff portals) |

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas or Local Instance
- Mapbox Access Token
- Google Gemini API Key
- Firebase Service Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rishanksharma09/rrie.git
   cd rrie
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Create a .env file with MONGODB_URI, GEMINI_API_KEY, etc.
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   # Create a .env file with VITE_BACKEND_URL, VITE_MAPBOX_ACCESS_TOKEN
   npm run dev
   ```

---

## 🎯 Demonstration Guide for Judges

1. **Phase 1: The Emergency** — Open the `/user` portal. Toggle to **Hindi**, use the microphone to say: *"मेरे सीने में बहुत दर्द है और सांस लेने में दिक्कत हो रही है"* (I have severe chest pain and difficulty breathing).
2. **Phase 2: The Logic** — Watch the AI translate this, identify a Cardiac emergency, and suggest the nearest hospital with a Cardiologist and available ER bed.
3. **Phase 3: The Handover** — Open the `/hospital` portal. See the live alert. Open the **Handover Report** and click **Print** to show the professional clinical summary.
4. **Phase 4: The Network** — Open the `/network` view to show how the system maintains a "Digital Twin" of every hospital's live capacity across the region.

---

## 📄 License
Built with ❤️ during the **Makeathon** for a better healthcare future.

---
*RRIE: Because every second counts.*
