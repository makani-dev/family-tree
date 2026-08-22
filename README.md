# Makani Family Tree — మాకని వంశ వృక్షం

An interactive, five-generation family chart for the **Makani** family and the
families it married into, built to be edited by hand and published on GitHub
Pages.

It is deliberately plain: **no build step, no frameworks, no npm install.**
Four JavaScript files and a stylesheet. You edit one data file, refresh the
browser, and the chart redraws itself.

```
Open index.html  ->  it reads js/data.js  ->  it draws the tree
```

---

## Contents

- [What it does](#what-it-does)
- [Run it on your computer](#run-it-on-your-computer)
- [Adding people — the part you actually need](#adding-people--the-part-you-actually-need)
- [Adding face pictures](#adding-face-pictures)
- [Surnames, alliances and cousin marriages](#surnames-alliances-and-cousin-marriages)
- [What is in the chart today](#what-is-in-the-chart-today)
- [Publish it to GitHub Pages](#publish-it-to-github-pages)
- [Before you publish: privacy](#before-you-publish-privacy)
- [Every file in this repository](#every-file-in-this-repository)
- [Keyboard shortcuts](#keyboard-shortcuts)

---

## What it does

| | |
|---|---|
| **Generation rows** | Everyone sits on the rung of the ladder they belong to, so cousins line up with cousins. |
| **Face pictures** | Drop a `.jpg` into `photos/` named after the person. No photo yet? A coloured initials avatar is drawn instead. |
| **Colour = birth family** | A card is coloured by the family a person was *born* into, not the surname they use now. This is what makes the marriage alliances visible at a glance. |
| **Telugu kinship terms** | Click anyone and see what you would actually call them — *Peddananna*, *Mamayya*, *Vadina* — not just "first cousin once removed". |
| **Alliance detection** | The chart works out for itself which two surnames have intermarried more than once, and draws an arc when two brothers married two sisters. |
| **Double cousins** | Detected automatically when two people share *both* sets of grandparents. |
| **Gaps are visible** | Anything you have not filled in yet shows an amber dot, and the **Family info** panel lists every open question as a to-do list. |
| **Print / PDF** | The Print button lays the whole tree out on A3 landscape for a wall poster. |

---

## Run it on your computer

**The simple way** — double-click `index.html`. That is genuinely all it takes.

**The better way while you are editing** — run the little server that ships with
this repo:

```bash
python tools/serve.py
```

Then open <http://localhost:8777>.

Use the server if you are making a lot of edits. Browsers aggressively cache
`js/data.js`, so with a plain `file://` page you can edit the data, refresh,
and still see the *old* tree — extremely confusing. `tools/serve.py` sends
no-cache headers so a refresh always shows what is on disk.

---

## Adding people — the part you actually need

Everything lives in **[`js/data.js`](js/data.js)**. You will not need to open any
other file. It is heavily commented; this section is the short version.

### The three lists

```
families  ->  one entry per surname (ఇంటిపేరు), with its colour
people    ->  one entry per person
unions    ->  one entry per marriage — this is what creates children
```

A person on their own is just a floating card. **Children only appear connected
to their parents when you list them in a union.** That is the single rule that
trips people up.

### 1. Add a person

Add an object anywhere in the `people` list:

```js
{ id: "makani-anitha", name: "Anitha Makani", family: "makani",
  gen: 4, sex: "f", order: 3, birth: "1994" },
```

Only `id`, `name`, `family` and `gen` are required. `gen` is the generation row:

| gen | who |
|-----|-----|
| 1 | great-great-grandparents (unknown so far — grey placeholder cards) |
| 2 | Ramachandra Rao & Padmavathi Makani, and the Macha grandparents |
| 3 | the six Makani brothers and their wives |
| 4 | Ramakrishna, Sai Priyanka and the cousins |
| 5 | the next generation (nobody yet) |

To go **further back than gen 1**, do not renumber everyone — just use `0`, then
`-1`, then `-2`. The chart normalises the numbers itself.

### 2. Marry two people

Add an object to `unions`:

```js
{ id: "u-harikrishna-wife",
  partners: ["makani-harikrishna", "tbd-wifename"],
  children: [] },
```

### 3. Add a child

Add the child to `people`, then put their `id` in the parents' `children` array:

```js
{ id: "u-nagarjuna-suneetha",
  partners: ["makani-nagarjuna-sagar", "macha-suneetha"],
  children: ["makani-ramakrishna", "makani-sai-priyanka"] },
//                                   ^^^^^^^^^^^^^^^^^^^ add here
```

Put children in **birth order, eldest first** — and give each one an `order`
number too, because the Telugu kinship terms depend on seniority (*Annayya*
vs *Thammudu*).

### 4. Add a whole new family branch

When Thrinadh's parents are known, for example:

```js
// 1. in `families` — a colour for the surname
mutyala: { name: "Mutyala", telugu: "ముత్యాల", color: "#d97706", notes: "" },

// 2. in `people` — his parents, one generation up from him
{ id: "mutyala-father", name: "… Mutyala", family: "mutyala", gen: 3, sex: "m" },
{ id: "tbd-mutyala-mother", name: "…", family: "tbd",
  marriedInto: "mutyala", gen: 3, sex: "f" },

// 3. in `unions` — marry them and list Thrinadh as their son
{ id: "u-mutyala-g3",
  partners: ["mutyala-father", "tbd-mutyala-mother"],
  children: ["mutyala-thrinadh"] },
```

That is the whole procedure. The new branch positions itself.

### The id convention — the one thing worth getting right

```
<birth-family>-<given-name>        makani-satyanarayana
tbd-<given-name>                   tbd-latha        (birth surname unknown)
```

Use the family a person was **born into**, never the surname they took at
marriage. Padmaja is `macha-padmaja` with `family: "macha"` and
`marriedInto: "makani"` — that is precisely what lets the chart show that the
Makani and Macha families are tied together twice. If you typed her as
`makani`, that whole finding would disappear.

The same applies to wives whose birth family you do not know yet: give them
`family: "tbd"`, **not** their husband's family.

### Every field a person can have

| field | example | meaning |
|---|---|---|
| `id` | `"macha-suneetha"` | permanent unique handle. Pick once, never change |
| `name` | `"Suneetha Makani"` | display name, married surname is fine |
| `telugu` | `"సునీత"` | optional, shown under the name |
| `family` | `"macha"` | **birth** family key → the card colour |
| `marriedInto` | `"makani"` | surname taken at marriage |
| `gen` | `3` | generation row |
| `sex` | `"m"` / `"f"` / `"u"` | `"u"` when not confirmed |
| `order` | `4` | birth order among siblings, 1 = eldest |
| `birth` / `death` | `"1959"` | free text — `"c.1930"` and `"12 Mar 1959"` both fine |
| `deceased` | `true` | when you have no date |
| `nickname` | `"Kittu"` | ముద్దు పేరు |
| `title` | `"Thathagaru"` | honorific, shown as a small badge |
| `photo` | `"suneetha-1985.jpg"` | only if the filename is not `<id>.jpg` |
| `notes` | `"…"` | free text, shown in the detail panel |
| `todo` | `"confirm birth year"` | shows an amber dot and joins the to-do list |
| `placeholder` | `true` | a person you know existed but cannot name yet |

### If the chart goes blank

You have almost certainly left out a comma or a bracket. Open the browser
console (**F12**) — the error names the line in `js/data.js`. The **Family info**
panel also lists any id that is referenced but does not exist.

---

## Adding face pictures

1. Crop the photo square, roughly face-centred. 400×400 px is plenty.
2. Save it as `photos/<person-id>.jpg` — so Suneetha's photo is
   `photos/macha-suneetha.jpg`.
3. Refresh.

That is it — no code change. If you want a different filename, set `photo:`
on that person instead.

Until a photo exists, the card shows a coloured circle with the person's
initials, so the chart never looks broken. See [`photos/README.md`](photos/README.md).

---

## Surnames, alliances and cousin marriages

This is the part built specifically for a Telugu family, where the same two
families often marry across several generations.

Open the **Family info** panel (top right).

- **Marriage alliances** — every pair of surnames that has ever intermarried,
  with a count. A count above one is the interesting case, and Makani + Macha
  is already at **2**.
- **Brothers who married sisters** — detected structurally, not hard-coded.
  Satyanarayana and Nagarjuna Sagar Makani married Padmaja and Suneetha Macha,
  so an amber arc joins those two marriages on the chart.
- **Double first cousins** — anyone who shares *both* sets of grandparents,
  which is what a brother/sister double marriage produces in the next
  generation.
- **Marriages between relatives** — cousin marriages you have recorded.

To record a cousin marriage, set `consanguinity` on that union:

```js
{ id: "u-example",
  partners: ["makani-someone", "macha-someone"],
  consanguinity: "menarikam",   // మేనరికం — marriage to the maternal uncle's child
  children: [] },
```

Accepted values: `"menarikam"`, `"first-cousin"`, `"second-cousin"`,
`"same-family"`. Any of them draws a red dashed marriage bar and adds the couple
to the panel.

The kinship engine already knows which relatives are *marriageable* under the
menarikam custom — click a cross cousin and the panel says so. Background and
the full term list are in [`docs/TELUGU-KINSHIP.md`](docs/TELUGU-KINSHIP.md).

---

## What is in the chart today

**26 people across 4 populated rows**, with the 5th (generation 1) waiting as
grey placeholder cards for when those names are found.

```
gen 1   ? Makani + wife            ? Macha + wife           ← placeholders
gen 2   Ramachandra Rao + Padmavathi Makani
        Thathagaru + Ammamma Macha
gen 3   Venkateshwara Rao ── Latha
        Chandrashekhar ───── Sarada
        Satyanarayana ────── Padmaja Macha      ⎫ the double
        Nagarjuna Sagar ──── Suneetha Macha     ⎭ alliance
        Harikrishna
        Ramakrishna (d. aged 16)
        · Macha side: Padmaja, Suneetha, Ramesh (d.)
gen 4   Kittu, Pony · Sindhura, Sri Vatsava
        Ramakrishna · Sai Priyanka ── Thrinadh Mutyala
gen 5   (nobody yet)
```

**The open questions are already listed for you.** Open **Family info → Still to
find out** for all 24, including: the Macha grandparents' given names, the birth
surnames of Latha, Sarada, Padmavathi and Ammamma, whether Kittu and Pony are
pet names, Satyanarayana and Padmaja's children, and Harikrishna's family.

A few things were inferred rather than told, and are worth checking:
Sindhura is marked female and Sri Vatsava male, and Kittu and Pony are left as
sex `"u"` rather than guessed. Every one of these is a one-word edit.

---

## Publish it to GitHub Pages

You said you would be creating the account, so this starts from zero. Free
GitHub Pages requires the repository to be **public** — please read
[Before you publish](#before-you-publish-privacy) first.

**1. Create the account** at <https://github.com/signup>.

**2. Create an empty repository** at <https://github.com/new>:
   - Name: `family-tree`
   - Public
   - Do **not** tick "Add a README" — this folder already has one.

**3. Push this folder.** In a terminal here in `E:\family-tree`:

```bash
git remote add origin https://github.com/YOUR-USERNAME/family-tree.git
git branch -M main
git push -u origin main
```

**4. Turn on Pages.** Repository → **Settings** → **Pages** →
   Source: **Deploy from a branch** → Branch: **main**, folder: **/ (root)** → **Save**.

**5. Wait about a minute.** Your chart is then live at:

```
https://YOUR-USERNAME.github.io/family-tree/
```

To get it at `https://YOUR-USERNAME.github.io/` instead, name the repository
`YOUR-USERNAME.github.io` and everything else is the same.

**Updating it later** — edit `js/data.js`, then:

```bash
git add -A && git commit -m "Add Harikrishna's family" && git push
```

The live site updates itself within a minute.

> The empty `.nojekyll` file in this folder matters: it stops GitHub trying to
> run the site through Jekyll, which would ignore some files. Leave it there.

---

## Before you publish: privacy

A public GitHub Pages site is **readable by anyone and indexed by search
engines**, and this repository will contain the names, photographs, birth years
and family relationships of living relatives — including children.

Please decide deliberately:

- **Ask the adults** whose photographs and dates you are putting online,
  especially before adding pictures of anyone else's children.
- **Consider leaving out birth dates** of living people. Full dates of birth are
  a standard identity-verification question.
- **A private repository is a supported option.** GitHub Pages on a private
  repo needs a paid plan, but you can always share the folder itself, or run
  `python tools/serve.py` at a family gathering.
- **Deleting later is not complete.** Once a page has been public it may live on
  in caches and archives.

None of this is a reason not to publish — it is a reason to choose. See
[`docs/PRIVACY.md`](docs/PRIVACY.md) for the options, including how to publish a
public chart with living people reduced to first names only.

---

## Every file in this repository

```
family-tree/
├── index.html              the page itself
├── README.md               this file
├── .nojekyll               tells GitHub Pages not to run Jekyll — keep it
│
├── js/
│   ├── data.js             ★ THE FILE YOU EDIT — the whole family
│   ├── kinship.js          Telugu relationship terms
│   ├── layout.js           works out where every card goes
│   ├── render.js           draws the cards and the connecting lines
│   └── app.js              pan, zoom, search, panels, printing
│
├── css/styles.css          the entire look, light and dark
├── photos/                 face pictures, named <person-id>.jpg
├── tools/serve.py          local preview server (no-cache)
└── docs/
    ├── EDITING.md          longer editing guide with worked examples
    ├── TELUGU-KINSHIP.md   the kinship terms and what menarikam means
    ├── DEPLOY.md           publishing, in more detail
    └── PRIVACY.md          what goes public, and the alternatives
```

Roughly: **`js/data.js` is yours, everything else is machinery.**

---

## Keyboard shortcuts

| key | action |
|---|---|
| `/` | jump to search |
| `+` / `−` | zoom |
| `0` | fit the whole tree |
| arrow keys | pan |
| `Esc` | close panels and clear the selection |
| click a card | focus that person's line of descent and open their details |
| click again | clear |

Every person also has a direct link — `…/#p=macha-suneetha` opens the chart
focused on that person, which is handy for sending to relatives.

---

*Built to be extended. If a relative is missing, they are one object in
`js/data.js` away from being on the chart.*
