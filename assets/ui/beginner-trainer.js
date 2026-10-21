// Beginner instrument UI and drills. No dependency on the song-studio module.
export function createBeginnerTrainer({$,state,Theory,audio,songCallbacks,savePreferences}) {
  const {NOTES,WHITE,BLACK_POS,noteMidi}=Theory;
  const KALIMBA_ORDER=['E6','C6','A5','F5','D5','B4','G4','E4','C4','D4','F4','A4','C5','E5','G5','B5','D6'];
  const KALIMBA_ASC=['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5','B5','C6','D6','E6'];
  const {playNote,preloadPianoOctave,updateAudioStatus}=audio;
  let currentPool = [];
  let nextTimer = null;
  function persist(){savePreferences();}
  function makePool(){if(state.instrument==='kalimba')return KALIMBA_ASC.slice(); const oc=state.octave;let p=[];for(let n=0;n<=12;n++){let midi=12*(oc+1)+n;p.push(NOTES[midi%12]+Math.floor(midi/12-1));}return p;}
  const NATURAL=['C','D','E','F','G','A','B'];
  function readPool(){ const start = state.instrument==='piano'&&state.clef==='bass'?3:4; return NATURAL.map(n=>n+start).concat('C'+(start+1)); }
  function syncReadRange(){
    // Keep all notated questions inside the visible 13-key piano window.
    if(state.mode==='read'&&state.instrument==='piano'){
      state.octave=state.clef==='bass'?3:4;
      renderPiano();
      $('octaveText').textContent='C'+state.octave+'–C'+(state.octave+1);
    }
    $('octaveDown').disabled=state.mode==='read'||state.octave<=2;
    $('octaveUp').disabled=state.mode==='read'||state.octave>=6;
    persist();
  }
  function drawStaff(note){
    const clef=state.instrument==='kalimba'?'treble':state.clef;
    const bottomIndex=clef==='treble'?4*7+2:2*7+4; // bottom line E4 or G2
    const m=/^([A-G])(\d)$/.exec(note);
    if(!m)return;
    const position=Number(m[2])*7+NATURAL.indexOf(m[1]);
    const y=92-(position-bottomIndex)*8;
    const lines=[28,44,60,76,92].map(ly=>`<line x1="35" x2="278" y1="${ly}" y2="${ly}" stroke="#bfb3da" stroke-width="1.8"/>`).join('');
    const ledger=[];
    if(y>92)for(let ly=108;ly<=y;ly+=16)ledger.push(ly);
    if(y<28)for(let ly=12;ly>=y;ly-=16)ledger.push(ly);
    const extras=ledger.map(ly=>`<line x1="143" x2="185" y1="${ly}" y2="${ly}" stroke="#bfb3da" stroke-width="1.8"/>`).join('');
    const stem=y>=60?`<line x1="176" x2="176" y1="${y}" y2="${y-47}" stroke="#dec8ff" stroke-width="2.4"/>`:`<line x1="152" x2="152" y1="${y}" y2="${y+47}" stroke="#dec8ff" stroke-width="2.4"/>`;
    $('staffScore').innerHTML=lines+extras+`<text x="43" y="120" font-size="14" fill="#c9b9ef">${clef==='treble'?'Treble':'Bass'}</text>`+stem+`<ellipse cx="164" cy="${y}" rx="13" ry="8.2" transform="rotate(-18 164 ${y})" fill="#c3a6ff" stroke="#f8ebff" stroke-width="1.7"/>`;
    $('staffScore').setAttribute('aria-label','A mystery note on the '+clef+' staff');
    $('staffCaption').textContent=clef==='treble'?'Treble: lines E G B D F, bottom to top':'Bass: lines G B D F A, bottom to top';
  }
  function flash(note,kind='playing'){
    const nodes=document.querySelectorAll('[data-note="'+note+'"]');
    nodes.forEach(el=>{el.classList.remove('playing','correct','wrong');el.classList.add(kind);clearTimeout(el._flash);el._flash=setTimeout(()=>el.classList.remove(kind),kind==='wrong'?480:340);});
  }
  function score(){ $('correctCount').textContent=state.correct; $('streakCount').textContent=state.best;persist(); }
  function writeMessage(head,title,sub,feedback='',bad=false){$('challengeKicker').textContent=head;$('challengeNote').textContent=title;$('challengeSub').textContent=sub;const a=$('answer');a.textContent=feedback;a.classList.toggle('error',bad);}
  function handleNote(note){
    playNote(note);flash(note);songCallbacks.readPlayedNotes([noteMidi(note)]);
    if(songCallbacks.isPlaying()&&$('songMode').value==='step')songCallbacks.acceptPracticeNote(noteMidi(note));
    if(state.drillIndex>=0){
      const expected = warmupSequence()[state.drillIndex];
      if(note===expected){flash(note,'correct');state.drillIndex++;updateWarmup();if(state.drillIndex>=8){state.drillIndex=-1;$('warmupStatus').textContent='Complete!';$('warmupDescription').textContent='Beautiful! You played all eight notes in order.';$('warmupBtn').textContent='Practice again';writeMessage('Warm-up complete','You did it! ✨','That was the C-major scale. You just practiced a useful piano foundation.');}}
      else {flash(note,'wrong');writeMessage('Guided practice','Try '+expected,'Take your time. Find the highlighted note in the warm-up below.','That was '+note+'.');}
      return;
    }
    if(state.mode==='explore'){
      writeMessage('You played',note,note.includes('#')?'The # means sharp: a black key a half step higher than its neighboring white note.':note+' is a natural note. Try the notes beside it.');
      return;
    }
    if(state.answered)return;
    if(note===state.current){state.correct++;state.streak++;state.best=Math.max(state.best,state.streak);state.answered=true;flash(note,'correct');writeMessage('Correct!','That’s '+note+'! 🎉','Nice job. Every correct note builds your keyboard map.','✓ Great work');$('nextBtn').hidden=false;$('hearBtn').hidden=true;score();}
    else {state.streak=0;flash(note,'wrong');$('answer').textContent='Not quite — that was '+note+'. Try again.';$('answer').classList.add('error');}
  }
  function keyButton(note,cls,inner){const el=document.createElement('button');el.type='button';el.className=cls;el.dataset.note=note;el.setAttribute('aria-label','Play '+note);el.innerHTML=inner;el.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();handleNote(note);});el.addEventListener('click',e=>{if(e.detail===0)handleNote(note);});return el;}
  function renderPiano(){const root=$('piano');root.innerHTML='';const oc=state.octave;
    WHITE.forEach((n,i)=>{const note=n+(i===7?oc+1:oc);const key=keyButton(note,'piano-white','<span class="key-name">'+note+'</span>'+(n==='C'?'<span class="key-dot"></span>':''));root.append(key);});
    BLACK_POS.forEach(([i,n])=>{let note=n+oc;const key=keyButton(note,'piano-black','<span class="key-name">'+note+'</span>');key.style.left=(100*(i+1)/8)+'%';root.append(key);});
    root.classList.toggle('hide-labels',!state.showLabels);
  }
  function renderKalimba(){const root=$('tineRow');root.innerHTML='';let heights=[];for(let i=0;i<17;i++)heights.push(105+(8-Math.abs(i-8))*11);
    KALIMBA_ORDER.forEach((n,i)=>{let key=keyButton(n,'tine','<span class="key-name">'+n.replace(/(\d)/,'<br>$1')+'</span>');key.style.setProperty('--height',heights[i]+'px');root.append(key);});
    root.classList.toggle('hide-labels',!state.showLabels);
    const grid=$('kalimbaNoteGrid');grid.innerHTML='';KALIMBA_ASC.forEach(n=>grid.append(keyButton(n,'',n)));grid.classList.toggle('hide-labels',!state.showLabels);
  }
  function refreshInstrument(){const piano=state.instrument==='piano';currentPool=makePool();$('pianoArea').hidden=!piano;$('kalimbaArea').hidden=piano;$('octaveControls').hidden=!piano;
    $('tabPiano').setAttribute('aria-selected',String(piano));$('tabKalimba').setAttribute('aria-selected',String(!piano));
    $('instrumentName').textContent=piano?'Your piano':'Your 17-key kalimba';$('instrumentSubtitle').textContent=piano?'Tap a key to hear its note. Begin with C.':'Tap a metal tine or one of the larger note buttons.';
    $('rangeBadge').textContent=piano?'8 white + 5 black':'17 natural notes';$('octaveText').textContent='C'+state.octave+'–C'+(state.octave+1);
    $('octaveDown').disabled=state.mode==='read'||state.octave<=2;$('octaveUp').disabled=state.mode==='read'||state.octave>=6;
    $('instrumentHint').textContent=piano?'Tip: C is just to the left of a group of two black keys. Tap a C key to hear it.':'Tip: The longest center tine is C4. As notes go higher, they alternate right and left.';
    $('tip1Title').textContent=piano?'Meet middle C':'Start at the center';$('tip1Body').textContent=piano?'C4 is called middle C. Find the white key to the left of a pair of black keys.':'The long center tine is C4. Start here, then work outward from the middle.';
    $('tip2Title').textContent=piano?'The musical alphabet':'The kalimba pattern';$('tip2Body').textContent=piano?'The white notes are C, D, E, F, G, A, B, then C again. The pattern repeats.':'A 17-key C kalimba has no sharps or flats in its standard layout. Higher notes alternate left and right.';
    $('labelsToggle').checked=state.showLabels;renderPiano();renderKalimba();cancelDrill();switchMode(state.mode);persist();preloadPianoOctave();updateAudioStatus();
  }
  function switchMode(mode){state.mode=mode;state.answered=false;clearTimeout(nextTimer);document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-selected',String(el.dataset.mode===mode)));
    $('nextBtn').hidden=true;$('hearBtn').hidden=true;
    $('readPanel').hidden=mode!=='read';
    $('clefSelect').disabled=state.instrument==='kalimba';
    if(state.instrument==='kalimba')state.clef='treble';
    $('clefSelect').value=state.clef;
    syncReadRange();
    if(state.drillIndex>=0)cancelDrill();
    if(mode==='explore'){writeMessage('Free play','Make some music ✨','Tap any key. You’ll hear its pitch and see its note name here.');}
    else nextChallenge();
  }
  function nextChallenge(){state.answered=false;const pool=(state.mode==='read'?readPool():currentPool).slice();if(!pool.length)return;let candidates=pool.filter(n=>n!==state.current);state.current=candidates[Math.floor(Math.random()*candidates.length)]||pool[0];
    $('nextBtn').hidden=true;$('hearBtn').hidden=state.mode!=='ear';
    if(state.mode==='find')writeMessage('Find this note',state.current,'Tap the matching key. You can hide note labels for an extra challenge.');
    else if(state.mode==='read'){writeMessage('Read this note','Which key matches?','Look at the staff below, then tap its note on the keyboard.');drawStaff(state.current);}
    else {writeMessage('Listen carefully','Which note is this?','Tap “Hear the note,” then find the key that matches its sound.');playNote(state.current);}
  }
  function warmupSequence(){return ['C4','D4','E4','F4','G4','A4','B4','C5'];}
  function updateWarmup(){const wrap=$('notesLine');wrap.innerHTML='';warmupSequence().forEach((n,i)=>{let chip=document.createElement('span');chip.textContent=n;chip.className=i<state.drillIndex?'complete':i===state.drillIndex?'current':'';wrap.append(chip);});$('warmupStatus').textContent=state.drillIndex<0?'0 / 8':Math.min(state.drillIndex,8)+' / 8';}
  function cancelDrill(){state.drillIndex=-1;updateWarmup();$('warmupBtn').textContent='Start guided practice';$('warmupDescription').textContent='Play these notes in order. The app will follow along as you go.';}
  function startDrill(){state.drillIndex=0;
    if(state.instrument==='piano')state.octave=4;
    if(state.instrument==='piano'){$('octaveText').textContent='C4–C5';renderPiano();}
    if(state.mode!=='explore')switchMode('explore');state.drillIndex=0;updateWarmup();$('warmupBtn').textContent='Restart warm-up';$('warmupDescription').textContent='Play the highlighted note, then the next. Start with C4.';
    writeMessage('Guided practice','Start with C4','Follow the notes in the warm-up card. Each correct note advances the exercise.');persist();
  }


  return {handleNote,renderPiano,renderKalimba,refreshInstrument,switchMode,nextChallenge,startDrill,syncReadRange,score,persist};
}
