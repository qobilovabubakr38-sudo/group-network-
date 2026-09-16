import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Sparkles, AlertCircle, Info, Loader2 } from 'lucide-react';
import { api } from '../utils/api';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setShowForgotNotice(false);

    if (!username.trim() || !password) {
      setErrorMsg('Login va parolni kiriting.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.login(username.trim(), password);
      
      // Store token for backup auth header
      if (res.token) {
        localStorage.setItem('family_token', res.token);
      }

      onLoginSuccess(res.user, res.groups);
    } catch (err) {
      console.error('Kirish xatoligi:', err);
      setErrorMsg(err.message || 'Noto‘g‘ri login yoki parol.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#05070B] relative overflow-hidden">
      {/* Subtle luxury ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-b from-family-gold/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* Elegant Glass Login Card */}
      <div className="relative w-full max-w-md bg-family-card/85 backdrop-blur-2xl border border-family-gold/30 rounded-3xl p-8 sm:p-10 shadow-gold-lg animate-fade-in">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-family-card via-[#1A253D] to-family-surface border border-family-gold/50 flex items-center justify-center text-family-gold mb-4 shadow-gold-sm">
            <Sparkles size={28} className="animate-pulse-subtle" />
          </div>

          <h1 className="font-serif text-3xl font-bold tracking-wider text-family-text-primary">
            GROUP
          </h1>
          <p className="text-[11px] text-family-gold tracking-widest uppercase font-semibold mt-1">
            Private Network
          </p>
          <p className="text-xs text-family-text-secondary mt-2">
            Faqat taklif etilgan a‘zolar uchun yopiq platforma
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 mb-6 animate-scale-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Forgot Password Notice Modal / Box */}
        {showForgotNotice && (
          <div className="p-4 bg-family-night border border-family-gold/30 rounded-2xl mb-6 text-xs text-family-text-secondary animate-scale-in">
            <div className="flex items-center gap-2 text-family-gold font-semibold mb-1">
              <Info size={16} />
              <span>Parolni unutdingizmi?</span>
            </div>
            <p className="leading-relaxed">
              Xavfsizlik talablariga binoan, parolni faqat oila boshlig‘i (Super Admin) tiklab berishi mumkin.
              Iltimos, parolingizni yangilash uchun <strong>Admin bilan bog‘laning</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotNotice(false)}
              className="mt-2 text-[11px] text-family-gold hover:underline font-medium"
            >
              Tushunarli
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-family-text-secondary mb-1.5 tracking-wide">
              LOGIN
            </label>
            <div className="relative flex items-center">
              <User size={18} className="absolute left-3.5 text-family-text-muted" />
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Login (masalan: admin yoki sobir_amaki)"
                className="w-full bg-family-night/80 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-family-text-primary placeholder:text-family-text-muted focus:outline-none focus:border-family-gold/60 focus:ring-1 focus:ring-family-gold/40 transition"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-family-text-secondary mb-1.5 tracking-wide">
              PAROL
            </label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-3.5 text-family-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolingizni kiriting"
                className="w-full bg-family-night/80 border border-white/10 rounded-2xl pl-10 pr-11 py-3 text-sm text-family-text-primary placeholder:text-family-text-muted focus:outline-none focus:border-family-gold/60 focus:ring-1 focus:ring-family-gold/40 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-family-text-muted hover:text-family-text-primary transition"
                aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot password link */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowForgotNotice(true)}
              className="text-xs text-family-text-muted hover:text-family-gold transition"
            >
              Parolni unutdingizmi?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 gold-btn rounded-2xl text-sm font-bold tracking-wide shadow-gold-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Tekshirilmoqda...</span>
              </>
            ) : (
              <span>KIRISH</span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[11px] text-family-text-muted">
            Platformada mustaqil ro‘yxatdan o‘tish (Sign Up) mavjud emas.
          </p>
          <p className="text-[10px] text-family-gold/60 mt-1">
            Faqat Oila Boshlig‘i tomonidan taqdim etilgan hisob orqali kiriladi.
          </p>
        </div>
      </div>
    </div>
  );
}
