import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <main className="text-center px-6">
        {/* Logo */}
        <div className="text-7xl mb-6">🏪</div>

        <h1 className="text-5xl font-bold text-white mb-4 bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text">
          Merthanaya POS
        </h1>

        <p className="text-xl text-gray-400 mb-12 max-w-md mx-auto">
          Traditional Market Hybrid Point-of-Sales System
        </p>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Runner Card */}
          <Link href="/runner" className="group">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:scale-105">
              <div className="text-5xl mb-4">📱</div>
              <h2 className="text-2xl font-bold text-white mb-2">Runner</h2>
              <p className="text-gray-400 text-sm">
                Tablet interface for mobile staff to input items and generate tickets
              </p>
              <div className="mt-4 text-indigo-400 group-hover:text-indigo-300 font-medium">
                Open App →
              </div>
            </div>
          </Link>

          {/* Cashier Card */}
          <Link href="/cashier" className="group">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105">
              <div className="text-5xl mb-4">💳</div>
              <h2 className="text-2xl font-bold text-white mb-2">Cashier</h2>
              <p className="text-gray-400 text-sm">
                Desktop dashboard to view pending orders and process payments
              </p>
              <div className="mt-4 text-emerald-400 group-hover:text-emerald-300 font-medium">
                Open Dashboard →
              </div>
            </div>
          </Link>

          {/* Admin Card */}
          <Link href="/admin/products" className="group">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
              <div className="text-5xl mb-4">⚙️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Admin</h2>
              <p className="text-gray-400 text-sm">
                Manage products, inventory, and system settings
              </p>
              <div className="mt-4 text-purple-400 group-hover:text-purple-300 font-medium">
                Open Panel →
              </div>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-sm text-gray-500">
          <p>Built with Next.js, FastAPI & Supabase</p>
        </footer>
      </main>
    </div>
  );
}
