import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Trash2, Check, Sparkles } from 'lucide-react'
import axios from 'axios'
import { api } from '../config/api'

const LangBadge = ({ children, dim = false }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium ${
    dim
      ? 'text-pink-400/70 bg-white/[0.03] border border-white/5'
      : 'text-pink-300 bg-pink-500/15 border border-pink-500/30'
  }`}>{children}</span>
)

const CardIconBtn = ({ children, onClick, title }) => (
  <motion.button
    onClick={onClick}
    title={title}
    whileHover={{ scale: 1.1, backgroundColor: 'rgba(236,72,153,0.18)' }}
    whileTap={{ scale: 0.92 }}
    className="w-7 h-7 rounded-md flex items-center justify-center text-pink-400/70 hover:text-pink-300 transition-colors"
  >
    {children}
  </motion.button>
)

// Build spans: interleave plain text + error tokens from backend errors[]
// Uses offset/length when valid; falls back to word-search otherwise.
function buildSegments(text, errors) {
  if (!errors?.length) return [{ type: 'text', text }]

  const valid = errors
    .filter((e) => typeof e.offset === 'number' && e.offset >= 0 && typeof e.length === 'number' && e.length > 0 && e.offset + e.length <= text.length)
    .sort((a, b) => a.offset - b.offset)

  if (!valid.length) {
    // Fallback — search by word
    const out = []
    let remaining = text
    let cursor = 0
    errors.forEach((err, i) => {
      if (!err.word) return
      const idx = remaining.indexOf(err.word)
      if (idx === -1) return
      if (idx > 0) out.push({ type: 'text', text: remaining.slice(0, idx) })
      out.push({ type: 'err', text: err.word, err, key: `err-${cursor + idx}-${i}` })
      remaining = remaining.slice(idx + err.word.length)
      cursor += idx + err.word.length
    })
    if (remaining) out.push({ type: 'text', text: remaining })
    return out.length ? out : [{ type: 'text', text }]
  }

  const out = []
  let last = 0
  valid.forEach((err, i) => {
    if (err.offset > last) out.push({ type: 'text', text: text.slice(last, err.offset) })
    out.push({ type: 'err', text: text.slice(err.offset, err.offset + err.length), err, key: `err-${err.offset}-${i}` })
    last = err.offset + err.length
  })
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) })
  return out
}

export default function GrammarPage() {
  const [lang, setLang] = useState('uz')
  const [text, setText] = useState('')
  const [errors, setErrors] = useState([])
  const [correctedText, setCorrectedText] = useState('')
  const [checking, setChecking] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [hoverKey, setHoverKey] = useState(null)
  const [hoverPos, setHoverPos] = useState(null)
  const abortRef = useRef(null)

  const runCheck = async () => {
    if (!text.trim()) return
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setChecking(true)
    setErrorMsg('')
    try {
      const res = await axios.post(
        api.grammarCheck,
        { text, language: lang },
        { signal: controller.signal, timeout: 30000 },
      )
      setErrors(res.data.errors || [])
      setCorrectedText(res.data.corrected_text || text)
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return
      console.error('Grammar error:', err)
      setErrorMsg(err?.response?.data?.detail || (lang === 'ru' ? 'Ошибка проверки' : 'Tekshiruvda xatolik'))
    } finally {
      setChecking(false)
    }
  }

  const applySingle = (err) => {
    if (!err?.suggestion || !err?.word) return
    const newText = text.split(err.word).join(err.suggestion)
    setText(newText)
    setHoverKey(null)
    setHoverPos(null)
  }

  const applyAll = () => {
    if (correctedText && correctedText !== text) {
      setText(correctedText)
      setErrors([])
      setHoverKey(null)
      setHoverPos(null)
    }
  }

  const segments = useMemo(() => buildSegments(text, errors), [text, errors])
  const errorCount = errors.length
  const activeSeg = useMemo(
    () => (hoverKey ? segments.find((s) => s.type === 'err' && s.key === hoverKey) : null),
    [hoverKey, segments],
  )

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
      className="flex flex-col gap-5 h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-pink-200 tracking-tight">Grammatika</h1>
          <p className="text-pink-400/60 text-[13px] mt-0.5">
            AI matningizdagi xatolarni topadi va tuzatadi
          </p>
        </div>

        <div className="glass rounded-xl p-1 flex items-center">
          {[
            { k: 'ru', label: 'Русский' },
            { k: 'uz', label: 'Oʻzbekcha' },
          ].map((opt) => (
            <button
              key={opt.k}
              onClick={() => setLang(opt.k)}
              className={`relative px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
                lang === opt.k ? 'text-pink-200' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {lang === opt.k && (
                <motion.span
                  layoutId="grammar-lang-pill"
                  className="absolute inset-0 bg-pink-500/20 border border-pink-500/30 rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main editor card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="glass rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <LangBadge>{lang === 'ru' ? 'Русский' : 'Oʻzbekcha'}</LangBadge>
            <AnimatePresence mode="wait">
              <motion.span
                key={`${errorCount}-${checking}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className={`text-[12px] px-2 py-0.5 rounded-md border ${
                  checking
                    ? 'bg-pink-500/10 text-pink-300/80 border-pink-500/20'
                    : errorCount > 0
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                      : text.trim()
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                        : 'bg-white/5 text-white/30 border-white/10'
                }`}
              >
                {checking
                  ? (lang === 'ru' ? 'Проверка…' : 'Tekshirilmoqda…')
                  : errorCount > 0
                    ? (lang === 'ru' ? `${errorCount} ошибок` : `${errorCount} ta xato`)
                    : text.trim()
                      ? (lang === 'ru' ? 'Без ошибок' : 'Xatolar yoʻq')
                      : (lang === 'ru' ? 'Пусто' : 'Boʻsh')}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1">
            <CardIconBtn title="Tozalash" onClick={() => setText('')}><Trash2 size={15} /></CardIconBtn>
            <CardIconBtn title="Nusxa olish" onClick={() => navigator.clipboard?.writeText(text)}><Copy size={15} /></CardIconBtn>
          </div>
        </div>

        {/* Annotated view */}
        <div className="flex-1 min-h-0 overflow-auto px-6 py-5 text-white/90 text-[16px] leading-[1.85] whitespace-pre-wrap relative">
          {text.trim() && segments.map((seg, i) => {
            if (seg.type === 'text') return <span key={`t-${i}`}>{seg.text}</span>
            return (
              <span
                key={seg.key}
                className="relative wavy-error"
                style={{ color: '#fce7f3' }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setHoverKey(seg.key)
                  setHoverPos({ left: rect.left + rect.width / 2, top: rect.bottom })
                }}
                onMouseLeave={() => {
                  setHoverKey((p) => (p === seg.key ? null : p))
                  setHoverPos(null)
                }}
              >
                {seg.text}
              </span>
            )
          })}
        </div>

        {/* Editor input */}
        <div className="border-t border-white/5 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={lang === 'ru' ? 'Редактируйте текст здесь…' : 'Matnni shu yerda tahrirlang…'}
            className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-white/80 text-[13.5px] resize-none outline-none focus:border-pink-500/40 focus:bg-black/40 transition-colors placeholder-white/25"
          />
          {errorMsg && <div className="mt-2 text-rose-300/80 text-[12px]">{errorMsg}</div>}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-[12px] text-pink-400/60">
          {lang === 'ru'
            ? 'Наведите на подчёркнутое слово — увидите предложение по исправлению.'
            : 'Tagi chizilgan soʻz ustiga olib boring — taklifni koʻrasiz.'}
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={runCheck}
            disabled={checking || !text.trim()}
            whileHover={!checking && text.trim() ? { scale: 1.03, boxShadow: '0 10px 30px -8px rgba(236,72,153,0.55)' } : {}}
            whileTap={!checking && text.trim() ? { scale: 0.97 } : {}}
            className={`px-5 py-2.5 rounded-xl font-semibold text-[13.5px] flex items-center gap-2 transition-all ${
              checking || !text.trim()
                ? 'text-white/30 bg-white/5 border border-white/5 cursor-not-allowed'
                : 'text-white bg-gradient-to-r from-pink-500 to-pink-400 shadow-[0_10px_25px_-10px_rgba(236,72,153,0.6)]'
            }`}
          >
            <Sparkles size={15} />
            {lang === 'ru' ? 'Проверить' : 'Tekshirish'}
          </motion.button>
          <motion.button
            onClick={applyAll}
            disabled={!correctedText || correctedText === text}
            whileHover={correctedText && correctedText !== text ? { scale: 1.03, boxShadow: '0 10px 30px -8px rgba(236,72,153,0.55)' } : {}}
            whileTap={correctedText && correctedText !== text ? { scale: 0.97 } : {}}
            className={`px-5 py-2.5 rounded-xl font-semibold text-[13.5px] flex items-center gap-2 transition-all ${
              correctedText && correctedText !== text
                ? 'text-white bg-gradient-to-r from-pink-500 to-pink-400 shadow-[0_10px_25px_-10px_rgba(236,72,153,0.6)]'
                : 'text-white/30 bg-white/5 border border-white/5 cursor-not-allowed'
            }`}
          >
            <Check size={15} />
            {lang === 'ru' ? 'Применить все' : 'Hammasini qoʻllash'}
          </motion.button>
        </div>
      </div>
    </motion.div>
    {createPortal(
      <AnimatePresence>
        {activeSeg && hoverPos && (activeSeg.err.suggestion || activeSeg.err.message) && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onMouseEnter={() => setHoverKey(activeSeg.key)}
            onMouseLeave={() => { setHoverKey(null); setHoverPos(null) }}
            className="fixed w-[280px] glass rounded-xl p-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)]"
            style={{
              left: hoverPos.left,
              top: hoverPos.top + 8,
              transform: 'translateX(-50%)',
              zIndex: 9999,
              pointerEvents: 'auto',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] uppercase tracking-wider text-pink-400/70 font-semibold">
                {lang === 'ru' ? 'Предложение' : 'Taklif'}
              </span>
              <span className="h-px flex-1 bg-pink-500/20" />
            </div>
            {activeSeg.err.suggestion && (
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-white/40 line-through text-[13px]">{activeSeg.text}</span>
                <span className="text-pink-400/50">→</span>
                <span className="text-pink-200 font-semibold text-[15px]">{activeSeg.err.suggestion}</span>
              </div>
            )}
            {activeSeg.err.message && (
              <div className="text-[11.5px] text-pink-400/80 leading-snug mb-2.5">
                {activeSeg.err.message}
              </div>
            )}
            {activeSeg.err.suggestion && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); applySingle(activeSeg.err) }}
                className="w-full py-1.5 rounded-lg bg-pink-500/25 hover:bg-pink-500/40 border border-pink-500/40 text-pink-100 text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check size={13} />
                {lang === 'ru' ? 'Применить' : 'Qoʻllash'}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}
    </>
  )
}
