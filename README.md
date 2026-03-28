# 🛡️ Cyber Guardian AI

An AI-powered Scam & Phishing Detector that protects you from fraudulent URLs and SMS messages.

## 🚀 Features
- 3-Layer scanning (Google Safe Browsing + VirusTotal + Groq AI)
- URL & SMS scanning
- Auto clipboard scanner
- Scan history saved to database
- Login / Signup with Email & Google
- 15+ Security tips
- Multi-language support (10 languages)

## 🛠️ Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| AI | Groq (LLaMA 3.3 70B) |
| APIs | VirusTotal + Google Safe Browsing |
| Auth | JWT + Google OAuth |

## ⚙️ Setup

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/cyber-guardian-ai.git
cd cyber-guardian-ai
```

### 2. Install dependencies
```bash
npm install
cd frontend && npm install
```

### 3. Create `.env` file
```env
GROQ_API_KEY=your_key
VIRUSTOTAL_API_KEY=your_key
GOOGLE_SAFE_BROWSING_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_KEY=your_key
JWT_SECRET=your_secret
SESSION_SECRET=your_secret
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### 4. Run the app
```bash
# Terminal 1 - Backend
node server.js

# Terminal 2 - Frontend
cd frontend && npm start
```

## 🔐 Security Note
Never share your `.env` file — it contains sensitive API keys.

## 📞 Cyber Crime Helpline
If you find a scam, report it: **1930**