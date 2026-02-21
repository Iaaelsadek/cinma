import os
import requests
import time
import urllib.parse
from config import TEMP_DIR, STYLE_SUFFIX, OMAR_PROMPT, SONDOS_PROMPT

class ImageGenerator:
    def __init__(self):
        self.base_url = "https://image.pollinations.ai/prompt/"
        self.output_dir = TEMP_DIR
        self.style_suffix = STYLE_SUFFIX
        self.omar = OMAR_PROMPT
        self.sondos = SONDOS_PROMPT

    def generate_image(self, prompt, filename, include_omar=False, include_sondos=False, retries=3):
        # 1. Construct the full prompt
        full_prompt = prompt
        
        # Add character details (Simplified)
        if include_omar:
            full_prompt = f"Cute 5yo Egyptian boy Omar, blue shirt. {full_prompt}"
        if include_sondos:
            full_prompt = f"Cute 7yo Egyptian girl Sondos, hijab. {full_prompt}"
            
        # Add style (Simplified)
        full_prompt += " 3D Pixar style."
            
        # 2. Encode prompt
        # Use requests to handle encoding implicitly by passing correct URL
        # But we need to be careful with spaces in the path.
        # Let's try encoding just the prompt part.
        encoded_prompt = urllib.parse.quote(full_prompt)
        
        url = f"{self.base_url}{encoded_prompt}"
        output_path = os.path.join(self.output_dir, filename)
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        for attempt in range(retries):
            print(f"Generating image (Attempt {attempt+1}/{retries}): {filename}")
            try:
                # Try different models or params
                # Adding model=flux might help
                final_url = f"{url}?nologo=true&seed={int(time.time()) + attempt}&model=flux&width=1080&height=1920"
                
                response = requests.get(final_url, headers=headers, stream=True, timeout=60)
                
                if response.status_code == 200:
                    with open(output_path, 'wb') as f:
                        for chunk in response.iter_content(1024):
                            f.write(chunk)
                    if os.path.getsize(output_path) > 1000:
                        return output_path
                else:
                    print(f"Error: Status Code {response.status_code}")
                    
            except Exception as e:
                print(f"Exception during image generation: {e}")
            
            time.sleep(2) # Wait before retry
            
        print(f"Failed to generate image after {retries} attempts. Using fallback placeholder.")
        return self._create_placeholder_image(filename, prompt)

    def _create_placeholder_image(self, filename, text):
        # Create a simple colored image with text using PIL if API fails
        from PIL import Image, ImageDraw, ImageFont
        
        output_path = os.path.join(self.output_dir, filename)
        img = Image.new('RGB', (1080, 1920), color = (73, 109, 137))
        
        d = ImageDraw.Draw(img)
        # Try to use default font or load one
        try:
            # Load large font
            font = ImageFont.load_default()
        except:
            pass
            
        d.text((50,900), f"Scene Image Placeholder\n{text[:50]}...", fill=(255,255,0))
        
        img.save(output_path)
        print(f"Created placeholder image: {output_path}")
        return output_path

if __name__ == "__main__":
    generator = ImageGenerator()
    prompt = "looking at a broken vase on the floor, guilty expression"
    path = generator.generate_image(prompt, "test_luxury_image.png", include_omar=True)
    if path:
        print(f"Image saved at: {path}")
