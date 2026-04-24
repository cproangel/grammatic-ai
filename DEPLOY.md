# 🚀 Деплой Grammatic / TilshunosAI

**Архитектура**: фронт на Vercel (статика) + бэк на Render (Docker) + Gemini через Vertex AI. Всё на бесплатных тарифах. Время — **~15 минут**.

```
┌─────────────┐   HTTPS + CORS   ┌─────────────────┐   Vertex AI    ┌─────────────┐
│   Vercel    │ ───────────────► │     Render      │ ─────────────► │  Gemini 3   │
│  (React)    │                  │   (FastAPI)     │                │   Flash     │
└─────────────┘                  └─────────────────┘                └─────────────┘
```

---

## ⚙️ Что должно быть готово

1. **GitHub** — репозиторий уже есть: `cproangel/grammatic-ai`
2. **Vercel** — https://vercel.com/signup (через GitHub)
3. **Render** — https://render.com/register (через GitHub)
4. **Gemini-аутентификация** — один из двух вариантов:
   - **Vertex AI** (продакшен): service-account JSON с role `Vertex AI User` в GCP
   - **Developer API** (проще): ключ из https://aistudio.google.com/apikey

Код поддерживает оба варианта — просто устанавливаешь соответствующие env-переменные.

---

## 1️⃣ Push изменений в GitHub

```bash
git add .
git commit -m "Migrate to google.genai + Vertex AI support, add deploy configs"
git push origin main
```

⚠️ **НЕ добавляй `.env` и JSON-ключи в репо!** Они должны попадать только в dashboard-ы Render/Vercel.

---

## 2️⃣ Бэкенд на Render (~5 минут)

В репозитории лежит `render.yaml` — Blueprint.

1. https://dashboard.render.com/blueprints → **New Blueprint Instance**
2. Выбери репо `cproangel/grammatic-ai`, ветку `main`
3. Render увидит `render.yaml` и покажет сервис `grammatic-backend`
4. Заполни env-переменные (**sync:false** = секреты, вводятся вручную):

**Вариант A — Vertex AI (рекомендую):**
| Переменная | Значение |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | `gen-lang-client-0308616273` *(project_id из JSON)* |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` *(или регион Vertex AI, где включён)* |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | всё содержимое JSON-файла **одной строкой** (Render поддерживает многострочные значения) |
| `GEMINI_API_KEY` | *оставь пустым* |

**Вариант B — Developer API:**
| Переменная | Значение |
|---|---|
| `GEMINI_API_KEY` | ключ из AI Studio |
| Остальные GOOGLE_* | пусто |

5. **Apply** → сборка Docker (~3–5 мин)
6. Когда статус **Live**, копируй URL вида `https://grammatic-backend.onrender.com`

**Проверка:**
```bash
curl https://grammatic-backend.onrender.com/api/health
# → {"status":"healthy","gemini_configured":true,"gemini_model":"gemini-3-flash-preview"}
```

---

## 3️⃣ Фронтенд на Vercel (~3 минуты)

1. https://vercel.com/new → **Import** репо `cproangel/grammatic-ai`
2. **Configure Project**:
   - **Root Directory**: `frontend` (нажать Edit и выбрать)
   - **Framework**: Vite (авто)
3. **Environment Variables**:
   - `VITE_API_URL` = `https://grammatic-backend.onrender.com` *(твой Render URL)*
4. **Deploy** (~1–2 мин)
5. Получаешь URL `https://grammatic-ai.vercel.app`

---

## 4️⃣ Закрепить CORS

После того как узнаешь Vercel-домен, в Render обнови:
- `ALLOWED_ORIGINS` = `https://grammatic-ai.vercel.app,https://grammatic-ai-*.vercel.app`

Render сам перезапустит сервис.

---

## 🔄 Обновления

```bash
git add .
git commit -m "описание"
git push origin main
```
Vercel и Render пересоберутся автоматически.

---

## 🆘 Траблшутинг

| Симптом | Проверка |
|---|---|
| "Gemini not configured" в логах Render | `GOOGLE_APPLICATION_CREDENTIALS_JSON` вставлен целиком + `GOOGLE_CLOUD_PROJECT` задан |
| "Vertex AI init failed" | Role у сервис-аккаунта — должна быть `Vertex AI User` (или выше); Vertex AI API включён в проекте |
| "NotFound: model gemini-3-flash-preview" | Модель в preview — попробуй `gemini-2.5-flash` в `GEMINI_MODEL` |
| CORS error в браузерной консоли | Временно поставь `ALLOWED_ORIGINS=*` |
| Первый запрос 30 сек | Cold start free-тарифа Render; апгрейд — Starter $7/мес |

---

## 💰 Стоимость

| Сервис | Тариф | Лимит |
|---|---|---|
| Vercel Hobby | $0 | 100 ГБ трафика, 6000 мин билдов |
| Render Free | $0 | 750 ч/мес, спит после 15 мин простоя |
| Vertex AI | pay-per-use | ~$0.30 / 1M input tokens для Flash |
| Gemini Developer API | Free tier | 15 RPM на `gemini-2.5-flash` |

---

## 🔐 Безопасность после деплоя

**Важно**: любые ключи, когда-либо попавшие в чат, логи, screenshot'ы или не-секретные системы — нужно считать скомпрометированными. После успешного деплоя:

1. **GCP service account key** → https://console.cloud.google.com/iam-admin/serviceaccounts → найди аккаунт → Keys → удали старый, создай новый → обнови в Render
2. **Vercel token** → https://vercel.com/account/tokens → Revoke
3. **Render API key** → https://dashboard.render.com/u/settings#api-keys → Revoke

Render и Vercel используют эти ключи только для CI/CLI, после деплоя они не нужны.
