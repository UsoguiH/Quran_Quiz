import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QuizGame from './components/QuizGame'
import PlayerStats from './components/PlayerStats'
import GameOver from './components/GameOver'
import Tutorial from './components/Tutorial'
import { fetchRandomVerse } from './utils/quranApi'

function App() {
  const [verse, setVerse] = useState<string>('')
  const [score, setScore] = useState<number>(0)
  const [hearts, setHearts] = useState<number>(3)
  const [tokens, setTokens] = useState<number>(3)
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [questionCount, setQuestionCount] = useState<number>(0)
  const [showTutorial, setShowTutorial] = useState<boolean>(true)
  const [timeLeft, setTimeLeft] = useState<number>(20)

  useEffect(() => {
    fetchNewVerse()
  }, [])

  useEffect(() => {
    if (!showTutorial && !gameOver) {
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer)
            handleWrongAnswer()
            return 0
          }
          return prevTime - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [showTutorial, gameOver, verse])

  const fetchNewVerse = async () => {
    const newVerse = await fetchRandomVerse()
    setVerse(newVerse)
    setTimeLeft(20)
  }

  const handleCorrectAnswer = () => {
    setScore(score + 1)
    setQuestionCount(questionCount + 1)
    if (questionCount < 9) {
      setTimeout(() => {
        fetchNewVerse()
      }, 2000)
    } else {
      setGameOver(true)
    }
  }

  const handleWrongAnswer = () => {
    setHearts(hearts - 1)
    setQuestionCount(questionCount + 1)
    if (hearts <= 1 || questionCount >= 9) {
      setGameOver(true)
    } else {
      setTimeout(() => {
        fetchNewVerse()
      }, 3000)
    }
  }

  const useToken = (count: number = 1) => {
    if (tokens >= count) {
      setTokens(tokens - count)
      return true
    }
    return false
  }

  const handleSkipQuestion = () => {
    if (useToken(2)) { // Use 2 tokens to skip the question
      setScore(score + 1) // Increase score by 1
      setQuestionCount(questionCount + 1)
      if (questionCount < 9) {
        fetchNewVerse()
      } else {
        setGameOver(true)
      }
    }
  }

  const restartGame = () => {
    setScore(0)
    setHearts(3)
    setTokens(3)
    setGameOver(false)
    setQuestionCount(0)
    fetchNewVerse()
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20"
        >
          <h1 className="text-3xl font-bold mb-6 text-center">مسابقة الآيات القرآنية</h1>
          {showTutorial ? (
            <Tutorial onComplete={() => setShowTutorial(false)} />
          ) : (
            <>
              <PlayerStats hearts={hearts} tokens={tokens} score={score} questionCount={10} />
              <AnimatePresence mode="wait">
                {gameOver ? (
                  <GameOver score={score} onRestart={restartGame} />
                ) : (
                  <QuizGame
                    verse={verse}
                    onCorrectAnswer={handleCorrectAnswer}
                    onWrongAnswer={handleWrongAnswer}
                    useToken={useToken}
                    remainingQuestions={10 - questionCount}
                    onSkipQuestion={handleSkipQuestion}
                    timeLeft={timeLeft}
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default App