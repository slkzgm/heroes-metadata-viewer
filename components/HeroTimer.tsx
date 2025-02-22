"use client"

import { useState, useEffect } from "react"

interface HeroTimerProps {
    upgradeTime: string
    cooldownHours: number
}

export default function HeroTimer({ upgradeTime, cooldownHours = 12 }: HeroTimerProps) {
    const [timeRemaining, setTimeRemaining] = useState("")
    const [isAvailable, setIsAvailable] = useState(false)
    const [progressPercentage, setProgressPercentage] = useState(0)

    const COOLDOWN_MS = cooldownHours * 60 * 60 * 1000

    useEffect(() => {
        // Update timer every second
        const updateTimer = () => {
            if (!upgradeTime) {
                setIsAvailable(true)
                setTimeRemaining("Available")
                setProgressPercentage(100)
                return
            }

            const now = Date.now()
            const stakeTimeMs = parseInt(upgradeTime) * 1000
            const nextTrainingMs = stakeTimeMs + COOLDOWN_MS

            // Check if training is available
            if (now >= nextTrainingMs) {
                setIsAvailable(true)
                setTimeRemaining("Available")
                setProgressPercentage(100)
                return
            }

            // Calculate time remaining
            const timeToGo = nextTrainingMs - now
            const seconds = Math.floor(timeToGo / 1000)
            const minutes = Math.floor(seconds / 60)
            const hours = Math.floor(minutes / 60)
            const days = Math.floor(hours / 24)

            let formattedTime = ""
            if (days > 0) {
                formattedTime = `${days}d ${hours % 24}h`
            } else if (hours > 0) {
                formattedTime = `${hours}h ${minutes % 60}m`
            } else if (minutes > 0) {
                formattedTime = `${minutes}m ${seconds % 60}s`
            } else {
                formattedTime = `${seconds}s`
            }

            setTimeRemaining(formattedTime)
            setIsAvailable(false)

            // Calculate progress
            const elapsedTime = now - stakeTimeMs
            const progress = Math.min(100, Math.max(0, (elapsedTime / COOLDOWN_MS) * 100))
            setProgressPercentage(progress)
        }

        // Initial update
        updateTimer()

        // Set up interval
        const interval = setInterval(updateTimer, 1000)

        // Clean up
        return () => clearInterval(interval)
    }, [upgradeTime, COOLDOWN_MS])

    return (
        <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
                <span>Next Training</span>
                <span className={isAvailable ? "text-green-400 font-bold" : "text-orange-400"}>
          {isAvailable ? "Available Now!" : timeRemaining}
        </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`h-2.5 rounded-full transition-all duration-1000 ${
                        isAvailable
                            ? 'bg-green-500'
                            : progressPercentage > 75
                                ? 'bg-yellow-300'
                                : progressPercentage > 50
                                    ? 'bg-yellow-400'
                                    : progressPercentage > 25
                                        ? 'bg-yellow-500'
                                        : 'bg-yellow-600'
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>
            {isAvailable && (
                <div className="text-center mt-2">
          <span className="inline-block px-2 py-1 bg-green-600 rounded-md text-xs animate-pulse">
            Ready to train!
          </span>
                </div>
            )}
        </div>
    )
}