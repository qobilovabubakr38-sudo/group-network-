import React, { useState, useEffect } from 'react';
import { Cake, Sparkles, Send, Calendar, Clock, Gift, Heart } from 'lucide-react';
import TabriklashModal from '../components/TabriklashModal';
import { api } from '../utils/api';

export default function BirthdaysPage({ user, onSelectGroup }) {
  const [data, setData] = useState({ today: [], tomorrow: [], upcoming: [], all: [] });
  const [loading, setLoading] = useState(true);
  const [selectedRelative, setSelectedRelative] = useState(null);

  useEffect(() => {
    loadBirthdays();
  }, []);

  const loadBirthdays = async () => {
    try {
      setLoading(true);
      const res = await api.getBirthdays();
      setData(res || { today: [], tomorrow: [], upcoming: [], all: [] });
    } catch (err) {
      console.error('Tug‘ilgan kunlarni olishda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-family-card via-[#1E2942] to-family-card border border-family-gold/30 p-6 sm:p-8 shadow-gold-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-family-gold/20 border border-family-gold/40 flex items-center justify-center text-family-gold shrink-0">
              <Cake size={28} className="animate-pulse-subtle" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-family-gold uppercase tracking-wider">
                  Oilaviy Qutlovlar
                </span>
                <Sparkles size={14} className="text-family-gold" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-family-text-primary mt-0.5">
                Tug‘ilgan Kunlar
              </h1>
              <p className="text-xs text-family-text-secondary mt-1">
                Faqat siz bilan umumiy guruhga ega bo‘lgan aziz qarindoshlarimiz tavallud ayyomlari
              </p>
            </div>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-family-night/80 border border-family-gold/20 text-center self-start sm:self-center">
            <div className="text-xl font-bold text-family-gold">{data.today.length}</div>
            <div className="text-[10px] text-family-text-secondary uppercase">Bugun tavallud</div>
          </div>
        </div>
      </div>

      {/* SECTION: BUGUN */}
      {data.today.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>BUGUN</span>
            </span>
            <h2 className="text-base font-bold text-family-text-primary">
              Bugun tug‘ilgan kunlari!
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.today.map((item) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-family-card via-[#221C2B] to-family-card border-2 border-family-gold p-6 shadow-gold-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl bg-family-gold/20 p-0.5 border border-family-gold shrink-0">
                    <img
                      src={item.avatar || '/avatars/male1.png'}
                      alt={item.first_name}
                      className="w-full h-full object-cover rounded-2xl bg-family-surface"
                    />
                    <div className="absolute -bottom-1 -right-1 text-lg">🎉</div>
                  </div>

                  <div>
                    <div className="text-base font-bold text-family-text-primary">
                      {item.first_name} {item.last_name}
                    </div>
                    <div className="text-xs font-semibold text-family-gold mt-0.5">
                      {item.relationship} {item.turningAge ? `— ${item.turningAge} yoshga to‘ldilar` : ''}
                    </div>
                    <div className="text-[11px] text-family-text-muted mt-1 flex items-center gap-1.5 font-mono">
                      <Calendar size={12} />
                      <span>{item.formattedDate}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRelative(item)}
                  className="px-5 py-2.5 gold-btn rounded-xl text-xs flex items-center justify-center gap-2 font-bold shadow-gold-sm transition self-stretch sm:self-auto"
                >
                  <Gift size={16} />
                  <span>Tabriklash</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: ERTAGA */}
      {data.tomorrow.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
              ERTAGA
            </span>
            <h2 className="text-base font-bold text-family-text-primary">
              Ertaga kutayotgan tavallud ayyomlar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.tomorrow.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl glass-card p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={item.avatar || '/avatars/male1.png'}
                    alt={item.first_name}
                    className="w-12 h-12 rounded-xl object-cover bg-family-surface border border-white/10"
                  />
                  <div>
                    <div className="text-sm font-bold text-family-text-primary">
                      {item.first_name} {item.last_name}
                    </div>
                    <div className="text-xs text-family-gold">{item.relationship}</div>
                    <div className="text-[11px] text-family-text-muted mt-0.5 font-mono">
                      {item.formattedDate}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRelative(item)}
                  className="px-4 py-2 rounded-xl bg-family-gold/15 hover:bg-family-gold/25 text-family-gold text-xs font-semibold border border-family-gold/30 transition"
                >
                  Tabrik tayyorlash
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: YAQINDA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-family-surface text-family-gold border border-family-gold/20 text-xs font-bold uppercase tracking-wider">
            YAQINDA
          </span>
          <h2 className="text-base font-bold text-family-text-primary">
            Keyingi 30 kun ichidagi tug‘ilgan kunlar
          </h2>
        </div>

        {data.upcoming.length === 0 ? (
          <div className="p-8 rounded-2xl glass-card text-center text-xs text-family-text-muted">
            Yaqin 30 kun ichida tug‘ilgan kunlar yo‘q
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.upcoming.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl glass-card p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.avatar || '/avatars/male1.png'}
                    alt={item.first_name}
                    className="w-11 h-11 rounded-xl object-cover bg-family-surface border border-white/5"
                  />
                  <div>
                    <div className="text-xs font-bold text-family-text-primary">
                      {item.first_name} {item.last_name}
                    </div>
                    <div className="text-[11px] text-family-gold">{item.relationship}</div>
                    <div className="text-[10px] text-family-text-muted mt-0.5 font-mono">
                      {item.formattedDate}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-semibold text-family-text-secondary px-2.5 py-1 rounded-lg bg-family-night border border-white/5">
                    {item.daysUntil} kundan keyin
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabriklash Modal */}
      {selectedRelative && (
        <TabriklashModal
          relative={selectedRelative}
          onClose={() => setSelectedRelative(null)}
          onSuccess={(groupId) => {
            if (groupId && onSelectGroup) {
              onSelectGroup(groupId);
            }
          }}
        />
      )}
    </div>
  );
}
