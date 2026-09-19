import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import AdminAvatar from './AdminAvatar.jsx';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/movies', label: 'Movies' },
  { to: '/tv', label: 'Shows' },
  { to: '/anime', label: 'Anime' },
  { to: '/my-list', label: 'My List' },
];

const MORE_LINKS = [
  { to: '/popular', label: 'Popular' },
  { to: '/news', label: 'News' },
  { to: '/kids', label: 'Kids' },
];

function mediaBadgeLabel(type) {
  if (type === 'tv') return 'TV';
  if (type === 'person') return 'Cast';
  return 'Movie';
}

function ChevronDownIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

function HamburgerIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z');
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now - d) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState('');
  const [suggest, setSuggest] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState('all');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const closeSearch = () => {
    setSearchOpen(false);
    setQ('');
    setSuggest([]);
    setActiveSuggestion(-1);
    searchInputRef.current?.blur();
  };

  const toggleSearch = () => {
    if (!searchOpen) {
      setSearchOpen(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 250);
    } else {
      closeSearch();
    }
  };

  useEffect(() => {
    if (!user) return;
    api.get('/api/notifications').then((r) => setNotifications(r.data.notifications || [])).catch(() => {});
    api.get('/api/messages/unread-count').then((r) => setUnreadMessagesCount(r.data.unreadCount || 0)).catch(() => {});
  }, [user, location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [navigate]);

  // ESC closes search and notifications
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (notifOpen) setNotifOpen(false);
        if (searchOpen) closeSearch();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, notifOpen]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        if (searchOpen) {
          closeSearch();
        } else {
          setSuggest([]);
          setActiveSuggestion(-1);
        }
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    window.addEventListener('pointerdown', onClickOutside);
    return () => window.removeEventListener('pointerdown', onClickOutside);
  }, [searchOpen]);

  const SECRET_ADMIN_TRIGGER = '@admin#riablo@Sphinx/portal';

  useEffect(() => {
    if (q.trim() === SECRET_ADMIN_TRIGGER) {
      setQ('');
      setSuggest([]);
      setActiveSuggestion(-1);
      setMobileSearchOpen(false);
      setMobileMenuOpen(false);
      navigate('/login?portal=riablo-sphinx');
      return;
    }
    if (q.trim().length < 2) {
      setSuggest([]);
      setActiveSuggestion(-1);
      return;
    }
    const timer = setTimeout(() => {
      api
        .get('/api/search/suggest', { params: { q } })
        .then((response) => {
          setSuggest(response.data.results || []);
          setActiveSuggestion(-1);
        })
        .catch(() => {
          setSuggest([]);
          setActiveSuggestion(-1);
        });
    }, 160);
    return () => clearTimeout(timer);
  }, [q, navigate]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const linkClass = ({ isActive }) =>
    `text-sm font-semibold transition ${
      isActive ? 'text-white' : 'text-zinc-300'
    } hover:text-white hover:drop-shadow-[0_0_10px_rgba(86,207,225,0.4)]`;

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition ${
      isActive ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/5 hover:text-white'
    }`;

  const profileCards = useMemo(
    () => [
      {
        label: user?.username || 'Profile',
        avatar: user?.avatar || '/uploads/default-avatar.svg',
        path: '/profile',
      },
      {
        label: 'Kids',
        avatar: '/uploads/default-avatar.svg',
        path: '/kids',
      },
    ],
    [user?.avatar, user?.username]
  );

  const goToSearch = (queryOverride) => {
    const query = (queryOverride || q).trim();
    if (!query) return;
    if (query === SECRET_ADMIN_TRIGGER) {
      closeSearch();
      setMobileSearchOpen(false);
      setMobileMenuOpen(false);
      navigate('/login?portal=riablo-sphinx');
      return;
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
    closeSearch();
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const selectSuggestion = (item) => {
    if (!item) return;
    if (item.media_type === 'person') {
      navigate(`/person/${item.id}`);
    } else {
      navigate(item.media_type === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`);
    }
    closeSearch();
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-white/10 bg-black/92 shadow-[0_14px_44px_rgba(0,0,0,0.75)] backdrop-blur-xl'
            : 'bg-gradient-to-b from-black/90 via-black/55 to-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1920px] items-center gap-3 px-4 sm:h-20 sm:gap-6 sm:px-8">
          {/* Logo */}
          {/* Left: Back button (if on subpage) + Brand Logo */}
          <div className="flex items-center gap-2">
            {location.pathname !== '/' && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                title="Go back"
                aria-label="Go back"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            <Link
              to="/"
              className="shrink-0 text-xl font-black tracking-wider text-white transition hover:opacity-90 sm:text-2xl"
              onClick={() => setMobileMenuOpen(false)}
            >
              NAR<span className="text-[#e50914]">MAX</span>
            </Link>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Cinejoy Floating Capsule Bar (Desktop) */}
          <div className="hidden items-center gap-3 md:flex">
            {/* Cinejoy Floating Capsule */}
            <div className="cine-capsule-bar">
              {NAV_LINKS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `cine-capsule-item ${isActive ? 'cine-capsule-item-active' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {/* Notification Bell (Desktop, logged-in) */}
              {user && (
                <button
                  type="button"
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:text-white"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-narmax-red" />
                  )}
                </button>
              )}

              {/* Messages (Desktop, logged-in) */}
              {user && (
                <NavLink
                  to="/messages"
                  className={({ isActive }) =>
                    `relative flex h-8 w-8 items-center justify-center rounded-full transition ${
                      isActive ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white'
                    }`
                  }
                  title="Messages"
                  aria-label="Messages"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {unreadMessagesCount > 0 && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </NavLink>
              )}

              {/* Clean Expanding Search */}
              <div
                ref={searchRef}
                className={`search ${searchOpen ? 'active' : ''}`}
                id="search"
              >
                <input
                  ref={searchInputRef}
                  id="searchInput"
                  type="search"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      closeSearch();
                    }
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      if (activeSuggestion >= 0 && suggest[activeSuggestion]) {
                        selectSuggestion(suggest[activeSuggestion]);
                      } else {
                        goToSearch();
                      }
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setActiveSuggestion((current) => Math.min((suggest.length || 1) - 1, current + 1));
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setActiveSuggestion((current) => Math.max(-1, current - 1));
                    }
                  }}
                  placeholder="Search..."
                  autoComplete="off"
                />

                <button
                  className="search-button"
                  id="searchButton"
                  type="button"
                  aria-label={searchOpen ? 'Close search' : 'Open search'}
                  onClick={toggleSearch}
                >
                  {/* Magnifying glass */}
                  <span className="search-icon"></span>

                  {/* Clean X */}
                  <span className="close-icon"></span>
                </button>

                {/* Suggestions dropdown */}
                {searchOpen && suggest.length > 0 && (
                  <ul className="absolute right-0 top-full z-[200] mt-2.5 w-72 lg:w-80 max-h-72 overflow-auto rounded-2xl border border-white/15 bg-zinc-950/98 p-2 shadow-2xl backdrop-blur-xl">
                    {suggest.map((item, index) => (
                      <li key={`${item.media_type || 'movie'}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => selectSuggestion(item)}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
                            index === activeSuggestion ? 'bg-white/15' : 'hover:bg-white/10'
                          }`}
                        >
                          {item.poster_path ? (
                            <img src={item.poster_path} alt="" className="h-10 w-7 rounded object-cover" loading="lazy" />
                          ) : (
                            <div className="h-10 w-7 rounded bg-zinc-800" />
                          )}
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="truncate font-medium text-zinc-100">{item.title}</span>
                            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                              {mediaBadgeLabel(item.media_type)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Profile Avatar / Sign In (outside capsule) */}
            {user ? (
              <Link
                to="/profile"
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] p-1 pr-3 transition hover:border-narmax-cyan hover:bg-white/[0.12]"
                title="Profile & Settings"
              >
                {user.role === 'admin' ? (
                  <AdminAvatar className="h-7 w-7" />
                ) : (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="h-7 w-7 rounded-full border border-white/15 object-cover"
                    loading="lazy"
                  />
                )}
                <span className="text-xs font-semibold text-zinc-300 group-hover:text-white">
                  {user.username}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-narmax-red px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Right Controls: Mobile & Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </button>

            {/* Notifications */}
            {user && (
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-zinc-300">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-narmax-red ring-2 ring-black" />
                )}
              </button>
            )}

            {/* Messages — Mobile */}
            {user && (
              <NavLink
                to="/messages"
                className={({ isActive }) =>
                  `relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 transition ${
                    isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`
                }
                title="Messages"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {unreadMessagesCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
                )}
              </NavLink>
            )}

            {/* Profile / Settings — Mobile */}
            {user ? (
              <Link
                to="/profile"
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 transition hover:border-narmax-cyan hover:bg-white/10"
                title="Profile & Settings"
              >
                {user.role === 'admin' ? (
                  <AdminAvatar className="h-7 w-7" />
                ) : (
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" loading="lazy" />
                )}
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-narmax-red px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 sm:px-4 sm:text-sm"
              >
                Sign In
              </Link>
            )}

            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 lg:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <HamburgerIcon open={mobileMenuOpen} />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="border-t border-white/10 bg-black/95 px-4 py-3 sm:hidden">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); goToSearch(); }
              }}
              placeholder="Search titles, cast, genres..."
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-400 focus:border-narmax-cyan"
            />
            {suggest.length > 0 && (
              <ul className="mt-2 max-h-60 overflow-auto rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-xl">
                {suggest.map((item) => (
                  <li key={`${item.media_type || 'movie'}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => selectSuggestion(item)}
                      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-sm hover:bg-white/6"
                    >
                      {item.poster_path && (
                        <img src={item.poster_path} alt="" className="h-10 w-7 rounded object-cover" />
                      )}
                      <span className="truncate font-medium text-zinc-100">{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-zinc-950 shadow-[4px_0_30px_rgba(0,0,0,0.8)]">
            {/* Drawer header */}
            <div className="flex h-16 items-center justify-between px-5">
              <span className="text-xl font-black tracking-tight text-white">
                NAR<span className="text-narmax-red">MAX</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="h-px bg-white/10" />

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {NAV_LINKS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={mobileLinkClass}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              {MORE_LINKS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={mobileLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              {user && (
                <NavLink to="/messages" className={mobileLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  Messages
                  {unreadMessagesCount > 0 && (
                    <span className="ml-auto rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-black">
                      {unreadMessagesCount}
                    </span>
                  )}
                </NavLink>
              )}
              {user?.role === 'admin' && (
                <NavLink to="/admin" className={mobileLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  Admin
                </NavLink>
              )}
            </nav>

            <div className="h-px bg-white/10" />

            {/* Footer */}
            <div className="p-4">
              {user ? (
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full rounded-xl border border-white/15 py-3 text-center text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                >
                  Settings &amp; Account
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full rounded-xl bg-narmax-red py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Modal ── */}
      {notifOpen && user && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-[2px]"
            onClick={() => setNotifOpen(false)}
          />
          {/* Modal panel */}
          <div
            className="fixed left-1/2 top-1/2 z-[310] w-[94vw] max-w-xl sm:max-w-2xl min-h-[560px] max-h-[86vh] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[#8898EB] bg-[#E5E8FA] p-6 sm:p-8 md:p-10 flex flex-col justify-between shadow-2xl"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between">
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight">
                  Your Notifications
                </h2>
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="text-zinc-500 hover:text-zinc-900 transition p-1"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-6 mt-6 border-b border-transparent">
                <button
                  type="button"
                  onClick={() => setNotifTab('all')}
                  className={`relative pb-2 flex items-center gap-2 text-sm sm:text-base font-bold transition ${
                    notifTab === 'all'
                      ? 'text-zinc-950 border-b-2 border-blue-600'
                      : 'text-zinc-500 hover:text-zinc-900 border-b-2 border-transparent'
                  }`}
                >
                  <span>All</span>
                  <span className="rounded-full bg-[#CED4F7] px-2.5 py-0.5 text-xs font-bold text-zinc-800">
                    {notifications.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotifTab('admin')}
                  className={`relative pb-2 flex items-center gap-2 text-sm sm:text-base font-bold transition ${
                    notifTab === 'admin'
                      ? 'text-zinc-950 border-b-2 border-blue-600'
                      : 'text-zinc-500 hover:text-zinc-900 border-b-2 border-transparent'
                  }`}
                >
                  <span>ADMIN</span>
                  <span className="rounded-full bg-[#CED4F7] px-2.5 py-0.5 text-xs font-bold text-zinc-800">
                    {notifications.filter((n) => n.type === 'admin').length}
                  </span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto my-3 pr-1" style={{ maxHeight: 'calc(86vh - 240px)' }}>
              {(notifTab === 'admin' ? notifications.filter((n) => n.type === 'admin') : notifications).length > 0 ? (
                <ul className="divide-y divide-zinc-800">
                  {(notifTab === 'admin' ? notifications.filter((n) => n.type === 'admin') : notifications).map((n) => {
                    const isAdmin = n.type === 'admin';
                    return (
                      <li key={n.id} className="py-3.5 sm:py-4">
                        <Link
                          to={n.link || '#'}
                          onClick={() => {
                            if (!n.is_read) {
                              api.patch(`/api/notifications/${n.id}`);
                              setNotifications(notifications.map((x) =>
                                x.id === n.id ? { ...x, is_read: 1 } : x
                              ));
                            }
                            setNotifOpen(false);
                          }}
                          className="flex items-center justify-between gap-4 group"
                        >
                          {/* Left Avatar & Content */}
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full overflow-hidden bg-zinc-300 border border-black/10 flex items-center justify-center">
                              {isAdmin ? (
                                <AdminAvatar className="h-9 w-9 sm:h-10 sm:w-10" />
                              ) : n.avatar ? (
                                <img src={n.avatar} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-zinc-300 font-bold text-zinc-700 text-lg">
                                  {n.title?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm sm:text-base font-bold text-zinc-950 truncate">
                                {n.title}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {formatTimeAgo(n.created_at)}
                              </p>
                            </div>
                          </div>

                          {/* Right unread indicator */}
                          {!n.is_read && (
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0 mr-1" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-sm font-medium text-zinc-500">No notifications</p>
                </div>
              )}
            </div>

            {/* Bottom Actions & Expiration Notice */}
            <div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  title="Delete all notifications"
                  onClick={async () => {
                    await api.delete('/api/notifications/all');
                    setNotifications([]);
                  }}
                  className="text-zinc-600 hover:text-zinc-950 transition p-1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await api.patch('/api/notifications/all');
                    setNotifications(notifications.map((n) => ({ ...n, is_read: 1 })));
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition"
                >
                  Mark all as read
                </button>
              </div>

              {/* 48H Auto deletion notice */}
              <div className="mt-4 text-center">
                <span className="text-xs font-semibold text-red-600 underline">
                  All notifications get delet after 48H
                </span>
              </div>
            </div>
          </div>
        </>
      )}

    </>
  );
}
