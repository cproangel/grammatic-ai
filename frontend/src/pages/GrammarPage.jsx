import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Trash2, Check, Sparkles, X } from 'lucide-react'
import axios from 'axios'
import { api } from '../config/api'
import TierToggle from '../components/TierToggle'

const POPUP_W = 300
const POPUP_H_APPROX = 200
const SCREEN_MARGIN = 12

// Position the popup near a specific point on the screen (the click
// or hover position) rather than an inline span's bounding rect — a
// span that wraps over multiple lines has a single rect spanning all
// the lines, and its centre is meaningless. Clamp to viewport so the
// popup never gets cut off at the edges.
//
// pointX / pointY are viewport-relative pixels (clientX / clientY).
// lineHeight is the line height of the surrounding text so we can
// place the popup just under the line the user clicked, not at the
// click point itself (looks weird).
function popupPosFromPoint(pointX, pointY, lineHeight = 24) {
  const w = window.innerWidth
  const h = window.innerHeight
  let left = pointX
  if (left - POPUP_W / 2 < SCREEN_MARGIN) left = POPUP_W / 2 + SCREEN_MARGIN
  if (left + POPUP_W / 2 > w - SCREEN_MARGIN) left = w - POPUP_W / 2 - SCREEN_MARGIN

  const lineBottom = pointY + lineHeight / 2
  const lineTop = pointY - lineHeight / 2
  const spaceBelow = h - lineBottom
  const flipUp = spaceBelow < POPUP_H_APPROX + SCREEN_MARGIN && lineTop > POPUP_H_APPROX
  const top = flipUp ? lineTop - POPUP_H_APPROX - 8 : lineBottom + 8
  return { left, top, flipUp }
}

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
  const [tier, setTier] = useState('flash')
  const [text, setText] = useState('')
  const [errors, setErrors] = useState([])
  const [correctedText, setCorrectedText] = useState('')
  const [checking, setChecking] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // Snapshot of the text at the moment the last check completed.
  // The status badge is only meaningful when text === lastCheckedText;
  // otherwise the user has typed/pasted new content and we shouldn't
  // claim "no errors found" for text that hasn't actually been checked.
  const [lastCheckedText, setLastCheckedText] = useState(null)
  const [hoverKey, setHoverKey] = useState(null)
  const [hoverPos, setHoverPos] = useState(null)
  // Pinned popup state — set by clicking an error span; survives mouse
  // moving away. Cleared by clicking outside or by applying the fix.
  const [pinnedKey, setPinnedKey] = useState(null)
  const [pinnedPos, setPinnedPos] = useState(null)
  const abortRef = useRef(null)
  const textareaRef = useRef(null)
  const underlayRef = useRef(null)

  // Outside-click closes a pinned popup. Use mousedown so a click on
  // the popup's own button still goes through (the button is rendered
  // inside the popup, which we exclude).
  useEffect(() => {
    if (!pinnedKey) return
    const onDown = (e) => {
      if (e.target.closest?.('[data-error-popup]')) return
      if (e.target.closest?.('.wavy-error')) return
      setPinnedKey(null)
      setPinnedPos(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [pinnedKey])

  const runCheck = async () => {
    if (!text.trim()) return
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setChecking(true)
    setErrorMsg('')
    const checkedText = text
    try {
      const res = await axios.post(
        api.grammarCheck,
        { text, language: lang, tier },
        { signal: controller.signal, timeout: 600000 },
      )
      setErrors(res.data.errors || [])
      setCorrectedText(res.data.corrected_text || text)
      setLastCheckedText(checkedText)
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return
      console.error('Grammar error:', err)
      setErrorMsg(err?.response?.data?.detail || (lang === 'ru' ? 'Ошибка проверки' : 'Tekshiruvda xatolik'))
    } finally {
      setChecking(false)
    }
  }

  const closePopups = () => {
    setHoverKey(null)
    setHoverPos(null)
    setPinnedKey(null)
    setPinnedPos(null)
  }

  const applySingle = (err) => {
    if (!err?.suggestion || !err?.word) return
    const newText = text.split(err.word).join(err.suggestion)
    setText(newText)
    setLastCheckedText(null)
    closePopups()
  }

  const applyAll = () => {
    if (correctedText && correctedText !== text) {
      setText(correctedText)
      setErrors([])
      setLastCheckedText(null)
      closePopups()
    }
  }

  // Errors are only valid for the exact text they were computed against.
  // If the user has edited since the last check, drop the highlights so
  // we don't paint stale offsets on now-different content.
  const isStale = lastCheckedText !== null && lastCheckedText !== text
  const liveErrors = isStale ? [] : errors
  const segments = useMemo(() => buildSegments(text, liveErrors), [text, liveErrors])
  const errorCount = liveErrors.length
  // Pin wins over hover so the popup stays put while the user moves
  // toward the Qoʻllash button.
  const activeKey = pinnedKey || hoverKey
  const activePos = pinnedKey ? pinnedPos : hoverPos
  const activeSeg = useMemo(
    () => (activeKey ? segments.find((s) => s.type === 'err' && s.key === activeKey) : null),
    [activeKey, segments],
  )

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
      className="flex flex-col gap-3 md:gap-5 md:h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-pink-200 tracking-tight">Grammatika</h1>
          <p className="text-pink-400/60 text-[12px] md:text-[13px] mt-0.5">
            AI matningizdagi xatolarni topadi va tuzatadi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TierToggle tier={tier} onChange={setTier} layoutId="grammar-tier-pill" />
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
      </div>

      {/* Unified editor — single textarea with live error highlights below */}
      <div className="glass rounded-2xl md:flex-1 md:min-h-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <LangBadge>{lang === 'ru' ? 'Русский' : 'Oʻzbekcha'}</LangBadge>
            <AnimatePresence mode="wait">
              <motion.span
                key={`${errorCount}-${checking}-${errorMsg ? 'err' : 'ok'}-${isStale ? 'stale' : 'fresh'}-${lastCheckedText === null ? 'never' : 'done'}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className={`text-[12px] px-2 py-0.5 rounded-md border ${
                  checking
                    ? 'bg-pink-500/10 text-pink-300/80 border-pink-500/20'
                    : errorMsg
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : !text.trim()
                        ? 'bg-white/5 text-white/30 border-white/10'
                        : lastCheckedText === null || isStale
                          ? 'bg-white/5 text-pink-300/70 border-pink-500/20'
                          : errorCount > 0
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                }`}
              >
                {checking ? (
                  <span className="inline-flex items-center gap-2">
                    {lang === 'ru' ? 'Проверка' : 'Tekshirilmoqda'}
                    <span className="dots-bounce" aria-hidden="true">
                      <span /><span /><span />
                    </span>
                  </span>
                ) : errorMsg
                  ? (lang === 'ru' ? 'Ошибка' : 'Xatolik')
                  : !text.trim()
                    ? (lang === 'ru' ? 'Пусто' : 'Boʻsh')
                    : lastCheckedText === null || isStale
                      ? (lang === 'ru' ? 'Не проверено' : 'Tekshirilmagan')
                      : errorCount > 0
                        ? (lang === 'ru' ? `${errorCount} ошибок` : `${errorCount} ta xato`)
                        : (lang === 'ru' ? 'Без ошибок' : 'Xatolar yoʻq')}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1">
            <CardIconBtn title="Tozalash" onClick={() => setText('')}><Trash2 size={15} /></CardIconBtn>
            <CardIconBtn title="Nusxa olish" onClick={() => navigator.clipboard?.writeText(text)}><Copy size={15} /></CardIconBtn>
          </div>
        </div>

        {checking && <div className="shimmer-bar" />}

        {/* Stacked layers: underlay renders the visible text + highlights,
            textarea on top is what receives keystrokes (text rendered
            transparent so caret is visible but glyphs come from underlay).
            Spans inside underlay re-enable pointer events so hovering an
            error opens the suggestion popup, while plain text falls
            through to the textarea below. */}
        <div className="relative flex-1 min-h-[260px] md:min-h-0">
          {/* Textarea underneath — receives keystrokes everywhere except
              over the error spans, which sit on the overlay and trap
              hover for the popup. */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onScroll={(e) => {
              if (underlayRef.current) underlayRef.current.scrollTop = e.currentTarget.scrollTop
            }}
            spellCheck={false}
            className="grammar-overlay-textarea absolute inset-0 w-full h-full bg-transparent px-4 md:px-6 py-3 md:py-5 text-[15px] md:text-[16px] leading-[1.7] md:leading-[1.85] whitespace-pre-wrap resize-none outline-none z-[1]"
            style={{ color: 'transparent', caretColor: '#f9a8d4' }}
          />
          {/* Overlay on top — visible glyphs + error highlights.
              Container blocks no events; only error spans capture hover. */}
          <div
            ref={underlayRef}
            aria-hidden="true"
            className="grammar-overlay-underlay absolute inset-0 overflow-auto px-4 md:px-6 py-3 md:py-5 text-[15px] md:text-[16px] leading-[1.7] md:leading-[1.85] text-white/90 whitespace-pre-wrap pointer-events-none z-[2]"
          >
            {text
              ? segments.map((seg, i) => {
                  if (seg.type === 'text') return <span key={`t-${i}`}>{seg.text}</span>
                  const isWhitespace = !seg.text.trim()
                  return (
                    <span
                      key={seg.key}
                      className={`wavy-error${isWhitespace ? ' is-whitespace' : ''}`}
                      style={{ color: '#fce7f3', pointerEvents: 'auto' }}
                      onMouseEnter={(e) => {
                        if (pinnedKey) return
                        // Use the cursor position so multi-line wrapped spans
                        // open the popup near the line you're hovering, not
                        // somewhere in the middle of the span's bounding box.
                        const lh = parseFloat(getComputedStyle(e.currentTarget).lineHeight) || 24
                        setHoverKey(seg.key)
                        setHoverPos(popupPosFromPoint(e.clientX, e.clientY, lh))
                      }}
                      onMouseMove={(e) => {
                        if (pinnedKey || hoverKey !== seg.key) return
                        const lh = parseFloat(getComputedStyle(e.currentTarget).lineHeight) || 24
                        setHoverPos(popupPosFromPoint(e.clientX, e.clientY, lh))
                      }}
                      onMouseLeave={() => {
                        if (pinnedKey) return
                        setHoverKey((p) => (p === seg.key ? null : p))
                        setHoverPos(null)
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        const lh = parseFloat(getComputedStyle(e.currentTarget).lineHeight) || 24
                        setPinnedKey(seg.key)
                        setPinnedPos(popupPosFromPoint(e.clientX, e.clientY, lh))
                        setHoverKey(null)
                        setHoverPos(null)
                      }}
                    >
                      {seg.text}
                    </span>
                  )
                })
              : (
                <span className="text-white/25">
                  {lang === 'ru' ? 'Введите текст для проверки…' : 'Tekshirish uchun matn kiriting…'}
                </span>
              )}
            {/* trailing newline ensures last line scrolls into view */}
            {'\n'}
          </div>
        </div>
        {errorMsg && (
          <div className="border-t border-white/5 px-4 md:px-5 py-2 text-rose-300/80 text-[12px]">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="text-[12px] text-pink-400/60 hidden md:block">
          {lang === 'ru'
            ? 'Наведите на подчёркнутое слово — увидите предложение по исправлению.'
            : 'Tagi chizilgan soʻz ustiga olib boring — taklifni koʻrasiz.'}
        </div>
        <div className="flex items-center gap-3 md:gap-3 w-full md:w-auto">
          <motion.button
            onClick={runCheck}
            disabled={checking || !text.trim()}
            whileHover={!checking && text.trim() ? { scale: 1.03, boxShadow: '0 10px 30px -8px rgba(236,72,153,0.55)' } : {}}
            whileTap={!checking && text.trim() ? { scale: 0.97 } : {}}
            className={`flex-1 md:flex-initial justify-center px-5 py-2.5 rounded-xl font-semibold text-[13.5px] flex items-center gap-2 transition-all ${
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
            className={`flex-1 md:flex-initial justify-center px-5 py-2.5 rounded-xl font-semibold text-[13.5px] flex items-center gap-2 transition-all ${
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
        {activeSeg && activePos && (activeSeg.err.suggestion || activeSeg.err.message) && (
          <motion.div
            data-error-popup
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onMouseEnter={() => { if (!pinnedKey) setHoverKey(activeSeg.key) }}
            onMouseLeave={() => { if (!pinnedKey) { setHoverKey(null); setHoverPos(null) } }}
            className="fixed w-[300px] rounded-xl p-3.5 border border-pink-500/40 shadow-[0_24px_50px_-10px_rgba(0,0,0,0.85)]"
            style={{
              left: activePos.left,
              top: activePos.top,
              transform: 'translateX(-50%)',
              zIndex: 9999,
              pointerEvents: 'auto',
              background: 'rgba(20,8,28,0.97)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] uppercase tracking-wider text-pink-300 font-bold">
                {lang === 'ru' ? 'Исправление' : 'Tuzatish'}
              </span>
              <span className="h-px flex-1 bg-pink-500/30" />
              {pinnedKey && (
                <button
                  onClick={() => { setPinnedKey(null); setPinnedPos(null) }}
                  className="text-pink-400/60 hover:text-pink-300 transition-colors"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {activeSeg.err.suggestion && (
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-rose-300/60 line-through text-[13px]">{activeSeg.text}</span>
                <span className="text-pink-300">→</span>
                <span className="text-pink-100 font-bold text-[15px]">{activeSeg.err.suggestion}</span>
              </div>
            )}
            {activeSeg.err.message && (
              <div className="text-[12px] text-pink-100/85 leading-snug mb-3">
                {activeSeg.err.message}
              </div>
            )}
            {activeSeg.err.suggestion && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); applySingle(activeSeg.err) }}
                className="w-full py-2 rounded-lg bg-pink-500/35 hover:bg-pink-500/55 border border-pink-500/50 text-white text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check size={14} />
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
