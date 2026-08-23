/* =============================================================================
 *  family-tree/js/data.js   —   * THIS IS THE ONLY FILE YOU NORMALLY EDIT *
 * =============================================================================
 *
 *  Everything on the chart is generated from the four lists below:
 *
 *      config    - global switches (who "I" am, photo folder, lineage rule)
 *      families  - one entry per SURNAME / intiperu, with its colour + story
 *      people    - one entry per person
 *      unions    - one entry per marriage (this is what creates children)
 *
 *  There is NO build step. Save this file, refresh the browser, done.
 *
 *  ---------------------------------------------------------------------------
 *  QUICK RECIPES  (full guide in docs/EDITING.md)
 *  ---------------------------------------------------------------------------
 *
 *  1. ADD A PERSON             -> add an object to `people`
 *  2. MARRY TWO PEOPLE         -> add an object to `unions` with both ids
 *  3. ADD A CHILD              -> add the person, then put their id in the
 *                                 `children` array of the parents union
 *  4. ADD A WHOLE NEW SURNAME  -> add an entry to `families`, then people
 *  5. RECORD A COUSIN MARRIAGE -> set `consanguinity` on that union
 *
 *  ---------------------------------------------------------------------------
 *  ID RULES  (ids are permanent handles - pick one and never change it)
 *  ---------------------------------------------------------------------------
 *    format:  <birth-family>-<given-name>          e.g. "makani-satyanarayana"
 *    unknown birth family: use the "tbd-" prefix   e.g. "tbd-latha"
 *    lower-case, hyphens only, must be unique.
 *
 *    NOTE: use the BIRTH family in the id, not the married surname. That is how
 *    the chart knows Padmaja is a Macha daughter who married into Makani, which
 *    is the whole point of the alliance map.
 *
 *  ---------------------------------------------------------------------------
 *  PERSON FIELDS  (only `id`, `name`, `family`, `gen` are required)
 *  ---------------------------------------------------------------------------
 *    id          "macha-suneetha"    permanent unique handle
 *    name        "Suneetha Makani"   display name (married surname is fine)
 *    telugu      "సునీత"             optional, shown under the name
 *    family      "macha"             BIRTH family key -> drives the colour
 *    marriedInto "makani"            surname taken at marriage (optional)
 *    gen         3                   generation row. 1 = oldest. See below.
 *    sex         "m" | "f" | "u"     "u" = unknown / not yet confirmed
 *    order       4                   birth order among siblings, 1 = eldest
 *    birth       "1959"              free text: "1959", "12 Mar 1959", "c.1930"
 *    death       "1998"              presence of this marks them as deceased
 *    deceased    true                set explicitly if you have no death date
 *    nickname    "Kittu"             pet name / muddu peru
 *    title       "Thathagaru"        honorific shown as a small badge
 *    photo       "suneetha-1985.jpg" optional; else photos/<id>.jpg is tried
 *    notes       "..."               free text, shown in the detail panel
 *    todo        "confirm birth year" shows an amber dot so gaps are visible
 *    placeholder true                a known-to-exist but unnamed ancestor
 *
 *  ---------------------------------------------------------------------------
 *  GENERATIONS  (`gen`) - this is what puts a card on the right ROW
 *  ---------------------------------------------------------------------------
 *    1  great-great-grandparents   (unknown - placeholders, fill these in)
 *    2  great-grandparents         Ramachandra Rao & Padmavathi / Macha thatha
 *    3  grandparents generation    the six Makani brothers + their wives
 *    4  Ramakrishna generation     you, Priyanka, the cousins
 *    5  the next generation        (empty today - example at the bottom)
 *
 *    Everyone who is "the same rung of the ladder" gets the same number,
 *    including people who married in. To go FURTHER BACK than gen 1, do not
 *    renumber everybody - just use 0, then -1, then -2. The chart normalises
 *    the numbers itself.
 * ========================================================================== */

window.FAMILY = {

  /* ---------------------------------------------------------------------- */
  /*  META + CONFIG                                                         */
  /* ---------------------------------------------------------------------- */
  meta: {
    title:    "Makani Family Tree",
    subtitle: "మాకని వంశ వృక్షం · five generations",
    updated:  "2026-08-22"
  },

  config: {
    // Whose point of view the "Relationship to me" line is calculated from.
    ego: "makani-ramakrishna",

    // Folder holding the face pictures.
    photoDir: "photos",

    // true  -> the chart automatically tries photos/<id>.jpg for everyone
    //          (harmless 404s in the console for people with no photo yet)
    // false -> only people with an explicit `photo:` field get an image
    autoPhotos: true,

    // Which spouse the couple hangs from when BOTH have parents in the tree.
    // Telugu families are traditionally patrilineal, so "m" keeps sons under
    // their own parents and shows the wife descent as a dashed cross-link.
    // Change to "f" for a matrilineal chart. Override per-union with `anchor`.
    anchorPreference: "m",

    // Show the grey "not yet known" ancestor slots.
    showPlaceholders: true
  },

  /* ---------------------------------------------------------------------- */
  /*  FAMILIES / intiperlu                                                  */
  /*  The colour of a card = the family someone was BORN into.              */
  /* ---------------------------------------------------------------------- */
  families: {
    makani: {
      name:   "Makani",
      telugu: "మాకని",
      color:  "#4f46e5",
      origin: "",                       // village / region - fill in when known
      notes:  "The main line of this chart."
    },
    macha: {
      name:   "Macha",
      telugu: "మాచ",
      color:  "#0d9488",
      origin: "",
      notes:  "Twice allied to the Makani line: two Macha sisters married two " +
              "Makani brothers, making their children double first cousins."
    },
    mutyala: {
      name:   "Mutyala",
      telugu: "ముత్యాల",
      color:  "#d97706",
      origin: "",
      notes:  "Joined by the marriage of Sai Priyanka Makani to Thrinadh Mutyala."
    },
    tbd: {
      name:   "Not yet recorded",
      telugu: "",
      color:  "#64748b",
      origin: "",
      notes:  "Placeholder for people whose birth surname is still unknown. " +
              "When you learn it, add a real family here and repoint them."
    }
  },

  /* ====================================================================== */
  /*  PEOPLE                                                                */
  /* ====================================================================== */
  people: [

    /* ---- GENERATION 1 - unknown ancestors ------------------------------ *
     * These grey cards exist so the 5-generation frame is visible and so you
     * know exactly where to type the names when you find them. Replace the
     * name, drop `placeholder`, and give them a proper id.                  */
    { id: "makani-g1-f", name: "Makani (great-grandfather)", family: "makani",
      gen: 1, sex: "m", placeholder: true, todo: "name unknown" },
    /* NOTE: she is `tbd`, not `makani` — a wife is born into ANOTHER family and
       marries in. Typing her as makani would invent a Makani-married-Makani
       alliance in the Family info panel. Same for every wife below.          */
    { id: "makani-g1-m", name: "(his wife)", family: "tbd",
      marriedInto: "makani", gen: 1, sex: "f", placeholder: true,
      todo: "name and birth family unknown" },

    { id: "macha-g1-f", name: "Macha (great-grandfather)", family: "macha",
      gen: 1, sex: "m", placeholder: true, todo: "name unknown" },
    { id: "macha-g1-m", name: "(his wife)", family: "tbd",
      marriedInto: "macha", gen: 1, sex: "f", placeholder: true,
      todo: "name and birth family unknown" },

    /* ---- GENERATION 2 - the two grandparent couples --------------------- */
    { id: "makani-ramachandra-rao", name: "Ramachandra Rao Makani",
      family: "makani", gen: 2, sex: "m", title: "Thatha",
      notes: "Father of the six Makani brothers.",
      todo: "birth / death years" },

    { id: "tbd-padmavathi", name: "Padmavathi Makani", family: "tbd",
      marriedInto: "makani", gen: 2, sex: "f", title: "Nanamma",
      todo: "birth family (intiperu before marriage) and years" },

    { id: "macha-thatha", name: "Thathagaru Macha", family: "macha", gen: 2,
      sex: "m", title: "Thathagaru", placeholder: true,
      notes: "Ramakrishna maternal grandfather. Known in the family as " +
             "Thathagaru; given name to be filled in.",
      todo: "given name" },

    { id: "tbd-jayalakshmi", name: "Jayalakshmi Macha", family: "tbd",
      marriedInto: "macha", gen: 2, sex: "f", title: "Ammamma",
      notes: "Ramakrishna's maternal grandmother.",
      todo: "birth family (intiperu) and years" },

    /* ---- GENERATION 3 - the six Makani brothers, eldest first ----------- */
    { id: "makani-venkateshwara-rao", name: "Venkateshwara Rao Makani",
      family: "makani", gen: 3, sex: "m", order: 1 },
    { id: "tbd-latha", name: "Latha Makani", family: "tbd",
      marriedInto: "makani", gen: 3, sex: "f",
      todo: "birth family (intiperu)" },

    { id: "makani-chandrashekhar", name: "Chandrashekhar Makani",
      family: "makani", gen: 3, sex: "m", order: 2 },
    { id: "tbd-sarada", name: "Sarada Makani", family: "tbd",
      marriedInto: "makani", gen: 3, sex: "f",
      todo: "birth family (intiperu)" },

    { id: "makani-satyanarayana", name: "Satyanarayana Makani",
      family: "makani", gen: 3, sex: "m", order: 3 },

    { id: "makani-nagarjuna-sagar", name: "Nagarjuna Sagar Makani",
      family: "makani", gen: 3, sex: "m", order: 4,
      notes: "Ramakrishna's father." },

    { id: "makani-harikrishna", name: "Harikrishna Makani",
      family: "makani", gen: 3, sex: "m", order: 5,
      todo: "spouse and children, if any" },

    { id: "makani-ramakrishna-sr", name: "Ramakrishna Makani",
      family: "makani", gen: 3, sex: "m", order: 6, deceased: true,
      notes: "Died at the age of 16. Ramakrishna of generation 4 carries " +
             "his name.",
      todo: "birth and death years" },

    /* ---- GENERATION 3 - the Macha children ----------------------------- *
     * Padmaja and Suneetha are BORN Macha and married into Makani, which is
     * why their id and colour stay Macha. That single decision is what makes
     * the double alliance visible on the chart.                             */
    { id: "macha-padmaja", name: "Padmaja Makani", family: "macha",
      marriedInto: "makani", gen: 3, sex: "f", order: 1,
      notes: "Elder sister of Suneetha. Married Satyanarayana Makani." },

    { id: "macha-suneetha", name: "Suneetha Makani", family: "macha",
      marriedInto: "makani", gen: 3, sex: "f", order: 2,
      notes: "Ramakrishna's mother. Married Nagarjuna Sagar Makani." },

    { id: "macha-ramesh", name: "Ramesh Macha", family: "macha", gen: 3,
      sex: "m", order: 3, deceased: true,
      notes: "Younger brother of Padmaja and Suneetha. Died recently.",
      todo: "birth and death years" },

    /* ---- GENERATION 4 - the cousins ------------------------------------ */
    { id: "makani-kittu", name: "Kittu Makani", family: "makani", gen: 4,
      sex: "u", order: 1, nickname: "Kittu",
      todo: "formal name and sex - 'Kittu' looks like a muddu peru" },
    { id: "makani-pony", name: "Pony Makani", family: "makani", gen: 4,
      sex: "u", order: 2, nickname: "Pony",
      todo: "formal name and sex - 'Pony' looks like a muddu peru" },

    { id: "makani-sindhura", name: "Sindhura Makani", family: "makani",
      gen: 4, sex: "f", order: 1, todo: "confirm sex and birth order" },
    { id: "makani-sri-vatsava", name: "Sri Vatsava Makani", family: "makani",
      gen: 4, sex: "m", order: 2, todo: "confirm sex and birth order" },

    { id: "makani-ramakrishna", name: "Ramakrishna Makani", family: "makani",
      gen: 4, sex: "m", order: 1,
      notes: "Keeper of this chart. Named after his father's youngest brother." },

    { id: "makani-sai-priyanka", name: "Sai Priyanka Mutyala",
      family: "makani", marriedInto: "mutyala", gen: 4, sex: "f", order: 2,
      notes: "Born Sai Priyanka Makani; took the Mutyala name on marriage." },

    { id: "mutyala-thrinadh", name: "Thrinadh Mutyala", family: "mutyala",
      gen: 4, sex: "m",
      todo: "his parents and siblings - a new branch to grow" }

    /* ---- GENERATION 5 - nobody yet -------------------------------------- *
     * When the first child of generation 5 arrives, delete the comment marks
     * on the two blocks below (this one and the union near the end).
     *
     * , { id: "mutyala-baby", name: "Baby Mutyala", family: "mutyala",
     *     gen: 5, sex: "u", order: 1, birth: "2027" }
     */
  ],

  /* ====================================================================== */
  /*  UNIONS  (marriages)                                                   */
  /*                                                                        */
  /*  partners: [husband, wife]  - order only affects left/right on screen   */
  /*  children: ids of everyone born to this couple, eldest first           */
  /*                                                                        */
  /*  consanguinity: null                 unrelated couple                   */
  /*                 "menarikam"          menarikam - cross-cousin marriage  */
  /*                 "first-cousin"       any first-cousin marriage          */
  /*                 "second-cousin"                                         */
  /*                 "same-family"        both born to the same surname      */
  /*  ...anything non-null draws a red dashed marriage bar + a badge.        */
  /*                                                                        */
  /*  anchor: "<id>"  optional - force the couple to hang under THAT         */
  /*                  person's parents instead of the default (husband).     */
  /* ====================================================================== */
  unions: [

    /* generation 1 -> 2 */
    { id: "u-makani-g1", partners: ["makani-g1-f", "makani-g1-m"],
      children: ["makani-ramachandra-rao"] },

    { id: "u-macha-g1", partners: ["macha-g1-f", "macha-g1-m"],
      children: ["macha-thatha"] },

    /* generation 2 -> 3 : the six Makani brothers */
    { id: "u-makani-g2",
      partners: ["makani-ramachandra-rao", "tbd-padmavathi"],
      children: [
        "makani-venkateshwara-rao",
        "makani-chandrashekhar",
        "makani-satyanarayana",
        "makani-nagarjuna-sagar",
        "makani-harikrishna",
        "makani-ramakrishna-sr"
      ],
      notes: "Six sons, no daughters recorded.",
      todo: "were there daughters?" },

    /* generation 2 -> 3 : the Macha children */
    { id: "u-macha-g2",
      partners: ["macha-thatha", "tbd-jayalakshmi"],
      children: ["macha-padmaja", "macha-suneetha", "macha-ramesh"] },

    /* generation 3 marriages */
    { id: "u-venkateshwara-latha",
      partners: ["makani-venkateshwara-rao", "tbd-latha"],
      children: ["makani-kittu", "makani-pony"] },

    { id: "u-chandrashekhar-sarada",
      partners: ["makani-chandrashekhar", "tbd-sarada"],
      children: ["makani-sindhura", "makani-sri-vatsava"] },

    /* ALLIANCE 1 of 2 - Makani x Macha */
    { id: "u-satyanarayana-padmaja",
      partners: ["makani-satyanarayana", "macha-padmaja"],
      children: [],
      notes: "First of the two Makani-Macha marriages.",
      todo: "children of Satyanarayana and Padmaja" },

    /* ALLIANCE 2 of 2 - Makani x Macha, the brother/sister mirror */
    { id: "u-nagarjuna-suneetha",
      partners: ["makani-nagarjuna-sagar", "macha-suneetha"],
      children: ["makani-ramakrishna", "makani-sai-priyanka"],
      notes: "Second Makani-Macha marriage. Nagarjuna Sagar is Satyanarayana's " +
             "younger brother and Suneetha is Padmaja's younger sister, so the " +
             "children of these two couples are double first cousins." },

    /* generation 4 marriages */
    { id: "u-thrinadh-priyanka",
      partners: ["mutyala-thrinadh", "makani-sai-priyanka"],
      children: [],
      todo: "wedding year" }

    /* generation 5 - uncomment together with the person above
     * , { id: "u-mutyala-g5", partners: [...], children: ["mutyala-baby"] }
     */
  ],

  /* ====================================================================== */
  /*  NOTES pinned to the chart (optional, purely decorative)                */
  /* ====================================================================== */
  annotations: [
    { title: "Two brothers, two sisters",
      body: "Satyanarayana and Nagarjuna Sagar Makani married Padmaja and " +
            "Suneetha Macha. The chart detects this pattern automatically - " +
            "see the Alliances panel." }
  ]
};
