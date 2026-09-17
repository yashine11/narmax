import { Link } from 'react-router-dom';

export default function Hero({ movie }) {
  if (!movie) return null;

  return (
    <div className="relative h-[56vh] min-h-[380px] w-full overflow-hidden">
      {movie.backdrop_path && (
        <img
          src={movie.backdrop_path}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      )}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 flex flex-col justify-end pb-16 sm:pb-24 px-4 sm:px-12 max-w-3xl">
        <h1 className="text-3xl sm:text-5xl font-black drop-shadow-lg mb-3">{movie.title}</h1>
        <p className="text-sm sm:text-base text-zinc-200 line-clamp-3 mb-4 max-w-xl">{movie.overview}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/watch/${movie.id}`}
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded font-bold hover:bg-zinc-200 transition"
          >
            ▶ Watch Now
          </Link>
          <Link
            to={`/movie/${movie.id}`}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-6 py-2.5 rounded font-semibold border border-white/30 hover:bg-white/25 transition"
          >
            More Info
          </Link>
        </div>
      </div>
    </div>
  );
}
