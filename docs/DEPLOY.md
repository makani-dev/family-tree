# Publishing to GitHub Pages

The short version is in the [README](../README.md). This page has the detail,
the alternatives, and what to do when it does not work.

Please read [PRIVACY.md](PRIVACY.md) first — free GitHub Pages requires a
**public** repository.

---

## Why this site is easy to host

There is no build step. No Node, no bundler, no framework, no server code —
just HTML, CSS and JavaScript files that a browser reads directly. Any static
host will serve it: GitHub Pages, Netlify, Cloudflare Pages, or a folder on a
USB stick.

That is also why `js/data.js` assigns to `window.FAMILY` instead of being a
`.json` file loaded with `fetch()`. A `fetch()` of a local file is blocked by
browser security when you open `index.html` directly, so a plain `<script>` tag
is what keeps double-clicking the file working.

---

## First-time setup

### 1. Create the GitHub account

<https://github.com/signup>. The username becomes part of your site address, so
pick one you are happy to give relatives:
`https://USERNAME.github.io/family-tree/`.

### 2. Create an empty repository

<https://github.com/new>

| field | value |
|---|---|
| Repository name | `family-tree` |
| Visibility | **Public** (required for free Pages) |
| Add a README | **leave unticked** |
| .gitignore / licence | leave as *None* |

Leave it empty — this folder already has everything, and adding a README there
creates a conflict on the first push.

### 3. Tell git who you are

Once per computer:

```bash
git config --global user.name "Ramakrishna Makani"
git config --global user.email "you@example.com"
```

### 4. Push

The repository here is already initialised and committed, so:

```bash
git remote add origin https://github.com/YOUR-USERNAME/family-tree.git
git branch -M main
git push -u origin main
```

GitHub will ask you to sign in. In the browser popup, approve it.

### 5. Turn on Pages

Repository → **Settings** → **Pages** (left sidebar) →

- Source: **Deploy from a branch**
- Branch: **main**, folder: **/ (root)**
- **Save**

### 6. Wait about a minute

A green tick appears under the **Actions** tab when it has deployed. The site is
then at:

```
https://YOUR-USERNAME.github.io/family-tree/
```

---

## Updating the chart

```bash
git add -A
git commit -m "Add Harikrishna's wife and children"
git push
```

Live within a minute or so. Hard-refresh (**Ctrl+Shift+R**) if you still see the
old version — that is your browser cache, not GitHub.

---

## Getting it at the shorter address

To publish at `https://YOUR-USERNAME.github.io/` with no `/family-tree` on the
end, name the repository exactly:

```
YOUR-USERNAME.github.io
```

Everything else is identical. You only get one of these per account.

---

## Adding photographs

Photographs make the repository bigger. A few hundred cropped JPEGs is
completely fine — git handles that easily.

```bash
git add photos/
git commit -m "Add photos for the gen-3 brothers"
git push
```

Keep each photo under ~300 KB (see [`photos/README.md`](../photos/README.md)).
Git stores every version of a binary file forever, so replacing a 5 MB photo ten
times leaves 50 MB in the history permanently. Crop and shrink *before*
committing.

GitHub's limits: 100 MB per file, and a warning above 1 GB per repository. You
will not come close with cropped face pictures.

---

## Troubleshooting

**404 at the Pages URL.** Give it two minutes. Then check Settings → Pages shows
branch `main` and folder `/ (root)`, and that `index.html` is at the top level
of the repository, not inside a subfolder.

**The page loads but the tree is blank.** Open the browser console (**F12**). A
syntax error in `js/data.js` is the usual cause. Note that it works locally and
fails when published only if you forgot to commit `js/data.js` — check with
`git status`.

**Styling is missing / the page looks like plain text.** Usually a missing
`.nojekyll`. Confirm it is committed:

```bash
git ls-files | grep nojekyll
```

If nothing prints, run `git add -f .nojekyll` and push. Jekyll otherwise
ignores files and folders beginning with an underscore and can interfere.

**Photos show as initials on the live site but work locally.** Windows does not
care about capitalisation, GitHub does. `photos/Macha-Suneetha.JPG` will not
match the id `macha-suneetha`. Rename to all lower-case with a `.jpg`
extension.

**`git push` rejected — "updates were rejected".** Something exists on GitHub
that you do not have locally, usually because a README was created there. Fix:

```bash
git pull --rebase origin main
git push
```

**Wrong account / password prompt loops.** Windows caches GitHub credentials.
Control Panel → Credential Manager → Windows Credentials → remove any
`git:https://github.com` entry, then push again.

---

## Alternatives to GitHub Pages

| option | public? | notes |
|---|---|---|
| **GitHub Pages** | yes (free tier) | what this guide covers |
| **Private repo + Pages** | no | needs a paid GitHub plan |
| **Netlify / Cloudflare Pages** | yes, password-protection available on paid tiers | drag the folder onto their dashboard, no git needed |
| **Just the folder** | no | zip it and share it; `index.html` works offline |
| **`python tools/serve.py`** | no | for showing it on a laptop at a family gathering |

The offline options are worth remembering — the whole chart works with no
internet connection at all.
