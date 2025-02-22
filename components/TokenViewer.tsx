"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import HeroTimer from "./HeroTimer"

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
  lastUpgrade: number
  stakedSince: number
  level: number
}

type TabType = "metadata" | "training";

export default function TokenViewer() {
  const [tokenId, setTokenId] = useState("")
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null)
  const [onchainData, setOnchainData] = useState<OnchainData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<TabType>("metadata")

  // Training cooldown in hours
  const TRAINING_COOLDOWN_HOURS = 12;
  // Unstaking cooldown in hours
  const UNSTAKE_COOLDOWN_HOURS = 6;

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
        const data = await onchainResponse.json()
        // Adapter le format de données
        setOnchainData({
          lastUpgrade: data.lastTraining?.timestamp || 0,
          stakedSince: data.lastTraining?.timestamp || 0, // Utiliser le même timestamp pour l'exemple
          level: data.level || 1
        })
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

  // Format date with error handling
  const formatDateTime = (timestamp: number | undefined | null) => {
    try {
      // If we receive null, undefined or invalid value
      if (!timestamp) {
        return "Not available";
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
                {onchainData && (
                    <div className="absolute top-0 right-0 bg-purple-600 text-white px-2 py-1 text-xs">
                      Lvl {onchainData.level}
                    </div>
                )}
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
                    } rounded-t-lg ${onchainData?.lastUpgrade ? 'relative' : ''}`}
                >
                  Training
                  {onchainData?.lastUpgrade ? (
                      <span className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  ) : null}
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
                      {onchainData && onchainData.lastUpgrade ? (
                          <div className="bg-gray-700 p-3 rounded border border-yellow-400">
                            <div className="flex flex-col">
                              <div className="mb-2">
                                <span className="font-medium text-yellow-400">Last Upgrade:</span>
                                <br />
                                <span>{formatDateTime(onchainData.lastUpgrade)}</span>
                              </div>

                              <div className="mb-2">
                                <span className="font-medium text-yellow-400">Staked Since:</span>
                                <br />
                                <span>{formatDateTime(onchainData.stakedSince)}</span>
                              </div>

                              {/* Training status with real-time updates */}
                              <div className="mb-2">
                                <span className="font-medium text-yellow-400">Training Status:</span>
                              </div>
                              <HeroTimer
                                  timestamp={onchainData.lastUpgrade.toString()}
                                  cooldownHours={TRAINING_COOLDOWN_HOURS}
                                  timerType="training"
                              />

                              {/* Unstake status with real-time updates */}
                              <div className="mt-4 mb-2">
                                <span className="font-medium text-yellow-400">Unstake Status:</span>
                              </div>
                              <HeroTimer
                                  timestamp={onchainData.stakedSince.toString()}
                                  cooldownHours={UNSTAKE_COOLDOWN_HOURS}
                                  timerType="unstake"
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