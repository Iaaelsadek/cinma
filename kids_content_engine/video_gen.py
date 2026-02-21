import os
import requests
# Updated imports for moviepy v2.0+
from moviepy import *
from moviepy.video.fx.Crop import Crop
from moviepy.video.fx.Resize import Resize
import arabic_reshaper
from bidi.algorithm import get_display
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from config import OUTPUT_DIR, FONT_PATH, VIDEO_WIDTH, VIDEO_HEIGHT, FPS, CAPTION_COLOR, CAPTION_STROKE_COLOR, CAPTION_STROKE_WIDTH

def download_font():
    if not os.path.exists(FONT_PATH):
        print("Downloading font...")
        # Using a reliable raw link for Cairo Bold
        url = "https://github.com/google/fonts/raw/main/ofl/cairo/Cairo-Bold.ttf"
        try:
            response = requests.get(url, timeout=10)
            with open(FONT_PATH, 'wb') as f:
                f.write(response.content)
            print("Font downloaded.")
        except Exception as e:
            print(f"Error downloading font: {e}")
            # Ensure we have a fallback or handle this gracefully

def process_arabic_text(text):
    reshaped_text = arabic_reshaper.reshape(text)
    bidi_text = get_display(reshaped_text)
    return bidi_text

def create_text_clip(text, duration):
    # Create text image using Pillow for better Arabic support
    font_size = 70
    try:
        font = ImageFont.truetype(FONT_PATH, font_size)
    except IOError:
        print("Font not found, using default.")
        font = ImageFont.load_default()
    
    # Calculate text size
    dummy_img = Image.new('RGB', (1, 1))
    draw = ImageDraw.Draw(dummy_img)
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    # Create image with transparent background
    # Ensure canvas is wide enough for the text
    img_width = max(int(VIDEO_WIDTH * 0.9), text_width + 20)
    img_height = int(text_height * 2.5) # Extra space for stroke and padding
    img = Image.new('RGBA', (img_width, img_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw text centered
    x = (img_width - text_width) // 2
    y = (img_height - text_height) // 2
    
    # Draw stroke (outline) - Heavy Black Stroke
    stroke_width = CAPTION_STROKE_WIDTH
    for adj in range(-stroke_width, stroke_width+1):
        for opp in range(-stroke_width, stroke_width+1):
            draw.text((x+adj, y+opp), text, font=font, fill=CAPTION_STROKE_COLOR)
            
    # Draw Fill - Yellow/Gold
    draw.text((x, y), text, font=font, fill=CAPTION_COLOR)
    
    # Convert to numpy array for MoviePy
    txt_clip = ImageClip(np.array(img))
    txt_clip = txt_clip.with_duration(duration)
    # Position: Bottom center, slightly up
    txt_clip = txt_clip.with_position(('center', 0.8), relative=True)
    
    return txt_clip

def ken_burns_effect(clip, zoom_ratio=1.1):
    # Slow zoom in
    return clip.with_effects([Resize(lambda t: 1 + (zoom_ratio - 1) * t / clip.duration)])

def create_video(scenes, audio_files, output_filename="final_video.mp4"):
    download_font()
    
    clips = []
    
    for i, scene in enumerate(scenes):
        image_path = scene['image_path']
        audio_path = audio_files[i]
        text = process_arabic_text(scene['narration'])
        
        # Audio Clip
        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration + 0.2 # Small buffer
        
        # Image Clip
        img_clip = ImageClip(image_path).with_duration(duration)
        
        # 1. Crop/Resize to Fill 9:16 Screen
        w, h = img_clip.size
        target_ratio = VIDEO_WIDTH / VIDEO_HEIGHT
        
        # Resize to cover height first
        if w / h < target_ratio:
             # Image is taller/narrower than target -> resize width to match
             # Note: MoviePy v2 uses different resize syntax, sticking to basic Resize class or method if available
             # But simplest is usually just resizing by width or height
             img_clip = img_clip.with_effects([Resize(width=VIDEO_WIDTH)])
        else:
            # Image is wider -> resize height to match
            img_clip = img_clip.with_effects([Resize(height=VIDEO_HEIGHT)])
            
        # Center Crop to exact 1080x1920
        # img_clip = img_clip.crop(x_center=img_clip.w/2, y_center=img_clip.h/2, width=VIDEO_WIDTH, height=VIDEO_HEIGHT)
        img_clip = img_clip.with_effects([Crop(width=VIDEO_WIDTH, height=VIDEO_HEIGHT, x_center=img_clip.w/2, y_center=img_clip.h/2)])

        # 2. Apply Ken Burns (Zoom)
        # Note: Dynamic resize in v2 might be tricky, sticking to static if dynamic fails, but let's try the effect wrapper
        # img_clip = ken_burns_effect(img_clip, zoom_ratio=1.05) # Subtle zoom - disabled for stability in v2 migration unless sure
        
        # 3. Text Overlay
        txt_clip = create_text_clip(text, duration)
        
        # Composite
        video_clip = CompositeVideoClip([img_clip, txt_clip]).with_audio(audio_clip)
        clips.append(video_clip)
        
    # Concatenate all clips
    final_clip = concatenate_videoclips(clips, method="compose")
    
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    print(f"Rendering video to {output_path}...")
    final_clip.write_videofile(
        output_path, 
        fps=FPS, 
        codec="libx264", 
        audio_codec="aac",
        threads=4,
        preset="medium" # Balance speed/quality
    )
    
    return output_path

if __name__ == "__main__":
    # Test stub
    pass
