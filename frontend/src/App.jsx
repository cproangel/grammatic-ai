import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Languages, CheckCircle, ArrowLeftRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import EcoBackground from './components/EcoBackground'
import TranslatorPage from './pages/TranslatorPage'
import GrammarPage from './pages/GrammarPage'
import TransliteratorPage from './pages/TransliteratorPage'

const navItems = [
  { id: 'translator', path: '/', icon: Languages, label: 'Tarjimon' },
  { id: 'grammar', path: '/grammar', icon: CheckCircle, label: 'Grammatika' },
  { id: 'translit', path: '/translit', icon: ArrowLeftRight, label: 'Transliterator' },
]

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

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
