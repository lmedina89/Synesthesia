// Immersive practice sizing and navigation, isolated from transport state.
export function createFocusMode({$,songUi,callbacks}) {
  let focusActive=false,focusZoom=1.70,focusPreviousScroll=0;
  function syncFocusZoom(){
    const factor=focusActive?focusZoom:1;
    $('songScrollScale').style.width=(1508*factor)+'px';
    $('songScrollInner').style.transform=focusActive?'scaleX('+focusZoom+')':'';
    $('focusZoomLabel').textContent=Math.round(focusZoom*100)+'%';
  }
  function enterFocus(){
    if(focusActive)return;
    focusPreviousScroll=songUi.scroll.scrollLeft;
    focusActive=true;document.body.classList.add('focus-active');
    $('songStudio').classList.add('practice-focus');
    if(!$('songStaffVisible').checked){$('songStaffVisible').checked=true;$('songStaffPanel').hidden=false;}
    syncFocusZoom();
    const midis=callbacks.isPlaying()&&$('songMode').value==='step'?(callbacks.groupMidis()):[callbacks.nextMidi()];
    focusSongKeys(midis,true);callbacks.renderStaff(callbacks.position());
  }
  function exitFocus(){
    if(!focusActive)return;
    focusActive=false;document.body.classList.remove('focus-active');
    $('songStudio').classList.remove('practice-focus');syncFocusZoom();
    songUi.scroll.scrollLeft=focusPreviousScroll;
    callbacks.renderStaff(callbacks.position());
  }
  $('songFocus').addEventListener('click',()=>focusActive?exitFocus():enterFocus());
  $('scoreFitScreen').addEventListener('click',enterFocus);
  $('focusExit').addEventListener('click',exitFocus);
  $('focusPlay').addEventListener('click',()=>callbacks.playSong());
  for(const [id,step] of [['focusZoomOut',-.25],['focusZoomIn',.25]]){
    $(id).addEventListener('click',()=>{
      const before=focusZoom;focusZoom=Math.max(1.20,Math.min(2.45,Math.round((focusZoom+step)*100)/100));
      if(focusZoom===before)return;
      const centerInNotes=(songUi.scroll.scrollLeft+songUi.scroll.clientWidth/2)/before;
      syncFocusZoom();songUi.scroll.scrollLeft=centerInNotes*focusZoom-songUi.scroll.clientWidth/2;
    });
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&focusActive){exitFocus();e.preventDefault();}});
  function focusSongKeys(midis,force=false){if(!midis.length)return;
    const center=midis.reduce((total,n)=>total+callbacks.pianoX(n),0)/midis.length*(focusActive?focusZoom:1);
    const view=songUi.scroll.clientWidth,left=songUi.scroll.scrollLeft;
    if(force||center<left+view*.22||center>left+view*.78){
      songUi.scroll.scrollLeft=Math.max(0,center-view/2);
    }
  }

  return {enterFocus,exitFocus,syncFocusZoom,focusSongKeys,isFocusActive:()=>focusActive,getZoom:()=>focusZoom};
}
