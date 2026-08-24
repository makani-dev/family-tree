/* =============================================================================
 *  github.js - save the chart straight back to the repository.
 *
 *  WHY THIS EXISTS
 *  ---------------
 *  The site is static files on GitHub Pages. There is no server to save to, so
 *  the page commits js/data.js to the repository itself through the GitHub API.
 *  A commit is a save: the change is versioned, diffable, and republished by
 *  the normal Pages deploy a minute later.
 *
 *  WHO CAN SAVE
 *  ------------
 *  Only somebody holding a token with write access to the repository. The token
 *  is typed into this page by its owner and kept in that browser's localStorage.
 *  It is never in the repository, never sent anywhere except api.github.com, and
 *  visitors who have not set one simply cannot save. They keep the local draft
 *  they already had.
 *
 *  THE TOKEN IS A REAL CREDENTIAL. Anyone who can open that browser profile can
 *  read it. Use a fine-grained token limited to this one repository with
 *  Contents: Read and write, give it an expiry date, and revoke it at
 *  https://github.com/settings/tokens if it ever leaks.
 * ========================================================================== */

(function (global) {
  'use strict';

  var CFG_KEY = 'familytree-github';
  var TOK_KEY = 'familytree-github-token';
  var API = 'https://api.github.com';

  /* ------------------------------------------------------------- settings */
  /* Guess owner and repo from the address, so there is usually nothing to
     type: makani-dev.github.io/family-tree/ -> makani-dev / family-tree */
  function guess() {
    var owner = '', repo = '';
    var host = location.hostname || '';
    if (/\.github\.io$/.test(host)) {
      owner = host.replace(/\.github\.io$/, '');
      var seg = location.pathname.split('/').filter(Boolean);
      repo = seg.length ? seg[0] : owner + '.github.io';
    }
    return { owner: owner, repo: repo, branch: 'main', path: 'js/data.js' };
  }

  function settings() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) { /* ignore */ }
    return Object.assign(guess(), saved);
  }

  function saveSettings(s) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }

  function token() {
    try { return localStorage.getItem(TOK_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOK_KEY, t);
      else localStorage.removeItem(TOK_KEY);
    } catch (e) { /* ignore */ }
  }
  function isConfigured() {
    var s = settings();
    return !!(token() && s.owner && s.repo && s.path);
  }

  /* --------------------------------------------------------------- base64 */
  /* btoa() throws on anything above U+00FF, and this file is full of Telugu,
     so encode to UTF-8 bytes first. */
  function toBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  /* ------------------------------------------------------------------ api */
  function headers() {
    return {
      'Authorization': 'Bearer ' + token(),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  function contentsUrl(s) {
    return API + '/repos/' + encodeURIComponent(s.owner) + '/' +
           encodeURIComponent(s.repo) + '/contents/' +
           s.path.split('/').map(encodeURIComponent).join('/');
  }

  function explain(status, body) {
    var msg = (body && body.message) || '';
    if (status === 401) return 'GitHub rejected the token. It may be wrong, expired or revoked.';
    if (status === 403) return 'The token is valid but not allowed to write here. A fine-grained ' +
                              'token needs Contents: Read and write on this repository.';
    if (status === 404) return 'GitHub cannot find that repository or file. Check the owner, ' +
                              'repository and path, and that the token can see this repository.';
    if (status === 409 || /does not match|sha/i.test(msg)) {
      return 'Somebody else changed the file since this page loaded. Reload, redo the change, and save again.';
    }
    if (status === 422) return 'GitHub refused the update: ' + msg;
    return 'GitHub returned ' + status + (msg ? ': ' + msg : '');
  }

  /* current sha of the file, or null when it does not exist yet */
  function currentSha(s) {
    return fetch(contentsUrl(s) + '?ref=' + encodeURIComponent(s.branch), { headers: headers() })
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) return r.json().catch(function () { return {}; })
          .then(function (b) { throw new Error(explain(r.status, b)); });
        return r.json().then(function (j) { return j.sha; });
      });
  }

  /* Writes `text` to the configured path. Resolves with the commit url. */
  function save(text, message) {
    if (!token()) return Promise.reject(new Error('No GitHub token set on this browser.'));
    var s = settings();
    if (!s.owner || !s.repo) return Promise.reject(new Error('Owner and repository are not set.'));

    return currentSha(s).then(function (sha) {
      var body = {
        message: message || 'Update the family tree',
        content: toBase64(text),
        branch: s.branch || 'main'
      };
      if (sha) body.sha = sha;
      return fetch(contentsUrl(s), {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers()),
        body: JSON.stringify(body)
      });
    }).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; })
          .then(function (b) { throw new Error(explain(r.status, b)); });
      }
      return r.json();
    }).then(function (j) {
      return (j.commit && j.commit.html_url) || '';
    });
  }

  /* a cheap check that the token works, without writing anything */
  function test() {
    var s = settings();
    if (!token()) return Promise.reject(new Error('No token set.'));
    return currentSha(s).then(function (sha) {
      return sha ? 'Found ' + s.path + ' in ' + s.owner + '/' + s.repo + '. Saving should work.'
                 : s.path + ' does not exist yet in ' + s.owner + '/' + s.repo + '. Saving will create it.';
    });
  }

  global.FamilyGitHub = {
    settings: settings,
    saveSettings: saveSettings,
    token: token,
    setToken: setToken,
    isConfigured: isConfigured,
    save: save,
    test: test,
    toBase64: toBase64
  };

})(window);
