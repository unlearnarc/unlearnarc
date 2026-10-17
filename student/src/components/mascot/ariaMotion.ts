// Authored paths are normalized absolute M/L/Q/C/Z with matching topology.
// Retarget from live coordinates; grouped Kabsch frames keep nested features rigid.
export const numbers = (d: string) => (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
export const fingerprint = (d: string) => (d.match(/[MLQCZ]/g) || []).join('');
export function formatPath(template: string, values: number[]) {
  let i = 0;
  return template.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, () => values[i++].toFixed(3));
}
export function rigidFrame(from: number[], to: number[]) {
  const center = (v: number[]) => {
    let x = 0, y = 0;
    for (let i = 0; i < v.length; i += 2) { x += v[i]; y += v[i+1]; }
    return [x / (v.length / 2), y / (v.length / 2)];
  };
  const a = center(from), b = center(to);
  let dot = 0, cross = 0;
  for (let i = 0; i < from.length; i += 2) {
    const x = from[i]-a[0], y = from[i+1]-a[1], u = to[i]-b[0], v = to[i+1]-b[1];
    dot += x*u+y*v; cross += x*v-y*u;
  }
  return { a, b, angle: Math.atan2(cross, dot) };
}
export function interpolate(from: number[], to: number[], t: number, frame: ReturnType<typeof rigidFrame>) {
  const { a, b, angle } = frame, c = Math.cos(angle), s = Math.sin(angle), ct = Math.cos(angle*t), st = Math.sin(angle*t);
  const out: number[] = [];
  for (let i = 0; i < from.length; i += 2) {
    const fx = from[i]-a[0], fy = from[i+1]-a[1], tx = to[i]-b[0], ty = to[i+1]-b[1];
    const x = fx+(tx*c+ty*s-fx)*t, y = fy+(-tx*s+ty*c-fy)*t;
    out.push(a[0]+(b[0]-a[0])*t+x*ct-y*st, a[1]+(b[1]-a[1])*t+x*st+y*ct);
  }
  return out;
}
// CSS cubic-bezier semantics, including editable overshoot on Y.
export function bezierEase(t: number, curve: readonly number[]) {
  const [x1, y1, x2, y2] = curve;
  const value = (u: number, a: number, b: number) => 3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;
  let low = 0, high = 1;
  for (let i = 0; i < 20; i++) { const mid = (low+high)/2; if (value(mid, x1, x2) < t) low = mid; else high = mid; }
  return t === 0 || t === 1 ? t : value((low+high)/2, y1, y2);
}
