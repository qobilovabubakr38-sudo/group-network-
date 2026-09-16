import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Cake, ChevronRight, Shield, Sparkles, Clock } from 'lucide-react';
import BirthdayBanner from '../components/BirthdayBanner';
import { api } from '../utils/api';

export default function HomePage({ user, onSelectGroup, onNavigateTab }) {
  const [groups, setGroups] = useState([]);
  const [birthdays, setBirthdays] = useState({ today: [], tomorrow: [], upcoming: [] });
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [groupsData, bdayData, contactsData] = await Promise.all([
        api.getGroups(),
        api.getBirthdays(),
        api.getContacts(),
      ]);

      setGroups(groupsData.groups || []);
      setBirthdays(bdayData || { today: [], tomorrow: [], upcoming: [] });
      setContacts(contactsData.contacts || []);
    } catch (err) {
      console.error('Bosh sahifa ma‘lumotlarini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Birthday Celebration Banner if today is someone's birthday */}
      <BirthdayBanner
        todayBirthdays={birthdays.today}
        onTabrikSuccess={(groupId) => {
          if (groupId && onSelectGroup) {
            onSelectGroup(groupId);
          }
        }}
      />

      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-family-card via-family-night to-family-surface border border-family-gold/20 p-6 sm:p-8 shadow-gold-sm">
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-family-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-family-gold uppercase tracking-wider">
                Xush kelibsiz
              </span>
              <Sparkles size={14} className="text-family-gold" />
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-family-text-primary">
              Assalomu alaykum, {user?.first_name}!
            </h1>
            <p className="text-xs sm:text-sm text-family-text-secondary mt-1">
              Qarindoshlik rishtalarimiz mustahkam, oilaviy diydorimiz bardavom bo‘lsin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-family-night/80 border border-family-gold/25 text-center">
              <div className="text-base sm:text-lg font-bold text-family-gold">{groups.length}</div>
              <div className="text-[10px] text-family-text-secondary uppercase">Mening Guruhlarim</div>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-family-night/80 border border-family-gold/25 text-center">
              <div className="text-base sm:text-lg font-bold text-family-text-primary">{contacts.length}</div>
              <div className="text-[10px] text-family-text-secondary uppercase">Qarindoshlar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: User's Groups */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-family-gold/15 text-family-gold">
                <MessageSquare size={18} />
              </div>
              <h2 className="text-base font-bold text-family-text-primary">
                Mening guruhlarim
              </h2>
            </div>

            <span className="text-xs text-family-text-muted">
              Faqat siz a‘zo bo‘lgan guruhlar
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-family-card animate-pulse border border-white/5" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="p-8 rounded-2xl bg-family-card border border-white/5 text-center">
              <Users size={32} className="mx-auto text-family-text-muted mb-2" />
              <p className="text-sm text-family-text-secondary">
                Siz hozircha hech qanday oilaviy guruhga qo‘shilmagansiz.
              </p>
              <p className="text-xs text-family-text-muted mt-1">
                Guruhlarga biriktirish uchun Oila Boshlig‘iga (Admin) murojaat qiling.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => onSelectGroup(g.id)}
                  className="glass-card rounded-2xl p-5 cursor-pointer transition flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-family-text-primary group-hover:text-family-gold transition">
                        {g.name}
                      </h3>
                      <p className="text-xs text-family-text-secondary line-clamp-1 mt-0.5">
                        {g.description || 'Oilaviy xabarlar va diydor'}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-family-surface text-family-gold text-[11px] font-semibold shrink-0">
                      {g.member_count || 0} a‘zo
                    </span>
                  </div>

                  {/* Last message snippet */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-family-text-muted">
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock size={12} />
                      <span className="truncate">
                        {g.last_message
                          ? `${g.last_message.first_name}: ${g.last_message.content || 'Biriktirma'}`
                          : 'Hozircha xabarlar yo‘q'}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-family-gold shrink-0 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Upcoming Birthdays Widget */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-family-gold/15 text-family-gold">
                <Cake size={18} />
              </div>
              <h2 className="text-base font-bold text-family-text-primary">
                Yaqin tug‘ilgan kunlar
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('birthdays')}
              className="text-xs text-family-gold hover:underline"
            >
              Hammasi
            </button>
          </div>

          <div className="glass-card rounded-2xl p-4 divide-y divide-white/5">
            {birthdays.today.length === 0 && birthdays.tomorrow.length === 0 && birthdays.upcoming.length === 0 ? (
              <div className="py-6 text-center text-xs text-family-text-muted">
                Yaqin kunlarda tug‘ilgan kunlar yo‘q
              </div>
            ) : (
              <>
                {/* Today */}
                {birthdays.today.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={b.avatar || '/avatars/male1.png'}
                        alt={b.first_name}
                        className="w-10 h-10 rounded-xl object-cover border border-family-gold bg-family-surface"
                      />
                      <div>
                        <div className="text-xs font-bold text-family-gold flex items-center gap-1">
                          <span>{b.first_name} {b.last_name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-family-gold/20 text-family-gold">BUGUN</span>
                        </div>
                        <div className="text-[11px] text-family-text-secondary">{b.relationship}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-family-gold">🎉</span>
                  </div>
                ))}

                {/* Tomorrow */}
                {birthdays.tomorrow.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={b.avatar || '/avatars/male1.png'}
                        alt={b.first_name}
                        className="w-9 h-9 rounded-xl object-cover bg-family-surface"
                      />
                      <div>
                        <div className="text-xs font-semibold text-family-text-primary">
                          {b.first_name} {b.last_name}
                        </div>
                        <div className="text-[11px] text-family-text-secondary">{b.relationship}</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-family-gold font-medium">Ertaga</span>
                  </div>
                ))}

                {/* Upcoming */}
                {birthdays.upcoming.slice(0, 3).map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={b.avatar || '/avatars/male1.png'}
                        alt={b.first_name}
                        className="w-9 h-9 rounded-xl object-cover bg-family-surface"
                      />
                      <div>
                        <div className="text-xs font-semibold text-family-text-primary">
                          {b.first_name} {b.last_name}
                        </div>
                        <div className="text-[11px] text-family-text-secondary">{b.relationship}</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-family-text-muted">
                      {b.daysUntil} kundan keyin
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
