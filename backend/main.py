from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import re
import json
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types
from google.genai import errors as genai_errors
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

# CORS — comma-separated list of origins, or "*" for any
_origins = os.getenv("ALLOWED_ORIGINS", "*").strip()
allowed_origins = ["*"] if _origins == "*" else [o.strip() for o in _origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://([a-z0-9-]+--)?[a-z0-9-]+\.netlify\.app",
    allow_credentials=False if allowed_origins == ["*"] else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Default ("flash") tier — fast, cheap, used for most requests.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
# Premium ("pro") tier — slower, ~4x more expensive, noticeably better
# at low-resource language grammar (Uzbek morphology, Cyrillic↔Latin).
# Optional: if not set, the request silently falls back to GEMINI_MODEL.
GEMINI_MODEL_PRO = os.getenv("GEMINI_MODEL_PRO", "gemini-3.1-pro-preview")

# Vertex AI mode (service account JSON)
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT_ID")
GOOGLE_CLOUD_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
GOOGLE_CREDENTIALS_JSON = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

print(f"[CONFIG] GEMINI_MODEL={GEMINI_MODEL}")


def _init_gemini_client():
    """Initialize Gemini client. Prefers Vertex AI (service account) if configured,
    falls back to Gemini Developer API (simple API key)."""
    # Vertex AI mode: service account JSON passed via env var
    if GOOGLE_CREDENTIALS_JSON and GOOGLE_CLOUD_PROJECT:
        try:
            import json as _json
            import tempfile
            from google.oauth2 import service_account

            sa_info = _json.loads(GOOGLE_CREDENTIALS_JSON)
            creds = service_account.Credentials.from_service_account_info(
                sa_info,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
            client = genai.Client(
                vertexai=True,
                project=GOOGLE_CLOUD_PROJECT,
                location=GOOGLE_CLOUD_LOCATION,
                credentials=creds,
            )
            print(f"[INFO] Gemini (Vertex AI) configured — project={GOOGLE_CLOUD_PROJECT}, location={GOOGLE_CLOUD_LOCATION}, model={GEMINI_MODEL}")
            return client
        except Exception as e:
            print(f"[WARN] Vertex AI init failed: {e}")
            # fall through to API key mode

    # Developer API mode: simple API key
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        print(f"[INFO] Gemini (Developer API) configured with model: {GEMINI_MODEL}")
        return genai.Client(api_key=GEMINI_API_KEY)

    print("[WARN] Gemini not configured — set GOOGLE_APPLICATION_CREDENTIALS_JSON + GOOGLE_CLOUD_PROJECT or GEMINI_API_KEY")
    return None


gemini_client = _init_gemini_client()


# Request/Response Models
class TranslateRequest(BaseModel):
    text: str
    source_lang: str  # 'ru' or 'uz'
    target_lang: str  # 'ru' or 'uz'
    tier: Optional[str] = "flash"  # 'flash' or 'pro'


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
    tier: Optional[str] = "flash"  # 'flash' or 'pro'


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


def _is_retryable_gemini_error(exc: BaseException) -> bool:
    """Retry on transient network + server errors + rate limits."""
    if isinstance(exc, (httpx.TimeoutException, httpx.ConnectError)):
        return True
    if isinstance(exc, genai_errors.ServerError):
        return True
    if isinstance(exc, genai_errors.ClientError):
        return getattr(exc, "code", None) == 429
    return False


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError, genai_errors.ServerError, genai_errors.ClientError)),
    reraise=True,
)
def _build_gen_config(system_prompt: str, model_id: str):
    """Build a GenerateContentConfig. For pro models with their notoriously
    slow HIGH default thinking budget, request a low budget so requests
    stay under Render's 150s gateway cap."""
    kwargs = {}
    if system_prompt:
        kwargs["system_instruction"] = system_prompt
    is_pro = "pro" in (model_id or "").lower()
    if is_pro:
        # Try the new ThinkingConfig API; fall back silently if the
        # installed SDK predates it.
        try:
            kwargs["thinking_config"] = genai_types.ThinkingConfig(thinking_budget=512)
        except Exception:
            pass
    return genai_types.GenerateContentConfig(**kwargs) if kwargs else None


async def call_gemini(prompt: str, system_prompt: str = "", model: str | None = None) -> str:
    """Call Gemini via google-genai SDK with retry logic."""
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API not configured")

    model_id = model or GEMINI_MODEL
    try:
        config = _build_gen_config(system_prompt, model_id)
        response = gemini_client.models.generate_content(
            model=model_id,
            contents=prompt,
            config=config,
        )
        return response.text or ""
    except (httpx.TimeoutException, httpx.ConnectError, genai_errors.ServerError):
        raise
    except genai_errors.ClientError as e:
        if getattr(e, "code", None) == 429:
            raise
        raise HTTPException(status_code=400, detail=f"Gemini ({model_id}): {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini ({model_id}): {str(e)}")


async def call_ai(prompt: str, system_prompt: str = "", tier: str = "flash") -> str:
    """Call Gemini. tier='flash' (default) or 'pro' (slower, more accurate)."""
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API not configured. Add GEMINI_API_KEY to .env")
    model = GEMINI_MODEL_PRO if tier == "pro" else GEMINI_MODEL
    return await call_gemini(prompt, system_prompt, model=model)


_UZBEK_OG_APOSTROPHE_RE = re.compile(r"([oOgG])[\'`\u2019]")
_UZBEK_GENERIC_APOSTROPHE_RE = re.compile(r"(?<=\w)[\'`\u2019](?=\w)")


def normalize_uzbek_apostrophes(text: str) -> str:
    """Normalize ASCII ' / ` / U+2019 in Uzbek text to correct Unicode:
    - o'/O'/g'/G' → oʻ/Oʻ/gʻ/Gʻ (U+02BB MODIFIER LETTER TURNED COMMA, 6-shape)
    - other internal ' → ʼ (U+02BC MODIFIER LETTER APOSTROPHE, 9-shape, tutuq belgisi)"""
    text = _UZBEK_OG_APOSTROPHE_RE.sub(lambda m: m.group(1) + "ʻ", text)
    text = _UZBEK_GENERIC_APOSTROPHE_RE.sub("ʼ", text)
    return text


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
        "- 'h' vs 'x': h=boʻgʻiz undoshi (hujjat, hudud, hamma, bahor), "
        "x=chuqur til orqa undoshi (xabar, xoʻroz, baxt, xoʻjalik)\n"
        "- Correct: mahalla, hujjat, hudud, loyiha, zaxira, xoʻjalik, xodim\n"
        "- Wrong: maxalla, xujjat, xudud, loyixa, zahira, hoʻjalik, hodim\n\n"
    )
    if IMLO_RULES:
        ctx += f"=== OʻZBEK TILI IMLO QOIDALARI ===\n{IMLO_RULES}"
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
        "gemini_configured": gemini_client is not None,
        "gemini_model": GEMINI_MODEL,
        "gemini_model_pro": GEMINI_MODEL_PRO,
    }


@app.get("/api/debug/test-pro")
async def debug_test_pro():
    """Probe the configured pro model with a tiny prompt and return the
    raw error if it fails. Lets the user see exactly which model id is
    rejected when the Pro tier surfaces 'Tekshiruvda xatolik'."""
    try:
        out = await call_gemini("Reply with only the word OK.", "", model=GEMINI_MODEL_PRO)
        return {"ok": True, "model": GEMINI_MODEL_PRO, "response": out[:200]}
    except Exception as e:
        return {"ok": False, "model": GEMINI_MODEL_PRO, "error": str(e)}


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
            "oʻ, gʻ, sh, ch, etc. Never use Cyrillic letters in the output. "
            "CRITICAL apostrophe rules: use ʻ (U+02BB, curled like 6) in oʻ/gʻ; "
            "use ʼ (U+02BC, curled like 9) for tutuq belgisi (eʼlon, maʼno, taʼlim). "
            "Never use plain ASCII ' for these."
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

    tier = request.tier if request.tier in ("flash", "pro") else "flash"
    translated = await call_ai(prompt, system_ctx, tier=tier)
    translated = translated.strip()
    if request.target_lang == "uz":
        translated = normalize_uzbek_apostrophes(translated)

    return TranslateResponse(
        translated_text=translated,
        source_lang=request.source_lang,
        target_lang=request.target_lang
    )


def _strip_code_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```json"):
        s = s[7:]
    elif s.startswith("```"):
        s = s[3:]
    if s.endswith("```"):
        s = s[:-3]
    return s.strip()


def _build_check_prompt(lang_name: str, response_lang: str, text: str) -> str:
    return f"""Analyze the following {lang_name} text and find EVERY real issue.

Text to check:
\"\"\"{text}\"\"\"

WHAT TO REPORT — be exhaustive, find ALL of them in this single pass:
1. Spelling: misspelled words, wrong letters, missing/extra letters.
2. Grammar: wrong endings, cases, agreement, tense.
3. Punctuation: missing/extra commas, missing periods at sentence ends,
   wrong quotation marks, wrong apostrophes (ʻ vs ʼ in Uzbek).
4. Whitespace: double/triple spaces, missing space after comma/period,
   stray newlines that break a sentence, etc.
5. Hyphen vs em-dash: single "-" between clauses → em-dash "—";
   em-dash inside a compound word like "atrof-muhit" → hyphen.
6. Capitalization: lowercase at sentence start; proper nouns lowercase.
7. Style / wording: clumsy or unnatural phrasing, words that don't fit
   the context, sentence structure that distorts meaning. Suggest more
   natural wording. Skip if the text is already fine.

CRITICAL — UNIQUE LOCATABLE "word" FIELD:
- The "word" field must be a substring that can be unambiguously found
  in the text. If your error is JUST a whitespace character (space,
  newline, tab), include AT LEAST one neighbouring word so the match
  is unique. Examples:
    - double space inside "Bu  qilingan" → word="Bu  qilingan",
      suggestion="Bu qilingan"
    - missing space after comma "uchun,bu" → word="uchun,bu",
      suggestion="uchun, bu"
    - stray newline before "2020-yil" that should be a space →
      word="\\n2020-yil", suggestion=" 2020-yil"
- For all other errors, "word" is the EXACT misspelled token, copied
  character-by-character (including any apostrophes).
- Do NOT invent errors that aren't there. If text is correct, return
  empty errors array.

All messages MUST be in {lang_name} ({response_lang}).

Respond in this exact JSON format:
{{
    "errors": [
        {{"word": "...", "message": "...", "suggestion": "..."}}
    ],
    "corrected_text": "full corrected text with every error fixed"
}}"""


async def _run_check_pass(input_text: str, language: str, tier: str):
    """One round-trip to Gemini. Returns (errors_list, corrected_text).

    HTTPException from call_ai (e.g. invalid model id, no quota) is
    intentionally not caught here so the frontend sees the real reason
    instead of a silent empty-errors response. Only JSON-parse failures
    on a successful response degrade to empty errors.
    """
    lang_name = "Uzbek" if language == "uz" else "Russian"
    response_lang = "oʻzbek tilida" if language == "uz" else "на русском языке"

    prompt = _build_check_prompt(lang_name, response_lang, input_text)
    system_ctx = get_uzbek_system_ctx("check") if language == "uz" else ""

    result = await call_ai(prompt, system_ctx, tier=tier)
    try:
        data = json.loads(_strip_code_fences(result))
    except json.JSONDecodeError:
        return [], input_text

    raw_errors = data.get("errors", []) or []
    corrected = data.get("corrected_text", input_text) or input_text

    if language == "uz":
        corrected = normalize_uzbek_apostrophes(corrected)
        for e in raw_errors:
            if e.get("word"):
                e["word"] = normalize_uzbek_apostrophes(e["word"])
            if e.get("suggestion"):
                e["suggestion"] = normalize_uzbek_apostrophes(e["suggestion"])

    return raw_errors, corrected


@app.post("/api/grammar/check", response_model=GrammarCheckResponse)
async def check_grammar(request: GrammarCheckRequest):
    """Check grammar and spelling.

    Strategy:
    1. First pass on the user's input → these errors are returned with
       offsets, frontend uses them to highlight the visible text.
    2. If the model produced a corrected_text that differs from the input,
       run up to MAX_REFINE_PASSES additional passes on the corrected
       text and keep the LAST stable corrected_text. This handles the
       'fix one round, find new ones next round' frustration in a single
       click — frontend just consumes the final corrected_text on
       'Apply all'. We do NOT include those follow-up errors in the
       returned list since their offsets refer to a different string.
    """
    tier = request.tier if request.tier in ("flash", "pro") else "flash"
    input_text = normalize_uzbek_apostrophes(request.text) if request.language == "uz" else request.text

    # Single pass. The new exhaustive prompt is doing the heavy lifting;
    # adding refinement loops here multiplied latency by the number of
    # passes and pushed pro-tier requests past Render's ~150s gateway
    # timeout for long inputs.
    raw_errors, corrected = await _run_check_pass(input_text, request.language, tier)

    # Compute offsets for the FIRST-pass errors against the user's input
    raw_errors = compute_offsets(input_text, raw_errors)

    # Deduplicate (same word at same position)
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
        error_count=len(errors),
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
    corrected = corrected.strip()
    if request.language == "uz":
        corrected = normalize_uzbek_apostrophes(corrected)

    return {"corrected_text": corrected}


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

    if request.target_lang == "uz":
        corrected = normalize_uzbek_apostrophes(corrected)
    
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
