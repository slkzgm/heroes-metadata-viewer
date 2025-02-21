"use client"

import { useState } from "react"
import Image from "next/image"

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

export default function TokenViewer() {
  const [tokenId, setTokenId] = useState("")
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchMetadata = async (id = tokenId) => {
    setLoading(true)
    setError("")
    setMetadata(null)

    try {
      const response = await fetch(`/api/metadata/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch metadata")
      }
      const data = await response.json()
      setMetadata(data)
      setTokenId(id)
    } catch (err) {
      setError("Error fetching metadata. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchRandomMetadata = async () => {
    const randomId = Math.floor(Math.random() * 10000) + 1
    setTokenId(randomId.toString())
    await fetchMetadata(randomId.toString())
  }

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
              <h3 className="text-lg font-semibold mb-2 text-yellow-400 pixel-text">Attributes:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {metadata.attributes.map((attr, index) => (
                    <div key={index} className="bg-gray-700 p-2 rounded border border-yellow-400">
                      <span className="font-medium text-yellow-400">{attr.trait_type}:</span>
                      <br />
                      <span>{attr.value}</span>
                    </div>
                ))}
              </div>
            </div>
        )}
      </div>
  )
}