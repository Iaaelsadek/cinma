import edge_tts
import asyncio
import os
import shutil
from config import VOICE_MALE, VOICE_FEMALE, VOICE_PITCH, VOICE_RATE, TEMP_DIR

class AudioGenerator:
    def __init__(self):
        self.voice_male = VOICE_MALE
        self.voice_female = VOICE_FEMALE
        self.pitch = VOICE_PITCH
        self.rate = VOICE_RATE
        self.output_dir = TEMP_DIR

    async def generate_audio(self, text, output_filename, gender="male"):
        # Select voice based on gender
        voice = self.voice_male if gender == "male" else self.voice_female
        
        output_path = os.path.join(self.output_dir, output_filename)
        
        print(f"Generating audio: {output_filename} ({voice} | {self.pitch} | {self.rate})")
        
        try:
            # Create Communicate object
            communicate = edge_tts.Communicate(text, voice, pitch=self.pitch, rate=self.rate)
            
            # Save directly
            await communicate.save(output_path)
            
            # Verify
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                 return output_path
            
            print(f"Audio file created but empty: {output_path}")
            return None
                 
        except Exception as e:
            print(f"Error generating audio for '{text[:20]}...': {e}")
            return None

    def run_sync(self, text, output_filename, gender="male"):
        # Create a new event loop for this sync call if needed
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        return loop.run_until_complete(self.generate_audio(text, output_filename, gender))

if __name__ == "__main__":
    # Test script
    generator = AudioGenerator()
    text = "تجربة الصوت للغة العربية"
    filename = "test_audio.mp3"
    
    # Run in an async context
    async def test():
        path = await generator.generate_audio(text, filename, "male")
        print(f"Audio saved at: {path}")
        
    asyncio.run(test())
