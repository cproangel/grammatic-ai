import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Languages, CheckCircle, ArrowLeftRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import EcoBackground from './components/EcoBackground'
import TranslatorPage from './pages/TranslatorPage'
import GrammarPage from './pages/GrammarPage'
import TransliteratorPage from './pages/TransliteratorPage'
import { api } from './config/api'

const navItems = [
  { id: 'translator', path: '/', icon: Languages, label: 'Tarjimon' },
  { id: 'grammar', path: '/grammar', icon: CheckCircle, label: 'Grammatika' },
  { id: 'translit', path: '/translit', icon: ArrowLeftRight, label: 'Transliterator' },
]

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [currentModel, setCurrentModel] = useState('gemini')
  const [isToggling, setIsToggling] = useState(false)

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  // Fetch current model on mount
  useEffect(() => {
    axios.get(api.modelCurrent)
      .then(res => setCurrentModel(res.data.current_model || 'gemini'))
      .catch(() => {})
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  const handleModelToggle = async (targetModel) => {
    if (targetModel === currentModel || isToggling) return
    
    const previousModel = currentModel
    setCurrentModel(targetModel)
    setIsToggling(true)
    
    try {
      const response = await axios.post(api.modelToggle, { model: targetModel })
      if (!response.data.success) {
        setCurrentModel(previousModel)
      }
    } catch (error) {
      console.error('Failed to toggle model:', error)
      setCurrentModel(previousModel)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* Sakura Background */}
      <EcoBackground mousePos={mousePos} />

      {/* Main Layout */}
      <div
        className="relative z-10 flex h-full"
        style={{ padding: '16px', gap: '16px' }}
      >
        {/* Sidebar */}
        <motion.aside 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-64 sidebar flex flex-col"
          style={{ paddingBottom: '16px' }}
        >
          {/* Logo & Title - Centered */}
          <div className="flex flex-col items-center justify-center text-center pt-8 pb-6 px-4">
            <motion.img 
              src="/logo.png" 
              alt="Logo" 
              className="w-44 h-44 object-contain drop-shadow-2xl"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
            <h1 className="text-3xl font-bold text-pink-300 mt-3">TilshunosAI</h1>
            <p className="text-xs text-pink-400/60 mt-1">
              Davlat ekologik ekspertizasi markazi
            </p>
          </div>

          <div className="divider mx-4 mb-2" />

          {/* Navigation */}
          <nav className="px-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <motion.button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`nav-btn w-full ${isActive ? 'active' : ''}`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </motion.button>
              )
            })}
          </nav>

          {/* Spacer - reduced */}
          <div className="flex-grow min-h-4" />

          {/* Model Toggle - 2 columns */}
          <div className="px-4 pb-4 mt-auto">
            <div className="divider mb-3" />
            
            {/* Glass Model Toggle Buttons - Side by Side */}
            <div className="flex gap-2">
              {/* Gemini Button */}
              <motion.button
                onClick={() => handleModelToggle('gemini')}
                disabled={isToggling}
                className={`flex-1 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 cursor-pointer
                  backdrop-blur-xl border relative overflow-hidden
                  ${currentModel === 'gemini' 
                    ? 'bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30 border-purple-400/60 shadow-[0_0_25px_rgba(168,85,247,0.4)]' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 opacity-50 hover:opacity-90'
                  }`}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                {currentModel === 'gemini' && (
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/20 to-pink-500/10"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <img src="/gemini.svg" alt="Gemini" className="w-10 h-10 object-contain" />
                </div>
                <span className="relative text-sm font-bold text-white">Gemini</span>
                {currentModel === 'gemini' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                )}
              </motion.button>

              {/* GPT Button */}
              <motion.button
                onClick={() => handleModelToggle('gpt')}
                disabled={isToggling}
                className={`flex-1 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all duration-300 cursor-pointer
                  backdrop-blur-xl border relative overflow-hidden
                  ${currentModel === 'gpt' 
                    ? 'bg-gradient-to-br from-emerald-500/30 via-teal-500/30 to-cyan-500/30 border-emerald-400/60 shadow-[0_0_25px_rgba(52,211,153,0.4)]' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 opacity-50 hover:opacity-90'
                  }`}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                {currentModel === 'gpt' && (
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/20 to-cyan-500/10"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <img src="/openai-logo.png" alt="OpenAI" className="w-10 h-10 object-contain" />
                </div>
                <span className="relative text-sm font-bold text-white">GPT</span>
                {currentModel === 'gpt' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                )}
              </motion.button>
            </div>
          </div>
        </motion.aside>

        {/* Main Content - No scroll */}
        <main
          className="flex-1 min-w-0 overflow-hidden flex flex-col"
          style={{ padding: '16px' }}
        >
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<TranslatorPage />} />
              <Route path="/grammar" element={<GrammarPage />} />
              <Route path="/translit" element={<TransliteratorPage />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App
