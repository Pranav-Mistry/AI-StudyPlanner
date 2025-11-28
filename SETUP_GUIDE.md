# 🚀 Quick Setup Guide - AI Study Planner

## ⚡ Fast Track Setup (15 minutes)

### Step 1: Firebase Setup (5 minutes)

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Create New Project**:
   - Click "Add Project"
   - Name: `ai-study-planner`
   - Disable Google Analytics (optional)
   - Click "Create Project"

3. **Enable Authentication**:
   - Left sidebar → Authentication → Get Started
   - Sign-in method tab
   - Enable "Email/Password" ✅
   - Enable "Google" ✅
   - Save

4. **Create Firestore Database**:
   - Left sidebar → Firestore Database → Create Database
   - Start in "Test mode" (for development)
   - Choose location (closest to you)
   - Click "Enable"

5. **Get Web Credentials**:
   - Project Settings (⚙️ icon top-left)
   - Scroll down to "Your apps"
   - Click Web icon `</>`
   - Register app: `study-planner-web`
   - Copy the `firebaseConfig` object (looks like this):
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-app.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```
   - **SAVE THIS** - you'll need it soon!

6. **Get Backend Credentials**:
   - Project Settings → Service Accounts tab
   - Click "Generate New Private Key"
   - Click "Generate Key" (downloads JSON file)
   - **Rename file to**: `firebase-credentials.json`
   - **Move to**: `e:\PRANAV\AI-StudyPlanner\backend\`

### Step 2: Backend Setup (5 minutes)

Open **Command Prompt** or **PowerShell**:

```bash
# Navigate to backend
cd e:\PRANAV\AI-StudyPlanner\backend

# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Install dependencies (this will take 3-4 minutes)
pip install -r requirements.txt

# Create .env file
copy .env.example .env
```

✅ **Verify**: You should see `firebase-credentials.json` in the backend folder!

### Step 3: Frontend Setup (3 minutes)

Open **NEW Command Prompt** or **PowerShell**:

```bash
# Navigate to frontend
cd e:\PRANAV\AI-StudyPlanner\frontend

# Install dependencies (takes 2-3 minutes)
npm install

# Create .env file
copy .env.example .env
```

**IMPORTANT - Update Firebase Config**:
1. Open: `frontend\src\firebase\config.js`
2. Replace the placeholder values with your `firebaseConfig` from Step 1.5
3. Save the file

### Step 4: Run the Application (2 minutes)

**Terminal 1 - Start Backend**:
```bash
cd e:\PRANAV\AI-StudyPlanner\backend
venv\Scripts\activate
python app.py
```

Wait for: `✅ All AI models loaded successfully!` (first time takes 2-3 minutes to download models)

**Terminal 2 - Start Frontend**:
```bash
cd e:\PRANAV\AI-StudyPlanner\frontend
npm start
```

Browser will open automatically at `http://localhost:3000` 🎉

---

## 🎯 First Time Usage

1. **Register Account**:
   - Click "Sign up"
   - Enter name, email, password
   - Click "Create Account"

2. **Test Features**:
   - **Dashboard**: See your overview
   - **Study Plan**: Upload a sample syllabus or paste text
   - **Summarizer**: Paste any long text to summarize
   - **AI Assistant**: Ask "Explain photosynthesis"
   - **Progress**: View your stats
   - **Leaderboard**: See rankings

---

## 🔍 Verification Checklist

Before running, verify these files exist:

### Backend:
- ✅ `backend/firebase-credentials.json` (downloaded from Firebase)
- ✅ `backend/.env` (copied from .env.example)
- ✅ `backend/venv/` folder (created by python -m venv)

### Frontend:
- ✅ `frontend/src/firebase/config.js` (updated with your Firebase config)
- ✅ `frontend/.env` (copied from .env.example)
- ✅ `frontend/node_modules/` folder (created by npm install)

---

## ⚠️ Common Issues & Fixes

### Issue 1: "Firebase credentials not found"
**Fix**: 
- Ensure `firebase-credentials.json` is in `backend/` folder
- Check filename is exactly `firebase-credentials.json` (not .txt or other extension)

### Issue 2: "Firebase auth not working in frontend"
**Fix**:
- Open `frontend/src/firebase/config.js`
- Verify all values are replaced (no "YOUR_API_KEY" placeholders)
- Check Firebase Console → Authentication is enabled

### Issue 3: "Port 5000 already in use"
**Fix**:
```bash
# Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### Issue 4: "AI models taking too long to load"
**Fix**:
- First time: Models download from internet (2-3 GB total)
- Requires stable internet connection
- Subsequent runs will be fast (models cached locally)

### Issue 5: "npm install fails"
**Fix**:
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### Issue 6: "Python module not found"
**Fix**:
```bash
# Make sure virtual environment is activated
venv\Scripts\activate

# Reinstall requirements
pip install -r requirements.txt
```

---

## 📱 Testing the Application

### Test 1: Authentication
1. Register with email/password
2. Logout
3. Login again
4. Try Google login

### Test 2: Study Plan Generator
1. Go to Study Plan page
2. Paste this sample syllabus:
```
Chapter 1: Introduction to Python
Chapter 2: Data Types and Variables
Chapter 3: Control Flow
Chapter 4: Functions
Chapter 5: Object-Oriented Programming
Chapter 6: File Handling
Chapter 7: Exception Handling
Chapter 8: Modules and Packages
```
3. Set days: 30
4. Click "Generate Study Plan"
5. Verify AI generates a day-by-day plan

### Test 3: Notes Summarizer
1. Go to Summarizer page
2. Paste this sample text:
```
Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll. During photosynthesis, plants take in carbon dioxide and water from the air and soil. Within the plant cell, the water is oxidized, meaning it loses electrons, while the carbon dioxide is reduced, meaning it gains electrons. This transforms the water into oxygen and the carbon dioxide into glucose. The plant then releases the oxygen back into the air, and stores energy within the glucose molecules. Photosynthesis is crucial for life on Earth as it provides oxygen and is the basis of most food chains.
```
3. Click "Generate Summary"
4. Verify you get a concise summary

### Test 4: AI Assistant
1. Go to AI Assistant page
2. Select "Explain Concept"
3. Type: "Explain Newton's first law of motion"
4. Click Send
5. Verify you get an explanation

---

## 🎓 Project Demo Tips

When presenting your project:

1. **Start with Dashboard**: Show clean, modern UI
2. **Demo Study Plan**: Upload a real syllabus PDF
3. **Show Summarizer**: Use actual lecture notes
4. **AI Assistant**: Ask relevant questions
5. **Progress Charts**: Show analytics and tracking
6. **Leaderboard**: Demonstrate gamification

**Talking Points**:
- ✅ Uses latest AI models (BART, T5, RoBERTa)
- ✅ Fully responsive (works on mobile)
- ✅ Real-time database with Firebase
- ✅ Modern tech stack (React, Flask, Tailwind)
- ✅ Solves real student problems
- ✅ Scalable architecture
- ✅ Free and open-source

---

## 📊 System Requirements

**Minimum**:
- RAM: 8 GB
- Storage: 5 GB free space
- Internet: Stable connection (for first-time model download)
- OS: Windows 10/11, macOS, Linux

**Recommended**:
- RAM: 16 GB
- Storage: 10 GB free space
- GPU: Optional (speeds up AI processing)

---

## 🔄 Daily Development Workflow

**Starting work**:
```bash
# Terminal 1 - Backend
cd e:\PRANAV\AI-StudyPlanner\backend
venv\Scripts\activate
python app.py

# Terminal 2 - Frontend
cd e:\PRANAV\AI-StudyPlanner\frontend
npm start
```

**Stopping**:
- Press `Ctrl + C` in both terminals
- Close browser tabs

---

## 📞 Need Help?

1. **Check README.md** for detailed documentation
2. **Review error messages** in terminal/console
3. **Verify Firebase setup** is complete
4. **Check file locations** match the structure
5. **Ensure all dependencies** are installed

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Backend shows: "All AI models loaded successfully!"
2. ✅ Frontend opens automatically in browser
3. ✅ You can register and login
4. ✅ Dashboard shows your name
5. ✅ All navigation links work
6. ✅ AI features generate responses

---

## 🎉 You're Ready!

Once you see the login page, you're all set! Create an account and start exploring all the features.

**Happy Coding! 💻✨**
