import { useMemo } from 'react';

/**
 * Modern Clean Pagination Component
 * Renders numbered pages (e.g. 1 2 3 4 5 6 7 8 9 10 Next >) with smooth glowing active state.
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  loading = false,
  className = '',
}) {
  // Cap at 500 max pages (TMDB API ceiling)
  const safeTotalPages = Math.min(Math.max(1, totalPages || 1), 500);

  // Generate sliding window of pages (like Google pagination: 10 numbers)
  const pageNumbers = useMemo(() => {
    const windowSize = 10;
    let start = Math.max(1, currentPage - 5);
    let end = Math.min(safeTotalPages, start + windowSize - 1);

    if (end - start + 1 < windowSize) {
      start = Math.max(1, end - windowSize + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return { pages, start, end };
  }, [currentPage, safeTotalPages]);

  if (safeTotalPages <= 1) return null;

  const { pages, start, end } = pageNumbers;

  return (
    <nav
      aria-label="Pagination"
      className={`my-12 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 select-none ${className}`}
    >
      {/* Previous Button */}
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || loading}
        className="group flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 sm:px-4 text-xs font-bold text-zinc-300 backdrop-blur-md transition-all duration-200 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-25"
      >
        <svg
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-semibold tracking-wide">Prev</span>
      </button>

      {/* Jump to first page if not in window */}
      {start > 1 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={loading}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs sm:text-sm font-bold text-zinc-400 transition hover:border-cyan-400/40 hover:bg-white/10 hover:text-white active:scale-95 disabled:pointer-events-none"
          >
            1
          </button>
          {start > 2 && <span className="px-1 text-zinc-500 font-black">···</span>}
        </>
      )}

      {/* Numbered Page Buttons: 1 2 3 4 5 6 7 8 9 10 */}
      {pages.map((pageNum) => {
        const isActive = pageNum === currentPage;
        return (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            disabled={loading}
            aria-current={isActive ? 'page' : undefined}
            className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl text-xs sm:text-sm font-black transition-all duration-200 active:scale-95 ${
              isActive
                ? 'border border-cyan-300 bg-gradient-to-tr from-cyan-500 to-cyan-300 text-black shadow-[0_0_24px_rgba(86,207,225,0.55)] scale-105 z-10'
                : 'border border-white/10 bg-white/[0.04] text-zinc-300 backdrop-blur-sm hover:border-cyan-400/40 hover:bg-white/10 hover:text-white'
            }`}
          >
            {pageNum}
          </button>
        );
      })}

      {/* Jump to last page if not in window */}
      {end < safeTotalPages && (
        <>
          {end < safeTotalPages - 1 && <span className="px-1 text-zinc-500 font-black">···</span>}
          <button
            type="button"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={loading}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs sm:text-sm font-bold text-zinc-400 transition hover:border-cyan-400/40 hover:bg-white/10 hover:text-white active:scale-95 disabled:pointer-events-none"
          >
            {safeTotalPages}
          </button>
        </>
      )}

      {/* Next Button */}
      <button
        type="button"
        aria-label="Next page"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= safeTotalPages || loading}
        className="group flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 sm:px-4 text-xs font-bold text-zinc-300 backdrop-blur-md transition-all duration-200 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-25"
      >
        <span className="font-semibold tracking-wide">Next</span>
        <svg
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
