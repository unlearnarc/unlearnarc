// Canonical editable artwork. Native Animator Studio window.STATES_DATA contract.
(() => {
  const tuning = {
    ground: 420, anchors: { feet: [180, 420], body: [180, 310], head: [180, 185], leftArm: [133, 224], rightArm: [227, 224] },
    transition: { durationMs: 720, easing: 'ease-in-out' },
    breathing: { amplitude: 0.007, duration: 3.8 },
    blink: { interval: 4.2, variation: 1.1, duration: 0.18 },
    // Base geometry stays grounded; the walking idle articulates each leg.
    poses: {
      happy: { headRotation: -1, leftArm: -3, rightArm: -4, bodyY: 0, bounce: 0 },
      sleepy: { headRotation: 6, leftArm: 2, rightArm: -3, bodyY: 3, bounce: 0 },
      excited: { headRotation: -4, leftArm: 142, rightArm: -142, bodyY: -2, bounce: 5 },
      sad: { headRotation: 3, leftArm: -20, rightArm: 18, bodyY: 2, bounce: 0 },
      walking: { headRotation: -2, leftArm: 8, rightArm: -8, bodyY: 0, bounce: 0 },
      sleeping: { headRotation: 14, leftArm: -18, rightArm: 18, bodyY: 5, bounce: 0 },
      greeting: { headRotation: -5, leftArm: -3, rightArm: -148, bodyY: 0, bounce: 0 },
      thinking: { headRotation: 8, leftArm: -8, rightArm: -115, bodyY: 0, bounce: 0 },
      surprised: { headRotation: 0, leftArm: 48, rightArm: -48, bodyY: -1, bounce: 2 },
    },
    assets: {},
  };
  window.MASCOT_TUNING = tuning; // App-specific controls; native Studio fields below.
  window.PREVIEW_CONFIG = { title: 'UnlearnArc · Aria', subtitle: 'Your curious coding companion', viewBox: '0 0 360 450', size: { width: 360, height: 450 } };
  window.PATH_OVERRIDES = { durationMs: tuning.transition.durationMs, idleAnchor: tuning.anchors.feet };
  const c = { ink: '#49352F', hair: '#392820', skin: '#F7D2B7', navy: '#172534', teal: '#14B8A6', white: '#F8FAFC', yellow: '#FBBF24' };
  const ellipse = (x, y, rx, ry) => `M ${x-rx} ${y} C ${x-rx} ${y-ry*.5523} ${x-rx*.5523} ${y-ry} ${x} ${y-ry} C ${x+rx*.5523} ${y-ry} ${x+rx} ${y-ry*.5523} ${x+rx} ${y} C ${x+rx} ${y+ry*.5523} ${x+rx*.5523} ${y+ry} ${x} ${y+ry} C ${x-rx*.5523} ${y+ry} ${x-rx} ${y+ry*.5523} ${x-rx} ${y} Z`;
  function transform(d, angle, pivot, dy = 0) {
    const a = angle*Math.PI/180, cs = Math.cos(a), sn = Math.sin(a);
    // All geometry is normalized absolute M/L/C/Q/Z; bake each control point.
    return d.replace(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (_, xx, yy) => {
      const x = +xx-pivot[0], y = +yy-pivot[1];
      return `${(pivot[0]+x*cs-y*sn).toFixed(3)} ${(pivot[1]+x*sn+y*cs+dy).toFixed(3)}`;
    });
  }
  const states = {};
  for (const name of Object.keys(tuning.poses)) {
    tuning.assets[name] = `/mascot/unlearnarc/${name}.svg`;
    const p = tuning.poses[name], paths = {};
    function add(id, d, fill, group, width = 1.8, stroke = c.ink) {
      const angle = group === 'head' ? p.headRotation : group === 'leftArm' ? p.leftArm : group === 'rightArm' ? p.rightArm : 0;
      paths[id] = { tag: 'path', d: transform(d, angle, tuning.anchors[group] || [180, 310], group === 'feet' ? 0 : p.bodyY), fill, stroke, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round', _group: group };
    }
    // Original fixed lower-body geometry and sole baseline, unchanged in every pose.
    add('leg-left', 'M 141 307 Q 157 305 176 310 L 172 348 Q 168 363 173 380 Q 175 390 166 394 Q 150 398 140 391 Q 136 387 140 376 L 137 342 Q 136 320 141 307 Z', '#253246', 'feet', 2.2);
    add('leg-right', 'M 184 310 Q 203 305 219 307 Q 224 320 223 342 L 220 376 Q 224 387 220 391 Q 210 398 194 394 Q 185 390 187 380 Q 192 363 188 348 Z', '#253246', 'feet', 2.2);
    add('trouser-seam-left', 'M 143 326 Q 139 351 145 374', 'none', 'feet', 1.8, '#148E87');
    add('trouser-seam-right', 'M 217 326 Q 221 351 215 374', 'none', 'feet', 1.8, '#148E87');
    add('trouser-fold-left', 'M 146 378 Q 153 383 165 379', 'none', 'feet', 1.8, '#435067');
    add('trouser-fold-right', 'M 195 379 Q 207 383 214 378', 'none', 'feet', 1.8, '#435067');
    add('sock-left', 'M 145 380 L 170 380 L 169 402 L 144 402 Z', c.white, 'feet');
    add('sock-right', 'M 190 380 L 215 380 L 216 402 L 191 402 Z', c.white, 'feet');
    add('shoe-left', 'M 144 394 Q 152 399 168 394 L 171 411 Q 171 419 163 419 L 126 419 Q 120 414 125 406 Z', c.white, 'feet');
    add('shoe-right', 'M 192 394 Q 208 399 216 394 L 235 406 Q 240 414 234 419 L 197 419 Q 189 419 189 411 Z', c.white, 'feet');
    add('sole-left', 'M 125 414 L 169 414 L 168 420 L 127 420 Z', c.teal, 'feet', 1);
    add('sole-right', 'M 191 414 L 235 414 L 233 420 L 192 420 Z', c.teal, 'feet', 1);
    add('shoe-panel-left', 'M 144 400 Q 151 404 163 400 L 165 409 Q 151 412 136 409 Z', '#E1EAEF', 'feet', 0);
    add('shoe-panel-right', 'M 197 400 Q 209 404 216 400 L 224 409 Q 209 412 195 409 Z', '#E1EAEF', 'feet', 0);
    add('shoe-lace-left', 'M 148 402 Q 153 404 158 402', 'none', 'feet', 1.7, c.teal);
    add('shoe-lace-right', 'M 202 402 Q 207 404 212 402', 'none', 'feet', 1.7, c.teal);
    // No thick perimeter around the hairstyle. Overlapping waves break the contour.
    add('hair-back', 'M 119 125 C 103 109 113 79 133 69 C 148 57 165 55 181 59 C 201 51 223 62 235 79 C 252 93 247 113 245 130 C 240 150 259 153 252 172 C 245 190 266 197 251 213 C 248 219 252 225 258 225 C 244 239 229 233 223 224 C 208 237 190 225 178 228 C 160 240 149 223 137 230 C 121 240 106 229 109 220 C 94 219 95 203 104 194 C 115 181 100 172 106 155 C 110 143 119 138 119 125 Z', c.hair, 'head', 0);
    add('hair-back-left-lock', 'M 119 130 C 96 147 114 161 106 177 C 93 193 111 204 105 217 C 101 227 112 237 123 231 C 111 226 120 217 118 210 C 113 197 125 185 121 175 C 113 156 126 146 131 136 Z', '#483026', 'head', 0);
    add('hair-back-right-lock', 'M 239 132 C 264 144 247 162 258 174 C 270 189 252 203 259 213 C 268 226 254 235 244 231 C 254 222 240 218 245 206 C 254 187 238 182 244 168 C 252 154 236 146 233 142 Z', '#493027', 'head', 0);
    add('hair-back-ribbon', 'M 126 162 C 111 178 131 185 122 202 C 116 214 129 227 139 220 C 132 236 113 222 119 210 C 129 192 111 183 126 162 Z', '#694735', 'head', 0);
    add('hair-back-ribbon-right', 'M 240 161 C 229 178 249 188 237 204 Q 232 214 241 220 C 225 219 226 206 233 195 C 240 182 225 174 240 161 Z', '#674534', 'head', 0);
    add('hair-back-contour-left', 'M 110 147 C 102 166 116 171 107 186 M 107 203 Q 104 216 114 220 M 127 229 Q 139 235 148 225', 'none', 'head', 1.6);
    add('hair-back-contour-right', 'M 249 145 Q 260 156 252 169 M 257 181 Q 263 191 253 201 M 254 218 Q 257 228 247 230', 'none', 'head', 1.6);
    // Dropped shoulders and long soft sleeves; right hand opens slightly outwards.
    for (const [side, x] of [['left', 133], ['right', 227]]) {
      const s = side === 'left' ? -1 : 1, g = `${side}Arm`;
      add(`arm-${side}`, `M ${x} 214 C ${x+s*16} 214 ${x+s*25} 231 ${x+s*24} 247 C ${x+s*25} 263 ${x+s*31} 277 ${x+s*27} 288 Q ${x+s*15} 299 ${x-s*1} 289 C ${x-s*2} 274 ${x-s*7} 260 ${x-s*8} 244 Q ${x-s*13} 225 ${x} 214 Z`, c.navy, g, 2, '#23323C');
      add(`sleeve-light-${side}`, `M ${x+s*8} 224 C ${x+s*23} 238 ${x+s*15} 257 ${x+s*24} 277 Q ${x+s*18} 281 ${x+s*13} 278 C ${x+s*10} 260 ${x+s*12} 244 ${x+s*8} 224 Z`, '#233B49', g, 0);
      add(`sleeve-fold-${side}`, `M ${x+s*6} 268 Q ${x+s*13} 263 ${x+s*22} 267 M ${x+s*5} 276 Q ${x+s*13} 273 ${x+s*18} 276`, 'none', g, 1.2, '#3A4D59');
      add(`cuff-${side}`, `M ${x+s*27} 280 Q ${x+s*30} 287 ${x+s*26} 294 Q ${x+s*13} 300 ${x-s*1} 291 L ${x} 281 Q ${x+s*14} 289 ${x+s*27} 280 Z`, '#253D48', g, 1.5, '#23323C');
      add(`cuff-seam-${side}`, `M ${x+s*1} 285 Q ${x+s*14} 293 ${x+s*27} 285`, 'none', g, 1.3, '#179C95');
      const hand = side === 'left'
        ? 'M 109 296 C 106 300 105 305 107 310 C 108 313 110 314 111 312 C 111 316 115 317 116 313 C 117 317 121 316 121 312 C 122 314 125 312 124 309 C 123 306 121 303 122 301 C 125 305 129 303 126 299 C 124 296 121 295 119 297 Q 114 299 109 296 Z'
        : 'M 236 296 C 235 300 235 304 238 308 C 240 311 244 314 247 314 C 250 315 251 312 248 310 L 245 308 C 249 310 254 313 257 312 C 260 311 258 309 255 308 L 248 304 C 252 306 259 309 261 307 C 263 305 259 303 256 302 L 247 299 C 249 299 252 298 251 296 C 250 294 247 295 245 296 Q 240 298 236 296 Z';
      add(`hand-${side}`, hand, c.skin, g, 1.25, '#B9806C');
      add(`hand-fold-${side}`, side === 'left' ? 'M 115 302 Q 119 304 120 308' : 'M 241 300 Q 243 301 243 304', 'none', g, 1, '#DBA48C');
    }
    add('torso', 'M 149 208 C 139 211 132 222 134 240 Q 136 267 130 289 C 124 303 131 315 144 317 C 166 320 197 324 221 316 Q 234 315 232 302 C 229 285 224 266 228 242 C 232 222 219 211 207 208 Q 178 198 149 208 Z', c.navy, 'body', 2, '#23323C');
    add('hoodie-side-shade', 'M 143 235 Q 155 259 143 288 Q 137 302 153 308 C 175 316 207 310 228 306 L 229 314 Q 183 326 137 313 Q 127 307 134 290 Q 140 261 143 235 Z', '#101C2A', 'body', 0);
    add('hoodie-shoulder-light', 'M 149 213 Q 157 210 165 214 L 159 232 Q 146 237 143 250 C 140 232 143 220 149 213 Z', '#2D4350', 'body', 0);
    add('hoodie-fold-left', 'M 142 262 Q 146 269 140 282 M 139 299 Q 149 296 152 300', 'none', 'body', 1.5, '#354855');
    add('hoodie-fold-right', 'M 216 254 Q 211 268 218 278 M 210 303 Q 218 300 224 303', 'none', 'body', 1.5, '#354855');
    add('hoodie-hem', 'M 135 308 Q 179 321 227 309', 'none', 'body', 2.7, '#30414D');
    add('hood', 'M 146 212 Q 154 198 179 200 Q 204 198 216 213 Q 204 231 185 238 L 178 228 Q 164 232 146 212 Z', '#2B414E', 'body', 1.7, '#23323C');
    add('neck', 'M 169 192 L 191 192 L 194 211 Q 182 224 170 215 L 165 210 Z', c.skin, 'body', 0);
    add('neck-shadow', 'M 169 195 L 191 195 L 192 205 Q 179 212 168 204 Z', '#E8AE92', 'body', 0);
    add('hood-fold', 'M 148 213 Q 163 218 176 228 M 211 213 Q 198 217 188 229', 'none', 'body', 1.2, '#4A6169');
    add('drawstring-left', 'M 160 225 Q 161 238 157 250', 'none', 'body', 2, '#1CAA9F');
    add('drawstring-right', 'M 200 227 Q 199 240 203 254', 'none', 'body', 2, '#1CAA9F');
    add('pocket', 'M 155 278 Q 178 283 203 277 Q 202 290 211 298 Q 182 307 149 298 Q 156 289 155 278 Z', '#1C303E', 'body', 1.4, '#344D59');
    add('pocket-fold', 'M 158 281 Q 159 290 154 293 M 201 281 Q 200 287 204 293', 'none', 'body', 1.5, '#167E7C');
    add('emblem-arc', 'M 184 263 Q 190 250 197 261', 'none', 'body', 3.5, '#D5EEE9');
    add('emblem-spark', 'M 199 248 Q 199 253 204 254 Q 199 255 199 260 Q 198 255 194 254 Q 198 253 199 248 Z', c.yellow, 'body', 0);
    add('ear-left', ellipse(125, 153, 8, 11), c.skin, 'head', 1.2, '#B9806C');
    add('ear-right', ellipse(237, 152, 8, 11), c.skin, 'head', 1.2, '#B9806C');
    add('ear-inner-left', 'M 122 151 Q 128 146 128 157', 'none', 'head', 1.1, '#D99C87');
    add('ear-inner-right', 'M 240 150 Q 234 146 234 156', 'none', 'head', 1.1, '#D99C87');
    // Soft oval with gently tapering cheeks and a rounded V chin, without jaw corners.
    add('face', 'M 129 123 C 127 100 147 87 179 87 C 212 87 234 101 235 125 C 237 145 234 165 226 179 C 216 192 194 208 181 208 C 168 208 146 193 136 179 C 127 165 126 143 129 123 Z', c.skin, 'head', 1.15, '#C4947B');
    add('face-shade', 'M 129 139 C 130 166 149 193 181 204 C 196 204 215 190 226 179 C 216 193 194 208 181 208 C 166 208 145 192 136 179 Q 126 159 129 139 Z', '#EDBDA0', 'head', 0);
    add('face-glow', 'M 142 118 C 156 107 191 103 211 115 C 186 110 163 115 142 118 Z', '#FFDFC4', 'head', 0);
    const sleeping = name === 'sleeping', sleepy = name === 'sleepy' || sleeping;
    const excited = name === 'excited' || name === 'surprised', sad = name === 'sad';
    // Almond/round eyes, not concentric disks. Consistent control-point topology.
    for (const [side, x] of [['left', 153], ['right', 209]]) {
      const left = side === 'left', sign = left ? -1 : 1;
      const ry = sleeping ? 0.12 : sleepy ? 2.3 : excited ? 13.8 : sad ? 10.5 : left ? 11.5 : 12;
      const ey = (sleepy ? 151 : excited ? 145 : 147)+(left ? 0 : -1);
      const rx = left ? 15 : 14.5, ix = x+.4;
      add(`eye-${side}-white`, `M ${x-rx} ${ey} C ${x-rx+1} ${ey-ry*.85} ${x-5} ${ey-ry} ${x+1} ${ey-ry} C ${x+9} ${ey-ry} ${x+rx} ${ey-ry*.4} ${x+rx} ${ey+1} C ${x+rx-1} ${ey+ry*.75} ${x+6} ${ey+ry*.9} ${x} ${ey+ry*.9} C ${x-8} ${ey+ry*.9} ${x-rx+1} ${ey+ry*.5} ${x-rx} ${ey} Z`, '#FFF7EA', 'head', 0);
      add(`eye-${side}-iris`, ellipse(ix, ey, 9, ry*.83), '#805137', 'head', 0);
      add(`eye-${side}-depth`, ellipse(ix, ey-ry*.23, 9, ry*.63), '#4A2E26', 'head', 0);
      add(`eye-${side}-amber`, ellipse(ix, ey+ry*.53, 6.6, ry*.23), '#C28B50', 'head', 0);
      add(`eye-${side}-reflection`, ellipse(ix+4, ey+ry*.48, 2, ry*.13), '#D8AA76', 'head', 0);
      add(`eye-${side}-pupil`, ellipse(ix+.5, ey-ry*.08, 4.4, ry*.64), '#302325', 'head', 0);
      add(`eye-${side}-shine`, ellipse(ix-3, ey-ry*.4, 3, ry*.18), '#FFFDF7', 'head', 0);
      add(`eye-${side}-shine-small`, ellipse(ix+4, ey+ry*.28, 1.3, ry*.09), '#FFF9ED', 'head', 0);
      add(`eye-${side}-shine-rim`, ellipse(ix+4.3, ey-ry*.57, 1, ry*.065), '#EBCFA9', 'head', 0);
      add(`eyelid-${side}`, `M ${x-rx} ${ey} C ${x-rx+1} ${ey-ry*.85} ${x-5} ${ey-ry} ${x+1} ${ey-ry} C ${x+9} ${ey-ry} ${x+rx} ${ey-ry*.4} ${x+rx} ${ey+1}`, 'none', 'head', 2.4, '#49302A');
      add(`eye-${side}-lash`, `M ${x+sign*(rx-1)} ${ey-ry*.27} Q ${x+sign*(rx+3)} ${ey-ry*.2} ${x+sign*(rx+4)} ${ey-ry*.46}`, 'none', 'head', 1.8, '#49302A');
      const by = sleepy ? 135 : excited ? 121 : sad ? 127 : 126;
      add(`brow-${side}`, `M ${x-10} ${by+(sad && left ? 5 : 1)} Q ${x} ${by-(sad ? 2 : excited ? 4 : 1.5)} ${x+9} ${by+(sad && !left ? 5 : 1)}`, 'none', 'head', 3.4, '#56392D');
      const cy = sleepy ? 172 : excited ? 168 : 170;
      add(`cheek-${side}`, ellipse(x+sign*9, cy, 10, 4.5), '#F2BAA4', 'head', 0);
      add(`cheek-${side}-soft`, ellipse(x+sign*9, cy, 7.2, 2.8), '#EEAB9B', 'head', 0);
      add(`cheek-${side}-glow`, ellipse(x+sign*10-1, cy-1.4, 2.8, .8), '#FCD2B7', 'head', 0);
    }
    add('nose', 'M 179 163 Q 178 166 181 166', 'none', 'head', 1, '#CE9A7F');
    // Every mouth uses MCCZ, including the collapsed teeth: safe to interrupt.
    const mouths = {
      happy: ['M 167 177 C 175 181 188 180 194 176 C 190 192 174 194 167 177 Z', 'M 169 178 C 177 181 187 180 192 177 C 187 183 175 184 169 178 Z', 'M 175 188 C 180 184 185 184 189 186 C 185 191 179 192 175 188 Z'],
      sleepy: ['M 176 181 C 175 173 186 173 187 181 C 189 195 176 197 176 181 Z', 'M 181 176 C 181 176 181 176 181 176 C 181 176 181 176 181 176 Z', 'M 179 190 C 181 188 184 188 185 190 C 183 193 181 193 179 190 Z'],
      excited: ['M 164 174 C 175 179 187 179 197 171 C 194 201 170 202 164 174 Z', 'M 167 176 C 176 179 187 178 194 174 C 190 184 174 186 167 176 Z', 'M 174 192 C 180 186 188 185 191 189 C 186 197 179 198 174 192 Z'],
      sad: ['M 172 184 C 177 178 185 178 190 182 C 183 180 179 181 172 184 Z', 'M 180 180 C 180 180 180 180 180 180 C 180 180 180 180 180 180 Z', 'M 181 180 C 181 180 181 180 181 180 C 181 180 181 180 181 180 Z'],
    };
    const expression = mouths[name] || mouths[name === 'sleeping' || name === 'surprised' ? 'sleepy' : 'happy'];
    add('mouth', expression[0], '#81464A', 'head', 1, '#A36259');
    add('mouth-light', expression[1], '#FFF9F0', 'head', 0);
    add('mouth-tongue', expression[2], '#E99195', 'head', 0);
    // Front hair is painted AFTER the face: bangs tuck into the temples, not a cap.
    add('hair-fringe', 'M 117 132 C 108 114 117 84 136 73 C 153 60 172 60 181 64 C 198 57 219 68 229 80 C 242 91 246 110 238 132 C 231 124 224 113 218 104 Q 203 96 197 87 C 187 107 170 117 155 119 Q 161 111 164 104 C 148 120 133 123 117 132 Z', c.hair, 'head', 0);
    add('hair-part-shadow', 'M 190 69 C 187 89 171 109 153 119 C 168 109 178 89 178 75 Q 181 68 190 69 Z', '#2D211E', 'head', 0);
    add('hair-sweep', 'M 124 108 C 132 82 157 65 180 69 C 160 75 148 88 137 100 Q 129 108 124 108 Z', '#624231', 'head', 0);
    add('hair-bang-layer', 'M 129 115 C 151 101 165 84 168 75 C 167 92 153 111 139 116 Q 132 119 129 115 Z', '#79523B', 'head', 0);
    add('hair-bang-right', 'M 194 72 C 215 72 230 91 235 112 C 223 102 221 87 211 84 Q 201 79 194 72 Z', '#624231', 'head', 0);
    add('hair-bang-sweep', 'M 145 104 Q 161 89 165 78 M 175 105 Q 185 93 189 81', 'none', 'head', 1.2, '#926448');
    add('hair-fringe-contour', 'M 119 124 Q 123 115 132 107 M 155 119 Q 180 107 194 87 M 219 104 Q 229 115 234 125', 'none', 'head', 1.3, '#2F2421');
    add('hair-wave-left', 'M 126 119 C 116 131 116 146 124 158 C 134 169 130 178 122 184 C 140 181 141 167 133 155 C 126 143 131 132 136 123 Z', c.hair, 'head', 0);
    add('hair-lock-left-light', 'M 125 129 C 120 147 135 158 131 169 C 133 155 122 146 125 129 Z', '#79523B', 'head', 0);
    add('hair-loose-left', 'M 119 151 C 112 162 125 172 117 183 Q 113 190 119 193', 'none', 'head', 2.3, '#654330');
    add('hair-wave-right', 'M 233 119 C 245 130 242 147 235 157 C 225 169 232 178 240 182 C 223 181 220 167 227 154 C 233 142 228 130 223 124 Z', c.hair, 'head', 0);
    add('hair-lock-right-light', 'M 237 130 C 241 143 228 156 230 167 Q 228 174 235 177 C 222 170 232 155 234 148 Q 239 139 237 130 Z', '#79523B', 'head', 0);
    add('hair-loose-right', 'M 245 157 C 255 167 242 179 247 186 Q 250 191 246 195', 'none', 'head', 2, '#654330');
    add('hair-crown-contour', 'M 119 102 C 124 78 150 59 175 62 M 192 60 Q 223 61 239 91', 'none', 'head', 1.4, '#4B3429');
    add('hair-shine', 'M 134 85 Q 148 73 162 71 M 206 75 Q 217 81 222 91', 'none', 'head', 2.3, '#936448');
    add('hair-cowlick', 'M 175 65 C 180 54 175 47 164 48 C 176 41 190 48 185 61 Q 183 65 175 65 Z', c.hair, 'head', 0);
    add('hair-cowlick-light', 'M 172 48 Q 184 49 181 58', 'none', 'head', 1.5, '#956548');
    add('hair-clip', 'M 227 99 Q 229 96 230 100 L 232 105 L 238 106 Q 240 107 237 109 L 233 112 L 233 118 Q 233 120 231 118 L 226 115 L 221 117 Q 218 119 220 115 L 221 110 L 217 107 Q 215 104 219 104 L 224 104 Z', c.yellow, 'head', 1, '#AC772F');
    add('hair-clip-light', 'M 227 102 L 229 108 L 234 108 L 230 111 L 230 115 L 226 112 L 222 114 L 224 109 L 221 107 L 225 107 Z', '#FFE7A1', 'head', 0);
    const upper = Object.keys(paths).filter(id => paths[id]._group !== 'feet');
    const eyes = Object.keys(paths).filter(id => id.startsWith('eye-') || id.startsWith('eyelid-')).map(id => `#path-${id}`).join(',');
    states[name] = { paths, idle: { kind: 'compound', parts: [
      ...upper.map(id => ({ kind: 'breathe-y', selector: `#path-${id}`, origin: `${tuning.anchors.body[0]}px ${tuning.anchors.body[1]}px`, amplitude: tuning.breathing.amplitude, duration: tuning.breathing.duration })),
      // Native skill primitives keep the downloadable Studio file animated too.
      ...Object.keys(paths).filter(id => {
        const group = paths[id]._group;
        return (name === 'walking' && (group === 'feet' || group.endsWith('Arm'))) ||
          (name === 'greeting' && group === 'rightArm') ||
          (name === 'excited' && group.endsWith('Arm'));
      }).map(id => {
        const group = paths[id]._group, left = group === 'leftArm' || id.endsWith('-left');
        return { kind: 'rotate-around-point', selector: `#path-${id}`,
          pivot: group === 'feet' ? [left ? 155 : 205, 313] : tuning.anchors[group],
          amplitude: name === 'walking' ? (left ? 8 : -8) : name === 'greeting' ? 13 : (left ? 5 : -5),
          duration: name === 'walking' ? 1.05 : name === 'greeting' ? 0.65 : 0.8 };
      }),
      { kind: 'blink', selectorAll: eyes, period: tuning.blink.interval, blinkDuration: tuning.blink.duration, minScale: sleeping ? 1 : 0.06 },
    ] } };
  }
  window.STATES_DATA = states;
})();
