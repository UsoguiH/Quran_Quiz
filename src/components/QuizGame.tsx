import React, { useState, useEffect, useRef } from 'react'
import { removeDiacritics } from '../utils/arabicHelpers'
import { getVerseContext } from '../utils/quranApi'
import HintOptions from './HintOptions'
import { motion, AnimatePresence } from 'framer-motion'

interface QuizGameProps {
  verse: string
  onCorrectAnswer: () => void
  onWrongAnswer: () => void
  useToken: (count: number) => boolean
  remainingQuestions: number
  onSkipQuestion: () => void
  timeLeft: number
}

const QuizGame: React.FC<QuizGameProps> = ({ 
  verse,
  onCorrectAnswer,
  onWrongAnswer,
  useToken,
  remainingQuestions,
  onSkipQuestion,
  timeLeft
}) => {
  const [words, setWords] = useState<string[]>([])
  const [blankIndex, setBlankIndex] = useState<number>(-1)
  const [userGuess, setUserGuess] = useState<string>('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showAnswer, setShowAnswer] = useState<boolean>(false)
  const [shakeEffect, setShakeEffect] = useState<boolean>(false)
  const [multipleChoices, setMultipleChoices] = useState<string[]>([])
  const [verseContext, setVerseContext] = useState({ surah: '', ayah: 0 })
  const verseContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (verse) {
      const wordsArray = verse.split(' ')
      setWords(wordsArray)
      const randomIndex = Math.floor(Math.random() * wordsArray.length)
      setBlankIndex(randomIndex)
      setVerseContext(getVerseContext(verse))
      setIsCorrect(null)
      setShowAnswer(false)
      setUserGuess('')
      setMultipleChoices([])
    }
  }, [verse])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const correctWord = words[blankIndex]
    const isGuessCorrect = removeDiacritics(userGuess.trim().toLowerCase()) === removeDiacritics(correctWord.toLowerCase())

    setIsCorrect(isGuessCorrect)
    setShowAnswer(true)

    if (isGuessCorrect) {
      setTimeout(() => {
        onCorrectAnswer()
      }, 2000) // 2 seconds delay for correct answer
    } else {
      setShakeEffect(true)
      setTimeout(() => setShakeEffect(false), 500)
      setTimeout(() => {
        onWrongAnswer()
      }, 3000) // 3 seconds delay for wrong answer
    }
  }

  const handleMultipleChoiceHint = () => {
    if (useToken(1)) {
      const correctWord = words[blankIndex]
      const otherWords = words.filter((_, index) => index !== blankIndex)
      const randomWords = otherWords.sort(() => 0.5 - Math.random()).slice(0, 3)
      const choices = [...randomWords, correctWord].sort(() => 0.5 - Math.random())
      setMultipleChoices(choices)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="text-right"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-4 text-lg font-semibold text-gray-600"
      >
        سورة {verseContext.surah} - الآية {verseContext.ayah}
      </motion.div>
      <motion.div 
        ref={verseContainerRef} 
        className={`verse-container p-6 mb-6 ${shakeEffect ? 'shake' : ''}`}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <p className="mb-4 text-2xl leading-loose text-gray-800 arabic-text">
          {words.map((word, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              {index === blankIndex ? (
                <span className="underline mx-1 text-blue-500">_____</span>
              ) : (
                <span className="mx-1">{word}</span>
              )}
            </motion.span>
          ))}
        </p>
      </motion.div>
      <motion.div 
        className="mb-4 text-xl font-bold text-center"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        الوقت المتبقي: {timeLeft} ثانية
      </motion.div>
      <form onSubmit={handleSubmit} className="mb-6 flex flex-col items-end">
        <motion.input
          type="text"
          value={userGuess}
          onChange={(e) => setUserGuess(e.target.value)}
          className="input-field w-full p-3 mb-4 rounded-lg text-right text-xl"
          placeholder="أدخل الكلمة المفقودة"
          disabled={isCorrect !== null}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        />
        <motion.button 
          type="submit" 
          className="custom-button" 
          disabled={isCorrect !== null}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          التحقق من الإجابة
        </motion.button>
      </form>
      <AnimatePresence>
        {isCorrect !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 text-xl font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}
          >
            {isCorrect ? 'أحسنت! إجابة صحيحة.' : `للأسف، إجابة خاطئة.`}
            {showAnswer && <p className="mt-2">الكلمة الصحيحة هي: "{words[blankIndex]}"</p>}
          </motion.div>
        )}
      </AnimatePresence>
      <HintOptions 
        onMultipleChoice={handleMultipleChoiceHint}
        onSkipQuestion={onSkipQuestion}
        disabled={isCorrect !== null}
      />
      <AnimatePresence>
        {multipleChoices.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <h3 className="text-lg font-bold mb-2">اختر الإجابة الصحيحة:</h3>
            <div className="grid grid-cols-2 gap-2">
              {multipleChoices.map((choice, index) => (
                <motion.button
                  key={index}
                  onClick={() => setUserGuess(choice)}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-2 px-4 rounded"
                  disabled={isCorrect !== null}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {choice}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div 
        className="text-center mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-lg font-bold">الأسئلة المتبقية: {remainingQuestions}</p>
      </motion.div>
    </motion.div>
  )
}

export default QuizGame