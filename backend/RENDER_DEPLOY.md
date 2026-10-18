# Render backend deployment

## Database preparation

The web service validates the database schema at startup (`JPA_DDL_AUTO=validate`).
It must not perform potentially slow or locking `ALTER TABLE` operations while
Render waits for its HTTP port.

- For an **empty database**, import `backend/schema.sql` using your MySQL client.
  That file creates and selects `unlearnarc`; if your provider requires another
  database name, adjust both database statements before importing.
- For an **existing database**, back it up and apply the outstanding migrations
  in `backend/migrations` in order, checking their instructions. The fresh-install
  script does not upgrade existing tables. If validation reports a remaining
  mismatch, review and apply a targeted migration before redeploying.
- Point `DATABASE_URL` at the prepared database, with the provider's required TLS
  options. Do not change production to `create` or `create-drop`: these can
  destroy existing data.

## Render settings

Use the repository's `render.yaml` Blueprint, or configure an existing service:

- Runtime: Docker; root directory: `backend`; Dockerfile: `./Dockerfile`.
- Let Render supply `PORT`. Spring uses it and binds to `0.0.0.0`.
- Set `JPA_DDL_AUTO=validate` and `JPA_SHOW_SQL=false` in the Render dashboard.
  Existing manually configured services may retain their previous values even
  after repository changes; verify the live environment explicitly.
- Health check path: `/api/v1/auth/health` (public, no token required).
- Supply all database, authentication, OAuth, and frontend URL variables listed
  in `backend/.env.example`. Keep credentials in Render, not in Git.

## Diagnosing a port-scan timeout

`Hibernate: alter table ...` is schema-update output, not a port-binding error.
Repeated alterations can delay startup, especially on a remote database or when
DDL waits for database locks. The excerpt alone cannot establish the exact cause.

After redeploying, confirm both `Tomcat started on port ...` and
`Started UnlearnArcApplication` appear, then request `/api/v1/auth/health`.
If startup still fails:

1. Capture the full startup log, including the first exception and its `Caused by`
   chain. A schema-validation error means a database migration is still required.
2. Check database connectivity, TLS settings, privileges, and outstanding DDL
   locks using your database provider's tools. Do not terminate database sessions
   without reviewing their work.
3. Check Render memory/CPU metrics and logs for an out-of-memory termination.
   Consider a larger instance only if resource measurements support it.

Changing the health-check path or exposing a Docker port does not fix a Spring
application that has not finished initialising.
