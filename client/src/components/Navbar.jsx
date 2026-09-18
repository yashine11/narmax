import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/tv', label: 'TV Shows' },
  { to: '/movies', label: 'Movies' },
  { to: '/anime', label: 'Anime' },
  { to: '/popular', label: 'Popular' },
  { to: '/news', label: 'News' },
  { to: '/my-list', label: 'My List' },
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
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState('');
  const [suggest, setSuggest] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

  useEffect(() => {
    const onClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSuggest([]);
        setActiveSuggestion(-1);
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
  }, []);

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
      setQ('');
      setSuggest([]);
      setActiveSuggestion(-1);
      setMobileSearchOpen(false);
      setMobileMenuOpen(false);
      navigate('/login?portal=riablo-sphinx');
      return;
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSuggest([]);
    setActiveSuggestion(-1);
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
    setSuggest([]);
    setActiveSuggestion(-1);
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
          <Link
            to="/"
            className="shrink-0 bg-gradient-to-r from-white via-narmax-cyan to-white bg-clip-text text-xl font-black tracking-tight text-transparent sm:text-2xl"
            onClick={() => setMobileMenuOpen(false)}
          >
            NARMAX
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-5 lg:flex">
            {NAV_LINKS.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} end={item.end}>
                {item.label}
              </NavLink>
            ))}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={linkClass}>Admin</NavLink>
            )}
          </nav>

          {/* Right Side */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            {/* Desktop Search */}
            <div ref={searchRef} className="relative hidden w-full max-w-sm sm:block">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
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
                placeholder="Search titles, cast, genres..."
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm text-white outline-none transition placeholder:text-zinc-400 focus:border-narmax-cyan focus:bg-white/[0.1] focus:shadow-[0_0_0_1px_rgba(86,207,225,0.35)]"
              />
              {suggest.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-[200] mt-2 max-h-72 overflow-auto rounded-2xl border border-white/15 bg-zinc-950/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.75)] backdrop-blur-xl">
                  {suggest.map((item, index) => (
                    <li key={`${item.media_type || 'movie'}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => selectSuggestion(item)}
                        className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition ${
                          index === activeSuggestion ? 'bg-white/10' : 'hover:bg-white/6'
                        }`}
                      >
                        {item.poster_path ? (
                          <img src={item.poster_path} alt="" className="h-11 w-8 rounded object-cover" loading="lazy" />
                        ) : (
                          <div className="h-11 w-8 rounded bg-zinc-800" />
                        )}
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="truncate font-medium text-zinc-100">{item.title}</span>
                          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                            {mediaBadgeLabel(item.media_type)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Mobile search button */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10 sm:hidden"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-zinc-300">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </button>

            {/* Notifications */}
            {user && (
              <div ref={notificationRef} className="relative">
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

                {notifOpen && (
                  <div className="animate-rise-fade absolute right-0 top-full z-[200] mt-3 w-80 rounded-2xl border border-white/15 bg-black/90 p-3 shadow-2xl backdrop-blur-2xl">
                    <div className="mb-3 flex items-center justify-between px-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => {
                            api.patch('/api/notifications/all').then(() => {
                              setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
                            });
                          }}
                          className="text-[10px] font-bold text-narmax-cyan hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            to={n.link || '#'}
                            onClick={() => {
                              if (!n.is_read) api.patch(`/api/notifications/${n.id}`);
                              setNotifOpen(false);
                            }}
                            className={`block rounded-xl border border-white/5 p-3 transition hover:bg-white/5 ${!n.is_read ? 'bg-white/5' : ''}`}
                          >
                            <p className="text-sm font-bold text-zinc-100">{n.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{n.message}</p>
                          </Link>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-zinc-500">No new notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile / Sign In */}
            {user ? (
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-1.5 py-1 transition hover:bg-white/[0.12] sm:gap-2 sm:px-2"
                >
                  <img
                    src={user.avatar}
                    alt=""
                    className="h-7 w-7 rounded border border-white/15 object-cover sm:h-8 sm:w-8"
                    loading="lazy"
                  />
                  <ChevronDownIcon className={`hidden h-4 w-4 text-zinc-300 transition sm:block ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="animate-rise-fade absolute right-0 top-full z-[200] mt-3 w-64 rounded-2xl border border-cyan-300/20 bg-black/88 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.78)] backdrop-blur-[20px] sm:w-72">
                    <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Profiles</p>
                    <div className="space-y-2">
                      {profileCards.map((card) => (
                        <Link
                          key={card.label}
                          to={card.path}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          <img src={card.avatar} alt="" className="h-10 w-10 rounded-md object-cover" loading="lazy" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-zinc-100">{card.label}</p>
                            <p className="text-xs text-zinc-500">{card.label === 'Kids' ? 'Protected kids space' : 'Main profile'}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="my-3 h-px bg-white/10" />
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); logout(); }}
                      className="w-full rounded-lg border border-white/15 px-3 py-2 text-left text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
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
        <div className="fixed inset-0 z-[100] lg:hidden" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-zinc-950 shadow-[4px_0_30px_rgba(0,0,0,0.8)]">
            {/* Drawer header */}
            <div className="flex h-16 items-center justify-between px-5">
              <span className="bg-gradient-to-r from-white via-narmax-cyan to-white bg-clip-text text-xl font-black tracking-tight text-transparent">
                NARMAX
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
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                >
                  Sign Out
                </button>
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
    </>
  );
}
