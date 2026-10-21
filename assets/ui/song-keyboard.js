// Presentational 88-key keyboard and input. No song-transport dependencies.
export function createSongKeyboard({SONG_FIRST,SONG_LAST,SONG_W,songKeys,songUi,midiSharp,midiName,onPress}) {
  function pianoX(n){
    let whites=0;
    for(let i=SONG_FIRST;i<n;i++)if(!midiSharp(i))whites++;
    return midiSharp(n)?whites*SONG_W : whites*SONG_W+SONG_W/2;
  }

  function setupSongKeys(){
    for(let n=SONG_FIRST;n<=SONG_LAST;n++)if(!midiSharp(n)){
      const key=document.createElement('button');key.type='button';key.className='song-white';
      key.style.left=(pianoX(n)-SONG_W/2)+'px';key.dataset.midi=n;
      key.setAttribute('aria-label','Play '+midiName(n));
      if(n%12===0)key.innerHTML='<span class="song-key-label">'+midiName(n)+'</span>';
      attachSongKey(key,n);songUi.keys.append(key);songKeys.set(n,key);
    }
    for(let n=SONG_FIRST;n<=SONG_LAST;n++)if(midiSharp(n)){
      const key=document.createElement('button');key.type='button';key.className='song-black';key.dataset.midi=n;
      key.setAttribute('aria-label','Play '+midiName(n));key.style.left=(pianoX(n)-9.5)+'px';
      attachSongKey(key,n);songUi.keys.append(key);songKeys.set(n,key);
    }
  }
  function attachSongKey(button,n){
    button.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){
      if(e.button!==0)return;e.preventDefault();onPress(n);
    }else if(e.pointerType==='touch'||e.pointerType==='pen'){
      button._downX=e.clientX;button._downY=e.clientY;
    }});
    button.addEventListener('pointerup',e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){
      if(Math.abs(e.clientX-(button._downX??e.clientX))<9&&Math.abs(e.clientY-(button._downY??e.clientY))<9){e.preventDefault();onPress(n);}
    }});
    button.addEventListener('click',e=>{if(e.detail===0)onPress(n);});
  }

  return {pianoX,setupSongKeys};
}
