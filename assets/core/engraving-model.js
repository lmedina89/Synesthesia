import {Notation} from './notation.js';
// Side-effect-free score preparation. MusicXML notation is retained where supported.
// MIDI engraving is an explicitly quantized INTERPRETATION; playback data is untouched.
// Important: refuse unsupported rhythmic/voice layouts rather than losing noteheads.
export const EngravingModel = (() => {
  const UNITS=[
    {units:16,duration:'w',dots:0},{units:12,duration:'h',dots:1},
    {units:8,duration:'h',dots:0},{units:6,duration:'q',dots:1},
    {units:4,duration:'q',dots:0},{units:3,duration:'8',dots:1},
    {units:2,duration:'8',dots:0},{units:1,duration:'16',dots:0}
  ];
  const EPS=1e-5, MAX_VOICES=4, MAX_TICKS=160;
  const unsupported=message=>{throw new Error('Notation unavailable for this passage: '+message);};
  function durations(units){
    if(!Number.isSafeInteger(units)||units<0||units>1024)unsupported('invalid rhythmic length');
    const result=[];let remaining=units;
    for(const x of UNITS){while(remaining>=x.units){result.push(x.dots?x.duration+'d':x.duration);remaining-=x.units;}}
    return result;
  }
  // Never substitute a sixteenth note for an unrecognized note length.
  function durationFor(units){return UNITS.find(x=>x.units===units)?.duration??null;}
  function splitDuration(units){
    if(!Number.isSafeInteger(units)||units<1||units>1024)unsupported('invalid note duration');
    let remaining=units;const pieces=[];
    for(const x of UNITS)while(remaining>=x.units){pieces.push({...x});remaining-=x.units;}
    return pieces;
  }
  function quantize(beat,inferred){
    if(!Number.isFinite(beat))unsupported('non-finite timing');
    const tick=Math.round(beat*4);
    if(Math.abs(tick/4-beat)>(inferred?.125:0.0002))unsupported('unsupported rhythmic subdivision (e.g. triplet)');
    return tick;
  }
  function notationKey(n){
    if(n.step&&Number.isInteger(n.octave))return `${n.step.toLowerCase()}${n.alter>0?'#'.repeat(n.alter):n.alter<0?'b'.repeat(-n.alter):''}/${n.octave}`;
    const p=Notation.spelling(n.midi);return `${p.letter.toLowerCase()}${p.accidental==='sharp'?'#':''}/${p.octave}`;
  }
  function noteSpelling(n){const p=(!n.step||!Number.isInteger(n.octave))?Notation.spelling(n.midi):null;return `${n.step||p.letter}${n.alter===1?'#':n.alter===-1?'b':''}${n.octave??p.octave}`;}
  function forSong(song,selectedNotes){
    if(!song)return null;
    if(song.score?.type==='MusicXML'){
      const tracks=new Set(selectedNotes.map(n=>n.track));
      return {source:'MusicXML',inferred:false,measures:song.score.measures,
        notes:song.score.notes.filter(n=>tracks.has(n.track)).map((n,i)=>({...n,_scoreId:i,
          _tieId:(n.tieStart||n.tieStop)?`xml:${n.track}:${n.voice}:${n.midi}`:`xml:${i}`})),
        rests:song.score.rests.filter(n=>tracks.has(n.track))};
    }
    const used=selectedNotes;
    const maxBeat=Math.max(4,...used.map(n=>n.endBeat??n.end*2));
    const count=Math.max(1,Math.ceil(maxBeat/4));
    if(count>1024)unsupported('song is too long for the inferred 4/4 score');
    const measures=Array.from({length:count},(_,i)=>({index:i,number:String(i+1),startBeat:i*4,endBeat:(i+1)*4,beats:4,beatType:4,keyFifths:0}));
    const notes=used.map((n,i)=>{
      const staff=Notation.assignStaff(n,song.tracks),p=Notation.spelling(n.midi);
      return {...n,startBeat:n.startBeat??n.start*2,endBeat:n.endBeat??n.end*2,
        clef:staff,voice:'1',measure:Math.min(count-1,Math.floor((n.startBeat??n.start*2)/4)),
        step:p.letter,octave:p.octave,alter:p.accidental==='sharp'?1:0,notatedAccidental:'',_scoreId:i};
    });
    return {source:'MIDI',inferred:true,measures,notes,rests:[]};
  }
  function measureIndex(model,at){
    if(!model)return 0;
    if(model.inferred){
      const notes=model.notes;let lo=0,hi=notes.length;
      while(lo<hi){const mid=(lo+hi)>>1;if(notes[mid].start<=at)lo=mid+1;else hi=mid;}
      return Math.max(0,Math.min(model.measures.length-1,Math.floor((notes[Math.max(0,lo-1)]?.startBeat??0)/4)));
    }
    let lo=0,hi=model.measures.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(model.measures[mid].end<=at)lo=mid+1;else hi=mid;}
    return Math.min(model.measures.length-1,lo);
  }
  function staffVoices(model,measure,clef){
    const from=measure.startBeat,to=measure.endBeat;
    const startTick=quantize(from,false),endTick=quantize(to,false),maxTicks=endTick-startTick;
    if(maxTicks<1||maxTicks>256)unsupported('unsupported measure duration');
    const raw=[];
    for(const n of model.notes){
      if(n.clef!==clef||n.endBeat<=from+EPS||n.startBeat>=to-EPS)continue;
      const a=Math.max(startTick,quantize(n.startBeat,model.inferred));
      const b=Math.min(endTick,quantize(n.endBeat,model.inferred));
      if(b<=a)unsupported('note too short for sixteenth-note notation');
      raw.push({kind:'note',start:a,end:b,n,voice:String(n.voice||'1'),track:n.track??0});
    }
    if(!model.inferred)for(const r of model.rests){
      if(r.staff!==clef||r.endBeat<=from+EPS||r.startBeat>=to-EPS)continue;
      const a=Math.max(startTick,quantize(r.startBeat,false)),b=Math.min(endTick,quantize(r.endBeat,false));
      if(b>a)raw.push({kind:'rest',start:a,end:b,n:r,voice:String(r.voice||'1'),track:r.track??0});
    }
    // Group true chords only when notes have identical onset, offset, voice and track.
    const groups=new Map();
    for(const e of raw){
      const key=[e.kind,e.start,e.end,e.voice,e.track].join(':');
      if(!groups.has(key))groups.set(key,{kind:e.kind,start:e.start,end:e.end,
        voice:e.voice,track:e.track,entries:[]});
      groups.get(key).entries.push(e.n);
    }
    const events=[...groups.values()].sort((a,b)=>a.start-b.start||a.end-b.end||a.voice.localeCompare(b.voice));
    // Allocate overlapping lines to independent voices. No silent 'continue' or slice().
    const lanes=[];
    for(const e of events){
      let lane=lanes.find(l=>l.voice===e.voice&&l.track===e.track&&l.end<=e.start);
      if(!lane){lane={voice:e.voice,track:e.track,end:startTick,events:[]};lanes.push(lane);}
      lane.events.push(e);lane.end=e.end;
    }
    if(lanes.length>MAX_VOICES)unsupported(`${lanes.length} overlapping voices (limit ${MAX_VOICES})`);
    if(!lanes.length)lanes.push({voice:'1',track:0,end:startTick,events:[]});
    const output=[];
    for(const lane of lanes){
      let cursor=startTick;const ticks=[];
      const addRest=(len,hidden)=>{for(const d of durations(len)){
        const dotted=d.endsWith('d');ticks.push({kind:'rest',duration:dotted?d.slice(0,-1):d,dots:dotted?1:0,hidden});
      }};
      for(const e of lane.events){
        if(e.start<cursor)unsupported('overlapping events in a notation voice');
        addRest(e.start-cursor,model.inferred);
        const pieces=splitDuration(e.end-e.start);
        for(let i=0;i<pieces.length;i++){
          const p=pieces[i];
          const note=e.kind==='note';
          ticks.push({kind:e.kind,duration:p.duration,dots:p.dots,entries:e.entries,
            keys:note?e.entries.map(notationKey):[],names:note?e.entries.map(noteSpelling):[],
            accidentals:note?e.entries.map(n=>n.notatedAccidental||''):[],
            // Assign every source note its stable tie identifier; preserve ties from MusicXML.
            tieIds:note?e.entries.map(n=>String(n._tieId??n._scoreId)):[],
            tieIn:note?e.entries.map(n=>i>0||e.start>quantize(n.startBeat,model.inferred)||!!n.tieStop):[],
            tieOut:note?e.entries.map(n=>i<pieces.length-1||e.end<quantize(n.endBeat,model.inferred)||!!n.tieStart):[],
            time:note&&i===0?e.entries[0]?.start:null});
        }
        cursor=e.end;
      }
      addRest(endTick-cursor,model.inferred);
      if(ticks.length>MAX_TICKS)unsupported('too many rhythmic symbols in one voice');
      output.push({voice:lane.voice,track:lane.track,ticks});
    }
    const headCount=output.flatMap(v=>v.ticks).reduce((sum,t)=>sum+(t.kind==='note'?t.keys.length:0),0);
    const expected=raw.filter(e=>e.kind==='note').length;
    if(headCount<expected)unsupported('note preservation check failed');
    return output;
  }
  return Object.freeze({forSong,measureIndex,staffVoices,notationKey,noteSpelling,durations,durationFor,splitDuration});
})();
