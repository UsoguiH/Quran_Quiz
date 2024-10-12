import React from 'react'
import { Heart, Coins, Star } from 'lucide-react'
import { motion } from 'framer-motion'

interface PlayerStatsProps {
  hearts: number
  tokens: number
  score: number
  questionCount: number
}

const PlayerStats: React.FC<PlayerStatsProps> = ({ hearts, tokens, score, questionCount }) => {
  return (
    <motion.div 
      className="flex flex-col mb-6 bg-gray-100 p-4 rounded-lg"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-2">
        <motion.div 
          className="flex items-center"
          whileHover={{ scale: 1.1 }}
        >
          <Coins className="text-yellow-500 mr-2" />
          <span className="font-bold">{tokens} تلميحات</span>
        </motion.div>
        <motion.div 
          className="flex items-center"
          whileHover={{ scale: 1.1 }}
        >
          <Star className="text-blue-500 mr-2" />
          <span className="font-bold">{score} / {questionCount}</span>
        </motion.div>
      </div>
      <div className="flex items-center justify-center mt-2">
        {[...Array(3)].map((_, index) => (
          <motion.div
            key={index}
            initial={{ scale: 1 }}
            animate={{ scale: index < hearts ? 1 : 0.8, opacity: index < hearts ? 1 : 0.5 }}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className={`w-8 h-8 mx-1 ${index < hearts ? 'text-red-500' : 'text-gray-300'}`}
              fill={index < hearts ? 'currentColor' : 'none'}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default PlayerStats