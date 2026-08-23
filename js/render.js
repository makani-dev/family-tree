/* =============================================================================
 *  render.js - paints the model onto the page.
 *
 *  Two stacked layers inside #canvas:
 *      <svg id="edges">   marriage bars and descent lines
 *      <div id="nodes">   one absolutely positioned card per person
 *
 *  Cards are HTML (not SVG) so photographs, Telugu text and CSS hover states
 *  all behave normally. Both layers share the same coordinate space, so the
 *  single pan/zoom transform on #canvas moves them together.
 * ========================================================================== */

(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var M = null;   /* metrics, filled in on mount */

  function el(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }
  function div(cls, text) {
    var n = document.createElement('div');
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* initials for the fallback avatar: "Ramakrishna Makani" -> "RM" */
  function initials(p) {
    var words = String(p.name || '?')
      .replace(/\(.*?\)/g, ' ')
      .split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  /* Dates only. Someone who is no longer living is shown by an unfilled card,
     never by a word or a mark on the card. */
  function lifespan(p) {
    var b = p.birth ? String(p.birth) : '';
    var d = p.death ? String(p.death) : '';
    if (b && d) return b + '-' + d;
    if (b) return 'b. ' + b;
    if (d) return 'd. ' + d;
    return '';
  }

  /* An empty box means this person has died. */
  function isUnfilled(p) { return !!(p.death || p.deceased); }

  /* orthogonal parent -> child connector with rounded corners */
  function orthPath(ox, oy, busY, cx, top, r) {
    if (Math.abs(cx - ox) < 2) return 'M' + ox + ',' + oy + ' L' + cx + ',' + top;
    var dir = cx > ox ? 1 : -1;
    var rr = Math.min(r, Math.abs(cx - ox) / 2, Math.abs(busY - oy), Math.abs(top - busY));
    return 'M' + ox + ',' + oy +
           ' L' + ox + ',' + (busY - rr) +
           ' Q' + ox + ',' + busY + ' ' + (ox + dir * rr) + ',' + busY +
           ' L' + (cx - dir * rr) + ',' + busY +
           ' Q' + cx + ',' + busY + ' ' + cx + ',' + (busY + rr) +
           ' L' + cx + ',' + top;
  }

  /* long curved connector, used when a child is drawn far from its parents */
  function curvePath(ox, oy, cx, top) {
    var d = Math.max(70, Math.abs(top - oy) * 0.42);
    return 'M' + ox + ',' + oy +
           ' C' + ox + ',' + (oy + d) + ' ' + cx + ',' + (top - d) + ' ' + cx + ',' + top;
  }

  /* ------------------------------------------------------------- the cards */
  function buildCard(model, p) {
    var cfg = model.config;
    var fam = model.familyOf(p.id);
    var card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = p.id;
    card.dataset.row = p.row;
    card.tabIndex = 0;
    card.style.left = (p.x - M.CARD_W / 2) + 'px';
    card.style.top = p.y + 'px';
    card.style.setProperty('--fam', fam.color || '#64748b');
    if (p.placeholder) card.classList.add('is-placeholder');
    if (isUnfilled(p)) card.classList.add('is-unfilled');
    if (p.sex === 'u') card.classList.add('is-unknown-sex');
    if (p.id === cfg.ego) card.classList.add('is-ego');

    /* photo, with an initials avatar behind it as the fallback ---------- */
    var ph = div('ph');
    var av = div('avatar', initials(p));
    ph.appendChild(av);

    var src = p.photo ? (cfg.photoDir + '/' + p.photo)
            : (cfg.autoPhotos && !p.placeholder ? cfg.photoDir + '/' + p.id + '.jpg' : null);
    if (src) {
      var img = document.createElement('img');
      img.alt = p.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () { img.remove(); });
      img.addEventListener('load', function () { ph.classList.add('has-photo'); });
      img.src = src;
      ph.appendChild(img);
    }
    card.appendChild(ph);

    var nm = div('nm', p.name);
    card.appendChild(nm);

    if (p.telugu) card.appendChild(div('te', p.telugu));

    var span = lifespan(p);
    if (span) card.appendChild(div('dt', span));

    var famLine = div('fam');
    var dot = document.createElement('i');
    dot.style.background = fam.color || '#64748b';
    famLine.appendChild(dot);
    var label = fam.name;
    if (p.marriedInto && model.families[p.marriedInto]) {
      label += ' → ' + model.families[p.marriedInto].name;
    }
    famLine.appendChild(document.createTextNode(label));
    card.appendChild(famLine);

    if (p.title) {
      var badge = div('badge', p.title);
      card.appendChild(badge);
    }
    if (p.todo) {
      var todo = div('todo');
      todo.title = 'Still to find out: ' + p.todo;
      todo.setAttribute('aria-label', 'incomplete: ' + p.todo);
      card.appendChild(todo);
    }
    return card;
  }

  /* ------------------------------------------------------------ the edges */
  function buildEdges(model, svg) {
    var gDesc = el('g', { class: 'layer-descent' });
    var gMar  = el('g', { class: 'layer-marriage' });
    var gAlly = el('g', { class: 'layer-alliance' });

    /* descents ------------------------------------------------------- */
    model.edges.descents.forEach(function (d) {
      if (d.type === 'direct') {
        d.children.forEach(function (c) {
          var path = el('path', {
            class: 'descent',
            d: orthPath(d.originX, d.originY, d.busY, c.x, c.top, 14),
            stroke: d.color
          });
          path.dataset.union = d.unionId;
          path.dataset.child = c.id;
          gDesc.appendChild(path);
        });
      } else {
        var p2 = el('path', {
          class: 'descent is-cross',
          d: curvePath(d.originX, d.originY, d.x, d.top),
          stroke: d.color
        });
        p2.dataset.union = d.unionId;
        p2.dataset.child = d.childId;
        gDesc.appendChild(p2);
        gDesc.appendChild(el('circle', {
          class: 'cross-dot', cx: d.x, cy: d.top, r: 3.5, fill: d.color
        }));
      }
    });

    /* marriage bars --------------------------------------------------- */
    var barMid = {};
    model.edges.marriages.forEach(function (m) {
      var g = el('g', { class: 'marriage' + (m.consanguinity ? ' is-consang' : '') });
      g.dataset.union = m.id;
      if (m.adjacent) {
        g.appendChild(el('line', {
          class: 'mbar', x1: m.x1, y1: m.y, x2: m.x2, y2: m.y
        }));
      } else {
        /* partners are not side by side (a second marriage): curve across */
        var mid = (m.x1 + m.x2) / 2;
        g.appendChild(el('path', {
          class: 'mbar is-remote',
          d: 'M' + m.x1 + ',' + m.y + ' Q' + mid + ',' + (m.y - 46) + ' ' + m.x2 + ',' + m.y
        }));
      }
      g.appendChild(el('circle', {
        class: 'mknot', cx: (m.x1 + m.x2) / 2, cy: m.y, r: m.consanguinity ? 6 : 4.5
      }));
      barMid[m.id] = { x: (m.x1 + m.x2) / 2, y: m.y };
      gMar.appendChild(g);
    });

    /* alliance arcs: brothers who married sisters ---------------------- */
    (model.analysis.exchanges || []).forEach(function (x) {
      var a = barMid[x.unions[0]], b = barMid[x.unions[1]];
      if (!a || !b) return;
      var lift = Math.min(a.y, b.y) - 120;
      var arc = el('path', {
        class: 'ally-arc',
        d: 'M' + a.x + ',' + a.y + ' Q' + ((a.x + b.x) / 2) + ',' + lift + ' ' + b.x + ',' + b.y
      });
      arc.dataset.exchange = x.unions.join('|');
      gAlly.appendChild(arc);

      var label = el('text', {
        class: 'ally-label',
        x: (a.x + b.x) / 2,
        y: lift + 34,
        'text-anchor': 'middle'
      });
      label.textContent = 'double alliance';
      gAlly.appendChild(label);
    });

    svg.appendChild(gAlly);
    svg.appendChild(gDesc);
    svg.appendChild(gMar);
  }

  /* --------------------------------------------------------------- mount */
  function mount(model, svg, nodes) {
    M = model.metrics;
    svg.setAttribute('width', model.width);
    svg.setAttribute('height', model.height);
    svg.setAttribute('viewBox', '0 0 ' + model.width + ' ' + model.height);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    nodes.innerHTML = '';
    nodes.style.width = model.width + 'px';
    nodes.style.height = model.height + 'px';

    buildEdges(model, svg);

    /* generation labels down the left-hand side ------------------------ */
    model.rowKeys.forEach(function (r) {
      var band = div('genband');
      band.style.top = (M.PAD + r * M.ROW_H - 34) + 'px';
      band.style.width = model.width + 'px';
      band.appendChild(div('genband-label', 'Generation ' + (r + 1)));
      nodes.appendChild(band);
    });

    var byId = {};
    model.people.forEach(function (p) {
      if (typeof p.x !== 'number') return;
      if (p.placeholder && !model.config.showPlaceholders) return;
      var card = buildCard(model, p);
      byId[p.id] = card;
      nodes.appendChild(card);
    });

    model.cards = byId;
    return byId;
  }

  /* ------------------------------------------------- focus / highlighting */
  function relatedSet(model, id) {
    var keep = new Set([id]);
    /* ancestors */
    (function up(x, depth) {
      if (depth > 6) return;
      model.parentsOf(x).forEach(function (p) {
        if (keep.has(p)) return;
        keep.add(p);
        model.spousesOf(p).forEach(function (s) { keep.add(s); });
        up(p, depth + 1);
      });
    })(id, 0);
    /* descendants */
    (function down(x, depth) {
      if (depth > 6) return;
      model.childrenOf(x).forEach(function (c) {
        if (keep.has(c)) return;
        keep.add(c);
        model.spousesOf(c).forEach(function (s) { keep.add(s); });
        down(c, depth + 1);
      });
    })(id, 0);
    model.spousesOf(id).forEach(function (s) { keep.add(s); });
    model.siblingsOf(id).forEach(function (s) {
      keep.add(s);
      model.spousesOf(s).forEach(function (q) { keep.add(q); });
    });
    return keep;
  }

  function setFocus(model, id, root) {
    if (!id) {
      root.classList.remove('focusing');
      Object.keys(model.cards).forEach(function (k) {
        model.cards[k].classList.remove('dim', 'lit');
      });
      root.querySelectorAll('.descent, .marriage').forEach(function (n) {
        n.classList.remove('dim', 'lit');
      });
      return;
    }
    var keep = relatedSet(model, id);
    root.classList.add('focusing');
    Object.keys(model.cards).forEach(function (k) {
      var c = model.cards[k];
      c.classList.toggle('dim', !keep.has(k));
      c.classList.toggle('lit', keep.has(k));
    });
    root.querySelectorAll('.descent').forEach(function (n) {
      var on = keep.has(n.dataset.child);
      n.classList.toggle('dim', !on);
      n.classList.toggle('lit', on);
    });
    root.querySelectorAll('.marriage').forEach(function (n) {
      var u = model.union(n.dataset.union);
      var on = u && u.partners.some(function (p) { return keep.has(p); });
      n.classList.toggle('dim', !on);
      n.classList.toggle('lit', !!on);
    });
  }

  global.FamilyRender = {
    mount: mount,
    setFocus: setFocus,
    relatedSet: relatedSet,
    initials: initials,
    lifespan: lifespan,
    isUnfilled: isUnfilled
  };

})(window);
