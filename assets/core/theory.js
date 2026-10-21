// Music theory primitives shared by the training, playback, and rendering subsystems.
export const Theory = (() => {
  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const WHITE = ['C','D','E','F','G','A','B','C'];
  const BLACK_POS = [[0,'C#'],[1,'D#'],[3,'F#'],[4,'G#'],[5,'A#']];
  function noteMidi(note){const m = /^([A-G]#?)(\d)$/.exec(note);return m? 12*(Number(m[2])+1)+NOTES.indexOf(m[1]):60;}
  function midiName(n){return NOTES[n%12]+Math.floor(n/12-1);}
  function midiSharp(n){return [1,3,6,8,10].includes(n%12);}
  function lowerBoundSong(notes,time){let lo=0,hi=notes.length;while(lo<hi){const m=(lo+hi)>>>1;if(notes[m].start<time)lo=m+1;else hi=m;}return lo;}
  return Object.freeze({NOTES,WHITE,BLACK_POS,noteMidi,midiName,midiSharp,lowerBoundSong});
})();
