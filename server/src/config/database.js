import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..', '..');
const dbPath = process.env.DATABASE_PATH
  ? path.isAbsolute(process.env.DATABASE_PATH)
    ? process.env.DATABASE_PATH
    : path.join(rootDir, process.env.DATABASE_PATH)
  : path.join(rootDir, 'database', 'narmax.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

export function initSchema() {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT '/uploads/default-avatar.svg',
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      image TEXT,
      video_url TEXT,
      rating REAL DEFAULT 0,
      tmdb_id INTEGER,
      media_type TEXT NOT NULL DEFAULT 'movie',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tmdb_id, media_type)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      UNIQUE(user_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS kids_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      access_code TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      movie_id INTEGER NOT NULL,
      watched_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      UNIQUE(user_id, movie_id)
    );

    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_comments_movie ON comments(movie_id);
    CREATE INDEX IF NOT EXISTS idx_watch_user ON watch_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_movies_tmdb ON movies(tmdb_id);

    CREATE TABLE IF NOT EXISTS comment_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      vote INTEGER NOT NULL CHECK(vote IN (-1, 1)),
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(comment_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

    CREATE TABLE IF NOT EXISTS liked_cast (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      cast_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      profile_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, cast_id)
    );
    CREATE INDEX IF NOT EXISTS idx_liked_cast_user ON liked_cast(user_id);
  `);
  migrateMoviesColumns();
  migrateCommentsAndWatch();
}

function migrateMoviesColumns() {
  const cols = db.prepare('PRAGMA table_info(movies)').all();
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('media_type')) {
    try {
      db.exec("ALTER TABLE movies ADD COLUMN media_type TEXT NOT NULL DEFAULT 'movie'");
    } catch (e) {
      console.warn('movies.media_type migration skipped:', e.message);
    }
  }
}

function migrateCommentsAndWatch() {
  const ccols = db.prepare('PRAGMA table_info(comments)').all();
  const cnames = new Set(ccols.map((c) => c.name));
  if (!cnames.has('parent_id')) {
    try {
      db.exec('ALTER TABLE comments ADD COLUMN parent_id INTEGER');
    } catch (e) {
      console.warn('comments.parent_id migration skipped:', e.message);
    }
  }

  const wcols = db.prepare('PRAGMA table_info(watch_history)').all();
  const wnames = new Set(wcols.map((c) => c.name));
  if (!wnames.has('progress_percent')) {
    try {
      db.exec('ALTER TABLE watch_history ADD COLUMN progress_percent REAL NOT NULL DEFAULT 0');
    } catch (e) {
      console.warn('watch_history.progress_percent migration skipped:', e.message);
    }
  }
  if (!wnames.has('completed')) {
    try {
      db.exec('ALTER TABLE watch_history ADD COLUMN completed INTEGER NOT NULL DEFAULT 0');
    } catch (e) {
      console.warn('watch_history.completed migration skipped:', e.message);
    }
  }
}

export { db };
