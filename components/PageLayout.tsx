"use client";

import Navigation from "./Navigation";
import { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  widerContent?: boolean;
}

export default function PageLayout({
  children,
  title,
  widerContent = false,
}: PageLayoutProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div
        className={`bg-gray-900 rounded-lg shadow-2xl p-6 w-full ${widerContent ? "max-w-5xl" : "max-w-2xl"} border-4 border-yellow-400`}
      >
        <h1 className="text-2xl font-bold text-center mb-6 text-yellow-400 pixel-text">
          {title}
        </h1>
        <Navigation />
        {children}
      </div>
    </main>
  );
}
