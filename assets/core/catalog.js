// Data-driven repertoire metadata and bundled public-domain practice exercises.
export const SongCatalog = (() => {
  const RPG_SONGS={
    balamb:{title:'Balamb Garden',game:'Final Fantasy VIII',source:'https://www.vgmusic.com/file/b7167903bf8deb1195e96a8b0c1eba7a.html',help:'Open the VGMusic song page and download its piano MIDI. It contains separate Right Hand and Left Hand tracks.'},
    gods:{title:'Garden of the Gods',game:'Chrono Cross',source:'https://www.riulynrpg.info/',help:'On Riulyn’s page, find Chrono Cross → Garden of the Gods and download the MIDI from its row.'}
  };
  function demoSong(name){
    const notes=[];
    const add=(m,start,beats,track=0,velocity=92)=>notes.push({midi:m,start:start*.5,end:(start+beats)*.5,track,velocity});
    if(name==='scale'){[60,62,64,65,67,69,71,72,71,69,67,65,64,62,60].forEach((n,i)=>add(n,i,.8));
      return {name:'C Major Scale · warm-up',notes,tracks:[{id:0,name:'Right hand'}],duration:8,source:'demo'};}
    if(name==='chords'){
      [[48,52,55],[53,57,60],[55,59,62],[48,52,55]].forEach((c,i)=>c.forEach(n=>add(n,i*4,3.8,1,65)));
      [72,74,76,79,76,74,72,67,69,72,74,72,69,67,64,60].forEach((n,i)=>add(n,i,.8,0));
      return {name:'Chords & melody · two hands',notes,tracks:[{id:0,name:'Melody / right hand'},{id:1,name:'Chords / left hand'}],duration:8,source:'demo'};}
    const melody=[60,60,67,67,69,69,67,65,65,64,64,62,62,60,67,67,65,65,64,64,62,67,67,65,65,64,64,62,60,60,67,67,69,69,67,65,65,64,64,62,62,60];
    let beat=0;
    for(let i=0;i<melody.length;i++){const beats=([6,13,20,27,34,41].includes(i)?2:1);add(melody[i],beat,beats*.85);beat+=beats;}
    return {name:'Twinkle Twinkle Little Star',notes,tracks:[{id:0,name:'Melody'}],duration:beat*.5,source:'demo'};
  }
  return Object.freeze({RPG_SONGS,demoSong});
})();
