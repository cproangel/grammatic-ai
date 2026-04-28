import { motion } from 'framer-motion'
import { Zap, Sparkles } from 'lucide-react'

const TIERS = [
  { k: 'flash', label: 'Flash', Icon: Zap,      hint: 'Tezkor' },
  { k: 'pro',   label: 'Pro',   Icon: Sparkles, hint: 'Aniqroq' },
]

/** Flash / Pro model picker. layoutId must be unique per page so the
 *  framer-motion sliding indicator doesn't mix between toggles. */
export default function TierToggle({ tier, onChange, layoutId }) {
  return (
    <div className="glass rounded-xl p-1 flex items-center" title="AI rejimi">
      {TIERS.map((opt) => {
        const Icon = opt.Icon
        const active = tier === opt.k
        return (
          <button
            key={opt.k}
            onClick={() => onChange(opt.k)}
            title={opt.hint}
            className={`relative px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium flex items-center gap-1.5 transition-colors ${
              active ? 'text-pink-200' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 bg-pink-500/20 border border-pink-500/30 rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon size={13} />
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
