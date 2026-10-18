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
assert.equal(eastWest(holding('QT92','KJ4','A873','65')),
  'petit vers VC', 'KJ versus small doubleton against separated A/Q');

assert.equal(northSouth(holding('AJ9','53','KT87','Q642','S')),
  'DP 4e en O', 'Keep exact queen length instead of redundant long/general notes');
assert.equal(northSouth(holding('AJ9','543','KT87','Q62','S')),
  'DP 3e en O', 'Suppress duplicate general queen location');
assert.equal(northSouth(holding('AJ9','5432','KT87','Q6','S')),
  'DP 2nd en O', 'Keep precise second queen location');

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
console.log('MVT PAR notes: 22 regression assertions passed.');
