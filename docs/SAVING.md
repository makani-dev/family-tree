# Saving from the page

There are two ways to turn an edit into the published chart. Both end in the
same place: a commit that changes `js/data.js`.

| | needs | who can use it |
|---|---|---|
| **Save to GitHub** | a token, set up once | whoever set the token |
| **Download data.js** | nothing | anyone |

---

## Why it works this way

The site is static files on GitHub Pages. There is no server behind it and no
database, so there is nothing to "save to" in the usual sense.

What there is, though, is a repository, and GitHub has an API for writing files
to one. So the page commits `js/data.js` itself. A commit *is* the save: it is
versioned, you can see exactly what changed, you can undo it, and the normal
Pages deploy republishes the site about a minute later.

This is better than a database for a family tree. The whole family is one
readable text file that will still open in fifty years, with a full history of
who changed what.

---

## Setting it up, once

**1. Make a token.** Go to
<https://github.com/settings/personal-access-tokens> and create a
**fine-grained** personal access token.

| field | what to choose |
|---|---|
| Repository access | **Only select repositories**, then pick `family-tree` |
| Permissions | Repository permissions, **Contents: Read and write** |
| Expiration | pick a date. 90 days is sensible |

Nothing else needs ticking. Contents is the only permission required.

**2. Put it in the page.** On the site, press **Edit**, then **Set up saving**.
The account and repository are filled in already, worked out from the address.
Paste the token, press **Save settings**, and it will tell you whether it can
see the file.

**3. From then on**, editing shows a **Save to GitHub** button. One press
commits your changes.

> **If you ever rename the repository or the account**, the settings stored in
> your browser still point at the old name and saving will fail with "GitHub
> cannot find that repository or file". Open **Set up saving** and press
> **Use this page's address** to pick up the new one.

---

## What happens when you press Save

1. The chart is written out as a `data.js` file, formatted the same way as the
   hand-written one.
2. The page reads the current version of `js/data.js` from GitHub to get its
   `sha`, so it can tell if someone else changed it meanwhile.
3. It commits, with a message like `Update the family tree (2026-08-25)`.
4. Your local draft is cleared, because it is now the published file.
5. GitHub Pages rebuilds. Your own browser already shows the saved version;
   other people see it within a minute or two.

If somebody else edited the file since your page loaded, the save is refused
rather than quietly overwriting them. Reload, redo the change, save again.

---

## About the token

**It is a real credential.** Treat it like a password.

- It is stored in this browser's `localStorage` and nowhere else. It is **never**
  written into the repository, so it cannot leak through a commit.
- It is only ever sent to `api.github.com`.
- Anyone who can open this browser profile can read it. Do not set it up on a
  shared or public computer.
- **Forget token** removes it from the browser.
- If you think it leaked, revoke it at
  <https://github.com/settings/personal-access-tokens>. That instantly makes it
  useless. Nothing else needs changing.
- A fine-grained token limited to one repository with only Contents write access
  can do exactly one thing: change files in `family-tree`. It cannot touch your
  other repositories, your account, or anything else.

**Visitors cannot save.** The button is visible to anyone who opens Edit mode,
but without a token it just opens the setup panel. Their edits stay in their own
browser, which is the same as before.

---

## The other route, unchanged

**Download data.js** still works and needs no token. Press it, replace
`js/data.js` in the repository with the file you get, commit it. Use this if you
would rather not have a token in a browser at all, or if you want to review the
diff before it goes live.

---

## If saving fails

The page reports the reason in plain words. What each one means:

**"GitHub rejected the token."** Wrong, expired, or revoked. Make a new one.

**"The token is valid but not allowed to write here."** The token exists but
lacks **Contents: Read and write**, or the repository was not included in its
*Only select repositories* list. Edit the token on GitHub.

**"GitHub cannot find that repository or file."** Check the account, repository
and path in the setup panel. For this chart they should be `makani-family-tree`,
`makani-family-tree.github.io`, `main`, `js/data.js`.

**"Somebody else changed the file since this page loaded."** Two people edited
at once, or you edited from a second browser. Reload the page, make the change
again, save.

---

## If several people should be able to edit

Tokens do not scale to a whole family: everyone would need their own, and each
one is a credential to look after.

If it ever comes to that, the usual answers are a hosted database with sign-in
(Supabase and Firebase both have free tiers and Google sign-in), or a git-based
CMS such as Decap. Both mean running a service and holding keys, which is a real
step up in overhead from a folder of static files.

For one person maintaining a family chart, a token is the lighter answer, and
the data stays a plain file in your own repository either way.
