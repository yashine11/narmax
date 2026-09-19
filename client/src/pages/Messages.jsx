import { useEffect, useRef, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import AdminAvatar from '../components/AdminAvatar.jsx';
import toast from 'react-hot-toast';

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z');
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatChatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' +
         d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatConvDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z');
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Messages() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState('messages'); // 'messages' | 'admin'
  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);

  // User search to start a new chat
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef(null);
  const searchTimerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch conversations
  const loadConversations = useCallback(async (currentTab = tab, keepSelection = true) => {
    if (!user) return;
    try {
      const type = currentTab === 'admin' ? 'admin' : 'user';
      const { data } = await api.get(`/api/messages/conversations?type=${type}`);
      const list = data.conversations || [];
      setConversations(list);

      if (currentTab === 'admin') {
        if (list.length > 0) {
          setSelectedPartner(list[0]);
        } else {
          // Default placeholder admin thread
          setSelectedPartner({
            id: 'admin',
            partner_id: 'admin',
            username: 'ADMINS',
            handle: '@admins',
            is_admin: true,
          });
        }
      } else if (!keepSelection || !selectedPartner || selectedPartner.is_admin) {
        if (list.length > 0) {
          setSelectedPartner(list[0]);
        } else {
          setSelectedPartner(null);
        }
      }
    } catch (e) {
      console.error('Error loading conversations:', e);
    } finally {
      setLoadingConvs(false);
    }
  }, [user, tab, selectedPartner]);

  // Load messages for the selected partner
  const loadMessages = useCallback(async (partnerId) => {
    if (!partnerId) return;
    setLoadingMsgs(true);
    try {
      const { data } = await api.get(`/api/messages/${partnerId}`);
      setMessages(data.messages || []);
      if (data.partner && partnerId !== 'admin') {
        setSelectedPartner(prev => ({ ...prev, ...data.partner }));
      }
    } catch (e) {
      console.error('Error loading messages:', e);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // On initial mount or tab switch
  useEffect(() => {
    setLoadingConvs(true);
    loadConversations(tab, false);
  }, [tab]);

  // When selected partner changes, load their messages
  useEffect(() => {
    if (selectedPartner) {
      loadMessages(selectedPartner.partner_id || selectedPartner.id);
    } else {
      setMessages([]);
    }
  }, [selectedPartner?.id, selectedPartner?.partner_id]);

  // Scroll down on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Periodic polling every 5s for real-time messages
  useEffect(() => {
    if (!user || !selectedPartner) return;
    const interval = setInterval(() => {
      const pId = selectedPartner.partner_id || selectedPartner.id;
      if (pId) {
        api.get(`/api/messages/${pId}`).then(({ data }) => {
          if (data.messages && data.messages.length !== messages.length) {
            setMessages(data.messages);
          }
        }).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, selectedPartner, messages.length]);

  // User search handling
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/messages/search-users?q=${encodeURIComponent(val.trim())}`);
        setSearchResults(data.users || []);
      } catch (err) {
        console.error('Search users error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const startChatWithUser = (targetUser) => {
    const newPartner = {
      id: String(targetUser.id),
      partner_id: targetUser.id,
      username: targetUser.username,
      handle: `@${targetUser.username}`,
      avatar: targetUser.avatar,
      role: targetUser.role,
    };
    // Add to conversations if not present
    if (!conversations.some(c => String(c.partner_id) === String(targetUser.id))) {
      setConversations([newPartner, ...conversations]);
    }
    setSelectedPartner(newPartner);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending || !selectedPartner) return;
    if (selectedPartner.is_admin || tab === 'admin') {
      toast.error("You can't reply to admin messages.");
      return;
    }

    const text = inputText.trim();
    setSending(true);
    try {
      const { data } = await api.post('/api/messages', {
        receiver_id: selectedPartner.partner_id || selectedPartner.id,
        content: text,
      });

      setInputText('');
      setMessages((prev) => [...prev, data.message]);

      // Update conversation last message in list
      setConversations((prev) => {
        const pId = selectedPartner.partner_id || selectedPartner.id;
        const exists = prev.find((c) => String(c.partner_id) === String(pId));
        if (exists) {
          return prev.map((c) =>
            String(c.partner_id) === String(pId)
              ? { ...c, last_message: text, created_at: new Date().toISOString() }
              : c
          );
        }
        return [
          {
            ...selectedPartner,
            last_message: text,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-narmax-red border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdminTab = tab === 'admin';

  return (
    <div className="min-h-screen bg-black pt-16 text-zinc-100 flex flex-col">
      <div className="flex-1 flex max-w-[1920px] w-full mx-auto border-t border-zinc-900 overflow-hidden h-[calc(100vh-64px)]">

        {/* ── LEFT SIDEBAR ── */}
        <aside
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-zinc-900 bg-black flex flex-col ${
            selectedPartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Tabs */}
          <div className="p-4 border-b border-zinc-900">
            <div className="flex items-center gap-4 mb-4">
              {user.role === 'admin' ? (
                <AdminAvatar className="h-10 w-10" />
              ) : (
                <img
                  src={user.avatar || '/uploads/default-avatar.svg'}
                  alt={user.username}
                  className="h-10 w-10 rounded-full object-cover border border-zinc-800"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.username}</p>
                <p className="text-xs text-zinc-500 truncate">@{user.username}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-zinc-900 pb-1">
              <button
                type="button"
                onClick={() => setTab('messages')}
                className={`pb-2 text-sm font-bold transition relative ${
                  tab === 'messages'
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Messages
                {tab === 'messages' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-narmax-red rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setTab('admin')}
                className={`pb-2 text-sm font-bold transition relative ${
                  tab === 'admin'
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                ADMINs Messages
                {tab === 'admin' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-narmax-red rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* User Search (User ↔ User only) */}
          {!isAdminTab && (
            <div className="p-3 border-b border-zinc-900 relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search user to chat..."
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-zinc-500 outline-none focus:border-zinc-700"
                />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                {searching && (
                  <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                )}
              </div>

              {/* Search dropdown results */}
              {searchResults.length > 0 && (
                <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-2xl">
                  {searchResults.map((su) => (
                    <button
                      key={su.id}
                      type="button"
                      onClick={() => startChatWithUser(su)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-900 transition"
                    >
                      <img
                        src={su.avatar || '/uploads/default-avatar.svg'}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{su.username}</p>
                        <p className="text-[10px] text-zinc-500 truncate">@{su.username}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-narmax-cyan">Chat</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/40 p-2 space-y-1">
            {loadingConvs ? (
              <div className="py-12 text-center text-xs text-zinc-600">Loading conversations...</div>
            ) : conversations.length > 0 ? (
              conversations.map((c) => {
                const isSelected =
                  selectedPartner &&
                  (String(selectedPartner.partner_id || selectedPartner.id) ===
                    String(c.partner_id || c.id));
                return (
                  <button
                    key={c.id || c.partner_id}
                    type="button"
                    onClick={() => setSelectedPartner(c)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${
                      isSelected ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-900/50 text-zinc-400'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {c.is_admin ? (
                        <AdminAvatar className="h-11 w-11" />
                      ) : (
                        <img
                          src={c.avatar || '/uploads/default-avatar.svg'}
                          alt={c.username}
                          className="h-11 w-11 rounded-full object-cover border border-zinc-800"
                        />
                      )}
                      {/* Active / Unread dot */}
                      {c.unread_count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-black" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-white truncate">{c.username}</p>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {formatConvDate(c.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {c.last_message || (c.is_admin ? 'Official Admin Messages' : 'No messages yet')}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-16 text-center text-xs text-zinc-600">
                {isAdminTab
                  ? 'No administrator messages yet'
                  : 'No conversations yet. Search a user above to start chatting!'}
              </div>
            )}
          </div>
        </aside>

        {/* ── RIGHT CHAT AREA ── */}
        <main
          className={`flex-1 flex flex-col bg-black overflow-hidden ${
            !selectedPartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedPartner ? (
            <>
              {/* Partner Top Header */}
              <div className="h-16 border-b border-zinc-900 px-6 flex items-center justify-between bg-black/80 backdrop-blur shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back button on mobile */}
                  <button
                    type="button"
                    onClick={() => setSelectedPartner(null)}
                    className="md:hidden p-1 -ml-2 text-zinc-400 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {selectedPartner.is_admin ? (
                    <AdminAvatar className="h-10 w-10 shrink-0" />
                  ) : (
                    <img
                      src={selectedPartner.avatar || '/uploads/default-avatar.svg'}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover border border-zinc-800 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                      {selectedPartner.username}
                      {selectedPartner.is_admin && (
                        <span className="text-[10px] uppercase font-bold text-[#00b3ff] bg-[#00b3ff]/10 px-1.5 py-0.5 rounded">
                          Official
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{selectedPartner.handle || `@${selectedPartner.username}`}</p>
                  </div>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {loadingMsgs ? (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                    Loading messages...
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((m, idx) => {
                    const isMe = m.sender_id === user.id && !m.is_admin_message;
                    const showDateHeader =
                      idx === 0 ||
                      new Date(m.created_at).toDateString() !==
                        new Date(messages[idx - 1]?.created_at).toDateString();

                    return (
                      <div key={m.id || idx} className="space-y-3">
                        {showDateHeader && (
                          <div className="flex justify-center my-4">
                            <span className="text-[11px] text-zinc-500 font-medium">
                              {formatChatDate(m.created_at)}
                            </span>
                          </div>
                        )}

                        <div className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {/* Partner Avatar on left */}
                          {!isMe && (
                            <div className="shrink-0 mb-1">
                              {m.is_admin_message ? (
                                <AdminAvatar className="h-7 w-7" />
                              ) : (
                                <img
                                  src={m.sender_avatar || '/uploads/default-avatar.svg'}
                                  alt=""
                                  className="h-7 w-7 rounded-full object-cover border border-zinc-800"
                                />
                              )}
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div
                            className={`max-w-[80%] sm:max-w-md md:max-w-lg rounded-2xl px-4 py-2.5 ${
                              isMe
                                ? 'bg-zinc-800 text-zinc-100 rounded-br-sm'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {m.content}
                            </p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isMe ? 'text-zinc-400 text-right' : 'text-zinc-500'
                              }`}
                            >
                              {formatMessageTime(m.created_at)}
                            </p>
                          </div>

                          {/* My Avatar on right */}
                          {isMe && (
                            <div className="shrink-0 mb-1">
                              {user.role === 'admin' ? (
                                <AdminAvatar className="h-7 w-7" />
                              ) : (
                                <img
                                  src={user.avatar || '/uploads/default-avatar.svg'}
                                  alt=""
                                  className="h-7 w-7 rounded-full object-cover border border-zinc-800"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
                    <p className="text-sm">No messages in this conversation yet</p>
                    <p className="text-xs text-zinc-600 mt-1">
                      {isAdminTab ? 'Official announcements will appear here.' : 'Say hello!'}
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── BOTTOM ACTIONS ── */}
              {isAdminTab ? (
                /* Admin Messages: READ-ONLY BANNER */
                <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900/90 px-5 py-2.5 rounded-full border border-zinc-800">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-3.5 h-3.5 text-zinc-500"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>You can't reply to admin messages.</span>
                  </div>
                </div>
              ) : (
                /* User ↔ User: Text input & Send button */
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 bg-black border-t border-zinc-900 flex items-center gap-2"
                >
                  <div className="flex-1 flex items-center bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-2.5 focus-within:border-zinc-700 transition">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Send a message..."
                      className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-white transition shrink-0"
                    title="Send"
                  >
                    {sending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <div className="h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-zinc-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-base font-bold text-zinc-300">Your Conversations</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Select a conversation from the sidebar or search for a user to start sending messages.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
