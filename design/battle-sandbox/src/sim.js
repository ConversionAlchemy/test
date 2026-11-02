(()=>{
const $=id=>document.getElementById(id);
let S=2;let CW=18,CH=14,W=CW*T,H=CH*T,BW=W/2,BH=H/2,N=W*H,NB=BW*BH;
const cv=$('sb');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');let img=ctx.createImageData(W,H);let out=new Uint32Array(img.data.buffer);
let SH=new Uint8Array(N),GOLD=new Uint8Array(N),floor=new Uint32Array(N),sol=new Uint8Array(N),shp=new Uint8Array(N),scol=new Uint32Array(N),crk=new Uint8Array(N),slabG=new Int32Array(N),GT=new Uint8Array(N),SHN=new Uint8Array(N),DS=new Uint8Array(N),NOD=new Uint8Array(N),OBJ=new Uint8Array(N),OBJC=new Uint32Array(N);
const FX={blood:new Float32Array(NB),fire:new Float32Array(NB),smoke:new Float32Array(NB)};
let TF=new Float32Array(NB),SF=new Float32Array(NB),SS=new Float32Array(NB),ST=new Float32Array(NB),BURN=new Float32Array(NB),FV=new Float32Array(NB),SV=new Float32Array(NB),DV=new Float32Array(NB),TMP=new Float32Array(NB);
let WH=new Float32Array(N);let whOn=false;
let fxLow=new Uint32Array(N),fxTop=new Uint32Array(N),fxA=new Uint8Array(N),HZ=new Float32Array(NB),OPEN=new Uint8Array(NB);let hzOn=false;let fxDirty=true;
function alloc(cw,ch){CW=cw;CH=ch;W=CW*T;H=CH*T;BW=W/2;BH=H/2;N=W*H;NB=BW*BH;cv.width=W;cv.height=H;img=ctx.createImageData(W,H);out=new Uint32Array(img.data.buffer);
 SH=new Uint8Array(N);solDirty=true;GOLD=new Uint8Array(N);floor=new Uint32Array(N);sol=new Uint8Array(N);shp=new Uint8Array(N);scol=new Uint32Array(N);crk=new Uint8Array(N);slabG=new Int32Array(N);GT=new Uint8Array(N);SHN=new Uint8Array(N);DS=new Uint8Array(N);NOD=new Uint8Array(N);OBJ=new Uint8Array(N);OBJC=new Uint32Array(N);
 for(const k in FX)FX[k]=new Float32Array(NB);TF=new Float32Array(NB);SF=new Float32Array(NB);SS=new Float32Array(NB);ST=new Float32Array(NB);BURN=new Float32Array(NB);FV=new Float32Array(NB);SV=new Float32Array(NB);DV=new Float32Array(NB);TMP=new Float32Array(NB);
 WH=new Float32Array(N);fxLow=new Uint32Array(N);fxTop=new Uint32Array(N);fxA=new Uint8Array(N);HZ=new Float32Array(NB);OPEN=new Uint8Array(NB)}
const rgb=(r,g,b)=>((255<<24)|(b<<16)|(g<<8)|r)>>>0;
const cl=v=>v<0?0:v>255?255:v|0;
const mul=(c,k)=>rgb(cl((c&255)*k),cl((c>>8&255)*k),cl((c>>16&255)*k));
const mix=(a,b,t)=>rgb(cl((a&255)+((b&255)-(a&255))*t),cl((a>>8&255)+((b>>8&255)-(a>>8&255))*t),cl((a>>16&255)+((b>>16&255)-(a>>16&255))*t));
const grey=c=>{const l=cl(((c&255)*.3+(c>>8&255)*.59+(c>>16&255)*.11)*.9);return rgb(l,l,l)};
const hx=s=>rgb(parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16));
const css=c=>`rgb(${c&255},${c>>8&255},${c>>16&255})`;
const K=(x,y)=>(x+512)*1024+(y+512);
const MAT={1:{hp:3,f:.6,weld:.05},2:{hp:2,f:.82,weld:.45},3:{hp:6,f:.42,weld:.14},0:{weld:.3}};

// sound
let gest=false,MS=null,AC=null,mute=false,RV=null;const last={};
const au=()=>{if(AC){if(AC.state==='suspended')AC.resume();return AC}AC=new (window.AudioContext||window.webkitAudioContext)();MS=AC.createDynamicsCompressor();MS.threshold.value=-16;MS.knee.value=12;MS.ratio.value=6;MS.attack.value=.003;MS.release.value=.2;{const mg=AC.createGain();mg.gain.value=.85;MS.connect(mg).connect(AC.destination)}const a=AC,len=a.sampleRate*.5|0,b=a.createBuffer(2,len,a.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2)*Math.min(1,i/(a.sampleRate*.01))*.6}RV=a.createConvolver();RV.buffer=b;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;lp.Q.value=.5;RV.connect(lp).connect(MS);return AC};
function noise(dur,f,q,vol,type,wet){const a=au(),len=Math.max(1,a.sampleRate*dur|0),n=a.createBuffer(1,len,a.sampleRate),d=n.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);const s=a.createBufferSource();s.buffer=n;const fl=a.createBiquadFilter();fl.type=type||'lowpass';fl.frequency.value=f;fl.Q.value=q;const g=a.createGain();g.gain.value=vol;s.connect(fl).connect(g).connect(MS);if(wet){const w=a.createGain();w.gain.value=wet;g.connect(w).connect(RV)}s.start()}
function tone(f,dur,vol){const a=au(),o=a.createOscillator(),g=a.createGain();o.frequency.value=f;g.gain.setValueAtTime(vol,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+dur);o.connect(g).connect(MS);o.start();o.stop(a.currentTime+dur)}
const SFX={boltmetal:()=>{noise(.05,7000,.7,.55,'highpass',.3);tone(2350,.32,.07);tone(3170,.24,.05);tone(1180,.4,.05);noise(.14,420,1,.45,'lowpass')},rodshot:()=>{noise(.32,260,.6,1,'lowpass',.45);noise(.05,5200,.6,.35,'highpass',.3);tone(760,.14,.1)},hiss:()=>noise(.3,5600,.7,.22,'highpass',.3),thunk:()=>noise(.14,520,1,.6),crack:()=>noise(.07,2600,.8,.3,'highpass'),boom:()=>noise(.8,160,.7,1),bigboom:()=>{noise(1.7,110,.6,1.5,'lowpass',.6);noise(.5,900,.5,.6,'bandpass',.4);noise(.12,3500,.5,.4,'highpass');setTimeout(()=>noise(.7,2400,.4,.16,'bandpass'),200)},clink:()=>tone(1900,.09,.12),whoosh:()=>noise(.16,900,.7,.14,'bandpass'),tick:()=>noise(.02,3200,1,.07,'highpass'),flick:()=>noise(.03,1700,2,.18,'bandpass'),crash:()=>noise(.35,1300,.5,.45,'bandpass'),squish:()=>noise(.12,320,4,.4,'bandpass'),shot:()=>{noise(.45,600,.4,1,'lowpass',.4);noise(.08,3000,.5,.3,'highpass',.4)},pshot:()=>{noise(.28,900,.4,.75,'lowpass',.34);noise(.06,3600,.5,.3,'highpass',.34)},step:()=>noise(.05,380,1,.22),chink:()=>{noise(.04,6200,4,.1,'bandpass');tone(2700,.05,.025)},pin:()=>{tone(2300,.05,.1);noise(.02,4000,1,.1,'highpass')},twang:()=>{tone(170,.18,.16);noise(.05,2200,1,.15,'bandpass')},sizzle:()=>noise(.09,5200,.7,.05,'highpass'),door:()=>noise(.14,300,2,.4,'bandpass'),slash:()=>noise(.12,2400,.8,.28,'bandpass'),drop:()=>{noise(.35,140,1,.9);noise(.1,900,1,.3,'bandpass')},lock:()=>{tone(1200,.05,.1);noise(.03,3000,1,.12,'highpass')},dust:()=>noise(.1,1800,.6,.12,'bandpass'),arcshot:()=>{const a=au(),t=a.currentTime,o=a.createOscillator(),g=a.createGain(),f=a.createBiquadFilter(),l=a.createOscillator(),lg=a.createGain();o.type='square';o.frequency.setValueAtTime(1500,t);o.frequency.exponentialRampToValueAtTime(80,t+.5);f.type='bandpass';f.frequency.setValueAtTime(2600,t);f.frequency.exponentialRampToValueAtTime(260,t+.5);f.Q.value=3;g.gain.setValueAtTime(.4,t);g.gain.exponentialRampToValueAtTime(.001,t+.55);l.frequency.value=36;lg.gain.value=320;l.connect(lg).connect(o.frequency);o.connect(f).connect(g).connect(MS);const w=a.createGain();w.gain.value=.5;g.connect(w).connect(RV);o.start(t);l.start(t);o.stop(t+.58);l.stop(t+.58);noise(.6,170,.6,1,'lowpass',.5);noise(.35,6000,.6,.3,'highpass')},zap:()=>{noise(.08,5000,1,.3,'highpass');tone(900,.08,.08)},sblast:()=>{noise(.5,300,.6,.9,'lowpass',.4);noise(.2,3200,.5,.45,'highpass');const a=au(),t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='sawtooth';o.frequency.setValueAtTime(2400,t);o.frequency.exponentialRampToValueAtTime(60,t+.45);g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g).connect(MS);const w=a.createGain();w.gain.value=.5;g.connect(w).connect(RV);o.start(t);o.stop(t+.52);noise(.12,6000,.8,.4,'highpass',.3)},surge:()=>{noise(1.1,120,.7,1.1,'lowpass',.5);noise(.35,2600,.5,.3,'highpass',.3);noise(.12,6000,.8,.25,'highpass')},reload:()=>{noise(.05,2600,2,.3,'bandpass');setTimeout(()=>{noise(.04,1800,3,.35,'bandpass');tone(900,.04,.05)},140)},dry:()=>{noise(.014,1800,5,.4,'bandpass');noise(.03,700,3,.3,'bandpass');setTimeout(()=>noise(.02,2600,6,.22,'bandpass'),55)},rico:()=>{const a=au(),t=a.currentTime,len=a.sampleRate*.34|0,buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.6);const src=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();src.buffer=buf;f.type='bandpass';f.Q.value=9;f.frequency.setValueAtTime(3000+Math.random()*900,t);f.frequency.exponentialRampToValueAtTime(900,t+.3);g.gain.value=.55;src.connect(f).connect(g).connect(MS);const w=a.createGain();w.gain.value=.25;g.connect(w).connect(RV);src.start(t);noise(.025,4200,1,.3,'highpass')},
ricos:()=>{noise(.05,2400,1.2,.4,'bandpass',.2);noise(.14,800,.9,.28,'bandpass',.2);setTimeout(()=>noise(.05,1500,1.5,.12,'bandpass'),40)}};
function sfx(k){if(mute||!gest)return;const t=performance.now();if(last[k]&&t-last[k]<(k==='sizzle'?70:45))return;last[k]=t;try{SFX[k]()}catch(e){}}
for(const ev of ['pointerdown','keydown','touchstart'])window.addEventListener(ev,()=>{gest=true;try{au()}catch(e){}},{capture:true});
$('snd').onclick=()=>{mute=!mute;$('snd').style.opacity=mute?.35:1;if(!mute)sfx('clink')}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&AC&&AC.state!=='running')AC.resume()});;

// map
let map=[];
function tilePix(key,cx,cy){if(TEX[key]){const d=new Uint8ClampedArray(T*T*4);for(let y=0;y<T;y++)for(let x=0;x<T;x++){const c=TEX[key](cx*T+x,cy*T+y,cx,cy),i=(y*T+x)*4;d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255}return d}const c=document.createElement('canvas');c.width=c.height=T;const g=c.getContext('2d');
 g.drawImage(tile(key,KIND[key]==='wall'?'11111111':'00000000',cx,cy),0,0);
 const d=g.getImageData(0,0,T,T).data,k=key==='stone'?.84:KIND[key]==='wall'?.64:key==='seat'||key==='carpet'?.25:key==='gfloor'?.15:key==='table'?.3:key==='sky'?.05:.42,lift=key==='stone'?1.3:key==='pillar'?1.05:1;let r=0,gg=0,b=0;
 for(let i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2]}r/=T*T;gg/=T*T;b/=T*T;
 for(let i=0;i<d.length;i+=4){d[i]=cl((d[i]+(r-d[i])*k)*lift);d[i+1]=cl((d[i+1]+(gg-d[i+1])*k)*lift);d[i+2]=cl((d[i+2]+(b-d[i+2])*k)*lift)}return d}
const WMAT={mpanel:3,bush:2,stone:1,gstone:1,pillar:1,berm:1,rail:2,wood:2,dwood:2,metal:3,mplate:3,iron:3,brass:3};
const SHINE={omarble:28,mpanel:70,metal:70,mplate:70,iron:45,brass:80,mfloor:50,marble:28,dmarble:28,gfloor:80,gstone:20,pillar:28,msill:28,shelf:80};
function paintCell(cx,cy,key){if(cx<0||cy<0||cx>=CW||cy>=CH)return;map[cy][cx]=key;const half=key.length>1&&key.endsWith('H')&&WMAT[key.slice(0,-1)],bk=half?key.slice(0,-1):key,d=tilePix(bk,cx,cy),g=half?tilePix('dirt',cx,cy):null,m=WMAT[bk]||0,gk=bk==='gstone'?1:0;
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const i=(y*T+x)*4,X=cx*T+x,Y=cy*T+y,j=Y*W+X,hf=half&&x>=T/2,c=hf?rgb(g[i],g[i+1],g[i+2]):rgb(d[i],d[i+1],d[i+2]);crk[j]=0;SHN[j]=hf?0:SHINE[bk]||0;NOD[j]=bk==='bush'?1:0;
  GOLD[j]=gk&&hh(X,Y,61)>.985?2:gk;if(m&&!hf){sol[j]=m;solDirty=true;shp[j]=MAT[m].hp;scol[j]=c;floor[j]=mul(c,.42)}else{sol[j]=0;solDirty=true;floor[j]=c}}}
let curMap='bank';
function build(){(curMap==='docks'?buildDocks:curMap==='tavern'?buildTavern:curMap==='sewer'?buildSewer:curMap==='vault'?buildVault:curMap==='count'?buildCount:curMap==='range'?buildRange:curMap==='air'?buildAir:buildBank)();blendGround();objects();borders();regions()}
// grass and soil meet in a soft worn edge; GT marks which ground each pixel shows
// rugs get a border, tables and desks an edge and an inlay line
function regions(){for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const ok=OM[cy]&&OM[cy][cx],k=ok||map[cy][cx];if(k!=='carpet'&&!ok)continue;const L=ok?OM:map,o=(x,y)=>!L[y]||L[y][x]!==k&&!(k==='carpet'&&OM[y]&&OM[y][x]);
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.min(o(cx-1,cy)?x:99,o(cx+1,cy)?T-1-x:99,o(cx,cy-1)?y:99,o(cx,cy+1)?T-1-y:99),j=(cy*T+y)*W+cx*T+x;let c=floor[j];
  if(k==='carpet'){if(d===0)c=mul(c,.6);else if(d<=3)c=mix(mul(c,.9),rgb(150,104,60),(x+y)%3?.5:.62);else if(d===4)c=mul(c,.72)}
  if(ok){c=OBJC[j];if(d===0)c=mul(c,.5);else if(d===1)c=mul(c,x===0||y===0||o(cx-1,cy)&&x===1||o(cx,cy-1)&&y===1?1.12:.82);else if(d===3&&k==='desk')c=mix(c,rgb(210,168,100),.4);else if(d===3&&k==='table')c=mix(c,rgb(176,126,84),.25);OBJC[j]=c}else floor[j]=c}}
 if(curMap==='vault')inlays()}
// every laid surface gets a soft edge where it meets a different one
const NOB=new Set(['grass','dirt','sky','bush','carpet','sill','msill']);
function borders(){for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=map[cy][cx];if(!TEX[k]||NOB.has(k)||OM[cy]&&OM[cy][cx])continue;const o=(x,y)=>map[y]&&map[y][x]!==undefined&&map[y][x]!==k;
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.min(o(cx-1,cy)?x:99,o(cx+1,cy)?T-1-x:99,o(cx,cy-1)?y:99,o(cx,cy+1)?T-1-y:99);if(d>(WMAT[k]===3?2:1))continue;const j=(cy*T+y)*W+cx*T+x,mt=WMAT[k]===3,f=mt?[.7,1.3,.88][d]:d===0?.84:1.05;if(sol[j])scol[j]=mul(scol[j],f);else floor[j]=mul(floor[j],f)}}}
// furniture and fixtures: above the floor, block walking, bullets pass over, blasts break them
const OBJK=new Set(['table','desk','seat','shelf','chest','rack']),ONAME={table:'Table',desk:'Desk',seat:'Chair',shelf:'Vault shelf',chest:'Chest',rack:'Rack'};let OM=[];
function objects(){OM=Array.from({length:CH},()=>Array(CW).fill(null));OBJ.fill(0);const cells=[];for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)if(OBJK.has(map[cy][cx])){OM[cy][cx]=map[cy][cx];cells.push([cx,cy])}
 for(const[cx,cy]of cells){let u=null;for(const d of [2,1,3,4])for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){if(u)break;const k=(map[cy+b*d]||[])[cx+a*d];if(k&&!OBJK.has(k)&&!WMAT[k]&&!(k.endsWith('H')&&WMAT[k.slice(0,-1)])&&k!=='sky')u=k}const k=OM[cy][cx];paintCell(cx,cy,u||'flag');
  for(let y=0;y<T;y++)for(let x=0;x<T;x++){const X=cx*T+x,Y=cy*T+y,j=Y*W+X,c=TEX[k](X,Y,cx,cy);OBJ[j]=1;OBJC[j]=rgb(cl(c[0]),cl(c[1]),cl(c[2]));SHN[j]=SHINE[k]||0}}}
function inlays(){const ring=(X0,Y0,R)=>{for(let Y=Y0-R-2;Y<=Y0+R+2;Y++)for(let X=X0-R-2;X<=X0+R+2;X++){const j=Y*W+X;if(sol[j]||OBJ[j])continue;const dx=X-X0+.5,dy=Y-Y0+.5,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx),st=R*.42+R*.36*Math.pow(Math.abs(Math.cos(4*a)),3),gm=(c,t)=>mix(c,rgb(214,176,96),t),dm=()=>{const c=TEX.dmarble(X,Y);return rgb(cl(c[0]),cl(c[1]),cl(c[2]))};
  let c=null;if(r<4)c=gm(floor[j],.85);else if(Math.abs(r-st)<.8)c=gm(floor[j],.7);else if(r<st)c=r<st*.55?floor[j]:dm();else if(Math.abs(r-R*.82)<.7||Math.abs(r-R)<.7)c=gm(floor[j],.7);else if(r>R*.82&&r<R)c=dm();if(c!==null){floor[j]=c;SHN[j]=c===floor[j]?SHN[j]:40}}};
 ring(240,408,40)}
function container(cx,cy,items,name){const k=OM[cy]&&OM[cy][cx];if(!k)return null;const cells=[],seen=new Set([cy*CW+cx]),q=[[cx,cy]];while(q.length){const[a,b]=q.pop();cells.push([a,b]);for(const[da,db]of[[1,0],[-1,0],[0,1],[0,-1]]){const na=a+da,nb=b+db;if(OM[nb]&&OM[nb][na]===k&&!seen.has(nb*CW+na)){seen.add(nb*CW+na);q.push([na,nb])}}}
 const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]),box=[Math.min(...xs)*T,Math.min(...ys)*T,(Math.max(...xs)+1)*T-1,(Math.max(...ys)+1)*T-1],c=weapon('crate',(box[0]+box[2])/2,(box[1]+box[3])/2,0);
 c.px=[];mkSet(c);c.hidden=true;c.mass=1e9;c.name=name||ONAME[k];c.inv=items.map(i=>({...i}));c.cells=cells;c.box=box;c.n0=cells.length*T*T;c.metal=k==='shelf';return c}
const containerAt=(X,Y)=>{const cx=X/T|0,cy=Y/T|0;if(!OBJ[Y*W+X])return null;return bodies.find(o=>o.hidden&&o.cells.some(c=>c[0]===cx&&c[1]===cy))||null};
function wreck(x,y,s){const R=10*s;let hit=false;for(let Y=Math.floor(y-R);Y<=y+R;Y++)for(let X=Math.floor(x-R);X<=x+R;X++){if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(!OBJ[j])continue;const q=Math.hypot(X-x,Y-y)/R*(.8+.4*hh(X,Y,88));if(q>=1)continue;OBJ[j]=0;SHN[j]=0;hit=true;if(hh(X,Y,89)<.55)floor[j]=mix(floor[j],mul(OBJC[j],.45),.7)}
 if(!hit)return;for(const c of bodies.filter(o=>o.hidden)){let n=0;for(const[a,b]of c.cells)for(let yy=0;yy<T;yy++)for(let xx=0;xx<T;xx++)n+=OBJ[(b*T+yy)*W+a*T+xx];if(n>=c.n0*.7)continue;
  for(const it of c.inv){if(!it)continue;for(let i=0;i<Math.min(6,it.k==='gold'?1:it.n||1);i++){const a=Math.random()*6.283,w=weapon(it.k,c.x+Math.cos(a)*6,c.y+Math.sin(a)*6,a);if(it.k==='gold')w.amt=it.n;if(CAP[it.k]){w.ammo=it.ammo??CAP[it.k];w.res=it.res||0}w.vx=Math.cos(a)*2;w.vy=Math.sin(a)*2}}remove(c);if(openCrate===c)openCrate=null}}
// doorways get a threshold stone under the leaf
function sills(){for(const d of bodies){if(d.type!=='slab'||d.free)continue;const cs=new Set(),bx=Math.round(d.x),by=Math.round(d.y);for(const p of d.px)cs.add(((by+p[1])/T|0)*CW+((bx+p[0])/T|0));
 for(const k of cs){const cx=k%CW,cy=k/CW|0,key=map[cy]&&map[cy][cx];if(!key||WMAT[key]||key==='sky'||key==='dirt'||key==='grass'||key==='sill'||key==='msill')continue;const m=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>/marble/.test((map[cy+b]||[])[cx+a]||''));paintCell(cx,cy,m?'msill':'sill')}}}
// doors sit centred in the wall line and meet the wall ends
function snapDoors(){for(const d of bodies){if(d.type!=='slab'||d.free)continue;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const bx=Math.round(d.x),by=Math.round(d.y);for(const p of d.px){x0=Math.min(x0,bx+p[0]);x1=Math.max(x1,bx+p[0]);y0=Math.min(y0,by+p[1]);y1=Math.max(y1,by+p[1])}
 let sx,sy;if(x1-x0>y1-y0){sx=Math.round(x0/T)*T-x0;sy=Math.floor((y0+y1)/2/T)*T+T/2-(d.th||8)/2-y0}else{sy=Math.round(y0/T)*T-y0;sx=Math.floor((x0+x1)/2/T)*T+T/2-(d.th||8)/2-x0}d.x=bx+sx;d.y=by+sy;orient(d)}}
function blendGround(){GT.fill(0);let any=false;for(const r of map)for(const k of r)if(k==='grass'){any=true;break}if(!any)return;
 const R=6,ind=new Float32Array(N),tmp=new Float32Array(N);for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const k=map[Y/T|0][X/T|0];ind[Y*W+X]=k==='grass'?1:k==='dirt'||k.endsWith('H')?0:.5}
 for(let Y=0;Y<H;Y++){let a=0;for(let X=-R;X<W;X++){if(X+R<W)a+=ind[Y*W+X+R];if(X-R-1>=0)a-=ind[Y*W+X-R-1];if(X>=0)tmp[Y*W+X]=a}}
 for(let X=0;X<W;X++){let a=0;for(let Y=-R;Y<H;Y++){if(Y+R<H)a+=tmp[(Y+R)*W+X];if(Y-R-1>=0)a-=tmp[(Y-R-1)*W+X];if(Y>=0)ind[Y*W+X]=a/((2*R+1)*(2*R+1))}}
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const j=Y*W+X,k=map[Y/T|0][X/T|0];if(sol[j]||k!=='grass'&&k!=='dirt'&&!(k.endsWith('H')&&X%T>=T/2))continue;
  const v=ind[j]+(fbm(X/7,Y/7,90)-.5)*.5+(hh(X,Y,91)-.5)*.1,g=v>.5;let c=g?grassT(X,Y):soilT(X,Y);if(g&&v<.62&&hh(X,Y,92)>(v-.5)/.12)c=mx(GDRY,soilT(X,Y),.5);
  floor[j]=rgb(cl(c[0]),cl(c[1]),cl(c[2]));GT[j]=g?1:2}}
// blasts on open ground tear up grass, dig a soft crater and throw soil round it
function crater(x,y,s){const r=6.5*s,rr=s>1.5?.72:.4;for(let Y=Math.floor(y-r*2);Y<=y+r*2;Y++)for(let X=Math.floor(x-r*2);X<=x+r*2;X++){if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(sol[j])continue;
  const dx=X-x,dy=Y-y,e=r*(.78+.44*fbm(X/4,Y/4,93)),q=Math.hypot(dx,dy)/e;if(q>=2)continue;
  if(GT[j]!==1&&GT[j]!==2){const mk=map[Y/T|0][X/T|0];if(mk==='sky')continue;if(q<rr){const f=curMap==='air'?woodT(X,Y,WOOD.walnut,4):foundT(X,Y),k=GT[j]===3?.9:1;floor[j]=GT[j]===3?mul(floor[j],k):rgb(cl(f[0]),cl(f[1]),cl(f[2]));GT[j]=3;SHN[j]=0}else if(q<rr*1.6&&GT[j]!==3&&Math.abs(vn(X/2.5,Y/2.5,95)-.5)<.07)floor[j]=mul(floor[j],.72);continue}const so=soilT(X,Y);let c=null;
  if(q<1){const lit=(-dx*.6-dy*.8)/e;const k=(.6+.32*q)*(1-lit*.16*(1-q))*(q<.45?.85:1);c=sc(so,k*(GT[j]===2?.92:1))}
  else if(q<1.35){if(hh(X,Y,94)<(1.35-q)/.35*1.3)c=sc(so,1.02+hh(X,Y,95)*.08)}
  else if(hh(X,Y,96)<(2-q)*.22)c=sc(so,.8+hh(X,Y,97)*.2);
  if(!c)continue;const n=rgb(cl(c[0]),cl(c[1]),cl(c[2])),o=floor[j],lum=v=>(v&255)+(v>>8&255)+(v>>16&255);floor[j]=GT[j]===2&&q<1&&lum(o)<lum(n)?o:n;GT[j]=2}}
function buildCount(){map=Array.from({length:CH},()=>Array(CW).fill('gstone'));
 const F=(cx,cy)=>{if(cy===12)return 'flag';if(cy===13)return 'stone';if(cy===11)return cx===8||cx===9||cx===1?'marble':'gstone';
  if(cx>=3&&cx<=14&&cy>=3&&cy<=10)return cx>=7&&cx<=10&&(cy===6||cy===7)?'desk':cx>=4&&cx<=13&&cy>=4&&cy<=9?'carpet':'marble';if(cx===2&&cy===6)return 'marble';if(cx===1&&cy>=2&&cy<=10)return 'marble';return 'gstone'};
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)paintCell(cx,cy,F(cx,cy));
 for(const a of [...Object.values(FX),TF,SF,SS,ST,BURN])a.fill(0);WH.fill(0);fxDirty=true}
// proving yard: unit lane, long lane, eight material lanes, a texture yard and a grenade field
const RLANE=['stone','stoneH','stone2','wood','woodH','metal','metalH','door'];
function buildRange(){map=Array.from({length:CH},()=>Array(CW).fill('grass'));
 const soil=(cx,cy)=>{const dx=(cx-33.5)/4.2,dy=(cy-26)/6.5;return dx*dx+dy*dy+(hh(cx,cy,98)-.5)*.35<1};
 const Y0=['flag','planks','pplanks','dplanks','mfloor','marble','dmarble','omarble'],W0=['stone','wood','dwood','metal','mplate','mpanel','iron','brass'],W1=['gstone','rail','metalH','mplateH','woodH','stoneH'];
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){let k='grass';if(cx>=2&&cx<=4&&cy>=1&&cy<=CH-2)k='dirt';
  if(cy>=1&&cy<=8){if(cx>=2&&cx<14)k='dirt';if(cx===14||cx===15)k='berm'}
  if(cy>=10&&cy<=11){if(cx>=2&&cx<37)k='dirt';if(cx===37||cx===38)k='berm'}
  for(let i=0;i<RLANE.length;i++){const a=13+i*3;if(cy<a||cy>a+1)continue;if(cx>=2&&cx<20)k='dirt';if(cx===20||cx===21)k='berm';const t=RLANE[i];
   if(cx===11&&t!=='door')k=t==='stone2'?'stone':t;if(cx===12&&t==='stone2')k='stone'}
  const yi=Math.floor((cx-17)/3),yo=(cx-17)%3<2&&cx>=17;if(yo&&cy>=1&&cy<=2&&Y0[yi])k=Y0[yi];if(yo&&cy>=4&&cy<=5&&W0[yi])k=W0[yi];if(yo&&cy>=7&&cy<=8&&W1[yi])k=W1[yi];
  if(cx>=24&&cx<=38&&cy>=13&&cy<=CH-2&&soil(cx,cy))k='dirt';if(cx===5&&(cy===8||cy===18||cy===21||cy===24))k=cy===18?'rack':'chest';paintCell(cx,cy,k)}
 for(const a of [...Object.values(FX),TF,SF,SS,ST,BURN])a.fill(0);WH.fill(0);fxDirty=true}
function unitsRange(){const face=t=>{t.ang=Math.PI;return t};
 for(const[n,u,y]of[['Vey','home',40],['Oren','home',72],['Pip','civ',104],['Lask','guard',136],['Hale','rifle',176],['Isk','rifle',256]])token(n,'Astia',u,56,y,false,null);
 {const w=weapon('rod',92,70,0);w.ammo=3;w.res=15}container(5,8,[{k:'rbox',n:6}]);container(5,18,[{k:'musket',n:4,ammo:12,res:24}]);container(5,21,[{k:'grenade',n:8}]);container(5,24,[{k:'bomb',n:4}]);
 for(const[n,u,y]of[['Silas','civ',26],['Gull','home',47],['Rask','rifle',68],['Brant','guard',89],['Tam','shock',110],['Mira','cmd',131]])face(token(n,'Reapers',u,208,y,false,null));
 face(token('Dunn','Reapers','home',584,176,false,null));
 RLANE.forEach((t,i)=>{const y=13*16+i*48+16;face(token(['Ade','Bel','Cole','Dace','Eel','Fenn','Gale','Hart'][i],'Reapers','rifle',280,y,false,null));if(t==='door'){const d=slab(3,180,y-16,1,32,8);d.locked=true}});
 for(const[x,y,k]of[[408,248,'grenade'],[440,248,'bomb'],[408,600,'grenade'],[440,600,'bomb'],[520,392,'grenade'],[552,392,'bomb'],[536,456,'grenade']])weapon(k,x,y,0);
 barricade(2,392,312);barricade(3,456,312);barricade(3,560,560,32,8)}
function unitsCount(){const up=-Math.PI/2,dn=Math.PI/2,face=(t,a)=>{t.ang=a;return t};
 dbl(3,128,187,159,180,0,2,false);slab(3,36,96,1);for(const o of bodies)if(o.type==='slab')goldify(o);
 container(7,6,[{k:'gold',n:900}]);
 face(token('Silas','Reapers','civ',136,78,false,'pistol'),dn);face(token('Gull','Reapers','home',104,72,false,'blunder'),dn);face(token('Rask','Reapers','rifle',170,72),dn);
 face(token('Sgt. Brant','Goldbank','guard',120,152,true),up);face(token('Wells','Goldbank','guard',152,152,true),up);face(token('Ode','Goldbank','rifle',86,150),up);face(token('Kerr','Goldbank','rifle',186,150),up)}
function buildVault(){map=Array.from({length:CH},()=>Array(CW).fill('gstone'));
 const F=(cx,cy)=>{if(cy>=39&&cy<=45)return cx>=1&&cx<=4&&cy>=41&&cy<=44?(cx>=2&&cx<=3&&cy>=42&&cy<=43?'bush':'grass'):'pave';if(cy===46)return 'bush';if(cy===38)return cx>=13?'marble':'gstone';if(cx<=2||cy<=1)return 'gstone';
  if(cy>=2&&cy<=6&&cx>=8)return cx===10&&cy===4?'pillar':cy===2&&(cx<=10||cx>=13)?'shelf':'marble';if(cy===7)return cx>=13?'marble':'gstone';
  if(cy>=8&&cy<=18){if(cx>=11)return cx===12&&(cy===10||cy===16)?'pillar':'omarble';if(cx===10)return cy===13?'marble':'gstone';if(cx>=3&&cy>=9&&cy<=17)return cy===10&&cx>=5&&cx<=7?'desk':cx>=4&&cx<=8&&cy>=11&&cy<=16?'carpet':'marble';return 'gstone'}
  if(cy===19)return cx>=13?'marble':'gstone';
  if(cy>=20&&cy<=30){if((cx===6||cx===10)&&(cy===22||cy===28))return 'pillar';if(cy===25&&cx>=5&&cx<=9)return 'table';return 'marble'}
  if(cy===31)return cx>=13?'marble':'gstone';
  if(cy>=32&&cy<=37){if(cx>=11)return cx===12&&(cy===33||cy===36)?'pillar':'marble';if(cx===10)return cy===34?'marble':'gstone';if(cx>=3)return cy===33&&cx>=5&&cx<=7?'desk':cx>=4&&cx<=8&&cy>=34&&cy<=36?'carpet':'marble';return 'gstone'}
  return 'gstone'};
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)paintCell(cx,cy,cx<=14?F(cx,cy):F(29-cx,cy));
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){if(map[Y/T|0][X/T|0]!=='gfloor')continue;const e=(x,y)=>!map[y/T|0]||map[y/T|0][x/T|0]!=='gfloor';if(e(X+1,Y)||e(X-1,Y)||e(X,Y+1)||e(X,Y-1))floor[Y*W+X]=mul(floor[Y*W+X],.5)}
 for(const a of [...Object.values(FX),TF,SF,SS,ST,BURN])a.fill(0);WH.fill(0);fxDirty=true}
function unitsVault(){const up=-Math.PI/2,dn=Math.PI/2,face=(t,a)=>{t.ang=a;return t};
 dbl(3,208,124,271,115,0,2,true,32,8);dbl(3,208,316,271,307,0,2,true,32,8);dbl(3,208,508,271,499,0,2,false,32,8);dbl(3,208,620,271,611,0,2,true,32,8);
 const s1=slab(3,164,208,1),s2=slab(3,315,223,3);s1.locked=s2.locked=true;slab(3,164,544,1);slab(3,315,559,3);
 container(8,2,[{k:'gold',n:1500}]);container(13,2,[{k:'gold',n:1600}]);container(19,2,[{k:'gold',n:1500}]);container(5,25,[{k:'gold',n:200}]);container(20,25,[{k:'gold',n:200}]);
 container(22,10,[{k:'gold',n:400},{k:'grenade',n:3}]);container(5,10,[]);container(5,33,[]);container(22,33,[{k:'gold',n:120}]);for(const o of bodies){if(o.type==='slab')goldify(o);if(o.kind==='crate')o.metal=true}
 for(const[n,u,x,w]of[['Skiff','home',120,'rod'],['Gull','home',150,'blunder'],['Brine','home',180,'blunder'],['Bones','civ',210,'pistol'],['Teague','shock',270,'sspear'],['Rask','rifle',300,undefined],['Mott','rifle',330,undefined],['Hook','home',360,'pistol']])face(token(n,'Reapers',u,x,640,false,w),up);{const rk=bodies.find(t=>t.name==='Rask'),i=rk.inv.indexOf(null);if(i>=0)rk.inv[i]={k:'bomb',n:1}}for(const t of bodies){if(t.type!=='token'||t.nat!=='Reapers')continue;const g=t.inv.find(q=>q&&q.k==='grenade');if(g)g.n+=1;else{const i=t.inv.indexOf(null);if(i>=0)t.inv[i]={k:'grenade',n:2}}if(!t.inv.some(q=>q&&q.k==='bomb')){const i=t.inv.indexOf(null);if(i>=0)t.inv[i]={k:'bomb',n:1}}}
 face(token('Pell','Goldbank','rifle',200,560),dn);face(token('Bryn','Goldbank','rifle',280,560),dn);
 face(token('Master Corwin','Goldbank','civ',90,560,false,'pistol'),0);face(token('Ines','Goldbank','civ',380,580,false,null),Math.PI);
 face(token('Ansel','Goldbank','civ',120,388,false,null),dn);face(token('Hesta','Goldbank','civ',360,388,false,null),dn);
 face(token('Aldric','Goldbank','guard',200,350,true),dn);face(token('Orla','Goldbank','guard',280,350,true),dn);face(token('Fenn','Goldbank','rifle',240,460),dn);for(const[n,x,y,a]of[['Dorran',130,440,-Math.PI/2],['Lyse',350,440,-Math.PI/2],['Old Benn',240,404,0],['Pim',72,476,0],['Sora',408,476,Math.PI],['Merrit',240,592,-Math.PI/2]])face(token(n,null,'civ',x,y,false,null),a);
 face(token('Tam','Goldbank','shock',214,236,false,'sspear'),dn);face(token('Varo','Goldbank','shock',266,236,false,'sspear'),dn);face(token('Mace','Goldbank','guard',120,340,true),dn);face(token('Manager Vance','Goldbank','civ',404,240,false,'pistol'),Math.PI);face(token('Ellis','Goldbank','guard',360,340,true),dn);face(token('Hask','Goldbank','guard',100,200,true),0);face(token('Corin','Goldbank','rifle',100,240),0)}
// boarding ship (west) and pirate airship (east) over open sky
function buildAir(){map=Array.from({length:CH},()=>Array(CW).fill('sky'));
 const own=(cx,cy)=>cx>=1&&cx<=6&&cy>=5&&cy<=14,pir=(cx,cy)=>{if(cx<10||cx>30||cy<3||cy>16)return false;const t=cx>26?cx-26:0;return cy>=3+t&&cy<=16-t};
 const plank=(cx,cy)=>(cx>=7&&cx<=9)&&(cy===7||cy===12);
 const edge=(f,cx,cy)=>f(cx,cy)&&(!f(cx-1,cy)||!f(cx+1,cy)||!f(cx,cy-1)||!f(cx,cy+1));
 const gap=(cx,cy)=>(cy===7||cy===12)&&(cx===6||cx===10);
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){let k='sky';
  if(own(cx,cy)||pir(cx,cy))k=(edge(own,cx,cy)||edge(pir,cx,cy))&&!gap(cx,cy)?'rail':'planks';
  if(plank(cx,cy))k='planks';if(cx===2&&(cy===6||cy===9)||cy===7&&(cx===16||cx===17)||cx===20&&cy===12)k='chest';
  if(cx===18&&(cy===6||cy===13)||cx>=23&&cx<=24&&cy>=9&&cy<=10)k='rail';
  paintCell(cx,cy,k)}
 for(const a of [...Object.values(FX),TF,SF,SS,ST,BURN])a.fill(0);WH.fill(0);fxDirty=true}
function unitsAir(){const face=(t,a)=>{t.ang=a;return t},E=0,Wd=Math.PI;
 const C=[['Kade','pistol',2],['Vos','pistol',2],['Ash','blunder'],['Rook','blunder'],['Sere','sspear'],['Holt','rod']];
 C.forEach(([n,w,dual],i)=>{const t=face(token(n,'Astia','cmd',56+(i%2)*28,104+(i>>1)*36,false,w),E);if(dual)addItem(t,{k:'pistol',n:1,ammo:18,res:18})});
 container(2,6,[{k:'grenade',n:6}]);container(2,9,[{k:'pbox',n:4}]);
 const P=[['Cpt. Marrow','guard',428,150,'musket'],['Sly','guard',380,96,'musket'],['Gant','rifle',330,80,'musket'],['Hobb','rifle',330,224,'musket'],['Pell','rifle',344,150,'musket'],['Wick','rifle',236,232,'musket'],
  ['Brine','home',236,72,'blunder'],['Tarr','home',270,150,'pistol'],['Crabb','home',200,120,'spear'],['Lugg','home',200,176,'blunder'],['Nim','civ',196,150,'pistol'],['Fitch','civ',460,150,'spear']];
 for(const[n,u,x,y,w]of P)face(token(n,'Pirates',u,x,y,false,w),Wd);
 container(16,7,[{k:'gold',n:240}]);container(20,12,[{k:'gold',n:120}]);for(const y of [132,164]){const d=barricade(2,232,y);d.rot=1;orient(d)}}
function overboard(){for(const b of [...bodies]){if(b.type==='weapon'&&WP[b.kind].bullet||inDrag(b)||Math.hypot(b.vx,b.vy)>1.5&&b.type!=='token')continue;const r=map[b.y/T|0],k=r&&r[b.x/T|0];if(k!=='sky')continue;
 if(b.type==='token'&&b.held)dropHeld(b);dab(SF,b.x,b.y,.4,2);sfx('whoosh');remove(b);if(b.type==='token')listPeople()}}
function buildSewer(){map=Array.from({length:CH},()=>Array(CW).fill('stone'));
 const F=(cx,cy)=>{if(cx<=1&&cy===2)return 'flag';if(cy===12&&cx>0)return 'dmarble';if(cy===11&&cx>0)return 'flag';if(cx===2&&cy>=1&&cy<=11)return 'flag';if(cx===3&&cy===5)return 'flag';if(cx===4&&cy===5)return 'flag';
  if(cx>=5&&cx<=12&&cy>=3&&cy<=9)return (cx===8||cx===9)&&(cy===5||cy===6)?'table':'flag';if((cx===8||cx===9)&&cy===10)return 'flag';if(cx===13&&cy===4)return 'flag';if(cx>=14&&cx<=16&&cy>=3&&cy<=8)return (cx===14||cx===16)&&cy===3?'chest':'planks';return 'stone'};
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)paintCell(cx,cy,F(cx,cy));
 for(const a of [...Object.values(FX),TF,SF,SS,ST,BURN])a.fill(0);WH.fill(0);fxDirty=true}
function unitsSewer(){const face=(t,a)=>{t.ang=a;return t};
 slab(2,68,80,1);slab(2,212,64,1);
 container(8,5,[{k:'sspear',n:2,ammo:4,res:0}]);container(14,3,[{k:'grenade',n:3}]);container(16,3,[{k:'musket',n:2,ammo:12,res:12}]);
 face(token('Ash',null,'cmd',40,30,false,'blunder'),Math.PI/2);
 face(token('Sgt. Vell','Havenport','guard',108,82,true),0);face(token('Dace','Havenport','rifle',108,110),0);face(token('Orrin','Havenport','rifle',136,150),-Math.PI/2);
 face(token('Gull','Reapers','home',180,82,false,'pistol'),Math.PI);face(token('Rask','Reapers','rifle',180,110),Math.PI);face(token('Bones','Reapers','civ',196,58,false,'pistol'),Math.PI);face(token('Skiff','Reapers','home',244,100,false,'pistol'),Math.PI)}
function buildTavern(){map=Array.from({length:CH},()=>Array(CW).fill('stone'));
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){let k='stone';
  if(cx>0&&cx<CW-1&&cy>0&&cy<CH-1){if(cy>=11)k='flag';else if(cy===10)k=(cx===8||cx===9)?'flag':'stone';else if(cx===13)k=cy===4?'flag':'stone';else if(cx>13)k='dmarble';else k='planks';
   if(((cx===3||cx===4)&&cy===6)||((cx===8||cx===9)&&cy===6)||((cx===10||cx===11)&&cy===2))k='table';if((cx===5&&cy===6)||(cx===7&&cy===6)||(cx===2&&cy===6))k='seat';if(cy===2&&cx>=2&&cx<=5||cx===15&&cy===8)k='chest'}
  if((cx===0||cx===CW-1)&&(cy===11||cy===12))k='flag';
  paintCell(cx,cy,k)}
 for(const a of [...Object.values(FX),TF,SF,SS,ST,BURN])a.fill(0);WH.fill(0);fxDirty=true}
function unitsTavern(){const up=-Math.PI/2,dn=Math.PI/2,face=(t,a)=>{t.ang=a;return t};
 container(2,2,[]);container(15,8,[{k:'pistol',n:3,ammo:18,res:18},{k:'musket',n:1,ammo:12,res:12}]);
 dbl(2,128,171,159,164,0,2,false);slab(2,212,64,1);
 face(token('Wick','Havenport','civ',64,24,false,'pistol'),dn);
 face(token('Capt. Hale','Havenport','home',110,84,false,'pistol'),dn);face(token('Nell','Havenport','home',168,104,false,'spear'),dn);face(token('Tobin','Havenport','civ',52,118,false,'spear'),0);
 face(token('Mara','Havenport','civ',180,52,false,'pistol'),dn);face(token('Capt. Rourke','Havenport','home',244,60,false,'pistol'),Math.PI);
 face(token('Gull','Reapers','home',116,142,false,'pistol'),up);face(token('Bones','Reapers','civ',150,142,false,'spear'),up);
 face(token('Rask','Reapers','home',60,192,false,'spear'),0);face(token('Skiff','Reapers','civ',100,192,false,'pistol'),up);face(token('Teague','Reapers','home',196,192,false,'pistol'),up);face(token('Brine','Reapers','home',240,192,false,'spear'),Math.PI)}
function buildDocks(){map=Array.from({length:CH},()=>Array(CW).fill('stone'));
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){let k='stone';
  if(cx===0&&(cy===2||cy===3))k='flag';if(cx>0&&cx<CW-1&&cy>0&&cy<CH-1){if(cy<5)k='flag';else if(cy===5)k=(cx===3||cx===8||cx===9)?'flag':'stone';else if(cx===12)k=(cy===8||cy===9)?'flag':'stone';else if(cx>12)k=(cx+cy)%2?'marble':'dmarble';else k='planks';
   if((cx===5&&cy===9)||(cx===9&&cy===10))k='stone';if(cx===11&&(cy===6||cy===7)||cx===8&&cy===12||cx===11&&cy===12||cx===16&&(cy===6||cy===7))k='chest'}
  paintCell(cx,cy,k)}
 for(const a of [...Object.values(FX),TF,SF,SS,ST,BURN])a.fill(0);WH.fill(0);fxDirty=true}
function crate(x,y,items){const c=weapon('crate',x,y,0);c.name='Crate';c.inv=[items[0]||null];c.si=-1;return c}
function unitsDocks(){const up=-Math.PI/2,dn=Math.PI/2,face=(t,a)=>{t.ang=a;return t};
 face(token('Corvan','Astia','shock',56,50,false,'sspear'),dn);face(token('Varn','Astia','shock',122,50,false,'spear'),dn);face(token('Kade','Astia','shock',168,50,false,'sspear'),dn);
 face(token('Aurel','Astia','rifle',36,26),dn);face(token('Ostra','Astia','guard',96,26,true),dn);face(token('Mira','Astia','cmd',196,26),dn);face(token('Ivo','Astia','rifle',248,26),dn);
 const sd=slab(2,48,91,0);sd.locked=true;dbl(2,128,91,159,84,0,2,true);dbl(3,196,128,203,159,1,3,true);
 face(token('Gull','Reapers','home',100,118,false,'pistol'),up);face(token('Rask','Reapers','home',60,128),up);face(token('Mott','Reapers','civ',160,118,false,'pistol'),up);
 face(token('Teague','Reapers','rifle',112,176),up);face(token('Brine','Reapers','home',68,190,false,'blunder'),up);
 face(token('Skerry','Reapers','home',236,120),Math.PI);face(token('Fen','Reapers','civ',244,176,false,'pistol'),Math.PI);
 for(const[x,y]of[[24,200],[38,201],[24,186],[52,201],[36,188],[24,172]])weapon('bomb',x,y,0);
 container(11,6,[{k:'musket',n:3,ammo:12,res:24},{k:'pistol',n:4,ammo:18,res:18}]);container(8,12,[{k:'blunder',n:2,ammo:8,res:16}]);container(11,12,[{k:'grenade',n:4}]);
 container(16,6,[{k:'sspear',n:2,ammo:4,res:4},{k:'bomb',n:2}])}
function buildBank(){map=Array.from({length:CH},()=>Array(CW).fill('stone'));
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){let k='stone';
  if(cx>0&&cx<CW-1&&cy>0&&cy<CH-1){if(cx===11)k=(cy===2||cy===6||cy===7)?'flag':'stone';else if(cx<11)k=(cx+cy)%2?'marble':'dmarble';else k='planks'}
  if(cx>=3&&cx<=7&&(cy===6||cy===7))k='table';
  if((cx===4||cx===6)&&(cy===5||cy===8))k='seat';
  if(cx>=15&&cx<=16&&cy===2)k='table';
  if(cy===10&&cx>11&&cx<CW-1)k=(cx===14||cx===15)?'flag':'stone';
  paintCell(cx,cy,k)}
 for(const a of [...Object.values(FX),TF,SF,SS,ST,BURN])a.fill(0);fxDirty=true}

// units and nations
const NAT={Neutral:null,Pirates:'#8a5a2b',Goldbank:'#c9a227',Havenport:'#2f5fa8',Astia:'#b03a2a',Thaselore:'#7d4fa0',Holverland:'#3e8e5a',Reapers:'#5b6b3a'};
const ICA=["........#........",".......#R#.......","......#RRR#......",".....#RRRRR#.....","....#R#RRR#R#....","...#RRR#R#RRR#...","..#RRRRR#RRRRR#..","...#RRR#R#RRR#...","....#R#RRR#R#....",".....#RRRRR#.....","......#RRR#......",".......#R#.......","........#........"];
const ICB=ICA.slice(0,5).concat(["...#RRR###RRR#...","..#RRRR###RRRR#..","...#RRR###RRR#..."],ICA.slice(8));
const UNITS={civ:{n:'Civilian',arm:0,cost:1,sp:2},home:{n:'Homeguard',arm:1,ac:rgb(118,80,48),leather:1,cost:2,sp:1.5,w:'musket',pips:1},rifle:{n:'Riflemen',arm:1,ac:rgb(150,154,162),cost:3,sp:1.15,w:'musket',pips:2},guard:{n:'Guard riflemen',arm:2,ac:rgb(186,192,202),cost:7,sp:.8,w:'musket',pips:3,rivet:1},shock:{n:'Shock troops',arm:3,ac:rgb(92,96,104),cost:9,sp:1.3,w:'spear',mark:'bar',seg:1},cmd:{n:'Commandos',arm:1,front:1,ac:rgb(46,48,52),cost:3,sp:.65,w:'blunder',mark:'x',dark:1}};
const STEEL=rgb(150,154,162),STEEL_A=rgb(116,120,128);
const natc=b=>b.nat&&NAT[b.nat]?hx(NAT[b.nat]):b.unit==='civ'?rgb(206,202,192):rgb(150,150,150);
const natLabel=b=>{const c=b.nat&&NAT[b.nat]?hx(NAT[b.nat]):rgb(216,212,202);return css(b.status==='dead'?mix(c,rgb(96,96,96),.25):c)};

// bodies
let bodies=[],parts=[],uid=1;
function mkSet(b){b.set=new Map(b.px.map(p=>[K(p[0],p[1]),p]))}
function tokPixels(b){const u=UNITS[b.unit],px=[];
 for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){const d=Math.hypot(dx,dy);if(d>8.3)continue;let r,hp,m=0;
  if(u.arm&&d>7.4-u.arm){r='a';hp=u.cost;m=u.leather?0:3}else if(u.front&&d>5.4){r='f';hp=13;m=3}else if(d>4.4){r='c';hp=1}else if(d>3.5){r='k';hp=3}else{r='h';hp=3}
  px.push([dx,dy,0,hp,m,0,hp,r,dx,dy])}return px}
function token(name,nat,unit,x,y,guard,wk){const w=wk===undefined?UNITS[unit].w:wk;const b={id:uid++,type:'token',name,nat,unit,x,y,vx:0,vy:0,status:'free',guard:!!guard,mass:1+UNITS[unit].arm*.4,ang:0,held:null,inv:null};{b.inv=[null,null,null,null,null,null];const it0=w?{k:w,n:w==='spear'?4:1,ammo:CAP[w],res:CAP[w]&&unit!=='civ'?CAP[w]*(unit==='guard'||unit==='cmd'||w==='sspear'?2:1):undefined}:null;if(it0)addItem(b,it0);for(const q of loadout(unit,w))if(nat!=='Goldbank'||q.k!=='grenade'&&q.k!=='bomb')addItem(b,q);b.si=w?b.inv.findIndex(z=>z&&z.k===w):-1;b.held=b.si>=0?b.inv[b.si]:null};b.px=tokPixels(b);b.n0=b.px.length;mkSet(b);bodies.push(b);mkLabel(b);return b}
const WP={musket:{n:'Musket',gun:1,fr:.9,m:1,range:300,spread:.03,speed:46,proj:'ball',len:14,hold:750,smoke:1,rec:.5,E:18},blunder:{n:'Blunderbuss',gun:1,fr:.9,m:1,range:140,spread:.025,speed:42,proj:'pel',len:10,hold:750,smoke:1.2,rec:.45,E:10,pellets:4},pistol:{n:'Pistol',gun:1,fr:.9,m:.7,range:170,spread:.05,speed:40,proj:'pball',len:7,hold:500,smoke:.5,rec:.3,E:13},spear:{n:'Spear',sharp:1,melee:1,fr:.985,max:30,m:1.4,tip:19},sspear:{n:'Lancer',sharp:1,melee:1,fr:.985,max:30,m:1.4,tip:15,proj:'arc',speed:34,E:6,rec:1.2,len:19,hold:1100,range:220,spread:.02},shield:{hide:1,n:'Shield',fr:.9,max:16,m:2,tip:1},rod:{n:'Bolter',gun:1,fr:.9,m:1.3,range:340,spread:.012,speed:50,proj:'rodp',len:15,tip:15,hold:900,smoke:.5,rec:2.4,E:40,kb:4},grenade:{n:'Grenade',fr:.93,max:24,m:1},pot:{hide:1,n:'Fire pot',fr:.97,max:24,m:1},bomb:{n:'Heavy grenade',fr:.95,max:16,m:5},crate:{n:'Crate',hide:1,fr:.75,max:6,m:9},gold:{n:'Solari',hide:1,fr:.8,max:10,m:1},rbox:{n:'Rods',hide:1,fr:.8,max:10,m:1.5},ball:{n:'Ball',fr:.995,max:46,m:.4,hide:1,bullet:1},pball:{n:'Shot',fr:.995,max:40,m:.25,hide:1,bullet:1},pel:{n:'Pellet',fr:.99,max:42,m:.3,hide:1,bullet:1},arc:{n:'Arc',fr:.995,max:34,m:.3,hide:1,bullet:1},rodp:{n:'Rod',fr:.996,max:52,m:1.2,hide:1,bullet:1,rod:1}};
const CAP={musket:12,pistol:18,blunder:8,sspear:4,rod:3},BOX={musket:'mbox',pistol:'pbox',blunder:'sbox',sspear:'cell',rod:'rbox'},CARRY={civ:1,home:2,rifle:2,guard:3,cmd:4,shock:5};
function loadout(u,w){const L=[];if(w==='sspear')L.push({k:'spear',n:4});if(u==='cmd')L.push({k:'bomb',n:1});if(u!=='civ')L.push({k:'grenade',n:u==='guard'||u==='cmd'||u==='rifle'?2:1});return L}
// slots: 0 primary, 1 secondary, 2 grenade, 3 heavy, 4+ pack
const SEC=new Set(['pistol']),GREN=new Set(['grenade','pot']),PACK={civ:1,home:1,rifle:1,guard:2,cmd:2,shock:2},LIGHT=new Set(['civ','home']);
const slotOK=(t,i)=>t.type!=='token'||!(i===1&&LIGHT.has(t.unit))&&i<4+(PACK[t.unit]||1);
function consume(b){const s=b.held;if(!s)return;s.n=(s.n||1)-1;if(s.n>0){if(CAP[s.k])s.ammo=CAP[s.k];delete s.mode;b.hc=null;return}if(b.inv&&b.si>=0)b.inv[b.si]=null;b.held=null;b.si=-1;b.hc=null}
function selectSlot(b,i){const s=b.inv&&b.inv[i];if(!s||s.k==='gold')return;if(s.k.endsWith('box')||s.k==='cell'){const h=b.held;if(h&&BOX[h.k]===s.k){h.res=(h.res||0)+CAP[h.k]*(s.n||1);b.inv[i]=null;sfx('reload');if((h.ammo??CAP[h.k])<CAP[h.k])reload(b)}return}if(b.si===i)return;b.si=i;b.held=s;b.hc=null;sfx('flick')}
function reload(b,o2){if(!o2&&offGun(b)){let r2=false;withOff(b,()=>{r2=reload(b,1)});return reload(b,1)||r2}const h=b.held;if(!h||!CAP[h.k])return false;if(h.k==='sspear'&&(h.res||0)>0){delete h.mode;h.spent=false;b.hc=null}const cur=h.ammo??CAP[h.k],take=Math.min(CAP[h.k]-cur,h.res||0);if(take<=0)return false;h.res-=take;h.ammo=cur+take;b.cock=14;b.hc=null;sfx('reload');return true}
const THR={civ:.5,home:.7,rifle:.8,guard:.9,cmd:1.25,shock:1};
const C={lw:rgb(198,164,112),lwD:rgb(160,126,80),wood:rgb(...PAL.oak[2]),woodH:rgb(...PAL.oak[3]),woodD:rgb(...PAL.oak[1]),iron:rgb(...PAL.iron[3]),ironH:rgb(...PAL.iron[4]),ironD:rgb(...PAL.iron[1]),ironK:rgb(...PAL.iron[0]),lead:rgb(78,80,86),clay:rgb(156,82,60),clayD:rgb(104,50,36),cloth:rgb(214,204,180),fuse:rgb(230,170,60)};
const rodFill=it=>it&&(it.k==='rod'||it.kind==='rod')?Math.ceil((it.ammo??CAP[it.k||it.kind])/CAP[it.k||it.kind]*3-1e-9)/3:1;
const HEAT=[[0,null],[.18,rgb(118,72,64)],[.34,rgb(150,44,28)],[.5,rgb(206,62,26)],[.66,rgb(250,118,38)],[.82,rgb(255,190,90)],[1,rgb(255,244,214)]];
function heatCol(h,cold){if(h<=0)return cold;h=Math.min(1.05,h);for(let i=1;i<HEAT.length;i++)if(h<=HEAT[i][0]||i===HEAT.length-1){const a=HEAT[i-1],b=HEAT[i],t=Math.min(1,(h-a[0])/(b[0]-a[0])),e=t*t*(3-2*t);return mix(a[1]||cold,b[1],e)}return cold}
const sh3=(c,u)=>u<-.2?mul(c,1.16):u>.2?mul(c,.72):c;
function shape(kind,a,fill=1,heat=0){const m=new Map(),c=Math.cos(a),s=Math.sin(a);
 const st=(t0,t1,w,f)=>{for(let t=t0;t<=t1;t+=.5)for(let u=-w;u<=w+.01;u+=.5)m.set(K(Math.round(c*t-s*u),Math.round(s*t+c*u)),f(t,u))};
 const disc=(r,f)=>{for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++){const d=Math.hypot(x,y);if(d<=r)m.set(K(x,y),f(x,y,d))}};
 if(kind==='spear'){st(-20,13,0,t=>(t+20)%7<1?C.lwD:C.lw);st(13,17,.5,(t,u)=>sh3(C.iron,u));st(17.5,19.5,0,()=>C.ironH)}
 if(kind==='sspear'){st(-14,5,0,t=>(t+14)%6<1?rgb(30,31,35):rgb(48,50,56));st(5,8.5,1,(t,u)=>Math.abs(u)>.6?rgb(30,31,35):(t*2|0)%2?TIPC:rgb(40,44,54));st(9,12.5,.5,(t,u)=>u<-.2?TIPB:u>.2?TIPC:TIPA);st(13,15,0,()=>TIPB)}
 if(kind==='arc')m.set(K(0,0),rgb(200,230,255));
 if(kind==='sword'){st(-4,-1,0,()=>C.ironD);for(let u=-2;u<=2;u+=.5)m.set(K(Math.round(c*-.5-s*u),Math.round(s*-.5+c*u)),C.ironD);st(0,11,.5,(t,u)=>t>10||u<0?C.ironH:C.iron)}
 if(kind==='shield'){for(let t=-1;t<=.5;t+=.5)for(let u=-7;u<=7;u+=.5){const e=Math.abs(u)>6||t<-.6;m.set(K(Math.round(c*(t-Math.abs(u)*.12)-s*u),Math.round(s*(t-Math.abs(u)*.12)+c*u)),Math.abs(u)<1.2&&t>-.6?C.ironH:e?C.ironD:C.iron)}}
 if(kind==='rod'){const glow=c=>heat>1?mix(c,rgb(214,70,30),Math.min(.8,(heat-1)*2.2)):c;st(-10,-5,1.5,(t,u)=>glow(u<-1.2?rgb(58,60,66):u>1.2?rgb(28,29,33):rgb(44,46,51)));st(-5,-3,.5,()=>glow(rgb(50,52,57)));st(-3,15,1,(t,u)=>Math.abs(u)>.6?glow(t>14?rgb(30,31,35):u<0?rgb(66,68,75):rgb(42,44,49)):t>-3+18*fill?rgb(30,32,36):heatCol(heat*(.9+.12*(t+3)/18)+(hh(t*2|0,7,3)-.5)*.05*Math.min(1,heat*3),t>13?C.ironH:rgb(176,180,188)))}
  if(kind==='rodp')st(-3-(fill>1?2:0),2,fill>1?.5:0,t=>t>1?C.ironH:C.iron);
 if(kind==='blunder'){const dm=rgb(50,52,57);st(-10,-5,1,(t,u)=>sh3(dm,u));st(-5,6,.5,(t,u)=>sh3(rgb(58,60,66),u));st(6,8,1,(t,u)=>sh3(rgb(54,56,62),u));st(8.5,10,1.5,(t,u)=>Math.abs(u)<.6&&t>9.5?rgb(18,18,20):sh3(rgb(62,64,70),u))}
 if(kind==='bolt'){st(-6,3,0,()=>C.lw);st(3.5,6,0,()=>C.ironH)}
 if(kind==='musket'){st(-13,-9,1,(t,u)=>sh3(C.wood,u));st(-9,8,.5,(t,u)=>sh3(C.woodD,u));st(-4,14,0,t=>t>13?C.ironK:C.iron);m.set(K(Math.round(c*-6-s*1),Math.round(s*-6+c*1)),C.ironH)}
 if(kind==='pistol'){st(-5,-2,1,(t,u)=>sh3(C.woodD,u));st(-2,7,.5,(t,u)=>t>6.5?C.ironK:sh3(C.iron,u))}
 if(kind==='pball'||kind==='pel')m.set(K(0,0),C.lead);
 if(kind==='crossbow'){st(-8,6,.5,()=>C.lw);for(let u=-5;u<=5;u+=.5)m.set(K(Math.round(c*3.5-s*u),Math.round(s*3.5+c*u)),C.lwD)}
 if(kind==='ball')m.set(K(0,0),C.lead);
 if(kind==='gold'){for(const[ox,oy]of[[-4,0],[0,0],[-2,-2]])for(let y=0;y<2;y++)for(let x=0;x<4;x++)m.set(K(ox+x,oy+y),y===0?rgb(250,214,90):rgb(190,146,40))}
 if(kind==='crate'){for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++){const e=Math.abs(x)===5||Math.abs(y)===5;m.set(K(x,y),e?C.woodD:(x===y||x===-y)?mul(C.wood,.82):(y+5)%3===0?mul(C.wood,.9):C.woodH)}}
 if(kind==='mbox'||kind==='pbox'||kind==='sbox'){const t=kind==='mbox'?rgb(176,140,90):kind==='pbox'?rgb(150,120,80):rgb(120,110,96);for(let y=-3;y<=3;y++)for(let x=-5;x<=5;x++)m.set(K(x,y),Math.abs(y)===3||Math.abs(x)===5||y===0?mul(t,.68):t)}
 if(kind==='rbox'){for(let y=-2;y<=2;y++)for(let x=-6;x<=6;x++)m.set(K(x,y),x===-3||x===3?rgb(40,42,48):y%2?rgb(140,144,152):rgb(184,188,196))}
 if(kind==='cell'){for(let y=-4;y<=4;y++)for(let x=-2;x<=2;x++)m.set(K(x,y),Math.abs(x)===2||Math.abs(y)===4?rgb(36,48,84):y<-1?rgb(140,205,255):rgb(70,100,170))}
 if(kind==='grenade'){disc(3.2,(x,y,d)=>d>2.6?C.ironK:x+y<-2?C.iron:C.ironD);m.set(K(0,-4),C.fuse)}
 if(kind==='pot'){disc(3.4,(x,y,d)=>d>2.8?C.clayD:x+y<-2?mul(C.clay,1.2):C.clay);m.set(K(0,-1),C.cloth);m.set(K(0,-2),C.cloth);m.set(K(1,-2),C.cloth)}
 if(kind==='bomb')disc(4.6,(x,y,d)=>d>3.9?C.ironK:d>2.5?(x+y<-3?C.iron:C.ironD):d>1.4?rgb(46,34,26):rgb(214,176,70));
 return [...m].map(([k,col])=>{const X=Math.floor(k/1024)-512,Y=k%1024-512;if(kind==='bomb'){const h=Math.hypot(X,Y)>2.5?9:1;return[X,Y,col,h,3,0,h,h>1?'a':'h',X,Y]}if(kind==='crate')return[X,Y,col,2,2,0,2,'x',X,Y];return[X,Y,col,1,3,0,1,'x',0,0]})}
function weapon(kind,x,y,a=0){const b={id:uid++,type:'weapon',kind,x,y,vx:0,vy:0,ang:a,mass:WP[kind].m,px:shape(kind,a)};mkSet(b);bodies.push(b);return b}
function reshape(b,a){b.ang=a;if(b.kind==='bomb'||b.kind==='crate')return;b.px=shape(b.kind,a,rodFill(b));mkSet(b);if(b.spent)spend(b);if(solidHits(b,0,0))b.ghost=true}
function slabPix(m,len=16,th=8){const px=[],hp=(m===2?2:7)+(len>16?(m===2?1:4):0);for(let y=-th;y<=-1;y++)for(let x=0;x<len;x++){let c;const e=y===-th||y===-1||x===0||x===len-1;
 const ed=Math.min(x,len-1-x,y+th,-1-y),sd=uid*37;let q;
 if(m===2)q=woodT(x+sd,y+sd,WOOD.oak,1);
 else{q=metalCore(x+sd,y+sd);if(ed===2&&(x===2||x===len-3)&&(y===-th+2||y===-3))q=sc(q,1.4)}
 c=rgb(cl(q[0]),cl(q[1]),cl(q[2]));
 px.push([x,y,c,hp,m,0,hp,'x',x,y])}return px}
function swingPt(b,lx,ly,a){const B=b.rot*Math.PI/2+(b.spin||0),cb=Math.cos(B),sb=Math.sin(B),ca=Math.cos(a),sa=Math.sin(a),hx=-(b.th||8)/2-1,hy=-(b.th||8)/2,dx=lx-hx,dy=ly-hy,qx=hx+dx*ca-dy*sa,qy=hy+dx*sa+dy*ca;return[qx*cb-qy*sb,qx*sb+qy*cb]}
function orient(b){let a=b.ang||0;if(!b.src){for(const p of b.px){const q=swingPt(b,p[8],p[9],a);p[0]=Math.round(q[0]);p[1]=Math.round(q[1])}mkSet(b);return}
 if(b.used){const live=new Set();for(const t of b.px){if(!t.s||b.set.get(K(t[0],t[1]))!==t)continue;const q=t.s;live.add(q);if(t[3]<q[3])q[3]=t[3];if(t[2]!==t.c0)q[2]=t[2];if(t[5]>q[5])q[5]=t[5]}for(const q of b.used)if(!live.has(q))q.dead=1}
 if(!b.smap){b.smap=new Map();for(const q of b.src)b.smap.set(K(q[8],q[9]),q)}
 const sl=!b.free&&!b.fallen,f=sl?Math.min(1,Math.abs(a)/1.4):0;if(sl)a=0;const L=b.len||16,th=b.th||8,B=b.rot*Math.PI/2+(b.spin||0),cb=Math.cos(B),sb=Math.sin(B),ca=Math.cos(a),sa=Math.sin(a),hx=-th/2-1,hy=-th/2,ox=-f*L*cb,oy=-f*L*sb;
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const[lx,ly]of[[-.5,-th-.5],[L-.5,-th-.5],[-.5,-.5],[L-.5,-.5]]){const q=swingPt(b,lx,ly,a);x0=Math.min(x0,q[0]+ox);x1=Math.max(x1,q[0]+ox);y0=Math.min(y0,q[1]+oy);y1=Math.max(y1,q[1]+oy)}
 const px=[],used=new Set();for(let Y=Math.floor(y0);Y<=Math.ceil(y1);Y++)for(let X=Math.floor(x0);X<=Math.ceil(x1);X++){const rx=(X-ox)*cb+(Y-oy)*sb-hx,ry=-(X-ox)*sb+(Y-oy)*cb-hy,lx=hx+rx*ca+ry*sa,ly=hy-rx*sa+ry*ca,q=b.smap.get(K(Math.round(lx+1e-6),Math.round(ly+1e-6)));
  if(!q||q.dead)continue;const t=[X,Y,q[2],q[3],q[4],q[5],q[6],q[7],q[8],q[9]];t.s=q;t.c0=q[2];px.push(t);used.add(q)}
 b.px=px;b.used=used;mkSet(b)}
function slab(m,x,y,rot=0,len=16,th=8){const b={id:uid++,type:'slab',mat:m,x,y,vx:0,vy:0,rot,ang:0,tgt:0,len,th,src:slabPix(m,len,th),px:[],mass:9*len/16};orient(b);bodies.push(b);return b}
function barricade(m,x,y,len,th){const b=slab(m,x,y,0,len,th);b.free=true;return b}
function slabFits(d,ignore){const bx=Math.round(d.x),by=Math.round(d.y);for(const p of d.px){const X=bx+p[0],Y=by+p[1];if(X<0||Y<0||X>=W||Y>=H)return false;const j=Y*W+X;if(sol[j]||(slabG[j]&&slabG[j]!==d.id&&!(ignore&&ignore.has(slabG[j]))))return false}return true}
function remark(d,on){const bx=Math.round(d.x),by=Math.round(d.y);for(const p of d.px){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H){const j=Y*W+X;if(on)slabG[j]=d.id;else if(slabG[j]===d.id)slabG[j]=0}}}
function spinTo(d,a){const L=(d.len||16)/2,Tq=-(d.th||8)/2,c0=swingPt(d,L,Tq,0),s0=d.spin||0,x0=d.x,y0=d.y;remark(d,false);d.spin=a-d.rot*Math.PI/2;const c1=swingPt(d,L,Tq,0);d.x+=c0[0]-c1[0];d.y+=c0[1]-c1[1];orient(d);
 if(!slabFits(d)){d.spin=s0;d.x=x0;d.y=y0;orient(d)}remark(d,true)}
function pushSlabs(b,h,sx,sy){const ids=new Set();for(const[X,Y]of h){if(X<0||Y<0||X>=W||Y>=H)return false;const j=Y*W+X;if(sol[j])return false;if(!slabG[j])continue;const d=byId(slabG[j]);if(!d||!d.free||d.fallen)return false;ids.add(d.id)}
 if(!ids.size)return false;const ds=[...ids].map(byId);for(const d of ds){remark(d,false);d.x+=sx;d.y+=sy}
 if(!ds.every(d=>slabFits(d,ids))){for(const d of ds){d.x-=sx;d.y-=sy;remark(d,true)}return false}
 for(const d of ds)remark(d,true);b.pushT=tick;b.pushM=Math.max(...ds.map(d=>(d.len||16)>16?3:d.mat===3?2:1));if(tick%12===0)sfx(ds.some(d=>d.mat===3)?'chink':'thunk');return true}
const stage=$('stage');
function mkLabel(b){const l=b.lab=document.createElement('div');l.className='lab';l.textContent=b.name;l.oncontextmenu=e=>{e.preventDefault();openMenu(b,e)};l.onpointerdown=e=>{if(e.button===0){e.stopPropagation();clickBody(b,e.ctrlKey||e.metaKey)}};stage.appendChild(l)}
function hum(d){if(mute||!gest)return null;try{const a=au(),t=a.currentTime,end=t+d+.15,len=Math.max(1,a.sampleRate*(d+.2)|0),buf=a.createBuffer(1,len,a.sampleRate),ch=buf.getChannelData(0);
 for(let i=0;i<len;i++){const p=i/len;ch[i]=(Math.random()*2-1)*(Math.random()<.0015+p*p*.02?1:.08)}
 const src=a.createBufferSource();src.buffer=buf;const bp=a.createBiquadFilter();bp.type='bandpass';bp.Q.value=.9;bp.frequency.setValueAtTime(1200,t);bp.frequency.linearRampToValueAtTime(3200,t+d);
 const o=a.createOscillator(),o2=a.createOscillator(),hg=a.createGain(),g=a.createGain();o.type='sine';o2.type='triangle';o.frequency.setValueAtTime(52,t);o.frequency.linearRampToValueAtTime(64,t+d);o2.frequency.setValueAtTime(104,t);o2.frequency.linearRampToValueAtTime(132,t+d);hg.gain.value=.35;
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+d*.6);g.gain.exponentialRampToValueAtTime(.07,t+d);
 o.connect(hg);o2.connect(hg);hg.connect(g);src.connect(bp).connect(g);g.connect(MS);o.start(t);o2.start(t);src.start(t);o.stop(end);o2.stop(end);src.stop(end);
 return{stop(){try{const n=a.currentTime;g.gain.cancelScheduledValues(n);g.gain.setValueAtTime(g.gain.value,n);g.gain.exponentialRampToValueAtTime(.0001,n+.08);for(const x of [o,o2,src])x.stop(n+.1)}catch(e){}}}}catch(e){return null}}
function remove(b){if(b.snd){b.snd.stop();b.snd=null}bodies=bodies.filter(o=>o!==b);if(b.lab)b.lab.remove();if(drag&&drag.b===b)drag=null;sel.delete(b);if(hover===b)hover=null;listPeople()}

// geometry
function markSlabs(){slabG.fill(0);for(const b of bodies)if(b.type==='slab'&&!b.fallen){const bx=Math.round(b.x),by=Math.round(b.y);for(const p of b.px){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H)slabG[Y*W+X]=b.id}}}
function solidHits(b,ox,oy){const bx=Math.round(b.x+ox),by=Math.round(b.y+oy),tk=b.type==='token';let h=null;
 for(const p of b.px){if(tk&&p[0]*p[0]+p[1]*p[1]>52)continue;const X=bx+p[0],Y=by+p[1];if(X<0||Y<0||X>=W||Y>=H){(h||(h=[])).push([X,Y]);continue}const j=Y*W+X;if(sol[j]||(slabG[j]&&slabG[j]!==b.id)||tk&&OBJ[j])(h||(h=[])).push([X,Y])}return h}
const byId=id=>bodies.find(o=>o.id===id);
function matAt(X,Y){if(X<0||Y<0||X>=W||Y>=H)return 1;const j=Y*W+X;if(sol[j])return sol[j];const s=slabG[j]&&byId(slabG[j]);return s?s.mat:0}
function bodyAt(X,Y,r=1,skip,filter){for(let i=bodies.length-1;i>=0;i--){const b=bodies[i];if(b===skip||(filter&&!filter(b))||(!filter&&b.status==='dead'))continue;const bx=Math.round(b.x),by=Math.round(b.y);for(let j=-r;j<=r;j++)for(let k=-r;k<=r;k++)if(b.set.has(K(X+k-bx,Y+j-by)))return b}
 if(filter)return null;for(const b of bodies)if(b.held&&heldPix(b).some(p=>Math.abs(p[0]-X)<=r&&Math.abs(p[1]-Y)<=r))return b;return null}
function doorPart(d,X,Y){if(d.fallen||d.free)return;const p=d.set.get(K(X-Math.round(d.x),Y-Math.round(d.y)));const dl=d.len||16,dt=d.th||8;if(!p||p[9]<-(dt>>1)-2||p[9]>-(dt>>1)+1)return;
 if(p[8]<=4){d.fallen=true;for(let i=0;i<8;i++)spark(X,Y,rgb(150,152,156),0,0,2.4);sfx('drop');sfx('clink');return}
 if(p[8]>=dl-6&&p[8]<=dl-3&&!d.lockBroken){d.lockBroken=true;for(const q of d.pair?[d,d.pair]:[d]){q.locked=false;if(!q.fallen&&q.ang===0&&q.tgt===0)q.tgt=openDir(q)}if(d.pair)d.pair.lockBroken=true;for(let i=0;i<8;i++)spark(X,Y,rgb(240,140,40),0,0,2.4);sfx('clink');sfx('door')}}
function rubble(j){const c=scol[j];floor[j]=Math.random()<.3?mul(c,.32):mul(c,.5)}
function hitPix(o,X,Y,pow){const k=K(X-Math.round(o.x),Y-Math.round(o.y)),p=o.set.get(k);if(!p)return 0;p[3]-=pow;if(p[3]<=0){o.set.delete(k);if(p[7]==='h'||p[7]==='k')o.coreHit=true;return 2}return 1}
function settle(o){o.px=o.px.filter(p=>o.set.has(K(p[0],p[1])));if(o.type!=='slab'){split(o);return}if(!o.px.length){remove(o);return}if(o.fallen)return;
 const seen=new Set(),comps=[];for(const p of o.px){const k=K(p[0],p[1]);if(seen.has(k))continue;const cp=[],q=[p];seen.add(k);while(q.length){const c=q.pop();cp.push(c);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const kk=K(c[0]+dx,c[1]+dy),z=o.set.get(kk);if(z&&!seen.has(kk)){seen.add(kk);q.push(z)}}}comps.push(cp)}
 const hinge=o.free?comps.reduce((a,c)=>c.length>a.length?c:a):comps.find(cp=>cp.some(p=>p[8]<=1));
 if(!hinge){o.fallen=true;sfx('drop');return}
 if(comps.length<2)return;o.px=hinge;mkSet(o);
 for(const cp of comps)if(cp!==hinge){const f={id:uid++,type:'slab',mat:o.mat,x:o.x,y:o.y,vx:0,vy:0,rot:o.rot,ang:o.ang,tgt:o.ang,fallen:true,mass:9,px:cp};mkSet(f);bodies.push(f);sfx('drop')}}
function damagePixel(X,Y,pow,dx=0,dy=0){if(X<1||Y<1||X>=W-1||Y>=H-1)return 1;const j=Y*W+X;
 if(sol[j]){const m=sol[j];if(shp[j]>pow){shp[j]-=pow;scol[j]=mul(scol[j],.9);return m}sol[j]=0;solDirty=true;rubble(j);if(Math.random()<.45)spark(X,Y,scol[j],dx,dy);return m}
 const s=slabG[j]&&byId(slabG[j]);if(s){doorPart(s,X,Y);const r=hitPix(s,X,Y,pow);if(r===2){slabG[j]=0;if(Math.random()<.5)spark(X,Y,s.mat===2?C.wood:C.iron,dx,dy);settle(s)}return s.mat}return 0}
function carve(cx,cy,r,pow,dx,dy){const R=Math.ceil(r)+1;for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const X=Math.round(cx+i),Y=Math.round(cy+j);if(Math.hypot(i,j)+hh(X,Y,4)*1.2>r)continue;if(matAt(X,Y))damagePixel(X,Y,pow,dx,dy)}}
function spark(x,y,c,dx=0,dy=0,sp=2.2,life){if(parts.length>1200)return;const a=Math.random()*6.283,s=Math.random()*sp;parts.push({x,y,vx:Math.cos(a)*s-dx*.35,vy:Math.sin(a)*s-dy*.35,c,life})}
function dab(a,px,py,amt=1,R=8){for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const X=Math.floor(px/2+i),Y=Math.floor(py/2+j);if(X<0||Y<0||X>=BW||Y>=BH)continue;const d=Math.hypot(i,j)/R;if(d>1)continue;a[Y*BW+X]=Math.min(4,a[Y*BW+X]+amt*(1-d)*(0.55+0.45*hh(X,Y,R)))}fxDirty=true}

// colours
const glow=h=>h>.6?mix(rgb(242,122,40),rgb(255,232,160),Math.min(1,(h-.6)/.5)):h>.25?mix(rgb(150,34,16),rgb(242,122,40),(h-.25)/.35):rgb(150,34,16);
const frontOf=(o,p)=>p[8]*Math.cos(o.ang||0)+p[9]*Math.sin(o.ang||0)>Math.hypot(p[8],p[9])*.7;
function pcol(b,p){let c;const r=p[7],ox=p[8],oy=p[9],u=UNITS[b.unit]||UNITS.civ;
 if(r==='x'||b.type==='weapon'){c=p[2];if(b.kind==='crate'&&b.metal&&!(b.open&&Math.abs(ox)<5&&Math.abs(oy)<5))c=mix(grey(c),rgb(152,158,170),.45);if(b.kind==='crate'&&b.open&&Math.abs(ox)<5&&Math.abs(oy)<5)c=Math.abs(ox)===4||Math.abs(oy)===4?mul(C.woodD,.75):(oy+5)%3===0?mul(C.woodD,.45):mul(C.woodD,.6);const sth=b.th||8,sln=b.len||16;if(b.type==='slab'&&!b.free&&ox>=0&&oy>=-(sth>>1)-1&&oy<=-(sth>>1)){if(ox>=1&&ox<=2)c=b.mat===3?rgb(62,64,70):rgb(170,172,176);else if(ox>=sln-5&&ox<=sln-4&&!b.lockBroken)c=b.locked?rgb(240,140,40):rgb(150,92,44)}}
 else if(r==='a'){c=u.ac;const v=hh(ox,oy,3);c=mul(c,.96+v*.08);if(ox+oy<-5)c=mul(c,u.dark?1.04:1.14);else if(ox+oy>5)c=mul(c,.84);
  if(u.rivet&&hh(ox,oy,21)>.86)c=rgb(201,164,70);if(u.seg&&(ox===0||oy===0||Math.abs(ox)===Math.abs(oy)))c=mul(c,.68);if(u.seg&&hh(ox,oy,22)>.9)c=mul(c,1.35);if(u.seg&&ox*Math.cos(b.ang||0)+oy*Math.sin(b.ang||0)<-2)c=mul(UNITS.guard.ac,(.9+hh(ox,oy,3)*.08)*(ox+oy<-5?1.08:ox+oy>5?.86:1))}
 else if(r==='f')c=frontOf(b,p)?mul(u.ac,hh(ox,oy,5)>.8?1.6:1.3):mul(natc(b),u.dark?.5:.8);
 else if(r==='c'){c=natc(b);if(u.arm)c=mul(c,u.dark?.5:.8);if((ox+oy)&1)c=mul(c,.94)}
 else if(r==='k')c=rgb(24,22,22);
 else if(r==='h'){c=b.unit==='civ'?rgb(214,184,150):natc(b);if(u.pips){const xs=u.pips===1?[0]:u.pips===2?[-1,1]:[-2,0,2];if(oy===0&&xs.includes(ox))c=rgb(240,238,230)}
  if(u.mark==='bar'&&oy===0&&Math.abs(ox)<=2)c=rgb(20,20,22);if(u.mark==='x'&&Math.abs(ox)===Math.abs(oy)&&Math.abs(ox)<=2)c=rgb(20,20,22)}
 else c=rgb(34,22,20);
 if(b.guard&&Math.abs(ox)<=1&&r==='c')c=mul(c,.6);
 if(p[3]<p[6])c=mul(c,.6+.4*p[3]/p[6]);
 if(p[5]>.01)c=mix(c,glow(p[5]),Math.min(1,p[5]*1.6));
 return c}
// damage
function cut(o,X,Y,r,blood,pow=1){let n=0,a=0;const R=Math.ceil(r);
 for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){if(Math.hypot(i,j)+(r>1.6?hh(X+i,Y+j,7)*1.1:0)>r)continue;const q=hitPix(o,X+i,Y+j,pow);if(q===2){n++;if(Math.random()<.4)spark(X+i,Y+j,grey(STEEL),0,0,1.4)}else if(q===1)a++}
 if(n){if(blood&&o.type!=='slab'){dab(FX.blood,X,Y,Math.min(1.6,.4+n*.08),Math.min(6,2+n*.25|0));sfx('squish')}settle(o)}return{n,a}}
function split(b){if(b.type==='weapon'||b.type==='slab')return;if(b.px.length<3){remove(b);return}
 const seen=new Set(),comps=[];for(const p of b.px){const k=K(p[0],p[1]);if(seen.has(k))continue;const comp=[],q=[p];seen.add(k);
  while(q.length){const c=q.pop();comp.push(c);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const kk=K(c[0]+dx,c[1]+dy),z=b.set.get(kk);if(z&&!seen.has(kk)){seen.add(kk);q.push(z)}}}comps.push(comp)}
 comps.sort((a,c)=>c.length-a.length);
 if(b.type==='token'&&b.status!=='dead'&&(b.coreHit||(comps.length>1&&comps[1].length>=5)||b.px.length<b.n0*.45)){b.status='dead';if(b.held)dropHeld(b);sfx('squish');dab(FX.blood,b.x,b.y,1.4,5);listPeople()}
 if(comps.length<2)return;b.px=comps[0];mkSet(b);
 for(const cp of comps.slice(1)){if(cp.length<3)continue;
  const mx=Math.round(cp.reduce((s,p)=>s+p[0],0)/cp.length),my=Math.round(cp.reduce((s,p)=>s+p[1],0)/cp.length);
  const o={id:uid++,type:'part',parent:b.parent||b.id,unit:b.unit,nat:b.nat,guard:b.guard,status:'dead',x:b.x+mx,y:b.y+my,vx:b.vx*.6+mx*.18,vy:b.vy*.6+my*.18,mass:cp.length/200,px:cp.map(p=>{const z=p.slice();z[0]-=mx;z[1]-=my;return z})};
  mkSet(o);bodies.push(o)}
 b.vx*=.6;b.vy*=.6}
function restore(b){b.px=tokPixels(b);mkSet(b);b.status='free';b.coreHit=false;b.stuck=false;b.vx=b.vy=0;for(const o of bodies.filter(o=>o.parent===b.id||(o.att&&o.att.id===b.id)))remove(o);listPeople()}
function detonate(b){remove(b);explode(b.x,b.y,b.kind==='bomb'?1.95:1.3)}
let alarm=false;function raiseAlarm(){if(alarm)return;alarm=true;setTimeout(()=>{for(const t of bodies)if(t.type==='token'&&t.status==='free'&&!t.held&&t.psi>=0&&t.inv&&t.inv[t.psi])selectSlot(t,t.psi)},250)}
function explode(x,y,s=1){raiseAlarm();sfx(s>1?'bigboom':'boom');flash(x,y,1,.62,.25,2.2*s,9*s,.9);shake=10*s;carve(x,y,6.5*s,3+(s>1?1:0),0,0);crater(x,y,s);wreck(x,y,s);lockBlast(x,y,12*s);const R=30*s,F=26*s;
 for(const o of [...bodies]){if(!bodies.includes(o))continue;const dx=o.x-x,dy=o.y-y,d=Math.hypot(dx,dy);if(d>R)continue;
  if(o.kind==='grenade'||o.kind==='bomb'){if(!o.fuse)o.fuse=4+(Math.random()*8|0);continue}if(o.type==='slab'&&!o.fallen){blastSlab(o,x,y,s);continue}
  if(o.type==='token'||o.type==='part'){if(d<28*s){const k=1-d/(28*s);for(let i=0;i<Math.round(13*s*k)+3;i++){const tx=o.x+(Math.random()-.5)*12,ty=o.y+(Math.random()-.5)*12,dd=Math.hypot(tx-x,ty-y)||1,ux=(tx-x)/dd,uy=(ty-y)/dd,b0=Math.max(0,dd-12);pierce(o,x+ux*b0,y+uy*b0,ux,uy,8+20*k,.7)}if(d<10*s)cut(o,Math.round(o.x),Math.round(o.y),3+4*k,true,4);dab(FX.blood,o.x,o.y,.3+.6*k,3);settle(o)}}
  if(!bodies.includes(o)||o.type==='slab'||o.hidden)continue;const f=(F-Math.min(d,F))*.45/(o.mass||1);o.vx+=dx/(d||1)*f;o.vy+=dy/(d||1)*f;o.stuck=false;o.ghost=!!solidHits(o,0,0)}
 for(let i=0;i<70*s;i++)spark(x,y,Math.random()<.5?rgb(40,36,34):rgb(90,80,70),0,0,4*s);
 for(let i=0;i<5*s;i++){const a=Math.random()*6.283,rr=4+Math.random()*12*s;dab(TF,x+Math.cos(a)*rr,y+Math.sin(a)*rr,1.4+Math.random()*.9,2+(Math.random()*2|0))}
 dab(SF,x,y,3,11);dab(SF,x+6,y-5,1.6,8);scorch(x,y,16*s);
 if(s>1){embers(x,y,70);for(let i=0;i<60;i++){const a=Math.random()*6.283,rr=Math.random()*12,X=Math.round(x+Math.cos(a)*rr),Y=Math.round(y+Math.sin(a)*rr);if(X>=0&&Y>=0&&X<W&&Y<H)spark(x,y,mul(sol[Y*W+X]?scol[Y*W+X]:floor[Y*W+X],.8),0,0,6)}
  for(let i=0;i<7;i++){const a=Math.random()*6.283,rr=6+Math.random()*16;dab(SF,x+Math.cos(a)*rr,y+Math.sin(a)*rr,2,7)}dab(SS,x,y,2.6,14);room(x,y,.12)}}
function scorch(x,y,R){const r=R/2,cx=x/2,cy=y/2,sd=Math.random()*99;for(let j=-Math.ceil(r);j<=r;j++)for(let i=-Math.ceil(r);i<=r;i++){const X=Math.floor(cx+i),Y=Math.floor(cy+j);if(X<0||Y<0||X>=BW||Y>=BH)continue;
  const d=Math.hypot(i,j),k=Math.floor((Math.atan2(j,i)+Math.PI)/6.2832*44),len=r*(.55+.45*hh(k,0,sd)),v=d<r*.3?.75:Math.pow(Math.max(0,1-d/len),.6)*.75;if(v<=.02)continue;const q=Y*BW+X;BURN[q]=Math.min(.75,Math.max(BURN[q],v*(.7+.3*hh(X,Y,sd+1))))}fxDirty=true}
function embers(x,y,n,blue){for(let i=0;i<n&&parts.length<1500;i++){const a=Math.random()*6.283,s=1+Math.random()*5,c=blue&&Math.random()<.4?rgb(170,220,255):Math.random()<.5?rgb(255,214,120):rgb(255,140,50),e=120+(Math.random()*200|0);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,c,c0:c,em:e,em0:e})}}
function shatter(b){sfx('crash');for(let i=0;i<4;i++)dab(TF,b.x+(Math.random()-.5)*14,b.y+(Math.random()-.5)*14,2,4);dab(TF,b.x,b.y,2.6,6);dab(SF,b.x,b.y-4,1.6,9);
 for(let i=0;i<24;i++)spark(b.x,b.y,Math.random()<.5?C.clay:C.clayD,0,0,3);remove(b)}

// held weapons
const HOFF={grenade:9,bomb:9,sspear:10,spear:10,sword:7,musket:8,blunder:7,pistol:6,crossbow:9,rod:8,shield:9};
const sideOf=b=>b.held&&b.held.k==='shield'?0:5*(b.side||1);
function heldPix(b){const a=b.ang,k=b.held.k,sd=sideOf(b),wd=Math.round((b.wind||0)*9+(b.cock>0?4*Math.sin(Math.PI*b.cock/14):0));const fl=rodFill(b.held),ht=Math.round((b.held.heat||0)*48)/48;if(!b.hc||b.hc.a!==a||b.hc.k!==k||b.hc.sd!==sd||b.hc.wd!==wd||b.hc.fl!==fl||b.hc.ht!==ht){const o=HOFF[k]-wd,c=Math.cos(a),s=Math.sin(a),ox=Math.round(c*o-s*sd),oy=Math.round(s*o+c*sd);b.hc={a,k,sd,wd,fl,ht,px:shape(k,a,fl,ht).map((p,i)=>[p[0]+ox,p[1]+oy,b.held.spent||k==='sspear'&&!(b.held.ammo>0)?spentCol(p[2]):p[2],i])}}
 const bx=Math.round(b.x),by=Math.round(b.y),dm=b.held.dmg;return b.hc.px.filter(p=>!dm||!(dm[p[3]]>=7)).map(p=>[bx+p[0],by+p[1],dm&&dm[p[3]]?mul(p[2],1-dm[p[3]]*.06):p[2],p[3]])}
function tipOf(b){if(b.type==='weapon'){const c=Math.cos(b.ang),s=Math.sin(b.ang),f=WP[b.kind].tip;return[b.x+c*f,b.y+s*f]}const k=b.held.k,a=b.ang,c=Math.cos(a),s=Math.sin(a),f=HOFF[k]+WP[k].tip;const sd=sideOf(b);return[b.x+c*f-s*sd,b.y+s*f+c*sd]}
function shieldAt(o,pts){if(!o.held||o.held.k!=='shield')return false;const hp=heldPix(o);return pts.some(([X,Y])=>hp.some(q=>q[0]===X&&q[1]===Y))}
function melee(b){if(!b.held||!WP[b.held.k].melee||b.status==='dead')return;const t=tipOf(b),pv=b.tp||t;b.tp=t;const mx=t[0]-pv[0],my=t[1]-pv[1],v=Math.hypot(mx,my);if(v<3.2)return;
 const k=b.held.k,c=Math.cos(b.ang),s=Math.sin(b.ang),along=Math.abs(mx*c+my*s)/v,blade=heldPix(b).filter(p=>(p[0]-b.x)*c+(p[1]-b.y)*s>(k==='spear'||k==='sspear'?14:8));
 for(const o of bodies){if(o===b||o.type==='weapon'||o.type==='slab'||o.status==='dead'||(b.nat&&o.nat===b.nat)||Math.abs(o.x-b.x)>48||Math.abs(o.y-b.y)>48)continue;if(o.cool&&o.cool>tick)continue;
  if(o.type==='token'&&shieldAt(o,blade.slice(-4))){o.cool=tick+10;const dm=o.held.dmg||(o.held.dmg={});const q=heldPix(o)[0];if(q)dm[q[3]]=(dm[q[3]]||0)+1;sfx('clink');o.vx+=Math.cos(b.ang)*v*.08;o.vy+=Math.sin(b.ang)*v*.08;continue}
  const ox=Math.round(o.x),oy=Math.round(o.y),ov=blade.filter(p=>o.set.has(K(p[0]-ox,p[1]-oy)));if(!ov.length)continue;o.cool=tick+10;
  if(along>.7){const r=pierce(o,t[0],t[1],c,s,v*(k==='sword'?.8:1.1),1);if(r.blood){dab(FX.blood,r.x,r.y,.7,3);sfx('squish')}else sfx('clink');o.vx+=c*v*.15/o.mass;o.vy+=s*v*.15/o.mass;
   if(r.stop&&(r.p[7]==='h'||r.p[7]==='k'||r.p[7]==='c')&&Math.random()<.3){const w=weapon(k,0,0,b.ang);w.x=r.x-c*WP[k].tip;w.y=r.y-s*WP[k].tip;w.att={id:o.id,dx:w.x-o.x,dy:w.y-o.y};w.stuck=true;consume(b);if(k==='sspear')armSpear(w,o,r.p)}
   settle(o)}
  else{sfx('clink');o.vx+=(mx/v)*.4/o.mass;o.vy+=(my/v)*.4/o.mass}}
 for(const[X,Y]of blade.slice(-3)){const m=matAt(X,Y);if(m&&Math.random()<(m===1?.08:m===2?.3:.04)){damagePixel(X,Y,1);sfx(m===3?'clink':m===1?'crack':'thunk')}}}
const TIPA=rgb(140,205,255),TIPB=rgb(230,245,255),TIPC=rgb(90,150,220);
const spentCol=c=>c===TIPA?C.iron:c===TIPB?C.ironH:c===TIPC?mul(C.iron,.72):c;
function spend(b){b.spent=true;for(const p of b.px)p[2]=spentCol(p[2])}
function armSpear(b,o,p,mx){return;if(b.spent)return;let metal=false,back=false;
 if(o){const u=UNITS[o.unit];if(o.kind==='crate')metal=!!o.metal;else if(o.type==='token'&&u&&u.arm>=2&&!u.leather){metal=true;back=Math.cos(b.ang-(o.ang||0))>.5}}
 else metal=mx===3;
 if(!metal){b.fizz=90;spend(b);sfx('zap');return}
 sfx('zap');if(back&&o.type==='token'){const[x,y]=spearTip(b);arcHit(x,y);obliterate(o);return}
 b.timer0=b.timer=110+Math.random()*60|0;b.snd=hum(b.timer/60)}
let zaps=[];
const isVol=o=>o.kind==='grenade'||o.kind==='bomb';
function primeNear(x,y,r){for(const o of bodies)if(isVol(o)&&!o.fuse&&Math.hypot(o.x-x,o.y-y)<r)o.fuse=4+(Math.random()*10|0)}
function arcWeld(x,y,rad,pw){const a=Math.random()*6.283,r=1+Math.random()*rad,X=Math.round(x+Math.cos(a)*r),Y=Math.round(y+Math.sin(a)*r);if(X<1||Y<1||X>=W-1||Y>=H-1)return;const j=Y*W+X;{const v=bodyAt(X,Y,1,null,isVol);if(v){zaps.push({x0:x,y0:y,x1:X,y1:Y,l:3});detonate(v);return}}
 if(sol[j]){WH[j]=Math.min(1.1,WH[j]+.25);whOn=true;if(Math.random()<pw)damagePixel(X,Y,1)}
 else{const o=bodyAt(X,Y,0,null,q=>q.type!=='weapon'&&!q.fallen);const p=o&&o.set.get(K(X-Math.round(o.x),Y-Math.round(o.y)));if(!p||p[4]!==3)return;p[5]=Math.min(1.2,p[5]+.2);if(Math.random()<pw&&hitPix(o,X,Y,1)===2)settle(o)}
 zaps.push({x0:x,y0:y,x1:X,y1:Y,l:3});spark(X,Y,Math.random()<.5?rgb(140,200,255):rgb(230,245,255),0,0,1.4,6+(Math.random()*6|0));sfx('sizzle')}
function shieldBurst(o,b){const[x,y]=b.kind==='sspear'?spearTip(b):[b.x,b.y];sfx('sblast');sfx('zap');shake=Math.max(shake,7);
 for(const q of heldPix(o))for(let i=0;i<2;i++)spark(q[0],q[1],Math.random()<.5?rgb(140,200,255):C.iron,0,0,3.5,Math.random()<.5?14:undefined);
 o.held=null;o.hc=null;const s=Math.hypot(b.vx,b.vy)||1;o.vx+=b.vx/s*1.5;o.vy+=b.vy/s*1.5;cut(o,Math.round(x),Math.round(y),3.5,true,3);if(bodies.includes(o))for(const p of o.px)if(p[4]===3)p[5]=Math.min(1.2,p[5]+.6);arcHit(x,y);dab(SF,x,y,1,5);
 if(b.kind==='sspear'){b.vx*=.15;b.vy*=.15}else remove(b)}
function blastSlab(d,x,y,s){const R=16*s,bx=Math.round(d.x),by=Math.round(d.y);let md=1e9,hit=0;
 for(const p of [...d.px]){const X=bx+p[0],Y=by+p[1],dp=Math.hypot(X-x,Y-y);md=Math.min(md,dp);const pw=Math.round(14*(1-dp/R)*(.7+.6*Math.random()));if(pw>0&&hitPix(d,X,Y,pw)===2){hit++;if(Math.random()<.4)spark(X,Y,d.mat===2?C.wood:C.iron,x-X,y-Y,2.5)}}
 if(hit)settle(d);if(!bodies.includes(d)||d.fallen)return;if(md<10*s){for(const q of d.pair?[d,d.pair]:[d]){q.locked=false;if(!q.fallen&&q.ang===0&&q.tgt===0)q.tgt=openDir(q)}sfx('door')}}
function lockBlast(x,y,r){for(const d of bodies){if(d.type!=='slab'||!d.locked||d.fallen)continue;const Lq=swingPt(d,(d.len||16)-4.5,-((d.th||8)>>1)-.5,d.ang||0),lx=d.x+Lq[0],ly=d.y+Lq[1];if(Math.hypot(lx-x,ly-y)>r)continue;
 for(const q of d.pair?[d,d.pair]:[d]){q.locked=false;if(!q.fallen&&q.ang===0&&q.tgt===0)q.tgt=openDir(q)}for(let i=0;i<10;i++)spark(lx,ly,Math.random()<.5?rgb(214,176,70):rgb(255,226,140),0,0,2.6);sfx('door');sfx('clink')}}
function arcBlast(x,y,big=1){flash(x,y,.45,.7,1,1.4*big,4+big,.82);carve(x,y,2.6*(1+(big-1)*.6),4,0,0);lockBlast(x,y,3*big);primeNear(x,y,7*big);arcHit(x,y);if(big>1){for(const q of [...bodies])if((q.type==='token'||q.type==='part')&&Math.hypot(q.x-x,q.y-y)<6+big*4)cut(q,Math.round(x),Math.round(y),2+big,true,3);embers(x,y,12*big,true)}dab(SF,x,y,.7*big,3+big);for(let i=0;i<10*big;i++)spark(x,y,Math.random()<.5?rgb(140,200,255):rgb(255,226,140),0,0,2.6,Math.random()<.5?10:undefined);sfx('sblast');shake=Math.max(shake,3)}
function spearTip(b){const c=Math.cos(b.ang),s=Math.sin(b.ang);return[b.x+c*15,b.y+s*15]}
function arcHit(x,y){for(const o of bodies){if(o.type==='weapon'||Math.abs(o.x-x)>14||Math.abs(o.y-y)>14)continue;const ox=Math.round(o.x),oy=Math.round(o.y);for(const p of o.px)if(p[4]===3&&Math.hypot(ox+p[0]-x,oy+p[1]-y)<4)p[5]=Math.min(1.2,p[5]+.7)}
 for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){const X=Math.round(x)+i,Y=Math.round(y)+j;if(X<0||Y<0||X>=W||Y>=H)continue;const jj=Y*W+X;if(sol[jj]===1&&Math.hypot(i,j)<3.5){WH[jj]=Math.min(1.1,WH[jj]+.5);whOn=true}}
 for(let i=0;i<8;i++)spark(x,y,Math.random()<.5?rgb(140,200,255):rgb(220,240,255),0,0,2,8+(Math.random()*8|0));sfx('zap')}
function shockBlast(b){if(b.snd){b.snd.stop();b.snd=null}const[x,y]=spearTip(b),o=b.att&&byId(b.att.id);flash(x,y,.45,.7,1,2,7,.88);sfx('sblast');shake=Math.max(shake,6);carve(x,y,4,8,0,0);lockBlast(x,y,8);primeNear(x,y,16);
 if(o){const dx=o.x-x,dy=o.y-y,d=Math.hypot(dx,dy)||1;pierce(o,x,y,dx/d,dy/d,26,.6);dab(FX.blood,x,y,1,4);settle(o)}
 for(const q of [...bodies]){if(q===o||(q.type!=='token'&&q.type!=='part')||Math.hypot(q.x-x,q.y-y)>14)continue;cut(q,Math.round(x),Math.round(y),5,true,3)}
 arcHit(x,y);for(let i=0;i<44;i++)spark(x,y,[rgb(140,200,255),rgb(90,150,255),rgb(225,242,255)][i%3],0,0,4,8+(Math.random()*16|0));for(let i=0;i<10;i++)spark(x,y,rgb(150,154,162),0,0,3);embers(x,y,26,true);dab(SF,x,y,.9,4);
 for(const q of bodies){if(q===o||q===b||q.type==='weapon'||Math.hypot(q.x-x,q.y-y)>22)continue;if(q.px.some(p=>p[4]===3)){for(let i=0;i<6;i++)spark(x+(q.x-x)*i/6,y+(q.y-y)*i/6,rgb(200,230,255),0,0,.3,6);arcHit(q.x,q.y);break}}
 remove(b)}
function obliterate(o){const x=o.x,y=o.y;flash(x,y,.6,.8,1,3,14,.93);sfx('surge');shake=16;primeNear(x,y,34);scorch(x,y,56);embers(x,y,110,true);for(let i=0;i<16;i++){const a=Math.random()*6.283,L=12+Math.random()*22;for(let t=6;t<L;t+=3)dab(FX.blood,x+Math.cos(a)*t,y+Math.sin(a)*t,.3+.9*(1-t/L),1+(Math.random()*2|0))}
 for(const p of o.px){const a=Math.atan2(p[1],p[0]);spark(x+p[0],y+p[1],pcol(o,p),-Math.cos(a)*6,-Math.sin(a)*6,4)}
 dab(FX.blood,x,y,2.4,9);dab(SF,x,y,3,12);dab(SS,x,y,2,10);for(let i=0;i<9;i++){const a=Math.random()*6.283,r=6+Math.random()*22;dab(TF,x+Math.cos(a)*r,y+Math.sin(a)*r,2+Math.random()*.8,2+(Math.random()*2|0))}
 for(const q of [...bodies]){if(q===o||!bodies.includes(q))continue;const d=Math.hypot(q.x-x,q.y-y);if(q.att&&q.att.id===o.id){remove(q);continue}if(d>34)continue;
  if(q.type==='token'||q.type==='part'){for(let i=0;i<4;i++){const a=Math.random()*6.283,r=Math.random()*10;cut(q,Math.round(q.x+Math.cos(a)*r),Math.round(q.y+Math.sin(a)*r),2+Math.random()*2,true,3)}
}
  if(bodies.includes(q)&&q.type!=='slab'){const f=(34-d)*.4/(q.mass||1);q.vx+=(q.x-x)/(d||1)*f;q.vy+=(q.y-y)/(d||1)*f}}
 carve(x,y,7,2,0,0);if(o.held)o.held=null;remove(o)}
function shockTick(){for(const b of [...bodies]){if(!bodies.includes(b))continue;
  if(b.kind==='sspear'){const[x,y]=spearTip(b);{const ho=b.att&&byId(b.att.id);b.glw=b.timer>0?1-b.timer/b.timer0:0}
   if(b.fizz>0){b.fizz--;if(Math.random()<b.fizz/300)spark(x,y,rgb(140,200,255),0,0,1.2,8)}
   else if(b.timer>0){b.timer--;const pr=1-b.timer/b.timer0,o=b.att&&byId(b.att.id);if(Math.random()<.4)arcWeld(x,y,5,.03+pr*.06);if(Math.random()<.2+pr*.6)spark(x,y,Math.random()<.5?rgb(140,200,255):rgb(255,255,255),0,0,1+pr*2,8);
    for(const q of o?[o]:bodies.filter(q=>q.type==='slab'&&Math.hypot(q.x-x,q.y-y)<24)){const qx=Math.round(q.x),qy=Math.round(q.y);for(const p of q.px)if(p[4]===3&&Math.hypot(qx+p[0]-x,qy+p[1]-y)<3+pr*4)p[5]=Math.min(1.2,p[5]+.012)}
    if(b.timer===0)shockBlast(b)}
   else if(!b.spent&&!b.att&&!b.stuck&&tick%12===0&&Math.random()<.6)spark(x,y,Math.random()<.5?TIPA:TIPB,0,0,.8,6)}
  if(b.type==='token'&&b.held&&b.held.k==='sspear'&&b.held.ammo>0&&b.status==='free'&&Math.random()<.3){const t=tipOf(b);arcWeld(t[0],t[1],3,.015)}
  if(b.type==='token'&&b.held&&b.held.k==='sspear'&&b.held.ammo>0&&tick%24===0&&Math.random()<.5){const t=tipOf(b);spark(t[0],t[1],rgb(140,200,255),0,0,.8,6)}}}
function give(t,k,am,rs){const it={k,n:1,ammo:am!==undefined?am:CAP[k],res:rs||0};if(!t.inv)t.inv=[];while(t.inv.length<6)t.inv.push(null);let i=slotFor(t,k);if(i<0)i=SEC.has(k)&&slotOK(t,1)?1:CAP[k]||WP[k].melee?0:GREN.has(k)?2:k==='bomb'?3:4;t.inv[i]=it;t.si=i;t.held=it;t.hc=null;sfx('flick')}
function dropHeld(t){const w=weapon(t.held.k,t.x+Math.cos(t.ang)*14,t.y+Math.sin(t.ang)*14,t.ang);w.ghost=!!solidHits(w,0,0);w.noPick=tick+120;w.ammo=t.held.ammo;w.res=t.held.res;reshape(w,w.ang);if(t.held.spent)spend(w);consume(t)}

// physics
let shake=0;
const MCOST={1:6,2:1.6,3:7};
function impact(b,h,axis){const s=Math.hypot(b.vx,b.vy),dx=b.vx/(s||1),dy=b.vy/(s||1);let cx=0,cy=0,mx=0;for(const[X,Y]of h){cx+=X;cy+=Y;mx=Math.max(mx,matAt(X,Y))}cx/=h.length;cy/=h.length;
 if(b.knock>0&&b.type!=='weapon'){pinTo(b,cx,cy,mx);return true}
 const bounce=k=>{if(axis){b.vy*=-k;b.vx*=.65}else{b.vx*=-k;b.vy*=.65}};
 if(b.type==='weapon'){const w=WP[b.kind];
  if(b.kind==='arc'){arcBlast(cx,cy,b.big||1);if(mx===3){sfx('boltmetal');metalSparks(cx,cy,dx,dy,true)}remove(b);return true}if(w.rod)return rodWall(b,h,axis,mx,cx,cy,dx,dy);if(w.bullet){const cos=Math.abs(axis?dy:dx);
   if((mx===1||mx===3)&&cos<.45){bounce(.6);hitFx(cx,cy,mx,dx,dy);sfx(mx===3?'rico':'ricos');return true}
   let E=b.E||0;for(const[X,Y]of h){const eff=(MCOST[mx]||6)/Math.max(cos,.35);if(E>=eff){E-=eff;damagePixel(X,Y,99,dx,dy)}else{damagePixel(X,Y,1,dx,dy);E=0}}
   hitFx(cx,cy,mx,dx,dy);if(b.kind==='arc')arcHit(cx,cy);b.E=E;if(E<=.01){remove(b)}return true}
  if(b.kind==='sspear'&&b.live){lancerBlast(b);return true}
  if(w.sharp){const cosn=Math.abs(axis?dy:dx);
   if(cosn<.4&&s>2){if(axis){b.vy*=-.35;b.vx*=.75}else{b.vx*=-.35;b.vy*=.75}b.tang=Math.atan2(b.vy,b.vx);damagePixel(h[0][0],h[0][1],1,dx,dy);if(mx===3)metalSparks(cx,cy,dx,dy,b.kind==='sspear'&&!b.spent);else hitFx(cx,cy,mx,dx,dy);sfx(mx===3?'rico':'crack');return true}
   if((s>3&&mx!==3)||s>(b.kind==='sspear'?8:16)){for(const[X,Y]of h)damagePixel(X,Y,1,dx,dy);const pen=Math.min(b.kind==='sspear'?12:9,s*.45*(mx===2?1.2:mx===3?.3:.35)*(b.kind==='sspear'?1.4:1))*Math.max(.4,cosn),ca=Math.cos(b.ang),sa=Math.sin(b.ang);b.x+=ca*pen;b.y+=sa*pen;b.vx=b.vy=0;b.stuck=true;b.tang=undefined;
    if(mx===1){for(let i=0;i<Math.min(12,s*.6);i++)spark(cx,cy,scol[Math.round(cy)*W+Math.round(cx)]||rgb(140,136,128),dx,dy,2.4);sfx('crack')}else sfx(mx===3?'clink':'thunk');return true}
   if(s>3)for(const[X,Y]of h)damagePixel(X,Y,1,dx,dy);bounce(.3);sfx(mx===3?'rico':'crack');return true}
  if(b.kind==='cannon'){carve(cx,cy,Math.min(10,s*.7),3,dx,dy);sfx('boom');shake=Math.max(shake,5);if(s<3.5){bounce(.2);return true}b.vx*=.55;b.vy*=.55;return true}
  if(b.kind==='pot'){shatter(b);return true}
  if(s>1.5)sfx('clink');bounce(.4);return true}
 if(s>2.5){carve(cx,cy,Math.min(5,s*.3),1,dx,dy);cut(b,Math.round(cx-dx),Math.round(cy-dy),Math.min(5,s*.3),true);sfx('thunk');if(!bodies.includes(b))return true;
  if(s>9&&mx!==3){const pen=Math.min(5,s*.3);b.x+=dx*pen;b.y+=dy*pen;b.vx=b.vy=0;b.stuck=true;return true}bounce(.35);return true}
 if(axis)b.vy=0;else b.vx=0;return true}
function hitFx(x,y,m,dx,dy){if(m===3){for(let i=0;i<6;i++)spark(x,y,Math.random()<.5?rgb(255,226,140):rgb(255,170,70),-dx*3,-dy*3,2,6+(Math.random()*8|0));sfx('clink')}
 else if(m===2){for(let i=0;i<5;i++)spark(x,y,Math.random()<.5?C.wood:C.woodH,-dx*2,-dy*2,1.8);sfx('thunk')}
 else{dab(SF,x-dx*2,y-dy*2,.6,2);for(let i=0;i<4;i++)spark(x,y,rgb(150,146,138),-dx*2,-dy*2,1.6);sfx('dust')}}
const FALL={ball:[120,300,.6],pball:[50,170,.45],pel:[24,140,.2]};
function fall(b){const F=FALL[b.kind];if(!F||b.sx===undefined)return 1;const d=Math.hypot(b.x-b.sx,b.y-b.sy);if(b.kind==='pel'&&d<26)return 1.8;return d<=F[0]?1:Math.max(F[2],1-(1-F[2])*(d-F[0])/(F[1]-F[0]))}
// rods
const HOTD=150;
const rodHot=b=>b.hot&&(b.dist||0)<(b.hotd||HOTD)&&!b.stuck;
function rodPx(b,a){b.ang=a;b.px=shape('rodp',a,b.salvo?2:1);mkSet(b);for(const p of b.px)p[5]=(b.glw||0)*1.2}
function rodHeat(b){b.glw=b.hot?Math.min(1,Math.max(0,1.3-(b.dist||0)/(b.hotd||HOTD))):0;for(const p of b.px)p[5]=b.glw*1.2}
function heatTick(){const ch=charge?new Set(armed()):null;
 for(const b of [...bodies]){if(b.type!=='token'||!b.held||!bodies.includes(b))continue;const h=b.held,k=h.k;if(k!=='rod')continue;
  const on=ch&&ch.has(b)&&b.status==='free'&&(h.ammo??CAP[k])>0;
  if(!on){if(h.heat>0)h.heat=Math.max(0,h.heat-1/240);continue}
  const u=UNITS[b.unit],t=tipOf(b);if(!(b.unit==='guard'||b.unit==='shock'||b.unit==='cmd')){h.heat=0;continue}
  h.heat=(h.heat||0)+1/210;
  if(h.heat>1&&(Math.random()<(h.heat-1)*.035||h.heat>1.4)){overcharge(b);continue}
  if(Math.random()<h.heat*.25)spark(t[0],t[1],k==='rod'?(h.heat>.95?rgb(255,250,236):rgb(255,170,70)):(Math.random()<.5?TIPA:TIPB),0,0,.6+h.heat,6);
  if(h.heat>.3&&tick%(h.heat>1?5:16)===0)sfx(k==='rod'?'sizzle':'zap');if(h.heat>1)shake=Math.max(shake,(h.heat-1)*6)}}
function overcharge(b){const h=b.held,t=tipOf(b),c=Math.cos(b.ang),s=Math.sin(b.ang),sd=sideOf(b),gx=b.x+c*6-s*sd,gy=b.y+s*6+c*sd;
 if(h.k==='sspear'){h.heat=0;h.ammo=0;h.mode='throw';h.spent=true;b.hc=null;arcBlast(t[0],t[1],3);cut(b,Math.round(gx),Math.round(gy),3,true,3);settle(b);return}
 flash(gx,gy,1,.6,.3,3,8,.86);embers(gx,gy,60);for(let i=0;i<50;i++)spark(gx,gy,i<10?rgb(255,250,236):Math.random()<.5?rgb(255,200,90):rgb(255,120,40),0,0,4,8+(Math.random()*16|0));
 emberPatch(gx,gy,18,12);scorch(gx,gy,16);dab(SS,gx,gy,3,8);sfx('crash');sfx('boom');shake=Math.max(shake,12);
 for(let i=0;i<(h.ammo||0);i++){const r=weapon('rodp',gx+(Math.random()-.5)*16,gy+(Math.random()-.5)*16,Math.random()*6.283);r.stuck=true;r.glw=1;for(const p of r.px)p[5]=1.2}
 for(let i=0;i<4;i++)cut(b,Math.round(gx+(Math.random()-.5)*5),Math.round(gy+(Math.random()-.5)*5),3.5,true,3);ignite(b,Math.atan2(gy-b.y,gx-b.x),.8,2.5);b.burn=Math.max(b.burn||0,.8);b.vx-=c*3;b.vy-=s*3;
 consume(b);b.hc=null;if(bodies.includes(b))settle(b)}
function rodTick(){heatTick();for(const b of bodies){if(b.kind==='rodp'){if(b.stuck){if(b.glw>0){b.glw=Math.max(0,b.glw-.0012-b.glw*.004);for(const p of b.px)p[5]=b.glw*1.2;if(Math.random()<b.glw*.3){const X=b.x>>1,Y=b.y>>1;if(X>=0&&Y>=0&&X<BW&&Y<BH){ST[Y*BW+X]+=.8;fxDirty=true}}}}else{{const f=Math.max(.3,1-Math.max(0,(b.dist||0)-90)/360);b.E*=f/(b.fl||1);b.fl=f}rodHeat(b);if(b.glw>.05&&b.lx!==undefined){const L=Math.hypot(b.x-b.lx,b.y-b.ly);for(let i=0;i<=L;i++){const X=(b.lx+(b.x-b.lx)*i/(L||1))/2|0,Y=(b.ly+(b.y-b.ly)*i/(L||1))/2|0;if(X<0||Y<0||X>=BW||Y>=BH)continue;const q=Y*BW+X;BURN[q]=Math.min(.75,Math.max(BURN[q],.55*b.glw))}for(let i=0;i<=L;i+=6){const k=Math.max(0,1-((b.dist||0)-L+i)/(HOTD*1.2));if(k>.05)dab(SS,b.lx+(b.x-b.lx)*i/(L||1),b.ly+(b.y-b.ly)*i/(L||1),.4+1.6*k,Math.max(1,Math.round(1+3*k)))}fxDirty=true}b.lx=b.x;b.ly=b.y;if(b.glw>.3&&Math.random()<.6)spark(b.x-b.vx*.3,b.y-b.vy*.3,Math.random()<.5?rgb(255,200,110):rgb(255,140,50),0,0,.5,4)}}
 if(b.knock>0)b.knock--;if(b.pinned){if(!b.stuck)b.pinned=false;else if(b.status!=='dead'&&--b.pinT<=0)unpin(b)}}}
function rodWall(b,h,axis,mx,cx,cy,dx,dy){const cos=Math.abs(axis?dy:dx);
 if(rodHot(b)&&b.E>0){if(!b.lw||Math.hypot(cx-b.lw[0],cy-b.lw[1])>4){emberPatch(cx-dx*6,cy-dy*6,8,6);debris(cx-dx*2,cy-dy*2,scol[Math.round(cy)*W+Math.round(cx)]||rgb(130,126,118),6,-dx,-dy);scorch(cx-dx*2,cy-dy*2,6);dab(SS,cx-dx*6,cy-dy*6,3,8);dab(ST,cx-dx*4,cy-dy*4,1.6,4)}b.lw=[cx,cy];if(b.wb===undefined)b.wb=(16+Math.round(16*(.2+Math.random()*.2)))*(b.salvo?2:1);
  if(--b.wb<0){emberPatch(cx-dx*6,cy-dy*6,12,8);dab(SS,cx-dx*5,cy-dy*5,3.2,9);dab(ST,cx-dx*3,cy-dy*3,2,5);b.hot=0;b.vx=b.vy=0;b.stuck=true;b.x+=dx*2;b.y+=dy*2;for(let i=0;i<8;i++)spark(cx,cy,Math.random()<.5?rgb(255,226,150):rgb(255,140,50),-dx*2,-dy*2,2,8+(Math.random()*8|0));sfx('sizzle');sfx('crack');return true}
  for(const[X,Y]of h)for(const[i,j]of[[0,0],[-dy,dx]]){const x=Math.round(X+i),y=Math.round(Y+j);damagePixel(x,y,99,dx,dy);for(let v=-1;v<=1;v++)for(let u=-1;u<=1;u++){const q=(y+v)*W+x+u;if(x+u>0&&y+v>0&&x+u<W&&y+v<H&&sol[q]){WH[q]=Math.min(1.1,WH[q]+.4);whOn=true}}}
  b.E-=mx===3?.6:.3;if(Math.random()<.5)spark(cx,cy,Math.random()<.5?rgb(255,226,150):rgb(255,140,50),-dx*1.5,-dy*1.5,1.8,8+(Math.random()*8|0));if(Math.random()<.2)sfx('sizzle');return true}
 if((mx===1||mx===3)&&cos<.4){if(axis){b.vy*=-.8;b.vx*=.9}else{b.vx*=-.8;b.vy*=.9}b.x-=dx*2;b.y-=dy*2;rodPx(b,Math.atan2(b.vy,b.vx));b.E*=.75;sfx(mx===3?'rico':'ricos');dab(SF,cx,cy,1.4,4);for(let i=0;i<8;i++)spark(cx,cy,Math.random()<.5?rgb(255,226,140):rgb(255,170,70),-dx*2,-dy*2,2.2,6+(Math.random()*8|0));sfx('rico');return true}
 for(const[X,Y]of h){const eff=(mx===3?4.5:mx===2?.6:2.5)/Math.max(cos,.4);if(b.E>=eff){b.E-=eff;damagePixel(X,Y,99,dx,dy)}else{damagePixel(X,Y,2,dx,dy);b.E=0}}
 if(mx===3){const sl=slabG[Math.round(cy)*W+Math.round(cx)]&&byId(slabG[Math.round(cy)*W+Math.round(cx)]);if(sl)heatAt(sl,cx,cy,3,.8);if(Math.random()<.3)emberPatch(cx-dx*5,cy-dy*5,7,5);metalSparks(cx,cy,dx,dy,false);if(!b.mchk){b.mchk=1;if(Math.random()<.1){rodBurst(cx-dx*2,cy-dy*2);remove(b);return true}}}
 hitFx(cx,cy,mx,dx,dy);if(!b.lw||Math.hypot(cx-b.lw[0],cy-b.lw[1])>4){debris(cx-dx*2,cy-dy*2,mx===3?rgb(120,124,132):mx===2?C.wood:scol[Math.round(cy)*W+Math.round(cx)]||rgb(130,126,118),mx===3?6:16,-dx,-dy);dab(SF,cx-dx*4,cy-dy*4,mx===3?1.4:2.6,mx===3?4:6);if(mx!==3)for(let i=0;i<6;i++)spark(cx,cy,scol[Math.round(cy)*W+Math.round(cx)]||rgb(150,146,138),-dx*2,-dy*2,1.8,8+(Math.random()*8|0))}b.lw=[cx,cy];if(b.E<=.01){b.vx=b.vy=0;b.stuck=true;b.x+=dx*2;b.y+=dy*2;for(let i=0;i<6;i++)spark(cx,cy,mx===3?rgb(255,220,140):scol[Math.round(cy)*W+Math.round(cx)]||rgb(150,146,138),-dx*2,-dy*2,2.2);sfx(mx===3?'clink':'crack');shake=Math.max(shake,2)}return true}
function rodBody(b,o,s){const dx=b.vx/(s||1),dy=b.vy/(s||1),u=UNITS[o.unit]||UNITS.civ;const rx0=b.x-o.x,ry0=b.y-o.y,t0=rx0*dx+ry0*dy,d=Math.min(8.3,Math.abs(rx0*dy-ry0*dx)),cos=Math.sqrt(1-(d/8.3)**2),ex=rx0-t0*dx-dx*8.3*cos,ey=ry0-t0*dy-dy*8.3*cos,nx=ex/8.3,ny=ey/8.3,hot=rodHot(b);
 const held=hot&&o.unit==='shock'&&Math.random()<.2;
 if(hot&&!held){let n=0;for(const k of b.salvo?[-2,-1,0,1,2]:[-1,0,1]){const r=pierce(o,b.x-dy*k,b.y+dx*k,dx,dy,999,1);n+=r.removed}
  if(n){scorch(b.x,b.y,3);dab(SS,b.x,b.y,2.4,7);ignite(o,Math.atan2(-dy,-dx),.5,2);o.burn=Math.max(o.burn||0,.6);emberPatch(b.x+dx*12,b.y+dy*12,6,6);dab(FX.blood,b.x+dx*8,b.y+dy*8,.4+n*.02,3);for(let i=0;i<6;i++)spark(b.x,b.y,Math.random()<.5?rgb(255,220,140):rgb(255,140,50),dx*2,dy*2,1.8,8);sfx('sizzle');sfx('squish')}
  o.vx+=dx*.8/o.mass;o.vy+=dy*.8/o.mass;settle(o);b.vx*=.94;b.vy*=.94;return false}
 if(!hot&&u.arm>=2&&cos<.6){const d=dx*nx+dy*ny,rx=dx-2*d*nx,ry=dy-2*d*ny,v=s*.8;ripArmour(o,Math.round(ex),Math.round(ey),rx,ry,b.E);debris(o.x+ex,o.y+ey,u.ac,6,rx,ry);if(!u.leather&&Math.random()<.3){ignite(o,Math.atan2(ey,ex),.4,1.5);o.burn=Math.max(o.burn||0,.4)}heatAt(o,o.x+ex,o.y+ey,3,.6);settle(o);b.vx=rx*v;b.vy=ry*v;b.E*=.7;b.x+=nx*2;b.y+=ny*2;rodPx(b,Math.atan2(ry,rx));
  metalSparks(b.x,b.y,-rx,-ry,false);sfx('rico');o.vx+=dx*.6/o.mass;o.vy+=dy*.6/o.mass;return true}
 if(!hot&&u.arm>=2&&!u.leather){heatAt(o,o.x+ex,o.y+ey,3,.7);debris(o.x+ex,o.y+ey,u.ac,8,-dx,-dy);if(Math.random()<.3){ignite(o,Math.atan2(ey,ex),.4,1.5);o.burn=Math.max(o.burn||0,.4)}metalSparks(o.x+ex,o.y+ey,dx,dy,false);if(!b.mchk){b.mchk=1;if(Math.random()<.1){rodBurst(o.x+ex,o.y+ey);o.vx+=dx*1.2/o.mass;o.vy+=dy*1.2/o.mass;remove(b);return true}}}
 const plate=!hot&&u.arm>=2&&!u.leather,caught=plate&&Math.random()>=.07;
 const r=pierce(o,b.x,b.y,dx,dy,caught?10:held?28:plate?60:b.E,1,caught?4:9);if(caught&&Math.random()<.4)ripArmour(o,Math.round(ex),Math.round(ey),-dx,-dy,b.E*.5);
 if(r.blood){dab(FX.blood,r.x,r.y,.7+r.removed*.05,3);sfx('squish')}else sfx('clink');dab(SF,r.x-dx*4,r.y-dy*4,.7,3);for(let i=0;i<4;i++)spark(r.x,r.y,rgb(255,200,120),-dx*2,-dy*2,1.6,5);
 const kb=(b.kb||4)*(b.fl||1)/o.mass*(r.stop?caught?.55:1:.4);if(caught)for(let i=0;i<8;i++)spark(r.x,r.y,Math.random()<.5?rgb(255,226,140):rgb(255,170,70),-dx*2,-dy*2,2,6+(Math.random()*8|0));o.vx+=dx*kb;o.vy+=dy*kb;o.stuck=false;shake=Math.max(shake,3);
 if(!r.stop){b.E=r.E;b.vx*=.7;b.vy*=.7;settle(o);return false}
 b.x=r.x-dx*2;b.y=r.y-dy*2;b.vx=b.vy=0;b.stuck=true;b.dir=[dx,dy];b.att={id:o.id,dx:b.x-o.x,dy:b.y-o.y};o.knock=22;o.rod=b.id;settle(o);return true}
function pinTo(b,cx,cy){const sp=Math.hypot(b.vx,b.vy);b.vx=b.vy=0;b.knock=0;crush(b,cx,cy,sp);const r=b.rod&&byId(b.rod);if(!r||!r.att||r.att.id!==b.id)return;
 b.stuck=true;b.pinned=true;b.pinT=240;r.att.dx+=r.dir[0]*4;r.att.dy+=r.dir[1]*4;dab(SF,cx,cy,.5,2);for(let i=0;i<6;i++)spark(cx,cy,rgb(150,146,138),0,0,1.6);sfx('thunk');sfx('clink');shake=Math.max(shake,3)}
const CRUSH={civ:4,home:3,rifle:2.5,cmd:2,guard:1.6,shock:1.1};
function crush(b,cx,cy,sp){if(b.type!=='token')return;let nx=cx-b.x,ny=cy-b.y;const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;const d=(CRUSH[b.unit]||2)*Math.min(1.5,.6+sp/3),u=UNITS[b.unit];let n=0;
 const sink=Math.min(4,1+sp*.6)*(u.arm>=2?.6:1);carve(cx+nx*sink*.5,cy+ny*sink*.5,3+sink,1,nx,ny);
 for(let j=-7;j<=7;j++)for(let i=-7;i<=7;i++){const X=Math.round(cx+nx*2+i),Y=Math.round(cy+ny*2+j),q=Y*W+X;if(X<1||Y<1||X>=W-1||Y>=H-1||!sol[q])continue;const r=Math.hypot(i,j);if(r>6+hh(X,Y,5)*2)continue;if(r<4+hh(X,Y,8)*3&&hh(X,Y,b.id)>.25)scol[q]=mix(scol[q],rgb(96,14,12),.55+.3*hh(X,Y,9));if(hh(X,Y,7)>.7)crk[q]=Math.min(40,crk[q]+20);solDirty=true}
 b.x+=nx*sink;b.y+=ny*sink;
 for(const p of [...b.px]){const t=p[0]*nx+p[1]*ny;if(t<8.3-d-sink)continue;if((p[7]==='a'||p[7]==='f')&&p[3]>=7&&Math.random()<.5){p[3]-=3;p[2]=mul(u.ac||p[2],.7);p[7]='x';continue}
  if(t>8.3-sink*1.6){b.set.delete(K(p[0],p[1]));n++}else{p[7]='x';p[2]=Math.random()<.6?rgb(120,18,16):rgb(70,12,10);n++}if(p[7]==='h'||p[7]==='k')b.coreHit=true}
 if(n){dab(FX.blood,b.x+nx*6,b.y+ny*6,.6+n*.04,4);for(let i=0;i<Math.min(14,n);i++)spark(b.x+nx*8,b.y+ny*8,rgb(120,18,16),-nx*1.5,-ny*1.5,1.6,10);sfx('crack');sfx('thunk');if(n>6)sfx('squish');shake=Math.max(shake,3);settle(b)}}
function debris(x,y,c,n,dx,dy){for(let i=0;i<n&&parts.length<1500;i++){const a=Math.atan2(dy,dx)+(Math.random()-.5)*2.2,v=1+Math.random()*3.2;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c:mul(c,.75+Math.random()*.4)})}}
function emberPatch(x,y,n,r){for(let i=0;i<n&&parts.length<1500;i++){const a=Math.random()*6.283,d=Math.random()*r,X=Math.round(x+Math.cos(a)*d),Y=Math.round(y+Math.sin(a)*d);if(X<0||Y<0||X>=W||Y>=H||sol[Y*W+X])continue;const c=Math.random()<.3?rgb(255,214,120):Math.random()<.6?rgb(255,140,50):rgb(210,70,24),e=300+(Math.random()*600|0);parts.push({x:X,y:Y,vx:0,vy:0,c,c0:c,em:e,em0:e})}}
function metalSparks(x,y,dx,dy,blue){flash(x,y,blue?.6:1,.82,blue?1:.5,1.2,3,.7);for(let i=0;i<28&&parts.length<1500;i++){const c=i<6?rgb(255,255,255):blue&&i%2?rgb(150,210,255):Math.random()<.5?rgb(255,226,140):rgb(255,170,70);spark(x,y,c,-dx*2.6,-dy*2.6,3.4,6+(Math.random()*12|0))}embers(x,y,8,blue)}
function lancerBlast(b){const[x,y]=spearTip(b),n=Math.min(4,b.ammo||1);b.live=false;arcBlast(x,y,1+n*.5);metalSparks(x,y,0,0,true);for(const q of [...bodies])if((q.type==='token'||q.type==='part')&&bodies.includes(q)&&Math.hypot(q.x-x,q.y-y)<12+n*3)cut(q,Math.round(x),Math.round(y),2+n,true,3);shake=Math.max(shake,5+n);remove(b)}
function rodBurst(x,y){flash(x,y,1,.75,.35,2.4,6,.82);embers(x,y,36);for(let i=0;i<30;i++)spark(x,y,Math.random()<.3?rgb(255,246,210):Math.random()<.6?rgb(255,200,90):rgb(255,130,40),0,0,3.2,8+(Math.random()*14|0));
 scorch(x,y,12);emberPatch(x,y,16,10);dab(SF,x,y,2.2,5);sfx('crash');sfx('crack');shake=Math.max(shake,4)}
function heatAt(o,X,Y,r,h){const ox=Math.round(o.x),oy=Math.round(o.y);for(const p of o.px)if(p[4]===3&&Math.hypot(ox+p[0]-X,oy+p[1]-Y)<=r)p[5]=Math.min(1.2,p[5]+h*(1-Math.hypot(ox+p[0]-X,oy+p[1]-Y)/(r+1)))}
function ripArmour(o,ex,ey,rx,ry,E){const R=2.4+Math.random()*1.2+E/40,cp=o.px.filter(p=>(p[7]==='a'||p[7]==='f')&&Math.hypot(p[0]-ex,p[1]-ey)<=R);if(cp.length<2)return;
 for(const p of cp)o.set.delete(K(p[0],p[1]));const mx=Math.round(cp.reduce((s,p)=>s+p[0],0)/cp.length),my=Math.round(cp.reduce((s,p)=>s+p[1],0)/cp.length);
 const f={id:uid++,type:'part',parent:o.id,unit:o.unit,nat:o.nat,status:'dead',x:o.x+mx,y:o.y+my,vx:rx*2.6+mx*.15,vy:ry*2.6+my*.15,mass:cp.length/200,px:cp.map(p=>{const z=p.slice();z[0]-=mx;z[1]-=my;z[5]=.5;return z})};mkSet(f);bodies.push(f);
 o.px=o.px.filter(p=>o.set.has(K(p[0],p[1])));mkSet(o);sfx('clink')}
function unpin(b){b.pinned=false;b.stuck=false;const r=b.rod&&byId(b.rod);if(r&&r.att&&r.att.id===b.id){r.att=null;r.stuck=true}sfx('clink')}
function recoilHurt(b,c,s){const u=UNITS[b.unit];if(b.type!=='token'||!(u.arm===0||u.leather))return;const sd=Math.sign(sideOf(b))||1,px=-s*sd,py=c*sd;
 const cand=b.px.filter(p=>(p[7]==='c'||p[7]==='a')&&Math.hypot(p[0],p[1])>6.3&&p[0]*px+p[1]*py>3);for(let i=0;i<(u.arm?6:9)&&cand.length;i++){const p=cand.splice((Math.random()*cand.length)|0,1)[0];b.set.delete(K(p[0],p[1]))}
 dab(FX.blood,b.x+px*7,b.y+py*7,.35,2);sfx('squish');settle(b)}
function pierce(o,x,y,dx,dy,E,ap,maxD){const ox=Math.round(o.x),oy=Math.round(o.y);let ex=null,ey=0;
 for(let i=0;i<24&&o.set.has(K(Math.round(x)-ox,Math.round(y)-oy));i++){x-=dx;y-=dy}
 let last=null,inside=false,removed=0,blood=false,miss=0;
 for(let i=0;i<60;i++){x+=dx*.5;y+=dy*.5;const k=K(Math.round(x)-ox,Math.round(y)-oy);if(k===last)continue;last=k;const p=o.set.get(k);
  if(!p){if(inside&&++miss>3)break;continue}if(ex===null){ex=x;ey=y}if(maxD&&Math.hypot(x-ex,y-ey)>maxD)return{stop:true,p,x,y,blood,removed};inside=true;miss=0;const f=p[7]==='f'?(frontOf(o,p)?ap:1/p[3]):p[7]==='a'?ap*(o.unit==='shock'&&p[8]*Math.cos(o.ang||0)+p[9]*Math.sin(o.ang||0)<-2?.35:1):1,cost=p[3]*f*((p[7]==='a'||p[7]==='f')&&f>=ap*.9?1/Math.max(.45,Math.abs(dx*p[8]+dy*p[9])/(Math.hypot(p[8],p[9])||1)):1);
  if(E>=cost){E-=cost;o.set.delete(k);removed++;if(p[7]==='h'||p[7]==='k')o.coreHit=true;if(p[7]!=='a')blood=true}
  else{p[3]-=Math.max(1,Math.floor(E/f));if(p[3]<=0){o.set.delete(k);removed++}if(p[7]!=='a')blood=true;if(p[3]<=0&&(p[7]==='h'||p[7]==='k'))o.coreHit=true;return{stop:true,p,x,y,blood,removed}}}
 return{stop:false,E,x,y,blood,removed}}
function hitBodies(b,s){const bx=Math.round(b.x),by=Math.round(b.y);
 for(const o of bodies){if(o===b||(o.type==='weapon'&&o.kind!=='crate')||o.type==='slab'||o.status==='dead'||o.id===b.from||inDrag(o))continue;if(Math.abs(o.x-b.x)>30||Math.abs(o.y-b.y)>30)continue;if(b.vol&&o.type==='token'&&(o.nat||'-')===b.vol&&Math.hypot(o.x-b.sx,o.y-b.sy)<b.vr)continue;
  const ox=Math.round(o.x),oy=Math.round(o.y);const ov=[];for(const p of b.px){if(o.set.has(K(bx+p[0]-ox,by+p[1]-oy)))ov.push([bx+p[0],by+p[1]])}if(!ov.length)continue;
  if(b.type==='weapon'){const w=WP[b.kind];
   if(w.rod&&o.type==='token'){if(b.hit&&b.hit.has(o.id))continue;(b.hit||(b.hit=new Set())).add(o.id);if(rodBody(b,o,s))return true;continue}
   if(b.kind==='sspear'&&b.live){lancerBlast(b);return true}
   if(w.bullet||w.sharp){if(b.hit&&b.hit.has(o.id))continue;(b.hit||(b.hit=new Set())).add(o.id);
    const dx=b.vx/(s||1),dy=b.vy/(s||1),tip=w.tip||0;let E=w.bullet?b.E:(b.kind==='spear'||b.kind==='sspear'?s*.5:b.kind==='sword'?s*.4:(b.E||s*.22));const fo=w.bullet?fall(b):1;E*=fo*(b.ep||1);
    const r=pierce(o,b.x+dx*tip,b.y+dy*tip,dx,dy,E,b.ap||w.ap||1);
    if(o.kind==='crate'){for(let i=0;i<3;i++)spark(r.x,r.y,Math.random()<.5?C.wood:C.woodH,dx,dy,1.6);sfx('thunk')}else if(r.blood){dab(FX.blood,r.x,r.y,.6+r.removed*.05,3);sfx('squish')}else sfx('clink');
    o.vx+=dx*.5*b.mass/o.mass;o.vy+=dy*.5*b.mass/o.mass;
    if(b.kind==='arc'){if(!r.blood){sfx('boltmetal');metalSparks(r.x,r.y,dx,dy,true)}arcHit(r.x,r.y);cut(o,Math.round(r.x),Math.round(r.y),2*(b.big?1+b.big*.5:1),true,3);if(b.big)arcBlast(r.x,r.y,b.big)}
    if(r.stop){if(w.bullet){if(o.set.has(K(r.p[0],r.p[1])))r.p[7]=r.p[7]==='a'?'a':'o';remove(b)}else{b.att={id:o.id,dx:b.x-o.x,dy:b.y-o.y};b.vx=b.vy=0;b.stuck=true;if(b.kind==='sspear')armSpear(b,o,r.p)}settle(o);return true}
    if(w.bullet)b.E=r.E/fo;b.vx*=.8;b.vy*=.8;settle(o);continue}
   if(b.kind==='cannon'){let n=0;for(const[X,Y]of ov)if(hitPix(o,X,Y,3)===2)n++;if(n){dab(FX.blood,ov[0][0],ov[0][1],.5+n*.03,3);sfx('squish');settle(o)}if(bodies.includes(o)){o.vx+=b.vx*.2;o.vy+=b.vy*.2}continue}
   if(b.kind==='pot'){shatter(b);return true}
   if(b.kind==='grenade'||b.kind==='bomb'){b.att={id:o.id,dx:b.x-o.x,dy:b.y-o.y};b.vx=b.vy=0;b.stuck=true;sfx('thunk');return true}
   b.vx*=-.3;b.vy*=-.3;sfx('clink');return true}
  const m1=b.mass||1,m2=o.mass||1,f=m1/(m1+m2);o.vx+=b.vx*f*1.3;o.vy+=b.vy*f*1.3;o.stuck=false;b.vx*=.3;b.vy*=.3;sfx('thunk');
  if(s>6){const[X,Y]=ov[0];cut(o,X,Y,1.5,true);if(bodies.includes(b))cut(b,X,Y,1.2,true)}return true}
 return false}
function step(b){if(b.type==='slab'||b.hidden||inDrag(b))return;
 if(b.att){const o=byId(b.att.id);if(!o){b.att=null;b.stuck=false}else{b.x=o.x+b.att.dx;b.y=o.y+b.att.dy;return}}
 if(b.glide){const dx=b.glide[0]-b.x,dy=b.glide[1]-b.y,d=Math.hypot(dx,dy);if(d<3){b.x=b.glide[0];b.y=b.glide[1];b.glide=null;b.ghost=false}else{b.x+=dx/d*3;b.y+=dy/d*3;b.mv=6}return}
 if(b.stuck)return;
 let s=Math.hypot(b.vx,b.vy);if(s<.06){b.vx=b.vy=0;if(b.kind==='pot'&&b.thrown)shatter(b);return}
 b.mv=6;const n=Math.ceil(s);
 for(let i=0;i<n;i++){for(let axis=0;axis<2;axis++){const d=(axis?b.vy:b.vx)/n;if(!d)continue;const ox=axis?0:d,oy=axis?d:0;
   const h=b.ghost?null:solidHits(b,ox,oy);
   if(!h){b.x+=ox;b.y+=oy;if((b.range||b.thrown)&&hitVolatile(b))return;if(hitBodies(b,s)){b.x-=ox;b.y-=oy}if(!bodies.includes(b))return;continue}
   if(impact(b,h,axis)&&(b.stuck||!bodies.includes(b)))return}
  if(b.ghost&&!solidHits(b,0,0))b.ghost=false}
 if(b.tang!==undefined&&!b.stuck){const d=Math.atan2(Math.sin(b.tang-b.ang),Math.cos(b.tang-b.ang)),a0=b.ang,na=Math.abs(d)<.18?b.tang:b.ang+Math.sign(d)*.18;reshape(b,na);if(b.ghost&&solidHits(b,0,0)){reshape(b,a0);b.ghost=false;b.tang=undefined}else if(na===b.tang)b.tang=undefined}
 let fr=b.type==='weapon'?WP[b.kind].fr:.9;if(b.range){b.dist=(b.dist||0)+s;if(b.dist>b.range)fr=.72}b.vx*=fr;b.vy*=fr;
 if(b.type==='weapon'&&Math.hypot(b.vx,b.vy)<1.2&&WP[b.kind].sharp){b.vx*=.7;b.vy*=.7}}
function hitVolatile(b){if(!WP[b.kind])return false;const bx=Math.round(b.x),by=Math.round(b.y);for(const o of bodies){if(o===b||(o.kind!=='grenade'&&o.kind!=='pot'&&o.kind!=='bomb')||Math.abs(o.x-b.x)>9||Math.abs(o.y-b.y)>9)continue;const ox=Math.round(o.x),oy=Math.round(o.y);if(!b.px.some(p=>o.set.has(K(bx+p[0]-ox,by+p[1]-oy))))continue;
  if(o.kind==='grenade'){remove(b);detonate(o);return true}
  if(o.kind==='bomb'&&b.kind==='arc'){remove(b);detonate(o);return true}if(o.kind==='bomb'){if(b.hit&&b.hit.has(o.id))continue;(b.hit||(b.hit=new Set())).add(o.id);const s=Math.hypot(b.vx,b.vy)||1,dx=b.vx/s,dy=b.vy/s,w=WP[b.kind],r=pierce(o,b.x,b.y,dx,dy,w.bullet?b.E:s*.5,w.ap||1);o.px=o.px.filter(p=>o.set.has(K(p[0],p[1])));hitFx(r.x,r.y,3,dx,dy);
   if(o.coreHit){remove(b);detonate(o);return true}if(r.stop){if(w.bullet)remove(b);else{b.vx*=-.2;b.vy*=-.2}sfx('rico');return true}if(w.bullet)b.E=r.E;continue}
  shatter(o)}
 const w=WP[b.kind];if(!w.bullet&&!w.sharp)return false;
 for(const o of bodies){if(o.type!=='token'||!o.held||o.held.k!=='shield'||o.id===b.from||Math.abs(o.x-b.x)>40||Math.abs(o.y-b.y)>40||(b.vol&&(o.nat||'-')===b.vol&&Math.hypot(o.x-b.sx,o.y-b.sy)<b.vr))continue;
  const hp=heldPix(o),hit=hp.filter(q=>b.px.some(p=>bx+p[0]===q[0]&&by+p[1]===q[1]));if(!hit.length)continue;if(b.kind==='sspear'||b.kind==='arc'){shieldBurst(o,b);return true}
  const s=Math.hypot(b.vx,b.vy)||1;let E=w.bullet?b.E:s*.5;const dm=o.held.dmg||(o.held.dmg={});
  for(const q of hit){const left=7-(dm[q[3]]||0);if(E>=left){E-=left;dm[q[3]]=7}else{dm[q[3]]=(dm[q[3]]||0)+Math.max(1,Math.floor(E));E=0}}
  hitFx(b.x,b.y,3,b.vx/s,b.vy/s);o.vx+=b.vx/s*.4;o.vy+=b.vy/s*.4;
  if(E<=0){if(w.bullet)remove(b);else{b.vx*=-.25;b.vy*=-.25}sfx('rico');return true}
  if(w.bullet)b.E=E;return false}
 return false}
function stepParts(){for(const p of parts){p.x+=p.vx;p.y+=p.vy;const X=Math.round(p.x),Y=Math.round(p.y);if(X<0||Y<0||X>=W||Y>=H||sol[Y*W+X]||slabG[Y*W+X]){p.x-=p.vx;p.y-=p.vy;p.vx*=-.3;p.vy*=-.3}p.vx*=.84;p.vy*=.84;
  if(p.em!==undefined){if(Math.abs(p.vx)+Math.abs(p.vy)<.15){p.vx=p.vy=0;p.em--;p.c=mix(p.c0,rgb(56,36,28),Math.min(1,(1-p.em/p.em0)*1.15));if(p.em<=0){const X2=Math.round(p.x),Y2=Math.round(p.y);if(X2>=0&&Y2>=0&&X2<W&&Y2<H&&!sol[Y2*W+X2])floor[Y2*W+X2]=mul(floor[Y2*W+X2],.28);{const j2=Y2*W+X2+(Math.random()<.5?1:W);if(j2<N&&!sol[j2])floor[j2]=mul(floor[j2],.5)}p.dead=1}}continue}
  if(p.life!==undefined){if(--p.life<=0)p.dead=1;continue}
  if(Math.abs(p.vx)+Math.abs(p.vy)<.12){const X2=Math.round(p.x),Y2=Math.round(p.y);if(X2>=0&&Y2>=0&&X2<W&&Y2<H&&!sol[Y2*W+X2])floor[Y2*W+X2]=mul(p.c,.85);p.dead=1}}
 parts=parts.filter(p=>!p.dead)}
function cool(){for(const b of bodies)if(b.type!=='weapon')for(const p of b.px)if(p[5]>0)p[5]=Math.max(0,p[5]-1/600);if(whOn&&tick%2===0){let any=false;for(let j=0;j<N;j++)if(WH[j]>0){WH[j]=Math.max(0,WH[j]-.0007-WH[j]*.0022);any=true;if(WH[j]>.06&&Math.random()<WH[j]*.02){const X=j%W,Y=j/W|0;ST[(Y>>1)*BW+(X>>1)]+=.9;fxDirty=true}}whOn=any}}

// effects
const FXC={b0:hx('#5a0a0e'),b1:hx('#76121a'),b2:hx('#8e161c'),b3:hx('#b8343a'),f:['#c86a26','#a8541e','#d8782a','#eea036','#f7c654','#ffe08a','#fff6c8'].map(hx)};
let tick=0,fxActive=false;
function diffuse(a,keep){const q=(1-keep)/4;for(let Y=0;Y<BH;Y++)for(let X=0;X<BW;X++){const i=Y*BW+X;TMP[i]=a[i]*keep+((X>0?a[i-1]:a[i])+(X<BW-1?a[i+1]:a[i])+(Y>0?a[i-BW]:a[i])+(Y<BH-1?a[i+BW]:a[i]))*q}a.set(TMP)}
function openMap(){for(let Y=0;Y<BH;Y++)for(let X=0;X<BW;X++){const j=Y*2*W+X*2;OPEN[Y*BW+X]=(!sol[j]&&!slabG[j])?1:0}}
function room(px,py,amt){openMap();const s=(Math.floor(py)>>1)*BW+(Math.floor(px)>>1);if(s<0||s>=NB||!OPEN[s])return;const R=30,dist=new Int16Array(NB).fill(-1),q=[s];dist[s]=0;let h=0;
 while(h<q.length){const i=q[h++],d=dist[i];HZ[i]=Math.min(.5,HZ[i]+amt*1.6*(1-d/R));if(d>=R)continue;const X=i%BW;for(const n of [X>0?i-1:-1,X<BW-1?i+1:-1,i-BW,i+BW])if(n>=0&&n<NB&&dist[n]<0&&OPEN[n]){dist[n]=d+1;q.push(n)}}hzOn=true}
function plume(x,y,a,sc){const c=Math.cos(a),s=Math.sin(a),n=sc>.6?10:6;for(let i=0;i<n;i++){const d=i*3.6*(sc>.6?1:.75),j=(Math.random()-.5)*i*1.1;dab(SS,x+c*d-s*j,y+s*d+c*j,(1.9-i*.12)*sc,Math.max(2,Math.round((3+i*.5)*(sc>.6?1:.7))))}dab(SF,x,y,.8,3)}
function fxTick(){let act=false;
 for(let i=0;i<NB;i++){if(TF[i]>0){act=true;if(TF[i]>.3)BURN[i]=Math.min(.75,BURN[i]+.0016);TF[i]=Math.max(0,TF[i]-.0015)}if(SF[i]>0){act=true;SF[i]=Math.max(0,SF[i]-.012)}if(SS[i]>0){act=true;SS[i]=Math.max(0,SS[i]-.00035)}if(ST[i]>0){act=true;ST[i]=Math.max(0,ST[i]*.996-.0015)}}
 if(act&&tick%6===0)diffuse(ST,.7);
 if(act&&tick%4===0)diffuse(SF,.6);if(act&&tick%12===0)diffuse(SS,.8);fxActive=act;
 if(hzOn){let mx=0;for(let i=0;i<NB;i++){HZ[i]*=.99991;if(HZ[i]>mx)mx=HZ[i]}
  if(tick%30===0){openMap();for(let i=0;i<NB;i++){if(!OPEN[i]){TMP[i]=0;continue}const X=i%BW;let sm=0;for(const n of [X>0?i-1:-1,X<BW-1?i+1:-1,i-BW,i+BW])sm+=(n>=0&&n<NB&&OPEN[n])?HZ[n]:HZ[i];TMP[i]=HZ[i]*.6+sm*.1}HZ.set(TMP)}
  hzOn=mx>.003}}
function buildFx(){fxLow.fill(0);fxTop.fill(0);fxA.fill(0);const ph=(tick/7|0)%4;
 for(let i=0;i<NB;i++){FV[i]=Math.max(FX.fire[i],TF[i]);SV[i]=FX.smoke[i]+SF[i]+SS[i]+ST[i];DV[i]=FX.smoke[i]+SF[i]+SS[i]*.12}
 const blk=(buf,X,Y,c,al=255)=>{const j=Y*2*W+X*2;buf[j]=buf[j+1]=buf[j+W]=buf[j+W+1]=c;if(buf===fxTop)fxA[j]=fxA[j+1]=fxA[j+W]=fxA[j+W+1]=al};
 const thr=(k,X,Y)=>.3+hh(X,Y,k)*.3;const on=(a,k,X,Y)=>X>=0&&Y>=0&&X<BW&&Y<BH&&a[Y*BW+X]>thr(k,X,Y);
 let a=FX.blood;for(let Y=0;Y<BH;Y++)for(let X=0;X<BW;X++){const v=a[Y*BW+X];if(!on(a,1,X,Y))continue;if(v<.8&&hh(X,Y,3)<.28)continue;const e=!on(a,1,X+1,Y)||!on(a,1,X-1,Y)||!on(a,1,X,Y+1)||!on(a,1,X,Y-1);blk(fxLow,X,Y,e?FXC.b0:v>2.2?(hh(X,Y,8)>.94?FXC.b3:FXC.b2):FXC.b1)}
 a=FV;const fk=2+ph;for(let Y=0;Y<BH;Y++)for(let X=0;X<BW;X++){const v=a[Y*BW+X];if(v<=.05)continue;if(!on(a,fk,X,Y)){if(v>.12&&hh(X,Y,9+ph)>.88)blk(fxLow,X,Y,FXC.f[0]);continue}const e=!on(a,fk,X+1,Y)||!on(a,fk,X-1,Y)||!on(a,fk,X,Y+1)||!on(a,fk,X,Y-1);
  blk(fxLow,X,Y,e?FXC.f[1]:v<1?FXC.f[2]:v<1.6?FXC.f[3]:v<2.3?FXC.f[4]:v<3?FXC.f[5]:FXC.f[6])}
 a=SV;for(let Y=0;Y<BH;Y++)for(let X=0;X<BW;X++){const i=Y*BW+X,v=a[i];if(v<.05)continue;const j=Y*2*W+X*2;if(fxTop[j])continue;
  if(ST[i]/v>.5){const al=Math.min(.62,ST[i]*.55)*(.7+.6*hh(X,Y,33));if(al<.04)continue;blk(fxTop,X,Y,rgb(232,236,240),al*255|0);continue}
  if(SS[i]/v>.55){const al=Math.min(.68,v*.3)*(.72+.56*hh(X,Y,31));if(al<.05)continue;blk(fxTop,X,Y,mix(rgb(206,211,220),rgb(150,156,170),Math.min(1,v/5)),al*255|0);continue}
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
function drawBody(b,lift){if(b.hidden)return;if(b.kind==='arc'){const s=Math.hypot(b.vx,b.vy)||1,wd=b.big?1:0;[rgb(230,245,255),rgb(150,205,255),rgb(90,150,255),rgb(50,90,200),rgb(40,70,160)].slice(0,b.big?5:4).forEach((c,i)=>{for(let o=-wd;o<=wd;o++){const X=Math.round(b.x-b.vx/s*i-b.vy/s*o),Y=Math.round(b.y-b.vy/s*i+b.vx/s*o);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=o?mul(c,.8):c}});return}if(WP[b.kind]&&WP[b.kind].bullet&&!WP[b.kind].rod)return;const bx=Math.round(b.x),by=Math.round(b.y),st=b.status,dyn=b.type!=='weapon',hl=sel.has(b)?1.25:b===hover?1.12:1;
 const sh=lift?[3,4]:b.stuck||b.fallen||st==='dead'?null:[1,2];
 if(sh)for(const p of b.px){const X=bx+p[0]+sh[0],Y=by+p[1]+sh[1];if(X<0||Y<0||X>=W||Y>=H||b.set.has(K(p[0]+sh[0],p[1]+sh[1]))||sol[Y*W+X])continue;out[Y*W+X]=mul(out[Y*W+X],.62)}
 for(const p of b.px){const X=bx+p[0],Y=by+p[1];if(X<0||Y<0||X>=W||Y>=H||b.type==='slab'&&sol[Y*W+X])continue;let c=pcol(b,p);
  if(p[7]==='m'||p[7]==='a'||b.type==='slab'&&(b.mat===3||b.gold))c=shine(c,X,Y,UNITS[b.unit]&&UNITS[b.unit].dark?30:70);
  if(dyn){const l=!b.set.has(K(p[0]-1,p[1]))||!b.set.has(K(p[0],p[1]-1)),r=!b.set.has(K(p[0]+1,p[1]))||!b.set.has(K(p[0],p[1]+1));if(b.type==='slab'){if(r)c=mul(c,.5);else if(l)c=mul(c,.8);else if(!b.set.has(K(p[0]-2,p[1]))||!b.set.has(K(p[0],p[1]-2)))c=mul(c,1.22);else if(!b.set.has(K(p[0]+2,p[1]))||!b.set.has(K(p[0],p[1]+2)))c=mul(c,.82)}else if(l||r)c=mul(c,.36)}
  if(b.kind==='sspear'&&b.glw>.01){const g=b.glw,f=.5+.5*Math.sin(tick*(.15+g*.9)+p[8]*.35);c=mix(c,g<.6?rgb(80,140,255):mix(rgb(80,140,255),rgb(235,245,255),(g-.6)/.4),Math.min(1,.25+g*1.1)*(.7+.3*f))}
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
function rebuildSH(){rebuildDS();for(let Y=0,j=0;Y<H;Y++)for(let X=0;X<W;X++,j++){let k=0;if(!sol[j]){if(isS(X,Y-1)||isS(X-1,Y))k=1;else if(isS(X,Y-2)||isS(X-2,Y)||isS(X-1,Y-1))k=2}else{if(!isS(X,Y-1)||!isS(X,Y+1)||!isS(X-1,Y)||!isS(X+1,Y))k=1;else if(!isS(X,Y-2)||!isS(X-2,Y))k=2;else if(!isS(X,Y+2)||!isS(X+2,Y))k=3}SH[j]=k}}
function render(){
 if(solDirty&&tick-solT>=3){rebuildSH();solDirty=false;solT=tick}
 sheenFrame();for(let Y=0,j=0;Y<H;Y++){const bro=(Y>>1)*BW;for(let X=0;X<W;X++,j++){if(sol[j])continue;let c=floor[j];if(OBJ[j])c=OBJC[j];else if(j>2*W&&OBJ[j-2*W-1])c=mul(c,.6);if(SHN[j])c=shine(c,X,Y,SHN[j]);const bu=BURN[bro+(X>>1)];if(bu>.02&&bu>hh(X,Y,13)*.45)c=mul(c,1-.8*bu);const k=SH[j];if(k)c=mul(c,k===1?.66:.82);out[j]=c}}
 if(fxDirty||(fxActive&&tick%3===0)||(tick%7===0&&FX.fire.some(v=>v>.3)))buildFx();
 for(let q=0;q<NB;q++){const j0=((q/BW|0)*2)*W+(q%BW)*2;if(!fxLow[j0])continue;const f=fxLow[j0];for(const j of [j0,j0+1,j0+W,j0+W+1])if(!sol[j])out[j]=f}
 if(moveSel)for(const ci of moveSel.cells){const cx=ci%CW,cy=ci/CW|0;for(let y=1;y<T-1;y++)for(let x=1;x<T-1;x++){const j=(cy*T+y)*W+cx*T+x;out[j]=(x>=7&&x<=8&&y>=7&&y<=8)?mix(out[j],rgb(255,255,255),.6):mul(out[j],.68)}}
 for(const b of bodies)if((b.stuck&&!b.att)||b.fallen)drawBody(b);
 for(let Y=0,j=0;Y<H;Y++)for(let X=0;X<W;X++,j++){if(!sol[j])continue;let c=scol[j];const k=NOD[j]?0:SH[j];if(k===1)c=mul(c,.5);else if(k===2)c=mul(c,1.1);if(!NOD[j])c=mul(c,DF[Math.min(9,DS[j])]);if(SHN[j]&&(DS[j]<4||NOD[j]))c=shine(c,X,Y,SHN[j]);if(whOn&&WH[j]>.01)c=mix(c,glow(WH[j]),Math.min(.9,WH[j]*1.4));out[j]=c}
 for(const b of bodies)if(b.type==='slab'&&!b.fallen&&!inDrag(b))drawBody(b);
 for(const b of bodies)if(!b.stuck&&b.type!=='slab'&&!inDrag(b)&&b.status==='dead')drawBody(b);for(const b of bodies)if(!b.stuck&&b.type!=='slab'&&!inDrag(b)&&b.status!=='dead')drawBody(b);
 for(const b of bodies)if(b.att)drawBody(b);
 for(const b of bodies){if(!(b.burn>.04)||(b.type!=='token'&&b.type!=='part'))continue;const bx=Math.round(b.x),by=Math.round(b.y),B=Math.min(1.5,b.burn);
  for(const p of b.px){if(!inZone(b,p))continue;const r2=p[0]*p[0]+p[1]*p[1],X0=bx+p[0],Y0=by+p[1];const v=Math.sin(p[0]*.9+tick*.13+b.id)*Math.sin(p[1]*.8-tick*.11)+Math.sin((p[0]+p[1])*.5+tick*.07),f=v*.5+.5;
   if(f<1.15-B*.55)continue;if(X0>=0&&Y0>=0&&X0<W&&Y0<H){const j=Y0*W+X0;out[j]=mix(out[j],f>1.05?rgb(255,214,120):f>.9?rgb(250,152,46):f>.75?rgb(224,96,26):rgb(150,38,14),Math.min(.85,.35+B*.4))}
   if(r2<40||hh(p[0]+b.id,p[1],71)>B*.35)continue;const rr=Math.sqrt(r2),ux=p[0]/rr,uy=p[1]/rr,h=Math.round((1+B*2.2)*f);
   for(let k=1;k<=h;k++){const X=Math.round(X0+ux*k),Y=Math.round(Y0+uy*k);if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;out[j]=mix(out[j],k/h<.5?rgb(236,112,28):rgb(255,190,80),(1-k/(h+1))*.75)}}}
 const hot=p=>p.life!==undefined||(p.em!==undefined&&p.em/p.em0>.2);
 for(const p of parts){if(hot(p))continue;const X=Math.round(p.x),Y=Math.round(p.y);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=p.c}
 for(const z of zaps){const n=Math.max(1,Math.ceil(Math.hypot(z.x1-z.x0,z.y1-z.y0)));for(let i=0;i<=n;i++){const X=Math.round(z.x0+(z.x1-z.x0)*i/n+(i&&i<n?(Math.random()-.5)*1.6:0)),Y=Math.round(z.y0+(z.y1-z.y0)*i/n+(i&&i<n?(Math.random()-.5)*1.6:0));if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=i%2?rgb(150,210,255):rgb(235,248,255)}}zaps=zaps.filter(z=>--z.l>0);
 if(drag)for(const b of drag.group)if(bodies.includes(b))drawBody(b,true);
 for(let q=0;q<NB;q++){const j0=((q/BW|0)*2)*W+(q%BW)*2;if(fxTop[j0]){const al=fxA[j0],f=fxTop[j0];for(const j of [j0,j0+1,j0+W,j0+W+1])out[j]=al>=255?f:mix(out[j],f,al/255);continue}const v=SV[q];if(v>.04){const a=Math.min(.42,v*.5);for(const j of [j0,j0+1,j0+W,j0+W+1])out[j]=mix(out[j],HAZE,a)}}
 for(const p of parts){if(!hot(p))continue;const X=Math.round(p.x),Y=Math.round(p.y);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=p.em!==undefined&&!p.vx&&Math.random()<.15?mul(p.c,1.25):p.c}
 if(hzOn)veil();
 lightPass();
 if(box){const x0=Math.round(Math.min(box.x0,box.x1)),x1=Math.round(Math.max(box.x0,box.x1)),y0=Math.round(Math.min(box.y0,box.y1)),y1=Math.round(Math.max(box.y0,box.y1)),c=rgb(242,239,230);
  for(let x=x0;x<=x1;x++)if(x%2===0){if(y0>=0&&y0<H)out[y0*W+x]=c;if(y1>=0&&y1<H)out[y1*W+x]=c}for(let y=y0;y<=y1;y++)if(y%2===0){if(x0>=0&&x0<W)out[y*W+x0]=c;if(x1>=0&&x1<W)out[y*W+x1]=c}}
 if(cellDrag&&moveSel){const k=(mouse.y/T|0)*CW+(mouse.x/T|0);if(moveSel.cells.has(k)){const cx=k%CW,cy=k/CW|0;for(let y=1;y<T-1;y++)for(let x=1;x<T-1;x++)if(x===1||y===1||x===T-2||y===T-2)out[(cy*T+y)*W+cx*T+x]=rgb(242,239,230)}}
 {const ch=!panKey&&!pan&&tool==='move'&&mouse.in&&!drag&&armed().length>0;if(ch)crosshair();const cc=pan?'grabbing':panKey?'grab':ch?'none':tool==='move'?'default':'crosshair';if(cv.style.cursor!==cc)cv.style.cursor=cc}
 ctx.putImageData(img,0,0);
 for(const b of bodies){if(b.mv>0)b.mv--;if(b.lab){b.lab.style.left=(Math.round(b.x)+.5)*S+'px';b.lab.style.top=(Math.round(b.y)+10)*S+'px';b.lab.style.color=natLabel(b);b.lab.style.zIndex=b.status==='dead'?0:1}}
 stage.style.transform=shake>0?`translate(${(Math.random()-.5)*shake}px,${(Math.random()-.5)*shake}px)`:'';if(shake>0)shake--}
function veil(){const G=24,gw=(W/G|0)+3,gh=(H/G|0)+3,ox=tick/500,fx0=Math.floor(ox),fr=ox-fx0,g=new Float32Array(gw*gh);for(let y=0;y<gh;y++)for(let x=0;x<gw;x++)g[y*gw+x]=hh(x+fx0,y,77);
 for(let Y=0;Y<H;Y++){const gy=Y/G,y0=gy|0,ty=gy-y0;for(let X=0;X<W;X++){const h=HZ[(Y>>1)*BW+(X>>1)];if(h<.003)continue;const gx=X/G+fr,x0=gx|0,tx=gx-x0;
  const n=(g[y0*gw+x0]*(1-tx)+g[y0*gw+x0+1]*tx)*(1-ty)+(g[(y0+1)*gw+x0]*(1-tx)+g[(y0+1)*gw+x0+1]*tx)*ty;const j=Y*W+X;out[j]=mix(out[j],VEIL,Math.min(.4,h)*(.6+.8*n))}}}
const armed=()=>[...sel].filter(b=>srcInfo(b));
function crosshair(){const ar=armed();if(!ar.length)return;const b0=ar[0],inf=srcInfo(b0),X=Math.round(mouse.x),Y=Math.round(mouse.y),d=Math.hypot(mouse.x-b0.x,mouse.y-b0.y);
 const g=Math.max(2,Math.round(d*inf.spread*inf.sp*1.6)),col=d>inf.range?rgb(150,150,150):inf.heat&&b0.held&&(b0.held.heat||0)>.15?heatCol(b0.held.heat,rgb(250,250,246)):rgb(250,250,246);
 const put=(x,y,c)=>{if(x>=0&&y>=0&&x<W&&y<H)out[y*W+x]=c};
 const hot=inf.heat&&b0.held?b0.held.heat||0:0,fr=charge?(inf.heat?Math.min(1,hot):Math.min(1,(performance.now()-charge.t)/charge.need)):0,shd=(x,y,on)=>{if(x>=0&&y>=0&&x<W&&y<H)out[y*W+x]=on?mix(out[y*W+x],rgb(255,255,255),.5):mul(out[y*W+x],.55)},dirs=inf.throw?[[1,-1],[1,1],[-1,1],[-1,-1]]:[[0,-1],[1,0],[0,1],[-1,0]],len=inf.throw?3:4;
 dirs.forEach(([ax,ay],ai)=>{for(let i=g;i<g+len;i++){const x=X+ax*i,y=Y+ay*i,seg=ai*4+Math.floor((i-g)*4/len);const on=(i-g+1)/len<=fr+.001&&fr>0;shd(x+1,y,on);shd(x,y+1,on);put(x,y,on?rgb(0,0,0):col)}});
 const c0=fr>0;shd(X+1,Y,c0);shd(X,Y+1,c0);put(X,Y,c0?rgb(0,0,0):col)}
// aiming
function srcInfo(b){if(!b||!bodies.includes(b))return null;
 if(b.type==='token'&&b.held&&b.status==='free'){const k=b.held.k,w=WP[k],sp=UNITS[b.unit].sp;
  if(w.gun||(k==='sspear'&&b.held.mode!=='throw'&&!b.held.spent))return{kind:k,sp,hold:k==='rod'?1e9:w.hold,heat:k==='rod',spread:w.spread,range:w.range};
  if(k==='grenade'||k==='bomb')return{kind:k,sp,throw:1,hold:400,spread:.05,range:k==='bomb'?60:140};if(w.melee)return{kind:k,sp,throw:1,hold:k==='sword'?450:650,spread:b.unit==='cmd'?.025:.04,range:(k==='sword'?110:240)*(b.unit==='cmd'?1.4:1)}}
 if(b.type==='weapon'&&(WP[b.kind].gun||b.kind==='sspear'&&!b.spent&&(b.ammo??CAP.sspear)>0)){const w=WP[b.kind];return{kind:b.kind,sp:1.3,hold:w.hold,spread:w.spread,range:w.range}}
 if(b.type==='weapon'&&!b.att&&(b.kind==='grenade'||b.kind==='bomb'||WP[b.kind].melee))return{kind:b.kind,sp:1,throw:1,hold:500,spread:.05,range:200};return null}
const gauss=()=>{const u=Math.random()||1e-9,v=Math.random();return Math.max(-2.2,Math.min(2.2,Math.sqrt(-2*Math.log(u))*Math.cos(6.283*v)))};
function fire(b,x,y,vol){const inf=srcInfo(b);if(!inf)return;if(b.type==='weapon'&&b.kind==='sspear'&&!inf.throw){b.ammo=(b.ammo??CAP.sspear)-1;if(b.ammo<=0)spend(b)}cmdFollow(b,x,y);boltShot=null;raiseAlarm();if(b.type==='token'&&!inf.throw){const h=b.held;if(h.ammo===undefined)h.ammo=CAP[h.k]||0;if(h.ammo<=0){if(h.k==='sspear'){h.mode='throw';sfx('flick')}else if(!reload(b))sfx('dry');return}h.ammo--;if(h.k==='sspear'&&h.ammo<=0)h.mode='throw'}const a0=Math.atan2(y-b.y,x-b.x),tok=b.type==='token';
 if(tok)turnTo(b,a0);else reshape(b,a0);
 const c=Math.cos(a0),s=Math.sin(a0),sd=tok?sideOf(b):0;
 if(inf.throw&&b.type==='weapon'){const k=b.kind,a=a0+gauss()*inf.spread,sp=k==='grenade'?15:k==='bomb'?8:27;let v=sp;if(k==='grenade'||k==='bomb'){if(!b.fuse){b.fuse=k==='bomb'?200:150;sfx('pin')}v=Math.min(sp,Math.hypot(x-b.x,y-b.y)*(1-WP[k].fr))}
  b.stuck=false;b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;b.thrown=true;b.noPick=tick+40;b.sx=b.x;b.sy=b.y;b.hit=null;if(k!=='bomb')reshape(b,a);sfx('whoosh');return}
 if(inf.throw){const k=b.held.k,f=HOFF[k],a=a0+gauss()*inf.spread*inf.sp,sp=(k==='grenade'?15:k==='bomb'?8:k==='sspear'?27:30)*(THR[b.unit]||.7);
  const p=weapon(k,b.x+c*f-s*sd,b.y+s*f+c*sd,a);p.ammo=b.held.ammo;p.res=b.held.res;if(b.unit==='cmd'&&(k==='spear'||k==='sspear')){const c=Math.random()<.2;p.ap=c?.25:.8;p.ep=c?2.4:1.2}if(k==='sspear'&&b.held.ammo>0)p.live=true;if(b.held.spent||k==='sspear'&&!(b.held.ammo>0))spend(p);if(k==='grenade'||k==='bomb'){p.fuse=k==='bomb'?200:150;sfx('pin')}let v=sp;if(k==='grenade'||k==='bomb'){const X=Math.round(x),Y=Math.round(y),wall=X<1||Y<1||X>=W-1||Y>=H-1||sol[Y*W+X]||slabG[Y*W+X];v=wall?sp*1.15:Math.min(sp,Math.hypot(x-p.x,y-p.y)*(1-WP[k].fr))}p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.from=b.id;p.thrown=true;p.noPick=tick+40;p.ghost=!!solidHits(p,0,0);p.vol=b.nat||'-';p.vr=vol?1e9:44;p.sx=b.x;p.sy=b.y;consume(b);sfx('whoosh');if(!b.held&&(k==='sspear'||k==='spear')){const i=(b.inv||[]).findIndex(q=>q&&q.k===k);if(i>=0)setTimeout(()=>{if(!b.held&&b.status==='free')selectSlot(b,i)},350)}return}
 const w=WP[inf.kind],f=tok?HOFF[inf.kind]+w.len:w.len,mx=b.x+c*f-s*sd,my=b.y+s*f+c*sd;if(inf.kind==='sspear')flash(mx,my,.45,.7,1,1.6,4,.8);else if(w.smoke)flash(mx,my,1,.7,.35,inf.kind==='pistol'?1:1.5,3,.7);
 for(let i=0;i<(w.pellets||1);i++){const a=(w.proj==='rodp'?Math.atan2(y-my,x-mx):a0)+gauss()*(w.spread*inf.sp+(b.xs||0))+(w.pellets?(i-1.5)*.03+gauss()*.025:0);
  const p=weapon(w.proj,mx,my,a);p.vx=Math.cos(a)*w.speed;p.vy=Math.sin(a)*w.speed;p.from=b.id;p.range=w.range;p.thrown=true;p.E=w.E*(tok&&b.unit==='cmd'?inf.kind==='blunder'?1.35:1.15:1);if(w.proj==='rodp'){const ht=tok&&b.held?b.held.heat||0:0,n=ht>=.9&&tok?1+(b.held.ammo||0):1;if(n>1)b.held.ammo=0;p.lx=mx;p.ly=my;p.E=p.E*(.85+Math.random()*.3)*(n>1?n*1.1:1);p.hot=ht>=.45;p.salvo=n>1?n:0;p.hotd=HOTD*(n>1?1.6:.8+.4*Math.min(1,ht));p.kb=w.kb*(n>1?1+.4*n:1);rodPx(p,a);rodHeat(p);boltShot=p}
  if(w.proj==='arc'&&tok&&b.held&&(b.held.heat||0)>=.9){const n=1+(b.held.ammo||0);b.held.ammo=0;b.held.mode='throw';p.big=n;p.E*=n;b.held.heat=0}p.vol=b.nat||'-';p.vr=vol?1e9:44;p.sx=b.x;p.sy=b.y}
 if(inf.kind==='blunder'){for(let i=0,n=10+(Math.random()*9|0);i<n&&parts.length<1500;i++){const a=a0+(Math.random()-.5)*.8,v=2.5+Math.random()*6,col=Math.random()<.35?rgb(255,240,180):Math.random()<.5?rgb(255,200,90):rgb(255,140,50),e=Math.random()<.6?150+(Math.random()*180|0):0;parts.push(e?{x:mx,y:my,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c:col,c0:col,em:e,em0:e}:{x:mx,y:my,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c:col,life:6+(Math.random()*10|0)})}}
 if(WP[inf.kind].proj==='rodp'){const hotShot=boltShot&&boltShot.hot,salvo=boltShot&&boltShot.salvo;if(salvo&&tok){b.held.heat=0}sfx('rodshot');if(salvo)sfx('crash');shake=Math.max(shake,salvo?9:5);plume(mx,my,a0,hotShot?.38:.5);if(hotShot){sfx('hiss');flash(mx,my,1,.6,.25,2,4,.75);for(let i=0;i<10;i++)spark(mx,my,Math.random()<.4?rgb(255,240,200):rgb(255,150,60),c*2,s*2,2.4,8)}else for(let i=0;i<5;i++)spark(mx,my,rgb(200,200,200),c*2,s*2,2,5);if(hotShot)recoilHurt(b,c,s)}
 else if(inf.kind==='sspear'){sfx('arcshot');if(bodies.some(q=>q.kind==='arc'&&q.big&&q.from===b.id)){sfx('sblast');shake=Math.max(shake,8);flash(mx,my,.45,.7,1,3,6,.85)}dab(SF,mx,my,.9,3);for(let i=0;i<8;i++)spark(mx,my,rgb(140,200,255),-c*2,-s*2,2.2,10);shake=Math.max(shake,4)}
 else if(w.smoke){sfx(inf.kind==='pistol'?'pshot':'shot');plume(mx,my,a0,w.smoke);room(b.x,b.y,.035*w.smoke);shake=Math.max(shake,inf.kind==='pistol'?1:2)}else sfx('twang');
 if(tok){const u=UNITS[b.unit],k=w.rec*(1-u.arm*.22)*(w.proj==='rodp'&&(u.arm===0||u.leather)?1.9:1)*(boltShot&&boltShot.salvo?1.7:1);b.vx-=c*k;b.vy-=s*k;if(w.proj==='rodp'){if(boltShot&&boltShot.hot&&(u.arm===0||u.leather)&&Math.random()<.3){ignite(b,Math.atan2(my-b.y,mx-b.x),.6,2);b.burn=Math.max(b.burn||0,.35+Math.random()*.35);sfx('sizzle')}if((u.arm===0||u.leather)&&b.held){dropHeld(b);sfx('drop')}}}}
const offGun=b=>b.type==='token'&&b.unit==='cmd'&&b.held&&b.held.k==='pistol'&&b.inv?b.inv.find(z=>z&&z!==b.held&&z.k==='pistol')||null:null;
function withOff(b,f){const h=b.held,o=offGun(b);if(!o)return;b.held=o;b.side=-(b.side||1);try{f()}finally{b.held=h;b.side=-b.side;b.hc=null}}
function cmdFollow(b,x,y){if(b.bq||b.type!=='token'||b.unit!=='cmd'||!b.held)return;const k=b.held.k;
 if(k==='musket'&&b.held.ammo>1)b.bq=[{t:tick+7,x,y}];else if(k==='pistol'){b.bq=[{t:tick+6,x,y}];if(offGun(b))b.bq.push({t:tick+3,x,y,off:1},{t:tick+9,x,y,off:1})}}
function burstTick(b){if(!b.bq)return;const q=b.bq,now=q.filter(e=>tick>=e.t);if(!now.length)return;b.bq=q.filter(e=>tick<e.t);const run=()=>{for(const e of now){const h=e.off?offGun(b):b.held;if(!h||b.status!=='free'||!(h.ammo>0))continue;b.xs=.025;e.off?withOff(b,()=>fire(b,e.x,e.y)):fire(b,e.x,e.y);b.xs=0}};const keep=b.bq;b.bq=keep.length?keep:[];run();if(!b.bq.length)b.bq=null}
function offPix(b){const o=offGun(b);if(!o)return[];let r=[];const hc=b.hc;withOff(b,()=>{b.hc=b.hc2;r=heldPix(b);b.hc2=b.hc});b.hc=hc;return r}
function fireGroup(x,y){const ar=armed(),vol=ar.length>1;ar.forEach(b=>setTimeout(()=>fire(b,x,y,vol),vol?Math.random()*260:0))}
// input
let lastHint='',boltShot=null;
function hint(){const ts=[...sel].filter(b=>b.type==='token'&&b.status==='free'),ks=new Set(ts.map(b=>b.held&&b.held.k)),k_=(k,t)=>`<span class="k">${k}</span> ${t}`;let h=[];
 if(sel.size&&[...sel].every(o=>o.type==='slab'))h=[k_('Q / E','turn'),k_('Drag','move'),k_('Del','remove'),k_('Esc','deselect')];
 else if(!sel.size)h=[k_('Click','select'),k_('Drag','box-select'),k_('Shift-drag','move to cell'),k_('Right-click','options')];
 else{if([...ks].some(k=>k&&WP[k].gun))h.push(k_('Hold','aim and fire'));if(ks.has('sspear'))h.push(k_('T','fire / throw'));if(ks.has('spear')||ks.has('grenade')||ks.has('bomb'))h.push(k_('Hold','throw'));
  if(ts.some(b=>b.held&&CAP[b.held.k]))h.push(k_('R','reload'));if(ts.some(b=>b.inv&&b.inv.some(Boolean)))h.push(k_('1–6','items'));if(ts.length)h.push(k_('WASD','move'),k_('F','switch hand'),k_('G','drop'));h.push(k_('Del','remove'),k_('Q','sheathe'),k_('E','deselect'))}
 const s=h.join(' &nbsp;·&nbsp; ');if(s!==lastHint){lastHint=s;$('hint').innerHTML=s}}
let tool='move',chipLast=null,cellDrag=null,spinning=false;
let mouse={x:0,y:0,in:false};
function tokHit(b,sx,sy){if(b.type!=='token'&&b.type!=='part')return null;const bx=Math.round(b.x+sx),by=Math.round(b.y+sy);
 for(const o of bodies){if(o===b||(o.type!=='token'&&o.type!=='part'&&o.kind!=='crate')||o.att||o.status==='dead'||Math.abs(o.x-b.x)>18||Math.abs(o.y-b.y)>18||inDrag(o))continue;const ox=Math.round(o.x),oy=Math.round(o.y);for(const p of b.px)if(o.set.has(K(bx+p[0]-ox,by+p[1]-oy)))return o}return null}
function heldBlocked(b,sx,sy){if(!b.held)return false;for(const p of heldPix(b)){const X=p[0]+sx,Y=p[1]+sy;if(X<0||Y<0||X>=W||Y>=H)return true;const j=Y*W+X;if(sol[j]||slabG[j])return true}return false}
function tryStep(b,sx,sy,depth=0){if(b.ghost){b.x+=sx;b.y+=sy;return true}
 const h=solidHits(b,sx,sy);if(h){if(b.type==='token'&&pushSlabs(b,h,sx,sy)){b.x+=sx;b.y+=sy;return true}pushDoor(b,h);const h0=b.type==='token'&&solidHits(b,0,0);if(h0&&h.length<h0.length){b.x+=sx;b.y+=sy;return true}return false}
 const hx=Math.round(b.x+sx)-Math.round(b.x),hy=Math.round(b.y+sy)-Math.round(b.y);if(heldBlocked(b,hx,hy)&&!heldBlocked(b,0,0)){pushDoor(b,heldPix(b).map(p=>[p[0]+hx,p[1]+hy]));return false}
 const o=tokHit(b,sx,sy);if(o){if(depth>2||(o.mass||1)>(b.mass||1)*1.05||!tryStep(o,sx,sy,depth+1))return false;o.mv=6}
 b.x+=sx;b.y+=sy;return true}
function moveToward(b,tx,ty){const x0=b.x,y0=b.y;for(let i=0;i<40;i++){const dx=tx-b.x,dy=ty-b.y;if(Math.abs(dx)<.01&&Math.abs(dy)<.01)break;const sx=Math.max(-1,Math.min(1,dx)),sy=Math.max(-1,Math.min(1,dy));let moved=false;
  if(sx&&tryStep(b,sx,0))moved=true;if(sy&&tryStep(b,0,sy))moved=true;if(!moved)break}
 if(b.ghost&&!solidHits(b,0,0))b.ghost=false;return Math.hypot(b.x-x0,b.y-y0)}
function turnTo(b,a){const a0=b.ang,d=Math.atan2(Math.sin(a-a0),Math.cos(a-a0));b.ang=a0+d;if(!heldBlocked(b,0,0))return;pushDoor(b,heldPix(b));b.ang=a0;if(heldBlocked(b,0,0)){b.ang=a0+d;return}for(let i=1;i<=8;i++){b.ang=a0+d*i/8;if(heldBlocked(b,0,0)){b.ang=a0+d*(i-1)/8;return}}}
function pushDoor(b,h){if(b.type!=='token')return;for(const[X,Y]of h){if(X<0||Y<0||X>=W||Y>=H)continue;const d=slabG[Y*W+X]&&byId(slabG[Y*W+X]);if(!d||d.free||d.locked||d.tgt!==0)continue;if(d.ang!==0){d.tgt=Math.sign(d.ang)*Math.PI/2;sfx('door');continue}
  openGroup(d,b);sfx('door')}}
function leafShift(q,dl){const L=(q.len||16)/2,T=-(q.th||8)/2,c0=swingPt(q,L,T,0),c1=swingPt(q,L,T,dl);return[c1[0]-c0[0],c1[1]-c0[1]]}
function openGroup(d,b){const all=d.pair?[d,d.pair]:[d],lv=all.filter(q=>q.tgt===0&&q.ang===0&&!q.fallen&&!q.locked);if(!lv.length)return;const ref=all.find(q=>!lv.includes(q)&&!q.fallen&&(q.tgt||q.ang));let v;if(ref)v=leafShift(ref,Math.sign(ref.tgt||ref.ang)*Math.PI/2);else{openLeaf(lv[0],b);v=leafShift(lv[0],lv[0].tgt)}
 for(const q of lv){if(!ref&&q===lv[0])continue;const u=leafShift(q,Math.PI/2);q.tgt=u[0]*v[0]+u[1]*v[1]>0?Math.PI/2:-Math.PI/2}}
function openLeaf(d,b){const o=openDir(d),ok=dl=>{const a0=d.ang;let hit=false;for(const f of [.35,.7,1]){d.ang=dl*f;orient(d);if(doorHitsTok(d,b)){hit=true;break}}d.ang=a0;orient(d);return !hit};d.tgt=ok(o)?o:ok(-o)?-o:o}
function openDir(d){let best=Math.PI/2,bc=-1;for(const dl of [-Math.PI/2,Math.PI/2]){let n=0;for(const p of d.px){const q=swingPt(d,p[8],p[9],dl),X=Math.round(d.x+q[0]),Y=Math.round(d.y+q[1]);if(X>=0&&Y>=0&&X<W&&Y<H&&!sol[Y*W+X])n++}if(n>bc){bc=n;best=dl}}return best}
function doorHitsTok(d,only){const dx=Math.round(d.x),dy=Math.round(d.y);for(const t of only?[only]:bodies){if(t.type!=='token'||t.status==='dead'||Math.abs(t.x-d.x)>34||Math.abs(t.y-d.y)>34)continue;const tx=Math.round(t.x),ty=Math.round(t.y);for(const p of d.px){const q=t.set.get(K(dx+p[0]-tx,dy+p[1]-ty));if(q&&q[0]*q[0]+q[1]*q[1]<=52)return true}}return false}
function doors(){for(const d of bodies)if(d.type==='slab'&&!d.fallen&&d.ang!==d.tgt){const a0=d.ang,st=.14,df=d.tgt-d.ang;d.ang=Math.abs(df)<st?d.tgt:d.ang+Math.sign(df)*st;orient(d);if(doorHitsTok(d)){d.ang=a0;orient(d)}}}
function slabTurn(){const d=(keys.has('e')?1:0)-(keys.has('q')?1:0);if(!d)return;for(const b of sel)if(b.type==='slab'&&b.free&&!b.fallen&&!inDrag(b))spinTo(b,b.rot*Math.PI/2+(b.spin||0)+d*.025)}
function wasd(){slabTurn();let dx=(keys.has('d')?1:0)-(keys.has('a')?1:0),dy=(keys.has('s')?1:0)-(keys.has('w')?1:0);if(!dx&&!dy)return;const l=Math.hypot(dx,dy);dx/=l;dy/=l;let moved=0,arm=0;
 for(const b of sel){if(b.type!=='token'||b.status==='dead'||inDrag(b)||b.pinned)continue;const u=UNITS[b.unit],hv=b.held&&(b.held.k==='rod'||b.held.k==='prod'),el=b.unit==='guard'||b.unit==='shock'||b.unit==='cmd',sp=.85*(1-u.arm*.07)*(!hv?1:b.unit==='civ'?(charge?.3:.55):el?(charge?.6:.92):(charge?.42:.8))*(b.pushT>=tick-2?(u.arm<=1?[.75,.45,.3]:[.85,.7,.55])[(b.pushM||1)-1]:1);b.glide=null;const md=moveToward(b,b.x+dx*sp,b.y+dy*sp);if(md>.1){moved=Math.max(moved,md);b.mv=6;arm=Math.max(arm,u.arm)}}
 if(moved){stepAcc+=moved;if(stepAcc>=9){stepAcc=0;sfx('step');if(arm)sfx('chink')}}}
let lastHud='';
let openCrate=null;const near=(a,c)=>c.box?Math.hypot(Math.max(c.box[0]-a.x,a.x-c.box[2],0),Math.max(c.box[1]-a.y,a.y-c.box[3],0))<14:Math.hypot(a.x-c.x,a.y-c.y)<30;
function moveItem(from,i,to){const q=from.inv&&from.inv[i];if(!q||!to.inv)return;const one={k:q.k,n:q.k==='gold'?q.n:1};if(CAP[q.k]){one.ammo=q.ammo??CAP[q.k];one.res=q.res||0}
 if(to.type==='token'){if(addItem(to,one)){if((q.n-=one.n)<=0){from.inv[i]=null;if(from.si===i){from.held=null;from.si=-1;from.hc=null}}else if(CAP[q.k])q.ammo=CAP[q.k];sfx('flick')}else sfx('dry');return}
 const m=!CAP[q.k]&&to.inv.find(z=>z&&z.k===q.k);let j=-1;if(!m){j=to.inv.indexOf(null);if(j<0){if(to.kind==='crate'){j=to.inv.length;to.inv.push(null)}else{sfx('dry');return}}}
 if((q.n-=one.n)<=0){from.inv[i]=null;if(from.si===i){from.held=null;from.si=-1;from.hc=null}}else if(CAP[q.k]){q.ammo=CAP[q.k]}
 if(m)m.n+=one.n;else to.inv[j]=one;sfx('flick')}
function slotEl(b,q,i,on,click){const e=document.createElement('span');e.className='it'+(on?' on':'');if(click){e.style.cursor='pointer';e.onclick=click}if(q){e.appendChild(icon(shape(q.k,0),q.k==='spear'||q.k==='sspear'?.6:1));const t=document.createElement('span');if(CAP[q.k]){const v=q.ammo??CAP[q.k];t.textContent=(q.n>1?q.n+'× ':'')+v+'/'+(q.res||0);if(v===0)t.className='out';else if(v/CAP[q.k]<.25)t.className='lo'}else t.textContent=q.k==='gold'?'§'+q.n:q.n;e.appendChild(t)}else e.classList.add('nil');return e}
function hud(){const tk=[...sel].find(o=>o.type==='token'),b=tk||(hover&&bodies.includes(hover)&&(hover.type==='token'||hover.kind==='crate')?hover:null);if(openCrate&&(!tk||!bodies.includes(openCrate)||!near(tk,openCrate)||tk.status!=='free'))openCrate=null;const c=openCrate;
 const key=b?JSON.stringify([b.id,b.si,b.inv,b.status,b.nat,c&&c.id,c&&c.inv]):'';if(key===lastHud)return;lastHud=key;const el=$('hud');el.innerHTML='';if(!b)return;
 const n=document.createElement('span');n.textContent=b.name;n.style.color=natLabel(b);el.appendChild(n);
 (b.inv||[]).forEach((q,i)=>{if(b.type==='token'&&!slotOK(b,i)&&!q){if(i<4){const e=slotEl(b,null,i,false,null);e.classList.add('lock');el.appendChild(e)}return}el.appendChild(slotEl(b,q,i,i===b.si,c&&q?()=>moveItem(b,i,c):null))});
 if(c){const s=document.createElement('span');s.className='sep';el.appendChild(s);const cn=document.createElement('span');cn.textContent=c.name||'Crate';el.appendChild(cn);c.inv.forEach((q,i)=>el.appendChild(slotEl(c,q,i,false,q?()=>moveItem(c,i,b):null)))}}
{const st=document.createElement('style');st.textContent='#sm #hud{display:flex;align-items:center;height:38px;padding:0 10px;gap:14px;border-top:1px solid #000;font-size:20px;color:#c9c5b8}#sm #hud canvas{image-rendering:pixelated;width:42px;height:30px}#sm #hud .it{display:flex;align-items:center;gap:3px;padding:1px 6px 1px 2px;border:1px solid transparent;min-width:30px;min-height:30px}#sm #hud .it.on{border-color:#f2efe6;color:#f2efe6}#sm #hud .it.nil{border-color:#2c2c2c}#sm #hud .it.lock{border-color:#161616;background:#161616}#sm #hud .hand{color:#f2efe6}#sm #hud .lo{color:#e0a040}#sm #hud .out{color:#b03a2a}#sm #hud .sep{width:1px;height:22px;background:#000}';document.head.appendChild(st);const d=document.createElement('div');d.id='hud';$('hint').after(d)}
{const st=document.createElement('style');st.textContent='div#sm{border:0;min-height:100vh;display:flex;flex-direction:column}#sm div.main{grid-template-columns:1fr 250px;flex:1}#sm div.view{background:#000;position:relative;overflow:hidden;padding:0;border-right:1px solid #000}#sm div.stage{position:absolute}#sm div.side{max-height:none;background:#1e1e1e}#sm div.stage{box-shadow:0 0 0 1px #000}';document.head.appendChild(st)}
let cam={x:0,y:0},camInit=true,pan=null,panKey=false;
function fit(){const v=$('stage').parentElement,used=document.querySelector('#sm header').offsetHeight+$('bar').offsetHeight+$('hint').offsetHeight+$('hud').offsetHeight;v.style.height=Math.max(320,window.innerHeight-used)+'px';{const sd=document.querySelector('#sm .side');sd.style.height=v.style.height;sd.style.maxHeight=v.style.height;sd.style.overflowY='auto'}const aw=v.clientWidth-56,ah=v.clientHeight-56;let k=Math.min(aw/W,ah/H);k=k>=3?Math.floor(k):k>=2?Math.floor(k*4)/4:2.5;S=k;stage.style.width=W*S+'px';stage.style.height=H*S+'px';cv.style.width=W*S+'px';cv.style.height=H*S+'px';applyCam()}
function applyCam(){const v=$('stage').parentElement,vw=v.clientWidth,vh=v.clientHeight,sw=W*S,sh=H*S;if(camInit){cam.x=curMap==="range"?0:(vw-sw)/2;cam.y=curMap==="range"?0:vh-sh-28;camInit=false}
 const cx=sw+56<=vw?(vw-sw)/2:Math.min(28,Math.max(vw-sw-28,cam.x)),cy=sh+56<=vh?(vh-sh)/2:Math.min(28,Math.max(vh-sh-28,cam.y));cam.x=cx;cam.y=cy;stage.style.left=cx+'px';stage.style.top=cy+'px'}
window.addEventListener('resize',fit);setTimeout(fit,0);setTimeout(fit,400);
let AMB=1;let LR=new Float32Array(NB),LG=new Float32Array(NB),LB=new Float32Array(NB),LT=new Float32Array(NB);let tls=[];
function flash(x,y,r,g,b,i,rad,d){tls.push({x,y,r,g,b,i,rad,d})}
function addL(x,y,r,g,b,i,rad=0){const cx=x/2|0,cy=y/2|0,R=Math.ceil(rad);lbx(cx-R,cy-R);lbx(cx+R,cy+R);for(let j=-R;j<=R;j++)for(let k=-R;k<=R;k++){const X=cx+k,Y=cy+j;if(X<0||Y<0||X>=BW||Y>=BH)continue;const f=rad?1-Math.hypot(k,j)/(rad+1):1;if(f<=0)continue;const q=Y*BW+X;LR[q]+=r*i*f;LG[q]+=g*i*f;LB[q]+=b*i*f}}
let LBX=[0,0,-1,-1],PBX=null;const lbx=(x,y)=>{if(LBX[2]<0){LBX=[x,y,x,y];return}if(x<LBX[0])LBX[0]=x;if(y<LBX[1])LBX[1]=y;if(x>LBX[2])LBX[2]=x;if(y>LBX[3])LBX[3]=y};
function blurL(a,x0,y0,x1,y1){for(let p=0;p<3;p++){for(let Y=y0;Y<=y1;Y++){let acc=0;const o=Y*BW;for(let X=x0-2;X<=x1+2;X++){if(X+2<=x1)acc+=a[o+X+2];if(X-3>=x0)acc-=a[o+X-3];if(X>=x0&&X<=x1)LT[o+X]=acc/5}}for(let X=x0;X<=x1;X++){let acc=0;for(let Y=y0-2;Y<=y1+2;Y++){if(Y+2<=y1)acc+=LT[(Y+2)*BW+X];if(Y-3>=y0)acc-=LT[(Y-3)*BW+X];if(Y>=y0&&Y<=y1)a[Y*BW+X]=acc/5}}}}
function lightPass(){if(PBX){const[x0,y0,x1,y1]=PBX;for(let Y=y0;Y<=y1;Y++){const o=Y*BW;LR.fill(0,o+x0,o+x1+1);LG.fill(0,o+x0,o+x1+1);LB.fill(0,o+x0,o+x1+1)}PBX=null}LBX=[0,0,-1,-1];let any=false;
 for(let i=0;i<NB;i++){const v=Math.max(FX.fire[i],TF[i]);if(v>.05){const f=Math.min(1.2,v)*1.7*(.85+.15*Math.sin(tick*.3+i));LR[i]+=f;LG[i]+=f*.5;LB[i]+=f*.16;any=true;lbx(i%BW,i/BW|0)}}
 for(const p of parts){const c=p.c,l=(c&255)+(c>>8&255)+(c>>16&255);if(l<420)continue;let k=p.life!==undefined?1:p.em!==undefined?p.em/p.em0:0;if(k<=0)continue;const q=(p.y>>1)*BW+(p.x>>1);if(q<0||q>=NB)continue;lbx(p.x>>1,p.y>>1);k*=1.1;LR[q]+=(c&255)/255*k;LG[q]+=(c>>8&255)/255*k;LB[q]+=(c>>16&255)/255*k;any=true}
 for(const z of zaps){addL(z.x1,z.y1,.45,.7,1,.8);any=true}
 const pul=.85+.15*Math.sin(tick*.12);for(const b of bodies){if(b.kind==='arc'){addL(b.x,b.y,.45,.7,1,1.2);any=true}else if(b.kind==='sspear'&&!b.spent){const[x,y]=spearTip(b);addL(x,y,.45,.7,1,b.timer>0?.6+.7*(1-b.timer/b.timer0):b.fizz>0?.3+.4*b.fizz/150:(b.ammo===0?.3:.9)*pul,2);any=true}
  else if(b.type==='token'&&b.held&&b.held.k==='rod'&&(b.held.heat||0)>.15&&b.status!=='dead'){const t=tipOf(b),h=b.held.heat;addL(t[0],t[1],1,.6+Math.min(.35,h*.3),.28+Math.max(0,h-.7)*.6,h*1.3,1.5+h);any=true}
  else if(b.type==='token'&&b.held&&b.held.k==='sspear'&&b.held.ammo>0&&b.status!=='dead'){const t=tipOf(b);addL(t[0],t[1],.45,.7,1,((b.held.ammo??4)===0?.3:1)*pul,2);any=true}
  if(b.kind==='rodp'&&b.glw>.05){addL(b.x,b.y,1,.6,.28,b.glw*1.3,2);any=true}if(b.surge>0){addL(b.x,b.y,.5,.75,1,(1-b.surge/240)*2,4);any=true}if(b.burn>.04){addL(b.x,b.y,1,.6,.25,b.burn*.8,3);any=true}}
 for(const t of tls){addL(t.x,t.y,t.r,t.g,t.b,t.i,t.rad);t.i*=t.d}tls=tls.filter(t=>t.i>.03);if(tls.length)any=true;
 if(!any||LBX[2]<0)return;const bx0=Math.max(0,LBX[0]-8),by0=Math.max(0,LBX[1]-8),bx1=Math.min(BW-1,LBX[2]+8),by1=Math.min(BH-1,LBX[3]+8);PBX=[bx0,by0,bx1,by1];blurL(LR,bx0,by0,bx1,by1);blurL(LG,bx0,by0,bx1,by1);blurL(LB,bx0,by0,bx1,by1)
 const ch=(v,l)=>{l*=2.4;const a=v*Math.min(1.8,AMB+l*1.3),k=Math.min(.85,l*.38);return cl(255-(255-Math.min(255,a))*(1-k))};
 for(let qy=by0;qy<=by1;qy++)for(let qx=bx0;qx<=bx1;qx++){const q=qy*BW+qx,lr=LR[q],lg=LG[q],lb=LB[q];if(lr+lg+lb<.01)continue;const j0=(qy*2)*W+qx*2;
  for(const j of [j0,j0+1,j0+W,j0+W+1]){const c=out[j];out[j]=rgb(ch(c&255,lr),ch(c>>8&255,lg),ch(c>>16&255,lb))}}}
const PICK=new Set(['musket','blunder','pistol','spear','sspear','grenade','bomb','rod','gold','rbox']);
const ONE=new Set(['musket','pistol','blunder']);
function slotFor(t,k,draw){const free=i=>slotOK(t,i)&&!t.inv[i];
 if(SEC.has(k)){if(free(1))return 1;if(free(0))return 0;if(draw&&t.unit==='cmd'&&t.inv[1]&&t.inv[1].k==='pistol'&&t.inv[0]&&t.inv[0].k!=='pistol')return 0;return -1}
 if(CAP[k])return free(0)?0:-1;if(WP[k]&&WP[k].melee&&free(0))return 0;if(GREN.has(k)&&free(2))return 2;if(k==='bomb'&&free(3))return 3;
 for(let i=4;i<t.inv.length;i++)if(free(i))return i;return -1}
function addItem(t,it){if(!t.inv)return false;while(t.type==='token'&&t.inv.length<6)t.inv.push(null);{const g=Object.keys(BOX).find(k=>BOX[k]===it.k),gun=g&&t.inv.find(z=>z&&z.k===g);if(gun){gun.res=(gun.res||0)+CAP[g]*(it.n||1);return true}}if(ONE.has(it.k)&&t.inv.filter(z=>z&&z.k===it.k).length>=(t.unit==='cmd'&&it.k==='pistol'?2:1))return false;const m=!CAP[it.k]&&t.inv.find(z=>z&&z.k===it.k);if(m){if(m.k==='spear'){if(m.n>=4)return false;m.n=Math.min(4,m.n+it.n);return true}m.n+=it.n;return true}
 const j=slotFor(t,it.k,it.draw);if(j<0)return false;if(t.inv[j]){const was=t.si===j,ph=t.held,ps=t.si;t.si=j;t.held=t.inv[j];dropHeld(t);if(!was){t.held=ph;t.si=ps;t.hc=null}}t.inv[j]={...it};delete t.inv[j].draw;if(!t.held&&it.k!=='gold'&&!GREN.has(it.k)&&it.k!=='bomb'&&j<4||t.unit==='cmd'&&it.k==='pistol'&&it.draw&&!(t.held&&t.held.k==='pistol')){t.si=j;t.held=t.inv[j];t.hc=null}return true}
function autoPick(){for(const t of bodies){if(t.type!=='token'||t.status!=='free'||!t.inv||inDrag(t))continue;
  for(const w of [...bodies]){if(w.type!=='weapon'||!PICK.has(w.kind)||w.stuck||w.att||w.fuse||inDrag(w)||(w.noPick&&w.noPick>tick)||Math.hypot(w.vx,w.vy)>.3||Math.hypot(w.x-t.x,w.y-t.y)>13)continue;
   if(addItem(t,{k:w.kind,n:w.kind==='gold'?(w.amt||50):1,ammo:CAP[w.kind]?(w.ammo??CAP[w.kind]):undefined,res:CAP[w.kind]?(w.res||0):undefined,spent:w.spent||undefined,mode:w.spent?'throw':undefined,draw:w.kind==='pistol'||undefined})){remove(w);sfx('flick')}}
  for(const c of bodies){if(c.kind!=='crate'||!c.open||!c.inv[0]||Math.hypot(c.x-t.x,c.y-t.y)>20)continue;const q=c.inv[0],one={k:q.k,n:q.k==='gold'?q.n:1};if(CAP[q.k]){one.ammo=q.ammo??CAP[q.k];one.res=q.res||0}if(addItem(t,one)){q.n-=one.n;if(q.n<=0)c.inv[0]=null;sfx('flick')}}}}
const inZone=(b,p)=>{if(b.fa===undefined||b.fw>=3.1&&b.fd>=8)return true;const r2=p[0]*p[0]+p[1]*p[1],d=8.3-b.fd;if(r2<d*d)return false;if(b.fw>=3.1)return true;const a=Math.atan2(p[1],p[0]);return Math.abs(Math.atan2(Math.sin(a-b.fa),Math.cos(a-b.fa)))<=b.fw};
function ignite(b,a,w,d){if(!(b.burn>.05)||b.fa===undefined){b.fa=a;b.fw=w;b.fd=d}else{b.fw=Math.min(3.15,b.fw+.008);b.fd=Math.min(8.3,b.fd+.008)}}
function fireTick(){for(const b of [...bodies]){if((b.type!=='token'&&b.type!=='part')||!bodies.includes(b))continue;
  let v=0,ka=0,kc=0;for(let k=0;k<9;k++){const a=k*.785,r=k===8?0:8,X=Math.round(b.x+Math.cos(a)*r),Y=Math.round(b.y+Math.sin(a)*r);if(X<0||Y<0||X>=W||Y>=H)continue;const q=(Y>>1)*BW+(X>>1),f=Math.max(TF[q],FX.fire[q]);if(k===8)kc=f;else if(f>v){v=f;ka=a}}
  if(kc>.3){ignite(b,ka,.5,1.5);b.fw=Math.min(3.15,b.fw+.03);b.fd=Math.min(8.3,b.fd+.03)}else if(v>.3)ignite(b,ka,.45,1.5);v=Math.max(v,kc);
  if(v>.3)b.burn=Math.min(1.5,(b.burn||0)+v*.12);
  if(curMap==='sewer'&&map[b.y/T|0]&&map[b.y/T|0][b.x/T|0]==='dmarble'&&b.burn){b.burn=0;dab(SF,b.x,b.y,.8,4);sfx('sizzle')}
  if(!(b.burn>0))continue;b.burn=Math.max(0,b.burn-.012);if(!b.burn){b.fa=undefined;continue}if(Math.random()<b.burn*.3)dab(SF,b.x,b.y-3,.25,3);
  const u=UNITS[b.unit]||UNITS.civ,bx=Math.round(b.x),by=Math.round(b.y);let hit=false;
  for(let n=0;n<Math.ceil(b.burn*3);n++){let p=null;for(let t=0;t<8&&!p;t++){const c=b.px[(Math.random()*b.px.length)|0];if(c&&inZone(b,c)&&Math.hypot(c[8],c[9])>4.4&&(!b.set.has(K(c[0]+1,c[1]))||!b.set.has(K(c[0]-1,c[1]))||!b.set.has(K(c[0],c[1]+1))||!b.set.has(K(c[0],c[1]-1))))p=c}if(!p)continue;
   if(p[7]==='a'&&p[4]===3){p[5]=Math.min(1.6,p[5]+b.burn*.09/Math.max(1,u.arm*.8));if(p[5]>1.15&&Math.random()<.25){if(hitPix(b,bx+p[0],by+p[1],99)===2){hit=true;spark(bx+p[0],by+p[1],rgb(255,190,90),0,0,1.2,8)}}
    const inn=b.set.get(K(p[0]-Math.sign(p[0]),p[1]-Math.sign(p[1])));if(inn&&inn[7]==='c'&&Math.random()<p[5]*.15)if(hitPix(b,bx+inn[0],by+inn[1],1)===2)hit=true}
   else if(Math.random()<b.burn*.6){if(hitPix(b,bx+p[0],by+p[1],1)===2){hit=true;if(Math.random()<.3)spark(bx+p[0],by+p[1],rgb(60,40,30),0,0,.8)}}}
  if(hit)settle(b)}}
function update(){tick++;markSlabs();if(drag)dragStep();if(tick%3===0)fireTick();if(tick%10===0)autoPick();for(const b of bodies){if(b.cock>0)b.cock--;burstTick(b)}if(tick%6===0)hud();wasd();doors();shockTick();if(tick%15===0)hint();for(const b of bodies)if(b.held)melee(b);rodTick();
 for(const b of [...bodies])if((b.kind==='grenade'||b.kind==='bomb')&&b.fuse>0&&--b.fuse===0&&bodies.includes(b))detonate(b)
 for(const b of bodies)b.wind=0;if(charge){const pr=Math.min(1,(performance.now()-charge.t)/charge.need);for(const b of armed()){const i=srcInfo(b);if(i&&i.throw)b.wind=pr*pr}}
 if(charge&&performance.now()-charge.t>=charge.need){fireGroup(mouse.x,mouse.y);charge=null}
 for(const b of [...bodies])if(bodies.includes(b))step(b);if(curMap==='air'&&tick%5===0)overboard();stepParts();cool();fxTick()}
let lastT=performance.now(),acc=0;
function loop(){const now=performance.now();acc+=Math.min(120,now-lastT);lastT=now;let n=0;while(acc>=16.667&&n<6){update();acc-=16.667;n++}if(n)render();requestAnimationFrame(loop)}

const toBoard=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H]};
const inBoard=e=>{const r=cv.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom};
function startDrag(b,x,y,fromPanel,free){const grp=!fromPanel&&sel.has(b)&&sel.size>1&&b.type==='token'?[...sel].filter(o=>o.type==='token'&&o.status!=='dead'):[b];
 drag={b,group:grp,offs:grp.map(o=>[o.x-b.x,o.y-b.y]),ox:fromPanel?0:b.x-x,oy:fromPanel?0:b.y-y,tx:x,ty:y,smp:[[performance.now(),x,y]],panel:fromPanel,free};
 for(const o of grp){o.vx=o.vy=0;o.glide=null;if(o.pinned)o.pinned=false;if(o.stuck||fromPanel||free||solidHits(o,0,0))o.ghost=true;o.stuck=false;o.att=null;o.timer=0;o.fizz=0;o.charge=null;if(o.snd){o.snd.stop();o.snd=null}}sfx('flick')}
function dragStep(){const b=drag.b;if(!bodies.includes(b)){drag=null;return}const tx=drag.tx+drag.ox,ty=drag.ty+drag.oy;
 if(drag.panel){b.x=tx;b.y=ty;b.ghost=true;return}
 if(drag.free){drag.group.forEach((o,i)=>{o.x=tx+drag.offs[i][0];o.y=ty+drag.offs[i][1];o.ghost=true;o.mv=6});return}
 drag.group.forEach((o,i)=>{if(!bodies.includes(o))return;const md=moveToward(o,tx+drag.offs[i][0],ty+drag.offs[i][1]);if(md>.5)o.mv=6})}
function nudge(b){const x0=b.x,y0=b.y;for(let r=1;r<=24;r++)for(let k=0;k<16;k++){const a=k/16*6.283;b.x=x0+Math.cos(a)*r;b.y=y0+Math.sin(a)*r;if(!solidHits(b,0,0))return true}b.x=x0;b.y=y0;return false}
function showMoves(b){const c0=[b.x/T|0,b.y/T|0],walk=(cx,cy)=>{if(cx<0||cy<0||cx>=CW||cy>=CH)return false;const j=(cy*T+8)*W+cx*T+8;return !sol[j]&&!slabG[j]};
 const dist=new Map([[c0[1]*CW+c0[0],0]]),q=[c0],cells=new Set();
 while(q.length){const[cx,cy]=q.shift(),d=dist.get(cy*CW+cx);if(d>=6)continue;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,k=ny*CW+nx;if(dist.has(k)||!walk(nx,ny))continue;dist.set(k,d+1);q.push([nx,ny]);
  if(!bodies.some(o=>o.type==='token'&&o!==b&&(o.x/T|0)===nx&&(o.y/T|0)===ny))cells.add(k)}}
 moveSel={b,cells};sfx('flick')}
let lastClick=null;
function clickBody(b,add){if(b.status==='dead')return;if(b.hidden){const tk=[...sel].find(o=>o.type==='token');if(tk&&near(tk,b)){openCrate=openCrate===b?null:b;sfx('door')}else sfx('dry');return}if(b.kind==='crate'){b.open=!b.open;sfx('door');return}if(b.type==='slab'&&b.free){if(!add)sel.clear();if(add&&sel.has(b))sel.delete(b);else sel.add(b);sfx('flick');return}if(b.type==='slab'){if(b.fallen)return;const lv=b.pair?[b,b.pair]:[b];let hp=null;if(lastClick){for(let j=-1;j<=1&&!hp;j++)for(let i=-1;i<=1&&!hp;i++)hp=b.set.get(K(lastClick.X+i-Math.round(b.x),lastClick.Y+j-Math.round(b.y)))||null}
 if(b.tgt!==0||b.ang!==0){for(const q of lv)q.tgt=0;sfx('door')}else if(hp&&hp[8]<=6){if(b.locked)sfx('lock');else{openGroup(b,null);sfx('door')}}else if(!b.lockBroken&&!(b.pair&&b.pair.lockBroken)){b.locked=!b.locked;if(b.pair)b.pair.locked=b.locked;sfx('lock')}return}
 if(b.type==='weapon'&&!sel.has(b)){const now=performance.now(),dbl=lastW&&lastW.id===b.id&&now-lastW.t<400;lastW={id:b.id,t:now};if(!dbl)return}
 if(!add)sel.clear();if(add&&sel.has(b))sel.delete(b);else sel.add(b);sfx('flick')}
let lastW=null;
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{au();closeMenu();if(panKey||e.button===1){pan={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y};cv.setPointerCapture(e.pointerId);e.preventDefault();return}const[x,y]=toBoard(e),X=x|0,Y=y|0;
 if(e.button===2){const b=bodyAt(X,Y,1);if(b)openMenu(b,e);else{sel.clear();moveSel=null;charge=null}return}
 cv.setPointerCapture(e.pointerId);
 if(tool==='move'){
  if(moveSel){const k=(y/T|0)*CW+(x/T|0);if(!e.shiftKey&&moveSel.cells.has(k)){const b=moveSel.b;b.glide=[(x/T|0)*T+8,(y/T|0)*T+8];b.ghost=true;b.stuck=false;b.vx=b.vy=0;moveSel=null;sfx('flick');return}moveSel=null}
  const b=bodyAt(X,Y,1)||(X>=0&&Y>=0&&X<W&&Y<H?containerAt(X,Y):null);lastClick={X,Y};
  if(e.shiftKey){if(b&&b.type!=='slab')startDrag(b,x,y,false,true);return}
  const ar=armed();
  if(ar.length&&!(b&&(sel.has(b)||b.kind==='crate'))){charge={t:performance.now(),need:Math.max(...ar.map(o=>srcInfo(o).hold)),x,y,b};return}
  if(b){if(b.status==='dead'||b.kind==='crate'){clickBody(b,e.ctrlKey||e.metaKey);return}pend={b,x,y,add:e.ctrlKey||e.metaKey};return}
  box={x0:x,y0:y,x1:x,y1:y}}
 else if(tool==='chip'){chipLast=[X,Y];chip(X,Y)}});
window.addEventListener('pointermove',e=>{if(pan){cam.x=pan.cx+e.clientX-pan.x;cam.y=pan.cy+e.clientY-pan.y;applyCam();return}const[x,y]=toBoard(e);mouse.x=x;mouse.y=y;mouse.in=inBoard(e);
 hover=mouse.in&&!drag?bodyAt(x|0,y|0,1):null;
 if(!drag)for(const b of sel){if(b.type==='slab')continue;if(!srcInfo(b))continue;const a=Math.atan2(y-b.y,x-b.x);if(b.type==='token')turnTo(b,a);else if(Math.abs(a-b.ang)>.05)reshape(b,a)}
 if(pend&&Math.hypot(x-pend.x,y-pend.y)>2){startDrag(pend.b,pend.x,pend.y);pend=null}
 if(box){box.x1=x;box.y1=y}
 if(drag){drag.tx=x;drag.ty=y;const t=performance.now();drag.smp.push([t,x,y]);while(drag.smp.length>2&&t-drag.smp[0][0]>90)drag.smp.shift();
  const b=drag.b;if(b.type==='weapon'&&!WP[b.kind].gun){const s0=drag.smp[0],dx=x-s0[1],dy=y-s0[2];if(Math.hypot(dx,dy)>3){const a=Math.atan2(dy,dx);let d=a-b.ang;d=Math.atan2(Math.sin(d),Math.cos(d));if(Math.abs(d)>.2)reshape(b,b.ang+d*.6)}}return}
 if(tool==='chip'&&chipLast&&(e.buttons&1)){const X=x|0,Y=y|0;const[x0,y0]=chipLast;const n=Math.max(Math.abs(X-x0),Math.abs(Y-y0));for(let i=1;i<=n;i++)chip(Math.round(x0+(X-x0)*i/n),Math.round(y0+(Y-y0)*i/n));chipLast=[X,Y]}
});
window.addEventListener('pointerup',e=>{if(pan){pan=null;return}chipLast=null;if(spinning){spinning=false;return}const add=e.ctrlKey||e.metaKey;
 if(cellDrag){const cd=cellDrag;cellDrag=null;const k=(mouse.y/T|0)*CW+(mouse.x/T|0);if(moveSel&&moveSel.b===cd.b&&moveSel.cells.has(k)){const b=cd.b;b.glide=[(mouse.x/T|0)*T+8,(mouse.y/T|0)*T+8];b.ghost=true;b.stuck=false;b.vx=b.vy=0;moveSel=null;sfx('flick')}return}
 if(charge&&armed().some(o=>{const i=srcInfo(o);return i&&i.heat})&&performance.now()-charge.t>120){fireGroup(mouse.x,mouse.y);charge=null;return}
 if(charge){if(charge.b&&charge.b.type!=='slab'&&charge.b.kind!=='crate'&&Math.hypot(mouse.x-charge.x,mouse.y-charge.y)<3)clickBody(charge.b,add);charge=null;return}
 if(box){const x0=Math.min(box.x0,box.x1),x1=Math.max(box.x0,box.x1),y0=Math.min(box.y0,box.y1),y1=Math.max(box.y0,box.y1);box=null;
  if(x1-x0<3&&y1-y0<3){sel.clear();return}if(!add)sel.clear();for(const b of bodies)if(b.type==='token'&&b.status!=='dead'&&b.x>=x0&&b.x<=x1&&b.y>=y0&&b.y<=y1)sel.add(b);if(sel.size)sfx('flick');return}
 if(pend){clickBody(pend.b,pend.add);pend=null;return}
 if(!drag)return;const b=drag.b,[x,y]=toBoard(e),grp=drag.group.length>1;
 if(drag.panel){if(!inBoard(e)){remove(b);drag=null;return}b.ghost=false;if(solidHits(b,0,0)&&!nudge(b)){remove(b);drag=null;return}}
 if(drag.free){const g=drag.group;drag=null;if(!inBoard(e)){for(const o of g)remove(o);sfx('whoosh');return}for(const o of g){o.ghost=false;if(solidHits(o,0,0)&&!nudge(o))o.ghost=true}sfx('drop');return}
 const t=performance.now(),s=drag.smp.filter(q=>t-q[0]<80);let vx=0,vy=0;if(s.length>1){const a=s[0],z=s[s.length-1],dt=Math.max(8,z[0]-a[0]);vx=(z[1]-a[1])/dt*23;vy=(z[2]-a[2])/dt*23}
 let sp=Math.hypot(vx,vy);drag=null;if(grp||b.type==='slab')return;
 const onTok=()=>bodyAt(Math.round(x),Math.round(y),2,b,o=>o.type==='token'&&o.status!=='dead');
 if(b.type==='weapon'&&(WP[b.kind].gun||WP[b.kind].tool||b.kind==='shield'||(WP[b.kind].melee&&sp<=1.4))){const tk=onTok();if(tk){give(tk,b.kind,b.ammo,b.res);remove(b)}return}
 const max=b.type==='weapon'?WP[b.kind].max:24;
 if(sp>1.4){if(sp>max){vx*=max/sp;vy*=max/sp}sfx('whoosh');b.vx=vx;b.vy=vy;b.thrown=true;if(b.type==='weapon')reshape(b,Math.atan2(vy,vx))}});
window.addEventListener('keydown',e=>{if(/INPUT|SELECT/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(k===' '){panKey=true;e.preventDefault();return}
 if((k==='q'||k==='e')&&[...sel].some(o=>o.type==='slab'&&o.free)){keys.add(k);e.preventDefault();return}
 if(k==='q'){for(const b of sel){if(b.type!=='token'||b.status!=='free'||!b.inv)continue;if(b.held){b.psi=b.si;b.si=-1;b.held=null;b.hc=null}else if(b.psi>=0&&b.inv[b.psi])selectSlot(b,b.psi)}sfx('flick');return}
 if(k==='escape'||k==='e'){sel.clear();moveSel=null;charge=null;box=null;closeMenu();return}
 if(k.length===1&&'wasd'.includes(k)){keys.add(k);e.preventDefault();return}
 if(k==='r'){for(const b of sel)if(b.type==='token'&&b.status==='free'&&b.held&&CAP[b.held.k]&&b.held.ammo<CAP[b.held.k])reload(b);return}
 if(k>='1'&&k<='6'){for(const b of sel)if(b.type==='token'&&b.status==='free'&&b.inv)selectSlot(b,+k-1);return}
 if(k==='g'){for(const b of sel)if(b.type==='token'&&b.held)dropHeld(b);return}
 if(k==='t'){for(const b of sel)if(b.type==='token'&&b.held&&b.held.k==='sspear'&&b.held.ammo>0){b.held.mode=b.held.mode==='throw'?undefined:'throw';b.hc=null}sfx('flick');return}
 if(k==='f'){for(const b of sel)if(b.type==='token'){b.side=-(b.side||1);b.hc=null}sfx('flick');return}
 if(k==='delete'||k==='backspace'){for(const b of [...sel])remove(b);e.preventDefault()}});
window.addEventListener('keyup',e=>{if(e.key===' ')panKey=false;keys.delete(e.key.toLowerCase())});
window.addEventListener('blur',()=>keys.clear());
function chip(X,Y){if(X<0||Y<0||X>=W||Y>=H)return;const b=bodyAt(X,Y,0,null,o=>true);
 if(b){if(hitPix(b,X,Y,1)===2)settle(b);sfx('tick');return}
 const j=Y*W+X;if(sol[j]){damagePixel(X,Y,1);sfx('tick');return}
 if(!crk[j]){crk[j]=1;floor[j]=mul(floor[j],.6);sfx('tick')}}

// menu
let menu=null;function closeMenu(){if(menu){menu.remove();menu=null}}
function openMenu(b,e){closeMenu();const r=$('sm').getBoundingClientRect();menu=document.createElement('div');menu.className='menu';menu.style.left=(e.clientX-r.left+4)+'px';menu.style.top=(e.clientY-r.top+4)+'px';
 const it=(t,on,f,keep)=>{const bt=document.createElement('button');bt.textContent=t;if(on)bt.classList.add('on');bt.onclick=()=>{f(bt);if(!keep)closeMenu();listPeople()};menu.appendChild(bt);return bt};
 if(b.type==='token'){it('Free',b.status==='free',()=>b.status='free');it('Captured',b.status==='captured',()=>{b.status='captured';b.held=null;b.inv=[null,null,null,null,null,null];b.si=-1});it('Dead',b.status==='dead',()=>{b.status='dead';if(b.held)dropHeld(b)});it('Guard',b.guard,()=>b.guard=!b.guard);it('Restore health',0,()=>restore(b));it('Duplicate',0,()=>{const c=token(b.name,b.nat,b.unit,b.x+18,b.y,b.guard,b.held?b.held.k:null);c.ang=b.ang;if(b.held&&b.held.mode)c.held.mode=b.held.mode;c.inv=JSON.parse(JSON.stringify(b.inv||[]));c.si=b.si;c.held=c.si>=0?c.inv[c.si]:null;c.hc=null;if(b.status==='captured'){c.status='captured';c.held=null}if(solidHits(c,0,0)||bodies.some(o=>o!==c&&o.type==='token'&&Math.hypot(o.x-c.x,o.y-c.y)<17)){c.x=b.x;c.y=b.y;for(let r=18;r<60;r+=4){let ok=false;for(let k=0;k<12;k++){const a=k/12*6.283;c.x=b.x+Math.cos(a)*r;c.y=b.y+Math.sin(a)*r;if(!solidHits(c,0,0)&&!bodies.some(o=>o!==c&&o.type==='token'&&Math.hypot(o.x-c.x,o.y-c.y)<17)){ok=true;break}}if(ok)break}}sel.clear();sel.add(c)});
  it('Rename',0,bt=>{const i=document.createElement('input');i.value=b.name;bt.replaceWith(i);i.focus();i.select();i.onkeydown=ev=>{if(ev.key==='Enter'){b.name=i.value||b.name;b.lab.textContent=b.name;closeMenu();listPeople()}}},true);
  const s=document.createElement('select');for(const n of Object.keys(NAT)){const o=document.createElement('option');o.textContent=n;if((b.nat||'Neutral')===n)o.selected=true;s.appendChild(o)}s.onchange=()=>{b.nat=s.value==='Neutral'?null:s.value;closeMenu();listPeople()};menu.appendChild(s);
  if(b.held)it('Drop weapon',0,()=>dropHeld(b))}
 if((b.kind==='grenade'||b.kind==='bomb')&&!b.fuse)it('Pull pin',0,()=>{b.fuse=150;sfx('pin')});
 if(b.type==='slab')it('Rotate',0,()=>{b.rot=(b.rot+1)%4;orient(b)});
 it('Delete',0,()=>remove(b));$('sm').appendChild(menu)}
document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target)&&e.target!==cv)closeMenu()});

// ui
const bar=$('bar');
const btn=(t,f)=>{const b=document.createElement('button');b.textContent=t;b.onclick=f;bar.appendChild(b);return b};
const TOOLS={move:'Move',chip:'Chip'};const tb={};

function setTool(k){tool=k;for(const[q,b]of Object.entries(tb))b.classList.toggle('on',q===k);cv.style.cursor=k==='move'?'default':'crosshair'}

btn('Reset',()=>reset());{const ms=document.createElement('select');for(const[v,n]of[['bank','Goldbank back room'],['docks','Havenport warehouse'],['tavern','Havenport tavern'],['sewer','Havenport sewer'],['vault','Goldbank Aurum heist'],['count','Goldbank counting house'],['range','Astia proving yard'],['air','Pirate airship boarding']]){const o=document.createElement('option');o.value=v;o.textContent=n;ms.appendChild(o)}ms.onchange=()=>{curMap=ms.value;camInit=true;$('sm').querySelector('header span').textContent=ms.value==='docks'?'Havenport · Warehouse':ms.value==='tavern'?'Havenport · Tavern':ms.value==='sewer'?'Havenport · Sewer':ms.value==='vault'?'Goldbank · The Aurum':ms.value==='count'?'Goldbank · Counting house':ms.value==='range'?'Astia · Proving yard':ms.value==='air'?'Open sky · Pirate airship':'Goldbank · Back room';reset()};bar.appendChild(ms)}
setTool('move');

function icon(px,scale){const c=document.createElement('canvas');c.width=28;c.height=20;const g=c.getContext('2d'),id=g.createImageData(28,20),u=new Uint32Array(id.data.buffer);
 let mx=0,my=0;for(const p of px){mx+=p[0];my+=p[1]}mx/=px.length;my/=px.length;
 for(const p of px){const X=Math.round(14+(p[0]-mx)*scale),Y=Math.round(10+(p[1]-my)*scale);if(X>=0&&Y>=0&&X<28&&Y<20)u[Y*28+X]=p[2]}g.putImageData(id,0,0);return c}
function panelItem(host,name,ic,make){const d=document.createElement('div');d.appendChild(ic);d.appendChild(document.createTextNode(name));
 d.addEventListener('pointerdown',e=>{au();e.preventDefault();const[x,y]=toBoard(e);charge=null;const b=make(x,y);startDrag(b,x,y,true)});host.appendChild(d)}
for(const[k,w]of Object.entries(WP)){if(w.hide)continue;panelItem($('wp'),w.n,icon(shape(k,0),k==='spear'?.6:1),(x,y)=>weapon(k,x,y,0))}
panelItem($('cov'),'Wood slab',icon(slabPix(2),1),(x,y)=>barricade(2,x,y));
panelItem($('cov'),'Metal slab',icon(slabPix(3),1),(x,y)=>barricade(3,x,y));
panelItem($('cov'),'Heavy slab',icon(slabPix(3,32,8),.8),(x,y)=>barricade(3,x,y,32,8));

// people
const fu=$('fu'),fnat=$('fnat'),fw=$('fw'),tp=$('tp');
for(const k of ['','musket','blunder','pistol','spear','sspear','rod']){const o=document.createElement('option');o.value=k;o.textContent=k?WP[k].n:'Unarmed';fw.appendChild(o)}
for(const[k,u]of Object.entries(UNITS)){const o=document.createElement('option');o.value=k;o.textContent=u.n;fu.appendChild(o)}
for(const n of Object.keys(NAT)){const o=document.createElement('option');o.textContent=n;fnat.appendChild(o)}
const fnatv=()=>fnat.value==='Neutral'?null:fnat.value;
function preview(){const g=tp.getContext('2d'),id=g.createImageData(17,17),u=new Uint32Array(id.data.buffer),t={unit:fu.value,nat:fnatv(),guard:false},px=tokPixels(t),set=new Set(px.map(p=>K(p[0],p[1])));
 for(const p of px){let c=pcol(t,p);if(!set.has(K(p[0]+1,p[1]))||!set.has(K(p[0]-1,p[1]))||!set.has(K(p[0],p[1]+1))||!set.has(K(p[0],p[1]-1)))c=mul(c,.36);u[(p[1]+8)*17+p[0]+8]=c}g.putImageData(id,0,0)}
fu.onchange=()=>{fw.value=UNITS[fu.value].w||'';preview()};fnat.onchange=preview;fw.value='';preview();
tp.addEventListener('pointerdown',e=>{au();e.preventDefault();const[x,y]=toBoard(e);charge=null;const b=token($('fn').value||'Unnamed',fnatv(),fu.value,x,y,false,fw.value||null);startDrag(b,x,y,true);listPeople()});
function listPeople(){const l=$('ppl');l.innerHTML='';for(const b of bodies.filter(b=>b.type==='token')){const d=document.createElement('div');if(b.status!=='free')d.className='off';const nc=b.nat&&NAT[b.nat]?NAT[b.nat]:'#d8d4ca';
 d.innerHTML=`<span class="dot" style="background:${nc}"></span><span style="color:${natLabel(b)}">${b.name}</span>${b.status==='dead'?' ✝':b.status==='captured'?' ⛓':''}`;d.onclick=e=>clickBody(b,e.ctrlKey||e.metaKey);l.appendChild(d)}}

function dbl(m,x1,y1,x2,y2,r1,r2,lk,len,th){const a=slab(m,x1,y1,r1,len,th),b=slab(m,x2,y2,r2,len,th);a.pair=b;b.pair=a;a.locked=b.locked=lk;return[a,b]}
function goldify(d){d.gold=true;for(const p of d.px){const c=p[2],l=((c&255)+(c>>8&255)+(c>>16&255))/765;p[2]=mix(rgb(110,84,26),rgb(252,232,160),Math.min(1,l*1.25))}}
const MAPSZ={vault:[30,47],range:[40,40],air:[34,20]};
function reset(){{const sz=MAPSZ[curMap]||[18,14];if(sz[0]!==CW||sz[1]!==CH){alloc(sz[0],sz[1]);LR=new Float32Array(NB);LG=new Float32Array(NB);LB=new Float32Array(NB);LT=new Float32Array(NB);camInit=true}setTimeout(fit,0)}for(const b of bodies)if(b.lab)b.lab.remove();bodies=[];parts=[];drag=null;charge=null;box=null;moveSel=null;sel.clear();build();HZ.fill(0);hzOn=false;if(curMap==='air'){unitsAir();for(const t of bodies)if(t.type==='token')t.hc=null;listPeople();return}if(curMap==='range'){unitsRange();for(const t of bodies)if(t.type==='token')t.hc=null;listPeople();return}if(curMap==='count'){unitsCount();for(const t of bodies)if(t.type==='token')t.hc=null;listPeople();return}if(curMap==='vault'){unitsVault();for(const t of bodies)if(t.type==='token')t.hc=null;listPeople();return}if(curMap==='sewer'){unitsSewer();for(const t of bodies)if(t.type==='token')t.hc=null;listPeople();return}if(curMap==='tavern'){unitsTavern();for(const t of bodies)if(t.type==='token')t.hc=null;listPeople();return}if(curMap==='docks'){unitsDocks();for(const t of bodies)if(t.type==='token')t.hc=null;listPeople();return}
 token('Aldric','Goldbank','guard',36,40,true);token('Bryn','Goldbank','rifle',62,40);token('Pell','Goldbank','rifle',88,40);
 token('Orla','Goldbank','home',28,82);token('Rook','Goldbank','cmd',28,150);token('Tam','Goldbank','shock',150,150,false,'spear');token('Hask','Goldbank','shock',150,186,false,'sspear');
 const c=token('Corin',null,'civ',90,180);c.status='captured';c.held=null;
 const v=token('Varn','Astia','shock',226,56,false,'spear');v.ang=Math.PI;const k=token('Kade','Astia','shock',262,72,false,'sspear');k.ang=Math.PI;
 const m=token('Mira','Astia','cmd',228,150);m.ang=Math.PI;const i=token('Ivo','Astia','rifle',206,196);i.ang=Math.PI;const se=token('Sela','Astia','home',258,196,false,'pistol');se.ang=Math.PI;
 const d=token('Dunn','Astia','rifle',262,136,false,null);d.status='dead';weapon('musket',248,124,2.4);
 slab(2,180,32,1);dbl(3,180,96,187,127,1,3,false);dbl(3,224,171,255,164,0,2,true);
 weapon('grenade',120,196,0);weapon('bomb',60,200,0);weapon('sspear',236,104,.3);
 for(const t of bodies)if(t.type==='token')t.hc=null;listPeople()}
{const r0=reset;reset=function(){r0();snapDoors();sills();alarm=curMap==='range';if(!alarm)for(const t of bodies)if(t.type==='token'&&t.held){t.psi=t.si;t.si=-1;t.held=null;t.hc=null}}}
reset();loop();
})();
