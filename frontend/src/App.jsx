import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Languages, CheckCircle, Replace } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import EcoBackground from './components/EcoBackground'
import TranslatorPage from './pages/TranslatorPage'
import GrammarPage from './pages/GrammarPage'
import TransliteratorPage from './pages/TransliteratorPage'

const NAV_ITEMS = [
  { path: '/',         icon: Languages,    label: 'Tarjimon',       hint: 'Переводчик' },
  { path: '/grammar',  icon: CheckCircle,  label: 'Grammatika',     hint: 'Проверка' },
  { path: '/translit', icon: Replace,      label: 'Transliterator', hint: 'Кирилл ⇄ Lotin' },
]

function App() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen w-screen h-screen flex text-white antialiased">
      <EcoBackground />

      {/* Sidebar */}
      <aside className="relative z-10 w-64 shrink-0 h-screen p-5 flex flex-col gap-6">
        {/* Logo block — top-left */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          className="flex items-start gap-3 px-1 pt-1"
        >
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-pink-500/15 to-pink-400/5 border border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.25)]">
              <img src="/logoeco.png" alt="EcoLinguaAI" className="w-11 h-11 object-contain" />
            </div>
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-300 logo-glow" />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-semibold tracking-tight text-pink-200 leading-tight">
              EcoLingua<span className="text-pink-400">AI</span>
            </div>
            <div className="text-[10.5px] text-pink-400/60 leading-snug mt-0.5 tracking-wide">
              Davlat ekologik<br />ekspertizasi markazi
            </div>
          </div>
        </motion.div>

        {/* Nav */}
        <nav className="flex flex-col gap-1.5 mt-2">
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors ${
                  isActive
                    ? 'bg-pink-500/20 border border-pink-500/30 text-pink-300 shadow-[0_0_20px_-6px_rgba(236,72,153,0.4)]'
                    : 'border border-transparent text-white/70 hover:text-pink-200 hover:bg-white/[0.04] hover:border-white/5'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill-indicator"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-pink-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={18} className={isActive ? 'text-pink-300' : 'text-white/50 group-hover:text-pink-300/80'} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium leading-tight">{item.label}</div>
                  <div className={`text-[10.5px] leading-tight mt-0.5 ${isActive ? 'text-pink-400/70' : 'text-white/30'}`}>
                    {item.hint}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* Footer status card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass rounded-xl p-3 text-[11px]"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-400" />
            </span>
            <span className="text-pink-300 font-medium">AI faol</span>
            <span className="text-pink-400/60 ml-auto">v3.0</span>
          </div>
          <div className="text-pink-400/60 leading-snug">
            Gemini 3 Flash orqali tarjima.
          </div>
        </motion.div>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 h-screen min-w-0 p-6 pl-2 overflow-hidden">
        <div className="h-full glass rounded-3xl p-6 flex flex-col overflow-hidden" style={{ backdropFilter: 'blur(24px)' }}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"         element={<TranslatorPage />} />
              <Route path="/grammar"  element={<GrammarPage />} />
              <Route path="/translit" element={<TransliteratorPage />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export default App
