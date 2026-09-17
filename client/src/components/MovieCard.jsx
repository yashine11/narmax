import { Link } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext.jsx';

export default function MovieCard({ movie, large, kind = 'movie', linkPrefix = '' }) {
  const { getProgress } = useProgress();
  const mt = kind === 'tv' ? 'tv' : 'movie';
  const pr = getProgress(movie.id, mt);
  const href = kind === 'tv' ? `${linkPrefix}/tv/${movie.id}` : `${linkPrefix}/movie/${movie.id}`;
  const w = large ? 'min-w-[180px] w-[180px] sm:min-w-[200px] sm:w-[200px]' : 'min-w-[140px] w-[140px] sm:min-w-[160px] sm:w-[160px]';

  return (
    <Link
      to={href}
      className={`relative shrink-0 ${w} rounded overflow-hidden bg-zinc-900 shadow-card card-zoom group`}
    >
      <div className="aspect-[2/3] bg-zinc-800 relative">
        {pr?.completed && (
          <div className="absolute inset-0 bg-black/50 z-[1] flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-black uppercase text-white/90 border border-white/30 px-2 py-0.5 rounded bg-black/50">
              Watched
            </span>
          </div>
        )}
        {!pr?.completed && pr?.progress_percent > 0 && pr?.progress_percent < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800 z-[1]">
            <div className="h-full bg-narmax-red" style={{ width: `${pr.progress_percent}%` }} />
          </div>
        )}
        {movie.poster_path ? (
          <img
            src={movie.poster_path}
            alt={movie.title}
            className={`w-full h-full object-cover transition-[filter] duration-300 ${pr?.completed ? 'grayscale-[0.65] brightness-[0.85]' : ''}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs p-2 text-center">
            {movie.title}
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
        <p className="text-xs font-semibold line-clamp-2">{movie.title}</p>
        {movie.vote_average != null && (
          <p className="text-[10px] mt-0.5 text-zinc-300">
            <span className="text-narmax-red font-semibold">{movie.vote_average.toFixed(1)}</span>
            <span className="text-zinc-500"> ★</span>
          </p>
        )}
      </div>
    </Link>
  );
}
