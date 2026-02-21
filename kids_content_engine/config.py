import os

# --- ISOLATION CONFIGURATION ---
# This project is strictly standalone.
# It does NOT use any keys from the parent 'cinema_online' project.
# It relies entirely on free, open-source tools (g4f, edge-tts, pollinations).
ISOLATED_MODE = True

# Base Directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")

# Ensure directories exist
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(FONTS_DIR, exist_ok=True)

# --- Characters (Strict Consistency) ---
# Omar: 5 years old, cute Egyptian boy
OMAR_PROMPT = "A 5-year-old Egyptian Muslim boy named Omar, cute 3D Pixar style character, short curly black hair, wearing a casual colorful t-shirt, friendly face, expressive big eyes, high quality 3D render, soft cinematic lighting, 8k resolution."

# Sondos: 7 years old, cute Egyptian girl
SONDOS_PROMPT = "A 7-year-old Egyptian Muslim girl named Sondos, cute 3D Pixar style character, wearing a modest pastel dress and a cute hijab (headscarf), friendly smile, expressive eyes, high quality 3D render, soft cinematic lighting, 8k resolution."

# --- Visual Style (Luxury / Unreal Engine 5) ---
# Appended to every image prompt
STYLE_SUFFIX = ", Unreal Engine 5 render, cinematic lighting, photorealistic 3D cartoon, 8k, vibrant colors, ray tracing, high detail."

# --- Audio Settings (Edge-TTS) ---
# Voices: ar-EG-ShakirNeural (Male), ar-EG-SalmaNeural (Female)
VOICE_MALE = "ar-EG-ShakirNeural"
VOICE_FEMALE = "ar-EG-SalmaNeural"

# Tuning: Energetic and younger
VOICE_PITCH = "+2Hz"
VOICE_RATE = "+10%"

# --- Video Settings ---
VIDEO_WIDTH = 1080
VIDEO_HEIGHT = 1920  # 9:16 Vertical for TikTok/Reels/Shorts
FPS = 30

# --- Caption Settings ---
FONT_FILENAME = "Cairo-Bold.ttf"
FONT_PATH = os.path.join(FONTS_DIR, FONT_FILENAME)
FONT_SIZE = 70
CAPTION_COLOR = "#FFD700"  # Gold/Yellow
CAPTION_STROKE_COLOR = "black"
CAPTION_STROKE_WIDTH = 4

# --- Content Topics ---
TOPICS = [
    "Honesty (Al-Sidq)",
    "Respecting Parents (Birr al-Walidayn)",
    "Kindness to Animals",
    "The Importance of Prayer",
    "Sharing with Others",
    "Patience (Sabr)",
    "Helping the Poor"
]
