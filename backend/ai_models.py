import json
import os
import re
import math
from collections import Counter
from textwrap import dedent

import google.generativeai as genai
import torch
from dotenv import load_dotenv
from transformers import pipeline

load_dotenv()


class AIModels:
    def __init__(self):
        self.device = 0 if torch.cuda.is_available() else -1
        print(f"🔧 Using device: {'GPU' if self.device == 0 else 'CPU'}")

        self.use_gemini = False
        self.ready = False

        # Ensure attributes always exist even if heavy models fail to load
        self.summarizer = None
        self.qa_model = None
        self.explainer = None

        self._init_gemini()
        self._init_local_models()

    def _init_gemini(self):
        """Configure Google Gemini if an API key is provided."""
        try:
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                print("⚠️ GEMINI_API_KEY not found, defaulting to local transformer models.")
                return

            genai.configure(api_key=api_key)
            
            # First, try to list available models
            try:
                models = genai.list_models()
                available_models = []
                preferred_models = [
                    'gemini-2.5-flash',           # Fast and efficient
                    'gemini-flash-latest',        # Latest flash version
                    'gemini-2.5-pro',             # More capable
                    'gemini-pro-latest',          # Latest pro version
                ]
                
                for model in models:
                    if 'generateContent' in model.supported_generation_methods:
                        model_name = model.name.replace('models/', '')
                        available_models.append(model_name)
                
                if available_models:
                    # Try preferred models first
                    for preferred in preferred_models:
                        if preferred in available_models:
                            model_name = preferred
                            self.gemini_model = genai.GenerativeModel(model_name)
                            print(f"✅ Google Gemini API configured successfully (using {model_name}).")
                            self.use_gemini = True
                            return
                    
                    # If preferred not found, use first available
                    model_name = available_models[0]
                    self.gemini_model = genai.GenerativeModel(model_name)
                    print(f"✅ Google Gemini API configured successfully (using {model_name}).")
                    self.use_gemini = True
                    return
                else:
                    print("⚠️ No models with generateContent found, trying common names...")
            except Exception as list_error:
                # If listing fails (e.g., quota), try common names directly
                print(f"⚠️ Could not list models: {str(list_error)[:100]}...")
                print("   Trying common model names directly...")
            
            # Fallback: Try newer model names
            model_names = [
                'gemini-2.5-flash',      # Fast and efficient
                'gemini-flash-latest',   # Latest flash
                'gemini-2.5-pro',        # More capable
                'gemini-pro-latest',     # Latest pro
            ]
            
            self.gemini_model = None
            for model_name in model_names:
                try:
                    self.gemini_model = genai.GenerativeModel(model_name)
                    # Test if it works with a simple request
                    test_response = self.gemini_model.generate_content("test")
                    if test_response and hasattr(test_response, 'text'):
                        print(f"✅ Google Gemini API configured successfully (using {model_name}).")
                        self.use_gemini = True
                        return
                except Exception as e:
                    continue
            
            # If all models failed
            print("⚠️ All Gemini models failed to initialize, using local models.")
            print("💡 Make sure Gemini API is enabled in Google Cloud Console:")
            print("   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com")
            self.use_gemini = False
        except Exception as e:
            print(f"⚠️ Failed to initialize Gemini: {e}")
            self.use_gemini = False

    def _init_local_models(self):
        """Load local transformer pipelines as fallbacks."""
        errors = []
        try:
            print("📥 Loading local transformer models...")
            if not self.summarizer:
                try:
                    self.summarizer = pipeline(
                        "summarization",
                        model="facebook/bart-large-cnn",
                        device=self.device
                    )
                    print("✅ Summarization model loaded.")
                except Exception as summarizer_error:
                    errors.append(f"summarizer: {summarizer_error}")
                    print(f"⚠️ Summarizer load failed: {summarizer_error}")

            if not self.qa_model:
                try:
                    self.qa_model = pipeline(
                        "question-answering",
                        model="deepset/roberta-base-squad2",
                        device=self.device
                    )
                    print("✅ Q&A model loaded.")
                except Exception as qa_error:
                    errors.append(f"qa: {qa_error}")
                    print(f"⚠️ Q&A model load failed: {qa_error}")

            if not self.explainer:
                try:
                    self.explainer = pipeline(
                        "text2text-generation",
                        model="google/flan-t5-base",
                        device=self.device
                    )
                    print("✅ Local explanation model loaded.")
                except Exception as explain_error:
                    errors.append(f"explainer: {explain_error}")
                    print(f"⚠️ Explainer load failed: {explain_error}")

            self.ready = any([self.summarizer, self.qa_model, self.explainer])
            if self.ready:
                print("🎉 AI models ready (with fallbacks where needed).")
            else:
                print("⚠️ Could not load any heavy models, using lightweight fallbacks only.")
        except Exception as e:
            errors.append(str(e))
            print(f"⚠️ Error loading local models: {e}")
            self.ready = False

    def is_ready(self):
        return self.ready

    def summarize_text(self, text, max_length=150, min_length=50):
        """Summarize long text into concise notes."""
        try:
            text = text.strip()
            if len(text) < 50:
                return "Please provide at least 50 characters of content to summarize."

            summary_text = None

            if self.use_gemini:
                prompt = dedent(f"""
                You are an academic summarizer. Summarize the following content in 2-3 sentences
                and provide up to five bullet points with key insights. Respond with valid JSON:
                {{
                  "summary": "two to three sentences paraphrased in your own words",
                  "key_points": ["concise takeaway 1", "concise takeaway 2"]
                }}

                Avoid copying sentences verbatim; focus on main ideas only.

                Content:
                \"\"\"{text[:4000]}\"\"\"
                """)
                response = self._call_gemini(prompt)
                summary_text = self._summary_from_response(response)

            if not summary_text:
                summary_text = self._local_summarize(text, max_length, min_length)

            return self._format_summary_output(summary_text, text)

        except Exception as e:
            print(f"Error in summarization: {e}")
            return "Error generating summary. Please try again later."

    def generate_study_plan(self, syllabus_text, days_available=30):
        """Generate a structured study plan from syllabus."""
        try:
            cleaned_text = syllabus_text.strip()
            if len(cleaned_text) < 50:
                return {
                    'error': 'Please provide a more detailed syllabus to generate a plan.'
                }

            if self.use_gemini:
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
                response = self._call_gemini(prompt, max_output_tokens=2048)
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
            explanation = None
            
            # Try Gemini first if available
            if self.use_gemini:
                print(f"[Explain] Attempting Gemini API for '{concept}'")
                prompt = dedent(f"""
                You are a friendly study assistant. Explain the concept "{concept}" to a student in detail.
                
                Provide a comprehensive explanation that includes:
                1. A clear, concise definition (2-3 sentences)
                2. Key points or components (3-5 bullet points)
                3. A real-world example or application
                4. A study tip for remembering this concept
                
                Write naturally and conversationally, as if explaining to a friend. Make sure to complete your explanation fully.
                """)
                explanation = self._call_gemini(prompt, max_output_tokens=4096)
                
                if explanation:
                    print(f"[Explain] Got Gemini response ({len(explanation)} chars)")
                else:
                    print("[Explain] Gemini returned None, trying local model")

            # Fallback to local model if Gemini didn't work
            if not explanation:
                print(f"[Explain] Using local model for '{concept}'")
                explanation = self._generate_local_explanation(concept)
                if explanation:
                    print(f"[Explain] Got local model response ({len(explanation)} chars)")

            # Use the explanation directly if it's good, especially from Gemini
            if explanation and len(explanation.strip()) > 100:
                # Clean up obvious repetition issues
                cleaned = self._sanitize_explanation_text(explanation)
                
                # If it's from Gemini and looks good, use it directly
                if self.use_gemini and cleaned and len(cleaned.strip()) > 100:
                    # Check for severe repetition only
                    if not self._has_high_repetition(cleaned):
                        print(f"[Explain] Using Gemini response directly ({len(cleaned)} chars)")
                        return cleaned.strip()
                    else:
                        print(f"[Explain] Gemini response has repetition, cleaning further")
                        # One more aggressive clean
                        cleaned = self._sanitize_explanation_text(cleaned)
                        if cleaned and len(cleaned.strip()) > 80:
                            return cleaned.strip()
                
                # If we still have a good explanation after cleaning, use it
                if cleaned and len(cleaned.strip()) > 80:
                    print(f"[Explain] Using cleaned explanation ({len(cleaned)} chars)")
                    return cleaned.strip()
            
            # If explanation is too short or empty, try formatting or use template
            if explanation and len(explanation.strip()) > 50:
                formatted = self._format_explanation_output(concept, explanation)
                # Only use template if formatting also failed
                if "refers to a set of ideas" in formatted:
                    print(f"[Explain] Formatting returned template, using original explanation")
                    return explanation.strip()
                return formatted
            else:
                print(f"[Explain] Explanation too short or empty ({len(explanation.strip()) if explanation else 0} chars), using template")
                return self._format_explanation_output(concept, None)
                
        except Exception as e:
            print(f"[Explain] Error in explain_concept: {e}")
            import traceback
            traceback.print_exc()
            return self._format_explanation_output(concept, None)

    def answer_question(self, question, context):
        """Answer questions based on provided context."""
        try:
            question = question.strip()
            context = context.strip()

            if self.use_gemini:
                prompt = dedent(f"""
                You are an exam-preparation assistant. Using only the context below, answer the question.
                If the context does not contain the answer, say so explicitly.

                Context:
                \"\"\"{context[:4000]}\"\"\"

                Question: {question}
                """)
                response = self._call_gemini(prompt)
                if response:
                    return {
                        'answer': response,
                        'confidence': 0.9
                    }

            result = self.qa_model(
                question=question,
                context=context
            )
            return {
                'answer': result['answer'],
                'confidence': result['score']
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
            response = self._call_gemini(prompt, max_output_tokens=4096)
            quiz = self._parse_quiz_response(response)
            if quiz:
                return quiz

        # Fallback to simple fact-based questions
        return self._fallback_quiz(cleaned_text, num_questions)

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
        if not self.use_gemini:
            print("[Gemini] Not enabled, using fallback")
            return None
        try:
            response = self.gemini_model.generate_content(
                prompt,
                generation_config={
                    "temperature": temperature,
                    "top_p": 0.9,
                    "max_output_tokens": max_output_tokens
                }
            )
            # Try different ways to extract text from Gemini response
            text = None
            if hasattr(response, 'text'):
                text = response.text
            elif hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                    text = ''.join(part.text for part in candidate.content.parts if hasattr(part, 'text'))
            
            if text and text.strip():
                print(f"[Gemini] Successfully generated response ({len(text)} chars)")
                return text.strip()
            else:
                print("[Gemini] Response received but no text found")
                return None
        except Exception as e:
            print(f"[Gemini] Error calling API: {e}")
            import traceback
            traceback.print_exc()
        return None

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

    def _local_summarize(self, text, max_length, min_length):
        if not self.summarizer:
            print("ℹ️ Summarizer pipeline unavailable, using lightweight fallback.")
            return self._simple_summarize(text)

        max_input_length = 1024
        if len(text) > max_input_length:
            chunks = self._split_text(text, max_input_length)
            summaries = []
            for chunk in chunks:
                if len(chunk.strip()) > 20:
                    result = self.summarizer(
                        chunk,
                        max_length=max_length,
                        min_length=min_length,
                        do_sample=False,
                        num_beams=4,
                        early_stopping=True
                    )
                    summaries.append(result[0]['summary_text'])
            return " ".join(summaries) or text[:max_length]
        else:
            result = self.summarizer(
                text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False,
                num_beams=4,
                early_stopping=True
            )
            return result[0]['summary_text']

    def _simple_summarize(self, text, max_sentences=5):
        """Lightweight frequency-based summarization when transformers are unavailable."""
        sentences = self._split_into_sentences(text)
        if not sentences:
            return text[:200]

        if len(sentences) <= max_sentences:
            return " ".join(sentences)

        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        stop_words = {
            'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will',
            'your', 'about', 'which', 'their', 'would', 'there', 'into', 'while',
            'where', 'when', 'been', 'them', 'they', 'these', 'those', 'also',
            'such', 'than', 'then'
        }
        freq = Counter(word for word in words if word not in stop_words)
        if not freq:
            return " ".join(sentences[:max_sentences])

        sentence_scores = []
        for sentence in sentences:
            sentence_words = re.findall(r'\b[a-zA-Z]{3,}\b', sentence.lower())
            score = sum(freq.get(word, 0) for word in sentence_words)
            sentence_scores.append((score, sentence))

        top_sentences = sorted(sentence_scores, key=lambda x: x[0], reverse=True)[:max_sentences]
        top_sentences = sorted(top_sentences, key=lambda x: sentences.index(x[1]))
        return " ".join(sentence for _, sentence in top_sentences)

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

        if original_text and len(clean) > len(original_text) * 0.9:
            refined = self._refine_with_t5(original_text)
            if refined:
                clean = refined.strip()

        sentences = self._split_into_sentences(clean)
        if not sentences:
            return clean

        main_summary = " ".join(sentences[:min(2, len(sentences))])

        bullets = []
        seen = set()
        for sentence in sentences:
            s = sentence.strip(" -•")
            if len(s) < 5:
                continue
            normalized = s.lower()
            if normalized in seen:
                continue
            seen.add(normalized)
            bullets.append(s)
            if len(bullets) == 5:
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
        if not text:
            return ""
        
        # Remove excessive whitespace
        cleaned = re.sub(r'\s+', ' ', text)
        
        # Remove repeated words (e.g., "cyber cyber cyber security" -> "cyber security")
        # This pattern catches 2+ consecutive repetitions of the same word
        cleaned = re.sub(r'\b(\w+)(\s+\1\b){2,}', r'\1', cleaned, flags=re.IGNORECASE)
        
        # Remove repeated phrases (e.g., "Explain the concept of X" repeated)
        cleaned = re.sub(r'(Explain\s+the\s+concept\s+of\s+[^.]+\.?\s*){2,}', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'(Describe\s+the\s+concept\s+of\s+[^.]+\.?\s*){2,}', '', cleaned, flags=re.IGNORECASE)
        
        # Remove instruction phrases that shouldn't be in the output
        cleaned = re.sub(r'\b(?:explain|describe|define|definition)\s+(?:the\s+)?(?:concept\s+of\s+)?[: ]*', '', cleaned, flags=re.IGNORECASE)
        
        # Remove trailing repetition patterns (e.g., "cyber cyber cyber security" at the end)
        # Split by sentences and check each one
        sentences = re.split(r'[.!?]+', cleaned)
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # Check for excessive repetition in this sentence
            words = sentence.split()
            if len(words) > 2:
                # Count unique words vs total words
                unique_words = len(set(w.lower() for w in words))
                if unique_words < len(words) * 0.4:  # More than 60% repetition
                    continue  # Skip this sentence
            
            # Remove any remaining word repetitions within the sentence
            sentence = re.sub(r'\b(\w+)(\s+\1\b)+', r'\1', sentence, flags=re.IGNORECASE)
            if sentence and len(sentence.strip()) > 10:
                cleaned_sentences.append(sentence)
        
        cleaned = '. '.join(cleaned_sentences)
        if cleaned and not cleaned.endswith('.'):
            cleaned += '.'
        
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
