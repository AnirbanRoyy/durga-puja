-- Starter data. Safe to edit later from the admin portal.
-- Dates follow the Bengal calendar for 2026 (Mahalaya 10 Oct, Shashthi 16 Oct, Saptami 17–18 Oct → Dashami 21 Oct).

insert into public.settings (key, value) values
    ('event', '{
        "name_en": "Sarbojanin Durgotsav",
        "name_bn": "সর্বজনীন দুর্গোৎসব",
        "mahalaya": "2026-10-10T04:00:00+05:30",
        "shashthi": "2026-10-16T00:00:00+05:30",
        "dashami": "2026-10-21T23:59:00+05:30",
        "venue": "Community Pandal"
    }'),
    ('donation', '{
        "qr_image_url": null,
        "upi_id": null,
        "payee_name": null,
        "note_en": "Every contribution helps us bring Maa home.",
        "note_bn": "আপনার প্রতিটি অবদান মাকে ঘরে আনতে সাহায্য করে।"
    }')
on conflict (key) do nothing;

insert into public.programmes
    (slug, type, title_en, title_bn, description_en, description_bn, venue, starts_at, ends_at, status, registration_open, sort_order)
values
    ('drawing-competition', 'drawing',
        'Kids'' Drawing Competition', 'শিশুদের অঙ্কন প্রতিযোগিতা',
        'Little artists draw Maa Durga, the pandal, or anything Puja means to them. Everyone votes for their favourite.',
        'খুদে শিল্পীরা আঁকবে মা দুর্গা, মণ্ডপ বা পুজোর যে কোনও ছবি। সবাই মিলে ভোট দিয়ে বিজয়ী বেছে নেবে।',
        'Pandal stage', '2026-10-17T16:00:00+05:30', '2026-10-17T18:00:00+05:30', 'upcoming', true, 10),
    ('musical-chair', 'musical_chair',
        'Musical Chair', 'মিউজিক্যাল চেয়ার',
        'The classic! Music plays, music stops, and someone is left standing. Request your favourite song for the rounds.',
        'চিরকালের মজার খেলা! গান বাজবে, গান থামবে, আর কেউ একজন দাঁড়িয়ে থাকবে। রাউন্ডের জন্য পছন্দের গান অনুরোধ করুন।',
        'Pandal ground', '2026-10-18T17:00:00+05:30', '2026-10-18T18:30:00+05:30', 'upcoming', true, 20),
    ('singing-competition', 'singing',
        'Singing Competition', 'সংগীত প্রতিযোগিতা',
        'Rabindrasangeet, Nazrulgeeti, modern or Bollywood — take the stage and sing your heart out.',
        'রবীন্দ্রসংগীত, নজরুলগীতি, আধুনিক বা বলিউড — মঞ্চে উঠে প্রাণ খুলে গান করুন।',
        'Pandal stage', '2026-10-19T18:00:00+05:30', '2026-10-19T21:00:00+05:30', 'upcoming', true, 30),
    ('dance-competition', 'dance',
        'Dance Competition', 'নৃত্য প্রতিযোগিতা',
        'Classical, folk, Bollywood or freestyle — show us your moves.',
        'শাস্ত্রীয়, লোকনৃত্য, বলিউড বা ফ্রিস্টাইল — দেখিয়ে দিন আপনার নাচ।',
        'Pandal stage', '2026-10-20T18:00:00+05:30', '2026-10-20T21:00:00+05:30', 'upcoming', true, 40),
    ('dhunuchi-naach', 'other',
        'Dhunuchi Naach', 'ধুনুচি নাচ',
        'The smoky, rhythmic dance to the beat of the dhak on Navami night.',
        'নবমীর রাতে ঢাকের তালে ধোঁয়া-ভরা ধুনুচি নাচ।',
        'Pandal', '2026-10-20T21:30:00+05:30', '2026-10-20T23:00:00+05:30', 'upcoming', false, 50),
    ('sindoor-khela', 'other',
        'Sindoor Khela', 'সিঁদুর খেলা',
        'Bidding Maa farewell with sindoor, sweets and a promise to meet again next year.',
        'সিঁদুর, মিষ্টি আর আসছে বছর আবার হবে-র প্রতিশ্রুতি নিয়ে মাকে বিদায়।',
        'Pandal', '2026-10-21T11:00:00+05:30', '2026-10-21T14:00:00+05:30', 'upcoming', false, 60)
on conflict (slug) do nothing;
