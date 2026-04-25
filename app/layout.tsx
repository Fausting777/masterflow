import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { getDictionary } from '@/lib/i18n/server';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'MasterFlow',
  description: 'MasterFlow',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1d4ed8' },
  ],
  colorScheme: 'light dark',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getDictionary();

  return (
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 antialiased" style={{ fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
        <LocaleProvider locale={locale}>
          <div className="min-h-screen">{children}</div>

          <footer className="border-t border-neutral-200 bg-neutral-50 px-4 py-4 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center sm:text-left">MasterFlow</p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-end">
                <div className="rounded-full border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800">
                  <LanguageSwitcher />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                  <Link
                    href="/impressum"
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
                  >
                    {t.footer.impressum}
                  </Link>
                  <Link
                    href="/datenschutz"
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
                  >
                    {t.footer.privacy}
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
