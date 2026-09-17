import { useEffect, useState } from 'react';
import axios from 'axios';
import MovieCard from '../components/MovieCard.jsx';
import toast from 'react-hot-toast';

const KIDS_KEY = 'narmax_kids_token';

function kidsClient() {
  const token = sessionStorage.getItem(KIDS_KEY);
  return axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export default function KidsBrowse() {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = (p = 1, append = false) => {
    setLoading(true);
    kidsClient()
      .get('/api/kids/catalog', { params: { page: p } })
      .then((r) => {
        const next = r.data.results || [];
        setMovies((prev) => (append ? [...prev, ...next] : next));
        setPage(r.data.page || 1);
        setTotalPages(r.data.total_pages || 1);
      })
      .catch(() => {
        toast.error('Session expired');
        sessionStorage.removeItem(KIDS_KEY);
        window.location.href = '/kids';
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
  }, []);

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-8 py-8 pb-24">
      <h1 className="text-2xl font-black mb-8 text-blue-100">Pick something fun</h1>
      {loading && !movies.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} linkPrefix="/kids" />
          ))}
        </div>
      )}
      {page < totalPages && !loading && (
        <div className="flex justify-center mt-10">
          <button
            type="button"
            onClick={() => load(page + 1, true)}
            className="px-8 py-2 bg-blue-800 hover:bg-blue-700 rounded-lg font-semibold"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
