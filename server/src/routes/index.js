import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

import * as authController from '../controllers/authController.js';
import * as tmdbController from '../controllers/tmdbController.js';
import * as searchController from '../controllers/searchController.js';
import * as streamController from '../controllers/streamController.js';
import * as userController from '../controllers/userController.js';
import * as commentController from '../controllers/commentController.js';
import * as historyController from '../controllers/historyController.js';
import * as kidsController from '../controllers/kidsController.js';
import * as adminController from '../controllers/adminController.js';
import * as notificationController from '../controllers/notificationController.js';
import * as castController from '../controllers/castController.js';
import * as messageController from '../controllers/messageController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { requireKidsSession } from '../middleware/kidsAuth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    cb(null, safe);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Images only'));
    }
    cb(null, true);
  },
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  skip: (req) => /\/tmdb\//.test(req.originalUrl || req.url || ''),
});

const router = express.Router();
router.use(apiLimiter);

router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/login', authLimiter, authController.login);
router.get('/auth/google', authController.googleRedirect);
router.get('/auth/google/callback', authController.googleCallback);
router.get('/auth/discord', authController.discordRedirect);
router.get('/auth/discord/callback', authController.discordCallback);

router.get('/tmdb/home', optionalAuth, tmdbController.homeFeed);
router.get('/tmdb/hero', tmdbController.heroSlides);
router.get('/tmdb/movie/:tmdbId', tmdbController.movieDetails);
router.get('/tmdb/person/:personId', tmdbController.personDetail);
router.get('/tmdb/tv/genres', tmdbController.tvGenres);
router.get('/tmdb/tv/sections', tmdbController.tvSections);
router.get('/tmdb/tv/browse', tmdbController.tvBrowse);
router.get('/tmdb/tv/:tmdbId/season/:seasonNumber', tmdbController.tvSeason);
router.get('/tmdb/tv/:tmdbId', tmdbController.tvDetails);
router.get('/tmdb/tv', tmdbController.tvShows);
router.get('/tmdb/new', tmdbController.newReleases);
router.get('/tmdb/anime', tmdbController.animeBrowse);
router.get('/tmdb/languages', tmdbController.languages);
router.get('/tmdb/popular-hub', tmdbController.popularHub);
router.get('/tmdb/news-hub', tmdbController.newsHub);
router.get('/tmdb/preview/:mediaType/:tmdbId', tmdbController.mediaPreview);

router.get('/search', searchController.search);
router.get('/search/suggest', searchController.suggest);
router.get('/search/genres', searchController.genres);

router.get('/stream/embed', streamController.embedUrls);

router.get('/comments/movie/:movieId', optionalAuth, commentController.list);
router.get('/comments/tmdb/:tmdbId', optionalAuth, commentController.listByTmdb);
router.post('/comments', authenticate, commentController.create);
router.post('/comments/:id/react', authenticate, commentController.react);
router.delete('/comments/:id', authenticate, commentController.remove);

router.post('/kids/enter', kidsController.enter);
router.post('/kids/exit', kidsController.exitKids);
router.get('/kids/catalog', requireKidsSession, kidsController.kidsFeed);

router.get('/user/me', authenticate, userController.me);
router.patch('/user/me', authenticate, upload.single('avatar'), userController.updateMe);
router.post('/user/password', authenticate, userController.changePassword);
router.get('/user/favorites', authenticate, userController.listFavorites);
router.post('/user/favorites', authenticate, userController.addFavorite);
router.delete('/user/favorites/:movieId', authenticate, userController.removeFavorite);
router.get('/user/favorite-status', authenticate, userController.favoriteStatus);
router.post('/user/kids-pin', authenticate, kidsController.setCode);

router.get('/user/history', authenticate, historyController.list);
router.post('/user/history', authenticate, historyController.add);
router.get('/user/progress', authenticate, historyController.progressList);

router.get('/notifications', authenticate, notificationController.list);
router.patch('/notifications/:id', authenticate, notificationController.markAsRead);
router.delete('/notifications/:id', authenticate, notificationController.deleteOne);

router.get('/messages/conversations', authenticate, messageController.listConversations);
router.get('/messages/unread-count', authenticate, messageController.getUnreadCount);
router.get('/messages/search-users', authenticate, messageController.searchUsers);
router.get('/messages/:partnerId', authenticate, messageController.getConversation);
router.post('/messages', authenticate, messageController.sendMessage);

router.get('/cast/liked', authenticate, castController.listLiked);
router.post('/cast/toggle', authenticate, castController.toggleLike);
router.get('/cast/status', authenticate, castController.checkStatus);

router.post('/admin/kids-code', authenticate, requireAdmin, kidsController.setCode);

router.get('/admin/dashboard', authenticate, requireAdmin, adminController.dashboard);
router.get('/admin/movies', authenticate, requireAdmin, adminController.listMovies);
router.post('/admin/movies', authenticate, requireAdmin, upload.single('poster'), adminController.createMovie);
router.patch('/admin/movies/:id', authenticate, requireAdmin, upload.single('poster'), adminController.patchMovie);
router.delete('/admin/movies/:id', authenticate, requireAdmin, adminController.removeMovie);

router.get('/admin/users', authenticate, requireAdmin, adminController.listUsers);
router.patch('/admin/users/:id', authenticate, requireAdmin, upload.single('avatar'), adminController.patchUser);
router.delete('/admin/users/:id', authenticate, requireAdmin, adminController.removeUser);

router.get('/admin/comments', authenticate, requireAdmin, adminController.listComments);
router.delete('/admin/comments/:id', authenticate, requireAdmin, adminController.removeComment);

router.post('/admin/broadcast', authenticate, requireAdmin, adminController.broadcastMessage);

export default router;
