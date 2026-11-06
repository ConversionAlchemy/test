// Pit Ball: brutal three-a-side futsal, HaxBall style. Hold Shift and the ball is kicked straight out from your centre when you touch it;
// right-click dashes (tackle). Goals are one-tile boxes set into each end wall. First to 5; the winners are handed pistols and the losers hunted.
MAPSZ.ball=[20,28];TITLE.ball='Pit Ball';ENVSET.ball='in';
const BG0=8,BG1=12,BR=4,BCR=13,BWIN=5,BTEAM=['Havenport','Reapers'],BCOL=[rgb(214,58,48),rgb(60,120,226)],BNAME=['Red','Blue'];
var BALL=null,BSC=[0,0],BWAIT=0,BOVER=null,BARM=false,BKO=0;// var: the board draws before this file runs
const bGoal=(cx,cy)=>cx>=BG0&&cx<BG1&&(cy===1||cy===26);
NBM.ball=()=>{const h=(x,y)=>((x*73856093^y*19349663)>>>0);paintAll((cx,cy)=>(cx===0||cy<=1||cx===19||cy>=26)&&!bGoal(cx,cy)?'stone.grey.rubble.w~'+(1+h(cx,cy)%3):h(cx,cy)%3?'earth.dirt.worn':'earth.dirt.plain')};
NUM.ball=()=>{FIGHT.ball=[BTEAM];BSC=[0,0];BOVER=null;
 for(const cy of[1,26])for(let X=BG0*T;X<BG1*T;X++)for(let Y=cy*T;Y<cy*T+T;Y++)floor[Y*W+X]=(X+Y)%3?rgb(26,24,22):rgb(64,60,54);
 const NA=[['Edda','Tam','Corin'],['Brannoc','Mott','Sully']];for(let t=0;t<2;t++)for(let i=0;i<3;i++){const b=token(NA[t][i],BTEAM[t],'civ',0,0,false,null);b.inv=[null,null,null,null,null,null];b.held=null;b.si=-1;b.auto=false;b.pit=t;b.fb={}}
 ballKickoff();aiMe=BTEAM[0];const me=bodies.find(o=>o.name==='Edda');sel.clear();sel.add(me);me.direct=true};
// kickoff goes to the side that conceded; the other side can't touch the ball till it moves
function ballKickoff(t){BKO=t||0;const sp=[[9.5,4],[4.5,10],[9.5,12]];BALL={x:W/2,y:H/2,vx:0,vy:0};BWAIT=0;
 for(const b of bodies)if(b.type==='token'&&b.pit!=null){const i=bodies.filter(o=>o.pit===b.pit).indexOf(b),[cx,cy]=sp[i];b.x=cx*T+8;b.y=(b.pit?CH-1-cy:cy)*T+8;b.ang=b.pit?-Math.PI/2:Math.PI/2;b.stunT=0;b.crouch=false;b.dash=null;b.px0=null}}
const ballGoalY=t=>t?T*1.5:H-T*1.5,ballOwnY=t=>t?H-T*2:T*2;
function ballKick(b,dx,dy,v){const l=Math.hypot(dx,dy)||1;BALL.vx=dx/l*v;BALL.vy=dy/l*v;b.kickT=tick+12;sfx(v>7?'thunk':'pthud')}
// cut corners, as in HaxBall: a 45° wall across each pitch corner so the ball can't be pinned there; also keeps a shoved ball out of the walls
const BK=14,bCorners=()=>[[T,2*T,1,1],[W-T,2*T,-1,1],[T,H-2*T,1,-1],[W-T,H-2*T,-1,-1]];
function ballClamp(B){const mouth=B.x>BG0*T+BR&&B.x<BG1*T-BR;B.x=Math.max(T+BR,Math.min(W-T-BR,B.x));B.y=Math.max((mouth?T:2*T)+BR,Math.min(H-(mouth?T:2*T)-BR,B.y));
 for(const[cx,cy,sx,sy]of bCorners()){const s=((B.x-cx)*sx+(B.y-cy)*sy-BK)/Math.SQRT2;if(s>=BR)continue;const nx=sx/Math.SQRT2,ny=sy/Math.SQRT2;B.x+=nx*(BR-s);B.y+=ny*(BR-s);const vn=B.vx*nx+B.vy*ny;if(vn<0){B.vx-=1.45*vn*nx;B.vy-=1.45*vn*ny}}}
function ballStep(){const B=BALL;if(!B||BOVER!=null)return;
 for(let k=0;k<3;k++){const nx=B.x+B.vx/3,ny=B.y+B.vy/3,hit=(x,y)=>{const X=Math.round(x),Y=Math.round(y);return X<0||Y<0||X>=W||Y>=H||sol[Y*W+X]};
  if(hit(nx+Math.sign(B.vx)*BR,B.y)||hit(nx+Math.sign(B.vx)*BR*.7,B.y+BR*.7)||hit(nx+Math.sign(B.vx)*BR*.7,B.y-BR*.7)){B.vx*=-.45;if(Math.abs(B.vx)>1)sfx('pthud')}else B.x=nx;
  if(hit(B.x,ny+Math.sign(B.vy)*BR)||hit(B.x+BR*.7,ny+Math.sign(B.vy)*BR*.7)||hit(B.x-BR*.7,ny+Math.sign(B.vy)*BR*.7)){B.vy*=-.45;if(Math.abs(B.vy)>1)sfx('pthud')}else B.y=ny}
 if(BKO!=null&&!BWAIT&&Math.hypot(B.vx,B.vy)>.5)BKO=null;ballClamp(B);const fr=BWAIT?.88:.982;B.vx*=fr;B.vy*=fr;if(Math.hypot(B.vx,B.vy)<.03)B.vx=B.vy=0;
 // a scored ball sits in the net: nobody touches it till kickoff
 if(BWAIT){if(--BWAIT===0)ballKickoff(BKO);return}
 const tch=[];for(const b of bodies){if(b.type!=='token'||b.pit==null||b.status==='dead'||BKO!=null&&b.pit!==BKO)continue;const pv=b.px0||[b.x,b.y],tvx=b.x-pv[0],tvy=b.y-pv[1];b.px0=[b.x,b.y];
  const dx=B.x-b.x,dy=B.y-b.y,d=Math.hypot(dx,dy);if(d===0)continue;const nx=dx/d,ny=dy/d;
  if(b.direct&&BARM&&d<BCR+3&&!(b.kickT>tick)&&!(b.stunT>tick)){ballKick(b,nx,ny,7.5);continue}
  if(d>=BCR)continue;tch.push([nx,ny]);B.x=b.x+nx*BCR;B.y=b.y+ny*BCR;ballClamp(B);
  if(b.dash&&!(b.kickT>tick)){ballKick(b,nx,ny,8.5);continue}
  // walking into it nudges it ahead
  const vn=B.vx*nx+B.vy*ny,tn=tvx*nx+tvy*ny;if(vn<tn*1.2+.3){B.vx+=nx*(tn*1.2+.3-vn);B.vy+=ny*(tn*1.2+.3-vn)}}
 // squeezed between two players, or dead for a while (pinned in a scrum): it squirts out toward open pitch
 const cx=W/2-B.x,cy=H/2-B.y,cl=Math.hypot(cx,cy)||1;
 if(tch.length>1&&tch[0][0]*tch[1][0]+tch[0][1]*tch[1][1]<-.3){let px=-tch[0][1],py=tch[0][0];if(px*cx+py*cy<0){px=-px;py=-py}B.vx=px*3;B.vy=py*3}
 if(B.sx==null||Math.hypot(B.x-B.sx,B.y-B.sy)>24){B.sx=B.x;B.sy=B.y;B.st=tick}else if(tick-B.st>150){B.vx=cx/cl*4.5;B.vy=cy/cl*4.5;B.st=tick}
 // tackles: a dashing player who runs into an opponent knocks him down
 for(const b of bodies){if(!b.dash||b.pit==null)continue;for(const o of bodies){if(o.pit==null||o.pit===b.pit||o.stunT>tick||Math.hypot(o.x-b.x,o.y-b.y)>16)continue;o.stunT=tick+50;o.crouch=true;moveToward(o,o.x+b.dash.x*6,o.y+b.dash.y*6);sfx('thunk');say(o,'Oof',true)}}
 for(const b of bodies)if(b.pit!=null&&b.crouch&&!(b.stunT>tick))b.crouch=false;
 if(B.x>BG0*T&&B.x<BG1*T&&(B.y<2*T-BR||B.y>H-2*T+BR)){const t=B.y<2*T?1:0;BSC[t]++;BWAIT=110;BKO=1-t;sfx('ok');if(CRW)for(const s of CRW.seats)s.jump=12;
  const sc=bodies.filter(o=>o.pit===t).sort((a,b)=>Math.hypot(a.x-B.x,a.y-B.y)-Math.hypot(b.x-B.x,b.y-B.y))[0];
  if(BSC[t]>=BWIN){BWAIT=0;ballOver(t);if(sc)say(sc,'Kill them',true)}else if(sc)say(sc,'Goal!',true)}}
// full time: the winners get loaded pistols and every fighter goes to the arena AI, which hunts and shoots rather than takes prisoners
function ballOver(t){BOVER=t;BARM=false;ballHud();
 for(const b of bodies){if(b.pit==null||b.status!=='free')continue;b.stunT=0;b.crouch=false;if(!b.direct)b.auto=true;
  if(b.pit===t){b.inv[0]={k:'pistol',ammo:CAP.pistol,res:fullRes({unit:'rifle'},'pistol')};b.si=0;b.held=b.inv[0];b.hc=null}}
 if(CRW)for(const s of CRW.seats)s.jump=14;aiSetup()}
// AI: nearest to the ball gets behind it on the line to goal, turns, and kicks only once square to it; one keeps, one marks or supports
function ballAI(){if(!aiOn||BWAIT||BOVER!=null)return;const B=BALL;
 for(let t=0;t<2;t++){const us=bodies.filter(o=>o.pit===t&&o.status==='free'),own=ballOwnY(t),opp=ballGoalY(t),inOwn=Math.abs(B.y-own)<H/2;
  const ch=us.slice().sort((a,b)=>Math.hypot(a.x-B.x,a.y-B.y)-Math.hypot(b.x-B.x,b.y-B.y))[0],rest=us.filter(o=>o!==ch).sort((a,b)=>Math.abs(a.y-own)-Math.abs(b.y-own));
  for(const b of us){if(b.direct||b.stunT>tick||BKO!=null&&t!==BKO){if(!b.direct)turnTo(b,Math.atan2(B.y-b.y,B.x-b.x));continue}let tx,ty,look=Math.atan2(B.y-b.y,B.x-b.x);
   if(b===ch){if(b.aim==null||Math.random()<.01)b.aim=(Math.random()-.5)*40;const gx=W/2+b.aim-B.x,gy=opp-B.y,gl=Math.hypot(gx,gy)||1,ga=Math.atan2(gy,gx);
    // the goalward kick whose run-up spot is on the pitch: off a wall that means a bank shot
    let ux=gx/gl,uy=gy/gl;for(const o of[0,.3,-.3,.6,-.6,.9,-.9,1.2,-1.2,1.5,-1.5,1.8,-1.8,2.1,-2.1]){const cx=Math.cos(ga+o),cy=Math.sin(ga+o),px=B.x-cx*(BCR+2),py=B.y-cy*(BCR+2);if(px>=T+9&&px<=W-T-9&&py>=2*T+9&&py<=H-2*T-9){ux=cx;uy=cy;break}}
    const dx=B.x-b.x,dy=B.y-b.y,d=Math.hypot(dx,dy)||1,al=(dx*ux+dy*uy)/d;
    // lined up: walk in; behind but off line: stand off and line up; wrong side: swing round it
    if(al>.82){tx=B.x;ty=B.y}else if(al>0){tx=B.x-ux*(BCR+6);ty=B.y-uy*(BCR+6)}
    else{const sd=Math.sign(dx*uy-dy*ux)||1;tx=B.x-ux*8+uy*sd*(BCR+10);ty=B.y-uy*8-ux*sd*(BCR+10)}
    let fd=look-b.ang;fd=Math.atan2(Math.sin(fd),Math.cos(fd));
    if(d<BCR+3&&al>.82&&Math.abs(fd)<.5&&!(b.kickT>tick))ballKick(b,dx,dy,Math.min(7.5,4.5+gl/120));
    else if(d>40&&d<90&&Math.hypot(B.vx,B.vy)>1.5&&Math.random()<.03)dashUnit(b,dx,dy);
    const foe=bodies.find(o=>o.pit===1-t&&o.status==='free'&&Math.hypot(o.x-B.x,o.y-B.y)<16);if(foe&&Math.hypot(foe.x-b.x,foe.y-b.y)<34&&Math.random()<.05)dashUnit(b,foe.x-b.x,foe.y-b.y)}
   else if(b===rest[0]){if(inOwn){tx=Math.max(BG0*T+6,Math.min(BG1*T-6,B.x));ty=own+(t?-10:10)}else{tx=W/2+(B.x-W/2)*.4;ty=own+(t?-1:1)*H*.28}}
   else{const mk=bodies.filter(o=>o.pit===1-t&&o.status==='free'&&o!==ch).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0];
    if(inOwn&&mk){tx=mk.x+(W/2-mk.x)*.2;ty=mk.y+(own-mk.y)*.25}else{tx=W-B.x;ty=B.y+(opp-B.y)*.45}}
   tx=Math.max(T+8,Math.min(W-T-8,tx));ty=Math.max(2*T+8,Math.min(H-2*T-8,ty));if(Math.hypot(tx-b.x,ty-b.y)>3)aiStep(b,tx,ty,b.fb);turnTo(b,look)}}}
function ballDraw(){const B=BALL;if(!B)return;const put=(X,Y,c)=>{if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=c};
 // team rings; the outer one goes white while kick is held (or just used)
 for(const b of bodies){if(b.pit==null||b.status==='dead')continue;const c=b.stunT>tick?mul(BCOL[b.pit],.5):BCOL[b.pit],k=b.direct&&BARM||b.kickT>tick;
  for(let i=0;i<96;i++){const a=i/96*6.283;put(Math.round(b.x+Math.cos(a)*10.5),Math.round(b.y+Math.sin(a)*10.5),c);put(Math.round(b.x+Math.cos(a)*11.5),Math.round(b.y+Math.sin(a)*11.5),k?rgb(245,242,232):c)}}
 for(const[cx,cy,sx,sy]of bCorners())for(let v=0;v<BK;v++)for(let u=0;u<BK-v;u++){const X=cx+sx*u-(sx<0?1:0),Y=cy+sy*v-(sy<0?1:0),Y0=cy-sy*(1+(u+v)%6)-(sy<0?1:0);put(X,Y,u+v===BK-1?mul(out[Y0*W+X]||0,.7):out[Y0*W+X]||0)}
 const bx=Math.round(B.x),by=Math.round(B.y);for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++){if(Math.hypot(x,y)<=4.1){const j=(by+y+1)*W+bx+x+1;put(bx+x+1,by+y+1,mul(out[j]||0,.6))}}
 for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++){const d=Math.hypot(x,y);if(d>4.1)continue;put(bx+x,by+y,x+y<-3?rgb(196,140,86):d>3.2?rgb(104,62,30):(x+y)&1?rgb(150,96,52):rgb(138,86,46))}}
// Shift kicks and right-click dashes while the match is on; after full time both go back to normal
const ballMe=()=>[...sel].find(o=>o.direct&&o.pit!=null&&o.status==='free'&&!(o.stunT>tick));
const ballLive=()=>curMap==='ball'&&BOVER==null&&!EM;
window.addEventListener('keydown',e=>{if(e.key!=='Shift'||!ballLive())return;BARM=true;e.stopImmediatePropagation()},true);
window.addEventListener('keyup',e=>{if(e.key==='Shift')BARM=false},true);
window.addEventListener('blur',()=>BARM=false);
window.addEventListener('pointerdown',e=>{if(e.button!==2||!ballLive())return;const me=ballMe();if(!me)return;e.stopImmediatePropagation();dashUnit(me,mouse.x-me.x,mouse.y-me.y)},true);
const SCB=document.createElement('div');SCB.style.cssText="position:absolute;top:10px;left:50%;transform:translateX(-50%);font:44px VT323,monospace;letter-spacing:3px;color:#e9e4d8;text-shadow:0 2px 0 #000;pointer-events:none;z-index:5;display:none;white-space:nowrap";
{const st=$('stage');st.parentElement.appendChild(SCB)}
function ballHud(){const on=curMap==='ball';SCB.style.display=on?'':'none';if(!on)return;const s=`<span style="color:#e2564a">${BNAME[0]} ${BSC[0]}</span> &ndash; <span style="color:#5d8ff0">${BSC[1]} ${BNAME[1]}</span>`;
 SCB.innerHTML=BOVER==null?s:s+`<div style="font-size:28px;text-align:center;color:${BOVER?'#5d8ff0':'#e2564a'}">${BNAME[BOVER]} win</div>`}
{const u0=update;update=function(){u0();if(curMap!=='ball')return;if(aiOn)ballStep();ballAI();if(tick%6===0)ballHud()}}
{const r0=reset;reset=function(){r0();ballHud()}}
