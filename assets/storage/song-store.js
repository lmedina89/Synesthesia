// Isolated IndexedDB access; retains v0.7 keys and schema for backwards compatibility.
export const SongStorage = (() => {
  const SONG_DB='garden-notes-library-v1',SONG_STORE='midi-songs';
  async function songDB(){
    if(!('indexedDB' in window))throw Error('Local song storage is not available in this browser.');
    return await new Promise((resolve,reject)=>{
      const request=indexedDB.open(SONG_DB,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(SONG_STORE))request.result.createObjectStore(SONG_STORE,{keyPath:'key'});};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error('Local song storage could not open.'));
      request.onblocked=()=>reject(Error('Song storage is blocked by another open tab.'));
    });
  }
  async function savedSong(key){
    const db=await songDB();
    try{return await new Promise((resolve,reject)=>{
      const req=db.transaction(SONG_STORE,'readonly').objectStore(SONG_STORE).get(key);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error||Error('Unable to load saved MIDI.'));
    });}finally{db.close();}
  }
  async function saveSong(key,filename,buffer){
    const db=await songDB();
    try{await new Promise((resolve,reject)=>{
      const tx=db.transaction(SONG_STORE,'readwrite');
      tx.objectStore(SONG_STORE).put({key,filename,buffer,savedAt:Date.now()});
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||Error('Unable to store MIDI.'));
      tx.onabort=()=>reject(tx.error||Error('MIDI save transaction cancelled.'));
    });}finally{db.close();}
  }
  async function removeSong(key){
    const db=await songDB();
    try{await new Promise((resolve,reject)=>{
      const tx=db.transaction(SONG_STORE,'readwrite');
      tx.objectStore(SONG_STORE).delete(key);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||Error('Unable to remove stored MIDI.'));
      tx.onabort=()=>reject(tx.error||Error('MIDI removal cancelled.'));
    });}finally{db.close();}
  }
  return Object.freeze({savedSong,saveSong,removeSong});
})();
