// Browser audio adapter, sample cache, polyphonic playback and Safari resume handling.
export function createAudioEngine({state,$,noteMidi,midiName}) {
  let audioCtx = null;
  let audioHasStarted=false, audioRecoverySerial=0;
  /** @type {(contextState:string)=>void} */
  let interruptionListener=()=>{};
  // Real Yamaha C5 grand-piano recordings, Salamander Grand Piano V3
  // by Alexander Holm, licensed CC BY 3.0 (see README and LICENSE_SAMPLES.md).
  // Reusing a small subset of the sample naming scheme hosted by Tone.js.
  // Neighboring pitches are derived by small playback-rate changes.
  // Browser cache can keep recordings after the first load; network is needed initially.
  const SAMPLE_BASE='https://tonejs.github.io/audio/salamander/';
  const SAMPLE_NOTES=['C2','D#2','F#2','A2','C3','D#3','F#3','A3','C4','D#4','F#4','A4','C5','D#5','F#5','A5','C6','D#6','F#6','A6','C7'];
  const sampleBuffers=new Map(), sampleRequests=new Map();
  let sampleFailCount=0;
  function audioContext(){
    if(!audioCtx||audioCtx.state==='closed'){const AudioCtor=window.AudioContext||/** @type {any} */(window).webkitAudioContext;if(!AudioCtor)throw Error('Web Audio not supported');audioCtx=new AudioCtor();audioCtx.addEventListener?.('statechange',()=>{
      if(audioHasStarted&&!document.hidden)syncAudioGate();
      if(audioHasStarted&&audioCtx.state!=='running')interruptionListener(audioCtx.state);
    });}
    return audioCtx;
  }
  // Safari can suspend or interrupt WebAudio when leaving the app. Never claim
  // it is restored until the context really reports "running".
  function syncAudioGate(message){
    const gate=$('audioRecovery');if(!gate)return;
    gate.hidden=!state.sound||!audioHasStarted||document.hidden||!audioCtx||audioCtx.state==='running';
    if(message&&!gate.hidden)$('audioRecoveryMessage').textContent=message;
  }
  function resumeAudio(){
    try{const ctx=audioContext();audioHasStarted=true;
      if(ctx.state!=='running')ctx.resume().then(()=>syncAudioGate()).catch(()=>syncAudioGate('Audio was paused. Tap Restore sound to continue.'));
      return ctx;
    }catch(e){syncAudioGate('Audio unavailable in this browser.');return null;}
  }
  async function ensureAudioReady(){
    if(!state.sound)return true;
    const ctx=resumeAudio();if(!ctx)return false;
    try{if(ctx.state!=='running')await ctx.resume();}catch(e){}
    syncAudioGate('Safari paused the piano. Tap Restore sound to keep playing.');
    return ctx.state==='running';
  }
  async function restoreAudio(){
    audioHasStarted=true;const ok=await ensureAudioReady();
    if(ok){$('audioRecovery').hidden=true;try{playNote('C4');}catch(e){} }
    else syncAudioGate('Tap Restore sound again if Safari is still unlocking audio.');
    return ok;
  }
  let recoveryCheck=0;
  function wakeAudioAfterReturn(){
    if(!state.sound||!audioHasStarted||document.hidden)return;
    ++audioRecoverySerial;
    resumeAudio();
    clearTimeout(recoveryCheck);
    recoveryCheck=setTimeout(()=>syncAudioGate('Safari paused piano audio in the background. Tap Restore sound.'),350);
  }
  $('audioRestore').addEventListener('click',restoreAudio);
  window.addEventListener('pageshow',wakeAudioAfterReturn);
  window.addEventListener('focus',wakeAudioAfterReturn);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wakeAudioAfterReturn();else $('audioRecovery').hidden=true;});
  // If the user taps a real control, Safari permits reactivation in that gesture.
  document.addEventListener('pointerdown',()=>{
    if(audioHasStarted&&state.sound&&audioCtx?.state!=='running')resumeAudio();
  },{capture:true,passive:true});
  function closestSample(midi){
    let nearest=SAMPLE_NOTES[0],dist=Infinity;
    for(const name of SAMPLE_NOTES){const diff=Math.abs(noteMidi(name)-midi);if(diff<dist){nearest=name;dist=diff;}}
    return nearest;
  }
  function sampleFile(name){return name.replace('#','s')+'.mp3';}
  function loadSample(name){
    if(sampleRequests.has(name))return sampleRequests.get(name);
    const task=(async()=>{
      const ctx=audioContext();
      const response=await fetch(SAMPLE_BASE+sampleFile(name),{mode:'cors',cache:'force-cache'});
      if(!response.ok)throw Error('Sample request failed: '+response.status);
      const bytes=await response.arrayBuffer();
      const buffer=await ctx.decodeAudioData(bytes);
      sampleBuffers.set(name,buffer);
      return buffer;
    })().catch(err=>{sampleRequests.delete(name);sampleFailCount++;throw err;});
    sampleRequests.set(name,task);
    return task;
  }
  function neededSamplesForOctave(octave){
    const result=new Set();
    for(let n=0;n<=12;n++)result.add(closestSample(12*(octave+1)+n));
    return [...result];
  }
  function updateAudioStatus(){
    const status=$('audioStatus'), retry=$('retrySamples');
    if(!status)return;
    status.classList.remove('ready','fallback');
    const piano=state.instrument==='piano';status.hidden=!piano;retry.hidden=true;
    if(!piano)return;
    const wanted=neededSamplesForOctave(state.octave);
    const ready=wanted.filter(n=>sampleBuffers.has(n)).length;
    if(ready===wanted.length){status.textContent='✓ Real Yamaha C5 grand piano ready — '+wanted.length+' sampled notes loaded';status.classList.add('ready');}
    else if(sampleFailCount>0&&!wanted.some(n=>sampleRequests.has(n))){status.textContent='Piano samples need internet. Basic piano tones will play until they load.';status.classList.add('fallback');retry.hidden=false;}
    else{status.textContent='Loading real grand piano: '+ready+'/'+wanted.length+' recordings ready. Basic sound plays until loaded.';}
  }
  function preloadPianoOctave(){
    if(!state.sound || state.instrument!=='piano')return;
    const list=neededSamplesForOctave(state.octave);
    updateAudioStatus();
    for(const name of list){
      if(!sampleBuffers.has(name))loadSample(name).then(updateAudioStatus).catch(updateAudioStatus);
    }
  }
  function playSample(note){
    const ctx=audioContext(), mid=noteMidi(note), name=closestSample(mid);
    const buffer=sampleBuffers.get(name);
    if(!buffer)return false;
    const now=ctx.currentTime;
    const source=ctx.createBufferSource(), envelope=ctx.createGain();
    source.buffer=buffer;
    source.playbackRate.value=Math.pow(2,(mid-noteMidi(name))/12);
    envelope.gain.setValueAtTime(0.0001,now);
    envelope.gain.linearRampToValueAtTime(.26,now+.012);
    envelope.gain.setValueAtTime(.26,now+1.65);
    envelope.gain.exponentialRampToValueAtTime(.0001,now+3.25);
    source.connect(envelope);envelope.connect(ctx.destination);
    source.start(now);source.stop(now+3.3);
    return true;
  }
  function playSynth(note,kal){
    const ctx=audioContext();
    const now=ctx.currentTime, pitch=440*Math.pow(2,(noteMidi(note)-69)/12);
    const master=ctx.createGain();master.gain.setValueAtTime(.0001,now);
    master.gain.exponentialRampToValueAtTime(kal?.125:.10,now+(kal?.008:.017));
    master.gain.exponentialRampToValueAtTime(.0001,now+(kal?1.45:1.8));
    master.connect(ctx.destination);
    /** @type {Array<[number,number,OscillatorType]>} */
    const partials=kal?[[1,1,'sine'],[2.02,.36,'sine'],[3.9,.09,'sine']]:[[1,1,'triangle'],[2,.18,'sine'],[3,.07,'sine']];
    for(const [mult,vol,wave] of partials){
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type=wave;osc.frequency.setValueAtTime(pitch*mult,now);gain.gain.value=vol;
      osc.connect(gain);gain.connect(master);osc.start(now);osc.stop(now+(kal?1.52:1.87));
    }
  }
  function playNote(note){
    if(!state.sound)return;
    try{
      const ctx=resumeAudio();if(!ctx)return;
      if(state.instrument==='kalimba'){playSynth(note,true);return;}
      // Never silently claim 'real piano' when the sample isn't actually loaded.
      if(!playSample(note)){
        playSynth(note,false);
        preloadPianoOctave();
      }
    }catch(e){ /* Keep visual trainer available if audio is disabled or unsupported. */ }
  }
  const songVoices=new Set();
  // When scheduled by the transport, all start/stop/envelope timestamps share
  // the AudioContext clock, including the fallback synth. This permits stable
  // playback even when the visualizer drops frames.
  function soundMidiAt(n,when,duration=.35,velocity=90){
    if(!state.sound||!audioCtx||audioCtx.state!=='running')return false;
    try{
      const ctx=audioCtx,at=Math.max(ctx.currentTime+.003,when);
      const hold=Math.max(.04,Math.min(duration,8)),end=at+hold+.24;
      const gain=ctx.createGain(),volume=Math.min(.27,Math.max(.035,velocity/127*.23));
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.linearRampToValueAtTime(volume,at+.012);
      gain.gain.setValueAtTime(volume,at+hold);
      gain.gain.exponentialRampToValueAtTime(.0001,end-.012);
      gain.connect(ctx.destination);
      const name=closestSample(n),buffer=sampleBuffers.get(name);
      const sources=[];
      if(buffer){
        const src=ctx.createBufferSource();src.buffer=buffer;
        src.playbackRate.value=Math.pow(2,(n-noteMidi(name))/12);
        src.connect(gain);sources.push(src);
      }else{
        // Synthesis is a fallback, and is *also* scheduled for the correct time.
        loadSample(name).catch(()=>{});
        const pitch=440*Math.pow(2,(n-69)/12);
        /** @type {Array<[number,number,OscillatorType]>} */
        const partials=[[1,1,'triangle'],[2,.15,'sine'],[3,.045,'sine']];
        for(const [ratio,level,wave] of partials){
          const osc=ctx.createOscillator(),partial=ctx.createGain();
          osc.type=wave;osc.frequency.setValueAtTime(pitch*ratio,at);
          partial.gain.value=level;osc.connect(partial);partial.connect(gain);sources.push(osc);
        }
      }
      const voice={stop(){for(const src of sources){try{src.stop();}catch(e){}}}};
      songVoices.add(voice);
      let remaining=sources.length;
      for(const src of sources){
        src.onended=()=>{remaining--;if(remaining===0){songVoices.delete(voice);try{gain.disconnect();}catch(e){}}};
        src.start(at);src.stop(end);
      }
      return true;
    }catch(e){return false;}
  }
  function soundMidi(n,duration=.35,velocity=90){
    if(!state.sound)return;
    const ctx=resumeAudio();if(!ctx)return;
    // This path is a physical touch gesture, not background playback.
    return soundMidiAt(n,ctx.currentTime+.006,duration,velocity);
  }
  function preloadSongSamples(songNotes){if(!state.sound||!songNotes?.length)return;
    const unique=[...new Set(songNotes.map(n=>closestSample(n.midi)))];
    for(const name of unique){if(!sampleBuffers.has(name))loadSample(name).catch(()=>{});}
  }
  function stopSongVoices(){for(const voice of songVoices){try{voice.stop();}catch(e){}}songVoices.clear();}
  function retrySamples(){sampleFailCount=0;resumeAudio();preloadPianoOctave();updateAudioStatus();}
  function clockSeconds(){return state.sound&&audioCtx?audioCtx.currentTime:performance.now()/1000;}
  function setInterruptionHandler(callback){interruptionListener=callback;}
  return Object.freeze({syncAudioGate,resumeAudio,restoreAudio,ensureAudioReady,preloadPianoOctave,updateAudioStatus,preloadSongSamples,playNote,soundMidi,soundMidiAt,stopSongVoices,retrySamples,clockSeconds,setInterruptionHandler});
}
