# Bookshelf

A cozy **personal library** for book lovers, hosted at https://books.kinesis.world.
Log in with a simple username & password, build your own collection of shelves,
and organize your books just the way you like — reorder shelves vertically,
reorder the books on each shelf horizontally, and track when you started and
finished every read.

> **The entire platform is built on Kinesis API**
> (https://api.kinesis.world). Every backend feature — authentication, users,
> shelves, books, Google Books auto-fill and media uploads — is implemented by
> the Kinesis API, not by this repository. This project is purely the
> **frontend** that consumes it.
>
> The complete API **endpoints & logic, sample data, and reference material can
> be downloaded from the Kinesis API library**:
> https://api.kinesis.world/library.

The frontend is a static Astro site that talks directly to the Kinesis API from
the browser. It is intentionally **framework-agnostic about the backend**: the
API base URL is loaded from `.env` at build time, so the same build works
against the local API during development and the production API when deployed.

---

## Architecture

```text
┌────────────────────────────┐         ┌────────────────────────────┐
│  Bookshelf (this repo)     │  HTTPS  │  Kinesis API               │
│  Static Astro + React      │ ──────► │  https://api.kinesis.world │
│  books.kinesis.world       │  (JWT)  │  /x/bookshelf/...          │
└────────────────────────────┘         └────────────────────────────┘
        │                                    │
        │  <img> (public media)              │  media storage, DB
        ▼                                    ▼
  Cover images, profile pics           POST /upload (public media)
```

- The browser calls the API directly with `Authorization: Bearer <jwt>`.
- Media uploads go to `POST /upload` on the API host (proxied same-origin in
  production so the API never needs CORS). **All Bookshelf media is public** —
  cover images and profile pictures render as plain `<img src="<origin>/<path>">`.

---

## Features

**Auth & account**

- Registration with a name, username and password (`POST /user/register`).
  Usernames are unique; passwords are hashed server-side and must be **8+
  characters with one lowercase, one uppercase, one number and one symbol**.
- Login returns a JWT (`POST /user/login`); the token is refreshed via
  `POST /user/login/jwt` on each visit so sessions don't die mid-read.
- Profile management (`PATCH /user/update`): update name, username, password or
  profile picture — by custom URL or by uploading an image.

**Shelves**

- Each user owns an ordered set of shelves, each with a name and description.
- Shelves can be **reordered vertically** (up/down) to match how you think.

**Books**

- Each shelf holds books that can be **reordered horizontally** (left/right).
- Books store title, author, summary, cover image, ISBN and read dates
  (started / finished), with an `Unread` / `Reading` / `Finished` badge.
- Add books **manually**, or **auto-fill the details by searching the Google
  Books API via ISBN** — cover, title, author and summary in one search.

**Reader-friendly UI**

- Three hand-tuned daisyUI themes — **Paper** (light), **Dusk** (dark) and
  **Sepia** (classic e-reader) — switched from the header and remembered across
  visits.
- Serif display & reading type (Fraunces + Lora), high-contrast ink on warm
  paper, and a layout that works beautifully on phones.

---

## Tech stack

- [Astro](https://astro.build) — static output, `src/pages/*` routes
- [React](https://react.dev) islands (`@astrojs/react`) for all interactive UI
- [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite`
- [daisyUI 5](https://daisyui.com) components with three custom themes

## How it integrates with Kinesis API

- **Base URL** — `PUBLIC_API_URL` (dev `http://localhost:8080/x/bookshelf/`,
  prod `https://api.kinesis.world/x/bookshelf/`) is inlined into the client at
  build time. All API calls go through `AppProvider`
  (`src/context/AppContext.tsx`), which exposes `api(path)`, `request(path,
  init)` (auto-attaches `Authorization: Bearer <jwt>`), `login`,
  `reauthenticate`, `logout`, `upload`, `mediaUrl` and `searchBook`.
- **Response envelope** — every route returns `{ status, message, ... }`; the
  body `status` is authoritative even when the HTTP status is 200. `request`
  throws an `ApiError` carrying the API `message` on any non-2xx body status.
- **Media** — images are uploaded to `POST /upload?security=PUBLIC&project_id=bookshelf`
  on the API host (not under `/x/bookshelf/`). All media is public and renders
  as `<origin>/<path>`; there is no private/stream endpoint.
- **Dev proxy** — in development the Vite server proxies `/x/bookshelf/*` and
  `/upload` to `http://localhost:8080`, so the browser never hits CORS. In
  production, nginx proxies `/upload` to `https://api.kinesis.world`.

### API routes used

| Area   | Routes                                                                                                                                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Auth   | `POST /user/register` · `POST /user/login` · `POST /user/login/jwt` (JWT)                                                              |
| User   | `GET /user/me` (JWT) · `PATCH /user/update` (JWT)                                                                                      |
| Shelves | `POST /shelf/create` · `PUT /shelf/update` · `DELETE /shelf/delete` · `GET /shelf/fetch` — all (JWT)                                   |
| Books  | `POST /book/create` · `PUT /book/update` · `DELETE /book/delete` · `GET /book/fetch` · `GET /book/search?isbn=…` (Google Books) — all (JWT) |
| Media  | `POST /upload` (public, `project_id=bookshelf`)                                                                                        |

> **Shelf & book routes** follow the same convention as the user routes
> (create/update/delete/fetch + a Google Books search by ISBN) and are
> centralized in `src/context/AppContext.tsx`, so the contract is trivial to
> adjust. The full endpoint logic and sample data are available from the Kinesis
> API library: **https://api.kinesis.world/library**.

### Auth flow

| Step | Request | Notes |
| ---- | ------- | ----- |
| Register | `POST /user/register` `{ name, username, password }` | Username unique, strong password |
| Login | `POST /user/login` `{ username, password }` | Returns `{ id, jwt }` |
| Re-auth | `POST /user/login/jwt` `{ id }` + Bearer | Refreshes the JWT on every visit |
| Profile | `GET /user/me?id=<id>` + Bearer | `password`/`reset_token`/OTP fields cleaned |
| Update | `PATCH /user/update` `{ id, property, value }` + Bearer | `name` · `username` · `password` · `profile_picture` |

---

## Getting started

```sh
bun install
cp .env.example .env   # point PUBLIC_API_URL at your Kinesis API
bun run dev            # http://localhost:4321
```

Background dev server:

```sh
bunx astro dev --background
bunx astro dev status
bunx astro dev logs
bunx astro dev stop
```

## Environment variables

| Variable               | Default                                | Purpose                                                                                                   |
| :--------------------- | :------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `PUBLIC_API_URL`       | `https://api.kinesis.world/x/bookshelf/` | Base URL of the Kinesis Bookshelf REST API (`/x/bookshelf/`). In dev, use the relative `/x/bookshelf/` (proxied) to avoid CORS. |
| `PUBLIC_MEDIA_ORIGIN`  | `http://localhost:8080`                | Origin for media URLs (`<origin>/<path>`), the API host without `/x/bookshelf/`.                         |
| `PUBLIC_UPLOAD_ORIGIN` | _(empty)_                              | Base for `POST /upload`. Empty in dev so uploads go through the proxy; `https://api.kinesis.world` in prod. |

## Commands

| Command            | Action                                     |
| :----------------- | :----------------------------------------- |
| `bun install`      | Install dependencies                       |
| `bun run dev`      | Start local dev server at `localhost:4321` |
| `bun run build`    | Build your production site to `./dist/`    |
| `bunx astro check` | Type-check the project                     |
| `bun run preview`  | Preview your build locally                 |

## Deploy

The site is hosted at https://books.kinesis.world behind Traefik. CI builds the
Docker image, pushes it to the Gitea registry and recreates the compose
service — see `.gitea/workflows/main.yml` for the pipeline and the Gitea
variables/secrets it requires. `nginx.conf.template` serves the static build
and proxies `/upload` to https://api.kinesis.world/upload (same-origin, so no
CORS).

## Project structure

```text
/
├── .gitea/workflows/main.yml   # Build + deploy pipeline
├── Dockerfile                  # Multi-stage build (bun → nginx)
├── docker-compose.yml          # Traefik service definition
├── nginx.conf.template         # envsubst-processed nginx config
├── public/favicon.svg          # Bookshelf favicon
├── src
│   ├── components
│   │   ├── Header.astro        # Logo, nav, theme toggle, mobile menu
│   │   ├── Footer.astro        # Footer + "Powered by Kinesis API"
│   │   └── react/              # All interactive islands:
│   │       ├── ThemeToggle.tsx, AuthNav.tsx, MobileMenu.tsx, HomeCTA.tsx,
│   │       │   ApiBadge.tsx, Skeleton.tsx, PasswordInput.tsx
│   │       ├── LoginForm.tsx, RegisterForm.tsx
│   │       ├── AccountPanel.tsx, EditProfile.tsx
│   │       ├── Library.tsx, ShelfRow.tsx, BookCard.tsx, AddBookModal.tsx
│   ├── context/AppContext.tsx  # API client, envelope parsing, auth session
│   ├── lib/                    # validation, dates, book helpers
│   ├── layouts/Layout.astro    # Theme bootstrap, fonts, meta
│   ├── styles/global.css       # Three daisyUI themes + base styles
│   └── pages/                  # index, login, register, account, library, 404
└── package.json
```