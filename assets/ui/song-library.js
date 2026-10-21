import {SongCatalog} from '../core/catalog.js';
import {Midi} from '../core/midi.js';
import {MusicXML} from '../core/musicxml.js';
import {SongStorage} from '../storage/song-store.js';

// Personal library owns persistence, import controls, and offline private export.
export function createSongLibrary({$,callbacks}) {
  const {RPG_SONGS,demoSong}=SongCatalog;
  const {parseMidi}=Midi;
  const {parseMusicXML}=MusicXML;
  const {savedSong,saveSong,removeSong}=SongStorage;
  let librarySelectionSerial=0;
  // ---- Garden Notes Song Studio: local, dependency-free Standard MIDI File parser ----
  // A private HTML file exported from this app can carry user-provided MIDI bytes inside
  // a JSON script element. No network upload: exporting is performed entirely in-browser.
  let PACKED_SONGS={};
  try{PACKED_SONGS=JSON.parse($('private-song-pack')?.textContent||'{}')||{};}catch(e){PACKED_SONGS={};}
  function bufferFromBase64(base64){const binary=atob(base64);const arr=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)arr[i]=binary.charCodeAt(i);return arr.buffer;}
  function bufferToBase64(data){const bytes=new Uint8Array(data),size=8192;let s='';for(let i=0;i<bytes.length;i+=size)s+=String.fromCharCode(...bytes.subarray(i,i+size));return btoa(s);}
  function showLibraryControls(key,installed=false,embedded=false){
    const meta=RPG_SONGS[key];
    $('songLibraryActions').hidden=!meta;
    if(!meta){$('songLibraryStatus').textContent='Choose a song. Locally saved or personally embedded MIDI files open automatically.';return;}
    $('songLibrarySource').href=meta.source;
    $('songLibraryInstall').textContent=installed?'↥ Replace MIDI':'＋ Add downloaded MIDI';
    $('songLibraryRemove').hidden=!installed||embedded;
  }
  function songPlaceholder(meta){
    callbacks.clearSong();
    $('songTrack').replaceChildren(new Option('All notes','all'));
    $('songTitle').textContent=meta.title+' — add a MIDI to begin';
    $('songTime').textContent='0:00 / 0:00';$('songProgress').value=0;
    callbacks.drawRoll(0);
    for(const key of callbacks.songKeys.values())key.classList.remove('song-lit','song-target','song-done');
    callbacks.updateButtons();
  }
  function setLibrarySong(key,buffer,filename){
    const meta=RPG_SONGS[key];
    const loaded=parseMidi(buffer,filename);
    loaded.name=meta.title+' · '+meta.game;
    callbacks.setSong(loaded);
    $('songDemo').value='';
    return loaded;
  }
  async function selectLibrarySong(){
    const key=$('songLibrary').value,meta=RPG_SONGS[key];
    const serial=++librarySelectionSerial;
    showLibraryControls(key,false);
    if(!meta)return;
    songPlaceholder(meta);
    $('songLibraryStatus').textContent='Looking for your saved '+meta.title+' MIDI…';
    try{
      // Use an explicitly saved replacement first; otherwise read the MIDI from the user's
      // exported private HTML bundle, if present. Both are actual MIDI bytes.
      let saved=null;
      try{saved=await savedSong(key);}catch(err){if(!PACKED_SONGS[key])throw err;}
      if(serial!==librarySelectionSerial)return;
      const packed=!saved&&PACKED_SONGS[key];
      if(saved||packed){
        const bytes=saved?saved.buffer:bufferFromBase64(packed.base64);
        const loaded=setLibrarySong(key,bytes,saved?saved.filename:packed.filename);
        showLibraryControls(key,true,!!packed);
        $('songLibraryStatus').textContent='✓ '+meta.title+(packed?' is embedded permanently in this personal HTML copy':' is saved on this device')+' · '+loaded.notes.length+' piano notes. Ready to learn!';
      }else{
        $('songLibraryStatus').textContent=meta.help+' Then tap “Add downloaded MIDI” below to save it here for future sessions.';
        $('songFeedback').textContent=meta.title+' is ready for a one-time MIDI import.';
      }
    }catch(err){
      if(serial!==librarySelectionSerial)return;
      $('songLibraryStatus').textContent='Could not access locally saved songs: '+(err.message||'storage unavailable')+'. You can still import a MIDI for this session.';
    }
  }

  async function exportPrivateSongPack(){
    const button=$('exportSongPack');button.disabled=true;
    $('songLibraryStatus').textContent='Preparing your private, permanent song copy…';
    try{
      const merged={...PACKED_SONGS};
      for(const key of Object.keys(RPG_SONGS)){
        try{const saved=await savedSong(key);if(saved?.buffer)merged[key]={filename:saved.filename||key+'.mid',base64:bufferToBase64(saved.buffer)};}
        catch(e){/* Storage blocked? Existing embedded songs still export. */}
      }
      if(!Object.keys(merged).length){
        $('songLibraryStatus').textContent='No downloaded MIDI files are saved yet. First add at least one song, then create your permanent personal copy.';return;
      }
      // Production uses external ESM assets. For a portable PRIVATE export load
      // the separately generated, self-contained standalone build.
      let source;
      if(document.querySelector('script[type="module"]')){
        const standalone=await fetch(new URL('./standalone.html',document.baseURI),{cache:'no-store'});
        if(!standalone.ok)throw Error('Standalone export template is unavailable (HTTP '+standalone.status+').');
        source=await standalone.text();
      }else{
        // Already inside a single-file personal copy: clone it directly.
        source='<!DOCTYPE html>\n'+document.documentElement.outerHTML;
      }
      const clone=new DOMParser().parseFromString(source,'text/html').documentElement;
      for(const selector of ['#piano','#tineRow','#kalimbaNoteGrid','#songKeys','#notesLine','#staffScore'])clone.querySelector(selector)?.replaceChildren();
      const track=clone.querySelector('#songTrack');if(track)track.replaceChildren(new Option('All notes','all'));
      const old=clone.querySelector('#private-song-pack');old?.remove();
      const data=document.createElement('script');data.id='private-song-pack';data.type='application/json';data.textContent=JSON.stringify(merged).replace(/</g,'\\u003c');
      clone.querySelector('head').append(data);
      const out='<!DOCTYPE html>\n'+clone.outerHTML;
      const blob=new Blob([out],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='Garden_Notes_v0.13_PRIVATE_Songs.html';document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),15000);
      $('songLibraryStatus').textContent='✓ Exported private HTML with '+Object.keys(merged).length+' embedded MIDI song(s). Keep it private; the iPhone Files preview may not run interactive HTML.';
    }catch(e){$('songLibraryStatus').textContent='Could not create private song copy: '+(e.message||'export failed');}
    finally{button.disabled=false;}
  }
  $('exportSongPack').addEventListener('click',exportPrivateSongPack);

  $('songLibrary').addEventListener('change',selectLibrarySong);
  $('songLibraryInstall').addEventListener('click',()=>$('songLibraryFile').click());
  $('songLibraryFile').addEventListener('change',async e=>{
    const f=e.target.files?.[0],key=$('songLibrary').value;
    e.target.value='';
    if(!f||!RPG_SONGS[key])return;
    if(f.size>5*1024*1024){$('songLibraryStatus').textContent='That MIDI is over the 5 MB file limit.';return;}
    try{
      const buffer=await f.arrayBuffer();
      const loaded=setLibrarySong(key,buffer,f.name);
      const serial=++librarySelectionSerial;
      try{
        await saveSong(key,f.name,buffer);
        if(serial!==librarySelectionSerial)return;
        showLibraryControls(key,true);
        $('songLibraryStatus').textContent='✓ '+RPG_SONGS[key].title+' saved on this device · '+loaded.notes.length+' notes, '+loaded.tracks.length+' part(s). You can replay it any time.';
      }catch(err){
        if(serial!==librarySelectionSerial)return;
        $('songLibraryStatus').textContent='MIDI opened, but could not save on this device ('+(err.message||'storage issue')+'). You can practice it now; importing again may be needed next time.';
      }
    }catch(err){$('songLibraryStatus').textContent=err.message||'This file could not be imported. Please choose a standard .mid MIDI file.';}
  });
  $('songLibraryRemove').addEventListener('click',async()=>{
    const key=$('songLibrary').value,meta=RPG_SONGS[key];if(!meta)return;
    try{await removeSong(key);++librarySelectionSerial;showLibraryControls(key,false);songPlaceholder(meta);
      $('songLibraryStatus').textContent='Saved '+meta.title+' MIDI removed from this device. You can add it again any time.';
    }catch(err){$('songLibraryStatus').textContent='Unable to remove saved MIDI: '+(err.message||'storage error');}
  });
  $('songFile').addEventListener('change',async e=>{
    const f=e.target.files?.[0];if(!f)return;
    const isXML=/\.(musicxml|xml)$/i.test(f.name);
    if(f.size>(isXML?3:5)*1024*1024){$('songFeedback').textContent='This file is too large.';return;}
    try{const loaded=isXML?parseMusicXML(await f.text(),f.name):parseMidi(await f.arrayBuffer(),f.name);++librarySelectionSerial;$('songLibrary').value='';showLibraryControls('');callbacks.setSong(loaded);$('songDemo').value='';
      $('songFeedback').textContent='Imported '+f.name+' · '+callbacks.getNoteCount()+' notes in '+loaded.tracks.length+' part(s).' + (isXML?' Notated measures and rests preserved.':' Pitch/timing guide only.');}
    catch(err){$('songFeedback').textContent=err.message||'Could not read this score file.';}
    e.target.value='';
  });
  $('songDemo').addEventListener('change',e=>{if(e.target.value){++librarySelectionSerial;$('songLibrary').value='';showLibraryControls('');callbacks.setSong(demoSong(e.target.value));}});

  return {showLibraryControls,selectLibrarySong};
}
