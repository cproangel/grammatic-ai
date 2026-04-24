import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRightLeft, Copy, Trash2, RefreshCw } from 'lucide-react'

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

// Cyrillic to Latin mapping - Complete
// Apostrophes: ʻ (U+02BB) for oʻ/gʻ, ʼ (U+02BC) for tutuq belgisi (ъ)
const cyrillicToLatin = {
  'А': 'A', 'а': 'a', 'Б': 'B', 'б': 'b', 'В': 'V', 'в': 'v',
  'Г': 'G', 'г': 'g', 'Ғ': "Gʻ", 'ғ': "gʻ", 'Д': 'D', 'д': 'd',
  'Е': 'E', 'е': 'e', 'Ё': 'Yo', 'ё': 'yo', 'Ж': 'J', 'ж': 'j',
  'З': 'Z', 'з': 'z', 'И': 'I', 'и': 'i', 'Й': 'Y', 'й': 'y',
  'К': 'K', 'к': 'k', 'Қ': 'Q', 'қ': 'q', 'Л': 'L', 'л': 'l',
  'М': 'M', 'м': 'm', 'Н': 'N', 'н': 'n', 'О': 'O', 'о': 'o',
  'Ў': "Oʻ", 'ў': "oʻ", 'П': 'P', 'п': 'p', 'Р': 'R', 'р': 'r',
  'С': 'S', 'с': 's', 'Т': 'T', 'т': 't', 'У': 'U', 'у': 'u',
  'Ф': 'F', 'ф': 'f', 'Х': 'X', 'х': 'x', 'Ҳ': 'H', 'ҳ': 'h',
  'Ц': 'Ts', 'ц': 'ts', 'Ч': 'Ch', 'ч': 'ch', 'Ш': 'Sh', 'ш': 'sh',
  'Щ': 'Sh', 'щ': 'sh', 'Ъ': "ʼ", 'ъ': "ʼ", 'Ы': 'I', 'ы': 'i',
  'Ь': '', 'ь': '', 'Э': 'E', 'э': 'e', 'Ю': 'Yu', 'ю': 'yu',
  'Я': 'Ya', 'я': 'ya'
}

// Latin to Cyrillic - Single characters
const latinToCyrillic = {
  'A': 'А', 'a': 'а', 'B': 'Б', 'b': 'б', 'D': 'Д', 'd': 'д',
  'E': 'Е', 'e': 'е', 'F': 'Ф', 'f': 'ф', 'G': 'Г', 'g': 'г',
  'H': 'Ҳ', 'h': 'ҳ', 'I': 'И', 'i': 'и', 'J': 'Ж', 'j': 'ж',
  'K': 'К', 'k': 'к', 'L': 'Л', 'l': 'л', 'M': 'М', 'm': 'м',
  'N': 'Н', 'n': 'н', 'O': 'О', 'o': 'о', 'P': 'П', 'p': 'п',
  'Q': 'Қ', 'q': 'қ', 'R': 'Р', 'r': 'р', 'S': 'С', 's': 'с',
  'T': 'Т', 't': 'т', 'U': 'У', 'u': 'у', 'V': 'В', 'v': 'в',
  'X': 'Х', 'x': 'х', 'Y': 'Й', 'y': 'й', 'Z': 'З', 'z': 'з'
}

// Latin multi-char to Cyrillic - ORDER MATTERS (longest first).
// Accept ASCII ', backtick `, U+02BB ʻ, U+02BC ʼ and U+2019 ’ as apostrophes.
const latinMultiToCyrillic = [
  // O' variants → Ў/ў
  ["Oʻ", 'Ў'], ["oʻ", 'ў'],
  ["O'", 'Ў'], ["o'", 'ў'],
  ["O`", 'Ў'], ["o`", 'ў'],
  ["O\u2019", 'Ў'], ["o\u2019", 'ў'],
  // G' variants → Ғ/ғ
  ["Gʻ", 'Ғ'], ["gʻ", 'ғ'],
  ["G'", 'Ғ'], ["g'", 'ғ'],
  ["G`", 'Ғ'], ["g`", 'ғ'],
  ["G\u2019", 'Ғ'], ["g\u2019", 'ғ'],
  // Digraphs
  ['Sh', 'Ш'], ['sh', 'ш'], ['SH', 'Ш'],
  ['Ch', 'Ч'], ['ch', 'ч'], ['CH', 'Ч'],
  ['Yo', 'Ё'], ['yo', 'ё'], ['YO', 'Ё'],
  ['Yu', 'Ю'], ['yu', 'ю'], ['YU', 'Ю'],
  ['Ya', 'Я'], ['ya', 'я'], ['YA', 'Я'],
  ['Ts', 'Ц'], ['ts', 'ц'], ['TS', 'Ц'],
  // Tutuq belgisi → ъ
  ["ʼ", 'ъ'], ["'", 'ъ'], ["\u2019", 'ъ'],
]

function cyrToLat(text) {
  let result = ''
  for (let char of text) {
    result += cyrillicToLatin[char] !== undefined ? cyrillicToLatin[char] : char
  }
  return result
}

function latToCyr(text) {
  let result = ''
  let i = 0
  
  while (i < text.length) {
    let found = false
    
    // Try multi-char sequences first
    for (const [latin, cyrillic] of latinMultiToCyrillic) {
      if (text.slice(i, i + latin.length) === latin) {
        result += cyrillic
        i += latin.length
        found = true
        break
      }
    }
    
    if (!found) {
      const char = text[i]
      result += latinToCyrillic[char] !== undefined ? latinToCyrillic[char] : char
      i++
    }
  }
  
  return result
}

export default function TransliteratorPage() {
  const [direction, setDirection] = useState('cyr-to-lat')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [realtime, setRealtime] = useState(true)

  useEffect(() => {
    if (realtime) convert()
  }, [inputText, direction, realtime])

  const convert = () => {
    setOutputText(direction === 'cyr-to-lat' ? cyrToLat(inputText) : latToCyr(inputText))
  }

  const swapDirection = () => {
    setDirection(direction === 'cyr-to-lat' ? 'lat-to-cyr' : 'cyr-to-lat')
    setInputText(outputText)
    setOutputText(inputText)
  }

  const copyToClipboard = (text) => navigator.clipboard.writeText(text)
  const clearAll = () => { setInputText(''); setOutputText('') }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col overflow-hidden gap-6"
    >
      {/* Direction Selector & Toggle */}
      <div className="flex items-center justify-center gap-4 flex-shrink-0">
        <div className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
          direction === 'cyr-to-lat' 
            ? 'bg-pink-500/20 border border-pink-500/30 text-pink-400' 
            : 'bg-black/20 border border-pink-500/10 text-pink-400/50'
        }`}>
          Кирилл
        </div>

        <motion.button
          onClick={swapDirection}
          className="swap-btn"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowRightLeft size={18} />
        </motion.button>

        <div className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
          direction === 'lat-to-cyr' 
            ? 'bg-pink-500/20 border border-pink-500/30 text-pink-400' 
            : 'bg-black/20 border border-pink-500/10 text-pink-400/50'
        }`}>
          Lotin
        </div>
        
        {/* Realtime Toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none ml-6">
          <span className="text-sm text-pink-400/60">Real-time</span>
          <div 
            className={`w-12 h-6 rounded-full transition-colors relative ${realtime ? 'bg-pink-500' : 'bg-pink-900/50'}`}
            onClick={() => setRealtime(!realtime)}
          >
            <motion.div
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
              animate={{ left: realtime ? 28 : 4 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </label>
      </div>

      {/* Conversion Areas */}
      <div className="flex-1 grid grid-cols-2 gap-5 min-h-0 pb-4">
        {/* Input */}
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="card-header">
            <span className="card-header-title">
              {direction === 'cyr-to-lat' ? 'Кирилл' : 'Lotin'}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => copyToClipboard(inputText)} className="icon-btn">
                <Copy size={14} />
              </button>
              <button onClick={clearAll} className="icon-btn">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="card-body flex-1 min-h-0">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={direction === 'cyr-to-lat' 
                ? 'Кирилл ёзувида матн киритинг...' 
                : 'Lotin yozuvida matn kiriting...'}
              className="textarea-modern"
            />
          </div>
        </div>

        {/* Output */}
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="card-header">
            <span className="card-header-title">
              {direction === 'cyr-to-lat' ? 'Lotin' : 'Кирилл'}
            </span>
            <button onClick={() => copyToClipboard(outputText)} className="icon-btn">
              <Copy size={14} />
            </button>
          </div>
          <div className="card-body flex-1 overflow-auto">
            <p className={`text-[15px] leading-[1.8] whitespace-pre-wrap ${outputText ? 'text-white' : 'text-pink-400/40'}`}>
              {outputText || (direction === 'cyr-to-lat'
                ? "Natija shu yerda paydo boʻladi..."
                : "Натижа шу ерда пайдо бўлади...")}
            </p>
          </div>
        </div>
      </div>

      {/* Convert Button */}
      {!realtime && (
        <div className="flex justify-center pt-6 pb-4 flex-shrink-0">
          <motion.button
            onClick={convert}
            disabled={!inputText.trim()}
            className="btn-primary flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={18} />
            <span>Konvertatsiya qilish</span>
          </motion.button>
        </div>
      )}

      {/* Reference */}
      <div className="mt-4 py-3 px-5 bg-pink-500/5 border border-pink-500/10 rounded-xl flex-shrink-0">
        <p className="text-xs text-pink-400/50 text-center leading-relaxed">
          <span className="text-pink-400/70 font-medium">Maxsus harflar:</span>{' '}
          Ғ/ғ = Gʻ/gʻ | Қ/қ = Q/q | <span className="text-pink-400">Ў/ў = Oʻ/oʻ</span> | Ҳ/ҳ = H/h | Ш/ш = Sh/sh | Ч/ч = Ch/ch
        </p>
      </div>
    </motion.div>
  )
}
