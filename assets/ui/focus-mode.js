// v0.15 landscape presentation controller. Does not mutate transport, audio,
// note grouping or notation; uses the original settings controls, not clones.
export function createFocusMode({$,songUi,callbacks}) {
  const STORAGE_KEY='garden-notes-landscape-layout-v1';
  let focusActive=false,focusZoom=1.70,focusPreviousScroll=0;
  let layout='balanced',settingsOpen=false;
  const moved=[];
  try{if(localStorage.getItem(STORAGE_KEY)==='piano-first')layout='piano-first';}catch(e){}

  function syncFocusZoom(){
    const factor=focusActive?focusZoom:1;
    $('songScrollScale').style.width=(1508*factor)+'px';
    $('songScrollInner').style.transform=focusActive?'scaleX('+focusZoom+')':'';
    $('focusZoomLabel').textContent=Math.round(focusZoom*100)+'%';
  }
  function refreshTempo(){
    $('focusTempoReadout').textContent=$('songSpeed').value+'%';
  }
  function applyLayout(){
    const piano=layout==='piano-first';
    $('songStudio').classList.toggle('practice-piano-first',piano);
    $('songStudio').classList.toggle('practice-balanced',!piano);
    $('focusLayoutToggle').textContent=piano?'🎹 Piano-first':'♫ Balanced';
    $('focusLayoutToggle').setAttribute('aria-pressed',String(piano));
    $('focusLayoutToggle').setAttribute('aria-label',piano?'Switch to Balanced layout':'Switch to Piano-first layout');
    $('songStaffPanel').setAttribute('aria-label',piano?'Sheet music condensed; switch to Balanced to read it':'Scrolling treble and bass staff for the song');
    // Notation measures available height after a layout change. No song reset.
    if(focusActive)requestAnimationFrame(()=>callbacks.renderStaff(callbacks.position()));
  }
  function toggleLayout(){layout=layout==='balanced'?'piano-first':'balanced';
    try{localStorage.setItem(STORAGE_KEY,layout);}catch(e){}
    applyLayout();
  }
  // Relocate the real, listener-bearing controls into the overlay while focused;
  // restore them to exactly their source order on exit.
  function mountSettings(){
    const content=$('focusSettingsContent');
    for(const selector of ['.rpg-library','.song-loaders','.song-options','.guided-lesson','.song-buttons','.song-progress','.score-settings']){
      const item=$('songStudio').querySelector(':scope > '+selector);
      if(!item)continue;
      const anchor=document.createComment('focus-settings-origin');
      item.parentNode.insertBefore(anchor,item);
      moved.push({item,anchor});content.append(item);
    }
  }
  function restoreSettings(){
    for(const {item,anchor} of moved){anchor.parentNode?.insertBefore(item,anchor);anchor.remove();}
    moved.length=0;
  }
  function setSettingsOpen(open){
    settingsOpen=focusActive&&open;
    $('focusSettingsPanel').hidden=!settingsOpen;
    $('focusSettingsToggle').setAttribute('aria-expanded',String(settingsOpen));
    $('focusSettingsToggle').setAttribute('aria-label',settingsOpen?'Close practice settings':'Open practice settings');
    if(settingsOpen)$('focusSettingsClose').focus({preventScroll:true});
  }
  function enterFocus(){
    if(focusActive)return;
    focusPreviousScroll=songUi.scroll.scrollLeft;
    focusActive=true;
    document.body.classList.add('focus-active');
    $('songStudio').classList.add('practice-focus');
    // Focus mode always keeps notation available in Balanced; respect the
    // existing checkbox after leaving, as in the previous release.
    if(!$('songStaffVisible').checked){$('songStaffVisible').checked=true;$('songStaffPanel').hidden=false;}
    mountSettings();
    setSettingsOpen(false);applyLayout();refreshTempo();syncFocusZoom();
    const midis=callbacks.isPlaying()&&$('songMode').value==='step'?callbacks.groupMidis():[callbacks.nextMidi()];
    focusSongKeys(midis,true);callbacks.renderStaff(callbacks.position());
  }
  function exitFocus(){
    if(!focusActive)return;
    setSettingsOpen(false);restoreSettings();focusActive=false;
    document.body.classList.remove('focus-active');
    $('songStudio').classList.remove('practice-focus','practice-piano-first','practice-balanced');
    syncFocusZoom();songUi.scroll.scrollLeft=focusPreviousScroll;
    callbacks.renderStaff(callbacks.position());
  }
  $('songFocus').addEventListener('click',()=>focusActive?exitFocus():enterFocus());
  $('scoreFitScreen').addEventListener('click',()=>focusActive?toggleLayout():enterFocus());
  $('focusExit').addEventListener('click',exitFocus);
  $('focusPlay').addEventListener('click',()=>callbacks.playSong());
  $('focusLayoutToggle').addEventListener('click',toggleLayout);
  $('focusSettingsToggle').addEventListener('click',()=>setSettingsOpen(!settingsOpen));
  $('focusSettingsClose').addEventListener('click',()=>{setSettingsOpen(false);$('focusSettingsToggle').focus({preventScroll:true});});
  $('songSpeed').addEventListener('input',refreshTempo);
  for(const [id,step] of [['focusZoomOut',-.25],['focusZoomIn',.25]]){
    $(id).addEventListener('click',()=>{
      const before=focusZoom;focusZoom=Math.max(1.20,Math.min(2.45,Math.round((focusZoom+step)*100)/100));
      if(focusZoom===before)return;
      const centerInNotes=(songUi.scroll.scrollLeft+songUi.scroll.clientWidth/2)/before;
      syncFocusZoom();songUi.scroll.scrollLeft=centerInNotes*focusZoom-songUi.scroll.clientWidth/2;
    });
  }
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&focusActive){if(settingsOpen)setSettingsOpen(false);else exitFocus();e.preventDefault();}
  });
  // Resizing can change the viewport without changing selected note or zoom.
  // Recenter the selected keys and reflow the notation after orientation changes.
  let previousWidth=0;
  window.addEventListener('resize',()=>{
    if(!focusActive)return;
    const width=songUi.scroll.clientWidth;
    if(Math.abs(width-previousWidth)>30){
      previousWidth=width;
      const midis=callbacks.isPlaying()&&$('songMode').value==='step'?callbacks.groupMidis():[callbacks.nextMidi()];
      requestAnimationFrame(()=>focusSongKeys(midis,true));
    }
  },{passive:true});
  function focusSongKeys(midis,force=false){
    if(!midis.length)return;
    const center=midis.reduce((total,n)=>total+callbacks.pianoX(n),0)/midis.length*(focusActive?focusZoom:1);
    const view=songUi.scroll.clientWidth,left=songUi.scroll.scrollLeft;
    if(force||center<left+view*.22||center>left+view*.78){
      songUi.scroll.scrollLeft=Math.max(0,center-view/2);
    }
  }
  return {enterFocus,exitFocus,syncFocusZoom,focusSongKeys,isFocusActive:()=>focusActive,getZoom:()=>focusZoom,getLayout:()=>layout};
}
