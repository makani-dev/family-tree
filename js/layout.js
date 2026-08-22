/* =============================================================================
 *  layout.js - turns js/data.js into positioned cards and connector geometry.
 *
 *  You should not need to edit this file to grow the family. It is here so the
 *  chart can be understood and adjusted, not so it has to be maintained.
 *
 *  HOW IT WORKS
 *  ------------
 *  1. index      : build lookup maps, resolve parent/child/spouse links.
 *  2. generations: every person sits on the row given by `gen` (auto-filled
 *                  when missing), normalised so the oldest row is 0.
 *  3. clusters   : a "cluster" is one married couple drawn side by side, or a
 *                  single unmarried person. Clusters are what get positioned.
 *  4. tidy       : a Reingold-Tilford style pass packs each descent line and
 *                  centres parents over their children.
 *  5. relax      : because a Telugu family chart is a GRAPH and not a tree
 *                  (Macha daughters are drawn inside Makani couples), a few
 *                  barycentre iterations pull every couple towards the people
 *                  it is really connected to, while keeping birth order.
 *  6. edges      : marriage bars, orthogonal descent lines for children drawn
 *                  directly below, curved dashed lines for children drawn far
 *                  away (that is what a cross-family marriage looks like).
 *  7. analyse    : detects repeated alliances, brother/sister exchanges and
 *                  double first cousins. This powers the Alliances panel.
 * ========================================================================== */

(function (global) {
  'use strict';

  /* Tune the look of the chart here. ------------------------------------- */
  var M = {
    CARD_W: 176,      // card width in px
    CARD_H: 206,      // card height in px
    SPOUSE_GAP: 22,   // space between husband and wife cards
    CLUSTER_GAP: 54,  // minimum space between two neighbouring couples
    ROW_H: 322,       // vertical distance between generations
    PAD: 90,          // outer margin
    BUS_LIFT: 58      // how far the sibling bar sits above the children
  };

  /* ---------------------------------------------------------------- utils */
  function mean(a) {
    var s = 0, i;
    for (i = 0; i < a.length; i++) s += a[i];
    return a.length ? s / a.length : 0;
  }

  /* ============================================================== 1. index */
  function buildModel(data) {
    var warnings = [];
    var people = new Map();
    var unions = new Map();

    (data.people || []).forEach(function (p, i) {
      if (people.has(p.id)) { warnings.push('duplicate person id: ' + p.id); return; }
      var q = Object.assign({}, p);
      q._i = i;
      q.unionIds = [];
      q.parentUnion = null;
      people.set(q.id, q);
    });

    (data.unions || []).forEach(function (u, i) {
      if (unions.has(u.id)) { warnings.push('duplicate union id: ' + u.id); return; }
      var v = Object.assign({}, u);
      v._i = i;
      v.partners = (v.partners || []).filter(function (id) {
        if (!people.has(id)) { warnings.push('union ' + v.id + ' lists unknown partner "' + id + '"'); return false; }
        return true;
      });
      v.children = (v.children || []).filter(function (id) {
        if (!people.has(id)) { warnings.push('union ' + v.id + ' lists unknown child "' + id + '"'); return false; }
        return true;
      });
      unions.set(v.id, v);
      v.partners.forEach(function (id) { people.get(id).unionIds.push(v.id); });
      v.children.forEach(function (id) {
        var c = people.get(id);
        if (c.parentUnion) warnings.push(c.id + ' is listed as a child of two unions');
        else c.parentUnion = v.id;
      });
    });

    var model = {
      data: data,
      people: people,
      unions: unions,
      warnings: warnings,
      config: Object.assign({
        ego: null, photoDir: 'photos', autoPhotos: true,
        anchorPreference: 'm', showPlaceholders: true
      }, data.config || {}),
      families: data.families || {},
      metrics: M
    };

    /* handy accessors used by kinship.js and the UI ---------------------- */
    model.person = function (id) { return people.get(id) || null; };
    model.union = function (id) { return unions.get(id) || null; };
    model.parentsOf = function (id) {
      var p = people.get(id);
      if (!p || !p.parentUnion) return [];
      return unions.get(p.parentUnion).partners.slice();
    };
    model.parentBySex = function (id, sex) {
      return model.parentsOf(id).map(function (x) { return people.get(x); })
        .filter(function (x) { return x && x.sex === sex; })[0] || null;
    };
    model.childrenOf = function (id) {
      var p = people.get(id), out = [];
      if (!p) return out;
      p.unionIds.forEach(function (uid) {
        unions.get(uid).children.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
      });
      return out;
    };
    model.siblingsOf = function (id) {
      var p = people.get(id);
      if (!p || !p.parentUnion) return [];
      return unions.get(p.parentUnion).children.filter(function (c) { return c !== id; });
    };
    model.spousesOf = function (id) {
      var p = people.get(id), out = [];
      if (!p) return out;
      p.unionIds.forEach(function (uid) {
        unions.get(uid).partners.forEach(function (q) { if (q !== id && out.indexOf(q) < 0) out.push(q); });
      });
      return out;
    };
    model.familyOf = function (id) {
      var p = people.get(id);
      return (p && model.families[p.family]) || model.families.tbd ||
             { name: 'Unknown', color: '#64748b' };
    };
    model.colorOf = function (id) { return model.familyOf(id).color || '#64748b'; };

    return model;
  }

  /* ======================================================== 2. generations */
  function assignGenerations(model) {
    var changed = true, guard = 0;
    /* fill in any missing `gen` from neighbours, then normalise to rows */
    while (changed && guard++ < 40) {
      changed = false;
      model.unions.forEach(function (u) {
        var known = u.partners.map(function (id) { return model.people.get(id).gen; })
                              .filter(function (g) { return typeof g === 'number'; });
        if (known.length) {
          u.partners.forEach(function (id) {
            var p = model.people.get(id);
            if (typeof p.gen !== 'number') { p.gen = known[0]; changed = true; }
          });
          u.children.forEach(function (id) {
            var c = model.people.get(id);
            if (typeof c.gen !== 'number') { c.gen = known[0] + 1; changed = true; }
          });
        } else {
          var kid = u.children.map(function (id) { return model.people.get(id).gen; })
                              .filter(function (g) { return typeof g === 'number'; })[0];
          if (typeof kid === 'number') {
            u.partners.forEach(function (id) {
              var p = model.people.get(id);
              if (typeof p.gen !== 'number') { p.gen = kid - 1; changed = true; }
            });
          }
        }
      });
    }

    var min = Infinity;
    model.people.forEach(function (p) {
      if (typeof p.gen !== 'number') { p.gen = 0; model.warnings.push(p.id + ' has no gen; put on the top row'); }
      if (p.gen < min) min = p.gen;
    });
    model.people.forEach(function (p) { p.row = p.gen - min; });

    /* sanity: a child must sit below its parents */
    model.unions.forEach(function (u) {
      u.partners.forEach(function (pid) {
        u.children.forEach(function (cid) {
          var a = model.people.get(pid), b = model.people.get(cid);
          if (b.row <= a.row) {
            model.warnings.push(b.name + ' (gen ' + b.gen + ') is not below parent ' +
                                a.name + ' (gen ' + a.gen + ') - check the gen numbers');
          }
        });
      });
    });
  }

  /* =========================================================== 3. clusters */
  function buildClusters(model) {
    var clusters = [];
    var clusterOfPerson = new Map();
    var clusterOfUnion = new Map();

    model.data.unions.forEach(function (raw) {
      var u = model.unions.get(raw.id);
      if (!u) return;
      var members = u.partners.filter(function (id) { return !clusterOfPerson.has(id); });
      var c = {
        id: 'c-' + u.id, kind: 'union', union: u,
        members: members.map(function (id) { return model.people.get(id); })
      };
      clusters.push(c);
      clusterOfUnion.set(u.id, c);
      members.forEach(function (id) { clusterOfPerson.set(id, c); });
    });

    model.data.people.forEach(function (raw) {
      var p = model.people.get(raw.id);
      if (!p || clusterOfPerson.has(p.id)) return;
      var c = { id: 'c-' + p.id, kind: 'single', union: null, members: [p] };
      clusters.push(c);
      clusterOfPerson.set(p.id, c);
    });

    /* geometry + row + the person this cluster hangs from ---------------- */
    clusters.forEach(function (c) {
      var n = c.members.length;
      c.w = n ? n * M.CARD_W + (n - 1) * M.SPOUSE_GAP : 0;
      c.row = n ? Math.min.apply(null, c.members.map(function (p) { return p.row; })) : 0;

      var anchor = null;
      if (c.union && c.union.anchor && model.people.has(c.union.anchor)) {
        anchor = model.people.get(c.union.anchor);
      } else {
        var withParents = c.members.filter(function (p) { return p.parentUnion; });
        anchor = withParents.filter(function (p) { return p.sex === model.config.anchorPreference; })[0] ||
                 withParents[0] || null;
      }
      c.anchor = anchor;
      c.parentClusterId = anchor && anchor.parentUnion
        ? (clusterOfUnion.get(anchor.parentUnion) || {}).id : null;
    });

    var byId = new Map();
    clusters.forEach(function (c) { byId.set(c.id, c); });
    clusters.forEach(function (c) {
      c.parentCluster = c.parentClusterId ? byId.get(c.parentClusterId) : null;
      c.childClusters = [];
    });
    clusters.forEach(function (c) {
      if (c.parentCluster) c.parentCluster.childClusters.push(c);
    });

    /* eldest on the left ------------------------------------------------- */
    clusters.forEach(function (c) {
      c.childClusters.sort(function (a, b) {
        var pa = a.anchor, pb = b.anchor;
        var oa = (pa && typeof pa.order === 'number') ? pa.order : 999;
        var ob = (pb && typeof pb.order === 'number') ? pb.order : 999;
        if (oa !== ob) return oa - ob;
        return (pa ? pa._i : 0) - (pb ? pb._i : 0);
      });
    });

    model.clusters = clusters.filter(function (c) { return c.members.length; });
    model.clusterOfPerson = clusterOfPerson;
    model.clusterOfUnion = clusterOfUnion;
  }

  /* =============================================================== 4. tidy */
  function shiftSubtree(c, dx, seen) {
    seen = seen || new Set();
    if (seen.has(c.id)) return;
    seen.add(c.id);
    c.x += dx;
    c.childClusters.forEach(function (k) { shiftSubtree(k, dx, seen); });
  }

  function tidy(c, left, seen) {
    seen = seen || new Set();
    if (seen.has(c.id)) return left;      /* cycle guard */
    seen.add(c.id);

    var kids = c.childClusters;
    if (!kids.length) {
      c.x = left + c.w / 2;
      return left + c.w;
    }
    var cursor = left, i;
    for (i = 0; i < kids.length; i++) {
      cursor = tidy(kids[i], cursor, seen) + M.CLUSTER_GAP;
    }
    cursor -= M.CLUSTER_GAP;

    var first = kids[0], last = kids[kids.length - 1];
    c.x = (first.x + last.x) / 2;

    var overhang = left - (c.x - c.w / 2);
    if (overhang > 0) { shiftSubtree(c, overhang); cursor += overhang; }

    return Math.max(cursor, c.x + c.w / 2);
  }

  function tidyPass(model) {
    var roots = model.clusters.filter(function (c) { return !c.parentCluster; });
    roots.sort(function (a, b) {
      var ua = a.union ? a.union._i : 1e6, ub = b.union ? b.union._i : 1e6;
      return ua - ub;
    });
    var cursor = 0;
    roots.forEach(function (r) { cursor = tidy(r, cursor) + M.CLUSTER_GAP * 2; });

    /* anything unreachable (should not happen) gets parked to the right */
    model.clusters.forEach(function (c) {
      if (typeof c.x !== 'number') { c.x = cursor + c.w / 2; cursor += c.w + M.CLUSTER_GAP; }
    });
  }

  /* ============================================================== 5. relax */
  function relax(model, iterations) {
    var rows = new Map();
    model.clusters.forEach(function (c) {
      if (!rows.has(c.row)) rows.set(c.row, []);
      rows.get(c.row).push(c);
    });
    /* freeze left-to-right order from the tidy pass so birth order survives */
    rows.forEach(function (list) {
      list.sort(function (a, b) { return a.x - b.x; });
      list.forEach(function (c, i) { c.seq = i; });
    });
    var rowKeys = Array.from(rows.keys()).sort(function (a, b) { return a - b; });

    function parentTargets(c) {
      var xs = [];
      c.members.forEach(function (p) {
        if (!p.parentUnion) return;
        var pc = model.clusterOfUnion.get(p.parentUnion);
        if (pc && typeof pc.x === 'number') xs.push(pc.x);
      });
      return xs;
    }
    function childTargets(c) {
      var xs = [];
      if (!c.union) return xs;
      c.union.children.forEach(function (cid) {
        var cc = model.clusterOfPerson.get(cid);
        if (!cc || typeof cc.x !== 'number') return;
        /* aim at the child card itself, not the middle of their marriage */
        var idx = cc.members.map(function (m) { return m.id; }).indexOf(cid);
        var off = idx < 0 ? 0 : (idx * (M.CARD_W + M.SPOUSE_GAP)) - (cc.w - M.CARD_W) / 2;
        xs.push(cc.x + off);
      });
      return xs;
    }

    function separate(list) {
      var i, minX, maxX;
      list.sort(function (a, b) { return a.seq - b.seq; });
      for (i = 1; i < list.length; i++) {
        minX = list[i - 1].x + list[i - 1].w / 2 + M.CLUSTER_GAP + list[i].w / 2;
        if (list[i].x < minX) list[i].x = minX;
      }
      for (i = list.length - 2; i >= 0; i--) {
        maxX = list[i + 1].x - list[i + 1].w / 2 - M.CLUSTER_GAP - list[i].w / 2;
        if (list[i].x > maxX) list[i].x = maxX;
      }
    }

    for (var it = 0; it < iterations; it++) {
      var down = it % 2 === 0;
      var keys = down ? rowKeys : rowKeys.slice().reverse();
      keys.forEach(function (r) {
        var list = rows.get(r);
        list.forEach(function (c) {
          var xs = down ? parentTargets(c) : childTargets(c);
          if (!xs.length) xs = down ? childTargets(c) : parentTargets(c);
          if (xs.length) c.x += 0.55 * (mean(xs) - c.x);
        });
        separate(list);
      });
    }
    model.rows = rows;
    model.rowKeys = rowKeys;
  }

  /* =================================================== place people + size */
  function placePeople(model) {
    model.clusters.forEach(function (c) {
      var x = c.x - c.w / 2;
      c.members.forEach(function (p) {
        p.x = x + M.CARD_W / 2;
        p.y = M.PAD + p.row * M.ROW_H;
        x += M.CARD_W + M.SPOUSE_GAP;
      });
    });

    var minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    model.people.forEach(function (p) {
      if (typeof p.x !== 'number') return;
      minX = Math.min(minX, p.x - M.CARD_W / 2);
      maxX = Math.max(maxX, p.x + M.CARD_W / 2);
      maxY = Math.max(maxY, p.y + M.CARD_H);
    });
    if (!isFinite(minX)) { minX = 0; maxX = 100; maxY = 100; }

    var dx = M.PAD - minX;
    model.people.forEach(function (p) { if (typeof p.x === 'number') p.x += dx; });
    model.clusters.forEach(function (c) { c.x += dx; });

    model.width = (maxX - minX) + M.PAD * 2;
    model.height = maxY + M.PAD;
  }

  /* ============================================================== 6. edges */
  function buildEdges(model) {
    var marriages = [], descents = [];

    model.unions.forEach(function (u) {
      var partners = u.partners.map(function (id) { return model.people.get(id); })
                               .filter(function (p) { return typeof p.x === 'number'; });
      var originX, originY, barY = null;

      if (partners.length >= 2) {
        var a = partners[0], b = partners[1];
        if (a.x > b.x) { var t = a; a = b; b = t; }
        barY = a.y + M.CARD_H * 0.5;
        marriages.push({
          id: u.id, union: u,
          x1: a.x + M.CARD_W / 2, x2: b.x - M.CARD_W / 2, y: barY,
          adjacent: (b.x - a.x) < (M.CARD_W + M.SPOUSE_GAP * 2.2),
          ax: a.x, ay: a.y, bx: b.x, by: b.y,
          consanguinity: u.consanguinity || null,
          colorA: model.colorOf(a.id), colorB: model.colorOf(b.id)
        });
        originX = (a.x + b.x) / 2;
        originY = barY;
      } else if (partners.length === 1) {
        originX = partners[0].x;
        originY = partners[0].y + M.CARD_H;
      } else { return; }

      var myCluster = model.clusterOfUnion.get(u.id);
      var direct = [], cross = [];
      u.children.forEach(function (cid) {
        var c = model.people.get(cid);
        if (typeof c.x !== 'number') return;
        var cc = model.clusterOfPerson.get(cid);
        if (cc && cc.parentCluster && myCluster && cc.parentCluster.id === myCluster.id) direct.push(c);
        else cross.push(c);
      });

      if (direct.length) {
        var childRow = Math.min.apply(null, direct.map(function (c) { return c.row; }));
        var busY = M.PAD + childRow * M.ROW_H - M.BUS_LIFT;
        descents.push({
          type: 'direct', unionId: u.id,
          originX: originX, originY: originY, busY: busY,
          color: model.colorOf(u.partners[0]),
          children: direct.map(function (c) {
            return { id: c.id, x: c.x, top: c.y };
          })
        });
      }
      cross.forEach(function (c) {
        descents.push({
          type: 'cross', unionId: u.id, childId: c.id,
          originX: originX, originY: originY,
          x: c.x, top: c.y,
          color: model.colorOf(c.id)
        });
      });
    });

    model.edges = { marriages: marriages, descents: descents };
  }

  /* ============================================================ 7. analyse */
  function analyse(model) {
    var out = {
      alliances: [],        /* surname pair -> the marriages that created it */
      exchanges: [],        /* brothers married sisters, etc.                */
      consanguineous: [],   /* declared cousin marriages                     */
      doubleCousins: [],
      surnameCounts: []
    };

    /* --- surname counts ------------------------------------------------- */
    var counts = new Map();
    model.people.forEach(function (p) {
      var k = p.family || 'tbd';
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    counts.forEach(function (n, k) {
      var f = model.families[k] || { name: k, color: '#64748b' };
      out.surnameCounts.push({ key: k, name: f.name, telugu: f.telugu || '', color: f.color, count: n });
    });
    out.surnameCounts.sort(function (a, b) { return b.count - a.count; });

    /* --- one entry per pair of surnames that ever intermarried ---------- */
    var pairs = new Map();
    model.unions.forEach(function (u) {
      if (u.partners.length < 2) return;
      var a = model.people.get(u.partners[0]), b = model.people.get(u.partners[1]);
      var fa = a.family || 'tbd', fb = b.family || 'tbd';
      if (fa === 'tbd' || fb === 'tbd') return;
      var key = [fa, fb].sort().join(' + ');
      if (!pairs.has(key)) pairs.set(key, { key: key, a: fa, b: fb, unions: [] });
      pairs.get(key).unions.push(u);
    });
    pairs.forEach(function (v) {
      out.alliances.push({
        key: v.key,
        aName: (model.families[v.a] || {}).name || v.a,
        bName: (model.families[v.b] || {}).name || v.b,
        aColor: (model.families[v.a] || {}).color || '#64748b',
        bColor: (model.families[v.b] || {}).color || '#64748b',
        count: v.unions.length,
        sameFamily: v.a === v.b,
        unions: v.unions.map(function (u) {
          return {
            id: u.id,
            label: model.people.get(u.partners[0]).name + '  &  ' + model.people.get(u.partners[1]).name
          };
        })
      });
    });
    out.alliances.sort(function (a, b) { return b.count - a.count; });

    /* --- brothers who married sisters ----------------------------------- */
    var us = Array.from(model.unions.values()).filter(function (u) { return u.partners.length >= 2; });
    function sib(a, b) {
      var pa = model.people.get(a), pb = model.people.get(b);
      return !!(pa && pb && pa.parentUnion && pa.parentUnion === pb.parentUnion && a !== b);
    }
    for (var i = 0; i < us.length; i++) {
      for (var j = i + 1; j < us.length; j++) {
        var u1 = us[i], u2 = us[j];
        var combos = [[0, 1], [1, 0]];
        for (var k = 0; k < combos.length; k++) {
          var m = combos[k];
          if (sib(u1.partners[0], u2.partners[m[0]]) && sib(u1.partners[1], u2.partners[m[1]])) {
            out.exchanges.push({
              unions: [u1.id, u2.id],
              members: [u1.partners[0], u1.partners[1], u2.partners[m[0]], u2.partners[m[1]]],
              label: model.people.get(u1.partners[0]).name + ' & ' +
                     model.people.get(u1.partners[1]).name + '   /   ' +
                     model.people.get(u2.partners[m[0]]).name + ' & ' +
                     model.people.get(u2.partners[m[1]]).name
            });
            k = combos.length;
          }
        }
      }
    }

    /* --- declared cousin marriages -------------------------------------- */
    model.unions.forEach(function (u) {
      if (!u.consanguinity) return;
      out.consanguineous.push({
        id: u.id, kind: u.consanguinity,
        label: u.partners.map(function (p) { return model.people.get(p).name; }).join('  &  ')
      });
    });

    /* --- double first cousins: same grandparents on BOTH sides ---------- */
    var all = Array.from(model.people.values());
    for (var a = 0; a < all.length; a++) {
      for (var b = a + 1; b < all.length; b++) {
        var A = all[a], B = all[b];
        if (!A.parentUnion || !B.parentUnion || A.parentUnion === B.parentUnion) continue;
        var fa = model.parentBySex(A.id, 'm'), fb = model.parentBySex(B.id, 'm');
        var ma = model.parentBySex(A.id, 'f'), mb = model.parentBySex(B.id, 'f');
        if (!fa || !fb || !ma || !mb) continue;
        if (sib(fa.id, fb.id) && sib(ma.id, mb.id)) {
          out.doubleCousins.push({ a: A.id, b: B.id, label: A.name + '  <->  ' + B.name });
        }
      }
    }

    model.analysis = out;
  }

  /* ============================================================ entrypoint */
  function build(data) {
    var model = buildModel(data);
    assignGenerations(model);
    buildClusters(model);
    tidyPass(model);
    relax(model, 36);
    placePeople(model);
    buildEdges(model);
    analyse(model);
    return model;
  }

  global.FamilyLayout = { build: build, metrics: M };

})(window);
