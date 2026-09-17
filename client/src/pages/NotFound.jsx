import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFound() {
  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <Helmet>
        <title>Page Not Found — NARMAX</title>
        <meta name="description" content="Sorry, the page you requested could not be found on NARMAX." />
      </Helmet>
      <div className="glass-panel relative mx-auto max-w-xl overflow-hidden rounded-3xl p-8 text-center sm:p-12">
        {/* Glow accent */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />

        <p className="text-xs font-black uppercase tracking-[0.25em] text-narmax-cyan">Error 404</p>
        <h1 className="mt-3 text-6xl font-black tracking-tight text-white sm:text-7xl">
          Lost Your Way?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-400 sm:text-lg">
          Sorry, we can't find that page. You'll find plenty to explore on the home page or in our catalog.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-narmax-cyan px-6 py-3 text-sm font-black text-black transition hover:brightness-110 shadow-lg shadow-cyan-500/20"
          >
            Go to Home
          </Link>
          <Link
            to="/movies"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 hover:border-cyan-400/30"
          >
            Explore Movies
          </Link>
          <Link
            to="/search"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 hover:border-cyan-400/30"
          >
            Search Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
