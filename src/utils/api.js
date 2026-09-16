const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('family_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // If body is FormData, delete Content-Type to let browser set boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Serverda kutilmagan xatolik yuz berdi.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request('/auth/me'),

  // Groups
  getGroups: () => request('/groups'),
  getGroup: (id) => request(`/groups/${id}`),
  createGroup: (data) =>
    request('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateGroup: (id, data) =>
    request(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteGroup: (id) =>
    request(`/groups/${id}`, {
      method: 'DELETE',
    }),

  // Messages
  getMessages: (groupId, offset = 0, limit = 50) =>
    request(`/groups/${groupId}/messages?offset=${offset}&limit=${limit}`),
  sendMessage: (groupId, payload) =>
    request(`/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  toggleReaction: (groupId, messageId, reaction) =>
    request(`/groups/${groupId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    }),
  deleteMessage: (groupId, messageId) =>
    request(`/groups/${groupId}/messages/${messageId}`, {
      method: 'DELETE',
    }),

  // Media & Uploads
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Birthdays & Contacts
  getBirthdays: () => request('/birthdays'),
  getContacts: (q = '') => request(`/contacts${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'PUT',
    }),
  markAllNotificationsRead: () =>
    request('/notifications/read-all', {
      method: 'PUT',
    }),

  // Admin management
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: () => request('/admin/users'),
  createAdminUser: (data) =>
    request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminUser: (id, data) =>
    request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  resetUserPassword: (id, new_password) =>
    request(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password }),
    }),
  toggleUserStatus: (id, status) =>
    request(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  deleteUser: (id) =>
    request(`/admin/users/${id}`, {
      method: 'DELETE',
    }),

  // Admin Announcements & Audit
  broadcastAnnouncement: (data) =>
    request('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAuditLogs: () => request('/admin/audit-logs'),

  // Cloud Storage & Security Settings
  getSettings: () => request('/admin/settings'),
  saveSettings: (data) =>
    request('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  testTelegram: (data) =>
    request('/admin/settings/test-telegram', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Direct Messages (1-on-1)
  getDirectConversations: () => request('/direct-messages/conversations'),
  getDirectMessages: (recipientId, params = {}) =>
    request(`/direct-messages/${recipientId}?${new URLSearchParams(params).toString()}`),
  sendDirectMessage: (recipientId, data) =>
    request(`/direct-messages/${recipientId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  markDirectMessageRead: (messageId) =>
    request(`/direct-messages/messages/${messageId}/read`, {
      method: 'POST',
    }),
  reactDirectMessage: (messageId, reaction) =>
    request(`/direct-messages/messages/${messageId}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    }),
  deleteDirectMessage: (messageId) =>
    request(`/direct-messages/messages/${messageId}`, {
      method: 'DELETE',
    }),

  // Cross-Gender Chat Permissions & Approvals
  getPermissionStatus: (recipientId) => request(`/permissions/status/${recipientId}`),
  requestChatPermission: (recipientId) =>
    request(`/permissions/request/${recipientId}`, {
      method: 'POST',
    }),
  getAdminPermissions: () => request('/permissions/admin/list'),
  approvePermission: (id) =>
    request(`/permissions/admin/${id}/approve`, {
      method: 'POST',
    }),
  blockPermission: (id) =>
    request(`/permissions/admin/${id}/block`, {
      method: 'POST',
    }),
  blockUserPair: (user1_id, user2_id) =>
    request('/permissions/admin/block-pair', {
      method: 'POST',
      body: JSON.stringify({ user1_id, user2_id }),
    }),

  // Super Admin Surveillance & Monitoring
  getMonitoringStats: () => request('/admin/monitoring/stats'),
  getMonitoringMessages: (params = {}) =>
    request(`/admin/monitoring/messages?${new URLSearchParams(params).toString()}`),
  getMonitoringActivePairs: () => request('/admin/monitoring/active-pairs'),
};

