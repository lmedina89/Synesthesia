// MusicXML (uncompressed score-partwise) -> one normalized song timeline.
// Browser DOMParser is injected for deterministic testing. All durations are in quarter notes
// before conversion through a tempo map; note spelling/clefs/rests are preserved for notation.
export const MusicXML = (() => {
  const direct=(node,tag)=>Array.from(node?.children||[]).find(c=>c.localName===tag)||null;
  const many=(node,tag)=>Array.from(node?.children||[]).filter(c=>c.localName===tag);
  const value=(node,tag,fallback='')=>direct(node,tag)?.textContent?.trim()??fallback;
  const num=(node,tag,fallback)=>{const n=Number(value(node,tag,''));return Number.isFinite(n)&&value(node,tag,'')!==''?n:fallback;};
  const fail=(message)=>{throw new Error('MusicXML import: '+message);};
  const PITCH={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11};
  function parseMusicXML(xml,filename='Imported score.musicxml',Parser=globalThis.DOMParser) {
    if(typeof xml!=='string'||xml.length>3_000_000)fail('file is empty or exceeds 3 MB');
    if(/<!ENTITY/i.test(xml))fail('custom XML entities are not supported');
    // MusicXML exports commonly declare a standard external DTD. Strip the
    // declaration without fetching it; reject internal subsets/other doctypes.
    const safeXML=xml.replace(/<!DOCTYPE\s+score-partwise(?:\s+PUBLIC\s+"[^"]*"\s+"[^"]*"|\s+SYSTEM\s+"[^"]*")?\s*>/i,'');
    if(/<!DOCTYPE/i.test(safeXML))fail('unsupported DTD declaration');
    if(typeof Parser!=='function')fail('XML parser not available');
    const doc=new Parser().parseFromString(safeXML,'application/xml');
    if(doc.getElementsByTagName('parsererror').length)fail('invalid XML document');
    const root=doc.documentElement;
    if(root?.localName!=='score-partwise')fail('only uncompressed partwise MusicXML is supported');
    const parts=many(root,'part');if(!parts.length||parts.length>24)fail('unsupported number of parts');
    const partNames=new Map();
    for(const p of Array.from(direct(root,'part-list')?.children||[]).filter(x=>x.localName==='score-part')){
      partNames.set(p.getAttribute('id'),value(p,'part-name','Piano'));
    }
    const trackIds=new Map(),tracks=[],rawNotes=[],rawRests=[],rawMeasures=[],tempos=[{beat:0,bpm:120,priority:0}];
    let measureLimit=0;
    function trackFor(partId,staff,partName){const key=partId+':'+staff;
      if(!trackIds.has(key)){
        const id=tracks.length;trackIds.set(key,id);
        tracks.push({id,name:partName+(staff>1?' · staff '+staff:''),notes:0,channel:''});
      }
      return trackIds.get(key);
    }
    for(let pi=0;pi<parts.length;pi++){
      const part=parts[pi],partId=part.getAttribute('id')||('P'+pi),partName=partNames.get(partId)||'Part '+(pi+1);
      let divisions=1,beats=4,beatType=4,keyFifths=0,clefs=new Map([[1,'treble'],[2,'bass']]);
      let partBeat=0; const measures=many(part,'measure');
      if(measures.length>1000)fail('too many measures');
      for(let mi=0;mi<measures.length;mi++){
        if(++measureLimit>5000)fail('too many measures across parts');
        const m=measures[mi],startBeat=partBeat,attrs=direct(m,'attributes');
        if(attrs){
          divisions=num(attrs,'divisions',divisions);
          if(!Number.isInteger(divisions)||divisions<1||divisions>100000)fail('invalid divisions');
          const t=direct(attrs,'time');if(t){beats=num(t,'beats',beats);beatType=num(t,'beat-type',beatType);}
          if(beats<1||beats>32||![1,2,4,8,16,32].includes(beatType))fail('unsupported time signature');
          const k=direct(attrs,'key');if(k)keyFifths=num(k,'fifths',keyFifths);
          if(Math.abs(keyFifths)>7)fail('unsupported key signature');
          for(const c of many(attrs,'clef')){
            const s=Number(c.getAttribute('number')||1),sign=value(c,'sign','G');
            clefs.set(s,sign==='F'?'bass':sign==='G'?'treble':sign==='C'?'alto':'treble');
          }
        }
        let cursor=0,maxCursor=0,lastNoteStart=0;
        const events=Array.from(m.children);
        for(const e of events){
          if(e.localName==='direction'){
            const sound=direct(e,'sound'),bpm=Number(sound?.getAttribute('tempo'));
            let tempo=bpm;
            if(!Number.isFinite(tempo)||tempo<=0){
              const mt=e.getElementsByTagName('metronome')[0];tempo=Number(value(mt,'per-minute',''));
            }
            if(Number.isFinite(tempo)&&tempo>=20&&tempo<=400){tempos.push({beat:startBeat+cursor,bpm:tempo,priority:pi===0?2:1});}
          }
          if(e.localName==='backup'||e.localName==='forward'){
            const d=num(e,'duration',0)/divisions;
            if(d<0||d>100)fail('invalid timeline movement');
            cursor+=(e.localName==='backup'?-d:d);
            if(cursor < -0.00001)fail('backups move before measure start');
            maxCursor=Math.max(maxCursor,cursor);continue;
          }
          if(e.localName!=='note')continue;
          const chord=!!direct(e,'chord'),grace=!!direct(e,'grace');
          const duration=num(e,'duration',0)/divisions;
          if(duration<0||duration>100)fail('invalid note duration');
          const onset=chord?lastNoteStart:cursor;
          if(!chord)lastNoteStart=cursor;
          const staff=num(e,'staff',1),track=trackFor(partId,staff,partName);
          const clef=clefs.get(staff)||(staff===2?'bass':'treble');
          const voice=value(e,'voice','1');
          if(!grace&&duration>0){
            if(direct(e,'rest')){
              rawRests.push({startBeat:startBeat+onset,endBeat:startBeat+onset+duration,staff:clef,track,voice,part:pi,measure:mi,durationBeats:duration});
            } else {
              const pitch=direct(e,'pitch'),step=value(pitch,'step',''),octave=num(pitch,'octave',NaN),alter=num(pitch,'alter',0);
              if(Object.hasOwn(PITCH,step)&&Number.isInteger(octave)&&octave>=0&&octave<=9&&Number.isInteger(alter)&&Math.abs(alter)<=2){
                const midi=(octave+1)*12+PITCH[step]+alter;
                if(midi>=21&&midi<=108){
                  const ties=many(e,'tie').map(t=>t.getAttribute('type'));
                  rawNotes.push({midi,startBeat:startBeat+onset,endBeat:startBeat+onset+duration,track,velocity:80,
                    clef,voice,part:pi,measure:mi,step,octave,alter,explicitAccidental:value(e,'accidental',''),
                    tieStart:ties.includes('start'),tieStop:ties.includes('stop'),durationBeats:duration});
                  tracks[track].notes++;
                }
              }
            }
          }
          if(!chord){cursor+=duration;maxCursor=Math.max(maxCursor,cursor);}
        }
        // Respect regular measure durations and implicit pickup measures.
        const expected=beats*4/beatType;
        const width=m.getAttribute('implicit')==='yes'?maxCursor:Math.max(maxCursor,expected);
        if(!(width>=0&&width<100))fail('unsupported measure duration');
        if(pi===0)rawMeasures.push({index:mi,number:m.getAttribute('number')||String(mi+1),startBeat,endBeat:startBeat+width,beats,beatType,keyFifths});
        partBeat+=width;
      }
    }
    if(!rawNotes.length)fail('no playable pitched notes found');
    if(rawNotes.length>25000)fail('too many notes');
    // Deterministic tempo conflicts: first part takes precedence; at same beat last wins.
    tempos.sort((a,b)=>a.beat-b.beat||a.priority-b.priority);
    const schedule=[];
    for(const t of tempos){if(schedule.length&&Math.abs(schedule.at(-1).beat-t.beat)<1e-7)schedule[schedule.length-1]={...t};else schedule.push({...t});}
    let elapsed=0;
    for(let i=0;i<schedule.length;i++){const t=schedule[i];
      if(i)elapsed+=(t.beat-schedule[i-1].beat)*60/schedule[i-1].bpm;
      t.sec=elapsed;
    }
    function toSec(beat){let lo=0,hi=schedule.length;
      while(lo<hi){const mid=(lo+hi)>>1;if(schedule[mid].beat<=beat)lo=mid+1;else hi=mid;}
      const t=schedule[Math.max(0,lo-1)];return t.sec+(beat-t.beat)*60/t.bpm;
    }
    rawNotes.sort((a,b)=>a.startBeat-b.startBeat||a.midi-b.midi);
    // Keep every written note event for notation. Join sustained tied notes only for audio playback.
    const chain=new Map(),played=[];
    for(const n of rawNotes){
      const key=n.track+':'+n.voice+':'+n.midi;
      const prior=chain.get(key);
      if(n.tieStop&&prior&&Math.abs(prior.endBeat-n.startBeat)<.0001){prior.endBeat=n.endBeat;
        if(!n.tieStart)chain.delete(key);
      }else{
        const entry={midi:n.midi,startBeat:n.startBeat,endBeat:n.endBeat,track:n.track,velocity:80};played.push(entry);
        if(n.tieStart)chain.set(key,entry);
      }
    }
    const notes=played.map(n=>({midi:n.midi,start:toSec(n.startBeat),end:toSec(n.endBeat),track:n.track,velocity:n.velocity}));
    // Derive printed accidentals per bar and staff, respecting the key signature.
    // This preserves explicit accidentals and avoids repeating alterations.
    const keys=['F','C','G','D','A','E','B'],flats=['B','E','A','D','G','C','F'];
    const localAccidentals=new Map();
    for(const n of rawNotes){
      const fifths=rawMeasures[n.measure]?.keyFifths||0;
      const inKey=(fifths>0?keys:flats).slice(0,Math.abs(fifths)).includes(n.step)?Math.sign(fifths):0;
      const id=n.part+':'+n.measure+':'+n.track;
      if(!localAccidentals.has(id))localAccidentals.set(id,new Map());
      const state=localAccidentals.get(id),key=n.step+n.octave;
      const current=state.has(key)?state.get(key):inKey;
      n.notatedAccidental=n.explicitAccidental|| (n.alter!==current?(n.alter===0?'natural':n.alter===1?'sharp':n.alter===-1?'flat':''):'');
      state.set(key,n.alter);
    }
    rawRests.sort((a,b)=>a.startBeat-b.startBeat);
    const score={type:'MusicXML',measures:rawMeasures.map(m=>({...m,start:toSec(m.startBeat),end:toSec(m.endBeat)})),
      notes:rawNotes.map(n=>({...n,start:toSec(n.startBeat),end:toSec(n.endBeat)})),
      rests:rawRests.map(r=>({...r,start:toSec(r.startBeat),end:toSec(r.endBeat)})),
      tempo:schedule.map(t=>({...t}))};
    const duration=Math.max(...notes.map(n=>n.end),...score.measures.map(m=>m.end),0);
    if(duration>14400)fail('song exceeds four hours');
    const title=value(direct(root,'work'),'work-title','')||value(root,'movement-title','')||filename.replace(/\.(musicxml|xml)$/i,'');
    return {name:title,source:'MusicXML',notes,tracks:tracks.filter(t=>t.notes),duration,score};
  }
  return Object.freeze({parseMusicXML});
})();
