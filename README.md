# 🚀 AI Study Planner (Next-Gen EdTech Assistant)

An intelligent, full-stack EdTech web application designed to act as a 24/7 personalized pocket tutor. It dynamically converts static study materials (PDFs, text) into highly interactive learning tools and autonomously manages long-term study schedules for students.

## ✨ Key Features

- **📅 Dynamic Study Planner:** AI chunks unstructured syllabus text into logical, day-by-day actionable task schedules.
- **🗂️ Interactive 3D Flashcards:** Automatically converts uploaded PDFs into hundreds of Question/Answer flashcards, sorted by "Known" and "Review" for spaced repetition learning.
- **📝 AI Quiz Engine:** Generates real-time MCQ mock exams with automated grading, instant explanations, and difficulty scaling.
- **📄 Note Summarizer:** Distills lengthy, complex document uploads into concise, highly readable bullet points.
- **💬 AI Assistant Tutor:** A contextually-aware chatbot available to answer specific academic questions on demand.
- **🏆 Gamification & Leaderboards:** Features real-time point tracking against peers, daily streaks, and an Exam Countdown tracker to create urgency and retain user engagement.

## 🛠️ Technology Stack

**Frontend (Client-Side Interface):**
- `React.js` (Component-based architecture)
- `Tailwind CSS` (Modern, glassmorphic styling)
- `Lucide React` (Clean SVG iconography)

**Backend (Server-Side Logic):**
- `Python 3` & `Flask` (Lightweight API routing)
- `PyPDF2` (Document parsing & extraction)

**Database & Authentication:**
- `Firebase Auth` (Secure Google Single Sign-On)
- `Firebase Cloud Firestore` (Global real-time NoSQL database for History & Leaderboard syncing)

**Artificial Intelligence Engine:**
- `Google Gemini Pro API` (Core LLM handling NLP, reasoning, and content generation)

---

## 🚦 Local Development Setup (Windows)

### 1. clone the repository
```powershell
git clone https://github.com/Pranav-Mistry/AI-StudyPlanner.git
cd AI-StudyPlanner
```

### 2. Backend Setup (Terminal 1)
```powershell
cd backend
python -m venv .venv
& .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
**Important Secrets:** 
- You must create a `.env` file in the `backend` folder containing your `GEMINI_API_KEY`.
- You must place your `firebase-credentials.json` inside the `backend` folder.

**Run the Server:**
```powershell
python app.py
```
*(Backend runs on http://localhost:5000)*

### 3. Frontend Setup (Terminal 2)
Open a new terminal window:
```powershell
cd frontend
npm install
npm start
```
*(Frontend runs on http://localhost:3000)*

---

## 🛡️ Team & Git Rules
1. **Never** commit virtual environments (`.venv` or `node_modules`).
2. **Never** commit secrets (`firebase-credentials.json` or `.env`).
3. If dependencies change, always remember to run `pip install -r requirements.txt` or `npm install` after pulling the latest code!
