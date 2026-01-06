# Git Backend (git-repo-be)

Lightweight Node.js + TypeScript backend that syncs GitHub data (organizations, repositories, commits, pull requests, issues, issue changelogs, and users) into MongoDB and exposes REST APIs used by a separate frontend. The service handles OAuth with GitHub, stores integration records, performs incremental syncs (and full resyncs), and serves data/metadata for client consumption.

## Highlights / Purpose

- Implements GitHub OAuth exchange and stores integration records (access tokens, provider metadata).
- Fetches and persists GitHub organizations, repos, commits, pull requests, issues and issue events into MongoDB.
- Exposes management endpoints to view integration details, trigger syncs, resync (clear and re-sync), and remove integrations and related data.
- Provides data query endpoints used by the frontend for collection listing, field discovery, paginated reads and global search.
- Built with Express, TypeScript, Mongoose, and Axios (for GitHub API requests).
- Dockerfile present for containerized builds.

## Tech stack

- Node.js (Dockerfile uses node:22-alpine)
- TypeScript
- Express
- Mongoose (MongoDB)
- Axios
- dotenv (configuration)
- Dev tooling: ts-node, nodemon, TypeScript compiler

## Repo layout (important files)

- app.ts — application entrypoint (Express app, route mounting, CORS, MongoDB connection, graceful shutdown)
- package.json / package-lock.json — scripts and dependencies
- Dockerfile — multi-stage build producing production image
- routes/
  - auth.ts — OAuth and callback endpoints
  - integration.ts — integration management endpoints (get details, delete, resync)
  - github.ts — trigger GitHub sync
  - data.ts — collection & data endpoints used by frontend
- controllers/ — implementations for route handlers:
  - authController.ts — get auth url, handle OAuth callback, get integration status
  - integrationController.ts — get integration details, remove integration, resync
  - githubController.ts — performs the main data sync flow (organizations -> repos -> commits/prs/issues/events -> users)
  - dataController.ts — data retrieval and search (collections, fields, records)
- models/ — Mongoose schemas and models (Integration, Organization, Repository, Commit, PullRequest, Issue, IssueChangelog, User). Many models include text and compound indexes used for efficient searches and queries.
- helpers/
  - oauth.ts — builds GitHub auth URL and exchanges code for access token
  - github.ts — functions that call GitHub API endpoints (get organizations, repos, commits, PRs, issues, events, members, etc.)
- scripts/ — maintenance/fix scripts for DB cleanup or index fixes
- .env expected (not included in repo) — environment configuration

## API surface (paths are mounted under /api)

Note: app.ts mounts routes under `/api`, so combine `/api` with routes below.

Auth / OAuth
- GET  /api/auth/auth-url
  - Response: { authUrl: string } — URL to redirect user to GitHub OAuth consent
- POST /api/auth/callback
  - Body: { code: string } — exchange code for access token, create/update Integration
  - Response: { success: true, message, integration: { id, userId, provider, connectedAt, status, githubUser } }
- GET  /api/auth/status?userId=<id>
  - Returns integration status and integration metadata (without tokens)

Integration management
- GET    /api/integration/:integrationId
  - Returns integration metadata and data counts per collection
- DELETE /api/integration/:integrationId
  - Removes integration record and deletes related collections (runs in DB transaction)
  - Response includes deletedDocuments and counts per collection
- POST   /api/integration/:integrationId/resync
  - Clears synced collections (keeps integration record) and sets up for fresh sync

Sync operations
- POST /api/github/sync/:integrationId
  - Triggers GitHub data sync for the given integration. Sync flow:
    - Fetch user organizations
    - For each organization: upsert Organization document
    - For each repo in organization: upsert Repository and fetch commits, PRs, issues (bulkWrite used)
    - For issues: fetch issue events and upsert IssueChangelog entries
    - Fetch and upsert organization members as User documents
  - Response: { success: true, message, stats: { organizations, repositories, commits, pullRequests, issues, issueChangelogs, users } }

Data endpoints (used by frontend)
- GET  /api/data/collections
  - Returns names of stored collections available to view
- GET  /api/data/collections/:collectionName/fields
  - Returns inferred fields/field types for dynamic column generation in frontend grid
- GET  /api/data/collections/:collectionName
  - Returns paginated data (query params expected — the frontend may send page, pageSize, sort/filter models)
- POST /api/data/search
  - Global search across collections (text indices configured on many models)

(Confirm exact request/response shapes against the dataController implementation if you need stricter contract docs.)

## Models & Data shape (summary)

Primary persisted entities (Mongoose models):
- Integration — userId, provider, accessToken, refreshToken, connectedAt, lastSyncedAt, status, githubUser
- Organization — githubId, login, name, description, stats
- Repository — githubId, name, full_name, description, owner, counts, language
- Commit — sha, message, author/committer, stats, parents
- PullRequest — number, title, state, body, merged, user, commits/additions/deletions
- Issue — number, title, state, body, user, labels, assignees, comments
- IssueChangelog — events for issues (label changes, assignees, renames, commits, etc.)
- User — organization members with bio, public_repos, followers, etc.

Indexes:
- Many collections include both single-field and text indexes for fast queries and global search (e.g. Repository text index on name/full_name/description, Issue and PullRequest text indexes on title/body, User text index on login/name/bio, etc.). IntegrationId and repositoryId are commonly indexed for query scoping.

## Configuration / Environment variables

Common environment variables referenced in the code:
- PORT — HTTP port (app.ts default: 3000)
- MONGODB_URI — MongoDB connection URI (app.ts default: mongodb://localhost:27017/integrations)
- FRONTEND_URL — allowed CORS origin (defaults to http://localhost:4200)
- GITHUB_CLIENT_ID — GitHub app client ID
- GITHUB_CLIENT_SECRET — GitHub app client secret
- GITHUB_CALLBACK_URL — frontend callback URL used to build redirect (defaults to http://localhost:4200/auth/github/callback)
- NODE_ENV, other standard env vars as needed

Ensure a .env with at least the GitHub credentials and MONGODB_URI for local development.

## Running locally

Prerequisites:
- Node (compatible with dependencies)
- MongoDB (local or remote)
- A GitHub OAuth App (client id & secret) with redirect URI set to your frontend callback

Install
```bash
npm ci
```

Development (live-reload)
```bash
npm run dev
# uses nodemon and ts-node to run app.ts directly
```

Build + Run (production-like)
```bash
npm run build
npm start
# start runs node dist/app.js
```

Docker (build image and run)
```bash
# build (Dockerfile is multi-stage)
docker build -t git-backend:latest .

# run (example)
docker run -e MONGODB_URI="mongodb://host:27017/integrations" \
  -e GITHUB_CLIENT_ID="..." -e GITHUB_CLIENT_SECRET="..." \
  -e FRONTEND_URL="http://localhost:4200" \
  -p 3000:3001 \
  git-backend:latest
```

Note: The Dockerfile exposes port `3001` in the image, while the app default PORT is `3000`. When running in containers, ensure PORT is set consistently (or map host port to the container's exposed port appropriately).

## Security & operational notes

- Access tokens are persisted on Integration documents (accessToken, refreshToken). Keep the database secure and limit access.
- The code exposes and uses GitHub tokens to make API calls — ensure rate limits are handled by the helper functions and consider adding backoff/retry and pagination handling for very large orgs.
- Bulk writes are used for commits/PRs/issues — monitor memory/throughput for very large datasets.
- Sync workflows use sequential loops with setImmediate yields to avoid event loop blocking; consider queuing or background workers (e.g., job queue) for improved scalability.
- Remove/Resync operations run inside MongoDB sessions/transactions — use a replica set for transactions to work correctly.

## Troubleshooting & tips

- If the server fails to connect to MongoDB, verify MONGODB_URI and that MongoDB is reachable.
- If OAuth fails, check GITHUB_CLIENT_ID/SECRET and that the GitHub app redirect URI matches the frontend callback.
- If syncs time out or partial data appears, confirm GitHub API rate limits and inspect logs printed by the sync controller (the controller logs progress and catches errors per repo/step).
- When deleting or resyncing large integrations, allow sufficient time for DB transactions and ensure MongoDB storage and performance are adequate.

## Observations & potential improvements

- Add pagination and rate-limit handling inside helpers/github to manage very large orgs and avoid API throttling.
- Provide explicit API schema docs (OpenAPI/Swagger) for frontend/back-end contract clarity.
- Add automated tests for controllers and helpers, plus integration tests for the sync flow.
- Add health/readiness endpoints and metrics for observability.
- Consider rotating/storing tokens securely (e.g., encrypted fields or secrets manager) for production usage.
- Use job queue (BullMQ / RabbitMQ) to offload long-running sync jobs and allow retries and status tracking.

## Where to look next in the code

- app.ts — application startup, route mounting, CORS config
- controllers/githubController.ts — main sync logic and detailed per-entity upserts
- helpers/oauth.ts & helpers/github.ts — OAuth exchange & GitHub API wrappers
- models/ — schema definitions and indexes for each collection
- routes/ — REST surface consumed by the frontend

---
