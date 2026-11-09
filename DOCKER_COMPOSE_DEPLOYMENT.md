# Deploying KHADMATONA to Production with plain `docker compose` (Alternative)

**This is the alternative, manual deployment path.** [Coolify](https://coolify.io) (see
[`COOLIFY_DEPLOYMENT.md`](./COOLIFY_DEPLOYMENT.md)) is the recommended, primary production
deployment method — use it unless you have a specific reason not to run a management platform on
the VPS. Use this document instead if:

- You want full manual control over every container and don't want Coolify's management layer
  running on the server at all.
- The VPS is managed by infrastructure/ops tooling that already expects plain `docker compose`
  deployments (e.g. driven by your own CI/CD pipeline, Ansible, etc.).
- You're deploying somewhere Coolify doesn't fit well (very constrained resources, an existing
  server already running other unrelated services on ports 80/443 that you don't want Coolify's
  proxy taking over).

**Do not run this alongside a Coolify deployment on the same VPS.** This stack's `caddy` service
binds ports 80/443 directly on the host — the exact same ports Coolify's own Traefik proxy needs.
Pick one platform per VPS.

## Architecture

One `docker-compose.prod.yml` at the repo root, five services, all but `caddy` kept off the host
network entirely:

```
                    ┌────────────────────────────┐
  Internet ── 443 ──▶  caddy                      │
                    │  Let's Encrypt SSL, auto     │
                    └───────────┬────────────┬────┘
                                │            │
                    api.yourdomain.com   app.yourdomain.com
                                │            │
                    ┌───────────▼───┐  ┌─────▼──────────┐
                    │ backend        │  │ frontend        │
                    │ (nginx +       │  │ (Next.js        │
                    │  php-fpm +     │  │  standalone     │
                    │  queue-worker, │  │  server.js)     │
                    │  supervisord)  │  │                 │
                    └───┬────────┬───┘  └─────────────────┘
                        │        │
                  ┌─────▼──┐  ┌──▼─────┐
                  │ mysql   │  │ redis  │
                  └─────────┘  └────────┘
```

- **`caddy`** (`caddy:2-alpine`) — the only service publishing ports to the host (`80`/`443`).
  Reads `Caddyfile`, requests and renews Let's Encrypt certificates for `APP_DOMAIN`/`API_DOMAIN`
  automatically, reverse-proxies each domain to the matching internal service.
- **`backend`** — built from `backend/Dockerfile.prod`: nginx + php-fpm + a queue worker, all
  under `supervisord` (`backend/docker/supervisor/production.conf`) in one container. Same image
  used by the Coolify path — nothing compose-specific about the Dockerfile itself.
- **`frontend`** — built from `frontend/admin/Dockerfile.prod`: a Next.js standalone server.
- **`mysql`** (`mysql:8.4`) / **`redis`** (`redis:alpine`) — plain upstream images, each with a
  named volume and a healthcheck the `backend` service's `depends_on` waits on before starting.

## Prerequisites

Same as the Coolify path's [prerequisites](./COOLIFY_DEPLOYMENT.md#2-prerequisites) minus
Coolify itself:

- A VPS (2 vCPU / 4 GB RAM minimum) running Docker + the Docker Compose plugin. Install both
  yourself if the VPS is otherwise bare — this stack doesn't bootstrap Docker for you the way
  Coolify's installer does.
- Two DNS **A records** already pointing at the VPS before you run `up` —
  `api.yourdomain.com` and `app.yourdomain.com` — since Caddy's automatic HTTPS needs DNS to
  resolve before it can complete its ACME challenge.
- Real Cloudinary keys and SMTP credentials, same as the Coolify path.
- Ports **80** and **443** free on the VPS — nothing else (no other reverse proxy, no other
  webserver, no Coolify) already bound to them.

## One-time server setup

```bash
git clone https://github.com/Salma-Gader/KHADMATONA-.git
cd KHADMATONA-

cp .env.prod.example .env.prod
cp backend/.env.production.example backend/.env
```

Edit both files:

- **`.env.prod`** (repo root — consumed by `docker-compose.prod.yml` itself, mainly to
  provision the `mysql` service and tell Caddy which domains to request certificates for):
  ```
  APP_DOMAIN=app.yourdomain.com
  API_DOMAIN=api.yourdomain.com
  DB_DATABASE=khadmatona
  DB_USERNAME=khadmatona
  DB_PASSWORD=<generate a real password>
  DB_ROOT_PASSWORD=<generate a different real password>
  ```
- **`backend/.env`** (Laravel's own config — must match `.env.prod`'s DB credentials, since both
  files independently reference the same MySQL instance):
  ```
  APP_ENV=production
  APP_DEBUG=false
  APP_URL=https://api.yourdomain.com

  DB_HOST=mysql                       # the compose service name, not a real hostname to look up
  DB_DATABASE=khadmatona              # must match .env.prod
  DB_USERNAME=khadmatona              # must match .env.prod
  DB_PASSWORD=<same password as .env.prod's DB_PASSWORD>

  SESSION_DOMAIN=.yourdomain.com      # leading dot - shared across api./app. subdomains
  SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com
  FRONTEND_URL=https://app.yourdomain.com

  REDIS_HOST=redis                    # the compose service name

  MEDIA_DISK=cloudinary
  CLOUDINARY_CLOUD_NAME=<real value>
  CLOUDINARY_API_KEY=<real value>
  CLOUDINARY_API_SECRET=<real value>

  MAIL_HOST=<real SMTP host>
  MAIL_USERNAME=<real SMTP username>
  MAIL_PASSWORD=<real SMTP password>
  ```
  `backend/.env.production.example` has the full field list with comments — copy from there, not
  from the snippet above alone.

Unlike the Coolify path, `DB_HOST=mysql` and `REDIS_HOST=redis` really are correct here — those
are the literal Docker Compose service names in `docker-compose.prod.yml`, resolvable over the
internal `app` network this stack creates. (Under Coolify, by contrast, those hostnames are
Coolify-generated and almost never literally `mysql`/`redis` — the two guides intentionally
document different values for the same variables.)

Then bring the stack up and finish first-time setup:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml exec backend php artisan key:generate --force
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force
docker compose -f docker-compose.prod.yml exec backend php artisan db:seed --class="App\Core\Permissions\Database\Seeders\PermissionSeeder" --force
docker compose -f docker-compose.prod.yml exec backend php artisan storage:link
```

`key:generate --force` writes `APP_KEY` into the running container, not back into
`backend/.env` on disk automatically in every Docker setup — check the file after running it
(`grep APP_KEY backend/.env`) and make sure a real value landed there, since the next
`--build` rebuild only picks up what's actually in that file.

Caddy requests certificates for `APP_DOMAIN`/`API_DOMAIN` on first request — both domains' DNS
records must already resolve to the VPS before `up`, and ports 80/443 must be reachable from the
internet for the ACME HTTP-01 challenge to succeed.

## Queue worker and scheduler

The queue worker runs inside the `backend` container under `supervisord`, identically to the
Coolify path — see `backend/docker/supervisor/production.conf`. No extra compose service is
needed for it to work; check `docker compose -f docker-compose.prod.yml logs backend` and you
should see nginx, php-fpm, and periodic queue-worker log lines interleaved.

There's no scheduler service in `docker-compose.prod.yml` because nothing in
`backend/routes/console.php`/`backend/bootstrap/app.php` registers a scheduled command yet
(`routes/console.php` only defines `artisan inspire`). If you add one later, add a
`[program:scheduler]` block to `backend/docker/supervisor/production.conf` running
`php artisan schedule:work`, rebuild the backend image, and redeploy — there's no Coolify-style
UI to configure this from in the plain-compose path, it has to live in the image itself.

## Releasing updates

No zero-downtime guarantee — each `up --build` briefly restarts whichever services changed:

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force
```

Migrations are always a manual, explicit step — never run automatically on container start (see
`backend/docker/entrypoint.sh`) — so they never race across a restart or multiple replicas.

## Verification checklist

Same checks as the Coolify path:

- [ ] `curl -I https://api.yourdomain.com/up` → `200`
- [ ] `curl -I https://api.yourdomain.com/api/v1/i18n/fr` → `200`
- [ ] `curl -I https://app.yourdomain.com/login` → `200`
- [ ] `https://app.yourdomain.com/` renders real property data in a browser
- [ ] Login with the seeded Admin account succeeds and lands on `/dashboard`
- [ ] Creating a property with a cover image shows a real thumbnail shortly after upload
      (confirms Cloudinary + the queued conversion job + the queue worker all together)
- [ ] Both domains show a valid, browser-trusted HTTPS certificate
- [ ] `docker compose -f docker-compose.prod.yml ps` shows all five services `Up`
      (`caddy`, `backend`, `frontend`, `mysql`, `redis`), with `mysql`/`redis` `healthy`

## Troubleshooting

Most failure modes and fixes are identical to the Coolify path's
[troubleshooting section](./COOLIFY_DEPLOYMENT.md#14-troubleshooting) — `APP_KEY` handling, the
`public/storage` symlink, `SESSION_DOMAIN`/`SANCTUM_STATEFUL_DOMAINS`/cross-domain cookies,
Docker build failures (`ext-exif`, `public/storage` in the build context), and permission issues
are all the exact same underlying causes, since both paths build from the same
`backend/Dockerfile.prod` and `frontend/admin/Dockerfile.prod`. What's different here:

- **`DB_HOST`/`REDIS_HOST` connection errors** — in this stack they genuinely should be the
  literal strings `mysql`/`redis` (the compose service names). If you copied values from the
  Coolify guide instead (a generated hostname), connections will fail — use
  `backend/.env.production.example`'s values here, not `COOLIFY_DEPLOYMENT.md`'s.
- **Caddy never gets a certificate / `too many redirects` / connection refused on 443** — almost
  always DNS not pointing at the VPS yet, or something else already bound to port 80/443.
  Check with `docker compose -f docker-compose.prod.yml logs caddy` and
  `sudo ss -tlnp | grep -E ':80|:443'` on the host.
- **`.env.prod` and `backend/.env` credentials silently drift apart** — these are two separate
  files by design (see the comment in `.env.prod.example`), and nothing keeps them in sync
  automatically. If MySQL auth starts failing after someone edits one file, check that
  `DB_DATABASE`/`DB_USERNAME`/`DB_PASSWORD` still match between both.
- **A previous Coolify deployment is still running on the same VPS** — stop and remove it first
  (Coolify's own UI, or `docker ps` to find and stop its proxy/app containers) before bringing
  this stack up, or the two proxies will fail to bind 80/443 against each other.
