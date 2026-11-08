// Carrier: a tracked troop carrier. Its hull, tracks, engine and chest sit in slabG, so shots, blasts, units and sight meet them like any slab.
// Layout (local pixels): driver and commander up front, chest over engine, armoured bulkhead with a door, 4+4 seats, rear double doors.
const VC={CAB:22,ST:16,SEAT:17,ROW:16,TR:5,SW:4,FW:4,RW:8,N:4};
VC.IL=VC.CAB+2+VC.ST+2+VC.N*VC.SEAT+4;VC.IH=3*VC.ROW;VC.X0=VC.FW;VC.R0=VC.TR+VC.SW;VC.L=VC.X0+VC.IL+VC.RW;VC.H=VC.R0+VC.IH+VC.SW+VC.TR;VC.LW=VC.L+18;
VC.RC=[VC.R0+8,VC.R0+VC.ROW+8,VC.R0+2*VC.ROW+8];VC.CY=VC.RC[1];VC.XST=VC.X0+17;VC.XP=VC.X0+33;VC.XS=VC.XP+8;VC.PX=VC.L/2;VC.PY=VC.H/2;
const VPB=rgb(240,226,255),VPV=rgb(150,90,220),VPD=rgb(58,30,96);
const vmet=(mat,x,y,t)=>{const c=metalOf(mat,x*3,y*3);return rgb(cl(c[0]*t),cl(c[1]*t),cl(c[2]*t))};
const vtone=(mat,c)=>mat==='umbra'?umbraC(c):mat==='steel'?c:toneC(mat,c);

// seats: [x, y, facing in local radians, role]; the token sits back against the wall or bulkhead, leaving the aisle clear
function vSeats(){const s=[[VC.X0+8,VC.RC[2],Math.PI,'driver'],[VC.X0+8,VC.RC[0],Math.PI,'cmd']];for(let i=0;i<VC.N;i++){const x=VC.XS+i*VC.SEAT+8;s.push([x,VC.RC[0],Math.PI/2,'p'],[x,VC.RC[2],-Math.PI/2,'p'])}return s}
const VSEATS=vSeats();
const vSit=i=>{const[x,y,a]=VSEATS[i];return a===Math.PI?[x+2,y+.5]:a>0?[x+.5,y-.5]:[x+.5,y+1]};

function vBuild(v){const{L,H,LW,TR,SW,FW,RW,X0,R0,IL,IH,RC,CY,XST,XP}=VC,mat=v.metal,HP=mprop('Metal',mat).hp,base=new Uint32Array(LW*H),roof=new Uint32Array(LW*H),src=[],smap=new Map();
 const B=(x,y,c)=>{if(x>=0&&y>=0&&x<LW&&y<H)base[y*LW+x]=c|0xff000000},Rf=(x,y,c)=>{if(x>=0&&y>=0&&x<LW&&y<H)roof[y*LW+x]=c|0xff000000};
 const S=(x,y,c,hp,tag)=>{if(x<0||y<0||x>=LW||y>=H)return;const k=K(x,y),o=smap.get(k);if(o){o[2]=c;o[3]=o[6]=hp;o[7]=tag;return}const q=[x,y,c,hp,3,0,hp,tag,x,y];src.push(q);smap.set(k,q)};
 const ch=(x,y)=>{const d=Math.min(y-TR,H-TR-1-y);return x<4-d};
 // floor: the hull metal's floor tile, dimmed for the interior
 const fk=mat==='iron'?'metal.iron.treadplate':'metal.'+mat+'.smooth',FL={};
 for(let y=R0;y<R0+IH;y++)for(let x=X0;x<X0+IL;x++){const fx=x-X0,fy=y-R0,d=FL[(fy>>4)*99+(fx>>4)]||(FL[(fy>>4)*99+(fx>>4)]=tilePix(fk,fx>>4,fy>>4)),i=((fy&15)*16+(fx&15))*4;B(x,y,mul(rgb(d[i],d[i+1],d[i+2]),.45))}
 // seats in black cloth: backrest and armrests frame the token, cushion with two stitched channels
 const CL=tilePix('cloth.black.border',0,0),seat=(x,y,fx,fy)=>{for(let f=-7;f<=5;f++)for(let sd=-7;sd<=7;sd++){const X=x+(fx?f*fx:sd),Y=y+(fy?f*fy:sd),as=Math.abs(sd);let t;
  if(f<=-6){if(as===7&&f===-7)continue;t=f===-7||as===7?.55:1.9}else if(as>=6){if(f===5)continue;t=as===7||f===4?.55:1.6}
  else if(as===5||f===5)t=.55;else if(as===2)t=1;else if(f===4)t=1.2;else t=as>=3?1.25:sd===0||f<0?1.5:1.75;
  const i=(((Y&7)+4)*16+(X&7)+4)*4;B(X,Y,mul(rgb(CL[i],CL[i+1],CL[i+2]),t*1.45))}};
 for(let y=CY-16;y<CY+16;y++)for(let x=L-RW;x<L;x++){const fx=x-X0,fy=y-R0,d=FL[(fy>>4)*99+(fx>>4)]||(FL[(fy>>4)*99+(fx>>4)]=tilePix(fk,fx>>4,fy>>4)),i=((fy&15)*16+(fx&15))*4;B(x,y,mul(rgb(d[i],d[i+1],d[i+2]),.28))}
 for(const[x,y,a]of VSEATS)seat(x,y,Math.round(Math.cos(a+Math.PI)),Math.round(Math.sin(a)));
 // tracks
 for(const yy of[0,H-TR])for(let y=0;y<TR;y++)for(let x=3;x<L-2;x++)S(x,yy+y,0,14,yy?'B':'T');
 // half walls: sides full length, front and rear between them
 const slab=(len,th)=>slabPix(3,len,th).map(q=>[q[8],q[9]+th,vtone(mat,q[2])]);
 for(const q of slab(L,SW)){S(q[0],TR+q[1],q[2],HP,'w');S(q[0],R0+IH+q[1],q[2],HP,'w')}
 for(const q of slab(IH,FW))S(q[1],R0+q[0],q[2],HP,'w');
 for(const q of slab(8,RW)){S(L-RW+q[1],R0+q[0],q[2],HP,'w');S(L-RW+q[1],R0+IH-8+q[0],q[2],HP,'w')}
 for(const q of slab(16,8)){S(XP+q[1],R0+q[0],q[2],HP,'w');S(XP+q[1],R0+IH-16+q[0],q[2],HP,'w')}
 // chamfered nose
 for(let y=TR;y<H-TR;y++)for(let x=0;x<6;x++){const o=smap.get(K(x,y));if(!o)continue;if(ch(x,y)){o.cut=1;smap.delete(K(x,y))}else if(ch(x-1,y))o[2]=vmet(mat,x,y,.5)}
 // firing slit: a lit lip on the outer face, dimmer metal through the wall, a darker bevel at its inner edge
 for(let y=RC[0]-5;y<=RC[0]+4;y++){S(0,y,vmet(mat,0,y,1.35),2,'g');for(let x=1;x<FW;x++){smap.delete(K(x,y));B(x,y,vmet(mat,x,y,x===FW-1?.5:.62))}}
 // chest over the engine block
 {const P=vChestPx(mat);for(let y=0;y<16;y++)for(let x=0;x<16;x++)S(XST+x,R0+y,P[y*16+x],HP,'c')}
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const e=x===0||y===0||x===15||y===15,cs=x===1||y===1||x===14||y===14;let c=e?vmet(mat,x,y,.45):vmet(mat,x,y,x===1||y===1?1.2:.75),tag='w',hp=HP;
  if(!e&&!cs){const u=x-2,w=y-2,r=Math.hypot((u%6)-2.5,(w%6)-2.5),op=mix(plasC(Math.atan2(y-7.5,x-7.5)/6.283+.5),VPV,.45);c=u===0||w===0||u===11||w===11||u===5||u===6||w===5||w===6?VPD:r<1.6?VPB:r<2.4?VPV:op;tag='e';hp=3}
  S(XST+x,R0+IH-16+y,c,hp,tag)}
 // roof: plates over the interior, hatches over the front seats, a grille over the engine
 for(let y=R0;y<R0+IH;y++)for(let x=X0;x<X0+IL;x++){const e=x===X0||y===R0,e2=x===X0+IL-1||y===R0+IH-1;let c=e?vmet(mat,x,y,.7):e2?vmet(mat,x,y,.82):vmet(mat,x,y,1);for(const pl of[XP+3,VC.XS+2*VC.SEAT+1]){if(x===pl)c=vmet(mat,x,y,.8);if(x===pl+1)c=vmet(mat,x,y,1.08)}Rf(x,y,c)}
 for(const[a,b2]of[[X0,XP+3],[XP+5,VC.XS+2*VC.SEAT],[VC.XS+2*VC.SEAT+3,X0+IL-1]])for(const[x,y]of[[a+2,R0+2],[b2-2,R0+2],[a+2,R0+IH-3],[b2-2,R0+IH-3]]){Rf(x,y,vmet(mat,x,y,1.5));Rf(x+1,y+1,vmet(mat,x,y,.6))}
 for(const hy of[RC[0],RC[2]])for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){const d=Math.hypot(x,y);if(d>3.4)continue;Rf(X0+8+x,hy+y,d>2.4?vmet(mat,0,hy,.55):d<1.2?vmet(mat,0,hy,1.25):vmet(mat,0,hy,.95))}
 {const vt=tilePix('metal.steel.louvre.w',0,0);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4;Rf(XST+x,R0+IH-16+y,vtone(mat,rgb(vt[i],vt[i+1],vt[i+2])))}}
 v.base=base;v.roofL=roof;v.src=src;v.smap=smap}

function carrier(mat,x,y,ang,nat,cond){const v={id:uid++,veh:true,type:'veh',metal:mat||'steel',mat:DOORK[mat||'steel'][1],nat:nat||null,x,y,ang:ang||0,sp:0,w:0,ph:[0,0],seats:Array(VSEATS.length).fill(null),on:0,offT:999,acc:0,alp:0,hov:new Set(),puffs:[],px:[],set:new Map(),hp:1};vBuild(v);vOrient(v);VEH.push(v);vMkDoors(v);vMkChest(v,VSUP());if(cond)vCondition(v,cond,(x*7+y*13)|0);return v}
// its doors are the game's own doors, riding on the hull: rear double doors part to the sides, the cockpit door slides into the bulkhead
const VIGN=21;
const VDOORS=[[VC.L-9,VC.CY-16,Math.PI/2],[VC.L,VC.CY+15,-Math.PI/2],[VC.XP-1,VC.CY-8,Math.PI/2]];
function vMkDoors(v){v.doors=VDOORS.map(([ax,ay,a])=>{const d=mkDoor(v.metal,0,0,0,8);d.vdoor={v,ax,ay,a};if(v.nat)d.keys=v.nat;return d});v.doors[0].pair=v.doors[1];v.doors[1].pair=v.doors[0];v.dids=new Set(v.doors.map(d=>d.id));vDoorPose(v)}
function vDoorPose(v){for(const d of v.doors||[]){if(d.fallen||!bodies.includes(d))continue;const{ax,ay,a}=d.vdoor,[x,y]=vL2W(v,ax,ay);d.x=x;d.y=y;d.rot=0;d.spin=v.ang+a;orient(d)}}
const vDriver=v=>{const t=v.seats[0];return t&&bodies.includes(t)&&t.status!=='dead'?t:null};
const vW2L=(v,X,Y)=>{const c=Math.cos(v.ang),s=Math.sin(v.ang),dx=X-v.x,dy=Y-v.y;return[VC.PX+dx*c+dy*s,VC.PY-dx*s+dy*c]};
const vL2W=(v,x,y)=>{const c=Math.cos(v.ang),s=Math.sin(v.ang),dx=x-VC.PX,dy=y-VC.PY;return[v.x+dx*c-dy*s,v.y+dx*s+dy*c]};
// solid pixels under the current pose; open doors and broken pixels drop out
function vSolid(v,q){return!q.dead}
// tracks sit low, like furniture: units bump into them but shots pass over to the hull
function vOrient(v,pose){if(!pose)for(const t of v.px)if(t.s&&t[3]<t.s[3])t.s[3]=t[3];const P=pose||v,c=Math.cos(P.ang),s=Math.sin(P.ang),bx=Math.round(P.x),by=Math.round(P.y),R=90,px=[],tk=[];
 for(let Y=by-R;Y<=by+R;Y++)for(let X=bx-R;X<=bx+R;X++){const dx=X-P.x,dy=Y-P.y,lx=Math.floor(VC.PX+dx*c+dy*s),ly=Math.floor(VC.PY-dx*s+dy*c);if(lx<0||ly<0||lx>=VC.LW||ly>=VC.H)continue;const q=v.smap.get(K(lx,ly));if(!q||!vSolid(v,q))continue;if(q[7]==='T'||q[7]==='B'){tk.push([X-bx,Y-by]);continue}const t=[X-bx,Y-by,q[2],q[3],3,q[5],q[6],q[7]==='e'?'x':q[7],q[8],q[9]];t.e=q[7]==='e';t.s=q;px.push(t)}
 if(pose)return{px,tk};v.px=px;v.tpx=tk;mkSet(v);return px}
function vMark(v){if(!VOB||VOB.length!==W*H)VOB=new Uint8Array(W*H);const bx=Math.round(v.x),by=Math.round(v.y);for(const p of v.px){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H)slabG[Y*W+X]=v.id}for(const p of v.tpx||[]){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H)VOB[Y*W+X]=1}}
function vUnmark(v){const bx=Math.round(v.x),by=Math.round(v.y);for(const p of v.px){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H&&slabG[Y*W+X]===v.id)slabG[Y*W+X]=0}if(VOB)for(const p of v.tpx||[]){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H)VOB[Y*W+X]=0}}
// a hit pixel gives its damage back to the hull's own pixel; the core going breaks the engine
function vSettle(v){for(const t of v.px){if(!t.s)continue;if(t[3]<t.s[3])t.s[3]=t[3];if(!v.set.has(K(t[0],t[1]))){t.s.dead=1;if(t.e)vBreach(v)}}v.px=v.px.filter(p=>!p.s.dead);mkSet(v);v.dirty=1}
function vBreach(v){if(v.fuse||v.dead)return;v.fuse=150;sfx('sizzle');sfx('crack');vCharge(v)}
// recorded clips decoded once
const VCLIP={};function vClip(k){if(VCLIP[k])return VCLIP[k];const s=atob(SND64[k][0]),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);const dv=new DataView(u.buffer),n=(u.length-44)/2,b=AC.createBuffer(1,n,dv.getUint32(24,true)),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=dv.getInt16(44+i*2,true)/32768;return VCLIP[k]=b}
// a breached core winds up: the turning drive drone climbing slowly then faster to an octave up, a second drone a shade off beating against it,
// and the fat recorded rumble swelling underneath, all held to the blast
function vCharge(v){if(!AC||mute||!gest)return;const me=[...sel].find(b=>b.type==='token'),d=me?Math.hypot(me.x-v.x,me.y-v.y):120,vol=.8*Math.min(1,70/(d+40)),t=AC.currentTime+.02,D=150/60,ac=AC,dst=MS,g=x=>{const n=ac.createGain();n.gain.value=x;return n};
 const ss=g(.5),sd=ac.createOscillator(),sg=g(.5);sd.frequency.value=13.1;sd.connect(sg).connect(ss.gain);const dg=g(0);ss.connect(dg).connect(dst);const wv=vEngWave(ac,VENG.drive);
 const pts=40,curve=new Float32Array(pts);for(let i=0;i<pts;i++){const u=i/(pts-1);curve[i]=13.65*Math.pow(2,u*u)}
 const mk=(det,amp)=>{const o=ac.createOscillator();o.setPeriodicWave(wv);o.frequency.setValueCurveAtTime(curve.map(f=>f*det),t,D);const k=g(amp);o.connect(k).connect(ss);o.start(t);o.stop(t+D+.1);return k};
 mk(1,1);const b=mk(1.012,0);b.gain.setValueAtTime(0,t);b.gain.linearRampToValueAtTime(.7,t+D);
 dg.gain.setValueAtTime(.0001,t);dg.gain.exponentialRampToValueAtTime(vol*.35,t+.3);dg.gain.exponentialRampToValueAtTime(vol*.85,t+D);dg.gain.setValueAtTime(vol*.85,t+D);dg.gain.exponentialRampToValueAtTime(.0001,t+D+.08);sd.start(t);sd.stop(t+D+.1);
 const rb=ac.createBufferSource();rb.buffer=vClip('vcore');rb.playbackRate.setValueAtTime(1,t);rb.playbackRate.linearRampToValueAtTime(1.12,t+D);const rg=g(0);rb.connect(rg).connect(dst);rg.gain.setValueAtTime(.0001,t);rg.gain.exponentialRampToValueAtTime(vol*.25,t+.3);rg.gain.exponentialRampToValueAtTime(vol*.8,t+D);rg.gain.setValueAtTime(vol*.8,t+D);rg.gain.exponentialRampToValueAtTime(.0001,t+D+.08);rb.start(t);rb.stop(t+D+.1)}
// the alarm bell: the recorded bell's ring looped a touch lower, easing in and out
function vBell(ac,dst){const s=ac.createBufferSource();s.buffer=vClip('vbell');s.loop=true;s.playbackRate.value=.9*.96;const out=ac.createGain();out.gain.value=.0001;const sh=ac.createWaveShaper(),cv=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;cv[i]=Math.tanh(x*1.6)/Math.tanh(1.6)}sh.curve=cv;s.connect(out).connect(sh).connect(dst);s.start();
 const go=(on,T)=>{const t=ac.currentTime,p=s.playbackRate;p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.setTargetAtTime(on?.9:.9*.94,t,T/3);out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(Math.max(.0001,out.gain.value),t);out.gain.setTargetAtTime(on?.85:0,t,T/3.5)};
 return{on(){go(true,1)},off(){go(false,1.4)},stop(){try{s.stop(ac.currentTime+1.6)}catch(e){}}}}
const vInside=(v,lx,ly)=>lx>=VC.X0-1&&lx<VC.X0+VC.IL+1&&ly>=VC.R0-1&&ly<VC.R0+VC.IH+1;
const vAt=(X,Y)=>VEH.find(v=>{const[lx,ly]=vW2L(v,X+.5,Y+.5);return lx>=0&&ly>=0&&lx<VC.L&&ly<VC.H});
const vSeatOf=t=>{for(const v of VEH){const i=v.seats.indexOf(t);if(i>=0)return[v,i]}return null};

// drawing: the floor layer under units, the roof and mist over them; supersampled 2x2 when turned
function vBake(v){for(const t of v.px)if(t.s&&t[3]<t.s[3])t.s[3]=t[3];const n=VC.LW*VC.H;v.bk=(v.bk||0)+1;v.L0=new Uint32Array(n);v.L1=new Uint32Array(n);v.L2=new Uint32Array(n);v.trk=[];
 for(let ly=0;ly<VC.H;ly++)for(let lx=0;lx<VC.LW;lx++){const i=ly*VC.LW+lx,q=v.smap.get(K(lx,ly));if(q&&!q.dead&&(q[7]==='T'||q[7]==='B'))v.trk.push(i,lx,ly,q[7]);const a=vFloorPx(v,lx,ly),r=vRoofPx(v,lx,ly,true),w=vRoofPx(v,lx,ly,false);v.L0[i]=a?a|0xff000000:0;v.L1[i]=r?r|0xff000000:0;v.L2[i]=w?w|0xff000000:0}v.dirty=0;v.fz=v.fuse?(tick>>2)%2:0}
function vDraw(top){for(const v of VEH){if(offView(v.x,v.y,VC.L))continue;if(!v.L0||v.dirty||v.fuse&&(tick>>2)%2!==v.fz)vBake(v);
  if(!top){const t=v.trk;for(let k=0;k<t.length;k+=4){const c=vTrack(v,t[k+1],t[k+2],t[k+3]);v.L0[t[k]]=v.dead?vChar(c,t[k+1],t[k+2],v)|0xff000000:c|0xff000000}}
  if(!top)vOver(v);const LD=top?null:v.LD,L=top?(vRoof(v)?v.L1:v.L2):v.L0,c=Math.cos(v.ang),s=Math.sin(v.ang),LW=VC.LW,LH=VC.H;
  // the sampled footprint and its shadow are kept until the pose, the bake, the tracks or the overlay change
  const key=v.x+','+v.y+','+v.ang+','+(L===v.L1)+','+v.bk+','+v.ph[0]+','+v.ph[1]+','+(top?0:v.ldh),dc=v.dc||(v.dc=[null,null]);let D=dc[top?1:0];
  if(!D||D.k!==key){D=dc[top?1:0]={k:key,J:[],C:[],A:[],SJ:[],SK:[]};
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const[lx,ly]of[[0,0],[LW,0],[0,LH],[LW,LH]]){const[gx,gy]=vL2W(v,lx,ly);x0=Math.min(x0,gx);x1=Math.max(x1,gx);y0=Math.min(y0,gy);y1=Math.max(y1,gy)}
  const crisp=Math.abs(Math.sin(v.ang*2))<1e-3,SUB=crisp?[.5,.5]:[.25,.25,.75,.25,.25,.75,.75,.75],ns=SUB.length/2,PX=VC.PX,PY=VC.PY;
  // a 3px drop shadow to the right and below, like a wall's, from a footprint mask
  const bx=Math.max(0,Math.floor(x0)),by=Math.max(0,Math.floor(y0)),ex=Math.min(W-1,Math.ceil(x1)+3),ey=Math.min(H-1,Math.ceil(y1)+3),mw=ex-bx+1,M=new Uint8Array(mw*(ey-by+1));
  for(let Y=by;Y<=ey;Y++)for(let X=bx;X<=ex;X++){let r=0,g=0,b=0,n=0;
   for(let k=0;k<SUB.length;k+=2){const dx=X+SUB[k]-v.x,dy=Y+SUB[k+1]-v.y,lx=Math.floor(PX+dx*c+dy*s),ly=Math.floor(PY-dx*s+dy*c);if(lx<0||ly<0||lx>=LW||ly>=LH)continue;const col=LD&&LD[ly*LW+lx]||L[ly*LW+lx];if(!col)continue;r+=col&255;g+=col>>8&255;b+=col>>16&255;n++}
   if(!n)continue;M[(Y-by)*mw+X-bx]=1;D.J.push(Y*W+X);D.C.push(rgb(r/n|0,g/n|0,b/n|0));D.A.push(n/ns)}
  if(!top)for(let Y=by;Y<=ey;Y++)for(let X=bx;X<=ex;X++){const i=(Y-by)*mw+X-bx;if(M[i]||sol[Y*W+X])continue;const m=(x,y)=>x>=0&&y>=0&&M[y*mw+x],x=X-bx,y=Y-by;
   const k=m(x-1,y)||m(x,y-1)?.62:m(x-2,y)||m(x,y-2)||m(x-1,y-1)?.74:m(x-3,y)||m(x,y-3)||m(x-2,y-1)||m(x-1,y-2)?.87:0;if(k){D.SJ.push(Y*W+X);D.SK.push(k)}}}
  for(let i=0;i<D.J.length;i++){const j=D.J[i],a=D.A[i];out[j]=a===1?D.C[i]:mix(out[j],D.C[i],a)}
  for(let i=0;i<D.SJ.length;i++){const j=D.SJ[i];out[j]=mul(out[j],D.SK[i])}
  if(!top){vGlow(v);for(const b of bodies)if((b.stuck&&!b.att||b.fallen)&&b.type!=='slab'&&vNear(v,b))drawBody(b)}
  if(top)vPuffs(v,L===v.L1)}}
// overlay in the hull's frame: the door leaves at their slide, with the seams of a door, and the core lit by the engine's power
function vOver(v){const LW=VC.LW;if(!v.LD||v.LD.length!==LW*VC.H)v.LD=new Uint32Array(LW*VC.H);else for(const i of v.ldI||[])v.LD[i]=0;const used=[],put=(x,y,c)=>{if(x<0||y<0||x>=LW||y>=VC.H)return;const i=y*LW+x;v.LD[i]=c|0xff000000;used.push(i)};
 for(const d of v.doors||[]){if(d.fallen||!bodies.includes(d))continue;const{ax,ay,a}=d.vdoor,sl=Math.round(Math.min(1,Math.abs(d.ang)/1.4)*((d.len||16)-3)),cells=new Map();
  for(const q of d.px){if(d.set.get(K(q[0],q[1]))!==q)continue;const dx=q[8]-sl,dy=q[9],x=a>0?ax-dy:ax+dy,y=a>0?ay+dx:ay-dx;cells.set(K(x,y),q)}
  for(const[k,q]of cells){const x=Math.floor(k/1024)-512,y=k%1024-512,r=!cells.has(K(x+1,y))||!cells.has(K(x,y+1)),l=!cells.has(K(x-1,y))||!cells.has(K(x,y-1));const c0=pcol(d,q);put(x,y,r?mul(c0,.5):l?mul(c0,.8):c0)}}
 for(const t of v.px)if(t[5]>.01&&t.s&&t[7]!=='x'){if(t[5]*.6>(t.s.tm||0)+.08){t.s.tm=t[5]*.6;v.dirty=1}const q=t.s,c0=q[3]<q[6]||t[3]<q[6]?mul(q[2],.6+.4*Math.min(q[3],t[3])/q[6]):q[2];put(q[8],q[9],mix(c0,glow(t[5]),Math.min(1,t[5]*1.6)))}
 const g=v.glow||0;if(g>.01)for(const q of v.src)if(q[7]==='e'&&!q.dead){const c=q[2],br=(c&255)+(c>>8&255)>300;put(q[8],q[9],mix(c,br?rgb(255,250,255):rgb(206,150,255),Math.min(.85,g*(br?.9:.6))))}
 let h=0;for(const i of used)h=h*31+i+v.LD[i]|0;v.ldh=h;v.ldI=used}
// the core's light spills over the floor around it, strongest when the engine works hardest
function vGlow(v){const g=v.glow||0;if(g<.02||v.dead)return;const[cx,cy]=vL2W(v,VC.XST+8,VC.R0+VC.IH-8),R=28,col=rgb(190,130,255);
 for(let Y=Math.max(0,Math.floor(cy-R));Y<=Math.min(H-1,cy+R);Y++)for(let X=Math.max(0,Math.floor(cx-R));X<=Math.min(W-1,cx+R);X++){const d=Math.hypot(X-cx,Y-cy)/R;if(d>=1)continue;const[lx,ly]=vW2L(v,X+.5,Y+.5);if(!vInside(v,lx,ly))continue;const j=Y*W+X,a=Math.min(.85,g*.9*(1-d)*(1-d)+g*.12*(1-d));out[j]=mix(out[j],col,a)}}
const vNear=(v,b)=>{if(Math.abs(b.x-v.x)>90||Math.abs(b.y-v.y)>90)return false;const[lx,ly]=vW2L(v,b.x,b.y);return lx>=-14&&ly>=-14&&lx<VC.L+14&&ly<VC.H+14};
function vFloorPx(v,lx,ly){const q=v.smap.get(K(lx,ly));let c=0;
 if(q&&!q.dead){c=vScarC(v,q);c=q[7]==='T'||q[7]==='B'?vTrack(v,lx,ly,q[7]):q[7]==='e'&&v.fuse&&(tick>>2)%2?VPB:c;if(q[3]<q[6]&&q[7]!=='e')c=mul(c,.6+.4*q[3]/q[6])}
 if(!c){const b=v.base[ly*VC.LW+lx];c=b?b&0xffffff:0}
 return c&&v.dead?vChar(c,lx,ly,v):c}
function vRoofPx(v,lx,ly,roof){const r=roof&&v.roofL[ly*VC.LW+lx];if(r)return vRoofC(v,ly*VC.LW+lx,lx,ly,r&0xffffff);const q=v.smap.get(K(lx,ly));return q&&!q.dead&&(q[7]==='w'||q[7]==='g')?vFloorPx(v,lx,ly):0}
function vScarC(v,q){let c=q[2];if(q.wr>.5){const cd=Math.max(1,5-Math.floor(q.wr)),A=ageOf('Metal',v.metal,cd);if(A){const r=A([c&255,c>>8&255,c>>16&255],q[8]*2+v.id*37,q[9]*2,()=>9);c=rgb(cl(r[0]),cl(r[1]),cl(r[2]))}}
 if(q.lip)c=mul(c,1.3);if(q.tm>.02){const f=temperF(q.tm),f0=temperF(0);c=rgb(cl((c&255)*f[0]/f0[0]),cl((c>>8&255)*f[1]/f0[1]),cl((c>>16&255)*f[2]/f0[2]))}return c}
function vScar(v,X,Y,amt,heat){const[lx,ly]=vW2L(v,X+.5,Y+.5),R=3;let ch=false;for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const q=v.smap.get(K(Math.floor(lx)+i,Math.floor(ly)+j));if(!q||q[7]==='T'||q[7]==='B')continue;const d=Math.hypot(i,j)/(R+1);if(d>=1)continue;const w=amt*(1-d);q.wr=Math.min(4.5,(q.wr||0)+w);if(heat){const t=Math.min(.85,heat*(1-d));if(t>(q.tm||0)){q.tm=t}}ch=true}if(ch)v.dirty=1}
function vHeatMark(x,y,r,k){for(const v of VEH){if(Math.hypot(v.x-x,v.y-y)<VC.L*.6+r)vRoofAt(v,x,y,r,(i,d,lx,ly)=>{v.rt[i]=Math.max(v.rt[i],Math.min(.85,k*(1-d)*(.85+.3*hh(lx,ly,71))))});const[lx,ly]=vW2L(v,x,y);if(lx<-r||ly<-r||lx>VC.LW+r||ly>VC.H+r)continue;for(let j=-Math.ceil(r);j<=r;j++)for(let i=-Math.ceil(r);i<=r;i++){const q=v.smap.get(K(Math.floor(lx)+i,Math.floor(ly)+j));if(!q)continue;const d=Math.hypot(i,j);if(d>r)continue;const a=Math.min(.85,k*(1-d/r)*(.85+.3*hh(q[8],q[9],71)));if(a>(q.tm||0)){q.tm=a;v.dirty=1}}}}
const vChar=(c,x,y,v)=>{const h=v&&v.hole,k=h?Math.max(0,1-Math.hypot(x-h[0],y-h[1])/30):1;return k>0?mix(c,rgb(30,26,24),Math.min(.6,(.4+.25*hh(x>>1,y>>1,41))*k)):c};
function vTrack(v,x,y,w){const t=w==='T'?y:y-(VC.H-VC.TR),ph=Math.floor(v.ph[w==='T'?0:1]),e=t===0||t===VC.TR-1,lk=((x-ph)%4+4)%4===0;return e?rgb(30,30,32):lk?rgb(78,78,80):t===2?rgb(56,56,58):rgb(46,46,48)}
// the roof hides the crew unless a selected unit is aboard (V switches back to the roof)
function vRoof(v){for(const t of sel)if(t.type==='token'&&vHas(v,t))return!!v.ext;return true}
// V from a seat: switch between seeing the interior and the roof
var VBRK=false;
function vKeyBrake(down){const t=[...sel].find(b=>b.type==='token'&&b.vseat);if(!t||t.vseat.seats[0]!==t){VBRK=false;return false}VBRK=down;return true}
function vBrakeHiss(v){const s=VSND.get(v.id);if(!s||!AC)return;vHiss(AC,s.g,AC.currentTime+.01,.7,5200,2600,.16*Math.min(1,Math.abs(v.sp)/.3+.4),.03)}
function vKeyX(){const t=[...sel].find(b=>b.type==='token'&&b.vseat);if(!t||t.vseat.seats[0]!==t||t.vseat.dead)return false;t.vseat.bell=!t.vseat.bell;sfx('flick');return true}
function vKeyV(){const t=[...sel].find(b=>b.type==='token'&&b.vseat);if(!t)return false;t.vseat.ext=!t.vseat.ext;sfx('flick');return true}
function vHas(v,t){if(v.seats.includes(t))return true;const[lx,ly]=vW2L(v,t.x,t.y);return vInside(v,lx,ly)}

// mist from the roof grille: musket-like puffs, thicker while driving, fading after the engine stops
function vPuffs(v,all){for(const p of v.puffs){if(!all&&!p.out)continue;const R=Math.ceil(p.r);for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const d=Math.hypot(i,j)/p.r;if(d>1)continue;const X=Math.round(p.x+i),Y=Math.round(p.y+j);if(X<0||Y<0||X>=W||Y>=H)continue;const a=p.a*(1-d*d)*(.65+.35*hh(X+p.sd,Y,7));if(a>.01)out[Y*W+X]=mix(out[Y*W+X],p.c,Math.min(.8,a))}}}
// steam vents out of the engine side as it starts and stops, like a train's, a short way and no more
function vSide(v){if(v.dead)return;const st=v.on&&tick-v.onT>=VIGN-6&&tick-v.onT<VIGN+36,sd=!v.on&&v.offT>4&&v.offT<110;if(!(st||sd)||tick%2)return;const k=st?1:1-v.offT/110,c=Math.cos(v.ang),s=Math.sin(v.ang);
 const[gx,gy]=vL2W(v,VC.XST+3+Math.random()*10,VC.H+1),sp=.35+Math.random()*.25;v.puffs.push({x:gx,y:gy,vx:-s*sp+(Math.random()-.5)*.1,vy:c*sp+(Math.random()-.5)*.1,r:1.5,gr:.16,a:.5*k,c:rgb(186,188,194),sd:Math.random()*99|0,R:10,out:1})}
function vMist(v){if(v.on&&tick-v.onT>=VIGN&&tick%900===0)vVentSoot(v,.004);{const lt=v.on&&tick-v.onT>=VIGN,gt=lt?Math.min(1,.4+.6*Math.max(Math.abs(v.sp)/.378,Math.abs(v.w)/.0028)):0;v.glow=(v.glow||0)+(gt-(v.glow||0))*(gt>(v.glow||0)?.05:.02)}
 const run=Math.abs(v.sp)>.05||Math.abs(v.w)>.001,lit=v.on&&tick-v.onT>=VIGN,pw=lit?1:v.on?0:Math.max(0,1-v.offT/180);
 if(!v.dead&&(v.on&&tick-v.onT>=VIGN&&tick-v.onT<VIGN+50||!v.on&&v.offT<150)&&tick%3===0){const[gx,gy]=vL2W(v,VC.XST+5.5+Math.random()*5,VC.R0+VC.IH-16+(Math.random()<.5?6.5:9.5));v.puffs.push({x:gx,y:gy,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:2,gr:.2,a:v.on?.5:.36*(1-v.offT/150),c:rgb(150,152,158),sd:Math.random()*99|0,R:v.on?16:20})}
 if(pw>0&&!v.dead&&tick%(run?2:6)===0){const[gx,gy]=vL2W(v,VC.XST+5.5+Math.random()*5,VC.R0+VC.IH-16+(Math.random()<.5?6.5:9.5)),k=.55+Math.random()*.45;v.puffs.push({x:gx,y:gy,vx:(Math.random()-.5)*.12,vy:(Math.random()-.5)*.12-.03,r:2.5,gr:run?.16:.1,a:(run?.52:.42)*pw,c:rgb(52*k+20|0,50*k+20|0,54*k+22|0),sd:Math.random()*99|0,R:run?18:12})}
 if(v.fuse&&tick%5===0){const[cx,cy]=vL2W(v,VC.XST+8,VC.RC[2]+.5),a=Math.random()*6.283,r=4+Math.random()*(10+(150-v.fuse)/8);zaps.push({x0:cx,y0:cy,x1:cx+Math.cos(a)*r,y1:cy+Math.sin(a)*r,l:3,b:false});if(Math.random()<.4)sfx('zap')}
 if(v.fuse&&tick%2===0){const[gx,gy]=vL2W(v,VC.XST+8,VC.RC[2]);v.puffs.push({x:gx,y:gy,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:2,gr:.18,a:.55,c:rgb(34,32,34),sd:Math.random()*99|0,R:14})}
 vSide(v);if(v.dead&&tick-v.burnT<420&&tick%3===0){const[hx,hy]=vL2W(v,v.hole[0]+(Math.random()-.5)*16,v.hole[1]+(Math.random()-.5)*12),f=1-(tick-v.burnT)/420;v.puffs.push({x:hx,y:hy,vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2-.05,r:3,gr:.22,a:.6*f,c:rgb(30,28,28),sd:Math.random()*99|0,R:22,out:1});if(Math.random()<f*.6)emberPatch(hx,hy,3,4)}
 for(const p of v.puffs){p.x+=p.vx;p.y+=p.vy;p.r+=p.gr;p.a*=.992;if(p.out){p.vx*=.95;p.vy*=.95}if(p.r>p.R*.7)p.a*=.95}v.puffs=v.puffs.filter(p=>p.r<p.R&&p.a>.02)}
// track marks: the tread pattern pressed faintly into the ground, only while moving
function vMarks(v,d){if(d<.02)return;const k=Math.min(1,Math.abs(v.sp)/.25+.3);for(const w of['T','B']){const y0=w==='T'?0:VC.H-VC.TR,ph=Math.floor(v.ph[w==='T'?0:1]);for(const x of[4,5,6,7,8,VC.L-9,VC.L-8,VC.L-7,VC.L-6,VC.L-5])for(const t of[1,3]){const[gx,gy]=vL2W(v,x+.5,y0+t+.5),X=Math.floor(gx/2),Y=Math.floor(gy/2);if(X<0||Y<0||X>=BW||Y>=BH)continue;const q=Y*BW+X,lk=((x-ph)%4+4)%4<2;BURN[q]=Math.max(BURN[q],(lk?.144:.096)*k*(.85+.15*hh(X,Y,9)))}}fxDirty=true}

// driving: slow to start, slow to stop, slow to turn; the tracks run with the ground and counter-run to pivot
function vTick(){if(!VEH.length){if(VGP)VGP.style.display='none';return}if(tick%3===0)vAI();for(const v of VEH){const dv=vDriver(v);if(v.seats[0]&&!dv)v.seats[0]=null;if(v.chest){const c=byId(v.chest);if(c)vChestPos(v,c)}
  for(let i=0;i<v.seats.length;i++){const t=v.seats[i];if(t&&(!bodies.includes(t)||t.status==='dead')){if(t.status==='dead'&&bodies.includes(t)){t.vseat=null}v.seats[i]=null}}
  const on=!!dv&&!v.dead;if(on!==!!v.on){v.on=on;if(on)v.onT=tick;else v.offT=0}if(!v.on)v.offT++;
  let thr=0,turn=0;v.tin=0;if(v.on&&tick-v.onT>=VIGN+30){if(dv.direct&&sel.has(dv)){thr=(keys.has('w')?1:0)-(keys.has('s')?1:0);turn=(keys.has('d')?1:0)-(keys.has('a')?1:0)}else if(v.ai){thr=v.ai.thr;turn=v.ai.turn}}
  v.tin=Math.abs(turn);
  // speed and turn ease in: the push itself builds up before it reaches full strength
  // off the throttle it coasts, slowed only by the tracks; Shift brakes hard with a hiss of air
  const brk=v.on&&dv&&dv.direct&&sel.has(dv)&&VBRK;if(brk&&!v.brk&&Math.abs(v.sp)>.05)vBrakeHiss(v);v.brk=brk;
  const ts=thr>0?.378:thr<0?-.198:0,am=brk?.012:thr?.004:.0022,aT=brk||!thr?Math.max(-am,Math.min(am,-v.sp*(brk?.3:.06))):Math.max(-am,Math.min(am,(ts-v.sp)*.08));v.acc+=Math.max(-(brk?.002:.00015),Math.min(brk?.002:.00015,aT-v.acc));v.sp+=v.acc;if(Math.abs(v.sp)<.0015&&!thr&&Math.abs(v.acc)<.0003){v.sp=0;v.acc=0}
  const tw=turn*.0028,wm=.000175*(turn?1:1.6),wT=Math.max(-wm,Math.min(wm,(tw-v.w)*.06));v.alp+=Math.max(-.000006,Math.min(.000006,wT-v.alp));v.w+=v.alp;if(Math.abs(v.w)<.00015&&!turn&&Math.abs(v.alp)<.00002){v.w=0;v.alp=0}
  if(v.sp||v.w)vMove(v);
  v.ph[0]+=v.sp-v.w*VC.PY;v.ph[1]+=v.sp+v.w*VC.PY;
  if(v.ext&&![...sel].some(b=>b.type==='token'&&v.seats.includes(b)))v.ext=false;
  vPin(v);vMist(v);vWalkers(v);if(v.fuse&&--v.fuse===0)vBlow(v)}
 vPrompt();if(tick%2===0)vSound()}
function vMove(v){const n={x:v.x-Math.cos(v.ang)*v.sp,y:v.y-Math.sin(v.ang)*v.sp,ang:v.ang+v.w};
 const tryPose=P=>{const o=vOrient(v,P),bx=Math.round(P.x),by=Math.round(P.y),cells=new Set();for(const p of[...o.px,...o.tk]){const X=bx+p[0],Y=by+p[1];if(X<1||Y<1||X>=W-1||Y>=H-1)return null;const j=Y*W+X;if((sol[j]||OBJ[j])&&!vHedge(X,Y)||slabG[j]&&slabG[j]!==v.id&&!v.dids.has(slabG[j])){const sb=slabG[j]&&byId(slabG[j]);hitM=sol[j]===3||!!sb&&(sb.veh||sb.mat===3);return null}cells.add(j)}return{px:o.px,tk:o.tk,cells}};let hitM=false;
 let P=n,r=tryPose(n);if(!r&&v.w){P={x:n.x,y:n.y,ang:v.ang};r=tryPose(P);if(r)v.w=0}if(!r&&v.sp){P={x:v.x,y:v.y,ang:n.ang};r=tryPose(P);if(r)v.sp=0}
 // a bump: metal rings like any metal contact, anything else thuds; no damage at these speeds
 if(!r){if((Math.abs(v.sp)>.05||Math.abs(v.w)>.0008)&&tick-(v.bumpT||0)>24){v.bumpT=tick;if(hitM){sfx('chink');sfx('clank')}else sfx('thunk')}v.sp=0;v.w=0;v.acc=0;v.alp=0;return}
 // units outside in the way are shoved; one that can't give stops the carrier
 const carried=bodies.filter(b=>(b.type==='token'||b.type==='weapon'||b.vdoor&&b.fallen)&&!inDrag(b)&&(v.seats.includes(b)||(()=>{const[lx,ly]=vW2L(v,b.x,b.y);return vInside(v,lx,ly)||(b.stuck||b.wedged||b.att)&&b.type==='weapon'&&lx>=-6&&ly>=-6&&lx<VC.L+6&&ly<VC.H+6})()));
 for(const b of bodies){if(b.type!=='weapon'||carried.includes(b)||b.stuck||inDrag(b)||Math.abs(b.x-P.x)>90||Math.abs(b.y-P.y)>90)continue;const[lx,ly]=vW2L(P,b.x,b.y);if(lx<-2||ly<-2||lx>VC.L+2||ly>VC.H+2)continue;const dy=ly<VC.PY?-1:1,[nx,ny]=vL2W(P,lx,dy<0?-4:VC.H+4);b.x=nx;b.y=ny;b.vx=b.vy=0}
 for(const t of bodies){if(t.type!=='token'||carried.includes(t)||Math.abs(t.x-P.x)>90||Math.abs(t.y-P.y)>90)continue;const tx=Math.round(t.x),ty=Math.round(t.y);let hit=false;for(const p of t.px){if(p[0]*p[0]+p[1]*p[1]>45)continue;if(r.cells.has((ty+p[1])*W+tx+p[0])){hit=true;break}}if(!hit)continue;
  const[ax,ay]=vL2W({...v,...P},...vW2L(v,t.x,t.y)),mx=ax-t.x,my=ay-t.y,ml=Math.hypot(mx,my)||1,ox=t.x-P.x,oy=t.y-P.y,ol=Math.hypot(ox,oy)||1;moveToward(t,t.x+mx/ml*(ml+.8)+ox/ol*.6,t.y+my/ml*(ml+.8)+oy/ol*.6);
  const tx2=Math.round(t.x),ty2=Math.round(t.y);for(const p of t.px){if(p[0]*p[0]+p[1]*p[1]>45)continue;if(r.cells.has((ty2+p[1])*W+tx2+p[0])){v.sp=0;v.w=0;return}}if(t.status==='free'&&Math.abs(v.sp)>.3&&tick%20===0)sfx('pthud')}
 const old={x:v.x,y:v.y,ang:v.ang},moved=Math.hypot(P.x-v.x,P.y-v.y);
 for(const b of carried){const[lx,ly]=vW2L(old,b.x,b.y),[nx,ny]=vL2W(P,lx,ly);b.x=nx;b.y=ny;if(b.ang!==undefined&&b.type!=='slab')b.ang+=P.ang-old.ang;if(b.type==='weapon'&&b.stuck&&typeof reshape==='function')reshape(b,b.ang)}
 vUnmark(v);
 v.x=P.x;v.y=P.y;v.ang=P.ang;v.px=r.px;v.tpx=r.tk;mkSet(v);vMark(v);vDoorPose(v);vHedges(v);vMarks(v,moved+Math.abs(P.ang-old.ang)*30);v.odo=(v.odo||0)+moved;if(v.odo>4000){v.odo=0;vWeather(v,.03)}v.still=0;NAVD=true}
function vPin(v){v.seats.forEach((t,i)=>{if(!t)return;const[x,y]=vSit(i),[gx,gy]=vL2W(v,x,y);t.x=gx;t.y=gy;t.vx=t.vy=0;t.ang=v.ang+VSEATS[i][2];t.vseat=v;t.crouch=false})}
function vRefresh(v){v.dirty=1;vUnmark(v);vOrient(v);vMark(v);vDoorPose(v);NAVD=true}
// hedges give under the tracks: the carrier rides over them, and a hedge it has wholly passed over is a step more trampled
const vHK=(cx,cy)=>OM[cy]&&OM[cy][cx]||null;
const vHedge=(X,Y)=>!!vHK(X>>4,Y>>4)&&!sol[Y*W+X];
function vHedges(v){const now=new Set(),R=80,cx0=Math.max(0,(v.x-R)>>4),cx1=Math.min(CW-1,(v.x+R)>>4),cy0=Math.max(0,(v.y-R)>>4),cy1=Math.min(CH-1,(v.y+R)>>4);
 for(let cy=cy0;cy<=cy1;cy++)for(let cx=cx0;cx<=cx1;cx++){const k=vHK(cx,cy);if(!k)continue;let n=0;for(let j=0;j<4;j++)for(let i=0;i<4;i++){const[lx,ly]=vW2L(v,cx*T+2+i*4,cy*T+2+j*4);if(lx>=0&&ly>=0&&lx<VC.L&&ly<VC.H)n++}
  const id=cy*CW+cx;if(n>0)now.add(id);if(n>8&&!v.hov.has(id)&&!/^hedge(~\d)?$/.test(k)){const e=objEl(k);if(e){wearObj(cx,cy,18/softOf(e[0],e[1]));sfx(e[0]==='Metal'?'clank':'crack')}v.hov.add(id)}
  else if(n>8&&!v.hov.has(id)){const m=k==='hedge'?3:Math.max(1,+k.slice(6)-2),nk='hedge~'+m,f=fmat(nk);OM[cy][cx]=nk;for(let y=0;y<T;y++)for(let x=0;x<T;x++){const X=cx*T+x,Y=cy*T+y,j=Y*W+X,c=TEX[nk](X,Y,cx,cy);OBJ[j]=c?f:0;if(c)OBJC[j]=rgb(cl(c[0]),cl(c[1]),cl(c[2]))}sfx('rustle');v.hov.add(id)}}
 for(const c of [...v.hov])if(!now.has(c))v.hov.delete(c)}

// the roof plates wear with the hull beneath them (scars, temper, chipped armour), plus their own blast wear, soot and dents
function vRW(v){if(!v.rw){const n=VC.LW*VC.H;v.rw=new Float32Array(n);v.rt=new Float32Array(n);v.rs=new Float32Array(n);v.rd=new Float32Array(n);v.rr=new Float32Array(n)}return v}
function vRoofC(v,i,lx,ly,c){const q=v.smap.get(K(lx,ly)),a=q&&(q[7]==='w'||q[7]==='g');if(a&&q.dead)return 0;
 c=vScarC(v,{2:c,8:lx,9:ly,wr:Math.max(v.rw?v.rw[i]:0,q&&q.wr||0),tm:Math.max(v.rt?v.rt[i]:0,q&&q.tm||0)});
 if(v.rs&&v.rs[i]>.01)c=mix(c,rgb(30,28,26),Math.min(.7,v.rs[i]));if(v.rd&&v.rd[i])c=mul(c,1+v.rd[i]);if(v.rr&&v.rr[i]>.01)c=mix(c,mul(rgb(146,78,44),.8+.4*hh(lx,ly,29)),v.rr[i]);return a&&q[3]<q[6]?mul(c,.6+.4*q[3]/q[6]):c}
function vRoofAt(v,x,y,r,f){vRW(v);const[cx,cy]=vW2L(v,x,y);for(let ly=Math.max(0,Math.floor(cy-r));ly<=Math.min(VC.H-1,cy+r);ly++)for(let lx=Math.max(0,Math.floor(cx-r));lx<=Math.min(VC.LW-1,cx+r);lx++){const i=ly*VC.LW+lx;if(!v.roofL[i])continue;const d=Math.hypot(lx-cx,ly-cy)/r;if(d<1)f(i,d,lx,ly,lx-cx,ly-cy)}v.dirty=1}
// a blast nearby: soot and wear on the plates in reach, a dent on the side nearest it
function vBlastWear(x,y,s){for(const v of VEH){if(Math.hypot(v.x-x,v.y-y)>VC.L*.6+24*s)continue;vRoofAt(v,x,y,34*s,(i,d,lx,ly)=>{const n=.6+.7*hh(lx>>1,ly>>1,77+v.id),r=Math.random();v.rw[i]=Math.min(4.5,v.rw[i]+2.6*s*(1-d)*n);v.rs[i]=Math.min(.7,v.rs[i]+1.3*s*Math.pow(1-d,1.5)*n);v.rt[i]=Math.max(v.rt[i],.5*s*(1-d)*(1-d));if(r<.07*(1-d)){v.rw[i]=4.5;v.rd[i]-=.25}});
  const[cx,cy]=vW2L(v,x,y),px=Math.max(VC.X0,Math.min(VC.L-2,cx)),py=Math.max(VC.TR+2,Math.min(VC.H-VC.TR-3,cy));if(Math.hypot(px-cx,py-cy)<14*s){const[dx,dy]=vL2W(v,px,py);vRoofAt(v,dx,dy,6*s,(i,d,lx,ly,ox,oy)=>{v.rd[i]+=.2*((ox+oy)/(6*s))*(1-d)})}}}
// weathering: patches of the plates age with distance driven
function vWeather(v,k,th=.35){vRW(v);for(let ly=0;ly<VC.H;ly++)for(let lx=0;lx<VC.LW;lx++){const i=ly*VC.LW+lx;if(!v.roofL[i])continue;const n=hh(lx>>3,ly>>3,51+v.id)*.6+hh(lx>>1,ly>>1,53)*.4;v.rw[i]=Math.min(4.5,v.rw[i]+k*Math.max(0,n-th)*3)}v.dirty=1}
// rust taking a neglected hull: soft blooms from smooth noise, thicker where water sits along the seams and rim
function vRust(v,seed){vRW(v);const sm=(x,y,s,k)=>{const fx=x/s,fy=y/s,ix=Math.floor(fx),iy=Math.floor(fy),u=fx-ix,w=fy-iy,a=hh(ix,iy,k),b=hh(ix+1,iy,k),c=hh(ix,iy+1,k),e=hh(ix+1,iy+1,k);return(a+(b-a)*u)*(1-w)+(c+(e-c)*u)*w};
 for(let ly=0;ly<VC.H;ly++)for(let lx=0;lx<VC.LW;lx++){const i=ly*VC.LW+lx;if(!v.roofL[i])continue;const n=sm(lx,ly,9,seed)*.65+sm(lx,ly,3,seed+1)*.35,e=Math.min(lx-VC.X0,VC.X0+VC.IL-lx,ly-VC.R0,VC.R0+VC.IH-ly);v.rr[i]=Math.min(.7,Math.max(0,n-.42)*2.2+(e<3?.25:0)*hh(lx,ly,seed+2))}v.dirty=1}
// exhaust soot settles behind the roof vent the longer the engine runs
function vVentSoot(v,k){const[x,y]=vL2W(v,VC.XST+8,VC.RC[2]);vRoofAt(v,x,y,70,(i,d,lx,ly,ox,oy)=>{if(ox<2)return;const w=3+ox*.06;if(Math.abs(oy)>w)return;v.rs[i]=Math.min(.6,v.rs[i]+k*(1-ox/70)*(1-Math.abs(oy)/(w+1))*(.5+.7*hh(lx>>2,ly,91)))})}
// condition at spawn, played out through the same scars, hits, blasts and soot a carrier collects in use; seeded so it reloads the same
const VCOND={new:0,service:1,veteran:2,battleworn:3,derelict:4};
function vCondition(v,tier,seed){const lv=VCOND[tier]||0;v.cond=[tier,seed];if(!lv)return;let z=seed*9301+49297;const rnd=()=>(z=(z*9301+49297)%233280)/233280;
 const W2=(lx,ly)=>{const[x,y]=vL2W(v,lx+.5,ly+.5);return[Math.floor(x),Math.floor(y)]},sideY=top=>top?VC.TR:VC.H-VC.TR-1,HP=mprop('Metal',v.metal).hp;
 vWeather(v,[0,1.6,2.6,3.5,6][lv],lv>3?.05:.35);if(lv>3)vRust(v,seed);vVentSoot(v,[0,.12,.3,.55,.7][lv]);
 for(let i=0;i<[0,4,10,14,24][lv];i++){const top=rnd()<.5,[X,Y]=W2(VC.X0+rnd()*VC.IL,sideY(top));vScar(v,X,Y,.6+rnd()*lv*.5)}
 // blasts: beside the hull for a veteran, one on the roof for the battleworn
 for(let i=0;i<[0,0,2,2,4][lv];i++){const top=rnd()<.5,on=lv>2&&i===0,[x,y]=vL2W(v,VC.X0+10+rnd()*(VC.IL-20),on?VC.R0+6+rnd()*(VC.IH-12):top?-1-rnd()*3:VC.H+1+rnd()*3),s=lv>2?.8:.7;vBlastWear(x,y,s);vHeatMark(x,y,15*s,.45*s)}
 // bursts of fire chip the side armour: real hits, so it is weaker where they landed
 if(lv>=2){for(let b=0;b<[0,0,1,3,5][lv];b++){const top=rnd()<.5,cx=VC.X0+8+rnd()*(VC.IL-16),n=lv>2?4+Math.floor(rnd()*5):2;
  for(let i=0;i<n;i++){const lx=Math.round(cx+(rnd()-.5)*18),deep=lv>2&&rnd()<.6?2:1,pw=HP*(lv>2?1.1:.5);for(let d=0;d<deep;d++)for(let w=-1;w<=1;w++){const[X,Y]=W2(lx+w,top?VC.TR+d:VC.H-VC.TR-1-d);hitPix(v,X,Y,pw*(w?.7:1)*(1-d*.3))}const[X,Y]=W2(lx,sideY(top));vScar(v,X,Y,1.4+rnd(),rnd()*.35)}}vSettle(v)}
 v.dirty=1}

// the chest over the engine is a real chest in the hull's metal, holding the carrier's stores; it rides with the hull
const VCHEST={steel:'schest',iron:'mchest',brass:'bchest',gold:'gchest',umbra:'uchest'};
const VSUP=()=>[{k:'cell',n:1},{k:'mbox',n:2},{k:'rbox',n:2},{k:'grenade',n:2},{k:'pistol',n:1}];
function vMkChest(v,items){const c=weapon('crate',v.x,v.y,0),k=VCHEST[v.metal]||'schest';c.px=[];mkSet(c);Object.assign(c,{hidden:true,mass:1e9,chest:true,vchest:v.id,metal:true,inv:[],n0:1,name:MCHEST[k][1],ck:k,cells:[[-10,-10],[-9,-10],[-8,-10],[-7,-10],[-10,-9],[-9,-9],[-8,-9],[-7,-9]]});vChestPos(v,c);cFill(c,items);v.chest=c.id;return c}
function vChestPos(v,c){const p=[[0,0],[16,0],[0,16],[16,16]].map(([x,y])=>vL2W(v,VC.XST+x,VC.R0+y)),xs=p.map(q=>q[0]),ys=p.map(q=>q[1]);c.x=(Math.min(...xs)+Math.max(...xs))/2;c.y=(Math.min(...ys)+Math.max(...ys))/2;c.vx=c.vy=0;c.box=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]}
// the chest as a map chest of that metal looks: its plate, a bevelled rim, and the raised corner brackets
function vChestPx(mat){const tx=TEX[VCHEST[mat]||'schest'],P=new Uint32Array(256),L=rgb(255,255,255);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const q=tx(x,y,0,0);let c=rgb(cl(q[0]),cl(q[1]),cl(q[2]));const e=[x,y,15-x,15-y],d=Math.min(...e);if(d===0)c=mul(c,e.indexOf(0)<2?1.15:.62);else if(d===1)c=mul(c,e.indexOf(1)<2?1.08:.82);P[y*16+x]=c}
 for(const[cx,cy,sx,sy]of[[2,2,1,1],[13,2,-1,1],[2,13,1,-1],[13,13,-1,-1]]){const arm=[];for(let i=0;i<4;i++)arm.push([cx+sx*i,cy,i],[cx,cy+sy*i,i]);const on=new Set(arm.map(([x,y])=>y*16+x));for(const[x,y]of arm){const q=(y+sy)*16+x+sx;if(!on.has(q))P[q]=mul(P[q],.82)}for(const[x,y,i]of arm)P[y*16+x]=mix(P[y*16+x],L,i<3?.5:.25)}return P}
// the chest under the cursor, when the hull's inside is in view
function vChestAt(X,Y){for(const v of VEH){if(!v.chest||vRoof(v))continue;const[lx,ly]=vW2L(v,X+.5,Y+.5);if(lx<VC.XST||lx>=VC.XST+16||ly<VC.R0||ly>=VC.R0+16)continue;const q=v.smap.get(K(lx|0,ly|0)),c=byId(v.chest);if(q&&!q.dead&&c)return c}return null}


// boarding and leaving: units walk set waypoints through the rear doors to a seat, or out behind the carrier
function vFree(v,role){const res=new Set(bodies.filter(t=>t.vwalk&&t.vwalk.v===v).map(t=>t.vwalk.i));for(let i=0;i<VSEATS.length;i++)if(!v.seats[i]&&!res.has(i)&&(role?VSEATS[i][3]===role:VSEATS[i][3]==='p'))return i;return -1}
function vBoard(v,t,i){if(i===undefined){i=vFree(v);if(i<0)i=[1,0].find(k=>!v.seats[k]&&!bodies.some(o=>o.vwalk&&o.vwalk.v===v&&o.vwalk.i===k))??-1}if(i<0)return false;const[sx]=VSEATS[i],front=i<2,path=[[VC.L+14,VC.CY],[VC.L-14,VC.CY]];if(front)path.push([VC.XP+12,VC.CY],[VC.XP-6,VC.CY],[12.5,VC.CY]);else path.push([sx+.5,VC.CY]);path.push(vSit(i));t.vwalk={v,i,path,k:0,T:0,o:tick};t.ord=null;return true}
function vSeatNow(v,t,i){v.seats[i]=t;t.vseat=v;t.vwalk=null;t.ord=null;t.mw=null;t.glide=null;if(t.held){t.psi=t.si;t.si=-1;t.held=null;t.hc=null}vPin(v);if(i===0)v.offT=0;sfx('flick')}
function vStand(v,t,out){const i=v.seats.indexOf(t);if(i<0)return;if(sel.has(t))v.ext=false;v.seats[i]=null;t.vseat=null;const front=i<2,sx=VSEATS[i][0]+.5;
 if(out){const path=front?[[12.5,VC.CY],[VC.XP-6,VC.CY],[VC.XP+12,VC.CY]]:[[sx,VC.CY]];const sp=v.seats.filter(Boolean).length+bodies.filter(o=>o.vwalk&&o.vwalk.v===v).length,side=sp%2?1:-1;path.push([VC.L-14,VC.CY],[VC.L+18,VC.CY],[VC.L+30+Math.random()*16,VC.CY+side*(10+Math.random()*26)]);t.vwalk={v,i:-1,path,k:0,T:0,o:tick*100-sx};return}
 const[gx,gy]=vL2W(v,front?12.5:sx,VC.CY);t.x=gx;t.y=gy}
function vUnload(v){v.seats.forEach((t,i)=>{if(t&&i>1)vStand(v,t,true)})}
// one at a time through the aisle: a walker sets off once those already moving are clear of it
function vWalkers(v){const ws=bodies.filter(t=>t.vwalk&&t.vwalk.v===v).sort((a,b)=>a.vwalk.o-b.vwalk.o);for(const t of ws){const w=t.vwalk;if(w.go)continue;const[ax,ay]=vL2W(v,...w.path[0]);if(ws.every(o=>!o.vwalk.go||o.vwalk.k>=1&&Math.hypot(o.x-ax,o.y-ay)>=18))w.go=true;else break}
 for(const t of ws){const w=t.vwalk;if(!w||!w.go)continue;if(t.status!=='free'){t.vwalk=null;continue}const[lx,ly]=w.path[w.k],[gx,gy]=vL2W(v,lx,ly);moveToward(t,t.x+Math.max(-.8,Math.min(.8,gx-t.x)),t.y+Math.max(-.8,Math.min(.8,gy-t.y)));t.mv=6;turnTo(t,Math.atan2(gy-t.y,gx-t.x));
  if(Math.hypot(gx-t.x,gy-t.y)<1.6){w.k++;w.T=0;if(w.k>=w.path.length){t.vwalk=null;if(w.i>=0&&!v.seats[w.i])vSeatNow(v,t,w.i)}}else if(++w.T>240){t.vwalk=null;if(w.i>=0&&t.vstage)t.vboard=v}}
 for(const t of bodies)if(t.vboard===v&&!t.vwalk){const[gx,gy]=vL2W(v,...t.vstage);if(Math.hypot(gx-t.x,gy-t.y)<20){t.vboard=null;t.ord=null;if(!vBoard(v,t))say(t,'No room',true)}else if(!t.ord&&tick%30===0)ordGive([t],gx,gy)}}
// boarders wait at their own spot behind the carrier, clear of the doorway, until the aisle is free
function vSendAboard(v,g){let j=0;for(const t of g){if(t.type!=='token'||t.status!=='free'||vSeatOf(t))continue;const r=j>>1,sd=j%2?1:-1;j++;t.vstage=[VC.L+26+(r>>1)*16,VC.CY+sd*(20+(r%2)*16)];const[gx,gy]=vL2W(v,...t.vstage);t.vboard=v;t.direct=false;ordGive([t],gx,gy)}}

// G: take or leave a seat; the driver's seat drives
// the seat G takes: a free one within reach, the one the unit faces winning over a nearer one behind it
function vNearSeat(t){for(const v of VEH){if(v.dead)continue;const[lx,ly]=vW2L(v,t.x,t.y);let best=-1,bs=1e9;if(!vInside(v,lx,ly)&&Math.hypot(...(([a,b])=>[lx-a,ly-b])(vSit(0)))>=18)continue;for(let i=0;i<VSEATS.length;i++){if(v.seats[i])continue;const[x,y]=vSit(i),d=Math.hypot(lx-x,ly-y);if(d>=18)continue;const[wx,wy]=vL2W(v,x,y),f=Math.cos(Math.atan2(wy-t.y,wx-t.x)-t.ang),sc=d-7*f;if(sc<bs){bs=sc;best=i}}if(best>=0)return[v,best]}return null}
function vKeyG(){const t=[...sel].find(b=>b.type==='token'&&b.direct&&b.status==='free');if(!t)return false;const s=vSeatOf(t);if(s){vStand(s[0],t,false);sfx('flick');return true}const n=vNearSeat(t);if(!n)return false;vSeatNow(n[0],t,n[1]);return true}
var VGP=null;function vPrompt(){const t=[...sel].find(b=>b.type==='token'&&b.direct&&b.status==='free'&&!vSeatOf(b));let at=null;
 let drv=false;if(t){const n=vNearSeat(t);if(n){at=vL2W(n[0],...vSit(n[1]));drv=n[1]===0}}
 if(!at){if(VGP)VGP.style.display='none';return}if(!VGP){VGP=document.createElement('div');VGP.className='vkey';VGP.textContent='G'}if(!VGP.parentNode)stage.appendChild(VGP);
 VGP.classList.toggle('drv',drv);VGP.style.display='';VGP.style.left=(at[0]*S)+'px';VGP.style.top=(at[1]*S)+'px'}
function vLabels(){for(const v of VEH){if(!vRoof(v))continue;for(const t of bodies)if(t.lab&&t.type==='token'&&vHas(v,t))t.lab.style.display='none'}}

// the engine goes: a short fuse of sparks and smoke, then a heavy blast; the hull is left a burnt shell
// the core goes: a torn hole with smooth lobes and a bright bent lip; round it the metal is tempered straw to blue and aged, fading out
function vBlow(v){v.bell=false;const ex=VC.XST+8,ey=VC.RC[2]+.5,[gx,gy]=vL2W(v,ex,ey),RH=19;v.dead=true;v.on=0;v.sp=v.w=0;v.burnT=tick;v.hole=[ex,ey];for(const t of v.seats)if(t){t.vseat=null}v.seats.fill(null);
 const sd=Math.random()*999|0,ox=(Math.random()-.5)*6,oy=(Math.random()-.5)*4,lobe=k=>hh(k,0,sd),N=7,rag=(x,y)=>{const a=(Math.atan2(y-ey-oy,x-ex-ox)/6.283+.5)*N,i=Math.floor(a),f=a-i,u=f*f*(3-2*f),sm=lobe(i%N)*(1-u)+lobe((i+1)%N)*u;return RH*(.6+.6*sm)+hh(x>>1,y>>1,sd)*1.2},
  edge=(x,y)=>Math.hypot(x-ex-ox,y-ey-oy)-rag(x,y);
 for(const q of v.src){const e=edge(q[8],q[9]);if(q[7]==='e'||e<0){q.dead=1;continue}if(e<1.5)q.lip=1;q.tm=Math.max(q.tm||0,Math.min(.85,.9*(1-e/16)));q.wr=Math.max(q.wr||0,4.4*Math.max(0,1-e/24))}
 for(let y=0;y<VC.H;y++)for(let x=0;x<VC.LW;x++){const i=y*VC.LW+x,e=edge(x,y);if(e<0){v.roofL[i]=0;if(v.base[i])v.base[i]=mul(v.base[i]&0xffffff,.45)|0xff000000;continue}const r=v.roofL[i];if(!r||e>26)continue;
  let c=r&0xffffff;const w=4.4*Math.max(0,1-e/24),cd=Math.max(1,5-Math.floor(w));if(w>.5){const A=ageOf('Metal',v.metal,cd);if(A){const q=A([c&255,c>>8&255,c>>16&255],x*2+v.id*37,y*2,()=>9);c=rgb(cl(q[0]),cl(q[1]),cl(q[2]))}}
  const tm=Math.min(.85,.9*(1-e/16));if(tm>.02){const f=temperF(tm),f0=temperF(0);c=rgb(cl((c&255)*f[0]/f0[0]),cl((c>>8&255)*f[1]/f0[1]),cl((c>>16&255)*f[2]/f0[2]))}
  if(e<1.5)c=mul(c,1.3);else if(e<3)c=mul(c,.7);v.roofL[i]=c|0xff000000}
 explode(gx,gy,2.4);BLU=false;arcBlast(gx,gy,3);for(let i=0;i<9;i++){const a=Math.random()*6.283,r=10+Math.random()*24;zaps.push({x0:gx,y0:gy,x1:gx+Math.cos(a)*r,y1:gy+Math.sin(a)*r,l:6+(Math.random()*8|0),b:false})}for(let i=0;i<40;i++)spark(gx,gy,Math.random()<.6?plasC(Math.random()):rgb(240,226,255),0,0,3.4,10+(Math.random()*16|0));vRefresh(v);scorch(gx,gy,34);emberPatch(gx,gy,30,14);shake=Math.max(shake,12)}
function vBlastCheck(x,y,s){vHeatMark(x,y,9*s,.7);for(const v of VEH){if(v.dead||v.fuse)continue;const[lx,ly]=vW2L(v,x,y),d=Math.hypot(lx-(VC.XST+8),ly-VC.RC[2]);if(d<10+6*s&&vInside(v,lx,ly))vBreach(v)}}

// AI drivers close on the nearest foe, stop short and let their squad out
function vAI(){for(const v of VEH){const d=vDriver(v);if(!aiOn||!d||!d.ai||v.dead){v.ai=null;continue}const a=v.ai||(v.ai={thr:0,turn:0,st:'go',T:0,lx:v.x,ly:v.y,rev:0});
  const foes=bodies.filter(o=>o.type==='token'&&o.status==='free'&&foe(d,o)&&!vSeatOf(o));if(!foes.length){a.thr=a.turn=0;continue}let f=foes[0],fd=1e9;for(const o of foes){const k=Math.hypot(o.x-v.x,o.y-v.y);if(k<fd){fd=k;f=o}}
  const pax=v.seats.slice(2).some(Boolean);if(a.st==='go'&&fd<(pax?170:110)){a.st='stop';a.T=tick}
  if(a.st==='stop'){a.thr=a.turn=0;if(Math.abs(v.sp)<.02&&pax&&tick-a.T>30){vUnload(v);a.st='hold'}else if(!pax&&tick-a.T>30)a.st='hold';continue}
  if(a.st==='hold'){a.thr=a.turn=0;if(fd>220&&!v.seats.slice(2).some(Boolean))a.st='go';continue}
  if(a.rev>0){a.rev--;a.thr=-1;a.turn=a.rt;continue}
  let df=Math.atan2(f.y-v.y,f.x-v.x)-v.ang-Math.PI;while(df>Math.PI)df-=6.283;while(df<-Math.PI)df+=6.283;a.turn=Math.abs(df)>.06?Math.sign(df):0;a.thr=Math.abs(df)<.9?1:0;
  if(!a.thr)a.dT=0;else if(++a.dT%90===0){if(a.dT>=180&&Math.hypot(v.x-a.lx,v.y-a.ly)<4){if(fd<260){a.st='stop';a.T=tick;continue}a.rev=70;a.rt=Math.random()<.5?-1:1;a.dT=0}a.lx=v.x;a.ly=v.y}}}

// carrier engine, rebuilt from four recordings: a lumpy idle (fires at 5x the shaft, lopes at 4 Hz), a rich moving growl at 2x,
// a mechanical drive drone (strong 7th-9th and 30th-31st partials, 13 Hz shudder) and slow ratchet ticks that layer in while turning.
const VENG={
 idle:[-51,-43,-29,-26,0,-27,-22,-28,-26,-13,-14,-24,-23,-15,-24,-31,-34,-36,-32,-25,-28,-22,-29,-36,-32,-34,-38,-46,-35,-40],
 move:[-12,0,-3,-4,-5,-13,-12,-15,-18,-10,-11,-18,-22,-18,-16,-12,-15,-30,-25,-27,-19,-31,-28,-26,-20,-25,-19,-21,-27,-30],
 drive:[-30,-62,-55,-76,-66,-46,-16,-9,-21,-47,-51,-44,-38,-30,-56,-62,-73,-72,-81,-75,-78,-70,-60,-68,-68,-76,-69,-66,-37,-1,-1,-22,-34,-44,-50,-47]};
function vEngWave(ac,db){const re=new Float32Array(db.length+1),im=new Float32Array(db.length+1);db.forEach((d,i)=>{const a=Math.pow(10,d/20),p=Math.sin(i*2.39)*3.1;re[i+1]=a*Math.cos(p);im[i+1]=a*Math.sin(p)});return ac.createPeriodicWave(re,im)}
function vEngNoise(ac,sec,brown){const n=ac.sampleRate*sec|0,b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;l=brown?(l+.02*w)/1.02:w;d[i]=brown?l*3.5:w}return b}
function vEngine(ac,out){const T=()=>ac.currentTime,o=(t,f)=>{const x=ac.createOscillator();if(typeof t==='string')x.type=t;else x.setPeriodicWave(t);x.frequency.value=f;x.start();return x},g=v=>{const x=ac.createGain();x.gain.value=v;return x},
  bp=(f,q)=>{const x=ac.createBiquadFilter();x.type='bandpass';x.frequency.value=f;x.Q.value=q;return x},lp=f=>{const x=ac.createBiquadFilter();x.type='lowpass';x.frequency.value=f;return x},
  ns=(br)=>{const s=ac.createBufferSource();s.buffer=vEngNoise(ac,3,br);s.loop=true;s.start(0,Math.random()*2);return s};
 const bus=g(0),tone=lp(900);bus.connect(tone).connect(out);
 // idle: the shaft tone, the firing pulses through low noise, and a slow lope
 const sh=o(vEngWave(ac,VENG.idle),12.6),shG=g(.5),lope=o('sine',4),lopeG=g(.12),lopeS=g(1);sh.connect(shG).connect(lopeS).connect(bus);lope.connect(lopeG).connect(lopeS.gain);
 const fire=o('sawtooth',63),fireSh=ac.createWaveShaper(),fc=new Float32Array(256);for(let i=0;i<256;i++){const x=i/127.5-1;fc[i]=Math.pow(Math.max(0,x),3)}fireSh.curve=fc;
 const fireG=g(0),nz=ns(true),nzF=bp(170,.6),nzG=g(1.3);fire.connect(fireSh).connect(fireG.gain);nz.connect(nzF).connect(fireG).connect(nzG).connect(lopeS);
 // valve clatter: bright ticks riding the firing pulses
 const clt=ns(false),cltF=bp(2600,.7),cltM=g(0),cltG=g(0);fireSh.connect(cltM.gain);clt.connect(cltF).connect(cltM).connect(cltG).connect(out);
 const rum=ns(true),rumF=lp(70),rumG=g(.35);rum.connect(rumF).connect(rumG).connect(bus);
 // moving: a rich growl an octave over the shaft, with grit
 const mv=o(vEngWave(ac,VENG.move),25.2),mvG=g(0),chug=o('sine',6),chugG=g(.3),chugS=g(.7);mv.connect(chugS).connect(mvG).connect(bus);chug.connect(chugG).connect(chugS.gain);const grit=ns(false),gritF=bp(420,.8),gritG=g(0);grit.connect(gritF).connect(gritG).connect(bus);
 // turning: the drive drone with its shudder, and slow ratchet ticks
 const dr=o(vEngWave(ac,VENG.drive),13.65),drG=g(0),sd=o('sine',13.1),sdG=g(.5),sdS=g(.5);dr.connect(sdS).connect(drG).connect(out);sd.connect(sdG).connect(sdS.gain);
 const rat=g(0);rat.connect(out);const RES=[[1850,26,1],[3500,30,.7],[4300,34,.55],[2650,22,.35]];let nextT=0;
 function tick(t,rate){const b=ac.createBufferSource(),n=ac.createBuffer(1,ac.sampleRate*.004|0,ac.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);b.buffer=n;
  const v=g(.5+Math.random()*.5);for(const[f,q,a]of RES){const r=bp(f*(.97+Math.random()*.06),q),k=g(a*2.2);b.connect(r).connect(k).connect(v)}const e=g(1);v.connect(e).connect(rat);e.gain.setValueAtTime(1,t);e.gain.exponentialRampToValueAtTime(.001,t+.11);b.start(t)}
 const st={on:0,load:0,turn:0,rpm:0,lv:0,tv:0,lvV:0,tvV:0,up:0,solo:null};
 // a gentle curve on everything: changes start slow and settle
 function frame(dt){const tg=st.on?1:0;st.up+=(tg-st.up)*Math.min(1,dt*(st.on?1.1:.7));const L=st.on?st.load:0,R=st.on?Math.abs(st.turn):0;st.lvV+=((L-st.lv)*3-st.lvV*3.2)*dt;st.lv=Math.max(0,Math.min(1,st.lv+st.lvV*dt));st.tvV+=((R-st.tv)*36-st.tvV*12)*dt;st.tv=Math.max(0,Math.min(1,st.tv+st.tvV*dt));
  const rpm=st.up*(1+.42*st.lv+.12*st.tv)*(1+(Math.random()-.5)*.006),t=T();
  sh.frequency.setTargetAtTime(12.6*rpm,t,.05);fire.frequency.setTargetAtTime(63*rpm,t,.05);mv.frequency.setTargetAtTime(25.2*rpm,t,.05);dr.frequency.setTargetAtTime(13.65*(.9+.2*st.lv),t,.08);sd.frequency.setTargetAtTime(13.1*(.9+.2*st.lv),t,.08);
  const so=st.solo,mB=so&&so!=='engine'?0:1,mD=so&&so!=='drive'?0:1,mR=so&&so!=='rat'?0:1;bus.gain.setTargetAtTime(mB*.9*Math.pow(st.up,1.5),t,.06);cltG.gain.setTargetAtTime(mB*.05*Math.pow(st.up,2)*(1+.6*st.lv),t,.08);lopeG.gain.setTargetAtTime(.07*(1-st.lv),t,.1);chug.frequency.setTargetAtTime(6*rpm,t,.08);shG.gain.setTargetAtTime(.5*(1-.5*st.lv),t,.1);
  mvG.gain.setTargetAtTime(.32*st.lv,t,.1);gritG.gain.setTargetAtTime(.05*st.lv,t,.1);tone.frequency.setTargetAtTime(1100+900*st.lv,t,.1);rumG.gain.setTargetAtTime(.3+.25*st.lv,t,.1);
  drG.gain.setTargetAtTime(mD*(so==='drive'?.5:.22)*st.tv*st.up,t,.04);rat.gain.setTargetAtTime(mR*(so==='rat'?.7:.49)*st.tv*st.up*(st.near??1),t,.03);
  if(st.tv>.08&&st.up>.5){const iv=.095/(.6+.6*st.tv);if(nextT<t)nextT=t+.02;while(nextT<t+.12){tick(nextT);nextT+=iv*(.85+Math.random()*.3)}}}
 return{st,frame,stop(){for(const n of[bus,drG,rat,cltG])n.gain.setTargetAtTime(0,T(),.05);for(const x of[sh,lope,fire,mv,chug,dr,sd])x.stop(T()+.4);for(const x of[nz,rum,grit,clt])x.stop(T()+.4)}}}

// the key: a bright click and a detent; then an air-release hiss as the engine catches, and a longer falling hiss when it's shut down
function vClick(ac,dst,t,f,v){const n=ac.createBuffer(1,ac.sampleRate*.006|0,ac.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const b=ac.createBufferSource();b.buffer=n;const g=ac.createGain();g.gain.value=v;g.connect(dst);
 for(const[m,q,a,dk]of[[1,6,1,.05],[1.73,9,.6,.09],[2.6,14,.4,.12]]){const r=ac.createBiquadFilter();r.type='bandpass';r.frequency.value=f*m;r.Q.value=q;const e=ac.createGain();e.gain.setValueAtTime(a*3,t);e.gain.exponentialRampToValueAtTime(.001,t+dk);b.connect(r).connect(e).connect(g)}b.start(t)}
function vThump(ac,dst,t,v){const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g).connect(dst);o.start(t);o.stop(t+.2)}
function vHiss(ac,dst,t,dur,f0,f1,v,att){const n=ac.createBuffer(1,ac.sampleRate*(dur+.2)|0,ac.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const b=ac.createBufferSource();b.buffer=n;
 const hp=ac.createBiquadFilter();hp.type='highpass';hp.frequency.value=1600;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.Q.value=.6;bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+dur);
 const g=ac.createGain(),fl=ac.createGain(),lf=ac.createOscillator(),lg=ac.createGain();lf.frequency.value=7+Math.random()*4;lg.gain.value=.12;fl.gain.value=.88;lf.connect(lg).connect(fl.gain);lf.start(t);lf.stop(t+dur+.2);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+att);g.gain.setValueAtTime(v,t+att+dur*.25);g.gain.exponentialRampToValueAtTime(.001,t+dur);b.connect(hp).connect(bp).connect(fl).connect(g).connect(dst);b.start(t);b.stop(t+dur+.1)}
function vIgnite(ac,dst){const t=ac.currentTime+.02;vClick(ac,dst,t,3100,.5);vClick(ac,dst,t+.13,2300,.35);vThump(ac,dst,t+.24,.5);vHiss(ac,dst,t+.34,1.15,7000,4200,.42,.05)}
function vShutdown(ac,dst){const t=ac.currentTime+.02;vClick(ac,dst,t,2700,.4);vHiss(ac,dst,t+.18,2.9,6500,2600,.36,.18)}

// each running carrier has its own engine voice, placed by distance and side from the listener, muffled through walls and from inside
const VSND=new Map();
function vSound(){const ok=AC&&!mute&&gest;for(const[id,s]of VSND){const v=VEH.find(q=>q.id===id);if(!ok||!v||v.dead||!v.on&&s.e.st.up<.01&&tick-s.offT>200){s.e.stop();if(s.bell){s.bell.off();s.bell.stop()}setTimeout(()=>{try{s.g.disconnect()}catch(e){}},1800);VSND.delete(id)}}if(!ok)return;
 const me=[...sel].find(b=>b.type==='token'),vw=$('stage').parentElement,lx=me?me.x:(vw.clientWidth/2-cam.x)/S,ly=me?me.y:(vw.clientHeight/2-cam.y)/S;
 for(const v of VEH){if(v.dead)continue;let s=VSND.get(v.id);if(!s){if(!v.on)continue;const g=AC.createGain(),p=AC.createStereoPanner(),f=AC.createBiquadFilter();f.type='lowpass';g.gain.value=0;g.connect(p).connect(f).connect(MS);s={g,p,f,e:vEngine(AC,g),on:1};VSND.set(v.id,s);if(tick-v.onT<VIGN)vIgnite(AC,g)}
  if(s.on&&!v.on){s.on=0;s.offT=tick;vShutdown(AC,s.g)}else if(!s.on&&v.on){s.on=1;vIgnite(AC,s.g)}
  const bw=!!(v.bell&&v.on&&!v.dead);if(bw!==!!s.bellOn){if(!s.bell)s.bell=vBell(AC,s.g);s.bellOn=bw;bw?s.bell.on():s.bell.off()}
  const d=Math.hypot(v.x-lx,v.y-ly),inn=me&&vHas(v,me),los=inn||losClear(lx,ly,v.x,v.y),t=AC.currentTime;s.e.st.on=v.on&&tick-v.onT>=VIGN?1:0;s.e.st.load=Math.min(1,Math.abs(v.sp)/.378);s.e.st.turn=Math.max(Math.min(1,Math.abs(v.w)/.0028),v.tin?.55:0);s.e.st.near=Math.max(0,1-d/160);
  s.g.gain.setTargetAtTime(.75*Math.min(1,70/(d+40)),t,.1);s.p.pan.setTargetAtTime(inn?0:Math.max(-.7,Math.min(.7,(v.x-lx)/220)),t,.1);s.f.frequency.setTargetAtTime(inn?1400:los?7000:900,t,.15);s.e.frame(2/60)}}

function vPick(X,Y){const v=vAt(X,Y);return v&&!v.dead&&vDriver(v)||null}
function vMenu(v,e){closeMenu();const r=$('sm').getBoundingClientRect();menu=document.createElement('div');menu.className='menu';menu.style.left=(e.clientX-r.left+4)+'px';menu.style.top=(e.clientY-r.top+4)+'px';
 const it=(t,f)=>{const bt=document.createElement('button');bt.textContent=t;bt.onclick=()=>{f();closeMenu()};menu.appendChild(bt)};
 if(v.seats.slice(2).some(Boolean))it('Unload',()=>vUnload(v));if(vDriver(v))it('Driver out',()=>vStand(v,v.seats[0],true));if(v.seats[1])it('Commander out',()=>vStand(v,v.seats[1],true));
 if(!menu.children.length){menu=null;return}$('sm').appendChild(menu)}
{const e0=explode;explode=function(x,y,s=1){e0(x,y,s);vBlastCheck(x,y,s)}}

// key hints: one quiet line for the unit under direct control, showing only the keys that do something right now
var VHB=null,VHK='';
function vHints(){const t=sel.size===1&&[...sel][0],on=t&&t.type==='token'&&t.direct&&t.status==='free'&&!EM;let L=[];
 if(on){const s=vSeatOf(t),h=t.held,gun=h&&CAP[h.k],thr=h&&(h.k==='grenade'||h.k==='bomb');
  if(s&&s[1]===0)L=[['W S','drive'],['A D','turn'],['Shift','brake'],['X',s[0].bell?'alarm off':'alarm on'],['V','view'],['G','ignition off']];
  else if(s)L=[['V','view'],['G','get up']];
  else{L=[['WASD','move'],['Shift','dash'],['C','crouch']];{const n=vNearSeat(t);if(n)L.push(['G',n[1]===0?'ignition on':'sit'])}
   if(gun)L.push(['Hold','fire'],['R','reload'],['Q','sheathe']);else if(thr)L.push(['Hold','throw'],['Q','sheathe']);else if(h)L.push(['Hold','attack'],['Q','sheathe']);else if(t.inv&&t.inv.some(Boolean))L.push(['Q','draw']);
   if(t.inv&&t.inv.some(Boolean))L.push(['1–6','slots']);if(h&&!vNearSeat(t))L.push(['G','drop'])}
  L.push(['E','release '+t.name])}
 const k=L.map(x=>x.join(':')).join('|');if(k===VHK)return;VHK=k;
 if(!VHB){VHB=document.createElement('div');VHB.className='khint';stage.parentElement.appendChild(VHB)}
 VHB.innerHTML='';VHB.style.display=L.length?'':'none';for(const[a,b]of L){const i=document.createElement('span');const c=document.createElement('b');c.textContent=a;i.append(c,' '+b);VHB.append(i)}}
{const r0=render;render=function(){r0();vLabels();vHints()}}

// the test ground: an Imperial proving yard with a crewed carrier, an empty one, hedge rows to drive through and stone blocks to stop against
MAPSZ.yard=[44,28];TITLE.yard='Fluoria · Carrier yard';ENVSET.yard='out';
NBM.yard=()=>{UND=Array.from({length:28},()=>Array(44).fill('grass'));paintAll((cx,cy)=>{if(cx===0||cy===0||cx===43||cy===27)return'stone.grey.block.w';
 if(cx>=37&&cx<=38&&(cy>=4&&cy<=7||cy>=20&&cy<=23))return'stone.grey.block.w';
 if(cx===27&&cy>=10&&cy<=17||cx===32&&(cy>=3&&cy<=8||cy>=19&&cy<=24)||cy===24&&cx>=5&&cx<=14)return'hedge';
 if(cy>=12&&cy<=15)return'dirt';return'grass'})};
NUM.yard=()=>{const v=carrier('steel',15*T,14*T,0,'Imperium');const g=[U('Legate Varro','Imperium','civ',0,0,0,'pistol','Officer'),U('Tribune Cass','Imperium','civ',0,0,0,'pistol','Officer')];vSeatNow(v,g[0],0);vSeatNow(v,g[1],1);
 ['Brask','Coll','Dunn','Ivo','Hale','Marl'].forEach((n,i)=>vSeatNow(v,U(n,'Imperium',i<2?'guard':'rifle',0,0,0),2+i));
 carrier('iron',15*T,6*T,0,'Imperium');
 U('Ser Davin','Imperium','civ',27.5,6,Math.PI,'pistol','Officer');['Orrin','Pell','Wat','Ned'].forEach((n,i)=>U(n,'Imperium',i<1?'guard':'rifle',25.5+(i%2)*1.6,3.6+(i>>1)*1.6,Math.PI,i<1?'rod':undefined));
 for(const t of bodies)if(t.type==='token')t.auto=false};
// the circuit: a rounded loop of road for driving corners, hedge chicanes and stone blocks inside, an inspection stand of officers and
// nobles on the south side, perimeter guards, and a parking apron beside the stand: two iron carriers parked empty and a steel one crewed bar its driver
MAPSZ.circuit=[64,48];TITLE.circuit='Fluoria · Carrier circuit';ENVSET.circuit='out';
NBM.circuit=()=>{UND=Array.from({length:48},()=>Array(64).fill('grass'));const rr=(x,y,x0,y0,x1,y1,r)=>{const cx=Math.max(x0+r,Math.min(x1-r,x)),cy=Math.max(y0+r,Math.min(y1-r,y));return Math.hypot(x-cx,y-cy)<=r};
 paintAll((cx,cy)=>{if(cx===0||cy===0||cx===63||cy===47)return'stone.grey.block.w';const x=cx+.5,y=cy+.5;
  if(rr(x,y,4,3,60,34,8)&&!rr(x,y,9,8,55,29,4))return'dirt';
  if(cx>=36&&cx<=58&&cy>=36&&cy<=46)return cy===36||cx===36||cx===58||cy===46?'stone.grey.block':'stone.grey.slabs';
  if(cx>=16&&cx<=32&&cy>=38&&cy<=45)return'stone.grey.quarter';
  if(cy>=34&&cy<=35&&cx>=40&&cx<=54)return'dirt';
  if(cx===22&&cy>=11&&cy<=18||cx===42&&cy>=11&&cy<=18)return'hedge';
  if((cx===27||cx===37)&&cy>=14&&cy<=15||cx===48&&cy>=22&&cy<=23)return'stone.grey.block.w';
  return'grass'})};
NUM.circuit=()=>{const A=-Math.PI/2,P=Math.PI/2;
 carrier('iron',41*T,39*T,P,'Imperium','battleworn');carrier('iron',47*T,39*T,P,'Imperium','derelict');const v=carrier('steel',53*T,39*T,P,'Imperium','new');
 vSeatNow(v,U('Tribune Cass','Imperium','civ',0,0,0,'pistol','Officer'),1);['Brask','Coll','Dunn','Ivo','Hale','Marl','Rook','Tobin'].forEach((n,i)=>vSeatNow(v,U(n,'Imperium',i<3?'guard':'rifle',0,0,0),2+i));
 U('Legate Varro','Imperium','civ',56.6,44,A,'pistol','Officer');
 // the parade across the road from the stand, as laid out by hand: veteran and fresh Praetorians, fresh and worn Musketeers, then the Shocktroopers
 {const HR=[[96,70,52],[58,48,42],[150,146,140],[120,84,56]],X={a:[16.6,17.9,19.2,20.6],b:[23.5,24.8,26.1,27.4],c:[30.2,31.5,32.8]},Y=[23.1,24.4,25.8,27.1];let k=0;
  for(const[names,un,tier,xs,y0]of[['Abel Bram Cato Dace Edric Faro Gage Hollis','rifle','fresh',X.b,0],['Ivo Jarek Kell Lorn Mace Nils Oran Piet','guard','fresh',X.a,2],['Quill Rand Soren Tam Ulric Vane','guard','veteran',X.a,0],['Wick Yorr Zane Aldo Brenn Cole Dorn Emmet','rifle','mixed',X.b,2],['Fisk Garr Hask Iver Jory Kade','shock','mixed',X.c,2]]){const nm=names.split(' '),cols=nm.length/2;
   nm.forEach((n,i)=>{const lv=tier==='fresh'?0:tier==='veteran'?2:[1,2,3,3,2,3,1,3][i%8],t=U(n,'Imperium',un,xs[i%cols],Y[y0+(i/cols|0)],P);k++;t.wear={lv,seed:k*17,bare:lv>=2&&(k*7)%5===0,hair:rgb(...HR[k%4])}})}}
 // the inspection line along the stand's front, facing the circuit
 [['Lord Castor','Imperial Noble'],['Lady Ysolde','Imperial Noble'],['Lord Aemon','Imperial Noble'],['Overseer Malcor','Overseer'],['Legate Thane','Officer'],['Tribune Corvin','Officer'],['Ser Davin','Officer']].forEach(([n,l],i)=>U(n,'Imperium','civ',17.5+i*2.2,39.2,A,l==='Officer'?'pistol':null,l));
 ['Pell','Wat','Ned','Orrin'].forEach((n,i)=>U(n,'Imperium',i===3?'guard':'rifle',18.5+i*4,43.5,A,i===3?'rod':undefined));
 for(const t of bodies)if(t.type==='token')t.auto=false};
{const o=document.createElement('option');o.value='circuit';o.textContent='Fluoria carrier circuit';const ms=$('msel');if(ms){ms.appendChild(o);MAPBASE.push(['circuit','Fluoria carrier circuit']);ms.value=curMap}}
{const o=document.createElement('option');o.value='yard';o.textContent='Fluoria carrier yard';const ms=$('msel');if(ms){ms.appendChild(o);MAPBASE.push(['yard','Fluoria carrier yard']);ms.value=curMap}}
if(curMap==='yard'||curMap==='circuit'){CW=-1;reset()}
