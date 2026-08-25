/* =============================================================================
 *  editor.js - add, change and remove people straight from the web page.
 *
 *  HOW IT WORKS, AND WHAT IT CANNOT DO
 *  -----------------------------------
 *  The published site is a set of static files. There is no server behind it,
 *  so nothing typed here can write to js/data.js by itself, and nothing you do
 *  here changes what other people see.
 *
 *  Edits are kept in this browser (localStorage) as a DRAFT. There are two
 *  ways to turn a draft into the published chart:
 *
 *    "Save to GitHub"    commits js/data.js to the repository directly, using
 *                        a token the owner has set on this browser. One click.
 *                        See js/github.js.
 *    "Download data.js"  gives you the file to replace and commit by hand.
 *                        Always available, needs no token.
 *
 *  This means anyone visiting the site can play with the chart safely - they
 *  are only ever editing their own copy.
 * ========================================================================== */

(function (global) {
  'use strict';

  var DRAFT_KEY = 'familytree-draft-v1';
  var F = null;               /* the live window.FAMILY object */
  var on = false;
  var editing = null;         /* id being edited, or null for a new person */

  /* ------------------------------------------------------------- storage */
  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(F)); }
    catch (e) { console.warn('[editor] could not save draft:', e.message); }
  }
  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
  }
  function hasDraft() {
    try { return !!localStorage.getItem(DRAFT_KEY); } catch (e) { return false; }
  }

  function changed() {
    saveDraft();
    document.dispatchEvent(new CustomEvent('family:changed'));
    paintBanner();
  }

  /* --------------------------------------------------------------- ids */
  function slug(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-');
  }
  function makeId(name, family) {
    var given = String(name || '').trim().split(/\s+/)[0];
    var base = (family || 'tbd') + '-' + (slug(given) || 'person');
    var id = base, n = 2;
    while (F.people.some(function (p) { return p.id === id; })) id = base + '-' + (n++);
    return id;
  }
  function makeUnionId(a, b) {
    var base = 'u-' + String(a).replace(/^[a-z]+-/, '') + '-' + String(b || 'x').replace(/^[a-z]+-/, '');
    var id = base, n = 2;
    while (F.unions.some(function (u) { return u.id === id; })) id = base + '-' + (n++);
    return id;
  }

  /* -------------------------------------------------------------- model */
  function person(id) {
    return F.people.filter(function (p) { return p.id === id; })[0] || null;
  }
  function unionsWith(id) {
    return F.unions.filter(function (u) { return u.partners.indexOf(id) >= 0; });
  }
  function parentUnionOf(id) {
    return F.unions.filter(function (u) { return u.children.indexOf(id) >= 0; })[0] || null;
  }
  function label(id) {
    var p = person(id);
    return p ? p.name : id;
  }
  function model_siblings(id) {
    var pu = parentUnionOf(id);
    if (!pu) return [];
    return pu.children.filter(function (c) { return c !== id; });
  }

  function unionLabel(u) {
    return u.partners.map(label).join('  &  ') || '(empty)';
  }

  /* ----------------------------------------------------------- mutations */
  function addPerson(fields) {
    var p = { id: makeId(fields.name, fields.family) };
    Object.keys(fields).forEach(function (k) {
      if (fields[k] !== '' && fields[k] != null) p[k] = fields[k];
    });
    F.people.push(p);
    return p.id;
  }

  function updatePerson(id, fields) {
    var p = person(id);
    if (!p) return;
    /* Wipe the optional fields first, so emptying a box really empties it.
       nickname and title are deliberately absent from this list: they are no
       longer on the form, so wiping them would silently delete what is
       already recorded against people like Kittu and Thathagaru. */
    ['telugu', 'marriedInto', 'order', 'birth', 'death',
     'photo', 'notes', 'todo', 'placeholder', 'deceased'].forEach(function (k) {
      delete p[k];
    });
    Object.keys(fields).forEach(function (k) {
      if (fields[k] !== '' && fields[k] != null) p[k] = fields[k];
    });
  }

  function deletePerson(id) {
    F.people = F.people.filter(function (p) { return p.id !== id; });
    F.unions.forEach(function (u) {
      u.partners = u.partners.filter(function (x) { return x !== id; });
      u.children = u.children.filter(function (x) { return x !== id; });
    });
    /* A marriage with nobody left in it is not a marriage, even if children
       were listed under it. Keeping it would leave those children pointing at
       a couple that cannot be drawn, and their entire branch would disappear
       from the chart while still sitting in the file. Let them go parentless
       instead, which is the truth once both parents have been deleted. */
    F.unions = F.unions.filter(function (u) { return u.partners.length > 0; });
  }

  function addSpouse(aId, bId) {
    var solo = F.unions.filter(function (u) {
      return u.partners.length === 1 && u.partners[0] === aId;
    })[0];
    if (solo) { solo.partners.push(bId); orderPartners(solo); return solo.id; }
    var u = { id: makeUnionId(aId, bId), partners: [aId, bId], children: [] };
    orderPartners(u);
    F.unions.push(u);
    return u.id;
  }

  /* husband on the left is the usual reading order for these charts */
  function orderPartners(u) {
    if (u.partners.length !== 2) return;
    var a = person(u.partners[0]), b = person(u.partners[1]);
    if (a && b && a.sex === 'f' && b.sex === 'm') u.partners.reverse();
  }

  function removeUnion(uid) {
    F.unions = F.unions.filter(function (u) { return u.id !== uid; });
  }

  function addChild(uid, childId) {
    var prev = parentUnionOf(childId);
    if (prev) prev.children = prev.children.filter(function (c) { return c !== childId; });
    var u = F.unions.filter(function (x) { return x.id === uid; })[0];
    if (u && u.children.indexOf(childId) < 0) u.children.push(childId);
  }

  function removeChild(uid, childId) {
    var u = F.unions.filter(function (x) { return x.id === uid; })[0];
    if (u) u.children = u.children.filter(function (c) { return c !== childId; });
  }

  function setParents(childId, uid) {
    var prev = parentUnionOf(childId);
    if (prev) prev.children = prev.children.filter(function (c) { return c !== childId; });
    if (uid) addChild(uid, childId);
  }

  /* ------------------------------------------- creating people in one step */
  /* Everywhere you can link an existing person you can also type a new name.
     These build a sensible person around that name so you are never forced to
     go and create them somewhere else first.                                */

  function nextOrder(u) {
    var max = 0;
    u.children.forEach(function (c) {
      var q = person(c);
      if (q && typeof q.order === 'number' && q.order > max) max = q.order;
    });
    return max + 1;
  }

  /* a marriage to hang children from, invented if there is not one yet */
  function ensureUnion(id) {
    var us = unionsWith(id);
    if (us.length) return us[0].id;
    var u = { id: makeUnionId(id, 'x'), partners: [id], children: [] };
    F.unions.push(u);
    return u.id;
  }

  /* Siblings are people who share a set of parents, so saying "these two are
     brother and sister" needs something above them to share. When no parents
     are recorded we invent one unnamed placeholder rather than an empty
     marriage: a marriage with nobody in it is what once made a whole branch
     disappear. The placeholder is drawn as a dashed card and can be named
     whenever you find out who it was. */
  function ensureParentUnion(id) {
    var pu = parentUnionOf(id);
    if (pu) return pu.id;
    var me = person(id) || {};
    var pid = addPerson({
      name: '(parent not yet named)',
      family: me.family && me.family !== 'tbd' ? me.family : 'tbd',
      gen: (typeof me.gen === 'number' ? me.gen : 1) - 1,
      sex: 'u',
      placeholder: true,
      todo: 'who the parents of ' + (me.name || 'this person') + ' were'
    });
    var u = { id: makeUnionId(pid, 'x'), partners: [pid], children: [id] };
    F.unions.push(u);
    return u.id;
  }

  /* Brothers and sisters share a birth family, so linking them can fill in an
     inti peru that was not known. */
  function shareFamily(aId, bId) {
    var a = person(aId), b = person(bId);
    if (!a || !b) return;
    if (a.family && a.family !== 'tbd') adoptFamily(bId, a.family);
    else if (b.family && b.family !== 'tbd') adoptFamily(aId, b.family);
  }

  function addSibling(aId, bId) {
    /* keep whichever of them already has parents, rather than pulling that
       person out of their own family */
    var ua = parentUnionOf(aId), ub = parentUnionOf(bId);
    var uid;
    if (ua) { addChild(ua.id, bId); uid = ua.id; }
    else if (ub) { addChild(ub.id, aId); uid = ub.id; }
    else { uid = ensureParentUnion(aId); addChild(uid, bId); }
    shareFamily(aId, bId);
    return uid;
  }

  function createSibling(aId, name) {
    var uid = ensureParentUnion(aId);
    var newId = createChild(uid, name);
    if (newId) shareFamily(aId, newId);
    return newId;
  }

  function createChild(uid, name) {
    var u = F.unions.filter(function (x) { return x.id === uid; })[0];
    if (!u) return null;
    var partners = u.partners.map(person).filter(Boolean);
    /* the child takes the father's family where there is one, which is what
       the rest of the chart assumes */
    var pick = partners.filter(function (q) { return q.sex === 'm'; })[0] ||
               partners.filter(function (q) { return q.family && q.family !== 'tbd'; })[0] ||
               partners[0];
    var kid = {
      name: name,
      family: familyKeyFor(surnameOf(name)) || (pick && pick.family) || 'tbd',
      gen: (pick ? (pick.gen || 0) : 0) + 1,
      sex: 'u',
      order: nextOrder(u)
    };
    var newId = addPerson(kid);
    u.children.push(newId);
    return newId;
  }

  function createSpouse(id, name) {
    var me = person(id) || {};
    var sex = me.sex === 'm' ? 'f' : (me.sex === 'f' ? 'm' : 'u');
    var theirs = me.family && me.family !== 'tbd' ? me.family : (me.marriedInto || null);
    var key = familyKeyFor(surnameOf(name));

    var sp = { name: name, gen: me.gen, sex: sex };
    if (key && key !== theirs) {
      /* the name carries their own inti peru, so that is their birth family */
      sp.family = key;
    } else {
      /* the name carries the surname they took at marriage, which says
         nothing about where they were born. That distinction is what the
         whole alliance map is built on, so leave it open. */
      sp.family = 'tbd';
      sp.todo = 'birth family (intiperu)';
    }
    if (sex === 'f' && theirs) sp.marriedInto = theirs;

    var newId = addPerson(sp);
    addSpouse(id, newId);
    return newId;
  }

  function createParent(id, name, sex) {
    var me = person(id) || {};
    var key = familyKeyFor(surnameOf(name));
    var p = { name: name, gen: (typeof me.gen === 'number' ? me.gen : 1) - 1, sex: sex };

    /* whichever family this child already belongs to, if any */
    var line = me.family && me.family !== 'tbd' ? me.family : null;

    if (sex === 'm') {
      /* A father brings his own surname, and it is the line the child was
         born into. This is what turns "Subramanium Emani" into a new Emani
         branch rather than another grey card. */
      p.family = key || line || 'tbd';
      if (!key && !line) p.todo = 'birth family (intiperu)';
    } else {
      /* A mother is usually written under her married name, which tells us
         nothing about her own line. Only treat it as her birth family when it
         genuinely differs from the family she married into. */
      var father = null, pu0 = parentUnionOf(id);
      if (pu0) {
        father = pu0.partners.map(person).filter(function (q) {
          return q && q.sex === 'm' && q.family && q.family !== 'tbd';
        })[0];
      }
      var into = father ? father.family : line;
      if (key && key !== into) {
        p.family = key;
      } else {
        p.family = 'tbd';
        p.todo = 'birth family (intiperu)';
      }
      if (into) p.marriedInto = into;
    }

    var pid = addPerson(p);
    var pu = parentUnionOf(id);
    if (pu) {
      if (pu.partners.indexOf(pid) < 0) { pu.partners.push(pid); orderPartners(pu); }
    } else {
      F.unions.push({ id: makeUnionId(pid, 'x'), partners: [pid], children: [id] });
    }

    /* now that a father has a surname, the child belongs to that line too */
    if (sex === 'm') adoptFamily(id, p.family);
    return pid;
  }

  /* colours handed out to surnames invented from the page */
  var PALETTE = ['#4f46e5', '#0d9488', '#d97706', '#be123c', '#7c3aed', '#0369a1',
                 '#65a30d', '#c026d3', '#ea580c', '#0f766e', '#9333ea', '#047857'];

  /* The inti peru is the last word of a written name: "Subramanium Emani"
     is an Emani. One word on its own tells us nothing. */
  function surnameOf(name) {
    var parts = String(name || '').trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /* Find the family for a surname, inventing it if this is the first time we
     have seen it. Matching is on the visible name so "Emani" and "emani" and
     an existing entry called Emani are all the same family. */
  function familyKeyFor(surname) {
    if (!surname) return null;
    var want = String(surname).trim().toLowerCase();
    if (!want) return null;
    var hit = Object.keys(F.families).filter(function (k) {
      return k !== 'tbd' &&
             (k === slug(surname) || String(F.families[k].name || '').toLowerCase() === want);
    })[0];
    return hit || addFamily(surname);
  }

  /* A child belongs to the family they were born into, which is their
     father's. Only fills a gap; never overwrites a known birth family. */
  function adoptFamily(childId, key) {
    var c = person(childId);
    if (!c || !key || key === 'tbd') return;
    if (c.family && c.family !== 'tbd') return;
    c.family = key;
    if (c.todo && /birth family/i.test(c.todo)) delete c.todo;
  }

  function addFamily(name) {
    var key = slug(name) || ('family' + (Object.keys(F.families).length + 1));
    if (F.families[key]) return key;
    var used = Object.keys(F.families).map(function (k) {
      return String(F.families[k].color || '').toLowerCase();
    });
    var free = PALETTE.filter(function (c) { return used.indexOf(c) < 0; });
    F.families[key] = {
      name: String(name).trim(),
      telugu: '',
      color: free[0] || PALETTE[Object.keys(F.families).length % PALETTE.length],
      origin: '',
      notes: ''
    };
    return key;
  }

  /* =========================================================== serialise */
  /* Writes a js/data.js that looks hand-written, so the file stays pleasant
     to edit by hand afterwards. */
  function lit(v) {
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
    return JSON.stringify(v);
  }

  /* greedy line filler, so long records wrap the way a person would wrap them */
  function block(pairs, indent, width) {
    var pad = new Array(indent + 1).join(' ');
    var cont = new Array(indent + 3).join(' ');
    var lines = [], line = pad + '{ ';
    pairs.forEach(function (piece, i) {
      var text = piece + (i < pairs.length - 1 ? ',' : '');
      if (line.length + text.length > width && line.trim() !== '{') {
        lines.push(line.replace(/\s+$/, ''));
        line = cont;
      }
      line += text + ' ';
    });
    lines.push(line.replace(/\s+$/, '') + ' }');
    return lines.join('\n');
  }

  var PERSON_KEYS = ['id', 'name', 'telugu', 'family', 'marriedInto', 'gen', 'sex',
                     'order', 'birth', 'death', 'deceased', 'nickname', 'title',
                     'photo', 'placeholder', 'notes', 'todo'];
  var UNION_KEYS  = ['id', 'partners', 'children', 'year', 'consanguinity',
                     'anchor', 'notes', 'todo'];

  function record(o, keys, indent) {
    var pairs = [];
    keys.forEach(function (k) {
      if (o[k] === undefined || o[k] === '' || o[k] === null) return;
      pairs.push(k + ': ' + lit(o[k]));
    });
    Object.keys(o).forEach(function (k) {          /* anything unexpected */
      if (keys.indexOf(k) < 0 && o[k] !== undefined && o[k] !== '') {
        pairs.push(k + ': ' + lit(o[k]));
      }
    });
    return block(pairs, indent, 78);
  }

  function serialize() {
    var L = [];
    L.push('/* =============================================================================');
    L.push(' *  js/data.js  -  the whole family.');
    L.push(' *');
    L.push(' *  Written out by the in-page editor on ' + new Date().toISOString().slice(0, 10) + '.');
    L.push(' *  Safe to keep editing by hand: the format is exactly the same either way.');
    L.push(' *');
    L.push(' *  families : one entry per surname, with its colour');
    L.push(' *  people   : one entry per person   (family = the family they were BORN into)');
    L.push(' *  unions   : one entry per marriage (children only connect through these)');
    L.push(' *');
    L.push(' *  Full guide: docs/EDITING.md');
    L.push(' * ========================================================================== */');
    L.push('');
    L.push('window.FAMILY = {');
    L.push('');
    L.push('  meta: ' + record(F.meta, ['title', 'subtitle', 'updated'], 2).trim() + ',');
    L.push('');
    L.push('  config: ' + record(F.config, ['ego', 'photoDir', 'autoPhotos',
                                            'anchorPreference', 'showPlaceholders'], 2).trim() + ',');
    L.push('');
    L.push('  families: {');
    Object.keys(F.families).forEach(function (k, i, arr) {
      var body = record(F.families[k], ['name', 'telugu', 'color', 'origin', 'notes'], 4).trim();
      L.push('    ' + k + ': ' + body + (i < arr.length - 1 ? ',' : ''));
    });
    L.push('  },');
    L.push('');
    L.push('  people: [');
    var byGen = F.people.slice().sort(function (a, b) {
      return (a.gen || 0) - (b.gen || 0) || (a.order || 99) - (b.order || 99);
    });
    var lastGen = null;
    byGen.forEach(function (p, i) {
      if (p.gen !== lastGen) {
        if (i) L.push('');
        L.push('    /* ---- generation ' + p.gen + ' ---- */');
        lastGen = p.gen;
      }
      L.push(record(p, PERSON_KEYS, 4) + (i < byGen.length - 1 ? ',' : ''));
    });
    L.push('  ],');
    L.push('');
    L.push('  unions: [');
    F.unions.forEach(function (u, i) {
      L.push(record(u, UNION_KEYS, 4) + (i < F.unions.length - 1 ? ',' : ''));
    });
    L.push('  ]');
    L.push('};');
    L.push('');
    return L.join('\n');
  }

  function download() {
    var text = serialize();
    var blob = new Blob([text], { type: 'text/javascript;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'data.js';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* ============================================================ form bits */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function field(labelText, control, hint) {
    var w = el('label', 'efield');
    w.appendChild(el('span', 'elabel', labelText));
    w.appendChild(control);
    if (hint) w.appendChild(el('small', 'ehint', hint));
    return w;
  }

  function input(value, placeholder) {
    var i = document.createElement('input');
    i.type = 'text';
    i.value = value == null ? '' : value;
    if (placeholder) i.placeholder = placeholder;
    return i;
  }

  function select(options, value) {
    var s = document.createElement('select');
    options.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.text;
      if (String(o.value) === String(value)) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  function peopleOptions(excludeId, blankText) {
    var opts = [{ value: '', text: blankText || '(choose someone)' }];
    F.people.slice().sort(function (a, b) {
      return (a.gen || 0) - (b.gen || 0) || a.name.localeCompare(b.name);
    }).forEach(function (p) {
      if (p.id === excludeId) return;
      opts.push({ value: p.id, text: p.name + '  (gen ' + p.gen + ')' });
    });
    return opts;
  }

  function familyOptions() {
    return Object.keys(F.families).map(function (k) {
      return { value: k, text: F.families[k].name };
    });
  }

  function chipRow(items) {
    var row = el('div', 'echips');
    items.forEach(function (it) {
      var c = el('span', 'echip');
      var open = el('button', 'echip-name', it.text);
      if (it.onOpen) {
        open.title = 'Open ' + it.text;
        open.addEventListener('click', it.onOpen);
      } else {
        open.disabled = true;
      }
      c.appendChild(open);
      var x = el('button', 'ex', '×');
      x.title = it.removeTitle || 'Remove';
      x.addEventListener('click', it.onRemove);
      c.appendChild(x);
      row.appendChild(c);
    });
    return row;
  }

  /* "type a name, press Add" - the way to create somebody without leaving the
     form you are already on */
  function addRow(placeholder, onAdd, cls) {
    var row = el('div', 'eadd ' + (cls || ''));
    var i = input('', placeholder);
    var b = el('button', 'ebtn small', 'Add');
    function go() {
      var v = i.value.trim();
      if (!v) { i.focus(); return; }
      onAdd(v);
    }
    b.addEventListener('click', go);
    i.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); go(); }
    });
    row.appendChild(i);
    row.appendChild(b);
    return row;
  }

  /* Type any surname. Existing ones autocomplete, anything new is created on
     save. A plain box beats a dropdown with a hidden "new..." option, which
     nobody finds. */
  function familyBox(value, placeholder) {
    var wrap = el('div', 'fambox');
    /* 'tbd' is the absence of a surname, not a surname, so show the
       placeholder rather than the words "Not yet recorded". */
    var shown = (value && value !== 'tbd' && F.families[value]) ? F.families[value].name : '';
    var i = input(shown, placeholder);
    var listId = 'fam-' + Math.random().toString(36).slice(2, 9);
    i.setAttribute('list', listId);
    var dl = document.createElement('datalist');
    dl.id = listId;
    Object.keys(F.families).forEach(function (k) {
      if (k === 'tbd') return;
      var o = document.createElement('option');
      o.value = F.families[k].name;
      dl.appendChild(o);
    });
    wrap.appendChild(i);
    wrap.appendChild(dl);
    wrap.resolve = function () {
      var v = i.value.trim();
      return v ? familyKeyFor(v) : '';
    };
    return wrap;
  }

  /* ============================================================== the form */
  function openForm(id, panel, focusSel) {
    editing = id;
    var isNew = !id;
    var p = isNew
      ? { name: '', family: Object.keys(F.families)[0], gen: 4, sex: 'u' }
      : person(id);
    if (!p) return;

    panel.innerHTML = '';
    panel.hidden = false;
    document.body.classList.add('has-panel');

    var close = el('button', 'panel-close');
    close.innerHTML = '&times;';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', function () {
      document.dispatchEvent(new CustomEvent('family:closeform'));
    });
    panel.appendChild(close);

    var h = el('h2', 'etitle', isNew ? 'Add a person' : 'Edit person');
    panel.appendChild(h);

    var form = el('div', 'eform');
    panel.appendChild(form);

    var fName    = input(p.name, 'Full name');
    var fTelugu  = input(p.telugu, 'తెలుగు');
    var fFamily  = familyBox(p.family, 'Makani, Emani, Reddy...');
    var fMarried = familyBox(p.marriedInto || '', 'leave empty if unchanged');
    var fGen     = input(p.gen, '4');
    fGen.type = 'number';
    var fSex     = select([{ value: 'm', text: 'Male' }, { value: 'f', text: 'Female' },
                           { value: 'u', text: 'Not recorded' }], p.sex || 'u');
    var fOrder   = input(p.order, '1 = eldest');
    fOrder.type = 'number';
    var fBirth   = input(p.birth, '1959');
    var fDeath   = input(p.death, 'leave empty if living');
    var fPhoto   = input(p.photo, 'defaults to <id>.jpg');
    var fNotes   = document.createElement('textarea');
    fNotes.rows = 3; fNotes.value = p.notes || '';
    var fTodo    = input(p.todo, 'what is still missing');

    form.appendChild(field('Name', fName));
    form.appendChild(field('Telugu name', fTelugu));
    form.appendChild(field('Born into which family (inti peru)', fFamily));
    form.appendChild(field('Surname taken at marriage', fMarried));
    form.appendChild(field('Generation', fGen, '1 is the oldest row on the chart.'));
    form.appendChild(field('Sex', fSex));
    form.appendChild(field('Birth order', fOrder,
      'Needed for the Telugu terms - Annayya vs Thammudu.'));
    form.appendChild(field('Born', fBirth));
    form.appendChild(field('Died', fDeath, 'Filling this in leaves their box unfilled on the chart.'));
    form.appendChild(field('Photo file', fPhoto));
    form.appendChild(field('Notes', fNotes));
    form.appendChild(field('Still to find out', fTodo));

    function collect() {
      return {
        name: fName.value.trim(),
        telugu: fTelugu.value.trim(),
        family: fFamily.resolve() || 'tbd',
        marriedInto: fMarried.resolve(),
        gen: parseInt(fGen.value, 10),
        sex: fSex.value,
        order: fOrder.value === '' ? '' : parseInt(fOrder.value, 10),
        birth: fBirth.value.trim(),
        death: fDeath.value.trim(),
        photo: fPhoto.value.trim(),
        notes: fNotes.value.trim(),
        todo: fTodo.value.trim()
      };
    }

    /* ---- relationships, only once the person actually exists ---------- */
    if (!isNew) {
      /* ---- parents --------------------------------------------------- */
      var parentU = parentUnionOf(id);
      var parentWrap = el('div', 'egroup');
      parentWrap.appendChild(el('span', 'elabel', 'Parents'));
      if (parentU) {
        parentWrap.appendChild(chipRow(parentU.partners.map(function (q) {
          return {
            text: label(q),
            onOpen: function () { openForm(q, panel); },
            removeTitle: 'Detach ' + p.name + ' from these parents',
            onRemove: function () { removeChild(parentU.id, id); changed(); openForm(id, panel); }
          };
        })));
      }
      var parentOpts = [{ value: '', text: '(not recorded)' }].concat(
        F.unions.filter(function (u) { return u.partners.indexOf(id) < 0; })
                .map(function (u) { return { value: u.id, text: unionLabel(u) }; }));
      var fParents = select(parentOpts, parentU ? parentU.id : '');
      fParents.addEventListener('change', function () {
        setParents(id, fParents.value);
        changed(); openForm(id, panel);
      });
      parentWrap.appendChild(fParents);
      parentWrap.appendChild(addRow("New father's name", function (name) {
        createParent(id, name, 'm');
        changed(); openForm(id, panel, '.eadd-father input');
      }, 'eadd-father'));
      parentWrap.appendChild(addRow("New mother's name", function (name) {
        createParent(id, name, 'f');
        changed(); openForm(id, panel, '.eadd-mother input');
      }, 'eadd-mother'));
      panel.appendChild(parentWrap);

      /* ---- brothers and sisters --------------------------------------- */
      var sibs = model_siblings(id);
      var sibWrap = el('div', 'egroup');
      sibWrap.appendChild(el('span', 'elabel', 'Brothers and sisters'));
      if (sibs.length) {
        sibWrap.appendChild(chipRow(sibs.map(function (sid) {
          return {
            text: label(sid),
            onOpen: function () { openForm(sid, panel); },
            removeTitle: 'No longer a brother or sister',
            onRemove: function () {
              var pu2 = parentUnionOf(sid);
              if (pu2) removeChild(pu2.id, sid);
              changed(); openForm(id, panel);
            }
          };
        })));
      }
      var addSib = select(peopleOptions(id, 'link someone already on the chart'));
      addSib.addEventListener('change', function () {
        if (!addSib.value) return;
        addSibling(id, addSib.value); changed(); openForm(id, panel);
      });
      sibWrap.appendChild(addSib);
      sibWrap.appendChild(addRow("New brother or sister's name", function (name) {
        createSibling(id, name);
        changed(); openForm(id, panel, '.eadd-sib input');
      }, 'eadd-sib'));
      panel.appendChild(sibWrap);

      /* ---- spouses ---------------------------------------------------- */
      var spouseChips = [];
      unionsWith(id).forEach(function (u) {
        u.partners.forEach(function (q) {
          if (q === id) return;
          spouseChips.push({
            text: label(q),
            onOpen: function () { openForm(q, panel); },
            removeTitle: 'Remove this marriage',
            onRemove: function () {
              if (!confirm('Remove the marriage of ' + label(id) + ' and ' + label(q) + '?\n\n' +
                           'Any children listed under it will lose their link to both parents.')) return;
              removeUnion(u.id); changed(); openForm(id, panel);
            }
          });
        });
      });
      var spouseWrap = el('div', 'egroup');
      spouseWrap.appendChild(el('span', 'elabel', 'Married to'));
      if (spouseChips.length) spouseWrap.appendChild(chipRow(spouseChips));
      var addSp = select(peopleOptions(id, 'link someone already on the chart'));
      addSp.addEventListener('change', function () {
        if (!addSp.value) return;
        addSpouse(id, addSp.value); changed(); openForm(id, panel);
      });
      spouseWrap.appendChild(addSp);
      spouseWrap.appendChild(addRow("New spouse's name", function (name) {
        createSpouse(id, name);
        changed(); openForm(id, panel, '.eadd-spouse input');
      }, 'eadd-spouse'));
      panel.appendChild(spouseWrap);

      /* ---- children --------------------------------------------------- */
      var myUnions = unionsWith(id);
      var kids = [];
      myUnions.forEach(function (u) {
        u.children.forEach(function (c) {
          kids.push({
            text: label(c),
            onOpen: function () { openForm(c, panel); },
            removeTitle: 'Remove from this family',
            onRemove: function () { removeChild(u.id, c); changed(); openForm(id, panel); }
          });
        });
      });
      var kidWrap = el('div', 'egroup');
      kidWrap.appendChild(el('span', 'elabel', 'Children'));
      if (kids.length) kidWrap.appendChild(chipRow(kids));
      var addKid = select(peopleOptions(id, 'link someone already on the chart'));
      addKid.addEventListener('change', function () {
        if (!addKid.value) return;
        addChild(ensureUnion(id), addKid.value); changed(); openForm(id, panel);
      });
      kidWrap.appendChild(addKid);
      kidWrap.appendChild(addRow("New child's name", function (name) {
        createChild(ensureUnion(id), name);
        changed(); openForm(id, panel, '.eadd-child input');
      }, 'eadd-child'));
      panel.appendChild(kidWrap);
    }

    /* ---------------------------------------------------------- actions */
    var actions = el('div', 'eactions');

    var save = el('button', 'ebtn primary', isNew ? 'Add to the chart' : 'Save changes');
    save.addEventListener('click', function () {
      var v = collect();
      if (!v.name) { alert('Please give this person a name.'); fName.focus(); return; }
      if (isNaN(v.gen)) { alert('Please give a generation number (1 is the oldest row).'); fGen.focus(); return; }
      if (isNew) {
        var newId = addPerson(v);
        changed();
        openForm(newId, panel);
      } else {
        updatePerson(id, v);
        changed();
        openForm(id, panel);
      }
    });
    actions.appendChild(save);

    if (!isNew) {
      var del = el('button', 'ebtn danger', 'Delete');
      del.addEventListener('click', function () {
        if (!confirm('Delete ' + p.name + ' from the chart?\n\n' +
                     'They will also be removed from any marriage and from their ' +
                     'parents’ list of children. This cannot be undone, but it ' +
                     'only affects your local draft.')) return;
        deletePerson(id);
        changed();
        document.dispatchEvent(new CustomEvent('family:closeform'));
      });
      actions.appendChild(del);
    }
    panel.appendChild(actions);

    if (!isNew) {
      var idNote = el('p', 'ehint');
      idNote.textContent = 'id: ' + id;
      panel.appendChild(idNote);
    }

    var focusTarget = focusSel ? panel.querySelector(focusSel) : null;
    (focusTarget || fName).focus();
  }

  /* ====================================================== saving to GitHub */
  function publish(btn) {
    if (!global.FamilyGitHub) return;
    if (!FamilyGitHub.isConfigured()) { githubSetup(); return; }
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';
    var when = new Date().toISOString().slice(0, 10);
    FamilyGitHub.save(serialize(), 'Update the family tree (' + when + ')')
      .then(function (url) {
        btn.textContent = 'Saved';
        /* the draft is now the published file, so stop shadowing it */
        clearDraft();
        paintBanner();
        alert('Saved to GitHub.\n\nThe live site rebuilds in about a minute. ' +
              'This browser is already showing the saved version.' +
              (url ? '\n\n' + url : ''));
        setTimeout(function () { btn.disabled = false; btn.textContent = label; }, 1500);
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.textContent = label;
        alert('Could not save.\n\n' + e.message);
      });
  }

  function githubSetup() {
    if (!global.FamilyGitHub) return;
    var s = FamilyGitHub.settings();
    var panel = document.getElementById('panel') || document.getElementById('detail');
    if (!panel) return;
    panel.hidden = false;
    document.body.classList.add('has-panel');
    panel.innerHTML = '';

    var close = el('button', 'panel-close');
    close.innerHTML = '&times;';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', function () {
      document.dispatchEvent(new CustomEvent('family:closeform'));
    });
    panel.appendChild(close);
    panel.appendChild(el('h2', 'etitle', 'Save straight to GitHub'));

    var intro = el('p', 'ehint');
    intro.textContent = 'This lets the page commit js/data.js to the repository, ' +
      'so saving publishes without downloading anything. It needs a token with ' +
      'write access, kept only in this browser.';
    panel.appendChild(intro);

    var form = el('div', 'eform');
    var fOwner  = input(s.owner, 'makani-family-tree');
    var fRepo   = input(s.repo, 'makani-family-tree.github.io');
    var fBranch = input(s.branch || 'main', 'main');
    var fPath   = input(s.path || 'js/data.js', 'js/data.js');
    var fTok    = input(FamilyGitHub.token(), 'github_pat_...');
    fTok.type = 'password';
    fTok.autocomplete = 'off';

    form.appendChild(field('GitHub account', fOwner));
    form.appendChild(field('Repository', fRepo));
    form.appendChild(field('Branch', fBranch));
    form.appendChild(field('File to write', fPath));
    form.appendChild(field('Token', fTok,
      'Make a fine-grained token at github.com/settings/tokens, limited to this ' +
      'one repository, with Contents: Read and write, and give it an expiry. ' +
      'It is stored in this browser only and never goes into the repository, ' +
      'but anyone who can open this browser profile can read it.'));
    panel.appendChild(form);

    var status = el('p', 'ehint');
    panel.appendChild(status);

    /* After a rename the stored owner and repo are stale, and the failure is
       baffling. One press re-reads them from the address bar. */
    var detect = el('button', 'ebtn', "Use this page's address");
    detect.style.marginTop = '8px';
    detect.addEventListener('click', function () {
      var g = FamilyGitHub.guess();
      if (!g.owner) {
        status.textContent = 'This page is not on a github.io address, so there ' +
                             'is nothing to read. Type the account and repository above.';
        return;
      }
      fOwner.value = g.owner;
      fRepo.value = g.repo;
      status.textContent = 'Read ' + g.owner + ' / ' + g.repo +
                           ' from the address. Press Save settings to keep it.';
    });
    panel.appendChild(detect);

    var actions = el('div', 'eactions');
    var saveBtn = el('button', 'ebtn primary', 'Save settings');
    saveBtn.addEventListener('click', function () {
      FamilyGitHub.saveSettings({
        owner: fOwner.value.trim(), repo: fRepo.value.trim(),
        branch: fBranch.value.trim() || 'main',
        path: fPath.value.trim() || 'js/data.js'
      });
      FamilyGitHub.setToken(fTok.value.trim());
      status.textContent = 'Checking...';
      FamilyGitHub.test()
        .then(function (m) { status.textContent = m; })
        .catch(function (e) { status.textContent = e.message; });
      paintBanner();
    });
    actions.appendChild(saveBtn);

    var forget = el('button', 'ebtn danger', 'Forget token');
    forget.addEventListener('click', function () {
      FamilyGitHub.setToken('');
      fTok.value = '';
      status.textContent = 'Token removed from this browser.';
      paintBanner();
    });
    actions.appendChild(forget);
    panel.appendChild(actions);
  }

  /* ============================================================== banner */
  function paintBanner() {
    var bar = document.getElementById('editbar');
    if (!bar) return;
    bar.hidden = !on;
    document.body.classList.toggle('editing', on);
    if (window.familyMeasure) window.familyMeasure();
    if (!on) return;

    bar.innerHTML = '';
    var msg = el('span', 'ebar-msg');
    var canPush = global.FamilyGitHub && FamilyGitHub.isConfigured();
    msg.textContent = hasDraft()
      ? (canPush ? 'Unsaved changes in this browser. Save to GitHub to publish them.'
                 : 'Unsaved changes in this browser only. Nobody else can see them yet.')
      : (canPush ? 'Editing. Save to GitHub when you are happy with it.'
                 : 'Editing. Changes stay in this browser until you publish them.');
    bar.appendChild(msg);

    var add = el('button', 'ebtn', '＋ Add person');
    add.addEventListener('click', function () {
      document.dispatchEvent(new CustomEvent('family:newperson'));
    });
    bar.appendChild(add);

    /* one-click save, once a token has been set on this browser */
    if (global.FamilyGitHub) {
      var pub = el('button', 'ebtn primary', 'Save to GitHub');
      pub.addEventListener('click', function () { publish(pub); });
      bar.appendChild(pub);

      var cog = el('button', 'ebtn',
                   FamilyGitHub.isConfigured() ? 'Saving is set up' : 'Set up saving');
      cog.addEventListener('click', githubSetup);
      bar.appendChild(cog);
    }

    var dl = el('button', 'ebtn', 'Download data.js');
    dl.title = 'Get the file and commit it by hand instead';
    dl.addEventListener('click', download);
    bar.appendChild(dl);

    if (hasDraft()) {
      var rev = el('button', 'ebtn', 'Discard draft');
      rev.addEventListener('click', function () {
        if (!confirm('Throw away every change made in this browser and go back to ' +
                     'the published chart?')) return;
        clearDraft();
        location.reload();
      });
      bar.appendChild(rev);
    }
    if (window.familyMeasure) window.familyMeasure();
  }

  /* ================================================================ init */
  function init(family) {
    F = family;
    paintBanner();
  }

  global.FamilyEditor = {
    init: init,
    /* the draft is applied before the model is built, in app.js */
    loadDraft: loadDraft,
    hasDraft: hasDraft,
    clearDraft: clearDraft,
    isOn: function () { return on; },
    setOn: function (v) { on = v; paintBanner(); },
    openForm: openForm,
    serialize: serialize,
    download: download
  };

})(window);
