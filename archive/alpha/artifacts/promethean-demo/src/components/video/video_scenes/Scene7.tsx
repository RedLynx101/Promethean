import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(100% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(15px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative z-10 flex flex-col items-center text-center">
        {phase >= 1 && (
          <motion.div
            className="flex items-center gap-[1.5vw] mb-[2vh]"
            initial={{ scale: 0.7, filter: 'blur(12px)' }}
            animate={{ scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div>
              <svg width="64" height="64" viewBox="0 0 80 80" fill="none">
                <motion.rect
                  x="4" y="4" width="72" height="72" rx="8"
                  stroke="#00d4ff"
                  strokeWidth="3"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ filter: 'drop-shadow(0 0 12px rgba(0,212,255,0.6))' }}
                />
                <motion.rect
                  x="20" y="20" width="40" height="40" rx="4"
                  fill="#00d4ff"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
                  style={{ transformOrigin: '40px 40px', filter: 'drop-shadow(0 0 16px rgba(0,212,255,0.7))' }}
                />
              </svg>
            </motion.div>
            <h1 className="font-display text-[5vw] font-black tracking-[0.12em] text-white text-glow-cyan">
              {'PROMETHEAN'.split('').map((char, i) => (
                <motion.span
                  key={i}
                  style={{ display: 'inline-block' }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.03, type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {char}
                </motion.span>
              ))}
            </h1>
          </motion.div>
        )}

        {phase >= 2 && (
          <motion.div
            className="overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[1.6vw] font-display text-[#00d4ff] tracking-[0.3em] whitespace-nowrap text-glow-cyan">
              STUDIO
            </p>
          </motion.div>
        )}

        {phase >= 3 && (
          <motion.p
            className="mt-[3vh] text-[1vw] font-body text-[#e6edf3]/50 tracking-wider"
            initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6 }}
          >
            The Command Center for AI Workflows
          </motion.p>
        )}
      </div>

      <motion.div
        className="absolute bottom-[12vh] left-1/2 -translate-x-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff]/30 to-transparent"
        initial={{ width: 0 }}
        animate={{ width: '50vw' }}
        transition={{ delay: 1.2, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </motion.div>
  );
}
