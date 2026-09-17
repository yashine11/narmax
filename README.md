# NARMAX

Full-stack Netflix-style streaming web app: **React (Vite) + Tailwind + Axios** frontend, **Node.js + Express** backend, **SQLite** database, **JWT** authentication, **TMDB** catalog with caching, admin panel, kids mode, and embed-based playback with multi-source fallback.

## Prerequisites

- **Node.js 22.5+** (the API uses the built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) module — no native SQLite npm addon).
- npm 10+

## Quick start

1. **Clone or copy** this project and open the root folder (`NARMA`).

2. **Install dependencies** (root, server, and client):

   ```bash
   npm run install:all
   ```

3. **Configure environment**

   - Copy `server/.env.example` to `server/.env` if you do not already have one.
   - Set `TMDB_API_KEY` to your [TMDB](https://www.themoviedb.org/settings/api) API key (v3).
   - Set a long random `JWT_SECRET` for production.
   - Adjust `CLIENT_URL` to your frontend origin (default `http://localhost:5173`).

   The SQLite file path defaults to `database/narmax.db` under the project root (see `DATABASE_PATH`).

4. **Run in development** (API + Vite with proxy):

   ```bash
   npm run dev
   ```

   - Frontend: [http://localhost:5173](http://localhost:5173)
   - API: [http://localhost:5000](http://localhost:5000)

5. **Production-ish run**

   ```bash
   cd client && npm run build
   cd ../server && npm start
   ```

   Serve the `client/dist` folder with a static host or put it behind nginx; set `VITE_API_URL` at build time to your public API URL if the client is not proxied.

## Default accounts (development)

After the first API start, the database is created and seeded if empty:

- **Admin:** email from `ADMIN_EMAIL` (default `admin@narmax.local`), password from `ADMIN_PASSWORD` (default `ChangeMeAdmin123!`).
- **Kids mode:** PIN from `KIDS_DEFAULT_CODE` (default `1234`), hashed in the `kids_access` table. Admins can change it from the Admin → Kids code tab.

Change these immediately in production.

## Project layout

| Path | Role |
|------|------|
| `client/` | Vite + React + Tailwind UI |
| `server/` | Express API (MVC-style: routes, controllers, models, services) |
| `database/` | SQLite file location (`narmax.db`) |

## API highlights

- `GET /api/tmdb/home` — trending, popular, top rated, genre rows (cached).
- `GET /api/tmdb/movie/:tmdbId`, `GET /api/tmdb/tv/:tmdbId` — details + trailer.
- `GET /api/search`, `GET /api/search/suggest`, `GET /api/search/genres`.
- `GET /api/stream/embed?tmdbId=&type=movie|tv` — ordered embed URLs (vidsrc / moviesapi-style sources) for iframe fallback on the client.
- JWT-protected: favorites, watch history, profile, comments, admin routes.
- Kids: `POST /api/kids/enter`, `GET /api/kids/catalog` (requires kids JWT), `POST /api/kids/exit`.

## Security notes

- Do **not** commit real `.env` files or TMDB keys to public repositories.
- Rotate any API keys that were shared in chat or docs.
- Use HTTPS, strong `JWT_SECRET`, and rate limiting at the edge in production.

## Third-party content

Metadata and artwork come from **TMDB**. Video playback uses **third-party embeds**; availability and terms depend on those providers. This project is a demo UI and is not affiliated with Netflix or TMDB.
