// Pure song/practice operations, extracted from the UI controller.
export const PracticeSession = (() => {
  function groupedStarts(notes, tolerance=.055){
    const groups=[];
    for(const n of notes){
      const previous=groups.at(-1);
      if(previous&&Math.abs(n.start-previous.start)<tolerance){
        if(!previous.midis.includes(n.midi))previous.midis.push(n.midi);
      }else groups.push({start:n.start,midis:[n.midi]});
    }
    return groups;
  }
  function activePitches(notes,at,maxNoteDuration,lowerBound){
    const lo=lowerBound(notes,at-maxNoteDuration-.01);
    const hi=lowerBound(notes,at+.00001);
    const found=new Set();
    for(let i=lo;i<hi;i++){const n=notes[i];if(n.end>at)found.add(n.midi);}
    return found;
  }
  function nextGroupIndex(groups,at,epsilon=.04){
    const index=groups.findIndex(g=>g.start>=at-epsilon);
    return index<0?groups.length:index;
  }
  return Object.freeze({groupedStarts,activePitches,nextGroupIndex});
})();
