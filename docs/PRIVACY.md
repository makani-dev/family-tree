# Before you make this public

A GitHub Pages site is readable by anyone with the address, and search engines
will index it. So will the repository itself — `js/data.js` is a plain text file
anyone can read, and every photograph in `photos/` is downloadable.

This chart is about to contain **names, photographs, birth years, marriages and
family structure for living relatives, including children.** That is worth ten
minutes of thought before the first `git push`. It is not a reason to avoid
publishing — it is a reason to choose deliberately.

---

## What is actually exposed

| in the repository | visible to |
|---|---|
| `js/data.js` — every name, date, note and `todo` | anyone |
| `photos/*.jpg` — every face picture | anyone |
| git history | anyone, **including things you later deleted** |
| commit messages and your git email | anyone |

The third row is the one people miss. Deleting a photo in a later commit does
not remove it from the repository — it stays in the history and remains
downloadable. Removing it properly means rewriting history, which is awkward.
**Decide before you commit, not after.**

---

## Four options

### 1. Public site, full detail

Simplest, and what most family trees online do. Appropriate when the family has
been asked and is happy.

### 2. Public site, reduced detail for living people

A good middle ground: full detail for those who have died, first names and no
dates for the living.

- Leave `birth` empty for living people, or use just a decade: `"1990s"`.
- Use first names only: `name: "Sindhura"`.
- Leave photographs of minors out entirely.
- Keep `notes` free of addresses, workplaces, health details and phone numbers.

The chart works completely normally with sparse data — that is what the
placeholder and `todo` machinery is for.

### 3. Private repository

Keep the repo private and share the folder itself with relatives (a zip file
works — `index.html` runs offline with no internet at all). GitHub Pages from a
private repository requires a paid plan, but the repository itself being private
is free.

### 4. Not on the internet at all

Run `python tools/serve.py` on a laptop and show it at a family gathering, or
use the **Print** button to make an A3 poster. Nothing here needs a network.

---

## A short checklist

- [ ] Have I asked the adults whose photographs I am putting online?
- [ ] Am I publishing photographs of **other people's children**? Ask their
      parents specifically. This is the single most common regret.
- [ ] Are there full dates of birth for living people? Date of birth plus
      mother's maiden name — both of which a family tree states plainly — are
      classic identity-verification answers. This chart records maiden family
      by design, so be deliberate about dates.
- [ ] Any addresses, phone numbers, workplaces or health details in `notes`?
- [ ] Anything sensitive about a divorce, estrangement, adoption or paternity
      that relatives have not agreed to publish?
- [ ] Is anyone named here likely to object to being findable by name?

---

## If something is already published and should not be

1. Remove it from `js/data.js` / `photos/`, commit, push. It disappears from the
   live site immediately.
2. It is still in the git history. To remove it properly you must rewrite
   history — [`git filter-repo`](https://github.com/newren/git-filter-repo) —
   and force-push. If the repository is young, deleting it on GitHub and pushing
   a fresh one is far simpler.
3. Ask Google to remove the cached page:
   <https://search.google.com/search-console/remove-outdated-content>
4. GitHub will not have made a copy of a public repository unless someone forked
   it. Check the fork count.

---

## A note on relatives who have died

Different families feel differently about naming and photographing people who
have died. This chart records two people who have — Ramakrishna Makani, who died
at sixteen, and Ramesh Macha. Their cards are shown in a muted style with a
greyscale photograph.

That is a design default, not a decision about your family. If anyone would
prefer a name recorded differently, or not at all, that is a one-line edit and
their wish should win.
