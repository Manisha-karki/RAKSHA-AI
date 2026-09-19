<div align="center">

# 🛡️ RAKSHA AI (रक्षा)

### *AI-Driven Victim Distress Monitoring & Caseworker Escalation System*



![Node.js](https://img.shields.io/badge/NODE.JS-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)




![Express](https://img.shields.io/badge/EXPRESS-4.x-000000?style=for-the-badge&logo=express&logoColor=white)




![Chart.js](https://img.shields.io/badge/CHART.JS-4.4-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)




![Google Sign-In](https://img.shields.io/badge/GOOGLE-SIGN--IN-4285F4?style=for-the-badge&logo=google&logoColor=white)




![Vercel](https://img.shields.io/badge/DEPLOY-VERCEL-000000?style=for-the-badge&logo=vercel&logoColor=white)




![SIH](https://img.shields.io/badge/SMART%20INDIA%20HACKATHON-PROTOTYPE-orange?style=for-the-badge)



**Bridging the gap between a victim's first cry for help and a caseworker's timely response, through an empathetic AI companion, explainable risk scoring, and a real-time monitoring dashboard.**

[Quick Start](#quick-start) • [Key Features](#key-features) • [Architecture](#architecture) • [API](#api-endpoints) • [Tech Stack](#tech-stack) • [Roadmap](#roadmap)

</div>

---

## 📌 Executive Summary

Victims of abuse and distress often reach out late, and caseworkers manage many cases with little visibility into who needs help first. Warning signs are easy to miss between scheduled check-ins.

**RAKSHA AI** is an end-to-end distress monitoring prototype that combines:

- 💬 **A supportive chat companion** that victims can type or speak to, available any time
- 📊 **Explainable risk scoring** that turns mood check-ins and flagged keywords into a distress score
- 🗂️ **A caseworker dashboard** with live stats, trends, and risk breakdowns across all active cases
- 🚨 **One-click escalation** so high-risk cases reach a caseworker immediately

<a id="key-features"></a>
## ✨ Key Features

| Feature | Description |
|---|---|
| 💬 **RAKSHA AI Chat** | FAQ-based responder with no external API and no cost. Detects distress keywords and responds with care |
| 🎤 **Voice Input** | Speak a message using the browser's Web Speech API (English, India) |
| 🗑️ **Chat Controls** | Delete individual messages or clear the entire conversation |
| 🧮 **Risk Scoring** | Mood base score plus keyword bumps, mapped to **Low / Medium / High** tiers |
| 🔍 **Explainability** | Every score comes with a "Why this score" breakdown, with no black box |
| 📈 **Trend Tracking** | Week-by-week score history per case with trend arrows |
| 🗂️ **Case Dashboard** | Active cases, high-risk count, escalations, average distress score, searchable and filterable table |
| 🍩 **Visual Analytics** | Risk breakdown donut chart and per-case trend chart (Chart.js) |
| 🚨 **Escalation** | Escalate any case to a caseworker in one click |
| 🔐 **Secure Login** | Username/password (bcrypt-hashed) and Google Sign-In |
| 👤 **Profile Menu** | Profile icon with Google photo or initial, name, email, and logout |

<a id="architecture"></a>
## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 Browser (public/)                        │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Login      │  │ RAKSHA AI    │  │ Caseworker       │  │
│  │ (React)    │  │ Chat + Voice │  │ Dashboard        │  │
│  └─────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
└────────┼────────────────┼───────────────────┼────────────┘
         │  fetch /api/*  │                   │
┌────────▼────────────────▼───────────────────▼────────────┐
│              Express Server (server.js)                  │
│  /api/login  /api/signup  /api/auth/google               │
│  /api/chat   /api/checkin /api/cases  /api/escalate      │
│                                                          │
│   Risk Engine: mood score + keyword bump → tier          │
└────────────────────────────┬─────────────────────────────┘
                             │
                   ┌─────────▼─────────┐
                   │  data.js          │
                   │  cases, users,    │
                   │  FAQs, risk words │
                   └───────────────────┘
```

### How the risk score works

1. The victim picks a **mood**, which gives a **base score**.
2. Their note is scanned for **risk keywords**. Each hit adds **+10**, capped at **+30**.
3. Final score is capped at **100** and mapped to a tier:

| Score | Tier |
|---|---|
| 65 and above | 🔴 **High** |
| 35 to 64 | 🟠 **Medium** |
| Below 35 | 🟢 **Low** |

<a id="quick-start"></a>
## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>/frontend

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

Open **http://localhost:3000** in your browser.

> **Google Sign-In:** add `http://localhost:3000` (and your deployed URL) to *Authorized JavaScript origins* for your OAuth client in Google Cloud Console.

<a id="api-endpoints"></a>
## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/signup` | Create an account |
| POST | `/api/login` | Sign in with username and password |
| POST | `/api/auth/google` | Verify a Google credential and sign in |
| POST | `/api/chat` | Send a message to RAKSHA AI |
| POST | `/api/checkin` | Submit a mood check-in and get a score |
| GET | `/api/cases` | List all cases with score and trend |
| GET | `/api/cases/:id/history` | Score history and explanation for a case |
| POST | `/api/escalate` | Escalate a case to a caseworker |

<a id="tech-stack"></a>
## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express |
| **Auth** | bcryptjs, google-auth-library, Google Identity Services |
| **Frontend** | Vanilla JavaScript, React (login screen), HTML, CSS |
| **Charts** | Chart.js |
| **Voice** | Web Speech API |
| **Hosting** | Vercel (serverless) |

## 📁 Project Structure

```
SIH-MVP/
└── frontend/
    ├── api/
    │   └── index.js        # Vercel serverless entry
    ├── public/
    │   ├── index.html      # App layout
    │   ├── login.js        # React login screen
    │   ├── project.js      # Dashboard logic
    │   ├── chat.js         # Chat, voice, profile menu
    │   └── style.css
    ├── data.js             # Cases, users, FAQs, risk words
    ├── server.js           # Express API
    ├── vercel.json
    └── package.json
```

<a id="roadmap"></a>
## 🗺️ Roadmap

- [ ] Persistent database (Supabase / MongoDB) instead of in-memory data
- [ ] Multilingual chat (Hindi and regional languages)
- [ ] SMS and WhatsApp channels for check-ins
- [ ] Caseworker notifications on escalation
- [ ] Role-based access (victim vs caseworker)
- [ ] Smarter NLP-based distress detection

## ⚠️ Disclaimer

RAKSHA AI is a **prototype** built for the Smart India Hackathon. It is not an emergency service. In immediate danger, contact local emergency services.

---

<div align="center">

**Built with ❤️ for the Smart India Hackathon**

</div>