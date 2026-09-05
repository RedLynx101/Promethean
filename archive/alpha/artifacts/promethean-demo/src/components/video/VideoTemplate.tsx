import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';

const SCENE_DURATIONS = {
  hook: 8500,
  problem: 8500,
  intake: 10000,
  pipeline: 11500,
  editor: 10000,
  dashboard: 10000,
  closing: 8500,
};

const orbPositions = [
  { x: '50vw', y: '50vh', scale: 1.2, opacity: 0.12 },
  { x: '75vw', y: '30vh', scale: 1.8, opacity: 0.08 },
  { x: '25vw', y: '60vh', scale: 1.0, opacity: 0.1 },
  { x: '50vw', y: '40vh', scale: 2.2, opacity: 0.06 },
  { x: '20vw', y: '30vh', scale: 0.8, opacity: 0.15 },
  { x: '80vw', y: '70vh', scale: 1.5, opacity: 0.1 },
  { x: '50vw', y: '50vh', scale: 1.0, opacity: 0.14 },
];

const accentLinePositions = [
  { left: '20%', width: '60%', top: '85%', opacity: 0.3 },
  { left: '5%', width: '40%', top: '50%', opacity: 0.5 },
  { left: '30%', width: '40%', top: '15%', opacity: 0.2 },
  { left: '10%', width: '80%', top: '90%', opacity: 0.4 },
  { left: '0%', width: '100%', top: '95%', opacity: 0.15 },
  { left: '15%', width: '70%', top: '10%', opacity: 0.3 },
  { left: '25%', width: '50%', top: '88%', opacity: 0.4 },
];

const hexPositions = [
  { x: '85vw', y: '15vh', rotate: 0, scale: 1 },
  { x: '10vw', y: '80vh', rotate: 60, scale: 0.8 },
  { x: '90vw', y: '75vh', rotate: 120, scale: 1.2 },
  { x: '15vw', y: '15vh', rotate: 180, scale: 0.6 },
  { x: '80vw', y: '50vh', rotate: 240, scale: 1.1 },
  { x: '5vw', y: '40vh', rotate: 300, scale: 0.9 },
  { x: '85vw', y: '20vh', rotate: 360, scale: 1 },
];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0a0e14] text-[#e6edf3]">

      <div className="absolute inset-0 bg-grid-pattern opacity-40" />

      <motion.div
        className="absolute w-[60vw] h-[60vw] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, #00d4ff, transparent 70%)' }}
        animate={{
          x: `calc(${orbPositions[currentScene].x} - 30vw)`,
          y: `calc(${orbPositions[currentScene].y} - 30vw)`,
          scale: orbPositions[currentScene].scale,
          opacity: orbPositions[currentScene].opacity,
        }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        className="absolute w-[40vw] h-[40vw] rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, #ff00aa, transparent 70%)' }}
        animate={{
          x: ['60vw', '10vw', '50vw'],
          y: ['20vh', '60vh', '40vh'],
          opacity: [0.04, 0.06, 0.04],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent"
        animate={accentLinePositions[currentScene]}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.div
        className="absolute w-[4vw] h-[4vw] border border-[#00d4ff]/15 rounded-lg"
        animate={{
          x: hexPositions[currentScene].x,
          y: hexPositions[currentScene].y,
          rotate: hexPositions[currentScene].rotate,
          scale: hexPositions[currentScene].scale,
        }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.div
        className="absolute w-[2vw] h-[2vw] rounded-full border border-[#ff00aa]/10"
        animate={{
          x: ['70vw', '30vw', '55vw', '15vw', '80vw', '45vw', '70vw'][currentScene],
          y: ['75vh', '25vh', '65vh', '45vh', '15vh', '85vh', '75vh'][currentScene],
          scale: [1, 1.5, 0.8, 1.2, 0.7, 1.3, 1][currentScene],
        }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="hook" />}
        {currentScene === 1 && <Scene2 key="problem" />}
        {currentScene === 2 && <Scene3 key="intake" />}
        {currentScene === 3 && <Scene4 key="pipeline" />}
        {currentScene === 4 && <Scene5 key="editor" />}
        {currentScene === 5 && <Scene6 key="dashboard" />}
        {currentScene === 6 && <Scene7 key="closing" />}
      </AnimatePresence>
    </div>
  );
}
