"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import HeroTimer from '@/components/HeroTimer';

interface Attribute {
  trait_type: string
  value: string | number
}

interface TokenMetadata {
  name: string
  description: string
  image: string
  external_url: string
  attributes: Attribute[]
  animation_url?: string
}

interface OnchainData {
  lastTraining: {
    timestamp: number
    milliseconds?: number
    formatted?: string | null
    isValid?: boolean
  }
}

type TabType = "metadata" | "training";

export default function TokenViewer() {
  const [tokenId, setTokenId] = useState("")
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null)
  const [onchainData, setOnchainData] = useState<OnchainData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [timeAgo, setTimeAgo] = useState<string>("")
  const [nextTrainingTime, setNextTrainingTime] = useState<string>("")
  const [isTrainingAvailable, setIsTrainingAvailable] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [activeTab, setActiveTab] = useState<TabType>("metadata")

  // Training cooldown in hours
  const TRAINING_COOLDOWN_HOURS = 12;
  const TRAINING_COOLDOWN_MS = TRAINING_COOLDOWN_HOURS * 60 * 60 * 1000;

  // Load preferred tab from localStorage on initial render
  useEffect(() => {
    const savedTab = localStorage.getItem("preferredTab") as TabType;
    if (savedTab && (savedTab === "metadata" || savedTab === "training")) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save tab preference when it changes
  useEffect(() => {
    localStorage.setItem("preferredTab", activeTab);
  }, [activeTab]);

  const fetchMetadata = async (id = tokenId) => {
    setLoading(true)
    setError("")
    setMetadata(null)
    setOnchainData(null)

    try {
      // Use Promise.all to load metadata and onchain data in parallel
      const [metadataResponse, onchainResponse] = await Promise.all([
        fetch(`/api/metadata/${id}`),
        fetch(`/api/onchain/${id}`)
      ]);

      // Process metadata
      if (!metadataResponse.ok) {
        throw new Error("Failed to fetch metadata")
      }
      const metadataData = await metadataResponse.json()
      setMetadata(metadataData)

      // Process onchain data
      if (onchainResponse.ok) {
        const onchainData = await onchainResponse.json()
        setOnchainData(onchainData)
      }

      setTokenId(id)
    } catch (err) {
      setError("Error fetching data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchRandomMetadata = async () => {
    const randomId = Math.floor(Math.random() * 10000) + 1
    setTokenId(randomId.toString())
    await fetchMetadata(randomId.toString())
  }

  // Update relative time and next training time every minute
  useEffect(() => {
    if (!onchainData?.lastTraining) return;

    const updateTimes = () => {
      const now = Date.now();
      const lastTrainingMs = onchainData.lastTraining.timestamp * 1000;
      const nextTrainingMs = lastTrainingMs + TRAINING_COOLDOWN_MS;

      // Update time ago
      setTimeAgo(calculateTimeAgo(lastTrainingMs));

      // Check if next training is available
      const isAvailable = now >= nextTrainingMs;
      setIsTrainingAvailable(isAvailable);

      // Calculate next training time
      if (isAvailable) {
        setNextTrainingTime("Available now!");
      } else {
        setNextTrainingTime(calculateTimeUntil(nextTrainingMs));
      }

      // Calculate progress (0-100%)
      const elapsedSinceLast = now - lastTrainingMs;
      const progress = Math.min(100, Math.max(0, (elapsedSinceLast / TRAINING_COOLDOWN_MS) * 100));
      setTrainingProgress(progress);
    };

    // Initial update
    updateTimes();

    // Update every minute
    const interval = setInterval(updateTimes, 60000);

    // Cleanup
    return () => clearInterval(interval);
  }, [onchainData]);

  // Format date with error handling
  const formatDateTime = (timestamp: number | undefined | null) => {
    try {
      // If we receive null, undefined or invalid value
      if (!timestamp) {
        return "Not trained yet";
      }

      // Check if timestamp is valid
      if (isNaN(timestamp) || timestamp <= 0) {
        return "Invalid date";
      }

      // Create date ensuring we have milliseconds
      // Blockchain timestamps are typically in seconds
      const date = new Date(timestamp * 1000);

      // Check if date is valid
      if (date.toString() === "Invalid Date") {
        return "Invalid date";
      }

      return new Intl.DateTimeFormat('default', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Formatting error";
    }
  };

  // Calculate relative time (how long ago) with error handling
  const calculateTimeAgo = (timestampMs: number) => {
    try {
      if (!timestampMs) return "";

      const now = Date.now();
      const elapsed = now - timestampMs;

      if (elapsed < 0) {
        // If timestamp is in the future
        return calculateTimeUntil(timestampMs, true);
      } else {
        // If timestamp is in the past (normal for "ago")
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
          return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
          return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
          return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
          return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
        }
      }
    } catch (error) {
      console.error("Error calculating relative time:", error);
      return "";
    }
  };

  // Calculate time until a future timestamp
  const calculateTimeUntil = (timestampMs: number, includePrefix = false) => {
    try {
      if (!timestampMs) return "";

      const now = Date.now();
      const timeToGo = timestampMs - now;

      if (timeToGo <= 0) {
        return "Now";
      }

      const seconds = Math.floor(timeToGo / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      let result = '';
      if (days > 0) {
        result = `${days} day${days > 1 ? 's' : ''}`;
      } else if (hours > 0) {
        result = `${hours} hour${hours > 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        result = `${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else {
        result = `${seconds} second${seconds !== 1 ? 's' : ''}`;
      }

      if (includePrefix) {
        return `in ${result}`;
      }
      return result;
    } catch (error) {
      console.error("Error calculating time until:", error);
      return "";
    }
  };

  // Handler for changing tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
      <div className="text-white">
        <div className="flex flex-wrap md:flex-nowrap mb-4">
          <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="Enter Token ID"
              className="w-full md:flex-grow px-4 py-2 bg-gray-800 border-2 border-yellow-400 rounded-md md:rounded-l-md md:rounded-r-none focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white placeholder-gray-500 mb-2 md:mb-0"
          />
          <div className="flex w-full md:w-auto">
            <button
                onClick={() => fetchMetadata()}
                className="w-1/2 md:w-auto px-4 py-2 bg-yellow-400 text-black md:rounded-l-none md:rounded-r-none rounded-l-md hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              View
            </button>
            <button
                onClick={fetchRandomMetadata}
                className="w-1/2 md:w-auto px-4 py-2 bg-purple-600 text-white border-2 border-yellow-400 rounded-r-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center"
            >
              <span>Random</span>
            </button>
          </div>
        </div>

        {loading && (
            <div className="flex justify-center my-4">
              <div className="w-12 h-12 border-t-4 border-yellow-400 border-solid rounded-full animate-spin"></div>
            </div>
        )}

        {error && <p className="text-center text-red-500 pixel-text">{error}</p>}

        {metadata && (
            <div className="mt-6 bg-gray-800 p-4 rounded-lg border-2 border-yellow-400 transition-opacity duration-300">
              <div className="mb-4 relative">
                <Image
                    src={metadata.image || "/placeholder.svg"}
                    alt={metadata.name}
                    width={300}
                    height={300}
                    className="rounded-lg mx-auto pixelated"
                />
                <div className="absolute top-0 left-0 bg-yellow-400 text-black px-2 py-1 text-xs">#{tokenId}</div>
              </div>
              <h2 className="text-xl font-bold mb-2 text-yellow-400 pixel-text">{metadata.name}</h2>
              <p className="mb-4 text-sm">{metadata.description}</p>

              {/* Tab Navigation */}
              <div className="flex border-b border-yellow-400 mb-4">
                <button
                    onClick={() => handleTabChange("metadata")}
                    className={`px-4 py-2 font-medium ${
                        activeTab === "metadata"
                            ? "bg-yellow-400 text-black"
                            : "bg-gray-700 text-yellow-400 hover:bg-gray-600"
                    } rounded-t-lg mr-1`}
                >
                  Metadata
                </button>
                <button
                    onClick={() => handleTabChange("training")}
                    className={`px-4 py-2 font-medium ${
                        activeTab === "training"
                            ? "bg-yellow-400 text-black"
                            : "bg-gray-700 text-yellow-400 hover:bg-gray-600"
                    } rounded-t-lg ${onchainData?.lastTraining && isTrainingAvailable ? 'relative' : ''}`}
                >
                  Training
                  {onchainData?.lastTraining && isTrainingAvailable && (
                      <span className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {/* Metadata Tab */}
                {activeTab === "metadata" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {metadata.attributes.map((attr, index) => (
                          <div key={index} className="bg-gray-700 p-2 rounded border border-yellow-400">
                            <span className="font-medium text-yellow-400">{attr.trait_type}:</span>
                            <br />
                            <span>{attr.value}</span>
                          </div>
                      ))}
                    </div>
                )}

                {/* Training Tab */}
                {activeTab === "training" && (
                    <div>
                      {onchainData && onchainData.lastTraining ? (
                          <div className="bg-gray-700 p-3 rounded border border-yellow-400">
                            <div className="flex flex-col">
                              <div className="mb-2">
                                <span className="font-medium text-yellow-400">Last Training:</span>
                                <br />
                                <span>{formatDateTime(onchainData.lastTraining.timestamp)}</span>
                              </div>

                              {timeAgo && (
                                  <div className="mb-2">
                                    <span className="font-medium text-yellow-400">Relative:</span>
                                    <br />
                                    <span className="text-blue-400">{timeAgo}</span>
                                  </div>
                              )}

                              {/* Next training status */}
                              <div className="mb-2">
                                <span className="font-medium text-yellow-400">Next Training:</span>
                                <br />
                                <span className={isTrainingAvailable ? "text-green-400 font-bold" : "text-orange-400"}>
                              {nextTrainingTime}
                            </span>
                              </div>

                              {/* Progress bar for training cooldown */}
                              <HeroTimer
                                  stakeTime={onchainData.lastTraining.timestamp.toString()}
                                  cooldownHours={TRAINING_COOLDOWN_HOURS}
                              />
                            </div>
                          </div>
                      ) : (
                          <div className="text-center py-4 text-gray-400">
                            No training data available for this token
                          </div>
                      )}
                    </div>
                )}
              </div>
            </div>
        )}
      </div>
  )
}