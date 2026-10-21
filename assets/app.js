// Application composition root: preferences, shared audio and beginner trainer.
// Song Studio owns playback / notation / song library; UI modules own their DOM.
import {Theory} from './core/theory.js';
import {createAudioEngine} from './audio/engine.js';
import {createBeginnerTrainer} from './ui/beginner-trainer.js';
import {createSongStudio} from './ui/song-studio.js';
import {loadAppPreferences, persistAppPreferences} from './app/preferences.js';

const $ = id => document.getElementById(id);
const state=loadAppPreferences();
const {noteMidi,midiName}=Theory;
const audio=createAudioEngine({state,$,noteMidi,midiName});
const {syncAudioGate,ensureAudioReady,preloadPianoOctave,updateAudioStatus,playNote,retrySamples}=audio;
const studio=createSongStudio({$,state,audio});
const trainer=createBeginnerTrainer({$,state,Theory,audio,songCallbacks:studio.songCallbacks,savePreferences:()=>persistAppPreferences(state)});
const {handleNote,refreshInstrument,switchMode,nextChallenge,startDrill,syncReadRange,score,persist}=trainer;


  $('tabPiano').addEventListener('click',()=>{state.instrument='piano';refreshInstrument();});
  $('tabKalimba').addEventListener('click',()=>{state.instrument='kalimba';refreshInstrument();});
  $('octaveDown').addEventListener('click',()=>{state.octave=Math.max(2,state.octave-1);refreshInstrument();});
  $('octaveUp').addEventListener('click',()=>{state.octave=Math.min(6,state.octave+1);refreshInstrument();});
  $('labelsToggle').addEventListener('change',e=>{state.showLabels=e.target.checked;document.querySelectorAll('.piano,.tine-row,.kalimba-note-grid').forEach(el=>el.classList.toggle('hide-labels',!state.showLabels));persist();});
  $('soundBtn').addEventListener('click',async()=>{
    // Switching clock sources (Web Audio <-> performance clock) must never
    // jump the song to the end or replay notes from an old clock epoch.
    const watching=studio.isWatching();
    if(watching)studio.pauseForSoundSwitch();
    state.sound=!state.sound;
    $('soundBtn').textContent=state.sound?'♫ Sound on':'♪ Sound off';
    $('soundBtn').setAttribute('aria-pressed',String(state.sound));persist();
    if(state.sound){
      const ready=await ensureAudioReady();
      if(!ready&&watching)studio.soundRestoreFailed();
      preloadPianoOctave();
    }
    if(watching&&studio.isPlaying())studio.resumeAfterSoundSwitch();
    syncAudioGate();updateAudioStatus();
  });
  $('retrySamples').addEventListener('click',retrySamples);
  document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>switchMode(el.dataset.mode)));
  $('clefSelect').addEventListener('change',e=>{state.clef=e.target.value==='bass'?'bass':'treble';if(state.mode==='read'){syncReadRange();nextChallenge();}persist();});
  $('hearBtn').addEventListener('click',()=>playNote(state.current));$('nextBtn').addEventListener('click',nextChallenge);$('warmupBtn').addEventListener('click',startDrill);
  document.addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('button, input, textarea, select'))return;const map={'a':'C','w':'C#','s':'D','e':'D#','d':'E','f':'F','t':'F#','g':'G','y':'G#','h':'A','u':'A#','j':'B','k':'C+'};let name=map[e.key.toLowerCase()];if(name&&state.instrument==='piano'){e.preventDefault();handleNote(name==='C+'?'C'+(state.octave+1):name+state.octave);}});
  $('soundBtn').textContent=state.sound?'♫ Sound on':'♪ Sound off';$('soundBtn').setAttribute('aria-pressed',String(state.sound));score();refreshInstrument();
