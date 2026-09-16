import { useState, useEffect } from 'react';
import {
  Shield, Users, MessageSquare, Cake, UserPlus, FolderPlus,
  Megaphone, Edit, Trash2, Key, Power, Search, Check, AlertCircle,
  FileText, ArrowUpRight, Activity, Clock, Cloud, Lock, Server,
  CheckCircle2, XCircle, Send, RefreshCw, Eye, UserCheck, UserX,
  Play, Image as ImageIcon, Mic, Sliders, Filter
} from 'lucide-react';
import { api } from '../utils/api';
import AdminUserModal from '../components/AdminUserModal';
import AdminGroupModal from '../components/AdminGroupModal';
import AnnouncementModal from '../components/AnnouncementModal';

export default function AdminDashboard({ user, initialTab = 'members' }) {
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'members');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [searchUser, setSearchUser] = useState('');
  const [loading, setLoading] = useState(true);

  // Surveillance & Monitoring state
  const [surveillanceStats, setSurveillanceStats] = useState(null);
  const [surveillanceMessages, setSurveillanceMessages] = useState([]);
  const [activePairs, setActivePairs] = useState([]);
  const [monitorType, setMonitorType] = useState('all'); // 'all', 'direct', 'group'
  const [monitorMedia, setMonitorMedia] = useState('all'); // 'all', 'audio', 'media'
  const [monitorSearch, setMonitorSearch] = useState('');
  const [loadingSurveillance, setLoadingSurveillance] = useState(false);

  // Cross-Gender Permissions state
  const [permissionsList, setPermissionsList] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  // Settings form state
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Modals state
  const [editingUser, setEditingUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, groupsRes, logsRes, settingsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getGroups(),
        api.getAuditLogs(),
        api.getSettings().catch(() => null),
      ]);

      setStats(statsRes);
      setUsersList(usersRes.users || []);
      setGroupsList(groupsRes.groups || []);
      setAuditLogs(logsRes.logs || []);

      if (settingsRes) {
        setSettings(settingsRes);
        setBotToken(settingsRes.telegram_bot_token || '');
        setChannelId(settingsRes.telegram_channel_id || '');
        setCloudEnabled(settingsRes.cloud_storage_enabled || false);
      }
      loadPermissionsData();
      loadSurveillanceData();
    } catch (err) {
      console.error('Admin ma‘lumotlarini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await api.testTelegram({
        botToken: botToken.trim(),
        channelId: channelId.trim(),
      });
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      setSaveSuccessMsg('');
      await api.saveSettings({
        telegram_bot_token: botToken.trim(),
        telegram_channel_id: channelId.trim(),
        cloud_storage_enabled: cloudEnabled,
      });
      setSaveSuccessMsg('Sozlamalar muvaffaqiyatli saqlandi!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'Saqlashda xatolik');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const loadSurveillanceData = async () => {
    try {
      setLoadingSurveillance(true);
      const [sStats, sMsgs, sPairs] = await Promise.all([
        api.getMonitoringStats().catch(() => null),
        api.getMonitoringMessages({
          type: monitorType,
          mediaType: monitorMedia,
          search: monitorSearch,
          limit: 100,
        }).catch(() => ({ messages: [] })),
        api.getMonitoringActivePairs().catch(() => ({ pairs: [] })),
      ]);
      if (sStats) setSurveillanceStats(sStats);
      setSurveillanceMessages(sMsgs?.messages || []);
      setActivePairs(sPairs?.pairs || []);
    } catch (err) {
      console.error('Kuzatuv ma‘lumotlarini yuklashda xatolik:', err);
    } finally {
      setLoadingSurveillance(false);
    }
  };

  const loadPermissionsData = async () => {
    try {
      setLoadingPermissions(true);
      const res = await api.getAdminPermissions().catch(() => ({ permissions: [] }));
      setPermissionsList(res?.permissions || []);
    } catch (err) {
      console.error('Ruxsatlar ro‘yxatini yuklashda xatolik:', err);
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'surveillance') {
      loadSurveillanceData();
    } else if (activeTab === 'permissions') {
      loadPermissionsData();
    }
  }, [activeTab, monitorType, monitorMedia]);

  const handleApprovePermission = async (permId) => {
    try {
      setActionInProgress(permId);
      await api.approvePermission(permId);
      loadPermissionsData();
      if (activeTab === 'surveillance') loadSurveillanceData();
    } catch (err) {
      alert(err.message || 'Ruxsat berishda xatolik');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBlockPermission = async (permId) => {
    if (!window.confirm('Haqiqatan ham ushbu yozishmani bloklamoqchimisiz?')) return;
    try {
      setActionInProgress(permId);
      await api.blockPermission(permId);
      loadPermissionsData();
      if (activeTab === 'surveillance') loadSurveillanceData();
    } catch (err) {
      alert(err.message || 'Bloklashda xatolik');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBlockDirectPair = async (u1Id, u2Id) => {
    if (!window.confirm('Ushbu ikki foydalanuvchi o‘rtasidagi yozishuvni bloklaysizmi?')) return;
    try {
      await api.blockUserPair(u1Id, u2Id);
      loadPermissionsData();
      loadSurveillanceData();
      alert('Yozishma bloklandi.');
    } catch (err) {
      alert(err.message || 'Bloklashda xatolik');
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    const actionText = nextStatus === 'active' ? 'faollashtirmoqchimisiz' : 'faolsizlantirmoqchimisiz';
    if (!window.confirm(`${targetUser.first_name}ni haqiqatan ham ${actionText}?`)) return;

    try {
      await api.toggleUserStatus(targetUser.id, nextStatus);
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'Holatni o‘zgartirishda xatolik');
    }
  };

  const handleResetPassword = async (targetUser) => {
    const newPass = window.prompt(`${targetUser.first_name} ${targetUser.last_name} uchun yangi parolni kiriting:`);
    if (!newPass) return;
    if (newPass.length < 6) {
      alert('Parol kamida 6 belgidan iborat bo‘lishi kerak.');
      return;
    }

    try {
      await api.resetUserPassword(targetUser.id, newPass);
      alert('Parol muvaffaqiyatli yangilandi!');
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'Parolni yangilab bo‘lmadi.');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Haqiqatan ham ${targetUser.first_name} ${targetUser.last_name}ni tizimdan o‘chirmoqchimisiz?`)) return;

    try {
      await api.deleteUser(targetUser.id);
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'O‘chirishda xatolik');
    }
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Haqiqatan ham "${group.name}" guruhini o‘chirmoqchimisiz? Guruh xabarlari ham o‘chiriladi.`)) return;

    try {
      await api.deleteGroup(group.id);
      loadAllAdminData();
    } catch (err) {
      alert(err.message || 'Guruhni o‘chirishda xatolik');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const q = searchUser.toLowerCase();
    return (
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.relationship.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full bg-family-gold/15 text-family-gold text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={14} />
              <span>Super Admin Boshqaruvi</span>
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-family-text-primary">
            Admin Boshqaruv Markazi
          </h1>
          <p className="text-xs text-family-text-secondary mt-1">
            Foydalanuvchilar, guruhlar, kirish ruxsatlari va e‘lonlarni boshqarish
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAnnouncementOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-family-card hover:bg-family-surface border border-family-gold/30 text-family-gold text-xs font-semibold flex items-center gap-2 shadow-gold-sm transition"
          >
            <Megaphone size={16} />
            <span>Rasmiy E‘lon</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingGroup(null);
              setIsGroupModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-family-card hover:bg-family-surface border border-white/10 text-family-text-primary text-xs font-semibold flex items-center gap-2 transition"
          >
            <FolderPlus size={16} />
            <span>+ Yangi Guruh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingUser(null);
              setIsUserModalOpen(true);
            }}
            className="px-5 py-2.5 gold-btn rounded-2xl text-xs font-bold flex items-center gap-2 shadow-gold-sm transition"
          >
            <UserPlus size={16} />
            <span>+ Qarindosh Qo‘shish</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-3xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-family-text-muted uppercase tracking-wider">
              Jami A‘zolar
            </span>
            <div className="text-2xl font-bold text-family-text-primary mt-1">
              {stats?.totalUsers || 0}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-family-surface flex items-center justify-center text-family-gold">
            <Users size={22} />
          </div>
        </div>

        <div className="glass-card rounded-3xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-family-text-muted uppercase tracking-wider">
              Jami Guruhlar
            </span>
            <div className="text-2xl font-bold text-family-text-primary mt-1">
              {stats?.totalGroups || 0}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-family-surface flex items-center justify-center text-family-gold">
            <MessageSquare size={22} />
          </div>
        </div>

        <div className="glass-card rounded-3xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-family-text-muted uppercase tracking-wider">
              Faol Qarindoshlar
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {stats?.activeUsers || 0}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Activity size={22} />
          </div>
        </div>

        <div className="glass-card rounded-3xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-family-text-muted uppercase tracking-wider">
              Bugun Tavallud
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {stats?.birthdaysToday || 0}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Cake size={22} />
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'permissions'
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'text-family-text-secondary hover:text-family-text-primary'
          }`}
        >
          <UserCheck size={14} />
          <span>🛡️ Ruxsat So‘rovlari</span>
          {permissionsList.filter((p) => p.status === 'pending').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse font-mono">
              {permissionsList.filter((p) => p.status === 'pending').length} yangi
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('surveillance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'surveillance'
              ? 'bg-sky-500/25 text-sky-300 border border-sky-500/50 shadow-lg shadow-sky-500/10'
              : 'text-family-text-secondary hover:text-family-text-primary'
          }`}
        >
          <Eye size={14} />
          <span>👁️ Kuzatuv Markazi</span>
          {surveillanceStats?.totalMessages ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-mono">
              {surveillanceStats.totalMessages}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'members'
              ? 'bg-family-gold/15 text-family-gold border border-family-gold/30'
              : 'text-family-text-secondary hover:text-family-text-primary'
          }`}
        >
          👥 Qarindoshlar ({usersList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'groups'
              ? 'bg-family-gold/15 text-family-gold border border-family-gold/30'
              : 'text-family-text-secondary hover:text-family-text-primary'
          }`}
        >
          📁 Guruhlar ({groupsList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'audit'
              ? 'bg-family-gold/15 text-family-gold border border-family-gold/30'
              : 'text-family-text-secondary hover:text-family-text-primary'
          }`}
        >
          📜 Audit ({auditLogs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'security'
              ? 'bg-family-gold/15 text-family-gold border border-family-gold/30'
              : 'text-family-text-secondary hover:text-family-text-primary'
          }`}
        >
          <Cloud size={14} />
          <span>☁️ Xotira & Sozlamalar</span>
        </button>
      </div>

      {/* TAB 1: MEMBERS TABLE */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-family-text-muted" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Ism, login yoki qarindoshlik..."
                className="w-full bg-family-card border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-family-text-primary focus:outline-none focus:border-family-gold transition"
              />
            </div>
          </div>

          <div className="glass-card rounded-3xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-family-surface/60 border-b border-white/5 text-family-text-muted uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Qarindosh</th>
                    <th className="p-4">Qarindoshlik</th>
                    <th className="p-4">Login</th>
                    <th className="p-4">Guruhlar</th>
                    <th className="p-4">Tug‘ilgan sana</th>
                    <th className="p-4">Holat</th>
                    <th className="p-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-family-surface/30 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || '/avatars/male1.png'}
                            alt={u.first_name}
                            className="w-8 h-8 rounded-xl object-cover bg-family-surface"
                          />
                          <div>
                            <div className="font-bold text-family-text-primary">
                              {u.first_name} {u.last_name}
                            </div>
                            {u.is_admin === 1 && (
                              <span className="text-[10px] text-family-gold font-bold">
                                Super Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-family-gold/15 text-family-gold font-semibold text-[11px]">
                          {u.relationship}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-family-text-secondary">
                        @{u.username}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.groups?.map((g) => (
                            <span
                              key={g.id}
                              className="px-2 py-0.5 rounded-md bg-family-night border border-white/5 text-[10px] text-family-text-secondary"
                            >
                              {g.name}
                            </span>
                          ))}
                          {(!u.groups || u.groups.length === 0) && (
                            <span className="text-[10px] text-family-text-muted italic">
                              Biriktirilmagan
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 font-mono text-family-text-secondary">
                        {u.birthday || '—'}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {u.status === 'active' ? 'Faol' : 'Muzlatilgan'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(u);
                              setIsUserModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-family-surface text-family-text-secondary hover:text-family-gold transition"
                            title="Tahrirlash"
                          >
                            <Edit size={14} />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u)}
                            className="p-1.5 rounded-lg hover:bg-family-surface text-family-text-secondary hover:text-amber-400 transition"
                            title="Parolni yangilash"
                          >
                            <Key size={14} />
                          </button>

                          {/* Toggle Status (Disable/Enable) */}
                          {u.is_admin !== 1 && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-lg hover:bg-family-surface transition ${
                                u.status === 'active'
                                  ? 'text-family-text-secondary hover:text-rose-400'
                                  : 'text-rose-400 hover:text-emerald-400'
                              }`}
                              title={u.status === 'active' ? 'Faolsizlantirish' : 'Faollashtirish'}
                            >
                              <Power size={14} />
                            </button>
                          )}

                          {/* Delete */}
                          {u.is_admin !== 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-family-text-secondary hover:text-rose-400 transition"
                              title="O‘chirish"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GROUPS TABLE */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupsList.map((g) => (
              <div
                key={g.id}
                className="glass-card rounded-3xl p-6 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-family-text-primary group-hover:text-family-gold transition">
                      {g.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-family-surface text-family-gold text-[10px] font-bold shrink-0">
                      {g.member_count || 0} a‘zo
                    </span>
                  </div>
                  <p className="text-xs text-family-text-secondary line-clamp-2">
                    {g.description || 'Tavsif mavjud emas'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-family-text-muted">
                  <span className="text-[11px] font-mono">
                    {new Date(g.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroup(g);
                        setIsGroupModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-family-surface text-family-text-secondary hover:text-family-gold transition"
                      title="Guruhni tahrirlash"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(g)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-family-text-secondary hover:text-rose-400 transition"
                      title="O‘chirish"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-card rounded-3xl overflow-hidden border border-white/5">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-bold text-family-text-primary uppercase tracking-wider">
              Xavfsizlik va Admin Harakatlari Jurnali
            </h3>
            <span className="text-[10px] text-family-text-muted font-mono">Oxirgi 100 ta amal</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-family-surface/60 border-b border-white/5 text-family-text-muted uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Admin</th>
                  <th className="p-3.5">Harakat</th>
                  <th className="p-3.5">Tafsilotlar</th>
                  <th className="p-3.5">Vaqti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-family-surface/20 transition">
                    <td className="p-3.5 font-semibold text-family-gold">
                      {log.admin_name || 'Tizim'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-family-night border border-white/10 text-[10px] font-mono font-bold text-family-text-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-family-text-secondary font-mono text-[11px]">
                      {log.details}
                    </td>
                    <td className="p-3.5 text-family-text-muted font-mono text-[10px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security & Cloud Storage Settings Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-fade-in">
          {/* Security Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-family-surface border border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  AES-256-GCM
                </span>
              </div>
              <h4 className="font-bold text-sm text-family-text-primary mb-1">Fayllar Shifrlanishi</h4>
              <p className="text-xs text-family-text-secondary leading-relaxed">
                Barcha media, rasm va ovozli xabarlar diskda 256-bitli harbiy darajadagi kalit bilan shifrlanadi.
              </p>
            </div>

            <div className="bg-family-surface border border-family-gold/20 rounded-2xl p-4 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-family-gold/10 flex items-center justify-center text-family-gold">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-family-gold/15 text-family-gold border border-family-gold/30">
                  GPS TOZALASH
                </span>
              </div>
              <h4 className="font-bold text-sm text-family-text-primary mb-1">EXIF Sanitization</h4>
              <p className="text-xs text-family-text-secondary leading-relaxed">
                Yuklangan rasmlardan GPS koordinatalar, kamera modeli va shaxsiy metama'lumotlar avtomatik o'chiriladi.
              </p>
            </div>

            <div className="bg-family-surface border border-sky-500/20 rounded-2xl p-4 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  RATE LIMITER
                </span>
              </div>
              <h4 className="font-bold text-sm text-family-text-primary mb-1">Brute-Force Himoyasi</h4>
              <p className="text-xs text-family-text-secondary leading-relaxed">
                Parolni taxmin qilishdan himoyalanish: 15 daqiqada 10 martadan ortiq xato urinish qat'iy bloklanadi.
              </p>
            </div>

            <div className="bg-family-surface border border-purple-500/20 rounded-2xl p-4 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Server className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  ISOLATED
                </span>
              </div>
              <h4 className="font-bold text-sm text-family-text-primary mb-1">Sessiyalar Nazorati</h4>
              <p className="text-xs text-family-text-secondary leading-relaxed">
                Parol o'zgarganda yoki hisob to'xtatilganda barcha telefon va kompyuterlardagi sessiyalar darhol o'chiriladi.
              </p>
            </div>
          </div>

          {/* Telegram Cloud Storage Configuration */}
          <div className="bg-family-surface border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-family-text-primary flex items-center gap-2">
                    Cheksiz Bepul Bulutli Xotira (Telegram Cloud Mirror)
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      Tekinga Cheksiz Gigabayt
                    </span>
                  </h3>
                  <p className="text-xs text-family-text-secondary mt-0.5">
                    Server xotirasi to'lib qolmasligi uchun barcha shifrlangan fayllarni shaxsiy Telegram kanalingizda bepul va xavfsiz saqlang.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-family-night/80 border border-white/10 rounded-xl px-3 py-1.5">
                <span className="text-xs text-family-text-secondary">Bulut Holati:</span>
                {cloudEnabled ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Faol
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-family-text-muted">
                    <XCircle className="w-3.5 h-3.5" /> O'chirilgan
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-family-text-secondary mb-1.5">
                    Telegram Bot Token
                  </label>
                  <input
                    type="text"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="Masalan: 7891234567:AAHxyz_ExampleTokenHere..."
                    className="w-full bg-family-night border border-white/10 rounded-xl px-4 py-3 text-sm text-family-text-primary placeholder:text-family-text-muted focus:border-family-gold focus:outline-none transition font-mono"
                  />
                  <p className="text-[11px] text-family-text-muted mt-1">
                    Telegramda @BotFather orqali yaratilgan bot tokeni
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-family-text-secondary mb-1.5">
                    Telegram Kanal / Guruh Chat ID
                  </label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="Masalan: -1001234567890"
                    className="w-full bg-family-night border border-white/10 rounded-xl px-4 py-3 text-sm text-family-text-primary placeholder:text-family-text-muted focus:border-family-gold focus:outline-none transition font-mono"
                  />
                  <p className="text-[11px] text-family-text-muted mt-1">
                    Fayllar saqlanadigan maxfiy kanal ID raqami (boshida -100 bo'ladi)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-family-night/60 border border-white/5">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="cloudToggle"
                    checked={cloudEnabled}
                    onChange={(e) => setCloudEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 text-family-gold focus:ring-family-gold/40 bg-family-night cursor-pointer"
                  />
                  <label htmlFor="cloudToggle" className="cursor-pointer">
                    <span className="block text-sm font-semibold text-family-text-primary">
                      Telegram bulutli sinxronizatsiyasini ishga tushirish
                    </span>
                    <span className="block text-xs text-family-text-muted">
                      Har bir yuklangan fayl AES-256 bilan shifrlanib kanalingizga zaxira qilinadi
                    </span>
                  </label>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <div className="text-xs">
                    <p className="font-bold mb-0.5">
                      {testResult.success ? 'Aloqa Muvaffaqiyatli O‘rnatildi!' : 'Ulanishda Xatolik!'}
                    </p>
                    <p className="opacity-90">
                      {testResult.message || testResult.error}
                    </p>
                    {testResult.bot && (
                      <p className="mt-1 font-mono text-[11px] opacity-80">
                        Bot nomi: @{testResult.bot.username} ({testResult.bot.first_name})
                      </p>
                    )}
                  </div>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                  <Check className="w-4 h-4" />
                  {saveSuccessMsg}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTesting || !botToken}
                  className="px-4 py-2.5 rounded-xl border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 transition font-semibold text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isTesting ? 'Tekshirilmoqda...' : 'Ulanishni Tekshirish'}
                </button>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-family-gold to-family-gold-dark text-family-night font-bold text-xs shadow-lg hover:shadow-family-gold/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingSettings ? 'Saqlanmoqda...' : 'Sozlamalarni Saqlash'}
                </button>
              </div>
            </form>

            {/* Step-by-Step Instructions */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-family-gold mb-3 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Telegram Bot va Kanalni 2 Daqiqada Sozlash Yo'riqnomasi:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-family-text-secondary">
                <div className="bg-family-night/60 p-3.5 rounded-xl border border-white/5">
                  <div className="text-family-gold font-bold mb-1">1. Bot Ochish</div>
                  <p className="text-[11px] leading-relaxed">
                    Telegramda <strong className="text-white">@BotFather</strong> ga kiring, <code className="text-family-gold">/newbot</code> yozing, unga nom bering va berilgan <strong>HTTP API Token</strong>ni nusxalang.
                  </p>
                </div>
                <div className="bg-family-night/60 p-3.5 rounded-xl border border-white/5">
                  <div className="text-family-gold font-bold mb-1">2. Shaxsiy Kanal Ochish</div>
                  <p className="text-[11px] leading-relaxed">
                    Telegramda yangi <strong className="text-white">Private Channel</strong> (Yopiq kanal) oching va yaratgan botingizni unga <strong className="text-white">Admin</strong> qilib qo'shing.
                  </p>
                </div>
                <div className="bg-family-night/60 p-3.5 rounded-xl border border-white/5">
                  <div className="text-family-gold font-bold mb-1">3. Chat ID Olish & Saqlash</div>
                  <p className="text-[11px] leading-relaxed">
                    Kanalga ixtiyoriy bitta xabar yozing va <code className="text-family-gold">https://api.telegram.org/bot[TOKEN]/getUpdates</code> orqali <code className="text-family-gold">-100...</code> bilan boshlanuvchi ID ni oling.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: KUZATUV MARKAZI (SURVEILLANCE & MONITORING) */}
      {activeTab === 'surveillance' && (
        <div className="space-y-6 animate-fade-in">
          {/* Surveillance Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-family-surface border border-sky-500/20 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-sky-400">Jami Xabarlar</span>
              <div className="text-2xl font-bold text-family-text-primary mt-1 font-mono">
                {surveillanceStats?.totalMessages || 0}
              </div>
              <span className="text-[10px] text-family-text-muted">Barcha kanallarda</span>
            </div>

            <div className="bg-family-surface border border-emerald-500/20 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Bugungi Xabarlar</span>
              <div className="text-2xl font-bold text-emerald-300 mt-1 font-mono">
                {surveillanceStats?.todayMessages || 0}
              </div>
              <span className="text-[10px] text-family-text-muted">Oxirgi 24 soat</span>
            </div>

            <div className="bg-family-surface border border-amber-500/20 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-amber-400">Shaxsiy (1-on-1)</span>
              <div className="text-2xl font-bold text-amber-300 mt-1 font-mono">
                {surveillanceStats?.directMessages || 0}
              </div>
              <span className="text-[10px] text-family-text-muted">Alohida yozishmalar</span>
            </div>

            <div className="bg-family-surface border border-purple-500/20 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-purple-400">Guruh Xabarlari</span>
              <div className="text-2xl font-bold text-purple-300 mt-1 font-mono">
                {surveillanceStats?.groupMessages || 0}
              </div>
              <span className="text-[10px] text-family-text-muted">Oila & Sinfdoshlar</span>
            </div>

            <div className="bg-family-surface border border-pink-500/20 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-pink-400">Ovozli Xabarlar</span>
              <div className="text-2xl font-bold text-pink-300 mt-1 font-mono">
                {surveillanceStats?.voiceMessages || 0}
              </div>
              <span className="text-[10px] text-family-text-muted">Audio yozuvlar</span>
            </div>

            <div className="bg-family-surface border border-indigo-500/20 rounded-2xl p-4 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-indigo-400">Rasm & Video</span>
              <div className="text-2xl font-bold text-indigo-300 mt-1 font-mono">
                {surveillanceStats?.imageVideoCount || 0}
              </div>
              <span className="text-[10px] text-family-text-muted">Fayllar</span>
            </div>
          </div>

          {/* Active Chat Pairs & 1-Click Blocking */}
          {activePairs.length > 0 && (
            <div className="bg-family-surface border border-white/10 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-family-text-primary mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-family-gold" />
                  Faol Muloqotdagi Juftliklar ({activePairs.length})
                </span>
                <span className="text-xs text-family-text-muted">
                  Istalgan ikki shaxs o'rtasidagi yozishmani darhol to'xtatishingiz mumkin
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activePairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-family-night/80 border border-white/5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative flex -space-x-2 overflow-hidden">
                        <img
                          src={pair.user1.avatar || '/avatars/default.png'}
                          alt=""
                          className="inline-block h-8 w-8 rounded-full ring-2 ring-family-night object-cover"
                        />
                        <img
                          src={pair.user2.avatar || '/avatars/default.png'}
                          alt=""
                          className="inline-block h-8 w-8 rounded-full ring-2 ring-family-night object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-family-text-primary truncate">
                          {pair.user1.first_name} ↔ {pair.user2.first_name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-family-text-muted">
                          {pair.isCrossGender ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-medium">
                              Qiz / O'g'il
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-white/5 text-family-text-secondary font-medium">
                              Bir jins
                            </span>
                          )}
                          <span>• {pair.messageCount} xabar</span>
                        </div>
                      </div>
                    </div>

                    {pair.permissionStatus === 'blocked' ? (
                      <button
                        type="button"
                        onClick={() => handleApprovePermission(pair.permissionId)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition cursor-pointer flex-shrink-0"
                      >
                        Bloklangan (Ochish)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBlockDirectPair(pair.user1.id, pair.user2.id)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/25 transition cursor-pointer flex-shrink-0 flex items-center gap-1"
                      >
                        <UserX className="w-3 h-3" />
                        Bloklash
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Surveillance Live Feed */}
          <div className="bg-family-surface border border-white/10 rounded-2xl p-5 shadow-xl">
            {/* Filter Bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-family-text-secondary flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filtr:
                </span>
                <button
                  type="button"
                  onClick={() => setMonitorType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    monitorType === 'all'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-family-night text-family-text-secondary hover:text-white'
                  }`}
                >
                  Barchasi
                </button>
                <button
                  type="button"
                  onClick={() => setMonitorType('direct')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    monitorType === 'direct'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-family-night text-family-text-secondary hover:text-white'
                  }`}
                >
                  Shaxsiy (1-on-1)
                </button>
                <button
                  type="button"
                  onClick={() => setMonitorType('group')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    monitorType === 'group'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-family-night text-family-text-secondary hover:text-white'
                  }`}
                >
                  Guruhlar
                </button>

                <div className="h-4 w-px bg-white/10 mx-1" />

                <button
                  type="button"
                  onClick={() => setMonitorMedia(monitorMedia === 'audio' ? 'all' : 'audio')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    monitorMedia === 'audio'
                      ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                      : 'bg-family-night text-family-text-secondary hover:text-white'
                  }`}
                >
                  <Mic className="w-3 h-3" /> Faqat Audio
                </button>
                <button
                  type="button"
                  onClick={() => setMonitorMedia(monitorMedia === 'media' ? 'all' : 'media')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    monitorMedia === 'media'
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-family-night text-family-text-secondary hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" /> Faqat Fayl/Rasm
                </button>
              </div>

              <button
                type="button"
                onClick={loadSurveillanceData}
                disabled={loadingSurveillance}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-family-text-secondary hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSurveillance ? 'animate-spin' : ''}`} />
                Yangilash
              </button>
            </div>

            {/* Messages Feed Table */}
            {loadingSurveillance ? (
              <div className="p-8 text-center text-xs text-family-text-muted animate-pulse">
                Kuzatuv ma'lumotlari yuklanmoqda...
              </div>
            ) : surveillanceMessages.length === 0 ? (
              <div className="p-8 text-center text-xs text-family-text-muted">
                Ushbu filtr bo'yicha yozishmalar topilmadi.
              </div>
            ) : (
              <div className="space-y-3">
                {surveillanceMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-xl bg-family-night/60 border border-white/5 hover:border-white/10 transition space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {/* Channel Badge */}
                        {msg.channel === 'direct' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            1-on-1 Shaxsiy
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            Guruh: {msg.group_name}
                          </span>
                        )}

                        {/* Sender */}
                        <div className="flex items-center gap-1.5 font-bold text-family-text-primary">
                          <img
                            src={msg.sender?.avatar || '/avatars/default.png'}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span>
                            {msg.sender?.first_name} {msg.sender?.last_name}
                          </span>
                          <span className="text-[10px] font-normal text-family-gold">
                            ({msg.sender?.relationship})
                          </span>
                        </div>

                        {/* Recipient if Direct */}
                        {msg.channel === 'direct' && msg.recipient && (
                          <>
                            <span className="text-family-text-muted">➡️</span>
                            <div className="flex items-center gap-1.5 font-bold text-family-text-primary">
                              <img
                                src={msg.recipient?.avatar || '/avatars/default.png'}
                                alt=""
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span>
                                {msg.recipient?.first_name} {msg.recipient?.last_name}
                              </span>
                              <span className="text-[10px] font-normal text-family-gold">
                                ({msg.recipient?.relationship})
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-family-text-muted">
                        {new Date(msg.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Content Text */}
                    {msg.content && (
                      <p className="text-sm text-family-text-primary leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/5">
                        {msg.content}
                      </p>
                    )}

                    {/* Audio Player if Voice Note */}
                    {msg.message_type === 'audio' && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 w-fit">
                        <Mic className="w-4 h-4 text-pink-400" />
                        <span className="text-xs font-semibold text-pink-300">Ovozli xabar</span>
                        {msg.attachments?.[0]?.file_url && (
                          <audio
                            controls
                            src={msg.attachments[0].file_url}
                            className="h-8 max-w-[240px]"
                          />
                        )}
                      </div>
                    )}

                    {/* Image / Video / File Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && msg.message_type !== 'audio' && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-xs"
                          >
                            {att.mime_type?.startsWith('image/') ? (
                              <img
                                src={att.file_url}
                                alt=""
                                className="w-16 h-16 object-cover rounded-lg border border-white/10"
                              />
                            ) : (
                              <FileText className="w-4 h-4 text-sky-400" />
                            )}
                            <div>
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-family-gold hover:underline text-xs"
                              >
                                {att.file_name}
                              </a>
                              <div className="text-[10px] text-family-text-muted">
                                {((att.file_size || 0) / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: RUXSAT SO'ROVLARI (CROSS-GENDER APPROVALS & BLOCKING) */}
      {activeTab === 'permissions' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Card */}
          <div className="bg-family-surface border border-amber-500/20 rounded-2xl p-5 shadow-xl flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-family-text-primary">
                  Qizlar va O'g'il Bolalar o'rtasidagi Ruxsat Tizimi
                </h3>
                <p className="text-xs text-family-text-secondary mt-0.5">
                  Qarama-qarshi jinsdagi sinfdoshlar bir-biriga yozishdan oldin Sizdan ruxsat so'raydi. Siz tasdiqlamaguningizcha ular yozisha olmaydi.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadPermissionsData}
              disabled={loadingPermissions}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-white/10 text-family-text-secondary hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPermissions ? 'animate-spin' : ''}`} />
              Yangilash
            </button>
          </div>

          {/* Pending Requests Queue */}
          <div className="bg-family-surface border border-white/10 rounded-2xl p-5 shadow-xl">
            <h4 className="text-sm font-bold text-family-text-primary mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Kutilayotgan Ruxsat So'rovlari (
              {permissionsList.filter((p) => p.status === 'pending').length})
            </h4>

            {permissionsList.filter((p) => p.status === 'pending').length === 0 ? (
              <div className="p-6 text-center text-xs text-family-text-muted bg-family-night/40 rounded-xl border border-white/5">
                Ayni paytda yangi ruxsat so'rovlari yo'q. Barcha yozishmalar xavfsiz nazorat ostida.
              </div>
            ) : (
              <div className="space-y-3">
                {permissionsList
                  .filter((p) => p.status === 'pending')
                  .map((perm) => (
                    <div
                      key={perm.id}
                      className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between flex-wrap gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <img
                            src={perm.u1_avatar || '/avatars/default.png'}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-family-night"
                          />
                          <img
                            src={perm.u2_avatar || '/avatars/default.png'}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-family-night"
                          />
                        </div>

                        <div>
                          <div className="text-sm font-bold text-family-text-primary flex items-center gap-1.5">
                            <span>{perm.u1_first_name} {perm.u1_last_name}</span>
                            <span className="text-xs text-family-gold">({perm.u1_relationship})</span>
                            <span className="text-family-text-muted">↔</span>
                            <span>{perm.u2_first_name} {perm.u2_last_name}</span>
                            <span className="text-xs text-family-gold">({perm.u2_relationship})</span>
                          </div>
                          <div className="text-xs text-amber-300 mt-0.5">
                            So'rov yubordi: <strong>{perm.requester_name || 'Foydalanuvchi'}</strong> •{' '}
                            {new Date(perm.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprovePermission(perm.id)}
                          disabled={actionInProgress === perm.id}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Ruxsat Berish
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBlockPermission(perm.id)}
                          disabled={actionInProgress === perm.id}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Rad Etish / Bloklash
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* All Permissions & Blocked History */}
          <div className="bg-family-surface border border-white/10 rounded-2xl p-5 shadow-xl">
            <h4 className="text-sm font-bold text-family-text-primary mb-3">
              Barcha Ruxsatlar va Bloklangan Suhbatlar Tarixi
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-family-text-secondary">
                <thead className="bg-family-night/60 text-family-text-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Foydalanuvchi 1</th>
                    <th className="p-3">Foydalanuvchi 2</th>
                    <th className="p-3">Holati</th>
                    <th className="p-3">Sana</th>
                    <th className="p-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {permissionsList
                    .filter((p) => p.status !== 'pending')
                    .map((perm) => (
                      <tr key={perm.id} className="hover:bg-white/5 transition">
                        <td className="p-3 font-semibold text-family-text-primary">
                          {perm.u1_first_name} {perm.u1_last_name} ({perm.u1_relationship})
                        </td>
                        <td className="p-3 font-semibold text-family-text-primary">
                          {perm.u2_first_name} {perm.u2_last_name} ({perm.u2_relationship})
                        </td>
                        <td className="p-3">
                          {perm.status === 'approved' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Ruxsat Berilgan
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              Bloklangan
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-family-text-muted font-mono text-[11px]">
                          {new Date(perm.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          {perm.status === 'approved' ? (
                            <button
                              type="button"
                              onClick={() => handleBlockPermission(perm.id)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer"
                            >
                              Bloklash
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApprovePermission(perm.id)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
                            >
                              Ruxsat Berish
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Admin User Modal */}
      {isUserModalOpen && (
        <AdminUserModal
          user={editingUser}
          allGroups={groupsList}
          onClose={() => setIsUserModalOpen(false)}
          onSuccess={loadAllAdminData}
        />
      )}

      {/* Admin Group Modal */}
      {isGroupModalOpen && (
        <AdminGroupModal
          group={editingGroup}
          allUsers={usersList}
          onClose={() => setIsGroupModalOpen(false)}
          onSuccess={loadAllAdminData}
        />
      )}

      {/* Broadcast Announcement Modal */}
      {isAnnouncementOpen && (
        <AnnouncementModal
          allGroups={groupsList}
          onClose={() => setIsAnnouncementOpen(false)}
          onSuccess={() => {
            alert('E‘lon muvaffaqiyatli tarqatildi!');
            loadAllAdminData();
          }}
        />
      )}
    </div>
  );
}
