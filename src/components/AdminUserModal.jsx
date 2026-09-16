import React, { useState, useEffect } from 'react';
import { X, UserPlus, Key, Upload, Check, AlertCircle, Shield } from 'lucide-react';
import { api } from '../utils/api';

const RELATIONSHIP_PRESETS = [
  'Ona', 'Ota', 'Bobo', 'Buvi', 'Xola', 'Tog‘a', 'Amma', 'Amaki',
  'Aka', 'Opa', 'Uka', 'Singil', 'Jiyan',
  'Amakivachcha', 'Tog‘avachcha', 'Xolavachcha', 'Kelin', 'Kuyov',
  'Sinfdosh', 'Partadosh', 'Sinf sardori', 'Maktabdosh', 'Kursdosh', 'Do‘st',
  'boshqa'
];

export default function AdminUserModal({ user, allGroups = [], onClose, onSuccess }) {
  const isEditing = Boolean(user);

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [relationshipType, setRelationshipType] = useState('Amaki');
  const [customRelationship, setCustomRelationship] = useState('');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [birthday, setBirthday] = useState(user?.birthday || '');
  const [avatar, setAvatar] = useState(user?.avatar || '/avatars/male1.png');
  const [selectedGroups, setSelectedGroups] = useState(
    user?.groups ? user.groups.map((g) => g.id) : []
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user?.relationship) {
      if (RELATIONSHIP_PRESETS.includes(user.relationship)) {
        setRelationshipType(user.relationship);
      } else {
        setRelationshipType('boshqa');
        setCustomRelationship(user.relationship);
      }
    }
  }, [user]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await api.uploadFile(file);
      setAvatar(res.url);
    } catch (err) {
      alert(err.message || 'Avatar yuklashda xatolik');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleGroupSelection = (groupId) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const finalRelationship = relationshipType === 'boshqa'
      ? customRelationship.trim() || 'Qarindosh'
      : relationshipType;

    if (!firstName.trim() || !lastName.trim() || !username.trim()) {
      setErrorMsg('Ism, familiya va login kiritilishi shart.');
      return;
    }

    if (!isEditing && (!password || password.length < 6)) {
      setErrorMsg('Parol kamida 6 belgidan iborat bo‘lishi kerak.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing) {
        await api.updateAdminUser(user.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          relationship: finalRelationship,
          gender,
          birthday: birthday || null,
          avatar,
          groups: selectedGroups,
        });

        // If password was entered during edit, reset it as well
        if (password && password.trim().length >= 6) {
          await api.resetUserPassword(user.id, password.trim());
        }
      } else {
        await api.createAdminUser({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          password: password.trim(),
          relationship: finalRelationship,
          gender,
          birthday: birthday || null,
          avatar,
          groups: selectedGroups,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Saqlashda xatolik yuz berdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-family-card border border-family-gold/30 rounded-3xl p-6 sm:p-8 shadow-gold-lg my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-family-text-muted hover:text-family-text-primary transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-family-gold/20 border border-family-gold/40 flex items-center justify-center text-family-gold">
            <UserPlus size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-family-text-primary">
              {isEditing ? 'Qarindosh Ma‘lumotlarini Tahrirlash' : '+ Yangi Qarindosh Qo‘shish'}
            </h2>
            <p className="text-xs text-family-text-secondary">
              Foydalanuvchi ma‘lumotlari va guruhga biriktirish
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
          {/* Avatar selector */}
          <div className="flex items-center gap-4 pb-2 border-b border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-family-surface border border-family-gold/30 overflow-hidden shrink-0">
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <label className="block text-xs font-medium text-family-text-secondary mb-1.5">
                Profil rasmi
              </label>
              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 bg-family-night hover:bg-family-surface border border-white/10 rounded-xl text-xs text-family-gold cursor-pointer flex items-center gap-1.5 transition">
                  <Upload size={14} />
                  <span>{isUploading ? 'Yuklanmoqda...' : 'Rasm yuklash'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
                {/* Preset avatar quick picks */}
                <div className="flex items-center gap-1.5">
                  {['/avatars/male1.png', '/avatars/male2.png', '/avatars/female1.png', '/avatars/female2.png'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAvatar(p)}
                      className={`w-7 h-7 rounded-lg border overflow-hidden transition ${
                        avatar === p ? 'border-family-gold scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={p} alt="Preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* First name & Last name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-family-text-secondary mb-1">
                Ism *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Masalan: Sobir"
                className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-family-text-secondary mb-1">
                Familiya *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Masalan: Rahimov"
                className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition"
              />
            </div>
          </div>

          {/* Relationship selection & custom relationship */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-family-text-secondary mb-1">
                Qarindoshlik turi *
              </label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition"
              >
                {RELATIONSHIP_PRESETS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel === 'boshqa' ? 'Boshqa (erkin kiritish)' : rel}
                  </option>
                ))}
              </select>
            </div>

            {relationshipType === 'boshqa' ? (
              <div>
                <label className="block text-xs font-medium text-family-text-secondary mb-1">
                  Maxsus munosabat (Custom) *
                </label>
                <input
                  type="text"
                  required
                  value={customRelationship}
                  onChange={(e) => setCustomRelationship(e.target.value)}
                  placeholder="Masalan: Katta xolam"
                  className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-family-text-secondary mb-1">
                  Tug‘ilgan sana
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition"
                />
              </div>
            )}
          </div>

          {/* Gender Selector */}
          <div>
            <label className="block text-xs font-medium text-family-text-secondary mb-1.5">
              Jinsi (Ruxsatlar va xavfsizlik nazorati uchun) *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  gender === 'male'
                    ? 'bg-sky-500/25 text-sky-400 border border-sky-500/40 shadow-sm'
                    : 'bg-family-night text-family-text-secondary border border-white/10 hover:text-white'
                }`}
              >
                <span>👨 Erkak / O'g'il bola</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  gender === 'female'
                    ? 'bg-pink-500/25 text-pink-400 border border-pink-500/40 shadow-sm'
                    : 'bg-family-night text-family-text-secondary border border-white/10 hover:text-white'
                }`}
              >
                <span>👩 Ayol / Qiz bola</span>
              </button>
            </div>
          </div>

          {relationshipType === 'boshqa' && (
            <div>
              <label className="block text-xs font-medium text-family-text-secondary mb-1">
                Tug‘ilgan sana
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition"
              />
            </div>
          )}

          {/* Login & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-family-text-secondary mb-1">
                Login (Username) *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="masalan: sobir_amaki"
                className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-family-text-secondary">
                  {isEditing ? 'Yangi parol (ixtiyoriy)' : 'Parol *'}
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[10px] text-family-gold hover:underline flex items-center gap-1"
                >
                  <Key size={10} />
                  Generatsiya
                </button>
              </div>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? 'O‘zgartirmaslik uchun bo‘sh qoldiring' : 'Kamida 6 belgi'}
                className="w-full bg-family-night border border-family-gold/20 rounded-xl px-3.5 py-2.5 text-sm text-family-text-primary focus:outline-none focus:border-family-gold transition font-mono"
              />
            </div>
          </div>

          {/* Group Multi-select Checklist */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-family-text-secondary mb-2">
              Qaysi guruh(lar)ga a‘zo bo‘lsin? (Group Isolation)
            </label>
            {allGroups.length === 0 ? (
              <p className="text-xs text-family-text-muted">Hozircha guruhlar yaratilmagan.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-40 overflow-y-auto p-1">
                {allGroups.map((g) => {
                  const isChecked = selectedGroups.includes(g.id);
                  return (
                    <div
                      key={g.id}
                      onClick={() => toggleGroupSelection(g.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
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
                      <div className="truncate">
                        <div className="text-xs font-semibold">{g.name}</div>
                        {g.description && (
                          <div className="text-[10px] text-family-text-muted truncate">
                            {g.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-family-text-muted mt-2">
              * Qarindosh faqat tanlangan guruhlarning a‘zolari va chatlarini ko‘ra oladi.
            </p>
          </div>

          {/* Form Actions */}
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
              <span>{isSubmitting ? 'Saqlanmoqda...' : isEditing ? 'Yangilash' : 'Qarindoshni Saqlash'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
