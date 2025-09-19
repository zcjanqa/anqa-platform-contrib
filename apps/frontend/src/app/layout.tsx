import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import NavBar from "../components/NavBar";

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
