"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Bird {
  x: number
  y: number
  velocity: number
}

interface Pipe {
  x: number
  topHeight: number
  bottomY: number
  passed: boolean
}

const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 600
const BIRD_SIZE = 20
const PIPE_WIDTH = 60
const PIPE_GAP = 150
const GRAVITY = 0.5
const JUMP_FORCE = -8
const PIPE_SPEED = 2

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()

  const [bird, setBird] = useState<Bird>({ x: 100, y: 300, velocity: 0 })
  const [pipes, setPipes] = useState<Pipe[]>([])
  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [highScore, setHighScore] = useState(0)

  // Initialize game
  const initGame = useCallback(() => {
    setBird({ x: 100, y: 300, velocity: 0 })
    setPipes([])
    setScore(0)
    setGameState("playing")
  }, [])

  // Jump function
  const jump = useCallback(() => {
    if (gameState === "playing") {
      setBird((prev) => ({ ...prev, velocity: JUMP_FORCE }))
    } else if (gameState === "menu" || gameState === "gameOver") {
      initGame()
    }
  }, [gameState, initGame])

  // Generate new pipe
  const generatePipe = useCallback((): Pipe => {
    const topHeight = Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50
    return {
      x: CANVAS_WIDTH,
      topHeight,
      bottomY: topHeight + PIPE_GAP,
      passed: false,
    }
  }, [])

  // Check collision
  const checkCollision = useCallback((bird: Bird, pipes: Pipe[]): boolean => {
    // Ground and ceiling collision
    if (bird.y <= 0 || bird.y >= CANVAS_HEIGHT - BIRD_SIZE) {
      return true
    }

    // Pipe collision
    for (const pipe of pipes) {
      if (
        bird.x + BIRD_SIZE > pipe.x &&
        bird.x < pipe.x + PIPE_WIDTH &&
        (bird.y < pipe.topHeight || bird.y + BIRD_SIZE > pipe.bottomY)
      ) {
        return true
      }
    }

    return false
  }, [])

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return

    setBird((prev) => {
      const newBird = {
        ...prev,
        velocity: prev.velocity + GRAVITY,
        y: prev.y + prev.velocity + GRAVITY,
      }

      setPipes((prevPipes) => {
        let newPipes = prevPipes.map((pipe) => ({ ...pipe, x: pipe.x - PIPE_SPEED }))

        // Remove pipes that are off screen
        newPipes = newPipes.filter((pipe) => pipe.x > -PIPE_WIDTH)

        // Add new pipe if needed
        if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < CANVAS_WIDTH - 200) {
          newPipes.push(generatePipe())
        }

        // Check for score
        newPipes.forEach((pipe) => {
          if (!pipe.passed && pipe.x + PIPE_WIDTH < newBird.x) {
            pipe.passed = true
            setScore((prev) => prev + 1)
          }
        })

        // Check collision
        if (checkCollision(newBird, newPipes)) {
          setGameState("gameOver")
          setHighScore((prev) => Math.max(prev, score))
        }

        return newPipes
      })

      return newBird
    })

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [gameState, generatePipe, checkCollision, score])

  // Start game loop
  useEffect(() => {
    if (gameState === "playing") {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, gameLoop])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        jump()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [jump])

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = "#87CEEB"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw pipes
    ctx.fillStyle = "#228B22"
    pipes.forEach((pipe) => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight)
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, CANVAS_HEIGHT - pipe.bottomY)

      // Pipe caps
      ctx.fillStyle = "#32CD32"
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20)
      ctx.fillRect(pipe.x - 5, pipe.bottomY, PIPE_WIDTH + 10, 20)
      ctx.fillStyle = "#228B22"
    })

    // Draw bird
    ctx.fillStyle = "#FFD700"
    ctx.beginPath()
    ctx.arc(bird.x + BIRD_SIZE / 2, bird.y + BIRD_SIZE / 2, BIRD_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()

    // Bird eye
    ctx.fillStyle = "#000"
    ctx.beginPath()
    ctx.arc(bird.x + BIRD_SIZE / 2 + 5, bird.y + BIRD_SIZE / 2 - 3, 3, 0, Math.PI * 2)
    ctx.fill()

    // Bird beak
    ctx.fillStyle = "#FF8C00"
    ctx.beginPath()
    ctx.moveTo(bird.x + BIRD_SIZE, bird.y + BIRD_SIZE / 2)
    ctx.lineTo(bird.x + BIRD_SIZE + 8, bird.y + BIRD_SIZE / 2 - 2)
    ctx.lineTo(bird.x + BIRD_SIZE + 8, bird.y + BIRD_SIZE / 2 + 2)
    ctx.closePath()
    ctx.fill()

    // Draw ground
    ctx.fillStyle = "#8B4513"
    ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20)

    // Draw score
    ctx.fillStyle = "#FFF"
    ctx.font = "bold 24px Arial"
    ctx.textAlign = "center"
    ctx.fillText(score.toString(), CANVAS_WIDTH / 2, 50)
  }, [bird, pipes, score])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-400 to-blue-600 p-4">
      <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-2xl">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Flappy Bird</h1>
          <div className="flex justify-center gap-8 text-sm text-gray-600">
            <span>Score: {score}</span>
            <span>High Score: {highScore}</span>
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={jump}
            className="border-2 border-gray-300 rounded-lg cursor-pointer bg-sky-200"
          />

          {/* Game overlays */}
          {gameState === "menu" && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <h2 className="text-2xl font-bold mb-4">Flappy Bird</h2>
                <p className="mb-4">Click or press SPACE to start!</p>
                <Button onClick={jump} className="bg-yellow-500 hover:bg-yellow-600">
                  Start Game
                </Button>
              </div>
            </div>
          )}

          {gameState === "gameOver" && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
                <p className="mb-2">Score: {score}</p>
                <p className="mb-4">High Score: {highScore}</p>
                <Button onClick={jump} className="bg-yellow-500 hover:bg-yellow-600">
                  Play Again
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Click the game area or press SPACE to flap!</p>
        </div>
      </Card>
    </div>
  )
}
