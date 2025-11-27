import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-2.0-flash')
response = model.generate_content('Réponds juste "OK" si tu me reçois')
print('✓ Test Gemini réussi:', response.text)
