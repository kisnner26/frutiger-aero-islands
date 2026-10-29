# SQL authorization checks

Run `bash tests/sql/check.sh` from the repository root against a **disposable empty PostgreSQL database** using the usual PGHOST/PGUSER/PGPASSWORD/PGDATABASE variables. It creates roles, a test auth schema and fixtures; never use a production database.

The script replays every SQL migration in filename order, then tests required layout fields and authorization as the actual non-superuser roles `authenticated` and `anon`. It checks private resource reads through the owner-scoped RPC, rejects direct resource reads/writes, rejects direct island writes, rejects another owner's save and anonymous writes, and permits the owner's versioned save.

`auth.uid()` and `auth.users` are test substitutes. This checks the SQL and migrated grants in an isolated database; it does not validate Supabase JWT verification, deployed schema drift, Auth settings or production grants. `setup.sql` is retained only for the older focused single-function fixture and is not used by the full replay.
