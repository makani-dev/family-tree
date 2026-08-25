# Telugu kinship terms - బంధుత్వాలు

Click any card in the chart and the detail panel tells you what the person at
they would be called from a chosen position in the tree. Click a card and press
**Relationships from here** to set that position; nobody holds it by default.
This page explains where those words come from,
and how to change them if your family says it differently.

> **Regional variation is real.** These terms shift between Telangana, coastal
> Andhra and Rayalaseema, and between communities. The set below is the widely
> understood one. **If your family uses different words, they are not wrong -
> edit them.** Every word the chart can produce lives in one object, `TERMS`, at
> the top of [`js/kinship.js`](../js/kinship.js).

---

## Why a family tree needs this at all

English collapses relationships that Telugu keeps carefully apart. "Uncle"
covers four different people, and the difference between them decides who you
can marry, who performs which ritual, and how you address someone in a room.

| English | Telugu keeps these apart |
|---|---|
| uncle | **Peddananna** (father's elder brother) · **Babai** (father's younger brother) · **Mamayya** (mother's brother) |
| aunt | **Peddamma** (mother's elder sister) · **Pinni** (mother's younger sister) · **Attha** (father's sister) |
| cousin | **Anna / Akka** (parallel cousin - a sibling) · **Bava / Vadina** (cross cousin - marriageable) |
| grandmother | **Nanamma** (father's mother) · **Ammamma** (mother's mother) |

The last two rows are the ones that matter for this chart.

---

## Direct line

| Telugu | Transliteration | Relationship |
|---|---|---|
| నాన్న | Nanna | father |
| అమ్మ | Amma | mother |
| తాతయ్య | Thathayya | grandfather (either side) |
| నాన్నమ్మ | Nanamma | father's mother |
| అమ్మమ్మ | Ammamma | mother's mother |
| ముత్తాత | Muthatha | great-grandfather |
| ముత్తవ్వ | Muthavva | great-grandmother |
| కొడుకు | Koduku | son |
| కూతురు | Kuthuru | daughter |
| మనవడు | Manavadu | grandson |
| మనవరాలు | Manavaralu | granddaughter |

Adding **-గారు (-garu)** is the respectful form - *Thathagaru*, as Ramakrishna's
maternal grandfather is known in the family. It is an honorific, not a separate
relationship.

## Brothers and sisters

| Telugu | Transliteration | Relationship |
|---|---|---|
| అన్నయ్య | Annayya | elder brother |
| తమ్ముడు | Thammudu | younger brother |
| అక్క | Akka | elder sister |
| చెల్లి | Chelli | younger sister |

There is no word for plain "brother" - you must know who is older. This is why
the `order` field matters in `js/data.js`: without it the chart cannot choose
between *Annayya* and *Thammudu*, and it will say so.

## Parents' brothers and sisters

| Telugu | Transliteration | Relationship | Their spouse |
|---|---|---|---|
| పెద్దనాన్న | Peddananna | father's **elder** brother | Peddamma |
| బాబాయ్ | Babai | father's **younger** brother | Pinni |
| అత్త | Attha | father's sister (*Menatta*) | Mamayya |
| మామయ్య | Mamayya | mother's brother (*Menamama*) | Attha |
| పెద్దమ్మ | Peddamma | mother's **elder** sister | Peddananna |
| పిన్ని | Pinni | mother's **younger** sister | Babai |

Notice the symmetry in the last column: *Peddamma* is both your mother's elder
sister **and** the wife of your father's elder brother. In a family with
repeated alliances one person can be both at once - and in this family, one is.

> **Padmaja Makani is exactly this case.** She is Ramakrishna's *Peddamma* by
> blood, because she is his mother Suneetha's elder sister. She is *also*
> the wife of his *Peddananna*, Satyanarayana. The chart says so on her card.

## Cousins - the important distinction

| | your parent's sibling is… | you call them | can you marry? |
|---|---|---|---|
| **Parallel cousin** | father's **brother**'s child, or mother's **sister**'s child | Annayya / Akka / Thammudu / Chelli - exactly like a sibling | No |
| **Cross cousin** | father's **sister**'s child, or mother's **brother**'s child | Bava / Bavamaridi / Vadina / Maradalu | Traditionally yes - this is *menarikam* |

| Telugu | Transliteration | Relationship |
|---|---|---|
| బావ | Bava | elder male cross cousin (also elder sister's husband) |
| బావమరిది | Bavamaridi | younger male cross cousin (also wife's younger brother) |
| వదిన | Vadina | elder female cross cousin (also elder brother's wife) |
| మరదలు | Maradalu | younger female cross cousin (also younger brother's wife) |

That these words mean *both* "cross cousin" and "sibling-in-law" is not a
coincidence. In a menarikam marriage they become the same person.

**Seniority for cousins comes from the parent, not from actual age.** The child
of your father's elder brother is *Annayya* even if they are younger than you.
The chart follows this convention.

## In-laws

| Telugu | Transliteration | Relationship |
|---|---|---|
| భర్త | Bharta | husband |
| భార్య | Bharya | wife |
| కోడలు | Kodalu | son's wife |
| అల్లుడు | Alludu | daughter's husband |
| మేనల్లుడు | Menalludu | sister's son |
| మేనకోడలు | Menakodalu | sister's daughter |

*Mamayya* and *Attha* do double duty as father-in-law and mother-in-law -
again because of menarikam: if you married your *Mamayya*'s daughter, your
*Mamayya* **is** your father-in-law.

---

## మేనరికం - menarikam

*Menarikam* is marriage between cross cousins: most typically a man marrying
his **maternal uncle's daughter** (*menamama's* daughter), or the mirror case
of a woman marrying her **paternal aunt's son**.

It was long preferred across much of Telugu society because it kept property
inside a known circle, meant the bride entered a household she already knew,
and renewed a tie between two families instead of creating an untested one.
Parallel cousins - your father's brother's children - were never marriageable,
because they are of the same lineage and counted as siblings.

The related custom of **menamama marriage**, where a man marries his sister's
daughter, is also found in some Telugu communities.

**To record one in this chart**, set `consanguinity` on the union:

```js
{ id: "u-example",
  partners: ["makani-someone", "macha-someone"],
  consanguinity: "menarikam",
  children: [] },
```

The marriage bar turns red and dashed, and the couple appears under **Family
info → Marriages between relatives**.

A note on the medical side, since a family tree is often the first place it
comes up: repeated cousin marriage over generations does raise the chance of
recessive conditions appearing. If that is a live question for your family, it
is a conversation for a genetic counsellor, not for a chart - but recording the
marriages accurately is exactly what makes that conversation possible.

---

## What this family's own pattern looks like

Two Makani brothers married two Macha sisters:

```
   Ramachandra Rao Makani            Thathagaru Macha
            │                               │
   ┌────────┴────────┐            ┌─────────┴─────────┐
Satyanarayana   Nagarjuna       Padmaja          Suneetha
     │               │             │                 │
     └───── married ─┼─────────────┘                 │
                     └──────────── married ──────────┘
```

This is a **double alliance** - sometimes described as a brother-sister
exchange. Its consequence lands in the next generation: any children of
Satyanarayana and Padmaja are **double first cousins** of Ramakrishna and Sai
Priyanka. They share *both* sets of grandparents, and are genetically as close
as half-siblings.

The chart detects this on its own - it is not written into the data anywhere.
Add Satyanarayana and Padmaja's children to `js/data.js` and the **Double first
cousins** section will populate itself.

---

## Changing the words

Open [`js/kinship.js`](../js/kinship.js). The first block is the `TERMS` object:

```js
peddananna:   t('పెద్దనాన్న', 'Peddananna', "father's elder brother"),
```

The three parts are Telugu script, transliteration, and the English gloss.
Edit any of them and refresh. To change *which* term applies to a relationship
rather than the wording, the rules are in `bloodTerm()` further down the same
file, laid out in the same order as this page.
