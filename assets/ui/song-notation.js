import {ScoreRenderer} from '../visual/score-renderer.js';
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
  $('songStaffVisible').addEventListener('change',e=>{scoreContainer.hidden=!e.target.checked;if(e.target.checked)requestAnimationFrame(()=>renderSongStaff(songPosition));});
  function readPlayedNotes(notes){
    lastTouchedNotes=notes.filter(n=>Number.isFinite(n)&&n>=21&&n<=108).slice(-10);
    const names=lastTouchedNotes.map(midiName);
    $('liveNoteName').textContent=names.length?names.join(' + '):'—';
    $('liveNoteDetail').innerHTML=lastTouchedNotes.length?(lastTouchedNotes.length>1?'<b>Chord / multiple notes</b>':'<b>'+ (lastTouchedNotes[0]===60?'Middle C · ':'')+'Note played</b>')+' · '+lastTouchedNotes.map(n=>midiSharp(n)?midiName(n).replace('#','♯')+' / '+NOTES[(n+1)%12]+'♭'+Math.floor(n/12-1):midiName(n)).join(' · '):'Press any piano key to identify it.';
    renderSongStaff(getContext().songPosition);
  }
  function songStaffHand(note){return Notation.assignStaff(note,getContext().song?.tracks||[]);}
  function renderSongStaff(at=getContext().songPosition){
    const {song,selectedSongNotes,songPlaying,songGroups,songGroupIndex}=getContext();
    const stepActive = $('songMode').value==='step'&&songPlaying
      ? new Set(songGroups[songGroupIndex]?.midis||[]) : new Set();
    if(song?.score?.type==='MusicXML'){
      ScoreRenderer.render({at,score:song.score,canvas:scoreCanvas,notes:selectedSongNotes,stepActive,labels:scoreLabels});
    }else{
      StaffRenderer.renderSongStaff({at,scoreCanvas,scoreContainer,song,selectedSongNotes,lastTouchedNotes,scoreLabels,stepActive,songStaffHand});
    }
  }
  window.addEventListener('resize',()=>renderSongStaff(getContext().songPosition),{passive:true});
  return Object.freeze({updateSongKeyLabels,readPlayedNotes,renderSongStaff});
}
