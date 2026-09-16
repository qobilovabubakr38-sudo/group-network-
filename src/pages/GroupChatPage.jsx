import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Smile, Paperclip, Mic, ArrowLeft, Users, MessageSquare, Reply,
  Trash2, X, AlertCircle, Shield, FileText, Download,
  Check, CheckCheck, Loader2, Sparkles, Clock, Lock, RefreshCw, UserCheck, ShieldAlert,
  Search, ShieldCheck
} from 'lucide-react';
import { api } from '../utils/api';
import { getSocket } from '../utils/socket';
import AudioRecorder from '../components/AudioRecorder';
import AudioPlayer from '../components/AudioPlayer';
import MediaViewer from '../components/MediaViewer';

const QUICK_EMOJIS = ['❤️', '👍', '🎂', '👏', '😂', '🎉', '🤲', '✨'];

export default function GroupChatPage({ user, initialGroupId, initialDmUserId, onBack }) {
  // Navigation mode: 'group' or 'direct'
  const [chatMode, setChatMode] = useState(initialDmUserId ? 'direct' : 'group');

  // Groups state
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [groupPermissionError, setGroupPermissionError] = useState('');
  const [groupTypingUsers, setGroupTypingUsers] = useState([]);

  // Direct messages state
  const [conversations, setConversations] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [selectedDmUser, setSelectedDmUser] = useState(null);
  const [dmPermission, setDmPermission] = useState(null); // { allowed: bool, status: string, reason: string }
  const [dmPermissionLoading, setDmPermissionLoading] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [dmMessages, setDmMessages] = useState([]);
  const [loadingDm, setLoadingDm] = useState(false);
  const [dmTyping, setDmTyping] = useState(false);
  const [searchDmQuery, setSearchDmQuery] = useState('');

  // Common messaging state
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Initial Load: Groups and Direct Conversations
  useEffect(() => {
    loadUserGroups();
    loadDirectData();
  }, []);

  // Handle initialDmUserId prop changes
  useEffect(() => {
    if (initialDmUserId) {
      setChatMode('direct');
      findAndSelectDmUser(initialDmUserId);
    }
  }, [initialDmUserId]);

  const loadUserGroups = async () => {
    try {
      const data = await api.getGroups();
      const userGroups = data.groups || [];
      setGroups(userGroups);
      if (!selectedGroupId && userGroups.length > 0 && chatMode === 'group') {
        setSelectedGroupId(userGroups[0].id);
      }
    } catch (err) {
      console.error('Guruhlarni yuklashda xatolik:', err);
    }
  };

  const loadDirectData = async () => {
    try {
      const [convRes, contactsRes] = await Promise.all([
        api.getDirectConversations().catch(() => ({ conversations: [] })),
        api.getContacts().catch(() => ({ contacts: [] }))
      ]);

      const convs = convRes.conversations || [];
      setConversations(convs);

      const contacts = (contactsRes.contacts || []).filter((c) => c.id !== user.id);
      setAllContacts(contacts);
    } catch (err) {
      console.error('Shaxsiy chatlarni yuklashda xatolik:', err);
    }
  };

  const findAndSelectDmUser = async (userId) => {
    try {
      const contactsRes = await api.getContacts();
      const userObj = (contactsRes.contacts || []).find((c) => c.id === parseInt(userId, 10));
      if (userObj) {
        selectDmUser(userObj);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Load Group Details & Messages
  useEffect(() => {
    if (chatMode !== 'group' || !selectedGroupId) return;

    setGroupPermissionError('');
    setLoadingGroup(true);
    setReplyingTo(null);
    setText('');

    const loadGroup = async () => {
      try {
        const [groupRes, msgsRes] = await Promise.all([
          api.getGroup(selectedGroupId),
          api.getMessages(selectedGroupId),
        ]);
        setCurrentGroup(groupRes.group);
        setGroupMessages(msgsRes.messages || []);
      } catch (err) {
        console.error('Guruh chatini ochishda xatolik:', err);
        if (err.status === 403) {
          setGroupPermissionError('Kirish taqiqlangan: siz ushbu guruh a‘zosi emassiz.');
        } else {
          setGroupPermissionError(err.message || 'Xabarlarni yuklashda xatolik yuz berdi.');
        }
      } finally {
        setLoadingGroup(false);
      }
    };

    loadGroup();

    // Group Socket Room
    const socket = getSocket();
    if (socket) {
      socket.emit('join_group', { groupId: selectedGroupId });

      const handleNewGroupMessage = (msg) => {
        if (msg.group_id === parseInt(selectedGroupId, 10)) {
          setGroupMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
        }
      };

      const handleGroupReactionUpdated = ({ messageId, reactions }) => {
        setGroupMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
        );
      };

      const handleGroupMessageDeleted = ({ messageId }) => {
        setGroupMessages((prev) => prev.filter((m) => m.id !== messageId));
      };

      const handleGroupUserTyping = ({ groupId, userId, userName, isTyping }) => {
        if (parseInt(groupId, 10) === parseInt(selectedGroupId, 10)) {
          setGroupTypingUsers((prev) => {
            if (isTyping) {
              return prev.some((u) => u.userId === userId) ? prev : [...prev, { userId, userName }];
            } else {
              return prev.filter((u) => u.userId !== userId);
            }
          });
        }
      };

      socket.on('new_message', handleNewGroupMessage);
      socket.on('message_reaction_updated', handleGroupReactionUpdated);
      socket.on('message_deleted', handleGroupMessageDeleted);
      socket.on('user_typing', handleGroupUserTyping);

      return () => {
        socket.emit('leave_group', { groupId: selectedGroupId });
        socket.off('new_message', handleNewGroupMessage);
        socket.off('message_reaction_updated', handleGroupReactionUpdated);
        socket.off('message_deleted', handleGroupMessageDeleted);
        socket.off('user_typing', handleGroupUserTyping);
      };
    }
  }, [selectedGroupId, chatMode]);

  // 3. Load Direct Chat & Permission Check
  useEffect(() => {
    if (chatMode !== 'direct' || !selectedDmUser?.id) return;

    setReplyingTo(null);
    setText('');
    checkDmPermissionAndLoadMessages(selectedDmUser.id);
  }, [selectedDmUser?.id, chatMode]);

  const checkDmPermissionAndLoadMessages = async (partnerId) => {
    try {
      setDmPermissionLoading(true);
      const permRes = await api.getPermissionStatus(partnerId);
      const perm = permRes?.permission || permRes || {};
      const isAllowed = Boolean(perm.allowed || permRes?.allowed || user?.is_admin === 1);

      setDmPermission({
        ...perm,
        allowed: isAllowed,
      });

      if (isAllowed) {
        setLoadingDm(true);
        const msgsRes = await api.getDirectMessages(partnerId);
        setDmMessages(msgsRes.messages || []);
        setLoadingDm(false);

        // Mark conversations as read locally without refetching network
        setConversations((prev) =>
          prev.map((c) => (c.partner?.id === partnerId ? { ...c, unread_count: 0 } : c))
        );
      } else {
        setDmMessages([]);
      }
    } catch (err) {
      console.error('Shaxsiy chat ruxsatini tekshirishda xatolik:', err);
    } finally {
      setDmPermissionLoading(false);
    }
  };

  // Direct Message Socket Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleDmMessage = (msg) => {
      if (selectedDmUser && (msg.sender_id === selectedDmUser.id || msg.recipient_id === selectedDmUser.id)) {
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();

        // Mark as read if received while chat is open
        if (msg.sender_id === selectedDmUser.id) {
          api.markDirectMessageRead(msg.id).catch(console.error);
        }
      }
      // Update conversations list in place
      setConversations((prev) => {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        const exists = prev.some((c) => c.partner?.id === partnerId);
        if (!exists) {
          loadDirectData();
          return prev;
        }
        return prev.map((c) => {
          if (c.partner?.id === partnerId) {
            return {
              ...c,
              last_message: msg.content || (msg.message_type === 'voice' ? '🎤 Ovozli xabar' : '📁 Fayl'),
              last_message_at: msg.created_at,
            };
          }
          return c;
        });
      });
    };

    const handleDmReaction = ({ messageId, reactions }) => {
      setDmMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleDmDeleted = ({ messageId }) => {
      setDmMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleDmTypingEvent = ({ senderId, isTyping }) => {
      if (selectedDmUser && senderId === selectedDmUser.id) {
        setDmTyping(isTyping);
      }
    };

    socket.on('dm_new_message', handleDmMessage);
    socket.on('dm_reaction_updated', handleDmReaction);
    socket.on('dm_message_deleted', handleDmDeleted);
    socket.on('dm_user_typing', handleDmTypingEvent);

    return () => {
      socket.off('dm_new_message', handleDmMessage);
      socket.off('dm_reaction_updated', handleDmReaction);
      socket.off('dm_message_deleted', handleDmDeleted);
      socket.off('dm_user_typing', handleDmTypingEvent);
    };
  }, [selectedDmUser?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages, dmMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send Direct Chat Permission Request
  const handleRequestPermission = async () => {
    if (!selectedDmUser) return;
    try {
      setRequestingPermission(true);
      await api.requestChatPermission(selectedDmUser.id);
      // Recheck status
      await checkDmPermissionAndLoadMessages(selectedDmUser.id);
      alert('Ruxsat so‘rovingiz Super Adminga muvaffaqiyatli yuborildi! Admin tasdiqlashi bilanoq chat ochiladi.');
    } catch (err) {
      alert(err.message || 'Ruxsat so‘rashda xatolik yuz berdi.');
    } finally {
      setRequestingPermission(false);
    }
  };

  const selectDmUser = (partner) => {
    if (!partner) return;
    setSelectedDmUser((prev) => {
      if (prev?.id === partner.id) return prev;
      return partner;
    });
    setChatMode('direct');
  };

  // Typing Handler
  const handleTypingChange = (e) => {
    setText(e.target.value);
    const socket = getSocket();
    if (!socket) return;

    if (chatMode === 'group' && selectedGroupId) {
      socket.emit('typing', { groupId: selectedGroupId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { groupId: selectedGroupId, isTyping: false });
      }, 2000);
    } else if (chatMode === 'direct' && selectedDmUser && dmPermission?.allowed) {
      socket.emit('dm_typing', { recipientId: selectedDmUser.id, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('dm_typing', { recipientId: selectedDmUser.id, isTyping: false });
      }, 2000);
    }
  };

  // Send Message (Group or DM)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    try {
      setSending(true);
      const payload = {
        content: text.trim(),
        message_type: 'text',
        reply_to: replyingTo ? replyingTo.id : null,
      };

      if (chatMode === 'group') {
        if (!selectedGroupId) return;
        await api.sendMessage(selectedGroupId, payload);
        const socket = getSocket();
        if (socket) socket.emit('typing', { groupId: selectedGroupId, isTyping: false });
      } else {
        if (!selectedDmUser) return;
        if (!dmPermission?.allowed && user?.is_admin !== 1) return;
        await api.sendDirectMessage(selectedDmUser.id, payload);
        const socket = getSocket();
        if (socket) socket.emit('dm_typing', { recipientId: selectedDmUser.id, isTyping: false });
      }

      setText('');
      setReplyingTo(null);
      setShowEmojiPicker(false);
    } catch (err) {
      alert(err.message || 'Xabarni yuborib bo‘lmadi.');
    } finally {
      setSending(false);
    }
  };

  // Voice Message
  const handleSendVoice = async (attachment) => {
    try {
      const payload = {
        content: '',
        message_type: 'voice',
        reply_to: replyingTo ? replyingTo.id : null,
        attachments: [attachment],
      };

      if (chatMode === 'group') {
        if (!selectedGroupId) return;
        await api.sendMessage(selectedGroupId, payload);
      } else {
        if (!selectedDmUser) return;
        if (!dmPermission?.allowed && user?.is_admin !== 1) return;
        await api.sendDirectMessage(selectedDmUser.id, payload);
      }

      setShowRecorder(false);
      setReplyingTo(null);
    } catch (err) {
      alert('Ovozli xabarni yuborib bo‘lmadi.');
    }
  };

  // File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSending(true);
      const res = await api.uploadFile(file);

      let msgType = 'file';
      if (res.mimeType.startsWith('image/')) msgType = 'image';
      else if (res.mimeType.startsWith('video/')) msgType = 'video';
      else if (res.mimeType.startsWith('audio/')) msgType = 'voice';

      const payload = {
        content: '',
        message_type: msgType,
        reply_to: replyingTo ? replyingTo.id : null,
        attachments: [
          {
            file_url: res.url,
            file_name: res.fileName,
            mime_type: res.mimeType,
            file_size: res.fileSize,
          },
        ],
      };

      if (chatMode === 'group') {
        if (!selectedGroupId) return;
        await api.sendMessage(selectedGroupId, payload);
      } else {
        if (!selectedDmUser) return;
        if (!dmPermission?.allowed && user?.is_admin !== 1) return;
        await api.sendDirectMessage(selectedDmUser.id, payload);
      }

      setReplyingTo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert(err.message || 'Fayl yuklashda xatolik');
    } finally {
      setSending(false);
    }
  };

  // Reaction Handler
  const handleToggleReaction = async (messageId, emoji) => {
    try {
      if (chatMode === 'group') {
        await api.toggleReaction(selectedGroupId, messageId, emoji);
      } else {
        await api.reactDirectMessage(messageId, emoji);
      }
      setActiveReactionMessageId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Message Handler
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Haqiqatan ham bu xabarni o‘chirmoqchimisiz?')) return;
    try {
      if (chatMode === 'group') {
        await api.deleteMessage(selectedGroupId, messageId);
      } else {
        await api.deleteDirectMessage(messageId);
      }
    } catch (err) {
      alert(err.message || 'Xabarni o‘chirib bo‘lmadi.');
    }
  };

  // Active messages list based on mode
  const activeMessages = chatMode === 'group' ? groupMessages : dmMessages;
  const activeLoading = chatMode === 'group' ? loadingGroup : (loadingDm || dmPermissionLoading);
  const isChatOpen = chatMode === 'group' ? Boolean(selectedGroupId) : Boolean(selectedDmUser);
  const isAllowedToChat = chatMode === 'group' || (chatMode === 'direct' && Boolean(dmPermission?.allowed || user?.is_admin === 1));

  // Filtered contacts for DM search
  const filteredContacts = allContacts.filter((c) => {
    if (!searchDmQuery.trim()) return true;
    const q = searchDmQuery.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      (c.relationship && c.relationship.toLowerCase().includes(q))
    );
  });

  const totalDmUnread = conversations.reduce((acc, cur) => acc + (cur.unreadCount || 0), 0);

  return (
    <div className="h-[calc(100vh-130px)] md:h-[calc(100vh-90px)] max-w-7xl mx-auto flex rounded-3xl overflow-hidden border border-family-gold/20 bg-family-night shadow-2xl relative animate-fade-in">
      {/* Left Sidebar: Dual Mode (Groups vs Direct) */}
      <div
        className={`w-full md:w-80 bg-family-card border-r border-white/5 flex flex-col shrink-0 ${
          isChatOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Navigation Tabs Header */}
        <div className="p-3 border-b border-white/5 bg-family-surface/50">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-family-night rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setChatMode('group')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                chatMode === 'group'
                  ? 'bg-family-gold text-black shadow-gold-sm'
                  : 'text-family-text-secondary hover:text-white'
              }`}
            >
              <Users size={15} />
              <span>Guruhlar</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
                {groups.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChatMode('direct')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition relative ${
                chatMode === 'direct'
                  ? 'bg-family-gold text-black shadow-gold-sm'
                  : 'text-family-text-secondary hover:text-white'
              }`}
            >
              <MessageSquare size={15} />
              <span>Shaxsiy</span>
              {totalDmUnread > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {totalDmUnread}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {/* GROUP MODE LIST */}
          {chatMode === 'group' && (
            <>
              {groups.length === 0 ? (
                <div className="p-8 text-center text-xs text-family-text-muted">
                  Siz a‘zo bo‘lgan guruhlar mavjud emas.
                </div>
              ) : (
                groups.map((g) => {
                  const isSelected = selectedGroupId === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`p-4 cursor-pointer transition flex items-center gap-3.5 ${
                        isSelected
                          ? 'bg-family-night border-l-4 border-family-gold text-family-gold'
                          : 'hover:bg-family-surface/40 text-family-text-secondary'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-2xl bg-family-surface border border-family-gold/30 flex items-center justify-center text-family-gold font-serif font-bold text-base shrink-0">
                        {g.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-family-text-primary truncate">
                            {g.name}
                          </h4>
                          <span className="text-[10px] text-family-text-muted">
                            {g.member_count} a‘zo
                          </span>
                        </div>
                        <p className="text-[11px] text-family-text-muted truncate mt-0.5">
                          {g.last_message
                            ? `${g.last_message.first_name}: ${g.last_message.content || 'Biriktirma'}`
                            : g.description || 'Guruh chati'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* DIRECT MODE LIST */}
          {chatMode === 'direct' && (
            <div className="flex flex-col h-full">
              {/* Search Bar */}
              <div className="p-2.5 border-b border-white/5">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-family-text-muted" />
                  <input
                    type="text"
                    value={searchDmQuery}
                    onChange={(e) => setSearchDmQuery(e.target.value)}
                    placeholder="Suhbatdoshni qidirish..."
                    className="w-full bg-family-night border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-family-text-primary placeholder:text-family-text-muted focus:outline-none focus:border-family-gold/50"
                  />
                </div>
              </div>

              {/* Active Conversations Section */}
              <div className="p-2.5 text-[11px] font-bold text-family-gold/80 uppercase tracking-wider flex items-center justify-between">
                <span>Yozishmalar</span>
                <span className="text-[10px] text-family-text-muted font-normal">
                  {conversations.length} ta
                </span>
              </div>

              {conversations.length > 0 ? (
                conversations.map((conv) => {
                  const partner = conv.partner;
                  const isSelected = selectedDmUser?.id === partner.id;
                  return (
                    <div
                      key={partner.id}
                      onClick={() => selectDmUser(partner)}
                      className={`p-3.5 cursor-pointer transition flex items-center gap-3 ${
                        isSelected
                          ? 'bg-family-night border-l-4 border-family-gold text-family-gold'
                          : 'hover:bg-family-surface/40 text-family-text-secondary'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={partner.avatar || '/avatars/male1.png'}
                          alt={partner.first_name}
                          className="w-10 h-10 rounded-xl object-cover bg-family-surface border border-family-gold/30"
                        />
                        {partner.status === 'active' && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-family-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-family-text-primary truncate flex items-center gap-1">
                            <span>{partner.first_name} {partner.last_name}</span>
                          </h4>
                          {conv.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-family-gold/70 truncate">
                            {partner.relationship}
                          </span>
                          <span className="text-[9px] text-family-text-muted">
                            {conv.lastMessage?.created_at ? new Date(conv.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-family-text-muted truncate mt-0.5">
                          {conv.lastMessage?.content || (conv.lastMessage ? 'Fayl / Ovozli xabar' : 'Yangi suhbat')}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-center text-xs text-family-text-muted">
                  Hozircha shaxsiy yozishmalar yo‘q.
                </div>
              )}

              {/* All Permitted Contacts Section (to start new chats) */}
              <div className="p-2.5 mt-2 bg-family-surface/30 border-y border-white/5 text-[11px] font-bold text-family-gold/80 uppercase tracking-wider">
                Yangi Suhbat Boshlash
              </div>
              <div className="divide-y divide-white/5">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedDmUser?.id === contact.id;
                  return (
                    <div
                      key={contact.id}
                      onClick={() => selectDmUser(contact)}
                      className={`p-3 cursor-pointer transition flex items-center gap-3 ${
                        isSelected
                          ? 'bg-family-night border-l-4 border-family-gold'
                          : 'hover:bg-family-surface/40'
                      }`}
                    >
                      <img
                        src={contact.avatar || '/avatars/male1.png'}
                        alt={contact.first_name}
                        className="w-8 h-8 rounded-xl object-cover bg-family-surface border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-family-text-primary truncate">
                          {contact.first_name} {contact.last_name}
                        </div>
                        <div className="text-[10px] text-family-gold/80 truncate">
                          {contact.relationship || 'A‘zo'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#080C14] ${!isChatOpen ? 'hidden md:flex' : 'flex'}`}>
        {/* GROUP ERROR STATE */}
        {chatMode === 'group' && groupPermissionError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-family-text-primary mb-2">
              Ruxsat Taqiqlangan (403 Forbidden)
            </h3>
            <p className="text-xs text-family-text-secondary max-w-md mb-6 leading-relaxed">
              {groupPermissionError}
            </p>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 gold-btn rounded-xl text-xs font-semibold"
              >
                Ortga qaytish
              </button>
            )}
          </div>
        ) : !isChatOpen ? (
          /* NO CHAT SELECTED STATE */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-family-text-muted">
            <div className="w-16 h-16 rounded-3xl bg-family-card border border-family-gold/20 flex items-center justify-center text-family-gold/60 mb-4 shadow-gold-sm">
              {chatMode === 'group' ? <Users size={32} /> : <MessageSquare size={32} />}
            </div>
            <p className="text-sm font-semibold text-family-text-primary">
              {chatMode === 'group'
                ? 'Muloqotni boshlash uchun guruhni tanlang'
                : 'Shaxsiy suhbatni boshlash uchun kontaktni tanlang'}
            </p>
            <p className="text-xs text-family-text-muted mt-1 max-w-sm">
              {chatMode === 'group'
                ? 'Faqat siz a‘zo bo‘lgan guruhlar xabarlarini ko‘rasiz'
                : '1-on-1 xavfsiz muloqot va cross-gender nazorati tizimi'}
            </p>
          </div>
        ) : (
          /* ACTIVE CHAT AREA */
          <>
            {/* Header */}
            <div className="px-4 py-3 bg-family-card/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (chatMode === 'group') setSelectedGroupId(null);
                    else setSelectedDmUser(null);
                  }}
                  className="p-1.5 md:hidden text-family-text-secondary hover:text-family-gold rounded-lg"
                >
                  <ArrowLeft size={20} />
                </button>

                {chatMode === 'group' ? (
                  <div className="w-10 h-10 rounded-xl bg-family-surface border border-family-gold/30 flex items-center justify-center text-family-gold font-bold font-serif shrink-0">
                    {currentGroup?.name ? currentGroup.name.charAt(0) : 'G'}
                  </div>
                ) : (
                  <img
                    src={selectedDmUser?.avatar || '/avatars/male1.png'}
                    alt={selectedDmUser?.first_name}
                    className="w-10 h-10 rounded-xl object-cover bg-family-surface border border-family-gold/30 shrink-0"
                  />
                )}

                <div>
                  <h3 className="text-sm font-bold text-family-text-primary flex items-center gap-1.5">
                    <span>
                      {chatMode === 'group'
                        ? currentGroup?.name || 'Yuklanmoqda...'
                        : `${selectedDmUser?.first_name} ${selectedDmUser?.last_name}`}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </h3>
                  <p className="text-[10px] text-family-text-muted">
                    {chatMode === 'group'
                      ? (currentGroup?.members ? `${currentGroup.members.length} nafar a‘zo` : '')
                      : `${selectedDmUser?.relationship || 'Foydalanuvchi'} • Shaxsiy chat`}
                  </p>
                </div>
              </div>

              {chatMode === 'group' && (
                <button
                  type="button"
                  onClick={() => setShowMembersDrawer(!showMembersDrawer)}
                  className="p-2 rounded-xl bg-family-night/60 hover:bg-family-night border border-white/5 text-family-text-secondary hover:text-family-gold transition"
                  title="Guruh a‘zolari"
                >
                  <Users size={18} />
                </button>
              )}
            </div>

            {/* DIRECT CHAT PERMISSION GATE BANNER (IF NOT ALLOWED) */}
            {chatMode === 'direct' && !isAllowedToChat && !dmPermissionLoading && (
              <div className="p-6 md:p-10 flex-1 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#0e1422] to-[#080C14]">
                {dmPermission?.status === 'pending' ? (
                  <div className="max-w-md w-full bg-family-card border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-gold-md animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Clock size={32} />
                    </div>
                    <h3 className="text-base font-bold text-family-text-primary mb-2">
                      Ruxsat So‘rovi Yuborilgan
                    </h3>
                    <p className="text-xs text-family-text-secondary leading-relaxed mb-6">
                      Sizning so‘rovingiz Super Adminga yetkazildi. Administrator tasdiqlashi bilan ushbu shaxsiy chat ochiladi va bemalol yozisha olasiz.
                    </p>
                    <button
                      type="button"
                      onClick={() => checkDmPermissionAndLoadMessages(selectedDmUser.id)}
                      className="py-2.5 px-5 bg-family-night border border-family-gold/30 hover:border-family-gold text-family-gold rounded-xl text-xs font-semibold flex items-center justify-center gap-2 mx-auto transition cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      <span>Holatni Tekshirish</span>
                    </button>
                  </div>
                ) : (dmPermission?.status === 'blocked' || dmPermission?.status === 'BLOCKED') ? (
                  <div className="max-w-md w-full bg-family-card border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-gold-md animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
                      <Lock size={32} />
                    </div>
                    <h3 className="text-base font-bold text-rose-400 mb-2">
                      Yozishma Bloklangan
                    </h3>
                    <p className="text-xs text-family-text-secondary leading-relaxed">
                      Super Administrator ushbu foydalanuvchi bilan yozishmani cheklagan.
                    </p>
                  </div>
                ) : dmPermission?.status === 'NO_COMMON_GROUP' ? (
                  <div className="max-w-md w-full bg-family-card border border-white/10 rounded-3xl p-6 sm:p-8 shadow-gold-md animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 text-family-text-muted flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} />
                    </div>
                    <h3 className="text-base font-bold text-family-text-primary mb-2">
                      Umumiy Guruh Mavjud Emas
                    </h3>
                    <p className="text-xs text-family-text-secondary leading-relaxed">
                      Siz faqat umumiy guruhda birga bo‘lgan ishtirokchilar bilan yozisha olasiz.
                    </p>
                  </div>
                ) : (
                  <div className="max-w-md w-full bg-family-card border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-gold-md animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
                      <Shield size={32} />
                    </div>
                    <h3 className="text-base font-bold text-family-text-primary mb-2">
                      Super Admindan Ruxsat Olish
                    </h3>
                    <p className="text-xs text-family-text-secondary leading-relaxed mb-6">
                      Platforma xavfsizligi va axloqiy me‘yorlariga asosan, ushbu foydalanuvchi bilan shaxsiy muloqot qilish uchun avval Super Admindan ruxsat olishingiz kerak.
                    </p>
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      disabled={requestingPermission}
                      className="w-full py-3.5 px-4 gold-btn rounded-xl text-xs font-bold text-black flex items-center justify-center gap-2 shadow-gold-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      {requestingPermission ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      <span>Super Admindan Ruxsat Olish</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Messages Scroll Area */}
            {isAllowedToChat && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {activeLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={28} className="animate-spin text-family-gold" />
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 text-family-text-muted">
                    <div className="w-12 h-12 rounded-2xl bg-family-surface flex items-center justify-center text-family-gold/60 mb-2">
                      <Sparkles size={24} />
                    </div>
                    <p className="text-sm font-semibold text-family-text-secondary">
                      Xabarlar tarixi hozircha bo‘sh
                    </p>
                    <p className="text-xs text-family-text-muted mt-0.5">
                      {chatMode === 'group'
                        ? 'Birinchi bo‘lib oilaviy salom yo‘llang!'
                        : 'Muloqotni boshlash uchun salom yozing!'}
                    </p>
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isOwn = msg.sender_id === user.id;
                    const isAnnouncement = msg.message_type === 'announcement';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group relative`}
                      >
                        {/* Sender Info (for group chats and other users) */}
                        {chatMode === 'group' && !isOwn && (
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <img
                              src={msg.avatar || '/avatars/male1.png'}
                              alt={msg.first_name}
                              className="w-5 h-5 rounded-md object-cover bg-family-surface"
                            />
                            <span className="text-[11px] font-bold text-family-gold">
                              {msg.first_name}
                            </span>
                            <span className="text-[10px] text-family-text-muted">
                              ({msg.relationship})
                            </span>
                          </div>
                        )}

                        {/* Quoted Reply Preview */}
                        {msg.reply_preview && (
                          <div
                            className={`text-[11px] p-2 rounded-xl mb-1 max-w-[85%] sm:max-w-md border-l-2 ${
                              isOwn
                                ? 'bg-family-night/80 border-family-gold text-family-text-secondary'
                                : 'bg-family-surface/80 border-family-gold/60 text-family-text-secondary'
                            }`}
                          >
                            <div className="font-semibold text-family-gold text-[10px]">
                              {msg.reply_preview.first_name} ({msg.reply_preview.relationship})
                            </div>
                            <div className="truncate opacity-80">
                              {msg.reply_preview.content || 'Biriktirilgan fayl'}
                            </div>
                          </div>
                        )}

                        {/* Main Message Bubble */}
                        <div
                          className={`relative rounded-2xl px-4 py-2.5 max-w-[85%] sm:max-w-md text-sm shadow-md transition ${
                            isAnnouncement
                              ? 'bg-gradient-to-r from-family-card via-[#20293F] to-family-card border-2 border-family-gold text-family-text-primary shadow-gold-sm w-full sm:max-w-xl'
                              : isOwn
                              ? 'bg-gradient-to-br from-[#1C263B] to-[#121929] border border-family-gold/30 text-family-text-primary rounded-br-none'
                              : 'bg-family-card border border-white/5 text-family-text-primary rounded-bl-none'
                          }`}
                        >
                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="space-y-2 mb-2">
                              {msg.attachments.map((att) => {
                                if (att.mime_type?.startsWith('image/')) {
                                  return (
                                    <div
                                      key={att.id}
                                      onClick={() => setViewingMedia(att)}
                                      className="cursor-pointer overflow-hidden rounded-xl border border-white/10 hover:border-family-gold/40 transition"
                                    >
                                      <img
                                        src={att.file_url}
                                        alt={att.file_name}
                                        className="max-h-60 w-full object-cover"
                                      />
                                    </div>
                                  );
                                }
                                if (att.mime_type?.startsWith('video/')) {
                                  return (
                                    <div key={att.id} className="rounded-xl overflow-hidden">
                                      <video
                                        src={att.file_url}
                                        controls
                                        className="max-h-60 w-full rounded-xl"
                                      />
                                    </div>
                                  );
                                }
                                if (att.mime_type?.startsWith('audio/') || msg.message_type === 'voice') {
                                  return (
                                    <AudioPlayer
                                      key={att.id}
                                      src={att.file_url}
                                      duration={att.duration}
                                    />
                                  );
                                }
                                return (
                                  <a
                                    key={att.id}
                                    href={att.file_url}
                                    download={att.file_name}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-family-night border border-white/10 hover:border-family-gold/40 transition"
                                  >
                                    <FileText size={20} className="text-family-gold shrink-0" />
                                    <div className="flex-1 truncate text-xs">
                                      <div className="font-semibold truncate">{att.file_name}</div>
                                      <div className="text-[10px] text-family-text-muted">
                                        {Math.round(att.file_size / 1024)} KB
                                      </div>
                                    </div>
                                    <Download size={16} className="text-family-text-muted" />
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {/* Text content */}
                          {msg.content && (
                            <div className="whitespace-pre-wrap break-words leading-relaxed">
                              {msg.content}
                            </div>
                          )}

                          {/* Timestamp & checkmarks */}
                          <div className="flex items-center justify-end gap-2 text-[10px] text-family-text-muted mt-1.5 font-mono">
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOwn && (
                              <CheckCheck
                                size={13}
                                className={msg.read === 1 ? 'text-sky-400' : 'text-family-gold'}
                              />
                            )}
                          </div>
                        </div>

                        {/* Reactions List */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 px-1">
                            {msg.reactions.map((r) => (
                              <button
                                key={r.emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition ${
                                  r.hasReacted
                                    ? 'bg-family-gold/20 border-family-gold/60 text-family-gold'
                                    : 'bg-family-card border-white/10 text-family-text-secondary hover:border-white/20'
                                }`}
                              >
                                <span>{r.emoji}</span>
                                <span className="text-[10px] font-bold">{r.count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Action buttons (React, Reply, Delete) */}
                        <div
                          className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 px-1 ${
                            isOwn ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveReactionMessageId(
                                  activeReactionMessageId === msg.id ? null : msg.id
                                )
                              }
                              className="p-1 rounded-lg hover:bg-family-card text-family-text-muted hover:text-family-gold transition text-xs"
                              title="Reaksiya"
                            >
                              <Smile size={14} />
                            </button>

                            {activeReactionMessageId === msg.id && (
                              <div className="absolute bottom-full mb-1 left-0 flex items-center gap-1 p-1.5 bg-family-card border border-family-gold/30 rounded-2xl shadow-gold-md z-30 animate-scale-in">
                                {QUICK_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                    className="w-7 h-7 flex items-center justify-center hover:scale-125 transition text-base"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setReplyingTo(msg)}
                            className="p-1 rounded-lg hover:bg-family-card text-family-text-muted hover:text-family-gold transition"
                            title="Javob qaytarish"
                          >
                            <Reply size={14} />
                          </button>

                          {(isOwn || user.is_admin === 1) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 rounded-lg hover:bg-family-card text-family-text-muted hover:text-rose-400 transition"
                              title="O‘chirish"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Typing Indicator */}
            {chatMode === 'group' && groupTypingUsers.length > 0 && (
              <div className="px-6 py-1.5 text-xs text-family-gold animate-pulse flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-family-gold" />
                <span>{groupTypingUsers.map((u) => u.userName).join(', ')} yozyapti...</span>
              </div>
            )}
            {chatMode === 'direct' && dmTyping && (
              <div className="px-6 py-1.5 text-xs text-family-gold animate-pulse flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-family-gold" />
                <span>{selectedDmUser?.first_name} yozyapti...</span>
              </div>
            )}

            {/* Reply Preview Bar */}
            {replyingTo && (
              <div className="px-4 py-2 bg-family-night border-t border-family-gold/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Reply size={14} className="text-family-gold shrink-0" />
                  <span className="text-family-gold font-semibold">
                    {replyingTo.first_name}ga javob:
                  </span>
                  <span className="text-family-text-secondary truncate">
                    {replyingTo.content || 'Biriktirilgan fayl'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-family-text-muted hover:text-family-text-primary p-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Chat Input Bar (Only active when allowed) */}
            {isAllowedToChat && (
              <div className="p-3 sm:p-4 bg-family-card/90 backdrop-blur-md border-t border-white/5 shrink-0">
                {showRecorder ? (
                  <AudioRecorder
                    onSend={handleSendVoice}
                    onCancel={() => setShowRecorder(false)}
                  />
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-2xl bg-family-night hover:bg-family-surface text-family-text-muted hover:text-family-gold border border-white/5 transition shrink-0"
                      title="Fayl yoki rasm biriktirish"
                    >
                      <Paperclip size={18} />
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2.5 rounded-2xl bg-family-night hover:bg-family-surface text-family-text-muted hover:text-family-gold border border-white/5 transition shrink-0"
                        title="Emoji"
                      >
                        <Smile size={18} />
                      </button>

                      {showEmojiPicker && (
                        <div className="absolute bottom-full mb-2 left-0 p-2 bg-family-card border border-family-gold/30 rounded-2xl shadow-gold-lg flex items-center gap-1.5 z-30 animate-scale-in">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setText((prev) => prev + emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="w-8 h-8 flex items-center justify-center hover:scale-125 transition text-lg"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      value={text}
                      onChange={handleTypingChange}
                      placeholder={
                        chatMode === 'group'
                          ? 'Guruhga xabar yozing...'
                          : `${selectedDmUser?.first_name}ga xabar yozing...`
                      }
                      className="flex-1 bg-family-night border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-family-text-primary placeholder:text-family-text-muted focus:outline-none focus:border-family-gold/60 transition"
                    />

                    <button
                      type="button"
                      onClick={() => setShowRecorder(true)}
                      className="p-2.5 rounded-2xl bg-family-night hover:bg-family-surface text-family-text-muted hover:text-family-gold border border-white/5 transition shrink-0"
                      title="Ovozli xabar"
                    >
                      <Mic size={18} />
                    </button>

                    <button
                      type="submit"
                      disabled={sending || !text.trim()}
                      className="p-2.5 rounded-2xl gold-btn text-black font-bold shadow-gold-sm transition disabled:opacity-40 shrink-0"
                      title="Yuborish"
                    >
                      {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Drawer: Group Members */}
      {showMembersDrawer && currentGroup && chatMode === 'group' && (
        <div className="fixed inset-y-0 right-0 z-40 w-72 bg-family-card border-l border-family-gold/30 p-5 shadow-2xl animate-fade-in flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-family-text-primary">Guruh A‘zolari</h3>
            <button
              type="button"
              onClick={() => setShowMembersDrawer(false)}
              className="p-1.5 text-family-text-muted hover:text-family-text-primary"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3 divide-y divide-white/5">
            {currentGroup.members?.map((m) => (
              <div key={m.id} className="pt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={m.avatar || '/avatars/male1.png'}
                    alt={m.first_name}
                    className="w-9 h-9 rounded-xl object-cover bg-family-surface border border-white/10"
                  />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-family-text-primary truncate">
                      {m.first_name} {m.last_name}
                    </div>
                    <div className="text-[10px] text-family-gold">
                      {m.relationship}
                    </div>
                  </div>
                </div>

                {m.id !== user.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMembersDrawer(false);
                      selectDmUser(m);
                    }}
                    className="p-2 rounded-xl bg-family-night border border-family-gold/20 text-family-gold hover:bg-family-gold hover:text-black transition"
                    title="Shaxsiy yozish"
                  >
                    <MessageSquare size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Fullscreen Lightbox */}
      {viewingMedia && (
        <MediaViewer
          item={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}
    </div>
  );
}
