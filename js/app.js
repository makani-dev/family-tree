/* =============================================================================
 *  app.js - the interface. Search, the side panel, editing, zoom.
 *
 *  Nothing family-specific is in here. To add relatives, use the Edit button
 *  on the page, or edit js/data.js.
 * ========================================================================== */

(function () {
  'use strict';

  var model, stage, treeEl, panel;
  var current = null;
  var zoom = 1;
  var $ = function (s) { return document.querySelector(s); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------------------------------------------------------------- zoom */
  function setZoom(z) {
    zoom = Math.max(0.4, Math.min(1.6, z));
    treeEl.style.setProperty('--z', zoom);
    $('#zoomPct').textContent = Math.round(zoom * 100) + '%';
  }

  /* --------------------------------------------------------------- panel */
  function openPanel() { panel.hidden = false; document.body.classList.add('has-panel'); }
  function closePanel() { panel.hidden = true; document.body.classList.remove('has-panel'); }

  function closeBtn(onClick) {
    var b = el('button', 'x');
    b.innerHTML = '&times;';
    b.setAttribute('aria-label', 'Close');
    b.addEventListener('click', onClick);
    return b;
  }

  function chip(id) {
    var p = model.person(id);
    if (!p) return document.createTextNode(id);
    var b = el('button', 'chip', p.name);
    b.style.setProperty('--fam', model.colorOf(id));
    b.addEventListener('click', function () { select(id); });
    return b;
  }

  function chips(parent, title, ids) {
    if (!ids.length) return;
    parent.appendChild(el('h3', null, title));
    var d = el('div');
    ids.forEach(function (i) { d.appendChild(chip(i)); });
    parent.appendChild(d);
  }

  function showPerson(id) {
    var p = model.person(id);
    if (!p) return;
    panel.innerHTML = '';
    openPanel();
    panel.appendChild(closeBtn(function () { select(null); }));

    panel.appendChild(el('h2', null, p.name));
    if (p.telugu) {
      var te = el('p', 'sub', p.telugu);
      te.style.fontFamily = 'var(--font-te)';
      panel.appendChild(te);
    }
    var fam = model.familyOf(id);
    panel.appendChild(el('p', 'sub',
      'Born ' + fam.name +
      (p.marriedInto && model.families[p.marriedInto] ? ', married into ' + model.families[p.marriedInto].name : '') +
      '  ·  generation ' + (p.row + 1)));
    var span = FamilyTree.lifespan(p);
    if (span) panel.appendChild(el('p', 'sub', span));

    var ego = model.config.ego;
    if (ego && ego !== id && model.person(ego)) {
      var r = Kinship.relationship(model, ego, id);
      if (r) {
        panel.appendChild(el('h3', null, 'To ' + model.person(ego).name.split(' ')[0]));
        var line = el('p', 'rel');
        if (r.telugu) {
          line.appendChild(el('b', null, r.translit));
          line.appendChild(el('span', 'te', ' ' + r.telugu));
          line.appendChild(document.createElement('br'));
        }
        line.appendChild(el('span', 'sub', r.english));
        panel.appendChild(line);
        if (r.note) panel.appendChild(el('p', 'note', r.note));
        r.extra.forEach(function (x) { panel.appendChild(el('p', 'note hi', x)); });
      }
    }

    chips(panel, 'Parents', model.parentsOf(id));
    chips(panel, 'Married to', model.spousesOf(id));
    chips(panel, 'Brothers and sisters', model.siblingsOf(id));
    chips(panel, 'Children', model.childrenOf(id));

    if (p.nickname) { panel.appendChild(el('h3', null, 'Called')); panel.appendChild(el('p', null, p.nickname)); }
    if (p.notes) { panel.appendChild(el('h3', null, 'Notes')); panel.appendChild(el('p', null, p.notes)); }
    if (p.todo) {
      panel.appendChild(el('h3', null, 'Still to find out'));
      panel.appendChild(el('p', 'note warn', p.todo));
    }
  }

  function showInfo() {
    panel.innerHTML = '';
    openPanel();
    panel.dataset.view = 'info';
    panel.appendChild(closeBtn(function () { closePanel(); }));
    var a = model.analysis;

    panel.appendChild(el('h2', null, 'Family info'));

    panel.appendChild(el('h3', null, 'Reading a card'));
    var key = el('p', 'note');
    key.innerHTML = 'A card is <b>filled</b> with the colour of the family that ' +
      'person was born into. A card left <b>unfilled</b> means they have died. ' +
      'A <b>dashed</b> edge is either someone known to have existed but not yet ' +
      'named, or the second appearance of someone who belongs to two families.';
    panel.appendChild(key);

    panel.appendChild(el('h3', null, 'Surnames'));
    a.surnameCounts.forEach(function (f) {
      var d = el('div', 'callout');
      d.style.borderLeftColor = f.color;
      d.appendChild(el('b', null, f.name + (f.telugu ? '  ' + f.telugu : '')));
      d.appendChild(document.createTextNode('  ' + f.count + (f.count === 1 ? ' person' : ' people')));
      panel.appendChild(d);
    });

    panel.appendChild(el('h3', null, 'Marriage alliances'));
    panel.appendChild(el('p', 'note',
      'Every pair of surnames that has intermarried. More than one means the ' +
      'two families are tied together repeatedly.'));
    a.alliances.forEach(function (al) {
      var d = el('div', 'callout' + (al.count > 1 ? ' warn' : ''));
      d.appendChild(el('b', null, al.aName + ' + ' + al.bName + '  ' + al.count +
        (al.count === 1 ? ' marriage' : ' marriages')));
      al.unions.forEach(function (u) { d.appendChild(el('p', 'note', u.label)); });
      panel.appendChild(d);
    });

    if (a.exchanges.length) {
      panel.appendChild(el('h3', null, 'Brothers who married sisters'));
      a.exchanges.forEach(function (x) { panel.appendChild(el('p', 'callout', x.label)); });
    }
    if (a.doubleCousins.length) {
      panel.appendChild(el('h3', null, 'Double first cousins'));
      panel.appendChild(el('p', 'note', 'They share both sets of grandparents.'));
      a.doubleCousins.forEach(function (x) { panel.appendChild(el('p', 'callout', x.label)); });
    }
    if (a.consanguineous.length) {
      panel.appendChild(el('h3', null, 'Married relatives'));
      a.consanguineous.forEach(function (x) {
        panel.appendChild(el('p', 'callout warn', x.label + '  ' + x.kind));
      });
    }

    var todos = [];
    model.people.forEach(function (p) { if (p.todo) todos.push(p.name + ' - ' + p.todo); });
    model.unions.forEach(function (u) {
      if (u.todo) todos.push(u.partners.map(function (x) { return model.person(x).name; }).join(' & ') + ' - ' + u.todo);
    });
    if (model.warnings.length) {
      panel.appendChild(el('h3', null, 'Data check'));
      model.warnings.forEach(function (w) { panel.appendChild(el('p', 'callout warn', w)); });
    }
    if (todos.length) {
      panel.appendChild(el('h3', null, 'Still to find out (' + todos.length + ')'));
      todos.forEach(function (t) { panel.appendChild(el('p', 'callout', t)); });
    }
  }

  /* -------------------------------------------------------------- select */
  function select(id) {
    current = id;
    FamilyTree.select(id, treeEl);
    delete panel.dataset.view;
    if (!id) { closePanel(); history.replaceState(null, '', location.pathname); return; }
    if (window.FamilyEditor && FamilyEditor.isOn()) {
      openPanel();
      FamilyEditor.openForm(id, panel);
    } else {
      showPerson(id);
    }
    history.replaceState(null, '', '#p=' + id);
  }

  /* ------------------------------------------------------------- rebuild */
  function rebuild() {
    var keep = current;
    try {
      model = FamilyModel.build(window.FAMILY);
    } catch (e) {
      alert('That change broke the tree: ' + e.message);
      return;
    }
    window.familyModel = model;
    FamilyTree.render(model, treeEl);
    if (keep && model.person(keep)) FamilyTree.select(keep, treeEl);
    else current = null;
    measure();
  }

  /* -------------------------------------------------------------- search */
  function wireSearch() {
    var box = $('#q'), list = $('#hits');
    function shut() { list.hidden = true; list.innerHTML = ''; }
    box.addEventListener('input', function () {
      var q = box.value.trim().toLowerCase();
      list.innerHTML = '';
      if (!q) { shut(); return; }
      var hits = [];
      model.people.forEach(function (p) {
        var hay = (p.name + ' ' + (p.nickname || '') + ' ' + (p.telugu || '') + ' ' +
                   model.familyOf(p.id).name).toLowerCase();
        if (hay.indexOf(q) >= 0) hits.push(p);
      });
      hits.sort(function (a, b) { return a.row - b.row || a.name.localeCompare(b.name); });
      hits.slice(0, 12).forEach(function (p) {
        var b = el('button');
        b.appendChild(el('span', null, p.name));
        b.appendChild(el('small', null, model.familyOf(p.id).name + '  ·  generation ' + (p.row + 1)));
        b.addEventListener('click', function () {
          box.value = ''; shut();
          select(p.id);
          FamilyTree.reveal(p.id, treeEl, rebuild);
        });
        list.appendChild(b);
      });
      list.hidden = !list.children.length;
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { box.value = ''; shut(); box.blur(); }
      if (e.key === 'Enter' && list.firstChild) list.firstChild.click();
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.find')) shut(); });
  }

  /* ---------------------------------------------------------------- home */
  function home() {
    select(null);
    closePanel();
    $('#q').value = '';
    $('#hits').hidden = true;
    FamilyTree.collapsed.clear();
    rebuild();
    setZoom(1);
    stage.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  /* the stage begins below whatever height the header happens to be */
  function measure() {
    var h = $('.head').offsetHeight + $('.bar').offsetHeight;
    var bar = $('#editbar');
    if (bar && !bar.hidden) h += bar.offsetHeight;
    document.documentElement.style.setProperty('--headH', h + 'px');
  }

  /* ---------------------------------------------------------------- boot */
  function boot() {
    stage = $('#stage'); treeEl = $('#tree'); panel = $('#panel');

    if (!window.FAMILY) { stage.innerHTML = '<p class="fatal">js/data.js did not load.</p>'; return; }

    if (window.FamilyEditor) {
      var draft = FamilyEditor.loadDraft();
      if (draft && draft.people && draft.people.length) window.FAMILY = draft;
      FamilyEditor.init(window.FAMILY);
    }

    try {
      model = FamilyModel.build(window.FAMILY);
    } catch (e) {
      stage.innerHTML = '<p class="fatal">Could not build the tree: ' + e.message +
        '<br><small>Check js/data.js for a missing comma or bracket.</small></p>';
      throw e;
    }
    window.familyModel = model;

    document.title = model.data.meta.title || 'Family tree';
    $('#title').textContent = model.data.meta.title || 'Family tree';
    $('#subtitle').textContent = (model.data.meta.subtitle || '').split('·')[0].trim();

    FamilyTree.render(model, treeEl);

    treeEl.addEventListener('click', function (e) {
      if (e.target.closest('.toggle')) return;
      var leaf = e.target.closest('.leaf');
      if (!leaf) return;
      select(leaf.dataset.id === current ? null : leaf.dataset.id);
    });
    treeEl.addEventListener('keydown', function (e) {
      var leaf = e.target.closest('.leaf');
      if (leaf && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(leaf.dataset.id); }
    });

    $('#btnHome').addEventListener('click', home);
    $('#btnInfo').addEventListener('click', function () {
      if (!panel.hidden && panel.dataset.view === 'info') closePanel();
      else { current = null; FamilyTree.select(null, treeEl); showInfo(); }
    });
    $('#btnIn').addEventListener('click', function () { setZoom(zoom + 0.12); });
    $('#btnOut').addEventListener('click', function () { setZoom(zoom - 0.12); });
    $('#btnPrint').addEventListener('click', function () { select(null); window.print(); });

    $('#btnTheme').addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('familytree-theme', next); } catch (e) { /* ignore */ }
    });
    try {
      var saved = localStorage.getItem('familytree-theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch (e) { /* ignore */ }

    if (window.FamilyEditor) {
      var be = $('#btnEdit');
      var paintEdit = function () {
        var on = FamilyEditor.isOn();
        be.setAttribute('aria-pressed', String(on));
        be.textContent = on ? 'Done' : 'Edit';
        measure();
      };
      be.addEventListener('click', function () {
        FamilyEditor.setOn(!FamilyEditor.isOn());
        paintEdit();
        select(null);
      });
      if (FamilyEditor.hasDraft()) FamilyEditor.setOn(true);
      paintEdit();
      document.addEventListener('family:changed', rebuild);
      document.addEventListener('family:newperson', function () {
        current = null; FamilyTree.select(null, treeEl);
        openPanel();
        FamilyEditor.openForm(null, panel);
      });
      document.addEventListener('family:closeform', function () { select(null); });
    }

    if (model.person(model.config.ego)) {
      var me = $('#btnMe');
      me.hidden = false;
      me.addEventListener('click', function () {
        select(model.config.ego);
        FamilyTree.reveal(model.config.ego, treeEl, rebuild);
      });
    }

    wireSearch();
    setZoom(1);
    measure();
    window.addEventListener('resize', measure);

    var m = /#p=([\w-]+)/.exec(location.hash);
    if (m && model.person(m[1])) { select(m[1]); FamilyTree.reveal(m[1], treeEl, rebuild); }

    document.addEventListener('keydown', function (e) {
      if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
      if (e.key === '/') { e.preventDefault(); $('#q').focus(); }
      if (e.key === 'Escape') { select(null); closePanel(); }
      if (e.key === '0') home();
      if (e.key === '+' || e.key === '=') setZoom(zoom + 0.12);
      if (e.key === '-') setZoom(zoom - 0.12);
    });

    if (model.warnings.length) {
      console.warn('[family-tree] ' + model.warnings.length + ' data warning(s):');
      model.warnings.forEach(function (w) { console.warn('  ' + w); });
    }
  }

  window.familyMeasure = measure;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
