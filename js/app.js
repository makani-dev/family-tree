/* =============================================================================
 *  app.js - the interactive shell: pan, zoom, search, panels, printing.
 *
 *  Nothing family-specific lives here. If you only want to add relatives,
 *  edit js/data.js and ignore this file entirely.
 * ========================================================================== */

(function () {
  'use strict';

  var model, stage, canvas, svg, nodes;
  var view = { x: 0, y: 0, k: 1 };
  var MIN_K = 0.14, MAX_K = 2.4;

  var $ = function (s) { return document.querySelector(s); };

  /* ------------------------------------------------------------ transform */
  function apply() {
    canvas.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.k + ')';
    var pct = $('#zoomPct');
    if (pct) pct.textContent = Math.round(view.k * 100) + '%';
  }

  function fit(padding) {
    var r = stage.getBoundingClientRect();
    var pad = padding == null ? 40 : padding;
    var k = Math.min((r.width - pad * 2) / model.width, (r.height - pad * 2) / model.height);
    view.k = Math.max(MIN_K, Math.min(MAX_K, k));
    view.x = (r.width - model.width * view.k) / 2;
    view.y = (r.height - model.height * view.k) / 2;
    apply();
  }

  function centerOn(id, k) {
    var p = model.person(id);
    if (!p || typeof p.x !== 'number') return;
    var r = stage.getBoundingClientRect();
    view.k = Math.max(MIN_K, Math.min(MAX_K, k || Math.max(view.k, 0.72)));
    view.x = r.width / 2 - p.x * view.k;
    view.y = r.height / 2 - (p.y + model.metrics.CARD_H / 2) * view.k;
    canvas.style.transition = 'transform .38s cubic-bezier(.22,.61,.36,1)';
    apply();
    setTimeout(function () { canvas.style.transition = ''; }, 400);
  }

  function zoomAt(cx, cy, factor) {
    var r = stage.getBoundingClientRect();
    var px = cx - r.left, py = cy - r.top;
    var nk = Math.max(MIN_K, Math.min(MAX_K, view.k * factor));
    view.x = px - (px - view.x) * (nk / view.k);
    view.y = py - (py - view.y) * (nk / view.k);
    view.k = nk;
    apply();
  }

  /* ------------------------------------------------------------ pan / zoom */
  function wirePanZoom() {
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = 0;

    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.card')) return;
      dragging = true; moved = 0;
      sx = e.clientX; sy = e.clientY; ox = view.x; oy = view.y;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('grabbing');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      moved += Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy);
      view.x = ox + (e.clientX - sx);
      view.y = oy + (e.clientY - sy);
      apply();
    });
    function end(e) {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('grabbing');
      try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
      } else {
        view.x -= e.deltaX; apply();
      }
    }, { passive: false });

    /* pinch to zoom on touch screens */
    var pts = new Map(), lastDist = 0;
    stage.addEventListener('pointerdown', function (e) { pts.set(e.pointerId, e); });
    stage.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e);
      if (pts.size !== 2) return;
      var a = Array.from(pts.values());
      var d = Math.hypot(a[0].clientX - a[1].clientX, a[0].clientY - a[1].clientY);
      if (lastDist) {
        zoomAt((a[0].clientX + a[1].clientX) / 2, (a[0].clientY + a[1].clientY) / 2, d / lastDist);
      }
      lastDist = d;
    });
    function drop(e) { pts.delete(e.pointerId); if (pts.size < 2) lastDist = 0; }
    stage.addEventListener('pointerup', drop);
    stage.addEventListener('pointercancel', drop);
  }

  /* -------------------------------------------------------- detail panel */
  function personChip(id) {
    var p = model.person(id);
    if (!p) return document.createTextNode(id);
    var b = document.createElement('button');
    b.className = 'chip';
    b.style.setProperty('--fam', model.colorOf(id));
    b.textContent = p.name;
    b.addEventListener('click', function () { select(id); });
    return b;
  }

  function row(label, buildBody) {
    var wrap = document.createElement('div');
    wrap.className = 'drow';
    var h = document.createElement('h4');
    h.textContent = label;
    wrap.appendChild(h);
    var body = document.createElement('div');
    body.className = 'dbody';
    buildBody(body);
    wrap.appendChild(body);
    return wrap;
  }

  function openDetail(id) {
    var p = model.person(id);
    if (!p) return;
    var panel = $('#detail');
    panel.innerHTML = '';
    panel.hidden = false;
    document.body.classList.add('has-panel');

    var close = document.createElement('button');
    close.className = 'panel-close';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '&times;';
    close.addEventListener('click', function () { select(null); });
    panel.appendChild(close);

    /* header ---------------------------------------------------------- */
    var head = document.createElement('header');
    head.className = 'dhead';
    head.style.setProperty('--fam', model.colorOf(id));

    var ph = document.createElement('div');
    ph.className = 'dph';
    var av = document.createElement('div');
    av.className = 'avatar';
    av.textContent = FamilyRender.initials(p);
    ph.appendChild(av);
    var src = p.photo ? model.config.photoDir + '/' + p.photo
            : (model.config.autoPhotos && !p.placeholder ? model.config.photoDir + '/' + p.id + '.jpg' : null);
    if (src) {
      var img = document.createElement('img');
      img.alt = p.name;
      img.addEventListener('error', function () { img.remove(); });
      img.src = src;
      ph.appendChild(img);
    }
    head.appendChild(ph);

    var htext = document.createElement('div');
    var h2 = document.createElement('h2');
    h2.textContent = p.name;
    htext.appendChild(h2);
    if (p.telugu) { var te = document.createElement('p'); te.className = 'dte'; te.textContent = p.telugu; htext.appendChild(te); }
    var sub = document.createElement('p');
    sub.className = 'dsub';
    var fam = model.familyOf(id);
    sub.textContent = 'Born ' + fam.name +
      (p.marriedInto && model.families[p.marriedInto] ? ' · married into ' + model.families[p.marriedInto].name : '') +
      ' · Generation ' + (p.row + 1);
    htext.appendChild(sub);
    var span = FamilyRender.lifespan(p);
    if (span) { var ls = document.createElement('p'); ls.className = 'dsub'; ls.textContent = span; htext.appendChild(ls); }
    head.appendChild(htext);
    panel.appendChild(head);

    /* relationship to ego --------------------------------------------- */
    var ego = model.config.ego;
    if (ego && ego !== id && model.person(ego)) {
      var rel = Kinship.relationship(model, ego, id);
      if (rel) {
        panel.appendChild(row('Relationship to ' + model.person(ego).name.split(' ')[0], function (b) {
          var big = document.createElement('p');
          big.className = 'rel';
          if (rel.telugu) {
            var s1 = document.createElement('strong');
            s1.textContent = rel.translit;
            big.appendChild(s1);
            var s2 = document.createElement('span');
            s2.className = 'rel-te';
            s2.textContent = ' ' + rel.telugu;
            big.appendChild(s2);
            big.appendChild(document.createElement('br'));
          }
          var s3 = document.createElement('span');
          s3.className = 'rel-en';
          s3.textContent = rel.english;
          big.appendChild(s3);
          b.appendChild(big);
          if (rel.note) { var n = document.createElement('p'); n.className = 'note'; n.textContent = rel.note; b.appendChild(n); }
          rel.extra.forEach(function (x) {
            var n2 = document.createElement('p'); n2.className = 'note strong'; n2.textContent = x; b.appendChild(n2);
          });
        }));
      }
    }

    /* family links ----------------------------------------------------- */
    function chipRow(label, ids) {
      if (!ids.length) return;
      panel.appendChild(row(label, function (b) {
        ids.forEach(function (x) { b.appendChild(personChip(x)); });
      }));
    }
    chipRow('Parents', model.parentsOf(id));
    chipRow('Married to', model.spousesOf(id));
    chipRow('Brothers & sisters', model.siblingsOf(id));
    chipRow('Children', model.childrenOf(id));

    if (p.nickname) {
      panel.appendChild(row('Called', function (b) { b.appendChild(document.createTextNode(p.nickname)); }));
    }
    if (p.notes) {
      panel.appendChild(row('Notes', function (b) { b.appendChild(document.createTextNode(p.notes)); }));
    }
    if (p.todo) {
      panel.appendChild(row('Still to find out', function (b) {
        var n = document.createElement('p'); n.className = 'note warn'; n.textContent = p.todo; b.appendChild(n);
      }));
    }

    panel.appendChild(row('In the data file', function (b) {
      var code = document.createElement('code');
      code.className = 'idcode';
      code.textContent = p.id;
      b.appendChild(code);
      var hint = document.createElement('p');
      hint.className = 'note';
      hint.textContent = 'Search js/data.js for this id to edit this person.';
      b.appendChild(hint);
    }));
  }

  /* -------------------------------------------------------------- select */
  var current = null;
  function select(id) {
    current = id;
    Object.keys(model.cards).forEach(function (k) {
      model.cards[k].classList.toggle('is-selected', k === id);
    });
    FamilyRender.setFocus(model, id, document.body);
    if (id) {
      openDetail(id);
      if (location.hash !== '#p=' + id) history.replaceState(null, '', '#p=' + id);
    } else {
      $('#detail').hidden = true;
      document.body.classList.remove('has-panel');
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  /* -------------------------------------------------------------- search */
  function wireSearch() {
    var input = $('#search'), list = $('#results');
    function close() { list.hidden = true; list.innerHTML = ''; }

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      list.innerHTML = '';
      if (q.length < 1) { close(); return; }
      var hits = [];
      model.people.forEach(function (p) {
        var hay = (p.name + ' ' + (p.nickname || '') + ' ' + (p.telugu || '') + ' ' +
                   model.familyOf(p.id).name).toLowerCase();
        if (hay.indexOf(q) >= 0) hits.push(p);
      });
      hits.sort(function (a, b) { return a.row - b.row || a.name.localeCompare(b.name); });
      hits.slice(0, 12).forEach(function (p) {
        var b = document.createElement('button');
        b.className = 'result';
        b.style.setProperty('--fam', model.colorOf(p.id));
        b.innerHTML = '<strong></strong><small></small>';
        b.querySelector('strong').textContent = p.name;
        b.querySelector('small').textContent = model.familyOf(p.id).name + ' · gen ' + (p.row + 1);
        b.addEventListener('click', function () {
          input.value = ''; close(); select(p.id); centerOn(p.id);
        });
        list.appendChild(b);
      });
      list.hidden = !list.children.length;
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; close(); input.blur(); }
      if (e.key === 'Enter' && list.firstChild) list.firstChild.click();
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.searchbox')) close();
    });
  }

  /* ------------------------------------------------------- side panel: info */
  function section(parent, title) {
    var s = document.createElement('section');
    var h = document.createElement('h3');
    h.textContent = title;
    s.appendChild(h);
    parent.appendChild(s);
    return s;
  }

  function buildSide() {
    var side = $('#side');
    side.innerHTML = '';

    var close = document.createElement('button');
    close.className = 'panel-close';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '&times;';
    close.addEventListener('click', function () { toggleSide(false); });
    side.appendChild(close);

    var a = model.analysis;

    /* surnames -------------------------------------------------------- */
    var s1 = section(side, 'Surnames in this chart');
    var ul = document.createElement('ul');
    ul.className = 'famlist';
    a.surnameCounts.forEach(function (f) {
      var li = document.createElement('li');
      li.style.setProperty('--fam', f.color);
      var strong = document.createElement('strong');
      strong.textContent = f.name + (f.telugu ? '  ' + f.telugu : '');
      li.appendChild(strong);
      var small = document.createElement('small');
      small.textContent = f.count + (f.count === 1 ? ' person' : ' people');
      li.appendChild(small);
      var fam = model.families[f.key];
      if (fam && fam.notes) { var n = document.createElement('p'); n.textContent = fam.notes; li.appendChild(n); }
      ul.appendChild(li);
    });
    s1.appendChild(ul);

    /* alliances ------------------------------------------------------- */
    var s2 = section(side, 'Marriage alliances');
    var intro = document.createElement('p');
    intro.className = 'note';
    intro.textContent = 'Every pair of surnames that has ever intermarried. ' +
      'A count above one means the two families are tied together repeatedly — ' +
      'the pattern that matters most in Telugu family history.';
    s2.appendChild(intro);
    a.alliances.forEach(function (al) {
      var d = document.createElement('div');
      d.className = 'ally' + (al.count > 1 ? ' is-repeat' : '');
      var head = document.createElement('h4');
      head.innerHTML = '<i></i><i></i>';
      head.querySelectorAll('i')[0].style.background = al.aColor;
      head.querySelectorAll('i')[1].style.background = al.bColor;
      head.appendChild(document.createTextNode(
        (al.sameFamily ? al.aName + ' within itself' : al.aName + ' + ' + al.bName) +
        '  ·  ' + al.count + (al.count === 1 ? ' marriage' : ' marriages')));
      d.appendChild(head);
      al.unions.forEach(function (u) {
        var p = document.createElement('p');
        p.textContent = u.label;
        d.appendChild(p);
      });
      s2.appendChild(d);
    });

    /* exchanges ------------------------------------------------------- */
    if (a.exchanges.length) {
      var s3 = section(side, 'Brothers who married sisters');
      var n3 = document.createElement('p');
      n3.className = 'note';
      n3.textContent = 'Detected automatically: two siblings from one family married ' +
        'two siblings from another. Shown on the chart as an amber arc.';
      s3.appendChild(n3);
      a.exchanges.forEach(function (x) {
        var p = document.createElement('p');
        p.className = 'callout';
        p.textContent = x.label;
        s3.appendChild(p);
      });
    }

    /* double cousins -------------------------------------------------- */
    if (a.doubleCousins.length) {
      var s4 = section(side, 'Double first cousins');
      var n4 = document.createElement('p');
      n4.className = 'note';
      n4.textContent = 'These people share BOTH sets of grandparents, because their ' +
        'fathers are brothers and their mothers are sisters.';
      s4.appendChild(n4);
      a.doubleCousins.forEach(function (x) {
        var p = document.createElement('p');
        p.className = 'callout';
        p.textContent = x.label;
        s4.appendChild(p);
      });
    }

    /* cousin marriages ------------------------------------------------ */
    var s5 = section(side, 'Marriages between relatives');
    if (a.consanguineous.length) {
      a.consanguineous.forEach(function (x) {
        var p = document.createElement('p');
        p.className = 'callout warn';
        p.textContent = x.label + '  —  ' + x.kind;
        s5.appendChild(p);
      });
    } else {
      var n5 = document.createElement('p');
      n5.className = 'note';
      n5.textContent = 'None recorded yet. When you find one, set consanguinity: ' +
        '"menarikam" (or "first-cousin") on that union in js/data.js and it will ' +
        'appear here with a red marriage bar on the chart.';
      s5.appendChild(n5);
    }

    /* data check ------------------------------------------------------ */
    var s6 = section(side, 'Data check');
    if (model.warnings.length) {
      model.warnings.forEach(function (w) {
        var p = document.createElement('p');
        p.className = 'callout warn';
        p.textContent = w;
        s6.appendChild(p);
      });
    } else {
      var ok = document.createElement('p');
      ok.className = 'note';
      ok.textContent = 'No problems found in js/data.js.';
      s6.appendChild(ok);
    }
    var todos = [];
    model.people.forEach(function (p) { if (p.todo) todos.push(p.name + ' — ' + p.todo); });
    model.unions.forEach(function (u) {
      if (u.todo) todos.push(u.partners.map(function (x) { return model.person(x).name; }).join(' & ') + ' — ' + u.todo);
    });
    if (todos.length) {
      var h = document.createElement('h4');
      h.textContent = 'Still to find out (' + todos.length + ')';
      s6.appendChild(h);
      todos.forEach(function (tx) {
        var p = document.createElement('p');
        p.className = 'callout';
        p.textContent = tx;
        s6.appendChild(p);
      });
    }
  }

  function toggleSide(on) {
    var side = $('#side');
    var show = on == null ? side.hidden : on;
    side.hidden = !show;
    document.body.classList.toggle('has-side', show);
    $('#btnInfo').setAttribute('aria-pressed', String(show));
  }

  /* --------------------------------------------------------------- theme */
  function wireTheme() {
    var key = 'familytree-theme';
    var saved = null;
    try { saved = localStorage.getItem(key); } catch (e) { /* private mode */ }
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    $('#btnTheme').addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(key, next); } catch (e) { /* ignore */ }
    });
  }

  /* ------------------------------------------------------------ keyboard */
  function wireKeys() {
    document.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); $('#search').focus(); return; }
      if (typing) return;
      if (e.key === 'Escape') { select(null); toggleSide(false); }
      if (e.key === '0') fit();
      if (e.key === '+' || e.key === '=') { var r = stage.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2); }
      if (e.key === '-') { var r2 = stage.getBoundingClientRect(); zoomAt(r2.left + r2.width / 2, r2.top + r2.height / 2, 1 / 1.2); }
      var step = 90;
      if (e.key === 'ArrowLeft') { view.x += step; apply(); }
      if (e.key === 'ArrowRight') { view.x -= step; apply(); }
      if (e.key === 'ArrowUp') { view.y += step; apply(); }
      if (e.key === 'ArrowDown') { view.y -= step; apply(); }
    });
  }

  /* ---------------------------------------------------------------- boot */
  function boot() {
    stage = $('#stage'); canvas = $('#canvas'); svg = $('#edges'); nodes = $('#nodes');

    if (!window.FAMILY) {
      stage.innerHTML = '<p class="fatal">js/data.js did not load.</p>';
      return;
    }

    try {
      model = FamilyLayout.build(window.FAMILY);
    } catch (err) {
      stage.innerHTML = '<p class="fatal">Could not build the tree: ' + err.message +
        '<br><small>Check js/data.js for a missing comma or bracket.</small></p>';
      throw err;
    }
    window.familyModel = model;   /* handy in the browser console */

    document.title = model.data.meta.title || 'Family tree';
    $('#title').textContent = model.data.meta.title || 'Family tree';
    $('#subtitle').textContent = model.data.meta.subtitle || '';

    FamilyRender.mount(model, svg, nodes);
    buildSide();

    /* card interactions ------------------------------------------------ */
    nodes.addEventListener('click', function (e) {
      var card = e.target.closest('.card');
      if (!card) return;
      select(card.dataset.id === current ? null : card.dataset.id);
    });
    nodes.addEventListener('keydown', function (e) {
      var card = e.target.closest('.card');
      if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(card.dataset.id); }
    });

    /* toolbar ---------------------------------------------------------- */
    $('#btnFit').addEventListener('click', function () { select(null); fit(); });
    $('#btnIn').addEventListener('click', function () { var r = stage.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.2); });
    $('#btnOut').addEventListener('click', function () { var r = stage.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.2); });
    $('#btnInfo').addEventListener('click', function () { toggleSide(); });
    $('#btnPrint').addEventListener('click', function () { select(null); window.print(); });
    $('#btnAlly').addEventListener('change', function (e) {
      document.body.classList.toggle('hide-alliance', !e.target.checked);
    });
    $('#btnGhost').addEventListener('change', function (e) {
      document.body.classList.toggle('hide-placeholders', !e.target.checked);
    });
    if (model.config.ego && model.person(model.config.ego)) {
      var me = $('#btnMe');
      me.hidden = false;
      me.textContent = 'Find me';
      me.addEventListener('click', function () { select(model.config.ego); centerOn(model.config.ego, 0.9); });
    }

    wirePanZoom(); wireSearch(); wireTheme(); wireKeys();

    fit();

    var m = /#p=([\w-]+)/.exec(location.hash);
    if (m && model.person(m[1])) { select(m[1]); centerOn(m[1], 0.85); }

    window.addEventListener('resize', function () {
      clearTimeout(window.__ftr);
      window.__ftr = setTimeout(function () { if (!current) fit(); }, 180);
    });

    if (model.warnings.length) {
      console.warn('[family-tree] ' + model.warnings.length +
        ' data warning(s) — open the Family info panel to see them.');
      model.warnings.forEach(function (w) { console.warn('  · ' + w); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
