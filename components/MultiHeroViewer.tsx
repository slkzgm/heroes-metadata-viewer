"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useWallet } from "@/contexts/WalletContext"
import HeroTimer from "./HeroTimer"

interface HeroAttribute {
    trait_type: string
    value: string | number
}

interface HeroMetadata {
    name: string
    description: string
    image: string
    attributes: HeroAttribute[]
}

interface Hero {
    id: string
    level: number
    lastUpgrade: string
    stakedSince: string
    metadata?: HeroMetadata
}

interface WalletHeroes {
    walletAddress: string
    heroes: Hero[]
}

type ViewMode = "grid" | "list";

export default function MultiHeroViewer() {
    const { walletAddress, setWalletAddress } = useWallet()
    const [inputAddress, setInputAddress] = useState(walletAddress)
    const [heroes, setHeroes] = useState<Hero[]>([])
    const [heroesMetadata, setHeroesMetadata] = useState<{[id: string]: HeroMetadata}>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [viewMode, setViewMode] = useState<ViewMode>("grid")

    // Sorting and filtering
    const [sortOption, setSortOption] = useState<string>("id")
    const [filterOption, setFilterOption] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState<string>("")

    // Training cooldown in hours
    const TRAINING_COOLDOWN_HOURS = 12
    // Unstake cooldown in hours
    const UNSTAKE_COOLDOWN_HOURS = 6

    // Load heroes when the component mounts if we have a wallet address
    useEffect(() => {
        if (walletAddress) {
            fetchHeroes(walletAddress)
        }
    }, [walletAddress])

    // Load view mode preference from localStorage
    useEffect(() => {
        const savedViewMode = localStorage.getItem("heroesViewMode") as ViewMode
        if (savedViewMode && (savedViewMode === "grid" || savedViewMode === "list")) {
            setViewMode(savedViewMode)
        }
    }, [])

    // Save view mode preference
    useEffect(() => {
        localStorage.setItem("heroesViewMode", viewMode)
    }, [viewMode])

    const fetchHeroes = async (address: string) => {
        if (!address) return

        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            setError("Invalid wallet address format")
            return
        }

        setLoading(true)
        setError("")
        setHeroes([])
        setHeroesMetadata({})

        try {
            const response = await fetch(`/api/wallet/${address}`)

            if (!response.ok) {
                throw new Error("Failed to fetch wallet data")
            }

            const data: WalletHeroes = await response.json()
            setHeroes(data.heroes)

            // Update the wallet address in context if it's different
            if (address !== walletAddress) {
                setWalletAddress(address)
            }

            // Fetch metadata for each hero
            await fetchHeroesMetadata(data.heroes)
        } catch (err: any) {
            setError(err.message || "Error fetching hero data")
        } finally {
            setLoading(false)
        }
    }

    const fetchHeroesMetadata = async (heroes: Hero[]) => {
        const metadataPromises = heroes.map(async (hero) => {
            try {
                const response = await fetch(`/api/metadata/${hero.id}`)
                if (response.ok) {
                    const metadata = await response.json()
                    return { id: hero.id, metadata }
                }
                return { id: hero.id, metadata: { name: `Hero #${hero.id}`, image: '', description: '', attributes: [] } }
            } catch (err) {
                console.error(`Error fetching metadata for hero ${hero.id}:`, err)
                return { id: hero.id, metadata: { name: `Hero #${hero.id}`, image: '', description: '', attributes: [] } }
            }
        })

        const results = await Promise.all(metadataPromises)

        const metadataMap = results.reduce((acc, { id, metadata }) => {
            acc[id] = metadata
            return acc
        }, {} as {[id: string]: HeroMetadata})

        setHeroesMetadata(metadataMap)
    }

    const handleWalletSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        fetchHeroes(inputAddress)
    }

    const refreshHeroes = async () => {
        setLoading(true); // Montrer que le chargement est en cours

        try {
            // Ajouter un paramètre de cache-busting pour éviter le cache du navigateur
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/wallet/${walletAddress}?_t=${timestamp}`, {
                // Indiquer au navigateur de ne pas utiliser le cache
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                throw new Error("Failed to fetch wallet data");
            }

            const data = await response.json();
            setHeroes(data.heroes);

            // Vider et recharger les métadonnées
            setHeroesMetadata({});
            await fetchHeroesMetadata(data.heroes);

            console.log("Données fraîchement chargées:", data.heroes);
        } catch (err) {
            console.error("Erreur lors du rafraîchissement:", err);
            setError("Erreur lors du rafraîchissement des données");
        } finally {
            setLoading(false);
        }
    };

    // Check if hero is available for training
    const isTrainingAvailable = (lastUpgrade: string) => {
        if (!lastUpgrade) return true

        const now = Date.now()
        const lastUpgradeMs = parseInt(lastUpgrade) * 1000
        const nextTrainingMs = lastUpgradeMs + (TRAINING_COOLDOWN_HOURS * 60 * 60 * 1000)

        return now >= nextTrainingMs
    }

    // Check if hero is available for unstaking
    const isUnstakeAvailable = (stakedSince: string) => {
        if (!stakedSince) return true

        const now = Date.now()
        const stakedSinceMs = parseInt(stakedSince) * 1000
        const unstakeAvailableMs = stakedSinceMs + (UNSTAKE_COOLDOWN_HOURS * 60 * 60 * 1000)

        return now >= unstakeAvailableMs
    }

    // Toggle view mode
    const toggleViewMode = () => {
        setViewMode(viewMode === "grid" ? "list" : "grid")
    }

    // Sort and filter heroes
    const filteredHeroes = heroes
        .filter((hero) => {
            // Apply search filter
            const heroMetadata = heroesMetadata[hero.id] || { name: `Hero #${hero.id}` };
            const searchMatch =
                hero.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (heroMetadata.name && heroMetadata.name.toLowerCase().includes(searchTerm.toLowerCase()))

            // Apply availability filter
            let availabilityMatch = true
            if (filterOption === "available") {
                availabilityMatch = isTrainingAvailable(hero.lastUpgrade)
            } else if (filterOption === "cooldown") {
                availabilityMatch = !isTrainingAvailable(hero.lastUpgrade)
            }

            return searchMatch && availabilityMatch
        })
        .sort((a, b) => {
            // Apply sorting
            if (sortOption === "level") {
                return b.level - a.level
            } else if (sortOption === "cooldown") {
                const aAvailable = isTrainingAvailable(a.lastUpgrade)
                const bAvailable = isTrainingAvailable(b.lastUpgrade)

                if (aAvailable && !bAvailable) return -1
                if (!aAvailable && bAvailable) return 1

                // If both are in cooldown or both are available, sort by last upgrade time
                if (!aAvailable && !bAvailable) {
                    return parseInt(b.lastUpgrade) - parseInt(a.lastUpgrade)
                }

                return parseInt(a.id) - parseInt(b.id)
            }

            // Default: sort by ID
            return parseInt(a.id) - parseInt(b.id)
        })

    return (
        <div className="text-white">
            <form onSubmit={handleWalletSubmit} className="flex flex-wrap md:flex-nowrap mb-6">
                <input
                    type="text"
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                    placeholder="Enter Wallet Address (0x...)"
                    className="w-full md:flex-grow px-4 py-2 bg-gray-800 border-2 border-yellow-400 rounded-md md:rounded-l-md md:rounded-r-none focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white placeholder-gray-500 mb-2 md:mb-0"
                />
                <div className="flex w-full md:w-auto">
                    <button
                        type="submit"
                        className="w-1/2 md:w-auto px-4 py-2 bg-yellow-400 text-black md:rounded-l-none md:rounded-r-none rounded-l-md hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        Load Heroes
                    </button>
                    {walletAddress && (
                        <button
                            type="button"
                            onClick={refreshHeroes}
                            className="w-1/2 md:w-auto px-4 py-2 bg-purple-600 text-white border-2 border-yellow-400 rounded-r-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center"
                        >
                            <span>Refresh</span>
                        </button>
                    )}
                </div>
            </form>

            {loading && (
                <div className="flex justify-center my-8">
                    <div className="w-12 h-12 border-t-4 border-yellow-400 border-solid rounded-full animate-spin"></div>
                </div>
            )}

            {error && <p className="text-center text-red-500 pixel-text mb-4">{error}</p>}

            {walletAddress && !loading && heroes.length === 0 && !error && (
                <p className="text-center text-yellow-400 pixel-text mb-4">No heroes found for this wallet</p>
            )}

            {heroes.length > 0 && (
                <div className="mb-6 bg-gray-800 p-4 rounded-lg border-2 border-yellow-400">
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by ID or name..."
                                className="w-full px-3 py-2 bg-gray-700 border border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white placeholder-gray-500"
                            />
                        </div>

                        {/* View mode toggle */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={toggleViewMode}
                                className="px-3 py-2 bg-gray-700 border border-yellow-400 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
                            >
                                {viewMode === "grid" ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {/* Sort */}
                        <div className="w-full sm:w-auto">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 border border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white"
                            >
                                <option value="id">Sort by ID</option>
                                <option value="level">Sort by Level (High to Low)</option>
                                <option value="cooldown">Sort by Training Cooldown</option>
                            </select>
                        </div>

                        {/* Filter */}
                        <div className="w-full sm:w-auto">
                            <select
                                value={filterOption}
                                onChange={(e) => setFilterOption(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 border border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white"
                            >
                                <option value="all">All Heroes</option>
                                <option value="available">Ready to Train</option>
                                <option value="cooldown">In Cooldown</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 text-center text-sm text-yellow-400">
                        {`Showing ${filteredHeroes.length} of ${heroes.length} heroes`}
                    </div>
                </div>
            )}

            {/* Grid View */}
            {viewMode === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredHeroes.map((hero) => (
                        <div
                            key={hero.id}
                            className="bg-gray-800 p-4 rounded-lg border-2 border-yellow-400 transition-all hover:shadow-lg hover:shadow-yellow-400/20"
                        >
                            <div className="mb-3 relative">
                                {heroesMetadata[hero.id]?.image ? (
                                    <Image
                                        src={heroesMetadata[hero.id].image}
                                        alt={heroesMetadata[hero.id]?.name || `Hero #${hero.id}`}
                                        width={200}
                                        height={200}
                                        className="rounded-lg mx-auto pixelated object-cover h-48 w-full"
                                    />
                                ) : (
                                    <div className="h-48 w-full bg-gray-700 rounded-lg flex items-center justify-center">
                                        <span className="text-gray-500">Loading image...</span>
                                    </div>
                                )}
                                <div className="absolute top-0 left-0 bg-yellow-400 text-black px-2 py-1 text-xs">#{hero.id}</div>
                                <div className="absolute top-0 right-0 bg-purple-600 text-white px-2 py-1 text-xs">Lvl {hero.level}</div>
                            </div>

                            <h3 className="text-lg font-bold text-yellow-400 pixel-text truncate">
                                {heroesMetadata[hero.id]?.name || `Hero #${hero.id}`}
                            </h3>

                            {/* Training cooldown timer */}
                            <HeroTimer
                                timestamp={hero.lastUpgrade}
                                cooldownHours={TRAINING_COOLDOWN_HOURS}
                                timerType="training"
                            />

                            {/* Unstake cooldown timer */}
                            <div className="mt-4">
                                <HeroTimer
                                    timestamp={hero.stakedSince}
                                    cooldownHours={UNSTAKE_COOLDOWN_HOURS}
                                    timerType="unstake"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* List View */}
            {viewMode === "list" && (
                <div className="flex flex-col space-y-2">
                    {filteredHeroes.map((hero) => (
                        <div
                            key={hero.id}
                            className="bg-gray-800 p-3 rounded-lg border-2 border-yellow-400 transition-all hover:shadow-lg hover:shadow-yellow-400/20 flex"
                        >
                            {/* Hero image - small thumbnail */}
                            <div className="relative w-16 h-16 mr-4 flex-shrink-0">
                                {heroesMetadata[hero.id]?.image ? (
                                    <Image
                                        src={heroesMetadata[hero.id].image}
                                        alt={heroesMetadata[hero.id]?.name || `Hero #${hero.id}`}
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
                                        {heroesMetadata[hero.id]?.name || `Hero #${hero.id}`}
                                    </h3>
                                    <div className="flex space-x-2">
                                        <span className="bg-yellow-400 text-black px-2 py-0.5 text-xs rounded">#{hero.id}</span>
                                        <span className="bg-purple-600 text-white px-2 py-0.5 text-xs rounded">Lvl {hero.level}</span>
                                    </div>
                                </div>

                                {/* Compact timers */}
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>Training:</span>
                                            <span className={isTrainingAvailable(hero.lastUpgrade) ? "text-green-400 font-bold" : "text-orange-400"}>
                        {isTrainingAvailable(hero.lastUpgrade) ? "Ready" : calculateTimeLeft(hero.lastUpgrade, TRAINING_COOLDOWN_HOURS)}
                      </span>
                                        </div>
                                        <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="h-1.5 rounded-full bg-yellow-400"
                                                style={{
                                                    width: `${calculateProgress(hero.lastUpgrade, TRAINING_COOLDOWN_HOURS)}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>Unstake:</span>
                                            <span className={isUnstakeAvailable(hero.stakedSince) ? "text-green-400 font-bold" : "text-blue-400"}>
                        {isUnstakeAvailable(hero.stakedSince) ? "Ready" : calculateTimeLeft(hero.stakedSince, UNSTAKE_COOLDOWN_HOURS)}
                      </span>
                                        </div>
                                        <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="h-1.5 rounded-full bg-blue-400"
                                                style={{
                                                    width: `${calculateProgress(hero.stakedSince, UNSTAKE_COOLDOWN_HOURS)}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    // Helper function to calculate progress percentage
    function calculateProgress(timestamp: string, cooldownHours: number) {
        if (!timestamp) return 100

        const now = Date.now()
        const timestampMs = parseInt(timestamp) * 1000
        const cooldownMs = cooldownHours * 60 * 60 * 1000
        const elapsedTime = now - timestampMs

        return Math.min(100, Math.max(0, (elapsedTime / cooldownMs) * 100))
    }

    // Helper function to calculate time left in a compact format
    function calculateTimeLeft(timestamp: string, cooldownHours: number) {
        if (!timestamp) return "Ready"

        const now = Date.now()
        const timestampMs = parseInt(timestamp) * 1000
        const availableAtMs = timestampMs + (cooldownHours * 60 * 60 * 1000)

        if (now >= availableAtMs) {
            return "Ready"
        }

        const timeToGo = availableAtMs - now
        const seconds = Math.floor(timeToGo / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`
        } else if (minutes > 0) {
            return `${minutes}m`
        } else {
            return `${seconds}s`
        }
    }
}