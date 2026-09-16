import React, { useState, useEffect } from 'react';
import { api } from './utils/api';
import { getSocket, disconnectSocket } from './utils/socket';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import GroupChatPage from './pages/GroupChatPage';
import BirthdaysPage from './pages/BirthdaysPage';
import ContactsPage from './pages/ContactsPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedDmUserId, setSelectedDmUserId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalAnnouncement, setGlobalAnnouncement] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await api.getMe();
      setUser(res.user);
      setGroups(res.groups || []);
      initSocketListeners();
    } catch (err) {
      setUser(null);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const initSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('announcement_received', (data) => {
      setGlobalAnnouncement(data);
      setTimeout(() => setGlobalAnnouncement(null), 8000);
    });
  };

  const handleLoginSuccess = (userData, userGroups) => {
    setUser(userData);
    setGroups(userGroups || []);
    setActiveTab('home');
    initSocketListeners();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      // Ignore
    }
    localStorage.removeItem('family_token');
    disconnectSocket();
    setUser(null);
    setGroups([]);
    setActiveTab('home');
  };

  const [pendingPermissionsCount, setPendingPermissionsCount] = useState(0);

  useEffect(() => {
    if (user?.is_admin === 1) {
      loadPendingPermissions();
      const socket = getSocket();
      if (socket) {
        const handleAdminReq = () => {
          loadPendingPermissions();
        };
        socket.on('admin_permission_request', handleAdminReq);
        return () => {
          socket.off('admin_permission_request', handleAdminReq);
        };
      }
    }
  }, [user?.id, user?.is_admin]);

  const loadPendingPermissions = async () => {
    try {
      const res = await api.getAdminPermissions();
      const pending = (res?.permissions || []).filter((p) => p.status === 'pending').length;
      setPendingPermissionsCount(pending);
    } catch (e) {
      // ignore
    }
  };

  const handleSelectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setSelectedDmUserId(null);
    setActiveTab('chat');
  };

  const handleSelectDm = (userId) => {
    setSelectedDmUserId(userId);
    setSelectedGroupId(null);
    setActiveTab('chat');
  };

  // Route guard: Prevent regular users from entering Admin tabs
  const handleTabChange = (tabId) => {
    if (
      (tabId === 'admin' || tabId === 'admin_permissions' || tabId === 'admin_surveillance') &&
      user?.is_admin !== 1
    ) {
      alert('Ruxsat berilmagan: Super Admin paneli faqat administrator uchun.');
      return;
    }
    setActiveTab(tabId);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#05070B] text-family-gold">
        <div className="w-14 h-14 rounded-2xl bg-family-card border border-family-gold/40 flex items-center justify-center mb-4 shadow-gold-sm">
          <Loader2 size={28} className="animate-spin" />
        </div>
        <div className="font-serif text-lg tracking-wider text-family-text-primary">
          GROUP
        </div>
        <p className="text-xs text-family-gold/80 mt-1">Xavfsiz ulanish o‘rnatilmoqda...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#05070B] text-family-text-primary flex flex-col">
      {/* Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />

      {/* Global Broadcast Announcement Toast */}
      {globalAnnouncement && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg p-4 rounded-2xl bg-gradient-to-r from-family-card via-[#20293F] to-family-card border-2 border-family-gold shadow-gold-lg animate-fade-in flex items-start gap-3">
          <div className="p-2 rounded-xl bg-family-gold/20 text-family-gold shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-family-gold">
              {globalAnnouncement.title || 'Rasmiy E‘lon'}
            </div>
            <p className="text-xs text-family-text-primary mt-0.5">
              {globalAnnouncement.content}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGlobalAnnouncement(null)}
            className="text-family-text-muted hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Layout: Sidebar + View Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          user={user}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          pendingPermissionsCount={pendingPermissionsCount}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-20 md:pb-8 min-w-0">
          {activeTab === 'home' && (
            <HomePage
              user={user}
              onSelectGroup={handleSelectGroup}
              onNavigateTab={handleTabChange}
            />
          )}

          {activeTab === 'chat' && (
            <GroupChatPage
              user={user}
              initialGroupId={selectedGroupId}
              initialDmUserId={selectedDmUserId}
              onBack={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'birthdays' && (
            <BirthdaysPage
              user={user}
              onSelectGroup={handleSelectGroup}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsPage
              user={user}
              onSelectGroup={handleSelectGroup}
              onStartDm={handleSelectDm}
            />
          )}

          {activeTab === 'profile' && (
            <ProfilePage user={user} />
          )}

          {activeTab === 'admin' && user.is_admin === 1 && (
            <AdminDashboard user={user} initialTab="members" />
          )}

          {activeTab === 'admin_permissions' && user.is_admin === 1 && (
            <AdminDashboard user={user} initialTab="permissions" />
          )}

          {activeTab === 'admin_surveillance' && user.is_admin === 1 && (
            <AdminDashboard user={user} initialTab="surveillance" />
          )}
        </main>
      </div>

      {/* Mobile Navigation Bar */}
      <MobileNav
        user={user}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />
    </div>
  );
}
