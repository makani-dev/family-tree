/* =============================================================================
 *  editor.js - add, change and remove people straight from the web page.
 *
 *  HOW IT WORKS, AND WHAT IT CANNOT DO
 *  -----------------------------------
 *  The published site is a set of static files. There is no server behind it,
 *  so nothing typed here can write to js/data.js by itself, and nothing you do
 *  here changes what other people see.
 *
 *  Edits are kept in this browser (localStorage) as a DRAFT. When you are
 *  happy with them, press "Download data.js", replace js/data.js in the
 *  repository with the file you get, and commit it. That is the moment the
 *  change becomes real and public.
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
    /* wipe the optional fields first so clearing a box really clears it */
    ['telugu', 'marriedInto', 'order', 'birth', 'death', 'nickname', 'title',
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
    /* a marriage with nobody left in it is not a marriage */
    F.unions = F.unions.filter(function (u) {
      return u.partners.length > 0 || u.children.length > 0;
    });
    if (F.config.ego === id) F.config.ego = (F.people[0] || {}).id || null;
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
    L.push(' *  js/data.js  —  the whole family.');
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
    var opts = [{ value: '', text: blankText || '— choose —' }];
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
      c.appendChild(document.createTextNode(it.text));
      var x = el('button', 'ex', '×');
      x.title = 'Remove';
      x.addEventListener('click', it.onRemove);
      c.appendChild(x);
      row.appendChild(c);
    });
    return row;
  }

  /* ============================================================== the form */
  function openForm(id, panel) {
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
    var fFamily  = select(familyOptions(), p.family);
    var fMarried = select([{ value: '', text: '— none —' }].concat(familyOptions()), p.marriedInto || '');
    var fGen     = input(p.gen, '4');
    fGen.type = 'number';
    var fSex     = select([{ value: 'm', text: 'Male' }, { value: 'f', text: 'Female' },
                           { value: 'u', text: 'Not recorded' }], p.sex || 'u');
    var fOrder   = input(p.order, '1 = eldest');
    fOrder.type = 'number';
    var fBirth   = input(p.birth, '1959');
    var fDeath   = input(p.death, 'leave empty if living');
    var fNick    = input(p.nickname, 'ముద్దు పేరు');
    var fTitle   = input(p.title, 'Thathagaru');
    var fPhoto   = input(p.photo, 'defaults to <id>.jpg');
    var fNotes   = document.createElement('textarea');
    fNotes.rows = 3; fNotes.value = p.notes || '';
    var fTodo    = input(p.todo, 'what is still missing');

    form.appendChild(field('Name', fName));
    form.appendChild(field('Telugu name', fTelugu));
    form.appendChild(field('Born into which family', fFamily,
      'The family they were BORN into — never the surname taken at marriage.'));
    form.appendChild(field('Married into', fMarried));
    form.appendChild(field('Generation', fGen, '1 is the oldest row on the chart.'));
    form.appendChild(field('Sex', fSex));
    form.appendChild(field('Birth order', fOrder,
      'Needed for the Telugu terms — Annayya vs Thammudu.'));
    form.appendChild(field('Born', fBirth));
    form.appendChild(field('Died', fDeath, 'Filling this in leaves their box unfilled on the chart.'));
    form.appendChild(field('Called', fNick));
    form.appendChild(field('Honorific', fTitle));
    form.appendChild(field('Photo file', fPhoto));
    form.appendChild(field('Notes', fNotes));
    form.appendChild(field('Still to find out', fTodo));

    function collect() {
      return {
        name: fName.value.trim(),
        telugu: fTelugu.value.trim(),
        family: fFamily.value,
        marriedInto: fMarried.value,
        gen: parseInt(fGen.value, 10),
        sex: fSex.value,
        order: fOrder.value === '' ? '' : parseInt(fOrder.value, 10),
        birth: fBirth.value.trim(),
        death: fDeath.value.trim(),
        nickname: fNick.value.trim(),
        title: fTitle.value.trim(),
        photo: fPhoto.value.trim(),
        notes: fNotes.value.trim(),
        todo: fTodo.value.trim()
      };
    }

    /* ---- relationships, only once the person actually exists ---------- */
    if (!isNew) {
      panel.appendChild(el('h3', 'esec', 'Family links'));

      var parentU = parentUnionOf(id);
      var parentOpts = [{ value: '', text: '— not recorded —' }].concat(
        F.unions.filter(function (u) { return u.partners.indexOf(id) < 0; })
                .map(function (u) { return { value: u.id, text: unionLabel(u) }; }));
      var fParents = select(parentOpts, parentU ? parentU.id : '');
      fParents.addEventListener('change', function () {
        setParents(id, fParents.value);
        changed(); openForm(id, panel);
      });
      panel.appendChild(field('Parents', fParents));

      var spouseUnions = unionsWith(id);
      var spouseChips = [];
      spouseUnions.forEach(function (u) {
        u.partners.forEach(function (q) {
          if (q === id) return;
          spouseChips.push({
            text: label(q),
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
      var addSp = select(peopleOptions(id, '＋ add a spouse'));
      addSp.addEventListener('change', function () {
        if (!addSp.value) return;
        addSpouse(id, addSp.value); changed(); openForm(id, panel);
      });
      spouseWrap.appendChild(addSp);
      panel.appendChild(spouseWrap);

      var myUnions = unionsWith(id);
      var kids = [];
      myUnions.forEach(function (u) {
        u.children.forEach(function (c) {
          kids.push({
            text: label(c),
            onRemove: function () { removeChild(u.id, c); changed(); openForm(id, panel); }
          });
        });
      });
      var kidWrap = el('div', 'egroup');
      kidWrap.appendChild(el('span', 'elabel', 'Children'));
      if (kids.length) kidWrap.appendChild(chipRow(kids));
      if (myUnions.length) {
        var addKid = select(peopleOptions(id, '＋ add an existing person'));
        addKid.addEventListener('change', function () {
          if (!addKid.value) return;
          addChild(myUnions[0].id, addKid.value); changed(); openForm(id, panel);
        });
        kidWrap.appendChild(addKid);
      } else {
        kidWrap.appendChild(el('small', 'ehint',
          'Add a spouse first — children hang from a marriage, not from one person.'));
      }
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

    fName.focus();
  }

  /* ============================================================== banner */
  function paintBanner() {
    var bar = document.getElementById('editbar');
    if (!bar) return;
    bar.hidden = !on;
    document.body.classList.toggle('editing', on);
    if (!on) return;

    bar.innerHTML = '';
    var msg = el('span', 'ebar-msg');
    msg.textContent = hasDraft()
      ? 'Editing a draft saved in this browser only. Download data.js and commit it to publish these changes.'
      : 'Editing. Nothing is saved to the site — download data.js and commit it to publish.';
    bar.appendChild(msg);

    var add = el('button', 'ebtn', '＋ Add person');
    add.addEventListener('click', function () {
      document.dispatchEvent(new CustomEvent('family:newperson'));
    });
    bar.appendChild(add);

    var dl = el('button', 'ebtn primary', 'Download data.js');
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
