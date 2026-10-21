import {Notation} from './notation.js';
// Pure, bounded MusicXML/MIDI-to-staff preparation. All rendering is delegated to VexFlow.
// MIDI does not contain a reliable sheet-music voice/staff/clef, and is explicitly inferred.
export const EngravingModel = (()=>{
  const intervals=[{n:16,d:'w'},{n:12,d:'hd'},{n:8,d:'h'},{n:6,d:'qd'},{n:4,d:'q'},{n:3,d:'8d'},{n:2,d:'8'},{n:1,d:'16'}];
  function durations(count){let rem=Math.min(64,Math.max(0,count)),out=[];for(const x of intervals){while(rem>=x.n){out.push(x.d);rem-=x.n;}}return out;}
  function durationFor(count){return intervals.find(x=>x.n===count)?.d||'16';}
  function notationKey(n){
    if(n.step&&Number.isInteger(n.octave))return `${n.step.toLowerCase()}${n.alter>0?'#'.repeat(n.alter):n.alter<0?'b'.repeat(-n.alter):''}/${n.octave}`;
    const p=Notation.spelling(n.midi);return `${p.letter.toLowerCase()}${p.accidental==='sharp'?'#':''}/${p.octave}`;
  }
  function noteSpelling(n){return `${n.step||Notation.spelling(n.midi).letter}${n.alter===1?'#':n.alter===-1?'b':''}${n.octave??Notation.spelling(n.midi).octave}`;}
  function forSong(song,selectedNotes){
    if(!song)return null;
    if(song.score?.type==='MusicXML'){
      const tracks=new Set(selectedNotes.map(n=>n.track));
      return {source:'MusicXML',inferred:false,measures:song.score.measures,notes:song.score.notes.filter(n=>tracks.has(n.track)),rests:song.score.rests.filter(n=>tracks.has(n.track))};
    }
    // Exact MIDI tick positions (startBeat/endBeat) are retained during MIDI parsing.
    // 4/4 meter is only a visual assumption, never presented as original notation.
    const used=selectedNotes;
    const maxBeat=Math.max(4,...used.map(n=>n.endBeat??n.end*2));
    const count=Math.min(1024,Math.max(1,Math.ceil(maxBeat/4)));
    const measures=Array.from({length:count},(_,i)=>({index:i,number:String(i+1),startBeat:i*4,endBeat:(i+1)*4,beats:4,beatType:4,
      start:0,end:0,keyFifths:0}));
    const notes=used.map(n=>{
      const staff=Notation.assignStaff(n,song.tracks);
      const p=Notation.spelling(n.midi);
      const startBeat=n.startBeat??n.start*2,endBeat=n.endBeat??n.end*2;
      return {...n,startBeat,endBeat,durationBeats:Math.max(.25,endBeat-startBeat),clef:staff,voice:'1',measure:Math.min(count-1,Math.floor(startBeat/4)),
        step:p.letter,octave:p.octave,alter:p.accidental==='sharp'?1:0,notatedAccidental:p.accidental||''};
    });
    return {source:'MIDI',inferred:true,measures,notes,rests:[]};
  }
  function measureIndex(model,at){
    if(!model)return 0;
    if(model.inferred){
      let lo=0,hi=model.notes.length;
      // Notes generally sorted chronologically; use the nearest active/preceding note.
      while(lo<hi){const mid=(lo+hi)>>1;if(model.notes[mid].start<=at)lo=mid+1;else hi=mid;}
      const n=model.notes[Math.max(0,lo-1)];return Math.min(model.measures.length-1,Math.floor((n?.startBeat??0)/4));
    }
    let lo=0,hi=model.measures.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(model.measures[mid].end<=at)lo=mid+1;else hi=mid;}
    return Math.min(model.measures.length-1,lo);
  }
  function staffVoices(model,measure,clef){
    const from=measure.startBeat,to=measure.endBeat;
    const all=model.notes.filter(n=>n.clef===clef&&n.startBeat>=from-0.001&&n.startBeat<to-0.001&&n.endBeat>from);
    const rests=model.inferred?[]:model.rests.filter(n=>n.staff===clef&&n.startBeat>=from-0.001&&n.startBeat<to-0.001);
    const grouped=new Map();
    for(const n of all){let voice=model.inferred?'1':n.voice||'1';if(!grouped.has(voice))grouped.set(voice,[]);
      grouped.get(voice).push({kind:'note',at:n.startBeat,until:n.endBeat,entry:n});}
    for(const r of rests){let voice=r.voice||'1';if(!grouped.has(voice))grouped.set(voice,[]);
      grouped.get(voice).push({kind:'rest',at:r.startBeat,until:r.endBeat,entry:r});}
    if(!grouped.size)grouped.set('1',[]);
    let voices=[];
    for(const [voice,events] of [...grouped].slice(0,4)){
      events.sort((a,b)=>a.at-b.at||a.kind.localeCompare(b.kind));
      const buckets=[];
      for(const e of events){let g=buckets.at(-1);if(g&&e.kind==='note'&&g.kind==='note'&&Math.abs(g.at-e.at)<0.015){g.entries.push(e.entry);g.until=Math.min(g.until,e.until);}else buckets.push({kind:e.kind,at:e.at,until:e.until,entries:[e.entry]});}
      const ticks=[];let cursor=0,maxTicks=Math.round((to-from)*4);
      for(let i=0;i<buckets.length&&ticks.length<60;i++){
        const b=buckets[i],begin=Math.max(0,Math.round((b.at-from)*4));
        if(begin<cursor)continue;
        for(const d of durations(begin-cursor))ticks.push({kind:'rest',duration:d,hidden:model.inferred});
        const end=Math.min(maxTicks,Math.max(begin+1,Math.round((b.until-from)*4)));
        let len=end-begin;
        if(model.inferred&&i<buckets.length-1)len=Math.min(len,Math.max(1,Math.round((buckets[i+1].at-b.at)*4)));
        const duration=durationFor(len);
        ticks.push({kind:b.kind,duration,entries:b.entries,time:b.entries[0]?.start,keys:b.kind==='note'?b.entries.map(notationKey):[],
          names:b.kind==='note'?b.entries.map(noteSpelling):[]});
        cursor=begin+len;
      }
      for(const d of durations(maxTicks-cursor))ticks.push({kind:'rest',duration:d,hidden:model.inferred});
      voices.push({voice,ticks:ticks.slice(0,70)});
    }
    return voices;
  }
  return Object.freeze({forSong,measureIndex,staffVoices,notationKey,noteSpelling,durations,durationFor});
})();
