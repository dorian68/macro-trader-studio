-- Add the 'beta' plan type for super_user-governed beta-tester accounts.
--
-- This MUST live in its own migration: Postgres does not allow a freshly added
-- enum value to be *used* in the same transaction that adds it. Keeping the
-- ADD VALUE alone guarantees it is committed before the next migration
-- (20260616120100_*) references 'beta' in plan_parameters / triggers / RPCs.

ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'beta';
