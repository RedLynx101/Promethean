import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8 }}
    >
      <div className="w-full max-w-3xl bg-[#161b22] border border-[#00d4ff]/30 rounded-xl overflow-hidden shadow-2xl shadow-[#00d4ff]/10">
        
        <div className="bg-[#0a0e14] px-6 py-4 border-b border-[#00d4ff]/20 flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-[#ff00aa]" />
          <div className="w-3 h-3 rounded-full bg-[#FF9800]" />
          <div className="w-3 h-3 rounded-full bg-[#4CAF50]" />
          <span className="ml-4 font-body text-sm text-[#00d4ff]">Workflow Intake Wizard</span>
        </div>

        <div className="p-8 space-y-6">
          {phase >= 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="text-xs text-[#e6edf3]/50 font-body mb-2 uppercase">Natural Language Description</div>
              <div className="bg-[#0a0e14] p-4 rounded text-sm font-body border border-white/5">
                <span className="text-[#00d4ff]">&gt;</span> Process incoming support tickets. If it's a refund request under $50, auto-approve. Otherwise, categorize and route to human agent.
              </div>
            </motion.div>
          )}

          {phase >= 2 && (
            <motion.div className="grid grid-cols-3 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-[#0a0e14] p-4 rounded border border-[#00ff88]/30">
                <div className="text-[#00ff88] text-xs font-display mb-1">Latency Goal</div>
                <div className="font-body text-lg">&lt; 500ms</div>
              </div>
              <div className="bg-[#0a0e14] p-4 rounded border border-[#00d4ff]/30">
                <div className="text-[#00d4ff] text-xs font-display mb-1">Budget per Run</div>
                <div className="font-body text-lg">$0.002</div>
              </div>
              <div className="bg-[#0a0e14] p-4 rounded border border-[#ff00aa]/30">
                <div className="text-[#ff00aa] text-xs font-display mb-1">Risk Tolerance</div>
                <div className="font-body text-lg">Low</div>
              </div>
            </motion.div>
          )}

          {phase >= 3 && (
            <motion.div 
              className="mt-6 flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="bg-[#00d4ff] text-[#0a0e14] px-6 py-2 rounded font-display font-bold text-sm tracking-wide">
                GENERATE PIPELINE
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
