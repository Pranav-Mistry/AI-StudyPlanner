from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth
from ai_models import AIModels
from pdf_processor import PDFProcessor
import traceback
from datetime import datetime, timedelta, timezone

load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes - allows frontend (localhost:3000) to access backend (localhost:5000)
CORS(app)

# Initialize Firebase
try:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cred = credentials.Certificate(os.path.join(base_dir, 'firebase-credentials.json'))
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("[OK] Firebase initialized successfully")
except Exception as e:
    print(f"[WARNING] Firebase initialization failed: {e}")
    db = None

def update_user_profile(user_id, name='', email='', points_delta=0, record_activity=False):
    """Ensure user exists, update streaks, and add points."""
    result = {
        'total_points': points_delta,
        'streak': 0,
        'daily_bonus': 0,
        'last_active_date': None
    }

    if not db or not user_id:
        return result

    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()

    if user_doc.exists:
        user_data = user_doc.to_dict() or {}
    else:
        user_data = {
            'name': name or 'Learner',
            'email': email or '',
            'streak': 0,
            'total_points': 0,
            'completed_topics': 0,
            'total_topics': 0,
            'completion_percentage': 0
        }

    total_points = user_data.get('total_points', 0) + points_delta
    streak = user_data.get('streak', 0)
    last_active = user_data.get('last_active_date')
    daily_bonus = 0

    def to_date(value):
        if isinstance(value, datetime):
            return value.date()
        try:
            return datetime.fromisoformat(value).date()
        except Exception:
            return None

    today = datetime.now(timezone.utc).date()
    last_active_date = to_date(last_active)

    if record_activity:
        if last_active_date == today:
            pass
        elif last_active_date == today - timedelta(days=1):
            streak = (streak or 0) + 1
            daily_bonus = 5
        else:
            streak = 1
            daily_bonus = 5
        total_points += daily_bonus
        last_active_str = today.isoformat()
    else:
        last_active_str = last_active_date.isoformat() if last_active_date else today.isoformat()

    user_ref.set({
        'name': name or user_data.get('name') or 'Learner',
        'email': email or user_data.get('email') or '',
        'total_points': total_points,
        'streak': streak,
        'last_active_date': last_active_str,
        'completed_topics': user_data.get('completed_topics', 0),
        'total_topics': user_data.get('total_topics', 0),
        'completion_percentage': user_data.get('completion_percentage', 0),
        'updated_at': firestore.SERVER_TIMESTAMP
    }, merge=True)

    result.update({
        'total_points': total_points,
        'streak': streak,
        'daily_bonus': daily_bonus,
        'last_active_date': last_active_str
    })
    return result

def count_plan_topics(plan):
    if not plan:
        return 0
    schedule = plan.get('schedule', [])
    total = 0
    for day in schedule:
        if isinstance(day, dict):
            total += len(day.get('topics', []))
    return total

def update_user_topic_stats(user_id, total_topics, completed_topics_count):
    if not db or not user_id:
        return
    completion_percentage = int((completed_topics_count / total_topics) * 100) if total_topics else 0
    db.collection('users').document(user_id).set({
        'total_topics': total_topics,
        'completed_topics': completed_topics_count,
        'completion_percentage': completion_percentage,
        'updated_at': firestore.SERVER_TIMESTAMP
    }, merge=True)

def recalculate_user_points(user_id):
    if not db or not user_id:
        return 0
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return 0
    user_data = user_doc.to_dict() or {}
    streak_points = max(0, user_data.get('streak', 0)) * 5

    quiz_points = 0
    try:
        quiz_results = db.collection('quiz_results').where(filter=firestore.FieldFilter('user_id', '==', user_id)).stream()
        for result in quiz_results:
            result_data = result.to_dict() or {}
            if result_data:
                quiz_points += max(0, result_data.get('score', result_data.get('points_earned', 0)) or 0)
    except Exception as e:
        print(f"Error recalculating quiz points for {user_id}: {e}")

    total_points = streak_points + quiz_points
    user_ref.set({
        'total_points': total_points,
        'quiz_points': quiz_points,
        'updated_at': firestore.SERVER_TIMESTAMP
    }, merge=True)
    return total_points

def get_day_topics_from_plan(plan, day_number):
    if not plan:
        return []
    schedule = plan.get('schedule', []) or []
    for index, entry in enumerate(schedule):
        current_day = entry.get('day') or index + 1
        if current_day == day_number:
            return entry.get('topics', []) or []
    return []

# Initialize AI Models
ai_models = AIModels()
pdf_processor = PDFProcessor()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'firebase': db is not None,
        'ai_models': ai_models.is_ready()
    })

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        
        # Create user in Firebase Auth
        user = auth.create_user(
            email=email,
            password=password,
            display_name=name
        )
        
        # Create user document in Firestore
        if db:
            db.collection('users').document(user.uid).set({
                'name': name,
                'email': email,
                'created_at': firestore.SERVER_TIMESTAMP,
                'streak': 0,
                'total_points': 0,
                'badges': []
            })
        
        return jsonify({
            'success': True,
            'user_id': user.uid,
            'message': 'User registered successfully'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@app.route('/api/auth/activity', methods=['POST'])
def record_activity():
    try:
        data = request.get_json(silent=True) or {}
        user_id = data.get('user_id')
        name = data.get('name', '')
        email = data.get('email', '')

        if not user_id:
            return jsonify({'success': False, 'error': 'User ID is required'}), 400

        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500

        engagement = update_user_profile(
            user_id,
            name=name,
            email=email,
            record_activity=True
        )
        total_points = recalculate_user_points(user_id)

        return jsonify({
            'success': True,
            'streak': engagement.get('streak', 0),
            'daily_bonus': engagement.get('daily_bonus', 0),
            'last_active_date': engagement.get('last_active_date'),
            'total_points': total_points
        })

    except Exception as e:
        print(f"Error recording activity: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/syllabus/upload', methods=['POST'])
def upload_syllabus():
    try:
        user_id = request.form.get('user_id')
        
        if 'file' in request.files:
            file = request.files['file']
            if file.filename.endswith('.pdf'):
                text = pdf_processor.extract_text_from_pdf(file)
            else:
                return jsonify({'success': False, 'error': 'Invalid file format'}), 400
        else:
            text = request.form.get('text')
        
        if not text:
            return jsonify({'success': False, 'error': 'No content provided'}), 400
        
        # Extract keywords and topics
        keywords = ai_models.extract_keywords(text)
        
        # Store in Firestore
        response_payload = {
            'success': True,
            'keywords': keywords,
            'content': text
        }

        if db:
            syllabus_ref = db.collection('syllabi').document()
            syllabus_ref.set({
                'user_id': user_id,
                'content': text,
                'keywords': keywords,
                'created_at': firestore.SERVER_TIMESTAMP
            })
            
            response_payload['syllabus_id'] = syllabus_ref.id
        
        return jsonify(response_payload)
        
    except Exception as e:
        print(f"Error: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/quiz/generate', methods=['POST'])
def generate_quiz():
    try:
        num_questions = 10
        text_content = None

        if request.files:
            num_questions = int(request.form.get('num_questions', 10))
            text_content = request.form.get('text')

            if 'file' in request.files:
                file = request.files['file']
                if file.filename.lower().endswith('.pdf'):
                    text_content = pdf_processor.extract_text_from_pdf(file)
                else:
                    return jsonify({'success': False, 'error': 'Only PDF files are supported'}), 400
        else:
            data = request.get_json(silent=True) or {}
            num_questions = int(data.get('num_questions', 10))
            text_content = data.get('text')

        if not text_content:
            return jsonify({'success': False, 'error': 'No content provided for quiz generation'}), 400

        quiz = ai_models.generate_quiz(text_content, num_questions)

        if not quiz:
            return jsonify({'success': False, 'error': 'Could not generate quiz from the provided content'}), 500

        return jsonify({
            'success': True,
            'quiz': quiz
        })

    except Exception as e:
        print(f"Error generating quiz: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/quiz/submit', methods=['POST'])
def submit_quiz():
    try:
        data = request.json
        user_id = data.get('user_id')
        user_name = data.get('user_name', 'Learner')
        user_email = data.get('email', '')
        score = int(data.get('score', 0))
        total_questions = int(data.get('total_questions', 0))

        if not user_id or total_questions <= 0:
            return jsonify({'success': False, 'error': 'Invalid quiz submission data'}), 400

        points_earned = max(0, score)

        if db:
            db.collection('quiz_results').add({
                'user_id': user_id,
                'score': score,
                'total_questions': total_questions,
                'points_earned': points_earned,
                'created_at': firestore.SERVER_TIMESTAMP
            })

            update_user_profile(
                user_id,
                name=user_name,
                email=user_email,
                points_delta=0,
                record_activity=False
            )
            total_points = recalculate_user_points(user_id)
        else:
            total_points = points_earned

        return jsonify({
            'success': True,
            'message': 'Quiz results submitted successfully',
            'points_earned': points_earned,
            'total_points': total_points
        })

    except Exception as e:
        print(f"Error submitting quiz: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/study-plan/generate', methods=['POST'])
def generate_study_plan():
    try:
        data = request.json
        syllabus_text = data.get('syllabus')
        days_available = data.get('days', 30)
        exam_date = data.get('exam_date')
        user_id = data.get('user_id')
        
        # Generate study plan using AI
        study_plan = ai_models.generate_study_plan(syllabus_text, days_available)
        plan_response = {
            'success': True,
            'study_plan': study_plan
        }
        
        # Store in Firestore keyed by user for easy retrieval
        if db and user_id:
            plan_ref = db.collection('study_plans').document(user_id)
            existing = plan_ref.get()
            plan_payload = {
                'user_id': user_id,
                'plan': study_plan,
                'exam_date': exam_date,
                'days_available': days_available,
                'completed_topics': [],
                'completed_days': [],
                'updated_at': firestore.SERVER_TIMESTAMP,
            }
            if existing.exists:
                plan_payload['created_at'] = existing.to_dict().get('created_at', firestore.SERVER_TIMESTAMP)
            else:
                plan_payload['created_at'] = firestore.SERVER_TIMESTAMP
            plan_ref.set(plan_payload)
            total_topics = count_plan_topics(study_plan)
            update_user_topic_stats(user_id, total_topics, 0)
            plan_response['plan_id'] = plan_ref.id
        
        return jsonify(plan_response)
        
    except Exception as e:
        print(f"Error: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/notes/summarize', methods=['POST'])
def summarize_notes():
    try:
        text = None
        
        # Check if file is uploaded
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename:
                if file.filename.lower().endswith('.pdf'):
                    # Extract text from PDF
                    text = pdf_processor.extract_text_from_pdf(file)
                    if not text or len(text.strip()) < 50:
                        return jsonify({
                            'success': False,
                            'error': 'Could not extract sufficient text from PDF. Please ensure the PDF contains readable text.'
                        }), 400
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Only PDF files are supported'
                    }), 400
        
        # If no file, check for text in JSON body
        if not text:
            data = request.get_json() or {}
            text = data.get('text')
        
        if not text or not text.strip():
            return jsonify({'success': False, 'error': 'No text provided. Please upload a PDF or paste text.'}), 400
        
        # Summarize using AI
        summary = ai_models.summarize_text(text)
        
        return jsonify({
            'success': True,
            'summary': summary
        })
        
    except Exception as e:
        print(f"Error: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/explain', methods=['POST'])
def explain_concept():
    try:
        data = request.json
        concept = data.get('concept')
        
        if not concept:
            return jsonify({'success': False, 'error': 'No concept provided'}), 400
        
        # Explain using AI
        explanation = ai_models.explain_concept(concept)
        
        if not explanation or not str(explanation).strip():
            explanation = "I'm sorry, I couldn't generate a meaningful explanation right now. Please try again with a different prompt."

        return jsonify({
            'success': True,
            'explanation': explanation
        })

    except Exception as e:
        print(f"Error: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/qa', methods=['POST'])
def answer_question():
    try:
        data = request.json
        question = data.get('question')
        context = data.get('context')
        
        if not question or not context:
            return jsonify({'success': False, 'error': 'Question and context required'}), 400
        
        # Answer using AI
        answer_result = ai_models.answer_question(question, context)
        
        # Handle both dict and string responses
        if isinstance(answer_result, dict):
            return jsonify({
                'success': True,
                'answer': answer_result.get('answer', ''),
                'confidence': answer_result.get('confidence', 0.0)
            })
        else:
            return jsonify({
                'success': True,
                'answer': str(answer_result)
            })
        
    except Exception as e:
        print(f"Error: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/progress/update', methods=['POST'])
def update_progress():
    try:
        data = request.json
        user_id = data.get('user_id')
        plan_id = data.get('plan_id') or user_id
        topic = data.get('topic')
        completed = bool(data.get('completed', True))
        
        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500
        if not (user_id and plan_id and topic):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        plan_ref = db.collection('study_plans').document(plan_id)
        plan_doc = plan_ref.get()
        
        if not plan_doc.exists:
            return jsonify({'success': False, 'error': 'Plan not found'}), 404
        
        plan_data = plan_doc.to_dict() or {}
        completed_topics = plan_data.get('completed_topics', [])
        
        points_awarded = 0
        if completed and topic not in completed_topics:
            completed_topics.append(topic)
        elif not completed:
            completed_topics = [item for item in completed_topics if item != topic]
        
        plan_ref.update({
            'completed_topics': completed_topics,
            'updated_at': firestore.SERVER_TIMESTAMP
        })

        total_topics = count_plan_topics(plan_data.get('plan'))
        update_user_topic_stats(user_id, total_topics, len(completed_topics))
        
        return jsonify({
            'success': True,
            'completed_count': len(completed_topics),
            'points_awarded': points_awarded
        })
        
    except Exception as e:
        print(f"Error: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/progress/<user_id>', methods=['GET'])
def get_progress(user_id):
    try:
        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500
        
        # Get user data
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        # If user doesn't exist, return default values instead of error
        if not user_doc.exists:
            user_ref.set({
                'name': user_id,
                'email': '',
                'streak': 0,
                'total_points': 0,
                'completed_topics': 0,
                'total_topics': 0,
                'completion_percentage': 0,
                'created_at': firestore.SERVER_TIMESTAMP
            })
            user_doc = user_ref.get()
        
        user_data = user_doc.to_dict() or {}
        
        engagement = update_user_profile(
            user_id,
            name=user_data.get('name'),
            email=user_data.get('email'),
            record_activity=True
        )
        if engagement:
            user_data['streak'] = engagement.get('streak', user_data.get('streak', 0))

        user_data['total_points'] = recalculate_user_points(user_id)
        
        # Get the user's current active study plan (one per user, id = user_id)
        plans_data = []
        plan_doc = db.collection('study_plans').document(user_id).get()
        if plan_doc.exists:
            plan_dict = plan_doc.to_dict() or {}
            if plan_dict:
                plan_dict['id'] = plan_doc.id
                plans_data.append(plan_dict)
        
        # Get quiz results for progress tracking
        quiz_results_data = []
        quiz_stats = {
            'total_quizzes': 0,
            'total_questions': 0,
            'total_correct': 0,
            'average_score': 0
        }
        try:
            # Get ALL quiz results for stats calculation
            all_quiz_results = db.collection('quiz_results').where(filter=firestore.FieldFilter('user_id', '==', user_id)).stream()
            
            all_results = []
            for result in all_quiz_results:
                result_data = result.to_dict() or {}
                if result_data:
                    # Handle Firestore timestamp
                    created_at = result_data.get('created_at')
                    timestamp_value = 0
                    if created_at:
                        # If it's a Firestore timestamp, convert to seconds
                        if hasattr(created_at, 'timestamp'):
                            timestamp_value = created_at.timestamp()
                        elif isinstance(created_at, (int, float)):
                            timestamp_value = created_at
                    
                    all_results.append({
                        'score': result_data.get('score', 0),
                        'total_questions': result_data.get('total_questions', 0),
                        'created_at': created_at,
                        'created_at_timestamp': timestamp_value,
                        'points_earned': result_data.get('points_earned', 0)
                    })
            
            # Calculate stats from ALL results
            if all_results:
                for result_data in all_results:
                    quiz_stats['total_quizzes'] += 1
                    quiz_stats['total_questions'] += result_data.get('total_questions', 0)
                    quiz_stats['total_correct'] += result_data.get('score', 0)
                
                # Sort by created_at timestamp, take most recent 10 for display
                all_results.sort(key=lambda x: x.get('created_at_timestamp', 0), reverse=True)
                quiz_results_data = all_results[:10]
                
                if quiz_stats['total_quizzes'] > 0:
                    quiz_stats['average_score'] = round((quiz_stats['total_correct'] / quiz_stats['total_questions']) * 100, 1) if quiz_stats['total_questions'] > 0 else 0
        except Exception as e:
            print(f"Error fetching quiz results: {e}")
        
        return jsonify({
            'success': True,
            'user': user_data,
            'plans': plans_data,
            'quiz_results': quiz_results_data,
            'quiz_stats': quiz_stats
        })
        
    except Exception as e:
        print(f"Error: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500
        
        # Get top users by points
        users = db.collection('users').order_by('total_points', direction=firestore.Query.DESCENDING).limit(10).stream()
        
        leaderboard = []
        for user in users:
            user_data = user.to_dict()
            total_points = recalculate_user_points(user.id)
            leaderboard.append({
                'name': user_data.get('name'),
                'points': total_points,
                'streak': user_data.get('streak', 0)
            })
        
        return jsonify({
            'success': True,
            'leaderboard': leaderboard
        })
        
    except Exception as e:
        print(f"Error: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/study-plan/save', methods=['POST'])
def save_study_plan():
    try:
        data = request.json
        user_id = data.get('user_id')
        study_plan = data.get('study_plan')
        
        if not user_id or not study_plan:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
            
        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500

        plan_ref = db.collection('study_plans').document(user_id)
        existing_doc = plan_ref.get()
        completed_topics = []
        completed_days = []
        if existing_doc.exists:
            existing_data = existing_doc.to_dict() or {}
            completed_topics = existing_data.get('completed_topics', [])
            completed_days = existing_data.get('completed_days', [])
        plan_ref.set({
            'user_id': user_id,
            'plan': study_plan,
            'completed_topics': completed_topics,
            'completed_days': completed_days,
            'updated_at': firestore.SERVER_TIMESTAMP
        }, merge=True)

        total_topics = count_plan_topics(study_plan)
        update_user_topic_stats(user_id, total_topics, len(completed_topics))
        
        return jsonify({'success': True, 'plan_id': plan_ref.id, 'message': 'Study plan saved successfully'})
        
    except Exception as e:
        print(f"Error saving study plan: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/study-plan/load', methods=['GET'])
def load_study_plan():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User ID is required'}), 400

        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500

        plan_doc = db.collection('study_plans').document(user_id).get()

        if plan_doc.exists:
            plan_data = plan_doc.to_dict()
            return jsonify({
                'success': True,
                'study_plan': plan_data.get('plan'),
                'plan_id': plan_doc.id,
                'completed_topics': plan_data.get('completed_topics', []),
                'completed_days': plan_data.get('completed_days', []),
                'exam_date': plan_data.get('exam_date')
            })

        # No plan found; return success with empty data so frontend can handle gracefully
        return jsonify({
            'success': True,
            'study_plan': None,
            'plan_id': None,
            'completed_topics': [],
            'completed_days': [],
            'message': 'No study plan found for this user yet.'
        })

    except Exception as e:
        print(f"Error loading study plan: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/study-plan/delete', methods=['DELETE'])
def delete_study_plan():
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User ID is required'}), 400

        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500

        plan_ref = db.collection('study_plans').document(user_id)
        plan_ref.delete()

        update_user_topic_stats(user_id, 0, 0)

        return jsonify({'success': True, 'message': 'Study plan deleted successfully'})
    except Exception as e:
        print(f"Error deleting study plan: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/study-plan/day-status', methods=['POST'])
def update_day_status():
    try:
        data = request.json
        user_id = data.get('user_id')
        day_number = data.get('day')
        completed = bool(data.get('completed', True))

        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500
        if not user_id or day_number is None:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400

        plan_ref = db.collection('study_plans').document(user_id)
        plan_doc = plan_ref.get()
        if not plan_doc.exists:
            return jsonify({'success': False, 'error': 'Study plan not found'}), 404

        plan_data = plan_doc.to_dict() or {}
        plan = plan_data.get('plan') or {}
        completed_days = plan_data.get('completed_days', [])
        completed_topics = plan_data.get('completed_topics', [])

        day_topics = get_day_topics_from_plan(plan, day_number)

        if completed:
            if day_number not in completed_days:
                completed_days.append(day_number)
            for topic in day_topics:
                topic_key = f"Day {day_number}::{topic}"
                if topic_key not in completed_topics:
                    completed_topics.append(topic_key)
        else:
            completed_days = [day for day in completed_days if day != day_number]
            prefix = f"Day {day_number}::"
            completed_topics = [topic for topic in completed_topics if not topic.startswith(prefix)]

        total_topics = count_plan_topics(plan)
        plan_ref.update({
            'completed_days': completed_days,
            'completed_topics': completed_topics,
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        update_user_topic_stats(user_id, total_topics, len(completed_topics))

        return jsonify({
            'success': True,
            'completed_days': completed_days,
            'completed_topics': completed_topics
        })

    except Exception as e:
        print(f"Error updating day status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ── Flashcard Generator ───────────────────────────────────────────────────────
@app.route('/api/flashcards/generate', methods=['POST'])
def generate_flashcards():
    """Generate flashcards (Q&A pairs) from text or PDF using AI."""
    try:
        text = None
        num_cards = 8

        # Check if PDF file is uploaded
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename:
                if file.filename.lower().endswith('.pdf'):
                    text = pdf_processor.extract_text_from_pdf(file)
                    if not text or len(text.strip()) < 50:
                        return jsonify({'success': False, 'error': 'Could not extract sufficient text from PDF. Ensure the PDF contains readable text.'}), 400
                else:
                    return jsonify({'success': False, 'error': 'Only PDF files are supported.'}), 400
            num_cards = min(int(request.form.get('num_cards', 8)), 15)
        else:
            # JSON body
            data = request.get_json() or {}
            text = (data.get('text') or '').strip()
            num_cards = min(int(data.get('num_cards', 8)), 15)

        if not text or len(text.strip()) < 30:
            return jsonify({'success': False, 'error': 'Please provide at least 30 characters of content.'}), 400

        flashcards = ai_models.generate_flashcards(text, num_cards)
        return jsonify({'success': True, 'flashcards': flashcards})

    except Exception as e:
        print(f"Error generating flashcards: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ── History & Exams ────────────────────────────────────────────────────────

@app.route('/api/history/<user_id>', methods=['GET'])
def get_user_history(user_id):
    try:
        feature = request.args.get('feature')
        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500
        
        query = db.collection('user_history').where(filter=firestore.FieldFilter('user_id', '==', user_id))
        if feature:
            query = query.where(filter=firestore.FieldFilter('feature', '==', feature))
            
        results = query.stream()
        
        history = []
        for doc in results:
            data = doc.to_dict()
            data['id'] = doc.id
            history.append(data)
            
        # Sort in memory descending by createdAt to avoid Firestore composite index requirement
        history.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        # Limit to 25
        history = history[:25]
            
        return jsonify({'success': True, 'history': history})
    except Exception as e:
        print(f"Error fetching history: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/history/save', methods=['POST'])
def save_user_history():
    try:
        data = request.json
        user_id = data.get('user_id')
        feature = data.get('feature')
        
        if not user_id or not feature:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500

        payload = {
            'user_id': user_id,
            'feature': feature,
            'title': data.get('title', '')[:80],
            'data': data.get('data', {}),
            'createdAt': datetime.now(timezone.utc).isoformat()
        }
        
        if data.get('id'):
            # Update existing
            doc_ref = db.collection('user_history').document(data['id'])
            doc_ref.set({'data': data.get('data', {}), 'updatedAt': datetime.now(timezone.utc).isoformat()}, merge=True)
            payload['id'] = data.get('id')
        else:
            doc_ref = db.collection('user_history').document()
            doc_ref.set(payload)
            payload['id'] = doc_ref.id
            
        return jsonify({'success': True, 'item': payload})
    except Exception as e:
        print(f"Error saving history: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/history/delete', methods=['DELETE'])
def delete_user_history():
    try:
        data = request.json
        user_id = data.get('user_id')
        doc_id = data.get('id')
        clear_feature = data.get('clear_feature')
        
        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500
        
        if clear_feature and user_id:
            # Clear all for a feature
            docs = db.collection('user_history').where(filter=firestore.FieldFilter('user_id', '==', user_id)).where(filter=firestore.FieldFilter('feature', '==', clear_feature)).stream()
            for doc in docs:
                doc.reference.delete()
        elif doc_id:
            db.collection('user_history').document(doc_id).delete()
            
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error deleting history: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/exams/<user_id>', methods=['GET'])
def get_user_exams(user_id):
    try:
        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500
            
        doc = db.collection('user_exams').document(user_id).get()
        exams = doc.to_dict().get('exams', []) if doc.exists else []
        return jsonify({'success': True, 'exams': exams})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/exams/save', methods=['POST'])
def save_user_exams():
    try:
        data = request.json
        user_id = data.get('user_id')
        exams = data.get('exams', [])
        
        if not user_id:
            return jsonify({'success': False, 'error': 'Missing user_id'}), 400
        if not db:
            return jsonify({'success': False, 'error': 'Database not available'}), 500
            
        db.collection('user_exams').document(user_id).set({
            'user_id': user_id,
            'exams': exams,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }, merge=True)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
