import { useState } from 'react';
import { FILTER_ALL, RATING_OPTIONS, SPECIAL_OPTIONS } from '../lib/catalogFilters.js';

function CineFilterPill({ label, value, options, onChange }) {
  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const isFiltered = value !== FILTER_ALL;

  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={onChange}
        className={`appearance-none cursor-pointer rounded-full px-4 py-2 pr-8 text-xs font-semibold tracking-wide transition border outline-none ${
          isFiltered
            ? 'bg-narmax-red/20 border-narmax-red text-white'
            : 'bg-zinc-900/90 border-white/15 text-zinc-300 hover:border-white/30 hover:text-white'
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-zinc-900 text-white py-1">
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 flex items-center text-zinc-400 text-[10px]">
        ▼
      </div>
    </div>
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
    { value: FILTER_ALL, label: 'All Genres' },
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
    <div className="w-full">
      {/* Mobile Bar */}
      <div className="flex items-center justify-between gap-3 sm:hidden mb-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-zinc-900/90 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-narmax-red">
            <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clipRule="evenodd" />
          </svg>
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`} {expanded ? '▲' : '▼'}
        </button>
        {typeof count === 'number' && (
          <span className="text-xs text-zinc-400 font-medium">
            {count} titles
          </span>
        )}
      </div>

      {/* Pill Row — Desktop always, Mobile toggled */}
      <div className={`${expanded ? 'flex' : 'hidden'} sm:flex flex-wrap items-center gap-2.5`}>
        <CineFilterPill
          label="Genre"
          value={filters.genre}
          options={genreOptions}
          onChange={(e) => onChange('genre', e.target.value)}
        />
        <CineFilterPill
          label="Year"
          value={filters.year}
          options={yearOptions}
          onChange={(e) => onChange('year', e.target.value)}
        />
        <CineFilterPill
          label="Rating"
          value={filters.rating}
          options={RATING_OPTIONS}
          onChange={(e) => onChange('rating', e.target.value)}
        />
        <CineFilterPill
          label="Language"
          value={filters.language}
          options={languageOptions}
          onChange={(e) => onChange('language', e.target.value)}
        />
        <CineFilterPill
          label="Collection"
          value={filters.special}
          options={SPECIAL_OPTIONS}
          onChange={(e) => onChange('special', e.target.value)}
        />

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              onChange('genre', FILTER_ALL);
              onChange('year', FILTER_ALL);
              onChange('rating', FILTER_ALL);
              onChange('language', FILTER_ALL);
              onChange('special', FILTER_ALL);
            }}
            className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            Reset
          </button>
        )}

        {typeof count === 'number' && (
          <span className="hidden sm:inline-block ml-auto text-xs text-zinc-400 font-medium tracking-wide">
            {count} titles
          </span>
        )}
      </div>
    </div>
  );
}
