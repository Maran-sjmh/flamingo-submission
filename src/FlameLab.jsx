import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowUpRight, Info, Wind, Gauge, Orbit, Droplet, Flame, Minus, Plus, RotateCcw, Trophy, Check, Power, Terminal, FolderOpen, Gamepad2} from 'lucide-react';
import {flameGravities, flamePresets} from './learn-habitats';
import {investigations} from './investigation-catalog';

const byAccession = Object.fromEntries(investigations.map(s => [s.accession, s]));

/* Qualitative, illustrative rules. Not a combustion model. */
function describe({g, o2, flow, fuel}) {
 // Arbitrary game cutoff: never publish this number as an experimental or safety limit.
 const limit = g > .1 ? 16 : flow < 2 ? 19 : flow <= 20 ? 15 : 15 + (flow - 20) * .12;
 const alive = o2 >= limit;
 const buoy = Math.sqrt(g);
 const shape = !alive ? 'Off in this illustration' : g < .05 && flow < 2 ? 'Sphere' : flow > 2 * (1 + buoy * 4) ? 'Bent by airflow' : g < .3 ? 'Broad and elongated' : 'Tall teardrop';
 const sooty = (buoy * .9 + flow / 60) * (.5 + (o2 - 15) / 25) > .45;
 const color = !alive ? '—' : sooty ? 'Yellow and bright' : 'Blue and dim';
 const size = !alive ? '—' : o2 >= 30 ? 'Large and bright' : o2 >= 21 ? 'Normal' : 'Small and dim';
 const intensity = !alive ? 0 : Math.min(100, Math.round(((o2 - 14) / 26) * 70 + buoy * 20 + Math.min(flow, 20) / 2));
 const why = [];
 if (!alive) why.push(g < .05 && flow < 2 ? 'This game turns the illustration off at low oxygen. Real extinction depends on fuel, pressure, heat loss and flow; this is not a measured threshold.' : 'This oxygen setting turns the drawing off under the game rules. It does not establish a real extinction limit.');
 else {
  if (g >= .9) why.push('On Earth, buoyancy makes hot gas rise. This can stretch a flame upward and bring fresh air toward it.');
  else if (g > .05) why.push('At reduced gravity, buoyancy is weaker. This drawing illustrates a possible shape change; it is not a lunar or Martian prediction.');
  else why.push('In microgravity, buoyant flow is greatly reduced. Droplet flames can become approximately spherical when other flows are small.');
  if (flow > 1) why.push(`The airflow setting (${flow} cm/s) changes this illustration. Real airflow affects oxygen transport and flame shape.`);
  if (o2 >= 30) why.push('More oxygen makes this drawing brighter. Real burning rates depend on additional conditions, including pressure and fuel.');
  if (fuel === 'droplet' && g < .05) why.push('FLEX studied droplet combustion in microgravity. Open its investigation to examine the actual evidence.');
 }
 return {alive, limit, shape, color, size, intensity, sooty, why};
}

const challenges = [
 {id: 'sphere', title: 'Make a blue sphere', hint: 'Hint: try microgravity with little airflow.', test: (s, p) => s.shape === 'Sphere'},
 {id: 'out', title: 'Turn the drawing off', hint: 'Hint: lower oxygen in the game.', test: s => !s.alive},
 {id: 'wind', title: 'Bend it with airflow', hint: 'Hint: increase the airflow setting.', test: s => s.shape === 'Bent by airflow'},
 {id: 'moon', title: 'Try a candle at lunar gravity', hint: 'Hint: a sealed chamber at 0.17 g.', test: (s, p) => s.alive && p.gid === 'moon' && p.fuel === 'candle'},
 {id: 'giant', title: 'Make a larger drawing', hint: 'Hint: increase oxygen in the game.', test: s => s.alive && s.size === 'Large and bright'},
 {id: 'flex', title: 'Explore a droplet in orbit', hint: 'Hint: choose droplet fuel.', test: (s, p) => s.alive && p.fuel === 'droplet' && p.gid === 'orbit'},
];

function Typewriter({lines}) {
 const text = lines.join('\n');
 const [n, setN] = useState(0);
 useEffect(() => {
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(text.length); return; }
  setN(0); let i = 0; const id = setInterval(() => { i += 2; setN(i); if (i >= text.length) clearInterval(id); }, 16);
  return () => clearInterval(id);
 }, [text]);
 return <pre className="lab-terminal-text">{text.slice(0, n)}<span className="lab-cursor">▌</span></pre>;
}

function Stepper({icon: Icon, label, value, unit, min, max, step, onChange, marks}) {
 const pct = ((value - min) / (max - min)) * 100;
 const set = v => onChange(Math.max(min, Math.min(max, Math.round(v / step) * step)));
 return <div className="lab-module">
  <div className="lab-module-head"><span><Icon size={15}/>{label}</span><i className="lab-led on"/></div>
  <div className="lab-readout">
   <button className="lab-key" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Decrease ${label}`}><Minus size={18}/></button>
   <output className="lab-digits">{value}<small>{unit}</small></output>
   <button className="lab-key" onClick={() => set(value + step)} disabled={value >= max} aria-label={`Increase ${label}`}><Plus size={18}/></button>
  </div>
  <input className="lab-fader" type="range" min={min} max={max} step={step} value={value} onChange={e => set(+e.target.value)} aria-label={label} style={{'--pct': `${pct}%`}}/>
  <div className="lab-marks">{marks.map(m => <span key={m}>{m}</span>)}</div>
 </div>;
}

export default function FlameLab() {
 const [gid, setGid] = useState('earth');
 const [o2, setO2] = useState(21);
 const [flow, setFlow] = useState(0);
 const [fuel, setFuel] = useState('candle');
 const [done, setDone] = useState([]);
 const [toast, setToast] = useState(null);
 const g = flameGravities.find(x => x.id === gid).g;
 const state = useMemo(() => describe({g, o2, flow, fuel}), [g, o2, flow, fuel]);
 const canvasRef = useRef(null);
 const params = useRef({});
 params.current = {g, o2, flow, fuel, alive: state.alive};

 // Challenge tracking.
 useEffect(() => {
  const now = challenges.filter(c => !done.includes(c.id) && c.test(state, {gid, fuel}));
  if (!now.length) return;
  setDone(d => [...d, ...now.map(c => c.id)]);
  setToast(now[0].title);
  const t = setTimeout(() => setToast(null), 2600);
  return () => clearTimeout(t);
 }, [state, gid, fuel]);

 useEffect(() => {
  const canvas = canvasRef.current, ctx = canvas.getContext('2d');
  if (!ctx) return;
  let frame, last = performance.now(), t = 0, life = 1;
  const smoke = [], sparks = [];
  const sm = {g: 1, o2: 21, flow: 0};
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const resize = () => { const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2); canvas.width = r.width * d; canvas.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const draw = now => {
   const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
   const p = params.current;
   for (const k of ['g', 'o2', 'flow']) sm[k] += (p[k] - sm[k]) * Math.min(1, dt * 3);
   life += ((p.alive ? 1 : 0) - life) * Math.min(1, dt * (p.alive ? 2 : 1.2));
   const W = canvas.clientWidth, H = canvas.clientHeight;
   const S = Math.min(W / 300, H / 560);
   const cx = W / 2, cy = p.fuel === 'candle' ? H * .6 : H * .46;
   const buoy = Math.sqrt(Math.max(0, sm.g)), o = Math.max(0, (sm.o2 - 14) / 26);
   const soot = Math.min(1, (buoy * .9 + sm.flow / 60) * (.5 + o)) * life;

   // Chamber background with warm light that depends on the flame.
   ctx.fillStyle = '#03060a'; ctx.fillRect(0, 0, W, H);
   const room = ctx.createRadialGradient(cx, cy - 60 * S, 0, cx, cy - 60 * S, Math.max(W, H) * .8);
   room.addColorStop(0, `rgba(255,150,70,${.22 * life * (.3 + soot)})`); room.addColorStop(.35, `rgba(60,90,160,${.08 * life})`); room.addColorStop(1, 'rgba(0,0,0,0)');
   ctx.fillStyle = room; ctx.fillRect(0, 0, W, H);
   ctx.strokeStyle = '#ffffff0c'; ctx.lineWidth = 1;
   for (let x = (W / 2) % 32; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
   for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
   // Height ruler.
   ctx.fillStyle = '#ffffff40'; ctx.font = `${10}px monospace`;
   for (let i = 0; i <= 6; i++) { const y = cy - i * 40 * S; ctx.fillRect(14, y, i % 2 ? 6 : 12, 1); if (!(i % 2)) ctx.fillText(`${i}`, 30, y + 3); }
   // Airflow streaks.
   if (sm.flow > .5) {
    ctx.strokeStyle = `rgba(120,180,255,${Math.min(.4, sm.flow / 50)})`; ctx.lineWidth = 1.3;
    for (let i = 0; i < 18; i++) { const y = (i + .5) * H / 18, x = ((t * sm.flow * 10 + i * 97) % (W + 140)) - 70; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 24 + sm.flow * 1.4, y); ctx.stroke(); }
   }
   // Fuel.
   const wickTop = cy - 10 * S;
   if (p.fuel === 'candle') {
    const cw = 64 * S, top = cy;
    const body = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
    body.addColorStop(0, '#b9ab93'); body.addColorStop(.35, '#f6efe1'); body.addColorStop(.6, '#efe6d3'); body.addColorStop(1, '#a8987d');
    ctx.fillStyle = body; ctx.fillRect(cx - cw / 2, top, cw, H - top);
    // Light from the flame on the wax.
    const lit = ctx.createRadialGradient(cx, top, 0, cx, top, cw * 1.4);
    lit.addColorStop(0, `rgba(255,190,110,${.55 * life * (.3 + soot)})`); lit.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = lit; ctx.fillRect(cx - cw / 2, top, cw, cw * 1.4);
    // Melted pool and a drip.
    ctx.fillStyle = '#fff6e4'; ctx.beginPath(); ctx.ellipse(cx, top, cw / 2, 7 * S, 0, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,200,120,${.35 * life})`; ctx.beginPath(); ctx.ellipse(cx, top, cw / 2.6, 4 * S, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f3ead8'; ctx.beginPath(); ctx.moveTo(cx + cw * .28, top); ctx.quadraticCurveTo(cx + cw * .36, top + 30 * S, cx + cw * .3, top + 48 * S); ctx.arc(cx + cw * .3, top + 48 * S, 4 * S, 0, Math.PI); ctx.quadraticCurveTo(cx + cw * .2, top + 20 * S, cx + cw * .2, top); ctx.fill();
    // Wick with glowing tip.
    ctx.strokeStyle = '#1d1712'; ctx.lineWidth = 3.4 * S; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, top + 2 * S); ctx.quadraticCurveTo(cx + 2 * S, top - 6 * S, cx + 1 * S, wickTop); ctx.stroke();
    ctx.fillStyle = `rgba(255,120,40,${.9 * life})`; ctx.beginPath(); ctx.arc(cx + 1 * S, wickTop, 2.2 * S, 0, 7); ctx.fill();
   } else {
    ctx.strokeStyle = '#8a96a6'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - 150 * S, cy + 70 * S); ctx.lineTo(cx, cy); ctx.lineTo(cx + 150 * S, cy + 70 * S); ctx.stroke();
    const dg = ctx.createRadialGradient(cx - 3 * S, cy - 3 * S, 0, cx, cy, 9 * S); dg.addColorStop(0, '#ffffff'); dg.addColorStop(1, '#7f95b2');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(cx, cy, 9 * S, 0, 7); ctx.fill();
   }
   // Flame geometry.
   const base = (p.fuel === 'candle' ? 44 : 52) * S * (.72 + o * .9) * life;
   const height = base * (1 + buoy * 2.5 + sm.flow / 28);
   const width = base * (1.05 + (1 - buoy) * .3);
   const tilt = Math.min(1, sm.flow / (6 + buoy * 30));
   const flick = reduce ? 0 : buoy * (Math.sin(t * 11) * .05 + Math.sin(t * 17.3) * .035);
   const sway = reduce ? 0 : buoy * Math.sin(t * 2.3) * .03;
   const lift = p.fuel === 'candle' ? width * .55 * (1 - buoy) : 0;
   const anchorY = p.fuel === 'candle' ? wickTop : cy;
   const fx = cx + tilt * height * .55, fy = anchorY - Math.max(0, height - width) * .5 * (1 - tilt * .6) - lift;
   if (life > .02) {
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(tilt * .9 + sway); ctx.scale(1, (height / width) * (1 + flick));
    ctx.globalCompositeOperation = 'lighter';
    // Outer halo.
    let gr = ctx.createRadialGradient(0, 0, width * .6, 0, 0, width * 2.1);
    gr.addColorStop(0, `rgba(255,140,60,${.18 * life * (.3 + soot)})`); gr.addColorStop(1, 'rgba(255,100,40,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, width * 2.1, 0, 7); ctx.fill();
    // Blue reaction zone.
    gr = ctx.createRadialGradient(0, 0, width * .25, 0, 0, width * 1.22);
    gr.addColorStop(0, 'rgba(70,120,255,0)'); gr.addColorStop(.62, `rgba(70,130,255,${.6 * life})`); gr.addColorStop(.82, `rgba(40,80,230,${.28 * life})`); gr.addColorStop(1, 'rgba(20,40,160,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, width * 1.22, 0, 7); ctx.fill();
    // Luminous soot body.
    if (soot > .05) {
     gr = ctx.createRadialGradient(0, -width * .3 * buoy, 0, 0, -width * .1, width * .98);
     gr.addColorStop(0, `rgba(255,252,225,${.98 * soot})`); gr.addColorStop(.3, `rgba(255,215,100,${.9 * soot})`); gr.addColorStop(.7, `rgba(255,130,35,${.5 * soot})`); gr.addColorStop(1, 'rgba(255,80,0,0)');
     ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, width * .98, 0, 7); ctx.fill();
    }
    ctx.restore();
    // Dark non-luminous core and blue cup near the wick (buoyant flames).
    if (p.fuel === 'candle' && buoy > .3) {
     ctx.save(); ctx.translate(cx + tilt * 6 * S, wickTop - 10 * S);
     ctx.fillStyle = `rgba(20,30,60,${.35 * life * buoy})`; ctx.beginPath(); ctx.ellipse(0, -4 * S, 5 * S, 13 * S, 0, 0, 7); ctx.fill();
     ctx.globalCompositeOperation = 'lighter';
     const cup = ctx.createRadialGradient(0, 8 * S, 0, 0, 8 * S, 16 * S); cup.addColorStop(0, `rgba(90,150,255,${.7 * life})`); cup.addColorStop(1, 'rgba(60,100,255,0)');
     ctx.fillStyle = cup; ctx.beginPath(); ctx.ellipse(0, 8 * S, 14 * S, 9 * S, 0, 0, 7); ctx.fill();
     ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (!reduce) {
     if (Math.random() < .6 * life) smoke.push({x: fx + (Math.random() - .5) * width, y: fy - height * .45 * buoy, vx: (Math.random() - .5) * 10, vy: (Math.random() - .5) * 10, a: 1});
     if (buoy > .3 && Math.random() < .08 * life * (.4 + soot)) sparks.push({x: fx + (Math.random() - .5) * width * .6, y: fy - height * .4, vx: (Math.random() - .5) * 30 + sm.flow * 2, vy: -60 - Math.random() * 60, a: 1});
    }
   }
   for (let i = smoke.length - 1; i >= 0; i--) {
    const s = smoke[i], drag = Math.max(0, 1 - dt * 1.8);
    s.vx = s.vx * drag + sm.flow * 3 * dt; s.vy = s.vy * drag - sm.g * 120 * dt; s.x += s.vx * dt * S; s.y += s.vy * dt * S;
    s.a -= dt * (sm.g > .05 || sm.flow > 1 ? .35 : .12);
    if (s.a <= 0 || s.x > W + 20 || s.y < -20) { smoke.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(150,160,175,${s.a * .16})`; ctx.beginPath(); ctx.arc(s.x, s.y, (4 + (1 - s.a) * 14) * S * .7, 0, 7); ctx.fill();
   }
   ctx.globalCompositeOperation = 'lighter';
   for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]; s.x += s.vx * dt * S; s.y += s.vy * dt * S; s.vy -= sm.g * 20 * dt; s.a -= dt * .9;
    if (s.a <= 0) { sparks.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(255,${170 + 60 * s.a},90,${s.a})`; ctx.beginPath(); ctx.arc(s.x, s.y, 1.6 * S, 0, 7); ctx.fill();
   }
   ctx.globalCompositeOperation = 'source-over';
   if (smoke.length > 400) smoke.splice(0, smoke.length - 400);
   frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => { cancelAnimationFrame(frame); ro.disconnect(); };
 }, []);

 const applyPreset = p => { setGid(p.g); setO2(p.o2); setFlow(p.flow); setFuel(p.fuel); };
 const reset = () => applyPreset({g: 'earth', o2: 21, flow: 0, fuel: 'candle'});
 const related = ['PSI-68', 'PSI-26', 'PSI-25', 'PSI-20'].map(id => byAccession[id]).filter(Boolean);
 const grav = flameGravities.find(x => x.id === gid);

 return <section className="lab-console" aria-label="Flame lab">
  <header className="lab-bar">
   <span className="lab-brand"><Gamepad2 size={16}/>FLAME LAB <small>educational illustration</small></span>
   <span className={`lab-status ${state.alive ? 'on' : 'off'}`}><i/>{state.alive ? 'DRAWING ON' : 'DRAWING OFF'}</span>
   <span className="lab-score"><Trophy size={15}/>{done.length * 50} pts · {done.length}/{challenges.length} challenges</span>
  </header>

  <div className="lab-grid">
   {/* Controls */}
   <div className="lab-panel lab-controls">
    <h3 className="lab-panel-title">CONTROLS</h3>
    <div className="lab-module">
     <div className="lab-module-head"><span><Orbit size={15}/>Gravity</span><output className="lab-mini-digits">{grav.detail}</output></div>
     <div className="lab-gravity">{flameGravities.map(x => <button key={x.id} aria-pressed={gid === x.id} className={`lab-switch ${gid === x.id ? 'active' : ''}`} onClick={() => setGid(x.id)}><i className="lab-led"/>{x.label}</button>)}</div>
    </div>
    <Stepper icon={Gauge} label="Oxygen" value={o2} unit="%" min={15} max={40} step={1} onChange={setO2} marks={['15', '21', '34', '40']}/>
    <Stepper icon={Wind} label="Airflow" value={flow} unit="cm/s" min={0} max={40} step={2} onChange={setFlow} marks={['0', '8–20', '40']}/>
    <div className="lab-module">
     <div className="lab-module-head"><span><Flame size={15}/>Fuel</span></div>
     <div className="lab-gravity two">
      <button aria-pressed={fuel === 'candle'} className={`lab-switch ${fuel === 'candle' ? 'active' : ''}`} onClick={() => setFuel('candle')}><i className="lab-led"/><Flame size={15}/>Candle</button>
      <button aria-pressed={fuel === 'droplet'} className={`lab-switch ${fuel === 'droplet' ? 'active' : ''}`} onClick={() => setFuel('droplet')}><i className="lab-led"/><Droplet size={15}/>Droplet</button>
     </div>
    </div>
    <div className="lab-module">
     <div className="lab-module-head"><span><FolderOpen size={15}/>Scenarios</span></div>
     <div className="lab-presets">{flamePresets.map(p => <button key={p.label} onClick={() => applyPreset(p)}>{p.label}</button>)}</div>
    </div>
    <button className="lab-reset" onClick={reset}><RotateCcw size={15}/>Reset</button>
   </div>

   {/* Monitor */}
   <div className="lab-monitor">
    <div className="lab-screen">
     <canvas ref={canvasRef} className="lab-canvas" role="img" aria-label={`Illustrated flame: ${state.shape}, ${state.color}`}/>
     <div className="lab-hud tl">ILLUSTRATED CHAMBER · NO PHYSICAL SCALE</div>
     <div className="lab-hud tr">{grav.label.toUpperCase()} · {o2}% O₂ · {flow} cm/s</div>
     <div className="lab-hud bl"><span className="lab-rec"/>ANIMATED</div>
     <div className="lab-hud br">AI-ASSISTED ILLUSTRATION</div>
     <span className="lab-corner a"/><span className="lab-corner b"/><span className="lab-corner c"/><span className="lab-corner d"/>
     {!state.alive && <div className="lab-out">DRAWING OFF<small>Change oxygen or airflow to explore the game rules</small></div>}
     {toast && <div className="lab-toast" role="status"><Trophy size={18}/><span><small>Challenge complete! +50</small>{toast}</span></div>}
    </div>
   </div>

   {/* Readouts */}
   <div className="lab-panel lab-readouts">
    <h3 className="lab-panel-title">ILLUSTRATION</h3>
    <div className="lab-gauges">
     <div className="lab-gauge"><span>Shape</span><strong>{state.shape}</strong></div>
     <div className="lab-gauge"><span>Color</span><strong className={state.sooty && state.alive ? 'warm' : 'cool'}>{state.color}</strong></div>
     <div className="lab-gauge"><span>Size</span><strong>{state.size}</strong></div>
     <div className="lab-gauge wide"><span>Drawing brightness</span><div className="lab-bar-meter"><i style={{width: `${state.intensity}%`}}/></div><b>{state.intensity}</b></div>
    </div>
    <div className="lab-terminal"><div className="lab-terminal-head"><Terminal size={14}/>WHAT DOES THIS ILLUSTRATE?</div><Typewriter lines={state.why.map(w => '> ' + w)}/></div>
    <div className="lab-challenges">
     <div className="lab-terminal-head"><Trophy size={14}/>CHALLENGES</div>
     {challenges.map(c => { const ok = done.includes(c.id); return <div key={c.id} className={`lab-challenge ${ok ? 'ok' : ''}`}><span className="lab-check">{ok ? <Check size={13}/> : null}</span><span><strong>{c.title}</strong>{!ok && <small>{c.hint}</small>}</span></div>; })}
    </div>
    <div className="lab-files"><div className="lab-terminal-head"><FolderOpen size={14}/>NASA INVESTIGATIONS</div>{related.map(s => <a key={s.accession} href={`#investigation/${s.accession}`}><span>{s.accession} / {s.acronym}</span>{s.title}<ArrowUpRight size={13}/></a>)}</div>
   </div>
  </div>
  <p className="lab-note"><Info size={14}/>A qualitative learning illustration in a sealed, oxygen-containing chamber. Shapes, brightness and oxygen cutoffs are game rules, not measured results, safety limits or validated predictions for Earth, the Moon, Mars or orbit.</p>
 </section>;
}
