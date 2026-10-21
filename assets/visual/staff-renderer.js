import {Theory} from '../core/theory.js';
import {Notation} from '../core/notation.js';
import {ScoreLayout} from '../core/score-layout.js';
// MIDI-only pitch guide: never fabricates key signatures, rests, barlines or
// written rhythmic values that do not exist in the MIDI file. Keeps exact
// pitch positions and playback times, expanding only *visual* event spacing.
export const StaffRenderer = (() => {
  const H=370,SPACE=14,STAFF={treble:{top:62,bottom:118},bass:{top:245,bottom:301}};
  const cache=new WeakMap();
  const noteName=Theory.midiName;
  function timeAxis(notes){
    if(!cache.has(notes))cache.set(notes,ScoreLayout.timeline(notes.map(n=>n.start),1/76,42));
    return cache.get(notes);
  }
  function line(ctx,x,y0,x1,y1){ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x1,y1);ctx.stroke();}
  function drawBase(ctx,w){
    ctx.lineWidth=1;ctx.strokeStyle='#9b8ca3';
    for(const s of [STAFF.treble,STAFF.bass])for(let j=0;j<5;j++)line(ctx,9,s.top+j*SPACE,w-9,s.top+j*SPACE);
    ctx.font='60px "Apple Symbols","Noto Music",serif';ctx.fillStyle='#4e3b60';ctx.fillText('𝄞',12,115);
    ctx.font='53px "Apple Symbols","Noto Music",serif';ctx.fillText('𝄢',17,298);
    ctx.font='bold 10px system-ui';ctx.fillStyle='#655470';ctx.fillText('TREBLE',13,19);ctx.fillText('BASS',13,207);
  }
  function drawLedger(ctx,x,pos){
    ctx.strokeStyle='#84768d';ctx.lineWidth=1.5;
    for(const y of Notation.ledgerLines(pos,pos.bottom,SPACE)){
      if(y<16||y>H-7)continue;
      line(ctx,x-13,y,x+13,y);
    }
  }
  function notehead(ctx,x,y,color){
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,8.2,5.6,-.26,0,Math.PI*2);ctx.fill();
  }
  function drawChord(ctx,chord){
    const colors=chord.some(n=>n.active)?'#138668':chord[0].clef==='bass'?'#7858af':'#347fa1';
    const offsets=ScoreLayout.noteOffsets(chord);
    const accidents=ScoreLayout.accidentalOffsets(chord);
    for(const n of chord){
      const x=n.x+(offsets.get(n)||0),y=n.y;
      if(y<26||y>H-18){ctx.fillStyle=n.color;ctx.font='bold 11px system-ui';
        ctx.fillText((y<26?'↑ ':'↓ ')+noteName(n.midi),x,y<26?27:H-18);continue;
      }
      drawLedger(ctx,x,n);
      if(n.accidental){ctx.font='bold 20px "Noto Music",serif';ctx.fillStyle=n.color;
        ctx.fillText(n.accidental,x+(accidents.get(n)||-21),y+6);
      }
      notehead(ctx,x,y,n.color);
    }
    const drawable=chord.filter(n=>n.y>=26&&n.y<=H-18);
    if(drawable.length){
      const ordered=[...drawable].sort((a,b)=>a.y-b.y);
      const top=ordered[0],bottom=ordered.at(-1);
      const direction=(top.y+bottom.y)/2>(STAFF[top.clef].top+2*SPACE)?1:-1;
      const start=direction>0?bottom:top,end=direction>0?top:bottom;
      ctx.strokeStyle=colors;ctx.lineWidth=1.7;
      const x=start.x+(direction>0?8:-8);
      line(ctx,x,start.y,x,end.y+(direction>0?-31:31));
    }
  }
  function renderSongStaff({at,scoreCanvas,scoreContainer,song,selectedSongNotes,lastTouchedNotes,scoreLabels,stepActive,songStaffHand}){
    if(scoreContainer.hidden)return;
    const width=Math.max(250,scoreCanvas.clientWidth||330),height=scoreCanvas.clientHeight||340,dpr=Math.min(2,window.devicePixelRatio||1);
    if(scoreCanvas.width!==Math.round(width*dpr)||scoreCanvas.height!==Math.round(height*dpr)){
      scoreCanvas.width=Math.round(width*dpr);scoreCanvas.height=Math.round(height*dpr);
    }
    const ctx=scoreCanvas.getContext('2d');if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#fbf7ed';ctx.fillRect(0,0,width,height);
    ctx.save();ctx.scale(1,height/H);drawBase(ctx,width);
    const x0=Math.min(Math.max(139,width*.34),190);
    const axis=timeAxis(selectedSongNotes),offset=x0-axis.at(at);
    const xAt=t=>axis.at(t)+offset;
    const visible=[];
    // Binary-search at the viewport edge rather than traversing the entire song.
    const times=axis.times;
    const minX=x0-27,maxX=width+28;
    let lower=0,upper=times.length;
    while(lower<upper){const mid=(lower+upper)>>1;if(xAt(times[mid])<minX)lower=mid+1;else upper=mid;}
    // Earlier sustained notes are also considered, bounded to the last 200 notes.
    const approxTime=times[Math.max(0,lower-1)]||0;
    const start=Theory.lowerBoundSong(selectedSongNotes,approxTime);
    for(let i=Math.max(0,start-200);i<selectedSongNotes.length;i++){
      const n=selectedSongNotes[i],x=xAt(n.start);
      if(x>maxX)break;
      if(x<minX||n.end<at-3)continue;
      const clef=songStaffHand(n)==='bass'?'bass':'treble';
      const pos=Notation.position(n.midi,clef,STAFF[clef].bottom,SPACE);
      const active=(n.start<=at&&n.end>at)||stepActive.has(n.midi);
      visible.push({...n,clef,voice:'1',x,y:pos.y,steps:pos.steps,bottom:STAFF[clef].bottom,active,
        color:active?'#11836b':clef==='bass'?'#7b5bae':'#397fa6',
        accidental:pos.accidental==='sharp'?'♯':pos.accidental==='flat'?'♭':''});
      if(visible.length>450)break;
    }
    if(!visible.length&&lastTouchedNotes.length){
      for(const midi of lastTouchedNotes){const clef=midi<60?'bass':'treble';const pos=Notation.position(midi,clef,STAFF[clef].bottom,SPACE);
        visible.push({midi,clef,voice:'1',start:at,x:x0,y:pos.y,steps:pos.steps,bottom:STAFF[clef].bottom,
          color:'#138668',active:true,accidental:pos.accidental==='sharp'?'♯':pos.accidental==='flat'?'♭':''});
      }
    }
    // The large left gutter is permanently reserved for clefs and staff labels.
    ctx.save();ctx.beginPath();ctx.rect(x0-25,23,width-x0+30,H-28);ctx.clip();
    for(const chord of ScoreLayout.groupAtOnset(visible)){
      drawChord(ctx,chord);
      const active=chord.filter(n=>n.active&&n.y>=29&&n.y<=H-20);
      if(scoreLabels!=='off'&&active.length===1){const n=active[0];ctx.fillStyle='#1b6451';ctx.font='bold 10px system-ui';
        ctx.fillText(noteName(n.midi),n.x-8,Math.max(25,n.y-17));
      }
    }
    if(!visible.length){ctx.fillStyle='#8f799c';ctx.font='12px system-ui';
      ctx.fillText('Play a key or start a song to see notes.',x0+9,173);
    }
    ctx.restore();
    ctx.fillStyle='#f0d7a4bd';ctx.fillRect(x0-3,26,6,H-37);
    ctx.fillStyle='#775d32';ctx.font='bold 11px system-ui';ctx.fillText('NOW',x0-15,18);
    ctx.restore();
  }
  return Object.freeze({renderSongStaff});
})();
