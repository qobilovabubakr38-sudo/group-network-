import React from 'react';
import { Home, MessageSquare, Cake, Users, Shield } from 'lucide-react';

export default function MobileNav({ user, activeTab, setActiveTab }) {
  const items = [
    { id: 'home', label: 'Bosh sahifa', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'birthdays', label: 'Tug‘ilgan kun', icon: Cake },
    { id: 'contacts', label: 'Qarindoshlar', icon: Users },
  ];

  if (user?.is_admin === 1) {
    items.push({ id: 'admin', label: 'Admin', icon: Shield, isAdmin: true });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-family-night/95 backdrop-blur-xl border-t border-family-gold/20 md:hidden px-2 py-2 flex items-center justify-around shadow-2xl">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
              isActive
                ? 'text-family-gold'
                : 'text-family-text-muted hover:text-family-text-secondary'
            }`}
          >
            <Icon size={20} className={isActive ? 'scale-110 text-family-gold' : ''} />
            <span className="text-[10px] font-medium tracking-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
