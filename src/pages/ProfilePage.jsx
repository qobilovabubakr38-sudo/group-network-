import React, { useState, useEffect } from 'react';
import { User, Shield, Cake, Calendar, Users, Lock, Sparkles, Check } from 'lucide-react';
import { api } from '../utils/api';

export default function ProfilePage({ user }) {
  const [profileData, setProfileData] = useState(user);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.getMe();
      setProfileData(res.user);
      setGroups(res.groups || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header Profile Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-family-card via-[#1A2338] to-family-card border border-family-gold/30 p-6 sm:p-8 shadow-gold-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-family-gold/20 p-1 border-2 border-family-gold shrink-0 shadow-gold-md">
            <img
              src={profileData?.avatar || '/avatars/male1.png'}
              alt={profileData?.first_name}
              className="w-full h-full object-cover rounded-2xl bg-family-surface"
            />
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-family-night" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full bg-family-gold/15 text-family-gold text-xs font-bold uppercase tracking-wider">
                {profileData?.is_admin === 1 ? 'Super Admin' : profileData?.relationship}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">● Hozir onlayn</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-family-text-primary">
              {profileData?.first_name} {profileData?.last_name}
            </h1>
            <p className="text-xs text-family-text-muted mt-0.5 font-mono">
              @{profileData?.username}
            </p>
          </div>
        </div>
      </div>

      {/* Details & Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal details */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <User size={18} className="text-family-gold" />
            <h2 className="text-sm font-bold text-family-text-primary">
              Shaxsiy Ma‘lumotlar
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-family-text-secondary">Ism va familiya:</span>
              <span className="font-semibold text-family-text-primary">
                {profileData?.first_name} {profileData?.last_name}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-family-text-secondary">Qarindoshlik turi:</span>
              <span className="font-semibold text-family-gold">
                {profileData?.relationship}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-family-text-secondary">Tug‘ilgan sana:</span>
              <span className="font-semibold text-family-text-primary font-mono">
                {profileData?.birthday || 'Belgilanmagan'}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-family-text-secondary">Tizimdagi login:</span>
              <span className="font-semibold text-family-text-primary font-mono">
                {profileData?.username}
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-family-text-secondary">A‘zolik holati:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                <Check size={14} /> Faol
              </span>
            </div>
          </div>
        </div>

        {/* Permitted Groups */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Users size={18} className="text-family-gold" />
              <h2 className="text-sm font-bold text-family-text-primary">
                A‘zo Bo‘lgan Guruhlaringiz
              </h2>
            </div>
            <span className="text-xs text-family-gold font-bold">{groups.length} ta guruh</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="text-xs text-family-text-muted py-4 text-center">
                Hozircha bironta ham guruhga qo‘shilmagansiz.
              </p>
            ) : (
              groups.map((g) => (
                <div
                  key={g.id}
                  className="p-3 rounded-2xl bg-family-night border border-white/5 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-family-text-primary">{g.name}</h4>
                    {g.description && (
                      <p className="text-[10px] text-family-text-muted truncate mt-0.5">
                        {g.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-family-surface text-family-gold">
                    Ruxsat berilgan
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-white/5">
            <div className="flex items-start gap-2.5 text-[11px] text-family-text-muted leading-relaxed">
              <Lock size={14} className="text-family-gold shrink-0 mt-0.5" />
              <span>
                Qat‘iy guruh izolyatsiyasi: siz faqat yuqoridagi guruhlar chatlari va a‘zolarini ko‘ra olasiz.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Admin Support Banner */}
      <div className="p-5 rounded-3xl bg-family-night/80 border border-family-gold/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-family-gold/15 text-family-gold">
            <Shield size={22} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-family-text-primary">
              Xavfsizlik va ma‘lumotlarni yangilash
            </h4>
            <p className="text-[11px] text-family-text-secondary mt-0.5">
              Parolni almashtirish yoki yangi guruhga qo‘shilish uchun Oila Boshlig‘iga (Admin) murojaat qiling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
