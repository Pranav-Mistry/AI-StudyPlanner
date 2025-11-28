# AI Features Documentation

This document explains which AI models are used in each feature, and which are primary vs fallback.

## Overview

The application uses **Google Gemini API** as the primary AI when available, with **local transformer models** as fallback.

---

## 1. Study Plan Generator

**Location:** `backend/ai_models.py` → `generate_study_plan()`

- **Primary:** Google Gemini API (if `GEMINI_API_KEY` is set)
  - Model: `gemini-2.5-flash` or `gemini-flash-latest` (fastest available)
  - Generates structured JSON study plan with day-wise topics
  - Prompt: Creates clean, concise topic names (3-7 words) spread across days

- **Fallback:** Local heuristic-based topic extraction
  - Extracts headings and numbered sections from PDF text
  - Uses pattern matching to identify chapter/topic names
  - Distributes topics evenly across available days
  - **No AI model used** - just text processing

**How to check:** Look for `[Gemini]` logs in backend console. If you see "⚠️ GEMINI_API_KEY not found", it's using fallback.

---

## 2. Notes Summarizer

**Location:** `backend/ai_models.py` → `summarize_text()`

- **Primary:** Google Gemini API
  - Generates 2-3 sentence summary + 5 key bullet points
  - Returns structured JSON with summary and key_points

- **Fallback:** Local BART model (`facebook/bart-large-cnn`)
  - Transformer-based summarization
  - Chunks long text and summarizes each chunk
  - Combines summaries into final output

**How to check:** Check backend logs for `[Gemini]` messages or `Summarization model loaded` (fallback).

---

## 3. AI Assistant (Explain Concept)

**Location:** `backend/ai_models.py` → `explain_concept()`

- **Primary:** Google Gemini API
  - Provides comprehensive explanations with:
    - Definition (2-3 sentences)
    - Key points (3-5 bullets)
    - Real-world example
    - Study tip
  - Max output: 4096 tokens

- **Fallback:** Local T5 model (`google/flan-t5-base`)
  - Text-to-text generation model
  - Generates explanations based on prompts
  - Less detailed than Gemini but still functional

**How to check:** Backend logs show `[Explain] Attempting Gemini API` or `[Explain] Using local model`.

---

## 4. Question Answering (Q&A)

**Location:** `backend/ai_models.py` → `answer_question()`

- **Primary:** Google Gemini API
  - Answers questions based on provided context
  - Only uses information from the context (doesn't hallucinate)
  - Returns answer with confidence score

- **Fallback:** Local RoBERTa model (`deepset/roberta-base-squad2`)
  - Question-answering pipeline
  - Extracts answers from context using transformer attention
  - Returns answer with confidence score (0.0-1.0)

**How to check:** Backend logs indicate which model was used.

---

## 5. Quiz Generator

**Location:** `backend/ai_models.py` → `generate_quiz()`

- **Primary:** Google Gemini API
  - Generates multiple-choice questions from source text
  - Creates 5-15 questions (configurable)
  - Returns JSON with question, options, answer, and explanation
  - Max output: 4096 tokens

- **Fallback:** Simple fact-based question generation
  - Extracts key sentences from text
  - Creates basic questions from those sentences
  - **No AI model used** - just text processing

**How to check:** Check backend logs for Gemini quiz generation or fallback messages.

---

## 6. Keyword Extraction

**Location:** `backend/ai_models.py` → `extract_keywords()`

- **No AI used** - Pure text processing
- Uses regex and word frequency counting
- Extracts top 10 most common meaningful words (4+ letters)
- Filters out stop words

---

## Configuration

### Enabling Gemini (Primary AI)

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env` file:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Restart backend server

### Fallback Models

Fallback models are automatically downloaded on first use via Hugging Face:
- BART: ~1.6 GB
- RoBERTa: ~500 MB  
- T5: ~850 MB

These are cached in `backend/venv/` after first download.

---

## Performance Notes

- **Gemini API:** Fast, high-quality, requires internet, costs per request
- **Local Models:** Slower first run (download), then fast, works offline, free
- **Fallback (no AI):** Instant, basic functionality, works offline

---

## Troubleshooting

**"Study plan topics are messy/raw text"**
- Check if Gemini is being used (look for `[Gemini]` in logs)
- If using fallback, topics are extracted via pattern matching (may be less clean)
- Solution: Set `GEMINI_API_KEY` for better results

**"AI features not working"**
- Check backend logs for error messages
- Verify `.env` file has correct API key (if using Gemini)
- Check internet connection (required for Gemini and model downloads)

