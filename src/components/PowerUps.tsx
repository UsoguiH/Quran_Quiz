import React from 'react'
import { Clock, Eye } from 'lucide-react'
import { motion } from 'framer-motion'

interface PowerUpsProps {
  onUsePowerUp: (type: 'extraTime' | 'revealLetter') => void
}

const PowerUps: React.FC<PowerUpsProps> = ({ onUsePowerUp }) => {
  return (
    <motion.div 
      className="flex justify-center space-x-4 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.button
        onClick={() => onUsePowerUp('extraTime')}
        className="power-up-button flex items-center justify-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Clock className="mr-2" size={20} />
        وقت إضافي
      </motion.button>
      <motion.button
        onClick={() => onUsePowerUp('revealLetter')}
        className="power-up-button flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Eye className="mr-2" size={20} />
        كشف حرف
      </motion.button>
    </motion.div>
  )
}

export default PowerUps