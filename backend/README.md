# KHADMATONA — Backend API

This is the Laravel 12 REST API for the KHADMATONA GROUP platform.

**Project-level documentation lives at the repository root, not here:**

- [`../README.md`](../README.md) — full project overview, features, installation, Docker setup,
  environment variables, migrations, tests, modules, and API overview.
- [`../PROJECT_RULES.md`](../PROJECT_RULES.md) — the engineering guide: architecture rules,
  coding standards, conventions, and the code review checklist. Read this before contributing.

## Quick Start

```bash
cp .env.example .env
docker compose -f compose.yaml up -d
docker compose -f compose.yaml exec laravel.test php artisan migrate:fresh --seed
docker compose -f compose.yaml exec laravel.test php artisan test
```

See the root README for the full walkthrough, including why `docker compose` is used directly
instead of `./vendor/bin/sail` on this setup.
