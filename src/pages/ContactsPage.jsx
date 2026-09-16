import React, { useState, useEffect } from 'react';
import { Users, Search, MessageSquare, Cake, Sparkles, Shield, User, GraduationCap } from 'lucide-react';
import { api } from '../utils/api';

export default function ContactsPage({ user, onSelectGroup, onStartDm }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'family', 'classmates'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, [search]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await api.getContacts(search);
      setContacts(res.contacts || []);
    } catch (err) {
      console.error('Kontaktlarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  const isClassmateRole = (rel) =>
    ['Sinfdosh', 'Partadosh', 'Sinf sardori', 'Maktabdosh', 'Kursdosh', 'Do‘st'].includes(rel);

  const filteredContacts = contacts.filter((c) => {
    if (categoryFilter === 'classmates') return isClassmateRole(c.relationship);
    if (categoryFilter === 'family') return !isClassmateRole(c.relationship);
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-family-gold uppercase tracking-wider">
              Kontaktlar Ro‘yxati
            </span>
            <Sparkles size={14} className="text-family-gold" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-family-text-primary">
            Qarindoshlar & Sinfdoshlar
          </h1>
          <p className="text-xs text-family-text-secondary mt-1">
            Faqat siz bilan umumiy guruhga a‘zo bo‘lgan insonlar (Group Isolation)
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-family-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism yoki unvon bo‘yicha qidirish..."
            className="w-full bg-family-card border border-family-gold/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-family-text-primary placeholder:text-family-text-muted focus:outline-none focus:border-family-gold transition"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            categoryFilter === 'all'
              ? 'bg-family-gold/20 text-family-gold border border-family-gold/30'
              : 'text-family-text-secondary hover:text-white'
          }`}
        >
          Barchasi ({contacts.length})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('family')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            categoryFilter === 'family'
              ? 'bg-family-gold/20 text-family-gold border border-family-gold/30'
              : 'text-family-text-secondary hover:text-white'
          }`}
        >
          <Users size={13} />
          Qarindoshlar ({contacts.filter((c) => !isClassmateRole(c.relationship)).length})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('classmates')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            categoryFilter === 'classmates'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              : 'text-family-text-secondary hover:text-white'
          }`}
        >
          <GraduationCap size={13} />
          Sinfdoshlar ({contacts.filter((c) => isClassmateRole(c.relationship)).length})
        </button>
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-family-card animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-family-card border border-white/5 text-center text-family-text-muted">
          <Users size={40} className="mx-auto text-family-gold/40 mb-3" />
          <p className="text-sm font-semibold text-family-text-secondary">
            {search ? 'Qidiruv bo‘yicha hech kim topilmadi' : 'Bu toifada kontaktlar mavjud emas'}
          </p>
          <p className="text-xs text-family-text-muted mt-1">
            Faqat o‘zingiz a‘zo bo‘lgan guruhlardagi yaqinlaringiz ko‘rsatiladi
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((c) => {
            const isClassmate = isClassmateRole(c.relationship);
            return (
              <div
                key={c.id}
                className="glass-card rounded-2xl p-5 flex flex-col justify-between group transition hover:border-family-gold/30"
              >
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="relative w-12 h-12 rounded-2xl bg-family-surface border border-family-gold/30 overflow-hidden shrink-0">
                    <img
                      src={c.avatar || '/avatars/male1.png'}
                      alt={c.first_name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-family-surface" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-family-text-primary truncate">
                      {c.first_name} {c.last_name}
                    </h3>
                    <div
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 ${
                        isClassmate
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                          : 'bg-family-gold/15 text-family-gold'
                      }`}
                    >
                      {c.relationship}
                    </div>

                    {c.birthday_formatted && (
                      <div className="flex items-center gap-1 text-[10px] text-family-text-muted mt-1.5 font-mono">
                        <Cake size={11} className="text-family-gold/70" />
                        <span>{c.birthday_formatted}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shared Groups Badges & 1-on-1 Chat Action */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1 max-w-[55%]">
                    {c.shared_groups?.map((g) => (
                      <span
                        key={g.id}
                        className="px-2 py-0.5 rounded-md bg-family-surface text-family-text-secondary text-[10px] truncate"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>

                  {/* 1-on-1 Direct Chat button */}
                  {onStartDm && (
                    <button
                      type="button"
                      onClick={() => onStartDm(c.id)}
                      className="px-3 py-1.5 rounded-xl bg-family-gold/15 hover:bg-family-gold text-family-gold hover:text-family-night border border-family-gold/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <MessageSquare size={13} />
                      <span>Xabar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
