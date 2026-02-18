import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'

// Falling sakura petal component with CSS shapes
function SakuraPetal({ delay, duration, startX, size, rotation, drift }) {
  return (
    <div
      className="sakura-petal"
      style={{
        left: startX,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        '--size': `${size}px`,
        '--rotation': `${rotation}deg`,
        '--drift': `${drift}px`,
      }}
    />
  )
}

// Sakura branch image component
function SakuraBranch() {
  return (
    <div className="sakura-branch-container">
      <img 
        src="/sakura.png" 
        alt=""
        className="sakura-branch-img"
      />
    </div>
  )
}

// Glowing orb component - sakura colors
function GlowOrb({ x, y, size, color, delay }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3]
      }}
      transition={{
        duration: 4,
        delay: delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  )
}

export default function EcoBackground({ mousePos }) {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight })
    
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Generate falling sakura petals with stable values
  const petals = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      delay: i * 1.2,
      duration: 8 + (i % 6) * 2,
      startX: `${3 + (i * 3.8) % 94}%`,
      size: 8 + (i % 4) * 4,
      rotation: (i * 45) % 360,
      drift: (i % 2 === 0 ? 1 : -1) * (15 + (i * 7) % 25)
    }))
  }, [])

  // Generate glow orbs - sakura colors
  const orbs = useMemo(() => [
    { id: 1, x: '10%', y: '20%', size: 300, color: 'rgba(244, 114, 182, 0.12)', delay: 0 },
    { id: 2, x: '80%', y: '70%', size: 250, color: 'rgba(253, 164, 175, 0.1)', delay: 1 },
    { id: 3, x: '60%', y: '10%', size: 200, color: 'rgba(249, 168, 212, 0.08)', delay: 2 },
    { id: 4, x: '30%', y: '60%', size: 280, color: 'rgba(244, 114, 182, 0.08)', delay: 1.5 },
  ], [])

  return (
    <div className="eco-background">
      {/* Sakura branch decoration - top left */}
      <SakuraBranch />
      
      {/* Gradient mesh */}
      <div className="absolute inset-0 opacity-30">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(244, 114, 182, 0.05)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Glow orbs */}
      {orbs.map(orb => (
        <GlowOrb key={orb.id} {...orb} />
      ))}

      {/* Falling sakura petals */}
      {petals.map(petal => (
        <SakuraPetal key={petal.id} {...petal} />
      ))}

      {/* Top gradient overlay */}
      <div 
        className="absolute top-0 left-0 right-0 h-40"
        style={{
          background: 'linear-gradient(180deg, rgba(26, 10, 18, 0.8) 0%, transparent 100%)'
        }}
      />

      {/* Bottom gradient overlay */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{
          background: 'linear-gradient(0deg, rgba(26, 10, 18, 0.9) 0%, transparent 100%)'
        }}
      />

      {/* Mouse follower glow - sakura style */}
      {mousePos && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: 450,
            height: 450,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(244, 114, 182, 0.18) 0%, rgba(253, 164, 175, 0.08) 40%, transparent 70%)',
            filter: 'blur(3px)',
          }}
          animate={{
            x: mousePos.x - 225,
            y: mousePos.y - 225,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150
          }}
        />
      )}
    </div>
  )
}
