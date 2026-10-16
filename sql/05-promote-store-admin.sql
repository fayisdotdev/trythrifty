-- Feature: Manually promote an existing registered account
-- Run only after the person has signed up and confirmed their email.
-- Replace the address below with the exact email used for their trythrifty account.

update public.trythrifty_profiles as profile
set role = 'admin',
    updated_at = now()
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('replace-with-your-admin-email@example.com')
returning profile.id, profile.email, profile.role;

-- A returned row confirms the promotion. No returned rows means the account has
-- not signed up yet or the email does not match. Re-run this module afterwards.
