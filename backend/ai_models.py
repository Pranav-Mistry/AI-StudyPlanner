import json
import os
import re
import math
from collections import Counter
from textwrap import dedent

from google import genai
from google.genai import types as genai_types
import torch
from dotenv import load_dotenv
from google.api_core import exceptions as google_exceptions
from transformers import pipeline
try:
    from groq import Groq as GroqClient
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

load_dotenv()


class AIModels:
    def __init__(self):
        self.device = 0 if torch.cuda.is_available() else -1
        print(f"[INFO] Using device: {'GPU' if self.device == 0 else 'CPU'}")

        self.use_gemini = False
        self.use_groq = False
        self.groq_client = None
        self.ready = False
        self.summarizer = None
        self.qa_model = None
        self.explainer = None
        self.last_ai_error = None

        self._init_gemini()
        self._init_groq()
        if self.use_gemini or self.use_groq:
            self.ready = True
            providers = []
            if self.use_gemini:
                providers.append("Gemini")
            if self.use_groq:
                providers.append("Groq")
            print(f"[INFO] AI providers active: {' + '.join(providers)}. Local transformer fallbacks will load only when needed.")
        else:
            self._init_local_models()

    def _init_gemini(self):
        """Configure Google Gemini (new google.genai SDK) if an API key is provided.
        
        NOTE: We do NOT make a live test call here. Making a generate_content()
        call during init causes 503 failures on the Flask stat-reloader restart,
        which wrongly marks Gemini as unavailable for the whole session.
        The real error handling is in _call_gemini().
        """
        try:
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                print("[WARNING] GEMINI_API_KEY not found, defaulting to local transformer models.")
                return

            # Validate key looks reasonable (non-empty, starts with expected prefix)
            if len(api_key) < 10:
                print("[WARNING] GEMINI_API_KEY looks invalid (too short).")
                return

            self.gemini_client = genai.Client(api_key=api_key)

            # Use the first preferred model — no test call needed.
            # Only models that work with google.genai SDK (v1beta). The 1.5-* models
            # return 404 in v1beta. gemini-2.0-flash is the most stable free-tier option.
            preferred_models = [
                'gemini-2.0-flash',
                'gemini-2.5-flash',
                'gemini-2.0-flash-lite',
            ]
            self.gemini_model_name = preferred_models[0]
            self.use_gemini = True
            print(f"[SUCCESS] Google Gemini API configured successfully (using {self.gemini_model_name}).")

        except Exception as e:
            print(f"[ERROR] Failed to initialize Gemini: {e}")
            self.use_gemini = False

    def _init_groq(self):
        """Initialize Groq as a secondary AI provider (free tier, llama models).
        Groq is used automatically when all Gemini models are quota-limited.
        Get a free API key at: https://console.groq.com
        """
        if not GROQ_AVAILABLE:
            return
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            return  # Optional — silently skip if not configured
        try:
            self.groq_client = GroqClient(api_key=api_key)
            self.use_groq = True
            print("[SUCCESS] Groq API configured successfully (using llama-3.1-8b-instant as fallback).")
        except Exception as e:
            print(f"[WARNING] Groq initialization failed: {e}")
            self.use_groq = False

    def _call_groq(self, prompt, max_tokens=1024):
        """Call Groq API using llama-3.1-8b-instant.
        Free tier: 14,400 requests/day, 6,000 tokens/min — much more generous than Gemini.
        """
        if not self.use_groq or not self.groq_client:
            return None
        try:
            completion = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.6,
            )
            text = completion.choices[0].message.content
            if text and text.strip():
                print(f"[Groq] Successfully generated response ({len(text)} chars)")
                return text.strip()
            return None
        except Exception as e:
            err = str(e)
            if 'rate_limit' in err.lower() or '429' in err:
                print(f"[Groq] Rate limit hit: {err[:80]}")
            else:
                print(f"[Groq] Error: {err[:120]}")
            return None

    def _call_ai(self, prompt, max_output_tokens=1024):
        """Try Gemini first, then Groq as fallback. Returns the first successful response."""
        # Try Gemini
        if self.use_gemini:
            result = self._call_gemini(prompt, max_output_tokens=max_output_tokens)
            if result:
                return result
        # Try Groq if Gemini failed
        if self.use_groq:
            print("[AI] Gemini unavailable, trying Groq fallback...")
            result = self._call_groq(prompt, max_tokens=max_output_tokens)
            if result:
                return result
        return None

    def _init_local_models(self):

        """Load local transformer pipelines as fallbacks.
        Each model is loaded independently so one failure doesn't block others.
        """
        print("[INFO] Loading local transformer models (fallback only)...")
        any_loaded = False

        # Summarizer
        try:
            self.summarizer = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
                device=self.device
            )
            print("[SUCCESS] Summarization model loaded.")
            any_loaded = True
        except Exception as e:
            print(f"[WARNING] Summarization model failed to load: {e}")
            self.summarizer = None

        # Q&A model
        try:
            self.qa_model = pipeline(
                "question-answering",
                model="deepset/roberta-base-squad2",
                device=self.device
            )
            print("[SUCCESS] Q&A model loaded.")
            any_loaded = True
        except Exception as e:
            print(f"[WARNING] Q&A model failed to load: {e}")
            self.qa_model = None

        # Text generation / explainer
        try:
            self.explainer = pipeline(
                "text2text-generation",
                model="google/flan-t5-base",
                device=self.device
            )
            print("[SUCCESS] Local explanation model loaded.")
            any_loaded = True
        except Exception as e:
            print(f"[WARNING] Explanation model failed to load: {e}")
            self.explainer = None

        if any_loaded:
            self.ready = True
            print("[SUCCESS] Local AI models ready (partial or full).")
        else:
            print("[WARNING] No local models could be loaded. Only Gemini will be used.")
            # Still mark ready=True so the app doesn't block — Gemini handles most requests
            self.ready = True

    def is_ready(self):
        return self.ready

    def summarize_text(self, text, max_length=150, min_length=50):
        """Summarize long text into concise notes."""
        try:
            text = text.strip()
            if len(text) < 50:
                return "Please provide at least 50 characters of content to summarize."

            original_length = len(text)

            # ── 1. Try AI (Gemini first, then Groq) ──────────────────────────
            if self.use_gemini or self.use_groq:
                print(f"[Summarize] Calling AI for {original_length}-char text")
                prompt = dedent(f"""
                You are an expert academic summarizer. Read the text below and write a concise summary.

                Rules:
                - Write 2-4 sentences maximum
                - Use your OWN words — do NOT copy sentences from the original
                - Focus on the main idea and most important points only
                - Omit examples, minor details, and repetition
                - After the summary, list 3 key bullet points

                Format your response EXACTLY like this:
                SUMMARY:
                [Your 2-4 sentence summary in your own words]

                KEY POINTS:
                • [Point 1]
                • [Point 2]
                • [Point 3]

                Text to summarize:
                \"\"\"
                {text[:4000]}
                \"\"\"
                """)
                response = self._call_ai(prompt, max_output_tokens=1024)

                if response and len(response.strip()) > 50:
                    print(f"[Summarize] AI success ({len(response)} chars)")
                    r = response.strip()

                    # Case 1: Full structured response with both sections
                    if "SUMMARY:" in r and "KEY POINTS:" in r:
                        parts = r.split("KEY POINTS:")
                        summary_part = parts[0].replace("SUMMARY:", "").strip()
                        key_points_part = parts[1].strip()
                        return f"{summary_part}\n\nKey Points:\n{key_points_part}"

                    # Case 2: Only SUMMARY section (no KEY POINTS — response was cut short)
                    if "SUMMARY:" in r:
                        summary_part = r.replace("SUMMARY:", "").strip()
                        return summary_part

                    # Case 3: Free-form response (AI ignored format) — use as-is
                    return r
                else:
                    print("[Summarize] All AI providers returned empty/short response, using extractive fallback")

            # ── 2. Extractive fallback (when all AI providers are unavailable) ──
            print("[Summarize] Using extractive fallback")
            extractive = self._extractive_summarize(text, max_chars=400)

            # Add a clear notice so the user knows this is a basic fallback
            notice = "⚠️ AI summarizer is temporarily unavailable (API quota). Showing key sentences from your text:\n\n"
            return notice + extractive

        except Exception as e:
            print(f"[Summarize] Error: {e}")
            return "Error generating summary. Please try again later."


    def generate_study_plan(self, syllabus_text, days_available=30):
        """Generate a structured study plan from syllabus."""
        try:
            cleaned_text = syllabus_text.strip()
            if len(cleaned_text) < 50:
                return {
                    'error': 'Please provide a more detailed syllabus to generate a plan.'
                }

            if self.use_gemini or self.use_groq:
                prompt = dedent(f"""
                You are an expert academic planner. Create an actionable study plan based on the syllabus
                below. Spread topics across {days_available} days. Respond with valid JSON:
                {{
                  "overview": "One paragraph overview",
                  "total_days": {days_available},
                  "total_topics": <number>,
                  "schedule": [
                    {{
                      "day": 1,
                      "focus": "Main focus",
                      "topics": ["Topic 1", "Topic 2"],
                      "duration": "2-3 hours",
                      "tips": "Helpful study tip"
                    }}
                  ]
                }}

                Syllabus:
                \"\"\"{cleaned_text[:4000]}\"\"\"
                """)
                response = self._call_ai(prompt, max_output_tokens=2048)
                plan = self._plan_from_response(response, days_available)
                if plan:
                    return plan

            return self._fallback_study_plan(cleaned_text, days_available)

        except Exception as e:
            print(f"Error generating study plan: {e}")
            return {
                'error': 'Could not generate study plan',
                'message': str(e)
            }

    def explain_concept(self, concept):
        """Explain a concept using Gemini or a local model."""
        if not concept or not concept.strip():
            return "Please provide a valid concept to explain."

        concept = self._normalize_concept(concept)
        print(f"[Explain] Processing concept: '{concept}'")

        try:
            # ── 1. Try AI (Gemini → Groq fallback) ──────────────────────────
            if self.use_gemini or self.use_groq:
                print(f"[Explain] Attempting AI for '{concept}'")
                prompt = dedent(f"""
                You are a friendly study assistant. Explain the concept "{concept}" to a student.

                Structure your answer exactly like this:

                **Definition**
                Write 2-3 clear sentences explaining what {concept} is.

                **Key Points**
                - Point 1
                - Point 2
                - Point 3
                - Point 4

                **Real-World Example**
                Give one concrete, relatable example.

                **Study Tip**
                Give one practical tip for remembering this concept.

                Be specific about {concept}. Do not give a generic answer.
                """)
                explanation = self._call_ai(prompt, max_output_tokens=2048)

                if explanation and len(explanation.strip()) > 80:
                    print(f"[Explain] AI success ({len(explanation)} chars) — returning directly")
                    return explanation.strip()
                elif self.last_ai_error:
                    print(f"[Explain] AI failed ({self.last_ai_error.get('type')}): {self.last_ai_error.get('message')}")
                    print("[Explain] Falling back to local model...")
                else:
                    print("[Explain] AI returned empty response, trying local model")

            # ── 2. Try local transformer model ─────────────────────────────
            print(f"[Explain] Using local model for '{concept}'")
            local_explanation = self._generate_local_explanation(concept)
            if local_explanation and len(local_explanation.strip()) > 80:
                print(f"[Explain] Local model success ({len(local_explanation)} chars)")
                return local_explanation.strip()

            # ── 3. Last resort: generic template ───────────────────────────
            print(f"[Explain] All AI methods failed — using generic template")
            return self._generic_concept_template(concept)

        except Exception as e:
            print(f"[Explain] Error in explain_concept: {e}")
            import traceback
            traceback.print_exc()
            return self._generic_concept_template(concept)

    def answer_question(self, question, context):
        """Answer questions based on provided context."""
        try:
            question = question.strip()
            context = context.strip()

            if self.use_gemini or self.use_groq:
                prompt = dedent(f"""
                You are an exam-preparation assistant. Using only the context below, answer the question.
                If the context does not contain the answer, say so explicitly.

                Context:
                \"\"\"{context[:4000]}\"\"\"

                Question: {question}
                """)
                response = self._call_ai(prompt)
                if response:
                    return {
                        'answer': response,
                        'confidence': 0.9
                    }

            if self.qa_model:
                result = self.qa_model(
                    question=question,
                    context=context
                )
                return {
                    'answer': result['answer'],
                    'confidence': result['score']
                }

            return {
                'answer': 'Could not answer locally because the Q&A model is not loaded.',
                'confidence': 0.0
            }

        except Exception as e:
            print(f"Error answering question: {e}")
            return {
                'answer': 'Could not find an answer in the provided context.',
                'confidence': 0.0
            }

    def generate_quiz(self, source_text, num_questions=10):
        """Generate quiz questions from source text."""
        cleaned_text = (source_text or "").strip()
        num_questions = max(5, min(int(num_questions or 10), 15))
        
        if len(cleaned_text) < 80:
            return []

        if self.use_gemini:
            prompt = dedent(f"""
            You are an educational quiz generator. Create {num_questions} multiple-choice questions based on the content below.
            Return valid JSON in this format:
            [
              {{
                "question": "Question text?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "answer": "Option A",
                "explanation": "Why the answer is correct"
              }}
            ]
            Requirements:
            - Use clear, concise wording
            - Options must be unique per question
            - Answers must exactly match one of the options
            - Provide a short explanation (1 sentence)
            - Cover different aspects of the content

            Content:
            \"\"\"{cleaned_text[:4000]}\"\"\"
            """)
            response = self._call_ai(prompt, max_output_tokens=4096)
            quiz = self._parse_quiz_response(response)
            if quiz:
                return quiz

        # Fallback to simple fact-based questions
        return self._fallback_quiz(cleaned_text, num_questions)

    def generate_flashcards(self, text, num_cards=8):
        """Generate flashcard Q&A pairs from text using AI.
        Returns a list of {'question': ..., 'answer': ...} dicts.
        """
        cleaned = text.strip()
        if not cleaned:
            return []

        if self.use_gemini or self.use_groq:
            # Simpler prompt — shorter field names, explicit no-markdown instruction
            prompt = dedent(f"""
            Create exactly {num_cards} study flashcards from the text below.

            Output ONLY a valid JSON array. No markdown, no code fences, no explanation — just raw JSON.

            Format:
            [{{"q":"Question here?","a":"Answer here."}},{{"q":"Next question?","a":"Next answer."}}]

            Rules for questions:
            - Ask about KEY FACTS, DEFINITIONS, CONCEPTS, PROCESSES from the text
            - Use varied question types: What is...? How does...? Why is...? What causes...?
            - Each question must be answerable directly from the text

            Rules for answers:
            - 1-3 sentences, accurate and concise
            - Do NOT say "According to the text" — just state the fact

            Text:
            {cleaned[:3500]}

            JSON:""")

            response = self._call_ai(prompt, max_output_tokens=2048)
            print(f"[Flashcards] Raw AI response (first 300 chars): {repr(response[:300]) if response else 'None'}")

            if response:
                parsed = self._extract_json_array(response)
                if parsed and isinstance(parsed, list) and len(parsed) > 0:
                    cards = []
                    for item in parsed:
                        if not isinstance(item, dict):
                            continue
                        # Accept both q/a (short) and question/answer (long) field names
                        q = str(item.get('q') or item.get('question') or '').strip()
                        a = str(item.get('a') or item.get('answer') or '').strip()
                        if q and a and len(q) > 4 and len(a) > 4:
                            cards.append({'question': q, 'answer': a})
                    if cards:
                        print(f"[Flashcards] Generated {len(cards)} cards via AI")
                        return cards
                print(f"[Flashcards] JSON parse failed or empty — response was: {repr(response[:200])}")

        # Fallback: smarter sentence-based flashcards
        print("[Flashcards] Using smart sentence fallback")
        return self._fallback_flashcards(cleaned, num_cards)

    def _extract_json_array(self, text):
        """Robustly extract a JSON array from AI output that may have:
        - markdown code fences (```json ... ```)
        - leading/trailing prose
        - escaped characters
        """
        if not text:
            return None

        # Step 1: strip markdown code fences like ```json ... ``` or ``` ... ```
        text = re.sub(r'```(?:json)?\s*', '', text)
        text = re.sub(r'```', '', text)
        text = text.strip()

        # Step 2: try parsing the whole cleaned text directly
        try:
            result = json.loads(text)
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass

        # Step 3: find the outermost [...] array in the text
        start = text.find('[')
        end   = text.rfind(']')
        if start != -1 and end != -1 and end > start:
            candidate = text[start:end + 1]
            try:
                result = json.loads(candidate)
                if isinstance(result, list):
                    return result
            except json.JSONDecodeError:
                pass

        # Step 4: try lenient cleanup — remove trailing commas before ] or }
        if start != -1 and end != -1:
            candidate = text[start:end + 1]
            candidate = re.sub(r',\s*([}\]])', r'\1', candidate)  # remove trailing commas
            try:
                result = json.loads(candidate)
                if isinstance(result, list):
                    return result
            except json.JSONDecodeError:
                pass

        return None

    def _fallback_flashcards(self, text, num_cards=8):
        """Smarter sentence-based fallback — creates definition/fact questions."""
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        sentences = [s.strip() for s in sentences if len(s.strip()) > 40]

        cards = []
        used = set()

        for sent in sentences:
            if len(cards) >= num_cards:
                break
            if sent in used:
                continue
            used.add(sent)

            words = sent.split()
            if len(words) < 6:
                continue

            # Try to find a key term (capitalized word or first noun-like word)
            key_term = None
            for w in words[:8]:
                clean_w = re.sub(r'[^a-zA-Z]', '', w)
                if len(clean_w) > 3 and clean_w[0].isupper():
                    key_term = clean_w
                    break

            if key_term:
                # "What is <KeyTerm>?" pattern
                question = f"What is {key_term}?"
                answer = sent
            else:
                # "What does this statement describe?" pattern using first few words
                stem = ' '.join(words[:4])
                question = f"Complete or explain: \"{stem}...\"?"
                answer = sent

            cards.append({'question': question, 'answer': answer})

        if not cards:
            cards.append({'question': 'What is the main topic of this content?', 'answer': text[:300]})

        return cards

    def extract_keywords(self, text, top_n=10):
        """Extract important keywords from text."""
        try:
            words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
            stop_words = {'that', 'this', 'with', 'from', 'have', 'will',
                          'your', 'about', 'which', 'their', 'would', 'there'}
            words = [w for w in words if w not in stop_words]
            word_freq = Counter(words)
            return [word for word, freq in word_freq.most_common(top_n)]
        except Exception as e:
            print(f"Error extracting keywords: {e}")
            return []

    # Helper methods -----------------------------------------------------

    def _generate_local_explanation(self, concept):
        if not self.explainer:
            return None

        prompt = dedent(f"""
        Explain "{concept}" to a college student. Provide:
        Definition:
        Key points:
        Real-world example:
        Study tip:
        """)
        try:
            result = self.explainer(
                prompt,
                max_length=480,
                min_length=160,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                num_return_sequences=1
            )
            if result and len(result) > 0 and 'generated_text' in result[0]:
                return result[0]['generated_text']
            return None
        except Exception as e:
            print(f"Error in local explanation: {e}")
            return None

    def _call_gemini(self, prompt, temperature=0.65, max_output_tokens=4096):
        self.last_ai_error = None

        if not self.use_gemini or not self.gemini_model_name:
            print("[Gemini] Not enabled, using fallback")
            return None

        # Model cascade: only models verified to work with the google.genai SDK (v1beta).
        # gemini-1.5-* models return 404 in this API version — do NOT include them.
        # gemini-2.0-flash-lite has higher free-tier RPD and is more available.
        all_models = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
        ]
        # Start with the currently selected model, followed by others
        seen = set()
        models_to_try = []
        for m in [self.gemini_model_name] + all_models:
            if m not in seen:
                seen.add(m)
                models_to_try.append(m)

        for model_name in models_to_try:
            try:
                response = self.gemini_client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=genai_types.GenerateContentConfig(
                        temperature=temperature,
                        top_p=0.9,
                        max_output_tokens=max_output_tokens,
                    )
                )
                text = response.text if response and response.text else None
                if text and text.strip():
                    if model_name != self.gemini_model_name:
                        print(f"[Gemini] Succeeded with fallback model '{model_name}' ({len(text)} chars)")
                        self.gemini_model_name = model_name  # promote for future calls
                    else:
                        print(f"[Gemini] Successfully generated response ({len(text)} chars)")
                    return text.strip()
                else:
                    print(f"[Gemini] '{model_name}' returned no text, trying next...")
                    continue

            except google_exceptions.ResourceExhausted as e:
                # 429 per-model quota — try the next model, it may have separate quota
                print(f"[Gemini] '{model_name}' quota exhausted (429), trying next model...")
                self.last_ai_error = {
                    "type": "rate_limit",
                    "message": "Gemini quota exceeded. Trying another model..."
                }
                continue

            except google_exceptions.ServiceUnavailable as e:
                print(f"[Gemini] '{model_name}' unavailable (503), trying next model...")
                self.last_ai_error = {
                    "type": "service_unavailable",
                    "message": "Gemini is temporarily under high demand."
                }
                continue

            except Exception as e:
                err_str = str(e)
                if any(kw in err_str.lower() for kw in ['503', 'overloaded', 'unavailable', 'high demand']):
                    print(f"[Gemini] '{model_name}' overloaded, trying next model...")
                    self.last_ai_error = {
                        "type": "service_unavailable",
                        "message": "Gemini is temporarily under high demand."
                    }
                    continue
                if '429' in err_str or 'resource_exhausted' in err_str.lower() or 'quota' in err_str.lower():
                    print(f"[Gemini] '{model_name}' quota exhausted, trying next model...")
                    self.last_ai_error = {
                        "type": "rate_limit",
                        "message": "Gemini quota exceeded. Trying another model..."
                    }
                    continue
                if '404' in err_str or 'not_found' in err_str.lower() or 'not found' in err_str.lower() or 'not supported' in err_str.lower():
                    print(f"[Gemini] '{model_name}' not available in this API version, trying next model...")
                    self.last_ai_error = {
                        "type": "model_not_found",
                        "message": f"Model {model_name} not available."
                    }
                    continue
                self.last_ai_error = {
                    "type": "api_error",
                    "message": err_str
                }
                print(f"[Gemini] Error calling '{model_name}': {e}")
                return None

        print("[Gemini] All models in cascade exhausted — falling back to local model.")
        self.last_ai_error = {
            "type": "rate_limit",
            "message": "All Gemini models are currently quota-limited or unavailable."
        }
        return None

    def _ai_error_message(self):
        if not self.last_ai_error:
            return "AI service is temporarily unavailable. Please try again."

        if self.last_ai_error.get("type") == "rate_limit":
            return (
                "Gemini is working, but the free API quota was reached just now. "
                "Please wait around 15-60 seconds and try again. If your whole team is using the same API key, "
                "this can happen quickly because the free tier has a low per-minute request limit."
            )

        if self.last_ai_error.get("type") == "service_unavailable":
            return (
                "Gemini is temporarily experiencing high demand right now. "
                "Please wait a minute and try again. Your API key is valid; this is a temporary model availability issue."
            )

        return "Gemini could not answer right now. Please try again in a moment."

    def _summary_from_response(self, response_text):
        data = self._parse_json_response(response_text)
        if data and isinstance(data, dict):
            summary = data.get('summary')
            key_points = data.get('key_points', [])
            if summary:
                if key_points:
                    bullets = "\n".join([f"- {point}" for point in key_points if point])
                    return f"{summary}\n\nKey Points:\n{bullets}"
                return summary
        return response_text

    def _plan_from_response(self, response_text, days_available):
        data = self._parse_json_response(response_text)
        if data and isinstance(data, dict):
            schedule = data.get('schedule', [])
            if isinstance(schedule, list) and schedule:
                # Clean up topics in each day - remove long paragraphs, keep only short topic names
                for day_item in schedule:
                    if 'topics' in day_item and isinstance(day_item['topics'], list):
                        cleaned_topics = []
                        for topic in day_item['topics']:
                            if isinstance(topic, str):
                                # Clean and validate topic
                                cleaned = re.sub(r'\s+', ' ', topic).strip()
                                # Remove if too long (likely a paragraph, not a topic name)
                                if len(cleaned) > 60 or len(cleaned.split()) > 10:
                                    continue
                                # Remove common PDF artifacts
                                cleaned = re.sub(r'\b(prashant|kirad|josh meter|youtube|video|watch)\b', '', cleaned, flags=re.IGNORECASE)
                                cleaned = cleaned.strip()
                                # Only keep if it looks like a topic name
                                if cleaned and self._is_meaningful_topic(cleaned):
                                    cleaned_topics.append(cleaned)
                        day_item['topics'] = cleaned_topics[:8]  # Max 8 topics per day
                    
                    # Clean focus field - keep it short
                    if 'focus' in day_item and isinstance(day_item['focus'], str):
                        focus = day_item['focus'].strip()
                        if len(focus) > 50:
                            words = focus.split()
                            day_item['focus'] = ' '.join(words[:6]) if len(words) > 6 else focus[:50]
                
                data.setdefault('total_days', days_available)
                data.setdefault(
                    'total_topics',
                    sum(len(item.get('topics', [])) for item in schedule)
                )
                return data
        return None

    def _parse_json_response(self, text):
        if not text:
            return None
        cleaned = text.strip()
        cleaned = re.sub(r'^```json', '', cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r'```$', '', cleaned).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', cleaned, re.S)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    return None
        return None

    def _local_summarize(self, text, max_length=150, min_length=50):
        """Summarize text. Uses local transformer if available, else extractive summarization."""
        if not self.summarizer:
            # No transformer loaded — use extractive summarization (TF-based sentence scoring)
            return self._extractive_summarize(text, max_length)

        # Calculate better max_length based on input text length (aim for 30-40% compression)
        text_length = len(text.split())
        text_char_length = len(text)
        
        if text_length > 50:
            # For longer texts, use more aggressive summarization (30-40% of original)
            # Use character-based calculation for better accuracy
            calculated_max = max(min_length, min(max_length, int(text_char_length * 0.35)))
            calculated_min = max(min_length, int(calculated_max * 0.6))
        else:
            # For shorter texts, still aim for compression
            calculated_max = max(min_length, min(max_length, int(text_char_length * 0.5)))
            calculated_min = max(min_length, int(calculated_max * 0.7))
        
        max_input_length = 1024
        if len(text) > max_input_length:
            chunks = self._split_text(text, max_input_length)
            summaries = []
            for chunk in chunks:
                if len(chunk.strip()) > 20:
                    try:
                        result = self.summarizer(
                            chunk,
                            max_length=calculated_max,
                            min_length=calculated_min,
                            do_sample=False,
                            num_beams=6,  # Increased for better quality
                            early_stopping=True,
                            no_repeat_ngram_size=3,  # Prevent repetition
                            length_penalty=1.2  # Encourage shorter summaries
                        )
                        summaries.append(result[0]['summary_text'])
                    except Exception as e:
                        print(f"Error summarizing chunk: {e}")
                        # Fallback: take first sentences
                        sentences = self._split_into_sentences(chunk)
                        summaries.append(" ".join(sentences[:2]) if sentences else chunk[:calculated_max])
            return " ".join(summaries) or text[:calculated_max]
        else:
            try:
                result = self.summarizer(
                    text,
                    max_length=calculated_max,
                    min_length=calculated_min,
                    do_sample=False,
                    num_beams=6,  # Increased for better quality
                    early_stopping=True,
                    no_repeat_ngram_size=3,  # Prevent repetition
                    length_penalty=1.2  # Encourage shorter summaries
                )
                return result[0]['summary_text']
            except Exception as e:
                print(f"Error in local summarization: {e}")
                # Fallback: extract key sentences
                sentences = self._split_into_sentences(text)
                if len(sentences) > 3:
                    return " ".join(sentences[:3])
                return text[:calculated_max]

    def _fallback_study_plan(self, syllabus_text, days_available):
        topics = self._extract_topics(syllabus_text)
        if not topics:
            fallback_sentences = self._split_into_sentences(syllabus_text)
            topics = fallback_sentences[:max(10, days_available)]

        total_topics = len(topics)
        days_available = max(1, days_available or 1)
        study_plan = {
            'overview': self._local_summarize(syllabus_text, 180, 60),
            'total_days': days_available,
            'total_topics': total_topics,
            'daily_topics': max(1, math.ceil(total_topics / days_available)),
            'schedule': []
        }

        topic_index = 0
        for day in range(1, days_available + 1):
            remaining_topics = total_topics - topic_index
            remaining_days = days_available - day + 1
            allocation = 0
            if remaining_topics > 0:
                allocation = max(1, math.ceil(remaining_topics / remaining_days))
            day_topics = topics[topic_index: topic_index + allocation] if allocation else []
            topic_index += len(day_topics)

            if not day_topics:
                if day == 1:
                    day_topics = ['High-level overview and goal setting']
                    duration = '1-2 hours'
                    tip = 'Skim the syllabus and highlight key themes for the coming weeks.'
                else:
                    day_topics = [f'Review and practice previous topics (Days 1-{day - 1})']
                    duration = '1-2 hours'
                    tip = 'Revise flashcards, attempt quizzes, and close any knowledge gaps.'
            else:
                duration = '2-3 hours'
                tip = 'Focus on active recall and end the session with a short recap.'

            study_plan['schedule'].append({
                'day': day,
                'focus': day_topics[0] if day_topics else 'Review',
                'topics': day_topics,
                'duration': duration,
                'tips': tip
            })

        return study_plan

    def _format_summary_output(self, summary_text, original_text=None):
        if not summary_text:
            return "Unable to generate summary at the moment."

        clean = re.sub(r'\s+', ' ', summary_text).strip()
        original_len = len(original_text) if original_text else len(clean)

        # STRICT CHECK: If summary is more than 60% of original, it's not a real summary
        if original_text and len(clean) > original_len * 0.6:
            print(f"[WARNING] Summary too long: {len(clean)} chars vs {original_len} original ({len(clean)/original_len*100:.1f}%)")
            # Try to refine with T5
            refined = self._refine_with_t5(original_text)
            if refined and len(refined) < len(clean) and len(refined) < original_len * 0.6:
                clean = refined.strip()
            else:
                # Last resort: extract only first 2-3 sentences and condense
                sentences = self._split_into_sentences(original_text)
                if sentences:
                    # Take first sentence and try to make it more concise
                    first_sent = sentences[0]
                    if len(first_sent) > 100:
                        # Try to summarize just the first sentence
                        try:
                            if hasattr(self, 'summarizer'):
                                result = self.summarizer(
                                    first_sent,
                                    max_length=min(80, len(first_sent) // 2),
                                    min_length=30,
                                    do_sample=False,
                                    num_beams=4
                                )
                                clean = result[0]['summary_text']
                            else:
                                clean = first_sent[:100] + "..."
                        except:
                            clean = first_sent[:100] + "..."
                    else:
                        clean = first_sent
                    # Add one more key sentence if available
                    if len(sentences) > 1 and len(clean) < original_len * 0.5:
                        clean += " " + sentences[1][:80]

        # Check if summary already contains key points format
        if "Key Points:" in clean or "key_points" in clean.lower():
            # Still check length
            if original_text and len(clean) > original_len * 0.7:
                # Extract just the summary part before "Key Points"
                parts = re.split(r'Key Points?:', clean, flags=re.IGNORECASE)
                if parts and len(parts[0]) < original_len * 0.5:
                    return clean
                # If still too long, return just first part
                return parts[0].strip() if parts else clean
            return clean

        sentences = self._split_into_sentences(clean)
        if not sentences:
            return clean

        # Limit to 2-3 sentences max for main summary
        max_sentences = 3 if original_len > 200 else 2
        main_summary = " ".join(sentences[:min(max_sentences, len(sentences))])
        
        # Ensure main summary is actually shorter
        if len(main_summary) > original_len * 0.6:
            # Take only first sentence
            main_summary = sentences[0] if sentences else clean

        # Extract key points from remaining sentences (but limit total length)
        bullets = []
        seen = set()
        remaining_length = original_len * 0.4  # Max 40% for bullets
        
        for sentence in sentences[max_sentences:]:
            s = sentence.strip(" -•")
            if len(s) < 10:
                continue
            if len(" ".join(bullets)) + len(s) > remaining_length:
                break
            normalized = s.lower()
            if normalized in seen:
                continue
            seen.add(normalized)
            bullets.append(s)
            if len(bullets) >= 4:  # Limit to 4 bullets
                break

        if bullets:
            bullet_text = "\n".join(f"- {point}" for point in bullets)
            return f"{main_summary}\n\nKey Points:\n{bullet_text}"

        return main_summary

    def _split_into_sentences(self, text):
        parts = re.split(r'(?<=[.!?])\s+', text)
        return [p.strip() for p in parts if p and len(p.strip()) > 3]

    def _refine_with_t5(self, text):
        if not hasattr(self, 'explainer'):
            return text
        try:
            result = self.explainer(
                f"summarize: {text[:1024]}",
                max_length=160,
                min_length=80,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                num_return_sequences=1
            )
            if result and len(result) > 0 and 'generated_text' in result[0]:
                return result[0]['generated_text']
        except Exception as e:
            print(f"T5 refinement failed: {e}")
        return text[:400]

    def _extract_topics(self, text):
        """Extract only actual topic headings, not random sentences."""
        raw_lines = [re.sub(r'\s+', ' ', line).strip() for line in text.split('\n')]
        topics = []
        
        for line in raw_lines:
            if not line or len(line) < 3:
                continue
            
            # Skip lines that are clearly content/paragraphs
            word_count = len(line.split())
            if word_count > 15:  # Too long to be a topic heading
                continue
            if len(line) > 100:  # Too many characters
                continue
            if re.search(r'[.!?]{2,}', line):  # Multiple sentence endings = paragraph
                continue
            if re.search(r'\b(is|are|was|were|the|a|an|this|that|these|those)\b.*\b(is|are|was|were)\b', line, re.IGNORECASE):
                continue  # Looks like a sentence/explanation
            
            # Only accept lines that look like headings
            if self._is_topic_heading(line):
                cleaned = self._strip_heading_prefix(line)
                # Further clean: remove common prefixes and limit length
                cleaned = re.sub(r'^(introduction|overview|summary|conclusion):?\s*', '', cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r'\s+', ' ', cleaned).strip()
                
                # Must be short and meaningful
                if 3 <= len(cleaned.split()) <= 10 and len(cleaned) <= 80:
                    if self._is_meaningful_topic(cleaned):
                        topics.append(cleaned)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_topics = []
        for topic in topics:
            key = re.sub(r'[^\w\s]', '', topic.lower()).strip()
            if key and key not in seen and len(key) > 5:
                seen.add(key)
                unique_topics.append(topic)
        
        # If we didn't find good headings, try a different approach
        if len(unique_topics) < 5:
            # Look for lines that start with numbers or bullets and are short
            for line in raw_lines:
                if not line or len(line) > 60:
                    continue
                if re.match(r'^[\d\.\-\*•]\s+', line):  # Starts with number/bullet
                    cleaned = re.sub(r'^[\d\.\-\*•]+\s*', '', line).strip()
                    if 2 <= len(cleaned.split()) <= 8 and len(cleaned) <= 60:
                        key = re.sub(r'[^\w\s]', '', cleaned.lower()).strip()
                        if key and key not in seen and len(key) > 5:
                            seen.add(key)
                            unique_topics.append(cleaned)
        
        return unique_topics[:50]  # Max 50 topics

    def _is_topic_heading(self, line):
        """Check if a line looks like a topic heading (not a paragraph)."""
        # Must be reasonably short
        if len(line) > 80 or len(line.split()) > 12:
            return False
        
        # Numbered headings: "1. Topic", "1.1 Subtopic", etc.
        if re.match(r'^\d+(\.\d+)*[\).\s-]+\w', line):
            return True
        
        # Chapter/Unit/Module headings
        if re.match(r'^(Chapter|Unit|Module|Topic|Section|Part)\s+\d+', line, re.IGNORECASE):
            return True
        
        # Title case headings (most words start with capital)
        words = line.split()
        if len(words) >= 2 and len(words) <= 8:
            title_case_count = sum(1 for w in words if w and w[0].isupper())
            if title_case_count >= len(words) * 0.6:  # At least 60% title case
                # But reject if it looks like a sentence
                if not re.search(r'[.!?]$', line):  # Doesn't end with sentence punctuation
                    return True
        
        # All caps short lines (like "AUTHENTICATION METHODS")
        stripped = re.sub(r'[^A-Za-z]', '', line)
        if 5 <= len(stripped) <= 40:
            uppercase_ratio = sum(1 for c in stripped if c.isupper()) / len(stripped)
            if uppercase_ratio > 0.7:  # At least 70% uppercase
                return True
        
        return False

    def _strip_heading_prefix(self, line):
        cleaned = re.sub(r'^[\d\.\-\*•]+\s*', '', line)
        cleaned = re.sub(r'^(Chapter|Unit|Module|Topic)\s*\d*:?\s*', '', cleaned, flags=re.IGNORECASE)
        return cleaned.strip()

    def _is_meaningful_topic(self, text):
        """Validate that text is a topic name, not a paragraph or explanation."""
        if not text or len(text) < 4:
            return False
        
        # Reject if too long (likely a paragraph)
        if len(text) > 80 or len(text.split()) > 12:
            return False
        
        # Reject common non-topic patterns
        if text.lower().startswith(('line ', 'page ', 'figure ', 'table ', 'example:', 'note:', 'tip:')):
            return False
        
        # Reject if it looks like a sentence/explanation
        if re.search(r'^(this|that|these|those|it|they|we|you)\s+', text, re.IGNORECASE):
            return False
        if re.search(r'\b(is|are|was|were|has|have|do|does|can|could|will|would)\s+(a|an|the|not|very|really)', text, re.IGNORECASE):
            return False
        if text.count('.') > 1 or text.count('!') > 1:  # Multiple sentences
            return False
        
        # Must have at least 2 words
        word_count = len(text.split())
        if word_count < 2:
            return False
        
        # Reject if it's mostly numbers or special chars
        alpha_count = sum(1 for c in text if c.isalpha())
        if alpha_count < len(text) * 0.5:  # Less than 50% letters
            return False
        
        return True

    def _split_text(self, text, max_length):
        words = text.split()
        chunks = []
        current_chunk = []
        current_length = 0

        for word in words:
            if current_length + len(word) + 1 <= max_length:
                current_chunk.append(word)
                current_length += len(word) + 1
            else:
                chunks.append(' '.join(current_chunk))
                current_chunk = [word]
                current_length = len(word)

        if current_chunk:
            chunks.append(' '.join(current_chunk))

        return chunks

    def _extractive_summarize(self, text, max_chars=300):
        """Extractive summarization using word-frequency sentence scoring.
        Picks the most informationally dense sentences from throughout the text.
        This is a pure-Python fallback requiring no ML models.
        """
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
            'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were',
            'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'it', 'its',
            'this', 'that', 'these', 'those', 'i', 'we', 'you', 'they', 'he',
            'she', 'as', 'also', 'so', 'if', 'not', 'no', 'can', 'into',
        }

        # Split text into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

        if not sentences:
            return text[:max_chars]
        if len(sentences) <= 2:
            result = ' '.join(sentences)
            return result[:max_chars] + ('...' if len(result) > max_chars else '')

        # Count word frequencies (excluding stop words)
        all_words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        freq = Counter(w for w in all_words if w not in stop_words)

        # Score each sentence by the sum of its word frequencies
        def score_sentence(sent):
            words = re.findall(r'\b[a-zA-Z]{3,}\b', sent.lower())
            content_words = [w for w in words if w not in stop_words]
            if not content_words:
                return 0
            return sum(freq.get(w, 0) for w in content_words) / len(content_words)

        scored = [(i, s, score_sentence(s)) for i, s in enumerate(sentences)]

        # Target: pick enough sentences to cover ~35% of original, max ~3-4 sentences
        target_chars = min(max_chars, int(len(text) * 0.35))
        
        # Sort by score descending, then pick top sentences up to target length
        sorted_by_score = sorted(scored, key=lambda x: x[2], reverse=True)
        
        selected_indices = set()
        total_chars = 0
        for i, s, score in sorted_by_score:
            if total_chars + len(s) > target_chars and len(selected_indices) >= 2:
                break
            selected_indices.add(i)
            total_chars += len(s)
            if len(selected_indices) >= 4:  # Max 4 sentences
                break

        # Re-order selected sentences by their original position
        selected = [s for i, s, _ in scored if i in selected_indices]

        summary = ' '.join(selected)
        print(f"[Extractive] Summarized from {len(text)} to {len(summary)} chars using sentence scoring")
        return summary

    def _normalize_concept(self, text):
        cleaned = text.strip()
        cleaned = re.sub(
            r'^(explain|describe|define|what is|tell me about|give me|teach me|overview of)\s+',
            '',
            cleaned,
            flags=re.IGNORECASE
        )
        cleaned = cleaned.strip(' ?.:-,')
        return cleaned if cleaned else text.strip()

    def _format_explanation_output(self, concept, explanation):
        if not explanation:
            print("[Format] No explanation provided, using template")
            return self._generic_concept_template(concept)

        # First, sanitize to remove obvious repetition
        cleaned = self._sanitize_explanation_text(explanation)
        
        # If sanitization removed too much, use original but with basic cleaning
        if not cleaned or len(cleaned.strip()) < 50:
            # Try a gentler sanitization
            cleaned = re.sub(r'\s+', ' ', explanation)
            cleaned = re.sub(r'\b(\w+)(\s+\1\b){3,}', r'\1', cleaned, flags=re.IGNORECASE)  # Only remove 3+ repetitions
            cleaned = re.sub(r'(Explain\s+the\s+concept\s+of\s+[^.]+\.?\s*){2,}', '', cleaned, flags=re.IGNORECASE)
            cleaned = cleaned.strip()
        
        # If still too short or empty, use template
        if not cleaned or len(cleaned.strip()) < 30:
            print(f"[Format] Explanation too short after sanitization ({len(cleaned) if cleaned else 0} chars), using template")
            return self._generic_concept_template(concept)
        
        # Limit overall length to keep responses concise
        cleaned = self._limit_text_length(cleaned, max_chars=900)

        # Remove markdown emphasis
        cleaned = cleaned.replace('**', '')

        # Check for excessive repetition, but be more lenient
        if self._has_high_repetition(cleaned):
            # Try one more aggressive sanitization pass
            cleaned = self._sanitize_explanation_text(cleaned)
            cleaned = cleaned.replace('**', '')
            if self._has_high_repetition(cleaned):
                print(f"[Format] High repetition detected even after sanitization, using template")
                return self._generic_concept_template(concept)
        
        # If we have a good explanation, use it directly instead of forcing into template
        # Only format if it's very unstructured
        if len(cleaned) > 200 and '\n' not in cleaned and not any(marker in cleaned.lower() for marker in ['definition', 'key points', 'example']):
            # It's a long paragraph without structure, let's format it
            sentences = self._split_into_sentences(cleaned)
        else:
            # It already has structure or is well-formatted, use it as-is
            print(f"[Format] Using explanation as-is ({len(cleaned)} chars)")
            return cleaned
        
        sentences = self._split_into_sentences(cleaned)

        if not sentences:
            return self._generic_concept_template(concept)

        definition = sentences[0]

        key_points = []
        example = None
        tip = None

        for sentence in sentences[1:]:
            lower = sentence.lower()
            if any(word in lower for word in ['example', 'scenario', 'instance']) and not example:
                example = sentence
                continue
            if any(word in lower for word in ['tip', 'remember', 'practice']) and not tip:
                tip = sentence
                continue
            if len(key_points) < 4:
                key_points.append(sentence)

        if not example and key_points:
            example = key_points[-1]
        if not tip:
            tip = f"Connect {concept} to everyday security habits, like using strong passwords and updates."

        key_points = key_points[:4]
        if not key_points:
            key_points = [
                f"{concept} protects digital assets and data.",
                "It uses policies, tools, and monitoring.",
                "Threats include malware, phishing, and insider risks."
            ]

        bullet_text = "\n".join(f"- {self._trim_sentence(point)}" for point in key_points)

        formatted = (
            f"Definition:\n{self._trim_sentence(definition)}\n\n"
            f"Key Points:\n{bullet_text}\n\n"
            f"Real-world Example:\n{self._trim_sentence(example)}\n\n"
            f"Study Tip:\n{self._trim_sentence(tip)}"
        )
        return formatted.strip()

    def _generic_concept_template(self, concept):
        base = (
            f"{concept} refers to a set of ideas, practices, or technologies designed to accomplish a specific goal. "
            f"In most study programs, {concept} is introduced with a clear definition, followed by the core principles "
            f"or components that make it work. Students then explore real-world applications and common challenges. "
            f"A helpful way to remember {concept} is to connect each principle to a practical example you have seen in "
            f"class or daily life."
        )
        bullet_points = [
            "Definition: What the concept means and why it matters.",
            "Key elements: The parts, steps, or rules that make the concept work.",
            "Example: A concrete scenario where the concept appears.",
            "Memory tip: Link the concept to an event, acronym, or diagram."
        ]
        bullets = "\n".join(f"- {point}" for point in bullet_points)
        return f"{base}\n\nKey Points:\n{bullets}"

    def _sanitize_explanation_text(self, text):
        """Light sanitization — only remove prompt echoes and severe word repetition.
        Never strip real content words like 'definition', 'explain', etc."""
        if not text:
            return ""

        cleaned = text

        # Remove prompt echo patterns only (full repeated instructions, not content words)
        cleaned = re.sub(
            r'(Explain\s+the\s+concept\s+of\s+[^.]+\.?\s*){2,}',
            '', cleaned, flags=re.IGNORECASE
        )
        cleaned = re.sub(
            r'(Describe\s+the\s+concept\s+of\s+[^.]+\.?\s*){2,}',
            '', cleaned, flags=re.IGNORECASE
        )

        # Collapse excessive whitespace
        cleaned = re.sub(r' {2,}', ' ', cleaned)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

        # Remove same consecutive word repeated 3+ times (e.g. "the the the")
        cleaned = re.sub(r'\b(\w+)(\s+\1\b){2,}', r'\1', cleaned, flags=re.IGNORECASE)

        return cleaned.strip()

    def _trim_sentence(self, sentence):
        if not sentence:
            return ""
        sentence = sentence.strip()
        sentence = sentence.rstrip(",;:")
        if not sentence.endswith(('.', '!', '?')):
            sentence += '.'
        return sentence

    def _has_high_repetition(self, text):
        words = re.findall(r'\b\w+\b', text.lower())
        if not words or len(words) < 10:
            return False  # Too short to judge
        
        # Check for consecutive word repetition (more reliable than overall ratio)
        consecutive_repeats = 0
        for i in range(len(words) - 2):
            if words[i] == words[i+1] == words[i+2]:
                consecutive_repeats += 1
        
        # If more than 5% of words are in triple+ repetitions, it's problematic
        if consecutive_repeats > len(words) * 0.05:
            return True
        
        # Also check overall unique ratio, but be more lenient
        unique_ratio = len(set(words)) / len(words)
        return unique_ratio < 0.35  # Lowered from 0.45 to be more lenient

    def _limit_text_length(self, text, max_chars=900):
        if not text or len(text) <= max_chars:
            return text
        
        truncated = text[:max_chars]
        # Try to cut at sentence boundary
        last_punct = max(truncated.rfind('. '), truncated.rfind('! '), truncated.rfind('? '))
        if last_punct != -1:
            return truncated[:last_punct + 1].strip()
        return truncated.strip() + '...'

    def _parse_quiz_response(self, response_text):
        data = self._parse_json_response(response_text)
        if not data:
            return None
        
        quiz_questions = []
        if isinstance(data, list):
            for item in data:
                question = item.get('question')
                options = item.get('options', [])
                answer = item.get('answer')
                explanation = item.get('explanation', '')
                if question and options and answer:
                    quiz_questions.append({
                        'question': question.strip(),
                        'options': options[:4],
                        'answer': answer.strip(),
                        'explanation': explanation.strip()
                    })
        elif isinstance(data, dict) and 'questions' in data:
            return self._parse_quiz_response(data['questions'])
        
        return quiz_questions if quiz_questions else None

    def _fallback_quiz(self, text, num_questions):
        sentences = self._split_into_sentences(text)
        sentences = [s for s in sentences if len(s.split()) > 5]
        questions = []
        
        for sentence in sentences[:num_questions]:
            true_statement = sentence.strip()
            false_statement = re.sub(r'\b(is|are|was|were|has|have)\b', 'is not', true_statement, count=1, flags=re.IGNORECASE)
            questions.append({
                'question': f"True or False: {true_statement}",
                'options': ['True', 'False'],
                'answer': 'True',
                'explanation': true_statement
            })
        
        return questions
