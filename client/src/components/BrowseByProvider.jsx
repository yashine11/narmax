import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PROVIDERS = [
  {
    id: 'netflix',
    name: 'Netflix',
    bg: '#000000',
    color: '#E50914',
    icon: (
      <span className="font-black text-4xl tracking-tighter text-[#E50914]">N</span>
    ),
  },
  {
    id: 'prime',
    name: 'Amazon Prime',
    bg: '#00A8E1',
    color: '#ffffff',
    icon: (
      <div className="flex flex-col items-center leading-none gap-0.5">
        <span className="text-base font-black tracking-tight text-white">prime</span>
        <span className="text-xs font-bold text-white">video</span>
      </div>
    ),
  },
  {
    id: 'disney',
    name: 'Disney Plus',
    bg: '#113CCF',
    color: '#ffffff',
    icon: (
      <span className="font-extrabold text-lg tracking-tight text-white">Disney+</span>
    ),
  },
  {
    id: 'apple',
    name: 'Apple TV+',
    bg: '#1c1c1e',
    color: '#ffffff',
    icon: (
      <div className="flex items-center gap-0.5 text-white">
        <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.71-7.94-12.04-14.58-6.19-9.5-10.98-20.2-14.38-32.1-3.41-11.9-5.12-22.75-5.12-32.55 0-14.35 3.63-26.06 10.89-35.14 7.26-9.08 16.32-13.75 27.18-14.01 4.58 0 9.87 1.25 15.88 3.75 6 2.5 9.94 3.79 11.82 3.79 1.48 0 5.42-1.32 11.82-3.96 6.4-2.64 11.66-3.83 15.77-3.56 10.95.73 19.86 4.97 26.74 12.73-9.49 5.8-14.12 13.91-13.88 24.32.27 8.52 3.51 15.65 9.73 21.39 6.22 5.73 13.67 9.07 22.36 10.01-2.22 6.84-4.91 13.78-8.08 20.82zM119.22 31.84c0-7.39 2.65-14.35 7.95-20.87 5.3-6.52 11.77-10.49 19.41-11.91.4 1.73.6 3.4.6 5.02 0 7.39-2.78 14.49-8.34 21.3-5.56 6.81-12.16 10.74-19.8 11.78-.13-1.74-.2-3.5-.2-5.32z" />
        </svg>
        <span className="text-sm font-bold">tv+</span>
      </div>
    ),
  },
  {
    id: 'hulu',
    name: 'Hulu',
    bg: '#1ce783',
    color: '#000000',
    icon: (
      <span className="font-black text-xl tracking-tight text-black">hulu</span>
    ),
  },
  {
    id: 'hbomax',
    name: 'HBO Max',
    bg: '#002BE7',
    color: '#ffffff',
    icon: (
      <span className="font-black text-xl tracking-wider text-white uppercase">MAX</span>
    ),
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    bg: '#0064FF',
    color: '#ffffff',
    icon: (
      <span className="font-black text-sm tracking-tight text-white">Paramount+</span>
    ),
  },
  {
    id: 'peacock',
    name: 'Peacock',
    bg: '#000000',
    color: '#ffffff',
    icon: (
      <span className="font-extrabold text-sm tracking-tight text-emerald-400">peacock</span>
    ),
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    bg: '#F47521',
    color: '#ffffff',
    icon: (
      <div className="flex items-center justify-center">
        <svg className="w-9 h-9 fill-white" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="white" />
          <circle cx="14" cy="11" r="5" fill="#F47521" />
        </svg>
      </div>
    ),
  },
  {
    id: 'starz',
    name: 'Starz',
    bg: '#000000',
    color: '#ffffff',
    icon: (
      <span className="font-black text-lg tracking-widest text-white">STARZ</span>
    ),
  },
  {
    id: 'amc',
    name: 'AMC+',
    bg: '#003333',
    color: '#00E5FF',
    icon: (
      <span className="font-black text-lg tracking-wider text-[#00E5FF]">aMC+</span>
    ),
  },
  {
    id: 'tubi',
    name: 'Tubi TV',
    bg: '#FA491D',
    color: '#ffffff',
    icon: (
      <span className="font-black text-xl tracking-tight text-white">tubi</span>
    ),
  },
  {
    id: 'pluto',
    name: 'Pluto TV',
    bg: '#FED000',
    color: '#000000',
    icon: (
      <span className="font-black text-lg tracking-tight text-black">pluto<span className="text-amber-700">tv</span></span>
    ),
  },
  {
    id: 'showtime',
    name: 'Showtime',
    bg: '#CC0000',
    color: '#ffffff',
    icon: (
      <span className="font-black text-xs tracking-widest text-white uppercase">SHOWTIME</span>
    ),
  },
  {
    id: 'discovery',
    name: 'Discovery+',
    bg: '#002D5B',
    color: '#00E5FF',
    icon: (
      <span className="font-extrabold text-xs tracking-tight text-white">discovery<span className="text-[#00E5FF] font-black">+</span></span>
    ),
  },
  {
    id: 'mgm',
    name: 'MGM+',
    bg: '#141414',
    color: '#E6B800',
    icon: (
      <span className="font-black text-lg tracking-wider text-[#E6B800]">MGM+</span>
    ),
  },
  {
    id: 'bbciplayer',
    name: 'BBC iPlayer',
    bg: '#000000',
    color: '#FF4444',
    icon: (
      <div className="flex flex-col items-center leading-none">
        <span className="text-[10px] font-black tracking-widest text-white">BBC</span>
        <span className="text-xs font-bold text-[#FF4444]">iPlayer</span>
      </div>
    ),
  },
  {
    id: 'britbox',
    name: 'BritBox',
    bg: '#0B2545',
    color: '#ffffff',
    icon: (
      <span className="font-black text-sm tracking-tight text-white">britbox</span>
    ),
  },
  {
    id: 'shudder',
    name: 'Shudder',
    bg: '#660000',
    color: '#ffffff',
    icon: (
      <span className="font-black text-xs tracking-widest text-white">SHUDDER</span>
    ),
  },
  {
    id: 'sonypictures',
    name: 'Sony Pictures',
    bg: '#000000',
    color: '#ffffff',
    icon: (
      <span className="font-black text-sm tracking-widest text-white">SONY</span>
    ),
  },
  {
    id: 'rakuten',
    name: 'Rakuten TV',
    bg: '#BF0000',
    color: '#ffffff',
    icon: (
      <div className="flex flex-col items-center leading-none">
        <span className="text-[9px] font-bold text-white">Rakuten</span>
        <span className="text-xs font-black text-white">TV</span>
      </div>
    ),
  },
  {
    id: 'vudu',
    name: 'Vudu',
    bg: '#0055EE',
    color: '#ffffff',
    icon: (
      <span className="font-black text-lg tracking-wider text-white">VUDU</span>
    ),
  },
  {
    id: 'mubi',
    name: 'MUBI',
    bg: '#111111',
    color: '#ffffff',
    icon: (
      <span className="font-black text-sm tracking-widest text-white">MUBI</span>
    ),
  },
  {
    id: 'plex',
    name: 'Plex',
    bg: '#E5A00D',
    color: '#000000',
    icon: (
      <span className="font-black text-lg tracking-wider text-black">PLEX</span>
    ),
  },
];

export default function BrowseByProvider() {
  const navigate = useNavigate();
  const railRef = useRef(null);
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0]); // Default to Netflix
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!railRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = railRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (direction) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: direction * 550, behavior: 'smooth' });
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
  };

  const handleCategoryNavigate = (provider, type = 'all') => {
    const qParam = encodeURIComponent(provider.name);
    navigate(`/search?provider=${provider.id}&type=${type}&q=${qParam}`);
  };

  return (
    <section className="mx-auto max-w-[1920px] px-4 py-8 sm:px-8 md:px-12">
      {/* Header with Title and Scroll Arrows */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-narmax-cyan">Streaming Hubs</p>
          <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
            Browse by Provider
          </h2>
        </div>

        {/* Carousel < > Arrow Controls */}
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Scroll left"
            disabled={!canScrollLeft}
            onClick={() => scroll(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white backdrop-blur-md transition-all duration-200 hover:border-cyan-400/60 hover:bg-zinc-900 hover:scale-105 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-white/15 disabled:hover:bg-black/80"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            disabled={!canScrollRight}
            onClick={() => scroll(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white backdrop-blur-md transition-all duration-200 hover:border-cyan-400/60 hover:bg-zinc-900 hover:scale-105 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-white/15 disabled:hover:bg-black/80"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Horizontal Provider Badges Rail */}
      <div
        ref={railRef}
        className="premium-row-scroll no-scrollbar flex items-center gap-3 overflow-x-auto pb-2 pt-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {PROVIDERS.map((provider) => {
          const isSelected = selectedProvider?.id === provider.id;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleProviderSelect(provider)}
              onDoubleClick={() => handleCategoryNavigate(provider, 'all')}
              className={`cine-provider-badge shrink-0 text-left group transition-all duration-200 ${
                isSelected
                  ? 'scale-105 ring-2 ring-narmax-cyan ring-offset-2 ring-offset-black'
                  : 'hover:scale-102 opacity-85 hover:opacity-100'
              }`}
            >
              <div
                className="cine-provider-icon relative overflow-hidden"
                style={{ backgroundColor: provider.bg }}
              >
                {provider.icon}
                {isSelected && (
                  <span className="absolute inset-0 bg-narmax-cyan/10 animate-pulse pointer-events-none" />
                )}
              </div>
              <span className={`text-xs font-semibold truncate max-w-[90px] text-center transition ${
                isSelected ? 'text-narmax-cyan font-bold' : 'text-zinc-400 group-hover:text-white'
              }`}>
                {provider.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Specific Clean Categories Sub-Bar: Movies, TV, Anime */}
      {selectedProvider && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 backdrop-blur-xl animate-fade-in shadow-2xl">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold shadow-md ring-1 ring-white/10"
              style={{ backgroundColor: selectedProvider.bg, color: selectedProvider.color }}
            >
              {selectedProvider.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white">{selectedProvider.name}</span>
                <span className="rounded-full bg-narmax-cyan/15 px-2 py-0.5 text-[10px] font-bold text-narmax-cyan border border-narmax-cyan/30">
                  Catalog
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select a category to stream from {selectedProvider.name}:
              </p>
            </div>
          </div>

          {/* Specific Categories: All, Movies, TV, Anime */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => handleCategoryNavigate(selectedProvider, 'all')}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:border-narmax-cyan hover:bg-narmax-cyan/15 hover:text-narmax-cyan hover:scale-105 active:scale-95 shadow"
            >
              <span>✨ All {selectedProvider.name}</span>
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNavigate(selectedProvider, 'movie')}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:border-narmax-cyan hover:bg-narmax-cyan/15 hover:text-narmax-cyan hover:scale-105 active:scale-95 shadow"
            >
              <span>🎬 {selectedProvider.name} Movies</span>
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNavigate(selectedProvider, 'tv')}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:border-narmax-cyan hover:bg-narmax-cyan/15 hover:text-narmax-cyan hover:scale-105 active:scale-95 shadow"
            >
              <span>📺 {selectedProvider.name} TV</span>
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNavigate(selectedProvider, 'anime')}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:border-narmax-cyan hover:bg-narmax-cyan/15 hover:text-narmax-cyan hover:scale-105 active:scale-95 shadow"
            >
              <span>⛩️ {selectedProvider.name} Anime</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
