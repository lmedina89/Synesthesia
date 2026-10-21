// Pure, deterministic score-layout helpers shared by both notation renderers.
// MIDI event time is never modified; visual x positions may be expanded to
// avoid collisions. A playhead reads from the same time-to-x map as noteheads.
export const ScoreLayout = (() => {
  const EPS=0.00001;
  const DIATONIC='CDEFGAB';
  function diatonicPosition(note,bottom,lineSpacing=14){
    const base=note.clef==='bass'?2*7+4:4*7+2; // G2 / E4
    const idx=DIATONIC.indexOf(note.step);
    if(idx<0||!Number.isInteger(note.octave))throw new RangeError('Invalid notated pitch');
    const steps=note.octave*7+idx-base;
    return {steps,y:bottom-steps*lineSpacing/2};
  }
  function timeline(events,secondsPerPx=1/83,minStep=19){
    // Start events must be chronological; sorting is local to keep source immutable.
    const sorted=Array.from(new Set(events.filter(Number.isFinite).map(n=>Math.round(n*100000)/100000))).sort((a,b)=>a-b);
    if(!sorted.length)return {times:[0],positions:[0],at:t=>t/secondsPerPx};
    const positions=[sorted[0]/secondsPerPx];
    for(let i=1;i<sorted.length;i++){
      positions.push(positions[i-1]+Math.max((sorted[i]-sorted[i-1])/secondsPerPx,minStep));
    }
    function at(t){
      if(t<=sorted[0])return positions[0]+(t-sorted[0])/secondsPerPx;
      const last=sorted.length-1;
      if(t>=sorted[last])return positions[last]+(t-sorted[last])/secondsPerPx;
      let low=0,hi=last;
      while(low+1<hi){const mid=(low+hi)>>1;if(sorted[mid]<=t)low=mid;else hi=mid;}
      const fraction=(t-sorted[low])/(sorted[hi]-sorted[low]);
      return positions[low]+fraction*(positions[hi]-positions[low]);
    }
    return {times:sorted,positions,at};
  }
  function noteOffsets(chord){
    // Adjacent seconds in a written chord require opposing noteheads.
    const sorted=[...chord].sort((a,b)=>a.y-b.y||a.midi-b.midi);
    const result=new Map();
    for(let i=0;i<sorted.length;i++){
      let offset=0;
      if(i&&Math.abs(sorted[i].y-sorted[i-1].y)<8.5){
        const prev=result.get(sorted[i-1]);offset=prev===0?12:0;
      }
      result.set(sorted[i],offset);
    }
    return result;
  }
  function accidentalOffsets(notes){
    // Accidentals vertically closer than 3 staff steps get separate columns.
    const result=new Map(),columns=[];
    for(const n of [...notes].filter(n=>n.accidental).sort((a,b)=>a.y-b.y)){
      let col=columns.findIndex(lastY=>Math.abs(lastY-n.y)>=24);
      if(col<0){col=columns.length;columns.push(n.y);}else columns[col]=n.y;
      result.set(n,-21-12*col);
    }
    return result;
  }
  function groupAtOnset(notes){
    // Chords in one voice receive one shared stem, not an individual stem per key.
    const by=new Map();
    for(const n of notes){
      const key=n.clef+'|'+n.voice+'|'+n.start.toFixed(5);
      if(!by.has(key))by.set(key,[]);
      by.get(key).push(n);
    }
    return [...by.values()];
  }
  return Object.freeze({diatonicPosition,timeline,noteOffsets,accidentalOffsets,groupAtOnset});
})();
