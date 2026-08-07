# 🛡️ TrustLens

### AI-Powered Privacy Firewall for Secure AI Interactions

> **Protecting sensitive data before it reaches AI.**

TrustLens is an AI-powered Privacy Firewall that helps users safely interact with Large Language Models (LLMs) like Google Gemini by detecting, redacting, and auditing sensitive information before it reaches the AI model.

---

# 🚀 Problem Statement

Artificial Intelligence tools like ChatGPT and Gemini have become an essential part of daily work. However, users often unknowingly share confidential information such as:

- 🔑 API Keys
- 🔒 Passwords
- 📧 Email Addresses
- 📱 Phone Numbers
- 💳 Credit Card Numbers
- 🏢 Company Confidential Information
- 👤 Personally Identifiable Information (PII)

Once submitted, this sensitive data is processed by AI systems, creating privacy, security, and compliance risks.

---

# 💡 Our Solution

TrustLens acts as an intelligent privacy firewall between users and AI models.

Instead of directly sending prompts to an AI, TrustLens first analyzes every prompt using Google Gemini AI, identifies sensitive information, automatically redacts confidential data, classifies the privacy risk, stores an audit log, and forwards only the sanitized prompt to the AI.

This ensures secure, private, and trustworthy AI interactions.

---

# ✨ Features

- 🔐 JWT Authentication
- 🤖 AI Prompt Inspection
- 🛡 Automatic PII Detection
- ✂️ Sensitive Data Redaction
- ⚠️ Threat Classification (Low / Medium / High)
- 📋 Audit Logs
- 📊 Privacy Analytics Dashboard
- 💬 AI Privacy Assistant Chatbot
- 📈 Real-Time Risk Monitoring

---

# ⚙️ How It Works

```text
User Prompt
      │
      ▼
TrustLens Intercepts Prompt
      │
      ▼
Google Gemini AI Analysis
      │
      ▼
Sensitive Data Detection
      │
      ▼
Automatic Data Redaction
      │
      ▼
Threat Level Classification
      │
      ▼
Audit Log Generation
      │
      ▼
Sanitized Prompt Sent to AI
      │
      ▼
Dashboard Updated + Chatbot Guidance
```

---

# 🏗 System Architecture

```text
              +--------------------+
              |     React App      |
              +---------+----------+
                        |
                        |
                        ▼
               Express.js Backend
                        |
      +-----------------+-----------------+
      |                                   |
      ▼                                   ▼
 Google Gemini API                  MongoDB Atlas
      |                                   |
      ▼                                   ▼
Sensitive Data Detection          Audit Logs Storage
      |
      ▼
Redaction + Risk Classification
      |
      ▼
Safe Prompt Returned to User
```

---

# 📊 Dashboard

The Privacy Analytics Dashboard provides:

- Total Scans
- Total Sensitive Data Detected
- Threat Level Distribution
- Recent Audit Logs
- Risk Trends
- Compliance Monitoring

---

# 💬 AI Privacy Assistant Chatbot

The built-in chatbot helps users by:

- Explaining detected privacy risks
- Suggesting safer prompts
- Answering privacy-related questions
- Educating users on secure AI usage

---

# 🛠 Technology Stack

## Frontend

- React.js
- Tailwind CSS
- React Router
- Axios
- Recharts

## Backend

- Node.js
- Express.js
- JWT Authentication
- bcrypt
- Zod Validation
- Morgan
- dotenv
- CORS

## Database

- MongoDB Atlas/ replit default data base

## AI

- Google Gemini API

## Deployment

- replit deploymnemt 

---

# 📂 Project Structure

```
trustlens/

├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── index.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
```

---

# 🔌 API Endpoints

## Authentication

### Register

```
POST /api/auth/register
```

### Login

```
POST /api/auth/login
```

---

## Prompt Inspection

```
POST /api/inspect/analyze
```

---

## Dashboard Statistics

```
GET /api/audit/stats
```

---

# 🧪 Sample Input

```text
Hi ChatGPT,

My email is john@gmail.com

Password: Admin@123

API Key:

AIzaSyXXXXXX

Please debug my React application.
```

---

# ✅ Sample Output

```text
Hi ChatGPT,

My email is [REDACTED_EMAIL]

Password: [REDACTED_PASSWORD]

API Key:

[REDACTED_API_KEY]

Please debug my React application.
```

**Threat Level:** HIGH

Detected Items:

- Email
- Password
- API Key

---

# 🌍 Real-World Applications

🏦 Banking

🏥 Healthcare

🏢 Enterprises

🏛 Government Organizations

⚖ Legal Firms

🎓 Educational Institutions

💻 Software Companies

---

# ⭐ Why TrustLens?

Unlike traditional Data Loss Prevention (DLP) tools that rely primarily on predefined rules and regular expressions, TrustLens uses AI-powered contextual understanding to detect sensitive information.

### Key Advantages

- AI-powered contextual detection
- Automatic data redaction
- Privacy-first AI interactions
- Explainable threat analysis
- Enterprise-ready architecture
- Audit logging for compliance
- Interactive AI Privacy Assistant

---

# 🚀 Future Scope

- Browser Extension
- Gmail Integration
- Outlook Integration
- Slack Integration
- Microsoft Teams Integration
- Multi-AI Support (ChatGPT, Gemini, Claude)
- Enterprise Admin Dashboard
- Custom Compliance Policies
- Role-Based Access Control

---

# 🔐 Security

- JWT Authentication
- Password Hashing (bcrypt)
- Backend-only Gemini API Keys
- Secure Environment Variables
- Input Validation using Zod
- Protected API Routes

---

# 🎯 Unique Selling Proposition

**TrustLens doesn't replace AI—it makes AI safer.**

By acting as an intelligent privacy firewall, TrustLens detects, redacts, explains, and audits sensitive information before it reaches any AI model, enabling secure and trustworthy AI adoption.

---

# 👥 Team

**Project:** TrustLens

**Theme:** AI Security, Privacy & Trust

### Team Members

- adithi
- lahari
- kasthuri
- tanisha 

---

# 📜 License

This project was developed for an **AI Security, Privacy & Trust Hackathon** and is intended for educational and demonstration purposes.

---

# ⭐ Final Vision

> **"AI is transforming how we work. TrustLens ensures it doesn't compromise our privacy."**

**Protecting Privacy Before AI Sees It.**
