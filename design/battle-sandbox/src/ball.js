// Pit Ball: brutal three-a-side futsal. Pitch runs top to bottom with a goal pocket cut 3 px into each end wall;
// a ball that rolls into a pocket scores. Kick with a charged click near the ball, dash to tackle or to blast it, no weapons.
MAPSZ.ball=[20,26];TITLE.ball='Pit Ball';ENVSET.ball='in';
const BG0=8,BG1=12,BR=2.5,BKMAX=700,BTEAM=['Havenport','Reapers'],BCOL=[rgb(214,58,48),rgb(60,120,226)],BNAME=['Red','Blue'];
var BALL=null,BSC=[0,0],BWAIT=0,BKICK=null;// var: the board draws before this file runs
NBM.ball=()=>{const h=(x,y)=>((x*73856093^y*19349663)>>>0);paintAll((cx,cy)=>cx===0||cy===0||cx===19||cy===25?'stone.grey.rubble.w~'+(1+h(cx,cy)%3):h(cx,cy)%3?'earth.dirt.worn':'earth.dirt.plain')};
NUM.ball=()=>{FIGHT.ball=[BTEAM];BSC=[0,0];
 // goal pockets: the last 3 px of the end walls across the mouth are hollowed out and netted
 for(const[cy,y0]of[[0,T-3],[25,0]])for(let X=BG0*T;X<BG1*T;X++)for(let Y=cy*T+y0;Y<cy*T+y0+3;Y++){const j=Y*W+X;sol[j]=0;shp[j]=0;floor[j]=(X+Y)%3?rgb(26,24,22):rgb(64,60,54)}
 solDirty=true;NAVD=true;
 const NA=[['Edda','Tam','Corin'],['Brannoc','Mott','Sully']];for(let t=0;t<2;t++)for(let i=0;i<3;i++){const b=token(NA[t][i],BTEAM[t],'civ',0,0,false,null);b.inv=[null,null,null,null,null,null];b.held=null;b.si=-1;b.auto=false;b.pit=t;b.fb={}}
 ballKickoff(0);aiMe=BTEAM[0];const me=bodies.find(o=>o.name==='Edda');sel.clear();sel.add(me);me.direct=true};
// kickoff: red up top, blue below, ball on the centre spot
function ballKickoff(){const sp=[[5,8],[14,8],[9.5,11]];BALL={x:W/2,y:H/2,vx:0,vy:0};BWAIT=0;
 for(const b of bodies)if(b.type==='token'&&b.pit!=null){const i=bodies.filter(o=>o.pit===b.pit).indexOf(b),[cx,cy]=sp[i];b.x=cx*T+8;b.y=(b.pit?CH-1-cy:cy)*T+8;b.ang=b.pit?-Math.PI/2:Math.PI/2;b.stunT=0;b.crouch=false;b.dash=null;b.px0=null}}
const ballGoalY=t=>t?T*1.5:H-T*1.5;// where team t attacks
function ballKick(b,dx,dy,p){const l=Math.hypot(dx,dy)||1,v=2.5+7.5*p;BALL.vx=dx/l*v;BALL.vy=dy/l*v;b.kickT=tick+14;sfx(p>.6?'thunk':'pthud')}
function ballStep(){const B=BALL;if(!B)return;
 for(let k=0;k<3;k++){const nx=B.x+B.vx/3,ny=B.y+B.vy/3,hit=(x,y)=>{const X=Math.round(x),Y=Math.round(y);return X<0||Y<0||X>=W||Y>=H||sol[Y*W+X]};
  if(hit(nx+Math.sign(B.vx)*BR,B.y)){B.vx*=-.72;if(Math.abs(B.vx)>1)sfx('pthud')}else B.x=nx;
  if(hit(B.x,ny+Math.sign(B.vy)*BR)){B.vy*=-.72;if(Math.abs(B.vy)>1)sfx('pthud')}else B.y=ny}
 B.vx*=.982;B.vy*=.982;if(Math.hypot(B.vx,B.vy)<.03)B.vx=B.vy=0;
 for(const b of bodies){if(b.type!=='token'||b.pit==null||b.status==='dead')continue;const pv=b.px0||[b.x,b.y],tvx=b.x-pv[0],tvy=b.y-pv[1];b.px0=[b.x,b.y];
  const dx=B.x-b.x,dy=B.y-b.y,d=Math.hypot(dx,dy);if(d>=11||d===0)continue;const nx=dx/d,ny=dy/d;B.x=b.x+nx*11;B.y=b.y+ny*11;
  if(b.dash&&!(b.kickT>tick)){ballKick(b,b.dash.x+nx*.3,b.dash.y+ny*.3,1);continue}
  // walking into it dribbles it ahead
  const vn=B.vx*nx+B.vy*ny,tn=tvx*nx+tvy*ny;if(vn<tn*1.3+.5){B.vx+=nx*(tn*1.3+.5-vn);B.vy+=ny*(tn*1.3+.5-vn)}}
 // tackles: a dashing player who runs into an opponent knocks him down
 for(const b of bodies){if(!b.dash||b.pit==null)continue;for(const o of bodies){if(o.pit==null||o.pit===b.pit||o.stunT>tick||Math.hypot(o.x-b.x,o.y-b.y)>16)continue;o.stunT=tick+50;o.crouch=true;moveToward(o,o.x+b.dash.x*6,o.y+b.dash.y*6);sfx('thunk');say(o,'Oof',true)}}
 for(const b of bodies)if(b.pit!=null&&b.crouch&&!(b.stunT>tick))b.crouch=false;
 if(BWAIT){if(--BWAIT===0)ballKickoff();return}
 if(B.x>BG0*T&&B.x<BG1*T&&(B.y<T||B.y>H-T)){const t=B.y<T?1:0;BSC[t]++;BWAIT=100;sfx('ok');if(CRW)for(const s of CRW.seats)s.jump=12;const sc=bodies.filter(o=>o.pit===t).sort((a,b)=>Math.hypot(a.x-B.x,a.y-B.y)-Math.hypot(b.x-B.x,b.y-B.y))[0];if(sc)say(sc,'Goal!',true)}}
// AI: whoever on a side is nearest the ball goes for it; of the rest, the one nearer his own goal keeps or sweeps, the other marks or supports
function ballAI(){if(!aiOn||BWAIT)return;const B=BALL;
 for(let t=0;t<2;t++){const us=bodies.filter(o=>o.pit===t&&o.status==='free'),own=t?H-T*1.5:T*1.5,opp=ballGoalY(t),inOwn=Math.abs(B.y-own)<H/2;
  const ch=us.slice().sort((a,b)=>Math.hypot(a.x-B.x,a.y-B.y)-Math.hypot(b.x-B.x,b.y-B.y))[0],rest=us.filter(o=>o!==ch).sort((a,b)=>Math.abs(a.y-own)-Math.abs(b.y-own));
  for(const b of us){if(b.direct||b.stunT>tick)continue;let tx,ty;
   if(b===ch){const gx=W/2-B.x,gy=opp-B.y,gl=Math.hypot(gx,gy)||1;tx=B.x-gx/gl*8;ty=B.y-gy/gl*8;const d=Math.hypot(B.x-b.x,B.y-b.y);
    if(d<16&&!(b.kickT>tick)){const aim=W/2+(Math.random()-.5)*48;ballKick(b,aim-B.x,opp-B.y,Math.min(1,.45+gl/320))}
    else if(d>40&&d<90&&Math.hypot(B.vx,B.vy)>1.5&&Math.random()<.04)dashUnit(b,B.x-b.x,B.y-b.y);
    const foe=bodies.find(o=>o.pit===1-t&&o.status==='free'&&Math.hypot(o.x-B.x,o.y-B.y)<13);if(foe&&Math.hypot(foe.x-b.x,foe.y-b.y)<34&&Math.random()<.06)dashUnit(b,foe.x-b.x,foe.y-b.y)}
   else if(b===rest[0]){if(inOwn){tx=Math.max(BG0*T+6,Math.min(BG1*T-6,B.x));ty=own+(t?-10:10)}else{tx=W/2+(B.x-W/2)*.4;ty=own+(t?-1:1)*H*.28}}
   else{const mk=bodies.filter(o=>o.pit===1-t&&o.status==='free'&&o!==ch).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0];
    if(inOwn&&mk){tx=mk.x+(W/2-mk.x)*.2;ty=mk.y+(own-mk.y)*.25}else{tx=W-B.x;ty=B.y+(opp-B.y)*.45}}
   tx=Math.max(T+6,Math.min(W-T-6,tx));ty=Math.max(T+6,Math.min(H-T-6,ty));if(Math.hypot(tx-b.x,ty-b.y)>3)aiStep(b,tx,ty,b.fb);turnTo(b,Math.atan2(B.y-b.y,B.x-b.x))}}}
function ballDraw(){const B=BALL;if(!B)return;const put=(X,Y,c)=>{if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=c};
 // team rings under the players
 for(const b of bodies){if(b.pit==null||b.status==='dead')continue;const c=BCOL[b.pit];for(let i=0;i<90;i++){const a=i/90*6.283;for(const r of[10.5,11.5])put(Math.round(b.x+Math.cos(a)*r),Math.round(b.y+Math.sin(a)*r),b.stunT>tick?mul(c,.5):c)}}
 const bx=Math.round(B.x),by=Math.round(B.y);for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){const d=Math.hypot(x,y);if(d<=2.6)put(bx+x+1,by+y+1,mul(out[(by+y+1)*W+bx+x+1]||0,.6))}
 for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){const d=Math.hypot(x,y);if(d>2.6)continue;put(bx+x,by+y,x+y<-1?rgb(196,140,86):d>1.8?rgb(104,62,30):(x+y)&1?rgb(150,96,52):rgb(138,86,46))}
 if(BKICK){const me=[...sel][0];if(me){const p=Math.min(1,(performance.now()-BKICK)/BKMAX);for(let i=0;i<9;i++)put(Math.round(me.x)-4+i,Math.round(me.y)+15,i<p*9?rgb(240,210,120):rgb(40,36,30))}}}
// you kick by holding left-click near the ball (charge) and letting go; aim is the mouse
const ballMe=()=>[...sel].find(o=>o.direct&&o.pit!=null&&o.status==='free'&&!(o.stunT>tick));
window.addEventListener('pointerdown',e=>{if(curMap!=='ball'||EM||e.button!==0||!ballMe())return;BKICK=performance.now();e.stopImmediatePropagation()},true);
window.addEventListener('pointerup',e=>{if(curMap!=='ball'||!BKICK||e.button!==0)return;const p=Math.min(1,(performance.now()-BKICK)/BKMAX);BKICK=null;e.stopImmediatePropagation();const me=ballMe();if(!me||!BALL)return;
 if(Math.hypot(BALL.x-me.x,BALL.y-me.y)<17&&!(me.kickT>tick))ballKick(me,mouse.x-BALL.x,mouse.y-BALL.y,p);else sfx('swish')},true);
const SCB=document.createElement('div');SCB.style.cssText="position:absolute;top:10px;left:50%;transform:translateX(-50%);font:44px VT323,monospace;letter-spacing:3px;color:#e9e4d8;text-shadow:0 2px 0 #000;pointer-events:none;z-index:5;display:none";
{const st=$('stage');st.parentElement.appendChild(SCB)}
function ballHud(){const on=curMap==='ball';SCB.style.display=on?'':'none';if(on)SCB.innerHTML=`<span style="color:#e2564a">${BNAME[0]} ${BSC[0]}</span> &ndash; <span style="color:#5d8ff0">${BSC[1]} ${BNAME[1]}</span>`}
{const u0=update;update=function(){u0();if(curMap!=='ball')return;if(aiOn)ballStep();ballAI();if(tick%6===0)ballHud()}}
{const r0=reset;reset=function(){r0();ballHud()}}
