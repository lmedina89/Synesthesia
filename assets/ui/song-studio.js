// Song Studio owns its own session lifecycle, playback, notation, keyboard,
// and library. The app composition root injects only the shared sound engine,
// persistent preferences and DOM lookup. No global application mutable state.
import {Theory} from '../core/theory.js';
import {Notation} from '../core/notation.js';
import {PracticeSession} from '../core/session.js';
import {GuidedLesson} from '../core/guided-lesson.js';
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
  // A lesson is opt-in. Watch & Listen remains the default outside guided mode.
  let lessonActive=false,lessonMeasures=[],lessonRange=null,lessonMistakes=0,lessonLoops=0;
  let lessonPresses=new Map(),lessonNotice='',lastHelperIndex=-1;
  const LESSON=GuidedLesson.DEFAULTS;
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
    stopSong();song=loaded;lessonActive=false;lessonRange=null;lessonMistakes=0;lessonLoops=0;
    $('lessonStop').disabled=true;
    songNotes=loaded.notes.slice().sort((a,b)=>a.start-b.start||a.midi-b.midi);
    const options=$('songTrack');options.replaceChildren(new Option('All notes','all'));
    for(const t of loaded.tracks)options.append(new Option(t.name+(t.channel?' ('+t.channel+')':''),String(t.id)));
    options.value='all';songPosition=0;
    refreshLessonMeasures();buildSongGroups();setSongPosition(0);$('songTitle').textContent=song.name;
    $('songFeedback').textContent=(song.source==='MIDI'?'MIDI imported · ':'Demo ready · ')+songNotes.length+' notes. Choose Watch or Wait for my notes.';
    preloadSongSamples(songNotes);updateSongButtons();renderLessonNotes();
  }
  function refreshLessonMeasures(){
    const result=GuidedLesson.measuresFor(song);lessonMeasures=result.measures;
    for(const id of ['lessonFirst','lessonLast']){$(id).max=Math.max(1,lessonMeasures.length);}
    $('lessonStatus').textContent=result.description+(result.estimated?' · Measure boundaries are estimated.':' · Written measure boundaries available.')+' Default lesson: RH, measures 1–4 at 50%.';
  }
  function activeRange(){return lessonActive&&lessonRange?lessonRange:null;}
  function buildSongGroups(){
    lessonNotice='';
    if(lessonActive){
      const hand=$('lessonHand').value;
      const result=GuidedLesson.chosenNotes(songNotes,song?.tracks||[],hand,$('songTrack').value);
      lessonNotice=result.notice;
      const measures=GuidedLesson.section(lessonMeasures,Number($('lessonFirst').value),Number($('lessonLast').value));
      lessonRange=measures;
      selectedSongNotes=GuidedLesson.notesWithin(result.notes,measures);
    }else{selectedSongNotes=selectTrackNotes(songNotes,$('songTrack').value);lessonRange=null;}
    selectedSongNotes.sort((a,b)=>a.start-b.start||a.midi-b.midi);
    songMaxDuration=maximumNoteDuration(selectedSongNotes);
    songGroups=GuidedLesson.groupNotes(selectedSongNotes);songGroupIndex=0;songGroupDone.clear();lessonPresses.clear();lastHelperIndex=-1;
    renderLessonNotes();
  }
  function renderLessonNotes(){
    const parent=$('lessonNoteChips');if(!parent)return;
    const next=$('songMode').value==='step'&&songPlaying?songGroups[songGroupIndex]?.start??songPosition:songPosition;
    const imminent=selectedSongNotes.filter(n=>n.start>=next-.04).slice(0,5);
    parent.replaceChildren();
    if(!imminent.length){parent.textContent='No upcoming notes in this selection.';return;}
    for(const n of imminent){
      const label=midiName(n.midi),duration=Math.max(0,n.end-n.start);
      const btn=document.createElement('button');btn.type='button';btn.textContent=label;
      btn.setAttribute('aria-label','Inspect and hear '+label);
      btn.addEventListener('click',()=>{
        readPlayedNotes([n.midi]);soundMidi(n.midi,.5);
        $('lessonInspect').textContent=label+' · '+duration.toFixed(2)+' seconds at original tempo · track '+(song?.tracks?.find(t=>t.id===n.track)?.name||n.track)+(Number.isFinite(n.endBeat)&&Number.isFinite(n.startBeat)?' · '+(n.endBeat-n.startBeat).toFixed(2)+' quarter-note beats':' · MIDI-inferred duration');
        focusSongKeys([n.midi],false);
      });
      parent.append(btn);
    }
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
  function seekSong(time){stopSong();const r=activeRange();setSongPosition(r?Math.max(r.start,Math.min(r.end,time)):time);
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
    const range=activeRange();
    if(range&&songPosition>=range.end-.015){
      if($('lessonLoop').checked){
        lessonLoops++;stopSongVoices();transport.start(selectedSongNotes,range.start,Number($('songSpeed').value)/100,range.end);
        songPosition=range.start;
        $('songFeedback').textContent='↻ Loop '+(lessonLoops+1)+' · measures '+range.first+'–'+range.last;
      }else{stopSong();setSongPosition(range.end);$('songFeedback').textContent='Practice section finished.';return;}
    } else if(!range&&songPosition>=song.duration){stopSong();setSongPosition(song.duration);$('songFeedback').textContent='Song finished! Replay it or try the note-by-note practice mode.';return;}
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
    const active=activeRange();
    if(lessonActive&&!selectedSongNotes.length){$('songFeedback').textContent=lessonNotice||'No notes available in this measure range.';return;}
    if(active&&(songPosition<active.start||songPosition>=active.end-.01))seekSong(active.start);
    else if(songPosition>=song.duration)seekSong(0);
    songPlaying=true;
    if($('songMode').value==='step'){
      songGroupIndex=PracticeSession.nextGroupIndex(songGroups,songPosition);
      if(songGroupIndex>=songGroups.length)songGroupIndex=0;
      songGroupDone.clear();lessonPresses.clear();songPosition=songGroups[songGroupIndex]?.start??0;
      const g=songGroups[songGroupIndex];
      if(g)focusSongKeys(g.midis,true);
      $('songFeedback').textContent='Play the GREEN key'+(g?.midis.length>1?'s together (or one at a time)':'')+'. The song will wait for you.';
      drawSongRoll(songPosition);renderSongHighlights();renderSongStaff(songPosition);renderLessonNotes();
    }else{
      transport.start(selectedSongNotes,songPosition,Number($('songSpeed').value)/100,active?.end??song.duration);
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
    const result=GuidedLesson.chordPress(g.midis,lessonPresses,n,performance.now(),{strict:lessonActive&&$('lessonStrict').checked});
    lessonPresses=result.progress;songGroupDone=new Set(lessonPresses.keys());
    if(result.status==='wrong'){
      lessonMistakes++;
      $('songFeedback').textContent='Not in this '+(g.midis.length>1?'chord':'note')+': '+midiName(n)+'. '+(lessonActive&&$('lessonStrict').checked?'Strict mode reset this attempt.':'Try the green key(s).');
    }else if(result.complete){
      songGroupIndex++;songGroupDone.clear();lessonPresses.clear();
      let next=songGroups[songGroupIndex];
      if(!next){
        if(lessonActive&&$('lessonLoop').checked){songGroupIndex=0;next=songGroups[0];lessonLoops++;$('songFeedback').textContent='↻ Passage completed! Loop '+(lessonLoops+1)+' · mistakes so far: '+lessonMistakes;}
        else{songPlaying=false;setSongPosition(activeRange()?.end??song.duration);$('songFeedback').textContent='🎉 Completed! Mistakes: '+lessonMistakes+'.';updateSongButtons();return;}
      }else{$('songFeedback').textContent='✓ Correct! Next: '+next.midis.map(midiName).join(' + ')+'.';}
      songPosition=next.start;$('songProgress').value=Math.round(1000*songPosition/song.duration);
      $('songTime').textContent=fmtTime(songPosition)+' / '+fmtTime(song.duration);
      focusSongKeys(next.midis,true);drawSongRoll(songPosition);renderSongStaff(songPosition);renderLessonNotes();
    }else{$('songFeedback').textContent='Good! '+(g.midis.length-songGroupDone.size)+' more note(s) in this chord.';}
    renderSongHighlights();
  }
  const library=createSongLibrary({$,callbacks:{
    setSong:loaded=>setSong(loaded),getNoteCount:()=>songNotes.length,
    clearSong:()=>{stopSong();song=null;songNotes=[];selectedSongNotes=[];songGroups=[];songPosition=0;songActive.clear();},
    drawRoll:at=>drawSongRoll(at),updateButtons:()=>updateSongButtons(),songKeys
  }});
  function resetLesson(resetPosition=true){
    lessonActive=false;lessonRange=null;$('lessonStop').disabled=true;stopSong();buildSongGroups();
    if(resetPosition)setSongPosition(0);
    $('lessonStatus').textContent='Guided lesson ended. Watch & Listen is available again.';
  }
  $('lessonBegin').addEventListener('click',async()=>{
    if(!song)return;
    stopSong();lessonActive=true;lessonMistakes=0;lessonLoops=0;
    $('songMode').value='step';
    $('songSpeed').value=$('lessonSpeed').value;$('songSpeedText').textContent=$('songSpeed').value+'%';
    buildSongGroups();
    if(!selectedSongNotes.length){
      const reason=lessonNotice;lessonActive=false;buildSongGroups();$('lessonStatus').textContent=reason||'No notes in this lesson. Select a specific practice track.';return;
    }
    $('lessonStop').disabled=false;
    $('lessonStatus').textContent='Guided '+$('lessonHand').value+' hand · measures '+lessonRange.first+'–'+lessonRange.last+' · '+$('lessonSpeed').value+'% · '+(lessonMeasures.length?'measure grid: '+GuidedLesson.measuresFor(song).description:'')+'. '+lessonNotice;
    setSongPosition(lessonRange.start);updateSongButtons();await playSong();
  });
  $('lessonStop').addEventListener('click',()=>resetLesson());
  $('lessonSpeed').addEventListener('input',()=>{$('lessonSpeedOut').textContent=$('lessonSpeed').value+'%';if(lessonActive){$('songSpeed').value=$('lessonSpeed').value;$('songSpeed').dispatchEvent(new Event('input'));}});
  for(const id of ['lessonHand','lessonFirst','lessonLast']){
    $(id).addEventListener('change',()=>{if(!lessonActive)return;stopSong();buildSongGroups();setSongPosition(lessonRange.start);$('lessonStatus').textContent=lessonNotice||'Selection updated. Press Play to resume.';});
  }
  $('songDiagnostic').addEventListener('click',async()=>{
    if(!song)return;
    const report=GuidedLesson.diagnostic(song);
    try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(report);
      $('lessonStatus').textContent='✓ Diagnostic copied! Paste it into our chat as plain text. No MIDI file upload required.';
    }catch(e){
      const blob=new Blob([report],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='Garden_Notes_Song_Diagnostic.txt';document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),10000);
      $('lessonStatus').textContent='Clipboard unavailable. Downloaded a .txt report; open it and copy/paste the text into our chat.';
    }
  });
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
      transport.start(selectedSongNotes,songPosition,speed,activeRange()?.end??song.duration);
    }
    $('songSpeedText').textContent=$('songSpeed').value+'%';
  });
  $('songMode').addEventListener('change',()=>{seekSong(activeRange()?.start??0);updateSongButtons();$('songFeedback').textContent=$('songMode').value==='step'?'Practice waits for you to play every highlighted note.':'Watch the keys light up in sync with the song.';});
  $('songTrack').addEventListener('change',()=>{seekSong(activeRange()?.start??0);buildSongGroups();drawSongRoll(activeRange()?.start??0);$('songFeedback').textContent='Part selected. Play to hear or practice only those notes.';});
  setSong(demoSong('twinkle'));syncFocusZoom();focusSongKeys([60],true);

  // Expose only the limited operations the app and beginner trainer need.
  return Object.freeze({
    songCallbacks: Object.freeze({isPlaying:()=>songPlaying,readPlayedNotes,acceptPracticeNote:acceptSongPracticeNote}),
    isWatching:()=>songPlaying&&$('songMode').value==='watch',
    isPlaying:()=>songPlaying,
    pauseForSoundSwitch:()=>{songPosition=transport.pause();stopSongVoices();},
    resumeAfterSoundSwitch:()=>transport.start(selectedSongNotes,songPosition,Number($('songSpeed').value)/100,activeRange()?.end??song.duration),
    soundRestoreFailed:()=>{stopSong();setSongPosition(songPosition);$('songFeedback').textContent='Audio needs restoring. Tap Restore sound, then press Play.';}
  });
}
