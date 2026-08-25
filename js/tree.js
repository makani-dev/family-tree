/* =============================================================================
 *  tree.js - draws the chart as nested boxes.
 *
 *  There is no layout engine and no coordinate maths. A couple and their
 *  descendants are one <div>, the children sit in a row inside it, and each
 *  child is the same shape again. Ordinary CSS flexbox does the arranging and
 *  CSS pseudo-elements draw the connecting lines.
 *
 *      .branch                a couple and everything below them
 *        .couple              one or two .leaf cards, joined by a .bond
 *        .toggle              the +/- button, only when there are children
 *        .kids                a row of .kid
 *          .kid > .branch     and round again
 *
 *  WHERE SOMEONE IS DRAWN
 *  ----------------------
 *  A marriage hangs under whichever partner is its "anchor": the one whose own
 *  parents are on the chart, preferring the husband (config.anchorPreference),
 *  because these families are recorded patrilineally.
 *
 *  A wife whose own parents are also on the chart therefore shows up twice: once
 *  beside her husband, and once as a daughter in her parents' row. That is not a
 *  mistake, it is the honest picture - she belongs to both families, and in this
 *  family that double link is the whole point. Both copies carry the same id, so
 *  clicking either lights up both.
 * ========================================================================== */

(function (global) {
  'use strict';

  var M = null;                 /* the model */
  var index = null;             /* person id -> [elements], a person can repeat */
  var collapsed = new Set();

  /* ---------------------------------------------------------------- utils */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function initials(p) {
    var w = String(p.name || '?').replace(/\(.*?\)/g, ' ').split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    if (w.length === 1) return w[0].charAt(0).toUpperCase();
    return (w[0].charAt(0) + w[w.length - 1].charAt(0)).toUpperCase();
  }

  function lifespan(p) {
    var b = p.birth ? String(p.birth) : '';
    var d = p.death ? String(p.death) : '';
    if (b && d) return b + '-' + d;
    if (b) return 'b. ' + b;
    if (d) return 'd. ' + d;
    return '';
  }

  /* an empty card means this person has died; nothing else marks it */
  function isUnfilled(p) { return !!(p.death || p.deceased); }

  /* which partner does this marriage hang from? */
  function anchorOf(u) {
    if (u.anchor && M.person(u.anchor)) return u.anchor;
    var want = M.config.anchorPreference;

    /* Somebody of the lineage sex who has children heads their own line, so
       they anchor the marriage even when their own parents are unknown.
       Without this, marrying in a wife whose parents ARE recorded pulls the
       husband's whole lineage in under her family: recording that Raghavamma
       was born Makani moved the entire Macha side into the Makani tree and
       took the Macha root off the chart. */
    if (u.children.length) {
      var head = u.partners.filter(function (id) {
        var p = M.person(id);
        return p && p.sex === want;
      })[0];
      if (head) return head;
    }

    var withParents = u.partners.filter(function (id) { return M.person(id).parentUnion; });
    var pref = withParents.filter(function (id) { return M.person(id).sex === want; });
    return pref[0] || withParents[0] || u.partners[0] || null;
  }

  function unionsAnchoredOn(id) {
    var p = M.person(id);
    if (!p) return [];
    return p.unionIds.map(function (uid) { return M.union(uid); })
      .filter(function (u) { return u && anchorOf(u) === id; });
  }

  /* ----------------------------------------------------------------- leaf */
  function leaf(id, opts) {
    opts = opts || {};
    var p = M.person(id);
    var fam = M.familyOf(id);
    var a = el('div', 'leaf');
    a.dataset.id = id;
    a.tabIndex = 0;
    a.style.setProperty('--fam', fam.color || '#64748b');
    if (isUnfilled(p)) a.classList.add('is-unfilled');
    if (p.placeholder) a.classList.add('is-placeholder');
    /* Someone who belongs to two families is drawn in both. The first place
       is the real one (their children hang there); any later appearance is
       marked as a repeat so nobody thinks there are two of them. */
    if (opts.echo || index.has(id)) a.classList.add('is-echo');

    var ph = el('div', 'face');
    ph.appendChild(el('span', 'initials', initials(p)));
    var src = p.photo ? M.config.photoDir + '/' + p.photo
            : (M.config.autoPhotos && !p.placeholder ? M.config.photoDir + '/' + p.id + '.jpg' : null);
    if (src) {
      var img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', function () { img.remove(); });
      img.src = src;
      ph.appendChild(img);
    }
    a.appendChild(ph);

    a.appendChild(el('div', 'nm', p.name));
    if (p.telugu) a.appendChild(el('div', 'te', p.telugu));
    var span = lifespan(p);
    if (span) a.appendChild(el('div', 'meta', span));

    /* the surname line is what makes the alliances readable */
    var sur = el('div', 'sur');
    var dot = el('i');
    dot.style.background = fam.color || '#64748b';
    sur.appendChild(dot);
    var label = fam.name;
    if (p.marriedInto && M.families[p.marriedInto]) label += ' › ' + M.families[p.marriedInto].name;
    sur.appendChild(document.createTextNode(label));
    a.appendChild(sur);

    if (p.todo) {
      var t = el('span', 'gap');
      t.title = 'Still to find out: ' + p.todo;
      a.appendChild(t);
    }

    if (!index.has(id)) index.set(id, []);
    index.get(id).push(a);
    return a;
  }

  /* --------------------------------------------------------------- couple */
  function couple(u) {
    var wrap = el('div', 'couple');
    wrap.dataset.union = u.id;
    var ids = u.partners.slice();
    /* husband on the left, which is how these are normally read */
    ids.sort(function (a, b) {
      var pa = M.person(a), pb = M.person(b);
      if (pa.sex === pb.sex) return 0;
      if (pa.sex === 'm') return -1;
      if (pb.sex === 'm') return 1;
      return 0;
    });
    ids.forEach(function (id, i) {
      if (i) {
        var bond = el('div', 'bond' + (u.consanguinity ? ' is-consang' : ''));
        if (u.consanguinity) bond.title = 'Married relatives: ' + u.consanguinity;
        wrap.appendChild(bond);
      }
      wrap.appendChild(leaf(id));
    });
    return wrap;
  }

  /* --------------------------------------------------------------- branch */
  /* A person, whoever they are married to, and everyone below them. */
  function branch(id, seen) {
    seen = seen || new Set();
    var b = el('div', 'branch');
    var mine = unionsAnchoredOn(id);

    if (seen.has(id)) { b.appendChild(leaf(id, { echo: true })); return b; }
    seen.add(id);

    if (mine.length) {
      mine.forEach(function (u, i) {
        if (i) b.appendChild(el('div', 'again', 'also married'));
        b.appendChild(couple(u));
      });
    } else {
      var solo = el('div', 'couple');
      solo.appendChild(leaf(id));
      b.appendChild(solo);
    }

    var kids = [];
    mine.forEach(function (u) {
      u.children.forEach(function (c) { if (kids.indexOf(c) < 0) kids.push(c); });
    });
    kids.sort(function (a, b2) {
      var pa = M.person(a), pb = M.person(b2);
      var oa = typeof pa.order === 'number' ? pa.order : 99;
      var ob = typeof pb.order === 'number' ? pb.order : 99;
      return oa - ob || pa._i - pb._i;
    });

    if (kids.length) {
      var key = id;
      var toggle = el('button', 'toggle');
      toggle.type = 'button';
      var kidWrap = el('div', 'kids');
      kids.forEach(function (c) {
        var slot = el('div', 'kid');
        slot.appendChild(branch(c, seen));
        kidWrap.appendChild(slot);
      });

      function paint() {
        var off = collapsed.has(key);
        b.classList.toggle('collapsed', off);
        toggle.textContent = off ? '+ ' + kids.length : '−';
        toggle.title = off ? 'Show ' + kids.length + ' below' : 'Hide the branch below';
        toggle.setAttribute('aria-expanded', String(!off));
      }
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        if (collapsed.has(key)) collapsed.delete(key); else collapsed.add(key);
        paint();
      });
      paint();

      b.appendChild(toggle);
      b.appendChild(kidWrap);
    }
    return b;
  }

  /* ---------------------------------------------------------------- roots */
  function roots() {
    var out = [], claimed = new Set();

    /* every marriage whose anchor has no parents on the chart starts a tree */
    M.data.unions.forEach(function (raw) {
      var u = M.union(raw.id);
      if (!u || !u.partners.length) return;
      var a = anchorOf(u);
      if (!a || M.person(a).parentUnion) return;
      if (claimed.has(a)) return;
      claimed.add(a);
      out.push(a);
    });

    /* anyone left with no parents and no marriage still deserves a card */
    M.data.people.forEach(function (raw) {
      var p = M.person(raw.id);
      if (!p || p.parentUnion || claimed.has(p.id)) return;
      if (p.unionIds.length) return;
      claimed.add(p.id);
      out.push(p.id);
    });
    return out;
  }

  /* ---------------------------------------------------------------- mount */
  function render(model, container) {
    M = model;
    index = new Map();
    container.innerHTML = '';

    roots().forEach(function (id) {
      var sec = el('section', 'root');
      var fam = M.familyOf(id);
      var head = el('h2', 'root-name');
      var dot = el('i');
      dot.style.background = fam.color || '#64748b';
      head.appendChild(dot);
      head.appendChild(document.createTextNode(fam.name + (fam.telugu ? '  ' + fam.telugu : '')));
      sec.appendChild(head);
      sec.appendChild(branch(id));
      container.appendChild(sec);
    });

    model.cards = index;
    return index;
  }

  /* --------------------------------------------------------- highlighting */
  function clear(container) {
    container.querySelectorAll('.leaf').forEach(function (n) {
      n.classList.remove('sel', 'kin', 'dim');
    });
    container.classList.remove('focusing');
  }

  function related(id) {
    var keep = new Set([id]);
    (function up(x, d) {
      if (d > 8) return;
      M.parentsOf(x).forEach(function (p) {
        if (keep.has(p)) return;
        keep.add(p);
        M.spousesOf(p).forEach(function (s) { keep.add(s); });
        up(p, d + 1);
      });
    })(id, 0);
    (function down(x, d) {
      if (d > 8) return;
      M.childrenOf(x).forEach(function (c) {
        if (keep.has(c)) return;
        keep.add(c);
        M.spousesOf(c).forEach(function (s) { keep.add(s); });
        down(c, d + 1);
      });
    })(id, 0);
    M.spousesOf(id).forEach(function (s) { keep.add(s); });
    M.siblingsOf(id).forEach(function (s) { keep.add(s); });
    return keep;
  }

  function select(id, container) {
    clear(container);
    if (!id) return;
    var keep = related(id);
    container.classList.add('focusing');
    index.forEach(function (nodes, pid) {
      nodes.forEach(function (n) {
        if (pid === id) n.classList.add('sel');
        else if (keep.has(pid)) n.classList.add('kin');
        else n.classList.add('dim');
      });
    });
  }

  /* open every collapsed ancestor so a person can actually be seen */
  function reveal(id, container, rerender) {
    var chain = [], cur = id, guard = 0;
    while (cur && guard++ < 40) {
      var parents = M.parentsOf(cur);
      if (!parents.length) break;
      var u = M.union(M.person(cur).parentUnion);
      var a = u ? anchorOf(u) : null;
      if (!a) break;
      chain.push(a);
      cur = a;
    }
    var opened = false;
    chain.forEach(function (a) { if (collapsed.delete(a)) opened = true; });
    if (opened && rerender) rerender();
    var node = (index.get(id) || [])[0];
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    }
  }

  global.FamilyTree = {
    render: render,
    select: select,
    clear: clear,
    reveal: reveal,
    initials: initials,
    lifespan: lifespan,
    isUnfilled: isUnfilled,
    collapsed: collapsed
  };

})(window);
