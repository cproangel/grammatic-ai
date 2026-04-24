import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Wand2, Copy, Trash2, ArrowRight, Pencil } from 'lucide-react'
import axios from 'axios'
import { api } from '../config/api'

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export default function GrammarPage() {
  const [language, setLanguage] = useState('uz')
  const [inputText, setInputText] = useState('')
  const [errors, setErrors] = useState([])
  const [correctedText, setCorrectedText] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleCheck = async () => {
    if (!inputText.trim()) return

    setIsChecking(true)
    setShowResults(false)

    try {
      const response = await axios.post(api.grammarCheck, {
        text: inputText,
        language: language
      })
      setErrors(response.data.errors || [])
      setCorrectedText(response.data.corrected_text || inputText)
      setShowResults(true)
    } catch (error) {
      console.error('Grammar check error:', error)
      const errorMsg = language === 'ru'
        ? 'Произошла ошибка при проверке'
        : 'Tekshirishda xatolik yuz berdi'
      setErrors([{ message: errorMsg, type: 'error' }])
    } finally {
      setIsChecking(false)
    }
  }

  const handleFixAll = async () => {
    if (!correctedText) return

    setIsFixing(true)
    try {
      setInputText(correctedText)
      setErrors([])
      setShowResults(false)
    } finally {
      setIsFixing(false)
    }
  }

  const clearAll = () => {
    setInputText('')
    setErrors([])
    setCorrectedText('')
    setShowResults(false)
  }

  const backToEdit = () => {
    setShowResults(false)
    setErrors([])
    setCorrectedText('')
  }

  const copyText = (text) => {
    navigator.clipboard.writeText(text)
  }

  const renderHighlightedText = () => {
    if (!showResults || errors.length === 0) {
      return <span>{inputText}</span>
    }

    // Filter errors that have valid offsets (>= 0)
    const validErrors = errors.filter(e =>
      e.offset !== undefined && e.offset >= 0 &&
      e.length !== undefined && e.length > 0 &&
      e.offset + e.length <= inputText.length
    )

    if (validErrors.length === 0) {
      // Fallback: try to find error words by searching in text
      const fallbackElements = []
      let remainingText = inputText
      let globalOffset = 0

      errors.forEach((error, idx) => {
        if (!error.word) return
        const wordIdx = remainingText.indexOf(error.word)
        if (wordIdx === -1) return

        if (wordIdx > 0) {
          fallbackElements.push(
            <span key={`pre-${idx}`}>{remainingText.slice(0, wordIdx)}</span>
          )
        }
        fallbackElements.push(
          <span key={`err-${idx}`} className="error-word" title={error.message || 'Xatolik'}>
            {error.word}
          </span>
        )
        remainingText = remainingText.slice(wordIdx + error.word.length)
      })

      if (remainingText) {
        fallbackElements.push(<span key="rest">{remainingText}</span>)
      }

      return fallbackElements.length > 1 ? fallbackElements : <span>{inputText}</span>
    }

    // Use server-computed offsets
    const sortedErrors = [...validErrors].sort((a, b) => a.offset - b.offset)
    const elements = []
    let lastIndex = 0

    sortedErrors.forEach((error, idx) => {
      if (error.offset > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>{inputText.slice(lastIndex, error.offset)}</span>
        )
      }
      elements.push(
        <span
          key={`error-${idx}`}
          className="error-word"
          title={error.message || 'Xatolik'}
        >
          {inputText.slice(error.offset, error.offset + error.length)}
        </span>
      )
      lastIndex = error.offset + error.length
    })

    if (lastIndex < inputText.length) {
      elements.push(<span key="text-end">{inputText.slice(lastIndex)}</span>)
    }

    return elements.length > 0 ? elements : <span>{inputText}</span>
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
      <div className="flex justify-center flex-shrink-0">
        <div className="lang-selector">
          <button
            onClick={() => setLanguage('uz')}
            className={`lang-btn ${language === 'uz' ? 'active' : ''}`}
          >
            Oʻzbekcha
          </button>
          <button
            onClick={() => setLanguage('ru')}
            className={`lang-btn ${language === 'ru' ? 'active' : ''}`}
          >
            Русский
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-3 gap-5 min-h-0 pb-4">
        {/* Input Area */}
        <div className="col-span-2 glass-card flex flex-col overflow-hidden">
          <div className="card-header">
            <span className="card-header-title">
              {language === 'ru' ? 'Текст' : 'Matn'}
            </span>
            <div className="flex items-center gap-1">
              {showResults && (
                <button onClick={backToEdit} className="icon-btn" title={language === 'ru' ? 'Редактировать' : 'Tahrirlash'}>
                  <Pencil size={14} />
                </button>
              )}
              <button onClick={() => copyText(inputText)} className="icon-btn">
                <Copy size={14} />
              </button>
              <button onClick={clearAll} className="icon-btn">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="card-body flex-1 min-h-0">
            {showResults ? (
              <div
                className="text-[15px] leading-[1.8] whitespace-pre-wrap text-white h-full overflow-auto cursor-pointer hover:bg-white/5 rounded-lg p-2 transition-colors"
                onClick={backToEdit}
                title={language === 'ru' ? 'Нажмите для редактирования' : 'Tahrirlash uchun bosing'}
              >
                {renderHighlightedText()}
              </div>
            ) : (
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={language === 'ru'
                  ? 'Введите текст для проверки...'
                  : "Tekshirish uchun matn kiriting..."}
                className="textarea-modern"
              />
            )}
          </div>
        </div>

        {/* Errors Panel */}
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-400" />
              <span className="card-header-title">
                {language === 'ru' ? 'Ошибки' : 'Xatolar'}
              </span>
            </div>
            {errors.length > 0 && (
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                {errors.length}
              </span>
            )}
          </div>

          <div className="flex-1 p-4 overflow-auto space-y-3">
            <AnimatePresence>
              {showResults && errors.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center p-4"
                >
                  <CheckCircle size={48} className="text-pink-400 mb-3" />
                  <p className="text-pink-400 font-semibold">
                    {language === 'ru' ? 'Ошибок не найдено!' : 'Xatolar topilmadi!'}
                  </p>
                  <p className="text-pink-400/50 text-sm mt-2">
                    {language === 'ru' ? 'Текст написан правильно' : "Matn toʻgʻri yozilgan"}
                  </p>
                </motion.div>
              ) : (
                errors.map((error, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                  >
                    <p className="text-red-400 text-sm font-semibold mb-1">
                      {error.word || (language === 'ru' ? 'Ошибка' : 'Xatolik')}
                    </p>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {error.message}
                    </p>
                    {error.suggestion && (
                      <div className="mt-2 pt-2 border-t border-pink-500/20 flex items-center gap-2">
                        <ArrowRight size={12} className="text-pink-400" />
                        <span className="text-pink-400 text-xs font-medium">
                          {error.suggestion}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {!showResults && (
              <div className="flex items-center justify-center h-full text-pink-400/40 text-sm text-center px-4">
                {language === 'ru'
                  ? 'Нажмите "Проверить" для проверки текста'
                  : 'Matnni tekshirish uchun "Tekshirish" tugmasini bosing'}
              </div>
            )}
          </div>

          {showResults && errors.length > 0 && (
            <div className="p-4 border-t border-pink-500/10 flex-shrink-0">
              <motion.button
                onClick={handleFixAll}
                disabled={isFixing}
                className="w-full py-3 bg-pink-500/15 border border-pink-500/25 rounded-xl text-pink-400 font-medium flex items-center justify-center gap-2 hover:bg-pink-500/25 transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isFixing ? (
                  <div className="spinner" />
                ) : (
                  <Wand2 size={18} />
                )}
                {language === 'ru' ? 'Исправить все' : 'Hammasini tuzatish'}
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Check Button */}
      <div className="flex justify-center pt-6 pb-4 flex-shrink-0">
        <motion.button
          onClick={handleCheck}
          disabled={isChecking || !inputText.trim()}
          className="btn-primary flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isChecking ? (
            <>
              <div className="spinner" />
              <span>{language === 'ru' ? 'Проверка...' : 'Tekshirilmoqda...'}</span>
            </>
          ) : (
            <>
              <CheckCircle size={18} />
              <span>{language === 'ru' ? 'Проверить' : 'Tekshirish'}</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}
