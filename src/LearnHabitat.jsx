import React, {useMemo, useState} from 'react';
import {ArrowUpRight, Info, MousePointerClick, RotateCcw, Sparkles, Layers3, Gauge, FlaskConical, Expand, Tags, Box, Flame, Siren, CircleHelp as HelpCircle, Play, Pause, X, ArrowDown, ArrowUp} from 'lucide-react';
import {learnHabitats, learnDisclaimer} from './learn-habitats';
import {investigations} from './investigation-catalog';
import HabitatViewer from './HabitatViewer';
import FlameLab from './FlameLab';
import FireMission from './FireMission';
import './learn.css';

const byAccession = Object.fromEntries(investigations.map(s => [s.accession, s]));
const modes = [
 ['habitat', Box, '3D habitats', 'Explore the parts', '#5aa9ff', 'Rotate a spacecraft, a lunar base and a rover. Discover each part.'],
 ['lab', Flame, 'Flame lab', 'Change gravity', '#ff8a3d', 'Explore gravity, oxygen and airflow. Complete six challenges.'],
 ['mission', Siren, 'Mission', 'Smoke in the module!', '#ff5a6e', 'An alarm sounds: make six choices and earn points.'],
];

const firstSentence = t => (t || '').split(/(?<=[.!?:])\s/)[0];

/** Short info shown inside the 3D view: three quick facts for students. */
function QuickCard({component, index, onClose, onMore}) {
 const [cond, value] = component.conditions[0] || [];
 return <div className="quick-card">
  <button className="quick-card-close" onClick={onClose} aria-label="Hide card"><X size={14}/></button>
  <span className="quick-card-index">{index + 1}</span>
  <strong className="quick-card-title">{component.name}</strong>
  <p>{firstSentence(component.what)}</p>
  <ul>
   <li><span className="qc-icon qc-mat"><Layers3 size={14}/></span><span><b>Made of</b>{component.materials.slice(0, 2).map(m => m[0]).join(' · ')}</span></li>
   {cond && <li><span className="qc-icon qc-env"><Gauge size={14}/></span><span><b>{cond}</b>{value}</span></li>}
   {component.fire[0] && <li><span className="qc-icon qc-fire"><Flame size={14}/></span><span><b>What about fire?</b>{firstSentence(component.fire[0])}</span></li>}
  </ul>
  <button className="quick-card-more" onClick={onMore}>Read more<ArrowDown size={14}/></button>
 </div>;
}

function HabitatExplorer({onAsk}) {
 const [habitatId, setHabitatId] = useState('station');
 const habitat = learnHabitats.find(h => h.id === habitatId);
 const [selectedId, setSelectedId] = useState(habitat.components[0].id);
 const [hoveredId, setHoveredId] = useState(null);
 const [exploded, setExploded] = useState(false);
 const [labels, setLabels] = useState(true);
 const [resetToken, setResetToken] = useState(0);
 const component = habitat.components.find(c => c.id === selectedId) || habitat.components[0];
 const index = habitat.components.indexOf(component);
 const hovered = habitat.components.find(c => c.id === hoveredId);
 const related = useMemo(() => component.related.map(id => byAccession[id]).filter(Boolean), [component]);
 const [showCard, setShowCard] = useState(true);
 const select = id => { setSelectedId(id); setShowCard(true); };
 const chooseHabitat = id => { const next = learnHabitats.find(h => h.id === id); setHabitatId(id); setSelectedId(next.components[0].id); setHoveredId(null); setExploded(false); setShowCard(true); };

 return <>
  <div className="learn-habitat-tabs" role="tablist" aria-label="Choose a habitat">
   {learnHabitats.map(h => <button key={h.id} role="tab" aria-selected={h.id === habitatId} className={h.id === habitatId ? 'active' : ''} onClick={() => chooseHabitat(h.id)}><small>{h.kind}</small><strong>{h.name}</strong></button>)}
  </div>
  <section className="learn-layout learn-layout-wide">
   <div className="learn-stage">
    <HabitatViewer habitatId={habitatId} components={habitat.components} selected={component.id} onSelect={select} onHover={setHoveredId} exploded={exploded} showLabels={labels} resetToken={resetToken}
     callout={showCard && <QuickCard component={component} index={index} onClose={() => setShowCard(false)} onMore={() => document.getElementById('learn-detail')?.scrollIntoView({behavior: 'smooth', block: 'start'})}/>}/>
    <div className="learn-stage-hint"><MousePointerClick size={14}/>{hovered ? hovered.name : 'Drag to rotate · scroll to zoom · select a part'}</div>
    <div className="learn-stage-tools">
     <button className={`learn-tool ${exploded ? 'active' : ''}`} onClick={() => setExploded(v => !v)} aria-pressed={exploded}><Expand size={15}/>{exploded ? 'Assemble' : 'Exploded view'}</button>
     <button className={`learn-tool ${labels ? 'active' : ''}`} onClick={() => setLabels(v => !v)} aria-pressed={labels}><Tags size={15}/>Labels</button>
     <button className="learn-tool" onClick={() => setResetToken(t => t + 1)} aria-label="Reset the view"><RotateCcw size={15}/></button>
    </div>
    <dl className="learn-environment">{habitat.environment.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   </div>
   <div className="learn-component-list learn-component-strip" role="listbox" aria-label="Habitat parts">
    {habitat.components.map((c, i) => <button key={c.id} role="option" aria-selected={c.id === component.id} className={c.id === component.id ? 'active' : ''} onClick={() => select(c.id)} onMouseEnter={() => setHoveredId(c.id)} onMouseLeave={() => setHoveredId(null)}><b>{i + 1}</b>{c.name}</button>)}
   </div>

   <aside className="learn-panel learn-details" aria-live="polite" id="learn-detail">
    <p className="learn-intro">{habitat.intro}</p>
    <article className="learn-component" key={component.id}>
     <span className="learn-kicker">{habitat.name} · part {index + 1}</span>
     <h2>{component.name}</h2>
     <h3><HelpCircle size={15}/>What is it?</h3>
     <p>{component.what}</p>
     <h3><Layers3 size={15}/>What is it made of?</h3>
     <ul className="learn-materials">{component.materials.map(([name, note]) => <li key={name}><strong>{name}</strong><span>{note}</span></li>)}</ul>
     <h3><Gauge size={15}/>Surrounding conditions</h3>
     <dl className="learn-conditions">{component.conditions.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
     <h3><Sparkles size={15}/>What about fire?</h3>
     <ul className="learn-notes">{component.fire.map(note => <li key={note}>{note}</li>)}</ul>
     <h3><FlaskConical size={15}/>Related investigations</h3>
     {related.length ? <ul className="learn-related">{related.map(s => <li key={s.accession}><a href={`#investigation/${s.accession}`}><span className="library-study-code">{s.accession} / {s.acronym || 'NASA PSI'}</span><strong>{s.title}</strong><ArrowUpRight size={14}/></a></li>)}</ul> : <p className="nasa-caption">No investigation in this catalog directly covers this part.</p>}
     {component.question && <button className="button secondary learn-ask" onClick={() => onAsk?.(component.question)}><Sparkles size={15}/>Ask the research guide</button>}
    </article>
   </aside>
  </section>
 </>;
}

export default function LearnHabitat({navigate, onAsk}) {
 const [mode, setMode] = useState('habitat');
 const [paused, setPaused] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
 return <main className="research-home learn-page" lang="en">
  <section className="discovery-hero learn-hero">
   <div className="discovery-intro">
    <div className="home-eyebrow"><span/>LEARN BY EXPLORING · SECONDARY SCHOOL</div>
    <h1>Fire in space.<br/><em>Learn through play.</em></h1>
    <p className="discovery-lead">Explore a spacecraft, a lunar base and a rover, piece by piece. <br/>Change gravity in an illustrated flame lab and test your knowledge in a mission.</p>
   </div>
   <div className="discovery-visual">
    {paused ? <img src="/media/droplet-flame.jpg" alt=""/> : <video autoPlay muted loop playsInline preload="metadata" poster="/media/droplet-flame.jpg" onLoadedMetadata={e => { e.currentTarget.currentTime = 28; }} onTimeUpdate={e => { if (e.currentTarget.currentTime > 57) e.currentTarget.currentTime = 28; }} aria-label="Burning fuel droplet in microgravity, NASA FLEX-2"><source src="/media/flex-2.webm" type="video/webm"/></video>}
    <div className="discovery-video-caption"><div><strong>A different gravity,<br/>a different flame.</strong><span>FLEX-2 · droplet in orbit</span></div><button className="motion-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play video' : 'Pause video'}>{paused ? <Play size={17}/> : <Pause size={17}/>}</button></div>
   </div>
  </section>

  <nav className="learn-games" role="tablist" aria-label="Choose an activity" id="learn-activity">
   {modes.map(([id, Icon, t, sub, color, blurb], i) => <button key={id} role="tab" aria-selected={mode === id} className={`learn-game ${mode === id ? 'active' : ''}`} style={{'--game': color}} onClick={() => { setMode(id); setTimeout(() => document.getElementById('learn-stage')?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'}), 60); }}>
    <span className="learn-game-tag">ACTIVITY {i + 1}</span>
    <span className="learn-game-icon"><Icon size={38} strokeWidth={1.7}/></span>
    <strong>{t}</strong>
    <small>{blurb}</small>
    <span className="learn-game-play">{mode === id ? <>Playing now</> : <>Play<Play size={14}/></>}</span>
   </button>)}
  </nav>

  {(() => { const i = modes.findIndex(m => m[0] === mode); const [, Icon, t, , color] = modes[i]; return <section className="learn-stage-frame" key={mode} style={{'--game': color, '--at': `${((i * 2 + 1) / 6) * 100}%`}} id="learn-stage" aria-label={`Activity ${i + 1}: ${t}`}>
   <header className="learn-stage-bar">
    <span className="learn-stage-badge"><Icon size={18}/></span>
    <span className="learn-stage-name"><small>ACTIVITY {i + 1}</small>{t}</span>
    <span className="learn-stage-live"><i/>NOW PLAYING</span>
    <button className="learn-stage-switch" onClick={() => document.getElementById('learn-activity')?.scrollIntoView({behavior: 'smooth', block: 'start'})}>Change activity<ArrowUp size={14}/></button>
   </header>
   <div className="learn-activity">
    {mode === 'habitat' ? <HabitatExplorer onAsk={onAsk}/> : mode === 'lab' ? <FlameLab/> : <FireMission/>}
   </div>
  </section>; })()}

  <p className="learn-disclaimer" role="note"><Info size={15}/>{learnDisclaimer}</p>
  <section className="home-featured learn-next">
   <div className="home-section-heading"><div><div className="home-eyebrow">READY TO GO FURTHER?</div><h2>The real experiments<br/>are in the collection.</h2></div><button className="button secondary" onClick={() => navigate('explore')}>Explore all investigations<ArrowUpRight size={16}/></button></div>
  </section>
  <div className="home-independent"><strong>flamingo</strong><span>Learn · fire in space for students</span><p>Built around public NASA investigations. An educational tool; not a safety certification.</p></div>
 </main>;
}
