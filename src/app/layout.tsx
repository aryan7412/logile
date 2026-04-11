import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FS-EXPLORER v1.0",
  description: "Hierarchical file system explorer — vintage terminal edition",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body style={{ height: "100vh", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
