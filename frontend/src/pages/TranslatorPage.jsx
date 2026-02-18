import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRightLeft, Copy, Trash2, CheckCircle, Wand2 } from 'lucide-react'
import axios from 'axios'
import { api } from '../config/api'

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export default function TranslatorPage() {
  const [sourceLang, setSourceLang] = useState('ru')
  const [targetLang, setTargetLang] = useState('uz')
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [correctedText, setCorrectedText] = useState('')
  const [errorCount, setErrorCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [showCorrected, setShowCorrected] = useState(false)

  const handleSourceChange = (e) => {
    const text = e.target.value
    setSourceText(text)
    setCharCount(text.length)
  }

  const swapLanguages = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
    setCorrectedText('')
    setErrorCount(0)
    setShowCorrected(false)
  }

  const setSource = (lang) => {
    setSourceLang(lang)
    // Prevent same source and target
    if (lang === targetLang) {
      setTargetLang(lang === 'ru' ? 'uz' : 'ru')
    }
  }

  const setTarget = (lang) => {
    setTargetLang(lang)
    // Prevent same source and target
    if (lang === sourceLang) {
      setSourceLang(lang === 'ru' ? 'uz' : 'ru')
    }
  }

  const handleTranslate = async () => {
    if (!sourceText.trim()) return

    setIsLoading(true)
    setCorrectedText('')
    setErrorCount(0)
    setShowCorrected(false)

    try {
      // Use translate-with-grammar endpoint
      const response = await axios.post(api.translateWithGrammar, {
        text: sourceText,
        source_lang: sourceLang,
        target_lang: targetLang
      })

      setTranslatedText(response.data.translated_text)

      // If grammar found errors, show corrected version
      if (response.data.error_count > 0 && response.data.corrected_text !== response.data.translated_text) {
        setCorrectedText(response.data.corrected_text)
        setErrorCount(response.data.error_count)
      }
    } catch (error) {
      console.error('Translation error:', error)
      // Fallback to regular translate
      try {
        const fallback = await axios.post(api.translate, {
          text: sourceText,
          source_lang: sourceLang,
          target_lang: targetLang
        })
        setTranslatedText(fallback.data.translated_text)
      } catch (err) {
        setTranslatedText('Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const useCorrected = () => {
    setTranslatedText(correctedText)
    setCorrectedText('')
    setErrorCount(0)
    setShowCorrected(false)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const clearAll = () => {
    setSourceText('')
    setTranslatedText('')
    setCorrectedText('')
    setErrorCount(0)
    setCharCount(0)
    setShowCorrected(false)
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col overflow-hidden gap-6"
    >
      {/* Language Selector */}
      <div className="flex items-center justify-center gap-4 flex-shrink-0">
        <div className="lang-selector">
          <button
            onClick={() => setSource('ru')}
            className={`lang-btn ${sourceLang === 'ru' ? 'active' : ''}`}
          >
            Русский
          </button>
          <button
            onClick={() => setSource('uz')}
            className={`lang-btn ${sourceLang === 'uz' ? 'active' : ''}`}
          >
            O'zbekcha
          </button>
        </div>

        <motion.button
          onClick={swapLanguages}
          className="swap-btn"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowRightLeft size={18} />
        </motion.button>

        <div className="lang-selector">
          <button
            onClick={() => setTarget('ru')}
            className={`lang-btn ${targetLang === 'ru' ? 'active' : ''}`}
          >
            Русский
          </button>
          <button
            onClick={() => setTarget('uz')}
            className={`lang-btn ${targetLang === 'uz' ? 'active' : ''}`}
          >
            O'zbekcha
          </button>
        </div>

        <span className="text-xs text-pink-400/40 ml-4">{charCount} / 5000</span>
      </div>

      {/* Translation Areas */}
      <div className="flex-1 grid grid-cols-2 gap-5 min-h-0 pb-4">
        {/* Source Text */}
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="card-header">
            <span className="card-header-title">
              {sourceLang === 'ru' ? 'Русский' : "O'zbekcha"}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => copyToClipboard(sourceText)}
                className="icon-btn"
              >
                <Copy size={14} />
              </button>
              <button onClick={clearAll} className="icon-btn">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="card-body flex-1 min-h-0">
            <textarea
              value={sourceText}
              onChange={handleSourceChange}
              placeholder={sourceLang === 'ru' ? 'Введите текст для перевода...' : "Tarjima uchun matn kiriting..."}
              className="textarea-modern"
              maxLength={5000}
            />
          </div>
        </div>

        {/* Translated Text */}
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="card-header">
            <span className="card-header-title">
              {targetLang === 'ru' ? 'Русский' : "O'zbekcha"}
            </span>
            <div className="flex items-center gap-1">
              {/* Grammar correction indicator */}
              {correctedText && (
                <motion.button
                  onClick={() => setShowCorrected(!showCorrected)}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${showCorrected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {showCorrected ? <CheckCircle size={12} /> : <Wand2 size={12} />}
                  {showCorrected ? "Tuzatilgan" : `${errorCount} xato`}
                </motion.button>
              )}
              <button
                onClick={() => copyToClipboard(showCorrected && correctedText ? correctedText : translatedText)}
                className="icon-btn"
                disabled={!translatedText}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
          <div className="card-body flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="spinner" />
              </div>
            ) : (
              <div className="h-full">
                <p className={`text-[15px] leading-[1.8] whitespace-pre-wrap ${translatedText ? 'text-white' : 'text-pink-400/40'}`}>
                  {showCorrected && correctedText ? correctedText : (translatedText || (targetLang === 'ru' ? 'Перевод появится здесь...' : "Tarjima shu yerda paydo bo'ladi..."))}
                </p>

                {/* Apply corrected version button */}
                {correctedText && showCorrected && (
                  <motion.button
                    onClick={useCorrected}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 px-4 py-2 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs font-medium flex items-center gap-2 hover:bg-emerald-500/25 transition-colors"
                    whileHover={{ scale: 1.02 }}
                  >
                    <CheckCircle size={14} />
                    Tuzatilgan versiyani qo'llash
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Translate Button */}
      <div className="flex justify-center pt-6 pb-4 flex-shrink-0">
        <motion.button
          onClick={handleTranslate}
          disabled={isLoading || !sourceText.trim()}
          className="btn-primary flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <>
              <div className="spinner" />
              <span>Tarjima qilinmoqda...</span>
            </>
          ) : (
            'Tarjima qilish'
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}
