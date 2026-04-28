import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Trash2, ArrowDownUp, Sparkles } from 'lucide-react'

// Correct Unicode apostrophes
const U_LEFT = '\u02BB'   // ʻ — for Oʻzbek, Gʻalaba
const U_RIGHT = '\u02BC'  // ʼ — for eʼlon, maʼno

// Cyrillic → Latin (multigraphs first)
const CYR_TO_LAT = [
  ['Ў', `O${U_LEFT}`], ['ў', `o${U_LEFT}`],
  ['Ғ', `G${U_LEFT}`], ['ғ', `g${U_LEFT}`],
  ['Ш', 'Sh'], ['ш', 'sh'],
  ['Ч', 'Ch'], ['ч', 'ch'],
  ['Ё', 'Yo'], ['ё', 'yo'],
  ['Ю', 'Yu'], ['ю', 'yu'],
  ['Я', 'Ya'], ['я', 'ya'],
  ['Ц', 'Ts'], ['ц', 'ts'],
  ['Щ', 'Shch'], ['щ', 'shch'],
  ['Ъ', U_RIGHT], ['ъ', U_RIGHT],
  ['Ь', ''], ['ь', ''],
  ['Ҳ', 'H'], ['ҳ', 'h'],
  ['Қ', 'Q'], ['қ', 'q'],
  ['А', 'A'], ['а', 'a'],
  ['Б', 'B'], ['б', 'b'],
  ['В', 'V'], ['в', 'v'],
  ['Г', 'G'], ['г', 'g'],
  ['Д', 'D'], ['д', 'd'],
  ['Е', 'E'], ['е', 'e'],
  ['Ж', 'J'], ['ж', 'j'],
  ['З', 'Z'], ['з', 'z'],
  ['И', 'I'], ['и', 'i'],
  ['Й', 'Y'], ['й', 'y'],
  ['К', 'K'], ['к', 'k'],
  ['Л', 'L'], ['л', 'l'],
  ['М', 'M'], ['м', 'm'],
  ['Н', 'N'], ['н', 'n'],
  ['О', 'O'], ['о', 'o'],
  ['П', 'P'], ['п', 'p'],
  ['Р', 'R'], ['р', 'r'],
  ['С', 'S'], ['с', 's'],
  ['Т', 'T'], ['т', 't'],
  ['У', 'U'], ['у', 'u'],
  ['Ф', 'F'], ['ф', 'f'],
  ['Х', 'X'], ['х', 'x'],
  ['Ы', 'I'], ['ы', 'i'],
  ['Э', 'E'], ['э', 'e'],
]

const cyrToLat = (s) => {
  let out = s
  CYR_TO_LAT.forEach(([c, l]) => { out = out.split(c).join(l) })
  return out
}

// Latin → Cyrillic (longest-first)
const LAT_TO_CYR = [
  [`O${U_LEFT}`, 'Ў'], [`o${U_LEFT}`, 'ў'],
  [`G${U_LEFT}`, 'Ғ'], [`g${U_LEFT}`, 'ғ'],
  [`O'`, 'Ў'], [`o'`, 'ў'],
  [`G'`, 'Ғ'], [`g'`, 'ғ'],
  [`O\u2019`, 'Ў'], [`o\u2019`, 'ў'],
  [`G\u2019`, 'Ғ'], [`g\u2019`, 'ғ'],
  ['Shch', 'Щ'], ['shch', 'щ'],
  ['Sh', 'Ш'], ['sh', 'ш'],
  ['Ch', 'Ч'], ['ch', 'ч'],
  ['Yo', 'Ё'], ['yo', 'ё'],
  ['Yu', 'Ю'], ['yu', 'ю'],
  ['Ya', 'Я'], ['ya', 'я'],
  ['Ts', 'Ц'], ['ts', 'ц'],
  [U_RIGHT, 'ъ'], ["'", 'ъ'], ['\u2019', 'ъ'],
  ['Q', 'Қ'], ['q', 'қ'],
  ['H', 'Ҳ'], ['h', 'ҳ'],
  ['X', 'Х'], ['x', 'х'],
  ['A', 'А'], ['a', 'а'],
  ['B', 'Б'], ['b', 'б'],
  ['V', 'В'], ['v', 'в'],
  ['G', 'Г'], ['g', 'г'],
  ['D', 'Д'], ['d', 'д'],
  ['E', 'Е'], ['e', 'е'],
  ['J', 'Ж'], ['j', 'ж'],
  ['Z', 'З'], ['z', 'з'],
  ['I', 'И'], ['i', 'и'],
  ['Y', 'Й'], ['y', 'й'],
  ['K', 'К'], ['k', 'к'],
  ['L', 'Л'], ['l', 'л'],
  ['M', 'М'], ['m', 'м'],
  ['N', 'Н'], ['n', 'н'],
  ['O', 'О'], ['o', 'о'],
  ['P', 'П'], ['p', 'п'],
  ['R', 'Р'], ['r', 'р'],
  ['S', 'С'], ['s', 'с'],
  ['T', 'Т'], ['t', 'т'],
  ['U', 'У'], ['u', 'у'],
  ['F', 'Ф'], ['f', 'ф'],
]

const latToCyr = (s) => {
  let out = s
  LAT_TO_CYR.forEach(([l, c]) => { out = out.split(l).join(c) })
  // Uzbek rule: 'e' at the start of a word becomes 'э', not 'е'.
  // 'е' is only used after a consonant (mid-word). Apply this AFTER
  // the dictionary replace, when every Latin e has become Cyrillic е.
  // Boundary = string start, or any non-letter char (whitespace,
  // punctuation, digits, dash, etc).
  out = out.replace(/(^|[^\p{L}])([еЕ])/gu, (_m, prefix, ch) => prefix + (ch === 'Е' ? 'Э' : 'э'))
  return out
}

const LangBadge = ({ children, dim = false }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium ${
    dim
      ? 'text-pink-400/70 bg-white/[0.03] border border-white/5'
      : 'text-pink-300 bg-pink-500/15 border border-pink-500/30'
  }`}>{children}</span>
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

export default function TransliteratorPage() {
  const [fromCyr, setFromCyr] = useState(true)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')

  const doConvert = () => {
    setOutput(fromCyr ? cyrToLat(input) : latToCyr(input))
  }

  const swap = () => {
    setFromCyr((v) => !v)
    setInput(output)
    setOutput(input)
  }

  const fromLabel = fromCyr ? 'Кирилл' : 'Lotin'
  const toLabel = fromCyr ? 'Lotin' : 'Кирилл'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
      className="flex flex-col gap-3 md:gap-5 md:h-full"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-pink-200 tracking-tight">Transliterator</h1>
          <p className="text-pink-400/60 text-[12px] md:text-[13px] mt-0.5">
            Кирилл ⇄ Lotin — Oʻzbek imlosiga rioya qilinadi
          </p>
        </div>
      </div>

      {/* Swap button anchored at center; side columns share equal width
          so the button never shifts when labels swap. */}
      <div className="glass rounded-2xl px-3 md:px-5 py-2.5 md:py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-5">
        <div className="justify-self-end">
          <LangBadge><span className="w-1.5 h-1.5 rounded-full bg-pink-300" />{fromLabel}</LangBadge>
        </div>
        <SwapButton onClick={swap} />
        <div className="justify-self-start">
          <LangBadge><span className="w-1.5 h-1.5 rounded-full bg-pink-300" />{toLabel}</LangBadge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 md:min-h-0 md:flex-1">
        <motion.div
          whileHover={{ y: -2, boxShadow: '0 20px 40px -20px rgba(236,72,153,0.25)' }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="glass rounded-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <LangBadge dim>{fromLabel}</LangBadge>
            <div className="flex items-center gap-1">
              <CardIconBtn title="Tozalash" onClick={() => setInput('')}><Trash2 size={15} /></CardIconBtn>
              <CardIconBtn title="Nusxa olish" onClick={() => navigator.clipboard?.writeText(input)}><Copy size={15} /></CardIconBtn>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={fromCyr ? 'Матнни киритинг…' : 'Matnni kiriting…'}
            className="flex-1 min-h-[180px] md:min-h-0 bg-transparent px-4 md:px-5 py-3 md:py-4 text-white/90 text-[15px] leading-relaxed resize-none outline-none placeholder-white/25"
          />
        </motion.div>

        <motion.div
          whileHover={{ y: -2, boxShadow: '0 20px 40px -20px rgba(236,72,153,0.25)' }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="glass rounded-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <LangBadge>{toLabel}</LangBadge>
            <div className="flex items-center gap-1">
              <CardIconBtn title="Nusxa olish" onClick={() => navigator.clipboard?.writeText(output)}><Copy size={15} /></CardIconBtn>
              <CardIconBtn title="Tozalash" onClick={() => setOutput('')}><Trash2 size={15} /></CardIconBtn>
            </div>
          </div>
          <div className="flex-1 min-h-[180px] md:min-h-0 px-4 md:px-5 py-3 md:py-4 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.p
                key={output}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-white/90 text-[15px] leading-relaxed whitespace-pre-wrap"
              >
                {output || (
                  <span className="text-white/25">
                    {fromCyr ? 'Натижа шу ерда пайдо бўлади…' : 'Natija bu yerda paydo boʻladi…'}
                  </span>
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Action button */}
      <div className="flex justify-center">
        <motion.button
          onClick={doConvert}
          disabled={!input.trim()}
          whileHover={input.trim() ? { scale: 1.03, boxShadow: '0 10px 30px -8px rgba(236,72,153,0.6)' } : {}}
          whileTap={input.trim() ? { scale: 0.97 } : {}}
          className={`px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 transition-all ${
            !input.trim()
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 to-pink-400 shadow-[0_10px_30px_-10px_rgba(236,72,153,0.7)]'
          }`}
        >
          <Sparkles size={17} />
          Oʻtkazish
        </motion.button>
      </div>

    </motion.div>
  )
}
