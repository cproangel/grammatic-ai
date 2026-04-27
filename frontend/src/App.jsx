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
    <div className="relative min-h-[100dvh] md:min-h-screen w-screen md:h-screen flex flex-col md:flex-row text-white antialiased">
      <EcoBackground />

      {/* Mobile top bar — only below md */}
      <header className="md:hidden relative z-10 flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-pink-500/15 to-pink-400/5 border border-pink-500/30 shrink-0">
          <img src="/logoeco.png" alt="EcoLinguaAI" className="w-8 h-8 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold tracking-tight text-pink-200 leading-tight">
            EcoLingua<span className="text-pink-400">AI</span>
          </div>
          <div className="text-[10px] text-pink-400/60 leading-tight truncate">
            Ekologiya va iqlim oʻzgarishi milliy qoʻmitasi
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[10.5px] text-pink-300 px-2 py-1 rounded-md bg-pink-500/10 border border-pink-500/25 shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pink-400" />
          </span>
          v3.0
        </span>
      </header>

      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex relative z-10 w-64 shrink-0 h-screen p-5 flex-col gap-6">
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
              Ekologiya va iqlim o‘zgarishi<br />milliy qo‘mitasi
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
          className="glass rounded-xl px-3 py-2.5 text-[11px]"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-400" />
            </span>
            <span className="text-pink-300 font-medium">AI faol</span>
            <span className="text-pink-400/60 ml-auto">v3.0</span>
          </div>
        </motion.div>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 md:h-screen min-w-0 p-3 md:p-6 md:pl-2 pb-[88px] md:pb-6 overflow-y-auto md:overflow-hidden">
        <div
          className="md:h-full rounded-2xl md:rounded-3xl p-3 md:p-6 flex flex-col md:overflow-hidden border border-pink-500/15"
          style={{
            background:
              'linear-gradient(135deg, rgba(20,8,24,0.35) 0%, rgba(10,6,16,0.25) 100%)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 40px -20px rgba(0,0,0,0.6)',
          }}
        >
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"         element={<TranslatorPage />} />
              <Route path="/grammar"  element={<GrammarPage />} />
              <Route path="/translit" element={<TransliteratorPage />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom nav — only below md */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-stretch border-t border-pink-500/15"
        style={{
          background: 'rgba(10,6,16,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                isActive ? 'text-pink-300' : 'text-white/55'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-10 rounded-full bg-pink-400"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={20} />
              <span className="text-[10.5px] font-medium leading-none">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default App
