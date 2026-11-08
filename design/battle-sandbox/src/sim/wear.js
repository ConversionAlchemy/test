// wear and heat on walls, furniture and floors (one store, see README Materials), craters
function blastWear(x,y,s){vBlastWear(x,y,s);uBlast(x,y,s);BRY0=Math.min(BRY0,y-4*T);BRY1=Math.max(BRY1,y+4*T);const hv=s>1.5,R=(hv?3.3:2)*T,top=hv?4:3,AC={};
 for(let cy=Math.max(0,(y-R*2.6)/T|0);cy<=Math.min(CH-1,(y+R*2.6)/T|0);cy++)for(let cx=Math.max(0,(x-R*2.6)/T|0);cx<=Math.min(CW-1,(x+R*2.6)/T|0);cx++){const k=map[cy][cx],c=CATN[k],ok=OM[cy]&&OM[cy][cx],oe=ok&&objEl(ok);if(oe){const so=softOf(oe[0],oe[1]),bl=clsB(oe[0],oe[1]),Rm=R*1.3*(bl.reach||1)*(.55+.45*Math.min(1.2,so)),dx=Math.max(cx*T-x,0,x-cx*T-T+1),dy=Math.max(cy*T-y,0,y-cy*T-T+1),d=Math.hypot(dx,dy);if(d<Rm)wearObj(cx,cy,(1-d/Rm)*top*(bl.wear||26))}
  if(c&&c[3]&&AGE[c[0]]){const so=softOf(c[0],c[1]),bl=clsB(c[0],c[1]),Rm=R*1.3*(bl.reach||1)*(.55+.45*Math.min(1.2,so)),dx=Math.max(cx*T-x,0,x-cx*T-T+1),dy=Math.max(cy*T-y,0,y-cy*T-T+1),d=Math.hypot(dx,dy);if(d<Rm)wearWall(cx,cy,(1-d/Rm)*top*(bl.wear||26));continue}if(OM[cy]&&OM[cy][cx])continue;{const L0=ladL(k);if(L0>=0){earthWear(cx,cy,x,y,R,top,L0);continue}}if(!c||c[3]||!AGE[c[0]])continue;
  const c0=c[4]||5,so=softOf(c[0],c[1]),bl=clsB(c[0],c[1]),wf=bl.crater==='planks',Rm=R*(bl.floor||1)*(.55+.45*Math.min(1.2,so)),lv=(X,Y)=>{const d=Math.hypot(X-x,Y-y)/(Rm*(.8+.4*fbm(X/7,Y/7,91)));return d>=1?c0:Math.max(1,Math.min(c0,5-Math.round((wf?Math.pow(1-d,.9)*1.15:1-d)*top*Math.min(1.2,so)+.3)))};
  const cc=lv(cx*T+8,cy*T+8);if(cc<c0)map[cy][cx]=baseK(k)+'~'+cc;
  for(let y2=0;y2<T;y2++)for(let x2=0;x2<T;x2++){const X=cx*T+x2,Y=cy*T+y2,j=Y*W+X;if(sol[j])continue;const p=lv(X,Y);if(p>=c0)continue;const ak=c[0]+c[1]+p,A=AC[ak]||(AC[ak]=ageOf(c[0],c[1],p)),q=floor[j],r=A([q&255,q>>8&255,q>>16&255],X,Y,()=>9);floor[j]=rgb(cl(r[0]),cl(r[1]),cl(r[2]));if(PR)PR.floor[j]=floor[j]}}edgeMask()}
// walls lose condition as they're shot, chipped and blasted: each cell keeps a tally, every step of it wears one condition, softer materials faster; its wall neighbours take a share
// wear, one store. TW: per tile (layer 1 wall, 2 furniture; key twK): worn amount v, starting condition c0, the tile's cold pixels a once it
// first ages, and furniture's original key k. HT: per pixel: [heat, layer 1 wall 2 furniture 3 floor, cold colour]. Ageing repaints the
// cold colour and heat is laid back over it, so the two never fight.
const TW=new Map(),HT=new Map(),twK=(L,id)=>L*65536+id;
// furniture wears the same way, by its wood or metal from the material table
const objEl=k=>{const b=baseK(k);return WPIECE[b]?['Wood',WPIECE[b][0]]:MCHEST[b]?['Metal',MCHEST[b][0]]:MTABLE[b]?['Metal',MTABLE[b][0]]:null};
function wearObj(cx,cy,amt){wearTile(2,cx,cy,amt)}
function wallHit(X,Y,amt){const cx=X>>4,cy=Y>>4;wearWall(cx,cy,amt);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])wearWall(cx+dx,cy+dy,amt*.3)}
function wearWall(cx,cy,amt){wearTile(1,cx,cy,amt)}
// a wall or furniture tile takes wear; past each 9 its condition drops a step and its pixels age by its material
function wearTile(L,cx,cy,amt){if(cx<0||cy<0||cx>=CW||cy>=CH)return;const ob=L===2,k=ob?OM[cy]&&OM[cy][cx]:map[cy][cx];if(!k)return;let el,mt,cd;
 if(ob){const e=objEl(k);if(!e)return;[el,mt]=e;cd=condK(k)}else{const c=CATN[k];if(!c||!c[3])return;[el,mt]=c;cd=c[4]||5}if(!AGE[el])return;
 const id=twK(L,cy*CW+cx);let w=TW.get(id);if(!w)TW.set(id,w={v:0,c0:cd,a:null,k:ob?k:null});w.v+=amt*softOf(el,mt);const cc=Math.max(1,w.c0-Math.floor(w.v/9));if(cc>=cd)return;
 const arr=ob?OBJC:scol,on=ob?OBJ:sol;
 if(!w.a){w.a=new Uint32Array(T*T);for(let y=0;y<T;y++)for(let x=0;x<T;x++){const j=(cy*T+y)*W+cx*T+x,h=HT.get(j);w.a[y*T+x]=h&&h[1]===L?h[2]:arr[j]}}
 const A=ob?ageOf(el,mt,cc):ageOf(el,mt,cc,true)||ageOf(el,mt,cc);(ob?OM[cy]:map[cy])[cx]=baseK(k)+'~'+cc;if(!A)return;
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const X=cx*T+x,Y=cy*T+y,j=Y*W+X;if(!on[j])continue;const q=w.a[y*T+x],r=A([q&255,q>>8&255,q>>16&255],X,Y,()=>9),c=rgb(cl(r[0]),cl(r[1]),cl(r[2])),h=HT.get(j);
  if(h&&h[1]===L){h[2]=c;arr[j]=heatTint(c,clsAt(X,Y),h[0],X,Y)}else arr[j]=c}if(!ob)solDirty=true}
// very hot hits leave temper colours on metal: straw, bronze, blue at the centre
const TEMPER=CLS.metal.heat.temper;
// a class's chip colour, else the surface's own colour c
const chipC=(n,c)=>{const p=hcl(n).chip;return p?rgb(p[0],p[1],p[2]):c};
// a colour c of class cls heated to a (0 to 1), from its cold colour; X,Y place the speckled extras
function heatTint(c,cls,a,X=0,Y=0){const H=(CLS[cls]||CLS.stone).heat,o0=[c&255,c>>8&255,c>>16&255];if(H.temper){const f=temperF(a),f0=temperF(0);return rgb(cl(o0[0]*f[0]/f0[0]),cl(o0[1]*f[1]/f0[1]),cl(o0[2]*f[2]/f0[2]))}
 const lp=(p,q,u)=>[p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u,p[2]+(q[2]-p[2])*u],s=H.s;let i=1;while(i<s.length-1&&a>s[i][0])i++;
 const[p0,t0,m0]=s[i-1],[p1,t1,m1]=s[i],u=Math.min(1,Math.max(0,(a-p0)/(p1-p0))),t=lp(t0[0]?t0:t1,t1,u);let m=m0+(m1-m0)*u,o=o0;
 if(H.grain)m*=.82+.36*hh(X>>1,Y,13);
 if(H.fade){const L=(o[0]+o[1]+o[2])/3,F=lp(o,[L,L,L],.35).map(v=>Math.min(255,v*1.18));o=lp(o,F.map((v,k)=>v*t[k]),m)}else o=lp(o,t,m);const n=hh(X,Y,29);
 if(H.spall&&a>H.spall&&n>.9)o=lp(o,o0.map(v=>v*1.12),.9);
 if(H.glaze&&a>H.glaze&&n>.7)o=lp(o,[150,150,160],.35);
 if(H.ember&&a>H.ember&&n>.93)o=[222,110,40];
 if(H.hole&&a>H.hole)o=a<H.hole+.05?[190,92,40]:[14,11,10];
 return rgb(cl(o[0]),cl(o[1]),cl(o[2]))}
function temperF(a){let i=1;while(i<TEMPER.length-1&&a>TEMPER[i][0])i++;const[p0,f0]=TEMPER[i-1],[p1,f1]=TEMPER[i],u=Math.min(1,Math.max(0,(a-p0)/(p1-p0)));return f0.map((v,k)=>v+(f1[k]-v)*u)}
// a material's blast entry
const clsB=(el,mat)=>(CLS[mprop(el,mat).cls]||CLS.stone).blast;
// the material class of the surface showing at a pixel: wall, furniture or floor
function clsAt(X,Y,flo){const j=Y*W+X,cy=Y>>4,cx=X>>4;if(!sol[j]){const ok=!flo&&OBJ[j]&&OM[cy]&&OM[cy][cx];if(ok){const e=objEl(ok);return e?mprop(e[0],e[1]).cls:/hedge/.test(ok)?'foliage':mkC(ok)}const g=GT[j];if(g===1)return'grass';if(g===2)return'soil';if(g===3)return'stone'}return mkC(map[cy]&&map[cy][cx])}
// matK per tile key, cached; cleared when maps or custom textures change
const MKC=new Map(),mkC=k=>{let v=MKC.get(k);if(v===undefined){v=matK(k);MKC.set(k,v)}return v};
// heat marks every surface by its class's heat ramp, over the pixel's cold colour (HT)
function heatMark(x,y,r,k){vHeatMark(x,y,r,k);let fl=0;for(let Y=Math.floor(y-r);Y<=y+r;Y++)for(let X=Math.floor(x-r);X<=x+r;X++){if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X,d=Math.hypot(X-x,Y-y);if(d>r)continue;
  const cls=clsAt(X,Y),Hh=(CLS[cls]||CLS.stone).heat;let a=Math.min(Hh.max||.95,k*(1-d/r)*(.85+.3*hh(X,Y,71)));if(Hh.soft){const e=Math.min(1,(1-d/r)*(Hh.fade?2.4:1.6));a*=e*e*(3-2*e)}
  const L=sol[j]?1:OBJ[j]?2:3,arr=L===1?scol:L===2?OBJC:floor;let h=HT.get(j);if(!h||h[1]!==L)HT.set(j,h=[0,L,arr[j]]);if(a<=h[0])continue;
  h[0]=a;arr[j]=heatTint(h[2],cls,a,X,Y);if(L>1)fl=1}
 const c0=clsAt(Math.round(x),Math.round(y)),Hc=(CLS[c0]||CLS.stone).heat;if(Hc.craze&&k>Hc.craze)for(let n=0;n<4;n++){let X=x,Y=y,ang=n*1.6+hh(x|0,y|0,5)*6;for(let s=0;s<r*.7;s++){ang+=(hh(n+(x|0),s+(y|0),7)-.5)*.9;X+=Math.cos(ang);Y+=Math.sin(ang);const jx=X|0,jy=Y|0;if(jx<0||jy<0||jx>=W||jy>=H)break;const q=jy*W+jx;if(sol[q])scol[q]=mul(scol[q],.86);else{floor[q]=mul(floor[q],.86);fl=1}}}
 solDirty=true;if(fl){BRY0=Math.min(BRY0,y-r-3);BRY1=Math.max(BRY1,y+r+5)}
 const X0=Math.round(x),Y0=Math.round(y);if(X0>=0&&Y0>=0&&X0<W&&Y0<H){const ig=(CLS[clsAt(X0,Y0)]||CLS.stone).heat.ignite;if(ig&&k*.95>=ig&&TF[(Y0>>1)*BW+(X0>>1)]<.3){emberPatch(x,y,4+r|0,r*.5);dab(TF,x,y,.3+.5*k,Math.max(2,r*.3|0))}}}
// a blast breaks a built floor by its material: stone and marble through to soil with a chipped edge and hairline cracks, wood broken through to soil inside a rim of splintered board ends, cloth burnt through, metal dented with a bright lip; how far follows toughness
// what lies under a carpet: the cell's underlay, else plain boards
const UPX=new Map();function under(X,Y){const cx=X>>4,cy=Y>>4,id=cy*CW+cx;let d=UPX.get(id);if(!d||d.m!==curMap){d=tilePix(undAt(cx,cy)||'wood.oak.planks',cx,cy);d.m=curMap;UPX.set(id,d)}const i=((Y&15)*T+(X&15))*4;return rgb(d[i],d[i+1],d[i+2])}
const blastSoft=(x,y)=>{const c=CATN[map[Math.round(y)>>4]&&map[Math.round(y)>>4][Math.round(x)>>4]];return c&&!clsB(c[0],c[1]).firm?Math.max(1,Math.min(1.6,softOf(c[0],c[1])*1.05)):1};
function crater(x,y,s){const r=6.5*s,rr=s>1.5?.85:.7;for(let Y=Math.floor(y-r*2);Y<=y+r*2;Y++)for(let X=Math.floor(x-r*2);X<=x+r*2;X++){if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(sol[j])continue;
  const dx=X-x,dy=Y-y,e=r*(.78+.44*fbm(X/4,Y/4,93)),q=Math.hypot(dx,dy)/e;if(q>=2)continue;
  if(GT[j]!==1&&GT[j]!==2){const mk=map[Y>>4][X>>4];if(mk==='sky')continue;const f0=floor[j],cc=CATN[mk],cr=cc?clsB(cc[0],cc[1]).crater||'chips':'chips',P=cc?mprop(cc[0],cc[1]):{hp:3},so=cc?softOf(cc[0],cc[1]):1,old=DMG[j];
   if(cr==='dent'){// metal dents: a darkened dish with a bright torn lip; a heavy blast tears soft metal through
    const qd=q/(rr*1.3*so);if(qd<1){floor[j]=s>1.5&&P.hp<=5&&qd<.4?rgb(...sc(soilT(X,Y),.5).map(cl)):mul(floor[j],old?.94:.5+.4*qd)}else if(qd<1.2&&hh(X,Y,99)>.35)floor[j]=mul(floor[j],1.22)}
   else{const wd=cr==='planks',cl0=cr==='cloth',qw=q,rw=cl0?rr*2.6:rr*so;
    if(qw<rw){if(old)floor[j]=mul(floor[j],.94);else if(wd){const e2=qw/rw;if(e2<.78){const f=sc(soilT(X,Y),.6+.35*e2);floor[j]=rgb(cl(f[0]),cl(f[1]),cl(f[2]))}else floor[j]=hh(X>>2,Y,98)>.6?mul(floor[j],.5):rgb(cl(30+18*e2),cl(22+12*e2),cl(16+8*e2))}
     else if(cl0){const ed=qw/rw;if(ed<.62){const u=under(X,Y);floor[j]=ed>.5&&hh(X,Y,98)>.5?rgb(36,28,24):mul(u,ed>.45?.6:.82)}else floor[j]=hh(X,Y,98)>.55?mul(floor[j],.4):rgb(cl(36+20*ed),cl(28+10*ed),24)}
     else{const f=sc(soilT(X,Y),.62+.3*qw/rw),g=hh(X>>1,Y>>1,98);floor[j]=g>.86&&qw>rw*.4?mul(floor[j],.62):rgb(cl(f[0]),cl(f[1]),cl(f[2]))}GT[j]=3;SHN[j]=0}
    else if(qw<rw*(cl0?1.6:1.25)&&!old&&hh(X,Y,99)>(cl0?.3:.45)){floor[j]=mul(floor[j],cl0?.6+.25*hh(X,Y,97):.5);SHN[j]=0}
    else if(qw<rw*1.9&&!old&&!cl0&&(wd?Math.abs(vn(X/9,Y*1.6,95)-.5)<.04:Math.abs(vn(X/2.5,Y/2.5,95)-.5)<.07))floor[j]=mul(floor[j],.72)}
   if(floor[j]!==f0)DMG[j]=1;continue}const so=soilT(X,Y);let c=null;
  if(q<1){const lit=(-dx*.6-dy*.8)/e;const k=(.6+.32*q)*(1-lit*.16*(1-q))*(q<.45?.85:1);c=sc(so,k*(GT[j]===2?.92:1))}
  else if(q<1.35){if(hh(X,Y,94)<(1.35-q)/.35*1.3)c=sc(so,1.02+hh(X,Y,95)*.08)}
  else if(hh(X,Y,96)<(2-q)*.22&&parts.length<1500){const k=sc(so,.8+hh(X,Y,97)*.2);parts.push({x:X,y:Y,vx:0,vy:0,c:rgb(cl(k[0]),cl(k[1]),cl(k[2]))})}
  if(!c)continue;const n=rgb(cl(c[0]),cl(c[1]),cl(c[2])),o=floor[j],lum=v=>(v&255)+(v>>8&255)+(v>>16&255);floor[j]=GT[j]===2&&q<1&&lum(o)<lum(n)?o:n;GT[j]=2;DMG[j]=1}}
