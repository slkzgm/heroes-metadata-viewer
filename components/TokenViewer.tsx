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

  const fetchMetadata = async () => {
    setLoading(true)
    setError("")
    setMetadata(null)

    try {
      const response = await fetch(`/api/metadata/${tokenId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch metadata")
      }
      const data = await response.json()
      setMetadata(data)
    } catch (err) {
      setError("Error fetching metadata. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="text-white">
      <div className="flex mb-4">
        <input
          type="text"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="Enter Token ID"
          className="flex-grow px-4 py-2 bg-gray-800 border-2 border-yellow-400 rounded-l-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white placeholder-gray-500"
        />
        <button
          onClick={fetchMetadata}
          className="px-4 py-2 bg-yellow-400 text-black rounded-r-md hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          View
        </button>
      </div>

      {loading && <p className="text-center text-yellow-400">Loading...</p>}
      {error && <p className="text-center text-red-500 pixel-text">{error}</p>}

      {metadata && (
        <div className="mt-6 bg-gray-800 p-4 rounded-lg border-2 border-yellow-400">
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
          <div className="grid grid-cols-2 gap-2">
            {metadata.attributes.map((attr, index) => (
              <div key={index} className="bg-gray-700 p-2 rounded border border-yellow-400">
                <span className="font-medium text-yellow-400">{attr.trait_type}:</span>
                <br />
                <span>{attr.value}</span>
              </div>
            ))}
          </div>
          {metadata.animation_url && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2 text-yellow-400 pixel-text">Animation:</h3>
              <video src={metadata.animation_url} controls className="w-full rounded-lg border-2 border-yellow-400" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

