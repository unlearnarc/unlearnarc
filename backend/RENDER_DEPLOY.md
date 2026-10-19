# Render backend deployment

## Local runtime class-loading failures

Use `./dev.sh --no-attach` to start the development stack. The backend runs with
`-Dapp.build.directory=target-dev`, separate from the IDE and normal Maven test
output in `target`. Do not run `clean` against the active server's output directory.
Deleting/replacing loaded classes can cause `ClassNotFoundException`,
`ClassFormatError`, or `NoClassDefFoundError` and API 500s until the backend is
restarted. This can affect catalog DTOs and mappings, enrollments, roadmaps,
contests, and test history as well as profile/leaderboard APIs. A JVM that has
already failed to load a class must be restarted; recompiling alone is not enough.

Confirm the backend process classpath contains `backend/target-dev/classes`, not
`backend/target/classes`. After starting the isolated server, verify the affected
routes with a student login. Run populated-data API regression tests separately:

```sh
cd backend
./mvnw -Dapp.build.directory=target-api-regression -Dtest=StudentEndpointsIT test
``` After changing this setting, restart the dev stack
once so the backend uses the isolated output. Production uses the packaged JAR.

## Database preparation

The backend defaults to `JPA_DDL_AUTO=update`: Hibernate creates missing entity
tables, columns and constraints during startup. This includes the profile-sharing
and rank-alert fields from V13 and the Web Push tables from V12. Existing accounts
remain private; nullable rank acknowledgements are initialized on first use.
Hibernate does not execute the numbered SQL files or perform SQL-only data backfills.

- For an **existing database**, back it up before deploying schema changes.
  No manual V13 SQL is needed when startup updates are enabled. Do not apply
  V13's `ADD COLUMN` statements again after Hibernate has created the columns.
- For an **empty database**, Hibernate creates the mapped tables. Alternatively,
  import `backend/schema.sql` using your MySQL client; adjust its database name
  statements if your provider requires a different name.
- Review SQL-only migrations and data repairs separately; these are not handled
  by Hibernate schema updates.
- Point `DATABASE_URL` at the database with the provider's required TLS options.
  The database user needs schema-alteration privileges for startup updates.
  Never use production `create` or `create-drop`: these can destroy existing data.

Schema updates can be slow or wait for database locks, delaying Render's port
check. For deployments that must avoid startup DDL, explicitly set
`JPA_DDL_AUTO=validate` and apply outstanding migrations separately before deploying.

## Render settings

Use the repository's `render.yaml` Blueprint, or configure an existing service:

- Runtime: Docker; root directory: `backend`; Dockerfile: `./Dockerfile`.
- Let Render supply `PORT`. Spring uses it and binds to `0.0.0.0`.
- Set `JPA_DDL_AUTO=update` and `JPA_SHOW_SQL=false` in the Render dashboard.
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
