import React, { useState } from 'react';
import { X, Send, Sparkles, Cake, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';

export default function TabriklashModal({ relative, onClose, onSuccess }) {
  if (!relative) return null;

  const defaultGreeting = `🎂 Aziz ${relative.first_name} ${relative.relationship}! Tavallud ayyomingiz muborak bo‘lsin! Sizga mustahkam sog‘lik, uzoq umr va oilaviy baxt tilaymiz! Rishtalarimiz hamisha mustahkam bo‘lsin! ❤️🎉`;

  const [message, setMessage] = useState(defaultGreeting);
  const [selectedGroupId, setSelectedGroupId] = useState(
    relative.shared_groups && relative.shared_groups.length > 0 ? relative.shared_groups[0].id : null
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedGroupId) {
      alert('Iltimos, tabrik yo‘llanadigan guruhni tanlang.');
      return;
    }

    if (!message.trim()) {
      alert('Tabrik matnini kiriting.');
      return;
    }

    try {
      setIsSending(true);
      await api.sendMessage(selectedGroupId, {
        content: message.trim(),
        message_type: 'text',
      });

      // Fire celebratory confetti!
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F3E5AB', '#FFFFFF', '#E11D48'],
      });

      setSentSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(selectedGroupId);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Tabrik yuborishda xatolik:', err);
      alert(err.message || 'Tabrikni yuborib bo‘lmadi.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-family-card border border-family-gold/40 rounded-3xl p-6 md:p-8 shadow-gold-lg">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-family-text-muted hover:text-family-text-primary transition"
        >
          <X size={20} />
        </button>

        {sentSuccess ? (
          <div className="py-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-family-gold/20 flex items-center justify-center text-family-gold mb-4 animate-scale-in">
              <CheckCircle size={36} />
            </div>
            <h3 className="text-xl font-serif text-family-text-primary mb-2">Tabrik yo‘llandi!</h3>
            <p className="text-xs text-family-text-secondary">
              Guruh a‘zolari va qadrdoningizga tabrigingiz yetkazildi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-family-gold-dark to-family-gold/40 p-0.5 shrink-0">
                <img
                  src={relative.avatar || '/avatars/male1.png'}
                  alt={relative.first_name}
                  className="w-full h-full object-cover rounded-2xl bg-family-surface"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-family-gold/15 text-family-gold text-[11px] font-semibold mb-1">
                  <Cake size={12} />
                  <span>Bugun tavallud kuni!</span>
                </div>
                <h3 className="text-lg font-bold text-family-text-primary">
                  {relative.first_name} {relative.last_name}
                </h3>
                <p className="text-xs text-family-gold">
                  {relative.relationship} {relative.turningAge ? `(${relative.turningAge} yosh)` : ''}
                </p>
              </div>
            </div>

            {/* Target Group Selector */}
            {relative.shared_groups && relative.shared_groups.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-family-text-secondary mb-1.5">
                  Qaysi guruh chatiga yuborilsin?
                </label>
                <select
                  value={selectedGroupId || ''}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition"
                >
                  {relative.shared_groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Editable greeting textarea */}
            <div>
              <label className="block text-xs font-medium text-family-text-secondary mb-1.5">
                Tabrik matni (istagingizga ko‘ra o‘zgartirishingiz mumkin):
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-family-night border border-family-gold/20 rounded-2xl p-3.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition resize-none leading-relaxed"
                placeholder="Iliq tabriklaringizni yozing..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-xs text-family-text-secondary hover:text-family-text-primary transition"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2.5 gold-btn rounded-xl text-xs flex items-center gap-2 font-semibold shadow-gold-sm transition disabled:opacity-50"
              >
                <Sparkles size={15} />
                <span>{isSending ? 'Yuborilmoqda...' : 'Tabrikni yuborish'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
