# Face pictures

Put photographs in this folder named after the person's `id` from
[`../js/data.js`](../js/data.js):

```
photos/macha-suneetha.jpg
photos/makani-nagarjuna-sagar.jpg
photos/makani-ramakrishna.jpg
```

Refresh the browser. That is the whole procedure - no code change.

---

## The names to use

Copy the `id` exactly. Click any card in the chart and the detail panel prints
it at the bottom under **In the data file**.

Current ids, for convenience:

```
makani-g1-f                 makani-g1-m
macha-g1-f                  macha-g1-m
makani-ramachandra-rao      tbd-padmavathi
macha-thatha                tbd-ammamma
makani-venkateshwara-rao    tbd-latha
makani-chandrashekhar       tbd-sarada
makani-satyanarayana        macha-padmaja
makani-nagarjuna-sagar      macha-suneetha
makani-harikrishna          makani-ramakrishna-sr
macha-ramesh
makani-kittu                makani-pony
makani-sindhura             makani-sri-vatsava
makani-ramakrishna          makani-sai-priyanka
mutyala-thrinadh
```

**All lower-case, `.jpg`.** Windows does not care about capitalisation but
GitHub Pages does - `Suneetha.JPG` will work on your laptop and silently fail on
the live site.

---

## How to prepare a photo

| | |
|---|---|
| **Shape** | Square. It is displayed in a circle, so anything off-square gets cropped. |
| **Framing** | Head and shoulders, face roughly centred. |
| **Size** | 400×400 px is plenty. 800×800 is the most that is ever useful. |
| **File size** | Aim under 300 KB. |
| **Format** | `.jpg`. |

Cropping a scanned group photograph down to one face works very well - old
family photographs are often the only picture of a grandparent, and a tight crop
looks completely at home on the card.

**Shrink before committing.** Git keeps every version of a binary file forever,
so pushing a 5 MB photo and replacing it three times leaves 20 MB in the
repository permanently. Crop first, commit second.

On Windows, Paint will do it: open, **Resize**, set to 400 px, **Save as JPEG**.

---

## A different filename

If you would rather keep an original filename, set `photo:` on that person
instead:

```js
{ id: "macha-suneetha", name: "Suneetha Makani", family: "macha",
  photo: "suneetha-wedding-1985.jpg", … },
```

The file still lives in this folder. This is also how you use `.png` or
`.webp`, which are supported but not tried automatically.

---

## No photo yet?

Nothing breaks. The card shows a circle in the family's colour with the person's
initials. Many charts stay like that for years - a missing photograph is not a
missing person.

You may see `404` messages for `photos/…jpg` in the browser console. Those are
expected: the chart optimistically looks for a photo for everyone. To silence
them, set `autoPhotos: false` in the `config` block of `js/data.js`, after which
only people with an explicit `photo:` field get a picture.

---

## Before adding pictures of living relatives

Photographs of other people - particularly children - going onto a public
website deserve a conversation first. See [`../docs/PRIVACY.md`](../docs/PRIVACY.md).
