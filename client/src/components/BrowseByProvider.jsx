import { useNavigate } from 'react-router-dom';

const PROVIDERS = [
  {
    id: 'netflix',
    name: 'Netflix',
    bg: '#000000',
    color: '#E50914',
    icon: (
      <span className="font-black text-2xl tracking-tighter text-[#E50914]">N</span>
    ),
  },
  {
    id: 'prime',
    name: 'Amazon Prime',
    bg: '#00A8E1',
    color: '#ffffff',
    icon: (
      <div className="flex flex-col items-center leading-none">
        <span className="text-xs font-black tracking-tight text-white">prime</span>
        <span className="text-[10px] font-bold text-white">video</span>
      </div>
    ),
  },
  {
    id: 'disney',
    name: 'Disney Plus',
    bg: '#113CCF',
    color: '#ffffff',
    icon: (
      <span className="font-extrabold text-sm tracking-tight text-white">Disney+</span>
    ),
  },
  {
    id: 'apple',
    name: 'Apple TV+',
    bg: '#1c1c1e',
    color: '#ffffff',
    icon: (
      <div className="flex items-center gap-0.5 text-white">
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.71-7.94-12.04-14.58-6.19-9.5-10.98-20.2-14.38-32.1-3.41-11.9-5.12-22.75-5.12-32.55 0-14.35 3.63-26.06 10.89-35.14 7.26-9.08 16.32-13.75 27.18-14.01 4.58 0 9.87 1.25 15.88 3.75 6 2.5 9.94 3.79 11.82 3.79 1.48 0 5.42-1.32 11.82-3.96 6.4-2.64 11.66-3.83 15.77-3.56 10.95.73 19.86 4.97 26.74 12.73-9.49 5.8-14.12 13.91-13.88 24.32.27 8.52 3.51 15.65 9.73 21.39 6.22 5.73 13.67 9.07 22.36 10.01-2.22 6.84-4.91 13.78-8.08 20.82zM119.22 31.84c0-7.39 2.65-14.35 7.95-20.87 5.3-6.52 11.77-10.49 19.41-11.91.4 1.73.6 3.4.6 5.02 0 7.39-2.78 14.49-8.34 21.3-5.56 6.81-12.16 10.74-19.8 11.78-.13-1.74-.2-3.5-.2-5.32z" />
        </svg>
        <span className="text-[11px] font-bold">tv+</span>
      </div>
    ),
  },
  {
    id: 'hulu',
    name: 'Hulu',
    bg: '#1ce783',
    color: '#000000',
    icon: (
      <span className="font-black text-sm tracking-tight text-black">hulu</span>
    ),
  },
  {
    id: 'hbomax',
    name: 'HBO Max',
    bg: '#002BE7',
    color: '#ffffff',
    icon: (
      <span className="font-black text-xs tracking-wider text-white uppercase">MAX</span>
    ),
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    bg: '#0064FF',
    color: '#ffffff',
    icon: (
      <span className="font-black text-[11px] tracking-tight text-white">Paramount+</span>
    ),
  },
  {
    id: 'peacock',
    name: 'Peacock',
    bg: '#000000',
    color: '#ffffff',
    icon: (
      <span className="font-extrabold text-[11px] tracking-tight text-emerald-400">peacock</span>
    ),
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    bg: '#F47521',
    color: '#ffffff',
    icon: (
      <div className="flex items-center justify-center">
        <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
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
      <span className="font-black text-xs tracking-widest text-white">STARZ</span>
    ),
  },
  {
    id: 'amc',
    name: 'AMC+',
    bg: '#003333',
    color: '#00E5FF',
    icon: (
      <span className="font-black text-xs tracking-wider text-[#00E5FF]">aMC+</span>
    ),
  },
  {
    id: 'tubi',
    name: 'Tubi TV',
    bg: '#FA491D',
    color: '#ffffff',
    icon: (
      <span className="font-black text-xs tracking-tight text-white">tubi</span>
    ),
  },
  {
    id: 'pluto',
    name: 'Pluto TV',
    bg: '#FED000',
    color: '#000000',
    icon: (
      <span className="font-black text-xs tracking-tight text-black">pluto<span className="text-amber-700">tv</span></span>
    ),
  },
];

export default function BrowseByProvider() {
  const navigate = useNavigate();

  const handleProviderClick = (provider) => {
    navigate(`/search?q=${encodeURIComponent(provider.name)}`);
  };

  return (
    <section className="mx-auto max-w-[1920px] px-6 py-8 sm:px-12 md:px-16">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white sm:text-xl">
          Browse by Provider
        </h2>
      </div>

      <div className="row-scroll flex items-center gap-4 overflow-x-auto pb-4 pt-1">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleProviderClick(provider)}
            className="cine-provider-badge shrink-0 text-left group"
          >
            <div
              className="cine-provider-icon"
              style={{ backgroundColor: provider.bg }}
            >
              {provider.icon}
            </div>
            <span className="text-[11px] font-medium text-zinc-400 group-hover:text-white transition truncate max-w-[64px] text-center">
              {provider.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
