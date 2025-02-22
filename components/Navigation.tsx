"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Navigation() {
    const pathname = usePathname()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    // Close menu when changing routes
    useEffect(() => {
        setIsMenuOpen(false)
    }, [pathname])

    return (
        <nav className="mb-6">
            {/* Mobile menu button */}
            <div className="sm:hidden">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="w-full flex items-center justify-between p-2 bg-gray-800 border-2 border-yellow-400 rounded-md"
                >
                    <span className="text-yellow-400">Menu</span>
                    <svg
                        className="w-6 h-6 text-yellow-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {isMenuOpen ? (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        ) : (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        )}
                    </svg>
                </button>

                {/* Mobile menu */}
                {isMenuOpen && (
                    <div className="mt-2 space-y-2">
                        <Link
                            href="/"
                            className={`block px-4 py-2 rounded-md ${
                                pathname === "/"
                                    ? "bg-yellow-400 text-black"
                                    : "bg-gray-800 text-yellow-400 hover:bg-gray-700"
                            }`}
                        >
                            Single Hero
                        </Link>
                        <Link
                            href="/multi"
                            className={`block px-4 py-2 rounded-md ${
                                pathname === "/multi"
                                    ? "bg-yellow-400 text-black"
                                    : "bg-gray-800 text-yellow-400 hover:bg-gray-700"
                            }`}
                        >
                            Wallet
                        </Link>
                    </div>
                )}
            </div>

            {/* Desktop menu */}
            <div className="hidden sm:flex sm:space-x-4">
                <Link
                    href="/"
                    className={`px-4 py-2 rounded-md ${
                        pathname === "/"
                            ? "bg-yellow-400 text-black"
                            : "bg-gray-800 text-yellow-400 hover:bg-gray-700"
                    }`}
                >
                    Single Hero
                </Link>
                <Link
                    href="/multi"
                    className={`px-4 py-2 rounded-md ${
                        pathname === "/multi"
                            ? "bg-yellow-400 text-black"
                            : "bg-gray-800 text-yellow-400 hover:bg-gray-700"
                    }`}
                >
                    Wallet
                </Link>
            </div>
        </nav>
    )
}