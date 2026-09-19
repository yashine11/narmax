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
    api.get('/api/notifications').then((r) => setNotifications(r.data.notifications || []));
  }, [user]);

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
            className="fixed inset-0 z-[300] bg-black/50"
            onClick={() => setNotifOpen(false)}
          />
          {/* Modal panel */}
          <div
            className="fixed left-1/2 top-1/2 z-[310] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
            style={{ maxHeight: '80vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-zinc-400">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <h2 className="text-sm font-bold text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-narmax-red px-2 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      api.patch('/api/notifications/all').then(() => {
                        setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
                      });
                    }}
                    className="text-[11px] font-semibold text-zinc-400 hover:text-white"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 65px)' }}>
              {notifications.length > 0 ? (
                <ul className="divide-y divide-zinc-800/60 px-2 py-2">
                  {notifications.map((n) => {
                    const isReply = n.type === 'reply';
                    const isAdmin = n.type === 'admin';
                    return (
                      <li key={n.id} className={`group relative rounded-xl ${!n.is_read ? 'bg-zinc-900' : ''}`}>
                        <Link
                          to={n.link || '#'}
                          onClick={() => {
                            if (!n.is_read) {
                              api.patch(`/api/notifications/${n.id}`);
                              setNotifications(notifications.map(x =>
                                x.id === n.id ? { ...x, is_read: 1 } : x
                              ));
                            }
                            setNotifOpen(false);
                          }}
                          className="flex items-start gap-3 px-3 py-3.5 pr-10"
                        >
                          {/* Type icon */}
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            isAdmin ? 'bg-[#00b3ff]/10 text-[#00b3ff]' :
                            isReply ? 'bg-zinc-800 text-zinc-300' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {isAdmin ? (
                              <svg viewBox="-2.4 -2.4 28.80 28.80" fill="#00b3ff" stroke="#00b3ff" strokeWidth="0.00024" className="h-4 w-4">
                                <path d="M12 14v8H4a8 8 0 0 1 8-8zm0-1c-3.315 0-6-2.685-6-6s2.685-6 6-6 6 2.685 6 6-2.685 6-6 6zm9 4h1v5h-8v-5h1v-1a3 3 0 0 1 6 0v1zm-2 0v-1a1 1 0 0 0-2 0v1h2z" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-white' : 'font-normal text-zinc-300'}`}>
                              {n.title}
                            </p>
                            {n.message && (
                              <p className="mt-1 text-xs leading-relaxed text-zinc-500 line-clamp-2">
                                {n.message}
                              </p>
                            )}
                            <p className="mt-1.5 text-[10px] text-zinc-600">
                              {n.created_at ? new Date(n.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : ''}
                            </p>
                          </div>

                          {/* Unread dot */}
                          {!n.is_read && (
                            <span className="absolute right-10 top-4 h-1.5 w-1.5 rounded-full bg-narmax-red" />
                          )}
                        </Link>

                        {/* Delete button */}
                        <button
                          type="button"
                          title="Dismiss"
                          onClick={() => {
                            api.delete(`/api/notifications/${n.id}`);
                            setNotifications(notifications.filter(x => x.id !== n.id));
                          }}
                          className="absolute right-3 top-3.5 flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 opacity-0 transition hover:bg-zinc-800 hover:text-zinc-300 group-hover:opacity-100"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-zinc-700">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <p className="text-sm font-medium text-zinc-500">No notifications</p>
                  <p className="text-xs text-zinc-600">You're all caught up</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </>
  );
}
