// region map: the clock switches between it and the cell maps; nations, their forces and people live here between battles
(()=>{const D=RGD;
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)],mixc=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),css=(c,a=1)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
const VOID=[13,16,21],PAPER=[226,216,188];
// ---- geometry: shared edges give coasts, borders and cell outlines
const[[bx0,by0],[bx1,by1]]=D.box,BOXC=[(bx0+bx1)/2,(by0+by1)/2];
const EK=p=>Math.round(p[0]*10)+','+Math.round(p[1]*10),E=new Map();
D.cells.forEach((c,i)=>{const P=c.p;for(let j=0;j<P.length;j++){const a=P[j],b=P[(j+1)%P.length],k=[EK(a),EK(b)].sort().join('|');let e=E.get(k);if(!e)E.set(k,e={a,b,c:[]});e.c.push(i)}});
const nb=D.cells.map(()=>[]);for(const e of E.values())if(e.c.length===2){nb[e.c[0]].push(e.c[1]);nb[e.c[1]].push(e.c[0])}
const land=c=>c.h>=20,hash=i=>{const x=Math.sin(i*127.1)*43758.5;return x-Math.floor(x)};
const vis=D.cells.map((c,i)=>{const dx=Math.max(bx0-c.c[0],0,c.c[0]-bx1),dy=Math.max(by0-c.c[1],0,c.c[1]-by1),d=Math.hypot(dx,dy);if(!d)return 1;return Math.max(0,Math.min(1,1-d/110+(hash(i)-.5)*.25))});
const ST=Object.fromEntries(D.states.filter(s=>s.c).map(s=>[s.i,s]));
const CEN=D.cells.map(c=>{let A=0,x=0,y=0;const P=c.p;for(let i=0;i<P.length;i++){const[a1,b1]=P[i],[a2,b2]=P[(i+1)%P.length],k=a1*b2-a2*b1;A+=k;x+=(a1+a2)*k;y+=(b1+b2)*k}return A?[x/(3*A),y/(3*A)]:c.c});
const near=pt=>{let bi=-1,bd=1e9;for(let i=0;i<D.cells.length;i++){const c=D.cells[i].c,d=(c[0]-pt[0])**2+(c[1]-pt[1])**2;if(d<bd){bd=d;bi=i}}return bi};
let RV=[];const rvCalc=()=>{RV=D.routes.map(r=>{let m=0;for(const p of r.pts)m=Math.max(m,vis[near(p)]);return m})};rvCalc();const RVI=D.burgs.map(b=>vis[near([b.x,b.y])]);
const BURG={};for(const b of D.burgs)if(!BURG[b.n]||Math.hypot(b.x-BOXC[0],b.y-BOXC[1])<Math.hypot(BURG[b.n].x-BOXC[0],BURG[b.n].y-BOXC[1]))BURG[b.n]=b;
const CELLB={};for(const n in BURG)CELLB[near([BURG[n].x,BURG[n].y])]=BURG[n];
const placeOf=i=>{if(CELLB[i])return CELLB[i].n;const c=D.cells[i].c;let bb=null,bd=1e9;for(const b of D.burgs){const d=Math.hypot(b.x-c[0],b.y-c[1]);if(d<bd){bd=d;bb=b}}return(bd<28?'Outskirts of ':'Near ')+bb.n};
const cellXY=i=>CELLB[i]?[CELLB[i].x,CELLB[i].y]:D.cells[i].c;

const EDK=D.burgs.find(b=>b.n==="Emperor's Dock");
const HOLD={Havenport:['Havenport','Overbay','Smugglerskeep','Towerbay','Templewood'],'Great Keys':['Great Keys'],Portsbridge:['Goldbank','Goldtown','Carnival','Holywell','Portsbridge','Shantyport','Codsbrook','Monestry','Crossroads',"Willard's Pass",'Fumbleweed'],
 Astria:["Emperor's Dock"],Reapers:['Mudwater',"Bog's Keep",'Shadowtower',"Willow's Ranch"]};
// lands beyond the close-up keep the nation drawn for them; inside it the old states pass to the nations that replaced them
const KEEPN={Aracia:'Old Kingdoms',Whitecoast:'Whitecoast',Lindale:'Reapers',Holverland:'Hoverlands'},KEEP=new Set(Object.values(KEEPN)),OWN=(()=>{const O=D.cells.map(c=>!land(c)?null:c.o?c.o:ST[c.s]&&KEEPN[ST[c.s].n]||null),dist=D.cells.map(()=>1e9),Q=[];
 const at=n=>{let b=null,d=1e9;for(const o of D.burgs)if(o.n===n){const e=Math.hypot(o.x-BOXC[0],o.y-BOXC[1]);if(e<d){d=e;b=o}}return b};
 for(const nat in HOLD)for(const t of HOLD[nat]){const b=at(t);if(!b)continue;let bi=0,bd=1e9;D.cells.forEach((c,i)=>{const e=(c.c[0]-b.x)**2+(c.c[1]-b.y)**2;if(e<bd){bd=e;bi=i}});dist[bi]=0;O[bi]=nat;Q.push([0,bi,nat])}
 // Great Keys keeps to its own ground: its city and the cells touching it
 while(Q.length){Q.sort((a,b)=>b[0]-a[0]);const[d,i,nat]=Q.pop();if(d>dist[i])continue;const lim=nat==='Great Keys'?14:1e9;
  for(const j of nb[i]){const c=D.cells[j];if(!land(c)||O[j]&&KEEP.has(O[j]))continue;const nd=d+Math.hypot(c.c[0]-D.cells[i].c[0],c.c[1]-D.cells[i].c[1]);if(nd<dist[j]&&nd<=lim){dist[j]=nd;O[j]=nat;Q.push([nd,j,nat])}}}
 return O})();
// ---- overlay over the map view, a zone in the side panel
const OV=mk('div','rgo');OV.hidden=true;const cv=mk('canvas'),TIP=mk('div','rgtip'),CARDS=mk('div','rgcards');OV.append(cv,TIP,CARDS);VIEW.append(OV);
let g=cv.getContext('2d'),dpr=1;let VW=1,VH=1;
const ZR=mk('div','zr');ZR.hidden=true;SIDE0.append(ZR);

// ---- terrain: what each cell is and how it plays; the Tiler sets it
const TT={ice:{n:'Ice',w:1,h:6,p:['#c9d6d8','#d6e1e2','#e2eaea','#edf2f1']},deep:{n:'Deep sea',w:1,h:4,p:['#7898a2','#7e9ea8','#85a4ad','#9db8be']},sea:{n:'Sea',w:1,h:12,p:['#88a8b0','#8eaeb5','#95b3ba','#abc4c8']},shallow:{n:'Shallows',w:1,h:18,p:['#9ebcbd','#a5c2c2','#adc8c7']},
 plains:{n:'Plains',h:30,b:4,p:['#7b7f47','#83874d','#8b8e53','#93955a','#9d9d61']},dry:{n:'Dry plains',h:30,b:3,p:['#8b8350','#958c57','#9e955e','#a89d65','#b2a56d']},
 marsh:{n:'Marsh',h:24,b:12,p:['#6a7450','#717b55','#78825b','#5f7672','#6a817b','#555e3c']},woods:{n:'Woods',h:34,b:6,f:1,p:['#3c4524','#566131','#68733a','#7a8644','#8d984f']},
 hills:{n:'Hills',h:60,b:4,p:['#6f7042','#7a7a48','#85844f','#908d56','#9b975e']},mountains:{n:'Mountains',h:72,b:4,p:['#4e4a42','#6c675d','#787267','#837d71','#8f897c','#a8a295']}};
const TTL=['plains','dry','marsh','woods','hills','mountains'],TTW=['shallow','sea','deep','ice'];
const terOf=c=>c.ice?'ice':c.h<20?(c.h<8?'deep':c.h<15?'sea':'shallow'):c.f?'woods':c.h>=66?'mountains':c.h>=58?'hills':c.b===12?'marsh':c.b>=1&&c.b<=3?'dry':'plains';
for(const c of D.cells)c.t=terOf(c);
function setTer(c,t){const T=TT[t],was=land(c);c.t=t;c.ice=t==='ice'?1:0;c.f=T.f||0;c.b=T.w?0:T.b;if(T.w||!was||t==='hills'||t==='mountains'||c.h>=58)c.h=T.h}
const terrainOf=c=>TT[c.t].n;
// a cell that turns to water belongs to no one; new land joins the nation most around it
function ownFix(i){if(!land(D.cells[i])){OWN[i]=null;return}if(OWN[i])return;const n={};for(const j of nb[i])if(OWN[j])n[OWN[j]]=(n[OWN[j]]||0)+1;OWN[i]=Object.keys(n).sort((a,b)=>n[b]-n[a])[0]||null}
// pixel tiles: each kind a 64-pixel square worked from its own few tones, close in value so nothing shouts
const B4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],TP=64,smt=t=>t*t*(3-2*t),th=(a,b,s)=>{const v=Math.sin(a*127.1+b*311.7+s*17.3)*43758.5453;return v-Math.floor(v)},wr=(v,P)=>((v%P)+P)%P;
function pv(x,y,s,Px,Py=Px){const xi=Math.floor(x),yi=Math.floor(y),fx=smt(x-xi),fy=smt(y-yi),a=th(wr(xi,Px),wr(yi,Py),s),b=th(wr(xi+1,Px),wr(yi,Py),s),c=th(wr(xi,Px),wr(yi+1,Py),s),d=th(wr(xi+1,Px),wr(yi+1,Py),s);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy}
const mot=(X,Y,s)=>pv(X/16,Y/16,s,TP/16)*.55+pv(X/6,Y/6,s+1,TP/6|0||1)*.25+pv(X/2,Y/2,s+2,TP/2)*.1+th(X,Y,s+3)*.1;
const TILE={};
function terTile(t){if(TILE[t])return TILE[t];const TP=t==='woods'?63:64;const P=TT[t].p.map(hex),n=P.length,A=new Uint8Array(TP*TP),at=(x,y)=>A[wr(y,TP)*TP+wr(x,TP)],put=(x,y,v)=>{A[wr(y,TP)*TP+wr(x,TP)]=v};
 // a continuous value laid over the tones with an ordered dither, so tones fade into each other in pixels
 const dq=(x,y,v,m=n)=>Math.max(0,Math.min(m-1,Math.floor(v*m+(B4[(y&3)*4+(x&3)]/16-.5)*.9)));
 const lay=(f,m)=>{for(let y=0;y<TP;y++)for(let x=0;x<TP;x++)put(x,y,dq(x,y,f(x,y),m))};
 if(TT[t].w){lay((x,y)=>mot(x,y,11)*.9+.05,3);if(t!=='shallow'){// short swell lines, staggered rows
   for(let r=0;r<TP/6;r++){const y=r*6+(r&1)*3;for(let k=0;k<2;k++){const x0=(th(r,k,14)*TP)|0,L=4+(th(r,k,15)*5|0);for(let d=0;d<L;d++)put(x0+d,y+(d===0||d===L-1?1:0),3)}}}}
 else if(t==='woods'){// small crowns packed close in offset rows, lit upper left, dark gaps showing between
  A.fill(0);const S=['.43.','4321','3211','.10.'],T=[];for(let gy=0;gy<21;gy++)for(let gx=0;gx<21;gx++)T.push([gx*3+(gy%3),gy*3+(th(gx,gy,22)>.7?1:0),th(gx,gy,23)]);T.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);const O=new Int16Array(TP*TP).fill(-1),own=(x,y,v,cy)=>{const j=wr(y,TP)*TP+wr(x,TP),o=O[j];if(o<0||wr(cy-o,TP)<TP/2){A[j]=v;O[j]=wr(cy,TP)}};
  // later rows cover earlier ones, counted round the tile's wrap so it repeats without a seam
  for(const[cx,cy,v]of T){const d=v<.25?1:v>.85?-1:0;for(let r=0;r<4;r++)for(let c=0;c<4;c++){const ch=S[r][c];if(ch==='.')continue;own(cx+c,cy+r,Math.max(1,Math.min(4,+ch-d)),cy)}own(cx+2,cy+4,0,cy);own(cx+3,cy+3,0,cy);own(cx+3,cy+4,0,cy)}}
 else if(t==='mountains'){// rock in stepped ledges seen from above: each ledge's lower right edge drops in shadow, its upper left edge catches the light, like a wall's top
  const h=(x,y)=>{let v=0,a=1,f=1/32;for(let o=0;o<3;o++){v+=a*pv(x*f,y*f,140+o,TP*f);a*=.4;f*=2}return v/1.56},L=new Uint8Array(TP*TP);
  for(let y=0;y<TP;y++)for(let x=0;x<TP;x++)L[y*TP+x]=Math.max(0,Math.min(11,Math.floor(h(x,y)*16-3)));const lv=(x,y)=>L[wr(y,TP)*TP+wr(x,TP)];
  for(let y=0;y<TP;y++)for(let x=0;x<TP;x++){const l=lv(x,y),g2=mot(x,y,49);let o;
   if(lv(x-1,y-1)>l||lv(x-2,y-2)>l)o=lv(x-1,y-1)>l?0:1;else if(lv(x+1,y+1)<l||lv(x+1,y)<l)o=n-1;else o=dq(x,y,.2+(l%4)*.12+(g2-.5)*.45,n-2)+1;
   if(o>1&&th(x,y,50)>.93)o--;else if(o<n-2&&th(x,y,51)>.95)o++;put(x,y,o)}}
 else if(t==='hills'){const h=(x,y)=>pv(x/16,y/16,31,TP/16)+.35*pv(x/8,y/8,32,TP/8);
  lay((x,y)=>.5+(h(x-1,y-1)-h(x+1,y+1))*3+(mot(x,y,33)-.5)*.2);grass(.03)}
 else{lay((x,y)=>mot(x,y,t==='dry'?51:61)*1.1-.05,t==='marsh'?3:n);
  if(t==='marsh'){for(let y=0;y<TP;y++)for(let x=0;x<TP;x++){const w=pv(x/7,y/5,71,TP/7|0,TP/5|0);if(w>.64)put(x,y,w>.72?4:3)}for(let y=0;y<TP;y++)for(let x=0;x<TP;x++)if(th(x,y,73)>.93&&at(x,y)<3){put(x,y,5);put(x,y-1,5);if(th(x,y,74)>.5)put(x+1,y-1,5)}}
  else grass(t==='dry'?.035:.06)}
 // tufts: small upright strokes in clumps, a dark root under a lighter blade
 function grass(den){for(let y=0;y<TP;y++)for(let x=0;x<TP;x++){if(th(x,y,77)>den*(pv(x/9,y/9,78,TP/9|0||1)*2))continue;const b=at(x,y),hi=Math.min(n-1,b+2),lo=Math.max(0,b-2);put(x,y+1,lo);put(x,y,hi);put(x,y-1,hi);if(th(x,y,79)>.4){const sd=th(x,y,80)>.5?1:-1;put(x+sd,y,hi);put(x+sd,y+1,lo)}}}
 return TILE[t]={A,P,s:TP}}
// the ground is rendered once into pixels, one per map unit, and redrawn only when the terrain changes
const COASTP={foam:hex('#dfe9e5'),band:hex('#bcd3d1'),rip:hex('#ccdfdc'),shore:.82};
let TC=null;
// cells by bucket, so a pixel finds its cell quickly; each pixel takes the cell under a slightly wandering point, so borders fray
const BK=24,BGX=Math.floor(bx0/BK)-2,BGY=Math.floor(by0/BK)-2,BW=Math.ceil((bx1-bx0)/BK)+5,BH=Math.ceil((by1-by0)/BK)+5,BKT=Array.from({length:BW*BH},()=>[]);
D.cells.forEach((c,i)=>{const gx=Math.floor(c.c[0]/BK)-BGX,gy=Math.floor(c.c[1]/BK)-BGY;if(gx>=0&&gy>=0&&gx<BW&&gy<BH)BKT[gy*BW+gx].push(i)});
const CX=Float64Array.from(D.cells,c=>c.c[0]),CY=Float64Array.from(D.cells,c=>c.c[1]);
const cellPx=(x,y)=>{const gx=Math.floor(x/BK)-BGX,gy=Math.floor(y/BK)-BGY;let bi=-1,bd=1e18;for(let b=gy-1;b<=gy+1;b++){if(b<0||b>=BH)continue;for(let a=gx-1;a<=gx+1;a++){if(a<0||a>=BW)continue;const L=BKT[b*BW+a];for(let k=0;k<L.length;k++){const i=L[k],dx=CX[i]-x,dy=CY[i]-y,d=dx*dx+dy*dy;if(d<bd){bd=d;bi=i}}}}return bi<0?near([x,y]):bi};
const DM=12,RAISE={woods:2,mountains:5,hills:1};
function terrain(){if(TC)return TC;const x0=Math.floor(bx0-8),y0=Math.floor(by0-8),W=Math.ceil(bx1-bx0+16),H=Math.ceil(by1-by0+16),cv2=mk('canvas');cv2.width=W;cv2.height=H;
 const ctx=cv2.getContext('2d');TC={cv:cv2,ctx,x0,y0,W,H,CI:new Int32Array(W*H),img:ctx.createImageData(W,H)};
 const lw=(W>>2)+3,lh=(H>>2)+3,LA=new Float32Array(lw*lh),LB=new Float32Array(lw*lh);for(let j=0;j<lh;j++)for(let i=0;i<lw;i++){LA[j*lw+i]=th(i,j,81)-.5;LB[j*lw+i]=th(i,j,82)-.5}
 const lat=(L,x,y)=>{const u=x/4,v=y/4,i=u|0,j=v|0,fu=smt(u-i),fv=smt(v-j),o=j*lw+i,a=L[o],b=L[o+1],c=L[o+lw],d=L[o+lw+1];return a+(b-a)*fu+(c-a)*fv+(a-b-c+d)*fu*fv};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)TC.CI[y*W+x]=cellPx(x0+x+lat(LA,x,y)*6,y0+y+lat(LB,x,y)*6)
 paintRect(0,0,W,H);return TC}
// repaint a box of pixels; the shore distance is measured with a margin so a box can be redone on its own
function paintRect(ax,ay,bx,by){const{W,H,CI,x0,y0,img}=TC,o=img.data;ax=Math.max(0,ax|0);ay=Math.max(0,ay|0);bx=Math.min(W,Math.ceil(bx));by=Math.min(H,Math.ceil(by));
 const mx=Math.max(0,ax-DM),my=Math.max(0,ay-DM),Mx=Math.min(W,bx+DM),My=Math.min(H,by+DM),w=Mx-mx,h=My-my,LD=new Uint8Array(w*h),DW=new Float32Array(w*h).fill(1e9);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)LD[y*w+x]=land(D.cells[CI[(my+y)*W+mx+x]])?1:0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=y*w+x;if(LD[j]&&((x>0&&!LD[j-1])||(x<w-1&&!LD[j+1])||(y>0&&!LD[j-w])||(y<h-1&&!LD[j+w])))DW[j]=0}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=y*w+x;if(x>0)DW[j]=Math.min(DW[j],DW[j-1]+1);if(y>0)DW[j]=Math.min(DW[j],DW[j-w]+1);if(x>0&&y>0)DW[j]=Math.min(DW[j],DW[j-w-1]+1.41);if(x<w-1&&y>0)DW[j]=Math.min(DW[j],DW[j-w+1]+1.41)}
 for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const j=y*w+x;if(x<w-1)DW[j]=Math.min(DW[j],DW[j+1]+1);if(y<h-1)DW[j]=Math.min(DW[j],DW[j+w]+1);if(x<w-1&&y<h-1)DW[j]=Math.min(DW[j],DW[j+w+1]+1.41);if(x>0&&y<h-1)DW[j]=Math.min(DW[j],DW[j+w-1]+1.41)}
 for(let y=ay;y<by;y++)for(let x=ax;x<bx;x++){const j=y*W+x,l=(y-my)*w+x-mx,X=x0+x,Y=y0+y,c=D.cells[CI[j]],T=terTile(c.t),k=T.A[wr(Y,T.s)*T.s+wr(X,T.s)],dth=B4[(y&3)*4+(x&3)]/16;let col=T.P[Math.min(k,T.P.length-1)];
  if(LD[l]){if(DW[l]===0)col=col.map(v=>v*COASTP.shore);const rz=RAISE[c.t]||0;if(rz<3){for(let d=1;d<=5;d++){const q2=CI[Math.max(0,y-d)*W+Math.max(0,x-d)];if((RAISE[D.cells[q2].t]||0)>rz&&d<=(RAISE[D.cells[q2].t])){col=col.map(v=>v*(.66+d*.06));break}}}}
  else{const d=DW[l];if(d<1.2)col=COASTP.foam;else if(d<3)col=COASTP.band;else if(d>=4&&d<5)col=COASTP.rip;else if(d<8&&dth<(8-d)/6)col=COASTP.band}
  const dx=Math.max(bx0-X,0,X-bx1),dy=Math.max(by0-Y,0,Y-by1),v=dx||dy?Math.max(0,1-Math.hypot(dx,dy)/110+(pv(X/9,Y/9,91,1e6)-.5)*.25):1;
  if(v<1){const grey=(col[0]+col[1]+col[2])/3,f=Math.round((1-v)*6+dth-.5)/6;col=col.map(c2=>c2+(grey-c2)*f*.8);col=col.map((c2,q2)=>c2+(VOID[q2]-c2)*Math.min(1,f*1.05))}
  o[j*4]=col[0];o[j*4+1]=col[1];o[j*4+2]=col[2];o[j*4+3]=255}
 TC.ctx.putImageData(img,0,0,ax,ay,bx-ax,by-ay)}
// after a cell changes: its pixels and the shore around them
function repaintCell(i){if(!TC)return;let a=1e9,b=1e9,A=-1e9,B=-1e9;for(const[x,y]of D.cells[i].p){a=Math.min(a,x);b=Math.min(b,y);A=Math.max(A,x);B=Math.max(B,y)}paintRect(a-TC.x0-14,b-TC.y0-14,A-TC.x0+14,B-TC.y0+14)}
// ---- drawing; g, VW, VH and view can be pointed at the clock's preview too
let view={k:1,x:0,y:0};
const S2W=(x,y)=>[(x-view.x)/view.k,(y-view.y)/view.k],W2S=(x,y)=>[x*view.k+view.x,y*view.k+view.y];
function poly(P){g.beginPath();g.moveTo(P[0][0],P[0][1]);for(let j=1;j<P.length;j++)g.lineTo(P[j][0],P[j][1]);g.closePath()}
// Catmull-Rom through every point, so roads meet exactly where they share one
function line(p){g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=0;i<p.length-1;i++){const a=p[i-1]||p[i],b=p[i],c=p[i+1],d=p[i+2]||c;g.bezierCurveTo(b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6,c[0]-(d[0]-b[0])/6,c[1]-(d[1]-b[1])/6,c[0],c[1])}}
function voidFrame(){const[a0,b0]=W2S(bx0,by0),[a1,b1]=W2S(bx1,by1),k=view.k,m=26*k,f=Math.max(30,70*k);
 g.save();g.filter=`blur(${f}px)`;g.fillStyle=css(VOID);g.beginPath();g.rect(-2000,-2000,VW+4000,VH+4000);g.roundRect(a0-m,b0-m,a1-a0+2*m,b1-b0+2*m,60*k);g.fill('evenodd');g.restore();
 g.save();g.globalAlpha=.85;g.fillStyle=css(VOID);g.beginPath();g.rect(-2000,-2000,VW+4000,VH+4000);g.roundRect(a0-m-f*1.6,b0-m-f*1.6,a1-a0+2*m+3.2*f,b1-b0+2*m+3.2*f,90*k);g.fill('evenodd');g.restore()}
// the shore seen in the water: a soft pale fade, a white ripple a little way out, a pale band and a white edge
let COAST=null;
function coast(){if(!COAST){COAST=[];for(const e of E.values()){if(e.c.length<2)continue;const[a,b]=e.c.map(i=>D.cells[i]);if(land(a)!==land(b))COAST.push([e.a,e.b,Math.min(vis[e.c[0]],vis[e.c[1]])])}}
 g.save();g.beginPath();D.cells.forEach((c,i)=>{if(land(c)||vis[i]<=0)return;const Q=c.p;g.moveTo(Q[0][0],Q[0][1]);for(let j=1;j<Q.length;j++)g.lineTo(Q[j][0],Q[j][1]);g.closePath()});g.clip();
 const band=(w,col)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();for(const[a,b,v]of COAST)if(v>.05){g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1])}g.stroke()};
 band(20,'rgba(150,196,214,.08)');band(14,'rgba(150,196,214,.1)');band(9.4,'rgba(232,244,248,.5)');band(8.4,'rgba(130,176,198,.95)');band(8.4,'rgba(160,204,220,.45)');band(5,'rgba(180,220,234,.55)');band(2.2,'rgba(240,248,250,.85)');g.restore()}
function ground(){const k=view.k;g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle=css(VOID);g.fillRect(0,0,VW,VH);
 g.setTransform(dpr*k,0,0,dpr*k,dpr*view.x,dpr*view.y);g.lineJoin='round';g.lineCap='round';
 const T=terrain();g.imageSmoothingEnabled=k<1.2;g.drawImage(T.cv,T.x0,T.y0);g.imageSmoothingEnabled=true;
 if(R.terr!==false)territory(k);else D.cells.forEach((c,i)=>{if(!land(c)||!ST[c.s]||vis[i]<.05)return;poly(c.p);g.fillStyle=css(hex(ST[c.s].c),.09*vis[i]);g.fill()});
 if(R.terr===false)for(const e of E.values()){if(e.c.length<2)continue;const[a,b]=e.c.map(i=>D.cells[i]),v=Math.min(vis[e.c[0]],vis[e.c[1]]);if(v<=.05||!land(a)||!land(b)||a.s===b.s||!(ST[a.s]||ST[b.s]))continue;g.beginPath();g.moveTo(e.a[0],e.a[1]);g.lineTo(e.b[0],e.b[1]);g.setLineDash([3.5/k,2.5/k]);g.strokeStyle=`rgba(70,40,40,${.7*v})`;g.lineWidth=1.4/k;g.stroke();g.setLineDash([])}
 for(const r of D.rivers){if(r.pts.length<2)continue;const v=vis[near(r.pts[r.pts.length>>1])];if(v<=.05)continue;line(r.pts);g.strokeStyle=`rgba(96,138,152,${v})`;g.lineWidth=Math.max(.6,Math.min(3,(r.w||1)*.9))/Math.sqrt(k)*1.2;g.stroke()}
 // roads: every casing first so crossings merge; main roads cream, trails white, sea lanes dotted
 {const zw=Math.min(1.7,Math.max(1,Math.sqrt(k/1.3))),RS=[];D.routes.forEach((r,n)=>{if(r.pts.length>1&&RV[n]>.05)RS.push([r,RV[n]])});
  for(const[r,v]of RS)if(r.g==='trails'){line(r.pts);g.strokeStyle=`rgba(52,40,28,${.55*v})`;g.lineWidth=2.6*zw/k;g.stroke()}
  for(const[r,v]of RS)if(r.g==='roads'){line(r.pts);g.strokeStyle=`rgba(52,36,22,${.95*v})`;g.lineWidth=4*zw/k;g.stroke()}
  for(const[r,v]of RS)if(r.g==='trails'){line(r.pts);g.strokeStyle=`rgba(246,242,230,${.92*v})`;g.lineWidth=1.25*zw/k;g.stroke()}
  for(const[r,v]of RS)if(r.g==='roads'){line(r.pts);g.strokeStyle=`rgba(236,206,140,${v})`;g.lineWidth=2.1*zw/k;g.stroke()}}}
const ownC=n=>n&&(NATS[n]?NATS[n].c:(D.states.find(s=>s.n===n)||{}).c||'#777777');
function territory(k){D.cells.forEach((c,i)=>{const o=OWN[i];if(!o||vis[i]<.05)return;poly(c.p);g.fillStyle=css(hex(ownC(o)),.13*vis[i]);g.fill()});
 for(const e of E.values()){if(e.c.length<2)continue;const[i,j]=e.c,oa=OWN[i],ob=OWN[j];if(oa===ob)continue;const v=Math.min(vis[i],vis[j]);if(v<=.05)continue;
  for(const[s2,o]of[[i,oa],[j,ob]]){if(!o)continue;g.save();poly(D.cells[s2].p);g.clip();g.beginPath();g.moveTo(e.a[0],e.a[1]);g.lineTo(e.b[0],e.b[1]);g.strokeStyle=css(hex(ownC(o)),.8*v);g.lineWidth=5/k;g.stroke();g.restore()}
  if(oa&&ob){g.beginPath();g.moveTo(e.a[0],e.a[1]);g.lineTo(e.b[0],e.b[1]);g.strokeStyle=`rgba(40,30,25,${.65*v})`;g.lineWidth=1.1/k;g.stroke()}}}
function cellMarks(){const k=view.k;g.setTransform(dpr*k,0,0,dpr*k,dpr*view.x,dpr*view.y);
 // cells holding maps get a small corner tick; the picked cell is outlined
 for(const i in R.cm){if(!R.cm[i].length)continue;const c=D.cells[i];if(vis[i]<.5)continue;poly(c.p);g.strokeStyle='rgba(42,34,28,.55)';g.setLineDash([2/k,2/k]);g.lineWidth=1.1/k;g.stroke();g.setLineDash([])}
 if(hov>=0){poly(D.cells[hov].p);g.fillStyle='rgba(255,250,235,.16)';g.fill();g.strokeStyle='rgba(255,250,235,.9)';g.lineWidth=1.4/k;g.stroke()}
 if(cell>=0){poly(D.cells[cell].p);g.strokeStyle='#f2efe6';g.lineWidth=2.2/k;g.stroke();g.strokeStyle='#141414';g.lineWidth=.8/k;g.stroke()}}
function draw(){if(OV.hidden)return;ground();cellMarks();g.setTransform(dpr,0,0,dpr,0,0);voidFrame();seas();states();burgs();markers();roadDraft();g.setTransform(dpr,0,0,dpr,0,0);ruler();if(dragF)ghost()}

// ---- settlements: a glyph per kind, names sized by rank, ports marked
const RANK={capital:0,city:1,town:2,fort:2,monastery:3,trading_post:3,caravanserai:3,village:3,hamlet:4};
function glyph(b,X,Y,z){const ink='#2a221c',cream='#efe5c8';g.lineWidth=1;
 if(b.group==='capital'||b.cap){g.fillStyle=ink;g.beginPath();g.arc(X,Y,6*z,0,7);g.fill();g.fillStyle=cream;g.beginPath();g.arc(X,Y,3.6*z,0,7);g.fill();g.fillStyle=ink;g.beginPath();g.arc(X,Y,1.7*z,0,7);g.fill();if(b.walls){g.strokeStyle=ink;g.beginPath();g.arc(X,Y,8.2*z,0,7);g.stroke()}return 8*z}
 if(b.group==='city'){const s=5*z;g.fillStyle=ink;g.fillRect(X-s,Y-s,2*s,2*s);g.fillStyle=cream;g.fillRect(X-s+2*z,Y-s+2*z,2*s-4*z,2*s-4*z);g.fillStyle=ink;g.fillRect(X-1.2*z,Y-1.2*z,2.4*z,2.4*z);if(b.walls)for(const[a,c]of[[-1,-1],[1,-1],[1,1],[-1,1]])g.fillRect(X+a*s-1.6*z,Y+c*s-1.6*z,3.2*z,3.2*z);return s+2}
 if(b.group==='town'||b.group==='fort'){const s=3.4*z;g.fillStyle=cream;g.fillRect(X-s-1,Y-s-1,2*s+2,2*s+2);g.fillStyle=ink;g.fillRect(X-s,Y-s,2*s,2*s);if(b.walls){g.strokeStyle=ink;g.strokeRect(X-s-2.5,Y-s-2.5,2*s+5,2*s+5)}return s+1}
 if(b.group==='monastery'){g.strokeStyle=ink;g.lineWidth=1.6*z;g.beginPath();g.moveTo(X,Y-4*z);g.lineTo(X,Y+4*z);g.moveTo(X-2.6*z,Y-1.4*z);g.lineTo(X+2.6*z,Y-1.4*z);g.stroke();return 4*z}
 if(b.group==='trading_post'||b.group==='caravanserai'){const s=3.4*z;g.fillStyle=ink;g.beginPath();g.moveTo(X,Y-s);g.lineTo(X+s,Y);g.lineTo(X,Y+s);g.lineTo(X-s,Y);g.closePath();g.fill();g.fillStyle=cream;g.fillRect(X-1,Y-1,2,2);return s}
 if(b.group==='village'){g.fillStyle=ink;for(const[a,c]of[[-2.2,1],[2.2,1],[0,-2]])g.fillRect(X+a*z-1.3*z,Y+c*z-1.3*z,2.6*z,2.6*z);return 4*z}
 g.fillStyle=ink;g.beginPath();g.arc(X,Y,1.9*z,0,7);g.fill();return 2*z}
function anchorG(X,Y,z){g.strokeStyle='#2c4a63';g.lineWidth=1.2;g.beginPath();g.moveTo(X,Y-3.5*z);g.lineTo(X,Y+3*z);g.moveTo(X-2*z,Y-1.8*z);g.lineTo(X+2*z,Y-1.8*z);g.moveTo(X-3*z,Y+.5*z);g.quadraticCurveTo(X-3*z,Y+3.4*z,X,Y+3.2*z);g.quadraticCurveTo(X+3*z,Y+3.4*z,X+3*z,Y+.5*z);g.stroke()}
const BOXES=[];let BURGPT=[];const fits=r=>!BOXES.some(o=>r[0]<o[2]&&r[2]>o[0]&&r[1]<o[3]&&r[3]>o[1]);
// town names are faint at the widest view and come up to full as soon as you zoom in; nation names do the reverse
// zoom, as a share of the whole-region view, at which each rank of settlement shows its mark and its name
const MARKAT=[0,0,1.15,1.45,1.7],NAMEAT=[0,1.1,1.45,1.9,2.4],DOTAT=1.55;
// closest zoom; one map unit is 3 miles of the world map over the region's 4.17 times detail
const KMAX=3.6,MI=3/4.1744;
// Azgaar's scale bar: five alternate blocks and the distance over them, sized to a round number of miles
function ruler(){const want=140/view.k*MI,st=[1,2,5,10,20,25,50,100],mi=st.find(v=>v>=want*.6)||100,w=mi/MI*view.k,X=VW-w-34,Y=VH-22;
 g.save();g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='rgba(20,20,20,.7)';g.fillRect(X-10,Y-22,w+38,32);for(let i=0;i<5;i++){g.fillStyle=i%2?'#2a221c':'#efe5c8';g.fillRect(X+i*w/5,Y,w/5,4)}g.strokeStyle='#efe5c8';g.lineWidth=1;g.strokeRect(X-.5,Y-.5,w+1,5);
 g.font='16px VT323,monospace';g.fillStyle='#efe5c8';g.textAlign='center';for(const[t,x]of[[0,X],[mi/2,X+w/2],[mi,X+w]])g.fillText(String(t),x,Y-5);g.textAlign='left';g.fillStyle='#9a978e';g.fillText('mi',X+w+8,Y+5);g.restore()}
const KREF=1.1;let TA=1;const KFIT=()=>Math.min((VW-40)/(bx1-bx0+40),(VH-40)/(by1-by0+40));
function burgs(){TA=.3+.7*Math.max(0,Math.min(1,(view.k-KREF)/.45));BOXES.length=0;if(view.k>=CLOSE)placeClose();if(view.k/KREF>=DOTAT)markBoxes();const z=Math.max(.75,Math.min(1.5,Math.sqrt(view.k/1.3)));
 const L=D.burgs.map((b,i)=>({b,r:b.cap?0:RANK[b.group]??3,v:RVI[i]})).filter(o=>o.v>.45).sort((a,b)=>a.r-b.r);
 BURGPT=L;const fg=view.k/KREF;for(const o of L){const ga=o.r<=1?1:Math.max(0,Math.min(1,(fg-MARKAT[o.r])/.2));if(ga<=0){o.rad=0;continue}const[X,Y]=W2S(o.b.x,o.b.y);o.X=X;o.Y=Y;g.globalAlpha=Math.min(1,o.v*1.2)*ga;o.rad=glyph(o.b,X,Y,z);if(o.b.port)anchorG(X+o.rad+5*z,Y-o.rad-1,z*.9);g.globalAlpha=1;BOXES.push([X-o.rad,Y-o.rad,X+o.rad,Y+o.rad])}
 const SZ=[19,16,14,12.5,11.5],fz=view.k/KREF;for(const o of L){const na=o.r===0?1:Math.max(0,Math.min(1,(fz-NAMEAT[o.r])/.25));if(na<=0)continue;const fs=SZ[o.r]*Math.min(1.25,Math.max(.85,Math.sqrt(view.k/1.4)));
  g.font=`${o.r>=3?'italic ':''}${fs}px ${o.r<=1?'"IM Fell English SC"':'"IM Fell English"'},Georgia,serif`;const w=g.measureText(o.b.n).width;
  for(const[ax,ay,al]of[[o.rad+4,fs*.35,'left'],[-o.rad-4,fs*.35,'right'],[-w/2,-o.rad-4,'left'],[-w/2,o.rad+fs*.85,'left']]){const x0=al==='left'?o.X+ax:o.X+ax-w,y0=o.Y+ay-fs*.8,r=[x0-1,y0,x0+w+1,y0+fs];if(!fits(r))continue;BOXES.push(r);
   g.globalAlpha=Math.min(1,o.v*1.2)*(o.r===0?TA:1)*na;g.textAlign='left';g.lineJoin='round';g.strokeStyle='rgba(240,232,208,.85)';g.lineWidth=3.2;g.strokeText(o.b.n,x0,o.Y+ay);g.fillStyle=o.r<=1?'#2a1f18':'#3a2e24';g.fillText(o.b.n,x0,o.Y+ay);g.globalAlpha=1;break}}}
// nation names: each set at the point deepest inside its land, as large as the land around it allows, on two lines if one is too cramped; worked out once in map units
let LBL=null;
function cellAt(x,y,h){if(h>=0&&inPoly(x,y,D.cells[h].p))return h;if(h>=0)for(const j of nb[h])if(inPoly(x,y,D.cells[j].p))return j;return near([x,y])}
// settlements' marks and names, in map units as seen at a middle zoom; an area name is set clear of them where it can be, as atlases do
const UNDK=1.6,under=(x0,y0,x1,y1)=>{let n=0;for(let i=0;i<D.burgs.length;i++){const b=D.burgs[i];if(RVI[i]<.45)continue;const w=(b.n.length*6.5+12)/UNDK,r=[b.x-6/UNDK,b.y-9/UNDK,b.x+w,b.y+6/UNDK];if(r[0]<x1&&r[2]>x0&&r[1]<y1&&r[3]>y0)n+=b.cap?1.5:1}return n};
function labels(){const out=[],deep=D.cells.map(()=>-1),Q=[];
 D.cells.forEach((c,i)=>{const o=OWN[i];if(!o||vis[i]<.9)return;if(nb[i].some(j=>OWN[j]!==o||vis[j]<.9)){deep[i]=0;Q.push(i)}});
 for(let q=0;q<Q.length;q++){const i=Q[q];for(const j of nb[i])if(deep[j]<0&&OWN[j]===OWN[i]&&vis[j]>=.9){deep[j]=deep[i]+1;Q.push(j)}}
 const by={};D.cells.forEach((c,i)=>{const o=OWN[i];if(o&&vis[i]>=.9)(by[o]||(by[o]=[])).push(i)});
 const cx=document.createElement('canvas').getContext('2d'),span=(o,x,y,h)=>{let a=x,b=x,c=h;for(;a>x-500;a-=2){c=cellAt(a,y,c);if(OWN[c]!==o)break}c=h;for(;b<x+500;b+=2){c=cellAt(b,y,c);if(OWN[c]!==o)break}return[a+2,b-2]};
 for(const o in by){const name=disp(o);if(D.burgs.some(b=>b.n===name))continue;const L=by[o],mx=L.reduce((a,i)=>a+CEN[i][0],0)/L.length,my=L.reduce((a,i)=>a+CEN[i][1],0)/L.length;
  const top=Math.max(...L.map(i=>deep[i])),cand=L.filter(i=>deep[i]>=top-2).sort((a,b)=>deep[b]-deep[a]||Math.hypot(CEN[a][0]-mx,CEN[a][1]-my)-Math.hypot(CEN[b][0]-mx,CEN[b][1]-my));let best=null;
  for(const h of cand.slice(0,14)){const[x,y]=CEN[h],words=name.toUpperCase().split(' '),opts=[[words.join(' ')]];if(words.length>1){let k=1,d=1e9;for(let t=1;t<words.length;t++){const v=Math.abs(words.slice(0,t).join(' ').length-words.slice(t).join(' ').length);if(v<d){d=v;k=t}}opts.push([words.slice(0,k).join(' '),words.slice(k).join(' ')])}
   for(const lines of opts){for(let f=Math.min(46,10+Math.sqrt(L.length)*1.6);f>=5;f-=.5){cx.font=`${f}px "IM Fell English SC",Georgia,serif`;const sp=t=>t.split('').join(' '),w=Math.max(...lines.map(t=>cx.measureText(sp(t)).width)),hh=f*1.05*lines.length;
     let ok=true,lo=-1e9,hi=1e9;for(const dy of[-hh/2,0,hh/2]){const[a,b]=span(o,x,y+dy,h);lo=Math.max(lo,a);hi=Math.min(hi,b);if(hi-lo<w*1.08){ok=false;break}}
     if(ok){const cx2=(lo+hi)/2,sc=f*(1-Math.min(.9,.3*under(cx2-w/2,y-hh/2,cx2+w/2,y+hh/2))+.02*deep[h]);if(!best||sc>best.sc)best={x:cx2,y,f,lines:lines.map(sp),sc};break}}}}
  if(best)out.push({...best,c:ownC(o)})}
 return out}
// close in, each border carries both names, each just inside its own side and running along the line
let BCH=null;
function chains(){const by={};for(const e of E.values()){if(e.c.length<2)continue;const[i,j]=e.c,oa=OWN[i],ob=OWN[j];if(!oa||!ob||oa===ob||vis[i]<.9||vis[j]<.9)continue;const k=[oa,ob].sort().join('|');(by[k]||(by[k]=[])).push([e.a,e.b])}
 const out=[];for(const k in by){const segs=by[k],ends=new Map(),key=p=>EK(p),used=new Set();segs.forEach((sg,n)=>{for(const p of sg){const q=key(p);(ends.get(q)||ends.set(q,[]).get(q)).push(n)}});
  for(let n=0;n<segs.length;n++){if(used.has(n))continue;used.add(n);let L=[segs[n][0],segs[n][1]];for(const dir of[1,0]){for(;;){const tip=dir?L[L.length-1]:L[0],nx=(ends.get(key(tip))||[]).find(m=>!used.has(m));if(nx==null)break;used.add(nx);const[a,b]=segs[nx],o=key(a)===key(tip)?b:a;dir?L.push(o):L.unshift(o)}}out.push({nats:k.split('|'),pts:L})}}return out}
function borderNames(al){if(!BCH)BCH=[...E.values()].filter(e=>{if(e.c.length<2)return false;const[i,j]=e.c,oa=OWN[i],ob=OWN[j];return oa&&ob&&oa!==ob&&vis[i]>=.9&&vis[j]>=.9}).map(e=>({a:e.a,b:e.b,nats:[OWN[e.c[0]],OWN[e.c[1]]],cells:e.c}));
 g.save();g.globalAlpha=al;g.textAlign='center';g.textBaseline='middle';g.font='12px "IM Fell English SC",Georgia,serif';const put=[];
 // a name goes on a single straight cell edge long enough to carry it, one pair of names per stretch of border
 for(const e of BCH){const A=W2S(e.a[0],e.a[1]),B=W2S(e.b[0],e.b[1]),c=[(A[0]+B[0])/2,(A[1]+B[1])/2],L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(c[0]<0||c[1]<0||c[0]>VW||c[1]>VH)continue;
  const T2=e.nats.map(n=>disp(n).toUpperCase().split('').join(' ')),w=Math.max(...T2.map(t=>g.measureText(t).width))+10;if(L<w)continue;
  const key=e.nats.slice().sort().join('|');if(put.some(p=>p.k===key&&Math.hypot(p.x-c[0],p.y-c[1])<320))continue;put.push({k:key,x:c[0],y:c[1]});
  let ang=Math.atan2(B[1]-A[1],B[0]-A[0]);if(ang>Math.PI/2)ang-=Math.PI;else if(ang<-Math.PI/2)ang+=Math.PI;const nx=-Math.sin(ang),ny=Math.cos(ang);
  // the first cell's middle tells which side is whose
  const C0=W2S(CEN[e.cells[0]][0],CEN[e.cells[0]][1]),s0=Math.sign((C0[0]-c[0])*nx+(C0[1]-c[1])*ny)||1;
  e.nats.forEach((nat,q)=>{const sg=q===0?s0:-s0,x=c[0]+nx*9*sg,y=c[1]+ny*9*sg;g.save();g.translate(x,y);g.rotate(ang);g.lineJoin='round';g.strokeStyle='rgba(244,238,222,.85)';g.lineWidth=3;g.strokeText(T2[q],0,0);g.fillStyle=css(mixc(hex(ownC(nat)),[30,22,18],.62));g.fillText(T2[q],0,0);g.restore()})}
 g.restore()}
function states(){const far=Math.max(0,Math.min(1,(2.6-view.k)/.9)),near2=Math.max(0,Math.min(1,(view.k-3)/.5));if(near2>0)borderNames(near2);if(far<=0)return;
 if(!LBL)LBL=labels();for(const l of LBL){const fs=l.f*view.k;if(fs<9)continue;const k=Math.min(1,34/fs),F=fs*k,[X,Y]=W2S(l.x,l.y);g.font=`${F}px "IM Fell English SC",Georgia,serif`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
 const col=css(mixc(hex(l.c),[30,22,18],.62));l.lines.forEach((t,i)=>{const y=Y+(i-(l.lines.length-1)/2)*F*1.05;g.globalAlpha=.9*far;g.strokeStyle='rgba(244,238,222,.8)';g.lineWidth=Math.max(2.5,F*.16);g.strokeText(t,X,y);g.fillStyle=col;g.fillText(t,X,y)});g.globalAlpha=1;g.textAlign='left';g.textBaseline='alphabetic'}}

let SL=null;
function seaLabels(){const out=[];const by={};for(const k in R.wc)if(R.seas[R.wc[k]]&&!land(D.cells[k]))(by[R.wc[k]]||(by[R.wc[k]]=[])).push(+k);
 for(const id in by){const C=new Set(by[id]),dp=new Map(),Q=[];for(const i of C)if(nb[i].some(j=>!C.has(j))){dp.set(i,0);Q.push(i)}for(let q=0;q<Q.length;q++)for(const j of nb[Q[q]])if(C.has(j)&&!dp.has(j)){dp.set(j,dp.get(Q[q])+1);Q.push(j)}
  const md=Math.max(...dp.values()),top=[...C].filter(i=>dp.get(i)===md);let x=0,y=0;for(const i of top){x+=CEN[i][0]/top.length;y+=CEN[i][1]/top.length}if(!out.some(o=>Math.hypot(o.x-x,o.y-y)<60))out.push({n:R.seas[id].n,x,y,sz:C.size})}return out}
function isles(){const f=view.k/KREF;for(const id in R.isl){const o=R.isl[id],a=Math.max(0,Math.min(1,(f-1.05)/.3));if(a<=0)continue;if(!o.p){let x=0,y=0;for(const i of o.c){x+=CEN[i][0];y+=CEN[i][1]}o.p=[x/o.c.length,y/o.c.length]}
  const[X,Y]=W2S(...o.p),fs=Math.max(10,Math.min(14,9*Math.sqrt(view.k)));const own=OWN[o.c[0]],col=own?css(mixc(hex(ownC(own)),[30,22,18],.6)):'#3a2e24';
  g.font=`${fs}px "IM Fell English SC",Georgia,serif`;g.letterSpacing=(fs*.12).toFixed(1)+'px';g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.globalAlpha=.9*a;g.strokeStyle='rgba(244,238,222,.8)';g.lineWidth=2.6;g.strokeText(o.n,X,Y);g.fillStyle=col;g.fillText(o.n,X,Y);g.globalAlpha=1;g.letterSpacing='0px';g.textAlign='left';g.textBaseline='alphabetic'}}
function seas(){isles();if(!SL)SL=seaLabels();const f=view.k/KREF;for(const l of SL){const a=Math.max(0,Math.min(1,(f-(l.sz>25?.9:1.25))/.3));if(a<=0)continue;const[X,Y]=W2S(l.x,l.y),fs=Math.max(11,Math.min(17,(10+Math.sqrt(l.sz)*1.1)*Math.sqrt(view.k/2)));
  g.font=`italic ${fs}px "IM Fell English",Georgia,serif`;g.letterSpacing=(fs*.18).toFixed(1)+'px';g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.globalAlpha=.9*a;g.strokeStyle='rgba(226,236,236,.6)';g.lineWidth=2.6;g.strokeText(l.n,X,Y);g.fillStyle='#365563';g.fillText(l.n,X,Y);g.globalAlpha=1;g.letterSpacing='0px';g.textAlign='left';g.textBaseline='alphabetic'}}

// ---- nations, their forces and their people (game nation in brackets where it differs)
const disp=n=>NATS[n]?NATS[n].n:n;
const NATS={Astria:{n:'Imperial Astria',pp:'Astrians',c:'#34405e',ring:[66,82,120],gold:18400,seat:'Ularam',gn:'Imperium'},'Old Kingdoms':{n:'Old Kingdoms',c:'#9b3f6e',ring:[176,96,138],gold:30000,seat:'Highcrown'},Hoverlands:{n:'Hoverlands',c:'#5b57c9',ring:[120,116,214],gold:24000,seat:'Caer Holvar'},Whitecoast:{n:'Lindale',c:'#d26aa0',ring:[226,140,184],gold:8000,seat:'White Wall'},'Great Keys':{n:"Great Keys",c:'#2f9e6e',ring:[56,160,112],gold:9600,seat:'Great Keys'},
 Havenport:{n:"Freefolk Lands",pp:'Freefolk',c:'#4775de',ring:[86,126,214],gold:12300,seat:'Havenport'},Portsbridge:{n:"Portsbridge Trade Federation",c:'#c9a53c',ring:[214,180,80],gold:15800,seat:'Portsbridge'},Reapers:{n:"The Marsh",pp:'Marshmen',gn:'Marshmen',c:'#4a5a2a',ring:[110,130,64],gold:2100,seat:'Mudwater'}};
const LK={off:'Astrian Officer|n|iron|h',ln1:'Astrian Line|m|iron|h',ln2:'Astrian Line|t|iron|h',ln3:'Astrian Line|m|steel|h',ln4:'Astrian Line|n|iron|h',ln5:'Astrian Line|t|iron|b',gd1:'Astrian Guard|f|steel|h',gd2:'Astrian Guard|f|iron|h',cs:'Astrian Conscript'};
const ROLE={off:'Officer',ln1:'Line',ln2:'Line',ln3:'Line',ln4:'Line',ln5:'Line',gd1:'Guard',gd2:'Guard',cs:'Conscript'};
const NAMES=['Hale','Voss','Marr','Cobb','Rook','Tenn','Ashby','Pike','Dunn','Fell','Garr','Holt','Keane','Lowe','Mace','Orr','Pell','Quill','Rand','Sedge','Thorn','Vale','Wick','Yarrow','Strand','Calder','Hask','Brin','Cade','Dorr','Esk','Fenn','Gale','Hume','Ivo','Jory','Kell','Lusk','Moss','Nash','Odell','Prew','Rusk','Sallow','Tull','Ure','Varn','Wade'];
function seed(){let nid=0;const F=[],PP=[],cellOf=at=>near([BURG[at].x,BURG[at].y]);
 const P=(k,o={})=>{const i=nid++;return{id:'m'+i,k:LK[k]||k,n:o.n||(k==='off'?'Lt. ':'')+NAMES[(i*7)%NAMES.length],role:o.role||ROLE[k]||k,h:100,note:o.note}};
 const sq=(nat,at,n,keys,o={})=>(nat=nat==='Goldbank'?'Portsbridge':nat,F.push({id:'f'+F.length,t:'squad',nat,cell:cellOf(at),n,men:keys.map(k=>P(k)),fav:o.fav,show:o.show}));
 const car=(nat,at,n,k,hull,crew,cargo,o={})=>F.push({id:'f'+F.length,t:'vehicle',nat,cell:cellOf(at),n,k,hull,men:crew.map(k=>P(k)),cargo,wreck:hull===0,fav:o.fav});
 const lone=(nat,at,k,n,role)=>F.push({id:'f'+F.length,t:'unit',nat,cell:cellOf(at),n,men:[P(k,{n,role})]});
 const pp=(nat,at,k,n,role,note)=>PP.push({...P(k,{n,role,note}),t:'person',nat:nat==='Goldbank'?'Portsbridge':nat,cell:cellOf(at)});
 const rep=(k,n)=>Array(n).fill(k),LINE=['off','ln3','ln1','ln1','ln2','ln5','ln4','ln2'],GUARD=['off','gd1','gd2','gd1','gd2','gd1','gd2','gd1'],CONS=['off',...rep('cs',7)],ED="Emperor's Dock";
 ['1st','2nd','3rd','4th','5th','6th','7th'].forEach((o,i)=>sq('Astria',ED,o+' Line',LINE,{fav:i===0}));
 sq('Astria',ED,'1st Guard',GUARD,{fav:1});sq('Astria',ED,'2nd Guard',GUARD);sq('Astria',ED,'Dock Conscripts',CONS);sq('Astria',ED,'Gate Conscripts',CONS);sq('Astria','Crossroads','Road Picket',rep('cs',5),{show:false});
 car('Astria',ED,'Ironside','car',100,['gd1','gd2','ln3','ln4'],[['crate',4],['grenade',6],['musket',3]],{fav:1});car('Astria',ED,'Bastion','car',100,['ln1','ln3'],[['crate',6]]);
 pp('Astria',ED,'Overseer','Overseer Aurelian Crane','Overseer of the Dock',1);pp('Astria',ED,'Imperial Noble','Lady Seraphine Vael','Imperial Noble',1);pp('Astria',ED,'off','Captain Rourke','Captain of the Guard',1);for(let i=0;i<3;i++)pp('Astria',ED,'Imperial Clerk',null,'Clerk');
 sq('Goldbank','Goldbank','Aurum Guard',['Aurum Knight',...rep('Aurum Guard',7)]);sq('Goldbank','Goldbank','Vault Guard',['Aurum Knight',...rep('Aurum Guard',5)]);sq('Goldbank','Goldbank','Watch',rep('Watchman',6));sq('Goldbank','Goldbank','Gilded Hand',rep('Gilded Hand',4),{fav:1});sq('Goldbank','Goldtown','Stockmen',rep('Stockman',5));
 pp('Goldbank','Goldbank','Bank Lord','Lord Edmund Aurel','Bank Lord',1);pp('Goldbank','Goldbank','Banker','Mira Castell','Banker',1);pp('Goldbank','Goldbank','Head Clerk',null,'Head Clerk');for(let i=0;i<3;i++)pp('Goldbank','Goldbank','Clerk',null,'Clerk');
 sq('Great Keys','Great Keys','Ironkey Militia',rep('Ironkey Militia',8));sq('Great Keys','Great Keys','Brasskey Militia',rep('Brasskey Militia',8));sq('Great Keys','Great Keys','Keys Watch',rep('Keys Watchman',6));sq('Great Keys','Great Keys','Gate Wardens',rep('Gatekeeper',4));
 pp('Great Keys','Great Keys','Keeper of the Keys','Ilse Varrow','Keeper of the Keys',1);pp('Great Keys','Great Keys','Ironkey Guildmaster','Bram Ironkey','Ironkey Guildmaster',1);pp('Great Keys','Great Keys','Brasskey Guildmaster','Odo Brasskey','Brasskey Guildmaster',1);for(const k of['Ironkey Guildmember','Brasskey Guildmember','Ironkey Guildmember'])pp('Great Keys','Great Keys',k,null,'Guildmember');
 sq('Havenport','Havenport','Harbour Guard',rep('Harbour Guard',8));sq('Havenport','Havenport','Marines',rep('Marine',8));sq('Havenport','Overbay','Harbour Watch',rep('Harbour Watch',6));
 pp('Havenport','Havenport','Harbourmaster','Harbourmaster Quint','Harbourmaster',1);for(const k of['Sailor','Sailor','Dockhand','Dockhand','Smuggler'])pp('Havenport','Havenport',k,null,k);
 sq('Portsbridge','Portsbridge','Company Guard',rep('Company Guard',8));sq('Portsbridge','Portsbridge','2nd Company Guard',rep('Company Guard',8));sq('Portsbridge','Shantyport','Enforcement',['Enforcement Officer',...rep('Police Officer',4)]);sq('Portsbridge','Shantyport','Bailiffs',rep('Bailiff',4));
 pp('Portsbridge','Portsbridge','Director','Director Halvard Penn','Director',1);pp('Portsbridge','Portsbridge','Boardsman','Cyril Moss','Boardsman',1);pp('Portsbridge','Portsbridge','Shareholder',null,'Shareholder');for(const k of['Company Clerk','Townsman','Townsman'])pp('Portsbridge','Portsbridge',k,null,k);
 sq('Reapers','Mudwater','Mudwater Band',['Ravager','Raider','Raider','Thug','Thug','Cutthroat','Raider','Thug']);sq('Reapers',"Willow's Ranch",'Ranch Raiders',rep('Raider',6));sq('Reapers','Smugglerskeep','Keep Cutthroats',[...rep('Cutthroat',5),'Thug','Thug']);sq('Reapers',"Bog's Keep","Bog's Keep Thugs",rep('Thug',5));
 lone('Reapers','Portsbridge','Raider','Brann','Raider');lone('Reapers','Portsbridge','Blademaster','Cole','Blademaster');lone('Reapers','Shadowtower','Ravager','Sable','Ravager');pp('Reapers','Mudwater','Ravager','Mordecai Skell','Warlord',1);
 // maps already built for these places
 const cm={};const put=(at,ids)=>{cm[cellOf(at)]=ids};put('Goldbank',['bank','vault','count']);put(ED,['stock','range','yard','circuit']);put('Crossroads',['road']);put('Great Keys',['alley']);
 return{v:1,F,PP,cm,gold:Object.fromEntries(Object.entries(NATS).map(([n,o])=>[n,o.gold])),nid,mname:{},last:{}}}
let R=LS.get('bs.region',null);if(!R||R.v!==1)R=seed();
// regions saved before Great Keys moved to the coast bring its forces, people and maps along
// settlements moved onto their cell centres when the roads were relaid: what stood at the old cell follows them
const MOVED={"Portsbridge":[859.1,388.3],"Overbay":[602.7,308.2],"Rannoch":[1048.4,53.1],"Stonehaven Clach":[1032.9,6.8],"Shantyport":[836.9,283.1],"Havenport":[497.9,322.7],"Fumbleweed":[838.6,438.7],"Great Keys":[538,438.6],"Bog's Keep":[958.3,353.1]};
function moveCell(R,o,n){if(o===n)return;for(const f of[...R.F,...R.PP])if(f.cell===o)f.cell=n;if(R.cm[o]){R.cm[n]=[...(R.cm[n]||[]),...R.cm[o]];delete R.cm[o]}if(R.last[o]){R.last[n]=R.last[o];delete R.last[o]}}
function migrate(R){if(!R.gk2){moveCell(R,near([524.5,396.7]),near(MOVED['Great Keys']));R.gk2=1}if(!R.roads2){for(const n in MOVED)if(BURG[n])moveCell(R,near(MOVED[n]),near([BURG[n].x,BURG[n].y]));for(const c of[625,680,681])moveCell(R,c,624);R.roads2=1}
 if(!R.towns3){for(const[x,y,n]of[[873.4,322.2,'Shantyport'],[1079.6,583,'Shadowtower'],[403.8,578.1,'Quayside'],[656.4,319.8,'Overbay'],[941.3,682.9,'Wetmarket']])moveCell(R,near([x,y]),near([BURG[n].x,BURG[n].y]));
  for(let c=0;c<D.cells.length;c++)if(!land(D.cells[c])&&R.F.concat(R.PP).some(f=>f.cell===c)){const to=[...nb[c]].filter(j=>land(D.cells[j])).sort((a,b)=>D.cells[b].h-D.cells[a].h)[0];if(to!=null)moveCell(R,c,to)}R.towns3=1}
 return R}
migrate(R);
for(const f of[...R.F,...R.PP])if(f.nat==='Goldbank')f.nat='Portsbridge';if(R.gold&&R.gold.Goldbank){R.gold.Portsbridge=(R.gold.Portsbridge||0)+R.gold.Goldbank;delete R.gold.Goldbank}if(R.own)for(const k in R.own)if(R.own[k]==='Goldbank')R.own[k]='Portsbridge';
R.col=R.col||{};R.names=R.names||{};R.own=R.own||{};R.emb=R.emb||{};R.ter=R.ter||{};R.seas=R.seas||{};R.wc=R.wc||{};if(R.rt){D.routes.length=0;D.routes.push(...R.rt);rvCalc()}for(const f of R.F)if(f.n==='Sweetwater Thugs')f.n="Bog's Keep Thugs";
const save=()=>{const c=JSON.parse(JSON.stringify(R,(k,v)=>k==='carry'?undefined:v));LS.set('bs.region',c)};
const ringOf=c=>mixc(hex(c),[255,255,255],.18);
for(const n in R.col)if(NATS[n]){NATS[n].c=R.col[n];NATS[n].ring=ringOf(R.col[n])}for(const n in R.names)if(NATS[n])NATS[n].n=R.names[n];for(const k in R.ter)if(TT[R.ter[k]]){setTer(D.cells[k],R.ter[k]);ownFix(+k)}for(const k in R.own)OWN[k]=R.own[k]||null;
// enclosed water, away from the open sea, gets a name of its own once, from the nearest settlement
// small islands get a name once, from an old-world list; kept with the save
const ISLN=['Gull','Heron','Tern','Kelp','Seal','Cairn','Rook','Brine','Weir','Ashen','Saint Brenna','Low','Cormorant','Thorn','Oyster','Lantern','Widow','Shingle'];
if(!R.isl){R.isl={};const seen=new Set();let n=0;for(let i=0;i<D.cells.length;i++){if(!land(D.cells[i])||seen.has(i))continue;const C=[i];seen.add(i);for(let q=0;q<C.length;q++)for(const j of nb[C[q]])if(land(D.cells[j])&&!seen.has(j)){seen.add(j);C.push(j)}
  if(C.length>=12||C.some(j=>vis[j]<.9||D.burgs.some(b=>near([b.x,b.y])===j)))continue;R.isl['i'+i]={n:ISLN[(n++*7+Math.floor(hash(i)*ISLN.length))%ISLN.length]+' Island',c:C}}}
if(!R.bays1){const seen=new Set();for(let i=0;i<D.cells.length;i++){if(land(D.cells[i])||seen.has(i)||R.wc[i])continue;const C=[i];seen.add(i);for(let q=0;q<C.length;q++)for(const j of nb[C[q]])if(!land(D.cells[j])&&!seen.has(j)){seen.add(j);C.push(j)}
  if(C.length>60||C.some(j=>vis[j]<.9))continue;const cx=C.reduce((a,j)=>a+D.cells[j].c[0],0)/C.length,cy=C.reduce((a,j)=>a+D.cells[j].c[1],0)/C.length;let bn=null,bd=1e9;for(const b of D.burgs){const d=Math.hypot(b.x-cx,b.y-cy);if(d<bd){bd=d;bn=b.n}}if(!bn)continue;
  const base=bn.replace(/'s$/,''),F=/bay$/i.test(base)?['{n} Water','{n} Mere']:['{n} Bay','Bay of {n}','{n} Mere','{n} Sound'],id='w'+i;R.seas[id]={n:F[Math.floor(hash(i+3)*F.length)].replace('{n}',base)};for(const j of C)R.wc[j]=id}R.bays1=1}
// ---- flags: each nation's square pixel emblem, the Fluoria library's or the one painted here
const EMK={Astria:'astia','Old Kingdoms':'aracia',Hoverlands:'holverland',Whitecoast:'lindale',Havenport:'havenport',Portsbridge:'portsbridge','Great Keys':'great keys',Reapers:'reapers'};
const libEmb=n=>{const e=RGE[EMK[n]];return e?[...e.i].map(ch=>e.p[ch.charCodeAt(0)-48]):Array(33*33).fill('#000000').map((c,i)=>{const x=i%33,y=i/33|0;return x&&y&&x<32&&y<32?NATS[n].c:c})};
const embPx=n=>R.emb[n]||libEmb(n);
function embCanvas(n,s,px){const c=mk('canvas','emb');c.width=c.height=33;const x=c.getContext('2d'),im=x.createImageData(33,33),P=px||embPx(n);P.forEach((h,i)=>{const v=hex(h);im.data.set([v[0],v[1],v[2],255],i*4)});x.putImageData(im,0,0);c.style.width=c.style.height=33*s+'px';return c}
const ALLF=()=>R.F,men=f=>f.men.filter(m=>!m.dead),soldiers=f=>f.t==='vehicle'?0:men(f).length,fallen=f=>f.wreck||f.t!=='vehicle'&&f.men.length&&!men(f).length;
const lead=f=>men(f)[0]||f.men[0]||{k:f.k,h:0},hpOf=f=>f.t==='vehicle'?f.hull:Math.round(men(f).reduce((a,m)=>a+m.h,0)/(men(f).length||1));

// ---- links to the battlefield: a man fights in one map as a body tagged with his id
const bins=()=>{const L=[[curMap,bodies]];for(const m in STATE)if(m!==curMap)L.push([m,STATE[m].bodies]);for(const m in PEND)L.push([m,PEND[m]]);return L};
function findBody(id){for(const[m,arr]of bins()){const b=arr.find(o=>o.rid===id);if(b)return[m,b,arr]}return null}
function sync(){for(const f of [...R.F,...R.PP])for(const m of f.t==='person'?[f]:f.men){if(!m.map)continue;const q=findBody(m.id);if(!q){delete m.map;continue}const[mp,b]=q;m.map=mp;m.h=Math.max(1,Math.min(100,Math.round(100*b.px.length/(b.n0||1))));if(b.status==='dead'){m.dead=1;m.h=0}}save()}
const inMap=f=>(f.t==='person'?[f]:f.men).some(m=>m.map&&!m.dead);
function withdraw(f){for(const m of f.t==='person'?[f]:f.men){if(!m.map)continue;const q=findBody(m.id);delete m.map;if(!q||q[1].status==='dead')continue;const[mp,b,arr]=q;const i=arr.indexOf(b);if(i>=0)arr.splice(i,1);if(b.lab)b.lab.remove();if(mp===curMap)sel.delete(b);m.carry=b}save()}
function spot(b,ax,ay,i){for(let r=0;r<40;r++){const n=Math.max(1,r*6);for(let j=0;j<n;j++){const a=j/n*Math.PI*2+i*.37,x=ax+Math.cos(a)*r*16,y=ay+Math.sin(a)*r*16;if(x<12||y<12||x>W-12||y>H-12)continue;b.x=x;b.y=y;if(!solidHits(b,0,0)&&!bodies.some(o=>o!==b&&o.type==='token'&&Math.hypot(o.x-x,o.y-y)<15))return}}}
function deploy(list){const ex=(EXITS[curMap]||[]).find(x=>x.arrive),ax=ex?ex.arrive[0]:W/2,ay=ex?ex.arrive[1]:H/2;let i=0;
 for(const[f,m]of list){const nat=NATS[f.nat].gn||f.nat;{if(m.dead||m.map)continue;let b=m.carry;
   if(b){bodies.push(b);if(b.lab)stage.appendChild(b.lab);else mkLabel(b);delete m.carry}else{const base=m.k.split('|')[0],u=CLSU[WARD.CLS[base]]||'civ';b=token(m.n,nat,u,ax,ay,false,undefined,m.k)}
   b.rid=m.id;spot(b,ax,ay,i++);b.vx=b.vy=0;b.ang=Math.atan2(H/2-b.y,W/2-b.x);m.map=curMap}}
 save()}

// ---- sprites: the game's own top-down units at the size of a card cell
const SPR={};function spr(k){if(SPR[k])return SPR[k];const c=mk('canvas');c.width=21;c.height=18;try{const q=WARD.grid(k,WARD.spawn(k,7),4),x=c.getContext('2d'),im=x.createImageData(21,18);q.forEach((r,y)=>r.forEach((p,X)=>{if(p&&y<18&&X<21)im.data.set([...p[0],255],(y*21+X)*4)}));x.putImageData(im,0,0)}catch(e){if(k!=='Townsman')return SPR[k]=spr('Townsman')}return SPR[k]=c}
const CAR={};for(const k in RGS){const i=new Image();i.onload=()=>{CAR[k]=i;draw()};i.src=RGS[k]}
const imgOf=f=>f.t==='vehicle'?CAR[f.k]:spr(lead(f).k);
function sprBig(k,s){const src=k==='car'||k==='carW'?CAR[k]:spr(k),c=mk('canvas');if(!src)return c;c.width=src.width*s;c.height=src.height*s;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(src,0,0,c.width,c.height);return c}

// ---- markers: far out one stacked icon per nation per cell, then two, close in one per squad or vehicle
const CLOSE=2.4;let GROUPS=[];
function layout(){GROUPS=[];const by={};for(const f of R.F){if(!f.men.length&&!f.wreck)continue;(by[f.cell]||(by[f.cell]={}))[f.nat]=1}
 for(const c in by){const[bx,byy]=cellXY(+c),ns=Object.keys(by[c]),used=[];ns.forEach(n=>{const fs=R.F.filter(f=>f.cell===+c&&f.nat===n),cols=Math.ceil(Math.sqrt(fs.length)),rows=Math.ceil(fs.length/cols),sp=13,hw=(cols-1)/2*sp,hh=(rows-1)/2*sp,d=13+Math.hypot(hw,hh);
  let a=0,best=-1e9;for(let q=0;q<12;q++){const t=q/12*Math.PI*2;let s=0;for(const r of[d*.6,d,d*1.4])s+=land(D.cells[near([bx+Math.cos(t)*r,byy+Math.sin(t)*r])])?1:-2;for(const u of used)s-=Math.max(0,3-Math.abs(((t-u+Math.PI*3)%(Math.PI*2))-Math.PI)*3);if(s>best){best=s;a=t}}used.push(a);
  const cx=bx+Math.cos(a)*d,cy=byy+Math.sin(a)*d;GROUPS.push({stack:false,cell:+c,nat:n,x:bx+Math.cos(a)*15,y:byy+Math.sin(a)*13,fs});fs.forEach((f,i)=>{f.x=cx+(i%cols)*sp-hw;f.y=cy+Math.floor(i/cols)*sp-hh})})}}
const rankF=f=>(f.id===rsel?1e4:0)+(f.fav?1e3:0)+soldiers(f);
const shown=f=>f.show!==false&&(R.fallenOn||!fallen(f));
const vfOk=f=>!vf||(vf==='sol'?f.t!=='vehicle':vf==='veh'&&f.t==='vehicle');
const stackOf=G=>G.fs.filter(f=>shown(f)&&vfOk(f)).sort((a,b)=>(fallen(a)-fallen(b))||rankF(b)-rankF(a));
function tok(m,X,Y,r,z,cnt){const on=rsel===m.id,dead=fallen(m),hv=hovT===m.id;g.globalAlpha=match(m)?1:.3;g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.arc(X+1.5,Y+2,r+2,0,7);g.fill();g.fillStyle=dead?'#3a3530':'#1e1e1e';g.beginPath();g.arc(X,Y,r+2,0,7);g.fill();g.strokeStyle=dead?'#77706a':css(NATS[m.nat].ring);g.lineWidth=3;g.beginPath();g.arc(X,Y,r,0,7);g.stroke();
 if(on||hv){g.strokeStyle=on?'#f2efe6':'rgba(242,239,230,.9)';g.lineWidth=on?1.5:2.5;if(hv&&!on){g.save();g.shadowColor='rgba(255,250,235,.8)';g.shadowBlur=8}g.beginPath();g.arc(X,Y,r+4.5,0,7);g.stroke();if(hv&&!on)g.restore()}
 const im=imgOf(m);if(im){g.save();g.beginPath();g.arc(X,Y,r-2,0,7);g.clip();g.imageSmoothingEnabled=false;if(dead)g.filter='grayscale(1) brightness(.7)';if(m.t==='vehicle'){const s=(2*r-6)/im.width;g.translate(X,Y);g.rotate(-Math.PI/2);g.drawImage(im,-im.width*s/2,-im.height*s/2,im.width*s,im.height*s)}else{const s=1.1*z;g.drawImage(im,X-im.width*s/2,Y-im.height*s/2,im.width*s,im.height*s)}g.restore()}
 if(dead){g.strokeStyle='#d9603b';g.lineWidth=2;g.beginPath();g.moveTo(X-5,Y-5);g.lineTo(X+5,Y+5);g.moveTo(X+5,Y-5);g.lineTo(X-5,Y+5);g.stroke()}
 else if(cnt!=null||m.t!=='unit'){g.font=`${Math.round(14*z)}px VT323`;const t=String(cnt??m.men.filter(x=>!x.dead).length),w=g.measureText(t).width+5;g.fillStyle='#f2efe6';g.fillRect(X+r-4,Y+r-9,w,11*z);g.fillStyle='#141414';g.fillText(t,X+r-1.5,Y+r+.5)}
 if(inMap(m)){g.fillStyle='#d6b45a';g.beginPath();g.arc(X-r+1,Y-r+1,3*z,0,7);g.fill()}
 g.globalAlpha=1;m.R=r+3;m.X=X;m.Y=Y}
// close in, each cell's forces sit as one tight block in screen space, placed where it stays inside its cell and clear of the town and its name
const inPoly=(x,y,P)=>{let o=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const[a,b]=P[i],[c,d]=P[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)o=!o}return o};
let BLOCKS=[];
function placeClose(){const z=Math.max(.8,Math.min(1.4,Math.sqrt(view.k/1.3))),S=20*z+7,by={};BLOCKS=[];for(const G of GROUPS)(by[G.cell]||(by[G.cell]=[])).push(G);
 for(const c in by){const cl=D.cells[c],b=CELLB[c],[X,Y]=W2S(CEN[c][0],CEN[c][1]),B=b?W2S(b.x,b.y):null;
  const L=by[c].map(G=>{const fs=stackOf(G),cols=Math.max(1,Math.ceil(Math.sqrt(fs.length))),rows=Math.ceil(fs.length/cols);return{fs,cols,rows,w:cols*S,h:rows*S}}).filter(g2=>g2.fs.length);if(!L.length)continue;
  const tw=L.reduce((a,g2)=>a+g2.w,0)+(L.length-1)*8,rel=[];let x0=-tw/2;for(const g2 of L){g2.fs.forEach((f,i)=>rel.push([f,x0+(i%g2.cols+.5)*S,-g2.h/2+(Math.floor(i/g2.cols)+.5)*S]));x0+=g2.w+8}
  const lw=B?Math.max(40,b.n.length*7.5):0,score=(ox,oy)=>{let s2=-Math.hypot(ox,oy)/60;for(const[,rx,ry]of rel){const px=X+ox+rx,py=Y+oy+ry,[wx,wy]=S2W(px,py);if(!inPoly(wx,wy,cl.p))s2-=3;
    if(B){if(Math.hypot(px-B[0],py-B[1])<S)s2-=5;if(px>B[0]-8&&px<B[0]+lw+14&&py>B[1]-16&&py<B[1]+12)s2-=2}}return s2};
  let best=[0,0],bs=score(0,0);for(const d of[S*.5,S,S*1.6,S*2.3,S*3])for(let a=0;a<16;a++){const ox=Math.cos(a/16*Math.PI*2)*d,oy=Math.sin(a/16*Math.PI*2)*d,v=score(ox,oy);if(v>bs){bs=v;best=[ox,oy]}}
  let out=0;for(const[,rx,ry]of rel){const[wx,wy]=S2W(X+best[0]+rx,Y+best[1]+ry);if(!inPoly(wx,wy,cl.p))out++}
  if(out){const sw=28*z;by[c].forEach((G,i)=>{G.stack=true;G.SX=X+(i-(by[c].length-1)/2)*sw;G.SY=Y;if(B&&Math.hypot(G.SX-B[0],G.SY-B[1])<S){G.SY=B[1]+S}});for(const[f]of rel)f.SX=null;BLOCKS.push({c:+c,B,x:X,y:by[c][0].SY,w:sw*by[c].length,h:sw});continue}
  for(const G of by[c])G.stack=false;for(const[f,rx,ry]of rel){f.SX=X+best[0]+rx;f.SY=Y+best[1]+ry}BLOCKS.push({c:+c,B,x:X+best[0],y:Y+best[1],w:tw,h:Math.max(...L.map(g2=>g2.h))})}}
// a faint line ties a block to its town when they sit apart
function leaders(){g.save();g.strokeStyle='rgba(30,24,18,.45)';g.lineWidth=1.3;g.setLineDash([3,3]);for(const k of BLOCKS){if(!k.B)continue;const dx=k.x-k.B[0],dy=k.y-k.B[1],d=Math.hypot(dx,dy);if(d<k.w/2+18)continue;
  const t=Math.min(1,Math.max(0,1-Math.min(k.w/2/Math.abs(dx||1e-9),k.h/2/Math.abs(dy||1e-9))*1));g.beginPath();g.moveTo(k.B[0]+dx/d*7,k.B[1]+dy/d*7);g.lineTo(k.B[0]+dx*t,k.B[1]+dy*t);g.stroke()}g.restore()}
// ---- treasury: the Solari lying in a nation's maps, on floors, tables and in chests; what people carry is their own
const GOLD0={road:100,alley:100,vault:1400,count:500,stock:100}; // the built-in maps before anyone opens them
const goldLive=a=>{let s=0;for(const b of a||[]){if(b.type==='token')continue;if(b.type==='weapon'&&b.kind==='gold')s+=b.amt||0;if(b.inv)for(const q of b.inv)if(q&&q.k==='gold')s+=q.n||0}return s};
const goldDef=a=>{let s=0;for(const o of a||[]){if(o.t==='u')continue;if(o.t==='w'&&o.kind==='gold')s+=o.amt||0;for(const q of o.inv||[])if(q&&q.k==='gold')s+=q.n||0}return s};
const mapGold=id=>id===curMap?goldLive(bodies):STATE[id]?goldLive(STATE[id].bodies):MODS.maps[id]?goldDef(MODS.maps[id].bodies):GOLD0[id]||0;
let GC=null;
function cellGold(){if(GC&&performance.now()-GC.t<1500)return GC.v;const v={};for(const c in R.cm){const n=(R.cm[c]||[]).reduce((a,id)=>a+mapGold(id),0);if(n)v[c]=n}GC={t:performance.now(),v};return v}
const treasury=n=>{const v=cellGold();let s=0;for(const c in v)if(n==='all'?NATS[OWN[c]]:OWN[c]===n)s+=v[c];return s};
// the Treasury and People totals show as their own marks in place of the forces
const COIN=['..aaaa..','.abbbba.','abbccbba','abccccba','abbccbba','.abbbba.','..aaaa..'],COINC={a:'#7a5a1c',b:'#e3c463',c:'#f6e6a4'};
const MAN=['..aa..','.aaaa.','..aa..','.aaaa.','aaaaaa','a.aa.a','.a..a.','.a..a.'],MANC={a:'#eee5cd'};
function pix(rows,cols,X,Y,s){for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++){const k=rows[y][x];if(cols[k]){g.fillStyle=cols[k];g.fillRect(Math.round(X+(x-rows[y].length/2)*s),Math.round(Y+(y-rows.length/2)*s),Math.ceil(s),Math.ceil(s))}}}
function mark(X,Y,r,z,ring,rows,cols,label,dim){g.globalAlpha=dim?.3:1;g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.arc(X+1.5,Y+2,r+2,0,7);g.fill();g.fillStyle='#1e1e1e';g.beginPath();g.arc(X,Y,r+2,0,7);g.fill();g.strokeStyle=ring;g.lineWidth=3;g.beginPath();g.arc(X,Y,r,0,7);g.stroke();
 pix(rows,cols,X,Y,1.6*z);g.font=`${Math.round(14*z)}px VT323`;const w=g.measureText(label).width+5;g.fillStyle='#f2efe6';g.fillRect(X+r-4,Y+r-9,w,11*z);g.fillStyle='#141414';g.fillText(label,X+r-1.5,Y+r+.5);g.globalAlpha=1}
function totals(z,r){if(vf==='gold'){const v=cellGold();for(const c in v){const o=OWN[c],[X,Y0]=W2S(...cellXY(+c)),Y=Y0+r+8;mark(X,Y,r,z,'#c9a54a',COIN,COINC,money(v[c]),nation!=='all'&&o!==nation)}}
 if(vf==='ppl'){const by={};for(const p of R.PP)if(!p.dead&&p.show!==false)(by[p.cell]||(by[p.cell]=[])).push(p);for(const c in by){const L=by[c],mine=L.filter(p=>nation==='all'||p.nat===nation),n0=L[0].nat,one=L.every(p=>p.nat===n0),[X,Y0]=W2S(...cellXY(+c)),Y=Y0+r+8;
  mark(X,Y,r,z,one&&NATS[n0]?css(NATS[n0].ring):'#c9c5ba',MAN,MANC,String((nation==='all'?L:mine).length||L.length),!mine.length)}}}
function markers(){const z=Math.max(.8,Math.min(1.4,Math.sqrt(view.k/1.3))),r=10*z;for(const f of R.F)f.R=0;if(view.k>=CLOSE)leaders();totals(z,r);
 if(view.k/KREF<DOTAT){for(const G of GROUPS){G.R=0;const fs=stackOf(G);if(!fs.length)continue;const[X,Y]=W2S(G.x,G.y),dead=fs.every(fallen),on=fs.some(f=>f.id===rsel),hv=fs.some(f=>f.id===hovT),rr=on||hv?5.5:4.2;
   g.globalAlpha=fs.some(match)?1:.3;g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(X+1,Y+1.5,rr+1,0,7);g.fill();g.fillStyle=dead?'#77706a':NATS[G.nat].c;g.beginPath();g.arc(X,Y,rr,0,7);g.fill();g.strokeStyle=on?'#f2efe6':'#1e1a16';g.lineWidth=on?2:1.4;g.stroke();g.globalAlpha=1;G.R=[X-8,Y-8,X+8,Y+8]}return}
 for(const G of GROUPS){G.R=0;const fs=stackOf(G);if(!fs.length)continue;
  if(view.k>=CLOSE&&!G.stack){for(const f of fs)tok(f,f.SX,f.SY,r,z);continue}
  const n=view.k<1.7||G.stack&&view.k>=CLOSE?1:Math.min(2,fs.length),[X,Y]=view.k>=CLOSE&&G.stack?[G.SX,G.SY]:W2S(G.x,G.y);
  for(let i=0;i<n;i++){const f=fs[i],a=X+(i-(n-1)/2)*(2*r+6),rest=fs.slice(i);
   if(i===n-1&&rest.length>1){g.globalAlpha=rest.some(match)?1:.3;for(let s=Math.min(2,rest.length-1);s>0;s--){g.fillStyle='#141414';g.beginPath();g.arc(a+s*3,Y-s*3,r+2,0,7);g.fill();g.strokeStyle=css(NATS[G.nat].ring);g.lineWidth=2;g.beginPath();g.arc(a+s*3,Y-s*3,r,0,7);g.stroke()}g.globalAlpha=1;
    tok(f,a,Y,r,z,rest.reduce((s,f)=>s+soldiers(f),0));f.R=0;G.R=[a-r-3,Y-r-6,a+r+6,Y+r+3]}else tok(f,a,Y,r,z)}}}
function markBoxes(){const r=14;for(const G of GROUPS){const fs=stackOf(G);if(!fs.length)continue;if(view.k>=CLOSE&&!G.stack){for(const f of fs)BOXES.push([f.SX-r,f.SY-r,f.SX+r+4,f.SY+r])}else{const[X,Y]=view.k>=CLOSE?[G.SX,G.SY]:W2S(G.x,G.y),n=view.k<1.7||view.k>=CLOSE?1:Math.min(2,fs.length),w=n*(r+3);BOXES.push([X-w,Y-r-4,X+w+6,Y+r])}}}
function ghost(){const[X,Y]=[dragF.mx,dragF.my],im=imgOf(dragF.f);g.globalAlpha=.75;g.fillStyle='#1e1e1e';g.beginPath();g.arc(X,Y,13,0,7);g.fill();g.strokeStyle='#f2efe6';g.lineWidth=2;g.stroke();if(im&&dragF.f.t!=='vehicle'){g.imageSmoothingEnabled=false;g.drawImage(im,X-im.width*.6,Y-im.height*.6,im.width*1.2,im.height*1.2)}g.globalAlpha=1}

// ---- state of the panel
let vf=null,hovT=null,nation='all',tab='mil',fil='all',sortBy='name',q='',place='all',rsel=null,selMan=null,cell=-1,hov=-1;const openP=new Set(),openF=new Set(),undo=[];
const placeKey=f=>f.cell;
const match=f=>{if(nation!=='all'&&f.nat!==nation)return false;if(place!=='all'&&f.cell!==+place)return false;if(f.t==='person')return true;
 if(fil==='fav'&&!f.fav||fil==='hidden'&&f.show!==false||fil==='squads'&&f.t!=='squad'||fil==='vehicles'&&f.t!=='vehicle'||fil==='fallen'&&!fallen(f)&&!f.men.some(m=>m.dead))return false;
 if(fil!=='fallen'&&fil!=='hidden'&&!R.fallenOn&&fallen(f))return false;
 return!q||(f.n+' '+placeOf(f.cell)+' '+f.men.map(m=>m.n+' '+m.role).join(' ')).toLowerCase().includes(q)};
const pmatch=p=>(nation==='all'||p.nat===nation)&&(place==='all'||p.cell===+place)&&(fil!=='fav'||p.fav)&&(fil!=='notables'||p.note)&&(fil!=='folk'||!p.note)&&(fil!=='fallen'||p.dead)&&(R.fallenOn||fil==='fallen'||!p.dead)&&(!q||(p.n+' '+p.role+' '+placeOf(p.cell)).toLowerCase().includes(q));

// ---- cards in the map's lower left: what is picked, then the picked cell with its maps and who goes in
const BARC={hp:'#7fb069',ar:'#c9c5ba',bad:'#d9603b',am:'#d6b45a'},hc=h=>h<50?BARC.bad:BARC.hp;
const bar=(v,col)=>`<div class="rbar"><i style="width:${v}%;background:${col}"></i></div>`;
const head=(nat,nm,sub)=>{const d=mk('div','rhd');d.innerHTML=`<i style="background:${NATS[nat].c}"></i><div><b>${nm}</b><small>${sub}</small></div>`;return d};
function grid(list){const G=mk('div','rgrid');for(const m of list){const d=mk('div','rman'+(selMan===m.id?' on':'')+(m.dead?' dead':''));d.append(sprBig(m.k,2));d.insertAdjacentHTML('beforeend',`<b><i style="width:${m.dead?100:m.h}%;background:${m.dead?'#5a5650':hc(m.h)}"></i></b>`);d.onclick=e=>{e.stopPropagation();selMan=m.id;cards();list2()};G.append(d)}return G}
function cards(){CARDS.innerHTML='';const cur=R.F.find(f=>f.id===rsel)||R.PP.find(p=>p.id===rsel);
 if(cur){const C=mk('div','rcard');if(cur.t==='person'){C.append(head(cur.nat,cur.n,`${cur.role} · ${placeOf(cur.cell)}`));const b=mk('div','rbig');b.append(sprBig(cur.k,3));const d=mk('div');d.innerHTML=`<div class="rrow"><span>Health</span><span>${cur.dead?'Dead':cur.h+'%'}</span></div>${bar(cur.dead?0:cur.h,hc(cur.h))}`;b.append(d);C.append(b)}
  else{let mm=null;for(const m of cur.men)if(m.id===selMan)mm=m;
   C.append(head(cur.nat,cur.t==='vehicle'?'Carrier · '+cur.n:cur.n,`${fallen(cur)?(cur.wreck?'Wreck':'Fallen'):cur.t==='vehicle'?men(cur).length+' aboard':soldiers(cur)+' of '+cur.men.length} · ${placeOf(cur.cell)}`));
   if(cur.t==='vehicle'){C.append(sprBig(cur.k,1.3));C.insertAdjacentHTML('beforeend',`<div class="rrow"><span>Hull</span><span>${cur.hull}%</span></div>${bar(cur.hull,cur.hull<50?BARC.bad:BARC.am)}`)}
   if(cur.men.length)C.append(grid(cur.men));
   if(mm){const b=mk('div','rbig');b.append(sprBig(mm.k,3));const d=mk('div');d.innerHTML=`<b>${mm.n}</b><small>${mm.role}</small><div class="rrow"><span>Health</span><span>${mm.dead?'Dead':mm.h+'%'}</span></div>${bar(mm.dead?0:mm.h,hc(mm.h))}`;b.append(d);C.append(b)}}
  if(fallen(cur)||cur.t==='person'&&cur.dead){const x=ubtn('Delete','red',()=>{delF(cur)});C.append(x)}
  CARDS.append(C)}}
const ownerOf=i=>{const f=R.F.find(f=>f.cell===i);if(f)return f.nat;return NATS[OWN[i]]?OWN[i]:'Reapers'};
const mapName=id=>R.mname[id]||(MODS.maps[id]&&MODS.maps[id].name)||TITLE[id]||id;
function renameMap(id,n){R.mname[id]=n;if(MODS.maps[id]){MODS.maps[id].name=n;saveMods();regMap(id);fillMapSel()}save()}
function dropMap(c,id){R.cm[c]=(R.cm[c]||[]).filter(x=>x!==id);if(R.last[c]===id)delete R.last[c];if(MODS.maps[id]&&!Object.values(R.cm).some(L=>L.includes(id))){delete MODS.maps[id];delete STATE[id];saveMods();fillMapSel()}save()}
function newMap(c){const cw=30,ch=20,id='mod:'+uidS(),n=placeOf(c);MODS.maps[id]={v:1,name:n,from:null,CW:cw,CH:ch,map:Array.from({length:ch},()=>Array.from({length:cw},()=>'grass')),tex:{},bodies:[],owner:NATS[ownerOf(c)]?.gn||ownerOf(c)};saveMods();regMap(id);fillMapSel();(R.cm[c]||(R.cm[c]=[])).push(id);R.last[c]=id;save();return id}
function delF(f){if(f.t==='person')R.PP=R.PP.filter(p=>p!==f);else R.F=R.F.filter(x=>x!==f);rsel=null;layout();save();cards();list2();draw()}

// ---- the settlement dialog: every man in the cell, groups as rows that open; Enter with a map picker
const SDL=mk('div','rsd');SDL.hidden=true;OV.append(SDL);
let sdc=-1,sdPick=new Set(),sdMap=null,sdFil='all',sdOpen=new Set(),sdDrop=false,sdMenu=null,DRG=null,sdT=0;
const CAP=f=>f.t==='vehicle'?6:8;
function settle(c){if(sdc!==c){sdPick=new Set();sdOpen=new Set();sdFil='all'}sdc=c;cell=c;const L=R.cm[c]||[];sdMap=L.includes(R.last[c])?R.last[c]:L[0]||null;sdDrop=false;sdMenu=null;SDL.hidden=false;
 const f=R.F.find(f=>f.id===rsel&&f.cell===c);if(f)for(const m of men(f))sdPick.add(m.id);drawSD();preview();draw()}
function unsettle(){SDL.hidden=true;sdc=-1;draw()}
const linksOf=(id,L)=>(EXITS[id]||[]).filter(x=>x.to&&L.includes(x.to)).map(x=>mapName(x.to));
// everyone else standing in this cell's maps: the maps' own people, and the held ones by how they are held
function locals(c){const out=[],pris={};for(const id of R.cm[c]||[]){const arr=id===curMap?bodies:STATE[id]&&STATE[id].bodies;if(!arr)continue;const by={};
 for(const b of arr){if(b.type!=='token'||b.rid||b.status==='dead')continue;const lk=lookOf(b)||'Townsman',m={id:'b'+id+b.id,n:b.name||'—',k:lk,role:lk.split('|')[0],h:Math.round(100*b.px.length/(b.n0||1))};
  if(b.status==='captured'){const s=b.held?'Under escort':b.tether?(b.tether.kind==='chain'?'Chained':'Tied'):'Held';(pris[s]||(pris[s]=[])).push(m)}else(by[b.nat]||(by[b.nat]=[])).push(m)}
 for(const n in by)out.push({key:'l'+id+n,map:id,nat:n,men:by[n]})}return{out,pris}}
const natCol=n=>NATS[n]?NATS[n].c:(Object.values(NATS).find(o=>o.gn===n)||{}).c||(typeof NAT!=='undefined'&&NAT[n])||'#77706a';
function moveMan(m,from,to,other){const i=from.men.indexOf(m);if(other){const j=to.men.indexOf(other);from.men[i]=other;to.men[j]=m}else{if(to.men.length>=CAP(to))return false;from.men.splice(i,1);to.men.push(m)}
 if(!from.men.length&&from.t==='squad')R.F.splice(R.F.indexOf(from),1);layout();save();list2();return true}
function dragSrc(el,m,f){if(!f||m.dead)return;el.draggable=true;el.ondragstart=e=>{DRG={m,f};e.dataTransfer.setData('text/plain',m.id);e.dataTransfer.effectAllowed='move';SDL.classList.add('dragging')};el.ondragend=()=>{DRG=null;SDL.classList.remove('dragging');SDL.querySelectorAll('.ov,.full,.sw').forEach(x=>x.classList.remove('ov','full','sw'))}}
function dropOn(el,f,other){if(!f)return;el.ondragover=e=>{if(!DRG||DRG.f.nat!==f.nat||DRG.m===other)return;if(other){e.preventDefault();e.stopPropagation();el.classList.add('sw');return}if(DRG.f===f)return;e.preventDefault();el.classList.add(f.men.length>=CAP(f)?'full':'ov')};
 el.ondragleave=()=>el.classList.remove('ov','full','sw');
 el.ondrop=e=>{e.preventDefault();e.stopPropagation();if(!DRG)return;const{m,f:from}=DRG;DRG=null;if(other){if(from===f){const a=f.men.indexOf(m),b=f.men.indexOf(other);f.men[a]=other;f.men[b]=m;layout();save()}else moveMan(m,from,f,other)}else if(from!==f)moveMan(m,from,f);drawSD();draw()}}
function mini(m,f,pickable){const d=mk('span','mi'+(m.dead?' dead':'')+(sdPick.has(m.id)?' on':''));d.title=m.n;d.append(sprBig(m.k,1));d.insertAdjacentHTML('beforeend',`<i style="width:${m.dead?0:m.h}%;background:${hc(m.h)}"></i>`);dragSrc(d,m,f);dropOn(d,f,m);return d}
function tile(m,pickable,f){const d=mk('div','ut'+(sdPick.has(m.id)?' on':'')+(m.dead?' dead':''));d.append(sprBig(m.k,1));
 d.insertAdjacentHTML('beforeend',`<span class="un">${m.n}</span><small>${m.dead?'Dead':m.role}${m.map?' · in '+mapName(m.map):''}</small><span class="ub2"><i style="width:${m.dead?0:m.h}%;background:${hc(m.h)}"></i></span>`);
 d.onclick=e=>{e.stopPropagation();if(!pickable||m.dead||m.map)return;sdPick.has(m.id)?sdPick.delete(m.id):sdPick.add(m.id);drawSD()};dragSrc(d,m,f);dropOn(d,f,m);return d}
function drawSD(){if(SDL.hidden)return;const keep=SDL.querySelector('.sdb')?.scrollTop||0,c=sdc,cl=D.cells[c],own=OWN[c],maps=R.cm[c]||[];
 const fs=R.F.filter(f=>f.cell===c),sqs=fs.filter(f=>f.t==='squad'),cars=fs.filter(f=>f.t==='vehicle'),ppl=[...R.PP.filter(p=>p.cell===c),...fs.filter(f=>f.t==='unit').map(f=>({...f.men[0],note:1,nat:f.nat}))],{out,pris}=locals(c),np=Object.values(pris).reduce((a,L)=>a+L.length,0);
 SDL.innerHTML=`<div class="sdh"><span class="sfl"></span><div><b>${placeOf(c)}</b><small>${own?disp(own):'Unclaimed'} · ${land(cl)?terrainOf(cl):'Sea'}</small></div><button class="x">×</button></div>`;SDL.querySelector('.x').onclick=unsettle;{const sf=SDL.querySelector('.sfl');if(own&&NATS[own])sf.append(embCanvas(own,1));else sf.innerHTML=`<i style="display:block;width:33px;height:33px;background:${own?ownC(own):'#555'};border:1px solid #000"></i>`}
 const ch=mk('div','sdc');ch.innerHTML=[['all','All',0],['squads','Squads',sqs.length],['vehicles','Vehicles',cars.length],['people','People',ppl.length],['locals','In the maps',out.reduce((a,g)=>a+g.men.length,0)],['prisoners','Prisoners',np]].filter(([k,,n])=>k==='all'||n).map(([k,t,n])=>`<button data-f="${k}" class="${sdFil===k?'on':''}">${t}${n?` <em>${n}</em>`:''}</button>`).join('');
 ch.onclick=e=>{const x=e.target.closest('button');if(x){sdFil=x.dataset.f;drawSD()}};SDL.append(ch);
 const body=mk('div','sdb');SDL.append(body);const hd=t=>body.append(mk('div','sec',t)),show=k=>sdFil==='all'||sdFil===k;
 const row=(key,col,title,sub,list,pickable,f)=>{const live=list.filter(m=>!m.dead&&!m.map),on=pickable&&live.length&&live.every(m=>sdPick.has(m.id)),part=pickable&&!on&&live.some(m=>sdPick.has(m.id)),op=sdOpen.has(key);
  const r=mk('div','gr'+(op?' op':''));r.innerHTML=`${pickable?`<span class="tk${on?' on':part?' part':''}"></span>`:'<span class="tk no"></span>'}<i style="background:${col}"></i><span class="gt"><b>${title}</b><small>${sub}</small></span><span class="ms"></span><span class="cr">${op?'▾':'▸'}</span>`;
  const ms=r.querySelector('.ms');for(const m of list)ms.append(mini(m,f,pickable));dropOn(r,f,null);
  if(f&&f.t==='squad'){const nb=r.querySelector('.gt b');nb.ondblclick=e=>{e.stopPropagation();clearTimeout(sdT);const t=mk('input','rn');t.value=f.n;nb.replaceWith(t);t.focus();t.select();const done=()=>{f.n=t.value.trim()||f.n;save();list2();drawSD()};t.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Enter')done();if(ev.key==='Escape')drawSD()};t.onblur=done;t.onclick=ev=>ev.stopPropagation()}}
  r.onclick=e=>{if(e.target.closest('input'))return;if(e.target.closest('.tk')){if(!pickable)return;for(const m of live)on?sdPick.delete(m.id):sdPick.add(m.id);drawSD();return}clearTimeout(sdT);sdT=setTimeout(()=>{op?sdOpen.delete(key):sdOpen.add(key);drawSD()},e.target.closest('.gt b')?230:0)};body.append(r);
  if(op){const G=mk('div','tiles');for(const m of list)G.append(tile(m,pickable,f));dropOn(G,f,null);body.append(G)}};
 if(show('squads')&&sqs.length){hd('Squads');for(const f of sqs)row(f.id,NATS[f.nat].c,f.n,men(f).length+'/8'+(inMap(f)?' · in battle':''),f.men,true,f);
  const nr=mk('div','gr new','+ New squad'),nat0=(sqs.find(f=>f.nat===own)||sqs[0]).nat;nr.ondragover=e=>{if(DRG){e.preventDefault();nr.classList.add('ov')}};nr.ondragleave=()=>nr.classList.remove('ov');
  const mkSq=nat=>{const f={id:'f'+Date.now().toString(36),t:'squad',nat,cell:c,n:'New squad',men:[]};R.F.push(f);sdOpen.add(f.id);return f};
  nr.ondrop=e=>{e.preventDefault();if(!DRG)return;const{m,f:from}=DRG;DRG=null;moveMan(m,from,mkSq(from.nat));drawSD();draw()};nr.onclick=()=>{mkSq(nat0);save();drawSD()};body.append(nr)}
 if(show('vehicles')&&cars.length){hd('Vehicles');for(const f of cars)row(f.id,NATS[f.nat].c,f.n,f.wreck?'Wreck':f.men.length+'/6 aboard · hull '+f.hull+'%',f.men,!f.wreck,f)}
 if(show('people')&&ppl.length){hd('People');const nt=ppl.filter(p=>p.note),fk=ppl.filter(p=>!p.note),col=own?ownC(own):'#555';if(nt.length)row('pn'+c,col,'Notables',String(nt.length),nt,true,null);if(fk.length)row('pf'+c,col,'Townsfolk',String(fk.length),fk,true,null)}
 if(show('locals')&&out.length){hd('In the maps');for(const g2 of out)row(g2.key,natCol(g2.nat),disp(g2.nat),mapName(g2.map),g2.men,false,null)}
 if(show('prisoners')&&np){hd('Prisoners');for(const s of['Under escort','Chained','Tied','Held'])if(pris[s])row('pr'+c+s,'#77706a',s,String(pris[s].length),pris[s],false,null)}
 if(body.children.length===0)body.append(mk('div','none','—'));
 // Enter, with the map picker on its arrow
 const F=mk('div','sdf'),cur=sdMap;F.innerHTML=`<span>${sdPick.size?sdPick.size+' to send':''}</span><span class="spl"><button class="go">Enter ${cur?mapName(cur).split(' · ').pop():'new map'}</button><button class="arr">▾</button></span>`;
 F.querySelector('.go').onclick=enterSD;F.querySelector('.arr').onclick=()=>{sdDrop=!sdDrop;sdMenu=null;drawSD()};SDL.append(F);
 if(sdDrop){const P=mk('div','sdd');for(const id of maps){const r=mk('div','dr'+(id===cur?' on':''));const lk=linksOf(id,maps);r.innerHTML=`<span class="dn">${mapName(id)}</span>${lk.length?`<small>↔ ${lk.map(x=>x.split(' · ').pop()).join(', ')}</small>`:''}<button class="dots">⋯</button>`;
   r.onclick=e=>{if(e.target.closest('.dots')){sdMenu=sdMenu&&sdMenu.id===id?null:{id,step:0};drawSD();return}if(e.target.closest('input,.dm'))return;sdMap=id;R.last[c]=id;save();sdDrop=false;drawSD();preview()};P.append(r);
   if(sdMenu&&sdMenu.id===id){const mm=mk('div','dm');mm.innerHTML=sdMenu.step===1?`<span>Remove ${mapName(id).split(' · ').pop()} from ${placeOf(c)}?</span><button data-a="yes" class="warn">Remove</button><button data-a="no">Cancel</button>`:sdMenu.step===2?`<input class="rn" value="${mapName(id).replace(/"/g,'&quot;')}"><button data-a="ok">OK</button>`:`<button data-a="ren">Rename</button><button data-a="rem" class="warn">Remove</button>`;
    const go=a=>{if(a==='rem')sdMenu.step=1;else if(a==='ren')sdMenu.step=2;else if(a==='yes'){dropMap(c,id);sdMap=(R.cm[c]||[])[0]||null;sdMenu=null}else if(a==='ok'){renameMap(id,mm.querySelector('input').value.trim()||mapName(id));sdMenu=null}else sdMenu=null;drawSD();draw()};
    mm.onclick=e=>{const a=e.target.dataset.a;if(a)go(a)};const inp=mm.querySelector('input');if(inp){inp.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')go('ok');if(e.key==='Escape')go('no')};setTimeout(()=>{inp.focus();inp.select()},0)}P.append(mm)}}
  const nw=mk('div','dr add','+ New map');nw.onclick=()=>{sdMap=newMap(c);sdDrop=false;drawSD();draw()};P.append(nw);F.append(P)}
 body.scrollTop=keep}
function enterSD(){const c=sdc;let id=sdMap;if(!id)id=newMap(c);R.last[c]=id;const go=[];
 for(const f of R.F.filter(f=>f.cell===c&&!fallen(f)))for(const m of f.men)if(sdPick.has(m.id)&&!m.dead&&!m.map)go.push([f,m]);
 for(const p of R.PP.filter(p=>p.cell===c))if(sdPick.has(p.id)&&!p.dead&&!p.map)go.push([p,p]);
 unsettle();close();if(id!==curMap)goMap(id);deploy(go);sdPick.clear();save()}

// ---- the side panel: nation strip, purse and counts, then forces and people by place
const money=n=>'§'+(n>=1e4?(n/1e3).toFixed(n>=1e5?0:1)+'k':n.toLocaleString('en'));
const EYE=o=>`<svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 6c2-4 12-4 14 0-2 4-12 4-14 0z" fill="none" stroke="currentColor" stroke-width="1.5"/>${o?'<circle cx="8" cy="6" r="2.2" fill="currentColor"/>':'<path d="M2 11L14 1" stroke="currentColor" stroke-width="1.5"/>'}</svg>`;
const LOC='<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 0v3M7 11v3M0 7h3M11 7h3" stroke="currentColor" stroke-width="1.5"/></svg>';
const SKULL='<svg width="14" height="14" viewBox="0 0 7 7" shape-rendering="crispEdges"><path d="M1 0h5v1h1v3h-1v1h-1v2h-3v-2h-1v-1h-1v-3h1z" fill="currentColor"/><path d="M2 2h1v1h-1zM4 2h1v1h-1z" fill="#1e1e1e"/></svg>';
ZR.innerHTML=`<div class="zone rzt"><div class="tgrid"></div></div><div class="zone rzp" hidden><div class="ch"></div><div class="tgrid rrd"></div></div><div class="zone rzi" hidden><div class="ch"></div><div class="rtabs r3"><button data-w="0">Nations</button><button data-w="1">Land</button><button data-w="2">Water</button></div><div class="rtil"></div><div class="tgrid rpn"></div><div class="rcap"></div></div><div class="zone rzn"><div class="tgrid rflags"></div></div><div class="zone rzd"><div class="ch rname"></div><div class="rpick" hidden></div><div class="rstat"></div><div class="rtabs"><button data-t="mil">Military</button><button data-t="ppl">People</button></div><input class="rq" placeholder="Search"><div class="rchips"></div><div class="rsels"><select class="rpl"></select><select class="rso"><option value="name">Name</option><option value="size">Size</option><option value="hp">Health</option></select></div><div class="rlist"></div></div>`;
const Z=s=>ZR.querySelector(s);
const NCOL=['#1e40ff','#e8101e','#ffe600','#00c853','#ff7a00','#e0119d','#00d4ff','#7b2cff','#a8ff00','#b0002a','#f2f2f2','#1a1a1a','#6b7a3a','#4a5d7e','#9c4a2b','#b8a272','#3d7a74','#6e4a6b','#4f6b45','#7d8a96','#b08532','#8a3b36','#2c3a57','#8f8578'];
let painting=0,tiling=0,rtool='cmd',pnat=null,rErase=false,tileT='plains',tileW=1,wmode='ter',rdT='roads',RB=null;
// the region's own tools, laid out like the cell maps': Command for nations and forces, Tiler for the ground, Painter for borders
const RTOOLS=[['cmd','hand','Command','Esc'],['tile','tile','Tiler','N'],['paint','paint','Painter','P']];// Tiler: who holds a cell and what it is; Painter: roads
{const G=Z('.rzt .tgrid');for(const[k,ic,n,key]of RTOOLS){const b=mk('button','tb');b.dataset.k=k==='cmd'?'hand':k;b.dataset.t=k;const t=mk('span',null,n);t.append(mk('i','kb','('+key+')'));b.append(uicon(ic),t);b.onclick=()=>setTool(k);if(k==='cmd')b.classList.add('on');G.append(b)}}
function setTool(k){rtool=k;painting=tiling=0;for(const b of Z('.rzt .tgrid').children)b.classList.toggle('on',b.dataset.t===k);Z('.rzp').hidden=k!=='paint';Z('.rzi').hidden=k!=='tile';Z('.rzn').hidden=Z('.rzd').hidden=k!=='cmd';cv.style.cursor=k==='cmd'?'':'crosshair';if(k==='paint')painterUI();if(k==='tile')tilerUI();draw()}
let pwat=null;
const ROADT=[['roads','Main road'],['trails','Trail'],['erase','Erase']];
function painterUI(){const P=Z('.rzp'),H=P.querySelector('.ch');H.innerHTML='';H.append(uicon('paint'),mk('span',null,'Painter'));const L=P.querySelector('.rrd');L.innerHTML='';
 for(const[k,n]of ROADT){const b=mk('button','tb'+(rdT===k?' on':''));const c=mk('canvas');c.width=22;c.height=12;const x=c.getContext('2d');if(k==='erase'){c.width=0}else{x.lineCap='round';x.strokeStyle=k==='roads'?'#342416':'#34281c';x.lineWidth=k==='roads'?6:4;x.beginPath();x.moveTo(3,6);x.lineTo(19,6);x.stroke();x.strokeStyle=k==='roads'?'#eccd8c':'#f6f2e6';x.lineWidth=k==='roads'?3:1.6;x.stroke()}
  const sp=mk('span');if(k==='erase')sp.innerHTML=ERASE;else sp.append(c);b.append(sp,mk('em',null,n));b.onclick=()=>{rdT=k;painterUI()};L.append(b)}}
// waters: named seas and bays, painted cell by cell; + starts a new one, double-click renames
function rename(id){const b=Z(`.rpn button[data-w="${id}"]`);if(!b)return;const t=mk('input','rn');t.value=R.seas[id].n;b.replaceWith(t);t.focus();t.select();const done=()=>{const v=t.value.trim();if(v)R.seas[id].n=v;SL=null;save();tilerUI();draw()};t.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')t.blur();if(e.key==='Escape'){t.value=R.seas[id].n;t.blur()}};t.onblur=done}
function swatch(t,s){const T=terTile(t),c=mk('canvas');c.width=c.height=s;const x=c.getContext('2d'),im=x.createImageData(s,s);for(let y=0;y<s;y++)for(let X=0;X<s;X++){const col=T.P[Math.min(T.A[(y+8)*T.s+X+8],T.P.length-1)];im.data.set([col[0],col[1],col[2],255],(y*s+X)*4)}x.putImageData(im,0,0);return c}
function tilerUI(){const P=Z('.rzi'),H=P.querySelector('.ch');H.innerHTML='';H.append(uicon('tile'),mk('span',null,'Tiler'));
 if(tileW!==1){const hb=mk('span','hb');if(tileW===2){const add=mk('button','sq','+');add.onclick=()=>{const id='w'+Date.now().toString(36);R.seas[id]={n:'New water'};pwat=id;wmode='name';rErase=false;save();tilerUI();rename(id)};hb.append(add)}
  const er=mk('button','sq'+(rErase?' on':''));er.innerHTML=ERASE;er.onclick=()=>{rErase=!rErase;if(tileW===2)wmode='name';tilerUI()};hb.append(er);H.append(hb)}
 P.querySelectorAll('.rtabs button').forEach(b=>b.classList.toggle('on',+b.dataset.w===tileW));const L=P.querySelector('.rtil'),N=P.querySelector('.rpn');L.innerHTML='';N.innerHTML='';L.hidden=tileW===0;
 if(tileW){for(const t of tileW===2?TTW:TTL){const b=mk('button',t===tileT&&(tileW===1||wmode==='ter')?'on':'');b.append(swatch(t,32));b.title=TT[t].n;b.onclick=()=>{tileT=t;wmode='ter';rErase=false;tilerUI()};L.append(b)}}
 if(tileW===0){if(!pnat||!NATS[pnat])pnat=nation!=='all'?nation:Object.keys(NATS)[0];N.innerHTML=Object.keys(NATS).map(n=>`<button data-n="${n}" class="tb${n===pnat&&!rErase?' on':''}"><span></span><em>${disp(n)}</em></button>`).join('');N.querySelectorAll('.tb span').forEach(sp=>sp.append(embCanvas(sp.parentNode.dataset.n,22/33)))}
 if(tileW===2){const ids=Object.keys(R.seas);if(!R.seas[pwat])pwat=ids[0]||null;N.innerHTML=ids.map(id=>`<button data-w="${id}" class="tb${id===pwat&&wmode==='name'&&!rErase?' on':''}"><span class="wsw"></span><em>${R.seas[id].n}</em></button>`).join('')}
 P.querySelector('.rcap').textContent=rErase?'Erase':tileW===0?disp(pnat):tileW===2&&wmode==='name'?(R.seas[pwat]||{}).n||'':TT[tileT].n}
Z('.rzi .rtabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;tileW=+b.dataset.w;rErase=false;tilerUI()};
Z('.rzi .rpn').onclick=e=>{const b=e.target.closest('button');if(!b)return;rErase=false;if(b.dataset.n)pnat=b.dataset.n;else{pwat=b.dataset.w;wmode='name'}tilerUI()};
Z('.rzi .rpn').ondblclick=e=>{const b=e.target.closest('button');if(b&&b.dataset.w)rename(b.dataset.w)};
const ERASE='<svg width="14" height="14" viewBox="0 0 7 7" shape-rendering="crispEdges"><path d="M3 0h3v1h1v2h-1v1h-1v1h-1v1h-3v-1h-1v-2h1v-1h1v-1h1z" fill="currentColor"/><path d="M1 4h2v1h-2z" fill="#1e1e1e"/></svg>';
function tileAt(x,y){if(tileW===0||tileW===2&&wmode==='name'){paintAt(x,y);return}const i=near(S2W(x,y)),c=D.cells[i];if(vis[i]<.5||c.t===tileT)return;setTer(c,tileT);R.ter[i]=tileT;ownFix(i);if(land(c)&&R.wc[i]){delete R.wc[i];SL=null}if(R.own[i]!==undefined&&!land(c))delete R.own[i];LBL=null;BCH=null;BLOCK=null;repaintCell(i);draw()}
Z('.rpick').onclick=e=>{const b=e.target.closest('button');if(!b||nation==='all')return;const c=b.dataset.c;R.col[nation]=c;NATS[nation].c=c;NATS[nation].ring=ringOf(c);LBL=null;save();Z('.rpick').hidden=true;natBar();list2();draw();preview();if(!SDL.hidden)drawSD()};
Z('.rflags').onclick=e=>{const b=e.target.closest('button');if(!b)return;nation=b.dataset.n;place='all';rsel=null;selMan=null;openP.clear();if(nation!=='all'){const s=BURG[NATS[nation].seat];openP.add(near([s.x,s.y]));fly(s.x,s.y,Math.max(view.k,1.6))}list2();cards();draw()};
// the header's buttons and the totals are drawn anew each time: one listener for them
Z('.rname').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.classList.contains('rter')){R.terr=R.terr===false;save();natBar();draw();preview()}
 else if(b.classList.contains('rfal')){R.fallenOn=!R.fallenOn;save();list2();draw()}
 else if(b.classList.contains('rsw')){const P=Z('.rpick');P.hidden=!P.hidden;if(!P.hidden)P.innerHTML=NCOL.map(c=>`<button data-c="${c}" style="background:${c}" class="${c===NATS[nation].c?'on':''}"></button>`).join('')}
});
Z('.rstat').onclick=e=>{const b=e.target.closest('button');if(!b)return;vf=vf===b.dataset.v?null:b.dataset.v;natBar();draw()};
Z('.rzd .rtabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;tab=b.dataset.t;list2()};
Z('.rchips').onclick=e=>{const b=e.target.closest('button');if(!b)return;fil=b.dataset.f;list2();draw()};
Z('.rso').onchange=e=>{sortBy=e.target.value;list2()};
Z('.rpl').onchange=e=>{place=e.target.value;if(place!=='all'){openP.add(+place);const[x,y]=cellXY(+place);fly(x,y,Math.max(view.k,2.6))}list2();draw()};
Z('.rq').oninput=e=>{q=e.target.value.trim().toLowerCase();list2();draw()};
function natBar(){Z('.rflags').innerHTML=`<button data-n="all" class="tb all${nation==='all'?' on':''}"><span></span>All nations</button>`+Object.keys(NATS).map(n=>`<button data-n="${n}" class="tb${nation===n?' on':''}" title="${disp(n)}"><span></span><em>${disp(n)}</em></button>`).join('');Z('.rflags').querySelectorAll('.tb:not(.all) span').forEach(sp=>sp.append(embCanvas(sp.parentNode.dataset.n,22/33)));
 const fs=R.F.filter(f=>nation==='all'||f.nat===nation),ps=R.PP.filter(p=>!p.dead&&(nation==='all'||p.nat===nation)),gold=treasury(nation);
 const H=Z('.rname'),tools=`<span class="hb">${nation==='all'?'':`<button class="sq rsw" style="background:${NATS[nation].c}"></button>`}<button class="sq rter${R.terr!==false?' on':''}">⚑</button><button class="sq rfal${R.fallenOn?' on':''}">${SKULL}</button></span>`;
 if(nation==='all'){H.innerHTML=`<div class="rnm"><b>All nations</b></div>`+tools;Z('.rpick').hidden=true}else{const o=NATS[nation];H.innerHTML=`<span class="rfl"></span><div class="rnm"><b>${disp(nation)}</b><small>${o.pp?o.pp+' · ':''}${o.seat}</small></div>`+tools;
  const fl=embCanvas(nation,32/33);fl.onclick=()=>embEdit(nation);H.querySelector('.rfl').append(fl);
  const nb2=H.querySelector('.rnm b');nb2.ondblclick=()=>{const t=mk('input','rn');t.value=disp(nation);nb2.replaceWith(t);t.focus();t.select();const done=()=>{const v=t.value.trim();if(v){R.names[nation]=v;NATS[nation].n=v;LBL=null;save()}natBar();draw()};t.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')done();if(e.key==='Escape')natBar()};t.onblur=done}}
 Z('.rstat').innerHTML=[['gold','Treasury',money(gold)],['sol','Soldiers',fs.reduce((a,f)=>a+soldiers(f),0)],['veh','Vehicles',fs.filter(f=>f.t==='vehicle'&&!f.wreck).length],['ppl','People',ps.length]].map(([v,a,b])=>`<button data-v="${v}" class="${vf===v?'on':''}"><small>${a}</small><b>${b}</b></button>`).join('');
 const seat=nation!=='all'&&near([BURG[NATS[nation].seat].x,BURG[NATS[nation].seat].y]);
 const pl=[...new Set([...fs,...R.PP.filter(p=>nation==='all'||p.nat===nation)].map(f=>f.cell))].sort((a,b)=>(b===seat)-(a===seat)||placeOf(a).localeCompare(placeOf(b)));if(place!=='all'&&!pl.includes(+place))place='all';
 Z('.rpl').innerHTML=`<option value="all">All places</option>`+pl.map(p=>`<option value="${p}"${p===+place?' selected':''}>${placeOf(p)}</option>`).join('');
 Z('.rzd .rtabs').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
 const F=tab==='mil'?[['all','All'],['fav','★'],['squads','Squads'],['vehicles','Vehicles'],['hidden','Hidden'],['fallen','Fallen']]:[['all','All'],['fav','★'],['notables','Notables'],['folk','Townsfolk'],['fallen','Fallen']];if(!F.some(x=>x[0]===fil))fil='all';
 Z('.rchips').innerHTML=F.map(([k,n])=>`<button data-f="${k}" class="${fil===k?'on':''}">${n}</button>`).join('')}
const srt=(a,b)=>sortBy==='name'?a.n.localeCompare(b.n):sortBy==='size'?(b.men?b.men.length:0)-(a.men?a.men.length:0):sortBy==='hp'?(a.t==='person'?a.h:hpOf(a))-(b.t==='person'?b.h:hpOf(b)):0;
function list2(){natBar();const box=Z('.rlist');box.innerHTML='';const L=tab==='mil'?R.F.filter(match):R.PP.filter(pmatch);
 const by={};for(const f of L)(by[f.cell]||(by[f.cell]=[])).push(f);const seat=nation!=='all'&&near([BURG[NATS[nation].seat].x,BURG[NATS[nation].seat].y]);
 const order=Object.keys(by).map(Number).sort((a,b)=>(b===seat)-(a===seat)||by[b].length-by[a].length);
 for(const c of order){const fs=by[c].sort(srt),n=tab==='mil'?fs.reduce((a,f)=>a+soldiers(f),0):fs.filter(p=>!p.dead).length,op=openP.has(c)||+place===c||q,fl=fs.filter(f=>f.t==='person'?f.dead:fallen(f)||f.men.some(m=>m.dead)).length;
  const h=mk('div','rph');h.innerHTML=`<span class="cr">${op?'▾':'▸'}</span><span class="tx">${placeOf(c)}${c===seat?' <em>seat</em>':''}</span><span class="ct">${n}</span>${fl&&R.fallenOn?`<button class="cl" title="Clear fallen">${SKULL}</button>`:''}<button class="lc">${LOC}</button>`;
  h.onclick=e=>{if(e.target.closest('.lc')){const[x,y]=cellXY(c);fly(x,y,Math.max(view.k,2.6));return}if(e.target.closest('.cl')){clearFallen(c);return}openP.has(c)?openP.delete(c):openP.add(c);list2()};box.append(h);if(!op)continue;
  for(const f of fs)tab==='mil'?frow(f,box):prow(f,box)}}
function clearFallen(c){R.F=R.F.filter(f=>!(f.cell===c&&fallen(f)));for(const f of R.F)if(f.cell===c)f.men=f.men.filter(m=>!m.dead);R.PP=R.PP.filter(p=>!(p.cell===c&&p.dead));layout();save();list2();cards();draw()}
function frow(f,box){const r=mk('div','rr'+(rsel===f.id?' on':'')+(f.show===false?' off':'')+(fallen(f)?' dead':''));const hp=hpOf(f),fold=f.t!=='unit'&&f.men.length;
 r.innerHTML=`<span class="cr">${fold?(openF.has(f.id)?'▾':'▸'):''}</span><span class="st${f.fav?' y':''}">${f.fav?'★':'☆'}</span><i class="fl" style="background:${NATS[f.nat].c}"></i><span class="ic"></span><span class="tx"><b>${f.n}</b><small>${fallen(f)?(f.wreck?'Wreck':'Fallen'):f.t==='unit'?f.men[0].role:f.t==='vehicle'?'Vehicle':'Squad'}${inMap(f)?' · in battle':''}</small></span><span class="ct">${f.t==='unit'||fallen(f)?'':soldiers(f)}</span><span class="hb"><i style="width:${fallen(f)?0:hp}%;background:${f.t==='vehicle'?(hp<50?BARC.bad:BARC.am):hc(hp)}"></i></span><button class="ey">${EYE(f.show!==false)}</button><button class="lc">${LOC}</button>`;
 r.querySelector('.ic').append(sprBig(f.t==='vehicle'?f.k:lead(f).k,f.t==='vehicle'?.5:1));
 r.onclick=e=>{const t=e.target.closest('button,.st,.cr');if(t&&t.classList.contains('st')){f.fav=!f.fav;save();list2();return}if(t&&t.classList.contains('ey')){f.show=f.show===false;save();list2();draw();return}if(t&&t.classList.contains('cr')&&fold){openF.has(f.id)?openF.delete(f.id):openF.add(f.id);list2();return}pick(f,t&&t.classList.contains('lc'))};box.append(r);
 if(fold&&openF.has(f.id))for(const m of f.men){if(m.dead&&!R.fallenOn&&fil!=='fallen')continue;const s=mk('div','rr m'+(selMan===m.id?' on':'')+(m.dead?' dead':''));s.innerHTML=`<span class="ic"></span><span class="tx"><b>${m.n}</b><small>${m.dead?'Dead':m.role}</small></span><span class="hb"><i style="width:${m.dead?0:m.h}%;background:${hc(m.h)}"></i></span>`;s.querySelector('.ic').append(sprBig(m.k,1));s.onclick=()=>{rsel=f.id;selMan=m.id;list2();cards();draw()};box.append(s)}}
function prow(p,box){const r=mk('div','rr'+(rsel===p.id?' on':'')+(p.dead?' dead':''));r.innerHTML=`<span class="cr"></span><span class="st${p.fav?' y':''}">${p.fav?'★':'☆'}</span><i class="fl" style="background:${NATS[p.nat].c}"></i><span class="ic"></span><span class="tx"><b>${p.n}</b><small>${p.dead?'Dead':p.role}</small></span>${p.note?'<span class="nt">◆</span>':''}<button class="lc">${LOC}</button>`;
 r.querySelector('.ic').append(sprBig(p.k,1));r.onclick=e=>{const t=e.target.closest('button,.st');if(t&&t.classList.contains('st')){p.fav=!p.fav;save();list2();return}rsel=p.id;selMan=null;cell=p.cell;list2();cards();const[x,y]=cellXY(p.cell);fly(x,y,t?Math.max(view.k,3):view.k)};box.append(r)}
function unpick(){rsel=null;selMan=null;list2();cards();draw()}
function pick(f,zoom){if(rsel===f.id&&!zoom){unpick();return}rsel=f.id;selMan=null;openP.add(f.cell);if(f.t!=='unit')openF.add(f.id);cell=f.cell;list2();cards();preview();fly(f.x,f.y,zoom?Math.max(view.k,3):view.k);requestAnimationFrame(()=>{const el=Z('.rlist .rr.on');el&&el.scrollIntoView({block:'nearest'})})}
function fly(x,y,k1){k1=Math.min(KMAX,k1);const k0=view.k,cx=VW/2,cy=VH/2,sx=(cx-view.x)/k0,sy=(cy-view.y)/k0,t0=performance.now();
 const step=t=>{let u=Math.min(1,(t-t0)/380);u=u*u*(3-2*u);const k=k0+(k1-k0)*u,wx=sx+(x-sx)*u,wy=sy+(y-sy)*u;view.k=k;view.x=cx-wx*k;view.y=cy-wy*k;draw();if(u<1)requestAnimationFrame(step)};requestAnimationFrame(step)}

// ---- the clock: on a map it opens the region; on the region it shows the picked cell and enters it
const OCT=CORN.querySelector('.oct'),PV=mk('canvas','rgpv');PV.width=PV.height=232;OCT.append(PV);
OCT.onclick=()=>{US.clock();if(!OV.hidden){if(!SDL.hidden)enterSD();else if(cell>=0)settle(cell);else NOPE();return}if(EM){aiWas=true;pickTool('hand');return}open()};
function preview(){if(OV.hidden)return;const c=cell>=0?cell:-1,pg=PV.getContext('2d'),s={g,VW,VH,dpr,view:{...view}};
 pg.setTransform(1,0,0,1,0,0);pg.clearRect(0,0,232,232);if(c<0)return;const[x,y]=cellXY(c),oct=r=>{const q=r*.414;pg.beginPath();pg.moveTo(116-q,116-r);pg.lineTo(116+q,116-r);pg.lineTo(116+r,116-q);pg.lineTo(116+r,116+q);pg.lineTo(116+q,116+r);pg.lineTo(116-q,116+r);pg.lineTo(116-r,116+q);pg.lineTo(116-r,116-q);pg.closePath()};
 pg.save();oct(104);pg.clip();g=pg;VW=VH=116;dpr=2;view={k:4.5,x:58-x*4.5,y:58-y*4.5};const BP=BURGPT;try{ground();cellMarks();g.setTransform(dpr,0,0,dpr,0,0);burgs()}finally{({g,VW,VH,dpr}=s);view=s.view;BURGPT=BP;pg.restore()}
 pg.setTransform(1,0,0,1,0,0);oct(105);pg.lineWidth=6;pg.strokeStyle='#101010';pg.stroke();oct(109);pg.lineWidth=3;pg.strokeStyle='#5a5a5a';pg.stroke()}
const RED=CORN.querySelector('.red'),red0=RED.onclick;RED.onclick=()=>{if(OV.hidden)return red0();const u=undo.pop();if(!u)return NOPE();u.f.cell=u.from;layout();save();list2();cards();draw()};

// ---- open and close
function size(){const r=VIEW.getBoundingClientRect();dpr=Math.min(2,devicePixelRatio||1);VW=r.width;VH=r.height;cv.width=VW*dpr;cv.height=VH*dpr}
function fitAll(){view.k=Math.min((VW-40)/(bx1-bx0+40),(VH-40)/(by1-by0+40));view.x=VW/2-BOXC[0]*view.k;view.y=VH/2-BOXC[1]*view.k}
function open(){sync();OV.hidden=false;ZR.hidden=false;for(const z of[ZT,ZC,ZS])z.style.display='none';CORN.classList.add('rg');setPlay(false);size();layout();
 const here=Object.keys(R.cm).find(c=>R.cm[c].includes(curMap));cell=here!=null?+here:cell;if(cell>=0){const[x,y]=cellXY(cell);view.k=2.8;view.x=VW/2-x*view.k;view.y=VH/2-y*view.k}else fitAll();
 list2();cards();draw();preview()}
function close(){SDL.hidden=true;sdc=-1;OV.hidden=true;ZR.hidden=true;for(const z of[ZT,ZC,ZS])z.style.display='';CORN.classList.remove('rg');TIP.style.display='none'}
new ResizeObserver(()=>{if(!OV.hidden){size();draw()}}).observe(VIEW);
document.fonts&&document.fonts.ready.then(()=>draw());

// ---- input: tokens pick and drag a force to another cell, stacks and towns open that place, cells pick themselves
const xy=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
let pan=null,dragF=null,moved=0,BLOCK=null;
// a force can't be sent into water, or into woods and high ground off the roads
function blocked(i){if(!BLOCK){const R0=new Set(D.burgs.map(b=>near([b.x,b.y])));for(const r of D.routes){if(r.g==='searoutes')continue;let h=-1;for(let k=0;k<r.pts.length-1;k++){const a=r.pts[k],b=r.pts[k+1];for(let t=0;t<8;t++){h=cellAt(a[0]+(b[0]-a[0])*t/8,a[1]+(b[1]-a[1])*t/8,h);R0.add(h)}}}
 BLOCK=D.cells.map((c,j)=>!land(c)||(c.f||c.h>=58)&&!R0.has(j))}return BLOCK[i]}
cv.addEventListener('pointerdown',e=>{const[x,y]=xy(e);moved=0;cv.setPointerCapture(e.pointerId);
 if(rtool==='paint'){const i=near(S2W(x,y));if(vis[i]<.5)return;painting=1;RB={g:e.button===2?'erase':rdT,cells:[i]};if(RB.g==='erase')eraseRoad(i);draw();return}
 if(rtool==='tile'){const er=e.button===2||rErase;if(tileW===1&&er)return;if(tileW===2&&wmode==='name'&&!pwat&&!er)return;tiling=er?-1:1;tileAt(x,y);return}
 const f=R.F.find(m=>m.R&&Math.hypot(x-m.X,y-m.Y)<m.R);if(f){if(e.button===2)return;dragF={f,x,y,mx:x,my:y,on:false};return}
 const G=GROUPS.find(G=>G.R&&x>=G.R[0]&&x<=G.R[2]&&y>=G.R[1]&&y<=G.R[3]);if(G&&e.button!==2){settle(G.cell);return}
 pan={x,y,vx:view.x,vy:view.y}});
cv.addEventListener('pointermove',e=>{const[x,y]=xy(e);
 if(painting){const i=near(S2W(x,y)),L=RB.cells;if(i!==L[L.length-1]&&vis[i]>=.5){if(RB.g==='erase'){L.push(i);eraseRoad(i)}else for(const j of linkCells(L[L.length-1],i))L.push(j)}draw();return}
 if(tiling){tileAt(x,y);return}
 if(dragF){moved+=Math.abs(e.movementX)+Math.abs(e.movementY);dragF.mx=x;dragF.my=y;if(moved>6)dragF.on=true;if(dragF.on){const h=near(S2W(x,y));hov=blocked(h)?-1:h;draw()}return}
 if(pan){moved+=Math.abs(e.movementX)+Math.abs(e.movementY);view.x=pan.vx+x-pan.x;view.y=pan.vy+y-pan.y;draw();return}
 const hf=R.F.find(m=>m.R&&Math.hypot(x-m.X,y-m.Y)<m.R),hg=!hf&&GROUPS.find(G=>G.R&&x>=G.R[0]&&x<=G.R[2]&&y>=G.R[1]&&y<=G.R[3]),ht=hf?hf.id:hg?stackOf(hg)[0].id:null;
 if(ht!==hovT){hovT=ht;cv.style.cursor=ht?'pointer':'';draw()}
 if(ht){const f=R.F.find(f=>f.id===ht);TIP.innerHTML=hg?`${placeOf(hg.cell)} <span>· ${disp(hg.nat)} ${stackOf(hg).reduce((a,f)=>a+soldiers(f),0)}</span>`:`${f.n} <span>· ${fallen(f)?(f.wreck?'Wreck':'Fallen'):f.t==='vehicle'?'Vehicle':f.t==='unit'?f.men[0].role:soldiers(f)+' men'}</span>`;TIP.style.display='block';if(hov!==-1){hov=-1;draw()}return}
 const i=near(S2W(x,y)),c=D.cells[i];if(vis[i]<.5){if(hov!==-1){hov=-1;draw()}TIP.style.display='none';return}if(i!==hov){hov=i;draw()}
 const here=R.F.filter(f=>f.cell===i&&soldiers(f)),nats=[...new Set(here.map(f=>f.nat))].map(n=>disp(n)+' '+here.filter(f=>f.nat===n).reduce((a,f)=>a+soldiers(f),0)).join(', ');
 const isl=land(c)&&Object.values(R.isl).find(o=>o.c.includes(i)),bio=land(c)?(isl?isl.n+' · ':'')+terrainOf(c):R.seas[R.wc[i]]?R.seas[R.wc[i]].n:c.h>=14?'Coastal waters':'Open sea',maps=(R.cm[i]||[]).length;
 TIP.innerHTML=`${placeOf(i)} <span>· ${bio}${ST[c.s]&&land(c)?' · '+ST[c.s].n:''}${nats?' · '+nats:''}${maps?' · '+maps+(maps>1?' maps':' map'):''}</span>`;TIP.style.display='block'});
cv.addEventListener('pointerup',e=>{const[x,y]=xy(e);
 if(painting){painting=0;if(RB.g!=='erase')addRoad(RB);RB=null;draw();return}
 if(tiling){tiling=0;save();draw();return}
 if(dragF){const d=dragF;dragF=null;if(d.on){const to=near(S2W(x,y));if(to!==d.f.cell&&vis[to]>.5&&!blocked(to))moveF(d.f,to);else draw()}else pick(d.f,false);return}
 if(pan&&moved<4){const i=near(S2W(x,y)),b=BURGPT.find(o=>o.rad&&Math.hypot(x-o.X,y-o.Y)<Math.max(9,o.rad+3));if(b)settle(near([b.b.x,b.b.y]));else if(vis[i]>.5){cell=i;rsel=null;selMan=null;list2();cards();preview();draw()}}pan=null});
cv.addEventListener('dblclick',e=>{const[x,y]=xy(e),i=near(S2W(x,y));if(vis[i]>.5&&!R.F.some(m=>m.R&&Math.hypot(x-m.X,y-m.Y)<m.R))settle(i)});
addEventListener('keydown',e=>{if(OV.hidden||e.target.closest&&e.target.closest('input,textarea'))return;const k=e.key.toLowerCase();
 if((k==='n'||k==='p')&&!e.ctrlKey&&!e.metaKey){e.stopImmediatePropagation();e.preventDefault();setTool(k==='n'?'tile':'paint');return}
 if(e.key!=='Escape')return;e.stopImmediatePropagation();e.preventDefault();if(!SDL.hidden)unsettle();else if(rtool!=='cmd')setTool('cmd');else if(rsel)unpick()},true);
cv.addEventListener('contextmenu',e=>{e.preventDefault();const[x,y]=xy(e),f=R.F.find(m=>m.R&&Math.hypot(x-m.X,y-m.Y)<m.R);if(f&&fallen(f)){const b=ubtn('Delete','red rgdel',()=>{b.remove();delF(f)});b.style.left=x+'px';b.style.top=y+'px';OV.append(b);setTimeout(()=>addEventListener('pointerdown',ev=>{if(ev.target!==b)b.remove()},{once:true}),0)}});
cv.addEventListener('pointerleave',()=>{hov=-1;hovT=null;TIP.style.display='none';draw()});
cv.addEventListener('wheel',e=>{e.preventDefault();const[x,y]=xy(e),f=Math.exp(-e.deltaY*.0015),[wx,wy]=S2W(x,y);view.k=Math.max(Math.min(.6,KFIT()*.9),Math.min(KMAX,view.k*f));view.x=x-wx*view.k;view.y=y-wy*view.k;draw()},{passive:false});
// moving a force out of a cell whose map holds its men asks first, then brings the living out as they are
function paintAt(x,y){const i=near(S2W(x,y));if(tileW===2){if(land(D.cells[i])||vis[i]<.5)return;const v=tiling>0?pwat:null;if((R.wc[i]||null)===v)return;if(v)R.wc[i]=v;else delete R.wc[i];SL=null;draw();return}if(!land(D.cells[i])||vis[i]<.5)return;const v=tiling>0?pnat:null;if(OWN[i]===v)return;OWN[i]=v;R.own[i]=v||'';LBL=null;BCH=null;draw()}
// ---- roads: drawn cell to cell over land, joining a road already in the end cell; erasing cuts the roads in a cell
function linkCells(a,b){const prev=new Map([[a,-1]]),Q=[a];for(let q=0;q<Q.length&&!prev.has(b);q++)for(const j of nb[Q[q]])if(!prev.has(j)&&land(D.cells[j])){prev.set(j,Q[q]);Q.push(j)}if(!prev.has(b))return[];const out=[];for(let c=b;c!==a;c=prev.get(c))out.unshift(c);return out}
const anchor=i=>{const b=D.burgs.find(o=>near([o.x,o.y])===i);if(b)return[b.x,b.y];for(const r of D.routes){if(r.g==='searoutes')continue;for(const p of r.pts)if(near(p)===i)return p.slice()}return CEN[i].slice()};
function roadsDone(){R.rt=D.routes;rvCalc();BLOCK=null;save()}
function addRoad(rb){const L=rb.cells.filter(i=>land(D.cells[i]));if(L.length<2)return;D.routes.push({g:rb.g,pts:L.map(anchor)});roadsDone()}
function eraseRoad(i){let hit=false;const out=[];for(const r of D.routes){if(r.g==='searoutes'){out.push(r);continue}let cur=[];const parts=[];for(const p of r.pts){if(near(p)===i){hit=true;if(cur.length>1)parts.push(cur);cur=[]}else cur.push(p)}if(cur.length>1)parts.push(cur);for(const P of parts)out.push({g:r.g,pts:P})}
 if(hit){D.routes.length=0;D.routes.push(...out);roadsDone()}}
function roadDraft(){if(!RB||RB.g==='erase'||RB.cells.length<2)return;const k=view.k;g.save();g.setTransform(dpr*k,0,0,dpr*k,dpr*view.x,dpr*view.y);line(RB.cells.map(anchor));g.setLineDash([3/k,3/k]);g.strokeStyle='rgba(52,36,22,.9)';g.lineWidth=(RB.g==='roads'?4:2.6)/k;g.stroke();g.restore()}
// ---- the flag editor: the nation's emblem on a 33-pixel grid inside its fixed black border; mirror paints both halves, right-click takes a colour
function embEdit(n){let px=embPx(n).slice(),col=px[16*33+16],mir=true,mirY=false,sz=1,down=0;const W2=mk('div','remb-ed'),S=12,hist=[];
 W2.innerHTML=`<div class="eh"><b>${disp(n)}</b><span class="hb"></span><button class="x">×</button></div><div class="eb"><canvas width="${33*S}" height="${33*S}"></canvas><div class="pal"></div></div><div class="ebf"><button class="rs">Library</button><span></span><button class="sv lite">Save</button></div>`;
 const c=W2.querySelector('canvas'),x=c.getContext('2d'),pal=W2.querySelector('.pal');
 const paint=()=>{x.clearRect(0,0,c.width,c.height);px.forEach((h,i)=>{x.fillStyle=h;x.fillRect((i%33)*S,(i/33|0)*S,S,S)});x.strokeStyle='rgba(255,255,255,.06)';for(let k=1;k<33;k++){x.beginPath();x.moveTo(k*S+.5,0);x.lineTo(k*S+.5,33*S);x.moveTo(0,k*S+.5);x.lineTo(33*S,k*S+.5);x.stroke()}};
 const pals=()=>{const L=[...new Set([...px.filter((h,i)=>{const a=i%33,b=i/33|0;return a&&b&&a<32&&b<32}),'#000000','#eee5cd',...NCOL])];pal.innerHTML=L.map(h=>`<button data-c="${h}" style="background:${h}" class="${h===col?'on':''}"></button>`).join('')};
 // the settlement map's buttons: brush size, undo, and a mirror each way
 const hb=W2.querySelector('.hb'),szB=ubtn('1×1','sq sz',()=>{sz=sz>1?1:2;szB.textContent=sz>1?'2×2':'1×1'}),un=ubtn('','sq',()=>{if(hist.length){px=hist.pop();paint();pals()}});un.title='Undo';un.append(uicon('undo'));
 const mx=ubtn('⇋','sq on',()=>{mir=!mir;mx.classList.toggle('on',mir)}),my=ubtn('⇅','sq',()=>{mirY=!mirY;my.classList.toggle('on',mirY)});hb.append(szB,un,mx,my);
 const dot=(a,b)=>{if(a<1||b<1||a>31||b>31)return;px[b*33+a]=col};
 const at=e=>{const r=c.getBoundingClientRect(),a=Math.floor((e.clientX-r.left)/r.width*33),b=Math.floor((e.clientY-r.top)/r.height*33);if(a<1||b<1||a>31||b>31)return;if(down===2){col=px[b*33+a];pals();return}
  for(let v=0;v<sz;v++)for(let u=0;u<sz;u++){const A=a+u,B=b+v;dot(A,B);if(mir)dot(32-A,B);if(mirY)dot(A,32-B);if(mir&&mirY)dot(32-A,32-B)}paint()};
 c.oncontextmenu=e=>e.preventDefault();c.onpointerdown=e=>{down=e.button===2?2:1;if(down===1){hist.push(px.slice());if(hist.length>60)hist.shift()}c.setPointerCapture(e.pointerId);at(e)};c.onpointermove=e=>{if(down===1)at(e)};c.onpointerup=()=>{down=0;pals()};
 W2.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();un.click()}});W2.tabIndex=-1;
 pal.onclick=e=>{const b=e.target.closest('button');if(b){col=b.dataset.c;pals()}};
 W2.querySelector('.x').onclick=()=>W2.remove();
 W2.querySelector('.rs').onclick=()=>{hist.push(px.slice());px=libEmb(n);paint();pals()};W2.querySelector('.sv').onclick=()=>{R.emb[n]=px;save();W2.remove();natBar();if(!SDL.hidden)drawSD()};
 OV.append(W2);W2.focus();paint();pals()}
function moveF(f,to){const go=()=>{if(inMap(f))withdraw(f);undo.push({f,from:f.cell});f.cell=to;rsel=f.id;cell=to;layout();save();list2();cards();draw()};
 if(!inMap(f)){go();return}const C=mk('div','rcard rask');C.append(mk('div',null,`Pull ${f.n} out of ${mapName((f.men.find(m=>m.map)||f).map)}?`));const r=mk('div','g2');r.append(ubtn('Pull out','lite',()=>{C.remove();go()}),ubtn('Stay','',()=>{C.remove();draw()}));C.append(r);CARDS.prepend(C)}


// ---- passages: an opening on a map's edge can lead to another map in the same cell, both ways, like the Aurum and the counting house
R.links=R.links||[];R.open=R.open||{};
// Emperor's Dock comes linked: stockyard south door to the yard, the yard's east side to the circuit
if(!R.linkSeed){R.linkSeed=1;R.links.push({a:'stock',ac:[13,15],ad:'s',b:'yard',bc:[22,1],bd:'n'},{a:'yard',ac:[42,14],ad:'e',b:'circuit',bc:[1,24],bd:'w'})}
const DIRW={w:'West',e:'East',n:'North',s:'South'},OPP={w:'e',e:'w',n:'s',s:'n'};
function openings(){const L=[],solid=(cx,cy)=>{const x=cx*T+T/2,y=cy*T+T/2;return sol[(y|0)*W+(x|0)]>0},run=(dir,cells)=>{let cur=[];for(const c of[...cells,null]){if(c&&!solid(c[0],c[1]))cur.push(c);else{if(cur.length)L.push({dir,cell:cur[cur.length>>1]});cur=[]}}};
 // a side walled all along by the map's own border is read one cell in
 const side=(dir,f)=>{for(const k of ENVSET[curMap]==='out'?[0,1]:[0]){const cells=Array.from({length:dir==='n'||dir==='s'?CW:CH},(_,i)=>f(i,k));if(cells.some(c=>!solid(c[0],c[1]))){run(dir,cells);return}}};
 side('n',(i,k)=>[i,k]);side('s',(i,k)=>[i,CH-1-k]);side('w',(i,k)=>[k,i]);side('e',(i,k)=>[CW-1-k,i]);return L}
const inward=(c,d)=>{const[x,y]=c;return d==='w'?[(x+1.5)*T,(y+.5)*T]:d==='e'?[(x-.5)*T,(y+.5)*T]:d==='n'?[(x+.5)*T,(y+1.5)*T]:[(x+.5)*T,(y-.5)*T]};
const labAt=(c,d,mw,mh)=>{const[x,y]=c;return d==='w'?[3,y*T-16]:d==='e'?[mw-96,y*T-16]:d==='n'?[x*T+T+4,3]:[x*T+T+4,mh-18]};
const sizeOf=id=>id===curMap?[W,H]:STATE[id]?[STATE[id].CW*T,STATE[id].CH*T]:(MAPSZ[id]||[18,14]).map(v=>v*T);
function pickOpen(id,want,except){const L=(R.open[id]||[]).filter(o=>!except.some(e=>e&&e[0]===o.cell[0]&&e[1]===o.cell[1]));return L.find(o=>o.dir===want)||L[0]||null}
function usedOn(id,skip){return R.links.filter(l=>l!==skip).map(l=>l.a===id?l.ac:l.b===id?l.bc:null)}
function applyLinks(){for(const k in EXITS)EXITS[k]=EXITS[k].filter(x=>!x.dyn);
 for(const l of R.links){if(!l.bc&&R.open[l.b]){const o=pickOpen(l.b,OPP[l.ad],usedOn(l.b,l));if(o){l.bc=o.cell;l.bd=o.dir}}
  for(const[m,c,d,to]of[[l.a,l.ac,l.ad,l.b],[l.b,l.bc,l.bd,l.a]]){const[mw,mh]=sizeOf(m),[lx,ly]=c?labAt(c,d,mw,mh):[0,0];(EXITS[m]||(EXITS[m]=[])).push(c?{dyn:1,dir:d,cell:c,to,arrive:inward(c,d),label:mapName(to),lx,ly}:{dyn:1,cell:null,to,arrive:null})}}
 save()}
function setLink(id,o,to){R.links=R.links.filter(l=>!(l.a===id&&l.ac[0]===o.cell[0]&&l.ac[1]===o.cell[1]||l.b===id&&l.bc&&l.bc[0]===o.cell[0]&&l.bc[1]===o.cell[1])&&!(to&&(l.a===id&&l.b===to||l.b===id&&l.a===to)));
 if(to)R.links.push({a:id,ac:o.cell,ad:o.dir,b:to,bc:null,bd:null});applyLinks();exitLabels()}
// men arriving through a passage whose far end was not yet known take the best opening there
{const a0=arrivals;arrivals=function(){a0();R.open[curMap]=openings();let ch=false;for(const b of bodies){if(!b.linkFrom)continue;const l=R.links.find(l=>l.a===b.linkFrom&&l.b===curMap||l.b===b.linkFrom&&l.a===curMap);delete b.linkFrom;if(!l)continue;
  if(l.b===curMap&&!l.bc){const o=pickOpen(curMap,OPP[l.ad],usedOn(curMap,l));if(o){l.bc=o.cell;l.bd=o.dir;ch=true}}const c=l.a===curMap?l.ac:l.bc,d=l.a===curMap?l.ad:l.bd;if(c){const[x,y]=inward(c,d);b.x=x;b.y=y;spot(b,x,y,0)}}
 if(ch){applyLinks();exitLabels()}}}
applyLinks();
// the side panel lists this map's openings when nothing is picked
const PSG=mk('div','psg');ZC.append(PSG);let psgK='';
function psg(){const c=Object.keys(R.cm).find(k=>R.cm[k].includes(curMap)),others=c!=null?R.cm[c].filter(x=>x!==curMap):[],show=!OV.hidden?false:sel.size===0&&others.length>0;PSG.classList.toggle('on',show);if(!show){psgK='';return}
 if(!R.open[curMap]||tick%120===0)R.open[curMap]=openings();const O=R.open[curMap],key=curMap+JSON.stringify(O)+JSON.stringify(R.links)+others.join();if(key===psgK)return;psgK=key;
 PSG.innerHTML='<div class="hlab">Passages</div>';const per={};for(const o of O){per[o.dir]=(per[o.dir]||0)+1}const idx={};
 for(const o of O){const l=R.links.find(l=>l.a===curMap&&l.ac[0]===o.cell[0]&&l.ac[1]===o.cell[1]||l.b===curMap&&l.bc&&l.bc[0]===o.cell[0]&&l.bc[1]===o.cell[1]),to=l?(l.a===curMap?l.b:l.a):'';idx[o.dir]=(idx[o.dir]||0)+1;
  const r=mk('div','prow'),s2=mk('select');s2.innerHTML=`<option value="">—</option>`+others.map(id=>`<option value="${id}"${id===to?' selected':''}>${mapName(id).split(' · ').pop()}</option>`).join('');s2.onchange=()=>{setLink(curMap,o,s2.value||null);psgK=''};
  r.append(mk('span',null,DIRW[o.dir]+(per[o.dir]>1?' '+idx[o.dir]:'')),s2);PSG.append(r)}}
setInterval(psg,400);
// ---- saved games carry the region with them
window.REGION={tile:t=>terTile(t),dbg:()=>({SL:seaLabels(),wc:R.wc,seas:R.seas,c:Object.keys(R.wc).map(k=>[+k,D.cells[k].h,D.cells[k].c,CEN[k]])}),ops:()=>openings(),zoomTo:(n,k)=>{const b=BURG[n];view.k=Math.min(KMAX,k);k=view.k;view.x=VW/2-b.x*k;view.y=VH/2-b.y*k;draw()},qa:n=>{const c=near([BURG[n].x,BURG[n].y]),fs=R.F.filter(f=>f.cell===c&&shown(f));let out=0,town=0;const B=W2S(BURG[n].x,BURG[n].y);for(const f of fs){if(f.SX==null)continue;const[x,y]=S2W(f.SX,f.SY);if(!inPoly(x,y,D.cells[c].p))out++;if(Math.hypot(f.SX-B[0],f.SY-B[1])<20)town++}return{n:fs.length,out,town}},settle:(n)=>settle(near([BURG[n].x,BURG[n].y])),R:()=>R,get:()=>{sync();return R},set:v=>{if(v&&v.v===1){R=migrate(v);R.links=R.links||[];R.open=R.open||{};applyLinks();save();layout();if(!OV.hidden){list2();cards();draw()}}},open,close,isOpen:()=>!OV.hidden};
})();
