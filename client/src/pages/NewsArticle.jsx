import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThreadedComments from '../components/ThreadedComments.jsx';
import AdSlot from '../components/AdSlot.jsx';
import toast from 'react-hot-toast';

function fmt(dateValue) {
  const d = new Date(String(dateValue || ''));
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtMoney(n) {
  if (!n || n < 1000) return null;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
}

const REACTIONS = [
  { emoji: '🔥', label: 'Fire', base: 2341 },
  { emoji: '😍', label: 'Love', base: 1872 },
  { emoji: '😮', label: 'Wow', base: 934 },
  { emoji: '👏', label: 'Applause', base: 1205 },
  { emoji: '🤔', label: 'Thinking', base: 456 },
];

export default function NewsArticle() {
  const { id } = useParams();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState(() =>
    REACTIONS.map((r) => ({ ...r, count: r.base + Math.floor(Math.random() * 300), active: false }))
  );

  const match = id.match(/\d+/);
  const tmdbId = match ? match[0] : id.split('-').pop();
  const mediaType = id.includes('-tv') ? 'tv' : 'movie';

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/api/comments/tmdb/${tmdbId}?type=${mediaType}`);
      setComments(data.comments || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    setLoading(true);
    const endpoint = mediaType === 'tv' ? `/api/tmdb/tv/${tmdbId}` : `/api/tmdb/movie/${tmdbId}`;
    api.get(endpoint)
      .then(({ data }) => { setArticle(data); fetchComments(); })
      .catch(() => toast.error('Failed to load article'))
      .finally(() => setLoading(false));

    // Related news
    api.get('/api/tmdb/news-hub', { params: { section: mediaType } })
      .then(({ data }) => {
        const picks = [
          ...(data.newsPicks || []),
          ...(data.trendingTrailers || []),
        ].filter((r) => String(r.id) !== tmdbId).slice(0, 5);
        setRelated(picks);
      })
      .catch(() => {});
  }, [id]);

  const postComment = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Sign in to comment');
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      await api.post('/api/comments', {
        tmdbId: Number(tmdbId),
        content: commentText.trim(),
        media_type: mediaType,
        title: article?.title,
        overview: article?.overview,
        poster_path: article?.poster_path,
      });
      setCommentText('');
      fetchComments();
      toast.success('Comment posted');
    } catch { toast.error('Failed'); }
    finally { setBusy(false); }
  };

  const toggleReaction = (idx) => {
    setReactions((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, active: !r.active, count: r.active ? r.count - 1 : r.count + 1 } : r
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <div className="mx-auto max-w-[1024px] px-6">
          <div className="h-[400px] skeleton rounded-3xl mb-8" />
          <div className="h-10 w-3/4 skeleton rounded mb-4" />
          <div className="space-y-3 mt-8">{[1,2,3,4,5,6].map(i => <div key={i} className="h-4 skeleton rounded" />)}</div>
        </div>
      </div>
    );
  }

  if (!article) return null;

  const year = String(article.release_date || '').slice(0, 4);
  const score = article.vote_average ? `${Math.round(article.vote_average * 10)}%` : null;
  const runtime = article.runtime ? `${Math.floor(article.runtime / 60)}h ${article.runtime % 60}m` : null;
  const directors = article.directors || [];
  const writers = article.writers || [];
  const creators = article.creators || [];
  const companies = article.production_companies || [];
  const budget = fmtMoney(article.budget);
  const revenue = fmtMoney(article.revenue);
  const seasons = article.number_of_seasons;
  const episodes = article.number_of_episodes;

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* HERO BANNER */}
      <div className="relative h-[400px] w-full overflow-hidden sm:h-[500px]">
        {article.backdrop_path ? (
          <img src={article.backdrop_path} alt="" className="absolute inset-0 h-full w-full object-cover scale-105" />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

        <div className="absolute bottom-10 left-0 right-0 mx-auto max-w-[1100px] px-4 sm:px-6">
          <nav className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <Link to="/news" className="hover:text-narmax-cyan transition-colors">News</Link>
            <span>/</span>
            <span className="text-zinc-300 truncate max-w-xs">{article.title}</span>
          </nav>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-lg bg-narmax-cyan px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
              {mediaType === 'tv' ? 'Series' : 'Movie'}
            </span>
            {article.genres?.slice(0, 2).map((g) => (
              <span key={g.id} className="rounded-lg bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                {g.name}
              </span>
            ))}
            {score && (
              <span className="rounded-lg bg-green-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-green-400">
                {score} Match
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">{article.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
            {year && <span>{year}</span>}
            {runtime && <span>· {runtime}</span>}
            {seasons && <span>· {seasons} Seasons · {episodes} Episodes</span>}
            {article.original_language && (
              <span className="rounded border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-zinc-300">
                {article.original_language.toUpperCase()}
              </span>
            )}
            {article.status && (
              <span className="rounded-full bg-narmax-cyan/10 px-3 py-0.5 text-[10px] font-bold text-narmax-cyan">
                {article.status}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6">
        <div className="flex flex-col justify-center gap-10 lg:flex-row lg:gap-14">
          {/* MAIN CONTENT */}
          <main className="mx-auto w-full max-w-[720px] lg:mx-0">
            {/* Byline */}
            <div className="mb-10 flex flex-wrap items-center gap-6 border-b border-white/5 pb-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-narmax-cyan to-blue-600 flex items-center justify-center text-black font-black text-sm">N</div>
                <div>
                  <p className="text-xs font-bold text-zinc-400">Written by</p>
                  <p className="text-sm font-black text-white">Narmax Editorial</p>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-xs font-bold text-zinc-400">Published</p>
                <p className="text-sm font-black text-white">{fmt(article.release_date)}</p>
              </div>
              {article.vote_count > 0 && (
                <>
                  <div className="h-8 w-px bg-white/10" />
                  <div>
                    <p className="text-xs font-bold text-zinc-400">Audience Rating</p>
                    <p className="text-sm font-black text-white">{article.vote_average?.toFixed(1)} / 10 <span className="text-zinc-500">({article.vote_count?.toLocaleString()} votes)</span></p>
                  </div>
                </>
              )}
            </div>

            {/* Article Body */}
            <div className="space-y-8 text-base leading-relaxed">
              <p className="text-xl text-zinc-200 first-letter:float-left first-letter:mr-3 first-letter:text-6xl first-letter:font-black first-letter:text-narmax-cyan first-letter:leading-none">
                {article.overview}
              </p>

              {(directors.length > 0 || writers.length > 0 || creators.length > 0) && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-6">
                  <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-narmax-cyan">Behind the Camera</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {directors.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-zinc-500 mb-1">Director</p>
                        {directors.map((d) => <p key={d} className="text-sm font-semibold text-white">{d}</p>)}
                      </div>
                    )}
                    {writers.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-zinc-500 mb-1">Screenplay</p>
                        {writers.map((w) => <p key={w} className="text-sm font-semibold text-white">{w}</p>)}
                      </div>
                    )}
                    {creators.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-zinc-500 mb-1">Created By</p>
                        {creators.map((c) => <p key={c} className="text-sm font-semibold text-white">{c}</p>)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <p className="text-zinc-400 text-lg">
                The entertainment industry continues to take notice as <strong className="text-white">{article.title}</strong> solidifies
                its position as one of the most anticipated {mediaType === 'tv' ? 'series' : 'releases'} in recent memory.
                Industry insiders confirm the production team spared no expense, bringing together an exceptional cast and
                creative talent to deliver a landmark cinematic experience.
              </p>

              <div className="py-6">
                <AdSlot format="infeed" slotId="news-inline-1" />
              </div>

              {/* Production Info Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
                  <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-narmax-cyan">Production Details</h3>
                  <ul className="space-y-2.5 text-sm">
                    {companies.length > 0 && (
                      <li className="flex justify-between gap-4">
                        <span className="text-zinc-500 shrink-0">Studio</span>
                        <span className="text-zinc-200 text-right">{companies.join(', ')}</span>
                      </li>
                    )}
                    {article.original_language && (
                      <li className="flex justify-between">
                        <span className="text-zinc-500">Language</span>
                        <span className="text-zinc-200">{article.original_language.toUpperCase()}</span>
                      </li>
                    )}
                    {article.status && (
                      <li className="flex justify-between">
                        <span className="text-zinc-500">Status</span>
                        <span className="text-zinc-200">{article.status}</span>
                      </li>
                    )}
                    {budget && (
                      <li className="flex justify-between">
                        <span className="text-zinc-500">Budget</span>
                        <span className="text-zinc-200">{budget}</span>
                      </li>
                    )}
                    {revenue && (
                      <li className="flex justify-between">
                        <span className="text-zinc-500">Box Office</span>
                        <span className="text-green-400 font-bold">{revenue}</span>
                      </li>
                    )}
                  </ul>
                </div>

                {article.cast?.length > 0 && (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
                    <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-narmax-cyan">Key Cast</h3>
                    <div className="flex flex-wrap gap-2">
                      {article.cast.slice(0, 8).map((c) => (
                        <Link key={c.id} to={`/person/${c.id}`}
                          className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-1.5 transition hover:border-white/20 hover:bg-white/10">
                          {c.profile_path && (
                            <img src={c.profile_path} alt="" className="h-6 w-6 rounded-full object-cover" />
                          )}
                          <span className="text-xs font-semibold text-zinc-200">{c.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Full Cast Strip */}
              {article.cast?.length > 0 && (
                <div>
                  <h3 className="mb-5 text-lg font-black text-white">Full Cast</h3>
                  <div className="flex gap-4 overflow-x-auto pb-3">
                    {article.cast.map((c) => (
                      <Link key={c.id} to={`/person/${c.id}`} className="shrink-0 w-24 group text-center">
                        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2 ring-1 ring-white/10 group-hover:ring-narmax-cyan/40 transition">
                          {c.profile_path ? (
                            <img src={c.profile_path} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-lg">?</div>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-zinc-200 line-clamp-1 group-hover:text-white transition">{c.name}</p>
                        {c.character && <p className="text-[10px] text-zinc-500 line-clamp-1">{c.character}</p>}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Release Timeline */}
              {year && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-6">
                  <h3 className="mb-5 text-xs font-black uppercase tracking-widest text-narmax-cyan">Release Timeline</h3>
                  <div className="relative pl-6">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />
                    {[
                      { label: 'Announced', date: `${Number(year) - 1}`, done: true },
                      { label: 'Production Started', date: `Early ${year}`, done: true },
                      { label: mediaType === 'tv' ? 'Series Premiered' : 'Theatrical Release', date: fmt(article.release_date), done: true },
                      ...(seasons > 1 ? [{ label: `Season ${seasons} Renewal`, date: 'Confirmed', done: true }] : []),
                    ].map((step, i) => (
                      <div key={i} className="relative mb-5 last:mb-0">
                        <div className="absolute -left-[1.15rem] top-1 h-3 w-3 rounded-full border-2 border-narmax-cyan bg-black" />
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{step.date}</p>
                        <p className="text-sm font-semibold text-white mt-0.5">{step.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-zinc-400">
                Critics and audiences alike have rallied around <strong className="text-white">{article.title}</strong>,
                citing its bold storytelling and top-tier performances. The production has quickly become a cultural touchstone,
                sparking widespread discussion across social platforms and earning recognition from industry award circuits.
              </p>
            </div>

            {/* Social Reactions */}
            <div className="mt-12 border-t border-white/5 pt-10">
              <h2 className="mb-5 text-xl font-black text-white">Audience Reactions</h2>
              <div className="flex flex-wrap gap-3">
                {reactions.map((r, i) => (
                  <button key={r.emoji} type="button" onClick={() => toggleReaction(i)}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all ${
                      r.active ? 'border-narmax-cyan bg-narmax-cyan/10 text-narmax-cyan scale-105' : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25 hover:bg-white/[0.06]'
                    }`}>
                    <span className="text-lg">{r.emoji}</span>
                    <span>{r.label}</span>
                    <span className={`text-xs ${r.active ? 'text-narmax-cyan' : 'text-zinc-500'}`}>{r.count.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div className="mt-14 border-t border-white/5 pt-10">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Discussion</h2>
                <span className="rounded-full bg-white/5 px-4 py-1.5 text-xs font-bold text-zinc-400">{comments.length} Comments</span>
              </div>

              {user ? (
                <form onSubmit={postComment} className="mb-10">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition focus-within:border-narmax-cyan focus-within:bg-white/[0.05]">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your thoughts on this story..."
                      className="w-full bg-transparent p-5 text-sm outline-none placeholder:text-zinc-600"
                      rows={4}
                    />
                    <div className="flex items-center justify-between border-t border-white/5 bg-black/20 px-5 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Keep it respectful</p>
                      <button type="submit" disabled={busy || !commentText.trim()}
                        className="rounded-xl bg-white px-6 py-2 text-xs font-black text-black transition hover:bg-narmax-cyan disabled:opacity-30">
                        {busy ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mb-10 rounded-2xl border border-dashed border-white/10 p-10 text-center">
                  <p className="text-zinc-500">
                    <Link to="/login" className="font-bold text-white hover:text-narmax-cyan">Sign In</Link> to join the conversation.
                  </p>
                </div>
              )}

              <ThreadedComments
                flatComments={comments}
                user={user}
                tmdbId={tmdbId}
                mediaType={mediaType}
                movieMeta={{ title: article.title }}
                onRefresh={fetchComments}
              />
            </div>
          </main>

          {/* SIDEBAR */}
          <aside className="mx-auto w-full max-w-[340px] shrink-0 space-y-8 lg:mx-0">
            {/* Sidebar Ad */}
            <div className="sticky top-24">
              <AdSlot format="sidebar" slotId="news-sidebar-1" className="mb-8" />
              
              {/* Poster */}
              {article.poster_path && (
                <div className="overflow-hidden rounded-2xl shadow-2xl mb-8">
                  <img src={article.poster_path} alt="" className="w-full object-cover" />
                </div>
              )}

              {/* Watch CTA */}
              <div className="rounded-2xl border border-narmax-cyan/20 bg-narmax-cyan/5 p-6">
                <h3 className="mb-2 text-sm font-black text-white">Ready to Watch?</h3>
                <p className="mb-4 text-xs text-zinc-400">Stream now on Narmax in full HD.</p>
                <Link to={mediaType === 'tv' ? `/watch/${tmdbId}?type=tv&season=1&episode=1` : `/watch/${tmdbId}`}
                  className="block w-full rounded-xl bg-white py-3 text-center text-sm font-black text-black transition hover:bg-narmax-cyan">
                  ▶ Play Now
                </Link>
                <Link to={mediaType === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`}
                  className="mt-2 block w-full rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-white/10">
                  More Info
                </Link>
              </div>
            </div>

            {/* Related News */}
            {related.length > 0 && (
              <div>
                <h3 className="mb-5 text-xs font-black uppercase tracking-widest text-narmax-cyan">Related Stories</h3>
                <div className="space-y-3">
                  {related.map((r) => (
                    <Link key={r.id} to={`/news/newsPicks-${r.id}${mediaType === 'tv' ? '-tv' : ''}`}
                      className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.05]">
                      {(r.backdrop_path || r.poster_path) && (
                        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                          <img src={r.backdrop_path || r.poster_path} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs font-semibold text-zinc-200 group-hover:text-white transition">{r.title || r.name}</p>
                        <p className="mt-1 text-[10px] text-zinc-500">{String(r.release_date || r.first_air_date || '').slice(0, 4)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Facts */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-narmax-cyan">Quick Facts</h3>
              <ul className="space-y-2.5 text-sm">
                {year && <li className="flex justify-between"><span className="text-zinc-500">Year</span><span className="text-zinc-200">{year}</span></li>}
                {runtime && <li className="flex justify-between"><span className="text-zinc-500">Runtime</span><span className="text-zinc-200">{runtime}</span></li>}
                {article.vote_average > 0 && <li className="flex justify-between"><span className="text-zinc-500">Rating</span><span className="text-green-400 font-bold">{article.vote_average?.toFixed(1)}/10</span></li>}
                {article.genres?.length > 0 && (
                  <li className="flex justify-between gap-3">
                    <span className="text-zinc-500 shrink-0">Genres</span>
                    <span className="text-zinc-200 text-right">{article.genres.slice(0,3).map(g=>g.name).join(', ')}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Newsletter Widget */}
            <div className="rounded-2xl bg-gradient-to-br from-narmax-cyan/15 to-blue-600/15 p-6 border border-white/5">
              <h3 className="text-base font-black text-white">Weekly Newsletter</h3>
              <p className="mt-1.5 text-xs text-zinc-400">Get the best entertainment news delivered weekly.</p>
              <input type="email" placeholder="Your email" className="mt-5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-zinc-600 focus:border-narmax-cyan" />
              <button className="mt-2.5 w-full rounded-xl bg-white py-2.5 text-sm font-black text-black transition hover:bg-narmax-cyan">Subscribe</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
