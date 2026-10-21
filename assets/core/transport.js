// Audio-clock-backed, deterministic look-ahead MIDI transport.
// This does not depend on requestAnimationFrame: UI rendering is a consumer,
// not the clock that drives music. Pure scheduling with an injectable clock.
export function createSongTransport({now, schedule, onScheduled=(note)=>{}, lookahead=.16, intervalMs=25, startDelay=.06}) {
  if(typeof now!=='function'||typeof schedule!=='function')throw Error('Transport requires a clock and scheduler');
  let active=false, events=[],cursor=0,baseTime=0,basePosition=0,rate=1,duration=0,timer=null;
  function stop(){
    active=false;
    if(timer!==null){clearInterval(timer);timer=null;}
  }
  function position(){
    if(!active)return basePosition;
    return Math.min(duration,Math.max(0,basePosition+Math.max(0,now()-baseTime)*rate));
  }
  function start(notes,positionSeconds,playRate,totalDuration,autoTimer=true){
    stop();
    if(!Number.isFinite(playRate)||playRate<=0)throw Error('Invalid playback rate');
    events=notes;rate=playRate;duration=Math.max(0,totalDuration);
    basePosition=Math.max(0,Math.min(duration,positionSeconds));
    baseTime=now()+startDelay;
    // Skip previous attacks. Notes overlapping a seek point are not retriggered.
    cursor=0;
    while(cursor<events.length&&events[cursor].start<basePosition-.001)cursor++;
    active=true;
    pump();
    if(autoTimer)timer=setInterval(pump,intervalMs);
  }
  function pump(){
    if(!active)return;
    const current=now(),horizon=current+lookahead;
    while(cursor<events.length){
      const note=events[cursor],at=baseTime+(note.start-basePosition)/rate;
      if(at>horizon)break;
      cursor++;
      if(at<current-.04)continue; // Late callbacks never burst old notes.
      const scheduledAt=Math.max(at,current+.003);
      schedule(note,scheduledAt,Math.max(.035,(note.end-note.start)/rate),note.velocity);
      onScheduled(note);
    }
  }
  function pause(){const p=position();stop();basePosition=p;return p;}
  return Object.freeze({start,stop,pause,position,pump,isPlaying:()=>active,nextIndex:()=>cursor});
}
