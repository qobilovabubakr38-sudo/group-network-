import React from 'react';
import { Home, MessageSquare, Cake, Users, User, Shield, Sparkles, UserCheck, Eye } from 'lucide-react';

export default function Sidebar({ user, activeTab, setActiveTab, isOpen, onClose, pendingPermissionsCount = 0 }) {
  const navItems = [
    { id: 'home', label: 'Bosh sahifa', icon: Home },
    { id: 'chat', label: 'Guruhlar & Chat', icon: MessageSquare },
    { id: 'birthdays', label: 'Tug‘ilgan kunlar', icon: Cake },
    { id: 'contacts', label: 'Qarindoshlar', icon: Users },
    { id: 'profile', label: 'Profilim', icon: User },
  ];

  if (user?.is_admin === 1) {
    navItems.push({
      id: 'admin_permissions',
      label: 'Ruxsatlar Bo‘limi',
      icon: UserCheck,
      isAdmin: true,
      badge: pendingPermissionsCount > 0 ? pendingPermissionsCount : null,
      badgeColor: 'bg-rose-500 text-white',
    });
    navItems.push({
      id: 'admin_surveillance',
      label: 'Kuzatuv Markazi',
      icon: Eye,
      isAdmin: true,
    });
    navItems.push({
      id: 'admin',
      label: 'Super Admin Paneli',
      icon: Shield,
      isAdmin: true,
    });
  }

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 md:top-[61px] left-0 z-40 h-full md:h-[calc(100vh-61px)] w-64 bg-family-night border-r border-family-gold/15 flex flex-col justify-between py-6 px-4 transition-transform duration-300 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Mobile drawer header */}
          <div className="flex items-center gap-2.5 px-3 md:hidden">
            <div className="w-8 h-8 rounded-xl bg-family-surface border border-family-gold/40 flex items-center justify-center text-family-gold">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="font-serif font-bold text-sm tracking-wider text-family-text-primary">
                GROUP
              </div>
              <div className="text-[9px] text-family-gold uppercase tracking-wider">
                Private Network
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all group relative ${
                    isActive
                      ? item.isAdmin
                        ? 'bg-gradient-to-r from-family-card to-amber-950/40 text-family-gold border border-family-gold/40 shadow-gold-sm'
                        : 'bg-family-card text-family-gold border border-family-gold/30 shadow-gold-sm'
                      : 'text-family-text-secondary hover:text-family-text-primary hover:bg-family-surface/60'
                  }`}
                >
                  <Icon
                    size={18}
                    className={`transition ${
                      isActive ? 'text-family-gold scale-110' : 'text-family-text-muted group-hover:text-family-gold'
                    }`}
                  />
                  <span>{item.label}</span>

                  {item.badge ? (
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-family-gold text-black'} shadow-sm animate-pulse font-mono`}>
                      {item.badge}
                    </span>
                  ) : item.isAdmin ? (
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-family-gold/15 text-family-gold border border-family-gold/30 font-bold tracking-wider">
                      ADMIN
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info badge */}
        <div className="pt-4 border-t border-white/5 px-2 text-center">
          <p className="text-[11px] text-family-text-muted">
            Yopiq Qarindoshlar Platformasi
          </p>
          <p className="text-[10px] text-family-gold/60 mt-0.5">
            Group Isolation & High Security
          </p>
        </div>
      </aside>
    </>
  );
}
