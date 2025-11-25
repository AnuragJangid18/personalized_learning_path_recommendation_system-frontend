import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await login(form);
      setMessage('');
      setTimeout(() => window.location.href = '#/', 500);
    } catch (err) {
      // Prefer backend message, fallback to user-friendly default
      const msg = err?.response?.data?.message || err?.response?.data?.error || '';
      if (msg === 'Invalid email or password') {
        setMessage('Invalid email or password. Please check your credentials and try again.');
      } else if (msg) {
        setMessage(msg);
      } else {
        setMessage('Login failed. Please try again.');
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-xl">🔐</span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-primary">Welcome Back!</h3>
            <p className="text-xs text-slate-600">Sign in to continue your learning journey</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <span>📧</span>
            <span>Email Address</span>
          </label>
          <div className="relative">
            <input 
              id="login-email"
              type="email"
              placeholder="Enter your email" 
              value={form.email} 
              onChange={e=>setForm({...form,email:e.target.value})} 
              className="w-full border-2 border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 placeholder-slate-400 transition-all"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <span>🔒</span>
            <span>Password</span>
          </label>
          <div className="relative">
            <input 
              id="login-password"
              placeholder="Enter your password" 
              type={showPassword ? 'text' : 'password'}
              value={form.password} 
              onChange={e=>setForm({...form,password:e.target.value})} 
              className="w-full border-2 border-slate-200 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900 placeholder-slate-400 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              <span className="text-lg">{showPassword ? '👁️' : '👁️‍🗨️'}</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {message && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-fade-in" aria-live="polite">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div>
                <div className="font-semibold text-red-800 text-sm">Login Failed</div>
                <div className="text-sm text-red-700 mt-0.5">{message}</div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button 
          disabled={busy} 
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <span className="animate-spin text-xl">🔄</span>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      {/* Info Footer */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-3 border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>💡</span>
          <span>Your session is secure and encrypted</span>
        </div>
      </div>
    </div>
  );
}
