import { Navigate, Route, Routes } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout.jsx';
import KidsShell from './components/kids/KidsShell.jsx';
import Home from './pages/Home.jsx';
import MovieDetail from './pages/MovieDetail.jsx';
import TvDetail from './pages/TvDetail.jsx';
import Person from './pages/Person.jsx';
import Search from './pages/Search.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Profile from './pages/Profile.jsx';
import MyList from './pages/MyList.jsx';
import TVShowsPage from './pages/TVShowsPage.jsx';
import MoviesBrowsePage from './pages/MoviesBrowsePage.jsx';
import AnimeBrowsePage from './pages/AnimeBrowsePage.jsx';
import PopularPage from './pages/PopularPage.jsx';
import NewsPage from './pages/NewsPage.jsx';
import NewsArticle from './pages/NewsArticle.jsx';
import KidsGate from './pages/KidsGate.jsx';
import KidsBrowse from './pages/KidsBrowse.jsx';
import Admin from './pages/Admin.jsx';
import Messages from './pages/Messages.jsx';
import Watch from './pages/Watch.jsx';
import NotFound from './pages/NotFound.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/tv/:id" element={<TvDetail />} />
        <Route path="/person/:id" element={<Person />} />
        <Route path="/search" element={<Search />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-list" element={<MyList />} />
        <Route path="/tv" element={<TVShowsPage />} />
        <Route path="/movies" element={<MoviesBrowsePage />} />
        <Route path="/anime" element={<AnimeBrowsePage />} />
        <Route path="/popular" element={<PopularPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:id" element={<NewsArticle />} />
        <Route path="/new" element={<Navigate to="/popular" replace />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/kids/*" element={<KidsShell />}>
        <Route index element={<KidsGate />} />
        <Route path="browse" element={<KidsBrowse />} />
        <Route path="movie/:id" element={<MovieDetail />} />
        <Route path="watch/:id" element={<Watch />} />
      </Route>

      <Route path="/watch/:id" element={<Watch />} />
    </Routes>
    <Analytics />
  </>
  );
}
