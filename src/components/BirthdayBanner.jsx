import React, { useState } from 'react';
import { Cake, Sparkles, ChevronRight, X } from 'lucide-react';
import TabriklashModal from './TabriklashModal';

export default function BirthdayBanner({ todayBirthdays = [], onTabrikSuccess }) {
  const [activeModalRelative, setActiveModalRelative] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !todayBirthdays || todayBirthdays.length === 0) {
    return null;
  }

  const relative = todayBirthdays[0]; // Primary birthday celebrant

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-family-card via-[#1A253D] to-family-card border border-family-gold/40 p-4 mb-6 shadow-gold-sm animate-fade-in">
        {/* Subtle gold glow background */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-family-gold/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-family-gold/20 border border-family-gold/40 flex items-center justify-center text-family-gold shrink-0">
              <Cake size={24} className="animate-pulse-subtle" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-family-gold tracking-wider uppercase">
                  Oila bayrami
                </span>
                <Sparkles size={12} className="text-family-gold" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-family-text-primary">
                Bugun <span className="text-family-gold font-bold">{relative.first_name} {relative.relationship}</span>ning tavallud kunlari! 🎉
              </h3>
              {todayBirthdays.length > 1 && (
                <p className="text-xs text-family-text-secondary">
                  va yana {todayBirthdays.length - 1} nafar aziz qarindoshimiz
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setActiveModalRelative(relative)}
              className="px-4 py-2 gold-btn rounded-xl text-xs flex items-center gap-1.5 font-semibold shadow-gold-sm transition"
            >
              <span>Tabriklash</span>
              <ChevronRight size={14} />
            </button>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-2 text-family-text-muted hover:text-family-text-primary transition"
              title="Yopish"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {activeModalRelative && (
        <TabriklashModal
          relative={activeModalRelative}
          onClose={() => setActiveModalRelative(null)}
          onSuccess={(groupId) => {
            if (onTabrikSuccess) onTabrikSuccess(groupId);
          }}
        />
      )}
    </>
  );
}
