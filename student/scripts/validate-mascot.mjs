import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = { window: {} };
vm.runInNewContext(await readFile(new URL('../src/components/mascot/mascot.states.js', import.meta.url), 'utf8'), context);
const states = context.window.STATES_DATA;
assert.equal(Object.keys(states).length, 9);
for (const name of ['walking', 'sleeping', 'greeting', 'thinking', 'surprised']) assert.ok(states[name]);
for (const name of ['walking', 'greeting', 'excited']) {
  assert.ok(states[name].idle.parts.some(p => p.kind === 'rotate-around-point'), `${name} has native articulated motion`);
}
const master = states.happy.paths;
for (const [name, state] of Object.entries(states)) {
  assert.deepEqual(Object.keys(state.paths), Object.keys(master));
  for (const [id,p] of Object.entries(state.paths)) {
    assert.equal(p.d.match(/[MLCQZ]/g).join(''), master[id].d.match(/[MLCQZ]/g).join(''), `${name}/${id} topology`);
    assert.ok(!p.d.includes('NaN'));
    if (p._group === 'feet') assert.equal(p.d, master[id].d, `${name}/${id} anchored`);
  }
  const svg = await readFile(new URL(`../public/mascot/unlearnarc/${name}.svg`, import.meta.url), 'utf8');
  assert.ok(svg.includes('viewBox="0 0 360 450"'));
  assert.ok(!svg.includes('<image'));
}
// The renderer mutates geometry only: paints must stay identical across expressions.
for (const state of Object.values(states)) {
  for (const [id, path] of Object.entries(state.paths)) {
    for (const key of ['fill', 'stroke', 'strokeWidth']) assert.equal(path[key], master[id][key], `${id}/${key} stays render-once compatible`);
  }
  for (const side of ['left', 'right']) {
    for (const suffix of ['iris', 'depth', 'amber', 'reflection', 'pupil', 'shine', 'shine-small', 'shine-rim', 'lash']) {
      assert.ok(state.paths[`eye-${side}-${suffix}`], `${side} layered eye/${suffix}`);
      assert.ok(state.idle.parts.at(-1).selectorAll.includes(`#path-eye-${side}-${suffix}`));
    }
    assert.ok(state.idle.parts.at(-1).selectorAll.includes(`#path-eyelid-${side}`));
  }
  for (const id of ['mouth', 'mouth-light', 'mouth-tongue']) assert.equal(state.paths[id].d.match(/[A-Z]/g).join(''), 'MCCZ');
}
const source = await readFile(new URL('../src/components/mascot/mascot.states.js', import.meta.url), 'utf8');
assert.equal(await readFile(new URL('../public/mascot/unlearnarc/mascot.states.js', import.meta.url), 'utf8'), source);
console.log('PASS: nine consistent vector states, matching paints/topology, layered eyes/mouths, blink targets, grounded base geometry, and synchronized Studio source.');
