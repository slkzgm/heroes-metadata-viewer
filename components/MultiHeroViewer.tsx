"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import HeroCard from "./HeroCard";
import WalletStats from "./WalletStats";

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

interface Hero {
  id: string;
  level: number;
  lastUpgrade: string;
  stakedSince: string | null;
  lastClaim: string;
  metadata?: HeroMetadata;
}

interface WalletHeroes {
  walletAddress: string;
  heroes: Hero[];
  balance?: {
    balance: string;
  };
}

type ViewMode = "grid" | "list";

export default function MultiHeroViewer() {
  const { walletAddress, setWalletAddress } = useWallet();
  const [inputAddress, setInputAddress] = useState(walletAddress);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [heroesMetadata, setHeroesMetadata] = useState<{
    [id: string]: HeroMetadata;
  }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [forceRefresh, setForceRefresh] = useState(0);

  // Sorting and filtering
  const [sortOption, setSortOption] = useState<string>("id");
  const [filterOption, setFilterOption] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Load heroes when the component mounts if we have a wallet address
  useEffect(() => {
    if (walletAddress) {
      fetchHeroes(walletAddress);
    }
  }, [walletAddress]);

  // Load view mode preference from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem("heroesViewMode") as ViewMode;
    if (
      savedViewMode &&
      (savedViewMode === "grid" || savedViewMode === "list")
    ) {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem("heroesViewMode", viewMode);
  }, [viewMode]);

  const fetchHeroes = async (address: string) => {
    if (!address) return;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError("Invalid wallet address format");
      return;
    }

    setLoading(true);
    setError("");
    setHeroes([]);
    setHeroesMetadata({});

    try {
      const response = await fetch(`/api/wallet/${address}`);

      if (!response.ok) {
        throw new Error("Failed to fetch wallet data");
      }

      const data: WalletHeroes = await response.json();
      setHeroes(data.heroes);

      // Update the wallet address in context if it's different
      if (address !== walletAddress) {
        setWalletAddress(address);
      }

      // Fetch metadata for each hero
      await fetchHeroesMetadata(data.heroes);
    } catch (err: any) {
      setError(err.message || "Error fetching hero data");
    } finally {
      setLoading(false);
    }
  };

  const fetchHeroesMetadata = async (heroes: Hero[]) => {
    const metadataPromises = heroes.map(async (hero) => {
      try {
        const response = await fetch(`/api/metadata/${hero.id}`);
        if (response.ok) {
          const metadata = await response.json();
          return { id: hero.id, metadata };
        }
        return {
          id: hero.id,
          metadata: {
            name: `Hero #${hero.id}`,
            image: "",
            description: "",
            attributes: [],
          },
        };
      } catch (err) {
        console.error(`Error fetching metadata for hero ${hero.id}:`, err);
        return {
          id: hero.id,
          metadata: {
            name: `Hero #${hero.id}`,
            image: "",
            description: "",
            attributes: [],
          },
        };
      }
    });

    const results = await Promise.all(metadataPromises);

    const metadataMap = results.reduce(
      (acc, { id, metadata }) => {
        acc[id] = metadata;
        return acc;
      },
      {} as { [id: string]: HeroMetadata }
    );

    setHeroesMetadata(metadataMap);
  };

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHeroes(inputAddress);
  };

  const refreshHeroes = async () => {
    setLoading(true);
    try {
      // Create a unique URL with a timestamp to avoid caching
      const uniqueUrl = new URL(
        `/api/wallet/${walletAddress}`,
        window.location.origin
      );
      uniqueUrl.searchParams.append("nocache", Date.now().toString());

      const response = await fetch(uniqueUrl, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "If-None-Match": "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch wallet data");
      }

      const data = await response.json();
      setHeroes(data.heroes);
      await fetchHeroesMetadata(data.heroes);

      // Increment refresh counter to trigger WalletStats refresh
      setForceRefresh((prev) => prev + 1);
    } catch (err) {
      console.error("Erreur lors du rafraîchissement:", err);
      setError("Erreur lors du rafraîchissement des données");
    } finally {
      setLoading(false);
    }
  };

  // Check if hero is available for training
  const isTrainingAvailable = (lastUpgrade: string) => {
    if (!lastUpgrade) return true;

    const now = Date.now();
    const lastUpgradeMs = parseInt(lastUpgrade) * 1000;
    const nextTrainingMs = lastUpgradeMs + 12 * 60 * 60 * 1000; // 12 hours cooldown

    return now >= nextTrainingMs;
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(viewMode === "grid" ? "list" : "grid");
  };

  // Sort and filter heroes
  const filteredHeroes = heroes
    .filter((hero) => {
      // Apply search filter
      const heroMetadata = heroesMetadata[hero.id] || {
        name: `Hero #${hero.id}`,
      };
      const searchMatch =
        hero.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (heroMetadata.name &&
          heroMetadata.name.toLowerCase().includes(searchTerm.toLowerCase()));

      // Apply availability filter
      let availabilityMatch = true;
      if (filterOption === "available") {
        availabilityMatch = isTrainingAvailable(hero.lastUpgrade);
      } else if (filterOption === "cooldown") {
        availabilityMatch = !isTrainingAvailable(hero.lastUpgrade);
      } else if (filterOption === "staked") {
        availabilityMatch = hero.stakedSince !== null;
      } else if (filterOption === "unstaked") {
        availabilityMatch = hero.stakedSince === null;
      }

      return searchMatch && availabilityMatch;
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortOption === "level") {
        return b.level - a.level;
      } else if (sortOption === "cooldown") {
        const aAvailable = isTrainingAvailable(a.lastUpgrade);
        const bAvailable = isTrainingAvailable(b.lastUpgrade);

        if (aAvailable && !bAvailable) return -1;
        if (!aAvailable && bAvailable) return 1;

        // If both are in cooldown or both are available, sort by last upgrade time
        if (!aAvailable && !bAvailable) {
          return parseInt(b.lastUpgrade) - parseInt(a.lastUpgrade);
        }

        return parseInt(a.id) - parseInt(b.id);
      } else if (sortOption === "earnings") {
        // Sort by earnings (higher level heroes earn more)
        const aEarnings = (2000 * a.level) / (20 + a.level);
        const bEarnings = (2000 * b.level) / (20 + b.level);
        return bEarnings - aEarnings;
      }

      // Default: sort by ID
      return parseInt(a.id) - parseInt(b.id);
    });

  return (
    <div className="text-white">
      <form
        onSubmit={handleWalletSubmit}
        className="flex flex-wrap md:flex-nowrap mb-6"
      >
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

      {/* Wallet Stats */}
      {walletAddress && !loading && !error && (
        <WalletStats
          walletAddress={walletAddress}
          forceRefresh={forceRefresh}
        />
      )}

      {loading && (
        <div className="flex justify-center my-8">
          <div className="w-12 h-12 border-t-4 border-yellow-400 border-solid rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <p className="text-center text-red-500 pixel-text mb-4">{error}</p>
      )}

      {walletAddress && !loading && heroes.length === 0 && !error && (
        <p className="text-center text-yellow-400 pixel-text mb-4">
          No heroes found for this wallet
        </p>
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
                title={
                  viewMode === "grid"
                    ? "Switch to list view"
                    : "Switch to grid view"
                }
              >
                {viewMode === "grid" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
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
                <option value="earnings">Sort by Earnings</option>
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
                <option value="cooldown">In Training Cooldown</option>
                <option value="staked">Staked Heroes</option>
                <option value="unstaked">Unstaked Heroes</option>
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
            <HeroCard
              key={hero.id}
              id={hero.id}
              level={hero.level}
              lastUpgrade={hero.lastUpgrade}
              stakedSince={hero.stakedSince}
              lastClaim={hero.lastClaim}
              metadata={heroesMetadata[hero.id]}
              viewMode="grid"
            />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="flex flex-col space-y-2">
          {filteredHeroes.map((hero) => (
            <HeroCard
              key={hero.id}
              id={hero.id}
              level={hero.level}
              lastUpgrade={hero.lastUpgrade}
              stakedSince={hero.stakedSince}
              lastClaim={hero.lastClaim}
              metadata={heroesMetadata[hero.id]}
              viewMode="list"
            />
          ))}
        </div>
      )}
    </div>
  );
}
