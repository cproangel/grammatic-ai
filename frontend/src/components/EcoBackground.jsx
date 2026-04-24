import { useEffect, useMemo, useState } from 'react'

// Single sakura petal used in the falling animation
const PetalLite = ({ size = 14, color = '#f9a8d4' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2.5 C 8.3 4.5, 6.5 8, 7.2 12 C 7.7 13.9, 9 15.3, 10.9 15.8 L 11.3 15.1 L 12 16 L 12.7 15.1 L 13.1 15.8 C 15 15.3, 16.3 13.9, 16.8 12 C 17.5 8, 15.7 4.5, 12 2.5 Z"
      fill={color}
    />
  </svg>
)

const PETAL_COUNT = 22
const petalColors = ['#fbcfe8', '#f9a8d4', '#f472b6', '#fce7f3']

const FallingPetals = ({ parallax }) => {
  const petals = useMemo(() => {
    const arr = []
    for (let i = 0; i < PETAL_COUNT; i++) {
      arr.push({
        id: i,
        size: 8 + Math.random() * 12,
        opacity: 0.2 + Math.random() * 0.5,
        startX: Math.random() * 100,
        delay: Math.random() * 18,
        duration: 14 + Math.random() * 16,
        rotSpeed: 1 + Math.random() * 2,
      })
    }
    return arr
  }, [])

  const px = parallax?.x || 0
  const py = parallax?.y || 0

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translate(${px * 10}px, ${py * 5}px)`,
        transition: 'transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1)',
        willChange: 'transform',
      }}
    >
      {petals.map((p) => {
        const color = petalColors[p.id % petalColors.length]
        const fallName = `petal-fall-${p.id % 5}`
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.startX}vw`,
              top: '-40px',
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animation: `${fallName} ${p.duration}s linear ${p.delay}s infinite`,
              willChange: 'transform',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                animation: `petal-spin ${Math.max(4, p.duration / p.rotSpeed)}s linear ${p.delay}s infinite`,
                willChange: 'transform',
              }}
            >
              <PetalLite size={p.size} color={color} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// SVG sakura tree in the bottom-right corner — complements the video layer
const SakuraTree = () => {
  const blossoms = [
    { cx: 80, cy: 520, r: 8 }, { cx: 120, cy: 470, r: 10 }, { cx: 160, cy: 440, r: 7 },
    { cx: 200, cy: 400, r: 9 }, { cx: 240, cy: 380, r: 8 }, { cx: 290, cy: 350, r: 10 },
    { cx: 330, cy: 330, r: 7 }, { cx: 370, cy: 300, r: 9 }, { cx: 410, cy: 280, r: 8 },
    { cx: 260, cy: 280, r: 9 }, { cx: 220, cy: 260, r: 7 }, { cx: 180, cy: 240, r: 8 },
    { cx: 145, cy: 215, r: 10 }, { cx: 110, cy: 200, r: 7 },
    { cx: 350, cy: 220, r: 8 }, { cx: 320, cy: 190, r: 9 }, { cx: 290, cy: 165, r: 7 },
    { cx: 260, cy: 145, r: 10 },
    { cx: 440, cy: 340, r: 7 }, { cx: 470, cy: 380, r: 9 }, { cx: 500, cy: 420, r: 8 },
    { cx: 540, cy: 460, r: 10 }, { cx: 570, cy: 500, r: 7 },
    { cx: 60, cy: 560, r: 9 }, { cx: 40, cy: 590, r: 8 },
  ]

  return (
    <svg
      width="620"
      height="620"
      viewBox="0 0 620 620"
      style={{
        position: 'absolute',
        right: -40,
        bottom: -60,
        opacity: 0.18,
        filter: 'drop-shadow(0 0 20px rgba(236, 72, 153, 0.1))',
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="branch" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a0a1a" />
          <stop offset="100%" stopColor="#3a1530" />
        </linearGradient>
        <radialGradient id="blossom" cx="45%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#fce7f3" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#f9a8d4" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6" />
        </radialGradient>
        <filter id="bglow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className="sway-a" style={{ transformOrigin: '580px 620px' }}>
        <path
          d="M 600 620 Q 540 540 500 460 Q 460 380 420 320 Q 380 260 340 210 Q 310 170 280 140"
          stroke="url(#branch)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <g className="sway-b" style={{ transformOrigin: '440px 340px' }}>
          <path
            d="M 440 340 Q 380 300 320 270 Q 260 240 200 220 Q 150 205 100 200"
            stroke="url(#branch)"
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 280 255 Q 260 230 240 210 Q 220 195 200 190"
            stroke="url(#branch)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>
        <g className="sway-a" style={{ transformOrigin: '400px 300px' }}>
          <path
            d="M 400 300 Q 370 240 340 200 Q 310 160 270 130"
            stroke="url(#branch)"
            strokeWidth="3.8"
            fill="none"
            strokeLinecap="round"
          />
        </g>
        <g className="sway-b" style={{ transformOrigin: '500px 460px' }}>
          <path
            d="M 500 460 Q 540 490 570 520 Q 590 545 600 580"
            stroke="url(#branch)"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>
        <g className="sway-a" style={{ transformOrigin: '520px 500px' }}>
          <path
            d="M 520 500 Q 460 510 400 540 Q 350 565 310 585"
            stroke="url(#branch)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </g>
        <g filter="url(#bglow)">
          {blossoms.map((b, i) => (
            <g
              key={i}
              className={i % 2 ? 'sway-a' : 'sway-b'}
              style={{ transformOrigin: `${b.cx}px ${b.cy}px` }}
            >
              <circle cx={b.cx} cy={b.cy} r={b.r} fill="url(#blossom)" />
              <circle cx={b.cx - b.r * 0.4} cy={b.cy - b.r * 0.3} r={b.r * 0.6} fill="url(#blossom)" opacity="0.85" />
              <circle cx={b.cx + b.r * 0.5} cy={b.cy - b.r * 0.2} r={b.r * 0.55} fill="url(#blossom)" opacity="0.8" />
              <circle cx={b.cx + b.r * 0.2} cy={b.cy + b.r * 0.5} r={b.r * 0.5} fill="url(#blossom)" opacity="0.8" />
              <circle cx={b.cx} cy={b.cy} r={b.r * 0.25} fill="#fff1f7" opacity="0.6" />
            </g>
          ))}
        </g>
      </g>
    </svg>
  )
}

export default function EcoBackground() {
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let raf = null
    const onMove = (e) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1
        const ny = (e.clientY / window.innerHeight) * 2 - 1
        setParallax({ x: nx, y: ny })
        raf = null
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <>
      {/* Video layer — black pixels become transparent via screen blend */}
      <video
        className="sakura-video"
        src="/sakura-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      <div className="sakura-bg">
        {/* Warm radial glow under the tree corner */}
        <div
          style={{
            position: 'absolute',
            right: '-5%',
            bottom: '-5%',
            width: '55%',
            height: '70%',
            background:
              'radial-gradient(circle at 70% 70%, rgba(236, 72, 153, 0.12) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <FallingPetals parallax={parallax} />
      </div>
    </>
  )
}
