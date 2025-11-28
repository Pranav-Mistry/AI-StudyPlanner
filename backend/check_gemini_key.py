"""Simple script to check if Gemini API key is configured"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')

print("=" * 50)
print("Gemini API Key Check")
print("=" * 50)

if api_key:
    # Show first and last 4 characters for security
    masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "***"
    print(f"✅ GEMINI_API_KEY is SET")
    print(f"   Key preview: {masked_key}")
    print(f"   Key length: {len(api_key)} characters")
    
    # Try to test the key and list available models
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        print("\n📋 Listing available models...")
        try:
            models = genai.list_models()
            available_models = []
            for model in models:
                if 'generateContent' in model.supported_generation_methods:
                    model_name = model.name.replace('models/', '')
                    available_models.append(model_name)
                    print(f"   ✅ {model_name}")
            
            if not available_models:
                print("   ⚠️ No models found with generateContent support")
            else:
                print(f"\n🧪 Testing with first available model: {available_models[0]}...")
                model = genai.GenerativeModel(available_models[0])
                response = model.generate_content("Say 'Hello' in one word.")
                if response and hasattr(response, 'text'):
                    print(f"✅ API key is VALID! Working model: {available_models[0]}")
                    print(f"   Test response: {response.text.strip()}")
                else:
                    print("⚠️ Got empty response")
        except Exception as list_error:
            print(f"   ⚠️ Could not list models: {list_error}")
            print("\n🧪 Trying newer model names directly...")
            
            # Try newer model names (these are the current available models)
            model_names = [
                'gemini-2.5-flash',      # Fast and efficient
                'gemini-flash-latest',   # Latest flash version
                'gemini-2.5-pro',        # More capable
                'gemini-pro-latest',     # Latest pro version
            ]
            working_model = None
            
            for model_name in model_names:
                try:
                    print(f"   Trying {model_name}...", end=" ")
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content("Say 'Hello' in one word.")
                    if response and hasattr(response, 'text'):
                        print(f"✅ WORKS!")
                        print(f"✅ API key is VALID! Working model: {model_name}")
                        print(f"   Test response: {response.text.strip()}")
                        working_model = model_name
                        break
                    else:
                        print("❌ Empty response")
                except Exception as e:
                    error_msg = str(e)
                    if "429" in error_msg or "quota" in error_msg.lower():
                        print(f"⚠️ Quota limit hit - wait a minute and try again")
                    else:
                        print(f"❌ Failed: {error_msg[:50]}...")
                    continue
            
            if not working_model:
                print("\n❌ None of the models worked.")
                print("\n💡 Troubleshooting steps:")
                print("   1. Go to https://aistudio.google.com/app/apikey")
                print("   2. Make sure your API key is active")
                print("   3. Check if Gemini API is enabled in Google Cloud Console")
                print("   4. Try creating a new API key")
                print("   5. Free tier: Gemini API has free usage, but you may need to")
                print("      enable it in Google Cloud Console first")
    except Exception as e:
        print(f"❌ API key test FAILED: {e}")
        print("\n💡 This might mean:")
        print("   - API key is invalid or expired")
        print("   - Gemini API is not enabled for this key")
        print("   - Network/firewall issue")
else:
    print("❌ GEMINI_API_KEY is NOT SET")
    print("\nTo set it:")
    print("1. Create a file named '.env' in the backend folder")
    print("2. Add this line: GEMINI_API_KEY=your_actual_api_key_here")
    print("3. Get your API key from: https://aistudio.google.com/app/apikey")
    print("\nExample .env file content:")
    print("   GEMINI_API_KEY=AIzaSy...your_key_here...")

print("=" * 50)

