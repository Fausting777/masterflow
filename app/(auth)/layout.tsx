export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">MasterFlow</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Приложение для мастеров
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
          {children}
        </div>
      </div>
    </main>
  );
}