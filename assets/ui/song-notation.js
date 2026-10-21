import {ScoreRenderer} from '../visual/score-renderer.js';
import {VexflowRenderer} from '../visual/vexflow-renderer.js';
// Song notation view: note labels, live note readout and scrolling staff.
// Musical positioning remains in core/notation and visual/staff-renderer.
export function createSongNotation({$,songKeys,Theory,Notation,StaffRenderer,getContext}) {
  const {NOTES,midiName,midiSharp}=Theory;
  const keyLabelStore='garden-notes-score-labels-v1';
  const scoreCanvas=$('songStaffCanvas'), scoreContainer=$('songStaffPanel');
  let lastTouchedNotes=[], scoreLabels='pressed';
  try{scoreLabels=localStorage.getItem(keyLabelStore)||'pressed';}catch(e){}
  if(!['pressed','all','off'].includes(scoreLabels))scoreLabels='pressed';
  $('songKeyNames').value=scoreLabels;
  function updateSongKeyLabels(){
    for(const [n,key] of songKeys){
      const old=key.querySelector('.song-key-label');if(old)old.remove();
      if(scoreLabels==='all'||(scoreLabels==='pressed'&&n%12===0)){
        const span=document.createElement('span');span.className='song-key-label'+(scoreLabels==='all'?' every':'');span.textContent=midiName(n);key.append(span);
      }
    }
  }
  $('songKeyNames').addEventListener('change',e=>{scoreLabels=e.target.value;try{localStorage.setItem(keyLabelStore,scoreLabels);}catch(err){}updateSongKeyLabels();});
  // A successful VexFlow render has hit-tested notehead positions. Tap one
  // to hear it and identify its corresponding MIDI piano key. No guesses
  // are produced for empty stave areas or Canvas fallback rendering.
  let down=null;
  scoreContainer.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};},{passive:true});
  scoreContainer.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>10){down=null;return;}
    down=null;
    const found=VexflowRenderer.inspectAt(scoreCanvas,e.clientX,e.clientY);
    if(!found)return;
    readPlayedNotes([found.midi]);
    $('lessonInspect').textContent='Score note '+midiName(found.midi)+' · '+found.time.toFixed(2)+' seconds into the song. Find its highlighted piano key.';
    const key=songKeys.get(found.midi);key?.classList.add('song-done');
    window.setTimeout(()=>key?.classList.remove('song-done'),400);
  },{passive:true});
  $('songStaffVisible').addEventListener('change',e=>{scoreContainer.hidden=!e.target.checked;if(e.target.checked)requestAnimationFrame(()=>renderSongStaff(getContext().songPosition));});
  function readPlayedNotes(notes){
    lastTouchedNotes=notes.filter(n=>Number.isFinite(n)&&n>=21&&n<=108).slice(-10);
    const names=lastTouchedNotes.map(midiName);
    $('liveNoteName').textContent=names.length?names.join(' + '):'—';
    $('liveNoteDetail').innerHTML=lastTouchedNotes.length?(lastTouchedNotes.length>1?'<b>Last touched chord</b>':'<b>'+ (lastTouchedNotes[0]===60?'Middle C · ':'')+'Last key touched</b>')+' · '+lastTouchedNotes.map(n=>midiSharp(n)?midiName(n).replace('#','♯')+' / '+NOTES[(n+1)%12]+'♭'+Math.floor(n/12-1):midiName(n)).join(' · '):'Press any piano key to identify it.';
    renderSongStaff(getContext().songPosition);
  }
  function songStaffHand(note){return Notation.assignStaff(note,getContext().song?.tracks||[]);}
  function renderSongStaff(at=getContext().songPosition){
    const {song,selectedSongNotes,songPlaying,songGroups,songGroupIndex}=getContext();
    const stepActive = $('songMode').value==='step'&&songPlaying
      ? new Set(songGroups[songGroupIndex]?.midis||[]) : new Set();
    if(VexflowRenderer.render({song,notes:selectedSongNotes,at,canvas:scoreCanvas})){
      $('scoreRenderStatus').textContent=song?.score?.type==='MusicXML'?'Engraved MusicXML score · VexFlow':'MIDI transcription · inferred meter, rhythm and staff assignment';
      return;
    }
    VexflowRenderer.reset(scoreCanvas);
    $('scoreRenderStatus').textContent='Pitch guide fallback · '+(VexflowRenderer.getLastFailure()||'VexFlow unavailable')+' · MusicXML/MIDI playback unchanged';
    if(song?.score?.type==='MusicXML'){
      ScoreRenderer.render({at,score:song.score,canvas:scoreCanvas,notes:selectedSongNotes,stepActive,labels:scoreLabels});
    }else{
      StaffRenderer.renderSongStaff({at,scoreCanvas,scoreContainer,song,selectedSongNotes,lastTouchedNotes,scoreLabels,stepActive,songStaffHand});
    }
  }
  window.addEventListener('resize',()=>renderSongStaff(getContext().songPosition),{passive:true});
  return Object.freeze({updateSongKeyLabels,readPlayedNotes,renderSongStaff});
}
