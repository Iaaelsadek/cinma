import os
import sys
import json
import asyncio
import platform
from script_gen import ScriptGenerator
from audio_gen import AudioGenerator
from image_gen import ImageGenerator
from video_gen import create_video
from config import TEMP_DIR, OUTPUT_DIR

# Fix for Windows Asyncio Loop Issue
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    print("=== Cinema Online Automation Engine (Luxury Edition - Standalone) ===")
    
    # 1. Topic Selection
    # Support command line args for automation
    if len(sys.argv) > 1:
        topic = " ".join(sys.argv[1:])
        print(f"Topic received from arguments: {topic}")
    else:
        topic = input("Enter a topic (or press Enter for random): ").strip()
        
    if not topic:
        topic = None
        
    # 2. Script Generation
    print("\n--- Step 1: Generating Viral Script ---")
    script_gen = ScriptGenerator()
    script = script_gen.generate_script(topic)
    
    if not script:
        print("Failed to generate script. Exiting.")
        return

    print(f"Title: {script.get('title', 'Untitled')}")
    print(f"Topic: {script.get('topic', 'Unknown')}")
    
    # Save script to log
    log_path = os.path.join(OUTPUT_DIR, f"script_log_{int(asyncio.get_event_loop().time())}.json")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(script, f, indent=2, ensure_ascii=False)

    # 3. Audio & Image Generation (Parallel Processing could be added here, but keeping linear for simplicity/stability)
    print("\n--- Step 2 & 3: Generating Luxury Assets ---")
    audio_gen = AudioGenerator()
    image_gen = ImageGenerator()
    
    scenes = script.get('scenes', [])
    processed_scenes = []
    audio_files = []
    
    for i, scene in enumerate(scenes):
        print(f"\nProcessing Scene {i+1}/{len(scenes)}...")
        
        narration = scene.get('narration', '')
        image_prompt = scene.get('image_prompt', '')
        
        # Audio Generation
        audio_filename = f"scene_{i}.mp3"
        
        # Heuristic for voice switching (Experimental)
        gender = "male"
        if "Sondos:" in narration or "سندس:" in narration:
             gender = "female"
             narration = narration.replace("Sondos:", "").replace("سندس:", "").strip()
        elif "Omar:" in narration or "عمر:" in narration:
             gender = "male"
             narration = narration.replace("Omar:", "").replace("عمر:", "").strip()
        
        audio_path = await audio_gen.generate_audio(narration, audio_filename, gender)
        
        if not audio_path:
             print(f"Skipping scene {i+1} due to audio failure.")
             continue

        audio_files.append(audio_path)
        
        # Image Generation
        image_filename = f"scene_{i}.png"
        include_omar = "Omar" in image_prompt
        include_sondos = "Sondos" in image_prompt
        
        image_path = image_gen.generate_image(image_prompt, image_filename, include_omar, include_sondos)
        
        if image_path:
            processed_scenes.append({
                "image_path": image_path,
                "narration": narration, # Use cleaned narration
                "audio_path": audio_path
            })
        else:
            print(f"Skipping scene {i+1} due to image generation failure.")
            # If image fails, we remove this scene from the final cut to avoid desync
            if audio_files:
                audio_files.pop() 
            
    # 4. Video Assembly
    print("\n--- Step 4: Assembling Luxury Video ---")
    if processed_scenes:
        safe_title = "".join([c for c in script.get('title', 'video') if c.isalpha() or c.isdigit() or c==' ']).rstrip()
        output_filename = f"{safe_title.replace(' ', '_')}.mp4"
        
        try:
            video_path = create_video(processed_scenes, audio_files, output_filename)
            print(f"\nSUCCESS! Video generated at: {video_path}")
        except Exception as e:
            print(f"Error during video assembly: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("No scenes were successfully processed.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
    except Exception as e:
        import traceback
        traceback.print_exc()
