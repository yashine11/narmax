import { Link, Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import AdSlot from './AdSlot.jsx';
import RouteLoadingBar from './RouteLoadingBar.jsx';
import Logo from './Logo.jsx';

export default function Layout() {
  return (
    <div className="min-h-screen bg-black">
      <RouteLoadingBar />
      <Navbar />
      <main className="pt-16 sm:pt-20">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-white/10 bg-black/85 relative z-10">
        <div className="mx-auto max-w-[1920px] px-4 pt-10 sm:px-8">
          <AdSlot format="footer" slotId="global-footer-1" />
        </div>
        <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 pb-24 sm:pb-10">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="h-7 w-7 rounded-md drop-shadow-[0_0_10px_rgba(224,182,83,0.3)]" />
              <p className="text-sm font-black tracking-[0.2em] text-narmax-red">NARMAX</p>
            </div>
            <p className="mt-3 text-sm text-zinc-400">Streaming-first cinematic interface inspired by modern OTT platforms.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Browse</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
              <Link to="/" className="transition hover:text-white">Home</Link>
              <Link to="/tv" className="transition hover:text-white">TV Shows</Link>
              <Link to="/movies" className="transition hover:text-white">Movies</Link>
              <Link to="/anime" className="transition hover:text-white">Anime</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Discover</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
              <Link to="/popular" className="transition hover:text-white">Popular</Link>
              <Link to="/news" className="transition hover:text-white">News</Link>
              <Link to="/my-list" className="transition hover:text-white">My List</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Legal &amp; About</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-300">
              <span className="text-zinc-400">Terms of Service</span>
              <span className="text-zinc-400">Privacy Policy</span>
              <p className="mt-2 text-xs text-zinc-500">© 2026 NARMAX. Built by riablo &amp; Sphinx.</p>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Mobile Sticky Ad */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-black/90 p-2 backdrop-blur-md sm:hidden border-t border-white/10">
        <AdSlot format="mobileSticky" slotId="global-mobile-sticky" />
      </div>
    </div>
  );
}
