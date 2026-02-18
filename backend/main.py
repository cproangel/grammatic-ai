from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import re
import json
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from openai import OpenAI
from docx import Document
from translit import cyrToLat, latToCyr
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

# Load environment variables
load_dotenv()

# Load Uzbek orthography rules from imlo.docx
IMLO_RULES = ""
_imlo_candidates = [
    Path(__file__).parent / "imlo.docx",
    Path(__file__).parent.parent / "imlo.docx",
]
_imlo_path = next((p for p in _imlo_candidates if p.exists()), None)
if _imlo_path:
    try:
        _doc = Document(str(_imlo_path))
        IMLO_RULES = "\n".join(p.text for p in _doc.paragraphs if p.text.strip())
        print(f"[INFO] Loaded imlo.docx orthography rules ({len(IMLO_RULES)} chars) from {_imlo_path}")
    except Exception as e:
        print(f"[WARN] Failed to load imlo.docx: {e}")
else:
    print(f"[WARN] imlo.docx not found")

# Initialize FastAPI
app = FastAPI(
    title="Grammatic API",
    description="Translation and Grammar API for Uzbek-Russian languages",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration — read models from .env
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PRIMARY_MODEL = os.getenv("PRIMARY_MODEL", "gemini")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GPT_MODEL = os.getenv("GPT_MODEL", "gpt-4o")

print(f"[CONFIG] PRIMARY_MODEL={PRIMARY_MODEL}, GEMINI_MODEL={GEMINI_MODEL}, GPT_MODEL={GPT_MODEL}")

# Runtime state for model selection
current_model = PRIMARY_MODEL

# Initialize AI clients
if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel(GEMINI_MODEL)
    print(f"[INFO] Gemini configured with model: {GEMINI_MODEL}")
else:
    gemini_model = None
    print("[WARN] Gemini API not configured")

if OPENAI_API_KEY and OPENAI_API_KEY != "your_gpt_api_key_here":
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    print(f"[INFO] OpenAI configured with model: {GPT_MODEL}")
else:
    openai_client = None
    print("[WARN] OpenAI API not configured")


# Request/Response Models
class TranslateRequest(BaseModel):
    text: str
    source_lang: str  # 'ru' or 'uz'
    target_lang: str  # 'ru' or 'uz'


class TranslateResponse(BaseModel):
    translated_text: str
    source_lang: str
    target_lang: str


class GrammarError(BaseModel):
    word: Optional[str] = None
    message: str
    suggestion: Optional[str] = None
    offset: Optional[int] = None
    length: Optional[int] = None


class GrammarCheckRequest(BaseModel):
    text: str
    language: str  # 'ru' or 'uz'


class GrammarCheckResponse(BaseModel):
    errors: List[GrammarError]
    corrected_text: str
    error_count: int


class TranslitRequest(BaseModel):
    text: str
    direction: str  # 'cyr-to-lat' or 'lat-to-cyr'


class TranslitResponse(BaseModel):
    result: str
    direction: str


class TranslateWithGrammarResponse(BaseModel):
    translated_text: str
    corrected_text: str
    source_lang: str
    target_lang: str
    grammar_errors: List[GrammarError]
    error_count: int


# AI Helper Functions
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((
        httpx.TimeoutException,
        httpx.ConnectError,
        google_exceptions.ResourceExhausted,
        google_exceptions.ServiceUnavailable,
        google_exceptions.InternalServerError,
        google_exceptions.DeadlineExceeded,
    )),
    reraise=True
)
async def call_gemini(prompt: str, system_prompt: str = "") -> str:
    """Call Gemini API with retry logic"""
    if not gemini_model:
        raise HTTPException(status_code=500, detail="Gemini API not configured")
    
    try:
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = gemini_model.generate_content(full_prompt)
        return response.text
    except (google_exceptions.ResourceExhausted, 
            google_exceptions.ServiceUnavailable, 
            google_exceptions.InternalServerError,
            google_exceptions.DeadlineExceeded,
            httpx.TimeoutException,
            httpx.ConnectError):
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")


async def call_gpt(prompt: str, system_prompt: str = "") -> str:
    """Call GPT API with fallback models"""
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI API not configured")
    
    system_content = "You are a professional translator and grammar expert for Uzbek and Russian languages."
    if system_prompt:
        system_content += "\n\n" + system_prompt

    models_to_try = [GPT_MODEL, "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
    
    last_error = None
    for model in models_to_try:
        try:
            response = openai_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content
        except Exception as e:
            last_error = e
            continue
    
    raise HTTPException(status_code=500, detail=f"GPT error: {str(last_error)}")


async def call_ai(prompt: str, system_prompt: str = "") -> str:
    """Call AI with fallback based on current_model selection"""
    global current_model
    
    print(f"[AI] Requested model: {current_model}")
    
    if current_model == "gemini" and gemini_model:
        try:
            print(f"[AI] Using GEMINI (model: {GEMINI_MODEL})")
            return await call_gemini(prompt, system_prompt)
        except Exception as e:
            print(f"[AI] Gemini failed: {e}, falling back to GPT")
            if openai_client:
                return await call_gpt(prompt, system_prompt)
            raise
    elif current_model == "gpt" and openai_client:
        try:
            print(f"[AI] Using GPT (model: {GPT_MODEL})")
            return await call_gpt(prompt, system_prompt)
        except Exception as e:
            print(f"[AI] GPT failed: {e}, falling back to Gemini")
            if gemini_model:
                return await call_gemini(prompt, system_prompt)
            raise
    elif gemini_model:
        print(f"[AI] Fallback to GEMINI")
        return await call_gemini(prompt, system_prompt)
    elif openai_client:
        print(f"[AI] Fallback to GPT")
        return await call_gpt(prompt, system_prompt)
    else:
        raise HTTPException(status_code=500, detail="No AI model configured. Please add API keys to .env file.")


def compute_offsets(text: str, errors: list) -> list:
    """Compute accurate offset and length for each error by finding the word in the text.
    Handles multiple occurrences by tracking already-matched positions."""
    used_positions = set()
    result = []
    
    for error in errors:
        word = error.get("word", "")
        if not word:
            result.append(error)
            continue
        
        # Find all occurrences of the word in the text
        search_start = 0
        found = False
        while search_start < len(text):
            idx = text.find(word, search_start)
            if idx == -1:
                # Try case-insensitive search
                idx = text.lower().find(word.lower(), search_start)
                if idx == -1:
                    break
                # Use the actual text at that position
                word = text[idx:idx + len(word)]
            
            if idx not in used_positions:
                error["offset"] = idx
                error["length"] = len(word)
                used_positions.add(idx)
                found = True
                break
            search_start = idx + 1
        
        if not found:
            # Could not find word — set offset to -1 so frontend can handle gracefully
            error["offset"] = -1
            error["length"] = len(word)
        
        result.append(error)
    
    return result


def get_uzbek_system_ctx(mode: str = "check") -> str:
    """Get standardized system context for Uzbek language operations"""
    ctx = (
        "You MUST follow the official Uzbek orthography rules. "
        "Pay special attention to commonly confused letters:\n"
        "- 'h' vs 'x': h=bo'g'iz undoshi (hujjat, hudud, hamma, bahor), "
        "x=chuqur til orqa undoshi (xabar, xo'roz, baxt, xo'jalik)\n"
        "- Correct: mahalla, hujjat, hudud, loyiha, zaxira, xo'jalik, xodim\n"
        "- Wrong: maxalla, xujjat, xudud, loyixa, zahira, ho'jalik, hodim\n\n"
    )
    if IMLO_RULES:
        ctx += f"=== O'ZBEK TILI IMLO QOIDALARI ===\n{IMLO_RULES}"
    return ctx


# API Endpoints
@app.get("/")
async def root():
    return {
        "message": "Grammatic API",
        "version": "2.0.0",
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "gemini_configured": gemini_model is not None,
        "gpt_configured": openai_client is not None,
        "gemini_model": GEMINI_MODEL,
        "gpt_model": GPT_MODEL,
        "primary_model": PRIMARY_MODEL,
        "current_model": current_model
    }


class ModelToggleRequest(BaseModel):
    model: str  # 'gemini' or 'gpt'


@app.post("/api/model/toggle")
async def toggle_model(request: ModelToggleRequest):
    """Toggle between Gemini and GPT models"""
    global current_model
    
    if request.model not in ["gemini", "gpt"]:
        raise HTTPException(status_code=400, detail="Invalid model. Use 'gemini' or 'gpt'")
    
    if request.model == "gemini" and not gemini_model:
        raise HTTPException(status_code=400, detail="Gemini API is not configured")
    if request.model == "gpt" and not openai_client:
        raise HTTPException(status_code=400, detail="OpenAI API is not configured")
    
    current_model = request.model
    return {
        "success": True,
        "current_model": current_model,
        "message": f"Switched to {current_model.upper()}"
    }


@app.get("/api/model/current")
async def get_current_model():
    """Get the currently selected model"""
    return {
        "current_model": current_model,
        "gemini_available": gemini_model is not None,
        "gpt_available": openai_client is not None
    }


@app.post("/api/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest):
    """Translate text between Russian and Uzbek"""
    
    lang_names = {"ru": "Russian", "uz": "Uzbek"}
    source_name = lang_names.get(request.source_lang, request.source_lang)
    target_name = lang_names.get(request.target_lang, request.target_lang)
    
    script_instruction = ""
    if request.target_lang == "uz":
        script_instruction = (
            "\nIMPORTANT: The Uzbek translation MUST be written strictly in Latin script (lotin yozuvi), "
            "NOT in Cyrillic. Use the official Uzbek Latin alphabet with characters like "
            "o', g', sh, ch, etc. Never use Cyrillic letters in the output."
        )

    prompt = f"""Translate the following text from {source_name} to {target_name}.
Provide ONLY the translation, no explanations or additional text.
Keep the same style and tone. If there are idioms, translate them to equivalent expressions.{script_instruction}

Text to translate:
{request.text}

Translation:"""

    system_ctx = ""
    if request.target_lang == "uz":
        system_ctx = (
            "CRITICAL: All Uzbek output MUST be in Latin script (lotin yozuvi), NEVER in Cyrillic. "
            "Use the official Uzbek Latin alphabet.\n\n"
        )
        system_ctx += get_uzbek_system_ctx()
    elif request.source_lang == "uz":
        system_ctx = get_uzbek_system_ctx()

    translated = await call_ai(prompt, system_ctx)
    
    return TranslateResponse(
        translated_text=translated.strip(),
        source_lang=request.source_lang,
        target_lang=request.target_lang
    )


@app.post("/api/grammar/check", response_model=GrammarCheckResponse)
async def check_grammar(request: GrammarCheckRequest):
    """Check grammar and spelling errors with accurate highlighting"""
    
    lang_name = "Uzbek" if request.language == "uz" else "Russian"
    response_lang = "o'zbek tilida" if request.language == "uz" else "на русском языке"
    
    prompt = f"""Analyze the following {lang_name} text for REAL errors only.

Text to check:
\"\"\"{request.text}\"\"\"

STRICT RULES:
- ONLY report ACTUAL spelling, grammar, or punctuation errors
- Do NOT suggest style changes
- Do NOT invent errors that don't exist  
- If text is correct, return empty errors array
- The "word" field MUST be the EXACT substring from the original text (copy-paste it exactly)
- Do NOT paraphrase or modify the error word — it must match the original text character by character

All messages MUST be in {lang_name} ({response_lang}).

Respond in this exact JSON format:
{{
    "errors": [
        {{"word": "exact_wrong_word_from_text", "message": "explanation of error", "suggestion": "correct_version"}}
    ],
    "corrected_text": "full corrected text"
}}

If NO errors found: {{"errors": [], "corrected_text": "original text unchanged"}}"""

    system_ctx = ""
    if request.language == "uz":
        system_ctx = get_uzbek_system_ctx("check")

    try:
        result = await call_ai(prompt, system_ctx)
        
        # Clean up JSON response
        result = result.strip()
        if result.startswith("```json"):
            result = result[7:]
        if result.startswith("```"):
            result = result[3:]
        if result.endswith("```"):
            result = result[:-3]
        result = result.strip()
        
        data = json.loads(result)
        
        raw_errors = data.get("errors", [])
        corrected = data.get("corrected_text", request.text)
        
        # Compute accurate offsets on the server side
        raw_errors = compute_offsets(request.text, raw_errors)
        
        # Deduplicate errors (same word at same position)
        seen = set()
        unique_errors = []
        for e in raw_errors:
            key = (e.get("word", ""), e.get("offset", -1))
            if key not in seen:
                seen.add(key)
                unique_errors.append(e)
        
        errors = [GrammarError(**e) for e in unique_errors]
        
        return GrammarCheckResponse(
            errors=errors,
            corrected_text=corrected,
            error_count=len(errors)
        )
    except json.JSONDecodeError:
        return GrammarCheckResponse(
            errors=[],
            corrected_text=request.text,
            error_count=0
        )


@app.post("/api/grammar/fix")
async def fix_grammar(request: GrammarCheckRequest):
    """Fix all grammar errors and return corrected text"""
    
    lang_name = "Uzbek" if request.language == "uz" else "Russian"
    
    prompt = f"""Fix all grammar and spelling errors in the following {lang_name} text.
Return ONLY the corrected text, no explanations.

Text: {request.text}

Corrected text:"""

    system_ctx = ""
    if request.language == "uz":
        system_ctx = get_uzbek_system_ctx("fix")

    corrected = await call_ai(prompt, system_ctx)
    
    return {"corrected_text": corrected.strip()}


@app.post("/api/translate-with-grammar", response_model=TranslateWithGrammarResponse)
async def translate_with_grammar(request: TranslateRequest):
    """Translate text and then run grammar check on the translation"""
    
    # Step 1: Translate
    translate_response = await translate(request)
    translated_text = translate_response.translated_text
    
    # Step 2: Grammar check on translated text
    grammar_request = GrammarCheckRequest(
        text=translated_text,
        language=request.target_lang
    )
    
    try:
        grammar_response = await check_grammar(grammar_request)
        corrected = grammar_response.corrected_text
        errors = grammar_response.errors
        error_count = grammar_response.error_count
    except Exception as e:
        print(f"[WARN] Grammar check after translation failed: {e}")
        corrected = translated_text
        errors = []
        error_count = 0
    
    return TranslateWithGrammarResponse(
        translated_text=translated_text,
        corrected_text=corrected,
        source_lang=request.source_lang,
        target_lang=request.target_lang,
        grammar_errors=errors,
        error_count=error_count
    )


@app.post("/api/transliterate", response_model=TranslitResponse)
async def transliterate(request: TranslitRequest):
    """Convert between Cyrillic and Latin Uzbek scripts"""
    
    if request.direction == "cyr-to-lat":
        result = cyrToLat(request.text)
    else:
        result = latToCyr(request.text)
    
    return TranslitResponse(
        result=result,
        direction=request.direction
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
