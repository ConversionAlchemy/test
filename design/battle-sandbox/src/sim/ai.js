// fire spread; AI: navigation, rooms, sight and hearing, orders, sharing
const inZone=(b,p)=>{if(b.fa===undefined||b.fw>=3.1&&b.fd>=8)return true;const r2=p[0]*p[0]+p[1]*p[1],d=8.3-b.fd;if(r2<d*d)return false;if(b.fw>=3.1)return true;const a=Math.atan2(p[1],p[0]);return Math.abs(Math.atan2(Math.sin(a-b.fa),Math.cos(a-b.fa)))<=b.fw};
function ignite(b,a,w,d){if(!(b.burn>.05)||b.fa===undefined){b.fa=a;b.fw=w;b.fd=d}else{b.fw=Math.min(3.15,b.fw+.008);b.fd=Math.min(8.3,b.fd+.008)}}
function fireTick(){for(const b of [...bodies]){if((b.type!=='token'&&b.type!=='part')||!bodies.includes(b))continue;
  let v=0,ka=0,kc=0;for(let k=0;k<9;k++){const a=k*.785,r=k===8?0:8,X=Math.round(b.x+Math.cos(a)*r),Y=Math.round(b.y+Math.sin(a)*r);if(X<0||Y<0||X>=W||Y>=H)continue;const q=(Y>>1)*BW+(X>>1),f=Math.max(TF[q],FX.fire[q]);if(k===8)kc=f;else if(f>v){v=f;ka=a}}
  if(kc>.3){ignite(b,ka,.5,1.5);b.fw=Math.min(3.15,b.fw+.03);b.fd=Math.min(8.3,b.fd+.03)}else if(v>.3)ignite(b,ka,.45,1.5);v=Math.max(v,kc);
  if(v>.3){b.burn=Math.min(1.5,(b.burn||0)+v*.12);if(Math.random()<.04)uMark(b,'soot',b.x+Math.cos(ka)*5,b.y+Math.sin(ka)*5,3.5,.3)}
  if(!(b.burn>0))continue;b.burn=Math.max(0,b.burn-.012);if(!b.burn){b.fa=undefined;continue}if(Math.random()<b.burn*.3)dab(SF,b.x,b.y-3,.25,3);
  const u=UNITS[b.unit]||UNITS.civ,bx=Math.round(b.x),by=Math.round(b.y);let hit=false;
  for(let n=0;n<Math.ceil(b.burn*3);n++){let p=null;for(let t=0;t<8&&!p;t++){const c=b.px[(Math.random()*b.px.length)|0];if(c&&inZone(b,c)&&Math.hypot(c[8],c[9])>4.4&&(!b.set.has(K(c[0]+1,c[1]))||!b.set.has(K(c[0]-1,c[1]))||!b.set.has(K(c[0],c[1]+1))||!b.set.has(K(c[0],c[1]-1))))p=c}if(!p)continue;
   if(p[7]==='a'&&p[4]===3){p[5]=Math.min(1.6,p[5]+b.burn*.09/Math.max(1,u.arm*.8));if(p[5]>1.15&&Math.random()<.25){if(hitPix(b,bx+p[0],by+p[1],99)===2){hit=true;spark(bx+p[0],by+p[1],rgb(255,190,90),0,0,1.2,8)}}
    const inn=b.set.get(K(p[0]-Math.sign(p[0]),p[1]-Math.sign(p[1])));if(inn&&inn[7]==='c'&&Math.random()<p[5]*.15)if(hitPix(b,bx+inn[0],by+inn[1],1)===2)hit=true}
   else if(Math.random()<b.burn*.6){if(hitPix(b,bx+p[0],by+p[1],1)===2){hit=true;if(Math.random()<.3)spark(bx+p[0],by+p[1],rgb(60,40,30),0,0,.8)}}}
  if(hit)settle(b)}}
// AI: one side follows orders its leader rolls each playthrough
let aiOn=false,aiMe=null,lastSide=null;
// AI reads the map itself (rooms, doors, cover) and acts on what each unit sees, hears and remembers
const teamOf=b=>b.status==='captured'||b.neutral?'Neutral':b.nat?guildOf(b)||SIDE[b.nat]||b.nat:'Neutral',aiUnit=b=>b.type==='token'&&aiOn&&aiMe&&(teamOf(b)!==aiMe||b.auto&&!b.direct);
function aiSetup(){for(const b of bodies)b.ai=null;GS={};NZ=[];RINGS=[];ROOMS=null;SEEN.fill(-1e9);if(!aiOn)return;
 if(!aiMe){const t=[...sel].find(o=>o.type==='token');aiMe=t?teamOf(t):lastSide||teamOf(bodies.find(o=>o.type==='token'&&o.nat)||{})}aiRooms()}
const aiOpen=(cx,cy)=>{if(cx<0||cy<0||cx>=CW||cy>=CH||map[cy][cx]==='sky')return false;const j=(cy*T+8)*W+cx*T+8;return !sol[j]&&!OBJ[j]};
const isDoor=o=>o.type==='slab'&&!o.free&&!o.fallen;let DL=[];const doorsNow=()=>DL.filter(o=>bodies.includes(o)&&!o.fallen);
const onDoor=(o,x,y)=>o.dt?o.dt.has((y/T|0)*CW+(x/T|0)):Math.abs(o.x-x)<12&&Math.abs(o.y-y)<12;
const carriesKey=(b,o)=>{const k=doorKey(o);return!!k&&!!b&&!!b.inv&&b.inv.some(z=>z&&z.k===k)};
const hasKey=(o,tm,b)=>{if(b)return carriesKey(b,o);if(!tm)return false;return bodies.some(t=>t.type==='token'&&t.status==='free'&&teamOf(t)===tm&&carriesKey(t,o))};

// navigation: one map for routes and rooms. Every 4px node (tile centres among them) knows its distance in pixels to the nearest wall, furniture or map edge; open door leaves only make a route dearer, since bodies push them; a body fits where that is at least NCL. Rebuilt soon after the space changes
const G=4,NCL=8;let NV=null,NC=null,NLF=null,NCOMP=null,GW=0,GH=0,NAVD=true,NAVV=0;
function navBuild(){GW=W/G|0;GH=H/G|0;const n=GW*GH,D=new Float32Array(N);
 for(let Y=0;Y<H;Y++){const row=map[Y>>4];for(let X=0;X<W;X++){const j=Y*W+X;D[j]=sol[j]||OBJ[j]||row&&row[X>>4]==='sky'?0:Math.min(X+1,Y+1,W-X,H-Y)}}
 const S2=1.4,S5=2.2;for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const i=Y*W+X;let v=D[i];if(!v)continue;if(X>0)v=Math.min(v,D[i-1]+1);if(Y>0){v=Math.min(v,D[i-W]+1);if(X>0)v=Math.min(v,D[i-W-1]+S2);if(X<W-1)v=Math.min(v,D[i-W+1]+S2);if(X>1)v=Math.min(v,D[i-W-2]+S5);if(X<W-2)v=Math.min(v,D[i-W+2]+S5)}if(Y>1){if(X>0)v=Math.min(v,D[i-2*W-1]+S5);if(X<W-1)v=Math.min(v,D[i-2*W+1]+S5)}D[i]=v}
 for(let Y=H-1;Y>=0;Y--)for(let X=W-1;X>=0;X--){const i=Y*W+X;let v=D[i];if(!v)continue;if(X<W-1)v=Math.min(v,D[i+1]+1);if(Y<H-1){v=Math.min(v,D[i+W]+1);if(X<W-1)v=Math.min(v,D[i+W+1]+S2);if(X>0)v=Math.min(v,D[i+W-1]+S2);if(X<W-2)v=Math.min(v,D[i+W+2]+S5);if(X>1)v=Math.min(v,D[i+W-2]+S5)}if(Y<H-2){if(X<W-1)v=Math.min(v,D[i+2*W+1]+S5);if(X>0)v=Math.min(v,D[i+2*W-1]+S5)}D[i]=v}
 NC=new Float32Array(n);NV=new Uint8Array(n);NLF=new Uint8Array(n);for(const d of bodies)if(isDoor(d)&&Math.abs(d.ang)>.2)for(const p of d.px){const gx=Math.round((d.x+p[0])/G),gy=Math.round((d.y+p[1])/G);for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const x=gx+i,y=gy+j;if(x>=0&&y>=0&&x<GW&&y<GH)NLF[y*GW+x]=1}}for(let gy=0;gy<GH;gy++)for(let gx=0;gx<GW;gx++){const c=D[gy*G*W+gx*G];NC[gy*GW+gx]=c;NV[gy*GW+gx]=c>=NCL?1:0}
 NCOMP=new Int32Array(n).fill(-1);let k=0;const q=new Int32Array(n);for(let s=0;s<n;s++){if(!NV[s]||NCOMP[s]>=0)continue;let h=0,e=0;q[e++]=s;NCOMP[s]=k;while(h<e){const c=q[h++];for(const m of nbrs(c))if(NCOMP[m]<0){NCOMP[m]=k;q[e++]=m}}k++}
 NAVD=false;NAVV++;navT=tick}
// neighbours a body can step to: 8 ways, no cutting corners
function nbrs(c,blk=m=>!NV[m]){const cx=c%GW,cy=c/GW|0,r=[];for(const[a,d]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=cx+a,ny=cy+d;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;const m=ny*GW+nx;if(blk(m))continue;if(a&&d&&(blk(cy*GW+nx)||blk(ny*GW+cx)))continue;r.push(m)}return r}
// a changed space is re-read at most four times a second
let navT=-1e9;const navEnsure=()=>{if(!NV||NV.length!==(W/G|0)*(H/G|0)||NAVD&&tick-navT>=15)navBuild()};
const nodeAt=(x,y)=>{const gx=Math.round(x/G),gy=Math.round(y/G);return gx>=0&&gy>=0&&gx<GW&&gy<GH?gy*GW+gx:-1};
const wOpen=(x,y)=>{navEnsure();const n=nodeAt(x,y);return n>=0&&NV[n]===1};
// nearest walkable node to a point, within a few nodes
function navNear(x,y,blk=m=>!NV[m],R=5){const gx=Math.round(x/G),gy=Math.round(y/G);let best=-1,bd=1e9;for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const X=gx+i,Y=gy+j;if(X<0||Y<0||X>=GW||Y>=GH)continue;const m=Y*GW+X;if(blk(m))continue;const d=i*i+j*j;if(d<bd){bd=d;best=m}}return best}

// the most open node close by: where a unit caught on a corner should slide to
function navOpen(x,y){navEnsure();const gx=Math.round(x/G),gy=Math.round(y/G);let best=-1,bs=-1e9;for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const X=gx+i,Y=gy+j;if(X<0||Y<0||X>=GW||Y>=GH)continue;const m=Y*GW+X;if(!NV[m])continue;const sc=Math.min(NC[m],12)-Math.hypot(X*G-x,Y*G-y)*.4;if(sc>bs){bs=sc;best=m}}return best}
const compAt=(x,y)=>{navEnsure();const n=navNear(x,y);return n<0?-1:NCOMP[n]};
// route: A* over the nodes, a little dearer close to walls so units keep to the middle; a door locked against this team is shut unless anyLock. If the goal can't be reached the route ends as close as it gets, marked partial
function aiPath(b,tx,ty,anyLock){navEnsure();const tm=teamOf(b),LK=new Set();if(!anyLock)for(const o of doorsNow())if(o.locked&&!o.lockBroken&&!hasKey(o,tm,b)){if(o.dt)for(const c of o.dt)LK.add(c);else LK.add((o.y/T|0)*CW+(o.x/T|0))}
 const tl=m=>((m/GW|0)*G>>4)*CW+((m%GW)*G>>4),av=b.ai&&b.ai.avoid&&b.ai.avoid.t>tick?b.ai.avoid:null,blk=m=>!NV[m]||LK.size>0&&LK.has(tl(m))||!!av&&Math.hypot((m%GW)*G-av.x,(m/GW|0)*G-av.y)<14;
 const s0=navNear(b.x,b.y,blk);if(s0<0)return null;let g=navNear(tx,ty,blk);const gx0=tx/G,gy0=ty/G;
 const n=GW*GH,gs=new Float32Array(n).fill(1e9),prev=new Int32Array(n).fill(-1),done=new Uint8Array(n),H=[],F=[];
 const hf=m=>{const dx=Math.abs(m%GW-gx0),dy=Math.abs((m/GW|0)-gy0);return Math.max(dx,dy)+.414*Math.min(dx,dy)};
 const push=(m,f)=>{H.push(m);F.push(f);let i=H.length-1;while(i>0){const p=(i-1)>>1;if(F[p]<=F[i])break;[H[p],H[i]]=[H[i],H[p]];[F[p],F[i]]=[F[i],F[p]];i=p}};
 const pop=()=>{const m=H[0],lm=H.pop(),lf=F.pop();if(H.length){H[0]=lm;F[0]=lf;let i=0;for(;;){const l=2*i+1,r=l+1;let s=i;if(l<H.length&&F[l]<F[s])s=l;if(r<H.length&&F[r]<F[s])s=r;if(s===i)break;[H[s],H[i]]=[H[i],H[s]];[F[s],F[i]]=[F[i],F[s]];i=s}}return m};
 gs[s0]=0;prev[s0]=s0;push(s0,hf(s0));let best=s0,bh=hf(s0),it=0;
 while(H.length&&it++<n){const c=pop();if(done[c])continue;done[c]=1;if(c===g)break;const h=hf(c);if(h<bh){bh=h;best=c}
  for(const m of nbrs(c,blk)){if(done[m])continue;const st=(m%GW!==c%GW&&(m/GW|0)!==(c/GW|0)?1.414:1)+(NC[m]<12?(12-NC[m])*.12:0)+(NLF[m]?3:0),v=gs[c]+st;if(v<gs[m]){gs[m]=v;prev[m]=c;push(m,v+hf(m))}}}
 const partial=g<0||prev[g]<0;if(partial)g=best;
 const raw=[];for(let c=g;c!==s0;c=prev[c])raw.push([(c%GW)*G,(c/GW|0)*G]);raw.reverse();
 const clear=(x0,y0,x1,y1)=>{const L=Math.hypot(x1-x0,y1-y0);for(let i=0;i<=L;i+=2){const m=nodeAt(x0+(x1-x0)*i/L,y0+(y1-y0)*i/L);if(m<0||blk(m))return false}return true};
 const out=[];let px=b.x,py=b.y,i=0;while(i<raw.length){let j=raw.length-1;while(j>i&&!clear(px,py,raw[j][0],raw[j][1]))j--;out.push(raw[j]);px=raw[j][0];py=raw[j][1];i=j+1}
 if(!partial&&wOpen(tx,ty)&&(!out.length||Math.hypot(tx-out[out.length-1][0],ty-out[out.length-1][1])<12&&clear(out.length>1?out[out.length-2][0]:b.x,out.length>1?out[out.length-2][1]:b.y,tx,ty)))if(out.length)out[out.length-1]=[tx,ty];else out.push([tx,ty]);
 out.raw=raw;out.partial=partial;return out}
// a unit stuck against a teammate for half a second dashes through him, if they touch and there's room on the far side
function phaseBy(b,x,y,a){if(tick<(b.phT||0)||b.dash||b.status!=='free')return false;const dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d,o=tokHit(b,ux*2,uy*2)||bodies.find(q=>q!==b&&q.type==='token'&&q.status==='free'&&Math.hypot(q.x-b.x,q.y-b.y)<18&&(q.x-b.x)*ux+(q.y-b.y)*uy>4);
 if(!o||o.type!=='token'||o.status!=='free'||teamOf(o)!==teamOf(b)||o.dash)return false;const pr=(o.x-b.x)*ux+(o.y-b.y)*uy;if(pr<=0)return false;
 // land past him along the route, where a body fits and nobody stands
 const pts=[[b.x,b.y],...(a.path||[]).slice(0,8)];if(pts.length<2)pts.push([x,y]);{const[p,q]=pts.slice(-2),l=Math.hypot(q[0]-p[0],q[1]-p[1])||1;pts.push([q[0]+(q[0]-p[0])/l*40,q[1]+(q[1]-p[1])/l*40])}const free=(X,Y)=>wOpen(X,Y)&&!bodies.some(q=>q!==b&&q.type==='token'&&q.status!=='dead'&&Math.hypot(q.x-X,q.y-Y)<14);
 for(let L=pr+17;L<=pr+120;L+=4){let left=L,X=null,Y=null;const way=[];for(let k=1;k<pts.length;k++){const[x0,y0]=pts[k-1],[x1,y1]=pts[k],s=Math.hypot(x1-x0,y1-y0);if(left<=s){X=x0+(x1-x0)*left/s;Y=y0+(y1-y0)*left/s;way.push([X,Y]);break}way.push([x1,y1]);left-=s}
  if(X===null||!free(X,Y))continue;b.dash={x:ux,y:uy,left:L,phase:true,way};b.phT=tick+90;a.stk=0;sfxP('dash',.35);return true}return false}
function aiStep(b,x,y,a=b.ai){const dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy);if(d<2)return true;if((a.stk||0)>20&&solidHits(b,0,0))b.ghost=true;const u=UNITS[b.unit],sp=.85*(1-u.arm*.07)*(b.held?.8:1)*(b.crouch?.4:1);
 for(const o of DL)if(isDoor(o)&&o.locked&&!o.lockBroken&&hasKey(o,teamOf(b),b)&&Math.hypot(o.x-b.x,o.y-b.y)<24&&(onDoor(o,x,y)||onDoor(o,b.x,b.y))){for(const q of o.pair?[o,o.pair]:[o])q.locked=false;sfx('lock')}
 for(const o of DL)if(isDoor(o)&&!o.locked&&o.tgt===0&&o.ang===0&&Math.hypot(o.x-b.x,o.y-b.y)<24&&(onDoor(o,x,y)||onDoor(o,b.x,b.y)))openGroup(o,b);
 const gain=()=>d-Math.hypot(x-b.x,y-b.y);moveToward(b,b.x+dx/d*sp,b.y+dy/d*sp);let m=gain();
 if(m<=.15&&b.held&&!a.tg&&b.ai&&(GS[teamOf(b)]||{}).mode==='calm'){b.psi=b.si;b.si=-1;b.held=null;b.hc=null;a.sheath=tick+90;moveToward(b,b.x+dx/d*sp,b.y+dy/d*sp);m=gain()}
 // caught on a corner: slide back toward the open middle the routes run along
 if(m<=.15){const q=navOpen(b.x,b.y);if(q>=0){const qx=(q%GW)*G,qy=(q/GW|0)*G,l=Math.hypot(qx-b.x,qy-b.y);if(l>.5){moveToward(b,b.x+(qx-b.x)/l*sp,b.y+(qy-b.y)/l*sp);m=gain()}}}
 if(m<=.15&&!tokHit(b,dx/d*2,dy/d*2)){const k=b.id%2?1:-1;moveToward(b,b.x-dy/d*sp*k,b.y+dx/d*sp*k)}
 if(m>.15){b.mv=6;a.stk=0;if(!a.tg&&!(b.pa&&b.pa.tg))turnTo(b,Math.atan2(dy,dx))}else a.stk=(a.stk||0)+1;
 // no real headway toward this point for half a second, however much it jostles: try a phase
 {const p=a.prog;const dn=Math.hypot(x-b.x,y-b.y);if(!p||p.x!==x||p.y!==y||dn<p.d-2)a.prog={x,y,d:dn,t:tick};else if(tick-p.t>=30){if(phaseBy(b,x,y,a))a.prog=null;else if(tick-p.t>=60){// someone not of ours in the way: route round him for a few seconds
   const ux=(x-b.x)/(dn||1),uy=(y-b.y)/(dn||1),o=bodies.find(q=>q!==b&&q.type==='token'&&q.status!=='dead'&&Math.hypot(q.x-b.x,q.y-b.y)<20&&(q.x-b.x)*ux+(q.y-b.y)*uy>2);if(o){a.avoid={x:o.x,y:o.y,t:tick+180};a.path=null;a.prog=null}}}}return false}
function aiGo(b,x,y,a=b.ai){if(!a.path||!a.wp||Math.hypot(a.wp[0]-x,a.wp[1]-y)>12||tick-a.pt>90||a.nv!==NAVV){a.path=aiPath(b,x,y);a.wp=[x,y];a.pt=tick;a.nv=NAVV;a.door=null;a.unr=false;
  // stepping round a unit in the way is only a preference: if it closes the only way (a doorway), route through and wait for it to move
  if((!a.path||a.path.partial)&&a.avoid&&a.avoid.t>tick){const sv=a.avoid;a.avoid=null;const p2=aiPath(b,x,y);if(p2&&!p2.partial)a.path=p2;else a.avoid=sv}
  if(!a.path||a.path.partial){const p0=aiPath(b,x,y,true),p=p0&&!p0.partial&&p0.raw;const d=p&&DL.find(o=>isDoor(o)&&o.locked&&!o.lockBroken&&p.some(q=>onDoor(o,q[0],q[1])));if(d){a.door=d;const i=p.findIndex(q=>onDoor(d,q[0],q[1]));a.path=p.slice(0,Math.max(0,i-2))}else{a.unr=true;if(!a.path)a.path=[]}}}
 if(!Array.isArray(a.path))a.path=[];const n=a.path.length?a.path[0]:null;if(!n||n[0]===undefined){if(a.door&&a.door.locked&&!a.door.lockBroken){breach(b,a.door,a);return false}return true}if(aiStep(b,n[0],n[1],a)||Math.hypot(n[0]-b.x,n[1]-b.y)<(a.stk>2?10:3)){a.path&&a.path.shift();a.stk=0}else if(a.stk>40){a.path=null;a.stk=0;return false}return !a.path||!a.path.length}

// rooms: flood-fill open tiles, doors split them; redone every couple of seconds so blasted walls open new ways
let ROOMS=null;
function aiRooms(){const old=ROOMS;navBuild();const n=CW*CH,R=new Int16Array(n).fill(-1),dt=new Map();
 for(const d of bodies)if(isDoor(d)){if(!d.dt&&d.ang===0&&d.tgt===0){d.dt=new Set();for(const p of d.px){const X=Math.round(d.x+p[0]),Y=Math.round(d.y+p[1]);if(X>=0&&Y>=0&&X<W&&Y<H)d.dt.add((Y/T|0)*CW+(X/T|0))}}if(d.dt)for(const c of d.dt)dt.set(c,d)}
 const tN=c=>{const r=[],x0=(c%CW)*T/G,y0=(c/CW|0)*T/G;for(let y=0;y<T/G;y++)for(let x=0;x<T/G;x++){const m=(y0+y)*GW+x0+x;if(NV[m])r.push(m)}return r},open=c=>tN(c).length>0;
 let k=0;const cen=[],tiles=[],rc=[];for(let c=0;c<n;c++){if(R[c]>=0||!open(c)||dt.has(c))continue;const q=[c];R[c]=k;let sx=0,sy=0,m=0;const tl=[],cs=new Set();
  while(q.length){const e=q.pop(),ex=e%CW,ey=e/CW|0;sx+=ex;sy+=ey;m++;tl.push(e);for(const v of tN(e))cs.add(NCOMP[v]);for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=ex+a,ny=ey+b,f=ny*CW+nx;if(nx<0||ny<0||nx>=CW||ny>=CH||R[f]>=0||!open(f)||dt.has(f))continue;R[f]=k;q.push(f)}}
  {// the room's middle, moved to the nearest spot a body can stand
   const X=sx/m*T+8,Y=sy/m*T+8;let bx=X,by=Y,bd=1e9;for(const t of tl)for(const v of tN(t)){const vx=(v%GW)*G,vy=(v/GW|0)*G,d=Math.hypot(vx-X,vy-Y)-Math.min(NC[v],12)*.5;if(d<bd){bd=d;bx=vx;by=vy}}cen.push([bx,by,m])}tiles.push(tl);rc.push(cs);k++}
 const doors=[];for(const d of new Set(dt.values())){const rs=new Set();for(const c of d.dt){const cx=c%CW,cy=c/CW|0;for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const f=(cy+b)*CW+cx+a;if(R[f]>=0)rs.add(R[f])}}doors.push({d,rooms:[...rs]});
  if(d.keys===undefined){d.keys=null;if(d.locked){const n={};for(const t of bodies)if(t.type==='token'&&t.nat&&t.status!=='dead'){const c=(t.y/T|0)*CW+(t.x/T|0);if(rs.has(R[c]))n[teamOf(t)]=(n[teamOf(t)]||0)+1}const top=Object.entries(n).sort((p,q)=>q[1]-p[1])[0];if(top)d.keys=top[0]}}}
 ROOMS={R,n:k,cen,doors,tiles,rc,t:tick,nv:NAVV};DL=bodies.filter(isDoor);// room numbers change with each rebuild: carry the team's home, target and hostile rooms over by where they were
 const mv=r=>r>=0&&old&&old.cen[r]?roomAt(old.cen[r][0],old.cen[r][1]):-1;for(const g of Object.values(GS)){g.home=mv(g.home);g.tgtR=mv(g.tgtR);if(g.hostile){const H=new Map();for(const[r,t]of g.hostile){const q=mv(r);if(q>=0)H.set(q,Math.max(H.get(q)||0,t))}g.hostile=H}}}
function roomAt(x,y){if(!ROOMS)return -1;const cx=x/T|0,cy=y/T|0,c=cy*CW+cx,r=ROOMS.R[c];if(r>=0)return r;for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const f=(cy+b)*CW+cx+a;if(f>=0&&f<ROOMS.R.length&&ROOMS.R[f]>=0)return ROOMS.R[f]}return -1}
const ways=r=>ROOMS.doors.filter(e=>e.rooms.includes(r));
const roomReach=(b,r)=>!!(ROOMS&&ROOMS.rc[r]&&ROOMS.rc[r].has(compAt(b.x,b.y)));

// senses: a cone of sight that walls, doors and (when anyone is low) furniture block; noises carry through walls
const VR=230;
function losClear(ax,ay,bx,by,aLow,bLow){const dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy),n=Math.ceil(L/2);for(let i=2;i<n-1;i++){const X=Math.round(ax+dx*i/n),Y=Math.round(ay+dy*i/n);if(X<0||Y<0||X>=W||Y>=H)return false;const j=Y*W+X;if(sol[j]||slabG[j])return false;if(OBJ[j]&&(aLow||bLow&&L*(1-i/n)<26))return false}return true}
function canSee(a,b){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>VR*(b.crouch?.6:1))return false;if(d>22&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-a.ang),Math.cos(Math.atan2(dy,dx)-a.ang)))>.96)return false;return losClear(a.x,a.y,b.x,b.y,!!a.crouch,!!b.crouch)}
let NZ=[],RINGS=[];
function hear(x,y,L,src,tag){if(!aiOn)return;const z={x,y,L,src,tag,t:tick};NZ.push(z);ringFor(z)}
function heardBy(b,z){const d=Math.hypot(z.x-b.x,z.y-b.y);if(d>z.L)return false;let w=0;if(roomAt(b.x,b.y)!==roomAt(z.x,z.y)){const n=Math.ceil(d/2);for(let i=1;i<n;i++){const j=Math.round(b.y+(z.y-b.y)*i/n)*W+Math.round(b.x+(z.x-b.x)*i/n);if(sol[j]||slabG[j])w+=2}}return z.L-d-w*4>0}

// strength: class × weapon × ammo × wounds; for enemies only what has been seen
const UV={civ:.2,home:1,rifle:1.4,guard:2.2,shock:2.6,cmd:3},WV={musket:1.2,blunder:1.3,pistol:.9,pgun:1.8,rod:2,spear:1,sspear:1.6,sword:1};
const empty=h=>h&&CAP[h.k]&&!(h.ammo>0)&&!(h.res>0);
function strOf(b){const g=b.inv&&b.inv.filter(q=>q&&WV[q.k]);const best=g&&g.length?Math.max(...g.map(q=>WV[q.k]*(empty(q)?.25:1))):.3;return(UV[b.unit]||1)*best*Math.max(.2,b.px.length/(b.n0||b.px.length))}
let GS={};
function aiTeams(){const T0={};for(const b of bodies)if(b.ai&&b.status==='free')(T0[teamOf(b)]||(T0[teamOf(b)]=[])).push(b);
 for(const[t,us]of Object.entries(T0)){const g=GS[t]||(GS[t]={mode:'calm',home:-1,odds:1});const K=new Map();let heard=null;
  const BY=new Map(bodies.map(o=>[o.id,o]));for(const b of us){for(const[id,m]of b.ai.mem)if(!m.dead&&tick-m.t<1800&&(BY.get(id)||{}).status==='free'&&(!K.has(id)||K.get(id).t<m.t))K.set(id,m);if(b.ai.nz&&tick-b.ai.nz.t<1200&&(!heard||heard.t<b.ai.nz.t))heard=b.ai.nz}
  if(t===aiMe)for(const o of bodies)if(o.type==='token'&&o.status==='free'&&relOf(aiMe,teamOf(o))==='enemy'&&!o.fogH)K.set(o.id,{x:o.x,y:o.y,t:tick,u:o.unit,id:o.id,k:o.held&&WV[o.held.k]?o.held.k:undefined});
  const su=bodies.filter(o=>o.type==='token'&&o.status==='free'&&teamOf(o)===t).reduce((s,b)=>s+strOf(b),0),sk=[...K.values()].reduce((s,m)=>s+(UV[m.u]||1)*(m.k?WV[m.k]||.3:1.1)*(m.e?.3:1),0);const ld=bodies.find(o=>o.leader&&o.type==='token'&&teamOf(o)===t&&o.status==='free'),mor=g.ldDown&&tick-g.ldDown<1800?.75:ld?1.1:1;
  g.odds=su*mor/Math.max(.05,sk);g.known=K;g.heard=heard;
  // rooms where enemies were seen or heard stay hostile until someone has stood in them a while and found nobody
  const H=g.hostile||(g.hostile=new Map());for(const k of K.values()){const r=roomAt(k.x,k.y);if(r>=0)H.set(r,Math.max(H.get(r)||0,k.t))}if(heard&&!us.some(b=>roomAt(b.x,b.y)===roomAt(heard.x,heard.y))){const r=roomAt(heard.x,heard.y);if(r>=0)H.set(r,Math.max(H.get(r)||0,heard.t))}
  for(const[r,tt]of H){if(tick-tt>3600){H.delete(r);continue}if(![...K.values()].some(k=>tick-k.t<120&&roomAt(k.x,k.y)===r)&&us.some(b=>b.ai.inR===r&&tick-b.ai.inT>150))H.delete(r)}
  const vip=us.find(b=>b.vip),prev=g.mode,r=g.odds,up=prev==='hunt'?-.15:.15,dn=prev==='fall'||prev==='defend'?.15:-.1;let m;
  if(!K.size&&!heard)m='calm';else if(vip&&K.size)m='defend';else if(!K.size)m='seek';else m=r>=1+up?'hunt':r>=.6+dn?'hold':'fall';
  const fs=us.filter(b=>b.unit!=='civ'&&b.inv.some(usableQ));for(const r of[...H.keys()])if(!us.some(b=>roomReach(b,r)))H.delete(r);if((m==='calm'||m==='seek'||m==='hunt'&&![...K.values()].some(k=>tick-k.t<300))&&H.size&&fs.length>=2&&!vip){m='clear';fs.sort((p,q)=>strOf(q)-strOf(p));g.clr=new Set(fs.slice(0,Math.ceil(fs.length/2)));const cx=us.reduce((s,b)=>s+b.x,0)/us.length,cy=us.reduce((s,b)=>s+b.y,0)/us.length;g.tgtR=[...H.keys()].filter(r=>fs.some(b=>roomReach(b,r))).sort((p,q)=>Math.hypot(ROOMS.cen[p][0]-cx,ROOMS.cen[p][1]-cy)-Math.hypot(ROOMS.cen[q][0]-cx,ROOMS.cen[q][1]-cy))[0]}
  if(vip&&m==='defend')g.home=roomAt(vip.x,vip.y);
  if(m==='fall'&&(prev!=='fall'||g.home<0)){let best=-1,bs=-1e9;const th=[...K.values()];for(let i=0;i<ROOMS.n;i++){const c=ROOMS.cen[i];if(c[2]<4||us.filter(b=>roomReach(b,i)).length<us.length*.5)continue;const w=ways(i),dd=th.reduce((s,q)=>s+Math.hypot(q.x-c[0],q.y-c[1]),0)/Math.max(1,th.length);const sc=dd/40-w.length*3-w.filter(e=>e.d.lockBroken).length*4;if(sc>bs){bs=sc;best=i}}g.home=best}
  if(m==='fall'&&g.home>=0&&us.filter(b=>roomAt(b.x,b.y)===g.home).length>=us.length*.6)m='defend';
  if((m==='fall'||m==='defend')&&g.home>=0&&ROOMS.cen[g.home]){const cap=Math.max(2,ROOMS.cen[g.home][2]/3|0),c=ROOMS.cen[g.home];g.inside=new Set(us.slice().sort((p,q)=>Math.hypot(p.x-c[0],p.y-c[1])-Math.hypot(q.x-c[0],q.y-c[1])).slice(0,cap))}else g.inside=null;
  if(m==='defend'&&prev==='fall')g.home=g.home;if(m!==prev&&SAYL[m]&&!(prev==='fall'&&m==='defend')){const sp=ld&&ld.status==='free'&&us.includes(ld)?ld:us.slice().sort((p,q)=>(RANK[q.unit]||0)-(RANK[p.unit]||0))[0];say(sp,m==='defend'&&us.some(o=>o.vip)?'Guard him':SAYL[m],2)}g.mode=m;
  for(const b of us)if(b.lab)b.lab.title=m+(b.vip?' · protected':'')}}

// callouts: a word above the name when a unit changes its mind; rises and fades
const RANK={guard:5,shock:4,cmd:3,rifle:2,home:1,civ:0};
const SAYL={clear:'Clear that room',seek:'Heard something…',hunt:'Push!',hold:'Hold here',fall:'Fall back!',defend:'Hold the room'};
function say(b,t,urgent){if(!b||!b.lab||b.status==='dead'||!aiOn)return;if(!urgent&&tick-(b.sayT||-1e9)<120)return;if(b.sayW===t&&tick-b.sayT<180)return;
 let e=b.lab.querySelector('.say');if(!e){e=document.createElement('div');e.className='say';b.lab.append(e)}e.textContent=t;e.classList.toggle('u',urgent===true);b.sayT=tick;b.sayW=t}
function sayTick(b,S){const e=b.lab&&b.lab.querySelector('.say');if(!e)return;const k=(tick-b.sayT)/72;if(k>=1||b.status==='dead'){e.remove();return}e.style.bottom=(20*S)+'px';e.style.transform=`translate(-50%,${-k*12}px)`;e.style.opacity=k<.6?1:1-(k-.6)/.4}
const TIER={civ:0,home:1,rifle:2,guard:3,shock:4,cmd:5};
function leaderTick(){for(const b of bodies)if(b.type==='token'){if(b.status==='captured')b.wasCap=true;else if(b.wasCap&&b.status==='free'&&b.neutral===undefined)b.neutral=true}
const T0={};for(const b of bodies)if(b.type==='token'&&b.nat&&teamOf(b)!=='Neutral')(T0[teamOf(b)]||(T0[teamOf(b)]=[])).push(b);
 for(const[t,us]of Object.entries(T0)){const free=us.filter(b=>b.status==='free');if(free.some(b=>b.leader))continue;const fell=us.some(b=>b.leader);for(const b of us)b.leader=false;if(!free.length)continue;
  const nb=free.slice().sort((p,q)=>(TIER[q.unit]||0)-(TIER[p.unit]||0)||strOf(q)-strOf(p))[0];nb.leader=true;if(fell){const g=GS[t]||(GS[t]={mode:'calm',home:-1,odds:1});g.ldDown=tick;const w=free.find(o=>o!==nb);if(w)say(w,"He's down!",true);say(nb,'On me!',2)}}}
function aiInit(b){b.ai={mem:new Map(),nz:null,cd:30+Math.random()*60|0,path:null,pt:0,wp:null,idle:b.unit==='home'||b.unit==='rifle'?'patrol':'hold',spot:null,look:0,peek:0}}
// unarmed foes aren't shot: soldiers close in and take them prisoner
const armedOf=o=>!!(o.held&&WV[o.held.k]||(o.inv||[]).some(q=>q&&WV[q.k]));
function aiSense(b){const a=b.ai;let tg=null,td=1e9;
 const nb=teamOf(b)==='Neutral';for(const o of bodies){if(o.type!=='token'||o===b||!foe(b,o)||o.status==='captured')continue;if(!canSee(b,o))continue;const m=a.mem.get(o.id)||{};
  if(o.status==='dead'){if(a.mem.has(o.id))m.dead=true;continue}
  if(!m.t||tick-m.t>600)say(b,'There!');Object.assign(m,{x:o.x,y:o.y,t:tick,u:o.unit,id:o.id,dead:false});if(o.held&&WV[o.held.k]){m.k=o.held.k;m.e=empty(o.held)}a.mem.set(o.id,m);
  const d=Math.hypot(o.x-b.x,o.y-b.y);if(!nb&&armedOf(o))if(d<td){td=d;tg=o}}
 for(const z of NZ){if(z.src===b||z.src&&!foe(b,z.src)&&z.tag!=='shot'&&z.tag!=='boom')continue;if(!heardBy(b,z))continue;if(z.src&&foe(b,z.src)){const m=a.mem.get(z.src.id);if(m){if(z.tag==='dry')m.e=true;else if(z.tag==='shot')m.e=false}}if(!a.nz||a.nz.t<z.t||z.L>a.nz.L)a.nz={x:z.x,y:z.y,t:z.t,L:z.L}}
 a.tg=tg;a.td=td}
function aiShare(us){for(const a of us)for(const b of us){if(a===b||Math.hypot(a.x-b.x,a.y-b.y)>140&&roomAt(a.x,a.y)!==roomAt(b.x,b.y))continue;for(const[id,m]of a.ai.mem){const o=b.ai.mem.get(id);if(!o||o.t<m.t)b.ai.mem.set(id,{...m})}if(a.ai.nz&&(!b.ai.nz||b.ai.nz.t<a.ai.nz.t))b.ai.nz={...a.ai.nz}}}
const nearObj=b=>{for(let r=4;r<=12;r+=4)for(let k=0;k<8;k++){const X=Math.round(b.x+Math.cos(k*.785)*r),Y=Math.round(b.y+Math.sin(k*.785)*r);if(X>=0&&Y>=0&&X<W&&Y<H&&OBJ[Y*W+X])return true}return false};
function breach(b,d,a){if(a.bsaid!==d){a.bsaid=d;say(b,'Breaking in')}if(Math.hypot(d.x-b.x,d.y-b.y)>44){a.path=null;return}const lv=d.pair?[d,d.pair]:[d],tm=teamOf(b);
 const kh=bodies.find(o=>o.type==='token'&&o.status==='free'&&teamOf(o)===tm&&carriesKey(o,d)&&Math.hypot(o.x-d.x,o.y-d.y)<70);if(kh){for(const q of lv)q.locked=false;sfx('lock');a.door=null;a.path=null;return}
 turnTo(b,Math.atan2(d.y-b.y,d.x-b.x));if(--a.cd>0)return;const h=b.held;if(h&&CAP[h.k]&&h.ammo>0&&facing(b,d.x,d.y)){fire(b,d.x,d.y);a.cd=50}else{sfx('thunk');shake=Math.max(shake,2);a.cd=40}
 d.kicks=(d.kicks||0)+1;hear(d.x,d.y,120,b);if(d.kicks>=8){for(const q of lv){q.lockBroken=true;q.locked=false}sfx('door');for(let i=0;i<8;i++)spark(d.x,d.y,rgb(214,176,70),0,0,2.4);a.door=null;a.path=null}}
// only metal doors lock, and only with the key
function aiLock(b,e,home){const d=e.d,lv=d.pair?[d,d.pair]:[d];if(!hcl(d.mat).lock||!carriesKey(b,d))return true;let tgt=[d.x,d.y];if(d.dt)for(const c of d.dt){const cx=c%CW,cy=c/CW|0;for(const[a,q]of[[1,0],[-1,0],[0,1],[0,-1]]){const f=(cy+q)*CW+cx+a;if(ROOMS.R[f]===home&&aiOpen(cx+a,cy+q)){tgt=aiOpen(cx+2*a,cy+2*q)&&ROOMS.R[(cy+2*q)*CW+cx+2*a]===home?[(cx+2*a)*T+8,(cy+2*q)*T+8]:[(cx+a)*T+8,(cy+q)*T+8]}}}const dd=Math.hypot(tgt[0]-b.x,tgt[1]-b.y);if(dd>6){aiGo(b,tgt[0],tgt[1]);return false}turnTo(b,Math.atan2(d.y-b.y,d.x-b.x));
 for(const q of lv)q.tgt=0;if(lv.every(q=>q.ang===0)){for(const q of lv){q.locked=true;q.keys=teamOf(b)}sfx('lock');hear(d.x,d.y,70,b);return true}return false}
function aiArm(b){if(!b.held&&!(b.ai.sheath>tick&&!b.ai.tg)){const i=b.inv.findIndex((q,i)=>q&&i<2&&WP[q.k]&&!WP[q.k].hide);if(i>=0)selectSlot(b,i)}}
function flipFor(b,tg){if(!b.held||sideOf(b)===0)return;const t=tipOf(b);if(losClear(t[0],t[1],tg.x,tg.y,b.crouch,tg.crouch))return;b.side=-(b.side||1);b.hc=null;const u=tipOf(b);if(!losClear(u[0],u[1],tg.x,tg.y,b.crouch,tg.crouch)){b.side=-b.side;b.hc=null}}
// grenades: worth it on a cluster, a heavy, or someone in cover; never near a friend or too close to throw safely
const NADEL={};
function nadePlan(b,tg0,force){if(tick-(b.nadeT||-1e9)<180||tick-(NADEL[teamOf(b)]||-1e9)<60)return null;const gi=b.inv.findIndex(q=>q&&q.k==='grenade'),bi=b.inv.findIndex(q=>q&&q.k==='bomb');if(gi<0&&bi<0)return null;
 const foes=bodies.filter(o=>o.type==='token'&&o.status==='free'&&foe(b,o)),t=tipOf(b);let best=null,bs=0;
 for(const tg of foes){if(tg!==tg0&&!canSee(b,tg))continue;const td=Math.hypot(tg.x-b.x,tg.y-b.y);if(td>150||!losClear(b.x,b.y,tg.x,tg.y,false,false))continue;
  const near=r=>foes.filter(f=>Math.hypot(f.x-tg.x,f.y-tg.y)<r).length,friend=r=>bodies.some(o=>o!==b&&o.type==='token'&&o.status==='free'&&teamOf(o)===teamOf(b)&&Math.hypot(o.x-tg.x,o.y-tg.y)<r),heavy=(UNITS[tg.unit].arm||0)>=2,covered=tg.crouch||!losClear(t[0],t[1],tg.x,tg.y,b.crouch,tg.crouch);
  if(bi>=0&&td>72&&!friend(68)){const n=near(52),sc=n*2+(heavy?1:0)+(covered?1:0);if((n>=2||force)&&sc>bs){bs=sc;best={i:bi,tg}}}
  if(gi>=0&&td>52&&!friend(48)){const n=near(36),sc=n*2+(covered?1:0);if((n>=2||force)&&sc>bs+.5){bs=sc;best={i:gi,tg}}}}
 return best}
function throwNade(b,i,tg){say(b,'Grenade!',true);const pi=b.si;selectSlot(b,i);turnTo(b,Math.atan2(tg.y-b.y,tg.x-b.x));fire(b,tg.x+(Math.random()-.5)*6,tg.y+(Math.random()-.5)*6);b.nadeT=tick;NADEL[teamOf(b)]=tick;setTimeout(()=>{if(b.status==='free'&&pi>=0&&b.inv[pi]&&b.si!==pi)selectSlot(b,pi)},400)}
function aiShoot(b,tg,a=b.ai){const td=Math.hypot(tg.x-b.x,tg.y-b.y);turnTo(b,Math.atan2(tg.y-b.y,tg.x-b.x));if(!facing(b,tg.x,tg.y))return;flipFor(b,tg);if(--a.cd>0)return;const h=b.held;if(!h)return;const w=WP[h.k];
 if(w.melee){if(td>110){a.cd=10;return}}else if(CAP[h.k]&&!(h.ammo>0)){b.crouch=nearObj(b);if(!reload(b))a.cd=999;else a.cd=90;return}
 if(bodies.some(o=>o!==b&&o.ai&&teamOf(o)===teamOf(b)&&o.status==='free'&&(()=>{const vx=tg.x-b.x,vy=tg.y-b.y,L=vx*vx+vy*vy||1,t=((o.x-b.x)*vx+(o.y-b.y)*vy)/L;return t>0&&t<1&&Math.hypot(b.x+vx*t-o.x,b.y+vy*t-o.y)<9})())){a.cd=20;a.blk=(a.blk||0)+1;if(a.blk>2&&!a.side){const L=Math.hypot(tg.x-b.x,tg.y-b.y)||1,ux=(tg.x-b.x)/L,uy=(tg.y-b.y)/L,crowd=(x,y)=>bodies.filter(o=>o!==b&&o.type==='token'&&o.status!=='dead'&&Math.hypot(o.x-x,o.y-y)<12).length;let best=null,bc=1e9;for(const d of[14,22])for(const s of[1,-1]){const p=[b.x-uy*d*s+ux*4,b.y+ux*d*s+uy*4];if(!wOpen(p[0],p[1]))continue;const c=crowd(p[0],p[1])+d/40;if(c<bc){bc=c;best=p}}a.side=best}return}a.blk=0;a.side=null;
 
 {const np=nadePlan(b,tg,false);if(np){throwNade(b,np.i,np.tg);a.cd=60;return}}
 fire(b,tg.x+(Math.random()-.5)*8,tg.y+(Math.random()-.5)*8);a.cd={musket:80,pistol:45,blunder:85,pgun:95,rod:120,spear:60,sspear:70}[h.k]+(Math.random()*30|0)||70}
function aiWander(b,r){const c=ROOMS.cen[r];if(!c)return null;const cp=compAt(b.x,b.y),ok=(x,y)=>{const m=nodeAt(x,y);return m>=0&&NV[m]&&NCOMP[m]===cp&&roomAt(x,y)===r};
 for(let k=0;k<20;k++){const x=c[0]+(Math.random()-.5)*Math.sqrt(c[2])*T,y=c[1]+(Math.random()-.5)*Math.sqrt(c[2])*T;if(ok(x,y)&&(k>12||!bodies.some(o=>o!==b&&o.type==='token'&&o.status!=='dead'&&Math.hypot((o.ai&&o.ai.spot?o.ai.spot[0]:o.x)-x,(o.ai&&o.ai.spot?o.ai.spot[1]:o.y)-y)<16)))return[x,y]}
 const tl=(ROOMS.tiles[r]||[]).slice().sort(()=>Math.random()-.5);for(const t of tl){const x=(t%CW)*T+8,y=(t/CW|0)*T+8;if(ok(x,y))return[x,y];for(let k=0;k<6;k++){const X=x+(Math.random()-.5)*14,Y=y+(Math.random()-.5)*14;if(ok(X,Y))return[X,Y]}}return null}
function aiTick(){if(!aiOn)return;if(!ROOMS||ROOMS.R.length!==CW*CH||(NAVD||ROOMS.nv!==NAVV)&&tick-ROOMS.t>=15||tick-ROOMS.t>300)aiRooms();
 for(const b of bodies){if(aiUnit(b)&&!b.ai&&b.status!=='dead')aiInit(b);if(b.ai&&!aiUnit(b))b.ai=null}
 const us=bodies.filter(b=>b.ai&&b.status==='free'&&!inDrag(b)&&!b.vseat&&!b.vwalk);if(tick%30===0)shareTick();for(const b of bodies)if(b.type==='token'&&!b.ai&&teamOf(b)===aiMe&&b.status==='free'&&!inDrag(b)){if(bombFlee(b,bodies.filter(o=>o.type==='token'&&o.status==='free'&&foe(b,o)&&!o.fogH)))continue;ordTick(b);if(!b.direct)autoFire(b)}if(tick%6===0)for(const b of us)aiSense(b);
 if(tick%30===0){const byT={};for(const b of us)(byT[teamOf(b)]||(byT[teamOf(b)]=[])).push(b);for(const g of Object.values(byT))aiShare(g.filter(b=>GS[teamOf(b)]&&GS[teamOf(b)].mode!=='calm'));aiTeams()}
 NZ=NZ.filter(z=>tick-z.t<6);
 for(const b of us){const a=b.ai,g=GS[teamOf(b)]||{mode:'calm'},gm0=(GS[teamOf(b)]||{mode:'calm'}).mode,gm=b.unit==='cmd'&&gm0==='hold'?'hunt':(gm0==='fall'||gm0==='defend')&&GS[teamOf(b)].inside&&!GS[teamOf(b)].inside.has(b)?'hold':gm0,tg=a.tg&&a.tg.status==='free'?a.tg:null,civ=b.unit==='civ'&&!b.inv.some(q=>q&&WV[q.k])||teamOf(b)==='Neutral';if(b.holdT>tick){if(tg)aiShoot(b,tg);continue}if(!tg&&lookTick(b))continue;{const rr=roomAt(b.x,b.y);if(a.inR!==rr){a.inR=rr;a.inT=tick}}if(bombFlee(b,[...(g.known||new Map()).values()]))continue;if(b.ord){ordTick(b);continue}
  if(tg&&a.td<70&&teamOf(b)!=='Neutral'&&teamOf(b)!==aiMe&&(civ||g.odds<.5&&(!b.inv.some(q=>q&&WV[q.k]&&!empty(q))||b.px.length<b.n0*.5))){surrender(b);continue}
  if(!civ){const c=bodies.find(o=>o.type==='token'&&o.status==='free'&&foe(b,o)&&!armedOf(o)&&Math.hypot(o.x-b.x,o.y-b.y)<18);if(c){surrender(c);say(b,'Got one',true)}}
  if(civ){if(gm!=='calm'||tg){if(!a.spot){const th=[...(g.known||new Map()).values()];let best=roomAt(b.x,b.y),bs=-1e9;for(let i=0;i<ROOMS.n;i++){const c=ROOMS.cen[i];const sc=th.reduce((s,q)=>s+Math.hypot(q.x-c[0],q.y-c[1]),0)-(th.length?0:1e9);if(sc>bs){bs=sc;best=i}}a.spot=aiWander(b,best)}if(a.spot&&aiGo(b,a.spot[0],a.spot[1]))b.crouch=true}continue}
  if(gm!=='calm'||tg)aiArm(b);
  if(gm!=='calm'&&!civ&&needsArms(b)){let fr=null,fd=200;for(const f of us)if(f!==b&&teamOf(f)===teamOf(b)&&spareFor(f,b)){const d=Math.hypot(f.x-b.x,f.y-b.y);if(d<fd){fd=d;fr=f}}let wpn=null,wd=Math.min(200,fd);for(const o of bodies)if(o.type==='weapon'&&WV[o.kind]&&!o.stuck&&!o.att&&!o.wedged&&Math.hypot(o.vx,o.vy)<.3){const d=Math.hypot(o.x-b.x,o.y-b.y);if(d<wd){wd=d;wpn=o}}if(wpn||fr)say(b,'Need arms');if(wpn){b.noAuto=false;aiGo(b,wpn.x,wpn.y);continue}if(fr){if(Math.hypot(fr.x-b.x,fr.y-b.y)>20)aiGo(b,fr.x,fr.y);continue}}
  if((gm==='defend'||gm==='fall')&&g.home>=0&&roomAt(b.x,b.y)===g.home){const op=ways(g.home).filter(e=>!e.d.locked&&!e.d.lockBroken&&!(e.d.pair&&e.d.pair.lockBroken)&&!(e.skip>tick));
   if(op.length&&(!g.locker||g.locker.status!=='free'||!g.locker.ai||roomAt(g.locker.x,g.locker.y)!==g.home))g.locker=b;
   if(g.locker===b&&op.length){let e=a.lockE&&op.includes(a.lockE)?a.lockE:null;if(e&&tick-a.lockT>300){e.skip=tick+600;e=null}if(!e){e=a.lockE=op.sort((p,q)=>Math.hypot(p.d.x-b.x,p.d.y-b.y)-Math.hypot(q.d.x-b.x,q.d.y-b.y))[0];a.lockT=tick;say(b,'Locking up')}b.crouch=false;if(aiLock(b,e,g.home))a.lockE=null;continue}}
  {const L=g.locker,e=L&&L!==b&&L.ai&&L.ai.lockE;if(e&&Math.hypot(e.d.x-b.x,e.d.y-b.y)<44&&g.home>=0){const c=ROOMS.cen[g.home];b.crouch=false;if(c)aiGo(b,c[0],c[1]);if(tg)turnTo(b,Math.atan2(tg.y-b.y,tg.x-b.x));continue}}
  if(tg){if(b.crouch&&!canSeeUp(b,tg))b.crouch=false;aiShoot(b,tg);if(a.side){if(aiStep(b,a.side[0],a.side[1])||a.stk>20){a.side=null;a.stk=0}continue}
   const far=b.held&&(WP[b.held.k].melee?a.td>100:a.td>(WP[b.held.k].range||200)*.8);if((gm==='hunt'||gm==='hold')&&far)aiGo(b,tg.x,tg.y);continue}
  const home=g.home,known=[...(g.known||new Map()).values()].sort((p,q)=>q.t-p.t),last=known[0];
  if(gm==='calm'){b.crouch=false;if(a.idle==='patrol'&&us.filter(o=>o!==b&&Math.hypot(o.x-b.x,o.y-b.y)<48).length<3){if(!a.spot||aiGo(b,a.spot[0],a.spot[1])){if(!a.wait)a.wait=tick+60+Math.random()*120;if(tick>a.wait){a.wait=0;a.spot=aiWander(b,roomAt(b.x,b.y))}}}else if((tick+b.id*37)%240===0&&Math.random()<.3){if(a.ang0==null)a.ang0=b.ang;turnTo(b,a.ang0+(Math.random()-.5)*.9)}continue}
  if(gm==='seek'){const z=g.heard;if(z){if(!a.spot||a.spotZ!==z.t){const r=roomAt(z.x,z.y);a.spot=r>=0&&aiWander(b,r)||[z.x,z.y];a.spotZ=z.t;a.look=0}if(aiGo(b,a.spot[0],a.spot[1])||a.stk>20){if(!a.look){a.look=tick+90;a.la=b.ang}turnTo(b,a.la+Math.sin((a.look-tick)/20)*1.2);if(tick>a.look){a.look=0;for(const o of us)if(teamOf(o)===teamOf(b)&&o.ai.nz&&o.ai.nz.t<=z.t)o.ai.nz=null}}}continue}
  if(gm==='clear'){const R=g.tgtR;if(R===undefined||R<0)continue;if(g.clr&&g.clr.has(b)){b.crouch=false;if(!a.spot||roomAt(a.spot[0],a.spot[1])!==R){a.spot=aiWander(b,R);if(a.spot)say(b,'Moving in');else{g.hostile&&g.hostile.delete(R);continue}}if(a.spot&&aiGo(b,a.spot[0],a.spot[1])){turnTo(b,b.ang+.08);if(!a.wait)a.wait=tick+40;if(tick>a.wait){a.wait=0;a.spot=aiWander(b,R)}}}else if(tick%60===b.id%60){const c=ROOMS.cen[R];if(c)turnTo(b,Math.atan2(c[1]-b.y,c[0]-b.x))}continue}
  if(gm==='hunt'){b.crouch=false;if(last){if(aiGo(b,last.x,last.y)){last.t-=600;turnTo(b,b.ang+.06)}}continue}
  if(gm==='hold'){if(!a.spot||roomAt(a.spot[0],a.spot[1])!==roomAt(b.x,b.y))a.spot=[b.x,b.y];if(last&&tick%60===b.id%60&&!losClear(a.spot[0],a.spot[1],last.x,last.y)){const r=roomAt(b.x,b.y);for(let k=0;k<16;k++){const p=aiWander(b,r);if(p&&losClear(p[0],p[1],last.x,last.y)&&Math.hypot(p[0]-last.x,p[1]-last.y)>50&&!bodies.some(o=>o!==b&&o.ai&&Math.hypot(o.x-p[0],o.y-p[1])<18)){a.spot=p;break}}}aiGo(b,a.spot[0],a.spot[1]);b.crouch=nearObj(b)&&(tick+b.id*13)%120>40;if(last)turnTo(b,Math.atan2(last.y-b.y,last.x-b.x));continue}
  if(gm==='fall'||gm==='defend'){if(home<0)continue;if(roomAt(b.x,b.y)!==home){b.crouch=false;const c=ROOMS.cen[home];if(c)aiGo(b,c[0],c[1]);continue}
   const w=ways(home);
   const weak=w.filter(e=>e.d.lockBroken||e.d.pair&&e.d.pair.lockBroken||!e.d.locked),foc=weak[0]||w[0];
   if(!a.spot||roomAt(a.spot[0],a.spot[1])!==home)a.spot=aiWander(b,home);if(a.spot&&aiGo(b,a.spot[0],a.spot[1])){b.crouch=nearObj(b)&&(tick+b.id*13)%150>50;const f=foc?foc.d:last;if(f)turnTo(b,Math.atan2(f.y-b.y,f.x-b.x))}continue}}}
// right-click a cell: selected units walk there if they can see it; a faint line shows each order
let ORDL=[];
// a group order: every man gets his own slot in formation at the destination; a right-drag lays the front rank along the drag
function ordPlan(g,x0,y0,x1,y1){const men=g.filter(b=>tierOf(b)<3),ref=men.length?men:g,mx=ref.reduce((s,b)=>s+b.x,0)/ref.length,my=ref.reduce((s,b)=>s+b.y,0)/ref.length,L=Math.hypot(x1-x0,y1-y0);let A,wd,cx,cy;
 if(L>12){let nx=-(y1-y0)/L,ny=(x1-x0)/L;cx=(x0+x1)/2;cy=(y0+y1)/2;if(nx*(cx-mx)+ny*(cy-my)<0){nx=-nx;ny=-ny}A=Math.atan2(ny,nx);wd=Math.max(1,Math.round(L/FG)+1)}
 else{cx=x1;cy=y1;A=Math.round(Math.atan2(cy-my,cx-mx)/(Math.PI/2))*Math.PI/2;wd=formed(g)?formWidth(g,g[0].formA):0}
 const S=formSlots(g,cx,cy,A,wd),taken=[];
 for(const s of S){let best=null;for(let r=0;r<=40&&!best;r+=4)for(let k=0;k<(r?Math.max(8,r):1)&&!best;k++){const a=k/Math.max(8,r)*Math.PI*2,X=Math.round(s[1]+Math.cos(a)*r),Y=Math.round(s[2]+Math.sin(a)*r);if(X>=6&&Y>=6&&X<W-6&&Y<H-6&&wOpen(X,Y)&&!taken.some(t=>Math.hypot(t[0]-X,t[1]-Y)<15))best=[X,Y]}if(best){s[1]=best[0];s[2]=best[1];taken.push(best)}else s.push(false)}
 return{S,A}}
let RDRAG=null;
// a man in formation who gets shoved off his spot steps back to it when he is idle
function homeTick(){for(const b of bodies){if(b.type!=='token'||!b.home)continue;if(b.status!=='free'||b.direct||b.vseat||b.vwalk||b.ord){if(b.status==='dead'||b.direct||b.vseat)b.home=null;continue}if(b.glide||b===(drag&&drag.b))continue;const[X,Y]=b.home;if(Math.hypot(X-b.x,Y-b.y)>5&&wOpen(X,Y)&&!bodies.some(o=>o!==b&&o.type==='token'&&o.status!=='dead'&&Math.hypot(o.x-X,o.y-Y)<9)){b.glide=[X,Y];b.ghost=true;b.stuck=false}}}
function ordGive(g,x,y,x0,y0){if(g.length===1&&x0==null){const b=g[0],X=(x/T|0)*T+8,Y=(y/T|0)*T+8;ensureRooms();const ok=X>=0&&Y>=0&&X<W&&Y<H&&wOpen(X,Y)&&(!fogOn()||SEEN[(Y>>1)*BW+(X>>1)]>-1e8)&&(P=>!!P&&!P.partial)(aiPath(b,X,Y));ORDL.push({x0:b.x,y0:b.y,x1:X,y1:Y,t:tick,ok});if(ok){b.ord={x:X,y:Y};b.oa={};say(b,'Moving',true)}sfx(ok?'flick':'dry');return}
 ensureRooms();const{S,A}=ordPlan(g,x0==null?x:x0,y0==null?y:y0,x,y);let n=0;
 for(const[b,X,Y,bad]of S){const q=(Y>>1)*BW+(X>>1),ok=bad!==false&&(!fogOn()||SEEN[q]>-1e8)&&(P=>!!P&&!P.partial)(aiPath(b,X,Y));ORDL.push({x0:b.x,y0:b.y,x1:X,y1:Y,t:tick,ok});if(ok){b.ord={x:X,y:Y,a:A};b.oa={};b.formA=null;n++;say(b,'Moving',true)}}sfx(n?'flick':'dry')}
function ordEnd(b){const a=b.ord&&b.ord.a;if(a!=null)b.home=[b.ord.x,b.ord.y];b.ord=null;if(a!=null){b.formA=a;b.lookAt={x:b.x+Math.cos(a)*120,y:b.y+Math.sin(a)*120,t:tick+240}}}
function lookGive(g,x,y,same){if(!g.length)return;const mx=g.reduce((s,b)=>s+b.x,0)/g.length,my=g.reduce((s,b)=>s+b.y,0)/g.length,a=Math.atan2(y-my,x-mx);
 for(const b of g){const X=same?b.x+Math.cos(a)*120:x,Y=same?b.y+Math.sin(a)*120:y;b.lookAt={x:X,y:Y,t:tick+240};ORDL.push({x0:b.x,y0:b.y,x1:b.x+(X-b.x)*Math.min(1,40/(Math.hypot(X-b.x,Y-b.y)||1)),y1:b.y+(Y-b.y)*Math.min(1,40/(Math.hypot(X-b.x,Y-b.y)||1)),t:tick,ok:true,look:true})}sfx('flick')}
// a look order holds until a new order or an enemy; autonomous units return to their own business after 4 s
function lookTick(b){const L=b.lookAt;if(!L||b.ord||b.direct)return false;if(b.ai&&tick>L.t){b.lookAt=null;return false}turnTo(b,Math.atan2(L.y-b.y,L.x-b.x));return true}
function ring(x,y,c,k){for(let i=0;i<40;i++){const X=Math.round(x+Math.cos(i/40*Math.PI*2)*7.5),Y=Math.round(y+Math.sin(i/40*Math.PI*2)*7.5);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=mix(out[Y*W+X],c,k)}}
function ordDraw(){if(RDRAG&&RDRAG.g.length>1){const{S}=ordPlan(RDRAG.g,RDRAG.x0,RDRAG.y0,mouse.x,mouse.y);for(const s of S)ring(s[1],s[2],s[3]===false?rgb(224,83,63):rgb(242,239,230),.7)}for(const b of bodies)if(b.type==='token'&&b.ord&&b.ord.a!=null)ring(b.ord.x,b.ord.y,rgb(242,239,230),.3);ORDL=ORDL.filter(l=>tick-l.t<90);for(const l of ORDL){const k=1-(tick-l.t)/90,c=l.look?rgb(150,200,240):l.ok?rgb(242,239,230):rgb(224,83,63),L=Math.hypot(l.x1-l.x0,l.y1-l.y0)||1;for(let i=0;i<=L;i++){const X=Math.round(l.x0+(l.x1-l.x0)*i/L),Y=Math.round(l.y0+(l.y1-l.y0)*i/L);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=mix(out[Y*W+X],c,.35*k)}}}
function ensureRooms(){if(!ROOMS||ROOMS.R.length!==CW*CH||(NAVD||ROOMS.nv!==NAVV)&&tick-ROOMS.t>=15||tick-ROOMS.t>300)aiRooms()}
// a man in a formation order who stalls within three tiles of his slot is walked the rest of the way through the crowd
function ordTick(b){if(!b.ord||b.vseat||b.vwalk)return;const F=b.ord.a!=null,d=Math.hypot(b.ord.x-b.x,b.ord.y-b.y);{const o=b.oa||(b.oa={});if(o.best===undefined||d<o.best-3){o.best=d;o.bt=tick}else{const st=tick-o.bt;if(F&&st>40&&d<48&&wOpen(b.ord.x,b.ord.y)){b.glide=[b.ord.x,b.ord.y];b.ghost=true;b.stuck=false;ordEnd(b);return}if(st>(F?240:75)){b.ord=null;return}}}
 if(b.status!=='free'||!b.oa||(b.oa.stk||0)>45&&!F||d<(F?3:10)||!F&&bodies.some(o=>o!==b&&o.type==='token'&&o.status!=='dead'&&Math.hypot(o.x-b.ord.x,o.y-b.ord.y)<12&&d<30)){ordEnd(b);return}if(aiGo(b,b.ord.x,b.ord.y,b.oa)){if(F&&d>=3&&d<48&&wOpen(b.ord.x,b.ord.y)){b.glide=[b.ord.x,b.ord.y];b.ghost=true;b.stuck=false}ordEnd(b)}}
// your unselected units with a gun drawn fire at enemies they can see
function autoFire(b){const a=b.pa||(b.pa={cd:30}),rng=k=>!k?110:WP[k].melee?110:WP[k].range||200,usable=q=>q&&WP[q.k]&&!WP[q.k].hide&&!(CAP[q.k]&&empty(q));let tg=null,td=1e9,seen=null,sd=200;
 for(const o of bodies){if(o.type!=='token'||o.status!=='free'||!foe(b,o)||!armedOf(o))continue;const d=Math.hypot(o.x-b.x,o.y-b.y);if(canSee(b,o)){if(d<td){td=d;tg=o}}else if(!o.fogH&&d<sd&&losClear(b.x,b.y,o.x,o.y,b.crouch,o.crouch)){sd=d;seen=o}}
 a.tg=tg;if(!tg){if(!lookTick(b)&&seen)turnTo(b,Math.atan2(seen.y-b.y,seen.x-b.x));a.cd=Math.max(a.cd,20);return}b.lookAt=null;
 if(!usable(b.held)){let i=b.inv.findIndex((q,i)=>i<2&&usable(q));if(i<0)i=b.inv.findIndex(q=>q&&(q.k==='grenade'||q.k==='bomb'));if(i<0)return;if(b.si!==i){selectSlot(b,i);a.cd=Math.max(a.cd,20)}}
 const k=b.held&&b.held.k;if(!k)return;
 if(k==='grenade'||k==='bomb'){turnTo(b,Math.atan2(tg.y-b.y,tg.x-b.x));if(--a.cd>0)return;const np=nadePlan(b,tg,true);if(np){throwNade(b,np.i,np.tg);a.cd=120}else a.cd=20;return}
 if(td>rng(k)+40){turnTo(b,Math.atan2(tg.y-b.y,tg.x-b.x));return}aiShoot(b,tg,a)}
// grenades: anyone in the blast who can see it runs, away from the bomb and from known enemies
function bombFlee(b,enemies){if(b.direct||b.status!=='free')return false;
 const Rg=g=>g.kind==='bomb'?60:44,TH=bodies.filter(g=>g.fuse>0&&(g.kind==='grenade'||g.kind==='bomb')&&Math.hypot(g.x-b.x,g.y-b.y)<Rg(g)*2),gap=(X,Y)=>TH.reduce((m,g)=>Math.min(m,Math.hypot(X-g.x,Y-g.y)-Rg(g)),1e9);
 // a grenade it has seen stays known while it runs; a fresh one has to be in sight
 const near=TH.filter(g=>Math.hypot(g.x-b.x,g.y-b.y)<=Rg(g)&&(b.flee||losClear(b.x,b.y,g.x,g.y,false,false))),tg=b.ai&&b.ai.tg&&b.ai.tg.status==='free'?b.ai.tg:null;
 if(!near.length){if(b.flee&&tick<=b.flee.t&&TH.length){if(tg)aiShoot(b,tg,b.ai);return true}b.flee=null;b.fleeN=0;return false}
 const t=tick+Math.max(...near.map(g=>g.fuse))+20;
 if(b.flee&&!b.flee.run){const f=b.fls||(b.fls={}),there=Math.hypot(b.flee.x-b.x,b.flee.y-b.y)<6;
  // a spot it cannot reach, or one that turned out to be in the blast: plan again from here, and after a few tries just back away
  if((f.stk||0)>5||there||f.unr&&!(f.path&&f.path.length)){b.fleeBad=Math.atan2(b.flee.y-b.y,b.flee.x-b.x);b.fleeN=(b.fleeN||0)+1;b.flee=null}
  else{b.flee.t=t;aiGo(b,b.flee.x,b.flee.y,f);if(!(f.unr&&!(f.path&&f.path.length)))return true;b.flee=null;b.fleeN=(b.fleeN||0)+1}}
 if(b.flee&&b.flee.run){let dx=0,dy=0;for(const g of near){const l=Math.hypot(b.x-g.x,b.y-g.y)||1;dx+=(b.x-g.x)/l;dy+=(b.y-g.y)/l}const a0=Math.atan2(dy,dx);for(const o of[0,.8,-.8,1.6,-1.6,2.4,-2.4])if(moveToward(b,b.x+Math.cos(a0+o)*.85,b.y+Math.sin(a0+o)*.85)>.1)break;b.mv=6;b.flee.t=t;return true}
 const g0=near.reduce((m,g)=>Math.hypot(g.x-b.x,g.y-b.y)<Math.hypot(m.x-b.x,m.y-b.y)?g:m),d=Math.hypot(g0.x-b.x,g0.y-b.y),D=Rg(g0)+16-d;
 let best=null,bs=-1e9;if((b.fleeN||0)<=2)for(const r of[D,D*.6,D*1.4])for(let k=0;k<16;k++){const an=k*.3927,X=b.x+Math.cos(an)*r,Y=b.y+Math.sin(an)*r;if(!wOpen(X,Y)||!losClear(b.x,b.y,X,Y,false,false))continue;let sc=Math.min(0,gap(X,Y))*3+Math.min(30,gap(X,Y))-r*.05;if(b.fleeBad!==undefined&&Math.cos(an-b.fleeBad)>.7)sc-=60;for(const o of bodies){if(o===b||o.type!=='token'||o.status==='dead')continue;const tx=o.flee?o.flee.x:o.x,ty=o.flee?o.flee.y:o.y,dd=Math.hypot(tx-X,ty-Y);if(dd<24)sc-=(24-dd)*2;const vx=X-b.x,vy=Y-b.y,L=vx*vx+vy*vy||1,q=Math.max(0,Math.min(1,((o.x-b.x)*vx+(o.y-b.y)*vy)/L));if(Math.hypot(b.x+vx*q-o.x,b.y+vy*q-o.y)<12)sc-=40}for(const e of enemies){const ed=Math.hypot(e.x-X,e.y-Y);if(ed<80)sc-=(80-ed)*1.5}if(sc>bs){bs=sc;best=[X,Y]}}
 const first=!b.fleeN;if(!best||best&&gap(best[0],best[1])<=gap(b.x,b.y)){b.flee={x:b.x,y:b.y,t,g:g0,run:1}}else{b.flee={x:best[0],y:best[1],t,g:g0};b.fls={};if(gap(best[0],best[1])>0&&dashUnit(b,best[0]-b.x,best[1]-b.y))sfx('dash')}
 if(first){say(b,'Run!',true);b.crouch=false}return true}
// arms: a unit with nothing usable takes a spare from a friend beside it (weapon, spear, or half his rounds)
const usableQ=q=>q&&WP[q.k]&&!WP[q.k].hide&&q.k!=='grenade'&&q.k!=='bomb'&&!(CAP[q.k]&&empty(q));
const needsArms=b=>b.inv&&!b.inv.some(usableQ);
function spareFor(f,b){if(!f.inv)return null;const mine=f.inv.filter(usableQ);for(const q of b.inv||[])if(q&&CAP[q.k]&&empty(q)){const s=f.inv.find(z=>z&&z.k===q.k&&(z.res||0)>=CAP[q.k]);if(s)return{ammo:q,from:s}}
 const sp=f.inv.find(z=>z&&(z.k==='spear'||z.k==='sspear')&&z.n>1);if(sp)return{give:sp,one:true};if(mine.length>=2){const g=mine.slice().sort((p,q)=>(WV[p.k]||0)-(WV[q.k]||0))[0];return{give:g}}return null}
function share(f,b){const s=spareFor(f,b);if(!s)return false;if(s.ammo){const n=Math.floor(s.from.res/2);s.from.res-=n;s.ammo.res=(s.ammo.res||0)+n;sfx('reload');say(f,'Here',true);return true}
 const it=s.one?{k:s.give.k,n:1}:{...s.give};if(!addItem(b,it))return false;say(f,'Here',true);if(s.one)s.give.n--;else{const i=f.inv.indexOf(s.give);f.inv[i]=null;if(f.held===s.give){f.held=null;f.si=-1;f.hc=null}}sfx('flick');return true}
function shareTick(){for(const b of bodies){if(b.type!=='token'||b.status!=='free'||!needsArms(b))continue;for(const f of bodies)if(f!==b&&f.type==='token'&&f.status==='free'&&teamOf(f)===teamOf(b)&&Math.hypot(f.x-b.x,f.y-b.y)<26&&share(f,b))break}}
function surrender(b){say(b,'I yield',true);if(b.held)dropHeld(b);b.status='captured';b.neutral=true;b.ai=null;b.crouch=false;b.ord=null;b.hc=null;sfx('flick');if(b.lab)b.lab.title='surrendered'}
function canSeeUp(b,o){const c=b.crouch;b.crouch=false;const r=canSee(b,o);b.crouch=c;return r}
// your side's view when AI is on: live where your units look, a fading picture elsewhere (5 s to black)
let SVC={k:'',d:new Float32Array(0)},SVT=new Float32Array(0),VS=new Uint8Array(1),VSF=new Float32Array(1),fSel=false,VIS=new Uint8Array(1),SEEN=new Float32Array(1),SNAP=new Uint32Array(1),VF=new Float32Array(1),VT=new Float32Array(1);
// fog only while you're driving a unit yourself (E), paused or not; commanding from above sees everything
let FOGS='';const fogTeam=()=>{if(aiMe)return aiMe;const d=bodies.find(b=>b.direct&&b.type==='token'&&b.status!=='dead');return d?teamOf(d):null},fogOn=()=>dirOn()&&!EM&&!!fogTeam();
let DIRT=-1,DIRV=false;const dirOn=()=>{if(DIRT!==tick){DIRT=tick;DIRV=bodies.some(b=>b.direct&&b.type==='token'&&b.status!=='dead')}return DIRV};
function fogTick(){const FT=fogTeam();if(VIS.length!==NB){VIS=new Uint8Array(NB);SEEN=new Float32Array(NB).fill(-1e9)}if(SNAP.length!==W*H)SNAP=new Uint32Array(W*H);
 const me=bodies.filter(b=>b.type==='token'&&teamOf(b)===FT&&b.status!=='dead');
 if(VS.length!==NB){VS=new Uint8Array(NB);VSF=new Float32Array(NB)}fSel=me.some(b=>sel.has(b));
 if(VD.length!==NB)VD=new Float32Array(NB);
 // units standing still keep their sight in a cache; moving units cast rays every frame. A changed cache is rebuilt a few units a frame, the old one standing in meanwhile
 // only doors and vehicles in reach of a unit's sight can change what it sees
 const SLB=bodies.filter(o=>o.type==='slab'),RR=(FOVR+40)**2,env=b=>solT+'|'+SLB.reduce((h,o)=>(o.x-b.x)**2+(o.y-b.y)**2<RR?h+o.x*7+o.y*13+(o.ang||0)*101|0:h,0)+'|'+VEH.filter(v=>(v.x-b.x)**2+(v.y-b.y)**2<RR*2).map(v=>v.x+','+v.y+','+v.ang).join(';'),sk=b=>(b.x>>2)+','+(b.y>>2)+','+!!b.crouch+','+(b.vseat?b.vseat.id:0);
 for(const b of me){const k=sk(b);if(k!==b._sk){b._mvT=b._sk===undefined?-99:tick;b._sk=k}}
 // each standing unit keeps its own sight, so a unit that starts moving drops out of the shared view at once instead of leaving its old sight behind
 const isLive=b=>tick-(b._mvT||0)<20,still=me.filter(b=>!isLive(b)),t0=performance.now();
 still.sort((a,b)=>(a._sv&&a._sv.p===a._sk)-(b._sv&&b._sv.p===b._sk));
 for(const b of still){const k=b._ek=b._sk+'|'+env(b),c=b._sv;if(c&&c.k===k||performance.now()-t0>(c&&c.p===b._sk?6:12)||!bodies.includes(b))continue;const Q=[],V=[];if(SVT.length!==NB)SVT=new Float32Array(NB).fill(-1);sight360(b,(q,v)=>{if(SVT[q]<0)Q.push(q);if(v>SVT[q])SVT[q]=v});for(const q of Q){V.push(SVT[q]);SVT[q]=-1}b._sv={k,p:b._sk,n:(c?c.n:0)+1,q:Int32Array.from(Q),v:Float32Array.from(V)}}
 const kept=still.filter(b=>b._sv&&b._sv.k===b._ek),ck=FT+'|'+kept.map(b=>b.id+':'+b._sv.n+(sel.has(b)?'s':'')).join(';');
 if(SVC.d.length!==NB)SVC={k:'',d:new Float32Array(NB),i:new Uint8Array(NB),s:new Uint8Array(NB)};
 if(SVC.k!==ck){SVC.d.fill(0);SVC.i.fill(0);SVC.s.fill(0);for(const b of kept){const{q,v}=b._sv,sb=sel.has(b);for(let j=0;j<q.length;j++){const c=q[j];SVC.i[c]=1;if(v[j]>SVC.d[c])SVC.d[c]=v[j];if(sb)SVC.s[c]=1}}SVC.k=ck}
 const live=me.filter(b=>!kept.includes(b)&&(tick-(b._mvT??-1e9)<600||b._sv&&b._sv.p===b._sk)),lk=live.map(b=>b.id).join(),same=VF.length===NB&&SVC.k===SVC.done&&(!live.length&&!SVC.live||lk===SVC.lk&&tick%2);SVC.done=SVC.k;SVC.live=live.length;SVC.lk=lk;
 if(!same){
 VIS.set(SVC.i);VD.set(SVC.d);VS.set(SVC.s);for(const b of live){const sb=sel.has(b);sight360(b,(q,v)=>{VIS[q]=1;if(v>VD[q])VD[q]=v;if(sb)VS[q]=1})}
 for(let y=1;y<BH-1;y++)for(let x=1;x<BW-1;x++){const q=y*BW+x;if(!VIS[q]&&(VIS[q-1]&1&&VIS[q+1]&1||VIS[q-BW]&1&&VIS[q+BW]&1)){VIS[q]=2;VD[q]=Math.max(Math.min(VD[q-1],VD[q+1]),Math.min(VD[q-BW],VD[q+BW]))}}
 }for(let q=0;q<NB;q++)if(VIS[q])SEEN[q]=tick;
 // soft edge: blur the view mask a few cells; while only moving units change it, every other frame
 if(!same){if(VF.length!==NB){VF=new Float32Array(NB);VT=new Float32Array(NB)}for(let q=0;q<NB;q++)VF[q]=VD[q];blurMask(VF);if(fSel){for(let q=0;q<NB;q++)VSF[q]=VS[q]?1:0;blurMask(VSF)}}
 for(const o of bodies)if(o.type==='token')o.fogH=relOf(FT,teamOf(o))!=='self'&&relOf(FT,teamOf(o))!=='ally'&&o.status!=='dead'&&(!VIS[(Math.round(o.y)>>1)*BW+(Math.round(o.x)>>1)]||!me.some(b=>Math.hypot(o.x-b.x,o.y-b.y)<FOVR*.88&&losClear(b.x,b.y,o.x,o.y,!!b.crouch,!!o.crouch)))}
