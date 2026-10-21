// Song Studio owns its own session lifecycle, playback, notation, keyboard,
// and library. The app composition root injects only the shared sound engine,
// persistent preferences and DOM lookup. No global application mutable state.
import {Theory} from '../core/theory.js';
import {Notation} from '../core/notation.js';
import {PracticeSession} from '../core/session.js';
import {SongCatalog} from '../core/catalog.js';
import {createSongTransport} from '../core/transport.js';
import {StaffRenderer} from '../visual/staff-renderer.js';
import {createSongNotation} from './song-notation.js';
import {paintSongRoll} from '../visual/roll-renderer.js';
import {createSongKeyboard} from './song-keyboard.js';
import {createFocusMode} from './focus-mode.js';
import {createSongLibrary} from './song-library.js';
import {selectTrackNotes, clampPlaybackPosition, formatSongTime, maximumNoteDuration} from '../core/song-state.js';

export function createSongStudio({$,state,audio}) {
  const {NOTES,noteMidi,midiName,midiSharp,lowerBoundSong}=Theory;
  const {demoSong}=SongCatalog;
  const {preloadSongSamples,soundMidi,soundMidiAt,stopSongVoices,clockSeconds,setInterruptionHandler,ensureAudioReady}=audio;
  const SONG_FIRST=21,SONG_LAST=108,SONG_W=29;
  let song=null,songPosition=0,songPlaying=false;
  let songAnimation=0,songGroups=[],songGroupIndex=0,songGroupDone=new Set();
  const transport=createSongTransport({
    now:clockSeconds,
    schedule:(note,at,duration,velocity)=>soundMidiAt(note.midi,at,duration,velocity),
    onScheduled:note=>focusSongKeys([note.midi])
  });
  // Safari can interrupt the AudioContext without a visibility change.
  // Pause at its actual audio-clock position rather than running silently.
  setInterruptionHandler(()=>{
    if(state.sound&&songPlaying&&$('songMode').value==='watch'){
      songPosition=transport.pause();stopSong();setSongPosition(songPosition);
      $('songFeedback').textContent='Piano audio interrupted. Restore sound, then tap Play to continue.';
    }
  });
  let songActive=new Set(),selectedSongNotes=[],songMaxDuration=0;
  const songKeys=new Map();
  const songUi={scroll:$('songScroll'),canvas:$('songRoll'),keys:$('songKeys')};
  const {pianoX,setupSongKeys}=createSongKeyboard({SONG_FIRST,SONG_LAST,SONG_W,songKeys,songUi,midiSharp,midiName,onPress:n=>handleSongKey(n)});
  // --- v0.6 live key names + continuously scrolling pitch staff ---
  const notation=createSongNotation({$,songKeys,Theory,Notation,StaffRenderer,
    getContext:()=>({song,songPosition,songPlaying,songGroups,songGroupIndex,selectedSongNotes})});
  const {updateSongKeyLabels,readPlayedNotes,renderSongStaff}=notation;

  function scopedNotes(){return selectedSongNotes;}
  let songNotes=[];
  function setSong(loaded){
    stopSong();song=loaded;
    songNotes=loaded.notes.slice().sort((a,b)=>a.start-b.start||a.midi-b.midi);
    const options=$('songTrack');options.replaceChildren(new Option('All notes','all'));
    for(const t of loaded.tracks)options.append(new Option(t.name+(t.channel?' ('+t.channel+')':''),String(t.id)));
    options.value='all';songPosition=0;
    buildSongGroups();setSongPosition(0);$('songTitle').textContent=song.name;
    $('songFeedback').textContent=(song.source==='MIDI'?'MIDI imported · ':'Demo ready · ')+songNotes.length+' notes. Choose Watch or Wait for my notes.';
    preloadSongSamples(songNotes);updateSongButtons();
  }
  function buildSongGroups(){const track=$('songTrack').value;selectedSongNotes=selectTrackNotes(songNotes,track);
    songMaxDuration=maximumNoteDuration(selectedSongNotes);
    songGroups=PracticeSession.groupedStarts(scopedNotes());songGroupIndex=0;songGroupDone.clear();
  }
  const fmtTime=formatSongTime;
  function updateSongButtons(){const stepping=$('songMode').value==='step';
    $('songPlay').textContent=stepping?'▶ Start note practice':songPlaying?'Ⅱ Pause song':'▶ Play song';
    if(stepping&&songPlaying)$('songPlay').textContent='Ⅱ Pause practice';
    $('songPlay').disabled=!song;
    $('focusPlay').textContent=songPlaying?'Ⅱ Pause':'▶ Play';
    $('focusPlay').disabled=!song;
  }
  const focus=createFocusMode({$,songUi,callbacks:{
    isPlaying:()=>songPlaying,position:()=>songPosition,groupMidis:()=>songGroups[songGroupIndex]?.midis||[],
    nextMidi:()=>selectedSongNotes.find(n=>n.start>=songPosition)?.midi??60,
    renderStaff:at=>renderSongStaff(at),pianoX,playSong:()=>playSong()
  }});
  const {enterFocus,exitFocus,syncFocusZoom,focusSongKeys}=focus;
  function stopSong(){transport.stop();songPlaying=false;cancelAnimationFrame(songAnimation);songAnimation=0;
    stopSongVoices();
    updateSongButtons();songActive.clear();renderSongHighlights();}
  function setSongPosition(time){if(!song)return;
    songPosition=clampPlaybackPosition(time,song.duration);
    const p=songPosition;
    $('songTime').textContent=fmtTime(p)+' / '+fmtTime(song.duration);
    $('songProgress').value=Math.round(1000*p/Math.max(.1,song.duration));
    songActive=activeSongPitches(p);
    drawSongRoll(p);renderSongHighlights();renderSongStaff(p);
  }
  function activeSongPitches(at){return PracticeSession.activePitches(selectedSongNotes,at,songMaxDuration,lowerBoundSong);}
  function seekSong(time){stopSong();setSongPosition(time);
    if($('songMode').value==='step'){buildSongGroups();songGroupIndex=PracticeSession.nextGroupIndex(songGroups,songPosition);renderSongHighlights();}
  }
  function renderSongHighlights(){
    if(!song)return;
    const step=$('songMode').value==='step';
    const target=step&&songPlaying?songGroups[songGroupIndex]:null;
    const highlights=new Set(songActive);
    for(const [n,key] of songKeys){
      key.classList.toggle('song-lit',!step&&songPlaying&&highlights.has(n));
      key.classList.toggle('song-target',!!target&&target.midis.includes(n)&&!songGroupDone.has(n));
      key.classList.toggle('song-done',!!target&&songGroupDone.has(n));
    }
    if(state.instrument==='kalimba'){
      document.querySelectorAll('#tineRow [data-note],#kalimbaNoteGrid [data-note]').forEach(el=>{
        const n=noteMidi(el.dataset.note);
        el.classList.toggle('correct',(!step&&songPlaying&&highlights.has(n))||(!!target&&target.midis.includes(n)&&!songGroupDone.has(n)));
      });
    }
  }
  function drawSongRoll(at=songPosition){
    paintSongRoll({at,canvas:songUi.canvas,notes:selectedSongNotes,maxDuration:songMaxDuration,
      pianoX,midiSharp,lowerBoundSong,SONG_FIRST,SONG_LAST,SONG_W});
  }
  function frameSong(){if(!songPlaying||!song)return;
    if($('songMode').value==='step')return;
    // Rendering reads transport position; it never triggers MIDI attacks.
    songPosition=transport.position();
    songActive=activeSongPitches(songPosition);
    $('songTime').textContent=fmtTime(songPosition)+' / '+fmtTime(song.duration);
    $('songProgress').value=Math.min(1000,Math.round(songPosition/Math.max(.01,song.duration)*1000));
    drawSongRoll(songPosition);renderSongHighlights();renderSongStaff(songPosition);
    if(songPosition>=song.duration){stopSong();setSongPosition(song.duration);$('songFeedback').textContent='Song finished! Replay it or try the note-by-note practice mode.';return;}
    songAnimation=requestAnimationFrame(frameSong);
  }
  async function playSong(){if(!song)return;
    if(songPlaying){if($('songMode').value!=='step')songPosition=transport.pause();stopSong();setSongPosition(songPosition);$('songFeedback').textContent='Paused. Press Play to continue.';return;}
    // Auto-enter immersive practice on start; users can exit without losing position.
    enterFocus();
    if(state.sound&&!await ensureAudioReady()){
      $('songFeedback').textContent='Sound is paused by the browser. Tap Restore sound, then press Play.';
      return;
    }
    preloadSongSamples(songNotes);
    if(songPosition>=song.duration)seekSong(0);
    songPlaying=true;
    if($('songMode').value==='step'){
      songGroupIndex=PracticeSession.nextGroupIndex(songGroups,songPosition);
      if(songGroupIndex>=songGroups.length)songGroupIndex=0;
      songGroupDone.clear();songPosition=songGroups[songGroupIndex]?.start||0;
      const g=songGroups[songGroupIndex];
      if(g)focusSongKeys(g.midis,true);
      $('songFeedback').textContent='Play the GREEN key'+(g?.midis.length>1?'s together (or one at a time)':'')+'. The song will wait for you.';
      drawSongRoll(songPosition);renderSongHighlights();renderSongStaff(songPosition);
    }else{
      transport.start(selectedSongNotes,songPosition,Number($('songSpeed').value)/100,song.duration);
      $('songFeedback').textContent='Playing at '+$('songSpeed').value+'%. Gold keys are sounding now.';
      songAnimation=requestAnimationFrame(frameSong);
    }
    updateSongButtons();
  }
  function handleSongKey(n){soundMidi(n,.55);readPlayedNotes([n]);
    // Ensure a tapped note also lights up while not following a song.
    const key=songKeys.get(n);if(key){key.classList.add('song-done');setTimeout(()=>{if(!songPlaying)key.classList.remove('song-done');else renderSongHighlights();},220);}
    acceptSongPracticeNote(n);
  }
  function acceptSongPracticeNote(n){
    if(!songPlaying||$('songMode').value!=='step')return;
    const g=songGroups[songGroupIndex];if(!g)return;
    if(!g.midis.includes(n)){$('songFeedback').textContent=midiName(n)+' is not in this chord. Look for the green keys.';return;}
    songGroupDone.add(n);
    if(songGroupDone.size===g.midis.length){
      songGroupIndex++;songGroupDone.clear();
      const next=songGroups[songGroupIndex];
      if(!next){songPlaying=false;setSongPosition(song.duration);$('songFeedback').textContent='🎉 Amazing! You completed the selected part, one note at a time.';updateSongButtons();return;}
      songPosition=next.start;$('songProgress').value=Math.round(1000*songPosition/song.duration);
      $('songTime').textContent=fmtTime(songPosition)+' / '+fmtTime(song.duration);
      $('songFeedback').textContent='✓ Correct! Next: '+next.midis.map(midiName).join(' + ')+'.';
      focusSongKeys(next.midis,true);drawSongRoll(songPosition);renderSongStaff(songPosition);
    }else{$('songFeedback').textContent='Good! '+(g.midis.length-songGroupDone.size)+' more note(s) in this chord.';}
    renderSongHighlights();
  }
  const library=createSongLibrary({$,callbacks:{
    setSong:loaded=>setSong(loaded),getNoteCount:()=>songNotes.length,
    clearSong:()=>{stopSong();song=null;songNotes=[];selectedSongNotes=[];songGroups=[];songPosition=0;songActive.clear();},
    drawRoll:at=>drawSongRoll(at),updateButtons:()=>updateSongButtons(),songKeys
  }});
  setupSongKeys();updateSongKeyLabels();

  $('songPlay').addEventListener('click',playSong);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&songPlaying&&$('songMode').value==='watch'){
    songPosition=transport.pause();
    stopSong();setSongPosition(songPosition);$('songFeedback').textContent='Paused while the app was in the background. Tap Play to continue.';
  }});
  $('songReset').addEventListener('click',()=>{seekSong(0);$('songFeedback').textContent='Back to the start. Ready to practice.';});
  $('songCenter').addEventListener('click',()=>{
    const g=$('songMode').value==='step'?songGroups[songGroupIndex]:null;
    const notes=g?.midis||[songNotes.find(n=>n.start>=songPosition)?.midi??60];focusSongKeys(notes,true);
  });
  $('songProgress').addEventListener('input',e=>{seekSong(song.duration*Number(e.target.value)/1000);});
  $('songSpeed').addEventListener('input',()=>{
    const speed=Number($('songSpeed').value)/100;
    if(songPlaying&&$('songMode').value==='watch'){
      songPosition=transport.pause();stopSongVoices();
      transport.start(selectedSongNotes,songPosition,speed,song.duration);
    }
    $('songSpeedText').textContent=$('songSpeed').value+'%';
  });
  $('songMode').addEventListener('change',()=>{seekSong(0);updateSongButtons();$('songFeedback').textContent=$('songMode').value==='step'?'Practice waits for you to play every highlighted note.':'Watch the keys light up in sync with the song.';});
  $('songTrack').addEventListener('change',()=>{seekSong(0);buildSongGroups();drawSongRoll(0);$('songFeedback').textContent='Part selected. Play to hear or practice only those notes.';});
  setSong(demoSong('twinkle'));syncFocusZoom();focusSongKeys([60],true);

  // Expose only the limited operations the app and beginner trainer need.
  return Object.freeze({
    songCallbacks: Object.freeze({isPlaying:()=>songPlaying,readPlayedNotes,acceptPracticeNote:acceptSongPracticeNote}),
    isWatching:()=>songPlaying&&$('songMode').value==='watch',
    isPlaying:()=>songPlaying,
    pauseForSoundSwitch:()=>{songPosition=transport.pause();stopSongVoices();},
    resumeAfterSoundSwitch:()=>transport.start(selectedSongNotes,songPosition,Number($('songSpeed').value)/100,song.duration),
    soundRestoreFailed:()=>{stopSong();setSongPosition(songPosition);$('songFeedback').textContent='Audio needs restoring. Tap Restore sound, then press Play.';}
  });
}
