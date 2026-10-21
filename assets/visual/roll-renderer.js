// Frame-independent falling-note painter; renderer has no DOM queries.
export function paintSongRoll({at, canvas, notes, maxDuration, pianoX, midiSharp, lowerBoundSong, SONG_FIRST, SONG_LAST, SONG_W}){
    const cv=canvas,ctx=cv.getContext('2d');if(!ctx)return;
    const w=cv.width,h=cv.height,span=5.0;ctx.clearRect(0,0,w,h);ctx.fillStyle='#16152b';ctx.fillRect(0,0,w,h);
    for(let n=SONG_FIRST;n<=SONG_LAST;n++){
      const x=pianoX(n),bw=midiSharp(n)?19:29;
      if(midiSharp(n)){ctx.fillStyle='#211e38';ctx.fillRect(x-bw/2,0,bw,h);}
      if(n%12===0){ctx.strokeStyle='#44355e';ctx.beginPath();ctx.moveTo(x-SONG_W/2,0);ctx.lineTo(x-SONG_W/2,h);ctx.stroke();}
    }
    const list=notes;
    let count=0;
    for(let i=lowerBoundSong(list,at-maxDuration-.4);i<list.length;i++){
      const n=list[i];if(n.start>at+span)break;if(n.end<at-.3)continue;if(++count>1800)break;
      const x=pianoX(n.midi),bw=midiSharp(n.midi)?17:24;
      const bottom=h-(n.start-at)/span*h,top=h-(n.end-at)/span*h;
      const y=Math.max(0,top),height=Math.min(h,bottom)-y;
      if(height<=0)continue;
      ctx.fillStyle=n.start<=at&&n.end>at?'#f3c784':n.track%2===0?'#a899f1':'#7ec5d6';
      ctx.fillRect(x-bw/2,y,bw,Math.max(3,height));
    }
    ctx.fillStyle='#f7db9e';ctx.fillRect(0,h-3,w,3);
  }

