import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState } from 'react'

export const HolographicCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useTransform(y, [-100, 100], [10, -10])
  const rotateY = useTransform(x, [-100, 100], [-10, 10])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(e.clientX - centerX)
    y.set(e.clientY - centerY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      style={{
        perspective: 1000,
        rotateX: useSpring(rotateX, { stiffness: 300, damping: 30 }),
        rotateY: useSpring(rotateY, { stiffness: 300, damping: 30 }),
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative group transform-style-3d ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay z-50" />
      
      {/* Holographic Sheen */}
      <div 
        className="absolute inset-0 z-40 opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity duration-500 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.5)_50%,transparent_75%)] bg-[length:250%_100%] animate-shine"
        style={{ mixBlendMode: 'color-dodge' }}
      />

      <div className="relative h-full w-full bg-black/40 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-300 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_30px_rgba(0,255,204,0.2)]">
        {children}
      </div>
    </motion.div>
  )
}
