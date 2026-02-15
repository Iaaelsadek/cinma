
import requests
import json

url = "https://www.mp3quran.net/api/v3/reciters?language=ar"
try:
    resp = requests.get(url, timeout=10)
    data = resp.json()
    print(json.dumps(data, indent=2, ensure_ascii=False)[:500]) # Print first 500 chars
    if "reciters" in data:
        print("Reciters found:", len(data["reciters"]))
        if len(data["reciters"]) > 0:
            print("First reciter sample:", data["reciters"][0])
    else:
        print("No 'reciters' key found in response")
except Exception as e:
    print("Error fetching:", e)
