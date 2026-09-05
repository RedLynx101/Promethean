import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center p-12"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.8 }}
    >
      <div className="w-full h-full bg-[#161b22] border border-[#00d4ff]/20 rounded-xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,212,255,0.05)]">
        
        {/* Header */}
        <div className="h-16 border-b border-[#00d4ff]/20 flex items-center px-8 justify-between">
          <h2 className="font-display font-bold text-xl text-white">Command Center</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="font-body text-xs text-[#00ff88]">Live Fleet Health</span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="flex-1 p-8 grid grid-cols-3 gap-6">
          
          {phase >= 1 && (
            <motion.div className="col-span-1 bg-[#0a0e14] rounded-lg border border-white/5 p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-xs font-display text-[#e6edf3]/50 mb-4">SUCCESS RATE</div>
              <div className="text-5xl font-body text-[#00ff88]">99.8%</div>
              <div className="mt-4 w-full h-32 flex items-end gap-2">
                {[40, 70, 45, 90, 65, 85, 100, 95].map((h, i) => (
                  <motion.div key={i} className="flex-1 bg-[#00ff88]/20 rounded-t" style={{ height: `${h}%` }}
                    initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 1 + i * 0.05 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {phase >= 2 && (
            <motion.div className="col-span-2 bg-[#0a0e14] rounded-lg border border-white/5 p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-xs font-display text-[#e6edf3]/50 mb-4">EXECUTION TIMELINES</div>
              <div className="space-y-4">
                {[
                  { label: "Refund Processing", ms: "120ms", w: "20%", c: "#4CAF50" },
                  { label: "Intent Categorization", ms: "450ms", w: "45%", c: "#9C27B0" },
                  { label: "Agent Fallback", ms: "1200ms", w: "80%", c: "#E91E63" }
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-40 font-body text-xs text-[#e6edf3]/70 truncate">{row.label}</div>
                    <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden relative">
                      <motion.div className="h-full" style={{ width: row.w, backgroundColor: row.c }}
                        initial={{ width: 0 }} animate={{ width: row.w }} transition={{ duration: 1, delay: 1.5 + i * 0.2 }}
                      />
                    </div>
                    <div className="w-16 font-body text-xs text-right text-white">{row.ms}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {phase >= 3 && (
            <>
              <motion.div className="col-span-2 bg-[#0a0e14] rounded-lg border border-white/5 p-6 flex flex-col justify-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-xs font-display text-[#e6edf3]/50 mb-4">LIVE ALERTS</div>
                <div className="space-y-2">
                  <div className="text-sm font-body text-[#ff00aa] bg-[#ff00aa]/10 p-2 rounded">Warning: L4 token usage spike detected in workflow #849</div>
                  <div className="text-sm font-body text-[#00d4ff] bg-[#00d4ff]/10 p-2 rounded">Info: HITL approval rate optimal.</div>
                </div>
              </motion.div>
              <motion.div className="col-span-1 bg-[#0a0e14] rounded-lg border border-white/5 p-6 flex flex-col items-center justify-center text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-xs font-display text-[#e6edf3]/50 mb-2">COST SAVINGS YTD</div>
                <div className="text-4xl font-body text-[#00d4ff] text-glow-cyan">42%</div>
                <div className="text-xs font-body text-[#e6edf3]/50 mt-2">vs. pure L5 approach</div>
              </motion.div>
            </>
          )}

        </div>
      </div>
    </motion.div>
  );
}
