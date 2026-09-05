import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center px-[8vw]"
      initial={{ clipPath: 'inset(50% 0 50% 0)' }}
      animate={{ clipPath: 'inset(0% 0 0% 0)' }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="w-[45%] pr-[4vw]">
        {phase >= 1 && (
          <motion.h2
            className="font-display text-[3.5vw] font-bold text-white mb-[2vh] leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            The Over-Engineering{' '}
            <span className="text-[#ff00aa]">Problem</span>
          </motion.h2>
        )}
        {phase >= 2 && (
          <motion.p
            className="font-body text-[1.1vw] text-[#e6edf3]/60 leading-relaxed"
            initial={{ opacity: 0, filter: 'blur(6px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5 }}
          >
            Teams throw multi-agent systems at tasks that only need simple rules. Costly, slow, and risky.
          </motion.p>
        )}

        {phase >= 3 && (
          <motion.div
            className="mt-[3vh] flex gap-[1.5vw]"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {[
              { label: 'Cost', val: '47x', color: '#F44336' },
              { label: 'Latency', val: '12s', color: '#FF9800' },
              { label: 'Failure', val: '23%', color: '#E91E63' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="bg-[#161b22] border border-white/5 rounded-lg px-[1.5vw] py-[1vh]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 400, damping: 25 }}
              >
                <div className="font-body text-[0.65vw] text-[#e6edf3]/40 mb-[0.3vh]">{stat.label}</div>
                <div className="font-display text-[1.8vw] font-bold" style={{ color: stat.color }}>{stat.val}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <div className="w-[45%] relative flex items-center justify-center">
        {phase >= 2 && (
          <motion.div
            className="relative w-[25vw] h-[25vw]"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
          >
            <motion.div
              className="absolute inset-0 border border-[#ff00aa]/20 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-[8%] border border-[#ff00aa]/35 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-[20%] border-2 border-[#ff00aa]/50 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-[35%] border-2 border-[#E91E63]/60 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />

            {phase >= 3 && (
              <>
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                  <motion.div
                    key={deg}
                    className="absolute w-[1.5vw] h-[1.5vw] rounded-full bg-[#E91E63]/60"
                    style={{
                      top: `${50 + 42 * Math.sin((deg * Math.PI) / 180)}%`,
                      left: `${50 + 42 * Math.cos((deg * Math.PI) / 180)}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                  />
                ))}
              </>
            )}

            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="bg-[#161b22] border border-[#E91E63] px-[1.5vw] py-[0.8vh] rounded"
                animate={{ boxShadow: ['0 0 10px rgba(233,30,99,0.3)', '0 0 25px rgba(233,30,99,0.5)', '0 0 10px rgba(233,30,99,0.3)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="font-display text-[1.2vw] text-[#E91E63] font-bold">L5 Multi-Agent</span>
              </motion.div>
            </div>
          </motion.div>
        )}

        {phase >= 4 && (
          <motion.div
            className="absolute -bottom-[2vh] right-0 font-body text-[0.7vw] text-[#ff00aa]/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            When a simple L0 rule would suffice
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
