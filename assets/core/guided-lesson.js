// Pure guided-learning selectors and evaluation. No DOM, browser timers or audio.
export const GuidedLesson = (() => {
  const DEFAULTS=Object.freeze({hand:'right',first:1,last:4,speed:50,loop:true,strict:false});
  const clip=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:min));
  function measuresFor(song){
    if(song?.score?.measures?.length)return {measures:song.score.measures.map((m,i)=>({number:i+1,start:m.start,end:m.end})),estimated:false,description:'MusicXML measures'};
    if(song?.practiceMeasures?.length)return {measures:song.practiceMeasures,estimated:!!song.measuresInferred,description:song.measureDescription||'MIDI timeline'};
    // Legacy demos have half-second beats, but no explicit meter. Be honest.
    const length=Math.max(0,song?.duration||0),measures=[];
    for(let s=0;s<length-.00001;s+=2)measures.push({number:measures.length+1,start:s,end:Math.min(s+2,length)});
    return {measures:measures.length?measures:[{number:1,start:0,end:length}],estimated:true,description:'Demo: inferred 4/4, 120 BPM'};
  }
  function section(measures,first,last){
    const maximum=Math.max(1,measures.length),a=clip(Math.floor(Number(first)),1,maximum);
    const b=clip(Math.floor(Number(last)),a,maximum);
    return {first:a,last:b,start:measures[a-1]?.start||0,end:measures[b-1]?.end||0};
  }
  function handTracks(tracks,hand,override='all'){
    if(override!=='all')return {ids:new Set([Number(override)]),notice:'Using the manually selected MIDI track for '+hand+'-hand practice.'};
    if(hand==='both')return {ids:null,notice:''};
    const items=tracks||[];
    const isLeft=t=>/(left[ -]?hand|\blh\b|staff\s*2|bass)/i.test(t.name||'');
    const isRight=t=>/(right[ -]?hand|\brh\b|staff\s*1|melody|treble)/i.test(t.name||'');
    let matches=items.filter(hand==='left'?isLeft:isRight);
    if(!matches.length&&items.length===2){
      const opposite=items.filter(hand==='left'?isRight:isLeft);
      if(opposite.length===1)matches=items.filter(t=>t!==opposite[0]);
    }
    if(!matches.length&&hand==='right'&&items.length===1)matches=items;
    return matches.length?{ids:new Set(matches.map(t=>t.id)),notice:items.length===1?'Single-track melody used for right-hand practice.':'Using '+matches.map(t=>t.name).join(', ')}:
      {ids:new Set(),notice:'Cannot identify the '+hand+'-hand track. Select its track in “Practice part,” or choose Both hands.'};
  }
  function chosenNotes(notes,tracks,hand,trackChoice='all'){
    const {ids,notice}=handTracks(tracks,hand,trackChoice);
    return {notes:!ids?notes.slice():notes.filter(n=>ids.has(n.track)),notice,matched:!ids||ids.size>0};
  }
  function notesWithin(notes,window){return notes.filter(n=>n.start>=window.start-.000001&&n.start<window.end-.000001);}
  function groupNotes(notes,tolerance=.055){
    const sorted=notes.slice().sort((a,b)=>a.start-b.start||a.midi-b.midi),groups=[];
    for(const note of sorted){const previous=groups.at(-1);
      if(previous&&Math.abs(previous.start-note.start)<=tolerance){if(!previous.midis.includes(note.midi))previous.midis.push(note.midi);}
      else groups.push({start:note.start,midis:[note.midi]});
    }
    return groups;
  }
  function chordPress(expected,progress,pitch,at,{strict=false,windowMs=650}={}){
    const wanted=new Set(expected),prior=new Map(progress||[]);
    if(!wanted.has(pitch))return {progress:strict?new Map():prior,status:'wrong',complete:false};
    if(strict&&prior.size&&at-Math.min(...prior.values())>windowMs)prior.clear();
    prior.set(pitch,at);
    const complete=wanted.size>0&&[...wanted].every(n=>prior.has(n));
    return {progress:prior,status:complete?'complete':'partial',complete};
  }
  const name=n=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][n%12]+(Math.floor(n/12)-1);
  function diagnostic(song){
    const map=measuresFor(song),notes=song.notes||[],byTrack=new Map();
    for(const t of song.tracks||[])byTrack.set(t.id,{name:t.name,count:0,min:109,max:20});
    for(const n of notes){const x=byTrack.get(n.track);if(x){x.count++;x.min=Math.min(x.min,n.midi);x.max=Math.max(x.max,n.midi);}}
    const invalid=notes.filter(n=>!Number.isFinite(n.start)||!Number.isFinite(n.end)||n.end<=n.start||n.midi<21||n.midi>108).length;
    const lines=[
      'Garden Notes v0.14 — Personal song diagnostic',
      'Generated locally from an imported song. Contains no original MIDI file bytes.',
      'Song: '+song.name,'Source: '+song.source,'Duration: '+Number(song.duration||0).toFixed(3)+' s',
      'Playable notes: '+notes.length,'Invalid normalized events: '+invalid,
      'Tracks: '+(song.tracks||[]).length,'Measure source: '+map.description,
      'Estimated meter/measure positions: '+(map.estimated?'YES':'NO'),
      'Measures: '+map.measures.length,
      ...[...byTrack.entries()].map(([id,t])=>'  Track '+id+': '+t.name+'; '+t.count+' notes'+(t.count?'; range '+name(t.min)+'–'+name(t.max):'')),
      'Measures 1–8 (song seconds):',
      ...map.measures.slice(0,8).map(m=>'  '+m.number+': '+m.start.toFixed(3)+'–'+m.end.toFixed(3)),
      'First 80 note events (time, duration, track, pitch):',
      ...notes.slice().sort((a,b)=>a.start-b.start||a.midi-b.midi).slice(0,80).map(n=>
        '  '+n.start.toFixed(3)+'s  '+(n.end-n.start).toFixed(3)+'s  track='+n.track+' '+name(n.midi)+(Number.isFinite(n.startBeat)?' beat='+n.startBeat.toFixed(3):''))
    ];
    return lines.join('\n')+'\n';
  }
  return Object.freeze({DEFAULTS,measuresFor,section,handTracks,chosenNotes,notesWithin,groupNotes,chordPress,diagnostic});
})();
