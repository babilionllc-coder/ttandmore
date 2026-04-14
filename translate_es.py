import os
import time
import requests

API_KEY = "AIzaSyB_CszR-J3w34CWsTdjBhz-tFV8d3r06-o"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={API_KEY}"

def translate_html(html_content):
    prompt = """
    You are an expert web translator. 
    Translate the following HTML content from English into professional Mexican Spanish.
    CRITICAL RULES:
    1. KEEP ALL HTML TAGS, structure, IDs, classes, and links EXACTLY as they are. Do not remove or change any code.
    2. Translate ONLY the user-facing text inside the tags (paragraphs, headings, buttons, alt text, meta descriptions, titles).
    3. Output ONLY the raw HTML code starting with <!DOCTYPE html>. Do NOT wrap your output in markdown ```html codeblocks. Give me absolute raw HTML string. No commentary.
    4. Do NOT translate brand names like "TT & More" or URL slugs.
    """
    
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"text": html_content}
            ]
        }],
        "generationConfig": {
            "temperature": 0.1
        }
    }
    
    try:
        response = requests.post(URL, json=payload)
        data = response.json()
        if 'candidates' in data and len(data['candidates']) > 0:
            translated = data['candidates'][0]['content']['parts'][0]['text']
            # Strip markdown if Gemini accidentally adds it
            if translated.startswith("```html"):
                translated = translated.replace("```html", "", 1)
            if translated.endswith("```\n"):
                translated = translated[:-4]
            elif translated.endswith("```"):
                translated = translated[:-3]
            return translated.strip()
        else:
            print("Error in Gemini response:", data)
            return None
    except Exception as e:
        print("API Exception:", e)
        return None

def main():
    skip_files = ['./es/index.html']
    directory = './es'
    
    html_files = []
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root.split(os.sep) or 'dist' in root.split(os.sep): 
            continue
            
        for f in files:
            if f.endswith('.html'):
                fpath = os.path.join(root, f)
                if fpath not in skip_files:
                    html_files.append(fpath)
                
    print(f"Found {len(html_files)} files to translate.")
    
    for fpath in html_files:
        print(f"Translating {fpath}...")
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        translated_html = translate_html(content)
        
        if translated_html and "<html" in translated_html:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(translated_html)
            print(f"Success -> {fpath}")
        else:
            print(f"Failed -> {fpath}")
            
        time.sleep(4)

if __name__ == "__main__":
    main()
