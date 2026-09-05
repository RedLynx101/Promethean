import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const nodes = [
  { id: 'trigger', label: 'Ticket Received', level: 'Trigger', color: '#795548', x: 5, y: 40 },
  { id: 'l0-extract', label: 'Extract Amount', level: 'L0', color: '#4CAF50', x: 22, y: 25 },
  { id: 'l1-classify', label: 'Classify Priority', level: 'L1', color: '#2196F3', x: 22, y: 60 },
  { id: 'l2-intent', label: 'Parse Intent', level: 'L2', color: '#9C27B0', x: 42, y: 40 },
  { id: 'l3-agent', label: 'Draft Response', level: 'L3', color: '#FF9800', x: 58, y: 25 },
  { id: 'l4-tool', label: 'Query DB + APIs', level: 'L4', color: '#F44336', x: 58, y: 60 },
  { id: 'hitl', label: 'Human Review', level: 'HITL', color: '#607D8B', x: 78, y: 40 },
  { id: 'l5-multi', label: 'Escalation Swarm', level: 'L5', color: '#E91E63', x: 78, y: 70 },
];

const edges = [
  { from: 'trigger', to: 'l0-extract' },
  { from: 'trigger', to: 'l1-classify' },
  { from: 'l0-extract', to: 'l2-intent' },
  { from: 'l1-classify', to: 'l2-intent' },
  { from: 'l2-intent', to: 'l3-agent' },
  { from: 'l2-intent', to: 'l4-tool' },
  { from: 'l3-agent', to: 'hitl' },
  { from: 'l4-tool', to: 'hitl' },
  { from: 'l4-tool', to: 'l5-multi' },
];

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 2000),
      setTimeout(() => setPhase(5), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const getNodePos = (id: string) => {
    const n = nodes.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' }}
      animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="absolute inset-0 bg-[#0a0e14]">
        <div className="w-full h-full bg-grid-pattern opacity-20" />
      </div>

      <div className="absolute top-[3vh] left-[3vw] flex items-center gap-[1vw] z-20">
        {phase >= 1 && (
          <motion.h2
            className="font-display text-[1.8vw] font-bold text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Visual Workflow Editor
          </motion.h2>
        )}
      </div>

      {phase >= 1 && (
        <motion.div
          className="absolute top-[3vh] right-[3vw] flex gap-[0.8vw] z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { level: 'L0', color: '#4CAF50' },
            { level: 'L1', color: '#2196F3' },
            { level: 'L2', color: '#9C27B0' },
            { level: 'L3', color: '#FF9800' },
            { level: 'L4', color: '#F44336' },
            { level: 'L5', color: '#E91E63' },
          ].map((l, i) => (
            <motion.div
              key={l.level}
              className="flex items-center gap-[0.3vw]"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.06 }}
            >
              <div className="w-[0.8vw] h-[0.8vw] rounded-sm" style={{ backgroundColor: l.color }} />
              <span className="font-body text-[0.6vw] text-[#e6edf3]/60">{l.level}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
        {phase >= 3 && edges.map((edge, i) => {
          const from = getNodePos(edge.from);
          const to = getNodePos(edge.to);
          const midX = (from.x + to.x) / 2;
          return (
            <motion.path
              key={i}
              d={`M${from.x + 7} ${from.y} C${midX} ${from.y} ${midX} ${to.y} ${to.x} ${to.y}`}
              stroke="#00d4ff"
              strokeWidth="0.15"
              fill="none"
              opacity={0.4}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ filter: 'drop-shadow(0 0 2px rgba(0,212,255,0.3))' }}
            />
          );
        })}
      </svg>

      {phase >= 2 && nodes.map((node, i) => (
        <motion.div
          key={node.id}
          className="absolute z-20"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.08, type: 'spring', stiffness: 350, damping: 22 }}
        >
          <div
            className="w-[12vw] bg-[#161b22] rounded-lg border-2 p-[1vh] shadow-lg"
            style={{
              borderColor: node.color,
              boxShadow: `0 0 15px ${node.color}30`,
            }}
          >
            <div className="flex items-center justify-between mb-[0.3vh]">
              <span className="font-display text-[0.6vw] font-bold" style={{ color: node.color }}>{node.level}</span>
              <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ backgroundColor: node.color }} />
            </div>
            <div className="font-body text-[0.7vw] text-white">{node.label}</div>
          </div>
        </motion.div>
      ))}

      {phase >= 4 && (
        <motion.div
          className="absolute z-30"
          style={{
            left: '78%',
            top: '40%',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="w-[12vw] bg-[#161b22] rounded-lg border-2 border-[#607D8B] p-[1vh] shadow-lg"
               style={{ boxShadow: '0 0 15px rgba(96,125,139,0.3)' }}>
            <div className="flex items-center justify-between mb-[0.3vh]">
              <span className="font-display text-[0.6vw] font-bold text-[#607D8B]">HITL</span>
              <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-[#607D8B]" />
            </div>
            <div className="font-body text-[0.7vw] text-white mb-[0.5vh]">Human Review</div>
            {phase >= 5 && (
              <motion.div
                className="bg-[#00ff88]/15 text-[#00ff88] text-[0.6vw] py-[0.3vh] text-center rounded border border-[#00ff88]/40 font-display font-bold tracking-wider"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                APPROVED
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
