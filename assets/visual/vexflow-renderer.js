import {EngravingModel} from '../core/engraving-model.js';
// Progressive-enhancement score engraver. VexFlow is loaded from a pinned
// external script. When unavailable the existing canvas pitch guide remains.
// Render only a small moving score window and move its playback cursor cheaply.
export const VexflowRenderer = (() => {
  const windows=new WeakMap();
  const KEYS=['C','G','D','A','E','B','F#','C#'];
  const FLATS=['C','F','Bb','Eb','Ab','Db','Gb','Cb'];
  const MEASURE_W=362, STAFF_Y={treble:42,bass:183}, H=337;
  function vf(){return globalThis.Vex?.Flow || globalThis.VexFlow?.Flow || globalThis.VexFlow || null;}
  function modelFor(record,song,notes){
    if(record.song!==song||record.notes!==notes){record.song=song;record.notes=notes;record.model=EngravingModel.forSong(song,notes);record.windowStart=-1;}
    return record.model;
  }
  function elementFor(canvas){
    const parent=canvas.parentNode;
    let frame=parent.querySelector('.engraved-score');
    if(!frame){frame=document.createElement('div');frame.className='engraved-score';frame.setAttribute('role','img');frame.setAttribute('aria-label','Piano score engraved with VexFlow');
      const stage=document.createElement('div');stage.className='engraved-stage';frame.append(stage);
      const now=document.createElement('div');now.className='engraved-playhead';now.setAttribute('aria-hidden','true');frame.append(now);
      parent.insertBefore(frame,canvas);
    }
    return frame;
  }
  function ticksFor(VF,items,clef,paint,anchors){
    return items.map(e=>{
      if(e.kind==='rest'){
        if(e.hidden&&VF.GhostNote) return new VF.GhostNote(e.duration);
        return new VF.StaveNote({clef,keys:[clef==='bass'?'d/3':'b/4'],duration:e.duration+'r'});
      }
      const note=new VF.StaveNote({clef,keys:e.keys,duration:e.duration});
      for(let k=0;k<e.keys.length;k++){
        const spelling=e.keys[k].split('/')[0];
        const symbol=spelling.includes('#')?'#':spelling.includes('b')?'b':null;
        if(symbol){try{note.addModifier(new VF.Accidental(symbol),k);}catch(_){/* unsupported double alteration */}}
      }
      if(typeof note.setStyle==='function')note.setStyle({fillStyle:paint,strokeStyle:paint});
      if(Number.isFinite(e.time))anchors.push({note,time:e.time});
      return note;
    });
  }
  function renderMeasure(VF,context,model,m,x,isFirst,anchors){
    const width=MEASURE_W;
    let successfullyDrawn=0;
    for(const clef of ['treble','bass']){
      const stave=new VF.Stave(x,STAFF_Y[clef],width);
      if(isFirst){stave.addClef(clef);
        if(!model.inferred){
          const signature=m.keyFifths||0;
          if(signature)stave.addKeySignature(signature>0?KEYS[Math.min(7,signature)]:FLATS[Math.min(7,-signature)]);
          stave.addTimeSignature(`${m.beats}/${m.beatType}`);
        }
      }
      stave.setContext(context).draw();
      const voices=[];
      for(const v of EngravingModel.staffVoices(model,m,clef)){
        const voice=new VF.Voice({num_beats:m.beats,beat_value:m.beatType});voice.setStrict(false);
        const tickables=ticksFor(VF,v.ticks,clef,clef==='bass'?'#7455a6':'#31799a',anchors);
        voice.addTickables(tickables);voices.push(voice);
      }
      try{
        const formatter=new VF.Formatter();formatter.joinVoices(voices);
        formatter.format(voices,Math.max(130,stave.getNoteEndX()-stave.getNoteStartX()-16));
        for(const voice of voices){voice.draw(context,stave);successfullyDrawn+=voice.tickables?.length??1;}
      }catch(err){
        // One malformed imported voice must not take down the app.
        // Log the notation issue; the reliable falling-note practice remains usable.
        console.warn('Cannot engrave measure '+m.number+' '+clef,err);
      }
    }
    context.setFont('Arial',10,'normal');
    context.fillText(`${m.number}`,x+8,22);
    return successfullyDrawn;
  }
  function mapAnchors(anchors){
    const result=anchors.filter(a=>Number.isFinite(a.time)&&Number.isFinite(a.note?.getAbsoluteX?.()))
      .map(a=>({time:a.time,x:a.note.getAbsoluteX()})).sort((a,b)=>a.time-b.time||a.x-b.x);
    // At any onset, a chord gets one cursor position.
    return result.filter((a,i)=>i===0||Math.abs(a.time-result[i-1].time)>.001);
  }
  function xAt(anchors,at,width){
    if(!anchors.length)return Math.min(190,width/2);
    let lo=0,hi=anchors.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(anchors[mid].time<at)lo=mid+1;else hi=mid;}
    if(lo===0)return anchors[0].x;
    if(lo>=anchors.length)return anchors.at(-1).x;
    const a=anchors[lo-1],b=anchors[lo],t=Math.min(1,Math.max(0,(at-a.time)/Math.max(.001,b.time-a.time)));
    return a.x+(b.x-a.x)*t;
  }
  function render({song,notes,at,canvas}){
    const VF=vf();
    if(!VF?.Renderer||!VF?.Stave||!VF?.StaveNote||!VF?.Formatter||!VF?.Voice||!song||!notes?.length)return false;
    const frame=elementFor(canvas);
    let state=windows.get(frame);
    if(!state){state={song:null,notes:null,windowStart:-1,anchors:[],model:null};windows.set(frame,state);}
    const model=modelFor(state,song,notes);
    if(!model?.measures?.length)return false;
    const index=EngravingModel.measureIndex(model,at);
    // Keep the active measure plus one preceding and two upcoming measures.
    const start=Math.max(0,index-1),end=Math.min(model.measures.length,start+4);
    if(state.windowStart!==start){
      state.windowStart=start;
      const stage=frame.firstElementChild;stage.replaceChildren();
      const width=(end-start)*MEASURE_W+16;
      try{
        const renderer=new VF.Renderer(stage,VF.Renderer.Backends.SVG);
        renderer.resize(width,H);
        const context=renderer.getContext();const anchors=[];
        let engraved=0;
        for(let j=start;j<end;j++)engraved+=renderMeasure(VF,context,model,model.measures[j],(j-start)*MEASURE_W+7,j===start,anchors);
        if(!engraved&&model.notes.length)throw new Error('No valid voices in score window');
        state.anchors=mapAnchors(anchors);
        state.width=width;
        stage.style.width=width+'px';
      }catch(error){
        console.warn('VexFlow engraving unavailable; retaining pitch guide.',error);
        stage.replaceChildren();state.windowStart=-1;return false;
      }
    }
    // The noteheads are actually formatted by VexFlow; use their x locations
    // as playback anchors rather than pretending pixels equal milliseconds.
    const playingX=xAt(state.anchors,at,state.width);
    const playhead=frame.clientWidth*.34;
    frame.firstElementChild.style.transform=`translate3d(${Math.round(playhead-playingX)}px,0,0)`;
    frame.lastElementChild.style.left=playhead+'px';
    frame.hidden=false;canvas.hidden=true;
    frame.dataset.source=model.inferred?'midi-inferred':'musicxml';
    return true;
  }
  function reset(canvas){const frame=canvas?.parentNode?.querySelector('.engraved-score');if(frame){frame.hidden=true;canvas.hidden=false;}}
  return Object.freeze({render,reset});
})();
