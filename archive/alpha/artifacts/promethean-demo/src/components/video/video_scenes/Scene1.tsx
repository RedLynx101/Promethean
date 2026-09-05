import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(100% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 1.15, filter: 'blur(12px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative z-10 flex flex-col items-center">
        {phase >= 1 && (
          <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <motion.rect
                x="4" y="4" width="72" height="72" rx="8"
                stroke="#00d4ff"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ filter: 'drop-shadow(0 0 12px rgba(0,212,255,0.6))' }}
              />
              <motion.rect
                x="20" y="20" width="40" height="40" rx="4"
                fill="#00d4ff"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 20 }}
                style={{ transformOrigin: '40px 40px', filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.8))' }}
              />
              <motion.path
                d="M32 40 L38 46 L50 34"
                stroke="#0a0e14"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.9, duration: 0.4, ease: 'circOut' }}
              />
            </svg>
          </motion.div>
        )}

        {phase >= 2 && (
          <motion.h1
            className="font-display text-[5vw] font-black tracking-[0.15em] text-white leading-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {'PROMETHEAN'.split('').map((char, i) => (
              <motion.span
                key={i}
                style={{ display: 'inline-block' }}
                initial={{ opacity: 0, y: 40, rotateX: -60 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25, delay: i * 0.04 }}
              >
                {char}
              </motion.span>
            ))}
          </motion.h1>
        )}

        {phase >= 3 && (
          <motion.div
            className="mt-2 overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-[2vw] font-display text-[#00d4ff] tracking-[0.4em] whitespace-nowrap text-glow-cyan">
              STUDIO
            </h2>
          </motion.div>
        )}

        {phase >= 4 && (
          <motion.p
            className="mt-6 text-[1.1vw] font-body text-[#e6edf3]/60 tracking-wider"
            initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6 }}
          >
            Right-size your AI. Every workflow, every step.
          </motion.p>
        )}
      </div>

      <motion.div
        className="absolute bottom-[15vh] left-1/2 -translate-x-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff]/40 to-transparent"
        initial={{ width: 0 }}
        animate={{ width: '60vw' }}
        transition={{ delay: 1, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  );
}
