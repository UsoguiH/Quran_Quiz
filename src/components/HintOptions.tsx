import React from 'react'
import { HelpCircle, SkipForward } from 'lucide-react'
import { motion } from 'framer-motion'

interface HintOptionsProps {
  onMultipleChoice: () => void
  onSkipQuestion: () => void
  disabled: boolean
}

const HintOptions: React.FC<HintOptionsProps> = ({ onMultipleChoice, onSkipQuestion, disabled }) => {
  return (
    <motion.div 
      className="flex justify-between mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.button
        onClick={onMultipleChoice}
        className="hint-button flex items-center justify-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
        disabled={disabled}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <HelpCircle className="mr-2" size={20} />
        اختيار متعدد (1)
      </motion.button>
      <motion.button
        onClick={onSkipQuestion}
        className="hint-button flex items-center justify-center bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors duration-200"
        disabled={disabled}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <SkipForward className="mr-2" size={20} />
        تخطي السؤال (2)
      </motion.button>
    </motion.div>
  )
}

export default HintOptions