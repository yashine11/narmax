import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import api from '../api/client.js';

const TABS = [
  { key: 'movie', label: 'Movie Industry', shortTag: 'Movies' },
  { key: 'tv', label: 'TV Show News', shortTag: 'TV' },
  { key: 'anime', label: 'Anime Updates', shortTag: 'Anime' },
];

const BUCKET_LABELS = {
  newsPicks: 'Industry Update',
  trendingTrailers: 'Trailer Spotlight',
  upcomingReleases: 'Release Announcement',
};

function fallbackDate(index = 0) {
  const d = new Date(Date.now() - index * 86400000);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateValue) {
  const date = new Date(String(dateValue || ''));
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function toArticles(rows, section, tabTag) {
  const mediaType = section === 'tv' ? 'tv' : 'movie';

  const packs = [
    { key: 'newsPicks', items: rows.newsPicks || [] },
    { key: 'trendingTrailers', items: rows.trendingTrailers || [] },
    { key: 'upcomingReleases', items: rows.upcomingReleases || [] },
  ];

  return packs.flatMap((pack) =>
    pack.items.slice(0, 10).map((item, index) => ({
      id: `${pack.key}-${item.id}`,
      tmdbId: item.id,
      title: item.title,
      overview: item.overview || 'No summary available yet.',
      image: item.backdrop_path || item.poster_path || null,
      mediaType,
      href: `/news/${pack.key}-${item.id}${mediaType === 'tv' ? '-tv' : ''}`,
      bucket: pack.key,
      category: BUCKET_LABELS[pack.key],
      publishedAt: item.release_date || item.first_air_date || fallbackDate(index),
      tags: [tabTag, BUCKET_LABELS[pack.key], Number(item.vote_average || 0) >= 8 ? 'Top 10' : 'Watch Now'],
    }))
  );
}

function NewsCard({ article, featured = false, compact = false }) {
  if (featured) {
    return (
      <Link
        to={article.href}
        className="group relative flex h-[500px] w-full flex-col justify-end overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl transition duration-500 hover:border-white/20"
      >
        <div className="absolute inset-0">
          {article.image ? (
            <img src={article.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-zinc-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>
        <div className="relative z-10 p-8 sm:p-12 lg:w-2/3">
           <div className="mb-4 flex gap-2">
             {article.tags.map(tag => (
               <span key={tag} className="rounded-md bg-narmax-cyan px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-black">{tag}</span>
             ))}
           </div>
           <h2 className="text-4xl font-black leading-[1.1] text-white sm:text-5xl lg:text-6xl">{article.title}</h2>
           <p className="mt-4 line-clamp-2 text-lg text-zinc-300">{article.overview}</p>
           <div className="mt-6 flex items-center gap-4">
              <span className="h-1 w-12 bg-narmax-cyan" />
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{formatDate(article.publishedAt)}</p>
           </div>
        </div>
      </Link>
    );
  }

  if (compact) {
    return (
      <Link to={article.href} className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition hover:bg-white/5">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
           <img src={article.image} alt="" className="h-full w-full object-cover transition group-hover:scale-110" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-narmax-cyan uppercase tracking-widest">{article.category}</p>
          <h4 className="mt-1 line-clamp-2 text-sm font-bold text-zinc-100 group-hover:text-white">{article.title}</h4>
        </div>
      </Link>
    );
  }

  return (
    <Link to={article.href} className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/[0.02] transition hover:border-white/10 hover:bg-white/[0.04]">
      <div className="relative aspect-video overflow-hidden">
        <img src={article.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" loading="lazy" />
        <div className="absolute left-4 top-4 rounded-lg bg-black/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
           {article.category}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{formatDate(article.publishedAt)}</p>
        <h3 className="mt-2 text-xl font-black leading-snug text-white group-hover:text-narmax-cyan transition-colors">{article.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-400">{article.overview}</p>
        <div className="mt-auto pt-6">
           <span className="text-[11px] font-bold text-white uppercase tracking-widest group-hover:underline">Read Story</span>
        </div>
      </div>
    </Link>
  );
}

export default function NewsPage() {
  const [section, setSection] = useState('movie');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState({ newsPicks: [], trendingTrailers: [], upcomingReleases: [] });
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSubscribed(true);
    toast.success('Thank you for subscribing to Narmax News!');
    setNewsletterEmail('');
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    api
      .get('/api/tmdb/news-hub', { params: { section }, timeout: 35000 })
      .then((response) => {
        if (cancelled) return;
        setRows({
          newsPicks: response.data.newsPicks || [],
          trendingTrailers: response.data.trendingTrailers || [],
          upcomingReleases: response.data.upcomingReleases || [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setRows({ newsPicks: [], trendingTrailers: [], upcomingReleases: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [section]);

  const activeTab = useMemo(() => TABS.find((tab) => tab.key === section) || TABS[0], [section]);
  const articles = useMemo(() => toArticles(rows, section, activeTab.shortTag), [activeTab.shortTag, rows, section]);
  const featured = articles[0] || null;
  const popular = articles.slice(1, 6);
  const feed = articles.slice(6);

  return (
    <div className="min-h-screen bg-black pb-20 pt-10">
      <Helmet>
        <title>News &amp; Industry Updates — NARMAX</title>
        <meta name="description" content="Read breaking entertainment news, trailer spotlights, and upcoming releases on NARMAX." />
      </Helmet>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-10">
        <header className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-narmax-cyan">Entertainment Magazine</p>
            <h1 className="mt-4 text-5xl font-black tracking-tighter text-white sm:text-7xl">The Hub</h1>
          </div>
          <div className="flex gap-2 rounded-2xl border border-white/5 bg-white/5 p-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSection(tab.key)}
                className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition ${section === tab.key ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                {tab.shortTag}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="space-y-12">
            <div className="h-[500px] rounded-[2rem] skeleton" />
            <div className="grid gap-8 lg:grid-cols-3">
               <div className="lg:col-span-2 grid gap-8 sm:grid-cols-2">
                  {[1,2,3,4].map(i => <div key={i} className="aspect-video rounded-3xl skeleton" />)}
               </div>
               <div className="space-y-4">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-2xl skeleton" />)}
               </div>
            </div>
          </div>
        ) : error ? (
           <div className="rounded-[3rem] border border-white/5 bg-white/[0.02] py-40 text-center">
              <p className="text-2xl font-black text-white">Something went wrong</p>
              <p className="mt-2 text-zinc-500">Failed to load the latest entertainment stories.</p>
           </div>
        ) : (
          <div className="space-y-16">
            {featured && <NewsCard article={featured} featured />}

            <div className="grid gap-12 lg:grid-cols-[1fr_350px]">
               <section>
                  <h2 className="mb-8 text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                     <span className="h-8 w-1.5 bg-narmax-cyan" />
                     Latest Stories
                  </h2>
                  <div className="grid gap-8 sm:grid-cols-2">
                    {feed.map(article => <NewsCard key={article.id} article={article} />)}
                  </div>
               </section>

               <aside>
                  <h2 className="mb-8 text-2xl font-black text-white uppercase tracking-tighter">Must Read</h2>
                  <div className="flex flex-col gap-4">
                     {popular.map(article => <NewsCard key={article.id} article={article} compact />)}
                  </div>
                  
                  <div className="mt-12 rounded-[2rem] bg-gradient-to-br from-narmax-cyan/20 to-blue-600/20 p-8 border border-white/5">
                     <h3 className="text-xl font-black text-white">Weekly Newsletter</h3>
                     <p className="mt-2 text-sm text-zinc-400">Get the best of Narmax News delivered to your inbox.</p>
                     {subscribed ? (
                       <div className="mt-6 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-center text-sm font-bold text-cyan-200">
                         ✓ You're subscribed to weekly updates!
                       </div>
                     ) : (
                       <form onSubmit={handleSubscribe} className="mt-6">
                         <input
                           type="email"
                           placeholder="Your email"
                           value={newsletterEmail}
                           onChange={(e) => setNewsletterEmail(e.target.value)}
                           className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-narmax-cyan"
                         />
                         <button type="submit" className="mt-3 w-full rounded-xl bg-white py-3 text-sm font-black text-black transition hover:brightness-90">
                           Subscribe
                         </button>
                       </form>
                     )}
                  </div>
               </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
