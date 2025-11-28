# Google Gemini API Setup Guide

## Why Gemini API?

The AI Study Planner now uses **Google Gemini API** for the AI Assistant feature to provide:
- ✅ **High-quality explanations** - Clear, accurate, human-like responses
- ✅ **No repetition issues** - Professional AI-generated content
- ✅ **Better understanding** - Comprehensive explanations with examples
- ✅ **Free tier available** - 60 requests per minute for free

## Setup Instructions

### Step 1: Get Your Free Gemini API Key

1. Go to **Google AI Studio**: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated API key

### Step 2: Add API Key to Your Project

1. Navigate to the backend folder:
   ```bash
   cd e:\PRANAV\AI-StudyPlanner\backend
   ```

2. Create a `.env` file (if it doesn't exist):
   ```bash
   copy .env.example .env
   ```

3. Open `.env` file and add your API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### Step 3: Install Required Package

```bash
cd e:\PRANAV\AI-StudyPlanner\backend
pip install google-generativeai==0.3.2
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

### Step 4: Restart the Backend Server

1. Stop the current backend server (Ctrl+C)
2. Start it again:
   ```bash
   python app.py
   ```

3. You should see: `✅ Google Gemini API configured`

## Testing

1. Open the AI Assistant page: http://localhost:3000/assistant
2. Select "Explain Concept" mode
3. Type: "explain concept of debugging"
4. Click send

You should now get a **high-quality, detailed explanation** instead of repetitive text!

## Fallback Behavior

- If no API key is provided, the system will use the local T5 model (lower quality)
- If the API fails or rate limit is reached, it automatically falls back to local models
- The system is designed to always provide some response

## API Limits (Free Tier)

- **60 requests per minute**
- **1,500 requests per day**
- More than enough for personal study use!

## Troubleshooting

### "GEMINI_API_KEY not found"
- Make sure you created the `.env` file in the `backend` folder
- Check that the API key is on the correct line: `GEMINI_API_KEY=your_key`
- Restart the backend server after adding the key

### "API Error" or "Rate Limit"
- Check your API key is valid at https://makersuite.google.com/app/apikey
- Verify you haven't exceeded the free tier limits
- The system will automatically use fallback models

### Still Getting Poor Responses
- Ensure the backend server restarted successfully
- Check the terminal for `✅ Google Gemini API configured`
- Try a different concept or rephrase your question

## Benefits of This Upgrade

**Before (T5-small):**
```
explain: explain concept of debugging; explain concept. explicit concepts
explanation(? erklären): explain Concept of deggering.... explain concept to
question idea ideas how the con answer ex explicit (s explain: clarify
concept of Debugging
```

**After (Gemini API):**
```
Debugging is the process of identifying, analyzing, and removing errors 
(bugs) from computer programs or systems. It's a critical skill in software 
development that ensures code functions correctly.

Key characteristics:
- Systematic problem-solving approach
- Uses tools like debuggers, logs, and breakpoints
- Involves testing and verification

Real-world applications:
- Finding why an app crashes
- Fixing incorrect calculations
- Resolving performance issues

Understanding debugging is essential because it helps developers create 
reliable, efficient software and saves time in the development process.
```

## Next Steps

After setup, you can also use Gemini for:
- Better study plan generation
- Improved note summarization
- More accurate Q&A responses

Enjoy your upgraded AI Study Planner! 🚀
