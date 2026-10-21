import {Notation} from '../core/notation.js';
import {ScoreLayout} from '../core/score-layout.js';
// Score-aware MusicXML renderer. The engraved pitches, time signatures, rests,
// key signatures, accidentals and measure boundaries are preserved. Complex
// multivoice collision rules, beams and articulation marks still require a
// dedicated engraving dependency; unsupported constructs are not fabricated.
export const ScoreRenderer = (() => {
  const Y={treble:{top:62,bottom:118},bass:{top:245,bottom:301}},SPACE=14,H=370;
  const STEPS=['F','C','G','D','A','E','B'],FLATS=['B','E','A','D','G','C','F'];
  const cache=new WeakMap(),selectedTrackCache=new WeakMap();
  function tracksFor(notes){if(!selectedTrackCache.has(notes))selectedTrackCache.set(notes,new Set(notes.map(n=>n.track)));return selectedTrackCache.get(notes);}
  function firstAtX(events,xAt,min){
    let lo=0,hi=events.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(xAt(events[mid].start)<min)lo=mid+1;else hi=mid;}
    return lo;
  }
  const accSymbol={sharp:'♯',flat:'♭',natural:'♮','double-sharp':'𝄪','flat-flat':'𝄫'};
  function setup(score){
    let cached=cache.get(score);if(cached)return cached;
    const times=[0];
    for(const n of score.notes)times.push(n.start);
    for(const r of score.rests)times.push(r.start);
    for(const m of score.measures)times.push(m.start,m.end);
    // 19px minimum visual spacing improves readability of short events.
    const axis=ScoreLayout.timeline(times,1/76,36);
    cached={axis};cache.set(score,cached);return cached;
  }
  function notePos(n){const bottom=Y[n.clef]?.bottom??Y.treble.bottom;return {...ScoreLayout.diatonicPosition(n,bottom,SPACE),bottom};}
  function drawStaff(ctx,w){
    ctx.lineWidth=1;ctx.strokeStyle='#9a8da3';
    for(const staff of [Y.treble,Y.bass])for(let j=0;j<5;j++){
      const y=staff.top+j*SPACE;
      ctx.beginPath();ctx.moveTo(8,y);ctx.lineTo(w-8,y);ctx.stroke();
    }
    ctx.fillStyle='#51415b';ctx.font='61px "Noto Music","Apple Symbols",serif';ctx.fillText('𝄞',12,116);
    ctx.font='53px "Noto Music","Apple Symbols",serif';ctx.fillText('𝄢',17,298);
    ctx.font='bold 10px system-ui';ctx.fillStyle='#65536a';
    ctx.fillText('TREBLE',13,19);ctx.fillText('BASS',13,205);
  }
  function keySig(ctx,signature){
    if(!signature)return;
    const steps=signature>0?STEPS:FLATS;
    const octs=signature>0?{treble:[5,5,5,5,4,5,4],bass:[3,3,3,3,2,3,2]}:
      {treble:[4,5,4,5,4,5,4],bass:[2,3,2,3,2,3,2]};
    ctx.font='bold 21px "Noto Music",serif';ctx.fillStyle='#685777';
    for(let i=0;i<Math.abs(signature);i++){
      for(const clef of ['treble','bass']){
        const y=notePos({clef,step:steps[i],octave:octs[clef][i]}).y;
        ctx.fillText(signature>0?'♯':'♭',53+i*8,y+6);
      }
    }
  }
  function ledger(ctx,x,pos){
    const all=Notation.ledgerLines(pos,pos.bottom,SPACE);
    ctx.strokeStyle='#76667e';ctx.lineWidth=1.5;
    for(const y of all){if(y<17||y>H-9)continue;
      ctx.beginPath();ctx.moveTo(x-13,y);ctx.lineTo(x+14,y);ctx.stroke();
    }
  }
  function notehead(ctx,x,y,filled,color){
    ctx.beginPath();ctx.ellipse(x,y,8.1,5.6,-.26,0,2*Math.PI);
    ctx.fillStyle=filled?color:'#fbf7ed';ctx.strokeStyle=color;ctx.lineWidth=1.8;
    ctx.fill();ctx.stroke();
  }
  function stem(ctx,notes,color){
    const pivots=notes.filter(n=>n.durationBeats<4);
    if(!pivots.length)return;
    const upper=[...pivots].sort((a,b)=>a.y-b.y)[0],lower=[...pivots].sort((a,b)=>b.y-a.y)[0];
    const center=(upper.y+lower.y)/2,staff=Y[pivots[0].clef];
    const up=center>staff.top+SPACE*2;
    const x=pivots[0].x+(up?8:-8);
    const y0=up?lower.y:upper.y,y1=(up?upper.y-33:lower.y+33);
    ctx.strokeStyle=color;ctx.lineWidth=1.8;
    ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y1);ctx.stroke();
    const d=Math.min(...pivots.map(n=>n.durationBeats));
    if(d<1){
      // Unbeamed notes use proper isolated note flags, at most two.
      ctx.beginPath();ctx.moveTo(x,y1);
      if(up)ctx.bezierCurveTo(x+15,y1+4,x+18,y1+16,x+8,y1+21);
      else ctx.bezierCurveTo(x-15,y1-4,x-18,y1-16,x-8,y1-21);
      ctx.stroke();
      if(d<.5){const dy=up?7:-7;
        ctx.beginPath();ctx.moveTo(x,y1+dy);
        if(up)ctx.bezierCurveTo(x+12,y1+dy+4,x+17,y1+dy+14,x+7,y1+dy+18);
        else ctx.bezierCurveTo(x-12,y1+dy-4,x-17,y1+dy-14,x-7,y1+dy-18);
        ctx.stroke();
      }
    }
  }
  function rest(ctx,x,y,duration){
    ctx.save();ctx.fillStyle='#75618a';ctx.strokeStyle='#75618a';ctx.lineWidth=2;
    if(duration>=4){ctx.fillRect(x-7,y-14,14,5);}
    else if(duration>=2){ctx.fillRect(x-7,y-6,14,5);}
    else if(duration>=1){ctx.beginPath();ctx.moveTo(x-3,y-23);ctx.lineTo(x+5,y-13);ctx.lineTo(x-3,y-4);ctx.lineTo(x+4,y+6);ctx.lineTo(x-3,y+17);ctx.stroke();}
    else {ctx.beginPath();ctx.arc(x+3,y-2,3,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(x+5,y-2);ctx.lineTo(x-3,y+19);ctx.stroke();
      if(duration<.5){ctx.beginPath();ctx.arc(x+3,y+6,2.5,0,7);ctx.fill();}}
    ctx.restore();
  }
  function render({at,score,canvas,notes,stepActive,labels}){
    if(!score||!canvas||!score.notes)return;
    const width=Math.max(240,canvas.clientWidth||330),height=canvas.clientHeight||330,dpr=Math.min(2,window.devicePixelRatio||1);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    }
    const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#fbf7ed';ctx.fillRect(0,0,width,height);
    ctx.save();ctx.scale(1,height/H);
    drawStaff(ctx,width);
    const {axis}=setup(score);
    const x0=Math.min(Math.max(139,width*.34),190),offset=x0-axis.at(at);
    const place=t=>axis.at(t)+offset;
    const measure=score.measures.find(m=>m.start<=at&&m.end>at)||score.measures.at(-1);
    if(measure){keySig(ctx,measure.keyFifths||0);
      ctx.fillStyle='#50435e';ctx.font='bold 14px serif';
      ctx.fillText(String(measure.beats),97,87);ctx.fillText(String(measure.beatType),97,105);
      ctx.fillText(String(measure.beats),97,268);ctx.fillText(String(measure.beatType),97,286);
    }
    const tracks=tracksFor(notes);
    // Render only visible measures and notes, including a little offscreen space.
    for(let i=Math.max(0,firstAtX(score.measures,place,x0-40)-1);i<score.measures.length;i++){
      const m=score.measures[i],x=place(m.start)-6;if(x>width+28)break;
      ctx.strokeStyle='#b2a7b3';ctx.lineWidth=1;
      for(const staff of [Y.treble,Y.bass]){
        ctx.beginPath();ctx.moveTo(x,staff.top);ctx.lineTo(x,staff.bottom);ctx.stroke();
      }
      ctx.font='bold 10px system-ui';ctx.fillStyle='#766478';ctx.fillText(String(m.number),x+4,35);
    }
    for(let i=firstAtX(score.rests,place,x0-21);i<score.rests.length;i++){
      const r=score.rests[i],x=place(r.start);if(x>width+12)break;
      if(!tracks.has(r.track))continue;
      rest(ctx,x,r.staff==='bass'?Y.bass.top+28:Y.treble.top+28,r.durationBeats);
    }
    const visible=[];
    for(let i=firstAtX(score.notes,place,x0-22);i<score.notes.length;i++){
      const n=score.notes[i],x=place(n.start);if(x>width+18)break;
      if(!tracks.has(n.track))continue;
      const p=notePos(n);const active=(n.start<=at&&n.end>at)||stepActive.has(n.midi);
      visible.push({...n,x,y:p.y,steps:p.steps,bottom:p.bottom,active,accidental:accSymbol[n.notatedAccidental]||'',color:active?'#0e8267':n.clef==='bass'?'#7854a6':'#347da1'});
    }
    // Keep the fixed gutter free of scrolling notes, labels and accidentals.
    ctx.save();ctx.beginPath();ctx.rect(x0-24,22,width-x0+30,H-26);ctx.clip();
    for(const chord of ScoreLayout.groupAtOnset(visible)){
      const offs=ScoreLayout.noteOffsets(chord),acc=ScoreLayout.accidentalOffsets(chord);
      for(const n of chord){
        const px=n.x+(offs.get(n)||0),y=n.y;
        if(y<26||y>H-17){ctx.fillStyle=n.color;ctx.font='bold 11px system-ui';ctx.fillText((y<26?'↑ ':'↓ ')+n.step+n.octave,px,y<26?27:H-15);continue;}
        ledger(ctx,px,n);
        if(n.accidental){ctx.font='bold 19px "Noto Music",serif';ctx.fillStyle=n.color;
          ctx.fillText(n.accidental,px+(acc.get(n)||-21),y+6);
        }
        notehead(ctx,px,y,n.durationBeats<2,n.color);
      }
      const drawable=chord.filter(n=>n.y>=26&&n.y<=H-17);
      if(drawable.length)stem(ctx,drawable,drawable.some(n=>n.active)?'#0e8267':drawable[0].color);
      if(labels!=='off'){
        const active=drawable.filter(n=>n.active);
        if(active.length===1){const n=active[0];ctx.font='bold 10px system-ui';ctx.fillStyle='#185e4d';
          const posY=Math.max(20,n.y-16);ctx.fillText(n.step+(n.alter===1?'♯':n.alter===-1?'♭':'')+n.octave,n.x-8,posY);
        }
      }
    }
    ctx.restore();
    // Time cursor is always aligned with playback time, regardless of visual stretching.
    ctx.fillStyle='#f4d697ba';ctx.fillRect(x0-3,26,6,H-37);
    ctx.fillStyle='#795f37';ctx.font='bold 11px system-ui';ctx.fillText('NOW',x0-15,18);
    ctx.restore();
  }
  return Object.freeze({render});
})();
