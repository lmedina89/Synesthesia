import {EngravingModel} from '../core/engraving-model.js';
// Optional SVG engraver. Never claim reliable engraving after a rejected measure.
// VexFlow 4.2.2 is pinned but *not* bundled: fallback is intentionally available.
export const VexflowRenderer = (() => {
  const windows=new WeakMap();
  const KEYS=['C','G','D','A','E','B','F#','C#'];
  const FLATS=['C','F','Bb','Eb','Ab','Db','Gb','Cb'];
  const MEASURE_W=430, STAFF_Y={treble:42,bass:196}, H=360;
  let lastFailure='';
  function vf(){return globalThis.Vex?.Flow || globalThis.VexFlow?.Flow || globalThis.VexFlow || null;}
  function modelFor(record,song,notes){
    if(record.song!==song||record.notes!==notes){record.song=song;record.notes=notes;record.model=EngravingModel.forSong(song,notes);record.windowStart=-1;}
    return record.model;
  }
  function elementFor(canvas){
    const parent=canvas.parentNode;let frame=parent.querySelector('.engraved-score');
    if(!frame){frame=document.createElement('div');frame.className='engraved-score';
      frame.setAttribute('role','img');frame.setAttribute('aria-label','Piano score engraved with VexFlow');
      const stage=document.createElement('div');stage.className='engraved-stage';frame.append(stage);
      const now=document.createElement('div');now.className='engraved-playhead';now.setAttribute('aria-hidden','true');frame.append(now);
      parent.insertBefore(frame,canvas);
    }
    return frame;
  }
  const accSymbols={sharp:'#',flat:'b',natural:'n','double-sharp':'##','flat-flat':'bb',
    'sharp-sharp':'##','double-flat':'bb'};
  function ticksFor(VF,items,clef,paint,anchors,tieEdges,accState){
    return items.map(e=>{
      let note;
      if(e.kind==='rest'){
        if(e.hidden&&VF.GhostNote){note=new VF.GhostNote(e.duration);}
        else note=new VF.StaveNote({clef,keys:[clef==='bass'?'d/3':'b/4'],duration:e.duration+'r'});
      }else{
        note=new VF.StaveNote({clef,keys:e.keys,duration:e.duration});
        for(let k=0;k<e.keys.length;k++){
          const pitch=e.keys[k].split('/')[0];
          const step=pitch[0].toUpperCase(),octave=e.keys[k].split('/')[1];
          const altered=pitch.includes('##')?2:pitch.includes('bb')?-2:pitch.includes('#')?1:pitch.includes('b')?-1:0;
          const key=step+octave;const explicit=accSymbols[e.accidentals?.[k]];
          const prev=accState.get(key)??0;
          const symbol=explicit??(prev===altered?null:altered===0?'n':altered===1?'#':altered===-1?'b':altered===2?'##':'bb');
          if(symbol){note.addModifier(new VF.Accidental(symbol),k);}
          accState.set(key,altered);
          const tieId=e.tieIds?.[k];
          if(tieId!==undefined)tieEdges.push({id:tieId,note,index:k,tieIn:!!e.tieIn?.[k],tieOut:!!e.tieOut?.[k]});
        }
        if(typeof note.setStyle==='function')note.setStyle({fillStyle:paint,strokeStyle:paint});
        if(Number.isFinite(e.time))anchors.push({note,time:e.time});
      }
      if(e.dots){
        if(typeof note.addDotToAll!=='function')throw new Error('VexFlow dotted-note API not available');
        for(let j=0;j<e.dots;j++)note.addDotToAll();
      }
      return note;
    });
  }
  function drawTies(VF,context,edges){
    if(!VF.StaveTie&&edges.some(e=>e.tieIn||e.tieOut))throw new Error('VexFlow tie rendering is unavailable');
    if(!VF.StaveTie)return;
    const pending=new Map();
    for(const e of edges){
      if(e.tieIn&&pending.has(e.id)){
        const p=pending.get(e.id);
        new VF.StaveTie({first_note:p.note,last_note:e.note,first_indices:[p.index],last_indices:[e.index]}).setContext(context).draw();
      }
      if(e.tieOut)pending.set(e.id,e);else pending.delete(e.id);
    }
  }
  function renderMeasure(VF,context,model,m,x,isFirst,anchors,tieEdges){
    let heads=0;
    for(const clef of ['treble','bass']){
      const stave=new VF.Stave(x,STAFF_Y[clef],MEASURE_W);
      if(isFirst){stave.addClef(clef);if(!model.inferred){
        const signature=m.keyFifths||0;
        if(signature)stave.addKeySignature(signature>0?KEYS[Math.min(7,signature)]:FLATS[Math.min(7,-signature)]);
        stave.addTimeSignature(`${m.beats}/${m.beatType}`);
      }}
      stave.setContext(context).draw();
      const voices=[],accState=new Map();
      const fifths=m.keyFifths||0;
      const steps=fifths>0?['F','C','G','D','A','E','B']:['B','E','A','D','G','C','F'];
      const alterations=new Map(steps.slice(0,Math.abs(fifths)).map(step=>[step,Math.sign(fifths)]));
      const prepared=EngravingModel.staffVoices(model,m,clef);
      for(const v of prepared){
        const voice=new VF.Voice({num_beats:m.beats,beat_value:m.beatType});voice.setStrict(false);
        // Key signature applies independently to every octave of the note letter.
        const state=new Map(accState);
        for(const e of v.ticks)for(const k of e.keys||[]){const [sp,oct]=k.split('/');const key=sp[0].toUpperCase()+oct;
          if(!state.has(key))state.set(key,alterations.get(sp[0].toUpperCase())??0);
        }
        const ticks=ticksFor(VF,v.ticks,clef,clef==='bass'?'#7455a6':'#31799a',anchors,tieEdges,state);
        voice.addTickables(ticks);voices.push(voice);
        heads+=v.ticks.reduce((s,t)=>s+(t.kind==='note'?t.keys.length:0),0);
      }
      const formatter=new VF.Formatter();formatter.joinVoices(voices);
      formatter.format(voices,Math.max(130,stave.getNoteEndX()-stave.getNoteStartX()-16));
      for(const voice of voices)voice.draw(context,stave);
    }
    context.setFont('Arial',10,'normal');context.fillText(`${m.number}`,x+8,22);
    return heads;
  }
  function mapAnchors(anchors){
    const result=anchors.filter(a=>Number.isFinite(a.time)&&Number.isFinite(a.note?.getAbsoluteX?.()))
      .map(a=>({time:a.time,x:a.note.getAbsoluteX()})).sort((a,b)=>a.time-b.time||a.x-b.x);
    return result.filter((a,i)=>i===0||Math.abs(a.time-result[i-1].time)>.001);
  }
  function xAt(anchors,at,width){
    if(!anchors.length)return Math.min(190,width/2);
    let lo=0,hi=anchors.length;while(lo<hi){const mid=(lo+hi)>>1;if(anchors[mid].time<at)lo=mid+1;else hi=mid;}
    if(lo===0)return anchors[0].x;if(lo>=anchors.length)return anchors.at(-1).x;
    const a=anchors[lo-1],b=anchors[lo],t=Math.min(1,Math.max(0,(at-a.time)/Math.max(.001,b.time-a.time)));
    return a.x+(b.x-a.x)*t;
  }
  function render({song,notes,at,canvas}){
    const VF=vf();lastFailure='';
    if(!VF?.Renderer||!VF?.Stave||!VF?.StaveNote||!VF?.Formatter||!VF?.Voice){lastFailure='VexFlow script is unavailable';return false;}
    if(!song||!notes?.length)return false;
    const frame=elementFor(canvas);
    let state=windows.get(frame);
    if(!state){state={song:null,notes:null,windowStart:-1,anchors:[],model:null};windows.set(frame,state);}
    try{
      const model=modelFor(state,song,notes);
      if(!model?.measures?.length)return false;
      const index=EngravingModel.measureIndex(model,at);
      const start=Math.max(0,index-1),end=Math.min(model.measures.length,start+4);
      if(state.windowStart!==start){
        const stage=frame.firstElementChild;stage.replaceChildren();
        const width=(end-start)*MEASURE_W+16;
        try{
          const renderer=new VF.Renderer(stage,VF.Renderer.Backends.SVG);
          renderer.resize(width,H);
          const context=renderer.getContext(),anchors=[],ties=[];
          let engraved=0;
          for(let j=start;j<end;j++)engraved+=renderMeasure(VF,context,model,model.measures[j],(j-start)*MEASURE_W+7,j===start,anchors,ties);
          if(!engraved&&model.notes.length)throw new Error('No valid notes in this score window');
          drawTies(VF,context,ties);
          state.anchors=mapAnchors(anchors);
          state.inspectAnchors=anchors.map(a=>({time:a.time,x:a.note?.getAbsoluteX?.(),
            ys:a.note?.getYs?.()||[],keys:a.note?.getKeys?.()||[]})).filter(a=>Number.isFinite(a.x));
          state.width=width;
          stage.style.width=width+'px';state.windowStart=start;
        }catch(err){stage.replaceChildren();state.windowStart=-1;throw err;}
      }
      // VexFlow composes on a 360px-high musical page, but the available
      // viewport may be much shorter in iPhone landscape or focus mode.
      // Fit BOTH staves uniformly; scaling X and Y equally preserves glyphs,
      // staff spacing and pitches. The scrolling playhead stays in viewport
      // coordinates while note anchors remain in unscaled score coordinates.
      frame.hidden=false;
      const availableHeight=frame.clientHeight||H;
      const availableWidth=frame.clientWidth||MEASURE_W;
      const scale=Math.min(1,Math.max(.1,availableHeight/H));
      const playingX=xAt(state.anchors,at,state.width);
      const playhead=availableWidth*.34;
      const top=Math.max(0,(availableHeight-H*scale)/2);
      const stage=frame.firstElementChild;
      stage.style.transformOrigin='top left';
      stage.style.transform=`translate3d(${Math.round(playhead-playingX*scale)}px,${Math.round(top)}px,0) scale(${scale})`;
      stage.dataset.fitScale=scale.toFixed(4);
      frame.lastElementChild.style.left=playhead+'px';
      canvas.hidden=true;
      frame.dataset.source=model.inferred?'midi-inferred':'musicxml';return true;
    }catch(error){
      state.song=null;state.notes=null;state.model=null;state.windowStart=-1;
      lastFailure=error?.message||'unknown engraving failure';
      console.warn('Score engraving rejected; showing pitch guide:',lastFailure);
      const frame=canvas.parentNode?.querySelector('.engraved-score');if(frame)frame.hidden=true;
      return false;
    }
  }
  // Only returns an answer when the tap is sufficiently close to a visible,
  // actually engraved notehead. Never guess a pitch from empty stave space.
  function inspectAt(canvas,clientX,clientY){
    const frame=canvas?.parentNode?.querySelector('.engraved-score');
    if(!frame||frame.hidden)return null;
    const state=windows.get(frame),stage=frame.firstElementChild;
    if(!state?.inspectAnchors?.length)return null;
    const box=stage.getBoundingClientRect(),scale=Number(stage.dataset.fitScale)||1;
    const x=(clientX-box.left)/scale,y=(clientY-box.top)/scale;
    let nearest=null,distance=Infinity;
    for(const a of state.inspectAnchors){
      for(let j=0;j<a.ys.length;j++){
        const dx=x-a.x,dy=y-a.ys[j],d=dx*dx+dy*dy;
        if(Math.abs(dx)<=24&&Math.abs(dy)<=17&&d<distance){nearest={key:a.keys[j],time:a.time};distance=d;}
      }
    }
    if(!nearest?.key)return null;
    const match=/^([a-g])([#b]{0,2})\/(\d)$/.exec(nearest.key.toLowerCase());if(!match)return null;
    const semis={c:0,d:2,e:4,f:5,g:7,a:9,b:11};
    const altered=[...match[2]].reduce((v,c)=>v+(c==='#'?1:-1),0);
    const midi=(Number(match[3])+1)*12+semis[match[1]]+altered;
    return midi>=21&&midi<=108?{midi,time:nearest.time}:null;
  }
  function reset(canvas){const frame=canvas?.parentNode?.querySelector('.engraved-score');if(frame){frame.hidden=true;canvas.hidden=false;}}
  return Object.freeze({render,reset,inspectAt,getLastFailure:()=>lastFailure});
})();
