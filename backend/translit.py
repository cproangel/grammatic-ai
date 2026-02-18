"""
Uzbek Transliteration Module
Official conversion rules between Cyrillic and Latin scripts
"""

# Cyrillic to Latin mapping (official Uzbek rules)
CYRILLIC_TO_LATIN = {
    'А': 'A', 'а': 'a',
    'Б': 'B', 'б': 'b',
    'В': 'V', 'в': 'v',
    'Г': 'G', 'г': 'g',
    'Ғ': "G'", 'ғ': "g'",
    'Д': 'D', 'д': 'd',
    'Е': 'E', 'е': 'e',
    'Ё': 'Yo', 'ё': 'yo',
    'Ж': 'J', 'ж': 'j',
    'З': 'Z', 'з': 'z',
    'И': 'I', 'и': 'i',
    'Й': 'Y', 'й': 'y',
    'К': 'K', 'к': 'k',
    'Қ': 'Q', 'қ': 'q',
    'Л': 'L', 'л': 'l',
    'М': 'M', 'м': 'm',
    'Н': 'N', 'н': 'n',
    'О': 'O', 'о': 'o',
    'Ў': "O'", 'ў': "o'",
    'П': 'P', 'п': 'p',
    'Р': 'R', 'р': 'r',
    'С': 'S', 'с': 's',
    'Т': 'T', 'т': 't',
    'У': 'U', 'у': 'u',
    'Ф': 'F', 'ф': 'f',
    'Х': 'X', 'х': 'x',
    'Ҳ': 'H', 'ҳ': 'h',
    'Ц': 'Ts', 'ц': 'ts',
    'Ч': 'Ch', 'ч': 'ch',
    'Ш': 'Sh', 'ш': 'sh',
    'Щ': 'Sh', 'щ': 'sh',
    'Ъ': "'", 'ъ': "'",
    'Ы': 'I', 'ы': 'i',
    'Ь': '', 'ь': '',
    'Э': 'E', 'э': 'e',
    'Ю': 'Yu', 'ю': 'yu',
    'Я': 'Ya', 'я': 'ya'
}

# Latin to Cyrillic mapping (single characters)
LATIN_TO_CYRILLIC = {
    'A': 'А', 'a': 'а',
    'B': 'Б', 'b': 'б',
    'D': 'Д', 'd': 'д',
    'E': 'Е', 'e': 'е',
    'F': 'Ф', 'f': 'ф',
    'G': 'Г', 'g': 'г',
    'H': 'Ҳ', 'h': 'ҳ',
    'I': 'И', 'i': 'и',
    'J': 'Ж', 'j': 'ж',
    'K': 'К', 'k': 'к',
    'L': 'Л', 'l': 'л',
    'M': 'М', 'm': 'м',
    'N': 'Н', 'n': 'н',
    'O': 'О', 'o': 'о',
    'P': 'П', 'p': 'п',
    'Q': 'Қ', 'q': 'қ',
    'R': 'Р', 'r': 'р',
    'S': 'С', 's': 'с',
    'T': 'Т', 't': 'т',
    'U': 'У', 'u': 'у',
    'V': 'В', 'v': 'в',
    'X': 'Х', 'x': 'х',
    'Y': 'Й', 'y': 'й',
    'Z': 'З', 'z': 'з'
}

# Multi-character Latin to Cyrillic mappings
LATIN_MULTI_TO_CYRILLIC = {
    "G'": 'Ғ', "g'": 'ғ',
    "O'": 'Ў', "o'": 'ў',
    'Sh': 'Ш', 'sh': 'ш',
    'SH': 'Ш',
    'Ch': 'Ч', 'ch': 'ч',
    'CH': 'Ч',
    'Yo': 'Ё', 'yo': 'ё',
    'YO': 'Ё',
    'Yu': 'Ю', 'yu': 'ю',
    'YU': 'Ю',
    'Ya': 'Я', 'ya': 'я',
    'YA': 'Я',
    'Ts': 'Ц', 'ts': 'ц',
    'TS': 'Ц',
    "'": 'ъ',
    "ʻ": 'ъ',  # Modifier letter turned comma
    "'": 'ъ',  # Right single quotation mark
}


def cyrToLat(text: str) -> str:
    """
    Convert Cyrillic Uzbek text to Latin script.
    
    Args:
        text: Input text in Cyrillic script
        
    Returns:
        Text converted to Latin script
    """
    result = []
    
    for char in text:
        if char in CYRILLIC_TO_LATIN:
            result.append(CYRILLIC_TO_LATIN[char])
        else:
            result.append(char)
    
    return ''.join(result)


def latToCyr(text: str) -> str:
    """
    Convert Latin Uzbek text to Cyrillic script.
    
    Args:
        text: Input text in Latin script
        
    Returns:
        Text converted to Cyrillic script
    """
    result = []
    i = 0
    length = len(text)
    
    while i < length:
        found = False
        
        # Check for multi-character sequences (longest match first)
        for seq_len in range(3, 0, -1):
            if i + seq_len <= length:
                substr = text[i:i + seq_len]
                if substr in LATIN_MULTI_TO_CYRILLIC:
                    result.append(LATIN_MULTI_TO_CYRILLIC[substr])
                    i += seq_len
                    found = True
                    break
        
        if not found:
            char = text[i]
            if char in LATIN_TO_CYRILLIC:
                result.append(LATIN_TO_CYRILLIC[char])
            else:
                result.append(char)
            i += 1
    
    return ''.join(result)


# Test function
if __name__ == "__main__":
    # Test Cyrillic to Latin
    test_cyr = "Ўзбекистон Республикаси"
    print(f"Cyrillic: {test_cyr}")
    print(f"Latin: {cyrToLat(test_cyr)}")
    
    # Test Latin to Cyrillic
    test_lat = "O'zbekiston Respublikasi"
    print(f"\nLatin: {test_lat}")
    print(f"Cyrillic: {latToCyr(test_lat)}")
    
    # Test special characters
    print("\n--- Special characters test ---")
    tests = [
        ("Ғафур", "G'afur"),
        ("Қишлоқ", "Qishloq"),
        ("Ўзбек", "O'zbek"),
        ("Шаҳар", "Shahar"),
        ("Чорак", "Chorak"),
    ]
    
    for cyr, expected_lat in tests:
        result = cyrToLat(cyr)
        status = "✓" if result == expected_lat else "✗"
        print(f"{status} {cyr} → {result} (expected: {expected_lat})")
