/* =============================================================================
 *  js/data.js  -  the whole family.
 *
 *  Written out by the in-page editor on 2026-08-25.
 *  Safe to keep editing by hand: the format is exactly the same either way.
 *
 *  families : one entry per surname, with its colour
 *  people   : one entry per person   (family = the family they were BORN into)
 *  unions   : one entry per marriage (children only connect through these)
 *
 *  Full guide: docs/EDITING.md
 * ========================================================================== */

window.FAMILY = {

  meta: { title: "Makani Family Tree",
    subtitle: "మాకని వంశ వృక్షం · five generations", updated: "2026-08-22" },

  config: { ego: "makani-ramakrishna", photoDir: "photos", autoPhotos: true,
    anchorPreference: "m", showPlaceholders: true },

  families: {
    makani: { name: "Makani", telugu: "మాకని", color: "#4f46e5",
      notes: "The main line of this chart." },
    macha: { name: "Macha", telugu: "మాచ", color: "#0d9488",
      notes: "Twice allied to the Makani line: two Macha sisters married two Makani brothers, making their children double first cousins." },
    mutyala: { name: "Mutyala", telugu: "ముత్యాల", color: "#d97706",
      notes: "Joined by the marriage of Sai Priyanka Makani to Thrinadh Mutyala." },
    tbd: { name: "Not yet recorded", color: "#64748b",
      notes: "Placeholder for people whose birth surname is still unknown. When you learn it, add a real family here and repoint them." }
  },

  people: [
    /* ---- generation 1 ---- */
    { id: "makani-g1-f", name: "Makani (great-grandfather)", family: "makani",
      gen: 1, sex: "m", placeholder: true, todo: "name unknown" },
    { id: "makani-g1-m", name: "(his wife)", family: "tbd",
      marriedInto: "makani", gen: 1, sex: "f", placeholder: true,
      todo: "name and birth family unknown" },
    { id: "macha-g1-f", name: "Macha (great-grandfather)", family: "macha",
      gen: 1, sex: "m", placeholder: true, todo: "name unknown" },
    { id: "macha-g1-m", name: "(his wife)", family: "tbd",
      marriedInto: "macha", gen: 1, sex: "f", placeholder: true,
      todo: "name and birth family unknown" },

    /* ---- generation 2 ---- */
    { id: "makani-ramachandra-rao", name: "Ramachandra Rao Makani",
      family: "makani", gen: 2, sex: "m", title: "Thathayya",
      notes: "Father of the six Makani brothers." },
    { id: "tbd-padmavathi", name: "Padmavathi Makani", family: "tbd",
      marriedInto: "makani", gen: 2, sex: "f", title: "Nanamma",
      todo: "birth family (intiperu before marriage) and years" },
    { id: "macha-thatha", name: "Krishna Rao Macha", family: "macha", gen: 2,
      sex: "m", title: "Thathagaru",
      notes: "Ramakrishna maternal grandfather. Known in the family as Thathagaru; given name to be filled in.",
      todo: "given name" },
    { id: "tbd-jayalakshmi", name: "Jayalakshmi Macha", family: "tbd",
      marriedInto: "macha", gen: 2, sex: "f", title: "Ammamma",
      notes: "Ramakrishna's maternal grandmother.",
      todo: "birth family (intiperu) and years" },

    /* ---- generation 3 ---- */
    { id: "makani-venkateshwara-rao", name: "Venkateshwara Rao Makani",
      family: "makani", gen: 3, sex: "m", order: 1 },
    { id: "macha-padmaja", name: "Padmaja Makani", family: "macha",
      marriedInto: "makani", gen: 3, sex: "f", order: 1,
      notes: "Elder sister of Suneetha. Married Satyanarayana Makani." },
    { id: "makani-chandrashekhar", name: "Chandrashekhar Makani",
      family: "makani", gen: 3, sex: "m", order: 2 },
    { id: "macha-suneetha", name: "Suneetha Makani", family: "macha",
      marriedInto: "makani", gen: 3, sex: "f", order: 2,
      notes: "Ramakrishna's mother. Married Nagarjuna Sagar Makani." },
    { id: "makani-satyanarayana", name: "Satyanarayana Makani",
      family: "makani", gen: 3, sex: "m", order: 3 },
    { id: "macha-ramesh", name: "Ramesh Macha", family: "macha", gen: 3,
      sex: "m", order: 3, death: "2025" },
    { id: "makani-ramakrishna-sr", name: "Ramakrishna Makani",
      family: "makani", gen: 3, sex: "m", order: 4,
      todo: "birth and death years" },
    { id: "makani-nagarjuna-sagar", name: "Nagarjuna Sagar Makani",
      family: "makani", gen: 3, sex: "m", order: 5,
      notes: "Ramakrishna's father." },
    { id: "makani-harikrishna", name: "Harikrishna Makani", family: "makani",
      gen: 3, sex: "m", order: 6 },
    { id: "tbd-latha", name: "Latha Makani", family: "tbd",
      marriedInto: "makani", gen: 3, sex: "f", todo: "birth family (intiperu)" },
    { id: "tbd-sarada", name: "Sarada Makani", family: "tbd",
      marriedInto: "makani", gen: 3, sex: "f", todo: "birth family (intiperu)" },
    { id: "tbd-nalini", name: "Nalini Macha", family: "tbd",
      marriedInto: "macha", gen: 3, sex: "f", notes: "Married Ramesh Macha.",
      todo: "birth family (intiperu) and years" },
    { id: "tbd-subramanium", name: "Subramanium Emani", family: "tbd", gen: 3,
      sex: "m" },

    /* ---- generation 4 ---- */
    { id: "makani-kittu", name: "Krishna Chaitanya Makani", family: "makani",
      gen: 4, sex: "m", order: 1, nickname: "Kittu" },
    { id: "makani-sindhura", name: "Sindhura Makani", family: "makani",
      gen: 4, sex: "f", order: 1 },
    { id: "macha-hasini", name: "Hasini Macha", family: "macha", gen: 4,
      sex: "f", order: 1, todo: "birth year" },
    { id: "makani-krishna", name: "Krishna Tej Makani", family: "makani",
      gen: 4, sex: "u", order: 1 },
    { id: "makani-sai-priyanka", name: "Sai Priyanka Mutyala",
      family: "makani", marriedInto: "mutyala", gen: 4, sex: "f", order: 1,
      notes: "Born Sai Priyanka Makani; took the Mutyala name on marriage." },
    { id: "makani-ramakrishna", name: "Ramakrishna Makani", family: "makani",
      gen: 4, sex: "m", order: 2,
      notes: "Keeper of this chart. Named after his father's youngest brother." },
    { id: "makani-pony", name: "Krishna Keerthan Makani", family: "makani",
      gen: 4, sex: "m", order: 2, nickname: "Pony" },
    { id: "makani-sri-vatsava", name: "Sri Vatsava Makani", family: "makani",
      gen: 4, sex: "m", order: 2 },
    { id: "macha-jessi", name: "Jessi Macha", family: "macha", gen: 4,
      sex: "u", order: 2,
      todo: "sex and birth year - not recorded either way yet" },
    { id: "makani-krishna-2", name: "Venkata Krishna Kanth Makani",
      family: "makani", gen: 4, sex: "u", order: 2 },
    { id: "mutyala-thrinadh", name: "Thrinadh Mutyala", family: "mutyala",
      gen: 4, sex: "m",
      todo: "his parents and siblings - a new branch to grow" },
    { id: "tbd-soumya", name: "Soumya Makani", family: "tbd", gen: 4,
      sex: "u", todo: "birth family (intiperu)" },
    { id: "tbd-lakshmi", name: "Lakshmi Priya Makani", family: "tbd",
      marriedInto: "makani", gen: 4, sex: "f", todo: "Emani" },
    { id: "tbd-navya", name: "Navya Makani", family: "tbd", gen: 4, sex: "u",
      todo: "birth family (intiperu)" },
    { id: "tbd-vinodh", name: "Vinodh", family: "tbd", gen: 4, sex: "m",
      todo: "birth family (intiperu)" },

    /* ---- generation 5 ---- */
    { id: "makani-hanvika", name: "Hanvika Makani", family: "makani", gen: 5,
      sex: "u", order: 1 },
    { id: "makani-mokshith", name: "Mokshith Makani", family: "makani",
      gen: 5, sex: "u", order: 1 },
    { id: "makani-ruhika", name: "Ruhika Makani", family: "makani", gen: 5,
      sex: "u", order: 2 }
  ],

  unions: [
    { id: "u-makani-g1", partners: ["makani-g1-f", "makani-g1-m"],
      children: ["makani-ramachandra-rao"] },
    { id: "u-macha-g1", partners: ["macha-g1-f", "macha-g1-m"],
      children: ["macha-thatha"] },
    { id: "u-makani-g2",
      partners: ["makani-ramachandra-rao", "tbd-padmavathi"],
      children: ["makani-venkateshwara-rao", "makani-chandrashekhar", "makani-satyanarayana", "makani-nagarjuna-sagar", "makani-harikrishna", "makani-ramakrishna-sr"],
      notes: "Six sons, no daughters recorded.", todo: "were there daughters?" },
    { id: "u-macha-g2", partners: ["macha-thatha", "tbd-jayalakshmi"],
      children: ["macha-padmaja", "macha-suneetha", "macha-ramesh"] },
    { id: "u-venkateshwara-latha",
      partners: ["makani-venkateshwara-rao", "tbd-latha"],
      children: ["makani-kittu", "makani-pony"] },
    { id: "u-chandrashekhar-sarada",
      partners: ["makani-chandrashekhar", "tbd-sarada"],
      children: ["makani-sindhura", "makani-sri-vatsava"] },
    { id: "u-satyanarayana-padmaja",
      partners: ["makani-satyanarayana", "macha-padmaja"],
      children: ["makani-krishna", "makani-krishna-2"],
      notes: "First of the two Makani-Macha marriages.",
      todo: "children of Satyanarayana and Padmaja" },
    { id: "u-nagarjuna-suneetha",
      partners: ["makani-nagarjuna-sagar", "macha-suneetha"],
      children: ["makani-ramakrishna", "makani-sai-priyanka"],
      notes: "Second Makani-Macha marriage. Nagarjuna Sagar is Satyanarayana's younger brother and Suneetha is Padmaja's younger sister, so the children of these two couples are double first cousins." },
    { id: "u-ramesh-nalini", partners: ["macha-ramesh", "tbd-nalini"],
      children: ["macha-hasini", "macha-jessi"] },
    { id: "u-thrinadh-priyanka",
      partners: ["mutyala-thrinadh", "makani-sai-priyanka"], children: [],
      todo: "wedding year" },
    { id: "u-krishna-soumya", partners: ["makani-krishna", "tbd-soumya"],
      children: ["makani-hanvika", "makani-ruhika"] },
    { id: "u-krishna-2-lakshmi",
      partners: ["makani-krishna-2", "tbd-lakshmi"], children: [] },
    { id: "u-subramanium-x", partners: ["tbd-subramanium"],
      children: ["tbd-lakshmi"] },
    { id: "u-kittu-navya", partners: ["makani-kittu", "tbd-navya"],
      children: ["makani-mokshith"] },
    { id: "u-sindhura-vinodh", partners: ["tbd-vinodh", "makani-sindhura"],
      children: [] }
  ]
};
