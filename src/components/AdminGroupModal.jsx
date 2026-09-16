import React, { useState } from 'react';
import { X, Users, Check, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';

export default function AdminGroupModal({ group, allUsers = [], onClose, onSuccess }) {
  const isEditing = Boolean(group);

  const [name, setName] = useState(group?.name || '');
  const [category, setCategory] = useState(group?.category || 'family');
  const [description, setDescription] = useState(group?.description || '');
  const [selectedMembers, setSelectedMembers] = useState(
    group?.members ? group.members.map((m) => m.id) : []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Guruh nomi kiritilishi shart.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing) {
        await api.updateGroup(group.id, {
          name: name.trim(),
          category,
          description: description.trim(),
          members: selectedMembers,
        });
      } else {
        await api.createGroup({
          name: name.trim(),
          category,
          description: description.trim(),
          members: selectedMembers,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Guruhni saqlashda xatolik yuz berdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-family-card border border-family-gold/30 rounded-3xl p-6 sm:p-8 shadow-gold-lg my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-family-text-muted hover:text-family-text-primary transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-family-gold/20 border border-family-gold/40 flex items-center justify-center text-family-gold">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-family-text-primary">
              {isEditing ? 'Guruhni Tahrirlash' : '+ Yangi Guruh Yaratish'}
            </h2>
            <p className="text-xs text-family-text-secondary">
              Guruh ma‘lumotlari va a‘zolarni biriktirish
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 mb-5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-family-text-secondary mb-1">
              Guruh nomi *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Dadam taraf yoki Sinfdoshlar"
              className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-family-text-secondary mb-1">
              Guruh toifasi (Kategoriya) *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'family', label: '👨‍👩‍👧‍👦 Oila / Qarindosh', desc: 'Faqat qarindoshlar' },
                { id: 'classmates', label: '🎓 Sinfdoshlar', desc: 'Maktab / Sinf' },
                { id: 'friends', label: '🤝 Do‘stlar', desc: 'Boshqa do‘stlar' }
              ].map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    category === cat.id
                      ? 'bg-family-gold/15 border-family-gold text-family-gold shadow-gold-sm'
                      : 'bg-family-night border-white/5 text-family-text-secondary hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-semibold">{cat.label}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">{cat.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-family-gold/80 mt-1.5">
              ⚠️ Qat‘iy izolyatsiya: Sinfdoshlar oilaviy guruhlar, tug‘ilgan kunlar yoki suratlarni ko‘ra olmaydi!
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-family-text-secondary mb-1">
              Tavsif (ixtiyoriy)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Masalan: Dadam tomondagi barcha aziz qarindoshlarimiz"
              className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-family-text-secondary mb-2">
              A‘zolarni tanlang:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
              {allUsers.filter((u) => u.is_admin !== 1).map((u) => {
                const isChecked = selectedMembers.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleMember(u.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                      isChecked
                        ? 'bg-family-gold/15 border-family-gold/50 text-family-text-primary'
                        : 'bg-family-night border-white/5 text-family-text-secondary hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                        isChecked ? 'bg-family-gold border-family-gold text-black' : 'border-white/20'
                      }`}
                    >
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </div>

                    <img
                      src={u.avatar || '/avatars/male1.png'}
                      alt={u.first_name}
                      className="w-6 h-6 rounded-md object-cover bg-family-surface"
                    />

                    <div className="truncate">
                      <div className="text-xs font-semibold truncate">
                        {u.first_name} {u.last_name}
                      </div>
                      <div className="text-[10px] text-family-gold/80">
                        {u.relationship}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs text-family-text-secondary hover:text-family-text-primary transition"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 gold-btn rounded-xl text-xs flex items-center gap-2 font-semibold shadow-gold-sm transition disabled:opacity-50"
            >
              <Check size={15} />
              <span>{isSubmitting ? 'Saqlanmoqda...' : isEditing ? 'Yangilash' : 'Guruhni Yaratish'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
