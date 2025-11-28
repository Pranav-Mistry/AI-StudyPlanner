# 🎓 AI Study Planner - Smart Learning Assistant

A comprehensive AI-powered study management platform that helps students track assignments, generate personalized study plans, summarize notes, and boost productivity using cutting-edge AI models.

## 🌟 Features

### 📚 Core Modules
- **AI Study Plan Generator** - Generate personalized study plans from syllabus using BART
- **Smart Notes Summarizer** - Summarize long study material into concise notes
- **AI Explanation Assistant** - Get simple explanations of complex topics using T5
- **Q&A on Notes** - Ask questions about your study material using RoBERTa
- **Progress Tracker** - Track learning progress with detailed analytics and charts
- **Gamification** - Streaks, points, badges, and leaderboard
- **Assignment & Exam Tracker** - Manage deadlines and track completion

### 🎯 Key Highlights
- ✅ Fully responsive web application (mobile & desktop)
- ✅ Real-time Firebase authentication and database
- ✅ Multiple AI models (BART, T5, RoBERTa, DistilBERT)
- ✅ Beautiful modern UI with Tailwind CSS
- ✅ Interactive charts and analytics
- ✅ PDF upload and text extraction
- ✅ Completely free and open-source stack

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React.js + Tailwind CSS | User interface and responsive design |
| **Backend** | Flask (Python) | API server and AI model integration |
| **Database** | Firebase (Firestore + Auth) | User data, authentication, and storage |
| **AI Models** | Hugging Face Transformers | Study plans, summarization, Q&A, explanations |
| **Charts** | Recharts | Progress visualization and analytics |
| **Icons** | Lucide React | Modern icon library |
| **Hosting** | Vercel/Netlify (Frontend), Render/Railway (Backend) | Deployment platforms |

## 🤖 AI Models Used

| Model | Purpose | Provider |
|-------|---------|----------|
| `facebook/bart-large-cnn` | Study plan generation & summarization | Hugging Face |
| `t5-small` | Concept explanations | Hugging Face |
| `deepset/roberta-base-squad2` | Question answering | Hugging Face |
| `distilbert-base-uncased` | Keyword extraction | Hugging Face |

## 📁 Project Structure

```
AI-StudyPlanner/
├── backend/
│   ├── app.py                          # Main Flask application
│   ├── ai_models.py                    # AI model implementations
│   ├── pdf_processor.py                # PDF text extraction
│   ├── requirements.txt                # Python dependencies
│   ├── .env.example                    # Environment variables template
│   └── firebase-credentials.example.json
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── api/
│   │   │   ├── axios.js               # API client configuration
│   │   │   └── services.js            # API service functions
│   │   ├── components/
│   │   │   ├── Navbar.js              # Navigation bar
│   │   │   ├── Card.js                # Reusable card component
│   │   │   └── LoadingSpinner.js      # Loading indicator
│   │   ├── firebase/
│   │   │   └── config.js              # Firebase configuration
│   │   ├── pages/
│   │   │   ├── Login.js               # Login page
│   │   │   ├── Register.js            # Registration page
│   │   │   ├── Dashboard.js           # Main dashboard
│   │   │   ├── StudyPlan.js           # Study plan generator
│   │   │   ├── NoteSummarizer.js      # Notes summarization
│   │   │   ├── AIAssistant.js         # AI chat assistant
│   │   │   ├── Progress.js            # Progress tracking
│   │   │   └── Leaderboard.js         # Gamification leaderboard
│   │   ├── App.js                     # Main app component
│   │   ├── index.js                   # Entry point
│   │   └── index.css                  # Global styles
│   ├── package.json                   # Node dependencies
│   ├── tailwind.config.js             # Tailwind configuration
│   └── postcss.config.js              # PostCSS configuration
│
└── README.md                          # This file
```

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/)
- **Firebase Account** - [Create Account](https://firebase.google.com/)

### Step 1: Clone the Repository
```bash
cd e:\PRANAV\AI-StudyPlanner
```

### Step 2: Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Enter project name: `ai-study-planner`
   - Follow the setup wizard

2. **Enable Authentication**
   - In Firebase Console, go to **Authentication**
   - Click "Get Started"
   - Enable **Email/Password** and **Google** sign-in methods

3. **Create Firestore Database**
   - Go to **Firestore Database**
   - Click "Create Database"
   - Start in **Test Mode** (for development)
   - Choose your region

4. **Get Firebase Credentials**

   **For Frontend (Web App):**
   - Go to Project Settings (⚙️ icon)
   - Scroll to "Your apps" section
   - Click "Web" icon (</>) to add a web app
   - Register app with nickname: `study-planner-web`
   - Copy the `firebaseConfig` object
   - Paste into `frontend/src/firebase/config.js`

   **For Backend (Service Account):**
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file
   - Rename it to `firebase-credentials.json`
   - Move it to `backend/` folder

### Step 3: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# Edit .env file if needed (optional)
notepad .env
```

**Important:** Make sure `firebase-credentials.json` is in the `backend/` folder!

### Step 4: Frontend Setup

```bash
# Open a NEW terminal/command prompt
# Navigate to frontend folder
cd e:\PRANAV\AI-StudyPlanner\frontend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env if backend is on different port (optional)
notepad .env
```

**Update Firebase Config:**
- Open `frontend/src/firebase/config.js`
- Replace the placeholder values with your Firebase config from Step 2

### Step 5: Run the Application

**Terminal 1 - Backend:**
```bash
cd e:\PRANAV\AI-StudyPlanner\backend
venv\Scripts\activate
python app.py
```
✅ Backend will run on: `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd e:\PRANAV\AI-StudyPlanner\frontend
npm start
```
✅ Frontend will open automatically at: `http://localhost:3000`

## 📱 How to Use

### 1. **Register/Login**
   - Open `http://localhost:3000`
   - Create a new account or login with Google
   - You'll be redirected to the dashboard

### 2. **Generate Study Plan**
   - Click "Study Plan" in navigation
   - Upload your syllabus PDF or paste text
   - Set number of days available
   - Click "Generate Study Plan"
   - AI will create a personalized day-by-day plan

### 3. **Summarize Notes**
   - Click "Summarizer" in navigation
   - Paste your long notes or study material
   - Click "Generate Summary"
   - Get concise, easy-to-understand summary

### 4. **AI Assistant**
   - Click "AI Assistant" in navigation
   - Choose mode: "Explain Concept" or "Q&A on Notes"
   - For explanations: Type any concept
   - For Q&A: Paste your notes as context, then ask questions
   - Get instant AI-powered responses

### 5. **Track Progress**
   - Click "Progress" in navigation
   - View completion rate, topics completed, streak
   - See charts showing weekly study hours and progress
   - Monitor all your study plans

### 6. **Compete on Leaderboard**
   - Click "Leaderboard" in navigation
   - See top performers
   - Earn points by completing topics and maintaining streaks
   - Climb the rankings!

## 🎮 Gamification System

### How to Earn Points:
- ✅ Complete study topics: **+10 points**
- 🔥 Maintain daily streak: **+5 points/day**
- 📝 Upload and summarize notes: **+3 points**
- 📚 Generate study plans: **+5 points**
- 🤖 Use AI assistant: **+2 points**

### Badges & Achievements:
- 🏆 Top 3 rankings on leaderboard
- 🔥 Streak milestones (7, 30, 100 days)
- 🎯 Completion milestones (10, 50, 100 topics)

## 🌐 Deployment

### Frontend Deployment (Vercel)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
cd frontend
vercel
```

3. **Follow prompts:**
   - Link to existing project or create new
   - Set build command: `npm run build`
   - Set output directory: `build`

4. **Set Environment Variables:**
   - In Vercel dashboard, add `REACT_APP_API_URL` with your backend URL

### Backend Deployment (Render)

1. **Create account on [Render.com](https://render.com/)**

2. **Create New Web Service:**
   - Connect your GitHub repository
   - Select `backend` folder
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`

3. **Add Environment Variables:**
   - Upload `firebase-credentials.json` as a file
   - Set `PORT=5000`

4. **Deploy!**

## 🔧 Troubleshooting

### Backend Issues:

**AI Models not loading:**
```bash
# Make sure you have enough RAM (8GB+ recommended)
# Models will download on first run (may take time)
# Check internet connection
```

**Firebase connection error:**
```bash
# Verify firebase-credentials.json is in backend folder
# Check if file has correct permissions
# Ensure Firebase project is active
```

### Frontend Issues:

**Firebase auth not working:**
- Check if `firebaseConfig` in `config.js` is correct
- Verify Email/Password auth is enabled in Firebase Console
- Check browser console for specific errors

**API connection failed:**
- Ensure backend is running on port 5000
- Check `.env` file has correct `REACT_APP_API_URL`
- Verify CORS is enabled in Flask (already configured)

### Common Errors:

**Port already in use:**
```bash
# Backend (Windows):
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Frontend:
# Change port in package.json or set PORT=3001 before npm start
```

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/auth/register` | POST | Register new user |
| `/api/syllabus/upload` | POST | Upload syllabus PDF |
| `/api/study-plan/generate` | POST | Generate study plan |
| `/api/notes/summarize` | POST | Summarize notes |
| `/api/explain` | POST | Explain concept |
| `/api/qa` | POST | Answer question |
| `/api/progress/update` | POST | Update progress |
| `/api/progress/<user_id>` | GET | Get user progress |
| `/api/leaderboard` | GET | Get leaderboard |

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is open-source and available under the MIT License.

## 👨‍💻 Author

**Pranav**
- Project: AI Study Planner
- Type: Minor Project / Final Year Project
- Tech: Full-Stack Web Development + AI/ML

## 🙏 Acknowledgments

- **Hugging Face** for providing free AI models
- **Firebase** for backend services
- **React** and **Tailwind CSS** for frontend framework
- **Flask** for backend framework

## 📞 Support

If you encounter any issues or have questions:
1. Check the Troubleshooting section above
2. Review Firebase and API configurations
3. Ensure all dependencies are installed correctly
4. Check browser console and terminal for error messages

---

## 🎉 You're All Set!

Your AI Study Planner is ready to use. Start by creating an account and uploading your first syllabus!

**Happy Learning! 📚✨**
