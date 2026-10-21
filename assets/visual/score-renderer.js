import {Notation} from '../core/notation.js';
// Score-aware canvas layout for imported MusicXML; time-based horizontal scroll
// is deliberately shared with the falling-note/audio clock. This is NOT a full
// professional engraving system (tuplets, slurs, articulations, voice collision).
export const ScoreRenderer = (() => {
  const top=[56,69,82,95,108],bass=[167,180,193,206,219];
  const LINE=Notation.STAFF_LINE_SPACING;
  const cachedTrackSets=new WeakMap();
  const tracksFor=notes=>{
    if(!cachedTrackSets.has(notes))cachedTrackSets.set(notes,new Set(notes.map(n=>n.track)));
    return cachedTrackSets.get(notes);
  };
  function firstStartAtOrAfter(events,t){
    let lo=0,hi=events.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(events[mid].start<t)lo=mid+1;else hi=mid;}
    return lo;
  }
  const SHARP_STEPS=['F','C','G','D','A','E','B'],FLAT_STEPS=['B','E','A','D','G','C','F'];
  function notePos(n) {
    const bottom=n.clef==='bass'?219:108;
    const base=n.clef==='bass'?{letter:'G',octave:2}:{letter:'E',octave:4};
    const i='CDEFGAB'.indexOf(n.step),j='CDEFGAB'.indexOf(base.letter);
    const steps=(n.octave*7+i)-(base.octave*7+j);
    return {y:bottom-steps*LINE/2,steps,bottom};
  }
  function accidental(n) {
    const map={sharp:'♯',flat:'♭',natural:'♮','double-sharp':'𝄪','flat-flat':'𝄫'};
    return map[n.notatedAccidental]||'';
  }
  function drawKeySignature(ctx,fifths){
    if(!fifths)return;
    const orders=fifths>0?SHARP_STEPS:FLAT_STEPS;
    const trebleOct=fifths>0?[5,5,5,5,4,5,4]:[4,5,4,5,4,5,4];
    const bassOct=fifths>0?[3,3,3,3,2,3,2]:[2,3,2,3,2,3,2];
    for(let i=0;i<Math.abs(fifths);i++){
      const name=orders[i],x=48+i*8;
      for(const [clef,octave] of [['treble',trebleOct[i]],['bass',bassOct[i]]]){
        const pitch={clef,step:name,octave};const y=notePos(pitch).y;
        ctx.fillStyle='#574864';ctx.font='bold 18px serif';ctx.fillText(fifths>0?'♯':'♭',x,y+5);
      }
    }
  }
  function drawStaff(ctx,w) {
    for(const lines of [top,bass]){ctx.strokeStyle='#9b8a9f';ctx.lineWidth=1;
      for(const y of lines){ctx.beginPath();ctx.moveTo(8,y);ctx.lineTo(w-6,y);ctx.stroke();}
    }
    ctx.font='60px "Apple Symbols","Noto Music",serif';ctx.fillStyle='#4a3b59';ctx.fillText('𝄞',9,106);
    ctx.font='49px "Apple Symbols","Noto Music",serif';ctx.fillText('𝄢',15,216);
  }
  function drawRest(ctx,x,y,duration,color) {
    ctx.save();ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=2.2;
    if(duration>=4){ctx.fillRect(x-8,y-8,15,5);} // whole rest hangs from line
    else if(duration>=2){ctx.fillRect(x-8,y-2,15,5);} // half rest rests on line
    else if(duration>=1){
      ctx.beginPath();ctx.moveTo(x-4,y-22);ctx.lineTo(x+4,y-13);ctx.lineTo(x-3,y-5);ctx.lineTo(x+4,y+3);
      ctx.lineTo(x-4,y+13);ctx.lineTo(x+3,y+19);ctx.stroke();
    } else {
      ctx.beginPath();ctx.arc(x+3,y-2,3,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(x+5,y-3);ctx.lineTo(x-3,y+17);ctx.stroke();
      if(duration<.5){ctx.beginPath();ctx.arc(x+3,y+6,2.5,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }
  function drawNote(ctx,x,n,color,headOffset=0) {
    const pos=notePos(n),{y,steps,bottom}=pos;
    if(y<23||y>246){ctx.font='bold 11px system-ui';ctx.fillStyle=color;
      ctx.fillText((y<23?'↑ ':'↓ ')+n.step+n.octave,x,y<23?25:245);return;
    }
    const ledger=Notation.ledgerLines(pos,bottom,LINE);
    ctx.strokeStyle='#7c6984';ctx.lineWidth=1.2;
    for(const ly of ledger){if(ly<19||ly>252)continue;ctx.beginPath();ctx.moveTo(x-13,ly);ctx.lineTo(x+14,ly);ctx.stroke();}
    const xx=x+headOffset,whole=n.durationBeats>=4,half=n.durationBeats>=2;
    ctx.save();ctx.translate(xx,y);ctx.rotate(-.28);
    ctx.beginPath();ctx.ellipse(0,0,8.4,5.5,0,0,Math.PI*2);
    ctx.fillStyle=half||whole?'#faf6ed':color;ctx.strokeStyle=color;ctx.lineWidth=1.8;
    ctx.fill();ctx.stroke();ctx.restore();
    if(!whole){const up=steps<4,stemX=xx+(up?7:-7),stemEnd=y+(up?-30:30);
      ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(stemX,y);ctx.lineTo(stemX,stemEnd);ctx.stroke();
      if(n.durationBeats<1){ // draw eighth/sixteenth hooks; beam grouping remains future engraving work
        ctx.beginPath();ctx.moveTo(stemX,stemEnd);ctx.bezierCurveTo(stemX+(up?13:-13),stemEnd+6,stemX+(up?11:-11),stemEnd+15,stemX+(up?8:-8),stemEnd+18);ctx.stroke();
        if(n.durationBeats<.5){ctx.beginPath();ctx.moveTo(stemX,stemEnd+ (up?5:-5));ctx.quadraticCurveTo(stemX+(up?12:-12),stemEnd+9,stemX+(up?8:-8),stemEnd+15);ctx.stroke();}
      }
    }
  }
  function render({at,score,canvas,notes,stepActive,labels}) {
    const width=Math.max(250,canvas.clientWidth||330),height=canvas.clientHeight||255,dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#fbf7ed';ctx.fillRect(0,0,width,height);
    ctx.save();ctx.scale(1,height/255);drawStaff(ctx,width);
    const x0=Math.min(125,Math.max(98,width*.29)),speed=width<480?66:86;
    const atMeasure=score.measures.find(m=>m.start<=at&&m.end>at)||score.measures.at(-1);
    if(atMeasure){
      drawKeySignature(ctx,atMeasure.keyFifths||0);
      ctx.fillStyle='#40334b';ctx.font='bold 14px serif';
      ctx.fillText(String(atMeasure.beats),75,75);ctx.fillText(String(atMeasure.beatType),75,92);
      ctx.fillText(String(atMeasure.beats),75,185);ctx.fillText(String(atMeasure.beatType),75,202);
    }
    ctx.fillStyle='#f0daac';ctx.fillRect(x0-2,20,4,225);
    ctx.fillStyle='#745b30';ctx.font='bold 10px system-ui';ctx.fillText('NOW',x0-13,16);
    const visibleStart=at-(x0+25)/speed,visibleEnd=at+(width-x0+25)/speed;
    const firstMeasure=Math.max(0,firstStartAtOrAfter(score.measures,visibleStart)-1);
    for(let i=firstMeasure;i<score.measures.length;i++){const m=score.measures[i];if(m.start>visibleEnd)break;if(m.end<visibleStart)continue;
      const x=x0+(m.start-at)*speed-17;
      if(x>=30&&x<width){ctx.strokeStyle='#988c8c';ctx.lineWidth=1.2;
        for(const [t,b] of [[top[0],top[4]],[bass[0],bass[4]]]){ctx.beginPath();ctx.moveTo(x,t);ctx.lineTo(x,b);ctx.stroke();}
        ctx.fillStyle='#6d6177';ctx.font='bold 10px system-ui';ctx.fillText(String(m.number),x+3,33);
        // Meter and key changes are shown in the fixed left score gutter,
        // preventing collisions with noteheads at the measure boundary.
      }
    }
    const selectedTracks=tracksFor(notes);
    // Preserve written rests in both hands. Multiple voices can overlap intentionally.
    for(let i=firstStartAtOrAfter(score.rests,visibleStart);i<score.rests.length;i++){const r=score.rests[i];if(r.start>visibleEnd)break;if(r.end<visibleStart)continue;
      if(r.track!==undefined&&!selectedTracks.has(r.track))continue;
      const x=x0+(r.start-at)*speed;if(x<32||x>width-4)continue;
      drawRest(ctx,x,r.staff==='bass'?195:83,r.durationBeats,'#8a709a');
    }
    const occupied=[];
    for(let i=firstStartAtOrAfter(score.notes,visibleStart);i<score.notes.length;i++){const n=score.notes[i];if(n.start>visibleEnd)break;if(n.end<visibleStart)continue;
      if(!selectedTracks.has(n.track))continue;
      const x=x0+(n.start-at)*speed;if(x<21||x>width+20)continue;
      const active=(n.start<=at&&n.end>at)||stepActive.has(n.midi);
      const color=active?'#16876b':n.clef==='bass'?'#7355a8':'#347fa1';
      const p=notePos(n),adj=occupied.find(v=>v.clef===n.clef&&Math.abs(v.start-n.start)<.001&&Math.abs(v.steps-p.steps)===1);
      occupied.push({clef:n.clef,start:n.start,steps:p.steps});
      const glyph=accidental(n);
      if(glyph){ctx.font='bold 18px serif';ctx.fillStyle=color;ctx.fillText(glyph,x-23,p.y+6);}
      drawNote(ctx,x,n,color,adj?10:0);
      if(labels!=='off'&&active&&p.y>=25&&p.y<=245){ctx.fillStyle='#174d43';ctx.font='bold 10px system-ui';
        ctx.fillText(n.step+(n.alter===1?'♯':n.alter===-1?'♭':'')+n.octave,x-10,p.y-14);}
    }
    if(!score.notes.length){ctx.font='12px system-ui';ctx.fillText('No notated notes.',x0+15,136);}
    ctx.restore();
  }
  return Object.freeze({render});
})();
