// effects and drawing: fire, smoke, bodies, floors, the frame
let tick=0,fxActive=false;
function diffuse(a,keep){const q=(1-keep)/4;for(let Y=0;Y<BH;Y++)for(let X=0;X<BW;X++){const i=Y*BW+X;TMP[i]=a[i]*keep+((X>0?a[i-1]:a[i])+(X<BW-1?a[i+1]:a[i])+(Y>0?a[i-BW]:a[i])+(Y<BH-1?a[i+BW]:a[i]))*q}a.set(TMP)}
function openMap(){for(let Y=0;Y<BH;Y++)for(let X=0;X<BW;X++){const j=Y*2*W+X*2;OPEN[Y*BW+X]=(!sol[j]&&!slabG[j])?1:0}}
let RMD=new Int16Array(0);function room(px,py,amt){openMap();const s=(Math.floor(py)>>1)*BW+(Math.floor(px)>>1);if(s<0||s>=NB||!OPEN[s])return;const R=30;if(RMD.length!==NB)RMD=new Int16Array(NB).fill(-1);const dist=RMD,q=[s];dist[s]=0;let h=0;
 while(h<q.length){const i=q[h++],d=dist[i];HZ[i]=Math.min(.5,HZ[i]+amt*1.6*(1-d/R));if(d>=R)continue;const X=i%BW;for(const n of [X>0?i-1:-1,X<BW-1?i+1:-1,i-BW,i+BW])if(n>=0&&n<NB&&dist[n]<0&&OPEN[n]){dist[n]=d+1;q.push(n)}}for(const i of q)dist[i]=-1;hzOn=true}
function plume(x,y,a,sc){const c=Math.cos(a),s=Math.sin(a),n=sc>.6?10:6;for(let i=0;i<n;i++){const d=i*3.6*(sc>.6?1:.75),j=(Math.random()-.5)*i*1.1;dab(SS,x+c*d-s*j,y+s*d+c*j,(1.9-i*.12)*sc*.55,Math.max(2,Math.round((3+i*.5)*(sc>.6?1:.7))))}dab(SF,x,y,.8,3)}
function fxTick(){let act=false;if(GM.length!==NB)GM=new Float32Array(NB);
 for(let i=0;i<NB;i++){if(TF[i]>0){act=true;if(TF[i]>.3)BURN[i]=Math.min(.75,BURN[i]+.0016);bDirty(i);TF[i]=Math.max(0,TF[i]-.0015)}if(SF[i]>0){act=true;SF[i]=Math.max(0,SF[i]-.012)}if(SS[i]>0){act=true;SS[i]=SS[i]>1.1?1.1:Math.max(0,SS[i]*.996-.0008)}if(GM[i]>0){act=true;GM[i]=Math.max(0,GM[i]-.0018)}if(ST[i]>0){act=true;ST[i]=Math.max(0,ST[i]*.996-.0015)}if(FH[i]>0){act=true;FH[i]=FH[i]>.01?FH[i]*.997-.0001:0}}
 if(act&&tick%6===0)diffuse(ST,.7);
 if(act&&tick%4===0)diffuse(SF,.6);if(act&&tick%12===0)diffuse(SS,.8);if(act&&tick%8===0)diffuse(GM,.7);fxActive=act;
 if(hzOn){let mx=0;for(let i=0;i<NB;i++){HZ[i]*=.99991;if(HZ[i]>mx)mx=HZ[i]}
  if(tick%30===0){openMap();for(let i=0;i<NB;i++){if(!OPEN[i]){TMP[i]=0;continue}const X=i%BW;let sm=0;for(const n of [X>0?i-1:-1,X<BW-1?i+1:-1,i-BW,i+BW])sm+=(n>=0&&n<NB&&OPEN[n])?HZ[n]:HZ[i];TMP[i]=HZ[i]*.6+sm*.1}HZ.set(TMP)}
  hzOn=mx>.003}}
function buildFx(){fxLow.fill(0);fxTop.fill(0);fxA.fill(0);const ph=(tick/7|0)%4;
 for(let i=0;i<NB;i++){FV[i]=Math.max(FX.fire[i],TF[i]);SV[i]=FX.smoke[i]+SF[i]+SS[i]+GM[i]+ST[i];DV[i]=FX.smoke[i]+SF[i]+SS[i]*.12}
 const blk=(buf,X,Y,c,al=255)=>{const j=Y*2*W+X*2;buf[j]=buf[j+1]=buf[j+W]=buf[j+W+1]=c;if(buf===fxTop)fxA[j]=fxA[j+1]=fxA[j+W]=fxA[j+W+1]=al};
 const thr=(k,X,Y)=>.3+hh(X,Y,k)*.3;const on=(a,k,X,Y)=>X>=0&&Y>=0&&X<BW&&Y<BH&&a[Y*BW+X]>thr(k,X,Y);
 let a=FX.blood;for(let Y=0;Y<BH;Y++)for(let X=0;X<BW;X++){const v=a[Y*BW+X];if(!on(a,1,X,Y))continue;if(v<.8&&hh(X,Y,3)<.28)continue;const e=!on(a,1,X+1,Y)||!on(a,1,X-1,Y)||!on(a,1,X,Y+1)||!on(a,1,X,Y-1);blk(fxLow,X,Y,e?FXC.b0:v>2.2?(hh(X,Y,8)>.94?FXC.b3:FXC.b2):FXC.b1)}
 a=FV;const fk=2+ph;for(let Y=0;Y<BH;Y++)for(let X=0;X<BW;X++){const v=a[Y*BW+X];if(v<=.05)continue;if(!on(a,fk,X,Y)){if(v>.12&&hh(X,Y,9+ph)>.88)blk(fxLow,X,Y,FXC.f[0]);continue}const e=!on(a,fk,X+1,Y)||!on(a,fk,X-1,Y)||!on(a,fk,X,Y+1)||!on(a,fk,X,Y-1);
  blk(fxLow,X,Y,e?FXC.f[1]:v<1?FXC.f[2]:v<1.6?FXC.f[3]:v<2.3?FXC.f[4]:v<3?FXC.f[5]:FXC.f[6])}
 a=SV;for(let Y=0;Y<BH;Y++)for(let X=0;X<BW;X++){const i=Y*BW+X,v=a[i];if(v<.05)continue;const j=Y*2*W+X*2;if(fxTop[j])continue;
  if(ST[i]/v>.5){const al=Math.min(.62,ST[i]*.55)*(.7+.6*hh(X,Y,33));if(al<.04)continue;blk(fxTop,X,Y,rgb(232,236,240),al*255|0);continue}
  if((SS[i]+GM[i])/v>.55){const al=Math.min(.68,v*.3)*(.72+.56*hh(X,Y,31));if(al<.05)continue;blk(fxTop,X,Y,mix(rgb(206,211,220),rgb(150,156,170),Math.min(1,v/5)),al*255|0);continue}
  if(!on(a,3,X,Y))continue;let s=0;for(let jj=-4;jj<=4;jj+=2)for(let ii=-4;ii<=4;ii+=2){const xx=X+ii,yy=Y+jj;if(xx>=0&&yy>=0&&xx<BW&&yy<BH)s+=DV[yy*BW+xx]}s=Math.min(1,s/70);
  const t=Math.min(1,s*s*1.6+(DV[i]>3.2?.12:0)),q=hh(X,Y,11)>.8?8:0;blk(fxTop,X,Y,rgb(cl(214+(28-214)*t+q),cl(212+(26-212)*t+q),cl(208+(26-208)*t+q)),Math.min(235,(.42+.38*Math.min(1,v/3))*(.78+.44*hh(X,Y,37))*255)|0)}
 fxDirty=false}

// render
const isS=(X,Y)=>X<0||Y<0||X>=W||Y>=H||sol[Y*W+X]>0;
const HAZE=rgb(198,203,212),VEIL=rgb(190,196,206);
let sel=new Set(),hover=null,charge=null,box=null,moveSel=null,pend=null,drag=null,stepAcc=0;const keys=new Set();
function inDrag(b){return !!drag&&drag.group.includes(b)}
let SHX=new Float32Array(0),SHC=new Float32Array(0),shY=[0,0];
function sheenFrame(){if(SHX.length!==W){SHX=new Float32Array(W);SHC=new Float32Array(W)}const ax=.55*S*.0042,lp=0;for(let X=0;X<W;X++){SHX[X]=Math.sin(ax*X);SHC[X]=Math.cos(ax*X)}shY=[.83*S*.0042,(cam.x*.55+cam.y*.83)*.0042+lp]}
function shine(c,X,Y,k){const a=shY[0]*Y+shY[1],v=SHX[X]*Math.cos(a)+SHC[X]*Math.sin(a);if(v<=0)return c;const v3=v*v*v;let t=v3*k/255*.45;if(k>=60){const v8=v3*v3*v*v;t+=v8*k/255*.7}return mix(c,rgb(246,250,255),Math.min(.8,t))}
const unseen=b=>fogOn()&&(b.fogH||!!b.att&&!!(byId(b.att.id)||{}).fogH);
function streaks(){for(const b of bodies){if(b.type!=='weapon'||!WP[b.kind]||!WP[b.kind].bullet||unseen(b))continue;const s=Math.hypot(b.vx,b.vy);if(s<4)continue;const L=Math.min(40,s*.9),ux=b.vx/s,uy=b.vy/s,c=b.kind==='arc'?plasC(b.hue||0):rgb(255,236,180);for(let i=1;i<L;i++){const X=Math.round(b.x-ux*i),Y=Math.round(b.y-uy*i);if(X<0||Y<0||X>=W||Y>=H||sol[Y*W+X])break;out[Y*W+X]=mix(out[Y*W+X],c,.8*(1-i/L))}}}
// a token's pixel colours only change when it turns, changes look or kit, or takes damage or heat, so they're kept between frames
function tokCache(b,spr){let h=0;for(const p of b.px)h=h*31+p[3]*7+Math.round(p[5]*12)*997|0;const k=b.ang+'|'+lookOf(b)+'|'+b.unit+'|'+b.nat+'|'+b.si+'|'+(b.held&&b.held.kind)+'|'+!!b.guard+'|'+b.px.length+'|'+h+'|'+(b.wear&&b.wear.v);
 let c=b._tc;if(c&&c.k===k&&c.px===b.px)return c;c=b._tc={k,px:b.px,col:b.px.map(p=>pcol(b,p)),shn:spr?b.px.map(p=>{const a=sprAt(b,p);return a?a[1]:0}):null,vis:spr?new Set(b.px.filter(p=>sprAt(b,p)).map(p=>K(p[0],p[1]))):null};return c}
function drawBody(b,lift){if(offView(b.x,b.y,40))return;if(b.hidden||unseen(b))return;if(b.kind==='arc'){const s=Math.hypot(b.vx,b.vy)||1,wd=b.big?1:0;(b.blue?q=>q.map(swb):q=>q)((h=>[rgb(246,242,252),plasC(h),mul(plasC(h+.2),.85),mul(plasC(h+.4),.7),mul(plasC(h+.6),.55)])(b.hue||0)).slice(0,b.big?5:4).forEach((c,i)=>{for(let o=-wd;o<=wd;o++){const X=Math.round(b.x-b.vx/s*i-b.vy/s*o),Y=Math.round(b.y-b.vy/s*i+b.vx/s*o);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=o?mul(c,.8):c}});return}if(WP[b.kind]&&WP[b.kind].bullet&&!WP[b.kind].rod)return;const bx=Math.round(b.x),by=Math.round(b.y),st=b.status,dyn=b.type!=='weapon',hl=sel.has(b)?1.25:b===hover?1.12:1;if(b.type==='token'&&b.unit==='shock'&&b.nat==='Goldbank'&&!lookOf(b))drawCape(b,lift);
 const sh=lift?[3,4]:b.stuck||b.fallen||st==='dead'?null:[1,2];
 const spr=b.type==='token'&&!!sprG(lookOf(b)),TC=b.type==='token'?tokCache(b,spr):null,vis=spr?TC.vis:null;
 if(sh)for(const p of b.px){const X=bx+p[0]+sh[0],Y=by+p[1]+sh[1];if(spr&&!vis.has(K(p[0],p[1])))continue;if(X<0||Y<0||X>=W||Y>=H||(spr?vis:b.set).has(K(p[0]+sh[0],p[1]+sh[1]))||sol[Y*W+X])continue;out[Y*W+X]=mul(out[Y*W+X],.62)}
 for(let i=0;i<b.px.length;i++){const p=b.px[i],X=bx+p[0],Y=by+p[1];if(X<0||Y<0||X>=W||Y>=H||b.type==='slab'&&sol[Y*W+X])continue;let c=TC?TC.col[i]:pcol(b,p);if(c===0)continue;if(b.crouch)c=mul(c,.62);
  if(spr?TC.shn[i]:p[7]==='m'||p[7]==='a'||b.type==='slab'&&(hcl(b.mat).metal||b.gold))c=shine(c,X,Y,spr?45:UNITS[b.unit]&&UNITS[b.unit].dark?30:metShine(b.type==='slab'?doorMetal(b)||'steel':uMetal(b)));
  if(dyn&&!spr){const l=!b.set.has(K(p[0]-1,p[1]))||!b.set.has(K(p[0],p[1]-1)),r=!b.set.has(K(p[0]+1,p[1]))||!b.set.has(K(p[0],p[1]+1));if(b.type==='slab'){if(r)c=mul(c,.5);else if(l)c=mul(c,.8);else if(!b.set.has(K(p[0]-2,p[1]))||!b.set.has(K(p[0],p[1]-2)))c=mul(c,1.22);else if(!b.set.has(K(p[0]+2,p[1]))||!b.set.has(K(p[0],p[1]+2)))c=mul(c,.82)}else if(l||r)c=mul(c,.36)}
  if(b.kind==='sspear'&&b.glw>.01){const g=b.glw,f=.5+.5*Math.sin(tick*(.15+g*.9)+p[8]*.35);c=mix(c,g<.6?rgb(150,80,255):mix(rgb(150,80,255),rgb(244,232,255),(g-.6)/.4),Math.min(1,.25+g*1.1)*(.7+.3*f))}
  if(st==='dead'&&!(b.type==='token'&&p[7]==='x'))c=mix(mix(grey(c),rgb(122,120,116),.28),natc(b),.16);else if(st==='captured')c=mul(c,.68);if(b.fallen)c=mul(c,.5);if(hl>1)c=mul(c,hl);out[Y*W+X]=c}

 if(b.type==='token'&&st==='dead')for(let i=-4;i<=4;i++)for(const[x,y]of[[i,i],[i+1,i],[i,-i],[i+1,-i]])if(b.set.has(K(x,y))){const X=bx+x,Y=by+y;if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=rgb(44,42,42)}
 if(b.type==='token'&&st==='captured'){for(let y=-3;y<=3;y++)for(let x=-6;x<=6;x++){const d1=Math.hypot(x+3,y),d2=Math.hypot(x-3,y),X=bx+x,Y=by+y+5;if(X<0||Y<0||X>=W||Y>=H)continue;
  if(Math.abs(d1-2)<.55||Math.abs(d2-2)<.55)out[Y*W+X]=rgb(186,190,198);else if(Math.abs(d1-2)<1.3||Math.abs(d2-2)<1.3)out[Y*W+X]=rgb(30,32,36)}}
 if(b.held){const hp=heldPix(b).concat(offPix(b)),o=lift?[3,4]:[1,2];for(const p of hp){const X=p[0]+o[0],Y=p[1]+o[1];if(X>=0&&Y>=0&&X<W&&Y<H&&!b.set.has(K(X-bx,Y-by)))out[Y*W+X]=mul(out[Y*W+X],.62)}
  for(const p of hp){if(p[0]>=0&&p[1]>=0&&p[0]<W&&p[1]<H){let c=st==='dead'?grey(p[2]):p[2];if(hl>1)c=mul(c,hl);out[p[1]*W+p[0]]=c}}}
 if((b.kind==='grenade'||b.kind==='bomb')&&b.fuse>0&&(tick>>2)%2){const X=bx,Y=by-(b.kind==='bomb'?0:4);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=rgb(255,240,160)}}
let solDirty=true,solT=-9;
const DF=[1,1,1,.93,.8,.64,.46,.3,.18,.1];
function rebuildDS(){const B=15;for(let Y=0,j=0;Y<H;Y++)for(let X=0;X<W;X++,j++){if(!sol[j]){DS[j]=0;continue}let d=B;if(X>0)d=Math.min(d,DS[j-1]+1);if(Y>0){d=Math.min(d,DS[j-W]+1);if(X>0)d=Math.min(d,DS[j-W-1]+1);if(X<W-1)d=Math.min(d,DS[j-W+1]+1)}DS[j]=d}
 for(let Y=H-1;Y>=0;Y--)for(let X=W-1;X>=0;X--){const j=Y*W+X;if(!sol[j])continue;let d=DS[j];if(X<W-1)d=Math.min(d,DS[j+1]+1);if(Y<H-1){d=Math.min(d,DS[j+W]+1);if(X<W-1)d=Math.min(d,DS[j+W+1]+1);if(X>0)d=Math.min(d,DS[j+W-1]+1)}DS[j]=d}}
let DS0=null,ds0Need=true;
// wall rim: a dark line wherever open ground touches (diagonals too, so inner corners close), a lit line one further in on the top and left
function rebuildSH(){rebuildDS();if(ds0Need||!DS0||DS0.length!==DS.length){DS0=DS.slice();ds0Need=false}for(let Y=0,j=0;Y<H;Y++)for(let X=0;X<W;X++,j++){let k=0;if(!sol[j]){if(isS(X,Y-1)||isS(X-1,Y))k=1;else if(isS(X,Y-2)||isS(X-2,Y)||isS(X-1,Y-1))k=2}else{if(!isS(X,Y-1)||!isS(X,Y+1)||!isS(X-1,Y)||!isS(X+1,Y)||!isS(X-1,Y-1)||!isS(X+1,Y-1)||!isS(X-1,Y+1)||!isS(X+1,Y+1))k=1;else if(!isS(X,Y-2)||!isS(X-2,Y)||!isS(X-2,Y-2)||!isS(X-1,Y-2)||!isS(X-2,Y-1)||!isS(X+1,Y-2)||!isS(X+2,Y-2)||!isS(X-2,Y+1)||!isS(X-2,Y+2))k=2;else if(!isS(X,Y+2)||!isS(X+2,Y))k=3}SH[j]=k}}
// scorch is a soot film tinted by the floor: grey on stone, char on wood, tarnish on brass and gold, temper colours on other metals, singed cloth
const burnAt=(X,Y)=>{const fx=Math.max(0,(X-.5)/2),fy=Math.max(0,(Y-.5)/2),x0=Math.min(BW-1,fx|0),y0=Math.min(BH-1,fy|0),x1=Math.min(BW-1,x0+1),y1=Math.min(BH-1,y0+1),a=fx-x0,b=fy-y0,B=BURN;
 const p=B[y0*BW+x0],q=B[y0*BW+x1],r=B[y1*BW+x0],s=B[y1*BW+x1];return p+q+r+s?(p*(1-a)+q*a)*(1-b)+(r*(1-a)+s*a)*b:0};
// blast soot: the burnt surface's heat ramp, reaching toward its dark end (chosen in the lab: "ramp, deeper")
function scorchC(c,a,X,Y){return heatTint(c,clsAt(X,Y),Math.min(.95,1-Math.pow(1-Math.min(1,a),2.2)),X,Y)}
// fresh blast heat glows and cools: metal brightest, wood embers flicker, stone a dull red
function glowC(c,h,X,Y){const k=map[Y>>4]&&map[Y>>4][X>>4],B=CATN[k]?clsB(CATN[k][0],CATN[k][1]):CLS.stone.blast,g=B.glow*(B.flick?.8+.4*hh(X>>1,Y>>1,tick>>3):1);return heatCol(h*g,c)}
let BRY0=1e9,BRY1=-1;const bDirty=q=>{const y=(q/BW|0)*2;if(y-3<BRY0)BRY0=y-3;if(y+5>BRY1)BRY1=y+5};let FLC=null,FLK='',FLR=0,SHL=new Set(),shBuilt=false,SOLL=null,SOLN=0;
function floorPx(X,Y,j,hlC,sh){let c=floor[j];if(OBJ[j]){c=OBJC[j];if(hlC.size){const f=hlC.get((Y>>4)*CW+(X>>4));if(f)c=mul(c,f)}}else if(j>W&&OBJ[j-W-1])c=mul(c,.66);if(EDGM[j])c=mul(c,EDF[EDGM[j]]);if(sh&&SHN[j])c=shine(c,X,Y,SHN[j]);const bu=burnAt(X,Y);if(bu>.02)c=scorchC(c,bu*(.92+.16*hh(X,Y,13)),X,Y);if(sh){const fh=FH[(Y>>1)*BW+(X>>1)];if(fh>.03)c=glowC(c,fh,X,Y)}const k=SH[j];if(k)c=mul(c,k===1?.66:.82);return c}
function floorRows(y0,y1,hlC){if(y0===0&&y1===H)SHL=new Set();for(let Y=y0;Y<y1;Y++)for(let X=0,j=Y*W;X<W;X++,j++){if(sol[j])continue;if(SHN[j]){SHL.add(j);continue}FLC[j]=floorPx(X,Y,j,hlC,false)}}
function render(){VIEWR=VWH&&S?[Math.max(0,Math.floor(-cam.x/S)),Math.max(0,Math.floor(-cam.y/S)),Math.min(W,Math.ceil((VWH[0]-cam.x)/S)),Math.min(H,Math.ceil((VWH[1]-cam.y)/S))]:null;
 if(solDirty&&tick-solT>=3){rebuildSH();solDirty=false;solT=tick;shBuilt=true;SOLL=null}
 sheenFrame();const hlC=new Map();for(const[c0,f]of[[hoverC,1.12],[openCrate,1.25]])if(c0&&c0.cells&&!c0.vchest)for(const[a,b]of c0.cells)hlC.set(b*CW+a,f);
 // the ground is composed into a cache: rebuilt whole when scorch, walls, hover or map change, otherwise a slice of rows a frame catches slower edits
 const fk=curMap+'|'+N+'|'+[...hlC.keys()].join();if(BRY1>=0&&FLC&&FLC.length===N&&FLK===fk&&!shBuilt){floorRows(Math.max(0,BRY0),Math.min(H,BRY1),hlC);BRY0=1e9;BRY1=-1}
 if(!FLC||FLC.length!==N||FLK!==fk||shBuilt){BRY0=1e9;BRY1=-1;if(!FLC||FLC.length!==N)FLC=new Uint32Array(N);FLK=fk;shBuilt=false;floorRows(0,H,hlC);FLR=0}else{const n=Math.ceil(H/16);floorRows(FLR,Math.min(H,FLR+n),hlC);FLR=FLR+n>=H?0:FLR+n}
 out.set(FLC);for(const j of SHL){if(sol[j])continue;out[j]=floorPx(j%W,j/W|0,j,hlC,true)}
 for(let q=0;q<NB;q++){const fh=FH[q];if(fh<=.03)continue;const X0=(q%BW)*2,Y0=(q/BW|0)*2;for(let y=Y0;y<Y0+2;y++)for(let x=X0;x<X0+2;x++){const j=y*W+x;if(!sol[j]&&!SHN[j])out[j]=glowC(out[j],fh,x,y)}}
 if(fxDirty||(fxActive&&tick%3===0)||(tick%7===0&&FX.fire.some(v=>v>.3)))buildFx();
 for(let qy=0,q=0;qy<BH;qy++)for(let qx=0,j0=qy*2*W;qx<BW;qx++,q++,j0+=2){if(!fxLow[j0])continue;const f=fxLow[j0];for(const j of [j0,j0+1,j0+W,j0+W+1])if(!sol[j])out[j]=f}
 if(moveSel)for(const ci of moveSel.cells){const cx=ci%CW,cy=ci/CW|0;for(let y=1;y<T-1;y++)for(let x=1;x<T-1;x++){const j=(cy*T+y)*W+cx*T+x;out[j]=(x>=7&&x<=8&&y>=7&&y<=8)?mix(out[j],rgb(255,255,255),.6):mul(out[j],.68)}}
 for(const b of bodies)if(((b.stuck&&!b.att)||b.fallen)&&!(VEH.length&&b.type!=='slab'&&VEH.some(v=>vNear(v,b))))drawBody(b);
 if(!SOLL||SOLN!==N){const a=[];for(let j=0;j<N;j++)if(sol[j])a.push(j);SOLL=Int32Array.from(a);SOLN=N}
 {const tp=TOPS||OUTD;for(const j of SOLL){if(!sol[j])continue;const X=j%W,Y=j/W|0;let c=scol[j];const k=SH[j];if(k===1)c=mul(c,NOD[j]?.72:.5);else if(k===2)c=mul(c,NOD[j]?1.05:1.1);if(!tp){const d=DS[j],d0=DS0?DS0[j]:d;let f=DF[Math.min(9,d0)];if(d<d0)f=Math.max(f,d===1?.6:d===2?.22:0);c=mul(c,f)}else if(OUTD&&!TOPS)c=mul(c,1-(1-DF[Math.min(9,DS0?DS0[j]:DS[j])])*.35);if(SHN[j]&&(DS[j]<4||tp))c=shine(c,X,Y,SHN[j]);if(EDGM[j])c=mul(c,EDF[EDGM[j]]);if(whOn&&WH[j]>.01)c=mix(c,glow(WH[j]),Math.min(.9,WH[j]*1.4));out[j]=c}}
 for(const b of bodies)if(b.type==='slab'&&!b.fallen&&!inDrag(b)&&!b.vdoor)drawBody(b);vDraw(0);
 const hot=p=>p.life!==undefined||(p.em!==undefined&&p.em/p.em0>.2),rest=p=>!hot(p)&&Math.hypot(p.vx||0,p.vy||0)<.3;
 for(const p of parts){if(!rest(p))continue;const X=Math.round(p.x),Y=Math.round(p.y);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=p.c}
 drawTethers();selRings();for(const b of bodies)if(!b.stuck&&b.type!=='slab'&&!inDrag(b)&&b.status==='dead')drawBody(b);{const fly=b=>b.type!=='token'&&b.type!=='part'&&(b.thrown&&Math.hypot(b.vx,b.vy)>.6||b.fuse);for(const b of bodies)if(!b.stuck&&b.type!=='slab'&&b.type!=='token'&&!inDrag(b)&&b.status!=='dead'&&!fly(b))drawBody(b);for(const b of bodies)if(!b.stuck&&b.type==='token'&&!inDrag(b)&&b.status!=='dead')drawBody(b);for(const b of bodies)if(!b.stuck&&b.type!=='slab'&&b.type!=='token'&&!inDrag(b)&&b.status!=='dead'&&fly(b)&&!b.lob)drawBody(b)}
 for(const b of bodies)if(b.att)drawBody(b);vDraw(1);for(const b of bodies)if(b.lob&&!inDrag(b))drawBody(b);
 drawStores();
 for(const b of bodies){if(!(b.burn>.04)||(b.type!=='token'&&b.type!=='part')||unseen(b))continue;const bx=Math.round(b.x),by=Math.round(b.y),B=Math.min(1.5,b.burn);
  for(const p of b.px){if(!inZone(b,p))continue;const r2=p[0]*p[0]+p[1]*p[1],X0=bx+p[0],Y0=by+p[1];const v=Math.sin(p[0]*.9+tick*.13+b.id)*Math.sin(p[1]*.8-tick*.11)+Math.sin((p[0]+p[1])*.5+tick*.07),f=v*.5+.5;
   if(f<1.15-B*.55)continue;if(X0>=0&&Y0>=0&&X0<W&&Y0<H){const j=Y0*W+X0;out[j]=mix(out[j],f>1.05?rgb(255,214,120):f>.9?rgb(250,152,46):f>.75?rgb(224,96,26):rgb(150,38,14),Math.min(.85,.35+B*.4))}
   if(r2<40||hh(p[0]+b.id,p[1],71)>B*.35)continue;const rr=Math.sqrt(r2),ux=p[0]/rr,uy=p[1]/rr,h=Math.round((1+B*2.2)*f);
   for(let k=1;k<=h;k++){const X=Math.round(X0+ux*k),Y=Math.round(Y0+uy*k);if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;out[j]=mix(out[j],k/h<.5?rgb(236,112,28):rgb(255,190,80),(1-k/(h+1))*.75)}}}
 for(const p of parts){if(hot(p)||rest(p))continue;const X=Math.round(p.x),Y=Math.round(p.y);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=p.c}
 for(const z of zaps){const n=Math.max(1,Math.ceil(Math.hypot(z.x1-z.x0,z.y1-z.y0)));for(let i=0;i<=n;i++){const X=Math.round(z.x0+(z.x1-z.x0)*i/n+(i&&i<n?(Math.random()-.5)*1.6:0)),Y=Math.round(z.y0+(z.y1-z.y0)*i/n+(i&&i<n?(Math.random()-.5)*1.6:0));if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=z.b?(i%2?rgb(150,200,255):rgb(232,244,255)):i%2?rgb(200,150,255):rgb(244,232,255)}}zaps=zaps.filter(z=>--z.l>0);
 if(drag)for(const b of drag.group)if(bodies.includes(b))drawBody(b,true);
 for(let qy=0,q=0;qy<BH;qy++)for(let qx=0,j0=qy*2*W;qx<BW;qx++,q++,j0+=2){if(fxTop[j0]){const al=fxA[j0],f=fxTop[j0];for(const j of [j0,j0+1,j0+W,j0+W+1])out[j]=al>=255?f:mix(out[j],f,al/255);continue}const v=SV[q];if(v>.04){const a=Math.min(.42,v*.5);for(const j of [j0,j0+1,j0+W,j0+W+1])out[j]=mix(out[j],HAZE,a)}}
 for(const p of parts){if(!hot(p))continue;const X=Math.round(p.x),Y=Math.round(p.y);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=p.em!==undefined&&!p.vx&&Math.random()<.15?mul(p.c,1.25):p.c}
 if(hzOn)veil();
 if(slowMo)streaks();lightPass();if(fogOn()){const sg=(tick/3|0)+':'+bodies.filter(b=>b.direct&&b.status!=='dead').map(b=>b.id+','+Math.round(b.x)+','+Math.round(b.y)).join(';');if(sg!==FOGS){FOGS=sg;fogTick()}fogPass()}
 if(box){const x0=Math.round(Math.min(box.x0,box.x1)),x1=Math.round(Math.max(box.x0,box.x1)),y0=Math.round(Math.min(box.y0,box.y1)),y1=Math.round(Math.max(box.y0,box.y1)),c=rgb(242,239,230);
  for(let x=x0;x<=x1;x++)if(x%2===0){if(y0>=0&&y0<H)out[y0*W+x]=c;if(y1>=0&&y1<H)out[y1*W+x]=c}for(let y=y0;y<=y1;y++)if(y%2===0){if(x0>=0&&x0<W)out[y*W+x0]=c;if(x1>=0&&x1<W)out[y*W+x1]=c}}
 if(cellDrag&&moveSel){const k=(mouse.y/T|0)*CW+(mouse.x/T|0);if(moveSel.cells.has(k)){const cx=k%CW,cy=k/CW|0;for(let y=1;y<T-1;y++)for(let x=1;x<T-1;x++)if(x===1||y===1||x===T-2||y===T-2)out[(cy*T+y)*W+cx*T+x]=rgb(242,239,230)}}
 ordDraw();exitFade();
 {const ch=!panKey&&!pan&&mouse.in&&!drag&&armed().length>0;if(ch)crosshair();const into=drag&&drag.b.type==='weapon'&&(bodyAt(Math.round(mouse.x),Math.round(mouse.y),2,drag.b,o=>o.type==='token'&&o.status!=='dead')||PICK.has(drag.b.kind)&&!drag.b.fuse&&canStore(dropBox(),drag.b.kind))||SDR&&sdrOk()||SCAR&&!!carryInto(Math.round(mouse.x),Math.round(mouse.y),true);const cc=pan||drag||SDR||SCAR?CUR[into?'in':'carry']:panKey?CUR.grab:ch?'none':hover||hoverC?CUR.grab:CUR.arrow;if(cv.style.cursor!==cc)cv.style.cursor=cc;}
 if(VIEWR&&VIEWR[2]>VIEWR[0]&&VIEWR[3]>VIEWR[1])ctx.putImageData(img,0,0,VIEWR[0],VIEWR[1],VIEWR[2]-VIEWR[0],VIEWR[3]-VIEWR[1]);else ctx.putImageData(img,0,0);
 for(const e of document.querySelectorAll('#sm .xlab')){const x=(EXITS[curMap]||[])[+e.dataset.i];if(x){e.style.left=x.lx*S+'px';e.style.top=x.ly*S+'px'}}
 for(const b of bodies){if(b.mv>0)b.mv--;if(b.lab){b.lab.style.left=(Math.round(b.x)+.5)*S+'px';b.lab.style.top=(Math.round(b.y)+10)*S+'px';b.lab.style.color=natLabel(b);b.lab.style.zIndex=b.status==='dead'?0:1;{const vc=VIS[(Math.round(b.y)>>1)*BW+(Math.round(b.x)>>1)],hid=fogOn()&&(teamOf(b)!==aiMe&&(b.fogH||!vc)||b.status==='dead'&&!vc);b.lab.style.display=hid?'none':''}dbar(b,S);sayTick(b,S);{let c=b.lab.querySelector('.ld');if(b.leader&&b.status!=='dead'){if(!c){c=document.createElement('span');c.className='ld';c.innerHTML=CROWNI;b.lab.prepend(c)}}else if(c)c.remove()}}}
 SHK=shake>0?[Math.round((Math.random()-.5)*shake),Math.round((Math.random()-.5)*shake)]:[0,0];stageXf();if(shake>0)shake--}
function veil(){const G=24,gw=(W/G|0)+3,gh=(H/G|0)+3,ox=tick/500,fx0=Math.floor(ox),fr=ox-fx0,g=new Float32Array(gw*gh);for(let y=0;y<gh;y++)for(let x=0;x<gw;x++)g[y*gw+x]=hh(x+fx0,y,77);
 for(let Y=0;Y<H;Y++){const gy=Y/G,y0=gy|0,ty=gy-y0;for(let X=0;X<W;X++){const h=HZ[(Y>>1)*BW+(X>>1)];if(h<.003)continue;const gx=X/G+fr,x0=gx|0,tx=gx-x0;
  const n=(g[y0*gw+x0]*(1-tx)+g[y0*gw+x0+1]*tx)*(1-ty)+(g[(y0+1)*gw+x0]*(1-tx)+g[(y0+1)*gw+x0+1]*tx)*ty;const j=Y*W+X;out[j]=mix(out[j],VEIL,Math.min(.4,h)*(.6+.8*n))}}}
const cmdMode=b=>b.type==='token'&&!b.direct,canOrder=b=>b.type==='token'&&b.status==='free'&&!b.direct&&(!aiOn||teamOf(b)===aiMe);
const armed=()=>EM?[]:[...sel].filter(b=>srcInfo(b)&&!cmdMode(b)&&!b.vseat);
function crosshair(){const ar=armed();if(!ar.length)return;const b0=ar[0],inf=srcInfo(b0),X=Math.round(mouse.x),Y=Math.round(mouse.y),d=Math.hypot(mouse.x-b0.x,mouse.y-b0.y);
 const dry=ar.every(o=>slot(o)&&CAP[slot(o).k]&&!(slot(o).ammo>0)),g=Math.max(2,Math.round(d*inf.spread*inf.sp*1.6)),col=dry?rgb(84,82,78):d>inf.range?rgb(150,150,150):inf.heat&&slot(b0)&&(slot(b0).heat||0)>.15?heatCol(slot(b0).heat,rgb(250,250,246)):rgb(250,250,246);
 const put=(x,y,c)=>{if(x>=0&&y>=0&&x<W&&y<H)out[y*W+x]=c};
 const hot=inf.heat&&(slot(b0)||{}).heat||0,fr=charge?(inf.heat?Math.min(1,hot):Math.min(1,(performance.now()-charge.t)/charge.need)):0,shd=(x,y,on)=>{if(x>=0&&y>=0&&x<W&&y<H)out[y*W+x]=on?mix(out[y*W+x],rgb(255,255,255),.5):mul(out[y*W+x],.55)},dirs=inf.throw?[[1,-1],[1,1],[-1,1],[-1,-1]]:[[0,-1],[1,0],[0,1],[-1,0]],len=inf.throw?3:4;
 dirs.forEach(([ax,ay],ai)=>{for(let i=g;i<g+len;i++){const x=X+ax*i,y=Y+ay*i,seg=ai*4+Math.floor((i-g)*4/len);const on=(i-g+1)/len<=fr+.001&&fr>0;shd(x+1,y,on);shd(x,y+1,on);put(x,y,on?rgb(0,0,0):col)}});
 const c0=fr>0;shd(X+1,Y,c0);shd(X,Y+1,c0);put(X,Y,c0?rgb(0,0,0):col);if(dry)for(const[a,q]of[[0,0],[1,1],[-1,-1],[1,-1],[-1,1]])put(X+a,Y+q,rgb(224,83,63))}
