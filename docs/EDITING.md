# Editing the tree - worked examples

The README covers the basics. This page is the longer version: complete
copy-paste recipes for the situations that actually come up, plus what to do
when something looks wrong.

Everything here happens in **[`js/data.js`](../js/data.js)**.

---

## The mental model

Three lists, and one rule.

```
families   the surnames (ఇంటిపేర్లు) and their colours
people     one object per person - a floating card
unions     one object per marriage - this is what JOINS people together
```

**The rule:** a person is only connected to their parents if their `id` appears
in the `children` array of their parents' union. Adding someone to `people`
alone gives you a card sitting on its own.

Positions are never stored. You do not place anybody - you state who is
married to whom and who was born to whom, and the layout follows.

---

## Recipe 1 - a new baby (generation 5)

Two edits. First the person:

```js
{ id: "mutyala-arjun", name: "Arjun Mutyala", family: "mutyala",
  gen: 5, sex: "m", order: 1, birth: "2027" },
```

Then list them as a child of the parents' existing union:

```js
{ id: "u-thrinadh-priyanka",
  partners: ["mutyala-thrinadh", "makani-sai-priyanka"],
  children: ["mutyala-arjun"] },        // was []
```

Generation 5 appears as a new row on its own.

---

## Recipe 2 - Harikrishna's wife and children

He is currently on the chart alone. Add his wife to `people`:

```js
{ id: "tbd-hariwife", name: "…", family: "tbd", marriedInto: "makani",
  gen: 3, sex: "f", todo: "name and birth family" },
```

Add the children:

```js
{ id: "makani-child1", name: "…", family: "makani", gen: 4, sex: "u", order: 1 },
```

Then a new union tying them together:

```js
{ id: "u-harikrishna",
  partners: ["makani-harikrishna", "tbd-hariwife"],
  children: ["makani-child1"] },
```

Note his wife gets `family: "tbd"`, not `"makani"` - see
[the surname rule](#the-surname-rule-the-one-that-matters) below.

---

## Recipe 3 - filling in a placeholder ancestor

The grey dashed cards are people you know existed but cannot name yet. When you
learn the Macha grandfather's given name:

```js
// before
{ id: "macha-thatha", name: "Thathagaru Macha", family: "macha", gen: 2,
  sex: "m", title: "Thathagaru", placeholder: true,
  todo: "given name" },

// after
{ id: "macha-thatha", name: "Venkata Rao Macha", family: "macha", gen: 2,
  sex: "m", title: "Thathagaru", telugu: "వెంకట రావు",
  birth: "c.1935", death: "2009" },
```

Drop `placeholder` and `todo`; the card becomes solid and leaves the to-do list.

**Keep the `id` as it is.** Other entries point at `macha-thatha`, and renaming
the id means finding every reference. The id is a handle, not a name.

---

## Recipe 4 - going back a sixth generation

Do **not** renumber everyone. Use `gen: 0`, then `-1`:

```js
{ id: "makani-g0-f", name: "…", family: "makani", gen: 0, sex: "m",
  placeholder: true },
{ id: "tbd-g0-m", name: "(his wife)", family: "tbd", marriedInto: "makani",
  gen: 0, sex: "f", placeholder: true },

{ id: "u-makani-g0",
  partners: ["makani-g0-f", "tbd-g0-m"],
  children: ["makani-g1-f"] },
```

The chart normalises whatever numbers you use, so the oldest row becomes
"Generation 1" on screen automatically.

---

## Recipe 5 - a cousin marriage

```js
{ id: "u-example",
  partners: ["makani-someone", "macha-someone"],
  consanguinity: "menarikam",
  notes: "He married his mother's brother's daughter.",
  children: [] },
```

Values: `"menarikam"`, `"first-cousin"`, `"second-cousin"`, `"same-family"`.

The marriage bar turns red and dashed and the couple is listed under
**Family info → Marriages between relatives**. Background in
[TELUGU-KINSHIP.md](TELUGU-KINSHIP.md).

---

## Recipe 6 - someone married twice

Just add a second union. The person keeps one card; the second marriage is
drawn as a curved dashed bar to the other spouse.

```js
{ id: "u-first",  partners: ["makani-x", "tbd-firstwife"],  children: ["makani-a"] },
{ id: "u-second", partners: ["makani-x", "tbd-secondwife"], children: ["makani-b"] },
```

---

## Recipe 7 - a daughter who married out

Exactly like Sai Priyanka. She stays coloured by her **birth** family and gains
`marriedInto`:

```js
{ id: "makani-sai-priyanka", name: "Sai Priyanka Mutyala",
  family: "makani", marriedInto: "mutyala", gen: 4, sex: "f", order: 2 },
```

Her card reads `Makani → Mutyala`. She remains a Makani descendant on the chart,
which is correct - and her husband's family becomes a new colour.

---

## The surname rule (the one that matters)

> `family` is the family a person was **born into**. Never the surname they took
> at marriage.

This is not a style preference - the entire alliance analysis depends on it.

If Padmaja were typed `family: "makani"` because that is the name she uses now,
then:

- the **Makani + Macha ×2** alliance would vanish,
- a phantom **Makani + Makani** marriage would appear instead,
- the double-cousin detection would break,
- and her card would be the wrong colour.

For a wife whose birth surname you do not know yet, use `family: "tbd"` and
`marriedInto: "<husband's family>"`. When you find out, add the real family to
`families` and change the one word.

---

## Tuning the look

Spacing lives at the top of [`js/layout.js`](../js/layout.js):

```js
var M = {
  CARD_W: 176,      // card width
  CARD_H: 206,      // card height
  SPOUSE_GAP: 22,   // between husband and wife
  CLUSTER_GAP: 54,  // between neighbouring couples
  ROW_H: 322,       // between generations
  PAD: 90,          // outer margin
  BUS_LIFT: 58      // how high the sibling bar sits above the children
};
```

If you change `CARD_W` or `CARD_H`, change the matching `.card` rule in
`css/styles.css` to the same numbers.

Colours are CSS variables at the top of `css/styles.css`; family colours are in
the `families` block of `js/data.js`.

To see the chart from somebody else's point of view, change one line:

```js
config: { ego: "makani-sai-priyanka", … }
```

Every "Relationship to …" line recalculates.

---

## When something looks wrong

**The chart is blank.** A syntax error in `js/data.js` - nearly always a missing
comma between two objects, or one bracket too few. Press **F12**, read the
console; it names the line.

**A person is floating on their own.** They are not in any union's `children`
array, and not a partner in any union.

**Someone is on the wrong row.** Their `gen` does not match their relatives.
The **Family info → Data check** panel flags any child that is not below its
parents.

**"listed as a child of two unions".** The same id appears in two `children`
arrays. Only the first is used.

**Two cards overlap.** Increase `CLUSTER_GAP`.

**Long dashed lines cross the chart.** That is correct and intentional - it is
someone drawn inside their spouse's family whose own parents are elsewhere,
which is precisely what a cross-family marriage looks like. The Macha sisters
are the example.

**Edits do not show up.** Browser cache. Hard-refresh with **Ctrl+Shift+R**, or
serve the folder with `python -m http.server 8000` instead of opening the file
directly.

**Edits do not show up, and you have used the in-page editor.** The editor keeps
a draft in your browser that wins over `js/data.js` until you discard it. Press
**Edit**, then **Discard draft**.

**A photo does not appear.** The filename must match the `id` exactly,
lower-case, `.jpg`. `photos/macha-suneetha.jpg`, not `Suneetha.JPG`.

---

## Checking your work

Open **Family info** (top right). It gives you:

- **Data check** - broken references, generation mistakes, duplicate ids.
- **Still to find out** - every `todo` you have written, as one list.
- **Marriage alliances** - if a surname pair looks wrong here, a `family` field
  is wrong somewhere.

The browser console prints the same warnings on load.

For a quick poke around, the whole model is exposed as `familyModel`:

```js
familyModel.people.size
familyModel.analysis.alliances
Kinship.relationship(familyModel, 'makani-ramakrishna', 'macha-padmaja')
```
