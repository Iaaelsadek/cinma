import google.generativeai as genai
import os
import json
import re
import random
from dotenv import load_dotenv
from config import TOPICS

# Load env from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class ScriptGenerator:
    def __init__(self):
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
        else:
            print("Warning: GEMINI_API_KEY not found. Script generation will rely on fallbacks.")

    def generate_script(self, topic=None):
        if not topic:
            topic = random.choice(TOPICS)
        
        print(f"Generating script for topic: {topic}...")
        
        prompt = f"""
        Act as a professional viral content creator for TikTok/Reels.
        Target Audience: Egyptian/Arab Kids (5-12 years).
        Topic: {topic}
        
        **Characters (STRICT):**
        - Omar (5 years old, mischievous but good-hearted).
        - Sondos (7 years old, wise older sister).

        **CRITICAL RULES (HUMANIZATION PROTOCOL):**
        1. **NO AI CLICHÉS:** Do NOT start with "Hello friends", "Welcome back", "In this video", or "Today we will learn". 
        2. **Start with a HOOK:** Begin immediately with a shocking statement, a question, or an action (e.g., "عمر عمل مصيبة!" or "تخيل لو حصل كدة!").
        3. **Language:** Use **Egyptian Colloquial (Masri)** or extremely simple White Arabic. It must sound like a real conversation between kids.
        4. **Fast Paced:** Keep sentences short and punchy.
        5. **Moral:** Embed the lesson naturally at the end, don't preach.
        
        **Structure:**
        1. **Scene 1 (Hook):** 0-3 seconds. Grab attention.
        2. **Scene 2-4 (Story):** The conflict/situation.
        3. **Scene 5 (Resolution/Moral):** The lesson learned.
        4. **Scene 6 (CTA):** "Like & Follow for more stories!" (in Arabic).

        **Output Format (Strict JSON):**
        {{
            "title": "Short Catchy Arabic Title",
            "topic": "{topic}",
            "scenes": [
                {{
                    "scene_number": 1,
                    "image_prompt": "Detailed visual description for this specific moment (English). Include 'Omar' or 'Sondos' explicitly.",
                    "narration": "Arabic text exactly as it should be spoken (with Tashkeel if needed for pronunciation)."
                }},
                ...
            ]
        }}
        """

        if not GEMINI_API_KEY:
             return self._get_fallback_script(topic)

        # Helper to process response
        def process_response(response):
            text = response.text
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return None

        # --- Gemini API with Fallback Mechanism ---
        try:
            # 1. Primary Model (Latest Stable)
            print("Attempting with Primary Model (gemini-3.1-pro)...")
            model = genai.GenerativeModel("gemini-3.1-pro")
            response = model.generate_content(prompt)
            script_data = process_response(response)
            if script_data:
                return script_data
            else:
                raise ValueError("Could not parse JSON from Primary Model")

        except Exception as e:
            # 2. Exception Handling & Fallback
            error_str = str(e)
            is_resource_error = "ResourceExhausted" in error_str or "429" in error_str or "Quota" in error_str
            
            if is_resource_error or "ValueError" in error_str:
                print(f"[LOG] Warning: Primary model failed ({e}). Switching to Fallback Model...")
                try:
                    # 3. Fallback Model (Efficient/Free Tier friendly)
                    print("Attempting with Fallback Model (gemini-1.5-flash)...")
                    model = genai.GenerativeModel("gemini-1.5-flash")
                    response = model.generate_content(prompt)
                    script_data = process_response(response)
                    if script_data:
                        return script_data
                    else:
                        print("Error: Could not parse JSON from Fallback Model.")
                        return self._get_fallback_script(topic)
                except Exception as e2:
                    print(f"[LOG] Error in Fallback Model: {e2}")
                    return self._get_fallback_script(topic)
            else:
                # 4. Catch unexpected errors
                print(f"[LOG] Unexpected Gemini Error: {e}")
                return self._get_fallback_script(topic)

    def _get_fallback_script(self, topic):
        print("Using fallback script due to generation error.")
        return {
            "title": f"قصة {topic}",
            "topic": topic,
            "scenes": [
                {
                    "scene_number": 1,
                    "image_prompt": "Omar looking shocked with broken vase on floor, Pixar style",
                    "narration": "يا خبر! ماما هتزعل مني قوي يا سندس!"
                },
                {
                    "scene_number": 2,
                    "image_prompt": "Sondos looking concerned at Omar, Pixar style",
                    "narration": "ولا يهمك يا عمر، بس لازم نقول الصدق."
                },
                 {
                    "scene_number": 3,
                    "image_prompt": "Omar smiling and hugging his mom, Pixar style",
                    "narration": "ماما سامحتني عشان قلت الصدق! الحمد لله."
                }
            ]
        }

if __name__ == "__main__":
    generator = ScriptGenerator()
    script = generator.generate_script("Honesty")
    if script:
        print(json.dumps(script, indent=2, ensure_ascii=False))
