# KHADMATONA — Project Rules & Development Guide

> Authoritative engineering guide for the KHADMATONA backend. Every contributor (human or AI)
> is expected to read this before opening a pull request. Where this document and personal
> preference disagree, this document wins — open a PR against it if you think it's wrong.

**Status:** MVP foundation complete (Core layer + module skeletons). Property/Lead/Lookup/Settings
business logic is the next implementation phase.

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Architecture Principles](#2-architecture-principles)
3. [Modular Monolith Rules](#3-modular-monolith-rules)
4. [Clean Architecture Rules](#4-clean-architecture-rules)
5. [Repository Pattern](#5-repository-pattern)
6. [Service Layer](#6-service-layer)
7. [Coding Standards (PSR-12)](#7-coding-standards-psr-12)
8. [Folder Structure](#8-folder-structure)
9. [Naming Conventions](#9-naming-conventions)
10. [API Conventions](#10-api-conventions)
11. [Validation Rules](#11-validation-rules)
12. [Authorization Rules](#12-authorization-rules)
13. [Database Conventions](#13-database-conventions)
14. [Migration Rules](#14-migration-rules)
15. [Seeder Rules](#15-seeder-rules)
16. [Testing Strategy](#16-testing-strategy)
17. [Git Workflow](#17-git-workflow)
18. [Branch Naming](#18-branch-naming)
19. [Conventional Commits](#19-conventional-commits)
20. [Code Review Checklist](#20-code-review-checklist)
21. [Performance Rules](#21-performance-rules)
22. [Security Rules](#22-security-rules)
23. [Logging Rules](#23-logging-rules)
24. [Error Handling](#24-error-handling)
25. [Documentation Requirements](#25-documentation-requirements)
26. [Do's and Don'ts](#26-dos-and-donts)

---

## 1. Project Vision

KHADMATONA GROUP is building one Moroccan digital ecosystem, delivered in phases, that will
eventually merge three businesses under one platform:

| Phase | Product | Status |
|---|---|---|
| MVP | Premium real-estate showcase site + admin back-office | In development |
| Phase 2 | IMMO ERP & CRM (50 modules: owners, contracts, finance, HR, rentals, Airbnb, AI, BI, ...) | Planned |
| Phase 3 | Artisans & Home Services Marketplace (24 trades, quoting, ratings, emergency dispatch) | Planned |

**The single most important engineering constraint on this project**: every decision made for
the MVP must not require rework when Phase 2/3 modules are added. This is why the codebase is a
**modular monolith** with strict module isolation from day one, even though only four business
modules exist today. See `PROJECT_RULES.md §3` and the architecture blueprint for the full
rationale.

---

## 2. Architecture Principles

- **API-first / headless.** Laravel is a REST API only. There is no server-rendered public
  website in this repository — the public site, admin back-office, and future
  client/owner/artisan portals are independent front-end clients of `/api/v1`.
- **Modular monolith, not microservices.** One deployable unit, one database, strict internal
  module boundaries — see §3. Microservice extraction is a future *option*, not a current goal.
- **Clean Architecture, pragmatically applied.** Dependencies point inward
  (Presentation → Application → Domain ← Infrastructure). Eloquent models double as domain
  entities rather than hand-rolled POPOs — see §4 for the reasoning.
- **Core over duplication.** Cross-cutting concerns (auth, permissions, i18n, theming, media,
  notifications, activity logging) live once in `app/Core/` and are reused by every module,
  never reimplemented per module.
- **Every architectural decision must be justified and documented**, not just applied. If you
  deviate from this document, say why in the PR description.

---

## 3. Modular Monolith Rules

- One business domain = one folder under `app/Modules/{ModuleName}/`.
- A module owns its own `Domain/`, `Application/`, `Infrastructure/`, `Http/`, `Database/`
  (migrations, seeders, factories), `Tests/`, and one `{Module}ServiceProvider`.
- **Business modules must never import another business module's classes directly** — no
  `use App\Modules\Lead\...` inside `app/Modules/Property/...` and vice versa. Cross-module
  communication happens only through:
  1. **Domain Events** (a module fires an event, another module's listener reacts to it),
  2. **Core-published contracts** (a model implements a Core interface like `Translatable` or
     a future `Notifiable` contract to plug into shared services),
  3. **Shared polymorphic tables** (`media`, `translations`, permissions).
- `bootstrap/providers.php` is the single, reviewable manifest of every Core capability and
  every module that exists in the system. Adding a module means adding one line here — nothing
  else should need to change.
- Route registration convention: each module's `Http/routes.php` is `require`d directly from
  `routes/api.php` (not via `loadRoutesFrom()` in the provider), so it inherits the `api/v1`
  prefix and `api` middleware group configured once in `bootstrap/app.php`. Each module's
  `ServiceProvider::boot()` still calls `loadMigrationsFrom()` for its own migrations.

---

## 4. Clean Architecture Rules

| Layer | Lives in | Responsibility |
|---|---|---|
| **Domain** | `{Module}/Domain/` | Eloquent models (as entities), Enums, Value Objects, Repository *interfaces*, Domain Events. Zero outward dependencies. |
| **Application** | `{Module}/Application/` | Services / single-purpose Actions. Orchestrates use cases, opens transaction boundaries, fires events. Depends on Domain interfaces only. |
| **Infrastructure** | `{Module}/Infrastructure/` | Repository *implementations* (Eloquent), external adapters (storage, mail, payment, search). Implements Domain interfaces. |
| **Presentation** | `{Module}/Http/` | Controllers, Form Requests, API Resources, routes. Talks to Application only. |

Rules:
- Dependencies point **inward only**. Infrastructure implements Domain contracts; Application
  depends on those contracts (Dependency Inversion); Presentation depends on Application.
- Controllers never touch Eloquent directly, never contain business rules, never call
  Infrastructure classes.
- Business-rule validation (*"can this happen"*) lives in Application services, not in Form
  Requests (which only validate *"is this input well-formed"*) and not in the database.
- A class method defined directly on a model **always overrides** a trait's method of the same
  name (standard PHP behavior) — this is how modules override Core defaults like
  `App\Core\Media\Concerns\HasMediaConversions::registerMediaConversions()` when they need
  different image conversions.

---

## 5. Repository Pattern

- Interface: `{Module}/Domain/Contracts/{Entity}RepositoryInterface.php`.
- Implementation: `{Module}/Infrastructure/Repositories/Eloquent{Entity}Repository.php`.
- Both are bound together in the module's own `ServiceProvider::register()` — never in a
  shared/global provider.
- Every concrete repository extends `App\Core\Support\Repositories\BaseRepository`, which
  implements `App\Core\Support\Contracts\RepositoryInterface` (`find`, `findOrFail`,
  `paginate`, `create`, `update`, `delete`). Modules only add their own domain-specific query
  methods (e.g. `findPublishedByFilters()`), never re-implement the CRUD basics.
- One repository per **aggregate root**, not per table (e.g. a `PropertyRepository` manages a
  Property and its images together; there is no standalone `PropertyImageRepository`).
- Repositories own eager-loading strategy per use case (`findForListing()` vs. `findForEdit()`)
  to prevent N+1 queries by design.
- Repositories **never** contain authorization checks, business rules, or response formatting.

---

## 6. Service Layer

- Business logic lives in **Services** (module-level coordinators) composed of single-purpose
  **Action** classes for discrete use cases (e.g. `PublishPropertyAction`,
  `CreateVisitRequestAction`).
- A module with no business logic beyond CRUD does **not** need an empty Service class for
  symmetry — use the repository directly from the controller. `App\Core\Support\Services\BaseService`
  is available but optional.
- Transaction boundaries (`DB::transaction`) belong in the Service/Action layer, never in
  controllers or repositories.
- Side effects that are not required to answer the HTTP request (email, SMS, WhatsApp,
  search-index sync, media conversion) are expressed as a **Domain Event → Listener → queued
  Job**, never a direct synchronous call from the Service.

---

## 7. Coding Standards (PSR-12)

- **PSR-12** enforced via Laravel Pint (`vendor/bin/pint` / `./vendor/bin/sail pint`). Run it
  before every commit; CI rejects unformatted code.
- **PSR-4** autoloading — `App\Core\...` and `App\Modules\{Name}\...` both resolve under the
  existing `"App\\": "app/"` mapping. No new Composer autoload entries are needed per module.
- Type-hint everything: parameters, return types, property types. Use PHP 8.4 features
  (native enums, readonly properties, first-class callable syntax) where they improve clarity.
- Prefer constructor property promotion for DTOs and simple value objects.
- No `@mixed` / untyped arrays where a DTO or Enum would be clearer.

---

## 8. Folder Structure

```
backend/
├─ app/
│  ├─ Core/                     # cross-cutting, shared by every module
│  │  ├─ Auth/
│  │  ├─ Permissions/
│  │  ├─ Localization/
│  │  ├─ Theme/                 # (preference column only — no dedicated code yet)
│  │  ├─ Media/
│  │  ├─ Notification/
│  │  ├─ ActivityLog/
│  │  └─ Support/               # BaseRepository, BaseService, ApiResponse, QueryFilters
│  ├─ Modules/
│  │  ├─ Property/               # MVP
│  │  ├─ Lead/                   # MVP
│  │  ├─ Lookup/                 # MVP
│  │  ├─ Settings/                # MVP
│  │  └─ (CRM, Finance, Rental, Marketplace, ... — future phases)
│  ├─ Models/User.php
│  └─ Providers/AppServiceProvider.php
├─ bootstrap/
│  ├─ app.php                    # middleware stack, exception handling, apiPrefix
│  └─ providers.php               # the manifest of every Core + Module provider
├─ config/
├─ database/                     # only truly shared tables + seeders entrypoint
├─ lang/{ar,fr,en}/               # per-locale, per-module translation files
├─ routes/api.php                # requires each module's Http/routes.php
└─ tests/
```

Each module internally mirrors:
```
{Module}/
├─ Domain/Contracts/            # Repository interfaces, Enums
├─ Application/                 # Services, Actions, DTOs
├─ Infrastructure/Repositories/ # Eloquent repository implementations
├─ Http/
│  ├─ Controllers/
│  └─ routes.php
├─ Database/{Migrations,Seeders,Factories}/
├─ Tests/
└─ {Module}ServiceProvider.php
```

---

## 9. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Classes | PascalCase | `PropertyRepository`, `CreateVisitRequestAction` |
| Methods / variables | camelCase | `findPublishedByFilters()` |
| Database tables | snake_case, plural | `properties`, `visit_requests` |
| Model classes | PascalCase, singular | `Property`, `VisitRequest` |
| Foreign keys | `{singular}_id` | `property_id` |
| Pivot tables | alphabetized singulars | `artisan_category` |
| Polymorphic columns | `{name}_type` / `{name}_id` | `mediable_type` / `mediable_id`* |
| Routes (URLs) | kebab-case, plural resource names | `/api/v1/visit-requests` |
| Route names | dot notation | `properties.index` |
| Repository interfaces | `{Entity}RepositoryInterface` | `PropertyRepositoryInterface` |
| Repository implementations | `Eloquent{Entity}Repository` | `EloquentPropertyRepository` |
| Form Requests | `{Verb}{Entity}Request` | `StorePropertyRequest` |
| API Resources | `{Entity}Resource` / `{Entity}Collection` | `PropertyResource` |

\* **Approved deviation:** the Core Media module uses `spatie/laravel-medialibrary`, whose
`media` table hard-codes `model_type` / `model_id` rather than `mediable_type` / `mediable_id`.
This is accepted deliberately (see `CLAUDE.md`) rather than patching the package internals.

---

## 10. API Conventions

- All endpoints are versioned under `/api/v1` (configured once via `apiPrefix` in
  `bootstrap/app.php` — never hard-code a version prefix in a route file).
- **Success envelope** (`App\Core\Support\Http\ApiResponse::success()`):
  ```json
  { "success": true, "data": { ... }, "meta": { ... } }
  ```
- **Error envelope** (`ApiResponse::error()`):
  ```json
  { "success": false, "message": "...", "errors": { ... }, "code": "validation_error" }
  ```
- Standard HTTP status codes: `200` OK, `201` Created, `204` No Content, `401` Unauthenticated,
  `403` Forbidden, `404` Not Found, `409` Conflict, `422` Validation error, `429` Throttled,
  `500` Server error.
- **Pagination**: length-aware pagination by default; cursor pagination reserved for
  high-volume listings (property search, future artisan search).
- **Filtering / Sorting / Searching**: every listable resource extends
  `App\Core\Support\QueryFilters\BaseQueryFilter`, declaring an explicit allow-list of filters,
  sorts, and includes. Never accept arbitrary column names from the query string.
- **Authentication**: Laravel Sanctum — SPA cookie/session flow for first-party web clients,
  Personal Access Tokens (scoped abilities) for mobile apps and third-party integrations.

---

## 11. Validation Rules

- All input is validated through **Form Requests** — controllers never call `$request->validate()`
  inline.
- Form Requests validate shape/format only (required, type, max length, format). Business rules
  ("can this actually happen given current state") belong in the Application layer.
- Every filterable/sortable/searchable field is **allow-listed**, never blacklisted.
- File uploads: validate MIME type **and** magic bytes (not extension alone), enforce size
  limits server-side, never trust client-declared content type.
- Phone numbers: Moroccan format (`+212` or local `0`-prefixed). Money/budget fields: positive
  integers stored as cents, never floats.

---

## 12. Authorization Rules

- **Roles & Permissions**: `spatie/laravel-permission`, seeded today with a single `Admin` role
  (`App\Core\Permissions\Database\Seeders\PermissionSeeder`). Future roles (Agent, Owner,
  Client, Artisan, ...) are added as **data**, never as new code paths.
- **Policies**: one per entity (`PropertyPolicy`, `LeadPolicy`, ...), checked via
  `$this->authorize()` in controllers or Form Requests — never an inline
  `if ($user->role === 'admin')` check anywhere in the codebase.
- **Gates**: reserved for coarse, non-model checks (`access-admin-panel`). Registered in
  `App\Core\Permissions\CorePermissionsServiceProvider`.
- `Gate::before` grants `Admin` every permission implicitly — new permissions never require a
  matching Admin grant in the seeder.
- Authorization is **always** re-checked server-side. A hidden UI button is not a security
  control.

---

## 13. Database Conventions

- snake_case, plural table names; singular model class names.
- Money stored as **integer cents**, never floats.
- Soft deletes on business-critical entities (properties, contracts, artisans, ...).
- Every foreign key indexed; composite indexes on common filter combinations
  (`city_id + district_id + status`).
- Lookup/reference tables (cities, districts, property types, future artisan categories) are
  admin-manageable and translation-linked from day one.
- Dynamic, user-entered translatable content (property descriptions, category names) is stored
  in the shared polymorphic `translations` table
  (`App\Core\Localization\Models\Translation` / `HasTranslations` trait) — **never** per-model
  JSON columns. Static UI strings live in `lang/{locale}/{module}.php`.
- No stored procedures or triggers — keeps a future read-replica (for Reporting/BI) a routine
  addition rather than a redesign.

---

## 14. Migration Rules

- Every module owns its migrations under its own `{Module}/Database/Migrations/` folder,
  loaded via `$this->loadMigrationsFrom()` in that module's `ServiceProvider::boot()`. The root
  `database/migrations/` folder is reserved for genuinely framework/Core-shared tables only.
- One migration = one logical change. Do not bundle unrelated schema changes into a single
  migration file.
- Every migration must have a correct, reversible `down()` method.
- Never edit a migration that has already been merged to `main` — write a new migration to
  amend it instead.
- Name migrations descriptively: `create_{table}_table`, `add_{column}_to_{table}_table`.

---

## 15. Seeder Rules

- Each module's seeders live in `{Module}/Database/Seeders/` and are called from the root
  `database/seeders/DatabaseSeeder.php` via `$this->call(...)`.
- Seeders must be **idempotent** — safe to run multiple times (`findOrCreate`, `updateOrCreate`,
  `firstOrCreate`), never raw `create()` calls that would duplicate rows on re-run.
- **Do not use the `WithoutModelEvents` trait** on any seeder that touches
  `spatie/laravel-permission` models — that package invalidates its permission cache via model
  events, and suppressing events causes `PermissionDoesNotExist` failures against a stale
  cache. This is a documented, hard-won lesson from this project's own bootstrap — see
  `App\Core\Permissions\Database\Seeders\PermissionSeeder` and `database/seeders/DatabaseSeeder.php`.
- Permission/role seeders must call
  `app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();` before
  creating anything.

---

## 16. Testing Strategy

- **Pest** is the test framework (installed alongside PHPUnit, which Pest runs on top of as its
  engine — do not attempt to remove `phpunit/phpunit`, it is a real dependency of
  `nunomaduro/collision` and Pest itself).
- Tests mirror the module structure: `{Module}/Tests/` for module-specific tests,
  root `tests/Feature` and `tests/Unit` for cross-module/Core tests.
- **Unit tests** cover Application-layer business rules against mocked Repository interfaces
  (no database hit required).
- **Feature tests** cover HTTP endpoints end-to-end against a real (test) database.
- Every new business rule ships with a test. Every bug fix ships with a regression test.
- Run before every push: `php artisan test` (or `sail artisan test` if using Sail directly).

---

## 17. Git Workflow

- `main` is the protected, always-deployable branch. No direct pushes — all changes land via
  pull request.
- Create a feature branch off `main` for every piece of work (see §18 for naming).
- Keep PRs small and scoped to one module or one concern where possible — a bundled PR across
  unrelated modules makes review and rollback harder.
- Rebase (not merge) your feature branch on `main` before requesting review, to keep history
  linear and readable.
- Squash-merge to `main` once approved, with a Conventional Commit message (§19) summarizing
  the whole change.
- Never force-push to `main`. Never use `--no-verify` to bypass hooks.

---

## 18. Branch Naming

Format: `type/short-description`, all lowercase, hyphen-separated.

| Type | Use for |
|---|---|
| `feature/` | New functionality (e.g. `feature/property-crud`) |
| `fix/` | Bug fixes (e.g. `fix/lead-status-transition`) |
| `refactor/` | Non-behavioral code changes |
| `docs/` | Documentation-only changes |
| `chore/` | Tooling, dependencies, config |
| `test/` | Test-only additions/fixes |

---

## 19. Conventional Commits

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
[optional footer]
```

| Type | Meaning |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Build process, tooling, dependency bumps |

**Examples:**
```
feat(property): add publish/unpublish workflow
fix(lead): prevent visit requests for unpublished properties
docs(readme): document Docker setup for new contributors
refactor(support): extract QueryFilter allow-list to a trait
```

---

## 20. Code Review Checklist

Before approving any PR, confirm:

- [ ] No business logic in controllers.
- [ ] No direct Eloquent queries outside a Repository.
- [ ] No cross-module class imports (only Events / Core contracts / shared tables).
- [ ] New endpoints follow the `ApiResponse` envelope and are under `/api/v1`.
- [ ] New filterable/sortable fields are explicitly allow-listed.
- [ ] New migrations live under the correct module's `Database/Migrations/` and have a working
      `down()`.
- [ ] New seeders are idempotent and don't use `WithoutModelEvents` with permission models.
- [ ] New user-facing strings are translatable (added to `lang/{locale}/{module}.php` or the
      `translations` table, for all three locales where practical).
- [ ] New Policies/Gates used for anything permission-sensitive — no inline role checks.
- [ ] Tests added/updated and passing (`php artisan test`).
- [ ] Pint passes with no formatting diffs.
- [ ] No secrets, credentials, or `.env` values committed.

---

## 21. Performance Rules

- Every list endpoint is paginated — never return an unbounded collection.
- Repositories declare explicit, named eager-loading methods per use case
  (`findPublishedWithGallery()`) — no incidental N+1 queries.
- Anything not required to answer the HTTP request synchronously (email, SMS, WhatsApp, image
  conversion, search indexing) is dispatched as a **queued Job**, never run inline.
- Cache reference/lookup data (cities, districts, categories) with tag-based invalidation on
  admin edits — never leave hot, rarely-changing queries unc ached.
- Media conversions (`App\Core\Media\Concerns\HasMediaConversions`) are queued by default —
  do not make them synchronous without a specific reason.

---

## 22. Security Rules

- All input validated server-side via Form Requests — client-side validation is UX only, never
  a security boundary.
- All authorization checks server-side via Policies/Gates.
- Rate-limit public, unauthenticated endpoints (lead/visit-request submission) more strictly
  than authenticated ones.
- File uploads: validate MIME + magic bytes, enforce size limits, store private/sensitive
  documents outside the public webroot behind signed URLs.
- Never use `DB::raw()` with unescaped user input.
- Never commit `.env`, API keys, or credentials — `backend/.env` is gitignored; keep it that
  way.
- Passwords: Argon2id/bcrypt hashing (Laravel default), never logged or included in any API
  response (`User::$hidden` already excludes `password`).

---

## 23. Logging Rules

- Model changes on any entity that matters for audit/compliance use
  `App\Core\ActivityLog\Concerns\LogsAllChanges` (already applied to `User`), which logs only
  fillable, only-dirty attributes and skips no-op saves.
- Application logs use Laravel's standard `Log` facade with the configured `stack` channel —
  do not introduce a second logging mechanism.
- Never log secrets, passwords, tokens, or full request payloads containing PII.
- Log at the right level: `debug` for development detail, `info` for normal business events,
  `warning` for recoverable problems, `error`/`critical` for failures needing attention.

---

## 24. Error Handling

- All exception-to-response mapping happens centrally in `bootstrap/app.php`'s
  `withExceptions()` — do not add ad-hoc `try/catch` → manual JSON response in controllers.
- `ValidationException` → `422` with field errors; `AuthenticationException` → `401`;
  `AuthorizationException` → `403`; `ModelNotFoundException` / `NotFoundHttpException` → `404`;
  anything else (in production, debug mode off) → generic `500` — never leak stack traces to
  API clients outside local/debug environments.
- Domain-specific business-rule violations should throw a dedicated exception class (not a
  generic `Exception`) so the central handler — or a module-specific renderer — can map it to
  the correct HTTP status and error `code`.

---

## 25. Documentation Requirements

- Every new module gets a short section added to `README.md`'s Modules table once it has real
  endpoints.
- Every non-obvious architectural decision (a package choice, a deliberate deviation from a
  convention) gets a one-line comment at the point of deviation, explaining *why* — see
  `config/media-library.php`'s `disk_name` change or `PropertyServiceProvider`'s routing
  comment for the expected style.
- Public API contracts (request/response shapes) should be discoverable from the codebase
  itself (Form Requests + API Resources) — avoid separate, driftable API documentation unless
  the team adopts an OpenAPI generator.
- This file (`PROJECT_RULES.md`) is updated in the same PR that changes the convention it
  documents — never let it drift from reality.

---

## 26. Do's and Don'ts

### Do
- Do keep controllers thin — one Form Request in, one Service/Repository call, one Resource out.
- Do put every cross-cutting concern in `app/Core/` and reuse it.
- Do write the `down()` method for every migration.
- Do add translations for every new user-facing string, in all three locales where practical.
- Do use Enums for status/state fields instead of magic strings.
- Do ask "does this belong in Core, or is it module-specific?" before writing a new shared
  helper.

### Don't
- Don't import one business module's classes from inside another.
- Don't put business logic in a controller, model boot method, or migration.
- Don't bypass the Repository layer with direct `Model::where(...)` calls in a Service or
  Controller.
- Don't hard-code role checks (`if ($user->role === 'admin')`) — use Policies/Gates.
- Don't use `WithoutModelEvents` in any seeder touching permission/role models.
- Don't introduce a new dependency when Core already solves the problem (check `app/Core/`
  first).
- Don't commit `.env`, secrets, or generated caches/vendor directories.
- Don't force-push or bypass hooks on `main`.
