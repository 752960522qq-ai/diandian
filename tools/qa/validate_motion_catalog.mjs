import assert from 'node:assert/strict';
import fs from 'node:fs';

const folders = ['diandian-classic-motion-lab', 'zhigeng-motion-lab'];
const base = ['RifleIdle', 'RifleWalk', 'RifleRun', 'RifleAimingIdle', 'FiringRifle'].map(name => ({name}));
const report = {};
for (const folder of folders) {
  const root = new URL(`../../web/motion-labs/${folder}/`, import.meta.url);
  const {selectableMotions} = await import(new URL('motion-catalog.js', root));
  // Extract the declarative source catalog without loading renderer dependencies.
  const source = fs.readFileSync(new URL('rocket-motion.js', root), 'utf8');
  const declaration = source.match(/export const rocketMotions = ([\s\S]*?);/)[1];
  const rocket = Function(`return (${declaration});`)();
  const before = JSON.stringify([base, rocket]);
  const selected = selectableMotions(base, rocket);
  assert.equal(selected.length, 14);
  assert.equal(new Set(selected.map(m => m.name)).size, 14);
  assert.equal(JSON.stringify([base, rocket]), before, 'Do not mutate source catalog');
  for (const direction of ['Level', 'Up', 'Down']) {
    assert(selected.some(m => m.name === `RocketRaise${direction}`));
    assert(!selected.some(m => m.name === `RocketRaiseInfinite${direction}`));
    assert(rocket.some(m => m.name === `RocketRaiseInfinite${direction}`), 'Retain authoring variant');
  }
  for (const suffix of ['AimUp', 'AimDown', 'FireUp', 'FireDown', 'Draw', 'Discard']) {
    assert(selected.some(m => m.name === `Rocket${suffix}`));
  }
  const ordinary = ['Idle','Walk','Run','Reloading','PistolIdle','ShotgunPump'].map(name => ({name}));
  assert.deepEqual(selectableMotions(ordinary), ordinary, 'Other weapon actions unchanged');
  assert.deepEqual(selectableMotions(ordinary, ordinary), ordinary, 'Deduplicate exact IDs only');
  const app = fs.readFileSync(new URL('app.js', root), 'utf8');
  assert(app.includes('selectableMotions(info.motions, shotgunMotions, rocketMotions, uploadedMotions, fixedGunMotions).map('));
  report[folder] = {visiblePf89Actions: selected.length, retainedAuthoringVariants: 3, passed: true};
}
assert.equal(fs.readFileSync(new URL(`../../web/motion-labs/${folders[0]}/motion-catalog.js`, import.meta.url), 'utf8'), fs.readFileSync(new URL(`../../web/motion-labs/${folders[1]}/motion-catalog.js`, import.meta.url), 'utf8'));
console.log(JSON.stringify(report, null, 2));
