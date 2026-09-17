export const FILTER_ALL = 'all';

const LANGUAGE_NAMES = {
  ar: 'Arabic',
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  hi: 'Hindi',
  tr: 'Turkish',
  ru: 'Russian',
  nl: 'Dutch',
  sv: 'Swedish',
};

export const RATING_OPTIONS = [
  { value: FILTER_ALL, label: 'Any rating' },
  { value: '9', label: '9.0+ Excellent' },
  { value: '8', label: '8.0+ Highly Rated' },
  { value: '7', label: '7.0+ Recommended' },
  { value: '6', label: '6.0+ Positive' },
  { value: '5', label: '5.0+ Mixed' },
];

export const SPECIAL_OPTIONS = [
  { value: FILTER_ALL, label: 'All Content' },
  { value: 'oscar', label: 'Oscar Winners' },
  { value: 'family', label: 'Family Friendly' },
  { value: 'trending', label: 'Trending Now' },
  { value: 'toprated', label: 'Top Rated' },
  { value: 'award', label: 'Award Winning' },
  { value: 'anime', label: 'Anime Classics' },
  { value: 'marvel_dc', label: 'Marvel / DC' },
  { value: 'netflix', label: 'Netflix Originals' },
  { value: 'recent', label: 'Recently Added' },
];

export function createFilters(baseGenre = FILTER_ALL) {
  return {
    genre: baseGenre,
    year: FILTER_ALL,
    rating: FILTER_ALL,
    language: FILTER_ALL,
    special: FILTER_ALL,
  };
}

export function buildYearOptions(items) {
  const startYear = 1960;
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= startYear; year -= 1) {
    years.push(String(year));
  }
  return [{ value: FILTER_ALL, label: 'Any year' }, ...years.map((year) => ({ value: year, label: year }))];
}

function toLanguageLabel(code) {
  const normalized = String(code || '').toLowerCase();
  if (!normalized) return '';
  return LANGUAGE_NAMES[normalized] || normalized.toUpperCase();
}

export function buildLanguageOptions(items) {
  const codes = Array.from(
    new Set(
      (items || [])
        .map((item) => String(item?.original_language || '').toLowerCase())
        .filter(Boolean)
    )
  );

  const options = codes
    .map((code) => ({ value: code, label: toLanguageLabel(code) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return [{ value: FILTER_ALL, label: 'Any language' }, ...options];
}

export function matchesCatalogFilters(item, filters) {
  const selectedGenre = String(filters.genre || FILTER_ALL);
  const selectedYear = String(filters.year || FILTER_ALL);
  const selectedRating = String(filters.rating || FILTER_ALL);
  const selectedLanguage = String(filters.language || FILTER_ALL).toLowerCase();
  const selectedSpecial = String(filters.special || FILTER_ALL);

  const itemGenres = Array.isArray(item?.genre_ids) ? item.genre_ids.map(String) : [];
  const itemYear = String(item?.release_date || item?.first_air_date || '').slice(0, 4);
  const itemRating = Number(item?.vote_average || 0);
  const itemLanguage = String(item?.original_language || '').toLowerCase();

  // Genre
  if (selectedGenre !== FILTER_ALL && !itemGenres.includes(selectedGenre)) return false;
  
  // Year
  if (selectedYear !== FILTER_ALL && itemYear !== selectedYear) return false;
  
  // Rating
  if (selectedRating !== FILTER_ALL && itemRating < Number(selectedRating)) return false;
  
  // Language
  if (selectedLanguage !== FILTER_ALL && itemLanguage !== selectedLanguage) return false;

  // Special Collections
  if (selectedSpecial === 'family') {
    const familyGenres = ['10751', '16', '10762']; // Family, Animation, Kids
    if (!itemGenres.some(id => familyGenres.includes(id))) return false;
  }
  
  if (selectedSpecial === 'oscar') {
    // If the item has _oscar from server or we check popular oscar titles
    if (!item?._oscar && !itemGenres.includes('292418') && itemRating < 7.5) return false; 
  }

  if (selectedSpecial === 'trending') {
    if (Number(item?.popularity || 0) < 40) return false;
  }

  if (selectedSpecial === 'toprated') {
    if (itemRating < 8.0) return false;
  }

  if (selectedSpecial === 'anime') {
    if (!itemGenres.includes('16') || itemLanguage !== 'ja') return false;
  }

  if (selectedSpecial === 'netflix') {
    if (!item?._blob?.toLowerCase().includes('netflix') && !itemGenres.includes('256183')) return false;
  }

  return true;
}

export function filterCatalogItems(items, filters) {
  return (items || []).filter((item) => matchesCatalogFilters(item, filters));
}
