import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Get API key
api_key = os.getenv('GEMINI_API_KEY')
print(f"API Key found: {'Yes' if api_key else 'No'}")
if api_key:
    print(f"API Key starts with: {api_key[:10]}...")

# Try to use Gemini
try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-pro')
    
    print("\n🤖 Testing Gemini API...")
    response = model.generate_content("Explain photosynthesis in 2 sentences.")
    
    print("\n✅ SUCCESS! Gemini API is working!")
    print(f"\nResponse:\n{response.text}")
    
except Exception as e:
    print(f"\n❌ ERROR: {type(e).__name__}: {e}")
    print("\nPossible issues:")
    print("1. Invalid API key")
    print("2. API key doesn't have Gemini API enabled")
    print("3. Network/firewall blocking the request")
    print("4. Quota exceeded")
