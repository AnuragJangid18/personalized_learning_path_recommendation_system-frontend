import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
// no local hooks needed for header (dark mode toggle removed)

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-gradient-to-br from-[#0A3041] via-[#1a5270] to-[#0f4560] text-white shadow-xl relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-[1400px] mx-auto px-10 py-8 relative z-10">
        <div className="flex justify-between items-start gap-6">
          {/* Left: Branding */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <span className="text-3xl">🎓</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
                  Smart AI Tutor for Students
                  <span className="block text-2xl font-semibold text-cyan-200 mt-1">& Recommendation System</span>
                </h1>
              </div>
            </div>
            <div className="ml-16 mt-2">
              <ol className="list-decimal list-inside text-sm text-white font-medium space-y-1 [&>li::marker]:text-white">
                <li className="flex items-center gap-2 text-white">
                  <span className="ml-2">🤖</span>
                  <span className="text-white">Powered by Reinforcement Learning</span>
                </li>
                <li className="flex items-center gap-2 text-white">
                  <span className="ml-2">🏫</span>
                  <span className="text-white">SAI VIDYA INSTITUTE OF TECHNOLOGY</span>
                </li>
                <li className="flex items-center gap-2 text-white">
                  <span className="ml-2">💻</span>
                  <span className="text-white">CSE (AI & ML)</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Right: Auth Section */}
          <div className="text-right">
            {user ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-green-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-cyan-200 font-medium">Logged in as</div>
                    <div className="font-semibold text-white text-sm truncate max-w-[180px]">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg">
                <div className="flex items-center gap-2 mb-3 text-cyan-200">
                  <span>👤</span>
                  <span className="text-sm font-medium">Guest Mode</span>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-lg inline-flex items-center justify-center gap-1"
                  >
                    <span>🔑</span>
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex-1 bg-cyan-500/90 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-lg inline-flex items-center justify-center gap-1"
                  >
                    <span>✨</span>
                    <span>Register</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
