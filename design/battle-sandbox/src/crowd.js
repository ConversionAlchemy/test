// Arena crowd: two raised rows of civilians outside the map wall, closed in by a back wall, drawn on their own canvas (no physics, AI or selection).
// Heads turn toward the nearest fighter, or between two close ones, rippling through the rows; a death makes nearby rows jump.
const CROWDSET={pits:'sparse'},CM=72,CROWS=2,CANG=32,CROFF=[24,41],CWALL=[52,62];
let CRW=null;
const ccv=document.createElement('canvas');ccv.style.cssText='position:absolute;image-rendering:pixelated;pointer-events:none';
{const st=$('stage'),v=st.parentElement;v.style.position='relative';v.insertBefore(ccv,st)}
// one look drawn at 32 facings through the normal token renderer, into a scratch buffer
function crowdLook(nat){const b=token('',nat,'civ',16,16,false,null);remove(b);if(b.lab)b.lab.remove();const fr=[];
 const o0=out,W0=W,H0=H,s0=sol;try{W=32;H=32;sol=new Uint8Array(1024);for(let i=0;i<CANG;i++){out=new Uint32Array(1024);b.x=b.y=16;b.ang=i/CANG*Math.PI*2;b.stuck=true;b.fogH=false;tokMat(b);drawBody(b,false);const px=[];for(let j=0;j<1024;j++)if(out[j])px.push([(j&31)-16,(j>>5)-16,out[j]]);fr.push(px)}}
 finally{out=o0;W=W0;H=H0;sol=s0}return fr}
function crowdBuild(){CRW=null;const mode=CROWDSET[curMap];if(!mode){ccv.style.display='none';return}ccv.style.display='';
 const nats=['Havenport','Havenport','Portsbridge','Great Keys','Goldbank','Reapers','Reapers'],looks=[];for(let i=0;i<18;i++)looks.push(crowdLook(nats[i%nats.length]));
 const fill=mode==='packed'?.92:.62,seats=[],gates=[];for(const d of bodies)if(d.type==='slab'&&!d.free&&(d.y<T||d.y>H-T||d.x<T||d.x>W-T))gates.push([d.x,d.y]);
 for(let r=0;r<CROWS;r++){const o=CROFF[r],add=(x,y)=>{if(gates.some(g=>Math.hypot(g[0]-x,g[1]-y)<28+r*16))return;if(Math.random()<fill-r*.06)seats.push({x:x+(Math.random()-.5)*3,y:y+(Math.random()-.5)*2,r,lk:Math.random()*looks.length|0,a:Math.random()*CANG,t:null,ph:Math.random()*8|0,jump:0})};
  for(let x=-o;x<=W+o;x+=17)add(x,-o),add(x,H+o);for(let y=-o+17;y<H+o;y+=17)add(-o,y),add(W+o,y)}
 seats.sort((a,b)=>b.r-a.r);CRW={looks,seats,dead:new Set(bodies.filter(b=>b.type==='token'&&b.status==='dead').map(b=>b.id)),n:0};crowdPlace();crowdDraw()}
function crowdPlace(){const st=$('stage');if(ccv.width!==W+2*CM||ccv.height!==H+2*CM){ccv.width=W+2*CM;ccv.height=H+2*CM}ccv.style.width=(W+2*CM)*S+'px';ccv.style.height=(H+2*CM)*S+'px';ccv.style.left=(st.offsetLeft-CM*S)+'px';ccv.style.top=(st.offsetTop-CM*S)+'px'}
function crowdTick(){if(!CRW)return;CRW.n++;const fs=bodies.filter(b=>b.type==='token'&&b.status!=='dead');
 for(const b of bodies)if(b.type==='token'&&b.status==='dead'&&!CRW.dead.has(b.id)){CRW.dead.add(b.id);for(const s of CRW.seats)if(Math.hypot(s.x-b.x,s.y-b.y)<170)s.jump=6+(Math.random()*4|0)}
 for(const s of CRW.seats){if(s.jump>0)s.jump--;
  if((CRW.n+s.ph)%8===0&&fs.length){const near=fs.map(f=>[Math.hypot(f.x-s.x,f.y-s.y),f]).sort((a,b)=>a[0]-b[0]);let tx=near[0][1].x,ty=near[0][1].y;
   if(near[1]&&near[1][0]-near[0][0]<60){tx=(tx+near[1][1].x)/2;ty=(ty+near[1][1].y)/2}s.t=((Math.atan2(ty-s.y,tx-s.x)/(Math.PI*2)*CANG)%CANG+CANG)%CANG}
  if(s.t!=null){let d=s.t-s.a;d=((d+CANG/2)%CANG+CANG)%CANG-CANG/2;s.a=(s.a+Math.max(-.35,Math.min(.35,d*.18))+CANG)%CANG}}
 if(CRW.n%2===0)crowdDraw()}
function crowdDraw(){const w=ccv.width,h=ccv.height,g=ccv.getContext('2d'),im=g.createImageData(w,h),o=new Uint32Array(im.data.buffer);
 const dist=(X,Y)=>{const x=X-CM,y=Y-CM;return Math.max(-x,x-W+1,-y,y-H+1)};
 for(let Y=0;Y<h;Y++)for(let X=0;X<w;X++){const d=dist(X,Y);if(d<=0)continue;const hs=((X*73856093^Y*19349663)>>>0)%7;
  // the wall's top edge falls off softly into the dark rather than ending at a hard black line
  if(d<14){o[Y*w+X]=mul(rgb(44,40,36),Math.pow(1-d/14,1.6)*(hs?1:.8));continue}
  if(d>=CWALL[0]&&d<CWALL[1]){const e=d-CWALL[0],c=e<2?rgb(70,66,60):rgb(52,49,45);o[Y*w+X]=mul(c,(hs>4?.82:1)*(e<2?.95:.6))}}
 for(const s of CRW.seats){const f=(s.r?.24:.4)*(s.jump?1.35:1),fr=CRW.looks[s.lk][Math.round(s.a)%CANG],bx=Math.round(s.x)+CM,by=Math.round(s.y)+CM-(s.jump>2?2:0);
  for(const p of fr){const X=bx+p[0]+3,Y=by+p[1]+4;if(X>=0&&Y>=0&&X<w&&Y<h)o[Y*w+X]=mul(o[Y*w+X]||rgb(8,8,8),.35)}
  for(const p of fr){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<w&&Y<h)o[Y*w+X]=mul(p[2],f)}}
 for(let Y=CM;Y<CM+H;Y++)o.fill(0,Y*w+CM,Y*w+CM+W);
 g.putImageData(im,0,0)}
{const r0=reset;reset=function(){r0();setTimeout(crowdBuild,0)}}
{const a0=applyCam;applyCam=function(){a0();if(CRW)crowdPlace()}}
{const u0=update;update=function(){u0();crowdTick()}}
