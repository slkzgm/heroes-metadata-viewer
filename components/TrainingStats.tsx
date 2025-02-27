"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { format } from "date-fns";

// Define the upgrade types
type UpgradeType = "StandardUpgraded" | "LuckyUpgraded" | "ChaosUpgraded";

interface HeroUpgrade {
  __typename: UpgradeType;
  newLevel: string;
  oldLevel: string;
  blockTimestamp: string;
  hero: {
    id: string;
  };
}

interface UpgradeStats {
  total: number;
  avgGain: number;
  bestGain: number;
  totalLevels: number;
  levelDistribution: {
    [-3]: number;
    [-2]: number;
    [-1]: number;
    [0]: number;
    [1]: number;
    [2]: number;
    [3]: number;
    [4]: number;
  };
}

interface TrainingStatsSummary {
  totalUpgrades: number;
  averageLevelGain: number;
  highestLevelJump: number;
  mostUpgradedHero: {
    id: string;
    count: number;
  };
  upgradesByType: {
    standard: {
      count: number;
      percentage: number;
      avgGain: number;
      bestGain: number;
      totalLevels: number;
    };
    lucky: {
      count: number;
      percentage: number;
      avgGain: number;
      bestGain: number;
      totalLevels: number;
    };
    chaos: {
      count: number;
      percentage: number;
      avgGain: number;
      bestGain: number;
      totalLevels: number;
    };
  };
  levelGainDistribution: {
    gain: number;
    count: number;
    percentage: number;
  }[];
}

export default function TrainingStats() {
  const { walletAddress, setWalletAddress } = useWallet();
  const [inputAddress, setInputAddress] = useState(walletAddress);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgrades, setUpgrades] = useState<HeroUpgrade[]>([]);
  const [stats, setStats] = useState<TrainingStatsSummary | null>(null);
  const [selectedHeroId, setSelectedHeroId] = useState("");
  const [selectedUpgradeType, setSelectedUpgradeType] = useState<
    "all" | UpgradeType
  >("all");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "heroId" | "levelGain"
  >("newest");
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [isDistributionCollapsed, setIsDistributionCollapsed] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  // Fetch training data when component mounts or wallet address changes
  useEffect(() => {
    if (walletAddress) {
      fetchTrainingData(walletAddress);
    }
  }, [walletAddress, forceRefresh]);

  const fetchTrainingData = async (address: string) => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/training/${address}`);

      if (!response.ok) {
        throw new Error("Failed to fetch training data");
      }

      const data = await response.json();

      if (data.data && data.data.upgrades) {
        const fetchedUpgrades = data.data.upgrades as HeroUpgrade[];
        setUpgrades(fetchedUpgrades);

        // Calculate statistics
        const calculatedStats = calculateTrainingStats(fetchedUpgrades);
        setStats(calculatedStats);
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (error: any) {
      setError(error.message || "Error fetching training data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate comprehensive training statistics
  const calculateTrainingStats = (
    upgrades: HeroUpgrade[]
  ): TrainingStatsSummary => {
    const totalUpgrades = upgrades.length;

    // Initialize distribution
    const levelDistribution = {
      [-1]: 0,
      [0]: 0,
      [1]: 0,
      [2]: 0,
      [3]: 0,
    };

    // Track total level gains and highest jump
    let totalLevelGain = 0;
    let highestJump = 0;

    // Track hero upgrade counts
    const heroUpgradeCounts: Record<string, number> = {};

    // Track upgrade types
    const standardUpgrades: number[] = [];
    const luckyUpgrades: number[] = [];
    const chaosUpgrades: number[] = [];

    // Process each upgrade
    upgrades.forEach((upgrade) => {
      const oldLevel = parseInt(upgrade.oldLevel);
      const newLevel = parseInt(upgrade.newLevel);
      const levelDiff = newLevel - oldLevel;

      // Update total level gain
      totalLevelGain += levelDiff;

      // Update highest jump
      highestJump = Math.max(highestJump, levelDiff);

      // Update level distribution
      if (levelDiff >= -1 && levelDiff <= 3) {
        levelDistribution[levelDiff as keyof typeof levelDistribution]++;
      }

      // Update hero count
      const heroId = upgrade.hero.id;
      heroUpgradeCounts[heroId] = (heroUpgradeCounts[heroId] || 0) + 1;

      // Categorize by upgrade type
      if (upgrade.__typename === "StandardUpgraded") {
        standardUpgrades.push(levelDiff);
      } else if (upgrade.__typename === "LuckyUpgraded") {
        luckyUpgrades.push(levelDiff);
      } else if (upgrade.__typename === "ChaosUpgraded") {
        chaosUpgrades.push(levelDiff);
      }
    });

    // Find most upgraded hero
    let mostUpgradedHeroId = "";
    let mostUpgradeCount = 0;
    Object.entries(heroUpgradeCounts).forEach(([heroId, count]) => {
      if (count > mostUpgradeCount) {
        mostUpgradedHeroId = heroId;
        mostUpgradeCount = count;
      }
    });

    // Calculate average gains
    const averageLevelGain =
      totalUpgrades > 0 ? totalLevelGain / totalUpgrades : 0;

    // Calculate type-specific stats
    const calculateTypeStats = (gains: number[]) => {
      if (gains.length === 0)
        return {
          count: 0,
          percentage: 0,
          avgGain: 0,
          bestGain: 0,
          totalLevels: 0,
        };

      const count = gains.length;
      const percentage = (count / totalUpgrades) * 100;
      const totalLevels = gains.reduce((sum, gain) => sum + gain, 0);
      const avgGain = count > 0 ? totalLevels / count : 0;
      const bestGain = gains.length > 0 ? Math.max(...gains) : 0;

      return { count, percentage, avgGain, bestGain, totalLevels };
    };

    // Generate level gain distribution for visualization
    const levelGainDistribution = Object.entries(levelDistribution)
      .map(([gain, count]) => ({
        gain: parseInt(gain),
        count,
        percentage: totalUpgrades > 0 ? (count / totalUpgrades) * 100 : 0,
      }))
      .sort((a, b) => a.gain - b.gain);

    return {
      totalUpgrades,
      averageLevelGain,
      highestLevelJump: highestJump,
      mostUpgradedHero: {
        id: mostUpgradedHeroId,
        count: mostUpgradeCount,
      },
      upgradesByType: {
        standard: calculateTypeStats(standardUpgrades),
        lucky: calculateTypeStats(luckyUpgrades),
        chaos: calculateTypeStats(chaosUpgrades),
      },
      levelGainDistribution,
    };
  };

  // Handle form submission for wallet address
  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputAddress) return;

    if (!/^0x[a-fA-F0-9]{40}$/.test(inputAddress)) {
      setError("Invalid wallet address format");
      return;
    }

    setWalletAddress(inputAddress);
    fetchTrainingData(inputAddress);
  };

  const refreshTrainingData = () => {
    if (walletAddress) {
      setForceRefresh((prev) => prev + 1);
    }
  };

  // Get filtered and sorted upgrades
  const getFilteredUpgrades = () => {
    return upgrades
      .filter((upgrade) => {
        // Apply hero ID filter
        const heroIdMatch = selectedHeroId
          ? upgrade.hero.id === selectedHeroId
          : true;

        // Apply upgrade type filter
        const typeMatch =
          selectedUpgradeType === "all" ||
          upgrade.__typename === selectedUpgradeType;

        return heroIdMatch && typeMatch;
      })
      .sort((a, b) => {
        // Apply sorting
        switch (sortBy) {
          case "oldest":
            return parseInt(a.blockTimestamp) - parseInt(b.blockTimestamp);
          case "heroId":
            return parseInt(a.hero.id) - parseInt(b.hero.id);
          case "levelGain":
            const aGain = parseInt(a.newLevel) - parseInt(a.oldLevel);
            const bGain = parseInt(b.newLevel) - parseInt(b.oldLevel);
            return bGain - aGain; // Highest gain first
          case "newest":
          default:
            return parseInt(b.blockTimestamp) - parseInt(a.blockTimestamp);
        }
      });
  };

  // Format timestamp to readable date
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return format(date, "MMM d, yyyy HH:mm");
  };

  // Get upgrade type badge class
  const getUpgradeTypeBadgeClass = (type: UpgradeType) => {
    switch (type) {
      case "StandardUpgraded":
        return "text-xs px-2 py-1 bg-blue-600 text-white rounded-md";
      case "LuckyUpgraded":
        return "text-xs px-2 py-1 bg-green-600 text-white rounded-md";
      case "ChaosUpgraded":
        return "text-xs px-2 py-1 bg-purple-600 text-white rounded-md";
      default:
        return "text-xs px-2 py-1 bg-gray-600 text-white rounded-md";
    }
  };

  // Get level change class
  const getLevelChangeClass = (oldLevel: string, newLevel: string) => {
    const diff = parseInt(newLevel) - parseInt(oldLevel);
    if (diff > 0) return "text-green-400";
    if (diff < 0) return "text-red-400";
    return "text-yellow-400";
  };

  // Get distribution bar color
  const getDistributionBarColor = (gain: number) => {
    if (gain < 0) return "bg-red-600";
    if (gain === 0) return "bg-yellow-600";
    if (gain === 1) return "bg-blue-600";
    if (gain === 2) return "bg-green-600";
    return "bg-purple-600";
  };

  // Calculate the highest count for distribution scaling
  const getMaxDistributionCount = () => {
    if (!stats) return 0;
    return Math.max(...stats.levelGainDistribution.map((item) => item.count));
  };

  const filteredUpgrades = getFilteredUpgrades();

  return (
    <div className="text-white">
      {/* Wallet address input */}
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
            Load Data
          </button>
          {walletAddress && (
            <button
              type="button"
              onClick={refreshTrainingData}
              className="w-1/2 md:w-auto px-4 py-2 bg-purple-600 text-white border-2 border-yellow-400 rounded-r-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center"
            >
              <span>Refresh</span>
            </button>
          )}
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center my-8">
          <div className="w-12 h-12 border-t-4 border-yellow-400 border-solid rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error state */}
      {error && <p className="text-center text-red-500 mb-4">{error}</p>}

      {/* Empty state */}
      {!loading && !error && upgrades.length === 0 && walletAddress && (
        <p className="text-center text-yellow-400 mb-4">
          No training history found for this wallet
        </p>
      )}

      {/* Statistics Panels */}
      {!loading && stats && (
        <div className="space-y-6">
          {/* Training Statistics Panel */}
          <div className="bg-gray-900 rounded-lg border-2 border-gray-800 overflow-hidden shadow-lg">
            <div
              className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-800 border-b border-gray-800"
              onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h2 className="text-lg font-medium text-yellow-400">
                  Training Statistics
                </h2>
              </div>
              <svg
                className={`w-5 h-5 text-yellow-400 transition-transform ${isStatsCollapsed ? "" : "transform rotate-180"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${isStatsCollapsed ? "max-h-0" : "max-h-screen"}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
                {/* Total Upgrades */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-400 text-sm flex items-center">
                        Total Upgrades
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {stats.totalUpgrades}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Average Level Gain */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-400 text-sm flex items-center">
                        Average Level Gain
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {stats.averageLevelGain.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Highest Level Jump */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-400 text-sm flex items-center">
                        Highest Level Jump
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {stats.highestLevelJump}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Most Upgraded Hero */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-400 text-sm flex items-center">
                        Most Upgraded Hero
                      </p>
                      <p className="text-3xl font-bold text-white">
                        #{stats.mostUpgradedHero.id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrades by Type Panel */}
          <div className="bg-gray-900 rounded-lg border-2 border-gray-800 overflow-hidden shadow-lg">
            <div className="p-3 border-b border-gray-800">
              <h2 className="text-lg font-medium text-yellow-400">
                Upgrades by Type
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
              {/* Lucky Upgraded */}
              <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-green-500">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white font-medium flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                    Lucky Upgraded
                  </h3>
                  <span className="bg-green-800 text-green-100 text-xs px-2 py-1 rounded-full">
                    {stats.upgradesByType.lucky.count} (
                    {stats.upgradesByType.lucky.percentage.toFixed(0)}%)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Avg Gain</p>
                    <p className="text-xl font-bold text-white">
                      {stats.upgradesByType.lucky.avgGain.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Best Gain</p>
                    <p className="text-xl font-bold text-white">
                      {stats.upgradesByType.lucky.bestGain}
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-xs text-gray-400">Total Levels Gained</p>
                  <p className="text-lg font-bold text-white">
                    {stats.upgradesByType.lucky.totalLevels}
                  </p>
                </div>
              </div>

              {/* Standard Upgraded */}
              <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white font-medium flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    Standard Upgraded
                  </h3>
                  <span className="bg-blue-800 text-blue-100 text-xs px-2 py-1 rounded-full">
                    {stats.upgradesByType.standard.count} (
                    {stats.upgradesByType.standard.percentage.toFixed(0)}%)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Avg Gain</p>
                    <p className="text-xl font-bold text-white">
                      {stats.upgradesByType.standard.avgGain.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Best Gain</p>
                    <p className="text-xl font-bold text-white">
                      {stats.upgradesByType.standard.bestGain}
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-xs text-gray-400">Total Levels Gained</p>
                  <p className="text-lg font-bold text-white">
                    {stats.upgradesByType.standard.totalLevels}
                  </p>
                </div>
              </div>

              {/* Chaos Upgraded */}
              <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-purple-500">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white font-medium flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Chaos Upgraded
                  </h3>
                  <span className="bg-purple-800 text-purple-100 text-xs px-2 py-1 rounded-full">
                    {stats.upgradesByType.chaos.count} (
                    {stats.upgradesByType.chaos.percentage.toFixed(0)}%)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Avg Gain</p>
                    <p className="text-xl font-bold text-white">
                      {stats.upgradesByType.chaos.avgGain.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Best Gain</p>
                    <p className="text-xl font-bold text-white">
                      {stats.upgradesByType.chaos.bestGain}
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-xs text-gray-400">Total Levels Gained</p>
                  <p className="text-lg font-bold text-white">
                    {stats.upgradesByType.chaos.totalLevels}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Level Gain Distribution Panel */}
          <div className="bg-gray-900 rounded-lg border-2 border-gray-800 overflow-hidden shadow-lg">
            <div
              className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-800 border-b border-gray-800"
              onClick={() =>
                setIsDistributionCollapsed(!isDistributionCollapsed)
              }
            >
              <h2 className="text-lg font-medium text-yellow-400">
                Level Gain Distribution
              </h2>
              <svg
                className={`w-5 h-5 text-yellow-400 transition-transform ${isDistributionCollapsed ? "" : "transform rotate-180"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${isDistributionCollapsed ? "max-h-0" : "max-h-screen"}`}
            >
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-2 px-4 text-gray-400 text-sm">
                          Level Gain
                        </th>
                        <th className="text-left py-2 px-4 text-gray-400 text-sm">
                          Distribution
                        </th>
                        <th className="text-right py-2 px-4 text-gray-400 text-sm">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.levelGainDistribution.map((item) => (
                        <tr
                          key={item.gain}
                          className="border-b border-gray-800"
                        >
                          <td className="py-2 px-4">
                            <span
                              className={`font-medium inline-block w-10 text-center rounded px-2 py-1 ${
                                item.gain < 0
                                  ? "bg-red-900/30 text-red-400"
                                  : item.gain === 0
                                    ? "bg-yellow-900/30 text-yellow-400"
                                    : item.gain === 1
                                      ? "bg-blue-900/30 text-blue-400"
                                      : item.gain === 2
                                        ? "bg-green-900/30 text-green-400"
                                        : "bg-purple-900/30 text-purple-400"
                              }`}
                            >
                              {item.gain > 0 ? `+${item.gain}` : item.gain}
                            </span>
                          </td>
                          <td className="py-2 px-4 w-full">
                            <div className="h-6 w-full bg-gray-700 rounded-sm overflow-hidden">
                              <div
                                className={`h-full ${getDistributionBarColor(item.gain)}`}
                                style={{
                                  width: `${(item.count / getMaxDistributionCount()) * 100}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-4 text-right">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          <div className="bg-gray-900 rounded-lg border-2 border-gray-800 overflow-hidden shadow-lg mb-6">
            <div
              className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-800 border-b border-gray-800"
              onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
            >
              <h2 className="text-lg font-medium text-yellow-400">
                Filter & Sort
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">
                  Showing {filteredUpgrades.length} of {upgrades.length}{" "}
                  upgrades
                </span>
                <svg
                  className={`w-5 h-5 text-yellow-400 transition-transform ${isFiltersCollapsed ? "" : "transform rotate-180"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${isFiltersCollapsed ? "max-h-0" : "max-h-screen"}`}
            >
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Hero ID filter */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Hero ID
                    </label>
                    <input
                      type="text"
                      value={selectedHeroId}
                      onChange={(e) => setSelectedHeroId(e.target.value)}
                      placeholder="Filter by Hero ID"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white"
                    />
                  </div>

                  {/* Upgrade type filter */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Training Type
                    </label>
                    <select
                      value={selectedUpgradeType}
                      onChange={(e) =>
                        setSelectedUpgradeType(
                          e.target.value as "all" | UpgradeType
                        )
                      }
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white"
                    >
                      <option value="all">All Types</option>
                      <option value="StandardUpgraded">Standard</option>
                      <option value="LuckyUpgraded">Lucky</option>
                      <option value="ChaosUpgraded">Chaos</option>
                    </select>
                  </div>

                  {/* Sort options */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as
                            | "newest"
                            | "oldest"
                            | "heroId"
                            | "levelGain"
                        )
                      }
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="heroId">Hero ID</option>
                      <option value="levelGain">Level Gain</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Training History Panel */}
          <div className="bg-gray-900 rounded-lg border-2 border-gray-800 overflow-hidden shadow-lg">
            <div
              className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-800 border-b border-gray-800"
              onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
            >
              <h2 className="text-lg font-medium text-yellow-400">
                Training History
              </h2>
              <svg
                className={`w-5 h-5 text-yellow-400 transition-transform ${isHistoryCollapsed ? "" : "transform rotate-180"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${isHistoryCollapsed ? "max-h-0" : "max-h-screen"}`}
            >
              {filteredUpgrades.length > 0 ? (
                <div className="p-4 space-y-3">
                  {filteredUpgrades.map((upgrade) => {
                    const oldLevel = parseInt(upgrade.oldLevel);
                    const newLevel = parseInt(upgrade.newLevel);
                    const levelDiff = newLevel - oldLevel;

                    let resultClass = "";
                    let resultBg = "";

                    if (upgrade.__typename === "StandardUpgraded") {
                      // All Standard are success
                      resultClass = "text-green-400";
                      resultBg = "bg-green-900/20";
                    } else if (upgrade.__typename === "LuckyUpgraded") {
                      // Lucky is success if +2
                      resultClass =
                        levelDiff >= 2 ? "text-green-400" : "text-red-400";
                      resultBg =
                        levelDiff >= 2 ? "bg-green-900/20" : "bg-red-900/20";
                    } else if (upgrade.__typename === "ChaosUpgraded") {
                      // Chaos is success if positive, neutral if 0, fail if negative
                      if (levelDiff > 0) {
                        resultClass = "text-green-400";
                        resultBg = "bg-green-900/20";
                      } else if (levelDiff === 0) {
                        resultClass = "text-yellow-400";
                        resultBg = "bg-yellow-900/20";
                      } else {
                        resultClass = "text-red-400";
                        resultBg = "bg-red-900/20";
                      }
                    }

                    return (
                      <div
                        key={`${upgrade.hero.id}-${upgrade.blockTimestamp}`}
                        className={`p-3 rounded-lg border border-gray-700 ${resultBg}`}
                      >
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          {/* Left side - Hero ID and type */}
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white px-2 py-1 bg-gray-700 rounded-md">
                              #{upgrade.hero.id}
                            </span>
                            <span
                              className={getUpgradeTypeBadgeClass(
                                upgrade.__typename
                              )}
                            >
                              {upgrade.__typename.replace("Upgraded", "")}
                            </span>
                          </div>

                          {/* Right side - Date and level change */}
                          <div className="flex items-center space-x-3">
                            <div
                              className={`flex items-center font-medium ${resultClass}`}
                            >
                              <span className="text-lg">{oldLevel}</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mx-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                                />
                              </svg>
                              <span className="text-lg">{newLevel}</span>
                              <span className="ml-1">
                                ({levelDiff > 0 ? "+" : ""}
                                {levelDiff})
                              </span>
                            </div>

                            <div className="text-sm text-gray-400">
                              {formatTimestamp(upgrade.blockTimestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  No training history found with the current filters
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
