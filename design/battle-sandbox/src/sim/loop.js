// sight and fog, the update loop, mouse and keys, menus, the unit panel
// your side's sight, Door Kickers style: all round, stopped dead by walls and closed doors, full bright to about half range then fading to black
const FOVR=320;let VD=new Float32Array(1);
const S360N=Math.ceil(6.283*FOVR/2.5),S360C=Float32Array.from({length:S360N},(_,i)=>Math.cos(i/S360N*6.283)),S360S=Float32Array.from({length:S360N},(_,i)=>Math.sin(i/S360N*6.283)),S360F=Float32Array.from({length:FOVR},(_,r)=>{const t=(r-FOVR*.5)/(FOVR*.5);return t<=0?1:1-t*t*(3-2*t)});
function sight360(b,f){const low=!!b.crouch,n=S360N,bx=b.x+.5,by=b.y+.5;
 for(let i=0;i<n;i++){const c=S360C[i],s=S360S[i];let wd=0;for(let r=0;r<FOVR;r+=2){const X=Math.floor(bx+c*r),Y=Math.floor(by+s*r);if(X<0||Y<0||X>=W||Y>=H)break;const j=Y*W+X,wl=sol[j]||slabG[j]&&!(b.vseat&&slabG[j]===b.vseat.id);if(wd&&!wl)break;f((Y>>1)*BW+(X>>1),S360F[r]);if(wl&&(wd+=2)>8)break;if(low&&OBJ[j]&&r>5)break}}}
// a unit under direct control shows what it can see: the cone, cut by walls and, when crouched, by furniture
// what a unit sees: a cone plus a small circle; rays look a little way into walls but never out the other side
function blurMask(A){for(let pass=0;pass<2;pass++){for(let y=0;y<BH;y++){const o=y*BW;let sum=0;for(let k=0;k<=2&&k<BW;k++)sum+=A[o+k];for(let x=0;x<BW;x++){const n=Math.min(BW-1,x+2)-Math.max(0,x-2)+1;VT[o+x]=sum/n;if(x+3<BW)sum+=A[o+x+3];if(x-2>=0)sum-=A[o+x-2]}}
  for(let x=0;x<BW;x++){let sum=0;for(let k=0;k<=2&&k<BH;k++)sum+=VT[k*BW+x];for(let y=0;y<BH;y++){const n=Math.min(BH-1,y+2)-Math.max(0,y-2)+1;A[y*BW+x]=sum/n;if(y+3<BH)sum+=VT[(y+3)*BW+x];if(y-2>=0)sum-=VT[(y-2)*BW+x]}}}}
// with one of your units selected, what the others see is dimmed slightly
function fogPass(){vFogMask();const sl=fSel&&[...sel].some(b=>b.type==='token'&&teamOf(b)===fogTeam())&&![...sel].some(b=>b.type==='token'&&VEH.some(v=>vHas(v,b)));const F=rgb(6,6,8),[vx0,vy0,vx1,vy1]=VIEWR||[0,0,W,H];for(let Y=vy0;Y<vy1;Y++){const r=(Y>>1)*BW;for(let X=vx0,j=Y*W+vx0;X<vx1;X++,j++){const q=r+(X>>1),v=Math.min(1,VF[q]*1.6);if(VIS[q])SNAP[j]=out[j];if(VFM&&VFM[j])continue;if(sl&&v>0){const w=Math.min(1,VSF[q]*1.6);if(w<1)out[j]=mul(out[j],.8+.2*w*w*(3-2*w))}if(v>=1)continue;const m=F;out[j]=v<=0?m:mix(m,out[j],v*v*(3-2*v))}}
 for(const z of RINGS){const k=(tick-z.t)/40,rad=2+k*7;for(let i=0;i<28;i++){const X=Math.round(z.x+Math.cos(i*.2244)*rad),Y=Math.round(z.y+Math.sin(i*.2244)*rad);if(X>=0&&Y>=0&&X<W&&Y<H){const j=Y*W+X;out[j]=mix(out[j],rgb(230,226,214),.5*(1-k))}}}RINGS=RINGS.filter(z=>tick-z.t<40)}
function ringFor(z){const FT=fogTeam();if(!fogOn()||z.src&&teamOf(z.src)===FT||z.src&&!z.src.fogH)return;const me=bodies.filter(b=>b.type==='token'&&teamOf(b)===FT&&b.status==='free');if(me.some(b=>heardBy(b,z))&&!RINGS.some(r=>tick-r.t<12&&Math.hypot(r.x-z.x,r.y-z.y)<10))RINGS.push({x:z.x,y:z.y,t:tick})}
// a crouched unit hides behind low furniture: a low shot hits any desk; a high shot hits one beside a crouched unit
function lowHit(b){const X=Math.round(b.x),Y=Math.round(b.y);if(X<0||Y<0||X>=W||Y>=H||!OBJ[Y*W+X]){b.inO=false;return false}
 if(!b.low&&!bodies.some(t=>t.type==='token'&&t.crouch&&t.status!=='dead'&&Math.hypot(t.x-b.x,t.y-b.y)<26&&(t.x-b.x)*b.vx+(t.y-b.y)*b.vy>0))return false;
 const s=Math.hypot(b.vx,b.vy)||1,j=Y*W+X,m=OBJ[j],pel=b.kind==='pel';
 // a low shot marks the furniture by its material; only wood lets a strong shot through
 const M=hcl(m),r=M.obj[pel?0:1];for(let y=Math.floor(Y-r);y<=Y+r;y++)for(let x=Math.floor(X-r);x<=X+r;x++){const q=y*W+x;if(x<0||y<0||x>=W||y>=H||!OBJ[q]||Math.hypot(x-X,y-Y)>r)continue;if(M.metal){OBJC[q]=mul(OBJC[q],.72);SHN[q]=0;continue}OBJ[q]=0;SHN[q]=0;floor[q]=mix(floor[q],mul(OBJC[q],.45),.7)}ds0Need=true;{const c=bodies.find(o=>o.hidden&&o.box&&X>=o.box[0]&&X<=o.box[2]&&Y>=o.box[1]&&Y<=o.box[3]);if(c)cShot(c,X,Y,r,b)}
 if(b.inO)return false;b.inO=true;hitFx(X,Y,m,b.vx/s,b.vy/s,pel);b.pen=(b.pen||0)+1;
 if(!M.through||pel||b.pen>2||s<7){remove(b);return true}b.vx*=.6;b.vy*=.6;return false}
function update(){tick++;for(const b of bodies)if(b.hf&&b.type==='token'&&b.status==='free'&&!b.direct&&!b.vseat&&!b.ord)turnTo(b,Math.atan2(mouse.y-b.y,mouse.x-b.x));if(tick%60===0)uUse();SND&&SND.near();SND&&SND.fireTick();for(const b of bodies)if(b.type==='token'&&b.status==='captured')b.ang=-Math.PI/2;// captives face up so their cuffs read
 for(const b of bodies)if(b.type==='token'&&(b.matA!==b.ang||b.matN!==lookOf(b)))tokMat(b);if(!aiOn)for(const b of bodies){if(b.ord){ensureRooms();ordTick(b)}else if(b.lookAt)lookTick(b)}if(!aiOn&&tick%20===0)homeTick();if(tick%30===0)leaderTick();turnTick();try{aiTick();}catch(e){console.warn(e)}if(aiOn&&tick%20===0)for(const b of bodies)if(b.type==='token'&&b.status==='free'&&b.mv>0&&!b.crouch)hear(b.x,b.y,UNITS[b.unit].arm>=2?90:60,b,'step');markSlabs();if(drag)dragStep();if(tick%3===0)fireTick();if(tick%10===0){autoPick();keyTick()}for(const b of bodies){if(b.mw){if(b.status==='free')moveToward(b,b.x+b.mw.dx,b.y+b.mw.dy);if(--b.mw.n<=0)b.mw=null}if(b.raised&&tick-b.rT>12&&tick%4===0){b.raised=false;b.hc=null;b.pull=8;if(heldBlocked(b,0,0)){b.raised=true;b.pull=0;b.hc=null}else{b.rT=tick;rustle(b,.5)}}if(!b.raised&&b.pull>0&&tick%3===0){b.pull--;if(heldBlocked(b,0,0))b.pull++}if(b.cock>0)b.cock--;if(b.type==='token'&&b.status==='free'&&b.held&&CAP[b.held.k]&&b.held.ammo===0&&b.held.res>0&&!b.burst&&!b.bq&&!(b.cock>0)){if(++b.rlT>20){b.rlT=0;reload(b)}}else b.rlT=0;burstTick(b);if(b.dash)dashStep(b)}aiDodge();if(tick%6===0)hud();wasd();doors();shockTick();for(const b of bodies)if(b.held)melee(b);rodTick();
 for(const b of [...bodies])if((b.kind==='grenade'||b.kind==='bomb')&&b.fuse>0&&--b.fuse===0&&bodies.includes(b))detonate(b)
 for(const b of bodies)b.wind=0;if(charge){const pr=Math.min(1,(performance.now()-charge.t)/charge.need);for(const b of armed()){const i=srcInfo(b);if(i&&i.throw)b.wind=i.heat?Math.min(1,.35+(slot(b).heat||0)*.65):pr*pr}}
 cookTick();if(charge&&charge.cook){if(!charge.fired&&performance.now()-charge.t>=charge.need){charge.fired=true;fireGroup(mouse.x,mouse.y,o=>!cooks(o))}}
 else if(charge&&performance.now()-charge.t>=charge.need){fireGroup(mouse.x,mouse.y);if(holdFire&&armed().length&&armed().every(o=>{const i=srcInfo(o);return i&&!i.throw&&!i.heat}))charge={...charge,t:performance.now()};else charge=null}
 for(const b of [...bodies])if(bodies.includes(b))step(b);vTick();tetherTick();if(tick%4===0)exitTick();if(curMap==='air'&&tick%5===0)overboard();stepParts();cool();fxTick()}
let lastT=performance.now(),acc=0,slowMo=false,holdFire=false;
// at most two steps a frame: under load the game slows a touch rather than stalling to catch up
function loop(){const now=performance.now();acc+=Math.min(120,now-lastT)*(slowMo?.3:1);lastT=now;let n=0;while(acc>=16.667&&n<2){update();acc-=16.667;n++}if(acc>33.3)acc=0;if(n)render();requestAnimationFrame(loop)}

const toBoard=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H]};
const inBoard=e=>{const r=cv.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom};
function startDrag(b,x,y,fromPanel,free){if(b.wedged)return;b.home=null;if(!fromPanel&&sel.has(b))for(const o of sel)o.home=null;if(b.type==='weapon')b.byHand=true;const grp=!fromPanel&&sel.has(b)&&sel.size>1&&b.type==='token'?[...sel].filter(o=>o.type==='token'&&o.status!=='dead'):[b];
 drag={b,group:grp,offs:grp.map(o=>[o.x-b.x,o.y-b.y]),ox:fromPanel?0:b.x-x,oy:fromPanel?0:b.y-y,tx:x,ty:y,smp:[[performance.now(),x,y]],panel:fromPanel,free};
 for(const o of grp){o.vx=o.vy=0;o.glide=null;if(o.pinned)o.pinned=false;if(o.stuck||fromPanel||free||solidHits(o,0,0))o.ghost=true;o.stuck=false;o.att=null;o.timer=0;o.fizz=0;o.charge=null;if(o.snd){o.snd.stop();o.snd=null}}sfx('flick')}
function dragStep(){const b=drag.b;if(!bodies.includes(b)){drag=null;return}const tx=drag.tx+drag.ox,ty=drag.ty+drag.oy;
 if(drag.panel){b.x=tx;b.y=ty;b.ghost=true;return}
 if(drag.free){drag.group.forEach((o,i)=>{o.x=tx+drag.offs[i][0];o.y=ty+drag.offs[i][1];o.ghost=true;o.mv=6;leash(o)});return}
 drag.group.forEach((o,i)=>{if(!bodies.includes(o))return;const md=moveToward(o,tx+drag.offs[i][0],ty+drag.offs[i][1]);if(md>.5)o.mv=6;leash(o)})}
function nudge(b){const x0=b.x,y0=b.y;for(let r=1;r<=24;r++)for(let k=0;k<16;k++){const a=k/16*6.283;b.x=x0+Math.cos(a)*r;b.y=y0+Math.sin(a)*r;if(!solidHits(b,0,0))return true}b.x=x0;b.y=y0;return false}
let lastClick=null;
function clickBody(b,add){if(b.status==='dead')return;if(b.hidden){openCrate=openCrate===b?null:b;sfx('door');return}if(b.kind==='crate'){b.open=!b.open;sfx('door');return}if(b.type==='slab'&&b.free){if(!add)sel.clear();if(add&&sel.has(b))sel.delete(b);else sel.add(b);sfx('flick');return}if(b.type==='slab'){if(b.fallen)return;const lv=b.pair?[b,b.pair]:[b];let hp=null;if(lastClick){for(let j=-1;j<=1&&!hp;j++)for(let i=-1;i<=1&&!hp;i++)hp=b.set.get(K(lastClick.X+i-Math.round(b.x),lastClick.Y+j-Math.round(b.y)))||null}
 if(b.tgt!==0||b.ang!==0){for(const q of lv)q.tgt=0;sfx('door')}else if(hp&&hp[8]<=6){if(b.locked)sfx('lock');else{openGroup(b,null);sfx('door')}}else if(!b.lockBroken&&!(b.pair&&b.pair.lockBroken)){b.locked=!b.locked;if(b.pair)b.pair.locked=b.locked;sfx('lock')}return}
 if(b.type==='weapon'&&!sel.has(b)){const now=performance.now(),dbl=lastW&&lastW.id===b.id&&now-lastW.t<400;lastW={id:b.id,t:now};if(!dbl)return}
 if(!add)sel.clear();if(add&&sel.has(b))sel.delete(b);else sel.add(b);sfx('flick')}
let lastW=null;
cv.addEventListener('contextmenu',e=>e.preventDefault());
const boardDown=e=>{au();closeMenu();if(panKey||e.button===1){pan={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y};cv.setPointerCapture(e.pointerId);e.preventDefault();return}if(vDriving())return;const[x,y]=toBoard(e),X=x|0,Y=y|0;
 if(e.button===2){const b=bodyAt(X,Y,1)||bodyAt(X,Y,1,null,o=>o.type==='token'&&o.status==='dead');{const vv=!b&&vAt(X,Y);if(vv&&!vv.dead){const g=[...sel].filter(o=>canOrder(o)&&!vHas(vv,o));if(g.length){vSendAboard(vv,g);sfx('flick')}else vMenu(vv,e);return}}if(!b&&[...sel].some(canOrder)){const g=[...sel].filter(canOrder);if(g.length===1){ordGive(g,x,y);return}RDRAG={g,x0:x,y0:y};cv.setPointerCapture(e.pointerId);return}if(b)openMenu(b,e);else if(![...sel].some(o=>o.direct)){sel.clear();moveSel=null;charge=null}return}
 cv.setPointerCapture(e.pointerId);
 {
  if(moveSel){const k=(y/T|0)*CW+(x/T|0);if(!e.shiftKey&&moveSel.cells.has(k)){const b=moveSel.b;b.glide=[(x/T|0)*T+8,(y/T|0)*T+8];b.ghost=true;b.stuck=false;b.vx=b.vy=0;moveSel=null;sfx('flick');return}moveSel=null}
  const b=bodyAt(X,Y,1)||(X>=0&&Y>=0&&X<W&&Y<H?containerAt(X,Y):null)||vPick(X,Y);lastClick={X,Y};
  if(e.shiftKey){if(b&&b.type!=='slab')startDrag(b,x,y,false,true);return}
  const ar=armed();
  if(ar.length&&!(b&&(sel.has(b)||b.kind==='crate'))){charge={t:performance.now(),need:Math.max(...ar.map(o=>srcInfo(o).hold)),x,y,b,cook:ar.some(cooks)};cookStart(ar);holdFire=true;return}
  if(b){if(b.status==='dead'||b.kind==='crate'){clickBody(b,e.ctrlKey||e.metaKey);return}pend={b,x,y,add:e.ctrlKey||e.metaKey};return}
  box={x0:x,y0:y,x1:x,y1:y}}
};
cv.addEventListener('pointerdown',e=>{const a=document.activeElement;if(a&&/INPUT|SELECT/.test(a.tagName))a.blur();boardDown(e)});
// the dark space around the board works like the board: box-select, pan, aim
stage.parentElement.addEventListener('pointerdown',e=>{if(e.target===stage.parentElement||e.target===stage)boardDown(e)});
window.addEventListener('pointermove',e=>{if(pan){cam.x=pan.cx+e.clientX-pan.x;cam.y=pan.cy+e.clientY-pan.y;applyCam();return}const[x,y]=toBoard(e);mouse.x=x;mouse.y=y;mouse.in=inBoard(e);
 hover=mouse.in&&!drag?bodyAt(x|0,y|0,1):null;hoverC=!hover&&mouse.in&&!drag&&(x|0)>=0&&(y|0)>=0&&(x|0)<W&&(y|0)<H?containerAt(x|0,y|0):null;
 if(!drag)for(const b of sel){if(b.type==='slab'||cmdMode(b))continue;if(!srcInfo(b)&&!(b.type==='token'&&b.status==='free'))continue;const a=b.type==='token'?aimA(b,x,y):Math.atan2(y-b.y,x-b.x);if(b.type==='token')turnTo(b,a);else b.faceT=a}
 if(pend&&Math.hypot(x-pend.x,y-pend.y)>2){startDrag(pend.b,pend.x,pend.y);pend=null}
 if(box){box.x1=x;box.y1=y}
 if(drag){drag.tx=x;drag.ty=y;const t=performance.now();drag.smp.push([t,x,y]);while(drag.smp.length>2&&t-drag.smp[0][0]>90)drag.smp.shift();
  const b=drag.b;if(b.type==='weapon'&&!WP[b.kind].gun){const s0=drag.smp[0],dx=x-s0[1],dy=y-s0[2];if(Math.hypot(dx,dy)>3){const a=Math.atan2(dy,dx);let d=a-b.ang;d=Math.atan2(Math.sin(d),Math.cos(d));if(Math.abs(d)>.2)reshape(b,b.ang+d*.6)}}return}
});
window.addEventListener('pointerup',e=>{if(RDRAG){const r=RDRAG;RDRAG=null;ordGive(r.g,mouse.x,mouse.y,r.x0,r.y0);return}holdFire=false;if(pan){pan=null;return}if(spinning){spinning=false;return}const add=e.ctrlKey||e.metaKey;
 if(cellDrag){const cd=cellDrag;cellDrag=null;const k=(mouse.y/T|0)*CW+(mouse.x/T|0);if(moveSel&&moveSel.b===cd.b&&moveSel.cells.has(k)){const b=cd.b;b.glide=[(mouse.x/T|0)*T+8,(mouse.y/T|0)*T+8];b.ghost=true;b.stuck=false;b.vx=b.vy=0;moveSel=null;sfx('flick')}return}
 if(charge&&charge.cook){fireGroup(mouse.x,mouse.y,cooks);charge=null;return}
 if(charge&&armed().some(o=>{const i=srcInfo(o);return i&&i.heat})&&(performance.now()-charge.t>120||armed().some(o=>o.held&&o.held.k==='sspear'))){fireGroup(mouse.x,mouse.y);charge=null;return}
 if(charge){if(charge.b&&charge.b.type!=='slab'&&charge.b.kind!=='crate'&&Math.hypot(mouse.x-charge.x,mouse.y-charge.y)<3)clickBody(charge.b,add);charge=null;return}
 if(box){const x0=Math.min(box.x0,box.x1),x1=Math.max(box.x0,box.x1),y0=Math.min(box.y0,box.y1),y1=Math.max(box.y0,box.y1);box=null;
  if(x1-x0<3&&y1-y0<3){if(![...sel].some(o=>o.direct)){sel.clear();openCrate=null}return}if(!add)sel.clear();for(const b of bodies)if(b.type==='token'&&b.status!=='dead'&&b.x>=x0&&b.x<=x1&&b.y>=y0&&b.y<=y1)sel.add(b);if(sel.size)sfx('flick');return}
 if(pend){clickBody(pend.b,pend.add);pend=null;return}
 if(!drag)return;const b=drag.b,[x,y]=toBoard(e),grp=drag.group.length>1;
 if(drag.panel){if(!inBoard(e)){remove(b);drag=null;return}b.ghost=false;if(solidHits(b,0,0)&&!nudge(b)){remove(b);drag=null;return}}
 if(drag.free){const g=drag.group;drag=null;if(!inBoard(e)){for(const o of g)remove(o);sfx('whoosh');return}if(EM&&g.length===1&&edGive(g[0]))return;for(const o of g){o.ghost=false;if(solidHits(o,0,0)&&!nudge(o))o.ghost=true}sfx('drop');return}
 const t=performance.now(),s=drag.smp.filter(q=>t-q[0]<80);let vx=0,vy=0;if(s.length>1){const a=s[0],z=s[s.length-1],dt=Math.max(8,z[0]-a[0]);vx=(z[1]-a[1])/dt*23;vy=(z[2]-a[2])/dt*23}
 let sp=Math.hypot(vx,vy);drag=null;if(grp||b.type==='slab')return;
 const onTok=()=>bodyAt(Math.round(x),Math.round(y),2,b,o=>o.type==='token'&&o.status!=='dead');
 if(b.type==='weapon'&&b.kind!=='crate'&&PICK.has(b.kind)&&sp<=1.4){const X=Math.round(x),Y=Math.round(y),c=bodyAt(X,Y,3,b,o=>o.kind==='crate'&&!o.hidden)||(OBJ[Y*W+X]?boxAt(X,Y):null);if(c&&b.fuse){NOPE();b.vx=b.vy=0;return}if(c){cNorm(c);const it={k:b.kind,n:b.kind==='gold'?(b.amt||50):1};if(CAP[b.kind]){it.ammo=b.ammo??CAP[b.kind];it.res=b.res||0}if(cAdd(c,it,X,Y)){remove(b);lastHud='';storeSnd(it.k)}else{NOPE();b.vx=b.vy=0}return}}
 if(b.type==='weapon'&&(WP[b.kind].gun||WP[b.kind].tool||b.kind==='shield'||(WP[b.kind].melee&&sp<=1.4))){const tk=onTok();if(tk){give(tk,b.kind,b.ammo,b.res);remove(b)}return}
 const max=b.type==='weapon'?WP[b.kind].max:24;
 if(sp>1.4){if(sp>max){vx*=max/sp;vy*=max/sp}sfx('whoosh');b.vx=vx;b.vy=vy;b.thrown=true;if(b.type==='weapon')reshape(b,Math.atan2(vy,vx))}});
let fHold=null,tHold=null;const FDIR={arrowup:-Math.PI/2,arrowdown:Math.PI/2,arrowleft:Math.PI,arrowright:0},unarmedSel=()=>[...sel].filter(b=>b.type==='token'&&b.status==='free'&&!b.held&&!b.vseat);
window.addEventListener('keyup',e=>{if(e.key.toLowerCase()!=='f'||!fHold)return;if(!fHold.turned){const ts=unarmedSel();for(const b of ts)turnTo(b,(b.ang||0)+Math.PI);if(ts.length)sfx('flick')}fHold=null});
window.addEventListener('keyup',e=>{if(e.key.toLowerCase()!=='t'||!tHold)return;if(!tHold.used)formUp();tHold=null});
window.addEventListener('blur',()=>{fHold=null;tHold=null;RDRAG=null});
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(k===' '){if(![...sel].some(o=>o.direct))panKey=true;e.preventDefault();return}
 if(k==='z'){if(!e.repeat)toggleSlow();return}
 if(k==='x'){if(!e.repeat)vKeyX();return}
 if(k==='v'){if(!e.repeat&&vKeyV())return;if(!e.repeat)lookGive([...sel].filter(canOrder),mouse.x,mouse.y,e.shiftKey);return}
 if(k==='shift'){if(vKeyBrake(true))return;const ts=[...sel].filter(b=>b.type==='token');if(!e.repeat&&ts.length===1&&ts[0].direct)dash();return}
 if(k==='c'){if(!e.repeat)for(const b of sel)if(b.type==='token'&&b.status==='free'){b.crouch=true;b.pc=true}return}
 if((k==='q'||k==='e')&&[...sel].some(o=>o.type==='slab'&&o.free)){keys.add(k);e.preventDefault();return}
 // Q over a group: if any weapon is out, all are put away; otherwise all are drawn
 if(k==='q'){const ts=[...sel].filter(b=>b.type==='token'&&b.status==='free'&&b.inv),out=ts.some(b=>b.held);for(const b of ts){if(out){if(b.held){b.psi=b.si;b.si=-1;b.held=null;b.hc=null}}else if(b.psi>=0&&b.inv[b.psi])selectSlot(b,b.psi)}sfx('flick');return}
 if(k==='e'&&[...sel].some(b=>b.type==='token'&&b.status==='free'&&(!aiOn||teamOf(b)===aiMe))){const on=![...sel].some(b=>b.direct);for(const b of sel)if(b.type==='token'){if(on)b.face0=b.ang;else if(b.face0!=null&&sel.size>1)turnTo(b,b.face0);b.direct=on;b.ord=null}sfx('flick');return}
 if(k==='escape'||k==='e'){sel.clear();openCrate=null;moveSel=null;charge=null;box=null;closeMenu();return}
 if(k.length===1&&'wasd'.includes(k)){keys.add(k);e.preventDefault();return}
 if(k==='r'){for(const b of sel){const h=b.type==='token'&&b.status!=='free'?null:slot(b);if(h&&CAP[h.k]&&h.ammo<CAP[h.k])reload(b)}return}
 if(k>='1'&&k<='4'){for(const b of sel)if(b.type==='token'&&b.status==='free'&&b.inv)selectSlot(b,+k-1);return}
 if(k==='g'){if(vKeyG())return;for(const b of sel)if(b.type==='token'&&b.held)dropHeld(b);return}
 // T forms up on release, facing as they mostly do; held with an arrow it forms a line facing that way
 if(k==='t'){if(!e.repeat)tHold={used:false};return}
 if(tHold&&FDIR[k]!==undefined){formUp(FDIR[k]);tHold.used=true;e.preventDefault();return}
 // H toggles the group following the cursor with their eyes; turning off leaves them facing where they last looked
 if(k==='h'){if(e.repeat)return;const ts=[...sel].filter(b=>b.type==='token'&&b.status==='free'&&!b.vseat),on=!ts.some(b=>b.hf);for(const b of ts)b.hf=on;if(ts.length)sfx('flick');return}
 // F swaps the hand of armed units; on unarmed ones a tap turns them about, or held with an arrow faces them that way
 if(k==='f'){if(e.repeat)return;fHold={turned:false};const arm=[...sel].filter(b=>b.type==='token'&&b.held);for(const b of arm){b.side=-(b.side||1);b.hc=null}if(arm.length)sfx('flick');return}
 if(fHold&&FDIR[k]!==undefined){const ts=unarmedSel();for(const b of ts)turnTo(b,FDIR[k]);fHold.turned=true;if(ts.length)sfx('flick');e.preventDefault();return}
 if(k==='delete'||k==='backspace'){for(const b of [...sel])remove(b);e.preventDefault()}});
window.addEventListener('keydown',e=>{if(e.key==='Alt'){LOBK=true;e.preventDefault()}});addEventListener('blur',()=>{LOBK=false});
addEventListener('keyup',e=>{if(e.key==='Alt')LOBK=false;if(e.key==='Shift')VBRK=false;if(e.key.toLowerCase()==='c')for(const b of bodies)if(b.pc){b.crouch=false;b.pc=false}if(e.key===' ')panKey=false;keys.delete(e.key.toLowerCase())});
window.addEventListener('blur',()=>{keys.clear();VBRK=false;panKey=false;for(const b of bodies)if(b.pc){b.crouch=false;b.pc=false}});

// menu
let menu=null;function closeMenu(){if(menu){menu.remove();menu=null}}
const NAMEP=["Aldo","Bram","Cass","Dell","Edric","Fenn","Gale","Hob","Ivor","Jory","Kell","Lorn","Marl","Ned","Osric","Pike","Quill","Reed","Sim","Tobin","Ulf","Vance","Wat","Yorick","Abel","Brock","Corr","Dunstan","Ewan","Flint","Garth","Hale","Jem","Kit","Lyle","Merrick","Nash","Orrin","Perrin","Rook","Silas","Tam","Wren","Hugh","Bastian","Colm","Davin","Rowan"];
function randName(){const used=new Set(bodies.map(b=>b.name));const f=NAMEP.filter(n=>!used.has(n));const L=f.length?f:NAMEP;return L[Math.random()*L.length|0]}
function dupUnit(b){const c=token(randName(),b.nat,b.unit,b.x+18,b.y,b.guard,b.held?b.held.k:null);c.ang=b.ang;c.look=b.look;c.tone=b.tone;c.auto=b.auto;if(b.held&&b.held.mode)c.held.mode=b.held.mode;c.inv=JSON.parse(JSON.stringify(b.inv||[]));c.si=b.si;c.held=c.si>=0?c.inv[c.si]:null;c.hc=null;if(b.status==='captured'){c.status='captured';c.held=null}if(solidHits(c,0,0)||bodies.some(o=>o!==c&&o.type==='token'&&Math.hypot(o.x-c.x,o.y-c.y)<17)){c.x=b.x;c.y=b.y;for(let r=18;r<60;r+=4){let ok=false;for(let k=0;k<12;k++){const a=k/12*6.283;c.x=b.x+Math.cos(a)*r;c.y=b.y+Math.sin(a)*r;if(!solidHits(c,0,0)&&!bodies.some(o=>o!==c&&o.type==='token'&&Math.hypot(o.x-c.x,o.y-c.y)<17)){ok=true;break}}if(ok)break}}return c}
const setStatus=(b,st)=>{if(st==='free')b.status='free';else if(st==='captured'){b.status='captured';b.held=null;b.inv=[null,null,null,null,null,null];b.si=-1}else{b.status='dead';if(b.held)dropHeld(b)}};
// several units selected: one menu for all of them
function groupMenu(g,e){closeMenu();const r=$('sm').getBoundingClientRect();menu=document.createElement('div');menu.className='menu';menu.style.left=(e.clientX-r.left+4)+'px';menu.style.top=(e.clientY-r.top+4)+'px';
 const it=(t,on,f)=>{const bt=document.createElement('button');bt.textContent=t;if(on)bt.classList.add('on');bt.onclick=()=>{f();closeMenu();lastHud=''};menu.appendChild(bt)};
 const h=document.createElement('div');h.className='mh';h.textContent=g.length+' units';menu.appendChild(h);
 {const tt=g.filter(b=>b.tether&&!b.tether.broken);if(tt.length)it('Untether',0,()=>{for(const b of tt)b.tether=null;sfx('flick')})}
 for(const[st,t]of[['free','Free'],['captured','Captured'],['dead','Dead']])it(t,g.every(b=>b.status===st),()=>{for(const b of g)setStatus(b,st)});
 it('Restore health',0,()=>{for(const b of g)restore(b)});it('Refill ammo',0,()=>{for(const b of g)rearm(b);sfx('reload')});
 it('Duplicate',0,()=>{const cs=g.map(dupUnit);sel.clear();for(const c of cs)sel.add(c)});
 it('Delete',0,()=>{for(const b of g)remove(b)});$('sm').appendChild(menu)}
function openMenu(b,e){if(b.type==='token'&&sel.has(b)&&[...sel].filter(o=>o.type==='token').length>1)return groupMenu([...sel].filter(o=>o.type==='token'),e);closeMenu();const r=$('sm').getBoundingClientRect();menu=document.createElement('div');menu.className='menu';menu.style.left=(e.clientX-r.left+4)+'px';menu.style.top=(e.clientY-r.top+4)+'px';
 const it=(t,on,f,keep)=>{const bt=document.createElement('button');bt.textContent=t;if(on)bt.classList.add('on');bt.onclick=()=>{f(bt);if(!keep)closeMenu()};menu.appendChild(bt);return bt};
 if(b.type==='token'){if(b.tether&&!b.tether.broken)it('Untether',0,()=>{b.tether=null;sfx('flick')});if(b.status==='captured')it('Free',0,()=>b.status='free');else if(b.status!=='dead')it('Capture',0,()=>{b.status='captured';b.held=null;b.inv=[null,null,null,null,null,null];b.si=-1});if(b.status!=='dead')it('Kill',0,()=>{b.status='dead';if(b.held)dropHeld(b)});it('Restore health',0,()=>restore(b));it('Refill ammo',0,()=>{rearm(b);sfx('reload')});it('Delete inventory',0,()=>{b.inv=[null,null,null,null,null,null];b.held=null;b.si=-1;b.hc=null;lastHud='';sfx('flick')});it('Duplicate',0,()=>{const c=dupUnit(b);sel.clear();sel.add(c)});
  it('Rename',0,bt=>{const i=document.createElement('input');i.value=b.name;bt.replaceWith(i);i.focus();i.select();i.onkeydown=ev=>{if(ev.key==='Enter'){b.name=i.value||b.name;b.lab.textContent=b.name;closeMenu()}}},true);
  if(b.held)it('Drop weapon',0,()=>dropHeld(b))}
 if(b.hidden&&b.inv){it('Delete inventory',0,()=>{b.inv=b.inv.map(()=>null);lastHud='';sfx('flick')});$('sm').appendChild(menu);return}
 if((b.kind==='grenade'||b.kind==='bomb')&&!b.fuse)it('Pull pin',0,()=>{b.fuse=150;sfx('pin')});
 if(b.type==='slab'&&!b.free&&!b.fallen){const lv=b.pair?[b,b.pair]:[b];if(hcl(b.mat).lock)it('Locked',b.locked,()=>{for(const q of lv)q.locked=!b.locked;sfx('lock')});const s=document.createElement('select');for(const n of ['',...Object.keys(NAT)]){const o=document.createElement('option');o.value=n;o.textContent=n?n+' keys':'Auto keys';if((b.keys||'')===n)o.selected=true;s.appendChild(o)}s.onchange=()=>{for(const q of lv)q.keys=s.value||undefined;closeMenu()};menu.appendChild(s)}
 if(b.type==='slab')it('Rotate',0,()=>{b.rot=(b.rot+1)%4;orient(b)});
 it('Delete',0,()=>remove(b));$('sm').appendChild(menu)}
document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target)&&e.target!==cv)closeMenu()});

// ui
const bar=$('bar');
const btn=(t,f)=>{const b=document.createElement('button');b.textContent=t;b.onclick=f;bar.appendChild(b);return b};


const TITLE={hall:'Goldbank · Aurum halls',bank:'Goldbank · Back room',vault:'Goldbank · The Aurum',count:'Goldbank · Counting house',range:'Astia · Proving yard',council:'Sanctis · Council chamber',road:'Portsbridge · Crossroads',alley:'Great Keys · Guild alley',stock:"Emperor's Dock · Stockyard"};
btn('Reset',()=>reset());{const sb=btn('Slow-mo (Z)',()=>{slowMo=!slowMo;sb.classList.toggle('on',slowMo)});window.toggleSlow=()=>sb.onclick();setTimeout(()=>bar.appendChild(sb),0)}{const ab=btn('AI',()=>{aiOn=!aiOn;aiMe=null;ab.classList.toggle('on',aiOn);if(!aiOn)for(const b of bodies){b.fogH=false;b.ai=null}aiSetup()})}{const ms=document.createElement('select');for(const[v,n]of[['bank','Goldbank back room'],['vault','Goldbank Aurum heist'],['hall','Goldbank Aurum halls'],['count','Goldbank counting house'],['range','Astia proving yard'],['council','Sanctis council chamber'],['road','Portsbridge road ambush'],['alley','Great Keys guild alley'],['stock',"Emperor's Dock stockyard"],['blast','Fluoria blast yard']]){const o=document.createElement('option');o.value=v;o.textContent=n;ms.appendChild(o)}ms.id='msel';ms.onchange=()=>goMap(ms.value);bar.appendChild(ms)}

function icon(px,scale){const c=document.createElement('canvas');c.width=28;c.height=20;const g=c.getContext('2d'),id=g.createImageData(28,20),u=new Uint32Array(id.data.buffer);
 let mx=0,my=0;for(const p of px){mx+=p[0];my+=p[1]}mx/=px.length;my/=px.length;
 for(const p of px){const X=Math.round(14+(p[0]-mx)*scale),Y=Math.round(10+(p[1]-my)*scale);if(X>=0&&Y>=0&&X<28&&Y<20)u[Y*28+X]=p[2]}g.putImageData(id,0,0);return c}
function panelItem(host,name,ic,make){const d=document.createElement('div');d.appendChild(ic);d.appendChild(document.createTextNode(name));
 d.addEventListener('pointerdown',e=>{au();e.preventDefault();const[x,y]=toBoard(e);charge=null;const b=make(x,y);startDrag(b,x,y,true)});host.appendChild(d)}
for(const k of ['rod','pgun','sspear','musket','blunder','pistol','spear','bomb','grenade']){const w=WP[k];panelItem($('wp'),w.n,icon(shape(k,0),k==='spear'?.6:1),(x,y)=>weapon(k,x,y,0))}
panelItem($('cov'),'Wood slab',icon(slabPix(2),1),(x,y)=>barricade(2,x,y));for(const mat of['pine','teak'])panelItem($('cov'),memb('Wood',mat).n+' slab',icon(slabPix(2).map(q=>{const w=woodT(q[8]+93,q[9],memb('Wood',mat).c,13);return[q[0],q[1],rgb(cl(w[0]),cl(w[1]),cl(w[2]))]}),1),(x,y)=>barricade(2,x,y,16,8,mat));
for(const mat in ELEM.Metal.mats){const n=memb('Metal',mat).n,tint=px=>mat==='steel'?px:px.map(q=>{q=q.slice();q[2]=toneC(mat,q[2]);return q});panelItem($('cov'),n+' slab',icon(tint(slabPix(3)),1),(x,y)=>barricade(3,x,y,16,8,mat));panelItem($('cov'),'Heavy '+n.toLowerCase()+' slab',icon(tint(slabPix(3,32,8)),.8),(x,y)=>barricade(3,x,y,32,8,mat))}

// people
const fu=$('fu'),fnat=$('fnat'),fw=$('fw'),tp=$('tp');
// marker roster: civilians first, then each class under its own side's name
const CIVS=['Peasant','Merchant','Priest','Noble'];
const CLSU={Civilian:'civ',Base:'home',Riflemen:'rifle',Heavy:'guard',Shock:'shock',Commando:'cmd',Rogue:'home','Tier 1':'home','Tier 2':'rifle','Tier 3':'guard',Guard:'home'};
const ROSTER={};for(const[f,L]of Object.entries(WARD.FACTIONS))ROSTER[f]=L.map(n=>[n,CLSU[WARD.CLS[n]]||'civ',WARD.nm(n)!==n?WARD.nm(n):undefined]);
// neutrals reuse faction civilian looks under plain trade names (worn in muted colours)
ROSTER.Neutrals=[...CIVS.map(n=>[n,'civ']),['Townsman','civ','Commoner'],['Fisherman','civ','Sailor'],['Labourer','civ','Dockhand'],['Sea captain','civ','Harbourmaster'],['Trader','civ','Merchant'],['Bookkeeper','civ','Company Clerk'],['Scribe','civ','Clerk'],['Steward','civ','Head Clerk'],['Moneylender','civ','Banker'],['Magnate','civ','Bank Lord']].map(([n,u,l])=>[l||n,u,n]);
{const o=document.createElement('option');o.value='';o.textContent='Unarmed';fw.appendChild(o)}for(const[gn,ks]of[['Spears',['spear','sspear']],['Firearms',['pistol','blunder','musket']],['Heavy arms',['pgun','rod']]]){const g=document.createElement('optgroup');g.label=gn;for(const k of ks){const o=document.createElement('option');o.value=k;o.textContent=WP[k].n;g.appendChild(o)}fw.appendChild(g)}
for(const n of ['Neutrals',...Object.keys(ROSTER).filter(n=>n!=='Neutrals')]){const o=document.createElement('option');o.textContent=n;fnat.appendChild(o)}
const fnatv=()=>fnat.value==='Neutrals'?null:fnat.value,fsel0=()=>(ROSTER[fnat.value]||[])[+fu.value]||['Peasant','civ'];
const AFA=document.getElementById('fa'),AFM=document.getElementById('fm'),AFH=document.getElementById('fh'),AFC=document.getElementById('fc');
// Astrian types pick their baked variant from armour, metal and head
const AST={'Astrian Officer':['Astrian Officer','n','steel'],'Astrian Conscript':['Astrian Line','n','iron'],'Astrian Line':['Astrian Line','t','iron'],'Astrian Guard':['Astrian Guard','f','steel']},astKey=l=>{const A=AST[l];if(!A)return l;const a=AFA.value,m=a==='n'?'iron':AFM.value;return`${A[0]}|${a}|${m}|${AFH.value}`};
const fsel=()=>{const e=fsel0();return[astKey(e[0]),...e.slice(1)]};
function astShow(){const A=AST[fsel0()[0]];for(const d of document.querySelectorAll('#sm .fa'))d.style.display=A?'':'none';AFM.disabled=AFA.value==='n'}
function astDefaults(){const A=AST[fsel0()[0]];if(!A)return;AFA.value=A[1];AFM.value=A[2];AFH.value='h';astShow()}
function fillTypes(){fu.innerHTML='';const R=ROSTER[fnat.value]||[];for(const[gn,civ]of[['Military',false],['Civilians',true]]){const ix=R.map((e,i)=>i).filter(i=>(R[i][1]==='civ')===civ);if(!ix.length)continue;const g=document.createElement('optgroup');g.label=gn;for(const i of ix){const o=document.createElement('option');o.value=i;o.textContent=R[i][2]||R[i][0];g.appendChild(o)}fu.appendChild(g)}fu.value=fu.options[0]?fu.options[0].value:0;astDefaults();setArms()}
function setArms(){const[l,u]=fsel(),nat=fnatv(),lk=lookOf({look:l,nat,unit:u});let k=LOOKKIT[l]!==undefined?LOOKKIT[l]:KITL[lk]?KITL[lk][0]:KIT[nat]&&KIT[nat][u];if(typeof k==='function')k=k({})||'spear';fw.value=k!==undefined?k||'':UNITS[u].w||'';fw.dataset.def=fw.value;preview()}
function preview(){astShow();const[l,un]=fsel(),g=tp.getContext('2d'),id=g.createImageData(17,17),u=new Uint32Array(id.data.buffer),t={type:'token',ang:Math.PI/2,look:l,unit:un,nat:fnatv(),guard:false,tone:pTone,cond:+AFC.value},px=tokPixels(t),set=new Set(px.map(p=>K(p[0],p[1])));
 for(const p of px){let c=pcol(t,p);if(c===0)continue;if(!sprG(lookOf(t))&&(!set.has(K(p[0]+1,p[1]))||!set.has(K(p[0]-1,p[1]))||!set.has(K(p[0],p[1]+1))||!set.has(K(p[0],p[1]-1))))c=mul(c,.36);u[(p[1]+8)*17+p[0]+8]=c}g.putImageData(id,0,0)}
let pTone=Math.random()*NHUE.length|0;function rollTone(){let n;do n=Math.random()*NHUE.length|0;while(n===pTone);pTone=n;preview()}
{const dc=$('dice'),g=dc.getContext('2d');g.fillStyle='#d8d4c8';g.fillRect(0,0,9,9);g.fillStyle='#262626';for(const[x,y]of[[1,1],[6,1],[3.5,3.5],[1,6],[6,6]]){g.fillRect(Math.round(x),Math.round(y),2,2)}dc.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();rollTone()})}
const diceVis=()=>{$('dice').style.display=fnatv()?'none':''};

function syncMarker(b){const f=SIDE[b.nat]||b.nat||'Neutrals';if(!ROSTER[f])return;fnat.value=f;fillTypes();diceVis();const R=ROSTER[f];let l=lookOf(b)||b.look;AFC.value=b.cond||4;
 {const p=String(l).split('|');if(p.length===4){const base=p[0]==='Astrian Line'?(p[1]==='n'?'Astrian Conscript':'Astrian Line'):p[0],i=R.findIndex(e=>e[0]===base);if(i>=0){fu.value=i;astDefaults();AFA.value=p[1];AFM.value=p[2];AFH.value=p[3];setArms();l=null}}}
 if(l){let i=R.findIndex(e=>e[0]===l&&e[1]===b.unit);if(i<0)i=R.findIndex(e=>e[0]===l);if(i<0)i=R.findIndex(e=>e[1]===b.unit);if(i>=0){fu.value=i;setArms()}}
 const w=b.inv&&b.inv[0]&&b.inv[0].k;fw.value=w&&[...fw.options].some(o=>o.value===w)?w:'';$('fn').value=b.name;if(!b.nat)pTone=(b.tone??((b.id||0)*5+3))%NHUE.length;preview()}
fu.onchange=()=>{astDefaults();setArms()};fw.onchange=preview;for(const k of['fa','fm','fh','fc'])$(k).onchange=preview;fillTypes();fnat.onchange=()=>{fillTypes();diceVis()};diceVis();
$('tpr').addEventListener('pointerdown',e=>{au();e.preventDefault();const[x,y]=toBoard(e);charge=null;const[l,un]=fsel(),b=token($('fn').value||'Unnamed',fnatv(),un,x,y,false,fw.value===fw.dataset.def&&fw.value?undefined:fw.value||null,l);b.tone=pTone;b.cond=+AFC.value;rollTone();startDrag(b,x,y,true)});
for(const sc of document.querySelectorAll('#sm .sec')){const k='bsx:'+sc.dataset.k;try{if(localStorage.getItem(k)==='1')sc.classList.add('closed')}catch(e){}sc.querySelector('.sh').onclick=()=>{sc.classList.toggle('closed');try{localStorage.setItem(k,sc.classList.contains('closed')?'1':'0')}catch(e){}}}

function dbl(m,x1,y1,x2,y2,r1,r2,lk,len,th){const a=slab(m,x1,y1,r1,len,th),b=slab(m,x2,y2,r2,len,th);a.pair=b;b.pair=a;a.locked=b.locked=lk;return[a,b]}
function goldify(d){d.gold=true;for(const p of d.px)p[2]=toneC('gold',p[2])}
const MAPSZ={hall:[49,65],council:[24,16],road:[64,52],alley:[22,10],stock:[26,16],count:[44,26],vault:[30,47],range:[40,40],air:[34,20]};
// after setup: wood doors never stay locked, and the side that owns the map has a guard carrying each locked door's key
function keyUp(){let own=null;try{own=MAPOWN()}catch(e){}const done=new Set();
 for(const d of bodies){if(d.type!=='slab'||!d.locked||d.free||d.keyIn)continue;if(!hcl(d.mat).lock){d.locked=false;continue}const k=doorKey(d);if(!k||done.has(k)&&!d.pair)continue;done.add(k);
  const ts=bodies.filter(t=>t.type==='token'&&t.status==='free'&&t.inv&&(!own||teamOf(t)===own));if(!ts.length||ts.some(t=>carriesKey(t,d)))continue;
  const rank=t=>(t.unit==='guard'?0:t.unit!=='civ'?1:2)*1e5+Math.hypot(t.x-d.x,t.y-d.y);ts.sort((a,b)=>rank(a)-rank(b));addItem(ts[0],{k,n:1})}}
function reset(){ds0Need=true;EDG.clear();{const sz=MAPSZ[curMap]||[18,14];if(sz[0]!==CW||sz[1]!==CH){alloc(sz[0],sz[1]);LR=new Float32Array(NB);LG=new Float32Array(NB);LB=new Float32Array(NB);LT=new Float32Array(NB);camInit=true}setTimeout(fit,0)}for(const b of bodies)if(b.lab)b.lab.remove();bodies=[];VEH=[];parts=[];drag=null;charge=null;box=null;moveSel=null;sel.clear();build();HZ.fill(0);hzOn=false;if(NUM[curMap]){NUM[curMap]();for(const t of bodies)if(t.type==='token')t.hc=null;return}if(curMap==='air'){unitsAir();for(const t of bodies)if(t.type==='token')t.hc=null;return}if(curMap==='range'){unitsRange();for(const t of bodies)if(t.type==='token')t.hc=null;return}if(curMap==='count'){unitsCount();for(const t of bodies)if(t.type==='token')t.hc=null;return}if(curMap==='vault'){unitsVault();for(const t of bodies)if(t.type==='token')t.hc=null;return}
 token('Aldric','Goldbank','guard',36,40,true);token('Bryn','Goldbank','rifle',62,40);token('Pell','Goldbank','rifle',88,40);
 token('Orla','Goldbank','home',28,82);token('Rook','Goldbank','cmd',28,150).leader=true;token('Tam','Goldbank','shock',150,150);token('Hask','Goldbank','shock',150,186);
 const c=token('Corin',null,'civ',90,180);c.status='captured';c.held=null;
 const v=token('Varn','Imperium','shock',226,56);v.ang=Math.PI;const k=token('Kade','Imperium','shock',262,72);k.ang=Math.PI;
 const m=token('Mira','Imperium','cmd',228,150);m.ang=Math.PI;const i=token('Ivo','Imperium','civ',206,196,false,'pistol');i.look='Officer';i.leader=true;i.ang=Math.PI;const se=token('Sela','Imperium','home',258,196);se.ang=Math.PI;
 const d=token('Dunn','Imperium','rifle',262,136,false,null);d.status='dead';weapon('musket',248,124,2.4);
 slab(2,180,32,1);dbl(3,180,96,187,127,1,3,false);dbl(3,224,171,255,164,0,2,true);
 weapon('grenade',120,196,0);weapon('bomb',60,200,0);weapon('sspear',236,104,.3);
 for(const t of bodies)if(t.type==='token')t.hc=null}
{const r0=reset;reset=function(){r0();keyUp()}}
const NAMED={count:{'Lord Vane':'Bank Lord','Archivist Lell':'Head Clerk','Master Orsk':'Banker',Corvo:'Reaper'},vault:{'Master Corwin':'Banker','Manager Vance':'Bank Lord',Dorran:'Merchant',Lyse:'Noble',Sora:'Noble',Merrit:'Merchant'},bank:{}};
{const r0=reset;reset=function(){r0();setTimeout(aiSetup,0);for(const t of bodies)if(t.type==='token'&&NAMED[curMap]&&NAMED[curMap][t.name])t.look=NAMED[curMap][t.name];snapDoors();sills();arrivals();exitLabels();alarm=curMap==='range';if(!alarm)for(const t of bodies)if(t.type==='token'&&t.held){t.psi=t.si;t.si=-1;t.held=null;t.hc=null}}}
reset();loop();
