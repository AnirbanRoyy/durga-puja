import type { Locale } from "@/i18n/config";

/** Placeholder paragraph: the page fills in this year's dates from the admin settings. */
export const THIS_YEAR_DATES = "{{this-year-dates}}";

export type AboutSection = {
    id: string;
    title: string;
    paragraphs: string[];
    items?: { term: string; text: string }[];
    quote?: string;
};

const en: AboutSection[] = [
    {
        id: "what",
        title: "What is Durga Puja?",
        paragraphs: [
            "Durga Puja — also called Durgotsav or Sharodotsav, the autumn festival — is the worship of Maa Durga, the warrior form of the Divine Mother. It is the biggest festival of Bengal and is celebrated with equal joy in Tripura, Assam, Odisha, Bihar, Jharkhand, Bangladesh and by Bengali communities all over the world.",
            "For Bengalis, Durga is also Uma, the daughter of the Himalaya, who leaves Kailash once a year to visit her parents' home with her four children — Lakshmi, Saraswati, Ganesha and Kartik. The five days of Puja are her homecoming, which is why the festival feels like a family reunion as much as a religious celebration.",
        ],
    },
    {
        id: "why",
        title: "Why do we celebrate it?",
        paragraphs: [
            "The Devi Mahatmya tells of Mahishasura, a buffalo demon who was granted a boon that no man or god could kill him. Made arrogant by it, he drove the gods out of heaven. The gods then combined their divine energies into a single blazing form — Durga. Each gave her a weapon: Shiva his trident, Vishnu his discus, Indra his thunderbolt, and the Himalaya gave her a lion to ride.",
            "Durga battled Mahishasura as he changed shape again and again, and finally slew him. Her victory is celebrated on Vijaya Dashami — the 'Dashami of victory'. At its heart, the Puja celebrates the triumph of good over evil, and Shakti, the power that protects the world.",
            "There is a second story that is especially dear to Bengal. Traditionally the Goddess was worshipped in spring (Basanti Puja). But before his battle with Ravana, Rama invoked her out of season, in autumn — an 'akal bodhon', an untimely awakening. He offered her 108 blue lotuses; when one went missing, he prepared to offer one of his own lotus-like eyes, and the pleased Goddess blessed him. The autumn Puja we celebrate today honours that Akal Bodhon.",
        ],
        quote: "যা দেবী সর্বভূতেষু শক্তিরূপেণ সংস্থিতা। নমস্তস্যৈ নমস্তস্যৈ নমস্তস্যৈ নমো নমঃ॥",
    },
    {
        id: "when",
        title: "When is it celebrated?",
        paragraphs: [
            "Durga Puja falls in the Bengali month of Ashwin (September–October), during the bright half of the lunar fortnight. The exact dates follow the panjika (almanac), so they change every year.",
            "The countdown begins on Mahalaya, the new-moon day that ends Pitri Paksha (the fortnight of the ancestors) and begins Devi Paksha (the fortnight of the Goddess). Since 1931, Bengal has woken before dawn on Mahalaya to Birendra Krishna Bhadra's recitation of 'Mahishasuramardini' on the radio. The main festival runs for five days, from Shashthi to Dashami.",
            THIS_YEAR_DATES,
        ],
    },
    {
        id: "days",
        title: "The days of Puja",
        paragraphs: ["Each day has its own rituals, moods and food. Here's what happens when:"],
        items: [
            {
                term: "Mahalaya",
                text: "Tarpan — offerings of water to ancestors at the riverbank — and the invocation of the Goddess. Artisans traditionally paint the eyes of the idol (chokkhu daan) around this time.",
            },
            {
                term: "Shashthi",
                text: "Bodhon, the awakening of the Goddess, followed by Amantran and Adhibas — formally inviting her to stay. The covered faces of the idols are unveiled.",
            },
            {
                term: "Saptami",
                text: "At dawn the Kola Bou (Nabapatrika — nine sacred plants tied with a banana plant) is bathed in the river, draped in a red-bordered saree and placed beside Ganesha. Pran Pratishtha brings life into the idol.",
            },
            {
                term: "Ashtami",
                text: "The most auspicious day. Everyone offers Pushpanjali (flowers) in new clothes. Kumari Puja worships a young girl as the Goddess, and Sandhi Puja is held at the exact meeting point of Ashtami and Navami with 108 lamps and 108 lotuses.",
            },
            {
                term: "Navami",
                text: "Maha Aarti, the grandest bhog, and Dhunuchi Naach — dancing with smoking clay incense burners to the beat of the dhak — late into the night.",
            },
            {
                term: "Dashami",
                text: "Darpan Bisarjan (seeing her reflection in a mirror of water), Sindoor Khela where married women smear each other with vermilion, and the immersion (Bisarjan). Then everyone exchanges Bijoya greetings and sweets, promising: 'Asche bochor abar hobe!' — it will happen again next year.",
            },
        ],
    },
    {
        id: "symbols",
        title: "Symbols and meaning",
        paragraphs: ["Every detail of the protima (idol) carries meaning:"],
        items: [
            {
                term: "Ten arms",
                text: "Protection in all ten directions, each hand holding a gift from the gods.",
            },
            { term: "The lion", text: "Courage and dharma, carrying the Goddess into battle." },
            {
                term: "Mahishasura",
                text: "Ego, arrogance and ignorance — what each of us must overcome.",
            },
            {
                term: "Lakshmi & Saraswati",
                text: "Prosperity and knowledge, standing at her sides.",
            },
            { term: "Ganesha & Kartik", text: "Auspicious beginnings and valour." },
            { term: "The third eye", text: "Divine wisdom that sees beyond the ordinary." },
        ],
    },
    {
        id: "culture",
        title: "More than a festival",
        paragraphs: [
            "Puja is art, music, food and community. Clay idols are sculpted by artisans (famously in Kumartuli, Kolkata), pandals are built around imaginative themes, dhakis fill the air with the rhythm of the dhak, and everyone shares bhog of khichuri, labra and payesh. People hop from pandal to pandal, wear new clothes, and catch up with friends over endless adda.",
            "In December 2021, UNESCO inscribed Durga Puja in Kolkata on its Representative List of the Intangible Cultural Heritage of Humanity, recognising it as a celebration that brings together people of every background.",
        ],
    },
];

const bn: AboutSection[] = [
    {
        id: "what",
        title: "দুর্গাপুজো কী?",
        paragraphs: [
            "দুর্গাপুজো — দুর্গোৎসব বা শারদোৎসব — হল দেবী দুর্গার আরাধনা, মাতৃশক্তির যোদ্ধা রূপ। এটি বাংলার সবচেয়ে বড় উৎসব, আর ত্রিপুরা, অসম, ওড়িশা, বিহার, ঝাড়খণ্ড, বাংলাদেশ এবং সারা বিশ্বের বাঙালিরা একই আনন্দে এই উৎসব পালন করেন।",
            "বাঙালির কাছে দুর্গা হলেন উমা, হিমালয়ের কন্যা, যিনি বছরে একবার চার সন্তান — লক্ষ্মী, সরস্বতী, গণেশ ও কার্তিককে নিয়ে কৈলাস থেকে বাপের বাড়ি আসেন। পুজোর পাঁচটা দিন তাঁর ঘরে ফেরা — তাই এই উৎসব যতটা ধর্মীয়, ততটাই পারিবারিক মিলনের।",
        ],
    },
    {
        id: "why",
        title: "কেন এই পুজো?",
        paragraphs: [
            "দেবীমাহাত্ম্যে আছে মহিষাসুরের কথা — সে বর পেয়েছিল যে কোনও পুরুষ বা দেবতা তাকে বধ করতে পারবে না। সেই অহংকারে সে দেবতাদের স্বর্গ থেকে তাড়িয়ে দেয়। তখন দেবতারা নিজেদের তেজ এক করে সৃষ্টি করলেন দেবী দুর্গাকে। প্রত্যেকে দিলেন নিজের অস্ত্র — শিব দিলেন ত্রিশূল, বিষ্ণু দিলেন চক্র, ইন্দ্র দিলেন বজ্র, আর হিমালয় দিলেন বাহন সিংহ।",
            "মহিষাসুর বারবার রূপ বদলে যুদ্ধ করল, কিন্তু শেষে দেবী তাকে বধ করলেন। সেই বিজয়ের দিন বিজয়া দশমী। মূলত এই পুজো অশুভের উপর শুভের জয় এবং বিশ্বরক্ষাকারী শক্তির উদযাপন।",
            "বাংলার কাছে আরও একটি কাহিনি খুব প্রিয়। আগে দেবীর পুজো হত বসন্তকালে (বাসন্তী পুজো)। কিন্তু রাবণের সঙ্গে যুদ্ধের আগে রামচন্দ্র শরৎকালে অসময়ে দেবীকে আবাহন করেন — একেই বলে 'অকালবোধন'। তিনি ১০৮টি নীলপদ্ম নিবেদন করছিলেন; একটি কম পড়ায় নিজের পদ্মসম চোখ উৎসর্গ করতে উদ্যত হন, আর দেবী প্রসন্ন হয়ে তাঁকে আশীর্বাদ করেন। আজকের শারদীয়া পুজো সেই অকালবোধনেরই স্মরণ।",
        ],
        quote: "যা দেবী সর্বভূতেষু শক্তিরূপেণ সংস্থিতা। নমস্তস্যৈ নমস্তস্যৈ নমস্তস্যৈ নমো নমঃ॥",
    },
    {
        id: "when",
        title: "কবে পালিত হয়?",
        paragraphs: [
            "দুর্গাপুজো হয় বাংলা আশ্বিন মাসে (সেপ্টেম্বর–অক্টোবর), শুক্লপক্ষে। তিথি পঞ্জিকা মেনে ঠিক হয়, তাই প্রতি বছর তারিখ বদলায়।",
            "শুরুটা হয় মহালয়ায় — অমাবস্যার এই দিনে পিতৃপক্ষ শেষ হয়ে দেবীপক্ষের সূচনা হয়। ১৯৩১ সাল থেকে মহালয়ার ভোরে বাংলা জেগে ওঠে রেডিওতে বীরেন্দ্রকৃষ্ণ ভদ্রের কণ্ঠে 'মহিষাসুরমর্দিনী' শুনে। মূল উৎসব চলে পাঁচ দিন — ষষ্ঠী থেকে দশমী।",
            THIS_YEAR_DATES,
        ],
    },
    {
        id: "days",
        title: "পুজোর দিনগুলি",
        paragraphs: ["প্রতিটি দিনের আলাদা আচার, আলাদা মেজাজ, আলাদা খাওয়াদাওয়া:"],
        items: [
            {
                term: "মহালয়া",
                text: "নদীর ঘাটে পূর্বপুরুষদের উদ্দেশে তর্পণ এবং দেবীর আবাহন। এই সময়েই শিল্পীরা প্রতিমার চোখ আঁকেন — চক্ষুদান।",
            },
            {
                term: "ষষ্ঠী",
                text: "দেবীর বোধন, তারপর আমন্ত্রণ ও অধিবাস। প্রতিমার ঢাকা মুখ উন্মোচন করা হয়।",
            },
            {
                term: "সপ্তমী",
                text: "ভোরে কলাবউ (নবপত্রিকা — কলাগাছের সঙ্গে বাঁধা নয়টি পবিত্র উদ্ভিদ) নদীতে স্নান করিয়ে লালপাড় শাড়ি পরিয়ে গণেশের পাশে বসানো হয়। প্রাণপ্রতিষ্ঠার মাধ্যমে প্রতিমায় প্রাণ সঞ্চার হয়।",
            },
            {
                term: "অষ্টমী",
                text: "সবচেয়ে পুণ্য দিন। নতুন জামায় সবাই অঞ্জলি দেন। কুমারী পুজোয় এক বালিকাকে দেবীরূপে পুজো করা হয়, আর অষ্টমী ও নবমীর সন্ধিক্ষণে ১০৮টি প্রদীপ ও ১০৮টি পদ্মে হয় সন্ধিপুজো।",
            },
            {
                term: "নবমী",
                text: "মহা আরতি, বিশেষ ভোগ, আর গভীর রাত পর্যন্ত ঢাকের তালে ধুনুচি নাচ।",
            },
            {
                term: "দশমী",
                text: "দর্পণ বিসর্জন, বিবাহিত মহিলাদের সিঁদুর খেলা, তারপর প্রতিমা বিসর্জন। এরপর সবাই বিজয়ার প্রণাম-কোলাকুলি আর মিষ্টিমুখ — 'আসছে বছর আবার হবে!'",
            },
        ],
    },
    {
        id: "symbols",
        title: "প্রতীক ও তাৎপর্য",
        paragraphs: ["প্রতিমার প্রতিটি খুঁটিনাটির অর্থ আছে:"],
        items: [
            { term: "দশ হাত", text: "দশ দিক থেকে রক্ষা — প্রতিটি হাতে দেবতাদের দেওয়া অস্ত্র।" },
            { term: "সিংহ", text: "সাহস ও ধর্মের প্রতীক, যুদ্ধে দেবীর বাহন।" },
            { term: "মহিষাসুর", text: "অহংকার ও অজ্ঞানতা — যা আমাদের প্রত্যেককে জয় করতে হয়।" },
            { term: "লক্ষ্মী ও সরস্বতী", text: "সমৃদ্ধি ও জ্ঞান, দেবীর দুই পাশে।" },
            { term: "গণেশ ও কার্তিক", text: "শুভ সূচনা ও বীরত্ব।" },
            { term: "তৃতীয় নয়ন", text: "সাধারণের বাইরে দেখার দিব্য জ্ঞান।" },
        ],
    },
    {
        id: "culture",
        title: "উৎসবের চেয়েও বেশি",
        paragraphs: [
            "পুজো মানে শিল্প, গান, খাওয়া আর একসঙ্গে থাকা। কুমোরটুলির শিল্পীরা মাটির প্রতিমা গড়েন, নানা থিমে মণ্ডপ সাজে, ঢাকিদের ঢাকের বোলে আকাশ ভরে ওঠে, আর সবাই মিলে খিচুড়ি, লাবড়া, পায়েসের ভোগ খায়। নতুন জামা, প্যান্ডেল হপিং আর অফুরন্ত আড্ডা — এই তো পুজো।",
            "২০২১ সালের ডিসেম্বরে ইউনেস্কো 'কলকাতার দুর্গাপুজো'-কে মানবতার অধরা সাংস্কৃতিক ঐতিহ্যের তালিকায় অন্তর্ভুক্ত করে — সব মানুষকে এক করে দেওয়া এক উৎসব হিসেবে।",
        ],
    },
];

export function aboutContent(locale: Locale | string): AboutSection[] {
    return locale === "bn" ? bn : en;
}
