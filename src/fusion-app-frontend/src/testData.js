// Images
import image1 from './assets/dev/program_hero-1.jpg';
import image2 from './assets/dev/fa-1.jpg';
import image3 from './assets/dev/fa-2.jpg';
import image4 from './assets/dev/fa-3.jpg';
import image5 from './assets/dev/fa-4.jpg';
import image6 from './assets/dev/fa-5.jpg';
import image7 from './assets/dev/fa-6.jpg';
import image8 from './assets/dev/fa-7.jpg';
import image9 from './assets/dev/fa-8.jpg';

import object1 from './assets/dev/oh-1.webp';
import object2 from './assets/dev/oh-2.webp';
import object3 from './assets/dev/oh-3.webp';
import object4 from './assets/dev/oh-4.webp';

import journal1 from './assets/dev/je-1.jpg';
import journal2 from './assets/dev/je-2.jpg';
import journal3 from './assets/dev/je-3.jpg'; 

/**
 * Feed item shape: { imageSrc, imageAlt, location, month, date, year, label, ctaExhibit, ctaAttend }
 * Add or replace items here; the feed layout scales automatically.
 */

export const testData = {
    programHero: {
        order: 1,
        imageSrc: image1,
        /** Matches `allPrograms.programs.*[0].routeLink` (Kaga program detail). */
        routeLink: "/program/kaga-ishikawa",
        en: {
            title: "Japan Artist Residency",
            description: "Japan Artist Residency",
            imageAlt: "Japan Artist Residency",
            location: "Kaga, Ishikawa",
            season: "Fall",
            year: "2026",
            cta: "Learn More",
            routeLink: "/program/kaga-ishikawa",
        },
        ja: {
            title: "ジャパン・アーティスト・レジデンシー",
            description: "ジャパン・アーティスト・レジデンシー",
            imageAlt: "ジャパン・アーティスト・レジデンシー",
            location: "石川県加賀市",
            season: "秋",
            year: "2026",
            cta: "詳細を見る",
            routeLink: "/program/kaga-ishikawa",
        },
    },
    applicationProcess: {
        en: [
            {
                title: "Application Process",
                description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
            },
        ],
        ja: [
            {
                title: "応募プロセス",
                description: "ジャパン・アーティスト・レジデンシーへの応募プロセスをご紹介します。",
            },
        ],
    },
    termsAndConditions: {
        en: [
            {
                title: "Terms and Conditions",
                description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
            },
        ],
        ja: [
            {
                title: "利用規約",
                description: "ジャパン・アーティスト・レジデンシーの利用規約をご紹介します。",
            },
        ],
    },
    privacyPolicy: {
        en: [
            {
                title: "Privacy Policy",
                description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
            },
        ],
        ja: [
            {
                title: "プライバシーポリシー",
                description: "ジャパン・アーティスト・レジデンシーのプライバシーポリシーをご紹介します。",
            },
        ],
    },
    contact: {
        en: [
            {
                title: "Contact",
                description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
            },
        ],
        ja: [
            {
                title: "お問い合わせ",
                description: "ジャパン・アーティスト・レジデンシーへのお問い合わせをご紹介します。",
            },
        ],
    },
    faq: {
        en: [
            {
                title: "FAQ",
                description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
            },
        ],
        ja: [
            {
                title: "FAQ",
                description: "ジャパン・アーティスト・レジデンシーのよくある質問をご紹介します。",
            },
        ],
    },
    allPrograms: {
        order: 2,
        programs: {
            en: [
                {
                    id: "fusionKaga",
                    imageSrc: image1,
                    /** Detail-page hero; `.mp4` uses `<video>`, images use `<img>` (see programView.js). */
                    heroMediaSrc: '/fusion-nature.mp4',
                    focus: "Japan Artist Residency",
                    imageAlt: "Exhibit",
                    location: "Kaga, Ishikawa, Japan",
                    startDate: "October 10",
                    endDate: "15",
                    year: "2026",
                    totalSlots: 24,
                    availableSlots: 2,
                    acceptingApplications: true,
                    briefDescription: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
                    routeLink: "/program/kaga-ishikawa",
                    programPage: {
                        headline: "Elevate Your Practice",
                        subheadline: "The 2026 Fusion Kaga Residency: A sanctuary for creative evolutions.",
                        description: "An intensive 3-week residency providing studio access, mentorship, and global gallery exposure. ",
                        offeringHeadline: "Our Key Offerings",
                        offeringCards: [
                            {
                                title: "Studio Access",
                                description: "A dedicated space to master your medium without distraction.",
                                gallery: [image1, image2, image3],
                            },
                            {
                                title: "Curated Residency",
                                description: "Direct interaction with impactful cultural creators in Japan’s most unique artistic spaces.",
                                gallery: [image1, image2, image3],
                            },
                            {
                                title: "Global Network",
                                description: "A high-profile platform to debut your new series.",
                                gallery: [image1, image2, image3],
                            },
                        ],
                        confirmedHeadline: "Confirmed Artists",
                        confirmedArtists: [
                            "KAMAUU",
                            "Bria Whitney",
                            "Kyle Filley",
                            "Marie Northington",
                            "Zack Foster",
                            "Laura Laurens",
                            "Nada Hatemlah",
                            "Jade Vandenhout",
                            "Zack Foster",
                            "Laura Laurens",
                            "Nada Hatemlah",
                            "Jade Vandenhout",
                        ],
                        detailsHeadline: "Residency Details",
                        programDetails: {
                            facilities: [
                                {
                                    title: "Facilities",
                                    description:
                                        "8 private studios, onsen access, traditional inns",
                                    gallery: [image1],
                                },
                            ],
                            costs: {
                                base: "Residency fee: ¥200,000",
                                additional: "materials/expenses",
                            },
                            keyDates: [
                                {
                                    date: "July 5",
                                    description: "Application Deadline",
                                },
                                {
                                    date: "August 20",
                                    description: "Orientation — Studio Setup",
                                },
                                {
                                    date: "August 21 – October 1",
                                    description: "6 focused weeks",
                                },
                                {
                                    date: "October 2 – 5",
                                    description: "Exhibition Showcase",
                                },
                            ],
                        },
                        additionalInfo: {
                            faq: [
                                {
                                    question: "What is the residency fee?",
                                    answer: "The residency fee is ¥200,000. This includes studio access, onsen access, and traditional inns.",
                                },
                                {
                                    question: "When is the application deadline?",
                                    answer: "See the key dates on this page for the current cycle. Late applications may not be reviewed.",
                                },
                            ],
                            programNotes: [
                                {
                                    title: "Program Notes",
                                    information:
                                        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida.",
                                },
                            ],
                            refundPolicy: [
                                {
                                    title: "Overview",
                                    information:
                                        "The total program fee is $5,000 USD. This includes a non-refundable deposit of $1,000 and a partially refundable balance of $4,000.",
                                },
                                {
                                    title: "Payment Structure",
                                    bulletPoints: [
                                        "Deposit: $1,000 USD — Non-refundable",
                                        "Remaining Balance: $4,000 USD — Refundable according to conditions below",
                                        "Includes airfare valued at approximately $800–$1,200",
                                    ],
                                },
                                {
                                    title: "Cancellation and Refund Conditions",
                                    subSections: [
                                        {
                                            title: "Non-Refundable Deposit",
                                            information:
                                                "The $1,000 deposit is non-refundable under all circumstances.",
                                        },
                                        {
                                            title: "Time-Based Refund Eligibility",
                                            information:
                                                "The $4,000 balance refund depends on the timing of your cancellation.",
                                            bulletPoints: [
                                                "More than 50% of the time remains before the program start date: the full $4,000 is refundable minus non-recoverable expenses already incurred (such as flights if booked).",
                                                "Less than 50% of the time remains: the refund is limited to 50% of the balance after deducting incurred expenses.",
                                            ],
                                        },
                                    ],
                                },
                                {
                                    title: "Flight Booking Deduction",
                                    information:
                                        "If a flight has already been booked by Fusion on behalf of the artist at the time of cancellation, the cost of that booking may be deducted from any refundable amount.",
                                },
                            ],
                        },
                    }
                },
                {
                    id: "fusionNihonbashi",
                    imageSrc: image1,
                    focus: "Japan Artist Residency",
                    imageAlt: "Exhibit",
                    location: "Nihonbashi, Tokyo",
                    startDate: "October 10",
                    endDate: "15",
                    year: "2026",
                    totalSlots: 10,
                    availableSlots: 5,
                    briefDescription: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
                    routeLink: "/program/nihonbashi-tokyo",
                },
                {
                    id: "fusionSanjo",
                    imageSrc: image1,
                    focus: "Japan Artist Residency",
                    imageAlt: "Exhibit",
                    location: "Sanjo, Kyoto",
                    startDate: "October 10",
                    endDate: "15",
                    year: "2026",
                    totalSlots: 10,
                    availableSlots: 5,
                    briefDescription: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
                    routeLink: "/program/sanjo-kyoto",
                },
            ],
            ja: [
                {
                    id: "fusionKaga",
                    imageSrc: image1,
                    focus: "ジャパン・アーティスト・レジデンシー",
                    imageAlt: "展示",
                    location: "石川県加賀市",
                    startDate: "10月10日",
                    endDate: "15日",
                    year: "2026",
                    totalSlots: 24,
                    availableSlots: 5,
                    briefDescription:
                        "本文はサンプルです。加賀での滞在制作と地域との対話を軸に、展示に向けたプロセスを紹介します。",
                    routeLink: "/program/kaga-ishikawa",
                },
                {
                    id: "fusionNihonbashi",
                    imageSrc: image1,
                    focus: "ジャパン・アーティスト・レジデンシー",
                    imageAlt: "展示",
                    location: "東京都中央区日本橋",
                    startDate: "10月10日",
                    endDate: "15日",
                    year: "2026",
                    totalSlots: 10,
                    availableSlots: 5,
                    briefDescription:
                        "本文はサンプルです。東京・日本橋エリアをフィールドにしたプログラムの概要と参加方法をまとめています。",
                    routeLink: "/program/nihonbashi-tokyo",
                },
                {
                    id: "fusionSanjo",
                    imageSrc: image1,
                    focus: "ジャパン・アーティスト・レジデンシー",
                    imageAlt: "展示",
                    location: "京都市中京区三条",
                    startDate: "10月10日",
                    endDate: "15日",
                    year: "2026",
                    totalSlots: 10,
                    availableSlots: 5,
                    briefDescription:
                        "本文はサンプルです。京都のまちなみと工芸・現代美術が交差する現場から、レジデンシーの記録をお届けします。",
                    routeLink: "/program/sanjo-kyoto",
                },
            ],
        }
    },
    /** Copy for `app-info` — `context="home"` vs `context="programs"`. */
    info: {
        home: {
            en: {
                headText: "Discover artists from Fusion’s curated programs.",
                subText: "Access studio visits, artist introductions,<br> and upcoming exhibitions.",
            },
            ja: {
                headText: "Fusionがキュレーションするプログラムからアーティストを発見しましょう。",
                subText: "スタジオ訪問、アーティスト紹介、<br>開催予定の展示へ。",
            },
        },
        programs: {
            en: {
                headText: "Programs",
                subText: "Residencies, exhibitions, and collaborations across Japan.",
            },
            ja: {
                headText: "プログラム",
                subText: "日本各地のレジデンシー、展示、コラボレーション。",
            },
        },
        editions: {
            en: {
                headText: "Editions",
                subText: "Limited prints, multiples, and published works from Fusion artists.",
            },
            ja: {
                headText: "エディション",
                subText: "Fusionアーティストによる限定プリント、複数版作品、刊行物。",
            },
        },
        journal: {
            en: {
                headText: "Journal",
                subText: "Read the latest entries from Fusion’s artists and explore our archive.",
            },
            ja: {
                headText: "ジャーナル",
                subText: "Fusionアーティストの最新記事を読み、アーカイブをご覧ください。",
            },
        },
    },
    /** Copy for `app-event-row` — keyed by `context` (e.g. journal). */
    eventRow: {
        journal: {
            en: {
                headText: 'Upcoming',
                subText: 'Events and journal highlights will appear here.',
            },
            ja: {
                headText: '開催予定',
                subText: 'イベントとジャーナルのハイライトをここに掲載します。',
            },
        },
    },
    /**
     * Grid items for `app-editions-feed` (separate from `info.editions` copy).
     * Optional `filter` per item: `{ year: number | 'archive', format, category }` — see `utils/feedFilterApply.js`.
     */
    editions: {
        items: [
            {
                imageSrc: object1,
                href: '/editions/stone-garden',
                en: { title: 'Stone Garden', alt: 'Stone Garden' },
                ja: { title: '石庭', alt: '石庭' },
            },
            {
                imageSrc: object2,
                href: '/editions/field-notes',
                en: { title: 'Field Notes', alt: 'Field Notes' },
                ja: { title: 'フィールドノート', alt: 'フィールドノート' },
            },
            {
                imageSrc: object3,
                href: '/editions/blue-hour',
                en: { title: 'Blue Hour', alt: 'Blue Hour' },
                ja: { title: 'ブルーアワー', alt: 'ブルーアワー' },
            },
            {
                imageSrc: object4,
                href: '/editions/line-work',
                en: { title: 'Line Work', alt: 'Line Work' },
                ja: { title: 'ライン・ワーク', alt: 'ライン・ワーク' },
            },
            {
                imageSrc: journal1,
                href: '/editions/park-edition',
                en: { title: 'A,E,I,O,U Park', alt: 'A,E,I,O,U Park' },
                ja: { title: 'A,E,I,O,U パーク', alt: 'A,E,I,O,U パーク' },
            },
            {
                imageSrc: journal2,
                href: '/editions/winter-set',
                en: { title: 'Winter Set', alt: 'Winter Set' },
                ja: { title: 'ウィンターセット', alt: 'ウィンターセット' },
            },
            {
                imageSrc: journal3,
                href: '/editions/summer-set',
                en: { title: 'Summer Set', alt: 'Summer Set' },
                ja: { title: 'サマーセット', alt: 'サマーセット' },
            },
            {
                imageSrc: image2,
                href: '/editions/portrait-one',
                en: { title: 'Portrait I', alt: 'Portrait I' },
                ja: { title: 'ポートレート I', alt: 'ポートレート I' },
            },
            {
                imageSrc: image3,
                href: '/editions/portrait-two',
                en: { title: 'Portrait II', alt: 'Portrait II' },
                ja: { title: 'ポートレート II', alt: 'ポートレート II' },
            },
            {
                imageSrc: image4,
                href: '/editions/ink-study',
                en: { title: 'Ink Study', alt: 'Ink Study' },
                ja: { title: 'インクスタディ', alt: 'インクスタディ' },
            },
            /* Rows 1–4 use the first 10 items; row 5 needs 5 more so the 1+2+3+4+5 layout fills one page. */
            {
                imageSrc: image5,
                href: '/editions/series-a',
                en: { title: 'Series A', alt: 'Series A' },
                ja: { title: 'シリーズ A', alt: 'シリーズ A' },
            },
            {
                imageSrc: image6,
                href: '/editions/series-b',
                en: { title: 'Series B', alt: 'Series B' },
                ja: { title: 'シリーズ B', alt: 'シリーズ B' },
            },
            {
                imageSrc: image7,
                href: '/editions/series-c',
                en: { title: 'Series C', alt: 'Series C' },
                ja: { title: 'シリーズ C', alt: 'シリーズ C' },
            },
            {
                imageSrc: image8,
                href: '/editions/series-d',
                en: { title: 'Series D', alt: 'Series D' },
                ja: { title: 'シリーズ D', alt: 'シリーズ D' },
            },
            {
                imageSrc: image9,
                href: '/editions/series-e',
                en: { title: 'Series E', alt: 'Series E' },
                ja: { title: 'シリーズ E', alt: 'シリーズ E' },
            },
        ],
    },
    /**
     * Artist roster for feeds / profiles. Optional `filter` / `galleryFilter` per artist overrides
     * derived defaults used by `utils/feedFilterApply.js` + `app-feed-filter`.
     */
    allArtists: {
        order: 3,
        artists: [
                {
                    "id": "artist_kamauu_001",
                    "slug": "kamauu",
                    "image": image2,
                    "featuredOrder": 3,
                    "visibility": "public",
                    "updatedAt": "2026-04-01T12:00:00.000Z",
                    "filter": {
                        "connection": "artist",
                        "cohortYear": 2025,
                        "disciplineKey": "sound",
                        "locationKey": "us"
                    },
                    "galleryFilter": {
                        "accessType": "opening",
                        "season": 2025,
                        "view": "opening"
                    },
                    "locales": {
                    "en": {
                        "name": "KAMAUU",
                        "discipline": "Sound",
                        "status": "studio",
                        "prestige": 6,
                        "location": {
                        "city": "Los Angeles",
                        "state": "California",
                        "country": "United States",
                        "display": "Los Angeles, California, United States"
                        },
                        "bio": "Vocalist and producer blending jazz, soul, and hip-hop.",
                        "bioLong": "KAMAUU is known for intimate live performances and recordings that foreground voice, rhythm, and space. This paragraph can run longer on the profile page.",
                        "seo": {
                        "title": "KAMAUU · Fusion",
                        "description": "Artist profile for KAMAUU — sound, releases, and context."
                        },
                        "world": {
                        "practice": "I work from improvisation and close-mic capture, then shape arrangements until the vocal sits forward without crowding the band.",
                        "perspective": [
                            "I think of albums as rooms: lighting, distance, and silence matter as much as melody.",
                            "I also think of albums as a continuous space, like a hallway that leads to a house."
                        ],
                        "vision": ["Surfaces as archives", "Objects as witness", "Imperfection as authorship","Time as collaborator"],
                        "constructing": ["Tracks are built from live takes, edited with restraint", "Overdubs serve clarity, not density"],
                        "context": "Raised between coasts; influences range from classic songcraft to contemporary beat culture.",
                        "quote": "If it doesn’t feel honest at low volume, it won’t feel honest loud.",
                        "introGallery": [
                            {
                            "src": object1,
                            "alt": "KAMAUU performing live",
                            "caption": "Live session, 2025"
                            },
                            {
                            "src": object2,
                            "alt": "Studio microphone setup",
                            "caption": null
                            },
                            {
                            "src": object3,
                            "alt": "Studio microphone setup",
                            "caption": null
                            }
                        ]
                        },
                        "links": [
                        { "type": "website", "url": "https://www.kamauu.com", "label": "Official site" },
                        { "type": "instagram", "url": "https://www.instagram.com/kamauu", "label": "Instagram" },
                        { "type": "other", "url": "https://www.youtube.com/@kamauu", "label": "YouTube" }
                        ],
                        "currentWork": [
                        {
                            "title": "Untitled LP sessions",
                            "summary": "Tracking vocals and rhythm section for a 2026 release.",
                            "image": "https://example.com/media/artists/kamauu/current-01.jpg",
                            "href": "/journal/entry/sessions-2026"
                        }
                        ],
                        "editions": ["portrait-one", "portrait-two"],
                        "programs": ["Kaga 2026"],
                        "masterPortfolio": [
                        {
                            "src": "https://example.com/media/artists/kamauu/portfolio-01.jpg",
                            "title": "Blue Room",
                            "year": 2024,
                            "medium": "Digital still, tour documentation"
                        }
                        ],
                        "events": {
                        "upcoming": {
                            "id": "evt_la_2026_06",
                            "title": "Solo set · Los Angeles",
                            "startsAt": "2026-06-14T03:00:00.000Z",
                            "href": "/event/la-2026-06"
                        },
                        "past": {
                            "id": "evt_ny_2025_11",
                            "title": "NYC listening room",
                            "startsAt": "2025-11-02T02:30:00.000Z",
                            "href": "/event/nyc-2025-11"
                        }
                        },
                        "wordsFromArtist": {
                        "body": "I write to find the simplest line that still carries the whole feeling.",
                        "attribution": "KAMAUU"
                        },
                        "notes": {
                        "curators": [
                            {
                            "author": "A. Chen",
                            "role": "Curator",
                            "body": "A rare balance of technical precision and emotional directness.",
                            "date": "2025-09-01"
                            }
                        ],
                        "artists": [],
                        "galleries": []
                        }
                    },
                    "ja": {
                        "name": "KAMAUU",
                        "discipline": "サウンド",
                        "status": "studio",
                        "prestige": 6,
                        "location": {
                        "city": "ロサンゼルス",
                        "state": "カリフォルニア州",
                        "country": "アメリカ合衆国",
                        "display": "アメリカ合衆国カリフォルニア州ロサンゼルス"
                        },
                        "bio": "ジャズ、ソウル、ヒップホップを融合したボーカリスト／プロデューサー。",
                        "bioLong": "近接マイクでの録音や即興を起点に、ボーカルが前に出つつもバンドの空間を保つ編曲を重視しています。",
                        "seo": {
                        "title": "KAMAUU · Fusion",
                        "description": "KAMAUU のアーティストプロフィール。"
                        },
                        "world": {
                        "practice": "即興と近接録音から始め、ボーカルが前に出過ぎないよう編曲を整えます。",
                        "perspective": [
                            "アルバムを「部屋」として考え、照明や距離、無音もメロディと同じくらい重要に扱います。",
                            "また、アルバムは家へ続く廊下のような連続した空間としても捉えています。"
                        ],
                        "vision": "連続したカタログとして、各リリースは扉であり、廊下は同じ家です。",
                        "constructing": "ライブテイクを土台に、過剰なオーバーダブではなく明瞭さのために重ねます。",
                        "context": "両海岸で育ち、クラフトソングと現代のビート文化の影響を受けています。",
                        "quote": "小さな音量で正直に感じられないものは、大きくしても正直にはならない。",
                        "introGallery": [
                            {
                            "src": "https://example.com/media/artists/kamauu/gallery-01.jpg",
                            "alt": "ライブでの KAMAUU",
                            "caption": "ライブ・セッション、2025"
                            },
                            {
                            "src": "https://example.com/media/artists/kamauu/gallery-02.jpg",
                            "alt": "スタジオのマイク設置",
                            "caption": null
                            }
                        ]
                        },
                        "links": [
                        { "type": "website", "url": "https://www.kamauu.com", "label": "公式サイト" },
                        { "type": "instagram", "url": "https://www.instagram.com/kamauu", "label": "Instagram" },
                        { "type": "other", "url": "https://www.youtube.com/@kamauu", "label": "YouTube" }
                        ],
                        "currentWork": [
                        {
                            "title": "未定タイトル LP のセッション",
                            "summary": "2026 年リリースに向けたボーカルとリズム隊の録音。",
                            "image": "https://example.com/media/artists/kamauu/current-01.jpg",
                            "href": "/journal/entry/sessions-2026"
                        }
                        ],
                        "editions": ["portrait-one", "portrait-two"],
                        "programs": ["fusion-residency-2025"],
                        "masterPortfolio": [
                        {
                            "src": "https://example.com/media/artists/kamauu/portfolio-01.jpg",
                            "title": "ブルー・ルーム",
                            "year": 2024,
                            "medium": "デジタルスチル、ツアー記録"
                        }
                        ],
                        "events": {
                        "upcoming": {
                            "id": "evt_la_2026_06",
                            "title": "ソロセット · ロサンゼルス",
                            "startsAt": "2026-06-14T03:00:00.000Z",
                            "href": "/event/la-2026-06"
                        },
                        "past": {
                            "id": "evt_ny_2025_11",
                            "title": "NYC リスニングルーム",
                            "startsAt": "2025-11-02T02:30:00.000Z",
                            "href": "/event/nyc-2025-11"
                        }
                        },
                        "wordsFromArtist": {
                        "body": "感情全体を運ぶ、いちばんシンプルな線を見つけるために書きます。",
                        "attribution": "KAMAUU"
                        },
                        "notes": {
                        "curators": [
                            {
                            "author": "A. チェン",
                            "role": "キュレーター",
                            "body": "技術的な正確さと感情の率直さの珍しいバランス。",
                            "date": "2025-09-01"
                            }
                        ],
                        "artists": [],
                        "galleries": []
                        }
                    }
                    },
                    "account": {
                    "subscription": { "tier": "pro", "renewsAt": "2026-05-01T00:00:00.000Z" },
                    "bookmarks": [],
                    "inbox": [],
                    "sent": [],
                    "scheduledMeetings": []
                    }
                },
                {
                    id: "artist_bria_whitney_001",
                    slug: "bria-whitney",
                    image: image3,
                    featuredOrder: 4,
                    visibility: "public",
                    updatedAt: "2026-04-01T12:00:00.000Z",
                    filter: {
                        connection: "artist",
                        cohortYear: 2024,
                        disciplineKey: "mixedMedia",
                        locationKey: "us",
                    },
                    galleryFilter: {
                        accessType: "preview",
                        season: 2024,
                        view: "preview",
                    },
                    locales: {
                        en: {
                            name: "Bria Whitney",
                            discipline: "Mixed-Media",
                            status: "prep",
                            prestige: 5,
                            location: {
                                city: "Los Angeles",
                                state: "California",
                                country: "United States",
                                display: "Los Angeles, California, United States",
                            },
                            bio: "Mixed-media artist working across sculpture, textile, and installation.",
                            bioLong: "Bria Whitney combines material experimentation with narrative space. Recent work focuses on threshold spaces and temporary structures.",
                            seo: {
                                title: "Bria Whitney · Fusion",
                                description: "Artist profile for Bria Whitney — mixed-media, installation, and context.",
                            },
                            world: {
                                practice: "I build surfaces in layers—paper, fiber, and found material—until the piece holds its own weather.",
                                perspective: "Each series asks how a room remembers what happened inside it.",
                                vision: "A practice that stays porous: objects can be re-staged without losing their core tension.",
                                constructing: "Armatures are light; skins are heavy. Balance comes from editing what the viewer is allowed to touch.",
                                context: "Trained in sculpture with a background in set design; influences include craft traditions and contemporary architecture.",
                                quote: "If the material still looks obedient, I keep working.",
                                introGallery: [
                                    { src: image1, alt: "Bria Whitney — mixed-media study", caption: "Study, 2025" },
                                    { src: image2, alt: "Textile layer detail", caption: null },
                                    { src: image3, alt: "Installation view", caption: "Installation sketch" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/bria-whitney", label: "Official site" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "Threshold suite",
                                    summary: "New wall works for a spring group exhibition.",
                                    image: image3,
                                    href: "/journal/entry/threshold-suite",
                                },
                            ],
                            editions: ["portrait-one"],
                            programs: [],
                            masterPortfolio: [
                                {
                                    src: image3,
                                    title: "Paper Arch",
                                    year: 2025,
                                    medium: "Paper, adhesive, pigment",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_bria_2026_05",
                                    title: "Group show · Mixed voices",
                                    startsAt: "2026-05-10T17:00:00.000Z",
                                    href: "/event/bria-2026-05",
                                },
                                past: {
                                    id: "evt_bria_2025_09",
                                    title: "Studio open hours",
                                    startsAt: "2025-09-20T22:00:00.000Z",
                                    href: "/event/bria-2025-09",
                                },
                            },
                            wordsFromArtist: {
                                body: "I want the work to feel like a door left ajar—enough structure to enter, enough gap to imagine.",
                                attribution: "Bria Whitney",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                        ja: {
                            name: "Bria Whitney",
                            discipline: "複合メディア",
                            status: "prep",
                            prestige: 5,
                            location: {
                                city: "ロサンゼルス",
                                state: "カリフォルニア州",
                                country: "アメリカ合衆国",
                                display: "アメリカ合衆国カリフォルニア州ロサンゼルス",
                            },
                            bio: "彫刻、テキスタイル、インスタレーションを横断する複合メディアのアーティスト。",
                            bioLong: "素材実験と物語性のある空間を組み合わせ、境界や仮設的な構造をテーマにしています。",
                            seo: {
                                title: "Bria Whitney · Fusion",
                                description: "Bria Whitney のアーティストプロフィール。",
                            },
                            world: {
                                practice: "紙、繊維、拾った素材を重ねて表面をつくり、作品が独自の気候を持つまで層を足します。",
                                perspective: "各シリーズは「部屋が内部で起きたことをどう記憶するか」を問いかけます。",
                                vision: "作品は多孔質で、再配置しても核の緊張を失いません。",
                                constructing: "骨格は軽く、皮膜は重く。観客に触れさせる情報を編集してバランスを取ります。",
                                context: "彫刻の訓練と舞台美術の背景。工芸の伝統と現代建築の影響を受けています。",
                                quote: "素材がまだ従順に見えるなら、手を止めません。",
                                introGallery: [
                                    { src: image1, alt: "Bria Whitney — 複合メディアのスタディ", caption: "スタディ、2025" },
                                    { src: image2, alt: "テキスタイルの層", caption: null },
                                    { src: image3, alt: "インスタレーションのヴュー", caption: "インスタレーション・スケッチ" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/bria-whitney", label: "公式サイト" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "スレッショルド・スイート",
                                    summary: "春のグループ展向けの新しい壁面作品。",
                                    image: image3,
                                    href: "/journal/entry/threshold-suite",
                                },
                            ],
                            editions: ["portrait-one"],
                            programs: [],
                            masterPortfolio: [
                                {
                                    src: image3,
                                    title: "ペーパー・アーチ",
                                    year: 2025,
                                    medium: "紙、接着剤、顔料",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_bria_2026_05",
                                    title: "グループ展 · ミックスド・ヴォイシズ",
                                    startsAt: "2026-05-10T17:00:00.000Z",
                                    href: "/event/bria-2026-05",
                                },
                                past: {
                                    id: "evt_bria_2025_09",
                                    title: "スタジオ・オープン",
                                    startsAt: "2025-09-20T22:00:00.000Z",
                                    href: "/event/bria-2025-09",
                                },
                            },
                            wordsFromArtist: {
                                body: "作品には、入れるための構造と、想像の余地を残す隙間の両方が欲しい。",
                                attribution: "Bria Whitney",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                    },
                    account: {
                        subscription: { tier: "member", renewsAt: "2026-05-01T00:00:00.000Z" },
                        bookmarks: [],
                        inbox: [],
                        sent: [],
                        scheduledMeetings: [],
                    },
                },
                {
                    id: "artist_kyle_filley_001",
                    slug: "kyle-filley",
                    image: image4,
                    featuredOrder: 5,
                    visibility: "public",
                    updatedAt: "2026-04-01T12:00:00.000Z",
                    filter: {
                        connection: "alumni",
                        cohortYear: 2019,
                        disciplineKey: "performanceArt",
                        locationKey: "us",
                    },
                    galleryFilter: {
                        accessType: "archive",
                        season: 2024,
                        view: "archive",
                    },
                    locales: {
                        en: {
                            name: "Kyle Filley",
                            discipline: "Performance Art",
                            status: "showing",
                            prestige: 6,
                            location: {
                                city: "New York",
                                state: "New York",
                                country: "United States",
                                display: "New York, New York, United States",
                            },
                            bio: "Performance artist working with duration, audience, and improvised score.",
                            bioLong: "Kyle Filley stages performances where bodies and sound negotiate space in real time. Recent work emphasizes collective rhythm and public intimacy.",
                            seo: {
                                title: "Kyle Filley · Fusion",
                                description: "Artist profile for Kyle Filley — performance, duration, and live context.",
                            },
                            world: {
                                practice: "I start from a score that can be broken—rules exist so the moment can disobey them cleanly.",
                                perspective: "Performance is a contract: the audience and I agree to be vulnerable at the same time.",
                                vision: "A lineage of work where every show is a prototype; documentation is secondary to presence.",
                                constructing: "Light, sound, and movement are timed with slack built in so failure reads as composition.",
                                context: "Background in dance and experimental theater; collaborations with musicians and visual artists.",
                                quote: "The best night is when the plan dissolves and everyone still knows where we are.",
                                introGallery: [
                                    { src: image1, alt: "Kyle Filley — performance still", caption: "Live, 2025" },
                                    { src: image2, alt: "Audience and light", caption: null },
                                    { src: image4, alt: "Performance documentation", caption: "Score fragment" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/kyle-filley", label: "Official site" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "Night relay",
                                    summary: "A multi-night performance series in a converted warehouse.",
                                    image: image4,
                                    href: "/journal/entry/night-relay",
                                },
                            ],
                            editions: [],
                            programs: ["fusion-residency-2025"],
                            masterPortfolio: [
                                {
                                    src: image4,
                                    title: "Relay I",
                                    year: 2025,
                                    medium: "Photography, performance documentation",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_kyle_2026_04",
                                    title: "Night relay — closing",
                                    startsAt: "2026-04-22T02:00:00.000Z",
                                    href: "/event/kyle-2026-04",
                                },
                                past: {
                                    id: "evt_kyle_2025_12",
                                    title: "Winter durational",
                                    startsAt: "2025-12-05T23:00:00.000Z",
                                    href: "/event/kyle-2025-12",
                                },
                            },
                            wordsFromArtist: {
                                body: "I choreograph attention as much as movement—where the room looks is part of the piece.",
                                attribution: "Kyle Filley",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                        ja: {
                            name: "Kyle Filley",
                            discipline: "パフォーマンス",
                            status: "showing",
                            prestige: 6,
                            location: {
                                city: "ニューヨーク",
                                state: "ニューヨーク州",
                                country: "アメリカ合衆国",
                                display: "アメリカ合衆国ニューヨーク州ニューヨーク",
                            },
                            bio: "持続時間、観客、即興のスコアを扱うパフォーマンス・アーティスト。",
                            bioLong: "身体と音が空間をリアルタイムで交渉するパフォーマンスを構築。最近の作品は集合的なリズムと公の親密さを重視しています。",
                            seo: {
                                title: "Kyle Filley · Fusion",
                                description: "Kyle Filley のアーティストプロフィール。",
                            },
                            world: {
                                practice: "破られる前提のスコアから始めます。ルールは、その瞬間がきれいに背くためのものです。",
                                perspective: "パフォーマンスは契約で、観客と私は同時に脆弱になることに同意します。",
                                vision: "各公演はプロトタイプであり、記録はその場のプレゼンスより二次的です。",
                                constructing: "光・音・動きは、失敗が構成として読めるよう余裕を持ってタイミングを取ります。",
                                context: "ダンスと実験演劇の背景。音楽家やビジュアルアーティストとの協働。",
                                quote: "計画が溶けても、みんなが場所をわかっている夜がいちばん良い。",
                                introGallery: [
                                    { src: image1, alt: "Kyle Filley — パフォーマンス・スチル", caption: "ライブ、2025" },
                                    { src: image2, alt: "観客と光", caption: null },
                                    { src: image4, alt: "パフォーマンス記録", caption: "スコアの断片" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/kyle-filley", label: "公式サイト" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "ナイト・リレー",
                                    summary: "倉庫を改装した会場での複数夜のパフォーマンス・シリーズ。",
                                    image: image4,
                                    href: "/journal/entry/night-relay",
                                },
                            ],
                            editions: [],
                            programs: ["fusion-residency-2025"],
                            masterPortfolio: [
                                {
                                    src: image4,
                                    title: "リレー I",
                                    year: 2025,
                                    medium: "写真、パフォーマンス記録",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_kyle_2026_04",
                                    title: "ナイト・リレー — クロージング",
                                    startsAt: "2026-04-22T02:00:00.000Z",
                                    href: "/event/kyle-2026-04",
                                },
                                past: {
                                    id: "evt_kyle_2025_12",
                                    title: "冬のデュレーション",
                                    startsAt: "2025-12-05T23:00:00.000Z",
                                    href: "/event/kyle-2025-12",
                                },
                            },
                            wordsFromArtist: {
                                body: "動きと同じくらい、注意をどこに向けるかを振り付けます。部屋が見る場所も作品の一部です。",
                                attribution: "Kyle Filley",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                    },
                    account: {
                        subscription: { tier: "member", renewsAt: "2026-05-01T00:00:00.000Z" },
                        bookmarks: [],
                        inbox: [],
                        sent: [],
                        scheduledMeetings: [],
                    },
                },
                {
                    id: "artist_marie_northington_001",
                    slug: "marie-northington",
                    image: image5,
                    featuredOrder: 6,
                    visibility: "public",
                    updatedAt: "2026-04-01T12:00:00.000Z",
                    filter: {
                        connection: "artist",
                        cohortYear: 2024,
                        disciplineKey: "photography",
                        locationKey: "us",
                    },
                    galleryFilter: {
                        accessType: "preview",
                        season: 2025,
                        view: "preview",
                    },
                    locales: {
                        en: {
                            name: "Marie Northington",
                            discipline: "Photography",
                            status: "available",
                            prestige: 5,
                            location: {
                                city: "Portland",
                                state: "Oregon",
                                country: "United States",
                                display: "Portland, Oregon, United States",
                            },
                            bio: "Photographer focused on portraiture, urban rhythm, and available light.",
                            bioLong: "Marie Northington documents people and places where public and private blur. Commissions and editorial work inform a long-form personal series.",
                            seo: {
                                title: "Marie Northington · Fusion",
                                description: "Artist profile for Marie Northington — photography, portraiture, and light.",
                            },
                            world: {
                                practice: "I chase edges—doorways, reflections, the half-second before someone notices the camera.",
                                perspective: "A city is a chorus; I try to hear one voice without silencing the rest.",
                                vision: "A catalog of portraits that refuses flattery as the default setting.",
                                constructing: "Print scale and paper matter as much as the frame; the object is the last edit.",
                                context: "Editorial and documentary training; influenced by classic street photography and contemporary portraiture.",
                                quote: "If the picture feels comfortable too fast, I re-shoot.",
                                introGallery: [
                                    { src: image1, alt: "Marie Northington — portrait", caption: "Portrait study" },
                                    { src: image5, alt: "Urban light", caption: "Available light, 2025" },
                                    { src: image2, alt: "Street sequence", caption: null },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/marie-northington", label: "Official site" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "Blue hour ledger",
                                    summary: "Ongoing series on transit corridors after dusk.",
                                    image: image5,
                                    href: "/journal/entry/blue-hour-ledger",
                                },
                            ],
                            editions: ["portrait-two", "ink-study"],
                            programs: [],
                            masterPortfolio: [
                                {
                                    src: image5,
                                    title: "Ledger 14",
                                    year: 2025,
                                    medium: "Archival pigment print",
                                },
                            ],
                            events: {
                                upcoming: null,
                                past: {
                                    id: "evt_marie_2025_08",
                                    title: "Print fair signing",
                                    startsAt: "2025-08-03T18:00:00.000Z",
                                    href: "/event/marie-2025-08",
                                },
                            },
                            wordsFromArtist: {
                                body: "I want strangers to feel seen without being exposed—that line is the whole job.",
                                attribution: "Marie Northington",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                        ja: {
                            name: "Marie Northington",
                            discipline: "写真",
                            status: "available",
                            prestige: 5,
                            location: {
                                city: "ポートランド",
                                state: "オレゴン州",
                                country: "アメリカ合衆国",
                                display: "アメリカ合衆国オレゴン州ポートランド",
                            },
                            bio: "ポートレート、都市のリズム、自然光を扱うフォトグラファー。",
                            bioLong: "公私が交差する人と場所を記録。委託や編集仕事が長期的な個人シリーズにも影響しています。",
                            seo: {
                                title: "Marie Northington · Fusion",
                                description: "Marie Northington のアーティストプロフィール。",
                            },
                            world: {
                                practice: "境界を追います。扉、反射、被写体がカメラに気づく直前の半秒。",
                                perspective: "都市は合唱です。他を消さずに一つの声を聴こうとします。",
                                vision: "お世辞をデフォルトにしないポートレートのカタログにしたい。",
                                constructing: "プリントのサイズと紙はフレームと同じくらい重要で、物体が最後の編集です。",
                                context: "編集とドキュメンタリーの訓練。古典的ストリートと現代ポートレートの影響。",
                                quote: "写真がすぐに心地よすぎたら、撮り直します。",
                                introGallery: [
                                    { src: image1, alt: "Marie Northington — ポートレート", caption: "ポートレート・スタディ" },
                                    { src: image5, alt: "都市の光", caption: "自然光、2025" },
                                    { src: image2, alt: "ストリートの連作", caption: null },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/marie-northington", label: "公式サイト" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "ブルーアワー・レジャー",
                                    summary: "黄昏のトランジット回廊を巡る進行中のシリーズ。",
                                    image: image5,
                                    href: "/journal/entry/blue-hour-ledger",
                                },
                            ],
                            editions: ["portrait-two", "ink-study"],
                            programs: [],
                            masterPortfolio: [
                                {
                                    src: image5,
                                    title: "レジャー 14",
                                    year: 2025,
                                    medium: "アーカイバル・ピグメントプリント",
                                },
                            ],
                            events: {
                                upcoming: null,
                                past: {
                                    id: "evt_marie_2025_08",
                                    title: "プリント・フェア・サイン会",
                                    startsAt: "2025-08-03T18:00:00.000Z",
                                    href: "/event/marie-2025-08",
                                },
                            },
                            wordsFromArtist: {
                                body: "見知らぬ人に、晒すことなく見られたと感じてほしい。その線が仕事のすべてです。",
                                attribution: "Marie Northington",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                    },
                    account: {
                        subscription: { tier: "member", renewsAt: "2026-05-01T00:00:00.000Z" },
                        bookmarks: [],
                        inbox: [],
                        sent: [],
                        scheduledMeetings: [],
                    },
                },
                {
                    id: "artist_zack_foster_001",
                    slug: "zack-foster",
                    image: image6,
                    featuredOrder: 7,
                    visibility: "public",
                    updatedAt: "2026-04-01T12:00:00.000Z",
                    filter: {
                        connection: "artist",
                        cohortYear: 2026,
                        disciplineKey: "other",
                        locationKey: "us",
                    },
                    galleryFilter: {
                        accessType: "preview",
                        season: 2026,
                        view: "preview",
                    },
                    locales: {
                        en: {
                            name: "Zack Foster",
                            discipline: "Visual Art",
                            status: "available",
                            prestige: 5,
                            location: {
                                city: "Chicago",
                                state: "Illinois",
                                country: "United States",
                                display: "Chicago, Illinois, United States",
                            },
                            bio: "Visual artist working in painting, digital collage, and large-scale color fields.",
                            bioLong: "Zack Foster explores how digital and analog mark-making inform each other. Recent canvases layer raster glitches with hand-tuned gradients.",
                            seo: {
                                title: "Zack Foster · Fusion",
                                description: "Artist profile for Zack Foster — visual art, painting, and digital hybrid work.",
                            },
                            world: {
                                practice: "I translate errors—compression, banding, misregistration—into deliberate composition.",
                                perspective: "Color is argument; scale decides whether the viewer argues back.",
                                vision: "A studio practice where software sketches and oil studies share the same wall.",
                                constructing: "Underpainting stays loose; the final skin is tight so the tension reads from ten feet.",
                                context: "Background in graphic design; current work bridges gallery painting and net-aesthetic histories.",
                                quote: "I’m not nostalgic for the glitch—I’m interested in what it reveals about attention.",
                                introGallery: [
                                    { src: image6, alt: "Zack Foster — canvas detail", caption: "Canvas, 2025" },
                                    { src: image1, alt: "Color study", caption: null },
                                    { src: image2, alt: "Studio wall", caption: "Studio wall" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/zack-foster", label: "Official site" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "Raster hymns",
                                    summary: "Large canvases pairing airbrush with printed mesh overlays.",
                                    image: image6,
                                    href: "/journal/entry/raster-hymns",
                                },
                            ],
                            editions: ["ink-study"],
                            programs: [],
                            masterPortfolio: [
                                {
                                    src: image6,
                                    title: "Raster Hymn II",
                                    year: 2025,
                                    medium: "Oil, acrylic, inkjet on canvas",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_zack_2026_07",
                                    title: "Solo booth · summer fair",
                                    startsAt: "2026-07-18T16:00:00.000Z",
                                    href: "/event/zack-2026-07",
                                },
                                past: {
                                    id: "evt_zack_2025_10",
                                    title: "Two-person show",
                                    startsAt: "2025-10-11T21:00:00.000Z",
                                    href: "/event/zack-2025-10",
                                },
                            },
                            wordsFromArtist: {
                                body: "I want the surface to feel like it was finished twice—once by hand, once by machine.",
                                attribution: "Zack Foster",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                        ja: {
                            name: "Zack Foster",
                            discipline: "ビジュアルアート",
                            status: "available",
                            prestige: 5,
                            location: {
                                city: "シカゴ",
                                state: "イリノイ州",
                                country: "アメリカ合衆国",
                                display: "アメリカ合衆国イリノイ州シカゴ",
                            },
                            bio: "絵画、デジタル・コラージュ、大規模な色面を扱うビジュアル・アーティスト。",
                            bioLong: "デジタルとアナログのマークメイクがどう互いを形作るかを探る。最近のキャンバスはラスターのグリッチと手で調整したグラデーションを重ねています。",
                            seo: {
                                title: "Zack Foster · Fusion",
                                description: "Zack Foster のアーティストプロフィール。",
                            },
                            world: {
                                practice: "圧縮、バンディング、位置ずれなどのエラーを、意図的な構成に翻訳します。",
                                perspective: "色は議論であり、スケールは観客が議論を返すかどうかを決めます。",
                                vision: "ソフトのスケッチと油のスタディが同じ壁を共有する制作です。",
                                constructing: "下塗りは緩く、最終の皮膜は緊密に。緊張は数メートル離れて読めるようにします。",
                                context: "グラフィックデザインの背景。ギャラリーの絵画とネット美学の系譜を橋渡ししています。",
                                quote: "グリッチにノスタルジーはない。注意が何を露わにするかに興味があります。",
                                introGallery: [
                                    { src: image6, alt: "Zack Foster — キャンバスのディテール", caption: "キャンバス、2025" },
                                    { src: image1, alt: "カラー・スタディ", caption: null },
                                    { src: image2, alt: "スタジオの壁", caption: "スタジオの壁" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/zack-foster", label: "公式サイト" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "ラスター・ヒムズ",
                                    summary: "エアブラシとプリントメッシュのオーバーレイを組み合わせた大きなキャンバス。",
                                    image: image6,
                                    href: "/journal/entry/raster-hymns",
                                },
                            ],
                            editions: ["ink-study"],
                            programs: [],
                            masterPortfolio: [
                                {
                                    src: image6,
                                    title: "ラスター・ヒム II",
                                    year: 2025,
                                    medium: "油彩、アクリル、インクジェット、キャンバス",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_zack_2026_07",
                                    title: "ソロ・ブース · サマー・フェア",
                                    startsAt: "2026-07-18T16:00:00.000Z",
                                    href: "/event/zack-2026-07",
                                },
                                past: {
                                    id: "evt_zack_2025_10",
                                    title: "二人展",
                                    startsAt: "2025-10-11T21:00:00.000Z",
                                    href: "/event/zack-2025-10",
                                },
                            },
                            wordsFromArtist: {
                                body: "表面は二度完成したように感じてほしい。一度は手で、一度は機械で。",
                                attribution: "Zack Foster",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                    },
                    account: {
                        subscription: { tier: "member", renewsAt: "2026-05-01T00:00:00.000Z" },
                        bookmarks: [],
                        inbox: [],
                        sent: [],
                        scheduledMeetings: [],
                    },
                },
                {
                    id: "artist_laura_laurens_001",
                    slug: "laura-laurens",
                    image: image7,
                    featuredOrder: 8,
                    visibility: "public",
                    updatedAt: "2026-04-01T12:00:00.000Z",
                    filter: {
                        connection: "artist",
                        cohortYear: 2025,
                        disciplineKey: "other",
                        locationKey: "uk",
                    },
                    galleryFilter: {
                        accessType: "opening",
                        season: 2025,
                        view: "opening",
                    },
                    locales: {
                        en: {
                            name: "Laura Laurens",
                            discipline: "Fashion",
                            status: "showing",
                            prestige: 6,
                            location: {
                                city: "London",
                                state: null,
                                country: "United Kingdom",
                                display: "London, United Kingdom",
                            },
                            bio: "Fashion designer and artist exploring silhouette, tailoring, and textile narrative.",
                            bioLong: "Laura Laurens works between runway prototypes and exhibition garments. Material research centers on drape, weight, and how cloth records movement.",
                            seo: {
                                title: "Laura Laurens · Fusion",
                                description: "Artist profile for Laura Laurens — fashion, garment, and textile narrative.",
                            },
                            world: {
                                practice: "I drape before I draw—gravity is the first collaborator.",
                                perspective: "Fashion is time made visible; a season is a sentence you can wear.",
                                vision: "A practice that treats the body as architecture and cloth as weather.",
                                constructing: "Seams are hidden arguments; linings carry the private truth of the piece.",
                                context: "Training in tailoring and textile design; collaborations with choreographers and photographers.",
                                quote: "If it only reads in motion, it still has to hold still for a photograph.",
                                introGallery: [
                                    { src: image7, alt: "Laura Laurens — garment detail", caption: "Look study" },
                                    { src: image1, alt: "Fabric drape", caption: null },
                                    { src: image2, alt: "Runway still", caption: "Runway documentation" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/laura-laurens", label: "Official site" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "Spring capsule",
                                    summary: "Limited run of tailored jackets with hand-finished edges.",
                                    image: image7,
                                    href: "/journal/entry/spring-capsule",
                                },
                            ],
                            editions: [],
                            programs: ["fusion-residency-2025"],
                            masterPortfolio: [
                                {
                                    src: image7,
                                    title: "Jacket I",
                                    year: 2026,
                                    medium: "Wool, silk, metal hardware",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_laura_2026_06",
                                    title: "Presentation · London",
                                    startsAt: "2026-06-01T19:00:00.000Z",
                                    href: "/event/laura-2026-06",
                                },
                                past: {
                                    id: "evt_laura_2025_03",
                                    title: "Studio preview",
                                    startsAt: "2025-03-14T18:30:00.000Z",
                                    href: "/event/laura-2025-03",
                                },
                            },
                            wordsFromArtist: {
                                body: "Cloth should whisper before it shouts—volume is the last decision, not the first.",
                                attribution: "Laura Laurens",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                        ja: {
                            name: "Laura Laurens",
                            discipline: "ファッション",
                            status: "showing",
                            prestige: 6,
                            location: {
                                city: "ロンドン",
                                state: null,
                                country: "イギリス",
                                display: "イギリス、ロンドン",
                            },
                            bio: "シルエット、テーラーリング、テキスタイルの物語を探るファッション・デザイナー兼アーティスト。",
                            bioLong: "ランウェイのプロトタイプと展示向けの衣服のあいだで制作。ドレープ、重さ、布が動きをどう記録するかを研究しています。",
                            seo: {
                                title: "Laura Laurens · Fusion",
                                description: "Laura Laurens のアーティストプロフィール。",
                            },
                            world: {
                                practice: "描く前にドレープします。最初の共同制作者は重力です。",
                                perspective: "ファッションは時間を可視化するもの。シーズンは着られる一文です。",
                                vision: "身体を建築、布を天気として扱う制作です。",
                                constructing: "縫い目は隠れた議論。裏地は作品の私的な真実を載せます。",
                                context: "テーラーリングとテキスタイル・デザインの訓練。振付家やフォトグラファーとの協働。",
                                quote: "動きでしか読めなくても、静止画で成立する必要があります。",
                                introGallery: [
                                    { src: image7, alt: "Laura Laurens — 衣服のディテール", caption: "ルック・スタディ" },
                                    { src: image1, alt: "布のドレープ", caption: null },
                                    { src: image2, alt: "ランウェイのスチル", caption: "ランウェイ記録" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/laura-laurens", label: "公式サイト" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "スプリング・カプセル",
                                    summary: "手仕上げのエッジを持つテーラードジャケットの限定ライン。",
                                    image: image7,
                                    href: "/journal/entry/spring-capsule",
                                },
                            ],
                            editions: [],
                            programs: ["fusion-residency-2025"],
                            masterPortfolio: [
                                {
                                    src: image7,
                                    title: "ジャケット I",
                                    year: 2026,
                                    medium: "ウール、シルク、金具",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_laura_2026_06",
                                    title: "プレゼンテーション · ロンドン",
                                    startsAt: "2026-06-01T19:00:00.000Z",
                                    href: "/event/laura-2026-06",
                                },
                                past: {
                                    id: "evt_laura_2025_03",
                                    title: "スタジオ・プレビュー",
                                    startsAt: "2025-03-14T18:30:00.000Z",
                                    href: "/event/laura-2025-03",
                                },
                            },
                            wordsFromArtist: {
                                body: "布は叫ぶ前にささやくべきです。ボリュームは最後の決定であって最初ではありません。",
                                attribution: "Laura Laurens",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                    },
                    account: {
                        subscription: { tier: "member", renewsAt: "2026-05-01T00:00:00.000Z" },
                        bookmarks: [],
                        inbox: [],
                        sent: [],
                        scheduledMeetings: [],
                    },
                },
                {
                    id: "artist_nada_hatemlah_001",
                    slug: "nada-hatemlah",
                    image: image8,
                    featuredOrder: 9,
                    visibility: "public",
                    updatedAt: "2026-04-01T12:00:00.000Z",
                    filter: {
                        connection: "artist",
                        cohortYear: 2024,
                        disciplineKey: "photography",
                        locationKey: "canada",
                    },
                    galleryFilter: {
                        accessType: "opening",
                        season: 2024,
                        view: "opening",
                    },
                    locales: {
                        en: {
                            name: "Nada Hatemlah",
                            discipline: "Photography",
                            status: "studio",
                            prestige: 6,
                            location: {
                                city: "Montreal",
                                state: "Quebec",
                                country: "Canada",
                                display: "Montreal, Quebec, Canada",
                            },
                            bio: "Photographer investigating family archives, migration, and domestic interiors.",
                            bioLong: "Nada Hatemlah re-stages found photographs and objects to speak to displacement and care. The studio is treated as a quiet theater for memory.",
                            seo: {
                                title: "Nada Hatemlah · Fusion",
                                description: "Artist profile for Nada Hatemlah — photography, archive, and interior narrative.",
                            },
                            world: {
                                practice: "I begin with an object that refuses to explain itself—a frame, a letter, a chipped cup.",
                                perspective: "Home is a moving target; the camera is how I negotiate distance.",
                                vision: "A body of work where tenderness and critique share the same negative space.",
                                constructing: "Prints are small on purpose; the viewer has to lean in like a confession.",
                                context: "Influenced by diasporic narratives and documentary ethics; long-term portrait collaborations.",
                                quote: "Archives lie politely; I’m interested in the rude truth in the margin.",
                                introGallery: [
                                    { src: image8, alt: "Nada Hatemlah — interior", caption: "Interior, 2025" },
                                    { src: image1, alt: "Archive table", caption: null },
                                    { src: image2, alt: "Portrait study", caption: "Family series" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/nada-hatemlah", label: "Official site" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "Margin letters",
                                    summary: "Studio reconstruction of annotated family photographs.",
                                    image: image8,
                                    href: "/journal/entry/margin-letters",
                                },
                            ],
                            editions: ["portrait-one"],
                            programs: [],
                            masterPortfolio: [
                                {
                                    src: image8,
                                    title: "Margin 7",
                                    year: 2025,
                                    medium: "Silver gelatin print",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_nada_2026_08",
                                    title: "Archive talk",
                                    startsAt: "2026-08-09T20:00:00.000Z",
                                    href: "/event/nada-2026-08",
                                },
                                past: {
                                    id: "evt_nada_2025_04",
                                    title: "Group exhibition",
                                    startsAt: "2025-04-18T22:00:00.000Z",
                                    href: "/event/nada-2025-04",
                                },
                            },
                            wordsFromArtist: {
                                body: "I photograph to argue with what I was told was settled.",
                                attribution: "Nada Hatemlah",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                        ja: {
                            name: "Nada Hatemlah",
                            discipline: "写真",
                            status: "studio",
                            prestige: 6,
                            location: {
                                city: "モントリオール",
                                state: "ケベック州",
                                country: "カナダ",
                                display: "カナダ、ケベック州モントリオール",
                            },
                            bio: "家族のアーカイブ、移動、家庭の内面を探るフォトグラファー。",
                            bioLong: "見つかった写真や物を再構成し、移動とケアについて語ります。スタジオは記憶のための静かな劇場として扱います。",
                            seo: {
                                title: "Nada Hatemlah · Fusion",
                                description: "Nada Hatemlah のアーティストプロフィール。",
                            },
                            world: {
                                practice: "説明を拒む物から始めます。額、手紙、欠けたカップ。",
                                perspective: "家は動く標的で、カメラは距離を交渉する手段です。",
                                vision: "優しさと批評が同じ余白を分かち合う作品群にしたい。",
                                constructing: "プリントは小さく。観客は告白のように身を乗り出す必要があります。",
                                context: "ディアスポラの物語とドキュメンタリーの倫理の影響。長期的なポートレート協働。",
                                quote: "アーカイブは丁寧に嘘をつく。余白の粗暴な真実に興味があります。",
                                introGallery: [
                                    { src: image8, alt: "Nada Hatemlah — インテリア", caption: "インテリア、2025" },
                                    { src: image1, alt: "アーカイブの机", caption: null },
                                    { src: image2, alt: "ポートレート・スタディ", caption: "家族シリーズ" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/nada-hatemlah", label: "公式サイト" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "マージン・レターズ",
                                    summary: "注釈のついた家族写真をスタジオで再構成する作品。",
                                    image: image8,
                                    href: "/journal/entry/margin-letters",
                                },
                            ],
                            editions: ["portrait-one"],
                            programs: [],
                            masterPortfolio: [
                                {
                                    src: image8,
                                    title: "マージン 7",
                                    year: 2025,
                                    medium: "ゼラチン・シルバープリント",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_nada_2026_08",
                                    title: "アーカイブ・トーク",
                                    startsAt: "2026-08-09T20:00:00.000Z",
                                    href: "/event/nada-2026-08",
                                },
                                past: {
                                    id: "evt_nada_2025_04",
                                    title: "グループ展",
                                    startsAt: "2025-04-18T22:00:00.000Z",
                                    href: "/event/nada-2025-04",
                                },
                            },
                            wordsFromArtist: {
                                body: "写真は、決着したと言われたことと議論するための手段です。",
                                attribution: "Nada Hatemlah",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                    },
                    account: {
                        subscription: { tier: "member", renewsAt: "2026-05-01T00:00:00.000Z" },
                        bookmarks: [],
                        inbox: [],
                        sent: [],
                        scheduledMeetings: [],
                    },
                },
                {
                    id: "artist_jade_vandenhout_001",
                    slug: "jade-vandenhout",
                    image: image9,
                    featuredOrder: 10,
                    visibility: "public",
                    updatedAt: "2026-04-01T12:00:00.000Z",
                    filter: {
                        connection: "artist",
                        cohortYear: 2025,
                        disciplineKey: "performanceArt",
                        locationKey: "europe",
                    },
                    galleryFilter: {
                        accessType: "preview",
                        season: 2025,
                        view: "preview",
                    },
                    locales: {
                        en: {
                            name: "Jade Vandenhout",
                            discipline: "Performance Art",
                            status: "prep",
                            prestige: 5,
                            location: {
                                city: "Antwerp",
                                state: null,
                                country: "Belgium",
                                display: "Antwerp, Belgium",
                            },
                            bio: "Performance artist developing voice-led works for theater and non-traditional spaces.",
                            bioLong: "Jade Vandenhout builds scores from speech patterns and breath. Upcoming work prepares a touring piece for mid-size venues with live amplification.",
                            seo: {
                                title: "Jade Vandenhout · Fusion",
                                description: "Artist profile for Jade Vandenhout — performance art, voice, and live score.",
                            },
                            world: {
                                practice: "I write from overheard sentences—fragments become rhythm before they become meaning.",
                                perspective: "The stage is a microphone for the room; the audience’s cough is part of the arrangement.",
                                vision: "A touring practice that scales intimacy without scaling noise.",
                                constructing: "Amplification is staged like lighting—what you don’t hear defines the scene.",
                                context: "Training in theater and choral work; recent collaborations with sound designers.",
                                quote: "If the breath is honest, the text can be strange.",
                                introGallery: [
                                    { src: image9, alt: "Jade Vandenhout — performance", caption: "Rehearsal, 2025" },
                                    { src: image1, alt: "Score pages", caption: null },
                                    { src: image2, alt: "Venue sketch", caption: "Venue study" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/jade-vandenhout", label: "Official site" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "Touring score (draft)",
                                    summary: "Mid-size venue adaptation with revised amplification plot.",
                                    image: image9,
                                    href: "/journal/entry/touring-score",
                                },
                            ],
                            editions: [],
                            programs: [],
                            masterPortfolio: [
                                {
                                    src: image9,
                                    title: "Score fragment A",
                                    year: 2025,
                                    medium: "Performance documentation, ink on paper",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_jade_2026_09",
                                    title: "Workshop week · Antwerp",
                                    startsAt: "2026-09-02T17:00:00.000Z",
                                    href: "/event/jade-2026-09",
                                },
                                past: {
                                    id: "evt_jade_2025_11",
                                    title: "Preview evening",
                                    startsAt: "2025-11-08T20:00:00.000Z",
                                    href: "/event/jade-2025-11",
                                },
                            },
                            wordsFromArtist: {
                                body: "I’m building a show you can hear before you understand the words.",
                                attribution: "Jade Vandenhout",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                        ja: {
                            name: "Jade Vandenhout",
                            discipline: "パフォーマンス",
                            status: "prep",
                            prestige: 5,
                            location: {
                                city: "アントワープ",
                                state: null,
                                country: "ベルギー",
                                display: "ベルギー、アントワープ",
                            },
                            bio: "劇場と非伝統的な空間向けに、声を中心とした作品を育てるパフォーマンス・アーティスト。",
                            bioLong: "話し方や呼吸からスコアを組み立てます。進行中の作品は中規模会場向けのツアーで、ライブ拡声を伴います。",
                            seo: {
                                title: "Jade Vandenhout · Fusion",
                                description: "Jade Vandenhout のアーティストプロフィール。",
                            },
                            world: {
                                practice: "盗み聞きした文から書きます。断片は意味になる前にリズムになります。",
                                perspective: "舞台は部屋のためのマイクで、客席の咳も配器の一部です。",
                                vision: "親密さは広げつつ、騒音だけはスケールさせないツアー制作です。",
                                constructing: "拡声は照明のように段取りします。聞こえないものが場面を定義します。",
                                context: "演劇と合唱の訓練。最近は音響デザイナーとの協働。",
                                quote: "呼吸が正直なら、テキストは奇妙であっていい。",
                                introGallery: [
                                    { src: image9, alt: "Jade Vandenhout — パフォーマンス", caption: "リハーサル、2025" },
                                    { src: image1, alt: "スコアのページ", caption: null },
                                    { src: image2, alt: "会場のスケッチ", caption: "会場スタディ" },
                                ],
                            },
                            links: [
                                { type: "website", url: "https://example.com/jade-vandenhout", label: "公式サイト" },
                                { type: "instagram", url: "https://www.instagram.com/", label: "Instagram" },
                            ],
                            currentWork: [
                                {
                                    title: "ツアー・スコア（草案）",
                                    summary: "拡声プロットを改訂した中規模会場向け版。",
                                    image: image9,
                                    href: "/journal/entry/touring-score",
                                },
                            ],
                            editions: [],
                            programs: [],
                            masterPortfolio: [
                                {
                                    src: image9,
                                    title: "スコア断片 A",
                                    year: 2025,
                                    medium: "パフォーマンス記録、紙にインク",
                                },
                            ],
                            events: {
                                upcoming: {
                                    id: "evt_jade_2026_09",
                                    title: "ワークショップ・ウィーク · アントワープ",
                                    startsAt: "2026-09-02T17:00:00.000Z",
                                    href: "/event/jade-2026-09",
                                },
                                past: {
                                    id: "evt_jade_2025_11",
                                    title: "プレビュー・イブニング",
                                    startsAt: "2025-11-08T20:00:00.000Z",
                                    href: "/event/jade-2025-11",
                                },
                            },
                            wordsFromArtist: {
                                body: "言葉を理解する前に聞こえるショウをつくっています。",
                                attribution: "Jade Vandenhout",
                            },
                            notes: {
                                curators: [],
                                artists: [],
                                galleries: [],
                            },
                        },
                    },
                    account: {
                        subscription: { tier: "member", renewsAt: "2026-05-01T00:00:00.000Z" },
                        bookmarks: [],
                        inbox: [],
                        sent: [],
                        scheduledMeetings: [],
                    },
                },
        ],
    },
    objectsHighlight: {
        order: 4,
        objects: [
            {
                en: {
                    name: "Object 1",
                    artist: "Artist 1",
                    alt: "Object 1",
                    credit: "Credit 1",
                    description: "Object 1 description",
                    copy: "Object 1 copy",
                },
                ja: {
                    name: "作品 1",
                    artist: "アーティスト 1",
                    alt: "作品 1",
                    credit: "クレジット 1",
                    description: "作品 1 の説明文です。",
                    copy: "作品 1 のキャプションです。",
                },
                link: "https://www.google.com",
                image: object1,
            },
            {
                en: {
                    name: "Object 2",
                    artist: "Artist 2",
                    alt: "Object 2",
                    credit: "Credit 2",
                    description: "Object 2 description",
                    link: "https://www.google.com",
                    copy: "Object 2 copy",
                },
                ja: {
                    name: "作品 2",
                    artist: "アーティスト 2",
                    alt: "作品 2",
                    credit: "クレジット 2",
                    description: "作品 2 の説明文です。",
                    link: "https://www.google.com",
                    copy: "作品 2 のキャプションです。",
                },
                image: object2,
                link: "https://www.google.com",
            },
            {
                en: {
                    name: "Object 3",
                    artist: "Artist 3",
                    alt: "Object 3",
                    credit: "Credit 3",
                    description: "Object 3 description",
                    copy: "Object 3 copy",
                },
                ja: {
                    name: "作品 3",
                    artist: "アーティスト 3",
                    alt: "作品 3",
                    credit: "クレジット 3",
                    description: "作品 3 の説明文です。",
                    copy: "作品 3 のキャプションです。",
                },
                image: object3,
                link: "https://www.google.com",
            },
            {
                en: {
                    name: "Object 4",
                    artist: "Artist 4",
                    alt: "Object 4",
                    credit: "Credit 4",
                    description: "Object 4 description",
                    copy: "Object 4 copy",
                },
                ja: {
                    name: "作品 4",
                    artist: "アーティスト 4",
                    alt: "作品 4",
                    credit: "クレジット 4",
                    description: "作品 4 の説明文です。",
                    copy: "作品 4 のキャプションです。",
                },
                image: object4,
                link: "https://www.google.com",
            },
        ],
    },
    galleryAccessCta: {
        order: 5,
        ctaLink: "/request/gallery-access",
        en: {
            cta: "Request Access",
            ctaHeadText: "Discover artists from Fusion’s curated programs.",
            ctaSubText: "Access studio visits, artist introductions,<br> and upcoming exhibitions.",
        },
        ja: {
            cta: "アクセスをリクエスト",
            ctaHeadText: "Fusionがキュレーションするプログラムからアーティストを発見しましょう。",
            ctaSubText: "スタジオ訪問、アーティスト紹介、<br>開催予定の展示へ。",
        }
    },
    journals: {
        order: 6,
        journals: [
            {
                id: 1,
                imageSrc: journal1,
                link: "/journal/entry/1",
                en: {
                    imageAlt: "A, E, I, O, U Park",
                    title: "A,E,I,O,U Park",
                    cta: "Read Entry",
                    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
                },
                ja: {
                    imageAlt: "A,E,I,O,U パーク",
                    title: "A,E,I,O,U パーク",
                    cta: "記事を読む",
                    description:
                        "母音と空間、身体のリズムをテーマにした野外プロジェクトの記録。制作と展示のプロセスを追います。",
                },
            },
            {
                id: 2,
                imageSrc: journal2,
                link: "/journal/entry/2",
                en: {
                    imageAlt: "Journal 2",
                    title: "Journal 2",
                    cta: "Read Entry",
                    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
                },
                ja: {
                    imageAlt: "ジャーナル 2",
                    title: "ジャーナル 2",
                    cta: "記事を読む",
                    description:
                        "スタジオでの試作と試行錯誤に焦点を当てたエントリー。素材と光の関係を短いエッセイで綴ります。",
                },
            },
            {
                id: 3,
                imageSrc: journal3,
                link: "/journal/entry/3",
                en: {
                    imageAlt: "Journal 3",
                    title: "Journal 3",
                    cta: "Read Entry",
                    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices gravida. ",
                },
                ja: {
                    imageAlt: "ジャーナル 3",
                    title: "ジャーナル 3",
                    cta: "記事を読む",
                    description:
                        "巡回展に向けたキュレーション・ノートとアーティストとの対話。来場の見どころを先取りして紹介します。",
                },
            },
        ],
    },
    /** Copy for `app-join-network` — use `context="home" | "artists" | "gallery-access" | "journal" | "community" | "context"`. */
    joinNetwork: {
        home: {
            en: {
                title: 'Join the FUSION Network',
                description:
                    'A global platform connecting artists, galleries and curators through programs rooted in Japan.',
            },
            ja: {
                title: 'FUSIONネットワークに参加する',
                description:
                    '日本を拠点としたプログラムを通じて、アーティスト、ギャラリー、キュレーターをつなぐグローバルなプラットフォーム。',
            },
        },
        artists: {
            en: {
                title: 'Join the FUSION Network',
                description:
                    'Connect with artists and discover opportunities across Fusion programs.',
            },
            ja: {
                title: 'FUSIONネットワークに参加する',
                description: 'Fusionのプログラムを通じてアーティストとつながり、機会を見つけましょう。',
            },
        },
        'gallery-access': {
            en: {
                title: 'Gallery access starts here',
                description:
                    'Request access to studio visits, artist introductions, and exhibition previews.',
            },
            ja: {
                title: 'ギャラリーアクセスはここから',
                description: 'スタジオ訪問、アーティスト紹介、展示プレビューへのアクセスをリクエストできます。',
            },
        },
        journal: {
            en: {
                title: 'The Journal',
                description:
                    'Editorial features, interviews, and long-form stories from the Fusion network—subscribe for new entries.',
            },
            ja: {
                title: 'ジャーナル',
                description:
                    'Fusionネットワークからの特集、インタビュー、長文レポート。新着エントリの通知を受け取れます。',
            },
        },
        community: {
            en: {
                title: 'Join the community',
                description:
                    'Stay connected with announcements, events, and fellow members of the Fusion network.',
            },
            ja: {
                title: 'コミュニティに参加する',
                description: 'お知らせ、イベント、Fusionネットワークのメンバーとのつながりを維持しましょう。',
            },
        },
        context: {
            en: {
                title: 'Context',
                description:
                    'Company background, mission, and how Fusion sits in the wider art ecosystem.',
            },
            ja: {
                title: 'コンテキスト',
                description: 'Fusionの背景、ミッション、そしてより広いアートのエコシステムにおける位置づけ。',
            },
        },
    },
    /**
     * Multi-stage join modal (`app-join-network`): keyed by `data-modal-type` membership | access | apply.
     * Stages: band (teaser), entry, value, payment, linkAccount (pay-first II), confirmation.
     */
    joinNetworkFlow: {
        membership: {
            band: {
                en: {
                    title: 'Join the FUSION Network',
                    description:
                        'A global platform connecting artists, galleries and curators through programs rooted in Japan.',
                    openLabel: 'Join FUSION',
                },
                ja: {
                    title: 'FUSIONネットワークに参加する',
                    description:
                        '日本を拠点としたプログラムを通じて、アーティスト、ギャラリー、キュレーターをつなぐグローバルなプラットフォーム。',
                    openLabel: '参加する',
                },
            },
            entry: {
                en: {
                    dialogTitle: 'Join FUSION',
                    subtitle: 'Start your 3-month membership.',
                    namePlaceholder: 'Full Name',
                    emailPlaceholder: 'Email',
                    roleLabel: 'I am:',
                    continueLabel: 'Continue',
                    renewHint: 'Renews every 2 months at $50',
                    footerDisclaimer: 'Residency participation is confirmed separately. Program fee: $5,000.',
                },
                ja: {
                    dialogTitle: 'FUSION に参加',
                    subtitle: '3 か月のメンバーシップを始めます。',
                    namePlaceholder: 'お名前',
                    emailPlaceholder: 'メール',
                    roleLabel: '属性:',
                    continueLabel: '次へ',
                    renewHint: '2 か月ごとに $50 で更新',
                    footerDisclaimer: 'レジデンシー参加は別途確認されます。プログラム費用：$5,000。',
                },
            },
            value: {
                en: {
                    title: 'Access FUSION',
                    lead: 'Join a curated platform connecting artists, galleries, curators, and collectors through programs rooted in Japan.',
                    price: '$50',
                    periodLabel: '3 Months Access',
                    includesTitle: 'Includes:',
                    includes: [
                        'Artist profile + gallery system',
                        'Residency eligibility',
                        'Access to network and platform updates',
                    ],
                    renewLine: 'Renews every 2 months at $50',
                    disclaimer: 'Residency participation is confirmed separately. Program fee: $5,000.',
                    continueLabel: 'Continue',
                },
                ja: {
                    title: 'FUSION にアクセス',
                    lead: '日本をルーツに持つプログラムを通じて、アーティスト、ギャラリー、キュレーター、コレクターをつなぐキュレーション型のプラットフォームです。',
                    price: '$50',
                    periodLabel: '3 か月アクセス',
                    includesTitle: '含まれるもの:',
                    includes: [
                        'アーティストプロフィールとギャラリーシステム',
                        'レジデンシー応募資格',
                        'ネットワークとプラットフォーム更新へのアクセス',
                    ],
                    renewLine: '2 か月ごとに $50 で更新',
                    disclaimer: 'レジデンシー参加は別途確認。プログラム費用：$5,000。',
                    continueLabel: '次へ',
                },
            },
            payment: {
                en: {
                    title: 'Complete Your Membership',
                    subtitle: 'Start your 3-month membership.',
                    orderLabel: 'FUSION',
                    line3Months: '3 Months Access',
                    lineRenew: 'Renew Every 2 Months',
                    amount: '$50.00',
                    totalLabel: 'Total',
                    cardNumberLabel: 'Card Number',
                    expiryLabel: 'Expiry (MM/YY)',
                    cvcLabel: 'CVC',
                    rememberCard: 'Remember my card',
                    expressOr: 'or',
                    completeLabel: 'Complete Payment',
                    footerNote: 'Secure one-time payment. FUSION renews every 2 months for $50.',
                    devCompleteLabel: 'Complete access (demo)',
                },
                ja: {
                    title: 'お支払いを完了',
                    subtitle: '3 か月のメンバーシップを開始。',
                    orderLabel: 'FUSION',
                    line3Months: '3 か月アクセス',
                    lineRenew: '2 か月ごとの更新',
                    amount: '$50.00',
                    totalLabel: '合計',
                    cardNumberLabel: 'カード番号',
                    expiryLabel: '有効期限',
                    cvcLabel: 'CVC',
                    rememberCard: 'カードを記憶する',
                    expressOr: 'または',
                    completeLabel: '支払いを完了',
                    footerNote: '安全な一回のお支払い。FUSION は 2 か月ごとに $50 で更新されます。',
                    devCompleteLabel: 'デモで完了',
                },
            },
            linkAccount: {
                en: {
                    title: 'Link your account',
                    lead: 'Sign in with Internet Identity to activate your membership and sync it to your profile.',
                    signInLabel: 'Continue with Internet Identity',
                },
                ja: {
                    title: 'アカウントをリンク',
                    lead: 'メンバーシップを有効にするには、Internet Identity でサインインしてください。',
                    signInLabel: 'Internet Identity で続行',
                },
            },
            confirmation: {
                en: {
                    title: 'Join Confirmation',
                    welcomeTitle: 'Welcome to FUSION!',
                    welcomeBody:
                        'Your membership is confirmed. Start by creating your artist profile to access galleries, residencies, and opportunities.',
                    primaryCta: 'Continue to Profile Setup',
                    secondaryLine: 'Manage your membership and payments from your profile dashboard.',
                    links: [
                        { id: 'profile', label: 'Create Profile', href: '/register' },
                        { id: 'explore', label: 'Explore Work', href: '/gallery-access' },
                        { id: 'residency', label: 'Apply to Residency', href: '/program/kaga-ishikawa' },
                        { id: 'network', label: 'Access Network', href: '/community' },
                    ],
                },
                ja: {
                    title: '登録確認',
                    welcomeTitle: 'FUSION へようこそ！',
                    welcomeBody:
                        'メンバーシップが確認されました。ギャラリー、レジデンシー、機会にアクセスするにはアーティストプロフィールを作成してください。',
                    primaryCta: 'プロフィール設定へ',
                    secondaryLine: 'メンバーシップとお支払いはプロフィールから管理できます。',
                    links: [
                        { id: 'profile', label: 'プロフィール作成', href: '/register' },
                        { id: 'explore', label: '作品を見る', href: '/gallery-access' },
                        { id: 'residency', label: 'レジデンシーに応募', href: '/program/kaga-ishikawa' },
                        { id: 'network', label: 'ネットワーク', href: '/community' },
                    ],
                },
            },
        },
        access: {
            band: {
                en: {
                    title: 'Access Through FUSION',
                    description:
                        'Request access to studio visits, artist introductions, and exhibition previews.',
                    openLabel: 'Access Through FUSION',
                },
                ja: {
                    title: 'FUSION を通じてアクセス',
                    description: 'スタジオ訪問、アーティスト紹介、展示プレビューへのアクセスをリクエストできます。',
                    openLabel: 'アクセスする',
                },
            },
            entry: {
                en: {
                    dialogTitle: 'Access Full Collection',
                    subtitle: 'Start your 3-month membership.',
                    namePlaceholder: 'Full Name',
                    emailPlaceholder: 'Email',
                    roleLabel: 'I am:',
                    continueLabel: 'Continue',
                    renewHint: 'Renews every 2 months at $50',
                    footerDisclaimer: 'Residency participation is confirmed separately. Program fee: $5,000.',
                },
                ja: {
                    dialogTitle: 'コレクションへアクセス',
                    subtitle: '3 か月のメンバーシップを始めます。',
                    namePlaceholder: 'お名前',
                    emailPlaceholder: 'メール',
                    roleLabel: '属性:',
                    continueLabel: '次へ',
                    renewHint: '2 か月ごとに $50 で更新',
                    footerDisclaimer: 'レジデンシー参加は別途確認されます。プログラム費用：$5,000。',
                },
            },
            value: {
                en: {
                    title: 'Access FUSION',
                    lead: 'Join a curated platform connecting artists, galleries, curators, and collectors through programs rooted in Japan.',
                    price: '$50',
                    periodLabel: '3 Months Access',
                    includesTitle: 'Includes:',
                    includes: [
                        'Artist profile + gallery system',
                        'Residency eligibility',
                        'Access to network and platform updates',
                    ],
                    renewLine: 'Renews every 2 months at $50',
                    disclaimer: 'Residency participation is confirmed separately. Program fee: $5,000.',
                    continueLabel: 'Continue',
                },
                ja: {
                    title: 'FUSION にアクセス',
                    lead: '日本をルーツに持つプログラムを通じて、アーティスト、ギャラリー、キュレーター、コレクターをつなぐキュレーション型のプラットフォームです。',
                    price: '$50',
                    periodLabel: '3 か月アクセス',
                    includesTitle: '含まれるもの:',
                    includes: [
                        'アーティストプロフィールとギャラリーシステム',
                        'レジデンシー応募資格',
                        'ネットワークとプラットフォーム更新へのアクセス',
                    ],
                    renewLine: '2 か月ごとに $50 で更新',
                    disclaimer: 'レジデンシー参加は別途確認。プログラム費用：$5,000。',
                    continueLabel: '次へ',
                },
            },
            payment: {
                en: {
                    title: 'Complete Your Access',
                    subtitle: 'Start your 3-month membership.',
                    orderLabel: 'FUSION',
                    line3Months: '3 Months Access',
                    lineRenew: 'Renew Every 2 Months',
                    amount: '$50.00',
                    totalLabel: 'Total',
                    cardNumberLabel: 'Card Number',
                    expiryLabel: 'Expiry (MM/YY)',
                    cvcLabel: 'CVC',
                    rememberCard: 'Remember my card',
                    expressOr: 'or',
                    completeLabel: 'Complete Access',
                    footerNote: 'Secure one-time payment. FUSION renews every 2 months for $50.',
                    devCompleteLabel: 'Complete access (demo)',
                },
                ja: {
                    title: 'アクセスを完了',
                    subtitle: '3 か月のメンバーシップを開始。',
                    orderLabel: 'FUSION',
                    line3Months: '3 か月アクセス',
                    lineRenew: '2 か月ごとの更新',
                    amount: '$50.00',
                    totalLabel: '合計',
                    cardNumberLabel: 'カード番号',
                    expiryLabel: '有効期限',
                    cvcLabel: 'CVC',
                    rememberCard: 'カードを記憶する',
                    expressOr: 'または',
                    completeLabel: 'アクセスを完了',
                    footerNote: '安全な一回のお支払い。FUSION は 2 か月ごとに $50 で更新されます。',
                    devCompleteLabel: 'デモで完了',
                },
            },
            linkAccount: {
                en: {
                    title: 'Link your account',
                    lead: 'Sign in with Internet Identity to activate your access and sync it to your profile.',
                    signInLabel: 'Continue with Internet Identity',
                },
                ja: {
                    title: 'アカウントをリンク',
                    lead: 'アクセスを有効にするには、Internet Identity でサインインしてください。',
                    signInLabel: 'Internet Identity で続行',
                },
            },
            confirmation: {
                en: {
                    title: 'Access Confirmed',
                    welcomeTitle: 'Welcome to FUSION!',
                    welcomeBody:
                        'Your membership is confirmed. Start by creating your artist profile to access galleries, residencies, and opportunities.',
                    primaryCta: 'Continue to Profile Setup',
                    secondaryLine: 'Manage your membership and payments from your profile dashboard.',
                    links: [
                        { id: 'profile', label: 'Create Profile', href: '/register' },
                        { id: 'explore', label: 'Explore Work', href: '/gallery-access' },
                        { id: 'residency', label: 'Apply to Residency', href: '/program/kaga-ishikawa' },
                        { id: 'network', label: 'Access Network', href: '/community' },
                    ],
                },
                ja: {
                    title: 'アクセス確認',
                    welcomeTitle: 'FUSION へようこそ！',
                    welcomeBody:
                        'メンバーシップが確認されました。ギャラリー、レジデンシー、機会にアクセスするにはアーティストプロフィールを作成してください。',
                    primaryCta: 'プロフィール設定へ',
                    secondaryLine: 'メンバーシップとお支払いはプロフィールから管理できます。',
                    links: [
                        { id: 'profile', label: 'プロフィール作成', href: '/register' },
                        { id: 'explore', label: '作品を見る', href: '/gallery-access' },
                        { id: 'residency', label: 'レジデンシーに応募', href: '/program/kaga-ishikawa' },
                        { id: 'network', label: 'ネットワーク', href: '/community' },
                    ],
                },
            },
        },
        apply: {
            band: {
                en: {
                    title: 'Join & Apply',
                    description:
                        'Begin your application to Fusion residency programs—studio access, mentorship, and global exposure.',
                    openLabel: 'Join & Apply',
                },
                ja: {
                    title: '参加して応募',
                    description: 'Fusion のレジデンシープログラムへの応募を始めます。',
                    openLabel: '応募する',
                },
            },
            entry: {
                en: {
                    dialogTitle: 'Join & Apply',
                    subtitle: 'Start your 3-month membership.',
                    namePlaceholder: 'Full Name',
                    emailPlaceholder: 'Email',
                    roleLabel: 'I am:',
                    continueLabel: 'Continue',
                    renewHint: 'Renews every 2 months at $50',
                    footerDisclaimer: 'Residency participation is confirmed separately. Program fee: $5,000.',
                },
                ja: {
                    dialogTitle: '参加して応募',
                    subtitle: '3 か月のメンバーシップを始めます。',
                    namePlaceholder: 'お名前',
                    emailPlaceholder: 'メール',
                    roleLabel: '属性:',
                    continueLabel: '次へ',
                    renewHint: '2 か月ごとに $50 で更新',
                    footerDisclaimer: 'レジデンシー参加は別途確認されます。プログラム費用：$5,000。',
                },
            },
            value: {
                en: {
                    title: 'Access FUSION',
                    lead: 'Join a curated platform connecting artists, galleries, curators, and collectors through programs rooted in Japan.',
                    price: '$50',
                    periodLabel: '3 Months Access',
                    includesTitle: 'Includes:',
                    includes: [
                        'Artist profile + gallery system',
                        'Residency eligibility',
                        'Access to network and platform updates',
                    ],
                    renewLine: 'Renews every 2 months at $50',
                    disclaimer: 'Residency participation is confirmed separately. Program fee: $5,000.',
                    continueLabel: 'Continue',
                },
                ja: {
                    title: 'FUSION にアクセス',
                    lead: '日本をルーツに持つプログラムを通じて、アーティスト、ギャラリー、キュレーター、コレクターをつなぐキュレーション型のプラットフォームです。',
                    price: '$50',
                    periodLabel: '3 か月アクセス',
                    includesTitle: '含まれるもの:',
                    includes: [
                        'アーティストプロフィールとギャラリーシステム',
                        'レジデンシー応募資格',
                        'ネットワークとプラットフォーム更新へのアクセス',
                    ],
                    renewLine: '2 か月ごとに $50 で更新',
                    disclaimer: 'レジデンシー参加は別途確認。プログラム費用：$5,000。',
                    continueLabel: '次へ',
                },
            },
            payment: {
                en: {
                    title: 'Complete Your Membership',
                    subtitle: 'Start your 3-month membership.',
                    orderLabel: 'FUSION',
                    line3Months: '3 Months Access',
                    lineRenew: 'Renew Every 2 Months',
                    amount: '$50.00',
                    totalLabel: 'Total',
                    cardNumberLabel: 'Card Number',
                    expiryLabel: 'Expiry (MM/YY)',
                    cvcLabel: 'CVC',
                    rememberCard: 'Remember my card',
                    expressOr: 'or',
                    completeLabel: 'Complete Payment',
                    footerNote: 'Secure one-time payment. FUSION renews every 2 months for $50.',
                    devCompleteLabel: 'Complete access (demo)',
                },
                ja: {
                    title: 'お支払いを完了',
                    subtitle: '3 か月のメンバーシップを開始。',
                    orderLabel: 'FUSION',
                    line3Months: '3 か月アクセス',
                    lineRenew: '2 か月ごとの更新',
                    amount: '$50.00',
                    totalLabel: '合計',
                    cardNumberLabel: 'カード番号',
                    expiryLabel: '有効期限',
                    cvcLabel: 'CVC',
                    rememberCard: 'カードを記憶する',
                    expressOr: 'または',
                    completeLabel: '支払いを完了',
                    footerNote: '安全な一回のお支払い。FUSION は 2 か月ごとに $50 で更新されます。',
                    devCompleteLabel: 'デモで完了',
                },
            },
            linkAccount: {
                en: {
                    title: 'Link your account',
                    lead: 'Sign in with Internet Identity to activate your membership and continue your application.',
                    signInLabel: 'Continue with Internet Identity',
                },
                ja: {
                    title: 'アカウントをリンク',
                    lead: 'メンバーシップを有効にし応募を続けるには、Internet Identity でサインインしてください。',
                    signInLabel: 'Internet Identity で続行',
                },
            },
            confirmation: {
                en: {
                    title: 'Application Ready',
                    welcomeTitle: 'Welcome to FUSION!',
                    welcomeBody:
                        'Your membership is confirmed. Continue to your profile and residency application.',
                    primaryCta: 'Continue to Profile Setup',
                    secondaryLine: 'Manage your membership and payments from your profile dashboard.',
                    links: [
                        { id: 'profile', label: 'Create Profile', href: '/register' },
                        { id: 'explore', label: 'Explore Work', href: '/gallery-access' },
                        { id: 'residency', label: 'Apply to Residency', href: '/program/kaga-ishikawa' },
                        { id: 'network', label: 'Access Network', href: '/community' },
                    ],
                },
                ja: {
                    title: '応募の準備ができました',
                    welcomeTitle: 'FUSION へようこそ！',
                    welcomeBody: 'メンバーシップが確認されました。プロフィールとレジデンシー応募へ進んでください。',
                    primaryCta: 'プロフィール設定へ',
                    secondaryLine: 'メンバーシップとお支払いはプロフィールから管理できます。',
                    links: [
                        { id: 'profile', label: 'プロフィール作成', href: '/register' },
                        { id: 'explore', label: '作品を見る', href: '/gallery-access' },
                        { id: 'residency', label: 'レジデンシーに応募', href: '/program/kaga-ishikawa' },
                        { id: 'network', label: 'ネットワーク', href: '/community' },
                    ],
                },
            },
        },
    },
    /** Copy for `app-quote-row` — keyed by `context` (e.g. journal). */
    quoteRow: {
        journal: {
            en: {
                quote:
                    'The studio is not a place of work — it is the place where the work becomes visible to itself.',
                attribution: 'Yuki Tanaka',
                attributionHref: '/artists',
            },
            ja: {
                quote:
                    'スタジオは単なる作業場ではない — 作品が自分自身を初めて見る場所である。',
                attribution: '田中 ユキ',
                attributionHref: '/artists',
            },
        },
    },
    events: [
        {
            id: 1,
            image: image1,
            status: "upcoming",
            en: {
                category: "Panel Talk",
                title: "Panel Talk",
                date: "10/10/2026",
                time: "10:00 AM",
                location: "BNA Wall",
                address: "123 Main St, Tokyo, Japan",
                description:
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                cta: "REVIEW",
            },
            ja: {
                category: "パネルディスカッション",
                title: "パネルディスカッション",
                date: "2026/10/10",
                time: "午前10:00",
                location: "BNA Wall",
                address: "東京都〇〇区〇〇 1-2-3",
                description:
                    "キュレーションとアーティストによる対談。展示の背景と制作プロセスを掘り下げます。",
                cta: "詳細を見る",
            },
        },
        {
            id: 2,
            image: image2,
            status: "upcoming",
            en: {
                category: "Exhibition",
                title: "A,E,I,O,U Exhibition",
                date: "1/1/2026",
                time: "12:00 - 14:00",
                location: "Ballroom",
                address: "1jod St, Tokyo, Japan, 12345",
                description:
                    "A group exhibition exploring vowels, space, and rhythm across painting and installation.",
                cta: "REVIEW",
            },
            ja: {
                category: "展示",
                title: "A,E,I,O,U 展",
                date: "2026/1/1",
                time: "12:00 - 14:00",
                location: "Ballroom",
                address: "東京都〇〇区〇〇 1丁目, 〒123-4567",
                description:
                    "母音・空間・リズムをテーマにしたグループ展。絵画とインスタレーションが交差します。",
                cta: "詳細を見る",
            },
        },
    ],
    audio: [
        {
            id: 1,
            title: 'Healing 01',
            link: 'http://www.sousound.com/music/healing/healing_01.mp3',
        },
    ],
    /**
     * Text-only cards for `app-features-row`. Use `data-area` on the element to pick a group (`id`).
     * e.g. Context page: `data-area="context"`; Program view: `data-area="programs"`.
     * `marginTop` / `marginBottom`: CSS lengths for the row wrapper (e.g. `150px`, `4rem`, `0`).
     */
    featureCards: {
        groups: [
            {
                id: 'context',
                marginTop: '150px',
                marginBottom: '0',
                items: [
                    {
                        en: {
                            title: 'Residency',
                            description:
                                'Immersion within place. Artists embedded in local environments, developing work through lived experience.',
                            cta: 'Upcoming | Tokyo',
                        },
                        ja: {
                            title: 'レジデンシー',
                            description:
                                '場所への没入。地域に滞在するアーティストが、生活の中で作品を育てます。',
                            cta: '近日公開 | 東京',
                        },
                    },
                    {
                        en: {
                            title: 'Fair (FUSION 100)',
                            description:
                                'Exchange at scale. A gathering of utilitarian arts, where collectors and craftsmen meet directly.',
                            cta: 'TBA',
                        },
                        ja: {
                            title: 'フェア（FUSION 100）',
                            description:
                                '規模のある交流。実用美術の場として、コレクターと職人が直接出会います。',
                            cta: '日程未定',
                        },
                    },
                    {
                        en: {
                            title: 'Platform',
                            description:
                                'Continuation beyond time. Extending visibility, relationships, and opportunities beyond the physical.',
                            cta: 'Register',
                        },
                        ja: {
                            title: 'プラットフォーム',
                            description:
                                '時間を超えた継続。物理的な場を越えて、可視性と関係、機会を広げます。',
                            cta: '登録',
                        },
                    },
                ],
            },
            {
                id: 'programs',
                marginTop: '0px',
                marginBottom: '0',
                items: [
                    {
                        en: {
                            title: 'Studio access',
                            description:
                                'Dedicated space to develop work on site—with room to experiment, document, and refine before public moments.',
                            cta: null,
                        },
                        ja: {
                            title: 'スタジオアクセス',
                            description:
                                '現地で制作を進めるための専用スペース。試作、記録、公開前の推敲までを一つの場で。',
                            cta: null,
                        },
                    },
                    {
                        en: {
                            title: 'Curated residency',
                            description:
                                'Structured time in Japan’s creative contexts—mentorship, local partners, and pathways toward exhibition.',
                            cta: null,
                        },
                        ja: {
                            title: 'キュレーション型レジデンシー',
                            description:
                                '日本の創造の文脈の中での滞在—メンターシップ、地域パートナー、展示に向けた道筋。',
                            cta: null,
                        },
                    },
                    {
                        en: {
                            title: 'Network & visibility',
                            description:
                                'Connect beyond the residency: peers, galleries, and audiences that extend the work’s reach.',
                            cta: null,
                        },
                        ja: {
                            title: 'ネットワークと可視性',
                            description:
                                'レジデンシーを超えたつながり—仲間、ギャラリー、作品の届き先を広げます。',
                            cta: null,
                        },
                    },
                ],
            },
        ],
    },
    context: {
        en: {
            headline: 'FUSION operates between places—where artists, collectors, and communities meet in shared environments.<br><br>Built across Japan and the United States, it creates conditions for exchange, not just presentation.',
            subheadline: 'It began as a residency, bringing artists into onsen towns, into slower rhythms, into proximity with each other.<br><br>What emerged was not just work, but relationships, context, and new ways of seeing. <br><br>Over time, this expanded- from isolated programs into an interconnected system.',
            subImage: journal2,
            headline2: 'FUSION is not a single format.<br><br>It is a system<br>that moves between contexts.',
            staffHeadline: 'People behind FUSION',
            staffCards: [
                {
                    name: 'Starnilas Oge',
                    title: 'Founding Director',
                    location: 'New York City / Tokyo / Kaga',
                    languages: 'EN',
                    focus: 'Direction, Design & Logistics',
                    brief: 'Founding director of FUSION with a background in design and logistics, and has worked in the art world for over 10 years.',
                    quote: 'I am a founding director of FUSION. I have a background in design and logistics, and have worked in the art world for over 10 years.',
                    image: image1,
                },
                {
                    name: 'Akari Koizumi',
                    title: 'Events Coordinator / Interpreter',
                    location: 'Tokyo / Yokohama / Kaga',
                    languages: 'JP',
                    focus: 'Events, Logistics & Interpreting',
                    brief: 'Events coordinator and interpreter for FUSION with a background in events and logistics, and has worked in the art world for over 10 years.',
                    quote: 'I am a events coordinator and interpreter for FUSION. I have a background in events and logistics, and have worked in the art world for over 10 years.',
                    image: image2,
                },
                {
                    name: 'Zoia Amadi',
                    title: 'Artist Relations',
                    location: 'New York City / Tokyo / Kaga',
                    languages: 'EN',
                    focus: 'Artist Relations & Communications',
                    brief: 'Artist relations for FUSION with a background in artist relations and communications, and has worked in the art world for over 10 years.',
                    quote: 'I am a artist relations for FUSION. I have a background in artist relations and communications, and have worked in the art world for over 10 years.',
                    image: image3,
                },
            ],
            extendedNetworkTitle: 'Extended Network',
            extendedNetworkHeadline: 'FUSION is supported by a wider network of artists, curators, advisors, and local partners who shape each program in context.',
            extendedNetworkCards: [
                {
                    name: 'Miyuki Kadoya',
                    location: 'Kaga / Tokyo',
                    title: 'Curator',
                    image: image1,
                },
                {
                    name: 'Ryo Ogawa',
                    location: 'Ishikawa',
                    title: 'Cultural Coordinator',
                    image: image1,
                },
                {
                    name: 'Hiroyuki Yorozuya',
                    location: 'Kaga',
                    title: 'Advisor',
                    image: image1,
                },
                {
                    name: 'Kiyoko Katabuchi',
                    location: 'Tokyo / Kaga',
                    title: 'Event Producer',
                    image: image1,
                },
            ],
            ecosystemPartnersTitle: 'Ecosystem Partners',
            ecosystemPartnersHeadline: 'FUSION operates through collaboration—working alongside institutions, cities, and partners who support its evolving programs.',
            ecosystemPartnersCards: [
                {
                    name: 'Hatori Onsen',
                    link: 'https://www.google.com',
                    image: image1,
                    primary: true,
                },
                {
                    title: 'Rurikoh Onsen',
                    link: 'https://www.google.com',
                    image: image1,
                    primary: false,
                },
                {
                    title: 'Twin City Global',
                    link: 'https://www.google.com',
                    image: image1,
                    primary: false,
                },
                {
                    name: 'W.P.U',
                    link: 'https://www.google.com',
                    image: image1,
                    primary: false,
                },
                {
                    name: 'BNA Wall',
                    link: 'https://www.google.com',
                    image: image1,
                    primary: false,
                },
            ],
            headline3: 'FUSION is not a fixed institution.<br><br>It is a framework—<br>shaped by the people<br>and places it moves through.',
        },
        ja: {
            staffHeadline: 'FUSIONを支える人々',
            staffCards: [
                {
                    name: 'スターニラス・オゲ',
                    title: '創設ディレクター',
                    location: 'ニューヨーク / 東京 / 加賀',
                    languages: 'EN',
                    focus: 'ディレクション、デザイン、ロジスティクス',
                    brief: 'デザインとロジスティクスの背景を持ち、アートの現場で10年以上の経験を持つFUSIONの創設ディレクター。',
                    quote: 'FUSIONの創設ディレクターとして、デザインとロジスティクスの経験を活かし、アートの世界で10年以上取り組んできました。',
                    image: image1,
                },
                {
                    name: '小泉 あかり',
                    title: 'イベントコーディネーター / 通訳',
                    location: '東京 / 横浜 / 加賀',
                    languages: 'JP',
                    focus: 'イベント、ロジスティクス、通訳',
                    brief: 'イベントとロジスティクスの背景を持ち、アートの現場で10年以上の経験を持つコーディネーター兼通訳。',
                    quote: 'FUSIONのイベントコーディネーター兼通訳として、イベントとロジスティクスに携わってきました。',
                    image: image2,
                },
                {
                    name: 'ゾイア・アマディ',
                    title: 'アーティストリレーション',
                    location: 'ニューヨーク / 東京 / 加賀',
                    languages: 'EN',
                    focus: 'アーティストリレーション、コミュニケーション',
                    brief: 'アーティストリレーションとコミュニケーションの専門性を持ち、アートの現場で10年以上の経験。',
                    quote: 'アーティストリレーションとコミュニケーションの経験を活かし、FUSIONで活動しています。',
                    image: image3,
                },
            ],
            extendedNetworkTitle: '拡張ネットワーク',
            extendedNetworkHeadline:
                'FUSIONは、アーティスト、キュレーター、アドバイザー、地域のパートナーからなる広いネットワークに支えられ、それぞれのプログラムを文脈の中で形作っています。',
            extendedNetworkCards: [
                {
                    name: '門谷 みゆき',
                    location: '加賀 / 東京',
                    title: 'キュレーター',
                    image: image1,
                },
                {
                    name: '小川 涼',
                    location: '石川県',
                    title: 'カルチャーコーディネーター',
                    image: image1,
                },
                {
                    name: '萬谷 博之',
                    location: '加賀',
                    title: 'アドバイザー',
                    image: image1,
                },
                {
                    name: '片渕 清子',
                    location: '東京 / 加賀',
                    title: 'イベントプロデューサー',
                    image: image1,
                },
            ],
        },
    }
};

// Separate featured slice for homepage/hero usage.
// Keep it as an array of artist objects as requested.
testData.featuredArtist = testData.allArtists?.artists?.slice(0, 8) || [];
