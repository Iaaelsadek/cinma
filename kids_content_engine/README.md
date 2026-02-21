# Omar & Sondos Automation Engine (Standalone)

This is a **strictly standalone** project for generating high-quality Islamic and educational videos for children featuring **Omar & Sondos**.

**IMPORTANT:** This project is completely isolated from the "Cinema Online" platform. It shares NO databases, NO API keys, and NO configuration files. It uses exclusively free, open-source AI tools.

## Project Structure
This project is self-contained and manages its own dependencies and configuration.

## Features
- **Script Generation**: Uses `g4f` (GPT4Free) to create engaging stories with moral lessons.
- **Audio Synthesis**: Uses `edge-tts` for high-quality Arabic narration.
- **Visual Generation**: Uses `pollinations.ai` for character-consistent 3D Pixar-style images.
- **Video Assembly**: Uses `moviepy` to combine assets with Ken Burns effect and subtitles.
- **Zero Cost**: All tools used are free or have generous free tiers.

## Prerequisites
- Python 3.8+
- Internet connection (for API calls)

## Installation
1.  Navigate to the directory:
    ```bash
    cd kids_content_engine
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## Configuration
Edit `config.py` to customize:
- Character names and descriptions (Omar, Sondos).
- Voice settings (Male/Female).
- Video resolution and style.

## Usage
Run the main script:
```bash
python main.py
```
Follow the prompts to enter a topic (e.g., "Honesty", "Prayer").

## License
MIT
