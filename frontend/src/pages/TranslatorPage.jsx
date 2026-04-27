import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Trash2, Sparkles, Volume2, ArrowDownUp, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import { api } from '../config/api'

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
        { signal: controller.signal, timeout: 600000 },
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
      className="flex flex-col gap-3 md:gap-5 md:h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-pink-200 tracking-tight">Tarjimon</h1>
          <p className="text-pink-400/60 text-[12px] md:text-[13px] mt-0.5">Русский ⇄ Oʻzbekcha — AI-tarjima</p>
        </div>
      </div>

      {/* Direction bar — swap button is anchored at the center via grid;
          side columns share equal width so the button never shifts when
          the labels swap, only the badges around it change. */}
      <div className="glass rounded-2xl px-3 md:px-5 py-2.5 md:py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-5">
        <div className="justify-self-end">
          <LangBadge><span className="w-1.5 h-1.5 rounded-full bg-pink-300" />{fromLabel}</LangBadge>
        </div>
        <SwapButton onClick={swap} />
        <div className="justify-self-start">
          <LangBadge><span className="w-1.5 h-1.5 rounded-full bg-pink-300" />{toLabel}</LangBadge>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 md:flex-1 md:min-h-0">
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
            className="flex-1 min-h-[180px] md:min-h-0 bg-transparent px-4 md:px-5 py-3 md:py-4 text-white/90 text-[15px] leading-relaxed resize-none outline-none placeholder-white/25"
          />
          <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-end text-[11px] text-pink-400/50">
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
                <span className="flex items-center gap-2 text-pink-300 text-[11px]">
                  Tarjima qilinmoqda
                  <span className="dots-bounce" aria-hidden="true">
                    <span /><span /><span />
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <CardIconBtn title="Nusxa olish" onClick={() => navigator.clipboard?.writeText(output)}><Copy size={15} /></CardIconBtn>
              <CardIconBtn title="Tozalash" onClick={() => setOutput('')}><Trash2 size={15} /></CardIconBtn>
            </div>
          </div>
          {loading && <div className="shimmer-bar" />}
          <div className="flex-1 min-h-[180px] md:min-h-0 px-4 md:px-5 py-3 md:py-4 overflow-auto">
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
          <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-end text-[11px] text-pink-400/50">
            <span>{latencyMs != null ? `~${(latencyMs / 1000).toFixed(1)}s` : '—'}</span>
          </div>
        </motion.div>
      </div>

      {/* Action button */}
      <div className="flex justify-center">
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
      </div>
    </motion.div>
  )
}
