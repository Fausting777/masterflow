import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MasterFlow',
  description: 'Приложение для мастеров',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MasterFlow',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="bg-white text-neutral-900 antialiased">
        <div className="min-h-screen">{children}</div>
        <footer className="border-t border-neutral-200 bg-neutral-50 px-4 py-4 text-xs text-neutral-500">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <p>MasterFlow</p>
            <div className="flex items-center gap-4">
              <Link href="/impressum" className="hover:text-neutral-900">
                Impressum
              </Link>
              <Link href="/datenschutz" className="hover:text-neutral-900">
                Datenschutz
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
