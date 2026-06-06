/* ============================================================
   MAYLO v3 — robot asistente premium (Wall·E / EVE / Baymax DNA)
   window.maylo(opts) -> SVG markup string  (API unchanged)
     eyes  : 'open'|'blink'|'wink'|'happy'|'curious'
     mouth : kept for compat -> drives chest status ('talk' = active)
     arms  : 'wave'|'welcome'|'point'
     glow  : true|false
     body  : color override (default brand violet -> full 3D gradient)
     panel : show chest status screen
   Dance hooks: .my-wave .my-armL .my-legL .my-legR
   ============================================================ */
(function () {
  const BRAND = '#7F77DD';
  let _uid = 0;

  function maylo(opts) {
    const o = Object.assign({ eyes: 'open', mouth: 'smile', arms: 'wave', glow: true, panel: true, body: BRAND }, opts || {});
    const id = 'm' + (_uid++);
    const grad = (o.body === BRAND);

    // palette
    const P = {
      hi: '#9A8EF7', mid: '#6E61D8', dp: '#493BA6', dpr: '#33237C', edge: '#180F44',
      jHi: '#B8AFF6', jMid: '#7C6FD6', jDp: '#46399A',
      mHi: '#DADCF6', mMid: '#9DA2D8', mDp: '#585CA0',
      visH: '#2C2560', visD: '#0A0722',
      lensH: '#322A66', lensD: '#0B0822',
      yel: '#F5C400', yelH: '#FFE680', cyan: '#27C3D8', blue: '#5A82EE',
      stroke: '#150D3A',
    };
    const main = grad ? `url(#${id}body)` : o.body;
    const headF = grad ? `url(#${id}head)` : o.body;
    const stroke = grad ? P.stroke : 'rgba(0,0,0,.14)';
    const sw = 3;
    const S = `stroke="${stroke}" stroke-width="${sw}"`;
    const Sj = `stroke="${stroke}" stroke-width="2.4"`;

    /* ---------- defs ---------- */
    const defs = `<defs>
      <linearGradient id="${id}head" x1=".2" y1="0" x2=".7" y2="1">
        <stop offset="0" stop-color="${grad ? P.hi : o.body}"/>
        <stop offset=".55" stop-color="${grad ? P.mid : o.body}"/>
        <stop offset="1" stop-color="${grad ? P.dp : o.body}"/>
      </linearGradient>
      <linearGradient id="${id}body" x1=".2" y1="0" x2=".8" y2="1">
        <stop offset="0" stop-color="${grad ? '#897CEC' : o.body}"/>
        <stop offset=".6" stop-color="${grad ? P.mid : o.body}"/>
        <stop offset="1" stop-color="${grad ? P.dpr : o.body}"/>
      </linearGradient>
      <radialGradient id="${id}joint" cx=".35" cy=".3" r=".8">
        <stop offset="0" stop-color="${grad ? P.jHi : o.body}"/>
        <stop offset="1" stop-color="${grad ? P.jDp : o.body}"/>
      </radialGradient>
      <radialGradient id="${id}metal" cx=".35" cy=".28" r=".85">
        <stop offset="0" stop-color="${P.mHi}"/>
        <stop offset=".6" stop-color="${P.mMid}"/>
        <stop offset="1" stop-color="${P.mDp}"/>
      </radialGradient>
      <linearGradient id="${id}visor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${P.visH}"/>
        <stop offset="1" stop-color="${P.visD}"/>
      </linearGradient>
      <radialGradient id="${id}lens" cx=".4" cy=".34" r=".8">
        <stop offset="0" stop-color="${P.lensH}"/>
        <stop offset="1" stop-color="${P.lensD}"/>
      </radialGradient>
      <radialGradient id="${id}iris" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="${P.yelH}"/>
        <stop offset=".55" stop-color="${P.yel}"/>
        <stop offset="1" stop-color="#C99A00"/>
      </radialGradient>
      <filter id="${id}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
      <filter id="${id}gl" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <clipPath id="${id}hclip"><rect x="44" y="30" width="172" height="122" rx="46"/></clipPath>
      <clipPath id="${id}bclip"><rect x="64" y="168" width="132" height="94" rx="38"/></clipPath>
    </defs>`;
    const gl = o.glow ? `filter="url(#${id}gl)"` : '';

    /* ---------- helpers ---------- */
    const ball = (cx, cy, r) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}joint)" ${Sj}/>
       <circle cx="${cx - r * .32}" cy="${cy - r * .34}" r="${r * .34}" fill="#fff" opacity=".28"/>`;
    const seg = (x, y, w, h, rot, px, py) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${main}" ${S} transform="rotate(${rot} ${px} ${py})"/>`;

    /* ---------- ground shadow ---------- */
    const ground = `<ellipse cx="130" cy="320" rx="80" ry="13" fill="#000" opacity=".4" filter="url(#${id}soft)"/>`;

    /* ---------- legs (hip · thigh · knee · foot) ---------- */
    const leg = (cls, hx) => `
      <g class="${cls}" style="transform-box:fill-box;transform-origin:50% 4%">
        ${seg(hx - 8, 250, 18, 34, 0, hx, 252)}
        <rect x="${hx - 21}" y="296" width="42" height="20" rx="9" fill="${main}" ${S}/>
        <rect x="${hx - 21}" y="306" width="42" height="10" rx="5" fill="${P.edge}" opacity=".55"/>
        ${ball(hx, 252, 10)}
        ${ball(hx, 282, 8)}
      </g>`;
    const legs = leg('my-legL', 110) + leg('my-legR', 150);

    /* ---------- arms (shoulder · upper · elbow · fore · hand) ---------- */
    function armDown(cls, sx, dir) {
      const f = dir; // +1 right, -1 left
      return `<g class="${cls}" style="transform-box:fill-box;transform-origin:50% 14%">
        ${seg(sx - 11, 184, 22, 42, 7 * f, sx, 188)}
        ${seg(sx - 11 + 5 * f, 222, 20, 40, 4 * f, sx + 4 * f, 226)}
        <g>${ball(sx + 9 * f, 262, 14)}<circle cx="${sx + 9 * f}" cy="262" r="6" fill="${P.edge}" opacity=".4"/></g>
        ${ball(sx, 184, 13)}
        ${ball(sx + 6 * f, 224, 10)}
      </g>`;
    }
    function armUp(cls, sx) {
      return `<g class="${cls}" style="transform-box:fill-box;transform-origin:50% 90%">
        ${seg(sx - 11, 150, 22, 46, 26, sx, 192)}
        ${seg(sx + 6, 108, 20, 46, 12, sx + 14, 150)}
        <g>${ball(sx + 22, 100, 14)}
           <rect x="${sx + 14}" y="78" width="8" height="20" rx="4" fill="${main}" ${Sj} transform="rotate(-14 ${sx + 18} 96)"/>
           <rect x="${sx + 24}" y="78" width="8" height="20" rx="4" fill="${main}" ${Sj} transform="rotate(8 ${sx + 28} 96)"/>
        </g>
        ${ball(sx, 188, 13)}
        ${ball(sx + 12, 150, 10)}
      </g>`;
    }
    let arms;
    if (o.arms === 'wave') arms = armDown('my-armL', 72, -1) + armUp('my-wave', 188);
    else if (o.arms === 'point') arms = armDown('my-armL', 72, -1) +
      `<g class="my-wave">${seg(186, 196, 48, 20, 4, 188, 206)}${ball(188, 196, 13)}${ball(232, 200, 11)}</g>`;
    else arms = armDown('my-armL', 72, -1) + armDown('my-wave', 188, 1);

    /* ---------- neck (telescoping) ---------- */
    const neck = `
      <rect x="106" y="150" width="48" height="26" rx="11" fill="url(#${id}joint)" ${S}/>
      <rect x="110" y="156" width="40" height="4" rx="2" fill="${P.edge}" opacity=".5"/>
      <rect x="110" y="164" width="40" height="4" rx="2" fill="${P.edge}" opacity=".5"/>`;

    /* ---------- torso ---------- */
    let panel = '';
    if (o.panel) {
      const talk = o.mouth === 'talk';
      panel = `
        <rect x="92" y="194" width="76" height="40" rx="12" fill="url(#${id}visor)" ${Sj}/>
        <rect x="96" y="198" width="68" height="11" rx="5.5" fill="#fff" opacity=".07"/>
        <circle cx="108" cy="220" r="5" fill="${P.cyan || P.cyan}" ${gl}/>
        <circle cx="108" cy="220" r="5" fill="${P.cyan}"/>
        <rect x="120" y="215" width="${talk ? 9 : 11}" height="10" rx="5" fill="${P.yel}"/>
        <circle cx="${talk ? 142 : 144}" cy="220" r="5" fill="${P.blue}"/>
        ${talk ? `<rect x="150" y="214" width="4" height="12" rx="2" fill="${P.cyan}"/>` : ''}`;
    }
    const torso = `
      <rect x="64" y="168" width="132" height="94" rx="38" fill="${main}" ${S}/>
      <g clip-path="url(#${id}bclip)">
        <ellipse cx="104" cy="178" rx="46" ry="20" fill="#fff" opacity=".14"/>
        <ellipse cx="150" cy="262" rx="70" ry="30" fill="${P.edge}" opacity=".4"/>
        <rect x="186" y="176" width="6" height="80" rx="3" fill="${P.cyan}" opacity=".5"/>
        <path d="M74 186 h16 M74 193 h13 M74 200 h16" stroke="${P.edge}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
      </g>
      ${panel}
      <rect x="70" y="240" width="20" height="14" rx="5" fill="${P.dpr}" ${Sj}/>
      <circle cx="76" cy="247" r="1.7" fill="${P.edge}"/><circle cx="84" cy="247" r="1.7" fill="${P.edge}"/>
      <rect x="170" y="240" width="20" height="14" rx="5" fill="${P.dpr}" ${Sj}/>
      <circle cx="176" cy="247" r="1.7" fill="${P.edge}"/><circle cx="184" cy="247" r="1.7" fill="${P.edge}"/>`;

    /* ---------- head shell ---------- */
    const sensor = `
      <rect x="126" y="8" width="8" height="26" rx="4" fill="url(#${id}joint)" ${Sj}/>
      <g ${gl}><circle cx="130" cy="9" r="6.5" fill="${P.cyan}"/></g>`;
    const earL = `<circle cx="48" cy="98" r="11" fill="url(#${id}metal)" ${Sj}/><circle cx="48" cy="98" r="4.5" fill="${P.cyan}" ${gl}/>`;
    const earR = `<circle cx="212" cy="98" r="11" fill="url(#${id}metal)" ${Sj}/><circle cx="212" cy="98" r="4.5" fill="${P.blue}"/>`;
    const actuators = `
      <rect x="38" y="76" width="16" height="44" rx="8" fill="url(#${id}metal)" ${Sj}/>
      <rect x="206" y="76" width="16" height="44" rx="8" fill="url(#${id}metal)" ${Sj}/>`;
    const headShell = `
      <rect x="44" y="30" width="172" height="122" rx="46" fill="${headF}" ${S}/>
      <g clip-path="url(#${id}hclip)">
        <ellipse cx="96" cy="48" rx="60" ry="26" fill="#fff" opacity=".16"/>
        <ellipse cx="170" cy="150" rx="80" ry="34" fill="${P.edge}" opacity=".38"/>
        <rect x="206" y="36" width="8" height="110" rx="4" fill="${P.cyan}" opacity=".35"/>
      </g>
      <circle cx="60" cy="44" r="2.6" fill="${P.edge}" opacity=".6"/>
      <circle cx="200" cy="44" r="2.6" fill="${P.edge}" opacity=".6"/>`;

    /* ---------- visor + eyes ---------- */
    function lids(cx, cy, R, mode, side) {
      const cid = `${id}e${side}`;
      let shapes = '';
      const lidF = `fill="url(#${id}visor)"`;
      // subtle intelligent top hood by default
      const hood = `<path d="M${cx - R - 2} ${cy - R} h${2 * R + 4} v6 q-${R} ${R * .5} -${2 * R} 0 z" ${lidF}/>`;
      if (mode === 'blink') shapes = `<rect x="${cx - R - 2}" y="${cy - R - 2}" width="${2 * R + 4}" height="${R + 4}" ${lidF}/>
        <rect x="${cx - R - 2}" y="${cy + R - 6}" width="${2 * R + 4}" height="${R + 8}" ${lidF}/>`;
      else if (mode === 'happy') shapes = `<path d="M${cx - R - 2} ${cy + R} h${2 * R + 4} v-${R + 4} q-${R} -${R * .9} -${2 * R} 0 z" ${lidF}/>`;
      else if (mode === 'curious') shapes = hood.replace('h' + (2 * R + 4), 'h' + (2 * R + 4)).replace('v6', 'v3');
      else shapes = hood; // open
      return `<g clip-path="url(#${cid})">${shapes}</g>`;
    }
    function lens(cx, cy, R, side, mode) {
      return `
        <clipPath id="${id}e${side}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}metal)" ${S}/>
        <circle cx="${cx}" cy="${cy}" r="${R - 5}" fill="${P.dpr}"/>
        <circle cx="${cx}" cy="${cy}" r="${R - 9}" fill="url(#${id}lens)"/>
        <g ${gl}><circle cx="${cx}" cy="${cy}" r="${R - 14}" fill="url(#${id}iris)"/></g>
        <circle cx="${cx}" cy="${cy}" r="${R - 14}" fill="none" stroke="${P.cyan}" stroke-width="2.2" opacity=".8"/>
        <circle cx="${cx}" cy="${cy}" r="${R - 21}" fill="${P.lensD}"/>
        <circle cx="${cx - R * .3}" cy="${cy - R * .34}" r="${R * .2}" fill="#fff" opacity=".9"/>
        <circle cx="${cx + R * .28}" cy="${cy + R * .3}" r="${R * .09}" fill="${P.cyan}" opacity=".8"/>
        ${lids(cx, cy, R, mode, side)}
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" ${S}/>`;
    }
    const elx = 100, erx = 160, ey = 92, R = 30;
    const mode = (['blink', 'wink', 'happy', 'curious'].includes(o.eyes)) ? o.eyes : 'open';
    const leftMode = o.eyes === 'wink' ? 'blink' : mode;
    const rightMode = o.eyes === 'wink' ? 'open' : mode;
    const visor = `
      <rect x="58" y="50" width="144" height="86" rx="36" fill="url(#${id}visor)" ${S}/>
      <rect x="66" y="56" width="128" height="20" rx="10" fill="#fff" opacity=".06"/>
      ${lens(elx, ey, R, 'L', leftMode)}
      ${lens(erx, ey, R, 'R', rightMode)}
      <rect x="120" y="84" width="20" height="16" rx="8" fill="url(#${id}metal)" ${Sj}/>`;

    /* ---------- assemble (back -> front) ---------- */
    return `<svg viewBox="0 0 260 332" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Maylo">
      ${defs}
      ${ground}
      ${legs}
      ${arms}
      ${neck}
      ${torso}
      ${sensor}
      ${actuators}
      ${earL}${earR}
      ${headShell}
      ${visor}
    </svg>`;
  }

  window.maylo = maylo;
  window.MAYLO_COLORS = { violet: BRAND, yellow: '#F5C400', cyan: '#27C3D8', blue: '#5A82EE' };
})();
