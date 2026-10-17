import { readFile, writeFile, mkdir } from 'node:fs/promises';
import vm from 'node:vm';
const source = new URL('../src/components/mascot/mascot.states.js', import.meta.url);
const context = { window: {} };
vm.runInNewContext(await readFile(source, 'utf8'), context);
const { STATES_DATA: states, PREVIEW_CONFIG: config } = context.window;
const folder = new URL('../public/mascot/unlearnarc/', import.meta.url);
await mkdir(folder, { recursive: true });
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
for (const [name, state] of Object.entries(states)) {
  const groups = [];
  // Preserve painter order, grouping contiguous anatomical parts.
  for (const [id, path] of Object.entries(state.paths)) {
    const group = path._group;
    if (groups.at(-1)?.name !== group) groups.push({ name: group, paths: [] });
    const attrs = Object.entries(path).filter(([k]) => !k.startsWith('_') && k !== 'tag').map(([k,v]) => `${k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}="${escape(v)}"`).join(' ');
    groups.at(-1).paths.push(`    <path id="${id}" ${attrs}/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${config.viewBox}" fill="none" role="img" aria-labelledby="title"><title id="title">Aria — ${name}</title>\n${groups.map((g,i) => `  <g id="${g.name}-${i}" data-part="${g.name}">\n${g.paths.join('\n')}\n  </g>`).join('\n')}\n</svg>\n`;
  await writeFile(new URL(`${name}.svg`, folder), svg);
}
await writeFile(new URL('mascot.states.js', folder), await readFile(source, 'utf8'));
console.log(`Exported ${Object.keys(states).length} SVG states and the native Studio file.`);
