// Strict, bounded Standard MIDI File parser. Does not access the DOM.
export const Midi = (() => {
  const SONG_FIRST=21,SONG_LAST=108;
  function songTempoToSeconds(events,division){
    let tempos=[{tick:0,tempo:500000}];
    for(const e of events)if(e.type==='tempo'&&e.tick>=0)tempos.push(e);
    tempos.sort((a,b)=>a.tick-b.tick);
    let lastTick=0,lastSec=0,lastTempo=500000;
    for(const t of tempos){lastSec+=(t.tick-lastTick)*lastTempo/(1000000*division);t.sec=lastSec;lastTick=t.tick;lastTempo=t.tempo;}
    return tick=>{let left=0,right=tempos.length;
      while(left<right){const mid=(left+right)>>1;if(tempos[mid].tick<=tick)left=mid+1;else right=mid;}
      const t=tempos[Math.max(0,left-1)];return t.sec+(tick-t.tick)*t.tempo/(1000000*division);
    };
  }
  function parseMidi(buffer,fileName){
    const view=new DataView(buffer);let p=0;
    const fail=msg=>{throw Error('MIDI import: '+msg);};
    const remain=n=>{if(n<0||p+n>view.byteLength)fail('file is truncated or damaged');};
    const u8=()=>{remain(1);return view.getUint8(p++);};
    const u16=()=>{remain(2);const x=view.getUint16(p);p+=2;return x;};
    const u32=()=>{remain(4);const x=view.getUint32(p);p+=4;return x;};
    const word=()=>String.fromCharCode(u8(),u8(),u8(),u8());
    const vlq=(limit)=>{let n=0;for(let i=0;i<4;i++){if(p>=limit)fail('invalid variable-length value');const b=u8();n=(n<<7)|(b&127);if(!(b&128))return n;}fail('invalid MIDI time value');};
    if(word()!=='MThd')fail('not a standard .mid MIDI file');
    const size=u32();if(size<6)fail('invalid MIDI header');const format=u16(),trackCount=u16(),division=u16();
    if(format>1)fail('MIDI format 2 is not supported');
    if(!division||(division&0x8000))fail('SMPTE-timed MIDI is not supported');
    if(trackCount===0||trackCount>128)fail('invalid track count');
    remain(size-6);p+=size-6;
    const all=[],tracks=[];let eventCount=0;
    for(let track=0;track<trackCount;track++){
      if(word()!=='MTrk')fail('track header not found');const length=u32();remain(length);
      const end=p+length;let tick=0,running=0,trackName='Track '+(track+1),channelLabel='',notes=0;
      while(p<end){
        if(++eventCount>200000)fail('too many MIDI events');
        tick+=vlq(end);if(p>=end)fail('invalid track event');
        let b=u8();if(b<128){if(running<128||running>=240)fail('invalid running status');p--;b=running;}
        else if(b<240)running=b;
        if(b===255){if(p>=end)fail('invalid meta event');const kind=u8(),len=vlq(end);if(p+len>end)fail('invalid meta length');
          if(kind===81&&len===3){const t=(view.getUint8(p)<<16)|(view.getUint8(p+1)<<8)|view.getUint8(p+2);if(t>0)all.push({type:'tempo',tick,tempo:t,track});}
          if(kind===3&&len)trackName=new TextDecoder('utf-8',{fatal:false}).decode(new Uint8Array(buffer,p,Math.min(len,120))).replace(/[\x00-\x1f]/g,' ').trim()||trackName;
          p+=len;continue;
        }
        if(b===240||b===247){const len=vlq(end);if(p+len>end)fail('invalid SysEx');p+=len;running=0;continue;}
        const op=b&240,channel=b&15,count=(op===192||op===208)?1:2;
        if(op<128||op>224)fail('unsupported channel event');
        if(p+count>end)fail('incomplete channel event');
        const pitch=u8(),vel=count===2?u8():0;
        if(op===144||op===128){if(channel!==9){all.push({type:'note',tick,track,channel,pitch,vel,down:op===144&&vel>0});notes++;channelLabel='Ch '+(channel+1);}}
      }
      if(p!==end)fail('bad track length');
      tracks.push({id:track,name:trackName,notes,channel:channelLabel});
    }
    const secAt=songTempoToSeconds(all,division);
    const noteEvents=all.filter(e=>e.type==='note').sort((a,b)=>a.tick-b.tick||(a.down===b.down?0:a.down?1:-1));
    const held=new Map(),finished=[];
    let lastTick=0;
    for(const e of noteEvents){lastTick=Math.max(lastTick,e.tick);const key=e.track+':'+e.channel+':'+e.pitch;
      if(e.down){if(!held.has(key))held.set(key,[]);held.get(key).push(e);}
      else if(held.get(key)?.length){const start=held.get(key).shift();
        if(start.pitch>=SONG_FIRST&&start.pitch<=SONG_LAST)finished.push({midi:start.pitch,start:secAt(start.tick),end:Math.max(secAt(e.tick),secAt(start.tick)+.07),track:start.track,velocity:start.vel});
      }
    }
    for(const stacks of held.values())for(const start of stacks){
      if(start.pitch>=SONG_FIRST&&start.pitch<=SONG_LAST)finished.push({midi:start.pitch,start:secAt(start.tick),end:secAt(Math.max(start.tick+division/2,lastTick)),track:start.track,velocity:start.vel});
    }
    const end=finished.reduce((m,n)=>Math.max(m,n.end),0);
    if(!finished.length)fail('no playable piano notes (A0–C8) found');
    if(end>14400)fail('song exceeds four hours');
    return {name:fileName.replace(/\.(mid|midi)$/i,''),notes:finished,tracks:tracks.filter(t=>t.notes),duration:end,source:'MIDI'};
  }
  return Object.freeze({parseMidi,songTempoToSeconds});
})();
