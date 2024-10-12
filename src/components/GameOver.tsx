import React from 'react'
import { motion } from 'framer-motion'

interface GameOverProps {
  score: number
  onRestart: () => void
}

const GameOver: React.FC<GameOverProps> = ({ score, onRestart }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <motion.h2 
        className="text-3xl font-bold mb-4"
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
      >
        انتهت اللعبة!
      </motion.h2>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-2xl mb-6"
      >
        نتيجتك النهائية: <span className="font-bold text-blue-600">{score} / 10</span>
      </motion.p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRestart}
        className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors duration-200"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        ابدأ من جديد
      </motion.button>
    </motion.div>
  )
}

export default GameOver