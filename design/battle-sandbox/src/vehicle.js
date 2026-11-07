// Carrier: a tracked troop carrier. Its hull, tracks, engine and chest sit in slabG, so shots, blasts, units and sight meet them like any slab.
// Layout (local pixels): driver and commander up front, chest over engine, armoured bulkhead with a door, 4+4 seats, rear double doors.
const VC={CAB:22,ST:16,SEAT:17,ROW:16,TR:5,SW:4,FW:4,RW:8,N:4};
VC.IL=VC.CAB+2+VC.ST+2+VC.N*VC.SEAT+4;VC.IH=3*VC.ROW;VC.X0=VC.FW;VC.R0=VC.TR+VC.SW;VC.L=VC.X0+VC.IL+VC.RW;VC.H=VC.R0+VC.IH+VC.SW+VC.TR;VC.LW=VC.L+18;
VC.RC=[VC.R0+8,VC.R0+VC.ROW+8,VC.R0+2*VC.ROW+8];VC.CY=VC.RC[1];VC.XST=VC.X0+17;VC.XP=VC.X0+33;VC.XS=VC.XP+8;VC.PX=VC.L/2;VC.PY=VC.H/2;
const VPB=rgb(240,226,255),VPV=rgb(150,90,220),VPD=rgb(58,30,96);
const vmet=(mat,x,y,t)=>{const c=metalOf(mat,x*3,y*3);return rgb(cl(c[0]*t),cl(c[1]*t),cl(c[2]*t))};
const vtone=(mat,c)=>mat==='umbra'?umbraC(c):mat==='steel'?c:toneC(mat,c);

// seats: [x, y, facing in local radians, role]; the token sits a pixel forward of the seat centre
function vSeats(){const s=[[VC.X0+8,VC.RC[2],Math.PI,'driver'],[VC.X0+8,VC.RC[0],Math.PI,'cmd']];for(let i=0;i<VC.N;i++){const x=VC.XS+i*VC.SEAT+8;s.push([x,VC.RC[0],Math.PI/2,'p'],[x,VC.RC[2],-Math.PI/2,'p'])}return s}
const VSEATS=vSeats();
const vSit=i=>{const[x,y,a]=VSEATS[i];return[x+.5+Math.cos(a),y+.5+Math.sin(a)]};

function vBuild(v){const{L,H,LW,TR,SW,FW,RW,X0,R0,IL,IH,RC,CY,XST,XP}=VC,mat=v.mat,base=new Uint32Array(LW*H),roof=new Uint32Array(LW*H),src=[],smap=new Map();
 const B=(x,y,c)=>{if(x>=0&&y>=0&&x<LW&&y<H)base[y*LW+x]=c|0xff000000},Rf=(x,y,c)=>{if(x>=0&&y>=0&&x<LW&&y<H)roof[y*LW+x]=c|0xff000000};
 const S=(x,y,c,hp,tag)=>{if(x<0||y<0||x>=LW||y>=H)return;const k=K(x,y),o=smap.get(k);if(o){o[2]=c;o[3]=o[6]=hp;o[7]=tag;return}const q=[x,y,c,hp,3,0,hp,tag,x,y];src.push(q);smap.set(k,q)};
 const ch=(x,y)=>{const d=Math.min(y-TR,H-TR-1-y);return x<4-d};
 // floor: the hull metal's floor tile, dimmed for the interior
 const fk=mat==='iron'?'metal.iron.treadplate':'metal.'+mat+'.panel',FL={};
 for(let y=R0;y<R0+IH;y++)for(let x=X0;x<X0+IL;x++){const fx=x-X0,fy=y-R0,d=FL[(fy>>4)*99+(fx>>4)]||(FL[(fy>>4)*99+(fx>>4)]=tilePix(fk,fx>>4,fy>>4)),i=((fy&15)*16+(fx&15))*4;B(x,y,mul(rgb(d[i],d[i+1],d[i+2]),.45))}
 // seats in black cloth: backrest and armrests frame the token, cushion with two stitched channels
 const CL=tilePix('cloth.black.border',0,0),seat=(x,y,fx,fy)=>{for(let f=-7;f<=5;f++)for(let sd=-7;sd<=7;sd++){const X=x+(fx?f*fx:sd),Y=y+(fy?f*fy:sd),as=Math.abs(sd);let t;
  if(f<=-6){if(as===7&&f===-7)continue;t=f===-7||as===7?.55:1.9}else if(as>=6){if(f===5)continue;t=as===7||f===4?.55:1.6}
  else if(as===5||f===5)t=.55;else if(as===2)t=1;else if(f===4)t=1.2;else t=as>=3?1.25:sd===0||f<0?1.5:1.75;
  const i=(((Y&7)+4)*16+(X&7)+4)*4;B(X,Y,mul(rgb(CL[i],CL[i+1],CL[i+2]),t*1.45))}};
 for(const[x,y,a]of VSEATS)seat(x,y,Math.round(Math.cos(a+Math.PI)),Math.round(Math.sin(a)));
 // tracks
 for(const yy of[0,H-TR])for(let y=0;y<TR;y++)for(let x=3;x<L-2;x++)S(x,yy+y,0,14,yy?'B':'T');
 // half walls: sides full length, front and rear between them
 const slab=(len,th)=>slabPix(3,len,th).map(q=>[q[8],q[9]+th,vtone(mat,q[2])]);
 for(const q of slab(L,SW)){S(q[0],TR+q[1],q[2],11,'w');S(q[0],R0+IH+q[1],q[2],11,'w')}
 for(const q of slab(IH,FW))S(q[1],R0+q[0],q[2],11,'w');
 for(const q of slab(8,RW)){S(L-RW+q[1],R0+q[0],q[2],11,'w');S(L-RW+q[1],R0+IH-8+q[0],q[2],11,'w')}
 // rear double doors and the cockpit door
 v.dl=doorIcon(mat,false);v.dlm=new Map(v.dl.map(z=>[K(z[0],z[1]),z[2]]));for(const q of v.dl){S(L+q[1],CY-16+q[0],q[2],11,'D');S(L+q[1],CY+15-q[0],q[2],11,'D')}
 for(const q of slab(16,8)){S(XP+q[1],R0+q[0],q[2],11,'w');S(XP+q[1],R0+IH-16+q[0],q[2],11,'w')}
 for(const q of v.dl)S(XP+8+q[1],CY-8+q[0],q[2],11,'C');
 // chamfered nose
 for(let y=TR;y<H-TR;y++)for(let x=0;x<6;x++){const o=smap.get(K(x,y));if(!o)continue;if(ch(x,y)){o.cut=1;smap.delete(K(x,y))}else if(ch(x-1,y))o[2]=vmet(mat,x,y,.5)}
 // firing slit: a lit lip on the outer face, dimmer metal through the wall, a darker bevel at its inner edge
 for(let y=RC[0]-5;y<=RC[0]+4;y++){S(0,y,vmet(mat,0,y,1.35),2,'g');for(let x=1;x<FW;x++){smap.delete(K(x,y));B(x,y,vmet(mat,x,y,x===FW-1?.5:.62))}}
 // chest over the engine block
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const e=x===0||y===0||x===15||y===15,r=x<=3||y<=3||x>=12||y>=12,mk=(x===5||x===10)&&(y>=5&&y<=6||y>=9&&y<=10)||(y===5||y===10)&&(x>=5&&x<=6||x>=9&&x<=10);
  S(XST+x,R0+y,e?vmet(mat,x,y,x===15||y===15?.45:1.35):r?vmet(mat,x,y,x>=12||y>=12?.8:1.25):mk?vmet(mat,x,y,.6):vmet(mat,x,y,1.05),11,'c')}
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const e=x===0||y===0||x===15||y===15,cs=x===1||y===1||x===14||y===14;let c=e?vmet(mat,x,y,.45):vmet(mat,x,y,x===1||y===1?1.2:.75),tag='w',hp=11;
  if(!e&&!cs){const u=x-2,w=y-2,r=Math.hypot((u%6)-2.5,(w%6)-2.5),op=mix(plasC(Math.atan2(y-7.5,x-7.5)/6.283+.5),VPV,.45);c=u===0||w===0||u===11||w===11||u===5||u===6||w===5||w===6?VPD:r<1.6?VPB:r<2.4?VPV:op;tag='e';hp=3}
  S(XST+x,R0+IH-16+y,c,hp,tag)}
 // roof: plates over the interior, hatches over the front seats, a grille over the engine
 for(let y=R0;y<R0+IH;y++)for(let x=X0;x<X0+IL;x++){const e=x===X0||y===R0,e2=x===X0+IL-1||y===R0+IH-1;let c=e?vmet(mat,x,y,.7):e2?vmet(mat,x,y,.82):vmet(mat,x,y,1);for(const pl of[XP+3,VC.XS+2*VC.SEAT+1]){if(x===pl)c=vmet(mat,x,y,.8);if(x===pl+1)c=vmet(mat,x,y,1.08)}Rf(x,y,c)}
 for(const[a,b2]of[[X0,XP+3],[XP+5,VC.XS+2*VC.SEAT],[VC.XS+2*VC.SEAT+3,X0+IL-1]])for(const[x,y]of[[a+2,R0+2],[b2-2,R0+2],[a+2,R0+IH-3],[b2-2,R0+IH-3]]){Rf(x,y,vmet(mat,x,y,1.5));Rf(x+1,y+1,vmet(mat,x,y,.6))}
 for(const hy of[RC[0],RC[2]])for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){const d=Math.hypot(x,y);if(d>3.4)continue;Rf(X0+8+x,hy+y,d>2.4?vmet(mat,0,hy,.55):d<1.2?vmet(mat,0,hy,1.25):vmet(mat,0,hy,.95))}
 for(let x=XST+3;x<=XST+13;x+=2)for(let y=RC[2]-6;y<=RC[2]+6;y++)Rf(x,y,vmet(mat,x,y,.45));
 v.base=base;v.roofL=roof;v.src=src;v.smap=smap}

function carrier(mat,x,y,ang,nat){const v={id:uid++,veh:true,type:'veh',mat:mat||'steel',nat:nat||null,x,y,ang:ang||0,sp:0,w:0,ph:[0,0],seats:Array(VSEATS.length).fill(null),door:{r:0,c:0},dT:{r:0,c:0},on:0,offT:0,puffs:[],px:[],set:new Map(),hp:1};vBuild(v);vOrient(v);VEH.push(v);return v}
const vDriver=v=>{const t=v.seats[0];return t&&bodies.includes(t)&&t.status!=='dead'?t:null};
const vW2L=(v,X,Y)=>{const c=Math.cos(v.ang),s=Math.sin(v.ang),dx=X-v.x,dy=Y-v.y;return[VC.PX+dx*c+dy*s,VC.PY-dx*s+dy*c]};
const vL2W=(v,x,y)=>{const c=Math.cos(v.ang),s=Math.sin(v.ang),dx=x-VC.PX,dy=y-VC.PY;return[v.x+dx*c-dy*s,v.y+dx*s+dy*c]};
// solid pixels under the current pose; open doors and broken pixels drop out
function vSolid(v,q){if(q.dead)return false;if(q[7]==='D')return!v.door.r;if(q[7]==='C')return!v.door.c;return true}
function vOrient(v,pose){if(!pose)for(const t of v.px)if(t.s&&t[3]<t.s[3])t.s[3]=t[3];const P=pose||v,c=Math.cos(P.ang),s=Math.sin(P.ang),bx=Math.round(P.x),by=Math.round(P.y),R=90,px=[];
 for(let Y=by-R;Y<=by+R;Y++)for(let X=bx-R;X<=bx+R;X++){const dx=X-P.x,dy=Y-P.y,lx=Math.floor(VC.PX+dx*c+dy*s),ly=Math.floor(VC.PY-dx*s+dy*c);if(lx<0||ly<0||lx>=VC.LW||ly>=VC.H)continue;const q=v.smap.get(K(lx,ly));if(!q||!vSolid(v,q))continue;const t=[X-bx,Y-by,q[2],q[3],3,q[5],q[6],q[7]==='e'?'x':q[7],q[8],q[9]];t.e=q[7]==='e';t.s=q;px.push(t)}
 if(pose)return px;v.px=px;mkSet(v);return px}
function vMark(v){const bx=Math.round(v.x),by=Math.round(v.y);for(const p of v.px){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H)slabG[Y*W+X]=v.id}}
// a hit pixel gives its damage back to the hull's own pixel; the core going breaks the engine
function vSettle(v){for(const t of v.px){if(!t.s)continue;if(t[3]<t.s[3])t.s[3]=t[3];if(!v.set.has(K(t[0],t[1]))){t.s.dead=1;if(t.e)vBreach(v)}}v.px=v.px.filter(p=>!p.s.dead);mkSet(v);v.dirty=1}
function vBreach(v){if(v.fuse||v.dead)return;v.fuse=150;sfx('sizzle');sfx('crack')}
const vInside=(v,lx,ly)=>lx>=VC.X0-1&&lx<VC.X0+VC.IL+1&&ly>=VC.R0-1&&ly<VC.R0+VC.IH+1;
const vAt=(X,Y)=>VEH.find(v=>{const[lx,ly]=vW2L(v,X+.5,Y+.5);return lx>=0&&ly>=0&&lx<VC.L&&ly<VC.H});
const vSeatOf=t=>{for(const v of VEH){const i=v.seats.indexOf(t);if(i>=0)return[v,i]}return null};

// drawing: the floor layer under units, the roof and mist over them; supersampled 2x2 when turned
function vBake(v){const n=VC.LW*VC.H;v.L0=new Uint32Array(n);v.L1=new Uint32Array(n);v.L2=new Uint32Array(n);v.trk=[];
 for(let ly=0;ly<VC.H;ly++)for(let lx=0;lx<VC.LW;lx++){const i=ly*VC.LW+lx,q=v.smap.get(K(lx,ly));if(q&&!q.dead&&(q[7]==='T'||q[7]==='B'))v.trk.push(i,lx,ly,q[7]);const a=vFloorPx(v,lx,ly),r=vRoofPx(v,lx,ly,true),w=vRoofPx(v,lx,ly,false);v.L0[i]=a?a|0xff000000:0;v.L1[i]=r?r|0xff000000:0;v.L2[i]=w?w|0xff000000:0}v.dirty=0;v.fz=v.fuse?(tick>>2)%2:0}
function vDraw(top){for(const v of VEH){if(!v.L0||v.dirty||v.fuse&&(tick>>2)%2!==v.fz)vBake(v);
  if(!top){const t=v.trk;for(let k=0;k<t.length;k+=4){const c=vTrack(v,t[k+1],t[k+2],t[k+3]);v.L0[t[k]]=v.dead?vChar(c,t[k+1],t[k+2])|0xff000000:c|0xff000000}}
  const L=top?(vRoof(v)?v.L1:v.L2):v.L0,c=Math.cos(v.ang),s=Math.sin(v.ang),LW=VC.LW,LH=VC.H;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const[lx,ly]of[[0,0],[LW,0],[0,LH],[LW,LH]]){const[gx,gy]=vL2W(v,lx,ly);x0=Math.min(x0,gx);x1=Math.max(x1,gx);y0=Math.min(y0,gy);y1=Math.max(y1,gy)}
  const crisp=Math.abs(Math.sin(v.ang*2))<1e-3,SUB=crisp?[.5,.5]:[.25,.25,.75,.25,.25,.75,.75,.75],ns=SUB.length/2,PX=VC.PX,PY=VC.PY;
  for(let Y=Math.max(0,Math.floor(y0));Y<=Math.min(H-1,Math.ceil(y1));Y++)for(let X=Math.max(0,Math.floor(x0));X<=Math.min(W-1,Math.ceil(x1));X++){let r=0,g=0,b=0,n=0;
   for(let k=0;k<SUB.length;k+=2){const dx=X+SUB[k]-v.x,dy=Y+SUB[k+1]-v.y,lx=Math.floor(PX+dx*c+dy*s),ly=Math.floor(PY-dx*s+dy*c);if(lx<0||ly<0||lx>=LW||ly>=LH)continue;const col=L[ly*LW+lx];if(!col)continue;r+=col&255;g+=col>>8&255;b+=col>>16&255;n++}
   if(!n)continue;const j=Y*W+X,col=rgb(r/n|0,g/n|0,b/n|0);out[j]=n===ns?col:mix(out[j],col,n/ns)}
  if(top)vPuffs(v)}}
function vFloorPx(v,lx,ly){const q=v.smap.get(K(lx,ly));let c=0;
 if(q&&!q.dead&&(q[7]!=='D'||!v.door.r)&&(q[7]!=='C'||!v.door.c)){c=q[7]==='T'||q[7]==='B'?vTrack(v,lx,ly,q[7]):q[7]==='e'&&v.fuse&&(tick>>2)%2?VPB:q[2];if(q[3]<q[6]&&q[7]!=='e')c=mul(c,.7+.3*q[3]/q[6])}
 else if(q&&q[7]==='C'&&v.door.c&&lx>=VC.XP&&ly<VC.CY-6)c=q[2];
 else if(v.door.r&&lx>=VC.L&&lx<VC.L+16){const k=ly<VC.CY?VC.CY-17-ly:ly-VC.CY-16,u=lx-VC.L;if(k>=-8&&k<0)c=v.dlm.get(K(u,k))||0}
 if(!c){const b=v.base[ly*VC.LW+lx];c=b?b&0xffffff:0}
 return c&&v.dead?vChar(c,lx,ly):c}
function vRoofPx(v,lx,ly,roof){const r=roof&&v.roofL[ly*VC.LW+lx];if(r)return r&0xffffff;const q=v.smap.get(K(lx,ly));return q&&!q.dead&&(q[7]==='w'||q[7]==='g'||q[7]==='D'&&!v.door.r||q[7]==='C'&&!v.door.c)?vFloorPx(v,lx,ly):0}
const vChar=(c,x,y)=>mix(c,rgb(26,22,20),.62+.3*hh(x,y,41));
function vTrack(v,x,y,w){const t=w==='T'?y:y-(VC.H-VC.TR),ph=Math.floor(v.ph[w==='T'?0:1]),e=t===0||t===VC.TR-1,lk=((x-ph)%4+4)%4===0;return e?rgb(30,30,32):lk?rgb(78,78,80):t===2?rgb(56,56,58):rgb(46,46,48)}
// the roof hides the crew unless a selected unit is aboard
function vRoof(v){if(v.dead)return false;for(const t of sel)if(t.type==='token'&&vHas(v,t))return false;return true}
function vHas(v,t){if(v.seats.includes(t))return true;const[lx,ly]=vW2L(v,t.x,t.y);return vInside(v,lx,ly)}

// mist from the roof grille: musket-like puffs, thicker while driving, fading after the engine stops
function vPuffs(v){for(const p of v.puffs){const R=Math.ceil(p.r);for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const d=Math.hypot(i,j)/p.r;if(d>1)continue;const X=Math.round(p.x+i),Y=Math.round(p.y+j);if(X<0||Y<0||X>=W||Y>=H)continue;const a=p.a*(1-d*d)*(.65+.35*hh(X+p.sd,Y,7));if(a>.01)out[Y*W+X]=mix(out[Y*W+X],p.c,Math.min(.8,a))}}}
function vMist(v){const run=Math.abs(v.sp)>.05||Math.abs(v.w)>.001,pw=v.on?1:Math.max(0,1-v.offT/180);
 if(pw>0&&!v.dead&&tick%(run?2:6)===0){const[gx,gy]=vL2W(v,VC.XST+8+(Math.random()-.5)*8,VC.RC[2]+(Math.random()-.5)*10),k=.55+Math.random()*.45;v.puffs.push({x:gx,y:gy,vx:(Math.random()-.5)*.12,vy:(Math.random()-.5)*.12-.03,r:2.5,gr:run?.16:.1,a:(run?.52:.42)*pw,c:rgb(52*k+20|0,50*k+20|0,54*k+22|0),sd:Math.random()*99|0,R:run?18:12})}
 if(v.fuse&&tick%2===0){const[gx,gy]=vL2W(v,VC.XST+8,VC.RC[2]);v.puffs.push({x:gx,y:gy,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:2,gr:.18,a:.55,c:rgb(34,32,34),sd:Math.random()*99|0,R:14})}
 for(const p of v.puffs){p.x+=p.vx;p.y+=p.vy;p.r+=p.gr;p.a*=.992;if(p.r>p.R*.7)p.a*=.95}v.puffs=v.puffs.filter(p=>p.r<p.R&&p.a>.02)}
// track marks: the tread pattern pressed into the ground at half a scorch's darkness, only while moving
function vMarks(v,d){if(d<.02)return;const k=Math.min(1,Math.abs(v.sp)/.25+.3);for(const w of['T','B']){const y0=w==='T'?0:VC.H-VC.TR,ph=Math.floor(v.ph[w==='T'?0:1]);for(const x of[4,5,6,7,8,VC.L-9,VC.L-8,VC.L-7,VC.L-6,VC.L-5])for(const t of[1,3]){const[gx,gy]=vL2W(v,x+.5,y0+t+.5),X=Math.floor(gx/2),Y=Math.floor(gy/2);if(X<0||Y<0||X>=BW||Y>=BH)continue;const q=Y*BW+X,lk=((x-ph)%4+4)%4<2;BURN[q]=Math.max(BURN[q],(lk?.36:.24)*k*(.85+.15*hh(X,Y,9)))}}fxDirty=true}

// driving: slow to start, slow to stop, slow to turn; the tracks run with the ground and counter-run to pivot
function vTick(){if(!VEH.length){if(VGP)VGP.style.display='none';return}if(tick%3===0)vAI();for(const v of VEH){const dv=vDriver(v);if(v.seats[0]&&!dv)v.seats[0]=null;
  for(let i=0;i<v.seats.length;i++){const t=v.seats[i];if(t&&(!bodies.includes(t)||t.status==='dead')){if(t.status==='dead'&&bodies.includes(t)){t.vseat=null}v.seats[i]=null}}
  const on=!!dv&&!v.dead;if(on!==!!v.on){v.on=on;if(on)sfx('vent');else v.offT=0}if(!v.on)v.offT++;
  let thr=0,turn=0;if(v.on){if(dv.direct&&sel.has(dv)){thr=(keys.has('w')?1:0)-(keys.has('s')?1:0);turn=(keys.has('d')?1:0)-(keys.has('a')?1:0)}else if(v.ai){thr=v.ai.thr;turn=v.ai.turn}}
  const ts=thr>0?.42:thr<0?-.22:0;v.sp+=Math.max(-.004,Math.min(.004,ts-v.sp))*(thr?1:1.6);if(Math.abs(v.sp)<.0015&&!thr)v.sp=0;
  const tw=turn*.004;v.w+=Math.max(-.00025,Math.min(.00025,tw-v.w));if(Math.abs(v.w)<.0002&&!turn)v.w=0;
  if(v.sp||v.w)vMove(v);
  v.ph[0]+=v.sp-v.w*VC.PY;v.ph[1]+=v.sp+v.w*VC.PY;
  vPin(v);vDoors(v);vMist(v);vWalkers(v);if(v.fuse&&--v.fuse===0)vBlow(v);
  if(v.on&&tick%34===0&&(Math.abs(v.sp)>.05||Math.abs(v.w)>.001))sfx('clank')}
 vPrompt()}
function vMove(v){const n={x:v.x-Math.cos(v.ang)*v.sp,y:v.y-Math.sin(v.ang)*v.sp,ang:v.ang+v.w};
 const tryPose=P=>{const px=vOrient(v,P),bx=Math.round(P.x),by=Math.round(P.y),cells=new Set();for(const p of px){const X=bx+p[0],Y=by+p[1];if(X<1||Y<1||X>=W-1||Y>=H-1)return null;const j=Y*W+X;if(sol[j]||OBJ[j]||slabG[j]&&slabG[j]!==v.id)return null;cells.add(j)}return{px,cells}};
 let P=n,r=tryPose(n);if(!r&&v.w){P={x:n.x,y:n.y,ang:v.ang};r=tryPose(P);if(r)v.w=0}if(!r&&v.sp){P={x:v.x,y:v.y,ang:n.ang};r=tryPose(P);if(r)v.sp=0}
 if(!r){if(Math.abs(v.sp)>.1)sfx('thunk');v.sp=0;v.w=0;return}
 // units outside in the way are shoved; one that can't give stops the carrier
 const carried=bodies.filter(b=>(b.type==='token'||b.type==='weapon')&&!inDrag(b)&&(v.seats.includes(b)||(()=>{const[lx,ly]=vW2L(v,b.x,b.y);return vInside(v,lx,ly)})()));
 for(const t of bodies){if(t.type!=='token'||carried.includes(t)||Math.abs(t.x-P.x)>90||Math.abs(t.y-P.y)>90)continue;const tx=Math.round(t.x),ty=Math.round(t.y);let hit=false;for(const p of t.px){if(p[0]*p[0]+p[1]*p[1]>45)continue;if(r.cells.has((ty+p[1])*W+tx+p[0])){hit=true;break}}if(!hit)continue;
  const[ax,ay]=vL2W({...v,...P},...vW2L(v,t.x,t.y)),mx=ax-t.x,my=ay-t.y,ml=Math.hypot(mx,my)||1,ox=t.x-P.x,oy=t.y-P.y,ol=Math.hypot(ox,oy)||1;moveToward(t,t.x+mx/ml*(ml+.8)+ox/ol*.6,t.y+my/ml*(ml+.8)+oy/ol*.6);
  const tx2=Math.round(t.x),ty2=Math.round(t.y);for(const p of t.px){if(p[0]*p[0]+p[1]*p[1]>45)continue;if(r.cells.has((ty2+p[1])*W+tx2+p[0])){v.sp=0;v.w=0;return}}if(t.status==='free'&&Math.abs(v.sp)>.3&&tick%20===0)sfx('pthud')}
 const old={x:v.x,y:v.y,ang:v.ang},moved=Math.hypot(P.x-v.x,P.y-v.y);
 for(const b of carried){const[lx,ly]=vW2L(old,b.x,b.y),[nx,ny]=vL2W(P,lx,ly);b.x=nx;b.y=ny;if(b.type==='token'&&b.ang!==undefined)b.ang+=P.ang-old.ang}
 const bx=Math.round(v.x),by=Math.round(v.y);for(const p of v.px){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H&&slabG[Y*W+X]===v.id)slabG[Y*W+X]=0}
 v.x=P.x;v.y=P.y;v.ang=P.ang;v.px=r.px;mkSet(v);vMark(v);vMarks(v,moved+Math.abs(P.ang-old.ang)*30);v.still=0;NAVD=true}
function vPin(v){v.seats.forEach((t,i)=>{if(!t)return;const[x,y]=vSit(i),[gx,gy]=vL2W(v,x,y);t.x=gx;t.y=gy;t.vx=t.vy=0;t.ang=v.ang+VSEATS[i][2];t.vseat=v;t.crouch=false})}
// doors open for anyone close by while the carrier stands, and shut once the doorway is clear
function vDoors(v){const near=(lx,ly,r)=>bodies.some(t=>t.type==='token'&&t.status!=='dead'&&!v.seats.includes(t)&&(()=>{const[a,b]=vW2L(v,t.x,t.y);return Math.hypot(a-lx,b-ly)<r})()),slow=Math.abs(v.sp)<.08&&!v.dead;
 for(const[k,lx,ly,r]of[['r',VC.L-4,VC.CY,18],['c',VC.XP+4,VC.CY,13]]){const want=slow&&(near(lx,ly,r)||v.hold&&v.hold[k]>tick);if(want){if(!v.door[k]){v.door[k]=1;sfx('door');vRefresh(v)}v.dT[k]=tick}else if(v.door[k]&&tick-v.dT[k]>40&&!near(lx,ly,r*.7)){v.door[k]=0;sfx('door');vRefresh(v)}}}
function vRefresh(v){v.dirty=1;const bx=Math.round(v.x),by=Math.round(v.y);for(const p of v.px){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H&&slabG[Y*W+X]===v.id)slabG[Y*W+X]=0}vOrient(v);vMark(v);NAVD=true}

// boarding and leaving: units walk set waypoints through the rear doors to a seat, or out behind the carrier
function vFree(v,role){const res=new Set(bodies.filter(t=>t.vwalk&&t.vwalk.v===v).map(t=>t.vwalk.i));for(let i=0;i<VSEATS.length;i++)if(!v.seats[i]&&!res.has(i)&&(role?VSEATS[i][3]===role:VSEATS[i][3]==='p'))return i;return -1}
function vBoard(v,t,i){if(i===undefined)i=vFree(v);if(i<0)return false;const[sx]=VSEATS[i],front=i<2,path=[[VC.L+14,VC.CY],[VC.L-14,VC.CY]];if(front)path.push([VC.XP+12,VC.CY],[VC.XP-6,VC.CY],[12.5,VC.CY]);else path.push([sx+.5,VC.CY]);path.push(vSit(i));t.vwalk={v,i,path,k:0,T:0,o:tick};t.ord=null;v.hold={r:tick+400,c:front?tick+400:0};return true}
function vSeatNow(v,t,i){v.seats[i]=t;t.vseat=v;t.vwalk=null;t.ord=null;t.mw=null;t.glide=null;if(t.held){t.psi=t.si;t.si=-1;t.held=null;t.hc=null}vPin(v);if(i===0)v.offT=0;sfx('flick')}
function vStand(v,t,out){const i=v.seats.indexOf(t);if(i<0)return;v.seats[i]=null;t.vseat=null;const front=i<2,sx=VSEATS[i][0]+.5;
 if(out){const path=front?[[12.5,VC.CY],[VC.XP-6,VC.CY],[VC.XP+12,VC.CY]]:[[sx,VC.CY]];const sp=v.seats.filter(Boolean).length+bodies.filter(o=>o.vwalk&&o.vwalk.v===v).length,side=sp%2?1:-1;path.push([VC.L-14,VC.CY],[VC.L+18,VC.CY],[VC.L+30+Math.random()*16,VC.CY+side*(10+Math.random()*26)]);t.vwalk={v,i:-1,path,k:0,T:0,o:tick*100-sx};v.hold={r:tick+400,c:front?tick+300:0};return}
 const[gx,gy]=vL2W(v,front?12.5:sx,VC.CY);t.x=gx;t.y=gy}
function vUnload(v){v.seats.forEach((t,i)=>{if(t&&i>1)vStand(v,t,true)})}
// one at a time through the aisle: a walker sets off once those already moving are clear of it
function vWalkers(v){const ws=bodies.filter(t=>t.vwalk&&t.vwalk.v===v).sort((a,b)=>a.vwalk.o-b.vwalk.o);for(const t of ws){const w=t.vwalk;if(w.go)continue;const[ax,ay]=vL2W(v,...w.path[0]);if(ws.every(o=>!o.vwalk.go||o.vwalk.k>=1&&Math.hypot(o.x-ax,o.y-ay)>=18))w.go=true;else break}
 for(const t of ws){const w=t.vwalk;if(!w||!w.go)continue;if(t.status!=='free'){t.vwalk=null;continue}const[lx,ly]=w.path[w.k],[gx,gy]=vL2W(v,lx,ly);moveToward(t,t.x+Math.max(-.8,Math.min(.8,gx-t.x)),t.y+Math.max(-.8,Math.min(.8,gy-t.y)));t.mv=6;turnTo(t,Math.atan2(gy-t.y,gx-t.x));
  if(Math.hypot(gx-t.x,gy-t.y)<1.6){w.k++;w.T=0;if(w.k>=w.path.length){t.vwalk=null;if(w.i>=0&&!v.seats[w.i])vSeatNow(v,t,w.i)}}else if(++w.T>240){t.vwalk=null;if(w.i>=0&&t.vstage)t.vboard=v}}
 for(const t of bodies)if(t.vboard===v&&!t.vwalk){const[gx,gy]=vL2W(v,...t.vstage);if(Math.hypot(gx-t.x,gy-t.y)<14){t.vboard=null;t.ord=null;if(!vBoard(v,t))say(t,'No room',true)}else if(!t.ord&&tick%30===0)ordGive([t],gx,gy)}}
// boarders wait at their own spot behind the carrier, clear of the doorway, until the aisle is free
function vSendAboard(v,g){let j=0;for(const t of g){if(t.type!=='token'||t.status!=='free'||vSeatOf(t))continue;const r=j>>1,sd=j%2?1:-1;j++;t.vstage=[VC.L+26+(r>>1)*16,VC.CY+sd*(20+(r%2)*16)];const[gx,gy]=vL2W(v,...t.vstage);t.vboard=v;t.direct=false;ordGive([t],gx,gy)}}

// G: take or leave a seat; the driver's seat drives
function vNearSeat(t){for(const v of VEH){if(v.dead)continue;const[lx,ly]=vW2L(v,t.x,t.y);let best=-1,bd=18;if(!vInside(v,lx,ly))continue;for(let i=0;i<VSEATS.length;i++){if(v.seats[i])continue;const[x,y]=vSit(i),d=Math.hypot(lx-x,ly-y);if(d<bd){bd=d;best=i}}if(best>=0)return[v,best]}return null}
function vKeyG(){const t=[...sel].find(b=>b.type==='token'&&b.direct&&b.status==='free');if(!t)return false;const s=vSeatOf(t);if(s){vStand(s[0],t,false);sfx('flick');return true}const n=vNearSeat(t);if(!n)return false;vSeatNow(n[0],t,n[1]);return true}
var VGP=null;function vPrompt(){const t=[...sel].find(b=>b.type==='token'&&b.direct&&b.status==='free'&&!vSeatOf(b));let at=null;
 if(t)for(const v of VEH){if(v.dead||v.seats[0])continue;const[x,y]=vSit(0),[lx,ly]=vW2L(v,t.x,t.y);if(Math.hypot(lx-x,ly-y)<18){at=vL2W(v,x,y);break}}
 if(!at){if(VGP)VGP.style.display='none';return}if(!VGP){VGP=document.createElement('div');VGP.className='vkey';VGP.textContent='G'}if(!VGP.parentNode)stage.appendChild(VGP);
 VGP.style.display='';VGP.style.left=(at[0]*S)+'px';VGP.style.top=((at[1]-9)*S)+'px'}
function vLabels(){for(const v of VEH){if(!vRoof(v))continue;for(const t of bodies)if(t.lab&&t.type==='token'&&vHas(v,t))t.lab.style.display='none'}}

// the engine goes: a short fuse of sparks and smoke, then a heavy blast; the hull is left a burnt shell
function vBlow(v){const[gx,gy]=vL2W(v,VC.XST+8,VC.RC[2]+.5);v.dead=true;v.on=0;v.sp=v.w=0;v.door.r=v.door.c=0;for(const t of v.seats)if(t){t.vseat=null}v.seats.fill(null);explode(gx,gy,2.4);const[cx,cy]=vL2W(v,VC.PX,VC.PY);explode(cx,cy,1.6);for(const q of v.src)if(q[7]==='e'||q[7]==='c'&&Math.random()<.5)q.dead=1;vRefresh(v);scorch(gx,gy,40);shake=Math.max(shake,12)}
function vBlastCheck(x,y,s){for(const v of VEH){if(v.dead||v.fuse)continue;const[lx,ly]=vW2L(v,x,y),d=Math.hypot(lx-(VC.XST+8),ly-VC.RC[2]);if(d<10+6*s&&vInside(v,lx,ly))vBreach(v)}}

// AI drivers close on the nearest foe, stop short and let their squad out
function vAI(){for(const v of VEH){const d=vDriver(v);if(!aiOn||!d||!d.ai||v.dead){v.ai=null;continue}const a=v.ai||(v.ai={thr:0,turn:0,st:'go',T:0,lx:v.x,ly:v.y,rev:0});
  const foes=bodies.filter(o=>o.type==='token'&&o.status==='free'&&foe(d,o)&&!vSeatOf(o));if(!foes.length){a.thr=a.turn=0;continue}let f=foes[0],fd=1e9;for(const o of foes){const k=Math.hypot(o.x-v.x,o.y-v.y);if(k<fd){fd=k;f=o}}
  const pax=v.seats.slice(2).some(Boolean);if(a.st==='go'&&fd<(pax?170:110)){a.st='stop';a.T=tick}
  if(a.st==='stop'){a.thr=a.turn=0;if(Math.abs(v.sp)<.02&&pax&&tick-a.T>30){vUnload(v);a.st='hold'}else if(!pax&&tick-a.T>30)a.st='hold';continue}
  if(a.st==='hold'){a.thr=a.turn=0;if(fd>220&&!v.seats.slice(2).some(Boolean))a.st='go';continue}
  if(a.rev>0){a.rev--;a.thr=-1;a.turn=a.rt;continue}
  let df=Math.atan2(f.y-v.y,f.x-v.x)-v.ang-Math.PI;while(df>Math.PI)df-=6.283;while(df<-Math.PI)df+=6.283;a.turn=Math.abs(df)>.06?Math.sign(df):0;a.thr=Math.abs(df)<.9?1:0;
  if(!a.thr)a.dT=0;else if(++a.dT%90===0){if(a.dT>=180&&Math.hypot(v.x-a.lx,v.y-a.ly)<4){if(fd<260){a.st='stop';a.T=tick;continue}a.rev=70;a.rt=Math.random()<.5?-1:1;a.dT=0}a.lx=v.x;a.ly=v.y}}}

function vPick(X,Y){const v=vAt(X,Y);return v&&!v.dead&&vDriver(v)||null}
function vMenu(v,e){closeMenu();const r=$('sm').getBoundingClientRect();menu=document.createElement('div');menu.className='menu';menu.style.left=(e.clientX-r.left+4)+'px';menu.style.top=(e.clientY-r.top+4)+'px';
 const it=(t,f)=>{const bt=document.createElement('button');bt.textContent=t;bt.onclick=()=>{f();closeMenu()};menu.appendChild(bt)};
 if(v.seats.slice(2).some(Boolean))it('Unload',()=>vUnload(v));if(vDriver(v))it('Driver out',()=>vStand(v,v.seats[0],true));if(v.seats[1])it('Commander out',()=>vStand(v,v.seats[1],true));
 if(!menu.children.length){menu=null;return}$('sm').appendChild(menu)}
{const e0=explode;explode=function(x,y,s=1){e0(x,y,s);vBlastCheck(x,y,s)}}
{const r0=render;render=function(){r0();vLabels()}}

// the test ground: a walled yard with a carrier and a Reaper squad dug in across it
MAPSZ.yard=[44,28];TITLE.yard='Fluoria · Carrier yard';ENVSET.yard='out';
NBM.yard=()=>paintAll((cx,cy)=>{if(cx===0||cy===0||cx===43||cy===27)return'stone.grey.block.w';
 if(cx>=33&&cx<=34&&(cy>=6&&cy<=9||cy>=18&&cy<=21))return'stone.grey.block.w';if(cx===30&&cy>=12&&cy<=15)return'stone.grey.block.w';
 if(cy>=12&&cy<=15)return'dirt';if((cx*7+cy*13)%23===0&&cx>3&&cx<28&&(cy<10||cy>17))return'bush';return'grass'});
NUM.yard=()=>{const v=carrier('steel',15*T,14*T,0,'Imperium');const g=[U('Legate Varro','Imperium','civ',0,0,0,'pistol','Officer'),U('Tribune Cass','Imperium','civ',0,0,0,'pistol','Officer')];vSeatNow(v,g[0],0);vSeatNow(v,g[1],1);
 ['Brask','Coll','Dunn','Ivo','Hale','Marl'].forEach((n,i)=>vSeatNow(v,U(n,'Imperium',i<2?'guard':'rifle',0,0,0),2+i));
 U('Ser Davin','Imperium','civ',4.5,6.5,0,'pistol','Officer');
 U('Gull','Reapers','home',37.5,8,Math.PI,'pistol');U('Rask','Reapers','guard',37.5,13.5,Math.PI);U('Teague','Reapers','shock',38.5,19,Math.PI,'spear');U('Brine','Reapers','home',36.5,22.5,Math.PI,'blunder');U('Kesh','Reapers','rifle',39.5,15.5,Math.PI,'rod');
 for(const t of bodies)if(t.type==='token'&&t.nat==='Imperium')t.auto=false};
{const o=document.createElement('option');o.value='yard';o.textContent='Fluoria carrier yard';const ms=$('msel');if(ms){ms.appendChild(o);MAPBASE.push(['yard','Fluoria carrier yard']);ms.value=curMap}}
if(curMap==='yard'){CW=-1;reset()}
