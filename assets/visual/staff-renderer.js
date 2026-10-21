import {Theory} from '../core/theory.js';
import {Notation} from '../core/notation.js';
// Scrolling *pitch-accurate* piano staff. Screen rendering is distinct from the
// pure Notation model, making note positions/ledger lines verifiable in tests.
// MIDI cannot retain reliable key signatures, beaming, rests, or staff assignment.
export const StaffRenderer = (() => {
  const {midiName,lowerBoundSong}=Theory;
  const spacing=Notation.STAFF_LINE_SPACING;
  const staffTop=[56,69,82,95,108],staffBass=[167,180,193,206,219];
  const page='#fbf7ed';

  function drawLedger(ctx,x,ys){
    ctx.strokeStyle='#73657f';ctx.lineWidth=1.3;
    for(const y of ys){ctx.beginPath();ctx.moveTo(x-12,y);ctx.lineTo(x+13,y);ctx.stroke();}
  }
  function drawNote(ctx,x,y,color,pos,now,showName){
    const up=Notation.stemDirection(pos)==='up';
    ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=1.7;
    ctx.beginPath();ctx.ellipse(x,y,8.2,5.5,-.28,0,Math.PI*2);ctx.fill();
    // Stems have conventional directions. Rhythmic symbols are deliberately
    // omitted until a quantized meter/beat model can accurately supply them.
    ctx.beginPath();
    if(up){ctx.moveTo(x+7.2,y);ctx.lineTo(x+7.2,y-27);}
    else{ctx.moveTo(x-7.2,y);ctx.lineTo(x-7.2,y+27);}
    ctx.stroke();
    if(pos.accidental){
      ctx.font='bold 19px serif';ctx.fillText(pos.accidental==='flat'?'♭':'♯',x-22,y+6);
    }
    if(showName){
      ctx.font='bold 10px system-ui';ctx.fillStyle='#145741';
      ctx.fillText(midiName(now.midi),x-10,y-14);
    }
  }
  function renderSongStaff({at,scoreCanvas,scoreContainer,song,selectedSongNotes,lastTouchedNotes,scoreLabels,stepActive,songStaffHand}){
    if(scoreContainer.hidden)return;
    const cssWidth=Math.max(250,scoreCanvas.clientWidth||330),cssHeight=scoreCanvas.clientHeight||255;
    const scale=Math.min(2,window.devicePixelRatio||1);
    const devW=Math.round(cssWidth*scale),devH=Math.round(cssHeight*scale);
    if(scoreCanvas.width!==devW||scoreCanvas.height!==devH){scoreCanvas.width=devW;scoreCanvas.height=devH;}
    const ctx=scoreCanvas.getContext('2d');if(!ctx)return;
    ctx.setTransform(scale,0,0,scale,0,0);
    const w=cssWidth,h=cssHeight,factor=h/255;
    ctx.clearRect(0,0,w,h);ctx.fillStyle=page;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.scale(1,factor);
    const x0=Math.min(112,Math.max(92,w*.29));const speed=w<480?70:90;
    for(const ys of [staffTop,staffBass]){
      ctx.strokeStyle='#8f819a';ctx.lineWidth=1;
      for(const y of ys){ctx.beginPath();ctx.moveTo(12,y);ctx.lineTo(w-10,y);ctx.stroke();}
    }
    ctx.font='bold 11px system-ui';ctx.fillStyle='#675675';
    ctx.fillText('TREBLE',15,19);ctx.fillText('BASS',15,147);
    ctx.font='60px "Apple Symbols","Noto Music","DejaVu Sans",serif';ctx.fillStyle='#4e3b5f';
    ctx.fillText('𝄞',12,106);
    ctx.font='49px "Apple Symbols","Noto Music","DejaVu Sans",serif';ctx.fillText('𝄢',18,215);
    ctx.fillStyle='#f5e2b0';ctx.fillRect(x0-3,25,6,219);
    ctx.fillStyle='#7a5a27';ctx.font='bold 10px system-ui';ctx.fillText('NOW',x0-17,17);

    const visibleBack=2.2,visibleAhead=(w-x0)/speed+.5;
    const drawable=[];
    if(song&&selectedSongNotes.length){
      const from=lowerBoundSong(selectedSongNotes,at-visibleBack),to=at+visibleAhead;
      for(let i=Math.max(0,from-15);i<selectedSongNotes.length;i++){
        const n=selectedSongNotes[i];if(n.start>to)break;
        if(n.end>=at-visibleBack)drawable.push(n);
        if(drawable.length>=250)break;
      }
    }
    // Draw the individual pitch placements; MIDI timing controls only horizontal
    // spacing. Head collisions in same-time chords receive a small side shift.
    const occupied=[];
    for(const note of drawable){
      const baseX=x0+(note.start-at)*speed;if(baseX<-10||baseX>w+14)continue;
      const bass=songStaffHand(note)==='bass';const clef=bass?'bass':'treble';
      const bottom=bass?219:108,top=bass?167:56;
      const pos=Notation.position(note.midi,clef,bottom,spacing);
      const active=(note.start<=at&&note.end>at)||stepActive.has(note.midi);
      const color=active?'#21866f':bass?'#815cc1':'#387eaa';
      let x=baseX;
      const adjacent=occupied.find(item=>item.clef===clef&&Math.abs(item.baseX-baseX)<2&&Math.abs(item.steps-pos.steps)===1);
      if(adjacent)x+=10;
      occupied.push({clef,baseX,steps:pos.steps});
      // Do not clamp notes to a wrong staff pitch. For pitches outside the
      // physical view, show an explicit out-of-range note name instead.
      if(pos.y<28||pos.y>243){
        const edge=pos.y<28?28:243;
        ctx.fillStyle=color;ctx.font='bold 11px system-ui';
        ctx.fillText((pos.y<28?'↑ ':'↓ ')+pos.name,Math.max(5,Math.min(w-45,x)),edge);
        continue;
      }
      drawLedger(ctx,x,Notation.ledgerLines(pos,bottom,spacing).filter(y=>y>=24&&y<=246));
      // Avoid illegible overlapping names for multi-note chords; the full
      // playable chord is listed in the dedicated Live Note readout.
      const safeLabel=scoreLabels!=='off'&&active&&!drawable.some(other=>other!==note&&
        Math.abs(other.start-note.start)<.03&&songStaffHand(other)===clef&&Math.abs(other.midi-note.midi)<7);
      drawNote(ctx,x,pos.y,color,pos,note,safeLabel);
    }
    if(!drawable.length&&lastTouchedNotes.length){
      for(const midi of lastTouchedNotes){
        const bass=midi<60,bottom=bass?219:108,clef=bass?'bass':'treble';
        const pos=Notation.position(midi,clef,bottom,spacing);
        if(pos.y<28||pos.y>243){ctx.fillStyle='#168871';ctx.font='bold 11px system-ui';ctx.fillText((pos.y<28?'↑ ':'↓ ')+pos.name,x0+10,pos.y<28?28:243);continue;}
        drawLedger(ctx,x0,Notation.ledgerLines(pos,bottom,spacing).filter(y=>y>=24&&y<=246));
        drawNote(ctx,x0,pos.y,'#168871',pos,{midi},false);
        ctx.fillStyle='#365b53';ctx.font='bold 10px system-ui';ctx.fillText(midiName(midi),x0+14,pos.y+4);
      }
    }
    if(!drawable.length&&!lastTouchedNotes.length){
      ctx.fillStyle='#897895';ctx.font='12px system-ui';
      ctx.fillText('Play a key or start a song to see notes here.',Math.max(65,x0+18),130);
    }
    ctx.restore();
  }
  return Object.freeze({renderSongStaff});
})();
