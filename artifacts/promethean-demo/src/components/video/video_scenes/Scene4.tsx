import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const agents = [
  { name: 'Decomposition', desc: 'Break into steps', color: '#2196F3', icon: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z' },
  { name: 'System Selection', desc: 'Assign L0-L5', color: '#9C27B0', icon: 'M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z' },
  { name: 'Orchestration', desc: 'Wire tools & errors', color: '#FF9800', icon: 'M3 12h4l3-9 4 18 3-9h4' },
  { name: 'Governance', desc: 'Monitor & HITL', color: '#F44336', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z' },
];

const levels = [
  { level: 'L0', color: '#4CAF50', conf: 98 },
  { level: 'L1', color: '#2196F3', conf: 85 },
  { level: 'L2', color: '#9C27B0', conf: 72 },
  { level: 'L3', color: '#FF9800', conf: 60 },
  { level: 'L4', color: '#F44336', conf: 45 },
  { level: 'L5', color: '#E91E63', conf: 30 },
];

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setPhase(5), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-[6vw] py-[4vh]"
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(8px)' }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
    >
      {phase >= 1 && (
        <motion.h2
          className="font-display text-[2.5vw] font-bold text-white mb-[3vh] tracking-wide"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          The 4-Agent <span className="text-[#00d4ff] text-glow-cyan">Pipeline</span>
        </motion.h2>
      )}

      <div className="flex w-full max-w-[80vw] justify-between relative items-start">
        <svg className="absolute top-[5vh] left-[8%] w-[84%] h-[2vh]" viewBox="0 0 1000 20" preserveAspectRatio="none">
          {phase >= 2 && (
            <motion.path
              d="M0 10 L1000 10"
              stroke="#00d4ff"
              strokeWidth="2"
              strokeDasharray="8 4"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.5))' }}
            />
          )}
        </svg>

        {agents.map((agent, i) => (
          <div key={i} className="relative flex flex-col items-center z-10" style={{ width: '22%' }}>
            {phase >= 2 && (
              <motion.div
                className="w-[8vh] h-[8vh] rounded-lg flex items-center justify-center mb-[1.5vh]"
                style={{ backgroundColor: agent.color, boxShadow: `0 0 25px ${agent.color}50` }}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: i * 0.15 }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <motion.path
                    d={agent.icon}
                    stroke="white"
                    strokeWidth="1.5"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
                  />
                </svg>
              </motion.div>
            )}
            {phase >= 3 && (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="font-display text-[0.9vw] font-bold text-white mb-[0.5vh]">{agent.name}</div>
                <div className="font-body text-[0.7vw] text-[#e6edf3]/50">{agent.desc}</div>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {phase >= 4 && (
        <motion.div
          className="mt-[4vh] w-full max-w-[70vw]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-[0.7vw] font-display text-[#e6edf3]/40 mb-[1.5vh] tracking-widest">SYSTEM SELECTION: CONFIDENCE SCORES</div>
          <div className="flex gap-[1vw]">
            {levels.map((l, i) => (
              <motion.div
                key={l.level}
                className="flex-1 bg-[#161b22] rounded-lg border p-[1vh] text-center"
                style={{ borderColor: `${l.color}40` }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 25 }}
              >
                <div className="font-display text-[0.9vw] font-bold mb-[0.5vh]" style={{ color: l.color }}>{l.level}</div>
                <div className="w-full h-[0.4vh] bg-white/10 rounded-full overflow-hidden mb-[0.5vh]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: l.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${l.conf}%` }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div className="font-body text-[0.65vw] text-[#e6edf3]/50">{l.conf}%</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {phase >= 5 && (
        <motion.div
          className="absolute bottom-[4vh] right-[6vw] flex items-center gap-[0.5vw]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="w-[0.8vh] h-[0.8vh] rounded-full bg-[#00ff88] animate-pulse" />
          <span className="font-body text-[0.7vw] text-[#00ff88]">Pipeline Active</span>
        </motion.div>
      )}
    </motion.div>
  );
}
