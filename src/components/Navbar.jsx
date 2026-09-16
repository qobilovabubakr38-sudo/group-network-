import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Shield, Menu, Sparkles, Check } from 'lucide-react';
import { api } from '../utils/api';

export default function Navbar({ user, onLogout, onToggleSidebar, activeTab, setActiveTab }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Ignore background poll errors
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-family-night/85 backdrop-blur-xl border-b border-family-gold/15 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 md:hidden text-family-text-secondary hover:text-family-gold transition rounded-xl"
            aria-label="Menyu"
          >
            <Menu size={22} />
          </button>

          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {/* Crest Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-family-card to-family-surface border border-family-gold/40 flex items-center justify-center text-family-gold shadow-gold-sm group-hover:scale-105 transition">
              <Sparkles size={18} />
            </div>

            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-serif font-bold text-base tracking-wider text-family-text-primary">
                  GROUP
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-family-gold animate-pulse-subtle" />
              </div>
              <span className="text-[10px] text-family-gold/80 tracking-widest uppercase font-medium">
                Private Network
              </span>
            </div>
          </div>
        </div>

        {/* Right: Notifications, User Pill, Logout */}
        <div className="flex items-center gap-3">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl bg-family-card/60 hover:bg-family-card border border-white/5 hover:border-family-gold/30 text-family-text-secondary hover:text-family-gold transition"
              aria-label="Bildirishnomalar"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-family-card border border-family-gold/30 rounded-2xl shadow-gold-lg py-3 z-50 animate-scale-in">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-white/5">
                  <h4 className="text-xs font-semibold text-family-text-primary">Bildirishnomalar</h4>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-family-gold hover:underline flex items-center gap-1"
                    >
                      <Check size={12} />
                      Barchasini o‘qilgan qilish
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-family-text-muted">
                      Hozircha yangi bildirishnomalar yo‘q
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setShowNotifications(false);
                          if (n.link) {
                            if (n.link.startsWith('/chat/')) {
                              setActiveTab('chat');
                            }
                          }
                        }}
                        className={`p-3.5 hover:bg-family-night/60 cursor-pointer transition ${
                          !n.read ? 'bg-family-gold/5' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-semibold text-family-text-primary">{n.title}</div>
                          <span className="text-[10px] text-family-text-muted">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-family-text-secondary mt-1 line-clamp-2">
                          {n.body}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-family-card/60 hover:bg-family-card border border-white/5 hover:border-family-gold/30 transition cursor-pointer"
          >
            <img
              src={user?.avatar || '/avatars/male1.png'}
              alt={user?.first_name}
              className="w-7 h-7 rounded-lg object-cover bg-family-surface"
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-family-text-primary leading-tight">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="text-[10px] text-family-gold leading-tight">
                {user?.is_admin === 1 ? 'Super Admin' : user?.relationship}
              </span>
            </div>
            {user?.is_admin === 1 && (
              <Shield size={14} className="text-family-gold hidden sm:inline" />
            )}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-family-card/60 hover:bg-rose-500/15 border border-white/5 hover:border-rose-500/30 text-family-text-muted hover:text-rose-400 transition"
            title="Chiqish"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
