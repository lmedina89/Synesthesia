// Pure notation geometry. Does not access the DOM, device pixels, or audio.
// MIDI input uses scientific pitch notation C4=60 (middle C).
export const Notation = (() => {
  const NATURAL_PITCH_CLASSES = [0,2,4,5,7,9,11];
  const BOTTOM_LINE = Object.freeze({treble: {octave:4,letter:2},bass:{octave:2,letter:4}}); // E4, G2
  const LINE_COUNT = 5;
  const STAFF_LINE_SPACING = 13;
  function spelling(midi,preferFlats=false){
    if(!Number.isInteger(midi)||midi<0||midi>127) throw new RangeError('MIDI note must be an integer 0–127');
    const pc=midi%12;
    let natural=0;
    while(natural<6&&NATURAL_PITCH_CLASSES[natural+1]<=pc)natural++;
    let altered=pc!==NATURAL_PITCH_CLASSES[natural];
    if(altered&&preferFlats){natural=(natural+1)%7;}
    const letter='CDEFGAB'[natural];
    const octave=Math.floor(midi/12)-1+(altered&&preferFlats&&natural===0?1:0);
    return Object.freeze({letter,octave,accidental:altered?(preferFlats?'flat':'sharp'):null,
      step:octave*7+natural, name:letter+(altered?(preferFlats?'♭':'♯'):'')+octave});
  }
  function position(midi,clef,bottom,spacing=STAFF_LINE_SPACING,preferFlats=false){
    if(!BOTTOM_LINE[clef])throw new RangeError('Invalid clef');
    const spelled=spelling(midi,preferFlats);
    const base=BOTTOM_LINE[clef];
    const steps=spelled.step-(base.octave*7+base.letter);
    return Object.freeze({...spelled,clef,steps,y:bottom-steps*spacing/2});
  }
  function ledgerLines(pos,bottom,spacing=STAFF_LINE_SPACING){
    // bottom line step 0, top line step +8. A ledger line exists at -2,-4,... or 10,12,...
    const values=[];
    if(pos.steps <= -2){for(let step=-2;step>=pos.steps;step-=2)values.push(bottom-step*spacing/2);}
    if(pos.steps >= 10){for(let step=10;step<=pos.steps;step+=2)values.push(bottom-step*spacing/2);}
    return values;
  }
  function stemDirection(pos){return pos.steps>=4?'down':'up';}
  function assignStaff(note,tracks=[]){
    const meta=(tracks.find(t=>t.id===note.track)?.name||'').toLowerCase();
    if(/left|bass|lower|\blh\b/.test(meta))return 'bass';
    if(/right|treble|upper|\brh\b|melody/.test(meta))return 'treble';
    return note.midi>=60?'treble':'bass'; // fallback heuristic; MIDI has no staff designation
  }
  return Object.freeze({spelling,position,ledgerLines,stemDirection,assignStaff,STAFF_LINE_SPACING,LINE_COUNT});
})();
