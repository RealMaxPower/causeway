import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const siteTitle = "Causeway — an explorable economy";
const siteDescription =
  "Understand the economy as a machine you can drive. Three layers per concept: pocket, working model, full picture.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    siteName: "Causeway",
    title: siteTitle,
    description: siteDescription,
    type: "website",
    locale: "en_US",
    url: siteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efe1" },
    { media: "(prefers-color-scheme: dark)", color: "#2a2620" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('cw-theme');var d=s==='dark'||((s===null||s==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-paper text-ink min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-100 focus:bg-ink-surface focus:text-ink-surface-fg focus:px-3 focus:py-2 focus:rounded"
        >
          Skip to main content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
