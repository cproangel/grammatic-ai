import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Trash2, Sparkles, Volume2, ArrowDownUp, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import { api } from '../config/api'

const PinkToggle = ({ on, setOn, label }) => (
  <button type="button" onClick={() => setOn(!on)} className="flex items-center gap-2.5 group">
    <div className={`pink-toggle ${on ? 'on' : ''}`}>
      <motion.span
        className="knob"
        animate={{ x: on ? 18 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      />
    </div>
    {label && (
      <span className={`text-[12.5px] font-medium transition-colors ${on ? 'text-pink-300' : 'text-white/60 group-hover:text-white/80'}`}>
        {label}
      </span>
    )}
  </button>
)

const LangBadge = ({ children, dim = false }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium ${
    dim
      ? 'text-pink-400/70 bg-white/[0.03] border border-white/5'
      : 'text-pink-300 bg-pink-500/15 border border-pink-500/30'
  }`}>
    {children}
  </span>
)

const SwapButton = ({ onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ rotate: 180, scale: 1.08 }}
    whileTap={{ scale: 0.92 }}
    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    className="w-10 h-10 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-200 flex items-center justify-center shadow-[0_0_20px_-4px_rgba(236,72,153,0.5)] hover:bg-pink-500/30 transition-colors"
  >
    <ArrowDownUp size={18} />
  </motion.button>
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

export default function TranslatorPage() {
  const [fromRu, setFromRu] = useState(true)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [realtime, setRealtime] = useState(true)
  const [loading, setLoading] = useState(false)
  const [latencyMs, setLatencyMs] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const abortRef = useRef(null)

  const fromLang = fromRu ? 'ru' : 'uz'
  const toLang = fromRu ? 'uz' : 'ru'
  const fromLabel = fromRu ? 'Русский' : 'Oʻzbekcha'
  const toLabel = fromRu ? 'Oʻzbekcha' : 'Русский'

  const doTranslate = async (text = input) => {
    if (!text.trim()) {
      setOutput('')
      return
    }
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setErrorMsg('')
    const t0 = performance.now()
    try {
      const res = await axios.post(
        api.translate,
        { text, source_lang: fromLang, target_lang: toLang },
        { signal: controller.signal, timeout: 30000 },
      )
      setOutput(res.data.translated_text || '')
      setLatencyMs(Math.round(performance.now() - t0))
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return
      console.error('Translate error:', err)
      setErrorMsg(err?.response?.data?.detail || 'Tarjimada xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  // Realtime debounced translation
  useEffect(() => {
    if (!realtime) return
    const t = setTimeout(() => doTranslate(input), 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, fromRu, realtime])

  const swap = () => {
    setFromRu((v) => !v)
    setInput(output)
    setOutput(input)
  }

  return (
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
          <h1 className="text-2xl font-bold text-pink-200 tracking-tight">Tarjimon</h1>
          <p className="text-pink-400/60 text-[13px] mt-0.5">Русский ⇄ Oʻzbekcha — AI-tarjima real vaqtda</p>
        </div>
        <PinkToggle on={realtime} setOn={setRealtime} label="Real-time" />
      </div>

      {/* Direction bar */}
      <div className="glass rounded-2xl px-5 py-3 flex items-center justify-center gap-5">
        <LangBadge><span className="w-1.5 h-1.5 rounded-full bg-pink-300" />{fromLabel}</LangBadge>
        <SwapButton onClick={swap} />
        <LangBadge><span className="w-1.5 h-1.5 rounded-full bg-pink-300" />{toLabel}</LangBadge>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-5 flex-1 min-h-0">
        {/* Input */}
        <motion.div
          whileHover={{ y: -2, boxShadow: '0 20px 40px -20px rgba(236,72,153,0.25)' }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="glass rounded-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <LangBadge dim>{fromLabel}</LangBadge>
              <span className="text-pink-400/50 text-[11px]">{input.length} / 5000</span>
            </div>
            <div className="flex items-center gap-1">
              <CardIconBtn title="Tozalash" onClick={() => setInput('')}><Trash2 size={15} /></CardIconBtn>
              <CardIconBtn title="Nusxa olish" onClick={() => navigator.clipboard?.writeText(input)}><Copy size={15} /></CardIconBtn>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 5000))}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') doTranslate()
            }}
            placeholder={fromRu ? 'Введите текст для перевода…' : 'Tarjima uchun matnni kiriting…'}
            className="flex-1 bg-transparent px-5 py-4 text-white/90 text-[15px] leading-relaxed resize-none outline-none placeholder-white/25"
          />
          <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-pink-400/50">
            <span className="flex items-center gap-1.5"><Volume2 size={13} />Prononsiyatsiya mavjud</span>
            <span>⌘ / Ctrl + Enter — tarjima</span>
          </div>
        </motion.div>

        {/* Output */}
        <motion.div
          whileHover={{ y: -2, boxShadow: '0 20px 40px -20px rgba(236,72,153,0.25)' }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="glass rounded-2xl flex flex-col overflow-hidden relative"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <LangBadge>{toLabel}</LangBadge>
              {loading && (
                <span className="flex items-center gap-1.5 text-pink-300/70 text-[11px]">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-3 h-3 border border-pink-300/60 border-t-transparent rounded-full inline-block"
                  />
                  Tarjima qilinmoqda…
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <CardIconBtn title="Nusxa olish" onClick={() => navigator.clipboard?.writeText(output)}><Copy size={15} /></CardIconBtn>
              <CardIconBtn title="Tozalash" onClick={() => setOutput('')}><Trash2 size={15} /></CardIconBtn>
            </div>
          </div>
          <div className="flex-1 px-5 py-4 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.p
                key={output + (loading ? '_l' : '') + (errorMsg || '')}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-white/90 text-[15px] leading-relaxed whitespace-pre-wrap"
              >
                {errorMsg ? (
                  <span className="text-rose-300/80">{errorMsg}</span>
                ) : output ? (
                  output
                ) : (
                  <span className="text-white/25">
                    {fromRu ? 'Tarjima bu yerda paydo boʻladi…' : 'Перевод появится здесь…'}
                  </span>
                )}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-pink-400/50">
            <span className="flex items-center gap-1.5"><Sparkles size={13} />Gemini 3 Flash</span>
            <span>{latencyMs != null ? `~${(latencyMs / 1000).toFixed(1)}s` : '—'}</span>
          </div>
        </motion.div>
      </div>

      {/* Manual button when real-time off */}
      <AnimatePresence>
        {!realtime && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center"
          >
            <motion.button
              onClick={() => doTranslate()}
              disabled={loading || !input.trim()}
              whileHover={!loading && input.trim() ? { scale: 1.03, boxShadow: '0 10px 30px -8px rgba(236,72,153,0.6)' } : {}}
              whileTap={!loading && input.trim() ? { scale: 0.97 } : {}}
              className={`px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 transition-all ${
                loading || !input.trim()
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-500 to-pink-400 shadow-[0_10px_30px_-10px_rgba(236,72,153,0.7)]'
              }`}
            >
              {loading ? <CheckCircle2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
              Tarjima qilish
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
