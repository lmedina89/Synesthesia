import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {GuidedLesson} from '../assets/core/guided-lesson.js';
import {Midi} from '../assets/core/midi.js';
import {SongCatalog} from '../assets/core/catalog.js';
import {createSongTransport} from '../assets/core/transport.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function midiFixture(){const b=fs.readFileSync(path.join(root,'example-song.mid'));return Midi.parseMidi(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'example-song.mid');}

test('defaults match the lesson teaching specification',()=>{
 assert.deepEqual({...GuidedLesson.DEFAULTS},{hand:'right',first:1,last:4,speed:50,loop:true,strict:false});
});

test('bundled MIDI parses valid notes with two named hands',()=>{
 const s=midiFixture();assert.equal(s.notes.length,19);
 assert.ok(s.tracks.some(t=>/right hand/i.test(t.name)));
 assert.ok(s.tracks.some(t=>/left hand/i.test(t.name)));
 assert.ok(s.notes.every(n=>n.end>n.start&&n.midi>=21&&n.midi<=108));
});

test('regression: exact song-end boundary does not create an empty final measure',()=>{
 const s=midiFixture(),m=GuidedLesson.measuresFor(s);
 assert.equal(m.measures.length,2); // prior uploaded v0.14 incorrectly returned 3
 assert.equal(m.measures.at(-1).end,s.duration);
 assert.ok(m.measures.every(x=>x.end>x.start));
});

test('MIDI without time signature is marked inferred, not verified musical notation',()=>{
 const s=midiFixture(),m=GuidedLesson.measuresFor(s);
 assert.equal(m.estimated,true);assert.match(m.description,/inferred 4\/4/i);
});

test('lesson section clamps 1–4 to actual song measures',()=>{
 const s=midiFixture(),sel=GuidedLesson.section(GuidedLesson.measuresFor(s).measures,1,4);
 assert.deepEqual([sel.first,sel.last,sel.start,sel.end],[1,2,0,s.duration]);
});

test('lesson uses explicit RH/LH MIDI track labels',()=>{
 const s=midiFixture();
 const r=GuidedLesson.chosenNotes(s.notes,s.tracks,'right');
 const l=GuidedLesson.chosenNotes(s.notes,s.tracks,'left');
 assert.equal(r.notes.length,7);assert.equal(l.notes.length,12);
 assert.ok(r.notes.every(n=>n.track===1));assert.ok(l.notes.every(n=>n.track===2));
});

test('unlabeled tracks are not silently assigned to a particular hand',()=>{
 const s={tracks:[{id:1,name:'Piano 1'},{id:2,name:'Piano 2'},{id:3,name:'Piano 3'}]};
 const pick=GuidedLesson.handTracks(s.tracks,'left');
 assert.equal(pick.ids.size,0);assert.match(pick.notice,/Cannot identify/);
});

test('manual track override obeyed when names are ambiguous',()=>{
 const s=midiFixture();
 const pick=GuidedLesson.chosenNotes(s.notes,[{id:1,name:'track 1'},{id:2,name:'track 2'}],'right','2');
 assert.equal(pick.notes.length,12);assert.ok(pick.notes.every(n=>n.track===2));
});

test('both-hands selection keeps every event',()=>{
 const s=midiFixture(),p=GuidedLesson.chosenNotes(s.notes,s.tracks,'both');
 assert.equal(p.notes.length,s.notes.length);
});

test('notesWithin uses half-open end boundary to prevent repeated boundary attacks',()=>{
 const ns=[{start:0},{start:1},{start:2},{start:3}];
 assert.deepEqual(GuidedLesson.notesWithin(ns,{start:1,end:3}).map(n=>n.start),[1,2]);
});

test('chord grouping ignores note ordering and merges near-simultaneous notes',()=>{
 const gr=GuidedLesson.groupNotes([{start:.01,midi:64},{start:0,midi:60},{start:.2,midi:67}]);
 assert.equal(gr.length,2);assert.deepEqual(gr[0].midis,[60,64]);
});

test('ordinary chords allow pitches one at a time',()=>{
 let p=new Map(),a=GuidedLesson.chordPress([60,64],p,60,0);
 assert.equal(a.status,'partial');
 const b=GuidedLesson.chordPress([60,64],a.progress,64,4000);
 assert.equal(b.status,'complete');
});

test('strict chord checking resets attempts after timing window',()=>{
 const a=GuidedLesson.chordPress([60,64],new Map(),60,1000,{strict:true});
 const b=GuidedLesson.chordPress([60,64],a.progress,64,1700,{strict:true,windowMs:650});
 assert.equal(b.complete,false);assert.deepEqual([...b.progress.keys()],[64]);
});

test('wrong note resets strict chord attempt but not relaxed chord attempt',()=>{
 for(const strict of [true,false]){
  const a=GuidedLesson.chordPress([60,64],new Map(),60,1000,{strict});
  const b=GuidedLesson.chordPress([60,64],a.progress,71,1100,{strict});
  assert.equal(b.status,'wrong');assert.equal(b.progress.size,strict?0:1);
 }
});

test('personal MIDI diagnostic reports track counts and practice-measure provenance',()=>{
 const report=GuidedLesson.diagnostic(midiFixture());
 assert.match(report,/Playable notes: 19/);
 assert.match(report,/Measure source: MIDI no time signature; inferred 4\/4/);
 assert.match(report,/Measures: 2/);
 assert.match(report,/Track 1: Right hand melody; 7 notes/);
 assert.match(report,/Track 2: Left hand harmony; 12 notes/);
});

test('tempo conversion handles a BPM change without changing source tick order',()=>{
 const sec=Midi.songTempoToSeconds([{type:'tempo',tick:480,tempo:1000000}],480);
 assert.equal(sec(0),0);assert.equal(sec(480),.5);assert.equal(sec(960),1.5);
});

test('transport only schedules upcoming notes and honors playback-rate clock',()=>{
 let t=100,scheduled=[];
 const transport=createSongTransport({now:()=>t,schedule:(n,at,dur,vel)=>scheduled.push({n,at,dur,vel}),startDelay:.06});
 const notes=[{start:0,end:.25,midi:60,velocity:100},{start:1,end:1.5,midi:64,velocity:90}];
 transport.start(notes,0,.5,2,false);
 assert.equal(scheduled.length,1);
 assert.equal(scheduled[0].dur,.5);
 t=102.06;transport.pump();
 assert.equal(scheduled.length,2);
 assert.equal(transport.position(),1);
 transport.stop();
});

test('transport pause preserves position without scheduling replay on the next start',()=>{
 let t=0,played=[];
 const transport=createSongTransport({now:()=>t,schedule:n=>played.push(n.midi),startDelay:0});
 const notes=[{start:0,end:.2,midi:60},{start:1,end:1.2,midi:62},{start:2,end:2.2,midi:64}];
 transport.start(notes,0,1,3,false);
 t=1.1;const pause=transport.pause();assert.equal(pause,1.1);
 transport.start(notes,pause,1,3,false);assert.deepEqual(played,[60]);
 transport.stop();
});

test('public demos remain data-driven and playable',()=>{
 for(const demo of ['twinkle','scale','chords']){
  const s=SongCatalog.demoSong(demo);
  assert.ok(s.notes.length>0);assert.ok(s.tracks.length>0);
  assert.ok(s.notes.every(n=>Number.isFinite(n.start)&&n.end>n.start));
 }
});
