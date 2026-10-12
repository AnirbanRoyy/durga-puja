-- Musical chair categories: kids (17 or under), men and women (18+). Additive only.
-- Gender is private, next to age; a round belongs to the category being played.

alter table public.registration_contacts
    add column if not exists gender text check (gender in ('male', 'female'));

alter table public.musical_chair_rounds
    add column if not exists category text check (category in ('kids', 'men', 'women'));
