from fuzzywuzzy import fuzz
import re

def normalize_title(title):
    """Normalize title for comparison."""
    if not title: return ""
    # Remove punctuation and extra spaces
    title = re.sub(r'[^\w\s]', '', title.lower())
    # Remove common prefixes (Arabic & English)
    title = re.sub(r'^(فيلم|مسلسل|the|a|an)\s+', '', title)
    return title.strip()

def is_duplicate(new_title, existing_titles, threshold=85):
    """Check if title is duplicate based on similarity score."""
    new_norm = normalize_title(new_title)
    
    for existing in existing_titles:
        existing_norm = normalize_title(existing)
        similarity = fuzz.ratio(new_norm, existing_norm)
        if similarity > threshold:
            return True, existing, similarity
    
    return False, None, 0

if __name__ == "__main__":
    # Test
    existing = ["The Dark Knight", "Dark Knight Rises", "Interstellar", "Inception"]
    new = "Dark Knight"
    is_dup, match, score = is_duplicate(new, existing)
    print(f"Duplicate? {is_dup}, Match: {match}, Score: {score}%")
    
    new_ar = "فيلم الجوكر"
    existing_ar = ["الجوكر", "باتمان"]
    is_dup, match, score = is_duplicate(new_ar, existing_ar)
    print(f"Duplicate (Ar)? {is_dup}, Match: {match}, Score: {score}%")
