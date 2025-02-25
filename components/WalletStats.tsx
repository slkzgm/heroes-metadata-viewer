"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

interface Hero {
  id: string;
  tokenId: string;
  level: number;
  stakedSince: string | null;
  lastClaim: string;
  lastUpgrade: string;
}

interface WalletStats {
  balance: string;
  totalDailyGeneration: number;
  claimableAmount: number;
  totalAvailable: number;
  averageLevel: number;
  heroCounts: {
    total: number;
    staked: number;
    unstaked: number;
  };
}

interface WalletStatsProps {
  walletAddress: string;
  forceRefresh?: boolean;
}

export default function WalletStats({
  walletAddress,
  forceRefresh = false,
}: WalletStatsProps) {
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch stats when component mounts or wallet address changes
  useEffect(() => {
    if (walletAddress) {
      fetchStats();
    }
  }, [walletAddress, forceRefresh]);

  const fetchStats = async () => {
    if (!walletAddress) return;

    setLoading(true);
    setError("");

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

      // Calculate stats
      if (data.walletAddress && data.heroes) {
        const heroes = data.heroes as Hero[];

        // Get balance (convert from wei to ether - division by 10^18)
        const balanceInWei = data.balance?.balance || "0";
        const balanceInEther = parseFloat(balanceInWei) / 1e18;

        // Calculate heroes stats
        const totalHeroes = heroes.length;
        const stakedHeroes = heroes.filter(
          (h) => h.stakedSince !== null
        ).length;
        const unstaked = totalHeroes - stakedHeroes;

        // Calculate average level
        const totalLevels = heroes.reduce(
          (sum, hero) => sum + Number(hero.level),
          0
        );
        const avgLevel = totalHeroes > 0 ? totalLevels / totalHeroes : 0;

        // Calculate daily generation - only for staked heroes
        const dailyGeneration = heroes.reduce((sum, hero) => {
          // Only count staked heroes for generation
          if (hero.stakedSince === null) return sum;

          const heroLevel = Number(hero.level);
          // $HERO/day formula: (2000 * lvl) / (20 + lvl)
          const heroDaily = (2000 * heroLevel) / (20 + heroLevel);
          return sum + heroDaily;
        }, 0);

        // Calculate claimable amount
        const now = Math.floor(Date.now() / 1000); // current time in seconds
        const claimable = heroes.reduce((sum, hero) => {
          // Only staked heroes can generate claimable tokens
          if (hero.stakedSince === null) return sum;

          const heroLevel = Number(hero.level);
          const lastClaimTime = Number(hero.lastClaim);

          // Daily generation rate for this hero
          const heroDaily = (2000 * heroLevel) / (20 + heroLevel);

          // Generation per second
          const heroPerSecond = heroDaily / 86400;

          // Seconds since last claim
          const secondsSinceLastClaim = now - lastClaimTime;

          // Claimable amount for this hero
          const heroClaimable =
            heroPerSecond * Math.max(0, secondsSinceLastClaim);

          return sum + heroClaimable;
        }, 0);

        // Total available = balance + claimable
        const totalAvailable = balanceInEther + claimable;

        setStats({
          balance: balanceInEther.toFixed(2),
          totalDailyGeneration: dailyGeneration,
          claimableAmount: claimable,
          totalAvailable: totalAvailable,
          averageLevel: avgLevel,
          heroCounts: {
            total: totalHeroes,
            staked: stakedHeroes,
            unstaked: unstaked,
          },
        });

        setLastUpdate(new Date());
      }
    } catch (err: any) {
      setError(err.message || "Error fetching wallet stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg border-2 border-yellow-400 mb-6 animate-pulse">
        <div className="h-40 bg-gray-700 rounded-md"></div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg border-2 border-yellow-400 mb-6 text-red-500">
        {error}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg border-2 border-yellow-400 mb-6 overflow-hidden">
      <div
        className="p-3 flex justify-between items-center cursor-pointer bg-gray-800 hover:bg-gray-700"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className="text-lg font-bold text-yellow-400">Wallet Stats</h2>

        <div className="flex items-center space-x-2">
          {lastUpdate && (
            <span className="text-xs text-gray-400 mr-2">
              Updated: {formatDistanceToNow(lastUpdate, { addSuffix: true })}
            </span>
          )}
          <button className="text-yellow-400 focus:outline-none">
            {isCollapsed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? "max-h-0" : "max-h-screen"}`}
      >
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Balance */}
            <div className="bg-gray-700 p-3 rounded-lg border border-yellow-400">
              <h3 className="text-sm font-medium text-yellow-400 mb-1">
                Actual Balance
              </h3>
              <p className="text-xl font-bold text-white">
                {stats.balance} $HERO
              </p>
            </div>

            {/* Daily Generation */}
            <div className="bg-gray-700 p-3 rounded-lg border border-yellow-400">
              <h3 className="text-sm font-medium text-yellow-400 mb-1">
                Daily Generation
              </h3>
              <p className="text-xl font-bold text-white">
                {stats.totalDailyGeneration.toFixed(2)} $HERO
              </p>
            </div>

            {/* Claimable */}
            <div className="bg-gray-700 p-3 rounded-lg border border-yellow-400">
              <h3 className="text-sm font-medium text-yellow-400 mb-1">
                Claimable
              </h3>
              <p className="text-xl font-bold text-white">
                {stats.claimableAmount.toFixed(2)} $HERO
              </p>
            </div>

            {/* Total Available */}
            <div className="bg-gray-700 p-3 rounded-lg border border-yellow-400">
              <h3 className="text-sm font-medium text-yellow-400 mb-1">
                Total Available
              </h3>
              <p className="text-xl font-bold text-white">
                {stats.totalAvailable.toFixed(2)} $HERO
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Heroes Count */}
            <div className="bg-gray-700 p-3 rounded-lg border border-yellow-400">
              <h3 className="text-sm font-medium text-yellow-400 mb-1">
                Heroes
              </h3>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm">Total</p>
                  <p className="text-lg font-bold text-white">
                    {stats.heroCounts.total}
                  </p>
                </div>
                <div>
                  <p className="text-sm">Staked</p>
                  <p className="text-lg font-bold text-green-400">
                    {stats.heroCounts.staked}
                  </p>
                </div>
                <div>
                  <p className="text-sm">Unstaked</p>
                  <p className="text-lg font-bold text-red-400">
                    {stats.heroCounts.unstaked}
                  </p>
                </div>
              </div>
            </div>

            {/* Average Level */}
            <div className="bg-gray-700 p-3 rounded-lg border border-yellow-400">
              <h3 className="text-sm font-medium text-yellow-400 mb-1">
                Average Level
              </h3>
              <p className="text-xl font-bold text-white">
                {stats.averageLevel.toFixed(2)}
              </p>
            </div>

            {/* Hourly Generation */}
            <div className="bg-gray-700 p-3 rounded-lg border border-yellow-400">
              <h3 className="text-sm font-medium text-yellow-400 mb-1">
                Hourly Rate
              </h3>
              <p className="text-xl font-bold text-white">
                {(stats.totalDailyGeneration / 24).toFixed(2)} $HERO
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
