import React, { useState } from 'react';
import { X, Megaphone, Send, Check, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';

export default function AnnouncementModal({ allGroups = [], onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedGroups, setSelectedGroups] = useState(allGroups.map((g) => g.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleGroup = (groupId) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const selectAll = () => {
    if (selectedGroups.length === allGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(allGroups.map((g) => g.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!content.trim()) {
      setErrorMsg('E‘lon matni kiritilishi shart.');
      return;
    }

    if (selectedGroups.length === 0) {
      setErrorMsg('Kamida bitta guruhni tanlashingiz kerak.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.broadcastAnnouncement({
        title: title.trim(),
        content: content.trim(),
        targetGroups: selectedGroups,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'E‘lon yuborishda xatolik yuz berdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-family-card border border-family-gold/30 rounded-3xl p-6 sm:p-8 shadow-gold-lg my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-family-text-muted hover:text-family-text-primary transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-family-gold/20 border border-family-gold/40 flex items-center justify-center text-family-gold">
            <Megaphone size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-family-text-primary">
              Rasmiy E‘lon Yuborish
            </h2>
            <p className="text-xs text-family-text-secondary">
              Guruhlarga bir vaqtning o‘zida xabar va bildirishnoma tarqatish
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
              Sarlavha (ixtiyoriy)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Ertangi yig‘ilish haqida"
              className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-family-text-secondary mb-1">
              E‘lon matni *
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Masalan: Hurmatli qarindoshlar, ertaga soat 18:00 da oilaviy iftorlikka / yig‘ilishga taklif qilamiz..."
              className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition resize-none leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-family-text-secondary">
                Qaysi guruhlarga yuborilsin?
              </label>
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] text-family-gold hover:underline"
              >
                {selectedGroups.length === allGroups.length ? 'Barchasini bekor qilish' : 'Barchasini tanlash'}
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto p-1">
              {allGroups.map((g) => {
                const isChecked = selectedGroups.includes(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
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
                    <span className="text-xs font-semibold">{g.name}</span>
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
              <Send size={15} />
              <span>{isSubmitting ? 'Yuborilmoqda...' : 'E‘lonni Yuborish'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
