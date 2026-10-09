-- Lets a participant manage their own registration without an account:
--  * edit_token_hash: sha256 of a secret kept in the participant's browser cookie
--  * claim_key: the Redis key that stopped repeat sign-ups, so withdrawing frees it again
alter table public.registration_contacts
    add column if not exists edit_token_hash text,
    add column if not exists claim_key text;
