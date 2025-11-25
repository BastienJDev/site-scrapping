import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

print(f"API Key: {GEMINI_API_KEY[:10]}...")

genai.configure(api_key=GEMINI_API_KEY)

print("\n=== Modèles disponibles ===")
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"✓ {model.name}")

print("\n=== Test avec gemini-1.5-flash ===")
try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Dis bonjour en français")
    print(f"Réponse: {response.text}")
except Exception as e:
    print(f"Erreur: {e}")
