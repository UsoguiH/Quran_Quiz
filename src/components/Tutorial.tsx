import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Coins, HelpCircle } from 'lucide-react'

interface TutorialProps {
  onComplete: () => void
}

const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: "مرحبًا بك في اختبار الآيات القرآنية",
      content: "في هذه اللعبة، ستختبر معرفتك بالآيات القرآنية. ستظهر لك آية مع كلمة مفقودة، وعليك تخمين الكلمة الصحيحة.",
      icon: <HelpCircle className="w-16 h-16 text-blue-500 mb-4" />
    },
    {
      title: "القلوب والرموز",
      content: "لديك ثلاثة قلوب وثلاثة تلميحات. تفقد قلبًا عند الإجابة الخاطئة. استخدم التلميحات للحصول على اختيار متعدد (1 تلميح) أو تخطي الأسئلة (2 تلميح).",
      icon: <div className="flex space-x-4 mb-4">
        <Heart className="w-12 h-12 text-red-500" fill="currentColor" />
        <Heart className="w-12 h-12 text-red-500" fill="currentColor" />
        <Heart className="w-12 h-12 text-red-500" fill="currentColor" />
      </div>
    },
    {
      title: "10 أسئلة للإجابة",
      content: "هناك 10 أسئلة في كل جولة. حاول الإجابة على أكبر عدد ممكن بشكل صحيح. حظًا موفقًا!",
      icon: <div className="text-4xl font-bold text-green-500 mb-4">10</div>
    }
  ]

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl text-center"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-center mb-4">
            {slides[currentSlide].icon}
          </div>
          <h2 className="text-2xl font-bold mb-4">{slides[currentSlide].title}</h2>
          <p className="text-lg mb-8">{slides[currentSlide].content}</p>
        </motion.div>
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={nextSlide}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors duration-200"
      >
        {currentSlide < slides.length - 1 ? "التالي" : "ابدأ اللعبة"}
      </motion.button>
    </motion.div>
  )
}

export default Tutorial