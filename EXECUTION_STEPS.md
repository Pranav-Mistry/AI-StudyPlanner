


# 🎯 EXECUTION STEPS - AI Study Planner

## 📋 Complete Step-by-Step Execution Guide

Follow these steps **in exact order** to run your AI Study Planner project.

---

## 🔥 PHASE 1: FIREBASE CONFIGURATION (Mandatory)

### Step 1.1: Create Firebase Project

1. Open browser and go to: **https://console.firebase.google.com/**
2. Click **"Add Project"** or **"Create a Project"**
3. Enter Project Name: `ai-study-planner`
4. Click **Continue**
5. Disable Google Analytics (optional for this project)
6. Click **Create Project**
7. Wait for project creation (30 seconds)
8. Click **Continue** when done

### Step 1.2: Enable Authentication

1. In Firebase Console, click **Authentication** in left sidebar
2. Click **Get Started** button
3. Go to **Sign-in method** tab
4. Click on **Email/Password**
   - Toggle **Enable** switch ON
   - Click **Save**
5. Click on **Google**
   - Toggle **Enable** switch ON
   - Select your email from dropdown
   - Click **Save**

### Step 1.3: Create Firestore Database

1. Click **Firestore Database** in left sidebar
2. Click **Create Database** button
3. Select **Start in test mode** (for development)
4. Click **Next**
5. Choose your location (e.g., `asia-south1` for India)
6. Click **Enable**
7. Wait for database creation (1 minute)

### Step 1.4: Get Frontend Credentials (Web App)

1. Click **⚙️ Settings icon** (top-left) → **Project Settings**
2. Scroll down to **"Your apps"** section
3. Click the **Web icon** `</>`
4. Register app:
   - App nickname: `study-planner-web`
   - Don't check Firebase Hosting
   - Click **Register app**
5. **COPY the firebaseConfig object** - it looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "ai-study-planner-xxxxx.firebaseapp.com",
  projectId: "ai-study-planner-xxxxx",
  storageBucket: "ai-study-planner-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

6. **SAVE THIS** in a notepad - you'll need it in Step 3.3
7. Click **Continue to console**

### Step 1.5: Get Backend Credentials (Service Account)

1. Still in **Project Settings**
2. Click **Service Accounts** tab (top menu)
3. Click **Generate New Private Key** button
4. Click **Generate Key** in the popup
5. A JSON file will download (e.g., `ai-study-planner-xxxxx-firebase-adminsdk-xxxxx.json`)
6. **IMPORTANT**: Rename this file to exactly: `firebase-credentials.json`
7. **Move this file** to: `e:\PRANAV\AI-StudyPlanner\backend\`

✅ **Checkpoint**: You should have:
- Firebase project created
- Authentication enabled (Email + Google)
- Firestore database created
- Web config copied (from Step 1.4)
- `firebase-credentials.json` in backend folder

---

## 🐍 PHASE 2: BACKEND SETUP

### Step 2.1: Open Command Prompt

1. Press `Win + R`
2. Type: `cmd`
3. Press Enter

### Step 2.2: Navigate to Backend Folder

```bash
cd e:\PRANAV\AI-StudyPlanner\backend
```

### Step 2.3: Create Virtual Environment

```bash
python -m venv venv
```

**Wait**: This creates a `venv` folder (takes 30 seconds)

### Step 2.4: Activate Virtual Environment

```bash
venv\Scripts\activate
```

**You should see**: `(venv)` appears before your command prompt

### Step 2.4.1: Fix Python 3.13 Compatibility (If using Python 3.13+)

**Only if you have Python 3.13+**, run these commands first:

```bash
python -m pip install --upgrade pip
pip install --upgrade setuptools wheel
```

**Note**: Python 3.13 removed `distutils` and `pkgutil.ImpImporter`, so we need the latest pip and setuptools.

### Step 2.5: Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Wait**: This will take **5-10 minutes** and install:
- Flask
- Transformers (AI models)
- PyTorch 2.6.0
- Firebase Admin
- And other dependencies

**Note**: You'll see lots of text scrolling - this is normal!

### Step 2.6: Create Environment File

```bash
copy .env.example .env
```

### Step 2.7: Verify Firebase Credentials

```bash
dir firebase-credentials.json
```

**You should see**: File size and date (not "File Not Found")

✅ **Checkpoint**: Backend is ready!

---

## ⚛️ PHASE 3: FRONTEND SETUP

### Step 3.1: Open NEW Command Prompt

1. Press `Win + R`
2. Type: `cmd`
3. Press Enter

**Important**: Keep the first terminal open with backend!

### Step 3.2: Navigate to Frontend Folder

```bash
cd e:\PRANAV\AI-StudyPlanner\frontend
```

### Step 3.3: Install Node Dependencies

```bash
npm install
```

**Wait**: This will take **3-5 minutes** and install:
- React
- Tailwind CSS
- Recharts
- Firebase SDK
- And other dependencies

### Step 3.4: Create Environment File

```bash
copy .env.example .env
```

### Step 3.5: Update Firebase Configuration

**CRITICAL STEP**:

1. Open file: `e:\PRANAV\AI-StudyPlanner\frontend\src\firebase\config.js`
2. You'll see this:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. **Replace** with the config you saved in Step 1.4
4. **Save the file** (Ctrl + S)

**Example of correct config**:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "ai-study-planner-12345.firebaseapp.com",
  projectId: "ai-study-planner-12345",
  storageBucket: "ai-study-planner-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

✅ **Checkpoint**: Frontend is ready!

---

## 🚀 PHASE 4: RUN THE APPLICATION

### Step 4.1: Start Backend Server

**In Terminal 1** (backend):

```bash
cd e:\PRANAV\AI-StudyPlanner\backend
venv\Scripts\activate
python app.py
```

**You should see**:
```
🔧 Using device: CPU
📥 Loading AI models...
✅ Summarization model loaded
✅ Explanation model loaded
✅ Q&A model loaded
🎉 All AI models loaded successfully!
✅ Firebase initialized successfully
 * Running on http://0.0.0.0:5000
```

**First Time**: Model download takes **5-10 minutes** (2-3 GB)
**Next Times**: Loads instantly (models cached)

**⚠️ DO NOT CLOSE THIS TERMINAL**

### Step 4.2: Start Frontend Server

**In Terminal 2** (frontend):

```bash
cd e:\PRANAV\AI-StudyPlanner\frontend
npm start
```

**You should see**:
```
Compiled successfully!

You can now view ai-study-planner-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

**Browser will open automatically** at `http://localhost:3000`

✅ **Success**: You should see the login page!

---

## 🎮 PHASE 5: TEST THE APPLICATION

### Test 1: Register Account

1. Click **"Sign up"** link
2. Enter:
   - Name: Your Name
   - Email: test@example.com
   - Password: test123456
   - Confirm Password: test123456
3. Click **"Create Account"**
4. You should be redirected to **Dashboard**

### Test 2: Dashboard

- Verify you see: "Welcome back, Your Name!"
- Check stats cards (all will be 0 initially)
- Click through feature cards

### Test 3: Study Plan Generator

1. Click **"Study Plan"** in navbar
2. Paste this sample syllabus:

```
Chapter 1: Introduction to Data Structures
Chapter 2: Arrays and Linked Lists
Chapter 3: Stacks and Queues
Chapter 4: Trees and Binary Search Trees
Chapter 5: Graphs and Graph Algorithms
Chapter 6: Sorting Algorithms
Chapter 7: Searching Algorithms
Chapter 8: Dynamic Programming
Chapter 9: Greedy Algorithms
Chapter 10: Hashing and Hash Tables
```

3. Set Days: `30`
4. Click **"Generate Study Plan"**
5. **Wait 10-20 seconds** for AI to process
6. Verify you see a day-by-day study plan

### Test 4: Notes Summarizer

1. Click **"Summarizer"** in navbar
2. Paste this sample text:

```
Artificial Intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals. The term artificial intelligence had previously been used to describe machines that mimic and display human cognitive skills that are associated with the human mind, such as learning and problem-solving. This definition has since been rejected by major AI researchers who now describe AI in terms of rationality and acting rationally, which does not limit how intelligence can be articulated. AI applications include advanced web search engines, recommendation systems, understanding human speech, self-driving cars, automated decision-making and competing at the highest level in strategic game systems.
```

3. Click **"Generate Summary"**
4. **Wait 5-10 seconds**
5. Verify you get a concise summary

### Test 5: AI Assistant

1. Click **"AI Assistant"** in navbar
2. Select **"Explain Concept"** mode
3. Type: `Explain machine learning`
4. Click **Send** button
5. **Wait 5-10 seconds**
6. Verify you get an explanation

### Test 6: Progress & Leaderboard

1. Click **"Progress"** - see your stats and charts
2. Click **"Leaderboard"** - see rankings (empty initially)

✅ **All tests passed**: Your application is working perfectly!

---

## 📱 PHASE 6: ACCESSING THE APP

### On Your Computer:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### On Your Phone (Same WiFi):
1. Find your computer's IP address:
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.5)

2. On phone browser, go to:
   - `http://192.168.1.5:3000`

---

## 🛑 STOPPING THE APPLICATION

### To Stop:
1. **Terminal 1** (Backend): Press `Ctrl + C`
2. **Terminal 2** (Frontend): Press `Ctrl + C`
3. Close browser tabs

### To Restart:
Just repeat Phase 4 (Steps 4.1 and 4.2)

---

## 🔧 TROUBLESHOOTING

### Problem: "Firebase credentials not found"
**Solution**:
```bash
cd e:\PRANAV\AI-StudyPlanner\backend
dir firebase-credentials.json
```
If file not found, repeat Step 1.5

### Problem: "Firebase auth error in browser"
**Solution**:
- Check `frontend/src/firebase/config.js` has correct values
- No "YOUR_API_KEY" placeholders should remain
- Verify Firebase Authentication is enabled

### Problem: "Port 5000 already in use"
**Solution**:
```bash
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### Problem: "AI models not loading"
**Solution**:
- First time needs internet (downloads 2-3 GB)
- Check you have 8GB+ RAM
- Wait patiently (can take 10 minutes first time)

### Problem: "npm install fails"
**Solution**:
```bash
npm cache clean --force
npm install
```

### Problem: "Module not found" in Python
**Solution**:
```bash
venv\Scripts\activate
pip install -r requirements.txt
```

---

## ✅ FINAL CHECKLIST

Before demo/presentation, verify:

- [ ] Backend runs without errors
- [ ] Frontend opens in browser
- [ ] Can register new account
- [ ] Can login successfully
- [ ] Dashboard shows user name
- [ ] Study plan generator works
- [ ] Notes summarizer works
- [ ] AI assistant responds
- [ ] Progress page shows data
- [ ] Leaderboard displays
- [ ] All navigation links work
- [ ] Responsive on mobile (test with F12 → mobile view)

---

## 🎓 DEMO SCRIPT

**For Project Presentation**:

1. **Introduction** (1 min)
   - "AI-powered study planner for students"
   - "Uses latest AI models from Hugging Face"
   - "Full-stack: React + Flask + Firebase"

2. **Live Demo** (5 min)
   - Show login/register
   - Upload syllabus → Generate study plan
   - Paste notes → Get summary
   - Ask AI assistant a question
   - Show progress charts
   - Display leaderboard

3. **Technical Stack** (2 min)
   - Frontend: React, Tailwind CSS
   - Backend: Flask, Python
   - AI: BART, T5, RoBERTa models
   - Database: Firebase Firestore
   - Features: Authentication, Real-time updates, Gamification

4. **Key Features** (2 min)
   - AI study plan generation
   - Smart summarization
   - Q&A assistant
   - Progress tracking
   - Gamification (streaks, points, leaderboard)

---

## 🎉 CONGRATULATIONS!

Your AI Study Planner is now fully functional! 

**Next Steps**:
- Customize UI colors/theme
- Add more AI features
- Deploy to production (Vercel + Render)
- Add more gamification elements
- Implement notifications

**Happy Learning! 📚✨**
