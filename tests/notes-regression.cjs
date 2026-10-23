'use strict';
// Run with: node tests/notes-regression.cjs
// These are synthetic suit distributions, not copies of private PBN files.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = html.indexOf('const HAND_FEAT_SUIT_FR =');
const end = html.indexOf('function parsePBN(', start);
assert.ok(start >= 0 && end > start, 'Cannot locate the PAR hint engine');
const detect = new Function(html.slice(start, end) + '\nreturn detectHandFeatures;')();

function holding(n, e, s, w, suit = 'H') {
  return Object.fromEntries(
    [['N', n], ['E', e], ['S', s], ['W', w]].map(([d, cards]) =>
      [d, { S: '', H: '', D: '', C: '', [suit]: cards }]
    )
  );
}
const eastWest = hands => detect(hands).noteEo;
const northSouth = hands => detect(hands).noteNs;

assert.equal(northSouth(holding('64','QJ87','AKT32','95')),
  'petit vers XC', 'QJ long before AKT, two feeder cards');
assert.equal(northSouth(holding('6','QJ87','AKT32','954')),
  'petit vers XC', 'One card suffices to try the ten finesse');
assert.equal(eastWest(holding('98653','4','QJ2','AKT7', 'C')),
  'petit vers XT', 'Board 28: singleton leads toward AKT');
assert.equal(northSouth(holding('64','95','AKT32','QJ87')),
  '', 'QJ behind AKT is not the same finesse');
assert.equal(northSouth(holding('K4','QJ87','AT632','95')),
  '', 'A/K split needs a separate analysis');
assert.equal(northSouth(holding('64','Q87','AKT32','J95')),
  '', 'Q and J split between defenders are different');
assert.equal(northSouth(holding('64','QJ','AKT632','987', 'C')),
  'DVt secs', 'QJ doubleton falls under AK, 8 combined cards');

assert.equal(eastWest(holding('QT9753','J2','K','A864')),
  '', 'Singleton king does not promote an extra winner behind long queen');
assert.equal(northSouth(holding('852','A9','KJT743','Q6')),
  'petit vers RC', 'Board 7: play toward king to lose only the ace');
assert.ok(!northSouth(holding('852','Q6','KJT743','A9')).includes('petit vers RC'),
  'Reverse A/Q locations do not call for the same maneuver');
assert.equal(eastWest(holding('2','K9863','Q75','AJT4')),
  'impasse à C (DC 3e en S)', 'Board 14: finesse queen third');

assert.equal(eastWest(holding('QT92','KJ4','A873','65')),
  'petit vers VC', 'KJ versus small doubleton against separated A/Q');

assert.equal(northSouth(holding('AJ9','53','KT87','Q642','S')),
  'DP 4e en O', 'Keep exact queen length instead of redundant long/general notes');
assert.equal(northSouth(holding('AJ9','543','KT87','Q62','S')),
  'DP 3e en O', 'Suppress duplicate general queen location');
assert.equal(northSouth(holding('AJ9','5432','KT87','Q6','S')),
  'DP 2nd en O', 'Keep precise second queen location');

// Règles généralisées A, C, D et E
assert.equal(northSouth(holding('97653','AT','KJ82','Q4','D')),
  'petit vers RK', 'A: R-V sans le 10');
assert.equal(northSouth(holding('852','A9','KJT743','Q6','H')),
  'petit vers RC', 'A: donne 7 préservée');
assert.equal(eastWest(holding('Q43','AKJT7','986','52','D')),
  'impasse répétée à K (DK 3e en N)', 'C: répétition');
assert.ok(!eastWest(holding('986','AKJT7','Q43','52','D')).includes('impasse répétée'),
  'C: mauvaise orientation');
assert.ok(!eastWest(holding('Q4','AKJT7','9862','53','D')).includes('impasse répétée'),
  'C: Dame seconde');
assert.ok(!eastWest(holding('Q43','AKJT76','985','2','D')).includes('impasse répétée'),
  'C: singleton de départ');
assert.equal(northSouth(holding('AKJ6','T975','43','Q82','S')),
  'petit vers VP', 'D: jouer vers le Valet');
assert.ok(!northSouth(holding('AKJ6','Q82','43','T975','S')).includes('petit vers VP'),
  'D: Valet dans le mauvais sens');
assert.ok(!northSouth(holding('AKJ6','T9875','43','Q2','S')).includes('petit vers VP'),
  'D: Dame seconde');
assert.equal(northSouth(holding('643','QJT8','AK972','5','S')),
  'petit vers 9P', 'D: jouer vers le 9');
assert.ok(!northSouth(holding('643','5','AK972','QJT8','S')).includes('petit vers 9P'),
  'D: 9 dans le mauvais sens');
assert.ok(!northSouth(holding('63','QJ87','AK942','T5','S')).includes('petit vers 9P'),
  'D: 10 chez un autre défenseur');

assert.equal(northSouth(holding('64','K932','AQT7','J85','D')),'petit vers DK','Board 4');
assert.ok(!northSouth(holding('64','J85','AQT7','K932','D')).includes('petit vers DK'),'Reverse king orientation');
assert.ok(!northSouth(holding('64','K932','AQ87','JT5','D')).includes('petit vers DK'),'Without ten');
assert.ok(!eastWest(holding('K','QJT8','A765','9432','H')).includes('RC sec en N'),'Board 13');

const base = holding('64','QJ87','AKT32','95');
for (const [suit, label] of [['S','P'], ['H','C'], ['D','K'], ['C','T']]) {
  const testHands = Object.fromEntries(Object.entries(base).map(([dir, suits]) =>
    [dir, {S: '', H: '', D: '', C: '', [suit]: suits.H}]
  ));
  assert.equal(northSouth(testHands), 'petit vers X' + label,
    'Symmetry across suits: ' + suit);
}
const dirs = ['N','E','S','W'];
const frenchDirs = ['N','E','S','O'];
const rotate = (hands, step) =>
  Object.fromEntries(dirs.map((dir, i) => [dirs[(i + step) % 4], hands[dir]]));
const rotateText = (note, step) =>
  note.replace(/ en [NESO]/g, segment =>
    ' en ' + frenchDirs[(frenchDirs.indexOf(segment.slice(-1)) + step) % 4]
  );
for (let shift = 1; shift <= 3; shift++) {
  const expected = detect(base);
  const actual = detect(rotate(base, shift));
  const source = shift % 2 ?
    {noteNs: expected.noteEo, noteEo: expected.noteNs} : expected;
  assert.equal(actual.noteNs, rotateText(source.noteNs, shift),
    'Rotated north-south notes: ' + shift);
  assert.equal(actual.noteEo, rotateText(source.noteEo, shift),
    'Rotated east-west notes: ' + shift);
}
console.log('MVT PAR notes: 37 regression assertions passed.');
