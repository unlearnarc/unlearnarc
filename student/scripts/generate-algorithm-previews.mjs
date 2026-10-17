import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('../public/images/algorithms/', import.meta.url));
mkdirSync(dir, { recursive: true });
// Static, title-free diagrams. The same semantic blue/neutral palette follows system theme.
const style = `<style>
:root{--ink:#17212b;--muted:#64748b;--line:#cbd5e1;--soft:#eef2f7;--blue:#2563eb;--tint:#dbeafe;--bg:#f1f5f9}
@media(prefers-color-scheme:dark){:root{--ink:#e2e8f0;--muted:#a7b4c5;--line:#475569;--soft:#202b36;--blue:#75a7ff;--tint:#1b4075;--bg:#151e28}}
text{font:15px system-ui,sans-serif;fill:var(--ink);text-anchor:middle;dominant-baseline:middle}.small{font-size:12px;fill:var(--muted)}
.cell{fill:var(--soft);stroke:var(--line);stroke-width:1.5}.active{fill:var(--tint);stroke:var(--blue);stroke-width:2.5}.line{fill:none;stroke:var(--line);stroke-width:2}.arrow{fill:none;stroke:var(--blue);stroke-width:2;marker-end:url(#arrow)}
</style><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="var(--blue)"/></marker></defs>`;
function cells(values, x, y, active = [], faded = []) {
  return values.map((v, i) => `<g opacity="${faded.includes(i) ? '.28' : '1'}"><rect x="${x+i*48}" y="${y}" width="40" height="38" rx="6" class="${active.includes(i)?'active':'cell'}"/><text x="${x+i*48+20}" y="${y+20}">${v}</text></g>`).join('');
}
const arrow = (d) => `<path d="${d}" class="arrow"/>`;
const label = (s,x,y) => `<text class="small" x="${x}" y="${y}">${s}</text>`;
const diagrams = {
  'binary-search': cells([2,5,8,12,16,23,38],76,100,[3],[0,1,2])+label('mid',240,69)+arrow('M240 79V95')+label('discard',144,163)+label('search range',336,163)+arrow('M270 153H402'),
  'linear-search': cells([5,2,8,1,9,3],100,100,[2])+arrow('M115 166H368')+label('scan',240,192)+label('current',216,68)+arrow('M216 79V94'),
  'insertion-sort': cells([1,3,6,8,4,9],100,112,[0,1,2,3])+cells([4],292,44,[0])+arrow('M312 83Q312 96 192 96V108')+label('sorted prefix',188,179),
  'merge-sort': cells([1,4,7],75,48,[0])+cells([2,3,8],271,48,[0])+arrow('M143 91L200 136')+arrow('M339 91L280 136')+cells([1,2,3,4,7,8],100,151,[0,1,2,3,4,5]),
  'quick-sort': cells([2,1,3,5,9,8,7],76,106,[3])+label('pivot',240,68)+arrow('M240 80V100')+'<path d="M216 96V158M264 96V158" class="line" stroke-dasharray="4 4"/>'+label('smaller',144,181)+label('larger',336,181),
  'bubble-sort': cells([1,5,3,7,8,9],100,105,[1,2])+arrow('M168 96C168 52 216 52 216 96')+arrow('M216 150C216 188 168 188 168 150')+label('compare neighbours',240,211),
  'selection-sort': cells([1,8,6,3,2,7],100,111,[0,4])+label('minimum',312,68)+arrow('M312 80V105')+arrow('M312 159Q312 194 168 159')+label('sorted',120,178),
  'heap-sort': '<path d="M240 43L160 95M240 43L320 95" class="line"/>'+[[240,43,9],[160,95,7],[320,95,8]].map(([x,y,v])=>`<circle cx="${x}" cy="${y}" r="21" class="${v===9?'active':'cell'}"/><text x="${x}" y="${y+1}">${v}</text>`).join('')+arrow('M240 77V147')+cells([9,7,8],172,164,[0]),
  'two-pointers': cells([1,2,4,6,8,9],100,109,[0,5])+label('left',120,66)+label('right',360,66)+arrow('M120 79V102')+arrow('M360 79V102')+arrow('M123 170H205')+arrow('M357 170H275'),
  'balanced-parentheses': cells(['(', '[', ']', ')'],76,65,[1,2])+arrow('M242 123H298')+'<path d="M315 64V187H392V64" class="line"/>'+cells(['('],333,139)+cells(['['],333,96,[0])+label('stack',353,211),
  'flood-fill': Array.from({length:5},(_,r)=>Array.from({length:7},(_,c)=>`<rect x="${106+c*39}" y="${25+r*39}" width="34" height="34" rx="5" class="${(r<4&&c>0&&c<5&&!(r===0&&c===4))?'active':'cell'}"/>`).join('')).join('')+arrow('M242 120H280')+arrow('M242 120V158'),
};
for (const kind of ['bfs','dfs']) {
  const nodes = [[240,45],[140,115],[340,115],[85,190],[185,190],[295,190],[395,190]];
  const active = kind === 'bfs' ? [0,1,2] : [0,1,3];
  diagrams[kind] = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]].map(([a,b])=>`<path d="M${nodes[a][0]} ${nodes[a][1]}L${nodes[b][0]} ${nodes[b][1]}" class="${kind==='dfs'&&b===3?'arrow':'line'}"/>`).join('')+nodes.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="21" class="${active.includes(i)?'active':'cell'}"/><text x="${x}" y="${y+1}">${kind==='bfs'?i+1:({0:1,1:2,3:3,4:4,2:5,5:6,6:7})[i]}</text>`).join('');
}
for (const [slug, diagram] of Object.entries(diagrams)) {
  writeFileSync(`${dir}${slug}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 240" width="480" height="240">${style}${diagram}</svg>\n`);
}
console.log(`Generated ${Object.keys(diagrams).length} algorithm previews.`);
