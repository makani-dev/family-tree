/* =============================================================================
 *  kinship.js - works out what one person calls another, in Telugu.
 *
 *  Click any card and the detail panel shows a line like
 *
 *      Peddananna (పెద్దనాన్న) - father's elder brother
 *
 *  Given any two people it works out what the first would call the second.
 *  The chart uses it for "Relationships from here", where a reader points the
 *  viewpoint at whoever they like. Nobody is the centre by default.
 *
 *  IMPORTANT: Telugu kinship terms vary by region (Telangana / coastal Andhra
 *  / Rayalaseema) and by community. The table below is the widely used set.
 *  If your family says it differently, edit the TERMS object - the words are
 *  all in one place on purpose. See docs/TELUGU-KINSHIP.md.
 *
 *  Seniority convention used here: cousins take their rank from their PARENT.
 *  A child of your father's elder brother is anna/akka even if younger than
 *  you. That is the normal Telugu practice.
 * ========================================================================== */

(function (global) {
  'use strict';

  function t(telugu, translit, english) {
    return { telugu: telugu, translit: translit, english: english };
  }

  /* --- every Telugu word this file can produce, in one place ------------ */
  var TERMS = {
    self:         t('నేను', 'Nenu', 'me'),

    father:       t('నాన్న', 'Nanna', 'father'),
    mother:       t('అమ్మ', 'Amma', 'mother'),

    ffather:      t('తాతయ్య', 'Thathayya', "father's father"),
    fmother:      t('నాన్నమ్మ', 'Nanamma', "father's mother"),
    mfather:      t('తాతయ్య', 'Thathayya', "mother's father"),
    mmother:      t('అమ్మమ్మ', 'Ammamma', "mother's mother"),
    ggfather:     t('ముత్తాత', 'Muthatha', 'great-grandfather'),
    ggmother:     t('ముత్తవ్వ', 'Muthavva', 'great-grandmother'),

    son:          t('కొడుకు', 'Koduku', 'son'),
    daughter:     t('కూతురు', 'Kuthuru', 'daughter'),
    grandson:     t('మనవడు', 'Manavadu', 'grandson'),
    granddaughter:t('మనవరాలు', 'Manavaralu', 'granddaughter'),
    ggrandson:    t('ముని మనవడు', 'Muni-manavadu', 'great-grandson'),
    ggranddaughter:t('ముని మనవరాలు', 'Muni-manavaralu', 'great-granddaughter'),

    elderBrother: t('అన్నయ్య', 'Annayya', 'elder brother'),
    youngBrother: t('తమ్ముడు', 'Thammudu', 'younger brother'),
    elderSister:  t('అక్క', 'Akka', 'elder sister'),
    youngSister:  t('చెల్లి', 'Chelli', 'younger sister'),
    brother:      t('అన్న / తమ్ముడు', 'Anna / Thammudu', 'brother'),
    sister:       t('అక్క / చెల్లి', 'Akka / Chelli', 'sister'),

    peddananna:   t('పెద్దనాన్న', 'Peddananna', "father's elder brother"),
    babai:        t('బాబాయ్', 'Babai', "father's younger brother"),
    attha:        t('అత్త', 'Attha', "father's sister"),
    mamayya:      t('మామయ్య', 'Mamayya', "mother's brother"),
    peddamma:     t('పెద్దమ్మ', 'Peddamma', "mother's elder sister"),
    pinni:        t('పిన్ని', 'Pinni', "mother's younger sister"),

    /* the four "marriageable" cross-cousin terms - the menarikam relations */
    bava:         t('బావ', 'Bava', 'elder male cross-cousin'),
    bavamaridi:   t('బావమరిది', 'Bavamaridi', 'younger male cross-cousin'),
    vadina:       t('వదిన', 'Vadina', 'elder female cross-cousin'),
    maradalu:     t('మరదలు', 'Maradalu', 'younger female cross-cousin'),

    menalludu:    t('మేనల్లుడు', 'Menalludu', "sister's son"),
    menakodalu:   t('మేనకోడలు', 'Menakodalu', "sister's daughter"),

    husband:      t('భర్త', 'Bharta', 'husband'),
    wife:         t('భార్య', 'Bharya', 'wife'),
    kodalu:       t('కోడలు', 'Kodalu', "son's wife"),
    alludu:       t('అల్లుడు', 'Alludu', "daughter's husband")
  };

  /* ---------------------------------------------------------------- utils */
  function ancestorMap(model, id, maxDepth) {
    var out = new Map();
    var queue = [{ id: id, d: 0, path: [] }];
    while (queue.length) {
      var cur = queue.shift();
      if (cur.d >= maxDepth) continue;
      model.parentsOf(cur.id).forEach(function (pid) {
        var p = model.person(pid);
        if (!p) return;
        var path = cur.path.concat(p.sex === 'f' ? 'M' : 'F');
        var d = cur.d + 1;
        var prev = out.get(pid);
        if (!prev || prev.d > d) out.set(pid, { d: d, path: path });
        if (d < maxDepth) queue.push({ id: pid, d: d, path: path });
      });
    }
    return out;
  }

  /* rank among siblings: lower number = elder. undefined when unknown */
  function rank(model, id) {
    var p = model.person(id);
    if (!p) return undefined;
    if (typeof p.order === 'number') return p.order;
    var y = parseInt(String(p.birth || '').match(/\d{4}/) || [], 10);
    return isNaN(y) ? undefined : y;
  }

  /* is A elder than B?  true / false / null when it cannot be told */
  function elder(model, a, b) {
    var ra = rank(model, a), rb = rank(model, b);
    if (ra === undefined || rb === undefined || ra === rb) return null;
    return ra < rb;
  }

  function res(key, term, note) {
    return {
      key: key,
      telugu: term.telugu, translit: term.translit, english: term.english,
      note: note || '', extra: []
    };
  }

  /* -------------------------------------------------------- blood lookup */
  /* Only follows birth links. Returns null when the two are not related by
     blood. Kept separate from relationship() so the in-law code can call it
     without any risk of recursing back into itself.                        */
  function bloodRelationship(model, egoId, targetId) {
    var ego = model.person(egoId), target = model.person(targetId);
    if (!ego || !target) return null;
    if (egoId === targetId) return res('self', TERMS.self);

    var egoAnc = ancestorMap(model, egoId, 6);
    var tgtAnc = ancestorMap(model, targetId, 6);

    /* --- target is an ancestor of ego -------------------------------- */
    if (egoAnc.has(targetId)) {
      var e = egoAnc.get(targetId);
      if (e.d === 1) return res('parent', target.sex === 'f' ? TERMS.mother : TERMS.father);
      if (e.d === 2) {
        var side = e.path[0];
        if (side === 'F') return res('grandparent', target.sex === 'f' ? TERMS.fmother : TERMS.ffather);
        return res('grandparent', target.sex === 'f' ? TERMS.mmother : TERMS.mfather);
      }
      if (e.d === 3) return res('great-grandparent', target.sex === 'f' ? TERMS.ggmother : TERMS.ggfather);
      return res('ancestor', t('', '', (e.d - 2) + 'x great-grandparent'));
    }

    /* --- target is a descendant of ego ------------------------------- */
    if (tgtAnc.has(egoId)) {
      var d = tgtAnc.get(egoId).d;
      if (d === 1) return res('child', target.sex === 'f' ? TERMS.daughter : TERMS.son);
      if (d === 2) return res('grandchild', target.sex === 'f' ? TERMS.granddaughter : TERMS.grandson);
      if (d === 3) return res('great-grandchild', target.sex === 'f' ? TERMS.ggranddaughter : TERMS.ggrandson);
      return res('descendant', t('', '', (d - 2) + 'x great-grandchild'));
    }

    /* --- shared ancestor: siblings, uncles, cousins ------------------- */
    var best = null, all = [];
    egoAnc.forEach(function (ev, aid) {
      if (!tgtAnc.has(aid)) return;
      var tv = tgtAnc.get(aid);
      var cand = { id: aid, a: ev.d, b: tv.d, ap: ev.path, bp: tv.path };
      all.push(cand);
      var score = cand.a + cand.b, bs = best ? best.a + best.b : Infinity;
      if (score < bs || (score === bs && Math.max(cand.a, cand.b) < Math.max(best.a, best.b))) best = cand;
    });

    if (!best) return null;

    var out = bloodTerm(model, egoId, targetId, best);
    /* a second, independent line of descent means a double relationship */
    var others = all.filter(function (c) {
      return c.a === best.a && c.b === best.b && c.id !== best.id &&
             c.ap[0] !== best.ap[0];
    });
    if (others.length && best.a === 2 && best.b === 2) {
      out.extra.push('Double first cousins - related through the father’s ' +
                     'side and the mother’s side at the same time.');
    }
    return out;
  }

  /* ---------------------------------------------------------- main lookup */
  function relationship(model, egoId, targetId) {
    if (!egoId || !targetId) return null;
    var ego = model.person(egoId), target = model.person(targetId);
    if (!ego || !target) return null;

    if (egoId === targetId) return res('self', TERMS.self);

    /* married to each other ------------------------------------------- */
    if (model.spousesOf(egoId).indexOf(targetId) >= 0) {
      return res('spouse', target.sex === 'f' ? TERMS.wife : TERMS.husband);
    }

    var blood = bloodRelationship(model, egoId, targetId);
    var out = blood || inLawTerm(model, egoId, targetId);

    /* In a family with repeated alliances the same person often reaches you
       down two different routes - Padmaja is Ramakrishna's mother's elder
       sister AND the wife of his father's elder brother. Surface the second
       route instead of silently keeping only the first.                    */
    if (blood && COLLATERAL.test(blood.key)) {
      model.spousesOf(targetId).forEach(function (sid) {
        var via = bloodRelationship(model, egoId, sid);
        if (!via || !via.english || !COLLATERAL.test(via.key)) return;
        out.extra.push('Also your ' + describeSpouseOf(via, target) +
                       ', through their marriage to ' + model.person(sid).name + '.');
      });
    }
    return out;
  }

  /* Only collateral relatives (siblings, uncles, aunts, cousins) can reach you
     twice in an interesting way. The spouse of a direct ancestor is your other
     direct ancestor, which is not worth pointing out.                       */
  var COLLATERAL = /^(brother|sister|sibling|father-|mother-|cousin|cross-cousin|distant-cousin)/;

  /* "wife of father's elder brother" - and the Telugu word when there is one */
  function describeSpouseOf(rel, target) {
    var map = SPOUSE_OF[rel.key];
    var term = map && map[target.sex === 'f' ? 'f' : 'm'];
    var plain = (target.sex === 'f' ? 'wife' : 'husband') + ' of your ' + rel.english;
    return term ? term.translit + ' (' + plain + ')' : plain;
  }

  /* --------------------------------------------------- blood-relation term */
  function bloodTerm(model, egoId, targetId, c) {
    var target = model.person(targetId);
    var a = c.a, b = c.b;

    /* siblings ------------------------------------------------------- */
    if (a === 1 && b === 1) {
      var isElder = elder(model, targetId, egoId);
      if (target.sex === 'f') {
        if (isElder === null) return res('sister', TERMS.sister, 'birth order not recorded');
        return res(isElder ? 'sister-elder' : 'sister-younger',
                   isElder ? TERMS.elderSister : TERMS.youngSister);
      }
      if (target.sex === 'm') {
        if (isElder === null) return res('brother', TERMS.brother, 'birth order not recorded');
        return res(isElder ? 'brother-elder' : 'brother-younger',
                   isElder ? TERMS.elderBrother : TERMS.youngBrother);
      }
      return res('sibling', t('', '', 'sibling'), 'sex not recorded');
    }

    /* parent's sibling ------------------------------------------------ */
    if (a === 2 && b === 1) {
      var side = c.ap[0];                       /* F = father's side */
      var myParent = model.parentBySex(egoId, side === 'F' ? 'm' : 'f');
      var isEld = myParent ? elder(model, targetId, myParent.id) : null;
      if (side === 'F') {
        if (target.sex === 'f') return res('father-sister', TERMS.attha, 'also called Menatta');
        if (isEld === false) return res('father-younger-brother', TERMS.babai);
        return res('father-elder-brother', TERMS.peddananna,
                   isEld === null ? 'assumed elder - add `order` to be sure' : '');
      }
      if (target.sex === 'm') return res('mother-brother', TERMS.mamayya, 'also called Menamama');
      if (isEld === false) return res('mother-younger-sister', TERMS.pinni);
      return res('mother-elder-sister', TERMS.peddamma,
                 isEld === null ? 'assumed elder - add `order` to be sure' : '');
    }

    /* sibling's child ------------------------------------------------- */
    if (a === 1 && b === 2) {
      var mySib = model.person(model.parentsOf(targetId).filter(function (pid) {
        return model.siblingsOf(egoId).indexOf(pid) >= 0;
      })[0]);
      var cross = mySib && model.person(egoId).sex !== 'u' && mySib.sex !== model.person(egoId).sex;
      if (cross) return res('sibling-child-cross',
                            target.sex === 'f' ? TERMS.menakodalu : TERMS.menalludu);
      return res('sibling-child',
                 target.sex === 'f' ? TERMS.daughter : TERMS.son,
                 "brother's child - addressed as one's own");
    }

    /* first cousins --------------------------------------------------- */
    if (a === 2 && b === 2) {
      var egoParent = model.parentBySex(egoId, c.ap[0] === 'F' ? 'm' : 'f');
      var tgtParent = model.parentBySex(targetId, c.bp[0] === 'F' ? 'm' : 'f');
      if (!egoParent || !tgtParent) return res('cousin', t('', '', 'first cousin'));

      var parallel = egoParent.sex === tgtParent.sex;
      var isEld = elder(model, tgtParent.id, egoParent.id);
      if (isEld === null) isEld = elder(model, targetId, egoId);

      if (parallel) {
        var r;
        if (target.sex === 'f') r = res(isEld === false ? 'sister-younger' : 'sister-elder',
                                        isEld === false ? TERMS.youngSister : TERMS.elderSister);
        else if (target.sex === 'm') r = res(isEld === false ? 'brother-younger' : 'brother-elder',
                                             isEld === false ? TERMS.youngBrother : TERMS.elderBrother);
        else r = res('cousin', t('', '', 'first cousin'));
        r.note = 'parallel cousin - addressed exactly like a sibling, and not ' +
                 'marriageable by custom';
        return r;
      }
      var rr;
      if (target.sex === 'f') rr = res(isEld === false ? 'cross-cousin-f-younger' : 'cross-cousin-f-elder',
                                       isEld === false ? TERMS.maradalu : TERMS.vadina);
      else if (target.sex === 'm') rr = res(isEld === false ? 'cross-cousin-m-younger' : 'cross-cousin-m-elder',
                                            isEld === false ? TERMS.bavamaridi : TERMS.bava);
      else rr = res('cross-cousin', t('', '', 'cross cousin'));
      rr.note = 'cross cousin - this is the menarikam (మేనరికం) relation, ' +
                'traditionally the preferred marriage match';
      return rr;
    }

    /* anything further out: plain English --------------------------- */
    var deg = Math.min(a, b) - 1;
    var removed = Math.abs(a - b);
    var names = ['first', 'second', 'third', 'fourth', 'fifth'];
    var label = (names[deg - 1] || (deg + 'th')) + ' cousin' +
                (removed ? ' ' + (removed === 1 ? 'once' : removed === 2 ? 'twice' : removed + ' times') + ' removed' : '');
    return res('distant-cousin', t('', '', label));
  }

  /* --------------------------------------------------------- in-law terms */
  var SPOUSE_OF = {
    'father-elder-brother':  { f: TERMS.peddamma },
    'father-younger-brother':{ f: TERMS.pinni },
    'father-sister':         { m: TERMS.mamayya },
    'mother-brother':        { f: TERMS.attha },
    'mother-elder-sister':   { m: TERMS.peddananna },
    'mother-younger-sister': { m: TERMS.babai },
    'brother-elder':         { f: TERMS.vadina },
    'brother-younger':       { f: TERMS.maradalu },
    'sister-elder':          { m: TERMS.bava },
    'sister-younger':        { m: TERMS.bavamaridi },
    'child':                 { f: TERMS.kodalu, m: TERMS.alludu },
    'parent':                { f: TERMS.mother, m: TERMS.father }
  };

  function inLawTerm(model, egoId, targetId) {
    var target = model.person(targetId);

    /* target married into the family: spouse of one of ego's blood relatives.
       The Telugu word comes from SPOUSE_OF, but the English gloss is rebuilt
       from the connecting relative - otherwise Latha (the wife of your
       father's elder brother) would be described as "mother's elder sister"
       just because both are called Peddamma.                               */
    var via = model.spousesOf(targetId);
    for (var i = 0; i < via.length; i++) {
      var r = bloodRelationship(model, egoId, via[i]);
      if (!r || !r.english) continue;
      var map = SPOUSE_OF[r.key];
      var term = map && map[target.sex === 'f' ? 'f' : 'm'];
      var gloss = (target.sex === 'f' ? "wife" : "husband") + " of " + r.english;
      var name = model.person(via[i]).name;
      return res('inlaw:' + r.key,
                 term ? t(term.telugu, term.translit, gloss) : t('', '', gloss),
                 'married to ' + name);
    }

    /* target is a blood relative of ego's spouse */
    var mySpouses = model.spousesOf(egoId);
    for (var j = 0; j < mySpouses.length; j++) {
      var r2 = bloodRelationship(model, mySpouses[j], targetId);
      if (r2 && r2.english) {
        var who = model.person(mySpouses[j]);
        return res('inlaw-by-marriage',
                   t('', '', (who.sex === 'f' ? "wife's " : "husband's ") + r2.english),
                   'through ' + who.name);
      }
    }

    return res('unrelated', t('', '', 'no recorded blood or marriage link'), '');
  }

  global.Kinship = { relationship: relationship, TERMS: TERMS };

})(window);
