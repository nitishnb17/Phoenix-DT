# PHOENIX-DT

**AI-Powered Digital Twin for UAV Propulsion Health Monitoring**

> Built for Smart India Hackathon 2026 — DRDO Problem Statement ID **26054**
> Team: **Syntax Syndicate**

---

## 🚀 Overview

PHOENIX-DT is a real-time digital twin system designed to monitor the health of MALE UAV (Medium Altitude Long Endurance) aero-piston propulsion systems. It combines physics-based simulation with AI-driven diagnostics to detect faults early, estimate Remaining Useful Life (RUL), and assist maintenance crews through an integrated AI copilot — helping prevent in-flight failures before they happen.

---

## ❗ Problem Statement

UAV propulsion systems currently lack real-time, intelligent health monitoring — failures are often detected too late, risking mission failure and costly downtime. DRDO PS 26054 calls for a system that can continuously track engine health, predict degradation, and support faster, smarter maintenance decisions.

---

## ✨ Key Features

- 🔧 **Physics-Based Simulation** — Real-time digital twin modeling of aero-piston engine behavior
- 🚨 **Multi-Channel Fault Detection** — Identifies anomalies across multiple sensor/data streams simultaneously
- 📉 **RUL Estimation** — Predicts Remaining Useful Life of critical components
- 🤖 **LLM-Powered Maintenance Copilot** — Conversational AI assistant for maintenance guidance and diagnostics
- 🔐 **Role-Based Access Control** — Separate views/permissions for operators, engineers, and admins
- 📊 **Real-Time Dashboard** — Live visualization of engine health metrics

---

## 🖼️ Screenshots

<!-- Add your dashboard screenshots here -->
<!-- ![Dashboard](screenshots/dashboard.png) -->

---

## 🛠️ Tech Stack

| Layer      | Technology                  |
|------------|------------------------------|
| Frontend   | React, TypeScript, Vite      |
| Styling    | TailwindCSS                  |
| AI/LLM     | LLM-based Maintenance Copilot |
| Simulation | Physics-based engine modeling |

---

## 🏗️ Architecture

<!-- Add architecture diagram here -->
<!-- ![Architecture](docs/architecture.png) -->

```
Sensors/Simulated Data → Digital Twin Engine → Fault Detection & RUL Model → Dashboard + AI Copilot
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/nitishnb17/PHOENIX-DT.git
cd PHOENIX-DT

# Install dependencies
npm install

# Run the development server
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

---

## 📁 Project Structure

```
PHOENIX-DT/
├── src/               # Application source code
├── public/            # Static assets
├── docs/              # Pitch deck, proposal, diagrams
├── screenshots/        # UI screenshots
└── README.md
```

---

## 👥 Team — Syntax Syndicate

Built with ❤️ for Smart India Hackathon 2026.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
