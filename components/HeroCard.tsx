"use client";

import Image from "next/image";
import HeroTimer from "./HeroTimer";

interface HeroAttribute {
  trait_type: string;
  value: string | number;
}

interface HeroMetadata {
  name: string;
  description: string;
  image: string;
  attributes: HeroAttribute[];
}

interface HeroCardProps {
  id: string;
  level: number;
  lastUpgrade: string;
  stakedSince: string | null;
  lastClaim?: string;
  metadata?: HeroMetadata;
  viewMode: "grid" | "list";
}

// Training cooldown in hours
const TRAINING_COOLDOWN_HOURS = 12;
// Unstake cooldown in hours
const UNSTAKE_COOLDOWN_HOURS = 6;

export default function HeroCard({
  id,
  level,
  lastUpgrade,
  stakedSince,
  lastClaim,
  metadata,
  viewMode,
}: HeroCardProps) {
  // Calculate training cost: 24 hours worth of $HERO earnings at current level
  const calculateTrainingCost = () => {
    // $HERO/day formula: (2000 * lvl) / (20 + lvl)
    const dailyEarning = (2000 * level) / (20 + level);
    return dailyEarning;
  };

  const trainingCost = calculateTrainingCost();

  // Check if hero is available for training
  const isTrainingAvailable = () => {
    if (!lastUpgrade) return true;

    const now = Date.now();
    const lastUpgradeMs = parseInt(lastUpgrade) * 1000;
    const nextTrainingMs =
      lastUpgradeMs + TRAINING_COOLDOWN_HOURS * 60 * 60 * 1000;

    return now >= nextTrainingMs;
  };

  // Check if hero is available for unstaking
  const isUnstakeAvailable = () => {
    if (!stakedSince) return true;

    const now = Date.now();
    const stakedSinceMs = parseInt(stakedSince) * 1000;
    const unstakeAvailableMs =
      stakedSinceMs + UNSTAKE_COOLDOWN_HOURS * 60 * 60 * 1000;

    return now >= unstakeAvailableMs;
  };

  // Helper function to calculate time left in a compact format
  const calculateTimeLeft = (
    timestamp: string | null,
    cooldownHours: number
  ) => {
    if (!timestamp) return "Ready";

    const now = Date.now();
    const timestampMs = parseInt(timestamp) * 1000;
    const availableAtMs = timestampMs + cooldownHours * 60 * 60 * 1000;

    if (now >= availableAtMs) {
      return "Ready";
    }

    const timeToGo = availableAtMs - now;
    const seconds = Math.floor(timeToGo / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  // Helper function to calculate progress percentage
  const calculateProgress = (
    timestamp: string | null,
    cooldownHours: number
  ) => {
    if (!timestamp) return 100;

    const now = Date.now();
    const timestampMs = parseInt(timestamp) * 1000;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const elapsedTime = now - timestampMs;

    return Math.min(100, Math.max(0, (elapsedTime / cooldownMs) * 100));
  };

  // Render grid view
  if (viewMode === "grid") {
    return (
      <div className="bg-gray-800 p-4 rounded-lg border-2 border-yellow-400 transition-all hover:shadow-lg hover:shadow-yellow-400/20">
        <div className="mb-3 relative">
          {metadata?.image ? (
            <Image
              src={metadata.image}
              alt={metadata?.name || `Hero #${id}`}
              width={200}
              height={200}
              className="rounded-lg mx-auto pixelated object-cover h-48 w-full"
            />
          ) : (
            <div className="h-48 w-full bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">Loading image...</span>
            </div>
          )}
          <div className="absolute top-0 left-0 bg-yellow-400 text-black px-2 py-1 text-xs">
            #{id}
          </div>
          <div className="absolute top-0 right-0 bg-purple-600 text-white px-2 py-1 text-xs">
            Lvl {level}
          </div>
        </div>

        <h3 className="text-lg font-bold text-yellow-400 pixel-text truncate">
          {metadata?.name || `Hero #${id}`}
        </h3>

        {/* Daily earnings */}
        <div className="mt-2 mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Daily Earnings</span>
            <span className="text-green-400 font-bold">
              {((2000 * level) / (20 + level)).toFixed(2)} $HERO
            </span>
          </div>
        </div>

        {/* Training cost */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Training Cost</span>
            <span className="text-orange-400 font-bold">
              {trainingCost.toFixed(2)} $HERO
            </span>
          </div>
        </div>

        {/* Training cooldown timer */}
        <HeroTimer
          timestamp={lastUpgrade}
          cooldownHours={TRAINING_COOLDOWN_HOURS}
          timerType="training"
        />

        {/* Unstake cooldown timer */}
        <div className="mt-4">
          <HeroTimer
            timestamp={stakedSince || ""}
            cooldownHours={UNSTAKE_COOLDOWN_HOURS}
            timerType="unstake"
          />
        </div>
      </div>
    );
  }

  // Render list view
  return (
    <div className="bg-gray-800 p-3 rounded-lg border-2 border-yellow-400 transition-all hover:shadow-lg hover:shadow-yellow-400/20 flex">
      {/* Hero image - small thumbnail */}
      <div className="relative w-16 h-16 mr-4 flex-shrink-0">
        {metadata?.image ? (
          <Image
            src={metadata.image}
            alt={metadata?.name || `Hero #${id}`}
            width={64}
            height={64}
            className="rounded-md pixelated object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 rounded-md flex items-center justify-center">
            <span className="text-gray-500 text-xs">...</span>
          </div>
        )}
      </div>

      {/* Hero info */}
      <div className="flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-yellow-400 pixel-text text-sm">
            {metadata?.name || `Hero #${id}`}
          </h3>
          <div className="flex space-x-2">
            <span className="bg-yellow-400 text-black px-2 py-0.5 text-xs rounded">
              #{id}
            </span>
            <span className="bg-purple-600 text-white px-2 py-0.5 text-xs rounded">
              Lvl {level}
            </span>
          </div>
        </div>

        {/* Daily earnings & training cost */}
        <div className="flex justify-between text-xs mt-1">
          <span>
            Daily:{" "}
            <span className="text-green-400">
              {((2000 * level) / (20 + level)).toFixed(2)}
            </span>
          </span>
          <span>
            Train:{" "}
            <span className="text-orange-400">{trainingCost.toFixed(2)}</span>
          </span>
        </div>

        {/* Compact timers */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Training:</span>
              <span
                className={
                  isTrainingAvailable()
                    ? "text-green-400 font-bold"
                    : "text-orange-400"
                }
              >
                {isTrainingAvailable()
                  ? "Ready"
                  : calculateTimeLeft(lastUpgrade, TRAINING_COOLDOWN_HOURS)}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-yellow-400"
                style={{
                  width: `${calculateProgress(lastUpgrade, TRAINING_COOLDOWN_HOURS)}%`,
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Unstake:</span>
              <span
                className={
                  isUnstakeAvailable()
                    ? "text-green-400 font-bold"
                    : "text-blue-400"
                }
              >
                {isUnstakeAvailable()
                  ? "Ready"
                  : calculateTimeLeft(stakedSince, UNSTAKE_COOLDOWN_HOURS)}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-blue-400"
                style={{
                  width: `${calculateProgress(stakedSince, UNSTAKE_COOLDOWN_HOURS)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
