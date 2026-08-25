/* =============================================================================
 *  model.js - turns js/data.js into something the page can walk.
 *
 *  Indexing and family relationships only. There is no layout maths here:
 *  the tree is drawn with nested boxes and ordinary CSS, so nothing needs to
 *  work out coordinates.
 * ========================================================================== */

(function (global) {
  'use strict';

  function build(data) {
    var warnings = [];
    var people = new Map();
    var unions = new Map();

    (data.people || []).forEach(function (p, i) {
      if (people.has(p.id)) { warnings.push('two people share the id "' + p.id + '"'); return; }
      var q = Object.assign({}, p);
      q._i = i;
      q.unionIds = [];
      q.parentUnion = null;
      people.set(q.id, q);
    });

    (data.unions || []).forEach(function (u, i) {
      if (unions.has(u.id)) { warnings.push('two marriages share the id "' + u.id + '"'); return; }
      var v = Object.assign({}, u);
      v._i = i;
      v.partners = (v.partners || []).filter(function (id) {
        if (!people.has(id)) { warnings.push('marriage ' + v.id + ' names an unknown person "' + id + '"'); return false; }
        return true;
      });
      v.children = (v.children || []).filter(function (id) {
        if (!people.has(id)) { warnings.push('marriage ' + v.id + ' names an unknown child "' + id + '"'); return false; }
        return true;
      });
      /* A marriage with nobody in it is not a marriage. If one is left behind,
         say by deleting both partners, it must not go on claiming children:
         they would each get a parentUnion nothing can be drawn from, and their
         whole branch would vanish from the chart while still sitting in the
         data. Drop it and let the children stand on their own. */
      if (!v.partners.length) {
        warnings.push('A marriage with nobody in it (' + v.id + ') was ignored' +
          (v.children.length
            ? ', so no parents are recorded for ' +
              v.children.map(function (c) { return people.get(c).name; }).join(', ')
            : ''));
        return;
      }

      unions.set(v.id, v);
      v.partners.forEach(function (id) { people.get(id).unionIds.push(v.id); });
      v.children.forEach(function (id) {
        var c = people.get(id);
        if (c.parentUnion) warnings.push(c.name + ' is listed as a child in two different marriages');
        else c.parentUnion = v.id;
      });
    });

    var m = {
      data: data,
      people: people,
      unions: unions,
      warnings: warnings,
      families: data.families || {},
      config: Object.assign({
        ego: null, primaryFamily: null, photoDir: 'photos', autoPhotos: true,
        anchorPreference: 'm', showPlaceholders: true
      }, data.config || {})
    };

    /* ------------------------------------------------------- accessors */
    m.person = function (id) { return people.get(id) || null; };
    m.union = function (id) { return unions.get(id) || null; };

    m.parentsOf = function (id) {
      var p = people.get(id);
      if (!p || !p.parentUnion) return [];
      return unions.get(p.parentUnion).partners.slice();
    };
    m.parentBySex = function (id, sex) {
      return m.parentsOf(id).map(function (x) { return people.get(x); })
        .filter(function (x) { return x && x.sex === sex; })[0] || null;
    };
    m.childrenOf = function (id) {
      var p = people.get(id), out = [];
      if (!p) return out;
      p.unionIds.forEach(function (uid) {
        unions.get(uid).children.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
      });
      return out;
    };
    m.siblingsOf = function (id) {
      var p = people.get(id);
      if (!p || !p.parentUnion) return [];
      return unions.get(p.parentUnion).children.filter(function (c) { return c !== id; });
    };
    m.spousesOf = function (id) {
      var p = people.get(id), out = [];
      if (!p) return out;
      p.unionIds.forEach(function (uid) {
        unions.get(uid).partners.forEach(function (q) { if (q !== id && out.indexOf(q) < 0) out.push(q); });
      });
      return out;
    };
    m.familyOf = function (id) {
      var p = people.get(id);
      return (p && m.families[p.family]) || m.families.tbd || { name: 'Unknown', color: '#64748b' };
    };
    m.colorOf = function (id) { return m.familyOf(id).color || '#64748b'; };

    generations(m);
    analyse(m);
    return m;
  }

  /* ---------------------------------------------------------- generations */
  /* `gen` still matters: it decides who counts as which rung, and the Telugu
     terms lean on it. Missing numbers are filled in from neighbours. */
  function generations(m) {
    var changed = true, guard = 0;
    while (changed && guard++ < 40) {
      changed = false;
      m.unions.forEach(function (u) {
        var known = u.partners.map(function (id) { return m.people.get(id).gen; })
                              .filter(function (g) { return typeof g === 'number'; });
        if (known.length) {
          u.partners.forEach(function (id) {
            var p = m.people.get(id);
            if (typeof p.gen !== 'number') { p.gen = known[0]; changed = true; }
          });
          u.children.forEach(function (id) {
            var c = m.people.get(id);
            if (typeof c.gen !== 'number') { c.gen = known[0] + 1; changed = true; }
          });
        } else {
          var kid = u.children.map(function (id) { return m.people.get(id).gen; })
                              .filter(function (g) { return typeof g === 'number'; })[0];
          if (typeof kid === 'number') {
            u.partners.forEach(function (id) {
              var p = m.people.get(id);
              if (typeof p.gen !== 'number') { p.gen = kid - 1; changed = true; }
            });
          }
        }
      });
    }
    var min = Infinity;
    m.people.forEach(function (p) {
      if (typeof p.gen !== 'number') p.gen = 0;
      if (p.gen < min) min = p.gen;
    });
    m.people.forEach(function (p) { p.row = p.gen - min; });

    m.unions.forEach(function (u) {
      u.partners.forEach(function (pid) {
        u.children.forEach(function (cid) {
          var a = m.people.get(pid), b = m.people.get(cid);
          if (b.row <= a.row) {
            warnOnce(m, b.name + ' is not below their parent ' + a.name + '. Check the generation numbers.');
          }
        });
      });
    });
  }

  function warnOnce(m, msg) {
    if (m.warnings.indexOf(msg) < 0) m.warnings.push(msg);
  }

  /* ------------------------------------------------------------- analysis */
  /* The point of the whole chart: which surnames keep marrying each other. */
  function analyse(m) {
    var out = { alliances: [], exchanges: [], consanguineous: [], doubleCousins: [], surnameCounts: [] };

    var counts = new Map();
    m.people.forEach(function (p) {
      var k = p.family || 'tbd';
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    counts.forEach(function (n, k) {
      var f = m.families[k] || { name: k, color: '#64748b' };
      out.surnameCounts.push({ key: k, name: f.name, telugu: f.telugu || '', color: f.color, count: n });
    });
    out.surnameCounts.sort(function (a, b) { return b.count - a.count; });

    var pairs = new Map();
    m.unions.forEach(function (u) {
      if (u.partners.length < 2) return;
      var a = m.people.get(u.partners[0]), b = m.people.get(u.partners[1]);
      var fa = a.family || 'tbd', fb = b.family || 'tbd';
      if (fa === 'tbd' || fb === 'tbd') return;
      var key = [fa, fb].sort().join(' + ');
      if (!pairs.has(key)) pairs.set(key, { a: fa, b: fb, unions: [] });
      pairs.get(key).unions.push(u);
    });
    pairs.forEach(function (v, key) {
      out.alliances.push({
        key: key,
        aName: (m.families[v.a] || {}).name || v.a,
        bName: (m.families[v.b] || {}).name || v.b,
        aColor: (m.families[v.a] || {}).color || '#64748b',
        bColor: (m.families[v.b] || {}).color || '#64748b',
        count: v.unions.length,
        sameFamily: v.a === v.b,
        unions: v.unions.map(function (u) {
          return { id: u.id, label: m.people.get(u.partners[0]).name + '  &  ' + m.people.get(u.partners[1]).name };
        })
      });
    });
    out.alliances.sort(function (a, b) { return b.count - a.count; });

    function sib(a, b) {
      var pa = m.people.get(a), pb = m.people.get(b);
      return !!(pa && pb && pa.parentUnion && pa.parentUnion === pb.parentUnion && a !== b);
    }

    var us = Array.from(m.unions.values()).filter(function (u) { return u.partners.length >= 2; });
    for (var i = 0; i < us.length; i++) {
      for (var j = i + 1; j < us.length; j++) {
        var u1 = us[i], u2 = us[j], combos = [[0, 1], [1, 0]];
        for (var k = 0; k < combos.length; k++) {
          var c = combos[k];
          if (sib(u1.partners[0], u2.partners[c[0]]) && sib(u1.partners[1], u2.partners[c[1]])) {
            out.exchanges.push({
              unions: [u1.id, u2.id],
              label: m.people.get(u1.partners[0]).name + ' & ' + m.people.get(u1.partners[1]).name +
                     '   /   ' + m.people.get(u2.partners[c[0]]).name + ' & ' + m.people.get(u2.partners[c[1]]).name
            });
            k = combos.length;
          }
        }
      }
    }

    m.unions.forEach(function (u) {
      if (!u.consanguinity) return;
      out.consanguineous.push({
        id: u.id, kind: u.consanguinity,
        label: u.partners.map(function (p) { return m.people.get(p).name; }).join('  &  ')
      });
    });

    var all = Array.from(m.people.values());
    for (var a = 0; a < all.length; a++) {
      for (var b = a + 1; b < all.length; b++) {
        var A = all[a], B = all[b];
        if (!A.parentUnion || !B.parentUnion || A.parentUnion === B.parentUnion) continue;
        var fa = m.parentBySex(A.id, 'm'), fb = m.parentBySex(B.id, 'm');
        var ma = m.parentBySex(A.id, 'f'), mb = m.parentBySex(B.id, 'f');
        if (!fa || !fb || !ma || !mb) continue;
        if (sib(fa.id, fb.id) && sib(ma.id, mb.id)) {
          out.doubleCousins.push({ a: A.id, b: B.id, label: A.name + '  and  ' + B.name });
        }
      }
    }

    m.analysis = out;
  }

  global.FamilyModel = { build: build };

})(window);
