import { useState } from 'react';
import { FILTER_ALL, RATING_OPTIONS, SPECIAL_OPTIONS } from '../lib/catalogFilters.js';

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="flex min-w-0 flex-1 basis-[calc(50%-0.5rem)] flex-col gap-1.5 sm:basis-[170px]">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-cyan-300/20 bg-[#03045e]/45 px-3 py-2.5 text-sm font-medium text-cyan-100 outline-none transition hover:border-cyan-300/35 focus:border-narmax-cyan focus:bg-[#1e40af]/45"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-zinc-900 text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CatalogFilters({
  genres,
  filters,
  onChange,
  yearOptions,
  languageOptions = [{ value: FILTER_ALL, label: 'Any language' }],
  count,
  title = 'Filters',
}) {
  const [expanded, setExpanded] = useState(false);

  const genreOptions = [
    { value: FILTER_ALL, label: 'Any genre' },
    ...(genres || []).map((genre) => ({ value: String(genre.id), label: genre.name })),
  ];

  const activeFilterCount = [
    filters.genre !== FILTER_ALL,
    filters.year !== FILTER_ALL,
    filters.rating !== FILTER_ALL,
    filters.language !== FILTER_ALL,
    filters.special !== FILTER_ALL,
  ].filter(Boolean).length;

  return (
    <div className="glass-panel cyan-glow rounded-2xl p-4 sm:p-5">
      {/* Header + mobile toggle */}
      <div className="mb-1 flex items-center justify-between gap-4 sm:mb-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">{title}</p>
            <p className="mt-1 hidden text-sm text-zinc-300 sm:block">Advanced filtering with instant cinematic updates.</p>
          </div>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-narmax-cyan px-2.5 py-0.5 text-[10px] font-black text-black">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-cyan-300/25 bg-[#03045e]/45 px-3 py-1.5 text-xs font-semibold text-cyan-100 whitespace-nowrap">
            {count} titles
          </div>
          {/* Mobile expand toggle */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10 sm:hidden"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clipRule="evenodd" />
            </svg>
            Filters {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Filters — always visible on sm+, toggleable on mobile */}
      <div className={`${expanded ? 'block' : 'hidden'} sm:block`}>
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Genre"
            value={filters.genre}
            options={genreOptions}
            onChange={(event) => onChange('genre', event.target.value)}
          />
          <FilterSelect
            label="Year"
            value={filters.year}
            options={yearOptions}
            onChange={(event) => onChange('year', event.target.value)}
          />
          <FilterSelect
            label="Rating"
            value={filters.rating}
            options={RATING_OPTIONS}
            onChange={(event) => onChange('rating', event.target.value)}
          />
          <FilterSelect
            label="Language"
            value={filters.language}
            options={languageOptions}
            onChange={(event) => onChange('language', event.target.value)}
          />
          <FilterSelect
            label="Collection"
            value={filters.special}
            options={SPECIAL_OPTIONS}
            onChange={(event) => onChange('special', event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
