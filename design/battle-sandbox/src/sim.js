(()=>{
const $=id=>document.getElementById(id);
let S=2,EM=null,TOPS=false,OUTD=false;let CW=18,CH=14,W=CW*T,H=CH*T,BW=W/2,BH=H/2,N=W*H,NB=BW*BH;
const cv=$('sb');cv.width=W;cv.height=H;const ctx=cv.getContext('2d');let img=ctx.createImageData(W,H);let out=new Uint32Array(img.data.buffer);
let SH=new Uint8Array(N),GOLD=new Uint8Array(N),floor=new Uint32Array(N),sol=new Uint8Array(N),shp=new Uint8Array(N),scol=new Uint32Array(N),crk=new Uint8Array(N),slabG=new Int32Array(N),GT=new Uint8Array(N),SHN=new Uint8Array(N),DS=new Uint8Array(N),NOD=new Uint8Array(N),OBJ=new Uint8Array(N),SCH=new Uint8Array(N),OBJC=new Uint32Array(N),DMG=new Uint8Array(N);// DMG: chips and holes blasts leave in the floor, which only the wand repairs
const FX={blood:new Float32Array(NB),fire:new Float32Array(NB),smoke:new Float32Array(NB)};
let TF=new Float32Array(NB),SF=new Float32Array(NB),SS=new Float32Array(NB),GM=new Float32Array(NB),ST=new Float32Array(NB),BURN=new Float32Array(NB),FH=new Float32Array(NB),FV=new Float32Array(NB),SV=new Float32Array(NB),DV=new Float32Array(NB),TMP=new Float32Array(NB);
let WH=new Float32Array(N);let whOn=false;
let fxLow=new Uint32Array(N),fxTop=new Uint32Array(N),fxA=new Uint8Array(N),HZ=new Float32Array(NB),OPEN=new Uint8Array(NB);let hzOn=false;let fxDirty=true;
function alloc(cw,ch){CW=cw;CH=ch;W=CW*T;H=CH*T;BW=W/2;BH=H/2;N=W*H;NB=BW*BH;cv.width=W;cv.height=H;img=ctx.createImageData(W,H);out=new Uint32Array(img.data.buffer);
 SH=new Uint8Array(N);solDirty=true;GOLD=new Uint8Array(N);floor=new Uint32Array(N);sol=new Uint8Array(N);shp=new Uint8Array(N);scol=new Uint32Array(N);crk=new Uint8Array(N);slabG=new Int32Array(N);GT=new Uint8Array(N);SHN=new Uint8Array(N);DS=new Uint8Array(N);NOD=new Uint8Array(N);OBJ=new Uint8Array(N);SCH=new Uint8Array(N);OBJC=new Uint32Array(N);DMG=new Uint8Array(N);
 for(const k in FX)FX[k]=new Float32Array(NB);TF=new Float32Array(NB);SF=new Float32Array(NB);SS=new Float32Array(NB);GM=new Float32Array(NB);ST=new Float32Array(NB);BURN=new Float32Array(NB);FH=new Float32Array(NB);FV=new Float32Array(NB);SV=new Float32Array(NB);DV=new Float32Array(NB);TMP=new Float32Array(NB);
 WH=new Float32Array(N);fxLow=new Uint32Array(N);fxTop=new Uint32Array(N);fxA=new Uint8Array(N);HZ=new Float32Array(NB);OPEN=new Uint8Array(NB)}
const rgb=(r,g,b)=>((255<<24)|(b<<16)|(g<<8)|r)>>>0;
// plasma is Umbrastone's energy: its light runs through the stone's iridescent palette
const plasC=h=>{const c=opal(h);return rgb(c[0]|0,c[1]|0,c[2]|0)};
const cl=v=>v<0?0:v>255?255:v|0;
const mul=(c,k)=>rgb(cl((c&255)*k),cl((c>>8&255)*k),cl((c>>16&255)*k));
// recolour a piece drawn in steel into another metal at the same relative brightness, so it matches that metal's tiles
const toneC=(mat,c)=>{const S=metalLit('steel'),t=metalTone(mat,((c&255)+(c>>8&255)+(c>>16&255))/(S[0]+S[1]+S[2]));return rgb(cl(t[0]),cl(t[1]),cl(t[2]))};
const mix=(a,b,t)=>rgb(cl((a&255)+((b&255)-(a&255))*t),cl((a>>8&255)+((b>>8&255)-(a>>8&255))*t),cl((a>>16&255)+((b>>16&255)-(a>>16&255))*t));
const grey=c=>{const l=cl(((c&255)*.3+(c>>8&255)*.59+(c>>16&255)*.11)*.9);return rgb(l,l,l)};
const hx=s=>rgb(parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16));
const css=c=>`rgb(${c&255},${c>>8&255},${c>>16&255})`;
const K=(x,y)=>(x+512)*1024+(y+512);
const MAT={1:{hp:3,f:.6,weld:.05},2:{hp:2,f:.82,weld:.45},3:{hp:6,f:.42,weld:.14},4:{hp:1,f:.9,weld:.5},0:{weld:.3}};

// sound
let gest=false,MS=null,AC=null,mute=false,RV=null,ABUS=null,AWET=null;const last={};
const au=()=>{if(AC){if(AC.state==='suspended')AC.resume();return AC}AC=new (window.AudioContext||window.webkitAudioContext)();MS=AC.createDynamicsCompressor();MS.threshold.value=-16;MS.knee.value=12;MS.ratio.value=6;MS.attack.value=.003;MS.release.value=.2;{const mg=AC.createGain();mg.gain.value=.85;MS.connect(mg).connect(AC.destination)}const a=AC,len=a.sampleRate*.5|0,b=a.createBuffer(2,len,a.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2)*Math.min(1,i/(a.sampleRate*.01))*.6}RV=a.createConvolver();RV.buffer=b;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2200;lp.Q.value=.5;RV.connect(lp).connect(MS);return AC};
function noise(dur,f,q,vol,type,wet){const a=au(),len=Math.max(1,a.sampleRate*dur|0),n=a.createBuffer(1,len,a.sampleRate),d=n.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);const s=a.createBufferSource();s.buffer=n;const fl=a.createBiquadFilter();fl.type=type||'lowpass';fl.frequency.value=f;fl.Q.value=q;const g=a.createGain();g.gain.value=vol*SVOL;s.connect(fl).connect(g).connect(ABUS||MS);if(wet){const w=a.createGain();w.gain.value=wet;g.connect(w).connect(AWET||RV)}s.start()}
function tone(f,dur,vol){const a=au(),o=a.createOscillator(),g=a.createGain();o.frequency.value=f;g.gain.setValueAtTime(vol*SVOL,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+dur);o.connect(g).connect(ABUS||MS);o.start();o.stop(a.currentTime+dur)}
const SFX={ping:()=>{const f=2600+Math.random()*1800;noise(.03,7000,1,.35,'highpass',.25);tone(f,.16,.09);tone(f*1.47,.1,.05);tone(f*.52,.22,.04)},plate:()=>{const f=700+Math.random()*300;noise(.05,3200,1.5,.4,'bandpass',.3);tone(f,.26,.12);tone(f*1.73,.18,.06);tone(f*.5,.3,.07)},stonehit:()=>{noise(.035,5200,.7,.45,'highpass',.2);noise(.09,900,1.2,.35,'bandpass');noise(.18,240,.8,.25,'lowpass');setTimeout(()=>noise(.06,3000,1,.08,'bandpass'),30+Math.random()*40)},woodhit:()=>{const f=180+Math.random()*90;tone(f,.09,.22);noise(.06,1300,2.5,.4,'bandpass',.1);noise(.03,4200,1,.15,'highpass')},boltmetal:()=>{noise(.16,5200,.6,.32,'highpass',.15);noise(.05,900,1.2,.3,'bandpass');noise(.03,240,.8,.35,'lowpass');setTimeout(()=>noise(.09,3400,1.5,.06,'bandpass'),40+Math.random()*50)},pthud:()=>{noise(.3,240,.7,.55,'lowpass',.25);noise(.1,1800,.6,.16,'bandpass')},rustle:()=>{noise(.14,520,.6,.07,'lowpass');noise(.1,240,.7,.05,'lowpass')},dash:()=>{const a=au(),t=a.currentTime,len=a.sampleRate*.26|0,buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++){const u=i/len;d[i]=(Math.random()*2-1)*Math.sin(Math.PI*Math.pow(u,.6))}const src=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();src.buffer=buf;f.type='bandpass';f.Q.value=.9;f.frequency.setValueAtTime(700,t);f.frequency.exponentialRampToValueAtTime(2600,t+.24);g.gain.value=.09*SVOL;src.connect(f).connect(g).connect(MS);src.start(t)},vent:()=>{noise(.7,3600,.5,.16,'highpass',.25);noise(.45,1400,.8,.07,'bandpass');setTimeout(()=>noise(.25,6000,.7,.05,'highpass'),260)},rodshot:()=>{noise(.32,260,.6,1,'lowpass',.45);noise(.05,5200,.6,.35,'highpass',.3);tone(760,.14,.1)},hiss:()=>noise(.3,5600,.7,.22,'highpass',.3),thunk:()=>noise(.14,520,1,.6),crack:()=>noise(.07,2600,.8,.3,'highpass'),boom:()=>noise(.8,160,.7,1),bigboom:()=>{noise(1.7,110,.6,1.5,'lowpass',.6);noise(.5,900,.5,.6,'bandpass',.4);noise(.12,3500,.5,.4,'highpass');setTimeout(()=>noise(.7,2400,.4,.16,'bandpass'),200)},clink:()=>{noise(.06,2800,2.5,.2,'bandpass');noise(.02,6000,1,.08,'highpass')},wedge:()=>{noise(.09,520,.8,.55,'lowpass',.18);tone(128,.2,.38);tone(92,.26,.26);setTimeout(()=>{tone(610,.28,.05);tone(1330,.2,.022);noise(.14,2400,4,.06,'bandpass')},14)},whoosh:()=>noise(.16,900,.7,.14,'bandpass'),tick:()=>noise(.02,3200,1,.07,'highpass'),flick:()=>noise(.025,1100,1,.05,'bandpass'),crash:()=>noise(.35,1300,.5,.45,'bandpass'),squish:()=>noise(.12,320,4,.4,'bandpass'),shot:()=>{noise(.45,600,.4,1,'lowpass',.4);noise(.08,3000,.5,.3,'highpass',.4)},pshot:()=>{noise(.28,900,.4,.75,'lowpass',.34);noise(.06,3600,.5,.3,'highpass',.34)},step:()=>noise(.05,380,1,.22),st_wood:()=>{const v=.88+Math.random()*.24,g=.18*(.85+Math.random()*.3);noise(.06,259*v,2.4,.24*g,'bandpass');tone(120*v,.05,.05*g)},st_stone:()=>{const v=.88+Math.random()*.24,g=.18*(.85+Math.random()*.3);noise(.035,828*v,1.1,.17*g,'bandpass');noise(.02,1872*v,.8,.035*g,'bandpass')},st_marble:()=>{const v=.88+Math.random()*.24,g=.18*(.85+Math.random()*.3);noise(.03,1224*v,1.4,.15*g,'bandpass',.15);noise(.015,2160*v,.8,.03*g,'bandpass')},st_metal:()=>{const v=.9+Math.random()*.2,g=.85+Math.random()*.3;noise(.05,520*v,2.5,.05*g,'bandpass');noise(.08,180*v,.8,.05*g,'lowpass');tone(150*v,.16,.016*g);tone(232*v,.12,.008*g);tone(371*v,.07,.003*g)},st_grass:()=>{const g=.18*(.85+Math.random()*.3);noise(.09,1224+Math.random()*500,.6,.08*g,'bandpass');noise(.05,187,1,.08*g)},st_dirt:()=>{const v=.88+Math.random()*.24,g=.18*(.85+Math.random()*.3);noise(.06,468*v,.8,.15*g,'bandpass');noise(.04,1440*v,.7,.04*g,'bandpass')},creak:()=>{const v=.85+Math.random()*.3;noise(.07,420*v,4,.006,'bandpass');noise(.04,900*v,6,.003,'bandpass')},jingle2:()=>{const n=3+(Math.random()*2|0);for(let i=0;i<n;i++){const f=1700+Math.random()*1500,d=i*(.016+Math.random()*.018);setTimeout(()=>{tone(f,.06,.0028);tone(f*1.47,.04,.0013)},d*1000)}noise(.03,3400,3,.006,'bandpass')},clank:()=>{const v=.9+Math.random()*.2;tone(380*v,.08,.006);tone(760*v*1.03,.06,.003);noise(.05,1400*v,3,.012,'bandpass');setTimeout(()=>{tone((1200+Math.random()*900),.05,.002)},25)},jingle:()=>{const a=au(),n=2+(Math.random()*2|0);for(let i=0;i<n;i++){const f=2600+Math.random()*2400,d=i*(.018+Math.random()*.02);setTimeout(()=>{tone(f,.05,.002);tone(f*1.47,.035,.001)},d*1000)}noise(.02,5200,3,.004,'bandpass')},st_carpet:()=>noise(.05,130+Math.random()*40,1,.15*.18*(.85+Math.random()*.3)),chink:()=>{noise(.04,6200,4,.1,'bandpass');tone(2700,.05,.025)},pin:()=>{tone(2300,.05,.1);noise(.02,4000,1,.1,'highpass')},twang:()=>{tone(170,.18,.16);noise(.05,2200,1,.15,'bandpass')},sizzle:()=>noise(.09,5200,.7,.05,'highpass'),door:()=>noise(.14,300,2,.4,'bandpass'),slash:()=>noise(.12,2400,.8,.28,'bandpass'),drop:()=>{noise(.35,140,1,.9);noise(.1,900,1,.3,'bandpass')},lock:()=>{tone(1200,.05,.1);noise(.03,3000,1,.12,'highpass')},dust:()=>noise(.1,1800,.6,.12,'bandpass'),arcshot:()=>{const a=au(),t=a.currentTime,o=a.createOscillator(),g=a.createGain(),f=a.createBiquadFilter(),l=a.createOscillator(),lg=a.createGain();o.type='square';o.frequency.setValueAtTime(1500,t);o.frequency.exponentialRampToValueAtTime(80,t+.5);f.type='bandpass';f.frequency.setValueAtTime(2600,t);f.frequency.exponentialRampToValueAtTime(260,t+.5);f.Q.value=3;g.gain.setValueAtTime(.4,t);g.gain.exponentialRampToValueAtTime(.001,t+.55);l.frequency.value=36;lg.gain.value=320;l.connect(lg).connect(o.frequency);o.connect(f).connect(g).connect(MS);const w=a.createGain();w.gain.value=.5;g.connect(w).connect(RV);o.start(t);l.start(t);o.stop(t+.58);l.stop(t+.58);noise(.6,170,.6,1,'lowpass',.5);noise(.35,6000,.6,.3,'highpass')},zap:()=>{noise(.08,5000,1,.22,'highpass');noise(.05,1300,1,.1,'bandpass')},sblast:()=>{noise(.5,300,.6,.9,'lowpass',.4);noise(.2,3200,.5,.45,'highpass');const a=au(),t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='sawtooth';o.frequency.setValueAtTime(2400,t);o.frequency.exponentialRampToValueAtTime(60,t+.45);g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g).connect(MS);const w=a.createGain();w.gain.value=.5;g.connect(w).connect(RV);o.start(t);o.stop(t+.52);noise(.12,6000,.8,.4,'highpass',.3)},surge:()=>{noise(1.1,120,.7,1.1,'lowpass',.5);noise(.35,2600,.5,.3,'highpass',.3);noise(.12,6000,.8,.25,'highpass')},reload:()=>{noise(.05,2600,2,.3,'bandpass');setTimeout(()=>{noise(.04,1800,3,.35,'bandpass');tone(900,.04,.05)},140)},dry:()=>{noise(.014,1800,5,.4,'bandpass');noise(.03,700,3,.3,'bandpass');setTimeout(()=>noise(.02,2600,6,.22,'bandpass'),55)},rico:()=>{const a=au(),t=a.currentTime,len=a.sampleRate*.34|0,buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.6);const src=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();src.buffer=buf;f.type='bandpass';f.Q.value=9;f.frequency.setValueAtTime(3000+Math.random()*900,t);f.frequency.exponentialRampToValueAtTime(900,t+.3);g.gain.value=.55;src.connect(f).connect(g).connect(MS);const w=a.createGain();w.gain.value=.25;g.connect(w).connect(RV);src.start(t);noise(.025,4200,1,.3,'highpass')},
ricos:()=>{noise(.05,2400,1.2,.4,'bandpass',.2);noise(.14,800,.9,.28,'bandpass',.2);setTimeout(()=>noise(.05,1500,1.5,.12,'bandpass'),40)}};
let SVOL=1;const pq=[];function sfxP(k,v){const t=performance.now();while(pq.length&&t-pq[0]>110)pq.shift();if(pq.length>=5||mute||!gest)return;pq.push(t);setTimeout(()=>{SVOL=v||.6;try{SFX[k]()}catch(e){}SVOL=1},Math.random()*55)}
function sfx(k){if(mute||!gest)return;const t=performance.now();if(last[k]&&t-last[k]<(k==='sizzle'?70:45))return;last[k]=t;try{SFX[k]()}catch(e){}}
for(const ev of ['pointerdown','keydown','touchstart'])window.addEventListener(ev,()=>{gest=true;try{au()}catch(e){}},{capture:true});
$('snd').onclick=()=>{mute=!mute;$('snd').style.opacity=mute?.35:1;if(!mute)sfx('mhit')}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&AC&&AC.state!=='running')AC.resume()});;

// map
let map=[],UND=[];LINK=(x,y)=>map[y]&&map[y][x];// UND: the floor laid under furniture and walls, shown when they are destroyed
const undAt=(cx,cy)=>UND[cy]&&UND[cy][cx]||null;
function tilePix(key,cx,cy){const f=TEX[key]||TEX.dirt,d=new Uint8ClampedArray(T*T*4);for(let y=0;y<T;y++)for(let x=0;x<T;x++){WEARF=0;const c=f(cx*T+x,cy*T+y,cx,cy)||SOIL,i=(y*T+x)*4;d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255-WEARF}return d}
// every tile has one material; custom textures take their recipe's, or their parent's. Hit class: 1 stone, 2 wood, 3 metal
let EDOK=false;
// hit material of the keys outside the material table (earth names, fence, sill, sky) and of furniture
const BMAT={hedge:'foliage',bush:'grass',grass:'grass',crop:'grass',dirt:'soil',berm:'soil',sky:'soil',rail:'wood',sill:'stone',msill:'marble',
 ...Object.fromEntries(Object.keys(MCHEST).map(k=>[k,'metal'])),...Object.fromEntries(Object.keys(WPIECE).map(k=>[k,'wood']))};
function matK(k){if(!k)return'stone';k=modK(k);if(/[HNS]$/.test(k)&&WMAT[k.slice(0,-1)])k=k.slice(0,-1);if(EDOK){const m=MODS.tex[k];if(m)return m.rec?m.rec.mat==='plaster'?'stone':m.rec.mat:matK(m.from);
 if(CATN[k]){const[el,mm]=CATN[k];return mprop(el,mm).cls}}return BMAT[k]||'stone'}
const hitCls=m=>m==='metal'?3:m==='foliage'?4:m==='stone'||m==='marble'||m==='soil'?1:2;
const WMAT={bush:2,berm:1,rail:2};
const SHINE={msill:28};
let HALFF='dirt';
function paintCell(cx,cy,key){if(cx<0||cy<0||cx>=CW||cy>=CH)return;NAVD=true;key=modK(key);map[cy][cx]=key;const hv=key.length>1&&'HNS'.includes(key.slice(-1))&&WMAT[key.slice(0,-1)]?key.slice(-1):'',half=!!hv,bk=half?key.slice(0,-1):key,d=tilePix(bk,cx,cy),g=half?tilePix(undAt(cx,cy)||HALFF,cx,cy):null,m=WMAT[bk]||0,hpK=CATN[bk]?mprop(CATN[bk][0],CATN[bk][1]).hp:(MAT[m]||{}).hp,gk=CATN[bk]&&CATN[bk][0]==='Stone'&&CATN[bk][1]==='gold'?1:0,ud=m&&undAt(cx,cy)?tilePix(undAt(cx,cy),cx,cy):null;
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const i=(y*T+x)*4,X=cx*T+x,Y=cy*T+y,j=Y*W+X,hf=half&&(hv==='H'?x>=T/2:hv==='N'?y>=T/2:y<T/2),c=hf?rgb(g[i],g[i+1],g[i+2]):rgb(d[i],d[i+1],d[i+2]);crk[j]=0;SHN[j]=hf?0:SHINE[bk]||0;NOD[j]=NODK.has(bk)?1:0;
  GOLD[j]=gk&&hh(X,Y,61)>.985?2:gk;if(m&&!hf){sol[j]=m;solDirty=true;const wf=255-d[i+3];shp[j]=wf===2?1:wf===1?Math.max(1,hpK-1):hpK;scol[j]=c;floor[j]=ud?mul(rgb(ud[i],ud[i+1],ud[i+2]),.7):mul(c,.42)}else{sol[j]=0;solDirty=true;floor[j]=c}}}
let curMap='bank';
const NBM={council:buildCouncil,road:buildRoad,alley:buildAlley,stock:buildStock},NUM={council:unitsCouncil,road:unitsRoad,alley:unitsAlley,stock:unitsStock};
function build(){UND=[];REP.clear();WWT.clear();WB0.clear();HTM.clear();OWT.clear();OB0.clear();(NBM[curMap]||(curMap==='vault'?buildVault:curMap==='count'?buildCount:curMap==='range'?buildRange:curMap==='air'?buildAir:buildBank))();resill();relink();blendGround();objects();boards();borders();regions();polish();cracks();edgeMask()}
// grass and soil meet in a soft worn edge; GT marks which ground each pixel shows
// rugs get a border, tables and desks an edge and an inlay line
function regions(){for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const ok=OM[cy]&&OM[cy][cx],k=ok||map[cy][cx],rug=RUG.has(k);if(!rug&&!ok)continue;const L=ok?OM:map,bk=baseK(k),o=(x,y)=>!L[y]||baseK(L[y][x])!==bk&&!(rug&&OM[y]&&OM[y][x]);
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.min(o(cx-1,cy)?x:99,o(cx+1,cy)?T-1-x:99,o(cx,cy-1)?y:99,o(cx,cy+1)?T-1-y:99),j=(cy*T+y)*W+cx*T+x;let c=floor[j];
  if(rug&&!ok){const t=ageT(condK(k));if(t>.3&&d<=1&&hh(cx*T+x,cy*T+y,95)>.97-.1*t)c=mul(c,.62);else if(d===0)c=mul(c,.6);else if(d<=3)c=mix(mul(c,.9),/gcarpet|verdant/.test(k)?rgb(176,140,70):/pcarpet|purple/.test(k)?rgb(188,184,204):rgb(150,104,60),(x+y)%3?.5:.62);else if(d===4)c=mul(c,.72)}
  if(ok){const F=WPIECE[baseK(k)]&&woodFin(WPIECE[baseK(k)][0]);c=OBJC[j];if(d===0)c=mul(c,F?F.rim:.5);else if(d===1)c=mul(c,x===0||y===0||o(cx-1,cy)&&x===1||o(cx,cy-1)&&y===1?1.12:.82);else if(d===3&&F&&/^(table|desk)$/.test(wshape(k)))c=mix(c,rgb(...F.gl),F.gt);OBJC[j]=c}else floor[j]=c}}
 if(curMap==='vault')inlays()}
// plank joints are laid from each floor's own edges, boards split evenly across its width
const PLK=new Set();
function boards(){const seen=new Set();for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=map[cy][cx];if(!PLK.has(k))continue;
 for(let y=0;y<T;y+=8){const Y=cy*T+y,id=Y*CW+cx;if(seen.has(id))continue;let a=cx,b=cx;while(map[cy][a-1]===k)a--;while(map[cy][b+1]===k)b++;for(let q=a;q<=b;q++)seen.add(Y*CW+q);
  const x0=a*T,w=(b-a+1)*T,n=1,row=Y>>3;for(let X=x0;X<x0+w;X++){const bi=Math.floor((X-x0)*n/w),edge=Math.floor((X-x0)*n/w)!==Math.floor((X-x0-1)*n/w)&&X>x0;
   for(let yy=0;yy<8;yy++){const j=(Y+yy)*W+X;if(sol[j])continue;let c=mul(floor[j],.95+hh(row,bi,45)*.1);if(edge&&yy<7)c=mul(c,.86);floor[j]=c}}}}}
// every laid surface gets a soft edge where it meets a different one
const NOB=new Set(['grass','dirt','sky','bush','sill','msill']);
// what each material-table key is: wall class, shine (dulled by wear), no-border and plank sets; set before the first map is built
for(const k in CATN){const[el,mat,v,w]=CATN[k];const P=mprop(el,mat),cd=CATN[k][4]||5;if(w)WMAT[k]=hitCls(P.cls);if(P.shine)SHINE[k]=Math.round(P.shine*(.4+.6*(cd-1)/4));if(!w&&(el==='Earth'||el==='Cloth')||el==='Wood'&&v==='panel')NOB.add(k);if(!w&&el==='Wood'&&v==='planks')PLK.add(k)}
for(const k in MCHEST){SHINE[k]=mprop('Metal',MCHEST[k][0]).shine;for(let c=1;c<5;c++)SHINE[k+'~'+c]=Math.round(SHINE[k]*(.4+.6*(c-1)/4))}SHINE.mchest=60;
// tile borders follow inner corners too, so a rim turns square instead of breaking
function borders(){for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=map[cy][cx];if(!TEX[k]||NOB.has(k)||OM[cy]&&OM[cy][cx])continue;const bk=baseK(k),o=(x,y)=>map[y]&&map[y][x]!==undefined&&baseK(map[y][x])!==bk;
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){let d=Math.min(o(cx-1,cy)?x:99,o(cx+1,cy)?T-1-x:99,o(cx,cy-1)?y:99,o(cx,cy+1)?T-1-y:99);for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])if(!o(cx+a,cy)&&!o(cx,cy+b)&&o(cx+a,cy+b))d=Math.min(d,Math.max(a<0?x:T-1-x,b<0?y:T-1-y));if(d>(WMAT[k]===3?2:1))continue;const j=(cy*T+y)*W+cx*T+x,mt=WMAT[k]===3,f=mt?[.7,1.3,.88][d]:d===0?.84:1.05;if(sol[j])scol[j]=mul(scol[j],f);else floor[j]=mul(floor[j],f)}}}
const fmat=k=>hitCls(matK(k));
function objMat(){for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=OM[cy][cx];if(!k)continue;const m=fmat(k);for(let y=0;y<T;y++)for(let x=0;x<T;x++){const j=(cy*T+y)*W+cx*T+x;if(OBJ[j])OBJ[j]=m}}}
// furniture and fixtures: above the floor, block walking, bullets pass over, blasts break them
const OBJK=new Set([...Object.keys(WPIECE).filter(k=>WPIECE[k][1]!=='seat'),'books','shelf',...Object.keys(MCHEST),'wagon','hedge']),ONAME={...Object.fromEntries(Object.entries(MCHEST).map(([k,v])=>[k,v[1]])),...Object.fromEntries(Object.entries(WPIECE).map(([k,v])=>[k,v[2]])),hedge:'Hedge',wagon:'Wagon',books:'Shelves',shelf:'Shelf'};let OM=[];
function objects(){OM=Array.from({length:CH},()=>Array(CW).fill(null));OBJ.fill(0);const cells=[];for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)if(OBJK.has(map[cy][cx])){OM[cy][cx]=map[cy][cx];cells.push([cx,cy])}
 for(const[cx,cy]of cells){let u=null;for(const d of [2,1,3,4])for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){if(u)break;const k=(map[cy+b*d]||[])[cx+a*d];if(k&&!OBJK.has(k)&&!WMAT[k]&&!(k.endsWith('H')&&WMAT[k.slice(0,-1)])&&k!=='sky')u=k}const k=OM[cy][cx],m=fmat(k);paintCell(cx,cy,undAt(cx,cy)||u||'flag');
  for(let y=0;y<T;y++)for(let x=0;x<T;x++){const X=cx*T+x,Y=cy*T+y,j=Y*W+X,c=TEX[k](X,Y,cx,cy);if(!c)continue;OBJ[j]=m;OBJC[j]=rgb(cl(c[0]),cl(c[1]),cl(c[2]));SHN[j]=SHINE[k]||0}}pieces();furnish()}
// storage and desks come in pieces of at most 2×2, filled from the top-left; each piece has its own rim and inventory
const PCK=new Set([...Object.keys(WPIECE).filter(k=>/chest|desk/.test(WPIECE[k][1])),...Object.keys(MCHEST),'books','shelf']);let PCS=new Map();
for(const k of[...Object.keys(MCHEST),...Object.keys(WPIECE)])for(let c=1;c<5;c++){const n=k+'~'+c;if(OBJK.has(k))OBJK.add(n);if(PCK.has(k))PCK.add(n);ONAME[n]=ONAME[k];BMAT[n]=BMAT[k]}
function pieces(){PCS=new Map();for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=OM[cy][cx];if(!k||!PCK.has(k)||PCS.has(cy*CW+cx))continue;const ok=(x,y)=>OM[y]&&OM[y][x]===k&&!PCS.has(y*CW+x),w=ok(cx+1,cy)?2:1,h=ok(cx,cy+1)&&(w<2||ok(cx+1,cy+1))?2:1,p={k,x0:cx,y0:cy,w,h,cells:[]};
 for(let y=cy;y<cy+h;y++)for(let x=cx;x<cx+w;x++){p.cells.push([x,y]);PCS.set(y*CW+x,p)}}}
// finishes: riveted iron band on chests and racks, book spines on a bookshelf's open edges, a riveted steel vault shelf
function furnish(){const done=new Set(),C=a=>rgb(cl(a[0]),cl(a[1]),cl(a[2]));
 const open=(x,y)=>{const k=map[y]&&map[y][x];return !!k&&!WMAT[k]&&!(k.endsWith('H')&&WMAT[k.slice(0,-1)])&&k!=='sky'&&!(OM[y]&&OM[y][x])};
 for(const p of PCS.values()){if(done.has(p)||wshape(p.k)==='desk')continue;done.add(p);const MC=MCHEST[baseK(p.k)],A=MC&&ageOf('Metal',MC[0],condK(p.k)),pw=p.w*T,ph=p.h*T,X0=p.x0*T,Y0=p.y0*T,B=Math.max(3,Math.round(Math.min(pw,ph)*.25));
  for(let v=0;v<ph;v++)for(let u=0;u<pw;u++){const X=X0+u,Y=Y0+v,j=Y*W+X,e=[u,v,pw-1-u,ph-1-v],d=Math.min(...e),s=e.indexOf(d),al=s===0||s===2?v:u;let c=OBJC[j];
   const cx=X/T|0,cy=Y/T|0,fl=open(cx+(s===0?-1:s===2?1:0),cy+(s===1?-1:s===3?1:0)),hi=s<2?1.15:.82;
   if(MC){const m=sc(metalLit(MC[0]),.62);
    if(d===0)c=mul(c,.5);else if(d<=2){c=C(m.map(q=>q*(d===1?hi:1)));}
    if(A&&d>0){const r=A([c&255,c>>8&255,c>>16&255],X*2,Y*2,()=>d-1);c=C(r)}}
   OBJC[j]=c}}}
function inlays(){const ring=(X0,Y0,R)=>{for(let Y=Y0-R-2;Y<=Y0+R+2;Y++)for(let X=X0-R-2;X<=X0+R+2;X++){const j=Y*W+X;if(sol[j]||OBJ[j])continue;const dx=X-X0+.5,dy=Y-Y0+.5,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx),st=R*.42+R*.36*Math.pow(Math.abs(Math.cos(4*a)),3),gm=(c,t)=>mix(c,rgb(214,176,96),t),dm=()=>{const c=TEX['stone.aur.chequer'](X,Y);return rgb(cl(c[0]),cl(c[1]),cl(c[2]))};
  let c=null;if(r<4)c=gm(floor[j],.85);else if(Math.abs(r-st)<.8)c=gm(floor[j],.7);else if(r<st)c=r<st*.55?floor[j]:dm();else if(Math.abs(r-R*.82)<.7||Math.abs(r-R)<.7)c=gm(floor[j],.7);else if(r>R*.82&&r<R)c=dm();if(c!==null){floor[j]=c;SHN[j]=c===floor[j]?SHN[j]:40}}};
 ring(240,408,40)}
function container(cx,cy,items,name){const k=OM[cy]&&OM[cy][cx];if(!k)return null;if(wshape(k)==='table'){for(const it of items||[]){const w=weapon(it.k,cx*T+4+Math.random()*8,cy*T+4+Math.random()*8,Math.random()*6.283);if(it.k==='gold')w.amt=it.n;else if(it.ammo!==undefined){w.ammo=it.ammo;w.res=it.res}}return null}const pc=PCS.get(cy*CW+cx),cells=pc?pc.cells.slice():[],seen=new Set([cy*CW+cx]),q=pc?[]:[[cx,cy]];while(q.length){const[a,b]=q.pop();cells.push([a,b]);for(const[da,db]of[[1,0],[-1,0],[0,1],[0,-1]]){const na=a+da,nb=b+db;if(OM[nb]&&OM[nb][na]===k&&!seen.has(nb*CW+na)){seen.add(nb*CW+na);q.push([na,nb])}}}
 const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]),box=[Math.min(...xs)*T,Math.min(...ys)*T,(Math.max(...xs)+1)*T-1,(Math.max(...ys)+1)*T-1],c=weapon('crate',(box[0]+box[2])/2,(box[1]+box[3])/2,0);
 c.px=[];mkSet(c);c.hidden=true;c.mass=1e9;c.name=name||ONAME[k];c.cells=cells;c.box=box;cFill(c,items);c.n0=cells.length*T*T;c.metal=fmat(k)===3;return c}
const containerAt=(X,Y)=>{const cx=X/T|0,cy=Y/T|0;if(!OBJ[Y*W+X])return null;return bodies.find(o=>o.hidden&&o.cells.some(c=>c[0]===cx&&c[1]===cy))||null};
const EDG=new Set();
function cutEdges(x,y,R){const x0=Math.max(1,Math.floor(x-R-3)),x1=Math.min(W-2,Math.ceil(x+R+3)),y0=Math.max(1,Math.floor(y-R-3)),y1=Math.min(H-2,Math.ceil(y+R+3)),add=[];
 for(let Y=y0;Y<=y1;Y++)for(let X=x0;X<=x1;X++){const j=Y*W+X;if(!OBJ[j]||EDG.has(j))continue;const lt=!OBJ[j-1]||!OBJ[j-W],rb=!OBJ[j+1]||!OBJ[j+W];if(!lt&&!rb)continue;
  if(Math.hypot(X-x,Y-y)>R+3)continue;EDG.add(j);const k=OM[Y/T|0]&&OM[Y/T|0][X/T|0],metal=!!k&&matK(k)==='metal';OBJC[j]=metal?mul(OBJC[j],rb?.7:1.25):mul(OBJC[j],rb?.55:1.15);
  if(!metal&&hh(X,Y,57)<.3){const sx=!OBJ[j+1]?1:!OBJ[j-1]?-1:0,len=1+(hh(X,Y,58)*2|0);if(sx)for(let i=1;i<=len;i++){const q=j+sx*i;if(OBJ[q]||sol[q])break;add.push([q,mul(OBJC[j],.8-.1*i),OBJ[j]])}}}
 for(const[q,c,m]of add){OBJ[q]=m;OBJC[q]=c;EDG.add(q)}}
function scorchRays(x,y,s){const n=8+(Math.random()*8*Math.min(1.5,s)|0),R=18*s;for(let r=0;r<n;r++){const a=Math.random()*6.283,len=R*(.5+Math.random()*.9),w0=.4+Math.random()*.7*s,c=Math.cos(a),sn=Math.sin(a),sd=Math.random()*99;
 for(let t=3;t<len;t+=.5){const f=1-t/len,w=w0*f;for(let u=-w;u<=w;u+=.5){const X=Math.round(x+c*t-sn*u),Y=Math.round(y+sn*t+c*u);if(X<1||Y<1||X>=W-1||Y>=H-1)continue;const j=Y*W+X;if(sol[j])continue;const al=.15*Math.pow(f,1.4)*(.75+.4*hh(X,Y,60));SCH[j]=1;if(OBJ[j])OBJC[j]=mix(OBJC[j],rgb(30,22,16),al);else floor[j]=mix(floor[j],rgb(26,22,20),al)}}}}
function wreck(x,y,s){const R0=10*s,R=R0*1.5;let hit=false;for(let Y=Math.floor(y-R);Y<=y+R;Y++)for(let X=Math.floor(x-R);X<=x+R;X++){if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(!OBJ[j])continue;const q=Math.hypot(X-x,Y-y)/(R0*(OBJ[j]===3?.8:1.5))*(.8+.4*hh(X,Y,88));if(q>=1)continue;OBJ[j]=0;SHN[j]=0;hit=true;NAVD=true;wearObj(X>>4,Y>>4,.12);if(hh(X,Y,89)<.55)floor[j]=mix(floor[j],mul(OBJC[j],.45),.7)}
 if(!hit)return;cutEdges(x,y,R);for(const c of bodies.filter(o=>o.hidden)){let n=0;for(const[a,b]of c.cells)for(let yy=0;yy<T;yy++)for(let xx=0;xx<T;xx++)n+=OBJ[(b*T+yy)*W+a*T+xx];if(n>=c.n0*.7)continue;
  for(const it of c.inv){if(!it)continue;if(it.k==='note'){placeNote(it,c.x,c.y);continue}for(let i=0;i<Math.min(6,it.k==='gold'?1:it.n||1);i++){const a=Math.random()*6.283;let px=c.x+Math.cos(a)*6,py=c.y+Math.sin(a)*6;const w=weapon(it.k,px,py,a);if(solidHits(w,0,0)){[px,py]=spillAt(c);w.x=px;w.y=py}if(it.k==='gold')w.amt=it.n;if(CAP[it.k]){w.ammo=it.ammo??CAP[it.k];w.res=it.res||0}if(it.k==='grenade'||it.k==='bomb')w.fuse=8+(Math.random()*30|0);w.vx=Math.cos(a)*2;w.vy=Math.sin(a)*2}}remove(c);if(openCrate===c)openCrate=null}}
// tethers: rope or chain from a ring on a wall face; a little give, then a hard stop
const TETH={rope:{give:4,hp:.5},chain:{give:1.5,hp:2.6}};
function findAnchor(x,y){let best=null;const c0=x/T|0,r0=y/T|0;for(let cy=r0-3;cy<=r0+3;cy++)for(let cx=c0-3;cx<=c0+3;cx++){const k=map[cy]&&map[cy][cx];if(!k||!WMAT[k])continue;
 for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=map[cy+b]&&map[cy+b][cx+a];if(!n||WMAT[n])continue;const ax=cx*T+T/2+a*T/2,ay=cy*T+T/2+b*T/2,d=Math.hypot(ax-x,ay-y);if(!best||d<best.d)best={x:ax,y:ay,d,ix:Math.round(ax-a*1.5),iy:Math.round(ay-b*1.5)}}}return best}
function tie(b,kind,len){const a=findAnchor(b.x,b.y);if(!a)return false;const aj=a.iy*W+a.ix;b.tether={kind,x:a.x,y:a.y,aj,s0:shp[aj],len:len||Math.max(14,a.d)+6,hp:TETH[kind].hp};sfx(kind==='chain'?'chink':'flick');return true}
function snapT(b){if(!b.tether||b.tether.broken)return;b.tether.broken=true;sfx(b.tether.kind==='chain'?'clink':'twang');for(let i=0;i<4;i++)spark(b.tether.x,b.tether.y,b.tether.kind==='chain'?rgb(150,160,154):rgb(150,116,70),0,0,1.5,6)}
function leash(b){const t=b.tether;if(!t||t.broken)return;const dx=b.x-t.x,dy=b.y-t.y,d=Math.hypot(dx,dy)||1;if(d>t.len){b.x=t.x+dx/d*t.len;b.y=t.y+dy/d*t.len}}
function tetherTick(){for(const b of bodies){const t=b.tether;if(!t||t.broken||b.type!=='token'||inDrag(b))continue;if(t.aj>=0&&(!sol[t.aj]||shp[t.aj]<t.s0*(t.kind==='chain'?.5:.99))){snapT(b);continue}
 const dx=b.x-t.x,dy=b.y-t.y,d=Math.hypot(dx,dy)||1;if(d<=t.len)continue;const mx=t.len+TETH[t.kind].give,ux=dx/d,uy=dy/d,k=Math.min(1,(d-t.len)/(mx-t.len));b.vx-=ux*k*.2;b.vy-=uy*k*.2;
 if(d>mx){b.x=t.x+ux*mx;b.y=t.y+uy*mx;const vr=b.vx*ux+b.vy*uy;if(vr>0){b.vx-=ux*vr;b.vy-=uy*vr}b.glide=null}}}
function blastTethers(x,y,s){const R=14*s;for(const b of bodies){const t=b.tether;if(!t||t.broken)continue;const vx=b.x-t.x,vy=b.y-t.y,L2=vx*vx+vy*vy||1,u=Math.max(0,Math.min(1,((x-t.x)*vx+(y-t.y)*vy)/L2)),d=Math.hypot(t.x+vx*u-x,t.y+vy*u-y);if(d>=R)continue;t.hp-=(1-d/R)*2.5*s;if(t.hp<=0)snapT(b)}}
function drawTethers(){for(const b of bodies){const t=b.tether;if(!t)continue;const ch=t.kind==='chain',bx=Math.round(b.x),by=Math.round(b.y);let x1=b.x,y1=b.y;if(t.broken){const d=Math.hypot(b.x-t.x,b.y-t.y)||1;x1=t.x+(b.x-t.x)/d*4;y1=t.y+(b.y-t.y)/d*4}
 const n=Math.ceil(Math.max(Math.abs(x1-t.x),Math.abs(y1-t.y)));for(let i=0;i<=n;i++){const X=Math.round(t.x+(x1-t.x)*i/n),Y=Math.round(t.y+(y1-t.y)*i/n);if(X<0||Y<0||X>=W||Y>=H||sol[Y*W+X]||!t.broken&&b.set.has(K(X-bx,Y-by)))continue;
  out[Y*W+X]=ch?(i%3===0?rgb(70,78,74):i%3===1?rgb(178,188,182):rgb(128,138,132)):(i%2?rgb(118,88,52):rgb(160,126,80))}
 for(const[a,c]of[[-1,0],[1,0],[0,-1],[0,1],[0,0]]){const X=Math.round(t.x)+a,Y=Math.round(t.y)+c;if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=a||c?rgb(150,160,154):rgb(40,44,42)}}}
// doorways get a threshold stone under the leaf
function sills(){for(const d of bodies){if(d.type!=='slab'||d.free)continue;const cs=new Set(),bx=Math.round(d.x),by=Math.round(d.y);for(const p of d.px)cs.add(((by+p[1])/T|0)*CW+((bx+p[0])/T|0));
 for(const k of cs){const cx=k%CW,cy=k/CW|0,key=map[cy]&&map[cy][cx];if(!key||WMAT[key]||key==='sky'||key==='dirt'||key==='grass'||key==='sill'||key==='msill')continue;const m=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>{const q=(map[cy+b]||[])[cx+a];return!!q&&matK(q)==='marble'});paintCell(cx,cy,m?'msill':'sill')}}}
// doors sit centred in the wall line and meet the wall ends
function snapDoors(){NAVD=true;for(const d of bodies){if(d.type!=='slab'||d.free)continue;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const bx=Math.round(d.x),by=Math.round(d.y);for(const p of d.px){x0=Math.min(x0,bx+p[0]);x1=Math.max(x1,bx+p[0]);y0=Math.min(y0,by+p[1]);y1=Math.max(y1,by+p[1])}
 let sx,sy;if(x1-x0>y1-y0){sx=Math.round(x0/(T/2))*(T/2)-x0;sy=Math.floor((y0+y1)/2/T)*T+T/2-(d.th||8)/2-y0}else{sy=Math.round(y0/(T/2))*(T/2)-y0;sx=Math.floor((x0+x1)/2/T)*T+T/2-(d.th||8)/2-x0}d.x=bx+sx;d.y=by+sy;orient(d)}}
function blendGround(){GT.fill(0);let any=false;for(const r of map)for(const k of r)if(k==='grass'){any=true;break}if(!any)return;
 const R=6,ind=new Float32Array(N),tmp=new Float32Array(N);for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const k=map[Y/T|0][X/T|0];ind[Y*W+X]=k==='grass'?1:k==='dirt'||k.endsWith('H')?0:.5}
 for(let Y=0;Y<H;Y++){let a=0;for(let X=-R;X<W;X++){if(X+R<W)a+=ind[Y*W+X+R];if(X-R-1>=0)a-=ind[Y*W+X-R-1];if(X>=0)tmp[Y*W+X]=a}}
 for(let X=0;X<W;X++){let a=0;for(let Y=-R;Y<H;Y++){if(Y+R<H)a+=tmp[(Y+R)*W+X];if(Y-R-1>=0)a-=tmp[(Y-R-1)*W+X];if(Y>=0)ind[Y*W+X]=a/((2*R+1)*(2*R+1))}}
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const j=Y*W+X,k=map[Y/T|0][X/T|0];if(sol[j]||k!=='grass'&&k!=='dirt'&&!(k.endsWith('H')&&X%T>=T/2))continue;
  const v=ind[j]+(fbm(X/7,Y/7,90)-.5)*.5+(hh(X,Y,91)-.5)*.1,g=v>.5;let c=g?grassT(X,Y):soilT(X,Y);if(g&&v<.62&&hh(X,Y,92)>(v-.5)/.12)c=mx(GDRY,soilT(X,Y),.5);
  floor[j]=rgb(cl(c[0]),cl(c[1]),cl(c[2]));GT[j]=g?1:2}}
// blasts on open ground tear up grass, dig a soft crater and throw soil round it
// a mended tile, furniture cell or wall cell sits a little proud of damage of its own kind beside it: on each side that touches damage its top or left edge catches the light, its bottom or right edge is shaded and casts a faint shadow onto the damage. Drawn at render only
let EDGM=new Uint8Array(0);const EDF=[1,1.1,.86,.9],REP=new Set();
function edgeMask(){if(EDGM.length!==N)EDGM=new Uint8Array(N);else EDGM.fill(0);if(!REP.size)return;let P0=null;try{P0=PR&&PR.sol&&PR.sol.length===N?PR:null}catch(e){}const kind=(x,y)=>{const c=CATN[map[y][x]];return c&&c[3]?2:OM[y]&&OM[y][x]||OB0.has(y*CW+x)?1:0},
  hurt=(x,y,t)=>{if(x<0||y<0||x>=CW||y>=CH||kind(x,y)!==t)return false;const id=y*CW+x;
   if(t===2){if(WB0.has(id))return true;for(let v=0;v<T;v++)for(let u=0;u<T;u++){const j=(y*T+v)*W+x*T+u;if(P0&&P0.sol[j]&&(!sol[j]||shp[j]<P0.shp[j]))return true}return false}
   if(t===1){if(OB0.has(id)||OWT.has(id))return true;for(let v=0;v<T;v++)for(let u=0;u<T;u++){const j=(y*T+v)*W+x*T+u;if(P0&&P0.OBJ[j]&&!OBJ[j])return true}return false}
   const c=CATN[map[y][x]];if((c[4]||5)<5)return true;for(let v=0;v<T;v++)for(let u=0;u<T;u++)if(DMG[(y*T+v)*W+x*T+u])return true;return false},set=(j,v)=>{if(!EDGM[j]||v===2)EDGM[j]=v};
 for(const id of REP){const cx=id%CW,cy=id/CW|0,t=kind(cx,cy);for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){if(!hurt(cx+dx,cy+dy,t))continue;const near=dx<0||dy<0;
  for(let i=0;i<T;i++){const x=dx<0?0:dx>0?T-1:i,y=dy<0?0:dy>0?T-1:i;set((cy*T+y)*W+cx*T+x,near?1:2);if(!near){const ox=cx*T+x+dx,oy=cy*T+y+dy;if(ox>=0&&oy>=0&&ox<W&&oy<H)set(oy*W+ox,3)}}}}}
// blasts wear the floor in a ragged circle, strongest at the blast: how far and how hard follow the floor's toughness from the material table (soft wood further, umbra hardly at all). Each pixel takes the wear of the condition it reaches; each cell's condition is what its centre reached. The worn look becomes the cell's clean state, so cleaning keeps it and the wand undoes it
const softOf=(el,mat)=>Math.max(.3,Math.min(1.6,3/(mprop(el,mat).hp||3)));
function blastWear(x,y,s){const hv=s>1.5,R=(hv?3.3:2)*T,top=hv?4:3,AC={};
 for(let cy=Math.max(0,(y-R*2.6)/T|0);cy<=Math.min(CH-1,(y+R*2.6)/T|0);cy++)for(let cx=Math.max(0,(x-R*2.6)/T|0);cx<=Math.min(CW-1,(x+R*2.6)/T|0);cx++){const k=map[cy][cx],c=CATN[k],ok=OM[cy]&&OM[cy][cx],oe=ok&&objEl(ok);if(oe){const so=softOf(oe[0],oe[1]),wd=oe[0]==='Wood',Rm=R*1.3*(wd?1.6:1)*(.55+.45*Math.min(1.2,so)),dx=Math.max(cx*T-x,0,x-cx*T-T+1),dy=Math.max(cy*T-y,0,y-cy*T-T+1),d=Math.hypot(dx,dy);if(d<Rm)wearObj(cx,cy,(1-d/Rm)*top*(wd?40:26))}
  if(c&&c[3]&&AGE[c[0]]){const so=softOf(c[0],c[1]),wd=c[0]==='Wood',Rm=R*1.3*(wd?1.6:1)*(.55+.45*Math.min(1.2,so)),dx=Math.max(cx*T-x,0,x-cx*T-T+1),dy=Math.max(cy*T-y,0,y-cy*T-T+1),d=Math.hypot(dx,dy);if(d<Rm)wearWall(cx,cy,(1-d/Rm)*top*(wd?40:26));continue}if(!c||c[3]||!AGE[c[0]]||OM[cy]&&OM[cy][cx])continue;
  const c0=c[4]||5,so=softOf(c[0],c[1]),wf=c[0]==='Wood',Rm=R*(c[0]==='Cloth'?1.6:wf?1.5:1)*(.55+.45*Math.min(1.2,so)),lv=(X,Y)=>{const d=Math.hypot(X-x,Y-y)/(Rm*(.8+.4*fbm(X/7,Y/7,91)));return d>=1?c0:Math.max(1,Math.min(c0,5-Math.round((wf?Math.pow(1-d,.9)*1.15:1-d)*top*Math.min(1.2,so)+.3)))};
  const cc=lv(cx*T+8,cy*T+8);if(cc<c0)map[cy][cx]=baseK(k)+'~'+cc;
  for(let y2=0;y2<T;y2++)for(let x2=0;x2<T;x2++){const X=cx*T+x2,Y=cy*T+y2,j=Y*W+X;if(sol[j])continue;const p=lv(X,Y);if(p>=c0)continue;const ak=c[0]+c[1]+p,A=AC[ak]||(AC[ak]=ageOf(c[0],c[1],p)),q=floor[j],r=A([q&255,q>>8&255,q>>16&255],X,Y,()=>9);floor[j]=rgb(cl(r[0]),cl(r[1]),cl(r[2]));if(PR)PR.floor[j]=floor[j]}}edgeMask()}
// walls lose condition as they're shot, chipped and blasted: each cell keeps a tally, every step of it wears one condition, softer materials faster; its wall neighbours take a share
const WWT=new Map(),WB0=new Map(),HTM=new Map(),OWT=new Map(),OB0=new Map();
// furniture wears the same way, by its wood or metal from the material table
const objEl=k=>{const b=baseK(k);return WPIECE[b]?['Wood',WPIECE[b][0]]:MCHEST[b]?['Metal',MCHEST[b][0]]:null};
function wearObj(cx,cy,amt){if(cx<0||cy<0||cx>=CW||cy>=CH)return;const k=OM[cy]&&OM[cy][cx],e=k&&objEl(k);if(!e||!AGE[e[0]])return;const id=cy*CW+cx,v=(OWT.get(id)||0)+amt*softOf(e[0],e[1]);OWT.set(id,v);
 const o=OB0.get(id),c0=o?o.c0:condK(k),cc=Math.max(1,c0-Math.floor(v/9));if(cc>=condK(k))return;
 if(!o){const a=new Uint32Array(T*T);for(let y=0;y<T;y++)for(let x=0;x<T;x++)a[y*T+x]=OBJC[(cy*T+y)*W+cx*T+x];OB0.set(id,{a,c0,k})}
 const a=OB0.get(id).a,A=ageOf(e[0],e[1],cc);OM[cy][cx]=baseK(k)+'~'+cc;if(!A)return;
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const X=cx*T+x,Y=cy*T+y,j=Y*W+X;if(!OBJ[j])continue;const q=a[y*T+x],r=A([q&255,q>>8&255,q>>16&255],X,Y,()=>9);OBJC[j]=rgb(cl(r[0]),cl(r[1]),cl(r[2]))}}
function wallHit(X,Y,amt){const cx=X>>4,cy=Y>>4;wearWall(cx,cy,amt);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])wearWall(cx+dx,cy+dy,amt*.3)}
function wearWall(cx,cy,amt){if(cx<0||cy<0||cx>=CW||cy>=CH)return;const k=map[cy][cx],c=CATN[k];if(!c||!c[3]||!AGE[c[0]])return;const id=cy*CW+cx,v=(WWT.get(id)||0)+amt*softOf(c[0],c[1]);WWT.set(id,v);
 const o=WB0.get(id),c0=o?o.c0:c[4]||5,cc=Math.max(1,c0-Math.floor(v/9));if(cc>=(c[4]||5))return;
 if(!o){const a=new Uint32Array(T*T);for(let y=0;y<T;y++)for(let x=0;x<T;x++)a[y*T+x]=scol[(cy*T+y)*W+cx*T+x];WB0.set(id,{a,c0})}
 const a=WB0.get(id).a,A=ageOf(c[0],c[1],cc,true)||ageOf(c[0],c[1],cc);map[cy][cx]=baseK(k)+'~'+cc;if(!A)return;
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const X=cx*T+x,Y=cy*T+y,j=Y*W+X;if(!sol[j])continue;const q=a[y*T+x],r=A([q&255,q>>8&255,q>>16&255],X,Y,()=>9);scol[j]=rgb(cl(r[0]),cl(r[1]),cl(r[2]))}solDirty=true}
// very hot hits leave temper colours on metal: straw, bronze, blue at the centre
function temperF(a){let i=1;while(i<TEMPER.length-1&&a>TEMPER[i][0])i++;const[p0,f0]=TEMPER[i-1],[p1,f1]=TEMPER[i],u=Math.min(1,Math.max(0,(a-p0)/(p1-p0)));return f0.map((v,k)=>v+(f1[k]-v)*u)}
function heatMark(x,y,r,k){for(let Y=Math.floor(y-r);Y<=y+r;Y++)for(let X=Math.floor(x-r);X<=x+r;X++){if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(sol[j]!==3)continue;const d=Math.hypot(X-x,Y-y);if(d>r)continue;
  const a=Math.min(.85,k*(1-d/r)*(.85+.3*hh(X,Y,71))),o=HTM.get(j)||0;if(a<=o)continue;const f1=temperF(a),f0=temperF(o),c=scol[j];scol[j]=rgb(cl((c&255)*f1[0]/f0[0]),cl((c>>8&255)*f1[1]/f0[1]),cl((c>>16&255)*f1[2]/f0[2]));HTM.set(j,a)}solDirty=true}
// a blast breaks a built floor by its material: stone and marble through to soil with a chipped edge and hairline cracks, wood broken through to soil inside a rim of splintered board ends, cloth burnt through, metal dented with a bright lip; how far follows toughness
// what lies under a carpet: the cell's underlay, else plain boards
const UPX=new Map();function under(X,Y){const cx=X>>4,cy=Y>>4,id=cy*CW+cx;let d=UPX.get(id);if(!d||d.m!==curMap){d=tilePix(undAt(cx,cy)||'wood.oak.planks',cx,cy);d.m=curMap;UPX.set(id,d)}const i=((Y&15)*T+(X&15))*4;return rgb(d[i],d[i+1],d[i+2])}
const blastSoft=(x,y)=>{const c=CATN[map[Math.round(y)>>4]&&map[Math.round(y)>>4][Math.round(x)>>4]];return c&&c[0]!=='Metal'?Math.max(1,Math.min(1.6,softOf(c[0],c[1])*1.05)):1};
function crater(x,y,s){const r=6.5*s,rr=s>1.5?.85:.7;for(let Y=Math.floor(y-r*2);Y<=y+r*2;Y++)for(let X=Math.floor(x-r*2);X<=x+r*2;X++){if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(sol[j])continue;
  const dx=X-x,dy=Y-y,e=r*(.78+.44*fbm(X/4,Y/4,93)),q=Math.hypot(dx,dy)/e;if(q>=2)continue;
  if(GT[j]!==1&&GT[j]!==2){const mk=map[Y>>4][X>>4];if(mk==='sky')continue;const f0=floor[j],cc=CATN[mk],fam=cc?cc[0]:'Stone',P=cc?mprop(cc[0],cc[1]):{hp:3},so=cc?softOf(cc[0],cc[1]):1,old=DMG[j];
   if(fam==='Metal'){// metal dents: a darkened dish with a bright torn lip; a heavy blast tears soft metal through
    const qd=q/(rr*1.3*so);if(qd<1){floor[j]=s>1.5&&P.hp<=5&&qd<.4?rgb(...sc(soilT(X,Y),.5).map(cl)):mul(floor[j],old?.94:.5+.4*qd)}else if(qd<1.2&&hh(X,Y,99)>.35)floor[j]=mul(floor[j],1.22)}
   else{const wd=fam==='Wood',cl0=fam==='Cloth',qw=q,rw=cl0?rr*2.6:rr*so;
    if(qw<rw){if(old)floor[j]=mul(floor[j],.94);else if(wd){const e2=qw/rw;if(e2<.78){const f=sc(soilT(X,Y),.6+.35*e2);floor[j]=rgb(cl(f[0]),cl(f[1]),cl(f[2]))}else floor[j]=hh(X>>2,Y,98)>.6?mul(floor[j],.5):rgb(cl(30+18*e2),cl(22+12*e2),cl(16+8*e2))}
     else if(cl0){const ed=qw/rw;if(ed<.62){const u=under(X,Y);floor[j]=ed>.5&&hh(X,Y,98)>.5?rgb(36,28,24):mul(u,ed>.45?.6:.82)}else floor[j]=hh(X,Y,98)>.55?mul(floor[j],.4):rgb(cl(36+20*ed),cl(28+10*ed),24)}
     else{const f=sc(soilT(X,Y),.62+.3*qw/rw),g=hh(X>>1,Y>>1,98);floor[j]=g>.86&&qw>rw*.4?mul(floor[j],.62):rgb(cl(f[0]),cl(f[1]),cl(f[2]))}GT[j]=3;SHN[j]=0}
    else if(qw<rw*(cl0?1.6:1.25)&&!old&&hh(X,Y,99)>(cl0?.3:.45)){floor[j]=mul(floor[j],cl0?.6+.25*hh(X,Y,97):.5);SHN[j]=0}
    else if(qw<rw*1.9&&!old&&fam!=='Cloth'&&(wd?Math.abs(vn(X/9,Y*1.6,95)-.5)<.04:Math.abs(vn(X/2.5,Y/2.5,95)-.5)<.07))floor[j]=mul(floor[j],.72)}
   if(floor[j]!==f0)DMG[j]=1;continue}const so=soilT(X,Y);let c=null;
  if(q<1){const lit=(-dx*.6-dy*.8)/e;const k=(.6+.32*q)*(1-lit*.16*(1-q))*(q<.45?.85:1);c=sc(so,k*(GT[j]===2?.92:1))}
  else if(q<1.35){if(hh(X,Y,94)<(1.35-q)/.35*1.3)c=sc(so,1.02+hh(X,Y,95)*.08)}
  else if(hh(X,Y,96)<(2-q)*.22&&parts.length<1500){const k=sc(so,.8+hh(X,Y,97)*.2);parts.push({x:X,y:Y,vx:0,vy:0,c:rgb(cl(k[0]),cl(k[1]),cl(k[2]))})}
  if(!c)continue;const n=rgb(cl(c[0]),cl(c[1]),cl(c[2])),o=floor[j],lum=v=>(v&255)+(v>>8&255)+(v>>16&255);floor[j]=GT[j]===2&&q<1&&lum(o)<lum(n)?o:n;GT[j]=2;DMG[j]=1}}
// counting house: library and board rooms over a pillared gallery; guard post, armoury, ledger office and strongroom below
const CO=4;
function buildCount(){map=Array.from({length:CH},()=>Array(CW).fill('stone.gold.block.w'));
 const F=(cx,cy)=>{const x=cx-CO,y=cy;
  if(y===12&&x>=37)return 'stone.night.block';if(y===17&&x>=-4&&x<0)return 'stone.night.slabs';
  if(x>=0&&x<=6&&y>=1&&y<=7)return x>=2&&x<=4&&y>=3&&y<=5?'edesk':(x===1||x===5)&&y>=3&&y<=5||(y===2||y===6)&&x===3?'seat':x>=1&&x<=5&&y>=2&&y<=6?'cloth.verdant.diamond':'wood.teak.planks';
  if(x>=30&&x<=36&&y>=1&&y<=7)return x>=32&&x<=34&&y>=3&&y<=5?'desk':(x===31||x===35)&&y===4||(y===2||y===6)&&x===33?'seat':x>=31&&x<=35&&y>=2&&y<=6?'cloth.crimson.diamond':'wood.teak.planks';
  if(x>=8&&x<=28&&y>=1&&y<=9){
   if(x>=13&&x<=23&&y>=2&&y<=7){if(x===13||x===23||y===2||y===7)return (y===7||y===2)&&x===18?'stone.night.slabs':'wood.ebony.boards.w';
    if(y>=4&&y<=5&&x>=15&&x<=21)return 'edesk';if((y===3||y===6)&&(x===16||x===17||x===19||x===20))return 'seat';if(x===14||x===22)return 'schest';return 'stone.night.slabs'}
   if(y===1&&x!==18||(x===8||x===28)&&y>=2&&y<=8&&y!==4)return 'chest';if(y>=8&&y<=9&&x>=11&&x<=25)return 'cloth.verdant.diamond';return 'wood.teak.planks'}
  if(x===7&&y===4||x===29&&y===4)return 'wood.teak.planks';
  if(y===10&&(x===12||x===24))return 'stone.night.block';
  if(y>=11&&y<=13&&x>=0&&x<=36)return (y===11||y===13)&&[1,6,16,28,33].includes(x)?(y===11?'stone.gold.block.wN':'stone.gold.block.wS'):'stone.night.block';
  if(y===14&&(x===3||x===11||x===21))return 'stone.night.block';
  if(x>=0&&x<=6&&y>=15&&y<=19)return y===16&&x>=2&&x<=4?'table':y===15&&x===3?'seat':x===0&&y===15?'chest':x===6&&y===15?'chest':'stone.night.slabs';
  if(y===20&&(x===1||x===5))return 'stone.night.slabs';if(y>=21&&y<=23&&(x>=0&&x<=2||x>=4&&x<=6))return 'stone.grey.slabs';
  if(x>=8&&x<=14&&y>=15&&y<=23)return x===8&&y>=16&&y<=22?'chest':x===14&&y%2===0&&y>=16?'chest':'wood.teak.planks';
  if(x>=16&&x<=26&&y>=15&&y<=23){if(y===18&&x>=20&&x<=22)return 'edesk';if(y===19&&x===21)return 'seat';if(y===15&&(x<=18||x>=24))return 'chest';if(x===16&&y===23)return 'chest';if(x>=18&&x<=24&&y>=16&&y<=22)return 'cloth.verdant.diamond';return 'wood.teak.planks'}
  if(x===27&&y===19)return 'metal.steel.rivet';
  if(x>=28&&x<=36&&y>=15&&y<=23){if((y===15||y===23)&&x>=29&&x<=35)return 'schest';if(y===19&&x>=31&&x<=33)return 'chest';return 'metal.steel.rivet'}
  if((x===27||x===37)&&y>=14&&y<=24||(y===14||y===24)&&x>=27&&x<=37)return 'metal.iron.rivet.w';
  return 'stone.gold.block.w'};
 HALFF='stone.night.block';for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)paintCell(cx,cy,F(cx,cy));HALFF='dirt';
 for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,FH])a.fill(0);WH.fill(0);fxDirty=true}
const EXITS={vault:[{dir:'w',cell:[0,25],to:'count',arrive:[22,408],label:'Counting house',lx:3,ly:392}],count:[{dir:'e',cell:[43,12],to:'vault',arrive:[664,200],label:'The Aurum',lx:640,ly:182},{dir:'w',cell:[0,17],label:'Back alley',lx:2,ly:262}]};
const STATE={},PEND={};
function saveMap(){for(const b of bodies)if(b.lab)b.lab.remove();for(const e of document.querySelectorAll('#sm .xlab'))e.remove();
 STATE[curMap]={rep:[...REP],wear:[[...WWT],[...WB0],[...HTM],[...OWT],[...OB0]],CW,CH,map,UND,OM,DS0,alarm,bodies,parts,FX:{...FX},whOn,hzOn,a:{SH,GOLD,floor,sol,shp,scol,crk,slabG,GT,SHN,DS,NOD,OBJ,OBJC,SCH,DMG,TF,SF,SS,ST,BURN,FH,FV,SV,DV,TMP,WH,fxLow,fxTop,fxA,HZ,OPEN,LR,LG,LB,LT}}}
function loadMap(m){const q=STATE[m];delete STATE[m];CW=q.CW;CH=q.CH;W=CW*T;H=CH*T;BW=W/2;BH=H/2;N=W*H;NB=BW*BH;cv.width=W;cv.height=H;img=ctx.createImageData(W,H);out=new Uint32Array(img.data.buffer);
 ({SH,GOLD,floor,sol,shp,scol,crk,slabG,GT,SHN,DS,NOD,OBJ,OBJC,SCH,DMG=new Uint8Array(N),TF,SF,SS,ST,BURN,FH=new Float32Array(NB),FV,SV,DV,TMP,WH,fxLow,fxTop,fxA,HZ,OPEN,LR,LG,LB,LT}=q.a);WWT.clear();WB0.clear();HTM.clear();OWT.clear();OB0.clear();if(q.wear){for(const[k,v]of q.wear[0])WWT.set(k,v);for(const[k,v]of q.wear[1])WB0.set(k,v);for(const[k,v]of q.wear[2])HTM.set(k,v);for(const[k,v]of q.wear[3]||[])OWT.set(k,v);for(const[k,v]of q.wear[4]||[])OB0.set(k,v)}for(const k in q.FX)FX[k]=q.FX[k];
 map=q.map;UND=q.UND||[];OM=q.OM;DS0=q.DS0;ds0Need=false;alarm=q.alarm;bodies=q.bodies;parts=q.parts;whOn=q.whOn;hzOn=q.hzOn;solDirty=true;fxDirty=true;camInit=true;REP.clear();for(const v of q.rep||[])REP.add(v);edgeMask();setTimeout(fit,0);
 for(const b of bodies)if(b.lab)stage.appendChild(b.lab);arrivals();exitLabels()}
function goMap(v){if(v===curMap)return;saveMap();curMap=v;const ms=$('msel');if(ms)ms.value=v;$('sm').querySelector('header span').textContent=TITLE[v]||'';sel.clear();openCrate=null;drag=null;charge=null;box=null;moveSel=null;lastHud='';if(STATE[v])loadMap(v);else{camInit=true;CW=-1;reset()}}
function arrivals(){const q=PEND[curMap];if(!q)return;delete PEND[curMap];for(const b of q){bodies.push(b);if(b.lab)stage.appendChild(b.lab)}}
function exitLabels(){for(const e of document.querySelectorAll('#sm .xlab'))e.remove();(EXITS[curMap]||[]).forEach((x,i)=>{const l=document.createElement('div');l.className='xlab';l.dataset.i=i;l.textContent=x.label;stage.appendChild(l)})}
// the passage fades to black towards the map it leads to
function exitFade(){for(const x of EXITS[curMap]||[]){const L=28,[cx,cy]=x.cell;for(let i=0;i<L;i++){const f=Math.pow(i/L,1.4);if(x.dir==='w'||x.dir==='e'){const X=x.dir==='w'?i:W-1-i;for(let Y=cy*T-6;Y<cy*T+T+6;Y++)if(Y>=0&&Y<H)out[Y*W+X]=mul(out[Y*W+X],f)}else{const Y=x.dir==='n'?i:H-1-i;for(let X=cx*T-6;X<cx*T+T+6;X++)if(X>=0&&X<W)out[Y*W+X]=mul(out[Y*W+X],f)}}}}
function exitTick(){for(const x of EXITS[curMap]||[]){if(!x.to)continue;const back=EXITS[x.to].find(e=>e.to===curMap);for(const b of [...bodies]){if(b.type!=='token'||b.status!=='free'||inDrag(b)||b.tether&&!b.tether.broken)continue;if((b.x/T|0)!==x.cell[0]||(b.y/T|0)!==x.cell[1])continue;
 const was=sel.has(b);bodies=bodies.filter(o=>o!==b);if(b.lab)b.lab.remove();sel.delete(b);b.x=back.arrive[0];b.y=back.arrive[1];b.vx=b.vy=0;b.glide=null;b.hc=null;sfx('door');
 if(STATE[x.to])STATE[x.to].bodies.push(b);else(PEND[x.to]||(PEND[x.to]=[])).push(b);if(was){goMap(x.to);if(bodies.includes(b))sel.add(b);return}}}}
function unitsCount(){const up=-Math.PI/2,dn=Math.PI/2,face=(t,a)=>{t.ang=a;return t},X=x=>(x+CO)*16,eb=d=>{mahogany(d,EBONY);return d};
 const hd=(x,y,m)=>slab(m,X(x),y*16+11,0),vd=(x,y,m,th)=>slab(m,X(x)+4,y*16,1,16,th||8);
 for(const d of [vd(7,4,2),vd(29,4,2),hd(18,2,2),hd(18,7,2),hd(12,10,2),hd(24,10,2),hd(21,14,2),vd(-1,17,2)])eb(d);
 hd(3,14,3);hd(11,14,3);const c1=hd(1,20,3),c2=hd(5,20,3),out=vd(-3,17,3,16),vault=vd(27,19,3,16);c1.locked=c2.locked=out.locked=vault.locked=true;
 const cc=(x,y,items,n)=>{const c=container(x+CO,y,items);if(c&&n)c.name=n;return c};
 cc(14,3,[{k:'gold',n:2400}],'Counting shelf');cc(22,3,[{k:'gold',n:2400}],'Counting shelf');cc(15,4,[{k:'gold',n:300}],'Counting table');
 cc(9,1,[{k:'gold',n:40}],'Bookshelf');cc(20,18,[{k:'gold',n:250},{k:'pistol',n:1,ammo:18,res:18}],'Ledger desk');cc(16,23,[{k:'gold',n:600}],'Ledger chest');
 cc(8,16,[{k:'musket',n:6,ammo:12,res:24},{k:'pistol',n:4,ammo:18,res:18}],'Rifle rack');cc(14,16,[{k:'grenade',n:6}],'Grenade chest');cc(14,18,[{k:'bomb',n:2}],'Heavy chest');cc(14,20,[{k:'mbox',n:6},{k:'pbox',n:4}],'Ammo chest');cc(14,22,[{k:'blunder',n:2,ammo:8,res:16}],'Chest');
 cc(0,15,[{k:'musket',n:2,ammo:12,res:12}],'Guard rack');cc(6,15,[{k:'grenade',n:2}],'Guard chest');cc(2,16,[],'Guard table');cc(32,3,[{k:'gold',n:500}],'Red room table');cc(2,3,[],'Green room table');
 cc(29,15,[{k:'gold',n:6000}],'Black shelf');cc(29,23,[{k:'gold',n:6000}],'Black shelf');cc(31,19,[{k:'gold',n:2000},{k:'sspear',n:1,ammo:4,res:4},{k:'rod',n:1,ammo:3,res:9}],'Black deals');
 face(token('Lord Vane','Goldbank','civ',X(31)+8,72,false,'pistol'),0);face(token('Corvo','Reapers','home',X(35)+8,72,false,'blunder'),Math.PI);
 face(token('Archivist Lell','Goldbank','civ',X(10)+8,56,false,null),dn);face(token('Clerk Amsel','Goldbank','civ',X(16)+8,56,false,null),dn);face(token('Clerk Toll','Goldbank','civ',X(20)+8,104,false,null),up);
 face(token('Master Orsk','Goldbank','civ',X(21)+8,19*16+8,false,'pistol'),up);
 face(token('Sgt. Brant','Goldbank','guard',X(3)+8,18*16+8,true),Math.PI);face(token('Wells','Goldbank','guard',X(5)+8,17*16+8,true),Math.PI);face(token('Kerr','Goldbank','rifle',X(11)+8,20*16+8),up);face(token('Ode','Goldbank','rifle',X(18)+8,12*16+8),0);
 const p=face(token('Dace',null,'civ',X(1)+8,22*16+8,false,null),up);p.status='captured';tie(p,'chain')}
// fancy doors: mahogany leaf with a brass inlay line
// a slab or door in another wood; inl adds the gold inlay line of the dark woods
function mahogany(d,base,inl=1){base=base||MAHOG;const L=d.len||16,th=d.th||8;for(const q of d.src){const x=q[8],y=q[9],e=Math.min(x,L-1-x,y+th,-1-y),c=woodT(x+d.id*31,y,base,13);q[2]=inl&&e===2?rgb(cl(c[0]*.6+210*.4),cl(c[1]*.6+168*.4),cl(c[2]*.6+100*.4)):rgb(cl(c[0]),cl(c[1]),cl(c[2]))}d.used=null;d.px=[];orient(d)}
// proving yard: unit lane, long lane, eight material lanes, a texture yard and a grenade field
const RLANE=['stone','stoneH','stone2','wood','woodH','metal','metalH','door'];
function buildRange(){map=Array.from({length:CH},()=>Array(CW).fill('grass'));
 const soil=(cx,cy)=>{const dx=(cx-33.5)/4.2,dy=(cy-26)/6.5;return dx*dx+dy*dy+(hh(cx,cy,98)-.5)*.35<1};
 const Y0=['stone.grey.slabs','wood.oak.planks','wood.pine.planks','wood.teak.planks','metal.steel.rivet','stone.aur.block','stone.aur.chequer','stone.aur.chequer'],W0=['stone.grey.block.w','wood.oak.boards.w','wood.teak.boards.w','metal.steel.panel.w','metal.steel.rivet.w','metal.steel.panel.w','metal.iron.rivet.w','metal.brass.rivet.w'],W1=['stone.gold.block.w','rail','metal.steel.panel.wH','metal.steel.rivet.wH','wood.oak.boards.wH','stone.grey.block.wH'];
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){let k='grass';if(cx>=2&&cx<=4&&cy>=1&&cy<=CH-2)k='dirt';
  if(cy>=1&&cy<=8){if(cx>=2&&cx<14)k='dirt';if(cx===14||cx===15)k='berm'}
  if(cy>=10&&cy<=11){if(cx>=2&&cx<37)k='dirt';if(cx===37||cx===38)k='berm'}
  for(let i=0;i<RLANE.length;i++){const a=13+i*3;if(cy<a||cy>a+1)continue;if(cx>=2&&cx<20)k='dirt';if(cx===20||cx===21)k='berm';const t=RLANE[i];
   if(cx===11&&t!=='door')k=t==='stone2'?'stone.grey.block.w':t;if(cx===12&&t==='stone2')k='stone.grey.block.w'}
  const yi=Math.floor((cx-17)/3),yo=(cx-17)%3<2&&cx>=17;if(yo&&cy>=1&&cy<=2&&Y0[yi])k=Y0[yi];if(yo&&cy>=4&&cy<=5&&W0[yi])k=W0[yi];if(yo&&cy>=7&&cy<=8&&W1[yi])k=W1[yi];
  if(cx>=24&&cx<=38&&cy>=13&&cy<=CH-2&&soil(cx,cy))k='dirt';if(cx===5&&(cy===8||cy===18||cy===21||cy===24))k=cy===18?'chest':'chest';paintCell(cx,cy,k)}
 for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,FH])a.fill(0);WH.fill(0);fxDirty=true}
function unitsRange(){const face=t=>{t.ang=Math.PI;return t};
 for(const[n,u,y]of[['Vey','home',40],['Oren','home',72],['Pip','civ',104],['Lask','guard',136],['Hale','rifle',176],['Isk','rifle',256]])token(n,'Imperium',u,56,y,false,n==='Lask'?'rod':null);
 {const w=weapon('rod',92,70,0);w.ammo=3;w.res=15}container(5,8,[{k:'rbox',n:6}]);container(5,18,[{k:'musket',n:4,ammo:12,res:24}]);container(5,21,[{k:'grenade',n:8}]);container(5,24,[{k:'bomb',n:4}]);
 for(const[n,u,y]of[['Silas','civ',26],['Gull','home',47],['Rask','rifle',68],['Brant','guard',89],['Tam','shock',110],['Mira','cmd',131]])face(token(n,'Reapers',u,208,y,false,null));
 face(token('Dunn','Reapers','home',584,176,false,null));
 RLANE.forEach((t,i)=>{const y=13*16+i*48+16;face(token(['Ade','Bel','Cole','Dace','Eel','Fenn','Gale','Hart'][i],'Reapers','rifle',280,y,false,null));if(t==='door'){const d=slab(3,180,y-16,1,32,8);d.locked=true}});
 for(const[x,y,k]of[[408,248,'grenade'],[440,248,'bomb'],[408,600,'grenade'],[440,600,'bomb'],[520,392,'grenade'],[552,392,'bomb'],[536,456,'grenade']])weapon(k,x,y,0);
 barricade(2,392,312);barricade(3,456,312);barricade(3,560,560,32,8);for(const t of bodies)if(t.type==='token'&&t.nat==='Reapers')tie(t,t.unit==='guard'||t.unit==='shock'||t.unit==='cmd'||['Bel','Dace','Fenn','Hart'].includes(t.name)?'chain':'rope');}
function buildVault(){map=Array.from({length:CH},()=>Array(CW).fill('stone.gold.block.w'));
 const F=(cx,cy)=>{if(cy>=39&&cy<=45)return cx>=1&&cx<=4&&cy>=41&&cy<=44?(cx>=2&&cx<=3&&cy>=42&&cy<=43?'bush':'grass'):'stone.grey.quarter';if(cy===46)return 'bush';if(cy===38)return cx>=13?'stone.aur.block':'stone.gold.block.w';if(cx<=2||cy<=1)return 'stone.gold.block.w';
  if(cy>=2&&cy<=6&&cx>=8)return cx===10&&cy===4?'stone.aur.block.w':cy===2&&(cx<=10||cx>=13)?'schest':'stone.aur.block';if(cy===7)return cx>=13?'stone.aur.block':'stone.gold.block.w';
  if(cy>=8&&cy<=18){if(cx>=11)return cx===12&&(cy===10||cy===16)?'stone.aur.block.w':'stone.aur.chequer';if(cx===10)return cy===13?'stone.aur.block':'stone.gold.block.w';if(cx>=3&&cy>=9&&cy<=17)return cy===10&&cx>=5&&cx<=7?'desk':cx>=4&&cx<=8&&cy>=11&&cy<=16?'cloth.crimson.diamond':'stone.aur.block';return 'stone.gold.block.w'}
  if(cy===19)return cx>=13?'stone.aur.block':'stone.gold.block.w';
  if(cy>=20&&cy<=30){if((cx===6||cx===10)&&(cy===22||cy===28))return 'stone.aur.block.w';if(cy===25&&cx>=5&&cx<=9)return 'table';return 'stone.aur.block'}
  if(cy===31)return cx>=13?'stone.aur.block':'stone.gold.block.w';
  if(cy>=32&&cy<=37){if(cx>=11)return cx===12&&(cy===33||cy===36)?'stone.aur.block.w':'stone.aur.block';if(cx===10)return cy===34?'stone.aur.block':'stone.gold.block.w';if(cx>=3)return cy===33&&cx>=5&&cx<=7?'desk':cx>=4&&cx<=8&&cy>=34&&cy<=36?'cloth.crimson.diamond':'stone.aur.block';return 'stone.gold.block.w'}
  return 'stone.gold.block.w'};
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)paintCell(cx,cy,cx<=14?F(cx,cy):F(29-cx,cy));for(const cx of [0,1,2])paintCell(cx,25,'stone.aur.block');
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){if(map[Y/T|0][X/T|0]!=='metal.gold.panel')continue;const e=(x,y)=>!map[y/T|0]||map[y/T|0][x/T|0]!=='metal.gold.panel';if(e(X+1,Y)||e(X-1,Y)||e(X,Y+1)||e(X,Y-1))floor[Y*W+X]=mul(floor[Y*W+X],.5)}
 for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,FH])a.fill(0);WH.fill(0);fxDirty=true}
function unitsVault(){const up=-Math.PI/2,dn=Math.PI/2,face=(t,a)=>{t.ang=a;return t};slab(3,36,400,1);
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
  if(own(cx,cy)||pir(cx,cy))k=(edge(own,cx,cy)||edge(pir,cx,cy))&&!gap(cx,cy)?'rail':'wood.oak.planks';
  if(plank(cx,cy))k='wood.oak.planks';if(cx===2&&(cy===6||cy===9)||cy===7&&(cx===16||cx===17)||cx===20&&cy===12)k='chest';
  if(cx===18&&(cy===6||cy===13)||cx>=23&&cx<=24&&cy>=9&&cy<=10)k='rail';
  paintCell(cx,cy,k)}
 for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,FH])a.fill(0);WH.fill(0);fxDirty=true}
function unitsAir(){const face=(t,a)=>{t.ang=a;return t},E=0,Wd=Math.PI;
 const C=[['Kade','pistol',2],['Vos','pistol',2],['Ash','blunder'],['Rook','blunder'],['Sere','pgun'],['Holt','rod']];
 C.forEach(([n,w,dual],i)=>{const t=face(token(n,'Imperium','cmd',56+(i%2)*28,104+(i>>1)*36,false,w),E);if(dual)addItem(t,{k:'pistol',n:1,ammo:18,res:18})});
 container(2,6,[{k:'grenade',n:6}]);container(2,9,[{k:'pbox',n:4}]);
 const P=[['Cpt. Marrow','guard',428,150,'musket'],['Sly','guard',380,96,'musket'],['Gant','rifle',330,80,'musket'],['Hobb','rifle',330,224,'musket'],['Pell','rifle',344,150,'musket'],['Wick','rifle',236,232,'musket'],
  ['Brine','home',236,72,'blunder'],['Tarr','home',270,150,'pistol'],['Crabb','home',200,120,'spear'],['Lugg','home',200,176,'blunder'],['Nim','civ',196,150,'pistol'],['Fitch','civ',460,150,'spear']];
 for(const[n,u,x,y,w]of P)face(token(n,'Pirates',u,x,y,false,w),Wd);
 container(16,7,[{k:'gold',n:240}]);container(20,12,[{k:'gold',n:120}]);for(const y of [132,164]){const d=barricade(2,232,y);d.rot=1;orient(d)}}
function overboard(){for(const b of [...bodies]){if(b.type==='weapon'&&WP[b.kind].bullet||inDrag(b)||Math.hypot(b.vx,b.vy)>1.5&&b.type!=='token')continue;const r=map[b.y/T|0],k=r&&r[b.x/T|0];if(k!=='sky')continue;
 if(b.type==='token'&&b.held)dropHeld(b);dab(SF,b.x,b.y,.4,2);sfx('whoosh');remove(b)}}
function crate(x,y,items,long){items=(items||[]).filter(Boolean);const c=weapon('crate',x,y,0);if(long===undefined)long=!cFitsAll(c,items);c.name='Crate';if(long){c.long=true;c.px=shape('lcrate',0);mkSet(c)}c.si=-1;cFill(c,items);return c}
// storage is space: items keep their real size and lie wherever their outline fits, turned if needed
const FTC={bomb:[10,10]},foot=k=>{if(FTC[k])return FTC[k];if(!WP[k]||k==='gold')return FTC[k]=[7,7];let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of shape(k,0)){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])}return FTC[k]=[x1-x0+1,y1-y0+1]};
function cGeo(c){if(!c.box){const hw=c.long?15:5;return{gw:2*hw-1,gh:9,cs:1,ox:Math.round(c.x)-hw+1,oy:Math.round(c.y)-4,ok:()=>true}}
 const ox=c.box[0]+1,oy=c.box[1]+1,gw=c.box[2]-c.box[0]-1,gh=c.box[3]-c.box[1]-1,tl=new Set(c.cells.map(([a,b])=>b*CW+a));
 return{gw,gh,cs:1,ox,oy,ok:(x,y)=>{const X=ox+x,Y=oy+y,cx=X/T|0,cy=Y/T|0,lx=X-cx*T,ly=Y-cy*T,h=(a,b)=>tl.has(b*CW+a);return h(cx,cy)&&!(lx<1&&!h(cx-1,cy))&&!(lx>=T-1&&!h(cx+1,cy))&&!(ly<1&&!h(cx,cy-1))&&!(ly>=T-1&&!h(cx,cy+1))}}}
const cRect=q=>{const[w,h]=foot(q.k);return q.r?[h,w]:[w,h]};
// chests are slot grids: 4 lanes across, steps one grenade long along the length; each item takes a fixed block and lies along the chest
const SLOT={musket:[1,4],spear:[1,4],sspear:[1,4],rod:[1,4],blunder:[2,3],pgun:[2,3],pistol:[1,2],bomb:[4,2],mbox:[2,2],pbox:[2,2],sbox:[2,2],rbox:[2,2],cell:[2,2]},slotOf=k=>SLOT[k]||[2,1];
function sGeo(c){const g=cGeo(c),vert=g.gh>=g.gw,th=vert?g.gw:g.gh,len=vert?g.gh:g.gw,NS=Math.max(1,len/7|0);return{g,vert,th,NL:4,NS,lw:th/4,off:(len-NS*7)>>1}}
function plc(c,k,a,b,S=sGeo(c)){const[la,lb]=slotOf(k),[w0,h0]=foot(k),r=w0>h0?(S.vert?1:0):0,w=r?h0:w0,h=r?w0:h0,lp=Math.floor(S.th/4),acr=la===1?(S.th-4*lp)/2+a*lp:a*S.lw,aw=la===1?lp:la*S.lw,alo=S.off+b*7,al=lb*7;
 const x0=S.vert?acr:alo,y0=S.vert?alo:acr,bw=S.vert?aw:al,bh=S.vert?al:aw;return{gx:Math.round(x0+(bw-w)/2),gy:Math.round(y0+(bh-h)/2),r,sl:[a,b]}}
function sFree(c,k,skip,S=sGeo(c)){const[la,lb]=slotOf(k),U=new Set();for(const q of c.inv||[])if(q&&q!==skip&&q.sl){const[qa,qb]=slotOf(q.k);for(let i=0;i<qa;i++)for(let j=0;j<qb;j++)U.add((q.sl[0]+i)*99+q.sl[1]+j)}
 const L=[];for(let b=0;b+lb<=S.NS;b++)for(let a=0;a+la<=S.NL;a+=la===2?2:1){let f=true;for(let i=0;i<la&&f;i++)for(let j=0;j<lb;j++)if(U.has((a+i)*99+b+j)){f=false;break}if(f)L.push([a,b])}return L}
function cFit1(c,k){const S=sGeo(c),L=sFree(c,k,null,S);return L.length?plc(c,k,L[0][0],L[0][1],S):null}
// the chest arranges itself: like items packed together from the top-left, long weapons first; alike neighbours lean together
const SORD=['musket','rod','spear','sspear','blunder','pgun','pistol','bomb','mbox','pbox','sbox','rbox','cell','grenade','gold','note'],sord=k=>{const i=SORD.indexOf(k);return i<0?99:i};
function cPack(c,extra){const L=(c.inv||[]).filter(Boolean).concat(extra?[extra]:[]).map((q,i)=>[q,i]).sort((p,q)=>sord(p[0].k)-sord(q[0].k)||p[1]-q[1]).map(p=>p[0]),t={x:c.x,y:c.y,long:c.long,box:c.box,cells:c.cells,inv:[]},res=new Map(),S=sGeo(c);
 for(const q of L){const p=cFit1(t,q.k);if(!p)return null;t.inv.push({k:q.k,sl:p.sl});res.set(q,p)}
 // pixels: everything sits flush from the top-left edge, packed tight against its neighbours; a lone item that fills the chest is centred
 const E=[...res].map(([q,p])=>{const[la,lb]=slotOf(q.k),[w0,h0]=foot(q.k),w=p.r?h0:w0,h=p.r?w0:h0;const lp=Math.floor(S.th/4),ac0=S.vert?w:h;return{q,p,a0:p.sl[0],a1:p.sl[0]+la,b0:p.sl[1],b1:p.sl[1]+lb,ac:la===1?Math.max(ac0,lp):ac0,pad:la===1?Math.max(0,lp-ac0)>>1:0,ln:S.vert?h:w}});
 for(const e of [...E].sort((x,y)=>x.b0-y.b0)){e.L=0;for(const z of E)if(z!==e&&z.b0<e.b0&&z.a0<e.a1&&e.a0<z.a1&&z.Le!==undefined)e.L=Math.max(e.L,z.Le);e.Le=e.L+e.ln}
 for(const e of [...E].sort((x,y)=>x.a0-y.a0)){e.A=0;for(const z of E)if(z!==e&&z.a0<e.a0&&z.b0<e.b1&&e.b0<z.b1&&z.Ae!==undefined)e.A=Math.max(e.A,z.Ae);e.Ae=e.A+e.ac}
 const one=E.length===1&&E[0].a1-E[0].a0===S.NL&&E[0].b1-E[0].b0===S.NS;
 for(const e of E){const ext=Math.max(...E.filter(z=>z.b0<e.b1&&e.b0<z.b1).map(z=>z.Ae));let A=e.A+e.pad+((S.th-ext)>>1),Lp=e.L;if(one){A=(S.th-e.ac)>>1;Lp=(S.vert?S.g.gh:S.g.gw)-e.ln>>1}if(S.vert){e.p.gx=A;e.p.gy=Lp}else{e.p.gx=Lp;e.p.gy=A}}
 return res}
const cSig=c=>c.inv.map(q=>q?q.k:'').join();
function cApply(c){const r=cPack(c);if(r)for(const[q,p]of r)Object.assign(q,p,{v:9});c._sig=cSig(c);return!!r}
function cFit(c,k){const e={k},r=cPack(c,e);return r?r.get(e):null}
function cAt(c,k,X,Y,skip){if(skip&&c.inv.includes(skip))return{gx:skip.gx,gy:skip.gy,r:skip.r,sl:skip.sl};return cFit(c,k)}
function cAdd(c,it){c.inv=c.inv||[];if(it.k==='gold'){const m=c.inv.find(q=>q&&q.k==='gold');if(m){m.n+=it.n;return true}}const q={...it,n:it.k==='gold'?it.n:1};delete q.mode;delete q.sl;const r=cPack(c,q);if(!r)return false;const i=c.inv.indexOf(null);if(i>=0)c.inv[i]=q;else c.inv.push(q);for(const[z,p]of r)Object.assign(z,p,{v:9});c._sig=cSig(c);return true}
function cFill(c,items){c.inv=[];for(const it of items||[]){if(!it)continue;const n=it.k==='gold'||it.k==='note'?1:it.n||1;for(let i=0;i<n;i++){const one={...it};if(one.k!=='gold')one.n=1;delete one.gx;delete one.gy;delete one.r;if(!cAdd(c,one))cSpill(c,one)}}}
const cFitsAll=(c,items)=>{const t={x:c.x,y:c.y,long:c.long,box:c.box,cells:c.cells,inv:[]};for(const it of items)for(let i=0;i<(it.k==='gold'||it.k==='note'?1:it.n||1);i++)if(!cAdd(t,{...it,n:it.k==='gold'?it.n:1}))return false;return true};
function spillAt(c){const b=c.box||[c.x-6,c.y-6,c.x+6,c.y+6],cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,free=(x,y)=>{for(let v=-3;v<=3;v++)for(let u=-3;u<=3;u++){const X=Math.round(x+u),Y=Math.round(y+v);if(X<1||Y<1||X>=W-1||Y>=H-1||sol[Y*W+X]||OBJ[Y*W+X])return false}return true};
 for(let d=8;d<40;d+=4)for(const[x,y]of[[cx,b[3]+d],[cx,b[1]-d],[b[0]-d,cy],[b[2]+d,cy],[b[0]-d,b[3]+d],[b[2]+d,b[3]+d],[b[0]-d,b[1]-d],[b[2]+d,b[1]-d]]){const jx=x+(Math.random()-.5)*6,jy=y+(Math.random()-.5)*6;if(free(jx,jy))return[jx,jy]}return[cx,b[3]+6]}
function cSpill(c,q){const[sx,sy]=spillAt(c);if(q.k==='note'){placeNote(q,sx,sy);return}if(!WP[q.k])return;const a=Math.random()*6.283,w=weapon(q.k,sx,sy,a);if(q.k==='gold')w.amt=q.n;if(CAP[q.k]){w.ammo=q.ammo??CAP[q.k];w.res=q.res||0}w.noPick=tick+120}
const cNorm=c=>{if(!c||!c.inv)return;if(c.inv.some(q=>q&&(!q.sl||q.v!==9)))cFill(c,c.inv.filter(Boolean));else if(c._sig!==cSig(c))cApply(c)};
// a shot through storage hits what lies in its path: explosives go off, Solari and notes wear away
function cShot(c,X,Y,r,b){if(!c||!c.inv)return;cNorm(c);c.holed=true;const g=cGeo(c);
 for(let i=0;i<c.inv.length;i++){const q=c.inv[i];if(!q)continue;const[w,h]=cRect(q),x0=g.ox+q.gx,y0=g.oy+q.gy,nx=Math.max(x0,Math.min(X,x0+w-1)),ny=Math.max(y0,Math.min(Y,y0+h-1));if(Math.hypot(nx-X,ny-Y)>r+.5)continue;
  const mx=x0+w/2,my=y0+h/2;
  if(q.k==='grenade'||q.k==='bomb'){c.inv[i]=null;const e=weapon(q.k,mx,my,0);e.fuse=1;lastHud=''}
  else if(q.k==='gold'){q.hp=(q.hp??3)-1;q.n=Math.floor(q.n*.6);sparkBurst(nx,ny,b?-b.vx:0,b?-b.vy:0,.3);if(q.hp<=0||q.n<1){c.inv[i]=null;debris(mx,my,rgb(236,196,80),6,0,-1)}lastHud=''}
  else if(q.k==='note'){c.inv[i]=null;debris(mx,my,rgb(232,222,194),8,0,-1);lastHud=''}}}
const ICN=new Map();function itemPix(k,r){const key=k+r;if(ICN.has(key))return ICN.get(key);const[w,h]=foot(k),o=[];
 if(k==='gold'){const SS=['.....','.###.','#....','.###.','....#','.###.','.....'];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const e=x===0||y===0||x===w-1||y===h-1,sg=SS[y]&&SS[y][x-1]==='#';o.push([x,y,sg?rgb(112,72,8):e?rgb(200,154,52):x+y<5?rgb(255,228,120):rgb(240,202,88)])}}
 else if(!WP[k]){const SC=new Set([8,9,10,12,22,23,25,26,36,38,39]);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const e=x===0||y===0||x===w-1||y===h-1,gr=.93+.07*Math.sin(x*1.7+hh(0,y,41)*4)+.03*(hh(x,y,42)-.5);o.push([x,y,e?rgb(176,162,128):SC.has(y*7+x)?rgb(64,58,74):mul(rgb(236,226,198),gr)])}}
 else if(k==='bomb'){const px=shape(k,0),M=new Map(px.map(p=>[(p[1]+4)*9+p[0]+4,p[2]]));for(let y=0;y<10;y++)for(let x=0;x<10;x++){const c0=M.get((y<2?y:y-1)*9+(x<2?x:x-1));if(c0!==undefined)o.push([x,y,c0])}}
 else{const px=shape(k,0);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of px){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1])}const ox=(w-(x1-x0+1))>>1,oy=(h-(y1-y0+1))>>1;for(const p of px){const a=p[0]-x0+ox,b=p[1]-y0+oy;o.push(r?[h-1-b,a,p[2]]:[a,b,p[2]])}}
 ICN.set(key,o);return o}
let SDR=null;const GLOWK=new Set(['sspear','pgun','cell']);
const storesShown=()=>{const L=[];for(const c of [openCrate,hoverC])if(c&&c.inv&&bodies.includes(c)&&!L.includes(c))L.push(c);for(const b of bodies)if(b.kind==='crate'&&!b.hidden&&(b.open||b===hover)&&!L.includes(b))L.push(b);if(SDR&&SDR.c.inv&&(SDR.c.box||SDR.c.kind==='crate')&&!L.includes(SDR.c))L.push(SDR.c);if((SDR||drag&&drag.b.type==='weapon')&&mouse.in){const c=dropBox();if(c&&!L.includes(c))L.push(c)}return L}
function dropBox(){const X=Math.round(mouse.x),Y=Math.round(mouse.y);if(X<0||Y<0||X>=W||Y>=H)return null;const sk=drag&&drag.b,c=bodyAt(X,Y,3,sk,o=>o.kind==='crate'&&!o.hidden);if(c)return c;const k=OM[Y/T|0]&&OM[Y/T|0][X/T|0];return k&&PCK.has(k)&&OBJ[Y*W+X]?boxAt(X,Y):null}
const canStore=(c,k)=>{if(!c)return false;cNorm(c);return k==='gold'&&c.inv.some(q=>q&&q.k==='gold')||!!(cAt(c,k,mouse.x,mouse.y)||cFit(c,k))};
function sdrOk(){const q=SDR.c.inv[SDR.i];if(!q||!mouse.in)return false;const X=Math.round(mouse.x),Y=Math.round(mouse.y),tk=bodyAt(X,Y,4,null,o=>o.type==='token'&&o.status!=='dead');if(tk)return tk!==SDR.c;const c=dropBox();if(c===SDR.c)return !!cAt(c,q.k,mouse.x,mouse.y,q);return c?canStore(c,q.k):false}
const NOPE=()=>US.none();
const METK=new Set(['musket','blunder','pistol','spear','sspear','rod','pgun','grenade','bomb','gold','rbox','cell']);function storeSnd(k){if(mute||!gest)return;SVOL=.4;try{SFX.drop()}catch(e){}SVOL=.25;if(METK.has(k))try{SFX.clink()}catch(e){}SVOL=1};
function storeHit(X,Y){for(const c of storesShown()){cNorm(c);const g=cGeo(c);for(let i=0;i<c.inv.length;i++){const q=c.inv[i];if(!q)continue;const[w,h]=cRect(q),x=g.ox+q.gx*g.cs,y=g.oy+q.gy*g.cs;if(X>=x&&Y>=y&&X<x+w*g.cs&&Y<y+h*g.cs)return{c,i}}}return null}
function drawHoled(sh){for(const c of bodies){if(!c.holed||!c.inv||sh.includes(c))continue;const g=cGeo(c),cx=Math.round(c.x),cy=Math.round(c.y),gone=c.box?j=>!OBJ[j]:(X,Y)=>!c.set.has(K(X-cx,Y-cy));
  for(const q of c.inv){if(!q||q.gx===undefined)continue;const bx=g.ox+q.gx,by=g.oy+q.gy;for(const[a,b,col]of itemPix(q.k,q.r)){const X=bx+a,Y=by+b;if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(c.box?gone(j):gone(X,Y))out[j]=col}}}}
function drawStores(){drawHoled(storesShown());const hit=!SDR&&!drag&&mouse.in&&UI.tool==='hand'?storeHit(Math.round(mouse.x),Math.round(mouse.y)):null;for(const c of storesShown()){cNorm(c);const g=cGeo(c),open=!c.box&&c.open;
  if(c.box||!open)for(let y=0;y<g.gh*g.cs;y++)for(let x=0;x<g.gw*g.cs;x++){if(!g.ok(x/g.cs|0,y/g.cs|0))continue;const X=g.ox+x,Y=g.oy+y;if(X<0||Y<0||X>=W||Y>=H)continue;out[Y*W+X]=mul(out[Y*W+X],.3)}
  for(let i=0;i<c.inv.length;i++){const q=c.inv[i];if(!q||SDR&&SDR.c===c&&SDR.i===i)continue;const[w,h]=cRect(q),ip=itemPix(q.k,q.r),bx=g.ox+q.gx*g.cs,by=g.oy+q.gy*g.cs;for(const[a,b]of ip){const gx=q.gx+a+1,gy=q.gy+b+1;if(gx<g.gw&&gy<g.gh&&g.ok(gx,gy))out[(g.oy+gy)*W+g.ox+gx]=mul(out[(g.oy+gy)*W+g.ox+gx],.5)}const hv=hit&&hit.c===c&&hit.i===i;for(const[a,b,col]of ip){const X=bx+a,Y=by+b;if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=hv?mix(col,rgb(255,255,255),.22):col}if(GLOWK.has(q.k))for(const[a,b,col]of ip){if((col>>16&255)<200||(col&255)<150)continue;for(let v=-2;v<=2;v++)for(let u=-2;u<=2;u++){const d=Math.hypot(u,v);if(!d||d>2.5)continue;const X=bx+a+u,Y=by+b+v;if(X>=0&&Y>=0&&X<W&&Y<H&&!ip.some(p=>p[0]===a+u&&p[1]===b+v))out[Y*W+X]=mix(out[Y*W+X],rgb(214,140,255),.32*(1-d/3))}}}}
 if(SDR){const q=SDR.c.inv[SDR.i];if(q){const db=dropBox(),sn=db&&!bodyAt(Math.round(mouse.x),Math.round(mouse.y),4,null,o=>o.type==='token'&&o.status!=='dead')&&cAt(db,q.k,mouse.x,mouse.y,q),sg=sn&&cGeo(db),r=sn?sn.r:q.r,[w,h]=sn?(r?[...foot(q.k)].reverse():foot(q.k)):cRect(q);for(const[a,b,col]of itemPix(q.k,r)){const X=(sn?sg.ox+sn.gx:Math.round(mouse.x-w/2))+a,Y=(sn?sg.oy+sn.gy:Math.round(mouse.y-h/2))+b;if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=col}}}}
// mini maps for each side: one room or stretch, opening onto the void or a corridor
const fxClear=()=>{for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,FH])a.fill(0);WH.fill(0);fxDirty=true};
// doorways draw from both neighbours, so they are redrawn once the whole map is laid
function resill(){for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=map[cy][cx];if(k==='sill'||k==='msill')paintCell(cx,cy,k)}}
function paintAll(f){map=Array.from({length:CH},()=>Array(CW).fill('stone'));for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)paintCell(cx,cy,f(cx,cy));fxClear()}
const UP=-Math.PI/2,DN=Math.PI/2,LF=Math.PI,RT=0;
const LOOKKIT={'Imperial Striped Guard':'spear',Officer:'pistol'};
function U(n,nat,u,cx,cy,a,w,look){if(w===undefined&&look&&LOOKKIT[look]!==undefined)w=LOOKKIT[look];const t=token(n,nat,u,cx*T,cy*T,false,w,look);t.ang=a;return t}
function cap(t,k){t.status='captured';t.held=null;if(k)tie(t,k);return t}
function buildCouncil(){paintAll((cx,cy)=>{const E=cx===0||cx===CW-1||cy===0||cy===CH-1;
 if(E)return cy===CH-1&&(cx===11||cx===12)||cy===8&&(cx===0||cx===CW-1)?'stone.night.block':'wood.ebony.boards.w';
 if((cx===3||cx===20)&&(cy===3||cy===7||cy===11))return 'stone.aur.block.w';
 if(cy===1&&(cx===11||cx===12))return 'seat';if(cy>=1&&cy<=3&&cx>=8&&cx<=15)return 'stone.aur.block';
 if(cx>=9&&cx<=14&&cy>=6&&cy<=9)return 'edesk';
 if((cx===8||cx===15)&&cy>=6&&cy<=9||cy===10&&(cx===11||cx===12))return 'seat';
 if(cx>=7&&cx<=16&&cy>=5&&cy<=11||cx>=10&&cx<=13&&cy>=4)return 'cloth.purple.diamond';return 'stone.night.block'})}
function unitsCouncil(){const[a,b]=dbl(2,176,248,207,240,0,2,false);mahogany(a,EBONY);mahogany(b,EBONY);for(const[x,r]of[[0,1],[CW-1,1]]){const d=slab(2,x*T+8,128,r);mahogany(d,EBONY)}
 U('The Emperor','Sanctis','civ',12,1.6,DN,null,'Emperor');
 U('Hierarch Aurex','Sanctis','civ',9.5,2.5,DN,null,'Hierarch');U('Hierarch Senna','Sanctis','civ',14.5,2.5,DN,null,'Hierarch');U('Brother Ilm','Sanctis','civ',2,1.8,DN,null,'Acolyte');
 for(const[n,x,y]of[['Eternal Kael',8.5,1.5],['Eternal Voss',15.5,1.5],['Eternal Ithar',7.5,4.2],['Eternal Mor',16.5,4.2]])U(n,'Sanctis','guard',x,y,DN);
 U('Warder Sel','Sanctis','rifle',10.2,14.2,UP);U('Warder Tane','Sanctis','rifle',13.8,14.2,UP);U('Warder Oss','Sanctis','rifle',1.6,8.5,RT);U('Warder Pell','Sanctis','rifle',22.4,8.5,LF);
 [['Lord Castor','Imperial Noble'],['Lord Ysander','Imperial Noble'],['Lord Aemon','Imperial Noble'],['Legate Varro','Officer']].forEach(([n,l],i)=>U(n,'Imperium','civ',8.5,6.5+i,RT,null,l));
 [['Lord Vane','Bank Lord'],['Master Orsk','Banker'],['Archivist Lell','Head Clerk'],['Clerk Toll','Clerk']].forEach(([n,l],i)=>U(n,'Goldbank','civ',15.5,6.5+i,LF,null,l));
 U('Alba','Imperium','civ',11.5,10.5,UP,'pistol','Officer');U('Meran','Imperium','civ',12.5,10.5,UP,null,'Imperial Noble');
 for(const[n,x,y,a]of[['Quill',6.2,6.2,RT],['Brask',6.2,9.4,RT],['Hode',10.4,12.6,UP],['Lusk',4.6,13.4,UP]])U(n,'Imperium','rifle',x,y,a,undefined,'Imperial Striped Guard');
 U('Ser Davin','Imperium','civ',19.5,13.5,UP,'pistol','Officer')}
function buildRoad(){paintAll((cx,cy)=>{if(cx>=13&&cx<=15&&cy>=8&&cy<=9)return 'chest';if(cy>=8&&cy<=10)return 'dirt';
 if(cy===6&&cx>=1&&cx<=14&&cx!==7||(cx===1||cx===14)&&cy>=1&&cy<=6)return 'rail';if(cx>=2&&cx<=13&&cy>=1&&cy<=5)return 'crop';
 const B=[[6,12],[7,12],[8,12],[7,13],[15,12],[16,12],[17,12],[16,13],[22,13],[23,13],[24,13],[23,14],[25,12],[20,4],[21,4],[22,4],[21,5],[24,3],[25,3],[26,3],[25,2]];return B.some(([a,b])=>a===cx&&b===cy)?'bush':'grass'})}
function unitsRoad(){container(13,8,[{k:'gold',n:640},{k:'musket',n:3,ammo:12,res:24},{k:'grenade',n:4}],'Company wagon');
 U('Factor Mercer','Portsbridge','civ',16.6,9,RT,'pistol');U('Ames','Portsbridge','civ',12.4,9.5,RT,null,'Company Clerk');
 U('Holt','Portsbridge','home',13.5,7.4,RT);U('Pike','Portsbridge','home',14.5,10.6,RT);U('Sorrel','Portsbridge','rifle',11.2,8.2,RT);U('Wren','Portsbridge','rifle',18.4,10.2,RT);U('Brannock','Portsbridge','guard',19.6,8.4,RT);
 U('Gull','Reapers','home',7.5,14.4,UP,'pistol');U('Mott','Reapers','home',6.2,13.6,UP,'spear');U('Rask','Reapers','guard',16.5,14.2,UP);U('Teague','Reapers','shock',17.8,13.6,UP,'spear');U('Brine','Reapers','home',23.5,15.4,UP,'blunder');
 U('Skiff','Reapers','cmd',21.5,3.2,DN,'pistol');U('Bones','Reapers','rifle',25.5,1.6,DN)}
function buildAlley(){paintAll((cx,cy)=>{if(cy===0||cy===CH-1)return cy===CH-1&&cx===15?'stone.grey.quarter':cy===0?'stone.grey.block.w':'wood.oak.boards.w';
 if(cy>=1&&cy<=3)return cx===0||cx===CW-1?'stone.grey.block.w':cy===2&&cx>=4&&cx<=7?'table':cx===16&&cy===1||cx===17&&cy===1?'chest':'wood.teak.planks';
 if(cy===4)return cx===10||cx===11?'stone.grey.quarter':'stone.grey.block.w';
 if(cx===2&&cy===5||cx>=19&&cx<=20&&cy===8||cx===20&&cy===7)return 'chest';return 'stone.grey.quarter'})}
function unitsAlley(){dbl(2,160,72,191,64,0,2,false);slab(2,240,CH*T-8,0);
 container(2,5,[{k:'spear',n:2}]);container(19,8,[]);container(16,1,[{k:'gold',n:180}],'Guild chest');
 U('Aldo','Great Keys','civ',9.2,6.4,RT,null);U('Mabb','Great Keys','civ',12.6,7.4,LF,null);U('Corr','Great Keys','civ',10.4,7.8,UP,'spear','Fisher');U('Wynn','Great Keys','civ',8,5.6,DN,null,'Fisher');
 U('Gull','Reapers','home',11,6.2,LF,null);U('Rask','Reapers','home',13.4,6,LF,'spear');U('Pell','Havenport','civ',7.6,7.6,RT,null);
 U('Ivo','Great Keys','home',10.5,4.6,DN);U('Sten','Great Keys','home',11.6,3.2,DN);U('Dorn','Great Keys','guard',11,2,DN);U('Lark','Great Keys','rifle',20.4,6,LF);
 U('Cutter','Reapers','rifle',1.4,7,RT,'pistol')}
function buildStock(){paintAll((cx,cy)=>{const E=cx===0||cx===CW-1||cy===0||cy===CH-1;
 if(E)return cy===CH-1&&(cx===12||cx===13)||cx===0&&cy===9?'stone.grey.slabs':'stone.grey.block.w';
 if(cy<=4)return cx===6||cx===12||cx===18?'metal.iron.rivet.w':'stone.grey.slabs';if(cy===5)return cx===3||cx===9||cx===15||cx===21?'stone.grey.slabs':'metal.iron.rivet.w';
 if(cy===11&&cx>=3&&cx<=5)return 'table';if(cy===13&&cx>=1&&cx<=2)return 'chest';if(cx===24&&cy>=10&&cy<=11)return 'chest';if(cx>=20&&cx<=21&&cy>=13&&cy<=14)return 'chest';return 'wood.oak.planks'})}
function unitsStock(){for(const x of [3,9,15,21]){const d=slab(3,x*T,5*T+8,0);d.locked=true}dbl(3,192,248,223,240,0,2,true);slab(2,8,9*T,1);
 container(1,13,[{k:'musket',n:2,ammo:12,res:12}]);container(24,10,[{k:'musket',n:3,ammo:12,res:24},{k:'spear',n:3}]);container(20,13,[{k:'gold',n:300}],'Bond chest');container(3,11,[]);
 cap(U('Tobin','Havenport','civ',2,2,DN,null),'chain');cap(U('Wynn','Great Keys','civ',4.6,3.4,UP,null,'Fisher'));
 cap(U('Gull','Reapers','home',8,2,DN,null),'chain');cap(U('Rask','Reapers','rifle',10.8,2.2,DN,null),'chain');cap(U('Crow','Reapers','home',9.5,4,UP,null));
 cap(U('Edda',null,'civ',14,2,DN,null),'rope');cap(U('Hob',null,'civ',16.6,3.6,UP,null));
 cap(U('Mabb','Great Keys','civ',20,2,DN,null),'rope');cap(U('Corr','Great Keys','civ',23,2.4,DN,null,'Fisher'),'chain');cap(U('Lysander',null,'civ',22,4,UP,null,'Noble'));
 // drawn up in three ranks for inspection, facing the gate
 const col=i=>7+i*1.375,R=[['home',7.2,['Vey','Oren','Brisk','Calo','Dunmer','Fen','Garr','Holm','Iler']],['rifle',8.8,['Aurel','Ivo','Hale','Jory','Kest','Lomas','Merrow','Nolt','Orrin']],['guard',10.4,[null,'Pallas','Quint','Rhun','Sabine','Tarquin','Ulric','Vesk',null]]];
 for(const[u,y,ns]of R)ns.forEach((n,i)=>{if(n)U(n,'Imperium',u,col(i),y,DN)});U('Drust','Imperium','shock',col(0),10.4,DN);U('Ennis','Imperium','shock',col(8),10.4,DN);
 U('Warden Crass','Imperium','guard',5.4,8.8,RT);
 U('Overseer Malcor','Imperium','civ',12.5,12.4,UP,null,'Overseer');U('Legate Thane','Imperium','civ',10.9,13.2,UP,'pistol','Officer');U('Tribune Corvin','Imperium','civ',14.1,13.2,UP,'pistol','Officer');U('Capt. Sorne','Imperium','civ',12.5,14.2,UP,'pistol','Officer');
 U('Pip','Imperium','civ',3.4,12.4,UP,null);U('Mercer',null,'civ',4.6,9.8,RT,null,'Merchant')}
function buildBank(){map=Array.from({length:CH},()=>Array(CW).fill('stone.grey.block.w'));
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){let k='stone.grey.block.w';
  if(cx>0&&cx<CW-1&&cy>0&&cy<CH-1){if(cx===11)k=(cy===2||cy===6||cy===7)?'sill':'stone.grey.block.w';else if(cx<11)k='stone.aur.chequer';else k='wood.oak.planks'}
  if(cx>=3&&cx<=7&&(cy===6||cy===7))k='table';
  if((cx===4||cx===6)&&(cy===5||cy===8))k='seat';
  if(cx>=15&&cx<=16&&cy===2)k='table';
  if(cy===10&&cx>11&&cx<CW-1)k=(cx===14||cx===15)?'sill':'stone.grey.block.w';
  paintCell(cx,cy,k)}
 for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,FH])a.fill(0);fxDirty=true}

// units and nations
const NAT={Neutral:null,Pirates:'#8a5a2b',Goldbank:'#c9a227',Havenport:'#2f5fa8',Imperium:'#b03a2a',Sanctis:'#8e5cc0',Portsbridge:'#c98a4a','Great Keys':'#3fa39a',Thaselore:'#7d4fa0',Holverland:'#3e8e5a',Reapers:'#5b6b3a'};
const UNITS={civ:{n:'Civilian',arm:0,cost:1,sp:2},home:{n:'Base',arm:1,ac:rgb(118,80,48),leather:1,cost:2,sp:1.5,w:'musket',pips:1},rifle:{n:'Riflemen',arm:1,ac:rgb(150,154,162),cost:3,sp:1.15,w:'musket',pips:2},guard:{n:'Heavy',arm:2,ac:rgb(186,192,202),cost:7,sp:.8,w:'musket',pips:3,rivet:1},shock:{n:'Shocktroopers',arm:3,ac:rgb(92,96,104),cost:9,sp:1.3,w:'spear',mark:'bar',seg:1},cmd:{n:'Commandos',arm:1,front:1,ac:rgb(46,48,52),cost:3,sp:.65,w:'blunder',mark:'x',dark:1}};
const SPR={"Overseer":"411211322db6dcceed222223|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abdbcefefecbdba.../...acbdecbbbcedbca.../..acbcebbgdgbbecbca../..abcecbgggggbcecba../..acbfbhhhhhhhbfbca../..abcebgggggggbecba../..acbfbgggggggbfbca../..abcecbgggggbcecba../..acbcebbgggbbecbca../...acbdecbbbcedbca.../...abdbcefefecbdba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Conscript":"411a32922dcba22211999822677787788722721|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abdbcbcbcbcbdba.../...acedecfffcedeca.../..aceceffgggffececa../..achchfgggggfhchca../..ahchfgggggggfhcha../..achcfiiiiiiifchca../..ahchfjjkkkjjfhcha../..achchfjjjjjfhchca../..alhlhffiiiffhlhla../...amhdhmfffmhdhma.../...ahdhmhmhmhmhdha.../....aaahmhmhmhaaa..../.......aaaaaaa......./.....................","Musketeer":"411a32922bcb899abaa22dcb211aaa999bbb7887879aa9a9822677565722721|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...adhbcbcbcbcbhda.../...afghgciiicghgfa.../..afjcgiiklkiigcjfa../..aopcqikkkkkiqcpoa../..akeqikkkkkkkiqeka../..akecirrrrrrriceka../..akkqinnmmmnniqkka../..asscqinnnnniqcssa../..atqtqiirrriiqtqta../...auqhquiiiuqhqua.../...aqhququququqhqa.../....aaaquququqaaa..../.......aaaaaaa......./.....................","Praetorian":"411aaabccabaabbcdd9aa9a9211666899565555898566888455788454611621822721444777511722344|...................../...................../.......aaaaaaa......./....aaabbbcbbbaaa..../...abbdeeefeeedbba.../...aggghhiiihhggga.../..ajkkkiillliikkkja../..amnnkiohhhoiknnma../..amppimnnnnnmippma../..amnniqrrrrrqinnma../..amppisrrrrrsippma../..atuvwixyyyxiwvuta../..azwAAiiBBBiiAAwza../...atvutziiiztuvta.../...awwwzztvtzzwwwa.../....aaazawwwazaaa..../.......aaaaaaa......./.....................","Shocktrooper":"411888aaa8988999aa2119a9999788565787566eed111455454444777677344666676|...................../...................../.......aaaaaaa......./....aaabbbbbbbaaa..../...acddeeeeeeeddca.../...afbbbbgggbbbbfa.../..ahijjggkkkggjjiha../..aeiljgmhhhmgjliea../..annlgoooooooglnna../..annbgpjjjjjpgbnna../..annbgqjjjjjqgbnna../..aeiljgrsssrgjliea../..addstgguuuggtsdda../...ajvvtwgggwtvvja.../...alvvvmmmmmvvvla.../....aaatttttttaaa..../.......aaaaaaa......./.....................","Commando":"411444721621211611344233111222511333|...................../...................../.......aaaaaaa......./....aaabbbbbbbaaa..../...acbbbbbbbbbbbca.../...adbbbbeeebbbbda.../..afcggeehhheeggcfa../..acfggeiiiiieggfca../..afdgehbbbbbhegdfa../..adfbejgggggjebfda../..akdbejgggggjebdka../..aiiiiejllljeiiiia../..aiiiieejjjeeiiiia../...aiiiiieeeiiiiia.../...aiiiiiiiiiiiiia.../....aaaiiiiiiiaaa..../.......aaaaaaa......./.....................","Officer":"411721922db6211222223|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abdbcbcbcbcbdba.../...acbdbceeecbdbca.../..acbcbeefffeebcbca../..abcbcefffffecbcba../..acbcegggggggecbca../..abcbefffffffebcba../..acbcefffffffecbca../..abcbcefffffecbcba../..acbcbeefffeebcbca../...acbdbceeecbdbca.../...abdbcbcbcbcbdba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Imperial Clerk":"411544655211976432322|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...acbcbcdddcbcbca.../..acbcbddeeeddbcbca../..abcbcdeeeeedcbcba../..acbcdeeeeeeedcbca../..abcbdfgfgfgfdbcba../..acbcdgfgfgfgdcbca../..abcbcdgfgfgdcbcba../..acbcbddgfgddbcbca../...acbcbcdddcbcbca.../...abcbcbcbcbcbcba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Imperial Striped Guard":"411721922ccbedc211999bbb677787788|...................../...................../.......aaaaaaa......./....aaabcdedcbaaa..../...abedcbedebcdeba.../...acdebcfffcbedca.../..acbedffghgffdebca../..abcdefgggggfedcba../..acbefgggggggfebca../..abcdfiiiiiiifdcba../..acbefjjkkkjjfebca../..abcdefjjjjjfedcba../..acbedffiiiffdebca../...acdebcfffcbedca.../...abedcbedebcdeba.../....aaabcdedcbaaa..../.......aaaaaaa......./.....................","Imperial Noble":"411612713db6eddbba211976321221|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abdbeeeeeeebdba.../...acbfffgggfffbca.../..acbeegghhhggeebca../..abceeghhhhhgeecba../..acbfghhhhhhhgfbca../..abcegijijijigecba../..acbegjijijijgebca../..abcffgjijijgffcba../..acbeeggjijggeebca../...acbeeegggeeebca.../...abdbfffffffbdba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Watchman":"132264254253211764cb7ca7dc8653a96243a85553|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...adbdbdeeedbdbda.../..adbdbeefffeebdbda../..abdbdefgggfedbdba../..adcdefhhhhhfedcda../..aiiiejkkkkkjeiiia../..adddejkkkkkjeddda../..adldlejmmmjeldlda../..aldldeennneedldla../...aldldleeeldldla.../...adldldlildldlda.../....aaalllilllaaa..../.......aaaaaaa......./.....................","Stockman":"132264254ec8253211a96dc8764dc7db7cb7a85ca7653243553|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...adcbcbcbcbcbcda.../...adbebefffebebda.../..ahhebffiiiffbehha../..ajkbefilllifebkja../..aklefinnnnnifelka../..aklhfogggggofhlka../..allefogggggofella../..alnepfommmofpenla../..apepeffqqqffepepa../...apepepfffpepepa.../...aepepepepepepea.../....aaapppppppaaa..../.......aaaaaaa......./.....................","Aurum Guard":"132dc8dc7fe9db7db8cb7211874ca7764ba6ba7653a96142253243a85553122|...................../...................../.......aaaaaaa......./....aaabbcdcbbaaa..../...aeefbbbdbbbfeea.../...aggggghhhggggga.../..aijjjhhkkkhhjjjia../..akllmhkgggkhmllka../..akllhkjjjjjkhllka../..akllhnooooonhllka../..akoohnooooonhooka../..aapqrhnsssnhrqpaa../..aarrrhhttthhrrraa../...aaqraahhhaarqaa.../...arrraaaqaaarrra.../....aaaaurrruaaaa..../.......aaaaaaa......./.....................","Aurum Knight":"132a96db7b96cb7211764111febca7653a85553ca6a95985|...................../...................../.......aaaaaaa......./....aaabbbbbbbaaa..../...acbbdddddddbbca.../...aebbbbfffbbbbea.../..aeebbffgggffbbeea../..aeebbfhhhhhfbbeea../..aiibfgjjjjjgfbiia../..aiibfkbbbbbkfbiia../..aiibfkbbbbbkfbiia../..aeebbfklllkfbbeea../..aeebbffmmmffbbeea../...anlloofffoollna.../...anllpppppppllna.../....aaaoooooooaaa..../.......aaaaaaa......./.....................","Gilded Hand":"132543253243211332111553143322443142121122|...................../...................../.......aaaaaaa......./....aaabbbbbbbaaa..../...acbbbbbbbbbbbca.../...adbbbbeeebbbbda.../..adcbbeefffeebbcda../..addbbegggggebbdda../..addbefhhhhhfebdda../..adibejkkkkkjebida../..aldbejkkkkkjebdla../..ammnmejkkkjemnmma../..agmmneejjjeenmmga../...amnmmgeeegmmnma.../...ammmgmmnmmgmmma.../....aaamgmmmgmaaa..../.......aaaaaaa......./.....................","Clerk":"132454455211976532432|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...acbcbcdddcbcbca.../..acbcbddeeeddbcbca../..abcbcdeeeeedcbcba../..acbcdeeeeeeedcbca../..abcbdfgfgfgfdbcba../..acbcdgfgfgfgdcbca../..abcbcdgfgfgdcbcba../..acbcbddgfgddbcbca../...acbcbcdddcbcbca.../...abcbcbcbcbcbcba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Head Clerk":"132343344211976999777|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...acbcbcdddcbcbca.../..acbcbddeeeddbcbca../..abcbcdeeeeedcbcba../..acbcdeeeeeeedcbca../..abcbdfgfgfgfdbcba../..acbcdgfgfgfgdcbca../..abcbcdgfgfgdcbcba../..acbcbddgfgddbcbca../...acbcbcdddcbcbca.../...abcbcbcbcbcbcba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Banker":"132243211222111221|...................../...................../.......aaaaaaa......./....aaaabababaaaa..../...aababababababaa.../...abababcccbababa.../..ababaccdddccababa../..aababcdddddcbabaa../..ababcdddddddcbaba../..aabaceeeeeeecabaa../..ababcfffffffcbaba../..aababcfffffcbabaa../..ababacceeeccababa../...abababcccbababa.../...aababababababaa.../....aaaabababaaaa..../.......aaaaaaa......./.....................","Bank Lord":"132254264db6b95211976321221|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbdddddddbcba.../...acbeeefffeeebca.../..acbddffgggffddbca../..abcddfgggggfddcba../..acbefgggggggfebca../..abcdfhihihihfdcba../..acbdfihihihifdbca../..abceefihihifeecba../..acbddffihiffddbca../...acbdddfffdddbca.../...abcbeeeeeeebcba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Thug":"331674663774664764653563211976553543453443542442|...................../...................../.......a.aaa........./......abcbc..da....../....acececececfga..../...agehehiiihegfga.../...aegeiijjjiiegea.../...akckijjjjjikcka.../...ackijjjjjjjikca.../..agkgifffffffihkha../...agkifffffffikha.../...akgkifffffikkka.../...aklkiifffiikmka.../...anklkliiilklkla.../....ankokoklklkna..../.....aak..p.pk.a...../.......aaa.aaa......./.....................","Cutthroat":"332898899999764211455664653888976444454553663788543453443442|...................../...................../.......a..aaaa......./....a.ab.b.b..a.a..../...accdddddddddcca.../..aebbbbbfffbbbgbha../..aijjjffkkkffljmna../..aopljfkkkkkfjjpoa../..anppfkkkkkkkfppna../.anibgfeeeeeeefbbona./..anjjfeeeeeeefjjna../..ainnnfeeeeefnnnna../..aqinnffeeeffnnnqa../..anqnrnrfffqnqnqna../...ansnsnsnsnsnsna.../....aaan..tnt..a...../.......aa.a........../.....................","Raider":"332653663674ba6664764899563211898553565888b965669a9788555455454444777543344453443442|...................../...................../........aaaaa......../....a...b.cdcaaaa..../...aecfcfcfcfcgcha.../..aeefifijjjcfbfkka../..aeelfjjmmmjjfbnna../..aoofljpqqqpjlcrra../..aooljskkkkksjlrna../..aeebjtrrrrrtjckna../..aeeljurrrrrujlnna../..aoobljvwwwvjllrra../..allxljjyyyjjlzlla../..alAlxlxjjjxlzlzla../...alxlxlAlAlAlAla.../....aaaaB.BlBaaa...../........aa.aa......../.....................","Blademaster":"332888a96898899444b96211788787111553322443653543453442|...................../...................../........aaa.aa......./.....a.bb.cccc.a...../....addeeffffgcca..../...acbbbbhhhfcccca.../...aciihhaaahhccca.../...acjihkkkkkhccca.../...acchalllllahjja.../..accchmnnnnnmhbbia../...aolhmnnnnnmhloa.../...apolhmnnnmhlola.../...alllhhmmmhhllla.../...aplnlnhhhplqlqa.../....anlnlnlnlnlna..../.....a.lr.rlr.aa...../.......a.a.........../.....................","Reaper":"332333764211222664653553663111322443543453442|...................../...................../.......a..aaaa......./....a.ab.b.b..a.a..../...abbbbbbbbbbbbba.../..acbbbbbdddbbbebfa../..agbbbddaaaddebeha../..aibebdjjjjjdbbbia../..ahbbdahhhhhadbbha../.ahgbedklllllkdbbiha./..ahbbdklllllkdbbha../..aghhhdklllkdhhhha../..amghhddkkkddhhhma../..ahmhnhndddmhmhmha../...ahlhlhlhlhlhlha.../....aaah..oho..a...../.......aa.a........../.....................","Peasant":"333764865211ba6bb6cb6884995a95|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...acbcbcdddcbcbca.../..acbcbddeeeddbcbca../..abcbcdeeeeedcbcba../..acbcdffgggffdcbca../..abcbdhhhhhhhdbcba../..acbcdiijjjiidcbca../..abcbcdiiiiidcbcba../..acbcbddhhhddbcbca../...acbcbcdddcbcbca.../...abcbcbcbcbcbcba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Merchant":"333642753db6211976542431|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abdbcbcbcbcbdba.../...acbdbceeecbdbca.../..acbcbeefffeebcbca../..abcbcefffffecbcba../..acbcefffffffecbca../..abcbeghghghgebcba../..acbcehghghghecbca../..abcbcehghghecbcba../..acbcbeehgheebcbca../...acbdbceeecbdbca.../...abdbcbcbcbcbdba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Priest":"333ccbddc211976999777|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...acbcbcdddcbcbca.../..acbcbddeeeddbcbca../..abcbcdeeeeedcbcba../..acbcdeeeeeeedcbca../..abcbdfgfgfgfdbcba../..acbcdgfgfgfgdcbca../..abcbcdgfgfgdcbcba../..acbcbddgfgddbcbca../...acbcbcdddcbcbca.../...abcbcbcbcbcbcba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Noble":"333336437db6eedbbb211976221|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abdbeeeeeeebdba.../...acbfffgggfffbca.../..acbeegghhhggeebca../..abceeghhhhhgeecba../..acbfghhhhhhhgfbca../..abcegigigigigecba../..acbeggigigiggebca../..abcffggigiggffcba../..acbeegggigggeebca../...acbeeegggeeebca.../...abdbfffffffbdba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Noblewoman":"33386996aeedcbb211976963852|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbdddddddbcba.../...acbeeefffeeebca.../..acbddffgggffddbca../..abcddfgggggfddcba../..acbefgggggggfebca../..abcdfhihihihfdcba../..acbdfihihihifdbca../..abceefihihifeecba../..acbddffihiffddbca../...acbdddfffdddbca.../...abcbeeeeeeebcba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Emperor":"101112212eeeccc111eeffffbbcccd|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abdbcdddddcbdba.../...acbdedfdfdedbca.../..acbcdffdgdffdcbca../..abcdcfgggggfcdcba../..acbefhhhhhhhfebca../..abcdfiiiiiiifdcba../..acbdfjjjjjjjfdbca../..abcecfjjjjjfcecba../..acbcdffiiiffdcbca../...acbddcfffcddbca.../...abdbceeeeecbdba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Hierarch":"101ccdddeeee425111314a86865|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abdbcbcbcbcbdba.../...aeedbcfffcbdeea.../..acggeffhihffeggca../..abcbcfhihihfcbcba../..acbcfhihihihfcbca../..abcbfihihihifbcba../..acbcfhihihihfcbca../..abcbcfhihihfcbcba../..acbcbffhihffbcbca../...acbdbcfffcbdbca.../...abdbcbcbcbcbdba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Acolyte":"101111eee424314|...................../...................../.......aaaaaaa......./....aaabbbbbbbaaa..../...abcbbbbbbbbbcba.../...abbcbbbbbbbcbba.../..abbbbbbdedbbbbbba../..abbbbbdededbbbbba../..abbbbdedededbbbba../..abbbbedededebbbba../..abbbbdedededbbbba../..abbbbbdededbbbbba../..abbbbbbdedbbbbbba../...abbcbbbbbbbcbba.../...abcbbbbbbbbbcba.../....aaabbbbbbbaaa..../.......aaaaaaa......./.....................","Sanctis Guard":"101213314eee323334111333223222212|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...adcbcbcbcbcbcda.../...afbdbcgggcbdbfa.../..affcbgghfhggbcffa../..ahhbcghhhhhgcbhha../..ahhcghhhhhhhgchha../..ahebgjjjjjjjgbeha../..ahhcgiiiiiiigchha../..akkbcgiiiiigcbkka../..acbcbggjjjggbcbca../...acbdbcgggcbdbca.../...abdbcbcbcbcbdba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Eternal":"101323223333111212eee001112222|...................../...................../.......aaaaaaa......./....aaabbcccbbaaa..../...adbbbbbbbbbbbda.../...adbbbbeeebbbbda.../..addcceefffeeccdda../..abdccefdddfeccdba../..aggcehhhhhhhecgga../..aggbeiccccciebgga../..aggceiccccciecgga../..abdcceijjjieccdba../..abbjjeeeeeeejjbba../...acjjjjeeejjjjca.../...acjjjjjjjjjjjca.../....aaajjjjjjjaaa..../.......aaaaaaa......./.....................","Dockhand":"12498669c211976542432|...................../...................../.......aaaaaaa......./....aaabbcccbbaaa..../...abccbbcccbbccba.../...abccbbdddbbccba.../..abbccddeeeddccbba../..abbccdeeeeedccbba../..abbcdeeeeeeedcbba../..abbcdfgfgfgfdcbba../..abbcdgfgfgfgdcbba../..abbccdgfgfgdccbba../..abbccddgfgddccbba../...abccbbdddbbccba.../...abccbbcccbbccba.../....aaabbcccbbaaa..../.......aaaaaaa......./.....................","Harbourmaster":"eee224235211976432322|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...acbcbcdddcbcbca.../..acbcbddeeeddbcbca../..abcbcdeeeeedcbcba../..acbcdeeeeeeedcbca../..abcbdfgfgfgfdbcba../..acbcdgfgfgfgdcbca../..abcbcdgfgfgdcbcba../..acbcbddgfgddbcbca../...acbcbcdddcbcbca.../...abcbcbcbcbcbcba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Harbour Watch":"123567ba9211888666776467a98456987|...................../...................../.......aaaaaaa......./....aaabbcccbbaaa..../...abccbbcccbbccba.../...abccbbdddbbccba.../..abbccddeeeddccbba../..abbccdeeeeedccbba../..abbcdeeeeeeedcbba../..abbcdfffffffdcbba../..abbcdgggggggdcbba../..abbccdgggggdccbba../..ahhiiddfffddiihha../...ajkkjbdddbjkkja.../...ajkkjjkkkjjkkja.../....aaajjkkkjjaaa..../.......aaaaaaa......./.....................","Marine":"123733ba9567999211aaa888aa9676666776555a98456987632|...................../...................../.......aaaaaaa......./....aaabbcccbbaaa..../...adccbbcccbbccda.../...aeccbbfffbbccea.../..agggcffhihffcggga../..ajhhcfhhhhhfchhja../..ajhhfhhhhhhhfhhja../..ajhhfkkkkkkkfhhja../..ajhhflllllllfhhja../..ajhhcflllllfchhja../..ammmnffkkkffnmmma../...aoppqbfffbqppoa.../...aoppqqpppqqppoa.../....aaaqqpppqqaaa..../.......aaaaaaa......./.....................","Harbour Guard":"123999ccb9a9aaa211555888887777444875986666333|...................../...................../.......aaaaaaa......./....aaabbbcbbbaaa..../...abbdeeeceeedbba.../...abbbbbfffbbbbba.../..aghhhffgggffhhhga../..agihhfgbbbgfhhiga../..agjjfghhhhhgfjjga../..aghhfkjjjjjkfhhga../..agjjfkjjjjjkfjjga../..almlmfknnnkfmlmla../..aalmlffooofflmlaa../...amlmlafffalmlma.../...almlalmlmlalmla.../....aaalalmlalaaa..../.......aaaaaaa......./.....................","Factor":"112235211976422321|...................../...................../.......aaaaaaa......./....aaabbbbbbbaaa..../...abbbbbbbbbbbbba.../...abbbbbcccbbbbba.../..abbbbccdddccbbbba../..abbbbcdddddcbbbba../..abbbcdddddddcbbba../..abbbcefefefecbbba../..abbbcfefefefcbbba../..abbbbcfefefcbbbba../..abbbbccfefccbbbba../...abbbbbcccbbbbba.../...abbbbbbbbbbbbba.../....aaabbbbbbbaaa..../.......aaaaaaa......./.....................","Company Clerk":"112654764211976853642|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...acbcbcdddcbcbca.../..acbcbddeeeddbcbca../..abcbcdeeeeedcbcba../..acbcdeeeeeeedcbca../..abcbdfgfgfgfdbcba../..acbcdgfgfgfgdcbca../..abcbcdgfgfgdcbcba../..acbcbddgfgddbcbca../...acbcbcdddcbcbca.../...abcbcbcbcbcbcba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Company Guard":"112235211c95974a74a84d95|...................../...................../.......aaaaaaa......./....aaabbbbbbbaaa..../...abbbbbbbbbbbbba.../...abbbbbcccbbbbba.../..abbbbccdddccbbbba../..abbbbcdddddcbbbba../..abbbcdddddddcbbba../..abbbceeeeeeecbbba../..abbbcffgggffcbbba../..abbbbcfffffcbbbba../..abbbbcceeeccbbbba../...abbbbbcccbbbbba.../...abbhbbbbbbbhbba.../....aaabbbbbbbaaa..../.......aaaaaaa......./.....................","Company Rifles":"112235ea6211eb6c95fb6a74974a84753d95|...................../...................../.......aaaaaaa......./....aaabbbbbbbaaa..../...abbbbbbbbbbbbba.../...acbbbbdddbbbbca.../..aeeebddfgfddbeeea../..ahffbdfffffdbffha../..ahffdfffffffdffha../..ahffdiiiiiiidffha../..ahffdhhjjjhhdffha../..ahffbdhhhhhdbffha../..akkkbddiiiddbkkka../...abbbbbdddbbbbba.../...abblbbbbbbblbba.../....aaabbbbbbbaaa..../.......aaaaaaa......./.....................","Company Ironside":"112ea6da6eb6fb6da5d95211863c95753b85653a84235642974542|...................../...................../.......aaaaaaa......./....aaabbcccbbaaa..../...abbbddeceddbbba.../...afffgghhhggfffa.../..aijjjhhkkkhhjjjia../..aklljhigggihjllka../..akllhklllllkhllka../..akllhmnnnnnmhllka../..akllhmnnnnnmhllka../..aoooohpqqqphooooa../..aaooohhrrrhhoooaa../...aooooahhhaooooa.../...aoogaoooooagooa.../....aaaoaoooaoaaa..../.......aaaaaaa......./.....................","Burgher":"122546ca5211976432422|...................../...................../.......aaaaaaa......./....aaabbbbbbbaaa..../...abcbbbbbbbbbcba.../...abbcbbdddbbcbba.../..abbbbddeeeddbbbba../..abbbbdeeeeedbbbba../..abbbdeeeeeeedbbba../..abbbdfgfgfgfdbbba../..abbbdgfgfgfgdbbba../..abbbbdgfgfgdbbbba../..abbbbddgfgddbbbba../...abbcbbdddbbcbba.../...abcbbbbbbbbbcba.../....aaabbbbbbbaaa..../.......aaaaaaa......./.....................","Fisher":"122887998211a95984|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...acbcbcdddcbcbca.../..acbcbddefeddbcbca../..abcbcdefefedcbcba../..acbcdefefefedcbca../..abcbdfefefefdbcba../..acbcdefefefedcbca../..abcbcdefefedcbcba../..acbcbddefeddbcbca../...acbcbcdddcbcbca.../...abcbcbcbcbcbcba.../....aaabcbcbcbaaa..../.......aaaaaaa......./.....................","Key Warden":"122266277211777cdceed555566666|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...acbcbcdddcbcbca.../..acbcbddeeeddbcbca../..abcbcdeeeeedcbcba../..acbcdeeeeeeedcbca../..afgfdhhhhhhhdfgfa../..agfgdiijjjiidgfga../..afgfgdiiiiidgfgfa../..agfgfddhhhddfgfga../...agfgfgdddgfgfga.../...afgfgfgfgfgfgfa.../....aaafgfgfgfaaa..../.......aaaaaaa......./.....................","Keys Rifles":"122266277888211899777889666778555566eed455cdc|...................../...................../.......aaaaaaa......./....aaabcbcbcbaaa..../...abcbcbcbcbcbcba.../...adbcbceeecbcbda.../..afffbeeghgeebfffa../..aijjcegggggecjjia../..aijjegggggggejjia../..aijjekkkkkkkejjia../..aijjelliiillejjia../..aijjmelllllemjjia../..annnoeekkkeeonnna../...amomomeeemomoma.../...aomomomomomomoa.../....aaaomomomoaaa..../.......aaaaaaa......./.....................","Gatekeeper":"122788277eee778211445677444667666344334cdceed333556|...................../...................../.......aaaaaaa......./....aaabbbcbbbaaa..../...addddddddddddda.../...aeeeeefffeeeeea.../..aghhhffiiiffhhhga../..aijjhfieeeifhjjia../..aikkfihjjjhifkkia../..aijjflkkkkklfjjia../..aikkfmkkkkkmfkkia../..anonofpqqqpfonona../..aanonffpppffnonaa../...aononafffanonoa.../...anonanononanona.../....aaananonanaaa..../.......aaaaaaa......./....................."};
const LOOK={Imperium:{civ:'Imperial Clerk',home:'Conscript',rifle:'Musketeer',guard:'Praetorian',shock:'Shocktrooper',cmd:'Commando'},Goldbank:{civ:'Clerk',home:'Watchman',rifle:'Stockman',guard:'Aurum Guard',shock:'Aurum Knight',cmd:'Gilded Hand'},Reapers:{civ:'Thug',home:'Thug',rifle:'Cutthroat',guard:'Raider',shock:'Blademaster',cmd:'Ravager'},Havenport:{civ:'Dockhand',home:'Harbour Watch',rifle:'Marine',guard:'Harbour Guard',shock:'Harbour Guard',cmd:'Smuggler'},Portsbridge:{civ:'Director',home:'Police Officer',rifle:'Enforcement Officer',guard:'Company Guard',shock:'Company Guard',cmd:'Enforcement Officer'},'Great Keys':{civ:'Ironkey Guildmember',home:'Ironkey Militia',rifle:'Keys Watchman',guard:'Gatekeeper',shock:'Gatekeeper',cmd:'Keys Watchman'},Sanctis:{civ:'Sanctis Noble',home:'Sanctis Guard',rifle:'Sanctis Guard',guard:"Emperor's Guard",shock:"Emperor's Guard",cmd:'Spy'},'':{civ:'Peasant'}};
const ALIAS={Hierarch:'Sanctis Noble',Acolyte:'Spymaster',Reaper:'Ravager',Eternal:"Emperor's Guard",'Company Ironside':'Company Guard','Company Rifles':'Enforcement Officer',Factor:'Director','Key Warden':'Ironkey Militia','Keys Rifles':'Keys Watchman',Burgher:'Ironkey Guildmember','Imperial Striped Guard':'Conscript',Fisher:'Sailor'};
const SIDE={Pirates:'Reapers'},SPRD={};
const lookOf=b=>{const l=b.look&&(ALIAS[b.look]||b.look);return l&&(WARD.has(l)||SPR[l])?l:(LOOK[SIDE[b.nat]||b.nat||'']||{})[b.unit]||null};const lookOf0=b=>(LOOK[SIDE[b.nat]||b.nat||'']||{})[b.unit]||null;
function sprG(n){if(!n)return null;if(WARD.has(n))return'ward';if(!SPR[n])return null;if(SPRD[n])return SPRD[n];const[p,r]=SPR[n].split('|'),pal=p.match(/.../g).map(h=>[parseInt(h[0],16)*17,parseInt(h[1],16)*17,parseInt(h[2],16)*17]),g=r.split('/').map(row=>[...row].map(ch=>{if(ch==='.')return null;const pi=ch>='a'?ch.charCodeAt(0)-97:ch.charCodeAt(0)-39,q=pal[pi],l=(q[0]+q[1]+q[2])/3,st=Math.max(...q)-Math.min(...q);return[rgb(...q),st<40&&l>100||q[0]>q[1]&&q[1]>q[2]&&l>120&&q[0]-q[2]>60,pi]}));return SPRD[n]=g}
// sprites face up; sample the frame turned to the token's facing
const NHUE=[[28,.42,.95],[38,.45,1],[18,.4,.9],[48,.38,1.02],[0,0,.92],[24,.3,.75],[34,.22,1.08],[12,.32,.85]];
function neutralTone(b,c,p){if(b.nat||b.unit!=='civ'||Math.hypot(p[8],p[9])<=4.7)return c;const r=(c&255)/255,g=(c>>8&255)/255,bl=(c>>16&255)/255,mx=Math.max(r,g,bl),mn=Math.min(r,g,bl);if(mx<.16||mx-mn<.1)return c;const[h,sa,vk]=NHUE[(b.tone??((b.id||0)*5+3))%NHUE.length],v=Math.min(1,mx*vk),s2=sa,hh6=h/60,i=Math.floor(hh6)%6,f=hh6-Math.floor(hh6),pq=v*(1-s2),q=v*(1-f*s2),tt=v*(1-(1-f)*s2),o=[[v,tt,pq],[q,v,pq],[pq,v,tt],[pq,q,v],[tt,pq,v],[v,pq,q]][i];return rgb(o[0]*255|0,o[1]*255|0,o[2]*255|0)}
// rebuilt units: each token keeps its own spawn (skin, hair, outfit, helmet) as a colour grid
function wgrid(b,n){if(b._wn!==n||!b.wg){b._wn=n;if(b.wseed==null)b.wseed=b.id?b.id*7919+13:1;b.wsp=WARD.spawn(n,b.wseed);b.wg=WARD.grid(n,b.wsp,b.cond||4).map(r=>r.map(q=>q&&[rgb(...q[0]),q[1],q[2],q[3]]))}return b.wg}
function sprAt(b,p){const n=lookOf(b);if(n&&WARD.has(n)){const g=wgrid(b,n),a=b.ang||0,c=Math.cos(a),s=Math.sin(a),ox=p[8],oy=p[9],sy=Math.round(-(ox*c+oy*s)),sx=Math.round(-ox*s+oy*c),row=g[9+sy];return row&&row[10+sx]||null}const g=sprG(n);if(!g)return undefined;const a=b.ang||0,c=Math.cos(a),s=Math.sin(a),ox=p[8],oy=p[9],sy=Math.round(-(ox*c+oy*s)),sx=Math.round(-ox*s+oy*c),row=g[9+sy];return row&&row[10+sx]||null}
const STEEL=rgb(150,154,162),STEEL_A=rgb(116,120,128);
const natc=b=>b.nat&&NAT[b.nat]?hx(NAT[b.nat]):b.unit==='civ'?rgb(206,202,192):rgb(150,150,150);
// relations between the sandbox factions (regional map, adjusted to the lore); anything unlisted is neutral
const REL={'Goldbank|Imperium':'ally','Goldbank|Portsbridge':'ally','Goldbank|Sanctis':'ally','Imperium|Sanctis':'ally','Great Keys|Sanctis':'ally','Havenport|Sanctis':'ally','Great Keys|Imperium':'ally','Havenport|Portsbridge':'enemy','Holverland|Reapers':'enemy'};
// battles that set allies against each other
const FIGHT={bank:[['Goldbank','Imperium']],council:[['Sanctis','Imperium'],['Sanctis','Goldbank'],['Imperium','Goldbank']]};
const PGUILD={Ironkey:'Great Keys',Brasskey:'Great Keys'},guildOf=b=>{const l=b.nat==='Great Keys'&&lookOf(b)||'';return/^Ironkey/.test(l)?'Ironkey':/^Brasskey/.test(l)?'Brasskey':null};
const relOf=(a,b)=>a!==b&&PGUILD[a]&&PGUILD[b]?'enemy':PGUILD[a]&&PGUILD[a]===b||PGUILD[b]&&PGUILD[b]===a?'neutral':relOf0(PGUILD[a]||a,PGUILD[b]||b),relOf0=(a,b)=>a===b?'self':a==='Neutral'||b==='Neutral'?'neutral':(FIGHT[curMap]||[]).some(([p,q])=>p===a&&q===b||p===b&&q===a)?'enemy':REL[[a,b].sort().join('|')]==='ally'?'ally':'enemy';
const foe=(a,b)=>relOf(teamOf(a),teamOf(b))==='enemy';
const RELC={self:rgb(140,214,120),ally:rgb(110,160,230),enemy:rgb(222,88,72),neutral:rgb(220,216,206)};
const natLabel=b=>{const me=aiOn&&aiMe?aiMe:lastSide;if(b.type==='token'&&me){const c=RELC[relOf(me,teamOf(b))];return css(b.status==='dead'?mix(c,rgb(70,70,70),.55):c)}const c=b.nat&&NAT[b.nat]?hx(NAT[b.nat]):rgb(216,212,202);return css(b.status==='dead'?mix(c,rgb(96,96,96),.25):c)};

// bodies
let bodies=[],parts=[],uid=1;
function mkSet(b){b.set=new Map(b.px.map(p=>[K(p[0],p[1]),p]))}
// a unit's pixels take their material from what its sprite paints there: steel and gilt plate are metal on armoured classes, the rest cloth (leather on leather-armoured classes)
const SPRM={};function sprMat(n,unit){const key=n+'|'+unit;if(SPRM[key])return SPRM[key];const u=UNITS[unit]||UNITS.civ,pal=SPR[n].split('|')[0].match(/.../g).map(h=>[parseInt(h[0],16)*17,parseInt(h[1],16)*17,parseInt(h[2],16)*17]);
 return SPRM[key]=pal.map(([r,g,b])=>{if(!u.arm)return'c';if(u.leather)return'l';const l=(r+g+b)/3,st=Math.max(r,g,b)-Math.min(r,g,b);return st<=34&&l>=40&&l<=225||r>=g&&g>b&&g-b>=60&&l>=130?'m':'c'})}
const SPRMAT=false;// sprite materials off until each sprite's colours are tagged by hand
function tokMat(b){b.matA=b.ang;const wn=lookOf(b);if(wn&&WARD.has(wn)){b.matN=wn;for(const p of b.px){if(p[11]===undefined){if(p[7]==='a'||p[7]==='f'){p[7]='c';p[3]=p[6]=1}p[11]=p[6]}const sp=sprAt(b,p),M=sp&&sp[1]&&WARD.MET[sp[2]],mx=M?Math.max(2,Math.round(M.s*WARD.LV[b.cond||4].f*.9)):p[11];p[4]=M?3:0;p[10]=M?'m':'c';if(p[6]!==mx){p[3]=Math.max(1,Math.round(p[3]/p[6]*mx));p[6]=mx}}return}const n=SPRMAT&&wn;if(!n)return;const M=sprMat(n,b.unit);for(const p of b.px){if(p[7]==='f')continue;const sp=sprAt(b,p),m=sp?M[sp[2]]:'c';p[4]=m==='m'?3:0;p[10]=m}}
function tokPixels(b){b.matA=null;const u=UNITS[b.unit],px=[];
 for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){const d=Math.hypot(dx,dy);if(d>8.3)continue;let r,hp,m=0;
  if(u.arm&&d>7.4-u.arm){r='a';hp=u.cost;m=u.leather?0:3}else if(u.front&&d>5.4){r='f';hp=13;m=3}else if(d>4.4){r='c';hp=1}else if(d>3.5){r='k';hp=3}else{r='h';hp=3}
  px.push([dx,dy,0,hp,m,0,hp,r,dx,dy])}return px}
// default arms per side and class; KIT2 adds a sidearm
const KIT={Imperium:{civ:null,home:'musket',rifle:'musket',guard:()=>Math.random()<.3?'sspear':'spear',shock:'spear',cmd:'pgun'},Sanctis:{civ:null,home:'musket',rifle:'musket',guard:'sspear',shock:'sspear',cmd:'sspear'},Goldbank:{civ:null,home:'musket',rifle:'musket',guard:'musket',shock:'spear',cmd:'blunder'},Reapers:{civ:'pistol',home:'pistol',rifle:'blunder',guard:'musket',shock:'spear',cmd:'pistol'},Pirates:{civ:'pistol',home:'pistol',rifle:'blunder',guard:'musket',shock:'spear',cmd:'pistol'},Havenport:{civ:null,home:'pistol',rifle:'musket',guard:'musket',shock:'spear',cmd:'blunder'},Portsbridge:{civ:null,home:'pistol',rifle:'musket',guard:'musket',shock:'spear',cmd:'blunder'},'Great Keys':{civ:null,home:'spear',rifle:'musket',guard:'musket',shock:'spear',cmd:'blunder'}};
const KIT2={Imperium:{guard:['blunder'],cmd:['pistol']},Goldbank:{cmd:['pistol'],guard:['pistol']},Reapers:{cmd:['pistol'],guard:['pistol']},Sanctis:{}};
const RND=Math.random,stole=(k,p)=>RND()<p?k:null,KITL={Overseer:['pistol'],Officer:['pistol'],'Imperial Clerk':[null],'Imperial Noble':[null],Conscript:['musket'],Musketeer:['musket'],Praetorian:[()=>RND()<.3?'sspear':'spear','blunder'],Shocktrooper:['spear'],Commando:['pgun','pistol'],
 Clerk:[null],'Head Clerk':[null],Banker:[null],'Bank Lord':['pistol'],Watchman:['musket'],Stockman:['musket'],'Aurum Guard':['musket','pistol'],'Aurum Knight':['spear','pistol'],'Gilded Hand':['blunder','pistol'],
 Thug:['pistol'],Cutthroat:['blunder'],Raider:[()=>stole('pgun',.03)||'musket','pistol'],Blademaster:[()=>stole('pgun',.04)||stole('rod',.02)||'spear'],Ravager:[()=>stole('rod',.04)||stole('pgun',.02)||'pistol','pistol'],
 Emperor:[null],'Sanctis Noble':[null],Spymaster:['pistol'],'Sanctis Guard':['musket'],"Emperor's Guard":['sspear'],Spy:[b=>b.wsp&&b.wsp.alt?'sspear':'pistol'],
 Dockhand:[null],Commoner:[null],Sailor:[null],Harbourmaster:['pistol'],Pirate:['pistol'],Smuggler:['blunder'],'Harbour Watch':['pistol'],Marine:['musket'],'Harbour Guard':['musket','pistol'],
 Boardsman:[null],Director:[null],'Company Clerk':[null],Townsman:[null],Shareholder:[null],Bailiff:['pistol'],'Police Officer':['pistol'],'Enforcement Officer':['musket'],'Company Guard':['musket','blunder'],
 'Keeper of the Keys':['pistol'],'Ironkey Guildmaster':[null],'Ironkey Guildmember':[null],'Ironkey Militia':['spear'],'Brasskey Guildmaster':[null],'Brasskey Guildmember':[null],'Brasskey Militia':['pistol'],'Keys Watchman':['musket'],Gatekeeper:['musket','pistol']};
const RICH=new Set(['Imperial Noble','Overseer','Bank Lord','Banker','Emperor','Sanctis Noble','Boardsman','Director','Shareholder','Harbourmaster','Keeper of the Keys','Ironkey Guildmaster','Brasskey Guildmaster','Noble','Noblewoman','Merchant']);
function token(name,nat,unit,x,y,guard,wk,look){const b0={nat,unit,look},lk=lookOf(b0),K=wk===undefined&&lk&&KITL[lk];const b={id:uid++,type:'token',name,nat,unit,x,y,vx:0,vy:0,status:'free',guard:!!guard,auto:true,mass:1+UNITS[unit].arm*.4,ang:0,held:null,inv:null,wseed:RND()*1e9|0};if(look)b.look=look;if(lk&&WARD.has(lk))b.wsp=WARD.spawn(lk,b.wseed);
 let kit=K?K[0]:KIT[nat]&&KIT[nat][unit];if(typeof kit==='function')kit=kit(b);const w=wk===undefined?(kit!==undefined?kit:UNITS[unit].w):wk,hot=K&&(w==='pgun'||w==='rod')&&!/^(Commando)$/.test(lk);{b.inv=[null,null,null,null,null,null];const it0=w?{k:w,n:w==='spear'||w==='sspear'?4:1,ammo:CAP[w],res:CAP[w]&&unit!=='civ'?RCAP(w)*(unit==='guard'||unit==='cmd'||w==='sspear'?2:1):undefined}:null;if(it0&&w==='pgun'&&unit==='cmd'&&!hot)it0.res=Math.round((CAP.pgun+it0.res)*1.5)-CAP.pgun;if(it0&&hot)it0.res=RCAP(w);if(it0)addItem(b,it0);for(const q of loadout(unit,w))if(nat!=='Goldbank'||q.k!=='grenade'&&q.k!=='bomb')addItem(b,q);b.si=w?b.inv.findIndex(z=>z&&z.k===w):-1;b.held=b.si>=0?b.inv[b.si]:null};if(wk===undefined)for(const k of K?K.slice(1):(KIT2[nat]&&KIT2[nat][unit])||[]){const it={k,n:1,ammo:CAP[k],res:CAP[k]};if(k==='blunder'&&slotOK(b,1)&&!b.inv[1])b.inv[1]=it;else addItem(b,it)}if(w==='sspear'&&slotOK(b,1)&&!b.inv[1])b.inv[1]={k:'blunder',n:1,ammo:CAP.blunder,res:CAP.blunder};if(unit==='civ'){const rich=RICH.has(lk);if(RND()<(rich?.7:.3))addItem(b,{k:'gold',n:rich?10+(RND()*31|0):1+(RND()*8|0)})}b.px=tokPixels(b);b.n0=b.px.length;mkSet(b);bodies.push(b);mkLabel(b);kitSnap(b);return b}
const WP={musket:{n:'Musket',gun:1,fr:.9,m:1,range:300,spread:.03,speed:46,proj:'ball',len:14,hold:750,smoke:1,rec:.5,E:18},blunder:{n:'Blunderbuss',gun:1,fr:.9,m:1,range:140,spread:.025,speed:42,proj:'pel',len:10,hold:750,smoke:1.2,rec:.45,E:10,pellets:4},pistol:{n:'Pistol',gun:1,fr:.9,m:.7,range:170,spread:.05,speed:40,proj:'pball',len:7,hold:500,smoke:.5,rec:.3,E:13},spear:{n:'Spear',sharp:1,melee:1,fr:.985,max:30,m:1.1,tip:12},pgun:{n:'Plasma gun',gun:1,fr:.9,m:1.1,range:200,spread:.025,speed:34,proj:'arc',len:10,hold:900,rec:.6,E:6},sbomb:{hide:1,n:'Shock bomb',fr:.93,max:24,m:1},sspear:{n:'Lancer',sharp:1,melee:1,fr:.985,max:30,m:1.2,tip:11.5,proj:'arc',speed:34,E:6,rec:1.2,len:12,hold:1100,range:220,spread:.02},shield:{hide:1,n:'Shield',fr:.9,max:16,m:2,tip:1},rod:{n:'Bolter',gun:1,fr:.9,m:1.3,range:340,spread:.012,speed:50,proj:'rodp',len:15,tip:15,hold:900,smoke:.5,rec:2.4,E:40,kb:4},grenade:{n:'Grenade',fr:.93,max:24,m:1},pot:{hide:1,n:'Fire pot',fr:.97,max:24,m:1},bomb:{n:'Heavy grenade',fr:.95,max:16,m:5},crate:{n:'Crate',hide:1,fr:.75,max:6,m:9},gold:{n:'Solari',hide:1,fr:.8,max:10,m:1},rbox:{n:'Rods',hide:1,fr:.8,max:10,m:1.5},ball:{n:'Ball',fr:.995,max:46,m:.4,hide:1,bullet:1},pball:{n:'Shot',fr:.995,max:40,m:.25,hide:1,bullet:1},pel:{n:'Pellet',fr:.99,max:42,m:.3,hide:1,bullet:1},arc:{n:'Arc',fr:.995,max:34,m:.3,hide:1,bullet:1},rodp:{n:'Rod',fr:.996,max:52,m:1.2,hide:1,bullet:1,rod:1}};
const CAP={musket:12,pistol:18,blunder:8,rod:3,pgun:3},RCAP=k=>k==='pgun'?6:CAP[k],BOX={musket:'mbox',pistol:'pbox',blunder:'sbox',rod:'rbox',pgun:'cell'},CARRY={civ:1,home:2,rifle:2,guard:3,cmd:4,shock:5};
function loadout(u,w){const L=[];if(u==='civ')return L;if(RND()<.25)L.push({k:'grenade',n:1});if((u==='cmd'||u==='guard')&&RND()<.1)L.push({k:'bomb',n:1});return L}
// slots: 0 primary, 1 secondary, 2 grenade, 3 heavy, 4+ pack
const SEC=new Set(['pistol']),GREN=new Set(['grenade','pot','sbomb']),PACK={civ:1,home:1,rifle:1,guard:2,cmd:2,shock:2},LIGHT=new Set(['civ','home']);
const slotOK=(t,i)=>t.type!=='token'||!(i===1&&LIGHT.has(t.unit))&&i<4+(PACK[t.unit]||1);
// what a body fires from: a unit's held item, or a ground weapon acting as its own holder
const slot=b=>b.type==='token'?b.held:b.type==='weapon'&&WP[b.kind]?b.gs||(b.res===undefined&&CAP[b.kind]&&(b.res=CAP[b.kind]*2),b.gs={get k(){return b.kind},get ammo(){return b.ammo??CAP[b.kind]},set ammo(v){b.ammo=v},get res(){return b.res||0},set res(v){b.res=v},heat:0}):null;
function consume(b){const s=b.held;if(!s)return;s.n=(s.n||1)-1;if(s.n>0){if(CAP[s.k])s.ammo=CAP[s.k];delete s.mode;b.hc=null;return}if(b.inv&&b.si>=0)b.inv[b.si]=null;b.held=null;b.si=-1;b.hc=null}
function selectSlot(b,i){const s=b.inv&&b.inv[i];if(!s||s.k==='gold'||s.k==='note')return;if(s.k.endsWith('box')||s.k==='cell'){const h=b.held;if(h&&BOX[h.k]===s.k){h.res=(h.res||0)+RCAP(h.k)*(s.n||1);b.inv[i]=null;sfx('reload');if((h.ammo??CAP[h.k])<CAP[h.k])reload(b)}return}if(b.si===i)return;b.si=i;b.held=s;b.hc=null;sfx('flick')}
function reload(b,o2){if(!o2&&offGun(b)){let r2=false;withOff(b,()=>{r2=reload(b,1)});return reload(b,1)||r2}const h=slot(b);if(!h||!CAP[h.k])return false;if(h.k==='sspear'&&(h.res||0)>0){delete h.mode;h.spent=false;b.hc=null}const v=h.vent;delete h.vent;const cur=h.ammo??CAP[h.k],take=Math.min(CAP[h.k]-cur,h.res||0);if(take<=0){if(v){b.cock=14;b.hc=null;sfx('reload')}return!!v}h.res-=take;h.ammo=cur+take;b.cock=14;b.hc=null;sfx('reload');if(b.type==='token'&&(b.ai||b.pa))say(b,'Reloading');hear(b.x,b.y,60,b,'reload');return true}
const THR={civ:.5,home:.7,rifle:.8,guard:.9,cmd:1.25,shock:1};
const C={lw:rgb(198,164,112),lwD:rgb(160,126,80),wood:rgb(138,96,58),woodH:rgb(162,118,74),woodD:rgb(110,74,44),iron:rgb(138,150,144),ironH:rgb(196,206,200),ironD:rgb(86,98,92),ironK:rgb(40,46,44),lead:rgb(78,80,86),clay:rgb(156,82,60),clayD:rgb(104,50,36),cloth:rgb(214,204,180),fuse:rgb(230,170,60)};
const rodFill=it=>it&&(it.k==='rod'||it.kind==='rod')?Math.ceil((it.ammo??CAP[it.k||it.kind])/CAP[it.k||it.kind]*3-1e-9)/3:1;
const HEAT=[[0,null],[.18,rgb(118,72,64)],[.34,rgb(150,44,28)],[.5,rgb(206,62,26)],[.66,rgb(250,118,38)],[.82,rgb(255,190,90)],[1,rgb(255,244,214)]];
const PHEAT=[[0,null],[.2,rgb(64,52,92)],[.4,rgb(100,62,168)],[.6,rgb(146,84,236)],[.8,rgb(196,146,255)],[1,rgb(244,234,255)]];
function heatCol(h,cold,R=HEAT){if(h<=0)return cold;h=Math.min(1.05,h);for(let i=1;i<R.length;i++)if(h<=R[i][0]||i===R.length-1){const a=R[i-1],b=R[i],t=Math.min(1,(h-a[0])/(b[0]-a[0])),e=t*t*(3-2*t);return mix(a[1]||cold,b[1],e)}return cold}
const sh3=(c,u)=>u<-.2?mul(c,1.16):u>.2?mul(c,.72):c;
const SPRT=new Set(['pgun','musket','blunder','pistol','rod','sspear','spear','grenade','bomb','shield','sword']);
function shape(kind,a,fill=1,heat=0){const m=new Map(),c=Math.cos(a),s=Math.sin(a);
 const st=(t0,t1,w,f)=>{for(let t=t0;t<=t1;t+=.5)for(let u=-w;u<=w+.01;u+=.5)m.set(K(Math.round(c*t-s*u),Math.round(s*t+c*u)),f(t,u))};
 const disc=(r,f)=>{for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++){const d=Math.hypot(x,y);if(d<=r)m.set(K(x,y),f(x,y,d))}};
 if(kind==='spear')st(-12.8,12.4,0,t=>t>11?C.ironH:(t*2|0)%7===0?C.ironD:C.iron);
 if(kind==='sspear')st(-12,11.5,0,t=>{if(t>8)return(t*2|0)%2?plasC(Math.random()):rgb(240,226,255);const base=(t*2|0)%7===0?rgb(26,27,31):rgb(48,50,57);if(!heat)return base;const c=heatCol(heat*(.8+.25*(t+12)/20)+(hh(t*2|0,7,3)-.5)*.05*Math.min(1,heat*3),base,PHEAT);return heat>1?mix(c,rgb(255,255,255),Math.min(.7,(heat-1)*2.5)):c});
 if(kind==='pgun'){const dm=rgb(44,46,54);st(-10,-5,1,(t,u)=>sh3(dm,u));st(-5,6,.5,(t,u)=>sh3(rgb(54,56,66),u));st(6,8,1,(t,u)=>sh3(rgb(50,54,66),u));st(8.5,10,1.5,(t,u)=>t>=10&&Math.abs(u)<.3?rgb(220,170,255):sh3(rgb(58,60,68),u))}
 if(kind==='sbomb'){disc(3.2,(x,y,d)=>d>2.6?rgb(70,96,120):d<1.4?rgb(200,230,255):x+y<-1?rgb(120,180,240):rgb(70,120,210));m.set(K(0,-3),C.lwD);m.set(K(0,-4),C.lwD)}
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
 if(kind==='crate'||kind==='lcrate'){const hw=kind==='lcrate'?15:5;for(let y=-5;y<=5;y++)for(let x=-hw;x<=hw;x++){const e=Math.abs(x)===hw||Math.abs(y)===5;m.set(K(x,y),e?C.woodD:(x===y||x===-y)?mul(C.wood,.82):(y+5)%3===0?mul(C.wood,.9):C.woodH)}}
 if(kind==='mbox'||kind==='pbox'||kind==='sbox'){const t=kind==='mbox'?rgb(176,140,90):kind==='pbox'?rgb(150,120,80):rgb(120,110,96);for(let y=-3;y<=3;y++)for(let x=-5;x<=5;x++)m.set(K(x,y),Math.abs(y)===3||Math.abs(x)===5||y===0?mul(t,.68):t)}
 if(kind==='rbox'){for(let y=-2;y<=2;y++)for(let x=-6;x<=6;x++)m.set(K(x,y),x===-3||x===3?rgb(40,42,48):y%2?rgb(140,144,152):rgb(184,188,196))}
 if(kind==='cell'){for(let y=-4;y<=4;y++)for(let x=-2;x<=2;x++)m.set(K(x,y),Math.abs(x)===2||Math.abs(y)===4?rgb(36,48,84):y<-1?rgb(140,205,255):rgb(70,100,170))}
 if(kind==='grenade'){disc(3.2,(x,y,d)=>d>2.6?C.ironK:Math.hypot(x+1,y+1)<1.2?C.ironH:x+y<-1?C.iron:C.ironD);m.set(K(0,0),C.fuse)}
 if(kind==='pot'){disc(3.4,(x,y,d)=>d>2.8?C.clayD:x+y<-2?mul(C.clay,1.2):C.clay);m.set(K(0,-1),C.cloth);m.set(K(0,-2),C.cloth);m.set(K(1,-2),C.cloth)}
 if(kind==='bomb')disc(4.6,(x,y,d)=>d>3.9?C.ironK:Math.abs(d-3.2)<.45?mul(C.ironD,.7):Math.hypot(x+1.5,y+1.5)<1.3?C.ironH:d>1.4?(x+y<-2?C.iron:C.ironD):rgb(214,176,70));
 if(SPRT.has(kind))for(const[k,col]of m){const r=col&255,g=col>>8&255,b=col>>16&255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),X=Math.floor(k/1024)-512,Y=k%1024-512,n=hh(X*c+Y*s|0,Y*c-X*s|0,77);if(mx-mn<24&&mx>20)m.set(k,rgb(cl(r*.95*(.96+n*.08)),cl(g*(.96+n*.08)),cl(b*.97*(.96+n*.08))));else if(r>g&&g>b&&r-b>40)m.set(k,mul(col,.94+n*.12))}
 return [...m].map(([k,col])=>{const X=Math.floor(k/1024)-512,Y=k%1024-512;if(kind==='bomb'){const h=Math.hypot(X,Y)>2.5?9:1;return[X,Y,col,h,3,0,h,h>1?'a':'h',X,Y]}if(kind==='crate'||kind==='lcrate')return[X,Y,col,2,2,0,2,'x',X,Y];return[X,Y,col,1,3,0,1,'x',0,0]})}
function weapon(kind,x,y,a=0){const b={id:uid++,type:'weapon',kind,x,y,vx:0,vy:0,ang:a,mass:WP[kind].m,px:shape(kind,a)};mkSet(b);bodies.push(b);return b}
function wedgeIn(b){if(b.kind!=='spear'&&b.kind!=='sspear'||b.wedged)return;b.wedged=true;b.trim=true;reshape(b,b.ang)}
function reshape(b,a){b.ang=a;if(b.kind==='bomb'||b.kind==='crate')return;b.px=shape(b.kind,a,rodFill(b));if(b.trim){const c=Math.cos(a),s=Math.sin(a);b.px=b.px.filter(p=>p[0]*c+p[1]*s>=-5.2)}mkSet(b);if(b.spent)spend(b);if(solidHits(b,0,0))b.ghost=true}
function slabPix(m,len=16,th=8){const px=[],hp=(m===2?2:7)+(len>16?(m===2?1:4):0);for(let y=-th;y<=-1;y++)for(let x=0;x<len;x++){let c;const e=y===-th||y===-1||x===0||x===len-1;
 const ed=Math.min(x,len-1-x,y+th,-1-y),sd=uid*37;let q;
 if(m===2)q=woodT(x+sd,y+sd,WOOD.oak,1);
 else{q=sc(metalOf('steel',x+sd,y*3+sd),1+(len/2-x)/len*.16);}
 c=rgb(cl(q[0]),cl(q[1]),cl(q[2]));
 px.push([x,y,c,hp,m,0,hp,'x',x,y])}return px}
function swingPt(b,lx,ly,a){const B=b.rot*Math.PI/2+(b.spin||0),cb=Math.cos(B),sb=Math.sin(B),ca=Math.cos(a),sa=Math.sin(a),hx=-(b.th||8)/2-1,hy=-(b.th||8)/2,dx=lx-hx,dy=ly-hy,qx=hx+dx*ca-dy*sa,qy=hy+dx*sa+dy*ca;return[qx*cb-qy*sb,qx*sb+qy*cb]}
function orient(b){let a=b.ang||0;if(!b.src){for(const p of b.px){const q=swingPt(b,p[8],p[9],a);p[0]=Math.round(q[0]);p[1]=Math.round(q[1])}mkSet(b);return}
 if(b.used){const live=new Set();for(const t of b.px){if(!t.s||b.set.get(K(t[0],t[1]))!==t)continue;const q=t.s;live.add(q);if(t[3]<q[3])q[3]=t[3];if(t[2]!==t.c0)q[2]=t[2];if(t[5]>q[5])q[5]=t[5]}for(const q of b.used)if(!live.has(q))q.dead=1}
 if(!b.smap){b.smap=new Map();for(const q of b.src)b.smap.set(K(q[8],q[9]),q)}
 const sl=!b.free&&!b.fallen,f=sl?Math.min(1,Math.abs(a)/1.4)*((b.len||16)-3)/(b.len||16):0;if(sl)a=0;const L=b.len||16,th=b.th||8,B=b.rot*Math.PI/2+(b.spin||0),cb=Math.cos(B),sb=Math.sin(B),ca=Math.cos(a),sa=Math.sin(a),hx=-th/2-1,hy=-th/2,ox=-f*L*cb,oy=-f*L*sb;
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const[lx,ly]of[[-.5,-th-.5],[L-.5,-th-.5],[-.5,-.5],[L-.5,-.5]]){const q=swingPt(b,lx,ly,a);x0=Math.min(x0,q[0]+ox);x1=Math.max(x1,q[0]+ox);y0=Math.min(y0,q[1]+oy);y1=Math.max(y1,q[1]+oy)}
 const px=[],used=new Set();for(let Y=Math.floor(y0);Y<=Math.ceil(y1);Y++)for(let X=Math.floor(x0);X<=Math.ceil(x1);X++){const rx=(X-ox)*cb+(Y-oy)*sb-hx,ry=-(X-ox)*sb+(Y-oy)*cb-hy,lx=hx+rx*ca+ry*sa,ly=hy-rx*sa+ry*ca,q=b.smap.get(K(Math.round(lx+1e-6),Math.round(ly+1e-6)));
  if(!q||q.dead)continue;const t=[X,Y,q[2],q[3],q[4],q[5],q[6],q[7],q[8],q[9]];t.s=q;t.c0=q[2];px.push(t);used.add(q)}
 b.px=px;b.used=used;mkSet(b)}
function slab(m,x,y,rot=0,len=16,th=8){const b={id:uid++,type:'slab',mat:m,x,y,vx:0,vy:0,rot,ang:0,tgt:0,len,th,src:slabPix(m,len,th),px:[],mass:9*len/16};orient(b);bodies.push(b);return b}
// metal slabs are drawn in steel, then recoloured into their own metal
function barricade(m,x,y,len,th,mat,cd){const b=slab(m,x,y,0,len,th);b.free=true;if(m===3&&mat&&mat!=="steel"){for(const q of b.src)q[2]=toneC(mat,q[2]);b.used=null;b.px=[];orient(b)}if(m===3)wearSrc(b,'Metal',mat||'steel',cd);else{if(mat&&ELEM.Wood.mats[mat]&&mat!=='oak')mahogany(b,memb('Wood',mat).c,0);wearSrc(b,'Wood',mat||'oak',cd)}return b}
// a slab or door in condition cd: its material's wear over each pixel, from the slab's own edge; pieces sample the wear at twice the scale of tiles so small ones still show patches
function wearSrc(b,el,mat,cd){const A=ageOf(el,mat,cd);if(!A)return;const L=b.len||16,th=b.th||8,o=b.id*37;for(const q of b.src){const x=q[8],y=q[9],c=q[2],r=A([c&255,c>>8&255,c>>16&255],(x+o)*2,(y+o)*2,()=>Math.min(x,L-1-x,y+th,-1-y)-1);q[2]=rgb(cl(r[0]),cl(r[1]),cl(r[2]))}b.cond=cd;b.used=null;b.px=[];orient(b)}
function slabFits(d,ignore){const bx=Math.round(d.x),by=Math.round(d.y);for(const p of d.px){const X=bx+p[0],Y=by+p[1];if(X<0||Y<0||X>=W||Y>=H)return false;const j=Y*W+X;if(sol[j]||(slabG[j]&&slabG[j]!==d.id&&!(ignore&&ignore.has(slabG[j]))))return false}return true}
function remark(d,on){const bx=Math.round(d.x),by=Math.round(d.y);for(const p of d.px){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H){const j=Y*W+X;if(on)slabG[j]=d.id;else if(slabG[j]===d.id)slabG[j]=0}}}
function spinTo(d,a){const L=(d.len||16)/2,Tq=-(d.th||8)/2,c0=swingPt(d,L,Tq,0),s0=d.spin||0,x0=d.x,y0=d.y;remark(d,false);d.spin=a-d.rot*Math.PI/2;const c1=swingPt(d,L,Tq,0);d.x+=c0[0]-c1[0];d.y+=c0[1]-c1[1];orient(d);
 if(!slabFits(d)){d.spin=s0;d.x=x0;d.y=y0;orient(d)}remark(d,true)}
function pushSlabs(b,h,sx,sy){const ids=new Set();for(const[X,Y]of h){if(X<0||Y<0||X>=W||Y>=H)return false;const j=Y*W+X;if(sol[j])return false;if(!slabG[j])continue;const d=byId(slabG[j]);if(!d||!d.free||d.fallen)return false;ids.add(d.id)}
 if(!ids.size)return false;const ds=[...ids].map(byId);for(const d of ds){remark(d,false);d.x+=sx;d.y+=sy}
 if(!ds.every(d=>slabFits(d,ids))){for(const d of ds){d.x-=sx;d.y-=sy;remark(d,true)}return false}
 for(const d of ds)remark(d,true);b.pushT=tick;b.pushM=Math.max(...ds.map(d=>(d.len||16)>16?3:d.mat===3?2:1));if(tick%12===0)sfx(ds.some(d=>d.mat===3)?'chink':'thunk');return true}
const stage=$('stage');
function mkLabel(b){const l=b.lab=document.createElement('div');l.className='lab';l.textContent=b.name;l.oncontextmenu=e=>{e.preventDefault();openMenu(b,e)};l.onpointerdown=e=>{if(e.button===0){e.stopPropagation();if([...sel].some(o=>o.direct)){boardDown(e);return}clickBody(b,e.ctrlKey||e.metaKey)}};stage.appendChild(l)}
function remove(b){if(b.snd){b.snd.stop();b.snd=null}bodies=bodies.filter(o=>o!==b);if(b.lab)b.lab.remove();if(drag&&drag.b===b)drag=null;sel.delete(b);if(hover===b)hover=null}

// geometry
function markSlabs(){slabG.fill(0);for(const b of bodies)if(b.type==='slab'&&!b.fallen&&!(!b.free&&Math.abs(b.ang)>.2)){const bx=Math.round(b.x),by=Math.round(b.y);for(const p of b.px){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H)slabG[Y*W+X]=b.id}}}
function solidHits(b,ox,oy){const bx=Math.round(b.x+ox),by=Math.round(b.y+oy),tk=b.type==='token';let h=null;
 for(const p of b.px){if(tk&&p[0]*p[0]+p[1]*p[1]>45)continue;const X=bx+p[0],Y=by+p[1];if(X<0||Y<0||X>=W||Y>=H){(h||(h=[])).push([X,Y]);continue}const j=Y*W+X;if(sol[j]||(slabG[j]&&slabG[j]!==b.id)||tk&&OBJ[j])(h||(h=[])).push([X,Y])}return h}
const byId=id=>bodies.find(o=>o.id===id);
function matAt(X,Y){if(X<0||Y<0||X>=W||Y>=H)return 1;const j=Y*W+X;if(sol[j])return sol[j];const s=slabG[j]&&byId(slabG[j]);return s?s.mat:0}
function bodyAt(X,Y,r=1,skip,filter){for(let i=bodies.length-1;i>=0;i--){const b=bodies[i];if(b===skip||(filter&&!filter(b))||(!filter&&b.status==='dead'))continue;const bx=Math.round(b.x),by=Math.round(b.y);for(let j=-r;j<=r;j++)for(let k=-r;k<=r;k++)if(b.set.has(K(X+k-bx,Y+j-by)))return b}
 if(filter)return null;for(const b of bodies)if(b.held&&heldPix(b).some(p=>Math.abs(p[0]-X)<=r&&Math.abs(p[1]-Y)<=r))return b;return null}
function doorPart(d,X,Y){if(d.fallen||d.free)return;const p=d.set.get(K(X-Math.round(d.x),Y-Math.round(d.y)));const dl=d.len||16,dt=d.th||8;if(!p||p[9]<-(dt>>1)-2||p[9]>-(dt>>1)+1)return;
 if(p[8]<=4){d.fallen=true;for(let i=0;i<8;i++)spark(X,Y,rgb(150,152,156),0,0,2.4);sfx('drop');sfx('mhit');return}
 if(p[8]>=dl-6&&p[8]<=dl-3&&!d.lockBroken){d.lockBroken=true;for(const q of d.pair?[d,d.pair]:[d]){q.locked=false;if(!q.fallen&&q.ang===0&&q.tgt===0)q.tgt=openDir(q)}if(d.pair)d.pair.lockBroken=true;for(let i=0;i<8;i++)spark(X,Y,rgb(240,140,40),0,0,2.4);sfx('mhit');sfx('door')}}
function rubble(j){const c=scol[j];floor[j]=Math.random()<.3?mul(c,.32):mul(c,.5)}
function hitPix(o,X,Y,pow){const k=K(X-Math.round(o.x),Y-Math.round(o.y)),p=o.set.get(k);if(!p)return 0;p[3]-=pow;if(p[3]<=0){o.set.delete(k);if(p[7]==='h'||p[7]==='k')o.coreHit=true;return 2}return 1}
function settle(o){o.px=o.px.filter(p=>o.set.has(K(p[0],p[1])));if(o.type!=='slab'){split(o);return}if(!o.px.length){remove(o);return}if(o.fallen)return;
 const seen=new Set(),comps=[];for(const p of o.px){const k=K(p[0],p[1]);if(seen.has(k))continue;const cp=[],q=[p];seen.add(k);while(q.length){const c=q.pop();cp.push(c);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const kk=K(c[0]+dx,c[1]+dy),z=o.set.get(kk);if(z&&!seen.has(kk)){seen.add(kk);q.push(z)}}}comps.push(cp)}
 const hinge=o.free?comps.reduce((a,c)=>c.length>a.length?c:a):comps.find(cp=>cp.some(p=>p[8]<=1));
 if(!hinge){o.fallen=true;sfx('drop');return}
 if(comps.length<2)return;o.px=hinge;mkSet(o);
 for(const cp of comps)if(cp!==hinge){const f={id:uid++,type:'slab',mat:o.mat,x:o.x,y:o.y,vx:0,vy:0,rot:o.rot,ang:o.ang,tgt:o.ang,fallen:true,mass:9,px:cp};mkSet(f);bodies.push(f);sfx('drop')}}
function damagePixel(X,Y,pow,dx=0,dy=0){if(X<1||Y<1||X>=W-1||Y>=H-1)return 1;const j=Y*W+X;
 if(sol[j]){const m=sol[j];if(shp[j]>pow){shp[j]-=pow;scol[j]=mul(scol[j],.9);wallHit(X,Y,.25);return m}sol[j]=0;solDirty=true;NAVD=true;rubble(j);wallHit(X,Y,1);if(Math.random()<.45)spark(X,Y,scol[j],dx,dy);return m}
 const s=slabG[j]&&byId(slabG[j]);if(s){doorPart(s,X,Y);const r=hitPix(s,X,Y,pow);if(r===2){slabG[j]=0;if(Math.random()<.5)spark(X,Y,s.mat===2?C.wood:C.iron,dx,dy);settle(s)}return s.mat}return 0}
function carve(cx,cy,r,pow,dx,dy){const R=Math.ceil(r*1.7)+1;for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const X=Math.round(cx+i),Y=Math.round(cy+j),m=matAt(X,Y);if(!m)continue;const rm=r*(m===2?1.7:m===3?.8:1);if(Math.hypot(i,j)+hh(X,Y,4)*1.2>rm)continue;damagePixel(X,Y,pow,dx,dy)}}
let BLU=false;const swb=c=>{const r=c&255,g=c>>8&255,b=c>>16&255;return b>=r&&b>g+30?rgb(g,r,b):c};
function spark(x,y,c,dx=0,dy=0,sp=2.2,life,mn=0){if(BLU)c=swb(c);if(parts.length>1200)return;const a=Math.random()*6.283,s=sp*(mn+(1-mn)*Math.random());parts.push({x,y,vx:Math.cos(a)*s-dx*.35,vy:Math.sin(a)*s-dy*.35,c,life})}
function dab(a,px,py,amt=1,R=8){for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const X=Math.floor(px/2+i),Y=Math.floor(py/2+j);if(X<0||Y<0||X>=BW||Y>=BH)continue;const d=Math.hypot(i,j)/R;if(d>1)continue;a[Y*BW+X]=Math.min(4,a[Y*BW+X]+amt*(1-d)*(0.55+0.45*hh(X,Y,R)))}fxDirty=true}

// colours
const glow=h=>h>.6?mix(rgb(242,122,40),rgb(255,232,160),Math.min(1,(h-.6)/.5)):h>.25?mix(rgb(150,34,16),rgb(242,122,40),(h-.25)/.35):rgb(150,34,16);
const frontOf=(o,p)=>p[8]*Math.cos(o.ang||0)+p[9]*Math.sin(o.ang||0)>Math.hypot(p[8],p[9])*.7;
function drawCape(b,lift){const a=b.ang||0,c=Math.cos(a),s=Math.sin(a),bx=Math.round(b.x),by=Math.round(b.y),o=lift?3:0,da=Math.abs(Math.atan2(Math.sin(a-(b.capeA0??a)),Math.cos(a-(b.capeA0??a))));b.capeA0=a;
 b.capeS=(b.capeS||0)+(((b.mv>0?1:0)+Math.min(1,da*10))-(b.capeS||0))*.08;const sw=b.capeS*1.1*Math.sin(tick*.18+b.id);
 for(let f=-10;f<=-5;f+=.5)for(let u=-6.5;u<=6.5;u+=.5){const uu=u+sw*(-5-f)/5,X=Math.round(bx+c*f-s*uu)+o,Y=Math.round(by+s*f+c*uu)+o;if(X<0||Y<0||X>=W||Y>=H||b.set.has(K(X-bx-o,Y-by-o)))continue;
  let col=mul(rgb(42,94,62),.8+.2*Math.cos(u*1.4));if(Math.abs(u)>6||f<-9.5)col=mul(col,.6);if(b.status==='dead')col=grey(col);out[Y*W+X]=col}}
const cape=(ox,oy)=>{const v=vn(ox/2,oy*1.5,77);return mul(rgb(42,94,62),.82+v*.3)};
function pcol(b,p){let c;const r=p[7],ox=p[8],oy=p[9],u=UNITS[b.unit]||UNITS.civ;
 if(b.type==='token'){const q=sprAt(b,p);if(q!==undefined){if(!q)return 0;c=neutralTone(b,r==='x'?mul(q[0],.7):q[0],p);if(p[3]<p[6])c=mul(c,.6+.4*p[3]/p[6]);if(p[5]>.01)c=mix(c,glow(p[5]),Math.min(1,p[5]*1.6));return c}}
 if(r==='x'||b.type==='weapon'){c=p[2];const hw=b.long?15:5;if(b.kind==='crate'&&b.metal&&!(b.open&&Math.abs(ox)<hw&&Math.abs(oy)<5))c=mix(grey(c),rgb(152,158,170),.45);if(b.kind==='crate'&&b.open&&Math.abs(ox)<hw&&Math.abs(oy)<5)c=Math.abs(ox)===hw-1||Math.abs(oy)===4?mul(C.woodD,.75):(oy+5)%3===0?mul(C.woodD,.45):mul(C.woodD,.6);const sth=b.th||8,sln=b.len||16;if(b.type==='slab'&&!b.free&&ox>=0&&oy>=-(sth>>1)-1&&oy<=-(sth>>1)){if(ox>=1&&ox<=2)c=b.mat===3?rgb(62,64,70):rgb(170,172,176);else if(ox>=sln-5&&ox<=sln-4&&!b.lockBroken)c=b.locked?rgb(240,140,40):rgb(150,92,44)}}
 else if(r==='a'){if(u.leather){c=u.ac;const v=hh(ox,oy,3);c=mul(c,.96+v*.08);if(ox+oy<-5)c=mul(c,1.14);else if(ox+oy>5)c=mul(c,.84)}else{const q=metalCore(ox*2+b.id*13,oy*2),d=Math.hypot(ox,oy);const gb=b.nat==='Goldbank';c=gb?mix(rgb(cl(q[0]),cl(q[1]),cl(q[2])),b.unit==='shock'?rgb(178,140,64):b.unit==='guard'?rgb(222,186,96):rgb(200,164,84),.66):mix(rgb(cl(q[0]),cl(q[1]),cl(q[2])),u.ac,u.dark?.75:.45);c=mul(c,1+(-(ox+oy)/16)*(u.dark?.12:.22));if(d>7.8)c=mul(c,.72);else if(d>7.4-u.arm+.6&&d<7.4-u.arm+1.4)c=mul(c,1.12)}
  const fa=ox*Math.cos(b.ang||0)+oy*Math.sin(b.ang||0),sa=-ox*Math.sin(b.ang||0)+oy*Math.cos(b.ang||0);
  if(u.rivet&&hh(ox,oy,21)>.86)c=b.nat==='Goldbank'?rgb(250,226,150):rgb(201,164,70);
  if(u.seg&&b.nat==='Goldbank'){if(fa<-2)c=cape(ox,oy);else{if(Math.abs(Math.round(fa*1.2)%3)===0)c=mul(c,.72);if(Math.abs(sa)<.6)c=mul(c,1.18)}}
  else{if(u.seg&&(ox===0||oy===0||Math.abs(ox)===Math.abs(oy)))c=mul(c,.68);if(u.seg&&hh(ox,oy,22)>.9)c=mul(c,1.35);if(u.seg&&fa<-2)c=mul(UNITS.guard.ac,(.9+hh(ox,oy,3)*.08)*(ox+oy<-5?1.08:ox+oy>5?.86:1))}}
 else if(r==='f')c=frontOf(b,p)?mul(u.ac,hh(ox,oy,5)>.8?1.6:1.3):mul(natc(b),u.dark?.5:.8);
 else if(r==='c'){c=natc(b);if(u.arm)c=mul(c,u.dark?.5:.8);if((ox+oy)&1)c=mul(c,.94);if(u.seg&&b.nat==='Goldbank'&&ox*Math.cos(b.ang||0)+oy*Math.sin(b.ang||0)<-1.5)c=cape(ox,oy)}
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
 if(b.type==='token'&&b.status!=='dead'&&(b.coreHit||(comps.length>1&&comps[1].length>=5)||b.px.length<b.n0*.45)){b.status='dead';if(b.held)dropHeld(b);sfx('squish');dab(FX.blood,b.x,b.y,1.4,5)}
 if(comps.length<2)return;b.px=comps[0];mkSet(b);
 for(const cp of comps.slice(1)){if(cp.length<3)continue;
  const mx=Math.round(cp.reduce((s,p)=>s+p[0],0)/cp.length),my=Math.round(cp.reduce((s,p)=>s+p[1],0)/cp.length);
  const o={id:uid++,type:'part',parent:b.parent||b.id,unit:b.unit,nat:b.nat,guard:b.guard,status:'dead',x:b.x+mx,y:b.y+my,vx:b.vx*.6+mx*.18,vy:b.vy*.6+my*.18,mass:cp.length/200,px:cp.map(p=>{const z=p.slice();z[0]-=mx;z[1]-=my;return z})};
  mkSet(o);bodies.push(o)}
 b.vx*=.6;b.vy*=.6}
// refill: what the unit was last kitted with comes back (or its default kit), every gun at full ammo
const cpI=o=>JSON.parse(JSON.stringify(o));
function kitSnap(t){if(t&&t.type==='token'&&t.inv&&t.inv.some(z=>z))t.kit=cpI(t.inv)}
function rearm(b){if(b.type!=='token')return;while(b.inv.length<6)b.inv.push(null);
 if(!b.kit&&!b.inv.some(z=>z)){const l=b.look,c=token(b.name,b.nat,b.unit,b.x,b.y,b.guard,l&&LOOKKIT[l]!==undefined?LOOKKIT[l]:undefined,l);b.kit=c.kit;remove(c)}
 for(const[i,q]of(b.kit||[]).entries()){if(!q)continue;const h=b.inv.find(z=>z&&z.k===q.k);if(!h){if(!b.inv[i])b.inv[i]=cpI(q);else addItem(b,cpI(q))}else if(!CAP[q.k]&&(q.n||1)>(h.n||1))h.n=q.n}
 for(const k of new Set(b.inv.filter(z=>z).map(z=>z.k)))refill(b,k);
 if(b.status==='captured'){b.si=-1;b.held=null}else if(!b.held){b.si=b.inv.findIndex(z=>z&&WP[z.k]&&(WP[z.k].gun||WP[z.k].melee||CAP[z.k]));b.held=b.si>=0?b.inv[b.si]:null}b.hc=null;lastHud=''}
{const g0=give;give=function(t,...a){const r=g0(t,...a);kitSnap(t);return r}}
{const a0=addItem;addItem=function(t,...a){const r=a0(t,...a);if(r)kitSnap(t);return r}}
function restore(b){b.px=tokPixels(b);mkSet(b);b.status='free';b.coreHit=false;b.stuck=false;b.vx=b.vy=0;for(const o of bodies.filter(o=>o.parent===b.id||(o.att&&o.att.id===b.id)))remove(o)}
// shock bomb: radius varies; one in ten only fizzes
function shockBurst(b){if(!bodies.includes(b))return;remove(b);const x=b.x,y=b.y,dud=Math.random()<.1,s=dud?.3+Math.random()*.2:.6+Math.random()*.7;sfx('crack');sfx('zap');BLU=true;arcBlast(x,y,dud?1:1+s*1.5);for(let i=0;i<(dud?6:16);i++)spark(x,y,i%2?plasC(Math.random()):rgb(240,226,255),0,0,dud?1.5:3,8+(Math.random()*10|0));BLU=false;if(!dud)explode(x,y,s);else for(const q of [...bodies])if(q.type==='token'&&Math.hypot(q.x-x,q.y-y)<10)cut(q,Math.round(x),Math.round(y),2,true,3)}
function detonate(b){remove(b);explode(b.x,b.y,b.kind==='bomb'?1.95:1.3)}
let alarm=false;function raiseAlarm(){if(alarm)return;alarm=true;setTimeout(()=>{for(const t of bodies)if(t.type==='token'&&t.status==='free'&&!t.held&&t.psi>=0&&t.inv&&t.inv[t.psi])selectSlot(t,t.psi)},250)}
function explode(x,y,s=1){raiseAlarm();hear(x,y,520*s,null,'boom');SND&&SND.at(s>1.5?'bomb':'grenade',x,y);flash(x,y,1,.62,.25,2.2*s,9*s,.9);shake=10*s;carve(x,y,6.5*s,3+(s>1?1:0),0,0);blastWear(x,y,s);crater(x,y,s);heatMark(x,y,15*s,.45*s);{const c=CATN[map[Math.round(y)>>4]&&map[Math.round(y)>>4][Math.round(x)>>4]];if(c&&c[0]==='Cloth'){emberPatch(x,y,16,9*s);dab(TF,x,y,.7*s,4)}}wreck(x,y,s);for(const c of bodies.filter(o=>o.kind==='crate'&&!o.hidden&&o.inv&&Math.hypot(o.x-x,o.y-y)<14*s))cShot(c,Math.round(c.x),Math.round(c.y),20,null);scorchRays(x,y,s*blastSoft(x,y));blastTethers(x,y,s);lockBlast(x,y,12*s);const R=30*s,F=26*s;
 for(const o of [...bodies]){if(!bodies.includes(o))continue;const dx=o.x-x,dy=o.y-y,d=Math.hypot(dx,dy);if(d>R)continue;
  if(o.kind==='grenade'||o.kind==='bomb'){if(!o.fuse)o.fuse=4+(Math.random()*8|0);continue}if(o.type==='slab'&&!o.fallen){blastSlab(o,x,y,s);continue}
  if(o.type==='token'||o.type==='part'){if(d<28*s){const k=1-d/(28*s);for(let i=0;i<Math.round(13*s*k)+3;i++){const tx=o.x+(Math.random()-.5)*12,ty=o.y+(Math.random()-.5)*12,dd=Math.hypot(tx-x,ty-y)||1,ux=(tx-x)/dd,uy=(ty-y)/dd,b0=Math.max(0,dd-12);pierce(o,x+ux*b0,y+uy*b0,ux,uy,8+20*k,.7)}if(d<10*s)cut(o,Math.round(o.x),Math.round(o.y),3+4*k,true,4);dab(FX.blood,o.x,o.y,.3+.6*k,3);settle(o)}}
  if(!bodies.includes(o)||o.type==='slab'||o.hidden)continue;const f=(F-Math.min(d,F))*.45/(o.mass||1);o.vx+=dx/(d||1)*f;o.vy+=dy/(d||1)*f;o.stuck=false;o.ghost=!!solidHits(o,0,0)}
 // steel barely crumbles: 40% of the grit on metal floors
 const mtl=(CATN[map[Math.round(y)>>4]&&map[Math.round(y)>>4][Math.round(x)>>4]]||[])[0]==='Metal'?.4:1;
 for(let i=0;i<70*s*mtl;i++)spark(x,y,Math.random()<.5?rgb(40,36,34):rgb(90,80,70),0,0,4*s,undefined,s>1.5?.35:.15);
 // bombs always leave fire; a grenade does 40% of the time, in a tighter patch
 if(s>1.5)for(let i=0;i<5*s;i++){const a=Math.random()*6.283,rr=4+Math.random()*12*s;dab(TF,x+Math.cos(a)*rr,y+Math.sin(a)*rr,1.4+Math.random()*.9,2+(Math.random()*2|0))}
 else if(Math.random()<.4)for(let i=0;i<4;i++){const a=Math.random()*6.283,rr=3+Math.random()*7;dab(TF,x+Math.cos(a)*rr,y+Math.sin(a)*rr,1.2+Math.random()*.7,2)}
 if(s>1.5){dab(SF,x,y,3,11);dab(SF,x+6,y-5,1.6,8)}else dab(SF,x,y,1.6,7);scorch(x,y,16*s*blastSoft(x,y),s>1.5?.3:.13);
 if(s>1){embers(x,y,70);for(let i=0;i<60*mtl;i++){const a=Math.random()*6.283,rr=Math.random()*12,X=Math.round(x+Math.cos(a)*rr),Y=Math.round(y+Math.sin(a)*rr);if(X>=0&&Y>=0&&X<W&&Y<H)spark(x,y,mul(sol[Y*W+X]?scol[Y*W+X]:floor[Y*W+X],.8),0,0,6,undefined,s>1.5?.35:.15)}
  if(s>1.5){for(let i=0;i<7;i++){const a=Math.random()*6.283,rr=6+Math.random()*16;dab(SF,x+Math.cos(a)*rr,y+Math.sin(a)*rr,2,7)}dab(SS,x,y,2.6,14);room(x,y,.12)}
  // grenade: a thin ring of powder mist that clears in about 7 s
  else for(let i=0;i<12;i++){const a=i/12*6.283+Math.random()*.4,rr=10+Math.random()*8;dab(GM,x+Math.cos(a)*rr,y+Math.sin(a)*rr,1.1+Math.random()*.5,4+(Math.random()*2|0))}}}
// hollow: the blast scours the middle, leaving the char darkest in a ring (size as a share of the radius)
function scorch(x,y,R,hollow=0){const r=R/2,cx=x/2,cy=y/2,sd=Math.random()*99;for(let j=-Math.ceil(r);j<=r;j++)for(let i=-Math.ceil(r);i<=r;i++){const X=Math.floor(cx+i),Y=Math.floor(cy+j);if(X<0||Y<0||X>=BW||Y>=BH)continue;
  const d=Math.hypot(i,j),k=Math.floor((Math.atan2(j,i)+Math.PI)/6.2832*44),len=r*(.6+.4*hh(k,0,sd)),core=r*.3,t=Math.min(1,d/Math.max(1,len)),v=(.36*Math.pow(1-t*t*(3-2*t),1.2)+.56*Math.exp(-((d/core)**2)))*(hollow?1-.7*Math.exp(-((d/(r*hollow))**2)):1);if(v<=.02)continue;const q=Y*BW+X;BURN[q]=Math.min(.92,Math.max(BURN[q],v*(.85+.15*hh(X,Y,sd+1))));const h=Math.min(1,R/16)*Math.exp(-((d/(core*1.4))**2));if(h>.05)FH[q]=Math.max(FH[q],h)}fxDirty=true}
function embers(x,y,n,blue){for(let i=0;i<n&&parts.length<1500;i++){const a=Math.random()*6.283,s=1+Math.random()*5,c=blue&&Math.random()<.4?rgb(170,220,255):Math.random()<.5?rgb(255,214,120):rgb(255,140,50),e=120+(Math.random()*200|0);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,c,c0:c,em:e,em0:e})}}
function shatter(b){sfx('crash');for(let i=0;i<4;i++)dab(TF,b.x+(Math.random()-.5)*14,b.y+(Math.random()-.5)*14,2,4);dab(TF,b.x,b.y,2.6,6);dab(SF,b.x,b.y-4,1.6,9);
 for(let i=0;i<24;i++)spark(b.x,b.y,Math.random()<.5?C.clay:C.clayD,0,0,3);remove(b)}

// held weapons
const HOFF={pgun:7,sbomb:9,grenade:9,bomb:9,sspear:10,spear:10,sword:7,musket:8,blunder:7,pistol:6,crossbow:9,rod:8,shield:9};
const sideOf=b=>b.held&&b.held.k==='shield'?0:5*(b.side||1);
// the weapon sits to one side, so turn a little further for its line to pass through the target
const aimA=(b,x,y)=>{const dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy),sd=b.held?sideOf(b):0;return Math.atan2(dy,dx)-(sd&&d>Math.abs(sd)+1?Math.asin(sd/d):0)};
const RAISEC={};
function raiseCol(k){if(RAISEC[k]===undefined){const p=shape(k,0).filter(q=>q[2]);p.sort((a,b)=>a[0]-b[0]);RAISEC[k]=p.length?mix(p[p.length*.6|0][2],rgb(236,232,222),.3):rgb(150,150,150)}return RAISEC[k]}
function rustle(b,v){if(fogOn()&&b.fogH||tick-(b.rsT||-1e9)<30||mute||!gest)return;b.rsT=tick;SVOL=v;try{SFX.rustle()}catch(e){}SVOL=1}
// near a wall the weapon is first drawn back towards the body; only if that isn't enough is it raised
function pullFit(b,hx=0,hy=0){if(!b.held)return false;const p0=b.pull||0;for(let p=p0;p<=8;p++){b.pull=p;if(!heldBlocked(b,hx,hy))return true}b.pull=p0;return false}
function raise(b){if(b.raised||b.type!=='token')return;if(pullFit(b))return;b.pull=0;b.raised=true;b.rT=tick;b.hc=null;rustle(b,1)}
function heldPix(b){if(b.raised){const c=Math.cos(b.ang),s=Math.sin(b.ang),sd=sideOf(b)||5,X=Math.round(b.x+c*6-s*sd),Y=Math.round(b.y+s*6+c*sd),col=raiseCol(b.held.k);return[[X,Y,col,0],[X+1,Y,mul(col,.85),1],[X,Y+1,mul(col,.85),2],[X+1,Y+1,mul(col,.65),3]]}const a=b.ang,k=b.held.k,sd=sideOf(b),wd=Math.round((b.wind||0)*9+(b.cock>0?4*Math.sin(Math.PI*b.cock/14):0))+(b.pull||0);const fl=rodFill(b.held),ht=Math.round((b.held.heat||0)*48)/48;if(!b.hc||b.hc.a!==a||b.hc.k!==k||b.hc.sd!==sd||b.hc.wd!==wd||b.hc.fl!==fl||b.hc.ht!==ht){const o=HOFF[k]-wd,c=Math.cos(a),s=Math.sin(a),ox=Math.round(c*o-s*sd),oy=Math.round(s*o+c*sd);b.hc={a,k,sd,wd,fl,ht,px:shape(k,a,fl,ht).map((p,i)=>[p[0]+ox,p[1]+oy,b.held.spent?spentCol(p[2]):p[2],i])}}
 const bx=Math.round(b.x),by=Math.round(b.y),dm=b.held.dmg;return b.hc.px.filter(p=>!dm||!(dm[p[3]]>=7)).map(p=>[bx+p[0],by+p[1],dm&&dm[p[3]]?mul(p[2],1-dm[p[3]]*.06):p[2],p[3]])}
function tipOf(b){if(b.type==='weapon'){const c=Math.cos(b.ang),s=Math.sin(b.ang),f=WP[b.kind].tip;return[b.x+c*f,b.y+s*f]}const k=b.held.k,a=b.ang,c=Math.cos(a),s=Math.sin(a),f=HOFF[k]+WP[k].tip-(b.pull||0);const sd=sideOf(b);return[b.x+c*f-s*sd,b.y+s*f+c*sd]}
function shieldAt(o,pts){if(!o.held||o.held.k!=='shield')return false;const hp=heldPix(o);return pts.some(([X,Y])=>hp.some(q=>q[0]===X&&q[1]===Y))}
function melee(b){if(b.raised||!b.held||!WP[b.held.k].melee||b.status==='dead')return;const t=tipOf(b),pv=b.tp||t;b.tp=t;const mx=t[0]-pv[0],my=t[1]-pv[1],v=Math.hypot(mx,my);if(v<3.2)return;
 const k=b.held.k,c=Math.cos(b.ang),s=Math.sin(b.ang),along=Math.abs(mx*c+my*s)/v,blade=heldPix(b).filter(p=>(p[0]-b.x)*c+(p[1]-b.y)*s>(k==='spear'||k==='sspear'?14:8));
 for(const o of bodies){if(o===b||o.type==='weapon'||o.type==='slab'||o.status==='dead'||(b.nat&&o.nat===b.nat)||Math.abs(o.x-b.x)>48||Math.abs(o.y-b.y)>48)continue;if(o.cool&&o.cool>tick)continue;
  if(o.type==='token'&&shieldAt(o,blade.slice(-4))){o.cool=tick+10;const dm=o.held.dmg||(o.held.dmg={});const q=heldPix(o)[0];if(q)dm[q[3]]=(dm[q[3]]||0)+1;sfx('mhit');o.vx+=Math.cos(b.ang)*v*.08;o.vy+=Math.sin(b.ang)*v*.08;continue}
  const ox=Math.round(o.x),oy=Math.round(o.y),ov=blade.filter(p=>o.set.has(K(p[0]-ox,p[1]-oy)));if(!ov.length)continue;o.cool=tick+10;
  if(along>.7){const r=pierce(o,t[0],t[1],c,s,v*(k==='sword'?.8:1.1),1);if(r.blood){dab(FX.blood,r.x,r.y,.7,3);sfx('squish')}else sfx(k==='spear'?'wedge':'clink');o.vx+=c*v*.15/o.mass;o.vy+=s*v*.15/o.mass;
   if(r.stop&&(r.p[7]==='h'||r.p[7]==='k'||r.p[7]==='c')&&Math.random()<.3){const w=weapon(k,0,0,b.ang);w.x=r.x-c*WP[k].tip;w.y=r.y-s*WP[k].tip;w.att={id:o.id,dx:w.x-o.x,dy:w.y-o.y};w.stuck=true;wedgeIn(w);consume(b)}
   settle(o)}
  else{sfx('mhit');o.vx+=(mx/v)*.4/o.mass;o.vy+=(my/v)*.4/o.mass}}
 for(const[X,Y]of blade.slice(-3)){const m=matAt(X,Y);if(m&&Math.random()<(m===1?.08:m===2?.3:.04)){damagePixel(X,Y,1);sfx(m===3?'mhit':m===1?'crack':'thunk')}}}
const TIPA=plasC(Math.random()),TIPB=rgb(240,226,255),TIPC=rgb(150,90,220);
const spentCol=c=>c===TIPA?C.iron:c===TIPB?C.ironH:c===TIPC?mul(C.iron,.72):c;
function spend(b){b.spent=true;for(const p of b.px)p[2]=spentCol(p[2])}
let zaps=[];
const isVol=o=>o.kind==='grenade'||o.kind==='bomb';
function primeNear(x,y,r){for(const o of bodies)if(isVol(o)&&!o.fuse&&Math.hypot(o.x-x,o.y-y)<r)o.fuse=4+(Math.random()*10|0)}
function arcWeld(x,y,rad,pw){const a=Math.random()*6.283,r=1+Math.random()*rad,X=Math.round(x+Math.cos(a)*r),Y=Math.round(y+Math.sin(a)*r);if(X<1||Y<1||X>=W-1||Y>=H-1)return;const j=Y*W+X;{const v=bodyAt(X,Y,1,null,isVol);if(v){zaps.push({x0:x,y0:y,x1:X,y1:Y,l:3,b:BLU});detonate(v);return}}
 if(sol[j]){WH[j]=Math.min(1.1,WH[j]+.25);whOn=true;if(Math.random()<pw)damagePixel(X,Y,1)}
 else{const o=bodyAt(X,Y,0,null,q=>q.type!=='weapon'&&!q.fallen);const p=o&&o.set.get(K(X-Math.round(o.x),Y-Math.round(o.y)));if(!p||p[4]!==3)return;p[5]=Math.min(1.2,p[5]+.2);if(Math.random()<pw&&hitPix(o,X,Y,1)===2)settle(o)}
 zaps.push({x0:x,y0:y,x1:X,y1:Y,l:3,b:BLU});spark(X,Y,Math.random()<.5?plasC(Math.random()):rgb(240,226,255),0,0,1.4,6+(Math.random()*6|0));sfx('sizzle')}
function shieldBurst(o,b){const[x,y]=b.kind==='sspear'?spearTip(b):[b.x,b.y];sfx('sblast');sfx('zap');shake=Math.max(shake,7);
 for(const q of heldPix(o))for(let i=0;i<2;i++)spark(q[0],q[1],Math.random()<.5?plasC(Math.random()):C.iron,0,0,3.5,Math.random()<.5?14:undefined);
 o.held=null;o.hc=null;const s=Math.hypot(b.vx,b.vy)||1;o.vx+=b.vx/s*1.5;o.vy+=b.vy/s*1.5;cut(o,Math.round(x),Math.round(y),3.5,true,3);if(bodies.includes(o))for(const p of o.px)if(p[4]===3)p[5]=Math.min(1.2,p[5]+.6);arcHit(x,y);dab(SF,x,y,1,5);
 if(b.kind==='sspear'){b.vx*=.15;b.vy*=.15}else remove(b)}
function blastSlab(d,x,y,s){const R=16*s,bx=Math.round(d.x),by=Math.round(d.y);let md=1e9,hit=0;
 for(const p of [...d.px]){const X=bx+p[0],Y=by+p[1],dp=Math.hypot(X-x,Y-y);md=Math.min(md,dp);const pw=Math.round(14*(1-dp/R)*(.7+.6*Math.random()));if(pw>0&&hitPix(d,X,Y,pw)===2){hit++;if(Math.random()<.4)spark(X,Y,d.mat===2?C.wood:C.iron,x-X,y-Y,2.5)}}
 if(hit)settle(d);if(!bodies.includes(d)||d.fallen)return;if(md<10*s){for(const q of d.pair?[d,d.pair]:[d]){q.locked=false;if(!q.fallen&&q.ang===0&&q.tgt===0)q.tgt=openDir(q)}sfx('door')}}
function lockBlast(x,y,r){for(const d of bodies){if(d.type!=='slab'||!d.locked||d.fallen)continue;const Lq=swingPt(d,(d.len||16)-4.5,-((d.th||8)>>1)-.5,d.ang||0),lx=d.x+Lq[0],ly=d.y+Lq[1];if(Math.hypot(lx-x,ly-y)>r)continue;
 for(const q of d.pair?[d,d.pair]:[d]){q.locked=false;if(!q.fallen&&q.ang===0&&q.tgt===0)q.tgt=openDir(q)}for(let i=0;i<10;i++)spark(lx,ly,Math.random()<.5?rgb(214,176,70):rgb(255,226,140),0,0,2.6);sfx('door');sfx('mhit')}}
function arcBlast(x,y,big=1){flash(x,y,.62,.66,1,1.4*big,4+big,.82);carve(x,y,2.6*(1+(big-1)*.6),4,0,0);lockBlast(x,y,3*big);primeNear(x,y,7*big);arcHit(x,y);if(big>1){for(const q of [...bodies])if((q.type==='token'||q.type==='part')&&Math.hypot(q.x-x,q.y-y)<6+big*4)cut(q,Math.round(x),Math.round(y),2+big,true,3);embers(x,y,12*big,true)}dab(SF,x,y,.7*big,3+big);for(let i=0;i<10*big;i++)spark(x,y,Math.random()<.5?plasC(Math.random()):rgb(255,226,140),0,0,2.6,Math.random()<.5?10:undefined);sfx(big>1.2?'sblast':'pthud');shake=Math.max(shake,3)}
function spearTip(b){const c=Math.cos(b.ang),s=Math.sin(b.ang);return[b.x+c*11,b.y+s*11]}
function arcHit(x,y){for(const o of bodies){if(o.type==='weapon'||Math.abs(o.x-x)>14||Math.abs(o.y-y)>14)continue;const ox=Math.round(o.x),oy=Math.round(o.y);for(const p of o.px)if(p[4]===3&&Math.hypot(ox+p[0]-x,oy+p[1]-y)<4)p[5]=Math.min(1.2,p[5]+.7)}
 for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){const X=Math.round(x)+i,Y=Math.round(y)+j;if(X<0||Y<0||X>=W||Y>=H)continue;const jj=Y*W+X;if(sol[jj]===1&&Math.hypot(i,j)<3.5){WH[jj]=Math.min(1.1,WH[jj]+.5);whOn=true}}
 for(let i=0;i<8;i++)spark(x,y,Math.random()<.5?plasC(Math.random()):rgb(240,220,255),0,0,2,8+(Math.random()*8|0));sfx('zap')}
function shockBlast(b){if(b.snd){b.snd.stop();b.snd=null}const[x,y]=spearTip(b),o=b.att&&byId(b.att.id);flash(x,y,.62,.66,1,2,7,.88);sfx('sblast');shake=Math.max(shake,6);carve(x,y,4,8,0,0);lockBlast(x,y,8);primeNear(x,y,16);
 if(o){const dx=o.x-x,dy=o.y-y,d=Math.hypot(dx,dy)||1;pierce(o,x,y,dx/d,dy/d,26,.6);dab(FX.blood,x,y,1,4);settle(o)}
 for(const q of [...bodies]){if(q===o||(q.type!=='token'&&q.type!=='part')||Math.hypot(q.x-x,q.y-y)>14)continue;cut(q,Math.round(x),Math.round(y),5,true,3)}
 arcHit(x,y);for(let i=0;i<44;i++)spark(x,y,[plasC(Math.random()),rgb(150,90,255),rgb(242,225,255)][i%3],0,0,4,8+(Math.random()*16|0));for(let i=0;i<10;i++)spark(x,y,rgb(150,154,162),0,0,3);embers(x,y,26,true);dab(SF,x,y,.9,4);
 for(const q of bodies){if(q===o||q===b||q.type==='weapon'||Math.hypot(q.x-x,q.y-y)>22)continue;if(q.px.some(p=>p[4]===3)){for(let i=0;i<6;i++)spark(x+(q.x-x)*i/6,y+(q.y-y)*i/6,rgb(200,230,255),0,0,.3,6);arcHit(q.x,q.y);break}}
 remove(b)}
function shockTick(){for(const b of [...bodies]){if(!bodies.includes(b))continue;
  if(b.kind==='sspear'){lancerCool(b);const[x,y]=spearTip(b);{const ho=b.att&&byId(b.att.id);b.glw=b.timer>0?1-b.timer/b.timer0:0}
   if(b.fizz>0){b.fizz--;if(Math.random()<b.fizz/300)spark(x,y,plasC(Math.random()),0,0,1.2,8)}
   else if(b.timer>0){b.timer--;const pr=1-b.timer/b.timer0,o=b.att&&byId(b.att.id);if(Math.random()<.4)arcWeld(x,y,5,.03+pr*.06);if(Math.random()<.2+pr*.6)spark(x,y,Math.random()<.5?plasC(Math.random()):rgb(255,255,255),0,0,1+pr*2,8);
    for(const q of o?[o]:bodies.filter(q=>q.type==='slab'&&Math.hypot(q.x-x,q.y-y)<24)){const qx=Math.round(q.x),qy=Math.round(q.y);for(const p of q.px)if(p[4]===3&&Math.hypot(qx+p[0]-x,qy+p[1]-y)<3+pr*4)p[5]=Math.min(1.2,p[5]+.012)}
    if(b.timer===0)shockBlast(b)}
   else if(!b.spent&&!b.att&&!b.stuck&&tick%12===0&&Math.random()<.6)spark(x,y,Math.random()<.5?TIPA:TIPB,0,0,.8,6)}
  if(b.type==='token'&&b.held&&b.held.k==='sspear'&&!b.held.spent&&b.status==='free'&&Math.random()<.3){const t=tipOf(b);arcWeld(t[0],t[1],3,.015)}
  if(b.type==='token'&&b.held&&b.held.k==='sspear'&&!b.held.spent&&tick%24===0&&Math.random()<.5){const t=tipOf(b);spark(t[0],t[1],plasC(Math.random()),0,0,.8,6)}}}
function give(t,k,am,rs){if(!t.inv)t.inv=[];while(t.inv.length<6)t.inv.push(null);if(refill(t,k)){sfx('reload');return}const it={k,n:fullN(t,k),ammo:CAP[k]||undefined,res:CAP[k]?fullRes(t,k):undefined};while(t.inv.length<6)t.inv.push(null);let i=slotFor(t,k);if(i<0)i=SEC.has(k)&&slotOK(t,1)?1:CAP[k]||WP[k].melee?0:GREN.has(k)?2:k==='bomb'?3:4;t.inv[i]=it;if(k==='pistol')evenRes(t,k);t.si=i;t.held=it;t.hc=null;sfx('flick')}
function dropHeld(t){const w=weapon(t.held.k,t.x+Math.cos(t.ang)*14,t.y+Math.sin(t.ang)*14,t.ang);w.ghost=!!solidHits(w,0,0);w.noPick=tick+120;w.ammo=t.held.ammo;w.res=t.held.res;reshape(w,w.ang);if(t.held.spent)spend(w);consume(t)}

// physics
let shake=0;
const MCOST={1:6,2:1.6,3:7};
// how much harder this wall pixel is than its family's usual, from the material table's hit points (worn pixels hold fewer)
const hpF=(X,Y)=>{const j=Y*W+X,m=X>=0&&Y>=0&&X<W&&Y<H&&sol[j];return m?Math.max(.3,shp[j]/([0,3,2,6][m]||3)):1};
function impact(b,h,axis){const s=Math.hypot(b.vx,b.vy),dx=b.vx/(s||1),dy=b.vy/(s||1);let cx=0,cy=0,mx=0;for(const[X,Y]of h){cx+=X;cy+=Y;mx=Math.max(mx,matAt(X,Y))}cx/=h.length;cy/=h.length;
 if(b.knock>0&&b.type!=='weapon'){pinTo(b,cx,cy,mx);return true}
 const bounce=k=>{if(axis){b.vy*=-k;b.vx*=.65}else{b.vx*=-k;b.vy*=.65}};
 if(b.type==='weapon'){const w=WP[b.kind];
  if(b.kind==='arc'){BLU=!!b.blue;arcBlast(cx,cy,b.big||1);if(b.pg){const l=Math.hypot(dx,dy)||1;for(let i=0;i<=12;i+=.5)damagePixel(Math.round(cx+dx/l*i),Math.round(cy+dy/l*i),3,dx/l,dy/l)}if(mx===3){sfx('boltmetal');metalSparks(cx,cy,dx,dy,true);heatMark(cx,cy,4+2*(b.big||1),.5+.15*(b.big||1))}BLU=false;remove(b);return true}if(w.rod)return rodWall(b,h,axis,mx,cx,cy,dx,dy);if(w.bullet){const cos=Math.abs(axis?dy:dx);
   const pl=b.kind==='pel';if((mx===1||mx===3)&&cos<.45){bounce(.6);hitFx(cx,cy,mx,dx,dy,pl);pl?sfxP(mx===3?'rico':'ricos',.4):sfx(mx===3?'rico':'ricos');return true}
   // stone and metal: a pistol ball bites one pixel, a musket ball two (one from far off); wood is cut through by energy
   let E=b.E||0;const lim=b.kind==='pball'?1:b.kind==='ball'?(Math.hypot(b.x-(b.sx??b.x),b.y-(b.sy??b.y))>160?1:2):1e9;for(const[X,Y]of h){const eff=(MCOST[mx]||6)*hpF(X,Y)/Math.max(cos,.35);const hard=matAt(X,Y)!==2;if(hard&&(b.dug||0)>=lim){E=0;break}if(E>=eff){E-=eff;if(hard)b.dug=(b.dug||0)+1;damagePixel(X,Y,99,dx,dy)}else{damagePixel(X,Y,1,dx,dy);E=0}}
   hitFx(cx,cy,mx,dx,dy,pl);if(b.kind==='arc')arcHit(cx,cy);b.E=E;if(E<=.01){remove(b)}return true}
  if(b.kind==='sspear'&&b.live){lancerBlast(b);return true}
  if(w.sharp){const cosn=Math.abs(axis?dy:dx);
   if(cosn<.4&&s>2){if(axis){b.vy*=-.35;b.vx*=.75}else{b.vx*=-.35;b.vy*=.75}b.tang=Math.atan2(b.vy,b.vx);damagePixel(h[0][0],h[0][1],1,dx,dy);if(mx===3)metalSparks(cx,cy,dx,dy,b.kind==='sspear'&&!b.spent);else hitFx(cx,cy,mx,dx,dy);sfx(mx===3?'rico':'crack');return true}
   if((s>3&&mx!==3)||s>(b.kind==='sspear'?8:16)){for(const[X,Y]of h)damagePixel(X,Y,1,dx,dy);const pen=Math.min(b.kind==='sspear'?15.6:9,s*.45*(mx===2?1.2:mx===3?.3:.35)*(b.kind==='sspear'?1.82:1))*Math.max(.4,cosn),ca=Math.cos(b.ang),sa=Math.sin(b.ang);if(b.kind==='sspear'){const tx=b.x+ca*w.tip,ty=b.y+sa*w.tip;for(let i=0;i<=pen+1;i+=.5)damagePixel(Math.round(tx+ca*i),Math.round(ty+sa*i),3,ca,sa)}b.x+=ca*pen;b.y+=sa*pen;b.vx=b.vy=0;b.stuck=true;wedgeIn(b);b.tang=undefined;
    if(mx===1){for(let i=0;i<Math.min(12,s*.6);i++)spark(cx,cy,scol[Math.round(cy)*W+Math.round(cx)]||rgb(140,136,128),dx,dy,2.4);sfx('crack')}else sfx(mx===3?'mhit':'thunk');return true}
   if(s>3)for(const[X,Y]of h)damagePixel(X,Y,1,dx,dy);bounce(.3);sfx(mx===3?'rico':'crack');return true}
  if(b.kind==='cannon'){carve(cx,cy,Math.min(10,s*.7),3,dx,dy);sfx('boom');shake=Math.max(shake,5);if(s<3.5){bounce(.2);return true}b.vx*=.55;b.vy*=.55;return true}
  if(b.kind==='pot'){shatter(b);return true}if(b.kind==='sbomb'){shockBurst(b);return true}
  if(s>1.5)sfx('mhit');bounce(.4);return true}
 if(s>2.5){carve(cx,cy,Math.min(5,s*.3),1,dx,dy);cut(b,Math.round(cx-dx),Math.round(cy-dy),Math.min(5,s*.3),true);sfx('thunk');if(!bodies.includes(b))return true;
  if(s>9&&mx!==3){const pen=Math.min(5,s*.3);b.x+=dx*pen;b.y+=dy*pen;b.vx=b.vy=0;b.stuck=true;return true}bounce(.35);return true}
 if(axis)b.vy=0;else b.vx=0;return true}
// what flies off a hit, by material (1 stone, 2 wood, 3 metal)
function hitParts(x,y,m,dx,dy,k=.55){if(m===3)sparkBurst(x,y,dx,dy,k)
 else if(m===2){for(let i=0;i<5;i++)spark(x,y,Math.random()<.5?C.wood:C.woodH,-dx*2,-dy*2,1.8)}
 else{dab(SF,x-dx*2,y-dy*2,.6,2);for(let i=0;i<4;i++)spark(x,y,rgb(150,146,138),-dx*2,-dy*2,1.6)}}
function hitFx(x,y,m,dx,dy,pel){const S=k=>pel?sfxP(k):sfx(k);hitParts(x,y,m,dx,dy,pel?.25:.55);S(m===3?'mhit':m===4?'rustle':m===2?'woodhit':'stonehit')}
const FALL={ball:[120,300,.6],pball:[50,170,.45],pel:[24,140,.2]};
function fall(b){const F=FALL[b.kind];if(!F||b.sx===undefined)return 1;const d=Math.hypot(b.x-b.sx,b.y-b.sy);if(b.kind==='pel'&&d<26)return 1.8;return d<=F[0]?1:Math.max(F[2],1-(1-F[2])*(d-F[0])/(F[1]-F[0]))}
// rods
const HOTD=150;
const rodHot=b=>b.hot&&(b.dist||0)<(b.hotd||HOTD)&&!b.stuck;
function rodPx(b,a){b.ang=a;b.px=shape('rodp',a,b.salvo?2:1);mkSet(b);for(const p of b.px)p[5]=(b.glw||0)*1.2}
function rodHeat(b){b.glw=b.hot?Math.min(1,Math.max(0,1.3-(b.dist||0)/(b.hotd||HOTD))):0;for(const p of b.px)p[5]=b.glw*1.2}
const HUM=new Map();
function hum(b,k,h){if(mute||!gest)return;const a=au(),t=a.currentTime;let n=HUM.get(b);
 if(!n){const o=a.createOscillator(),o2=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();o.type='sawtooth';o2.type='sine';f.type='lowpass';f.Q.value=.7;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g).connect(MS);const w=a.createGain();w.gain.value=.3;g.connect(w).connect(RV);o.start();o2.start();n={o,o2,f,g,k};HUM.set(b,n)}
 n.seen=tick;const pg=k==='pgun',lo=k==='rod'?48:pg?66:82,hi=k==='rod'?150:pg?112:250,p=Math.min(h,1.1),wob=h>1?Math.sin(tick*.9)*(h-1)*40:0;
 n.o.frequency.setTargetAtTime(lo+(hi-lo)*p*p+wob,t,.08);n.o2.frequency.setTargetAtTime((lo+(hi-lo)*p*p)*2.01,t,.08);n.f.frequency.setTargetAtTime(pg?260+p*900:220+p*p*2200,t,pg?.2:.1);n.g.gain.setTargetAtTime(pg?.008+.03*p:.015+.075*p,t,pg?.2:.12)}
function humEnd(){for(const[b,n]of HUM)if(n.seen!==tick){const t=au().currentTime;n.g.gain.setTargetAtTime(0,t,.06);n.o.stop(t+.4);n.o2.stop(t+.4);HUM.delete(b)}}
function heatTick(){const ch=charge?new Set(armed()):null;
 for(const b of [...bodies]){const gw=b.type==='weapon'&&sel.has(b);if(!gw&&(b.type!=='token'||!b.held)||!bodies.includes(b))continue;const h=slot(b),k=h.k;if(k!=='rod'&&k!=='pgun'&&k!=='sspear')continue;if(b.burst){if(--b.burst.t<=0){b.burst.n--;b.burst.t=7;b.inB=1;fire(b,b.burst.x,b.burst.y);b.inB=0;if(b.burst&&b.burst.n<=0)b.burst=null}continue}if(k==='pgun'){h.heat=0;if(ch&&ch.has(b)&&(gw||b.status==='free')&&!h.vent&&(h.ammo??CAP[k])>0)hum(b,k,Math.min(1,(performance.now()-charge.t)/charge.need));continue}
  const on=ch&&ch.has(b)&&(gw||b.status==='free')&&(k==='sspear'||(h.ammo??CAP[k])>0);
  if(!on){if(h.heat>0)h.heat=Math.max(0,h.heat-1/240);continue}
  const t=tipOf(b);if(!gw&&!(b.unit==='guard'||b.unit==='shock'||b.unit==='cmd')){h.heat=0;continue}
  h.heat=(h.heat||0)+1/210;
  if(h.heat>1&&(Math.random()<(h.heat-1)*.035||h.heat>1.4)){overcharge(b);continue}
  if(Math.random()<h.heat*.25)spark(t[0],t[1],k==='rod'?(h.heat>.95?rgb(255,250,236):rgb(255,170,70)):(Math.random()<.5?plasC(Math.random()):rgb(240,226,255)),0,0,.6+h.heat,6);
  hum(b,k,h.heat);if(h.heat>1)shake=Math.max(shake,(h.heat-1)*6)}humEnd()}
function overcharge(b){if(b.type==='weapon'){const t=tipOf(b);if(sel.has(b))charge=null;arcBlast(t[0],t[1],2.5);if(b.kind==='rod')rodBurst(b.x,b.y);remove(b);return}const h=b.held,t=tipOf(b),c=Math.cos(b.ang),s=Math.sin(b.ang),sd=sideOf(b),gx=b.x+c*6-s*sd,gy=b.y+s*6+c*sd;
 if(h.k==='pgun'){h.heat=0;h.ammo=0;b.hc=null;arcBlast(t[0],t[1],2.5);cut(b,Math.round(gx),Math.round(gy),3,true,3);settle(b);return}
 if(h.k==='sspear'){h.heat=0;b.hc=null;if(sel.has(b))charge=null;arcBlast(t[0],t[1],2.5);lancerDebris(t[0],t[1],3);consume(b);cut(b,Math.round(gx),Math.round(gy),3,true,3);settle(b);return}
 flash(gx,gy,1,.6,.3,3,8,.86);embers(gx,gy,60);for(let i=0;i<50;i++)spark(gx,gy,i<10?rgb(255,250,236):Math.random()<.5?rgb(255,200,90):rgb(255,120,40),0,0,4,8+(Math.random()*16|0));
 emberPatch(gx,gy,18,12);scorch(gx,gy,16);dab(SS,gx,gy,3,8);sfx('crash');sfx('boom');shake=Math.max(shake,12);
 for(let i=0;i<(h.ammo||0);i++){const r=weapon('rodp',gx+(Math.random()-.5)*16,gy+(Math.random()-.5)*16,Math.random()*6.283);r.stuck=true;r.glw=1;for(const p of r.px)p[5]=1.2}
 for(let i=0;i<4;i++)cut(b,Math.round(gx+(Math.random()-.5)*5),Math.round(gy+(Math.random()-.5)*5),3.5,true,3);ignite(b,Math.atan2(gy-b.y,gx-b.x),.8,2.5);b.burn=Math.max(b.burn||0,.8);b.vx-=c*3;b.vy-=s*3;
 consume(b);b.hc=null;if(bodies.includes(b))settle(b)}
function rodTick(){heatTick();for(const b of bodies){if(b.kind==='rodp'){if(b.stuck){if(b.glw>0){b.glw=Math.max(0,b.glw-.0012-b.glw*.004);for(const p of b.px)p[5]=b.glw*1.2;if(Math.random()<b.glw*.3){const X=b.x>>1,Y=b.y>>1;if(X>=0&&Y>=0&&X<BW&&Y<BH){ST[Y*BW+X]+=.8;fxDirty=true}}}}else{{const f=Math.max(.3,1-Math.max(0,(b.dist||0)-90)/360);b.E*=f/(b.fl||1);b.fl=f}rodHeat(b);if(b.glw>.05&&b.lx!==undefined){const L=Math.hypot(b.x-b.lx,b.y-b.ly);for(let i=0;i<=L;i++){const X=(b.lx+(b.x-b.lx)*i/(L||1))/2|0,Y=(b.ly+(b.y-b.ly)*i/(L||1))/2|0;if(X<0||Y<0||X>=BW||Y>=BH)continue;const q=Y*BW+X;BURN[q]=Math.min(.75,Math.max(BURN[q],.55*b.glw))}for(let i=0;i<=L;i+=6){const k=Math.max(0,1-((b.dist||0)-L+i)/(HOTD*1.2));if(k>.05)dab(SS,b.lx+(b.x-b.lx)*i/(L||1),b.ly+(b.y-b.ly)*i/(L||1),.4+1.6*k,Math.max(1,Math.round(1+3*k)))}fxDirty=true}b.lx=b.x;b.ly=b.y;if(b.glw>.3&&Math.random()<.6)spark(b.x-b.vx*.3,b.y-b.vy*.3,Math.random()<.5?rgb(255,200,110):rgb(255,140,50),0,0,.5,4)}}
 if(b.knock>0)b.knock--;if(b.pinned){if(!b.stuck)b.pinned=false;else if(b.status!=='dead'&&--b.pinT<=0)unpin(b)}}}
function rodWall(b,h,axis,mx,cx,cy,dx,dy){const cos=Math.abs(axis?dy:dx);
 if(rodHot(b)&&b.E>0){if(!b.lw||Math.hypot(cx-b.lw[0],cy-b.lw[1])>4){emberPatch(cx-dx*6,cy-dy*6,8,6);debris(cx-dx*2,cy-dy*2,scol[Math.round(cy)*W+Math.round(cx)]||rgb(130,126,118),6,-dx,-dy);scorch(cx-dx*2,cy-dy*2,6);dab(SS,cx-dx*6,cy-dy*6,3,8);dab(ST,cx-dx*4,cy-dy*4,1.6,4)}b.lw=[cx,cy];if(b.wb===undefined)b.wb=(16+Math.round(16*(.2+Math.random()*.2)))*(b.salvo?2:1);
  let hc=0;for(const[X,Y]of h){const m=matAt(X,Y);hc+=(m===3?1.4:m===2?.6:1)*hpF(X,Y)}if((b.wb-=hc/h.length)<0){emberPatch(cx-dx*6,cy-dy*6,12,8);dab(SS,cx-dx*5,cy-dy*5,3.2,9);dab(ST,cx-dx*3,cy-dy*3,2,5);b.hot=0;b.vx=b.vy=0;b.stuck=true;b.x+=dx*2;b.y+=dy*2;for(let i=0;i<8;i++)spark(cx,cy,Math.random()<.5?rgb(255,226,150):rgb(255,140,50),-dx*2,-dy*2,2,8+(Math.random()*8|0));sfx('sizzle');sfx('crack');return true}
  for(const[X,Y]of h)for(const[i,j]of[[0,0],[-dy,dx]]){const x=Math.round(X+i),y=Math.round(Y+j);damagePixel(x,y,99,dx,dy);for(let v=-1;v<=1;v++)for(let u=-1;u<=1;u++){const q=(y+v)*W+x+u;if(x+u>0&&y+v>0&&x+u<W&&y+v<H&&sol[q]){WH[q]=Math.min(1.1,WH[q]+.4);whOn=true}}}
  if(mx===3)heatMark(cx,cy,b.salvo?7:5,b.salvo?.85:.65);b.E-=mx===3?.6:.3;if(Math.random()<.5)spark(cx,cy,Math.random()<.5?rgb(255,226,150):rgb(255,140,50),-dx*1.5,-dy*1.5,1.8,8+(Math.random()*8|0));if(Math.random()<.2)sfx('sizzle');return true}
 if((mx===1||mx===3)&&cos<.4){if(axis){b.vy*=-.8;b.vx*=.9}else{b.vx*=-.8;b.vy*=.9}b.x-=dx*2;b.y-=dy*2;rodPx(b,Math.atan2(b.vy,b.vx));b.E*=.75;sfx(mx===3?'rico':'ricos');dab(SF,cx,cy,1.4,4);for(let i=0;i<8;i++)spark(cx,cy,Math.random()<.5?rgb(255,226,140):rgb(255,170,70),-dx*2,-dy*2,2.2,6+(Math.random()*8|0));sfx('rico');return true}
 for(const[X,Y]of h){const eff=(mx===3?4.5:mx===2?.6:2.5)*hpF(X,Y)/Math.max(cos,.4);if(b.E>=eff){b.E-=eff;damagePixel(X,Y,99,dx,dy)}else{damagePixel(X,Y,2,dx,dy);b.E=0}}
 if(mx===3){const sl=slabG[Math.round(cy)*W+Math.round(cx)]&&byId(slabG[Math.round(cy)*W+Math.round(cx)]);if(sl)heatAt(sl,cx,cy,3,.8);if(Math.random()<.3)emberPatch(cx-dx*5,cy-dy*5,7,5);metalSparks(cx,cy,dx,dy,false);if(!b.mchk){b.mchk=1;if(Math.random()<.1){rodBurst(cx-dx*2,cy-dy*2);remove(b);return true}}}
 hitFx(cx,cy,mx,dx,dy);if(!b.lw||Math.hypot(cx-b.lw[0],cy-b.lw[1])>4){debris(cx-dx*2,cy-dy*2,mx===3?rgb(120,124,132):mx===2?C.wood:scol[Math.round(cy)*W+Math.round(cx)]||rgb(130,126,118),mx===3?6:16,-dx,-dy);dab(SF,cx-dx*4,cy-dy*4,mx===3?1.4:2.6,mx===3?4:6);if(mx!==3)for(let i=0;i<6;i++)spark(cx,cy,scol[Math.round(cy)*W+Math.round(cx)]||rgb(150,146,138),-dx*2,-dy*2,1.8,8+(Math.random()*8|0))}b.lw=[cx,cy];if(b.E<=.01){b.vx=b.vy=0;b.stuck=true;b.x+=dx*2;b.y+=dy*2;for(let i=0;i<6;i++)spark(cx,cy,mx===3?rgb(255,220,140):scol[Math.round(cy)*W+Math.round(cx)]||rgb(150,146,138),-dx*2,-dy*2,2.2);sfx(mx===3?'mhit':'crack');shake=Math.max(shake,2)}return true}
function rodBody(b,o,s){const dx=b.vx/(s||1),dy=b.vy/(s||1),u=UNITS[o.unit]||UNITS.civ;const rx0=b.x-o.x,ry0=b.y-o.y,t0=rx0*dx+ry0*dy,d=Math.min(8.3,Math.abs(rx0*dy-ry0*dx)),cos=Math.sqrt(1-(d/8.3)**2),ex=rx0-t0*dx-dx*8.3*cos,ey=ry0-t0*dy-dy*8.3*cos,nx=ex/8.3,ny=ey/8.3,hot=rodHot(b);
 const held=hot&&o.unit==='shock'&&Math.random()<.2,met=metalAt(o,b.x,b.y,dx,dy);
 if(hot&&!held){let n=0;for(const k of b.salvo?[-2,-1,0,1,2]:[-1,0,1]){const r=pierce(o,b.x-dy*k,b.y+dx*k,dx,dy,999,1);n+=r.removed}
  if(n){scorch(b.x,b.y,3);dab(SS,b.x,b.y,2.4,7);ignite(o,Math.atan2(-dy,-dx),.5,2);o.burn=Math.max(o.burn||0,.6);emberPatch(b.x+dx*12,b.y+dy*12,6,6);dab(FX.blood,b.x+dx*8,b.y+dy*8,.4+n*.02,3);for(let i=0;i<6;i++)spark(b.x,b.y,Math.random()<.5?rgb(255,220,140):rgb(255,140,50),dx*2,dy*2,1.8,8);sfx('sizzle');sfx('squish')}
  o.vx+=dx*.8/o.mass;o.vy+=dy*.8/o.mass;settle(o);b.vx*=.94;b.vy*=.94;return false}
 if(!hot&&met&&cos<.6){const d=dx*nx+dy*ny,rx=dx-2*d*nx,ry=dy-2*d*ny,v=s*.8;ripArmour(o,Math.round(ex),Math.round(ey),rx,ry,b.E);debris(o.x+ex,o.y+ey,u.ac,6,rx,ry);if(!u.leather&&Math.random()<.3){ignite(o,Math.atan2(ey,ex),.4,1.5);o.burn=Math.max(o.burn||0,.4)}heatAt(o,o.x+ex,o.y+ey,3,.6);settle(o);b.vx=rx*v;b.vy=ry*v;b.E*=.7;b.x+=nx*2;b.y+=ny*2;rodPx(b,Math.atan2(ry,rx));
  metalSparks(b.x,b.y,-rx,-ry,false);sfx('rico');o.vx+=dx*.6/o.mass;o.vy+=dy*.6/o.mass;return true}
 if(!hot&&met){heatAt(o,o.x+ex,o.y+ey,3,.7);debris(o.x+ex,o.y+ey,u.ac,8,-dx,-dy);if(Math.random()<.3){ignite(o,Math.atan2(ey,ex),.4,1.5);o.burn=Math.max(o.burn||0,.4)}metalSparks(o.x+ex,o.y+ey,dx,dy,false);if(!b.mchk){b.mchk=1;if(Math.random()<.1){rodBurst(o.x+ex,o.y+ey);o.vx+=dx*1.2/o.mass;o.vy+=dy*1.2/o.mass;remove(b);return true}}}
 const plate=!hot&&met,caught=plate&&Math.random()>=.07;
 const r=pierce(o,b.x,b.y,dx,dy,caught?10:held?28:plate?60:b.E,1,caught?4:9);if(caught&&Math.random()<.4)ripArmour(o,Math.round(ex),Math.round(ey),-dx,-dy,b.E*.5);
 if(r.blood){dab(FX.blood,r.x,r.y,.7+r.removed*.05,3);sfx('squish')}else sfx('mhit');dab(SF,r.x-dx*4,r.y-dy*4,.7,3);for(let i=0;i<4;i++)spark(r.x,r.y,rgb(255,200,120),-dx*2,-dy*2,1.6,5);
 const kb=(b.kb||4)*(b.fl||1)/o.mass*(r.stop?caught?.55:1:.4);if(caught)for(let i=0;i<8;i++)spark(r.x,r.y,Math.random()<.5?rgb(255,226,140):rgb(255,170,70),-dx*2,-dy*2,2,6+(Math.random()*8|0));o.vx+=dx*kb;o.vy+=dy*kb;o.stuck=false;shake=Math.max(shake,3);
 if(!r.stop){b.E=r.E;b.vx*=.7;b.vy*=.7;settle(o);return false}
 b.x=r.x-dx*2;b.y=r.y-dy*2;b.vx=b.vy=0;b.stuck=true;b.dir=[dx,dy];b.att={id:o.id,dx:b.x-o.x,dy:b.y-o.y};o.knock=22;o.rod=b.id;settle(o);return true}
function pinTo(b,cx,cy){const sp=Math.hypot(b.vx,b.vy);b.vx=b.vy=0;b.knock=0;crush(b,cx,cy,sp);const r=b.rod&&byId(b.rod);if(!r||!r.att||r.att.id!==b.id)return;
 b.stuck=true;b.pinned=true;b.pinT=240;r.att.dx+=r.dir[0]*4;r.att.dy+=r.dir[1]*4;dab(SF,cx,cy,.5,2);for(let i=0;i<6;i++)spark(cx,cy,rgb(150,146,138),0,0,1.6);sfx('thunk');sfx('mhit');shake=Math.max(shake,3)}
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
// one spark burst for every metal hit, sized by k (pellet .25, ball .55, Bolter 1): white-hot core, hot sparks, embers that cool to black grit, and a scorch for big ones
function sparkBurst(x,y,dx,dy,k=1,blue){const K=k*(.7+Math.random()*.6),q=Math.sqrt(K);flash(x,y,blue?.6:1,.82,blue?1:.5,1.2*q,3,.7*Math.min(1,q+.2));
 for(let i=0,n=Math.round(34*K);i<n&&parts.length<1500;i++){const c=i<n*.2?rgb(255,255,255):blue&&i%2?rgb(200,150,255):Math.random()<.5?rgb(255,226,140):rgb(255,170,70);spark(x,y,c,-dx*2.6*q,-dy*2.6*q,3.4*q*(.5+Math.random()),6+(Math.random()*16*q|0))}
 embers(x,y,Math.max(1,Math.round(10*K)),blue);if(K>.45&&Math.random()<K*.4)emberPatch(x-dx*5,y-dy*5,4+3*K,3+2*K)}
function metalSparks(x,y,dx,dy,blue){sparkBurst(x,y,dx,dy,1,blue)}
// Lancer: a plasma-heated iron tip. Charge drives penetration, burst and shove; plate is its target, flesh barely
function lancerDebris(x,y,n){for(let i=0;i<n;i++){const r=weapon('rodp',x+(Math.random()-.5)*14,y+(Math.random()-.5)*14,Math.random()*6.283);r.stuck=true;r.glw=.6;for(const p of r.px)p[5]=.7}}
function lancerHit(b,o){const v=Math.hypot(b.vx,b.vy)||1,dx=b.vx/v,dy=b.vy/v,[x,y]=spearTip(b),c=b.chg||0,ox=Math.round(o.x),oy=Math.round(o.y);b.live=false;raiseAlarm();
 let plate=false;for(let i=-2;i<10;i++){const p=o.set.get(K(Math.round(x+dx*i)-ox,Math.round(y+dy*i)-oy));if(p){plate=p[4]===3;break}}
 if(plate){arcBlast(x,y,1);pierce(o,x,y,dx,dy,60+60*c,1,1.5+2*c);cut(o,Math.round(x),Math.round(y),1.5+1.5*c,true,9);const k=(1.2+3*c)/(o.mass||1);o.vx+=dx*k;o.vy+=dy*k;sfx('wedge');sfx('sizzle');shake=Math.max(shake,4+c*5)}
 else{const r=pierce(o,x,y,dx,dy,8+8*c,1);if(r&&r.blood){dab(FX.blood,r.x,r.y,.35,2);sfx('squish')}const k=(.5+c)/(o.mass||1);o.vx+=dx*k;o.vy+=dy*k;sfx('hiss');sfx('sizzle')}
 b.heat=.6+.4*c;b.plate=plate;b.vx=b.vy=0;b.stuck=true;b.att={id:o.id,dx:b.x-o.x,dy:b.y-o.y};wedgeIn(b);settle(o)}
// a wedged or dropped Lancer cools: its tip glows, burns the plate round it, then goes dark for good
function lancerCool(b){if(!(b.heat>0))return;b.heat=Math.max(0,b.heat-1/170);const c=Math.cos(b.ang),s=Math.sin(b.ang);for(const p of b.px)p[5]=p[0]*c+p[1]*s>6?b.heat*1.25:0;
 const o=b.att&&byId(b.att.id);if(o&&o.type==='token'){const[x,y]=spearTip(b),ox=Math.round(o.x),oy=Math.round(o.y),R=b.plate?3.5:2;for(const p of o.px){if(Math.hypot(ox+p[0]-x,oy+p[1]-y)>R)continue;p[5]=Math.max(p[5],b.heat*(p[4]===3?1.3:.9));if(b.heat>.3&&Math.random()<(p[4]===3?.03:.008)*b.heat)hitPix(o,ox+p[0],oy+p[1],2)}if(tick%9===0)spark(x,y,Math.random()<.5?rgb(255,170,70):rgb(255,240,200),0,0,.8,6)}
 if(b.heat<=0){for(const p of b.px)p[5]=0;spend(b)}}
function lancerBlast(b){const[x,y]=spearTip(b),n=1+(b.chg||0)*3;b.live=false;arcBlast(x,y,1+n*.5);metalSparks(x,y,0,0,true);for(const q of [...bodies])if((q.type==='token'||q.type==='part')&&bodies.includes(q)&&Math.hypot(q.x-x,q.y-y)<12+n*3)cut(q,Math.round(x),Math.round(y),2+n,true,3);shake=Math.max(shake,5+n);lancerDebris(x,y,2);remove(b)}
function rodBurst(x,y){flash(x,y,1,.75,.35,2.4,6,.82);embers(x,y,36);for(let i=0;i<30;i++)spark(x,y,Math.random()<.3?rgb(255,246,210):Math.random()<.6?rgb(255,200,90):rgb(255,130,40),0,0,3.2,8+(Math.random()*14|0));
 scorch(x,y,12);emberPatch(x,y,16,10);dab(SF,x,y,2.2,5);sfx('crash');sfx('crack');shake=Math.max(shake,4)}
function heatAt(o,X,Y,r,h){const ox=Math.round(o.x),oy=Math.round(o.y);for(const p of o.px)if(p[4]===3&&Math.hypot(ox+p[0]-X,oy+p[1]-Y)<=r)p[5]=Math.min(1.2,p[5]+h*(1-Math.hypot(ox+p[0]-X,oy+p[1]-Y)/(r+1)))}
function ripArmour(o,ex,ey,rx,ry,E){const R=2.4+Math.random()*1.2+E/40,cp=o.px.filter(p=>(p[7]==='a'||p[7]==='f')&&Math.hypot(p[0]-ex,p[1]-ey)<=R);if(cp.length<2)return;
 for(const p of cp)o.set.delete(K(p[0],p[1]));const mx=Math.round(cp.reduce((s,p)=>s+p[0],0)/cp.length),my=Math.round(cp.reduce((s,p)=>s+p[1],0)/cp.length);
 const f={id:uid++,type:'part',parent:o.id,unit:o.unit,nat:o.nat,status:'dead',x:o.x+mx,y:o.y+my,vx:rx*2.6+mx*.15,vy:ry*2.6+my*.15,mass:cp.length/200,px:cp.map(p=>{const z=p.slice();z[0]-=mx;z[1]-=my;z[5]=.5;return z})};mkSet(f);bodies.push(f);
 o.px=o.px.filter(p=>o.set.has(K(p[0],p[1])));mkSet(o);sfx('mhit')}
function unpin(b){b.pinned=false;b.stuck=false;const r=b.rod&&byId(b.rod);if(r&&r.att&&r.att.id===b.id){r.att=null;r.stuck=true}sfx('mhit')}
function recoilHurt(b,c,s){const u=UNITS[b.unit];if(b.type!=='token'||!(u.arm===0||u.leather))return;const sd=Math.sign(sideOf(b))||1,px=-s*sd,py=c*sd;
 const cand=b.px.filter(p=>(p[7]==='c'||p[7]==='a')&&Math.hypot(p[0],p[1])>6.3&&p[0]*px+p[1]*py>3);for(let i=0;i<(u.arm?6:9)&&cand.length;i++){const p=cand.splice((Math.random()*cand.length)|0,1)[0];b.set.delete(K(p[0],p[1]))}
 dab(FX.blood,b.x+px*7,b.y+py*7,.35,2);sfx('squish');settle(b)}
const metalAt=(o,x,y,dx,dy)=>{const ox=Math.round(o.x),oy=Math.round(o.y);for(let i=-6;i<12;i++){const p=o.set.get(K(Math.round(x+dx*i)-ox,Math.round(y+dy*i)-oy));if(p)return p[4]===3}return false};
function pierce(o,x,y,dx,dy,E,ap,maxD){const ox=Math.round(o.x),oy=Math.round(o.y);let ex=null,ey=0;
 for(let i=0;i<24&&o.set.has(K(Math.round(x)-ox,Math.round(y)-oy));i++){x-=dx;y-=dy}
 let last=null,inside=false,removed=0,blood=false,miss=0;
 for(let i=0;i<60;i++){x+=dx*.5;y+=dy*.5;const k=K(Math.round(x)-ox,Math.round(y)-oy);if(k===last)continue;last=k;const p=o.set.get(k);
  if(!p){if(inside&&++miss>3)break;continue}if(ex===null){ex=x;ey=y}if(maxD&&Math.hypot(x-ex,y-ey)>maxD)return{stop:true,p,x,y,blood,removed};inside=true;miss=0;const ra=o.type!=='token'||p[7]==='f'||p[10]===undefined?p[7]:p[4]===3?'a':p[7]==='a'?'s':p[7],hp=ra==='s'?Math.min(p[3],p[10]==='l'?2:1):p[3],f=ra==='f'?(frontOf(o,p)?ap:1/p[3]):ra==='a'?ap*(o.unit==='shock'&&p[8]*Math.cos(o.ang||0)+p[9]*Math.sin(o.ang||0)<-2?.35:1):1,cost=hp*f*((ra==='a'||ra==='f')&&f>=ap*.9?1/Math.max(.45,Math.abs(dx*p[8]+dy*p[9])/(Math.hypot(p[8],p[9])||1)):1);
  if(E>=cost){E-=cost;o.set.delete(k);removed++;if(p[7]==='h'||p[7]==='k')o.coreHit=true;if(ra!=='a')blood=true}
  else{p[3]-=Math.max(1,Math.floor(E/f));if(p[3]<=0){o.set.delete(k);removed++}if(ra!=='a')blood=true;if(p[3]<=0&&(p[7]==='h'||p[7]==='k'))o.coreHit=true;return{stop:true,p,x,y,blood,removed}}}
 return{stop:false,E,x,y,blood,removed}}
const aimedAt=(b,o)=>b.ax!==undefined&&Math.hypot(o.x-b.ax,o.y-b.ay)<12;
function hitBodies(b,s){const bx=Math.round(b.x),by=Math.round(b.y);
 for(const o of bodies){if(o===b||(o.type==='weapon'&&o.kind!=='crate')||o.type==='slab'||o.status==='dead'||o.id===b.from||inDrag(o))continue;if(Math.abs(o.x-b.x)>30||Math.abs(o.y-b.y)>30)continue;if(b.vol&&o.type==='token'&&(o.nat||'-')===b.vol&&Math.hypot(o.x-b.sx,o.y-b.sy)<b.vr&&!aimedAt(b,o))continue;
  const ox=Math.round(o.x),oy=Math.round(o.y);const ov=[];for(const p of b.px){if(o.set.has(K(bx+p[0]-ox,by+p[1]-oy)))ov.push([bx+p[0],by+p[1]])}if(!ov.length)continue;
  if(b.type==='weapon'){const w=WP[b.kind];
   if(w.rod&&o.type==='token'){if(b.hit&&b.hit.has(o.id))continue;(b.hit||(b.hit=new Set())).add(o.id);if(rodBody(b,o,s))return true;continue}
   if(b.kind==='sspear'&&b.live){lancerHit(b,o);return true}
   if(w.bullet||w.sharp){if(b.hit&&b.hit.has(o.id))continue;(b.hit||(b.hit=new Set())).add(o.id);
    const dx=b.vx/(s||1),dy=b.vy/(s||1),tip=w.tip||0;let E=w.bullet?b.E:(b.kind==='spear'||b.kind==='sspear'?s*.5:b.kind==='sword'?s*.4:(b.E||s*.22));const fo=w.bullet?fall(b):1;E*=fo*(b.ep||1);
    const pm=o.kind==='crate'?(o.metal?3:2):o.type==='token'?(metalAt(o,b.x+dx*tip,b.y+dy*tip,dx,dy)?3:0):o.mat||0;
    const r=pierce(o,b.x+dx*tip,b.y+dy*tip,dx,dy,E,b.ap||w.ap||1);if(pm===3&&r.blood&&b.kind!=='arc')b.kind==='pel'?sfxP('mhit',.4):sfx('mhit');if((pm===3||pm&&!r.blood)&&b.kind!=='arc')hitParts(r.x,r.y,pm,dx,dy,b.kind==='pel'?.25:b.kind==='pball'?.4:.55);
    if(o.kind==='crate'){sfx(o.metal?'ping':'thunk');cShot(o,Math.round(r.x),Math.round(r.y),1.5,b)}else if(r.blood){dab(FX.blood,r.x,r.y,.6+r.removed*.05,3);b.kind==='pel'?sfxP('squish'):sfx('squish')}else if(w.bullet&&b.kind!=='arc'){if(o.type==='token'&&pm!==3)(b.kind==='pel'?sfxP('thunk',.4):sfx('thunk'));else if(o.type==='token'){const pl=b.kind==='pel';pl?sfxP('mhit',.4):sfx('mhit')}else{const k=o.mat===3?'mhit':o.mat===1?'stonehit':'woodhit';b.kind==='pel'?sfxP(k):sfx(k)}}else sfx(b.kind==='spear'||b.kind==='sspear'?'wedge':'clink');
    o.vx+=dx*.5*b.mass/o.mass;o.vy+=dy*.5*b.mass/o.mass;
    if(b.kind==='arc'){BLU=!!b.blue;if(!r.blood){sfx('boltmetal');metalSparks(r.x,r.y,dx,dy,true)}arcHit(r.x,r.y);cut(o,Math.round(r.x),Math.round(r.y),2*(b.big?1+b.big*.5:1),true,3);if(b.big)arcBlast(r.x,r.y,b.big);BLU=false}
    if(r.stop){if(w.bullet){if(o.set.has(K(r.p[0],r.p[1])))r.p[7]=r.p[7]==='a'?'a':'o';remove(b)}else{b.att={id:o.id,dx:b.x-o.x,dy:b.y-o.y};b.vx=b.vy=0;b.stuck=true;wedgeIn(b);}settle(o);return true}
    if(w.bullet)b.E=r.E/fo;b.vx*=.8;b.vy*=.8;settle(o);continue}
   if(b.kind==='cannon'){let n=0;for(const[X,Y]of ov)if(hitPix(o,X,Y,3)===2)n++;if(n){dab(FX.blood,ov[0][0],ov[0][1],.5+n*.03,3);sfx('squish');settle(o)}if(bodies.includes(o)){o.vx+=b.vx*.2;o.vy+=b.vy*.2}continue}
   if(b.kind==='pot'){shatter(b);return true}if(b.kind==='sbomb'){shockBurst(b);return true}
   if(b.kind==='grenade'||b.kind==='bomb'){b.att={id:o.id,dx:b.x-o.x,dy:b.y-o.y};b.vx=b.vy=0;b.stuck=true;sfx('thunk');return true}
   b.vx*=-.3;b.vy*=-.3;sfx('mhit');return true}
  const m1=b.mass||1,m2=o.mass||1,f=m1/(m1+m2);o.vx+=b.vx*f*1.3;o.vy+=b.vy*f*1.3;o.stuck=false;b.vx*=.3;b.vy*=.3;sfx('thunk');
  if(s>6){const[X,Y]=ov[0];cut(o,X,Y,1.5,true);if(bodies.includes(b))cut(b,X,Y,1.2,true)}return true}
 return false}
function step(b){if(b.type==='slab'||b.hidden||inDrag(b))return;
 if(b.att){const o=byId(b.att.id);if(!o){b.att=null;b.stuck=false}else{const A=b.att;if(o.type==='token'){if(A.la===undefined){const c=Math.cos(-(o.ang||0)),s=Math.sin(-(o.ang||0));A.lx=A.dx*c-A.dy*s;A.ly=A.dx*s+A.dy*c;A.la=b.ang-(o.ang||0)}const c=Math.cos(o.ang||0),s=Math.sin(o.ang||0);A.dx=A.lx*c-A.ly*s;A.dy=A.lx*s+A.ly*c;const na=(o.ang||0)+A.la;if(Math.abs(Math.atan2(Math.sin(na-b.ang),Math.cos(na-b.ang)))>.04)reshape(b,na)}b.x=o.x+A.dx;b.y=o.y+A.dy;return}}
 if(b.glide){const dx=b.glide[0]-b.x,dy=b.glide[1]-b.y,d=Math.hypot(dx,dy);if(d<3){b.x=b.glide[0];b.y=b.glide[1];b.glide=null;b.ghost=false}else{b.x+=dx/d*3;b.y+=dy/d*3;b.mv=6}return}
 if(b.stuck)return;
 let s=Math.hypot(b.vx,b.vy);if(s<.06){b.vx=b.vy=0;if(b.kind==='pot'&&b.thrown)shatter(b);if(b.kind==='sbomb'&&b.thrown)shockBurst(b);if(b.kind==='sspear'&&b.live&&!b.stuck&&!b.att){b.live=false;b.heat=Math.max(b.heat||0,.3+.4*(b.chg||0))}return}
 b.mv=6;const n=Math.ceil(s);
 for(let i=0;i<n;i++){for(let axis=0;axis<2;axis++){const d=(axis?b.vy:b.vx)/n;if(!d)continue;const ox=axis?0:d,oy=axis?d:0;
   const h=b.ghost?null:solidHits(b,ox,oy);
   if(!h){b.x+=ox;b.y+=oy;if(b.type==='weapon'&&WP[b.kind].bullet&&b.vx*b.vx+b.vy*b.vy>16&&lowHit(b))return;if((b.range||b.thrown)&&hitVolatile(b))return;if(hitBodies(b,s)){b.x-=ox;b.y-=oy}if(!bodies.includes(b))return;continue}
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
 for(const o of bodies){if(o.type!=='token'||!o.held||o.held.k!=='shield'||o.id===b.from||Math.abs(o.x-b.x)>40||Math.abs(o.y-b.y)>40||(b.vol&&(o.nat||'-')===b.vol&&Math.hypot(o.x-b.sx,o.y-b.sy)<b.vr&&!aimedAt(b,o)))continue;
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
function fxTick(){let act=false;if(GM.length!==NB)GM=new Float32Array(NB);
 for(let i=0;i<NB;i++){if(TF[i]>0){act=true;if(TF[i]>.3)BURN[i]=Math.min(.75,BURN[i]+.0016);TF[i]=Math.max(0,TF[i]-.0015)}if(SF[i]>0){act=true;SF[i]=Math.max(0,SF[i]-.012)}if(SS[i]>0){act=true;SS[i]=Math.max(0,SS[i]-.00035)}if(GM[i]>0){act=true;GM[i]=Math.max(0,GM[i]-.0018)}if(ST[i]>0){act=true;ST[i]=Math.max(0,ST[i]*.996-.0015)}if(FH[i]>0){act=true;FH[i]=FH[i]>.01?FH[i]*.997-.0001:0}}
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
function drawBody(b,lift){if(b.hidden||unseen(b))return;if(b.kind==='arc'){const s=Math.hypot(b.vx,b.vy)||1,wd=b.big?1:0;(b.blue?q=>q.map(swb):q=>q)((h=>[rgb(246,242,252),plasC(h),mul(plasC(h+.2),.85),mul(plasC(h+.4),.7),mul(plasC(h+.6),.55)])(b.hue||0)).slice(0,b.big?5:4).forEach((c,i)=>{for(let o=-wd;o<=wd;o++){const X=Math.round(b.x-b.vx/s*i-b.vy/s*o),Y=Math.round(b.y-b.vy/s*i+b.vx/s*o);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=o?mul(c,.8):c}});return}if(WP[b.kind]&&WP[b.kind].bullet&&!WP[b.kind].rod)return;const bx=Math.round(b.x),by=Math.round(b.y),st=b.status,dyn=b.type!=='weapon',hl=sel.has(b)?1.25:b===hover?1.12:1;if(b.type==='token'&&b.unit==='shock'&&b.nat==='Goldbank'&&!lookOf(b))drawCape(b,lift);
 const sh=lift?[3,4]:b.stuck||b.fallen||st==='dead'?null:[1,2];
 const spr=b.type==='token'&&!!sprG(lookOf(b)),vis=spr?new Set(b.px.filter(p=>sprAt(b,p)).map(p=>K(p[0],p[1]))):null;
 if(sh)for(const p of b.px){const X=bx+p[0]+sh[0],Y=by+p[1]+sh[1];if(spr&&!vis.has(K(p[0],p[1])))continue;if(X<0||Y<0||X>=W||Y>=H||(spr?vis:b.set).has(K(p[0]+sh[0],p[1]+sh[1]))||sol[Y*W+X])continue;out[Y*W+X]=mul(out[Y*W+X],.62)}
 for(const p of b.px){const X=bx+p[0],Y=by+p[1];if(X<0||Y<0||X>=W||Y>=H||b.type==='slab'&&sol[Y*W+X])continue;let c=pcol(b,p);if(c===0)continue;if(b.crouch)c=mul(c,.62);
  if(spr?sprAt(b,p)[1]:p[7]==='m'||p[7]==='a'||b.type==='slab'&&(b.mat===3||b.gold))c=shine(c,X,Y,spr?45:UNITS[b.unit]&&UNITS[b.unit].dark?30:70);
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
const SCT={Stone:[.17,.16,.155],Wood:[.22,.13,.07],Cloth:[.4,.25,.14],tar:[.46,.36,.24]},TEMPER=[[0,[1,1,1]],[.14,[1.02,.94,.78]],[.3,[.82,.66,.56]],[.46,[.56,.56,.7]],[.66,[.32,.33,.39]],[.9,[.15,.15,.17]]],tintC={};
function scorchT(X,Y){const k=map[Y>>4]&&map[Y>>4][X>>4];if(k in tintC)return tintC[k];const c=CATN[k];return tintC[k]=!c?SCT.Stone:c[0]==='Metal'?(c[1]==='brass'||c[1]==='gold'?SCT.tar:'temper'):SCT[c[0]]||SCT.Stone}
function scorchC(c,a,X,Y){a=Math.min(1,a);const t=scorchT(X,Y);if(t===SCT.Wood)a=1-Math.pow(1-a,2.2);else if(t===SCT.Stone)a=1-Math.pow(1-a,1.5);// soot reads further out on wood and stone, as the heat colours do on metal
 let f;if(t==='temper'){let i=1;while(i<TEMPER.length-1&&a>TEMPER[i][0])i++;const[p0,f0]=TEMPER[i-1],[p1,f1]=TEMPER[i],u=Math.min(1,Math.max(0,(a-p0)/(p1-p0)));f=f0.map((v,k)=>v+(f1[k]-v)*u)}else f=t.map(v=>1-a*(1-v));
 return rgb(cl((c&255)*f[0]),cl((c>>8&255)*f[1]),cl((c>>16&255)*f[2]))}
// fresh blast heat glows and cools: metal brightest, wood embers flicker, stone a dull red
function glowC(c,h,X,Y){const k=map[Y>>4]&&map[Y>>4][X>>4],e=CATN[k]?CATN[k][0]:'Stone',g=e==='Metal'?1:e==='Wood'?.8*(.8+.4*hh(X>>1,Y>>1,tick>>3)):e==='Cloth'?.75:.5;return heatCol(h*g,c)}
function render(){
 if(solDirty&&tick-solT>=3){rebuildSH();solDirty=false;solT=tick}
 sheenFrame();const hlC=new Map();for(const[c0,f]of[[hoverC,1.12],[openCrate,1.25]])if(c0&&c0.cells)for(const[a,b]of c0.cells)hlC.set(b*CW+a,f);for(let Y=0,j=0;Y<H;Y++){const bro=(Y>>1)*BW;for(let X=0;X<W;X++,j++){if(sol[j])continue;let c=floor[j];if(OBJ[j]){c=OBJC[j];if(hlC.size){const f=hlC.get((Y>>4)*CW+(X>>4));if(f)c=mul(c,f)}}else if(j>2*W&&OBJ[j-2*W-1])c=mul(c,.6);if(EDGM[j])c=mul(c,EDF[EDGM[j]]);if(SHN[j])c=shine(c,X,Y,SHN[j]);const bu=burnAt(X,Y);if(bu>.02)c=scorchC(c,bu*(.92+.16*hh(X,Y,13)),X,Y);const fh=FH[bro+(X>>1)];if(fh>.03)c=glowC(c,fh,X,Y);const k=SH[j];if(k)c=mul(c,k===1?.66:.82);out[j]=c}}
 if(fxDirty||(fxActive&&tick%3===0)||(tick%7===0&&FX.fire.some(v=>v>.3)))buildFx();
 for(let q=0;q<NB;q++){const j0=((q/BW|0)*2)*W+(q%BW)*2;if(!fxLow[j0])continue;const f=fxLow[j0];for(const j of [j0,j0+1,j0+W,j0+W+1])if(!sol[j])out[j]=f}
 if(moveSel)for(const ci of moveSel.cells){const cx=ci%CW,cy=ci/CW|0;for(let y=1;y<T-1;y++)for(let x=1;x<T-1;x++){const j=(cy*T+y)*W+cx*T+x;out[j]=(x>=7&&x<=8&&y>=7&&y<=8)?mix(out[j],rgb(255,255,255),.6):mul(out[j],.68)}}
 for(const b of bodies)if((b.stuck&&!b.att)||b.fallen)drawBody(b);
 {const tp=TOPS||OUTD;for(let Y=0,j=0;Y<H;Y++)for(let X=0;X<W;X++,j++){if(!sol[j])continue;let c=scol[j];const k=SH[j];if(k===1)c=mul(c,NOD[j]?.72:.5);else if(k===2)c=mul(c,NOD[j]?1.05:1.1);if(!tp){const d=DS[j],d0=DS0?DS0[j]:d;let f=DF[Math.min(9,d0)];if(d<d0)f=Math.max(f,d===1?.6:d===2?.22:0);c=mul(c,f)}if(SHN[j]&&(DS[j]<4||tp))c=shine(c,X,Y,SHN[j]);if(EDGM[j])c=mul(c,EDF[EDGM[j]]);if(whOn&&WH[j]>.01)c=mix(c,glow(WH[j]),Math.min(.9,WH[j]*1.4));out[j]=c}}
 for(const b of bodies)if(b.type==='slab'&&!b.fallen&&!inDrag(b))drawBody(b);
 const hot=p=>p.life!==undefined||(p.em!==undefined&&p.em/p.em0>.2),rest=p=>!hot(p)&&Math.hypot(p.vx||0,p.vy||0)<.3;
 for(const p of parts){if(!rest(p))continue;const X=Math.round(p.x),Y=Math.round(p.y);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=p.c}
 drawTethers();selRings();for(const b of bodies)if(!b.stuck&&b.type!=='slab'&&!inDrag(b)&&b.status==='dead')drawBody(b);{const fly=b=>b.type!=='token'&&b.type!=='part'&&(b.thrown&&Math.hypot(b.vx,b.vy)>.6||b.fuse);for(const b of bodies)if(!b.stuck&&b.type!=='slab'&&b.type!=='token'&&!inDrag(b)&&b.status!=='dead'&&!fly(b))drawBody(b);for(const b of bodies)if(!b.stuck&&b.type==='token'&&!inDrag(b)&&b.status!=='dead')drawBody(b);for(const b of bodies)if(!b.stuck&&b.type!=='slab'&&b.type!=='token'&&!inDrag(b)&&b.status!=='dead'&&fly(b))drawBody(b)}
 for(const b of bodies)if(b.att)drawBody(b);
 drawStores();
 for(const b of bodies){if(!(b.burn>.04)||(b.type!=='token'&&b.type!=='part')||unseen(b))continue;const bx=Math.round(b.x),by=Math.round(b.y),B=Math.min(1.5,b.burn);
  for(const p of b.px){if(!inZone(b,p))continue;const r2=p[0]*p[0]+p[1]*p[1],X0=bx+p[0],Y0=by+p[1];const v=Math.sin(p[0]*.9+tick*.13+b.id)*Math.sin(p[1]*.8-tick*.11)+Math.sin((p[0]+p[1])*.5+tick*.07),f=v*.5+.5;
   if(f<1.15-B*.55)continue;if(X0>=0&&Y0>=0&&X0<W&&Y0<H){const j=Y0*W+X0;out[j]=mix(out[j],f>1.05?rgb(255,214,120):f>.9?rgb(250,152,46):f>.75?rgb(224,96,26):rgb(150,38,14),Math.min(.85,.35+B*.4))}
   if(r2<40||hh(p[0]+b.id,p[1],71)>B*.35)continue;const rr=Math.sqrt(r2),ux=p[0]/rr,uy=p[1]/rr,h=Math.round((1+B*2.2)*f);
   for(let k=1;k<=h;k++){const X=Math.round(X0+ux*k),Y=Math.round(Y0+uy*k);if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;out[j]=mix(out[j],k/h<.5?rgb(236,112,28):rgb(255,190,80),(1-k/(h+1))*.75)}}}
 for(const p of parts){if(hot(p)||rest(p))continue;const X=Math.round(p.x),Y=Math.round(p.y);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=p.c}
 for(const z of zaps){const n=Math.max(1,Math.ceil(Math.hypot(z.x1-z.x0,z.y1-z.y0)));for(let i=0;i<=n;i++){const X=Math.round(z.x0+(z.x1-z.x0)*i/n+(i&&i<n?(Math.random()-.5)*1.6:0)),Y=Math.round(z.y0+(z.y1-z.y0)*i/n+(i&&i<n?(Math.random()-.5)*1.6:0));if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=z.b?(i%2?rgb(150,200,255):rgb(232,244,255)):i%2?rgb(200,150,255):rgb(244,232,255)}}zaps=zaps.filter(z=>--z.l>0);
 if(drag)for(const b of drag.group)if(bodies.includes(b))drawBody(b,true);
 for(let q=0;q<NB;q++){const j0=((q/BW|0)*2)*W+(q%BW)*2;if(fxTop[j0]){const al=fxA[j0],f=fxTop[j0];for(const j of [j0,j0+1,j0+W,j0+W+1])out[j]=al>=255?f:mix(out[j],f,al/255);continue}const v=SV[q];if(v>.04){const a=Math.min(.42,v*.5);for(const j of [j0,j0+1,j0+W,j0+W+1])out[j]=mix(out[j],HAZE,a)}}
 for(const p of parts){if(!hot(p))continue;const X=Math.round(p.x),Y=Math.round(p.y);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=p.em!==undefined&&!p.vx&&Math.random()<.15?mul(p.c,1.25):p.c}
 if(hzOn)veil();
 if(slowMo)streaks();lightPass();if(fogOn())fogPass();if(DSV)sightPass();
 if(box){const x0=Math.round(Math.min(box.x0,box.x1)),x1=Math.round(Math.max(box.x0,box.x1)),y0=Math.round(Math.min(box.y0,box.y1)),y1=Math.round(Math.max(box.y0,box.y1)),c=rgb(242,239,230);
  for(let x=x0;x<=x1;x++)if(x%2===0){if(y0>=0&&y0<H)out[y0*W+x]=c;if(y1>=0&&y1<H)out[y1*W+x]=c}for(let y=y0;y<=y1;y++)if(y%2===0){if(x0>=0&&x0<W)out[y*W+x0]=c;if(x1>=0&&x1<W)out[y*W+x1]=c}}
 if(cellDrag&&moveSel){const k=(mouse.y/T|0)*CW+(mouse.x/T|0);if(moveSel.cells.has(k)){const cx=k%CW,cy=k/CW|0;for(let y=1;y<T-1;y++)for(let x=1;x<T-1;x++)if(x===1||y===1||x===T-2||y===T-2)out[(cy*T+y)*W+cx*T+x]=rgb(242,239,230)}}
 ordDraw();exitFade();
 {const ch=!panKey&&!pan&&mouse.in&&!drag&&armed().length>0;if(ch)crosshair();const into=drag&&drag.b.type==='weapon'&&(bodyAt(Math.round(mouse.x),Math.round(mouse.y),2,drag.b,o=>o.type==='token'&&o.status!=='dead')||PICK.has(drag.b.kind)&&!drag.b.fuse&&canStore(dropBox(),drag.b.kind))||SDR&&sdrOk();const cc=pan||drag||SDR?CUR[into?'in':'carry']:panKey?CUR.grab:ch?'none':hover||hoverC?CUR.grab:CUR.arrow;if(cv.style.cursor!==cc)cv.style.cursor=cc;}
 ctx.putImageData(img,0,0);
 for(const e of document.querySelectorAll('#sm .xlab')){const x=(EXITS[curMap]||[])[+e.dataset.i];if(x){e.style.left=x.lx*S+'px';e.style.top=x.ly*S+'px'}}
 for(const b of bodies){if(b.mv>0)b.mv--;if(b.lab){b.lab.style.left=(Math.round(b.x)+.5)*S+'px';b.lab.style.top=(Math.round(b.y)+10)*S+'px';b.lab.style.color=natLabel(b);b.lab.style.zIndex=b.status==='dead'?0:1;{const vc=VIS[(Math.round(b.y)>>1)*BW+(Math.round(b.x)>>1)],hid=fogOn()&&(teamOf(b)!==aiMe&&(b.fogH||!vc)||b.status==='dead'&&!vc);b.lab.style.display=hid?'none':''}dbar(b,S);sayTick(b,S);{let c=b.lab.querySelector('.ld');if(b.leader&&b.status!=='dead'){if(!c){c=document.createElement('span');c.className='ld';c.innerHTML=CROWNI;b.lab.prepend(c)}}else if(c)c.remove()}}}
 stage.style.transform=shake>0?`translate(${(Math.random()-.5)*shake}px,${(Math.random()-.5)*shake}px)`:'';if(shake>0)shake--}
function veil(){const G=24,gw=(W/G|0)+3,gh=(H/G|0)+3,ox=tick/500,fx0=Math.floor(ox),fr=ox-fx0,g=new Float32Array(gw*gh);for(let y=0;y<gh;y++)for(let x=0;x<gw;x++)g[y*gw+x]=hh(x+fx0,y,77);
 for(let Y=0;Y<H;Y++){const gy=Y/G,y0=gy|0,ty=gy-y0;for(let X=0;X<W;X++){const h=HZ[(Y>>1)*BW+(X>>1)];if(h<.003)continue;const gx=X/G+fr,x0=gx|0,tx=gx-x0;
  const n=(g[y0*gw+x0]*(1-tx)+g[y0*gw+x0+1]*tx)*(1-ty)+(g[(y0+1)*gw+x0]*(1-tx)+g[(y0+1)*gw+x0+1]*tx)*ty;const j=Y*W+X;out[j]=mix(out[j],VEIL,Math.min(.4,h)*(.6+.8*n))}}}
const cmdMode=b=>b.type==='token'&&!b.direct,canOrder=b=>b.type==='token'&&b.status==='free'&&!b.direct&&(!aiOn||teamOf(b)===aiMe);
const armed=()=>EM?[]:[...sel].filter(b=>srcInfo(b)&&!cmdMode(b));
function crosshair(){const ar=armed();if(!ar.length)return;const b0=ar[0],inf=srcInfo(b0),X=Math.round(mouse.x),Y=Math.round(mouse.y),d=Math.hypot(mouse.x-b0.x,mouse.y-b0.y);
 const dry=ar.every(o=>slot(o)&&CAP[slot(o).k]&&!(slot(o).ammo>0)),g=Math.max(2,Math.round(d*inf.spread*inf.sp*1.6)),col=dry?rgb(84,82,78):d>inf.range?rgb(150,150,150):inf.heat&&slot(b0)&&(slot(b0).heat||0)>.15?heatCol(slot(b0).heat,rgb(250,250,246)):rgb(250,250,246);
 const put=(x,y,c)=>{if(x>=0&&y>=0&&x<W&&y<H)out[y*W+x]=c};
 const hot=inf.heat&&(slot(b0)||{}).heat||0,fr=charge?(inf.heat?Math.min(1,hot):Math.min(1,(performance.now()-charge.t)/charge.need)):0,shd=(x,y,on)=>{if(x>=0&&y>=0&&x<W&&y<H)out[y*W+x]=on?mix(out[y*W+x],rgb(255,255,255),.5):mul(out[y*W+x],.55)},dirs=inf.throw?[[1,-1],[1,1],[-1,1],[-1,-1]]:[[0,-1],[1,0],[0,1],[-1,0]],len=inf.throw?3:4;
 dirs.forEach(([ax,ay],ai)=>{for(let i=g;i<g+len;i++){const x=X+ax*i,y=Y+ay*i,seg=ai*4+Math.floor((i-g)*4/len);const on=(i-g+1)/len<=fr+.001&&fr>0;shd(x+1,y,on);shd(x,y+1,on);put(x,y,on?rgb(0,0,0):col)}});
 const c0=fr>0;shd(X+1,Y,c0);shd(X,Y+1,c0);put(X,Y,c0?rgb(0,0,0):col);if(dry)for(const[a,q]of[[0,0],[1,1],[-1,-1],[1,-1],[-1,1]])put(X+a,Y+q,rgb(224,83,63))}
// aiming
function srcInfo(b){if(!b||!bodies.includes(b))return null;const gnd=b.type==='weapon'&&!b.att&&!b.wedged&&!b.hidden&&WP[b.kind];
 if(b.type==='token'&&b.held&&b.status==='free'||gnd){const k=gnd?b.kind:b.held.k,w=WP[k],sp=gnd?1:UNITS[b.unit].sp;if(!w||!w.gun&&!w.melee&&!/^(grenade|bomb|sbomb)$/.test(k))return null;
  if(w.gun)return{kind:k,sp,hold:k==='rod'?1e9:w.hold,heat:k==='rod',spread:w.spread,range:w.range};
  if(k==='grenade'||k==='bomb'||k==='sbomb')return{kind:k,sp,throw:1,hold:400,spread:.05,range:k==='bomb'?60:140};if(w.melee)return{kind:k,sp,throw:1,hold:k==='sword'?450:k==='sspear'?1e9:650,heat:k==='sspear',spread:b.unit==='cmd'?.025:.04,range:(k==='sword'?110:240)*(b.unit==='cmd'?1.4:1)}}
 return null}
const gauss=()=>{const u=Math.random()||1e-9,v=Math.random();return Math.max(-2.2,Math.min(2.2,Math.sqrt(-2*Math.log(u))*Math.cos(6.283*v)))};
function fire(b,x,y,vol){const inf=srcInfo(b);if(!inf)return;if(b.neutral)b.neutral=false;if(b.type==='token'&&b.raised){b.raised=false;b.hc=null;if(heldBlocked(b,0,0)){b.raised=true;b.hc=null;return}}cmdFollow(b,x,y);boltShot=null;raiseAlarm();const H=slot(b);if(!inf.throw){const h=H;if(h.ammo===undefined)h.ammo=CAP[h.k]||0;if(h.ammo<=0){if(!reload(b)){sfx('dry');hear(b.x,b.y,50,b,'dry');if(b.type==='token')say(b,'Empty!',true)}return}h.ammo--}const tok=b.type==='token',a0=tok?aimA(b,x,y):Math.atan2(y-b.y,x-b.x);
 if(tok)turnTo(b,a0,true);else reshape(b,a0);
 const c=Math.cos(a0),s=Math.sin(a0),sd=tok?sideOf(b):0;
 if(inf.throw&&b.type==='weapon'){const k=b.kind,a=a0+gauss()*inf.spread,sp=k==='grenade'||k==='sbomb'?15:k==='bomb'?8:k==='sspear'?27:30;let v=sp;
  if(k==='sspear'){b.live=true;b.chg=Math.min(1,H.heat||0);H.heat=0}if((k==='grenade'||k==='bomb')&&!b.fuse){b.fuse=k==='bomb'?200:150;sfx('pin')}
  if(k==='grenade'||k==='bomb'||k==='sbomb'){const X=Math.round(x),Y=Math.round(y),wall=X<1||Y<1||X>=W-1||Y>=H-1||sol[Y*W+X]||slabG[Y*W+X];v=wall?sp*1.15:Math.min(sp,Math.hypot(x-b.x,y-b.y)*(1-WP[k].fr))}
  b.stuck=false;b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;b.thrown=true;b.noPick=tick+40;b.ghost=!!solidHits(b,0,0);b.vol='-';b.vr=vol?1e9:44;b.ax=x;b.ay=y;b.sx=b.x;b.sy=b.y;b.hit=null;if(k!=='bomb')reshape(b,a);sel.delete(b);sfx('whoosh');return}
 if(inf.throw){const k=b.held.k,f=HOFF[k],a=a0+gauss()*inf.spread*inf.sp,sp=(k==='grenade'||k==='sbomb'?15:k==='bomb'?8:k==='sspear'?27:30)*(THR[b.unit]||.7);
  const p=weapon(k,b.x+c*f-s*sd,b.y+s*f+c*sd,a);p.ammo=b.held.ammo;p.res=b.held.res;if(b.unit==='cmd'&&(k==='spear'||k==='sspear')){const c=Math.random()<.2;p.ap=c?.25:.8;p.ep=c?2.4:1.2}if(k==='sspear'){p.live=true;p.chg=Math.min(1,b.held.heat||0);b.held.heat=0}else if(b.held.spent)spend(p);if(k==='grenade'||k==='bomb'){p.fuse=k==='bomb'?200:150;sfx('pin')}let v=sp;if(k==='grenade'||k==='bomb'||k==='sbomb'){const X=Math.round(x),Y=Math.round(y),wall=X<1||Y<1||X>=W-1||Y>=H-1||sol[Y*W+X]||slabG[Y*W+X];v=wall?sp*1.15:Math.min(sp,Math.hypot(x-p.x,y-p.y)*(1-WP[k].fr))}p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.from=b.id;p.thrown=true;p.noPick=tick+40;p.ghost=!!solidHits(p,0,0);p.vol=b.nat||'-';p.vr=vol?1e9:44;p.ax=x;p.ay=y;p.sx=b.x;p.sy=b.y;consume(b);sfx('whoosh');if(!b.held&&(k==='sspear'||k==='spear')){const i=(b.inv||[]).findIndex(q=>q&&q.k===k);if(i>=0)setTimeout(()=>{if(!b.held&&b.status==='free')selectSlot(b,i)},350)}return}
 hear(b.x,b.y,{musket:340,blunder:340,pistol:280,pgun:300,rod:300}[inf.kind]||240,b,'shot');const w=WP[inf.kind],f=tok?HOFF[inf.kind]+w.len-(b.pull||0):w.len,mx=b.x+c*f-s*sd,my=b.y+s*f+c*sd;if(inf.kind==='sspear')flash(mx,my,.62,.66,1,1.6,4,.8);else if(w.smoke)flash(mx,my,1,.7,.35,inf.kind==='pistol'?1:1.5,3,.7);
 for(let i=0;i<(w.pellets||1);i++){const a=(w.proj==='rodp'?Math.atan2(y-my,x-mx):a0)+gauss()*(w.spread*inf.sp+(b.xs||0))+(w.pellets?(i-1.5)*.03+gauss()*.025:0);
  const p=weapon(w.proj,mx,my,a);p.low=tok&&!!b.crouch;p.vx=Math.cos(a)*w.speed;p.vy=Math.sin(a)*w.speed;p.from=b.id;p.range=w.range;p.thrown=true;p.E=w.E*(tok&&b.unit==='cmd'?inf.kind==='blunder'?1.35:1.15:1);if(w.proj==='rodp'){const ht=H?H.heat||0:0,n=ht>=.9?1+(H.ammo||0):1;if(n>1)H.ammo=0;p.lx=mx;p.ly=my;p.E=p.E*(.85+Math.random()*.3)*(n>1?n*1.1:1);p.hot=ht>=.45;p.salvo=n>1?n:0;p.hotd=HOTD*(n>1?1.6:.8+.4*Math.min(1,ht));p.kb=w.kb*(n>1?1+.4*n:1);rodPx(p,a);rodHeat(p);boltShot=p}
  p.hue=Math.random();if(inf.kind==='pgun'){p.pg=true;if(H&&(H.heat||0)>=.9){const n=Math.min(3,1+(H.ammo||0));H.ammo-=n-1;p.big=n;p.E*=n}if(H)H.heat=0}else if(w.proj==='arc'&&H){const h=H.heat||0;if(h>=.25){p.big=1+Math.min(1,h)*2;p.E*=p.big}H.heat=0}p.vol=b.nat||'-';p.vr=vol?1e9:44;p.ax=x;p.ay=y;p.sx=b.x;p.sy=b.y}
 if(inf.kind==='blunder'){for(let i=0,n=10+(Math.random()*9|0);i<n&&parts.length<1500;i++){const a=a0+(Math.random()-.5)*.8,v=2.5+Math.random()*6,col=Math.random()<.35?rgb(255,240,180):Math.random()<.5?rgb(255,200,90):rgb(255,140,50),e=Math.random()<.6?150+(Math.random()*180|0):0;parts.push(e?{x:mx,y:my,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c:col,c0:col,em:e,em0:e}:{x:mx,y:my,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c:col,life:6+(Math.random()*10|0)})}}
 if(WP[inf.kind].proj==='rodp'){const hotShot=boltShot&&boltShot.hot,salvo=boltShot&&boltShot.salvo;if(salvo&&H){H.heat=0}sfx('rodshot');if(salvo)sfx('crash');shake=Math.max(shake,salvo?9:5);plume(mx,my,a0,hotShot?.38:.5);if(hotShot){sfx('hiss');flash(mx,my,1,.6,.25,2,4,.75);for(let i=0;i<10;i++)spark(mx,my,Math.random()<.4?rgb(255,240,200):rgb(255,150,60),c*2,s*2,2.4,8)}else for(let i=0;i<5;i++)spark(mx,my,rgb(200,200,200),c*2,s*2,2,5);if(hotShot)recoilHurt(b,c,s)}
 else if(inf.kind==='pgun'){sfx('arcshot');if(bodies.some(q=>q.kind==='arc'&&q.big&&q.from===b.id)){sfx('sblast');shake=Math.max(shake,8);flash(mx,my,.62,.66,1,3,6,.85)}else flash(mx,my,.62,.66,1,1.4,4,.8);for(let i=0;i<8;i++)spark(mx,my,plasC(Math.random()),-c*2,-s*2,2.2,10);shake=Math.max(shake,4);if(H&&!b.inB){b.burst={n:2,t:7,x,y};setTimeout(()=>sfx('vent'),330)}}
 else if(inf.kind==='sspear'){sfx('arcshot');if(bodies.some(q=>q.kind==='arc'&&q.big&&q.from===b.id)){sfx('sblast');shake=Math.max(shake,8);flash(mx,my,.62,.66,1,3,6,.85)}dab(SF,mx,my,.9,3);for(let i=0;i<8;i++)spark(mx,my,plasC(Math.random()),-c*2,-s*2,2.2,10);shake=Math.max(shake,4)}
 else if(w.smoke){SND&&SND.at(inf.kind==='pistol'?'pistol':inf.kind==='musket'?'musket':'blunder',mx,my);plume(mx,my,a0,w.smoke);room(b.x,b.y,.035*w.smoke);shake=Math.max(shake,inf.kind==='pistol'?1:2)}else sfx('twang');
 if(tok){const u=UNITS[b.unit],k=w.rec*(1-u.arm*.22)*(w.proj==='rodp'&&(u.arm===0||u.leather)?1.9:1)*(boltShot&&boltShot.salvo?1.7:1);b.vx-=c*k;b.vy-=s*k;if(w.proj==='rodp'){if(boltShot&&boltShot.hot&&(u.arm===0||u.leather)&&Math.random()<.3){ignite(b,Math.atan2(my-b.y,mx-b.x),.6,2);b.burn=Math.max(b.burn||0,.35+Math.random()*.35);sfx('sizzle')}if((u.arm===0||u.leather)&&b.held){dropHeld(b);sfx('drop')}}}}
const offGun=b=>b.type==='token'&&b.held&&b.held.k==='pistol'&&b.inv?b.inv.find(z=>z&&z!==b.held&&z.k==='pistol')||null:null;
function withOff(b,f){const h=b.held,o=offGun(b);if(!o)return;b.held=o;b.side=-(b.side||1);try{f()}finally{b.held=h;b.side=-b.side;b.hc=null}}
function cmdFollow(b,x,y){if(b.bq||b.type!=='token'||!b.held)return;if(b.unit!=='cmd'){if(b.held.k==='pistol'&&offGun(b))b.bq=[{t:tick+4,x,y,off:1}];return}const k=b.held.k;
 if(k==='musket'&&b.held.ammo>1)b.bq=[{t:tick+7,x,y}];else if(k==='pistol'){b.bq=[{t:tick+6,x,y}];if(offGun(b))b.bq.push({t:tick+3,x,y,off:1},{t:tick+9,x,y,off:1})}}
function burstTick(b){if(!b.bq)return;const q=b.bq,now=q.filter(e=>tick>=e.t);if(!now.length)return;b.bq=q.filter(e=>tick<e.t);const run=()=>{for(const e of now){const h=e.off?offGun(b):b.held;if(!h||b.status!=='free'||!(h.ammo>0))continue;b.xs=.025;e.off?withOff(b,()=>fire(b,e.x,e.y)):fire(b,e.x,e.y);b.xs=0}};const keep=b.bq;b.bq=keep.length?keep:[];run();if(!b.bq.length)b.bq=null}
function offPix(b){const o=offGun(b);if(!o)return[];let r=[];const hc=b.hc;withOff(b,()=>{b.hc=b.hc2;r=heldPix(b);b.hc2=b.hc});b.hc=hc;return r}
function fireGroup(x,y){const ar=armed(),vol=ar.length>1;ar.forEach(b=>setTimeout(()=>fire(b,x,y,vol),vol?Math.random()*260:0))}
// input
let boltShot=null;
let cellDrag=null,spinning=false;
let mouse={x:0,y:0,in:false};
function makeWay(o,sx,sy,b){if(o.direct||o.mw||(o.mwT||0)>tick)return;const L=Math.hypot(sx,sy)||1,px=-sy/L,py=sx/L,k=(o.x-b.x)*px+(o.y-b.y)*py>=0?1:-1;o.mw={dx:px*k,dy:py*k,n:10};o.mwT=tick+40}
function tokHit(b,sx,sy){if(b.type!=='token'&&b.type!=='part')return null;const bx=Math.round(b.x+sx),by=Math.round(b.y+sy);
 for(const o of bodies){if(o===b||(o.type!=='token'&&o.type!=='part'&&o.kind!=='crate')||o.att||o.status==='dead'||Math.abs(o.x-b.x)>18||Math.abs(o.y-b.y)>18||inDrag(o))continue;const ox=Math.round(o.x),oy=Math.round(o.y);for(const p of rimOf(b))if(o.set.has(K(bx+p[0]-ox,by+p[1]-oy)))return o}return null}
// a token's outer ring is enough for body-to-body contact
const rimOf=b=>b.type!=='token'?b.px:b.rimN===b.px.length?b.rim:(b.rimN=b.px.length,b.rim=b.px.filter(p=>p[0]*p[0]+p[1]*p[1]>30));
function heldBlocked(b,sx,sy){if(!b.held||b.raised)return false;for(const p of heldPix(b)){const X=p[0]+sx,Y=p[1]+sy;if(X<0||Y<0||X>=W||Y>=H)return true;const j=Y*W+X;if(sol[j]||slabG[j])return true}return false}
function tryStep(b,sx,sy,depth=0){if(b.ghost){b.x+=sx;b.y+=sy;return true}
 const h=solidHits(b,sx,sy);if(h){if(b.type==='token'&&pushSlabs(b,h,sx,sy)){b.x+=sx;b.y+=sy;return true}pushDoor(b,h);const h0=b.type==='token'&&solidHits(b,0,0);if(h0&&h.length<h0.length){b.x+=sx;b.y+=sy;return true}return false}
 const hx=Math.round(b.x+sx)-Math.round(b.x),hy=Math.round(b.y+sy)-Math.round(b.y);if(heldBlocked(b,hx,hy)&&!(b.type==='token'&&pullFit(b,hx,hy))){const was=heldBlocked(b,0,0);if(!was)pushDoor(b,heldPix(b).map(p=>[p[0]+hx,p[1]+hy]));if(b.type==='token')raise(b);else if(!was)return false}
 const o=tokHit(b,sx,sy);if(o&&o.type==='token'&&b.type==='token'&&teamOf(o)===teamOf(b)&&(b.dash&&b.dash.phase||(o.x-b.x)*sx+(o.y-b.y)*sy<=0)){b.x+=sx;b.y+=sy;return true}if(o&&b.type==='token'&&o.type==='token'&&!b.flee&&teamOf(o)===teamOf(b)&&o.status==='free'){if(!(o.mv>0&&b.id>o.id))makeWay(o,sx,sy,b);return false}if(o){if(depth>2||(o.mass||1)>(b.mass||1)*1.05&&!(b.flee&&o.type==='token'&&teamOf(o)===teamOf(b))||!tryStep(o,sx,sy,depth+1))return false;o.mv=6}
 b.x+=sx;b.y+=sy;return true}
function moveToward(b,tx,ty){const x0=b.x,y0=b.y;for(let i=0;i<40;i++){const dx=tx-b.x,dy=ty-b.y;if(Math.abs(dx)<.01&&Math.abs(dy)<.01)break;const sx=Math.max(-1,Math.min(1,dx)),sy=Math.max(-1,Math.min(1,dy));let moved=false;
  if(sx&&tryStep(b,sx,0))moved=true;if(sy&&tryStep(b,0,sy))moved=true;if(!moved)break}
 if(b.ghost&&!solidHits(b,0,0))b.ghost=false;return Math.hypot(b.x-x0,b.y-y0)}
const TURN={civ:.18,home:.17,rifle:.16,guard:.12,shock:.1,cmd:.26};
function turnTo(b,a,now){if(now||b.type!=='token'||b.status!=='free')return turnNow(b,a);b.faceT=a}
function turnTick(){for(const b of bodies){if(b.faceT==null)continue;if(b.type==='weapon'){const d=Math.atan2(Math.sin(b.faceT-b.ang),Math.cos(b.faceT-b.ang));if(Math.abs(d)<=.14){if(Math.abs(d)>.01)reshape(b,b.faceT);b.faceT=null}else reshape(b,b.ang+Math.sign(d)*.14);continue}if(b.status!=='free'){b.faceT=null;continue}const d=Math.atan2(Math.sin(b.faceT-b.ang),Math.cos(b.faceT-b.ang)),r=(TURN[b.unit]||.14)*(b.crouch?.7:1);if(Math.abs(d)<=r){turnNow(b,b.faceT);b.faceT=null}else turnNow(b,b.ang+Math.sign(d)*r)}}
const facing=(b,x,y)=>Math.hypot(x-b.x,y-b.y)<28||Math.abs(Math.atan2(Math.sin(Math.atan2(y-b.y,x-b.x)-b.ang),Math.cos(Math.atan2(y-b.y,x-b.x)-b.ang)))<.35;
function turnNow(b,a){const a0=b.ang,d=Math.atan2(Math.sin(a-a0),Math.cos(a-a0));b.ang=a0+d;if(!heldBlocked(b,0,0))return;if(b.type==='token'&&pullFit(b))return;pushDoor(b,heldPix(b));if(b.type==='token'){raise(b);return}b.ang=a0;if(heldBlocked(b,0,0)){b.ang=a0+d;return}for(let i=1;i<=8;i++){b.ang=a0+d*i/8;if(heldBlocked(b,0,0)){b.ang=a0+d*(i-1)/8;return}}}
function pushDoor(b,h){if(b.type!=='token')return;for(const[X,Y]of h){if(X<0||Y<0||X>=W||Y>=H)continue;const d=slabG[Y*W+X]&&byId(slabG[Y*W+X]);if(!d||d.free||d.locked||d.tgt!==0)continue;if(d.ang!==0){d.tgt=Math.sign(d.ang)*Math.PI/2;sfx('door');continue}
  openGroup(d,b);sfx('door')}}
function leafShift(q,dl){const L=(q.len||16)/2,T=-(q.th||8)/2,c0=swingPt(q,L,T,0),c1=swingPt(q,L,T,dl);return[c1[0]-c0[0],c1[1]-c0[1]]}
function openGroup(d,b){const all=d.pair?[d,d.pair]:[d],lv=all.filter(q=>q.tgt===0&&q.ang===0&&!q.fallen&&!q.locked);if(!lv.length)return;const ref=all.find(q=>!lv.includes(q)&&!q.fallen&&(q.tgt||q.ang));let v;if(ref)v=leafShift(ref,Math.sign(ref.tgt||ref.ang)*Math.PI/2);else{openLeaf(lv[0],b);v=leafShift(lv[0],lv[0].tgt)}
 for(const q of lv){if(!ref&&q===lv[0])continue;const u=leafShift(q,Math.PI/2);q.tgt=u[0]*v[0]+u[1]*v[1]>0?Math.PI/2:-Math.PI/2}}
function openLeaf(d,b){const o=openDir(d),ok=dl=>{const a0=d.ang;let hit=false;for(const f of [.35,.7,1]){d.ang=dl*f;orient(d);if(doorHitsTok(d,b)){hit=true;break}}d.ang=a0;orient(d);return !hit};d.tgt=ok(o)?o:ok(-o)?-o:o}
function openDir(d){let best=Math.PI/2,bc=-1;for(const dl of [-Math.PI/2,Math.PI/2]){let n=0;for(const p of d.px){const q=swingPt(d,p[8],p[9],dl),X=Math.round(d.x+q[0]),Y=Math.round(d.y+q[1]);if(X>=0&&Y>=0&&X<W&&Y<H&&!sol[Y*W+X])n++}if(n>bc){bc=n;best=dl}}return best}
function doorHitsTok(d,only){const dx=Math.round(d.x),dy=Math.round(d.y);for(const t of only?[only]:bodies){if(t.type!=='token'||t.status==='dead'||Math.abs(t.x-d.x)>34||Math.abs(t.y-d.y)>34)continue;const tx=Math.round(t.x),ty=Math.round(t.y);for(const p of d.px){const q=t.set.get(K(dx+p[0]-tx,dy+p[1]-ty));if(q&&q[0]*q[0]+q[1]*q[1]<=52)return true}}return false}
function doors(){for(const d of bodies)if(d.type==='slab'&&!d.fallen&&d.ang!==d.tgt){const a0=d.ang,st=.14,df=d.tgt-d.ang;d.ang=Math.abs(df)<st?d.tgt:d.ang+Math.sign(df)*st;if(d.ang===d.tgt)NAVD=true;orient(d);if(Math.abs(d.ang)<Math.abs(a0)&&doorHitsTok(d)){d.ang=a0;orient(d)}}}
function slabTurn(){const d=(keys.has('e')?1:0)-(keys.has('q')?1:0);if(!d)return;for(const b of sel)if(b.type==='slab'&&b.free&&!b.fallen&&!inDrag(b))spinTo(b,b.rot*Math.PI/2+(b.spin||0)+d*.025)}
// dash: Shift, along WASD or facing; lighter units go further (tiles). One dash (two for commandos) per 10 s
const DASH={civ:2.2,home:2.2,rifle:1.9,guard:1.4,shock:1.1,cmd:2.5},DCD=600,DCDME=72;
function dashUnit(b,x,y){if(b.type!=='token'||b.status!=='free'||b.pinned||inDrag(b)||b.dash||b.crouch)return false;if(b.dashT&&tick>=b.dashT){b.dashN=0;b.dashT=0}if((b.dashN||0)>=(b.unit==='cmd'?2:1))return false;
 const l=Math.hypot(x,y)||1;b.dash={x:x/l,y:y/l,left:(DASH[b.unit]||1.5)*16};b.dashN=(b.dashN||0)+1;if(!b.dashT){b.dcd=!aiOn||teamOf(b)===aiMe?DCDME:DCD;b.dashT=tick+b.dcd}b.glide=null;return true}
function dbar(b,S){let e=b.lab.querySelector('.db');const on=b.dashT>tick&&b.status!=='dead';if(!on){if(e)e.remove();return}if(!e){e=document.createElement('div');e.className='db';e.append(document.createElement('i'));b.lab.append(e)}e.style.width=7*S+'px';e.style.height=Math.max(1,S|0)+'px';e.firstChild.style.width=(100*(1-(b.dashT-tick)/(b.dcd||DCD)))+'%'}
function dash(){const dx=(keys.has('d')?1:0)-(keys.has('a')?1:0),dy=(keys.has('s')?1:0)-(keys.has('w')?1:0);let any=false;
 for(const b of sel)if(dashUnit(b,dx||dy?dx:Math.cos(b.ang),dx||dy?dy:Math.sin(b.ang))){any=true;hear(b.x,b.y,70,b)}if(any)sfx('dash')}
function dashStep(b){const d=b.dash;// a phase follows the route through his teammates
 if(d.way){const p=d.way[0],dx=p[0]-b.x,dy=p[1]-b.y,l=Math.hypot(dx,dy),st=Math.min(4,l),m=l>0?moveToward(b,b.x+dx/l*st,b.y+dy/l*st):0;b.mv=6;if(l<=4)d.way.shift();if(!d.way.length||m<.5&&l>4)b.dash=null;return}
 const st=Math.min(4,d.left),m=moveToward(b,b.x+d.x*st,b.y+d.y*st);d.left-=st;b.mv=6;if(m<.5||d.left<=0)b.dash=null}
// AI units sidestep a thrown weapon that would hit them
const DODGE={cmd:.85,civ:.3,home:.4,rifle:.45,guard:.35,shock:.3};
function aiDodge(){for(const w of bodies){if(w.type!=='weapon'||!w.thrown||w.stuck||w.att)continue;const v2=w.vx*w.vx+w.vy*w.vy;if(v2<9)continue;
 for(const b of bodies){if(!b.ai||b.type!=='token'||b.status!=='free'||b.id===w.from)continue;const px=b.x-w.x,py=b.y-w.y,t=(px*w.vx+py*w.vy)/v2;if(t<1||t>14)continue;
  const mx=px-w.vx*t,my=py-w.vy*t;if(Math.hypot(mx,my)>9)continue;(w.seen||(w.seen=new Set()));if(w.seen.has(b.id))continue;w.seen.add(b.id);if(Math.random()>(DODGE[b.unit]||.3))continue;
  let sx=-w.vy,sy=w.vx;if(sx*mx+sy*my<0){sx=-sx;sy=-sy}if(dashUnit(b,sx,sy))sfx('dash')}}}
function wasd(){slabTurn();let dx=(keys.has('d')?1:0)-(keys.has('a')?1:0),dy=(keys.has('s')?1:0)-(keys.has('w')?1:0);if(!dx&&!dy)return;const l=Math.hypot(dx,dy);dx/=l;dy/=l;let moved=0,arm=0,gx=0,gy=0;
 for(const b of sel){if(b.type!=='token'||b.status==='dead'||inDrag(b)||b.pinned||cmdMode(b))continue;const u=UNITS[b.unit],hv=b.held&&(b.held.k==='rod'||b.held.k==='prod'),el=b.unit==='guard'||b.unit==='shock'||b.unit==='cmd',sp=.85*(1-u.arm*.07)*(!hv?1:b.unit==='civ'?(charge?.3:.55):el?(charge?.6:.92):(charge?.42:.8))*(b.pushT>=tick-2?(u.arm<=1?[.75,.45,.3]:[.85,.7,.55])[(b.pushM||1)-1]:1);b.glide=null;const cr=b.crouch?.4:1,md=moveToward(b,b.x+dx*sp*cr,b.y+dy*sp*cr);if(md>.1){moved=Math.max(moved,md);b.mv=6;arm=Math.max(arm,u.arm);gx=b.x;gy=b.y}}
 for(const b of sel)if(b.type==='weapon'&&srcInfo(b)&&!inDrag(b)&&Math.hypot(b.vx,b.vy)<1){moveToward(b,b.x+dx*.85,b.y+dy*.85);b.stuck=false}
 if(moved){stepAcc+=moved;if(stepAcc>=28+Math.random()*3){stepAcc=0;sfx('st_'+groundEl(gx,gy));if(arm)sfx('jingle')}}}
const STEP={marble:'marble',stone:'stone',wood:'wood',metal:'metal',cloth:'carpet',soil:'dirt',grass:'grass'};
function groundEl(x,y){const X=x|0,Y=y|0;if(X<0||Y<0||X>=W||Y>=H)return 'stone';const g=GT[Y*W+X];if(g===1)return 'grass';if(g===2)return 'dirt';if(g===3)return 'stone';const k=map[Y/T|0][X/T|0];return k&&k.endsWith('H')&&WMAT[k.slice(0,-1)]?'dirt':STEP[matK(k)]}
let lastHud='';
let openCrate=null,hoverC=null;const near=(a,c)=>c.box?Math.hypot(Math.max(c.box[0]-a.x,a.x-c.box[2],0),Math.max(c.box[1]-a.y,a.y-c.box[3],0))<14:Math.hypot(a.x-c.x,a.y-c.y)<30;
function moveItem(from,i,to,X,Y){const q=from.inv&&from.inv[i];if(!q||!to.inv)return;const one=q.k==='note'?{...q}:{k:q.k,n:q.k==='gold'?q.n:1};if(CAP[q.k]){one.ammo=q.ammo??CAP[q.k];one.res=q.res||0}
 if(to.type==='token'){if(addItem(to,one)){if((q.n-=one.n)<=0){from.inv[i]=null;if(from.si===i){from.held=null;from.si=-1;from.hc=null}}else if(CAP[q.k])q.ammo=CAP[q.k];sfx('flick');return true}NOPE();return false}
 cNorm(to);if(!cAdd(to,one,X,Y)){NOPE();return false}
 if((q.n-=one.n)<=0){from.inv[i]=null;if(from.si===i){from.held=null;from.si=-1;from.hc=null}}else if(CAP[q.k]){q.ammo=CAP[q.k]}
 storeSnd(q.k);return true}
function hud(){for(const b of bodies)if(b.direct&&!sel.has(b)){b.direct=false;b.holdT=tick+60}if(openCrate&&!bodies.includes(openCrate))openCrate=null;const tk=[...sel].find(o=>o.type==='token');if(tk)autoOff(tk)}
const CROWNI='<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="currentColor" d="M7 2h2v2h1v2h1v2h1v2h1v2h1v2H2v-2h1v-2h1V8h1V6h1V4h1z"/></svg>';
// pixel cursors from the regional map: arrow, open hand over things, black hand carrying, ↓ into a unit
const CUR=(()=>{const A=['k.......','kk......','kwk.....','kwwk....','kwwwk...','kwwwwk..','kwwkkkk.','kk......'],
 O=['.....kk.kk....','....kwwkwwkk..','....kwwkwwkwk.','....kwwkwwkwwk','.kk.kwwkwwkwwk','kwwkkwwkwwkwwk','kwwwkwwwwwwwwk','kwwwwwwwwwwwwk','.kwwwwwwwwwwwk','.kwwwwwwwwwwk.','..kwwwwwwwwwk.','...kwwwwwwwk..','...kwwwwwwwk..','...kkkkkkkkk..'],
 S=['....kk.kk.kk..','...kwwkwwkwwkk','.kkkwwkwwkwwwk','kwwkwwwwwwwwwk','kwwwwwwwwwwwwk','.kwwwwwwwwwwwk','.kwwwwwwwwwwk.','..kwwwwwwwwwk.','...kwwwwwwwk..','...kwwwwwwwk..','...kkkkkkkkk..'],
 I=['...ggg...','...ggg...','...ggg...','...ggg...','ggggggggg','.ggggggg.','..ggggg..','...ggg...','....g....'],
 CO={k:'#111111',w:'#f4efe2',g:'#6fd36a'},Z=28;
 const draw=(rows,sc,ol,px,sw)=>{const c=document.createElement('canvas');c.width=c.height=Z*sc;const x=c.getContext('2d'),h=rows.length,w=rows[0].length,ox=ol?Math.floor((Z/px-w)/2):1,oy=ol?Math.floor((Z/px-h)/2):1,on=(i,j)=>rows[j]&&rows[j][i]!==undefined&&rows[j][i]!=='.',dot=(i,j,col)=>{x.fillStyle=col;x.fillRect((ox+i)*px*sc,(oy+j)*px*sc,px*sc,px*sc)};
  if(ol)for(let j=-1;j<=h;j++)for(let i=-1;i<=w;i++){if(on(i,j))continue;let e=false;for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++)if(on(i+a,j+b))e=true;if(e)dot(i,j,CO.k)}
  rows.forEach((r,j)=>[...r].forEach((ch,i)=>{if(ch==='.')return;dot(i,j,CO[sw?(ch==='k'?'w':ch==='w'?'k':ch):ch])}));return c.toDataURL()};
 const set={arrow:[A,0,2,0,'2 2','default'],grab:[O,0,1,0,'7 6','grab'],carry:[S,0,1,1,'7 5','grabbing'],in:[I,1,1,0,'14 18','copy']},out={},css=[];
 for(const[n,[r,ol,px,sw,hot,nat]]of Object.entries(set)){const a=draw(r,1,ol,px,sw),b=draw(r,2,ol,px,sw);out[n]=`-webkit-image-set(url(${a}) 1x,url(${b}) 2x) ${hot},${nat}`;css.push(`--c-${n}:${out[n]};`)}
 const st=document.createElement('style');st.textContent=`:root{${css.join('')}}html,body{cursor:var(--c-arrow)}`;document.head.append(st);return out})();
function dropSlot(b,i){const q=b.inv&&b.inv[i];if(!q)return;if(q.k==='note'){b.inv[i]=null;placeNote(q,b.x,b.y+10);sfx('drop');return}if(b.type==='token'&&b.si===i&&b.held){dropHeld(b);return}const a=Math.random()*6.283,r=b.box?12:12,x=b.x+Math.cos(a)*r,y=b.y+(b.box?(b.box[3]-b.y)+6:Math.sin(a)*r),w=weapon(q.k,x,y,a);w.noPick=tick+120;w.ghost=!!solidHits(w,0,0);
 if(q.k==='gold'){w.amt=q.n;q.n=0}else{if(CAP[q.k]){w.ammo=q.ammo??CAP[q.k];w.res=q.res||0}q.n=(q.n||1)-1}if(q.n<=0){b.inv[i]=null;if(b.si===i){b.held=null;b.si=-1;b.hc=null}}sfx('drop')}
{const st=document.createElement('style');st.textContent='#sm #hud{display:flex;align-items:center;height:38px;padding:0 10px;gap:14px;border-top:1px solid #000;font-size:20px;color:#c9c5b8}#sm #hud canvas{image-rendering:pixelated;width:42px;height:30px}#sm #hud .it{display:flex;align-items:center;gap:3px;padding:1px 6px 1px 2px;border:1px solid transparent;min-width:30px;min-height:30px}#sm #hud .it.on{border-color:#f2efe6;color:#f2efe6}#sm #hud .it.nil{border-color:#2c2c2c}#sm #hud .it.lock{border-color:#161616;background:#161616}#sm #hud .hand{color:#f2efe6}#sm #hud .lo{color:#e0a040}#sm #hud .out{color:#b03a2a}#sm #hud .sep{width:1px;height:22px;background:#000}';document.head.appendChild(st);}
{const st=document.createElement('style');st.textContent='div#sm{border:0;min-height:100vh;display:flex;flex-direction:column}#sm div.main{grid-template-columns:minmax(0,1fr) 344px;flex:1;min-height:0}#sm div.view{background:#000;position:relative;overflow:hidden;padding:0;border-right:1px solid #000}#sm div.stage{position:absolute}#sm div.side{max-height:none;background:#0a0a0a}#sm div.stage{box-shadow:0 0 0 1px #000}';document.head.appendChild(st)}
let cam={x:0,y:0},camInit=true,pan=null,panKey=false;
function fit(){const v=$('stage').parentElement,used=document.querySelector('#sm header').offsetHeight+$('bar').offsetHeight+$('hint').offsetHeight;v.style.height=Math.max(320,window.innerHeight-used)+'px';{const sd=document.querySelector('#sm .side');sd.style.height=v.style.height;sd.style.maxHeight=v.style.height;sd.style.overflowY='auto'}const aw=v.clientWidth-56,ah=v.clientHeight-56;let k=Math.min(aw/W,ah/H);k=k>=3?Math.floor(k):k>=2?Math.floor(k*4)/4:2.5;S=k;stage.style.width=W*S+'px';stage.style.height=H*S+'px';cv.style.width=W*S+'px';cv.style.height=H*S+'px';applyCam()}
function applyCam(){const v=$('stage').parentElement,vw=v.clientWidth,vh=v.clientHeight,sw=W*S,sh=H*S;if(camInit){cam.x=curMap==="range"?0:(vw-sw)/2;cam.y=curMap==="range"?0:vh-sh-28;camInit=false}
 const cx=sw+56<=vw?(vw-sw)/2:Math.min(28,Math.max(vw-sw-28,cam.x)),cy=sh+56<=vh?(vh-sh)/2:Math.min(28,Math.max(vh-sh-28,cam.y));cam.x=cx;cam.y=cy;stage.style.left=cx+'px';stage.style.top=cy+'px'}
window.addEventListener('resize',fit);setTimeout(fit,0);setTimeout(fit,400);
let AMB=1;let LR=new Float32Array(NB),LG=new Float32Array(NB),LB=new Float32Array(NB),LT=new Float32Array(NB);let tls=[];
function flash(x,y,r,g,b,i,rad,d){if(BLU&&b>=r&&b>g)[r,g]=[g,r];tls.push({x,y,r,g,b,i,rad,d})}
function addL(x,y,r,g,b,i,rad=0){const cx=x/2|0,cy=y/2|0,R=Math.ceil(rad);lbx(cx-R,cy-R);lbx(cx+R,cy+R);for(let j=-R;j<=R;j++)for(let k=-R;k<=R;k++){const X=cx+k,Y=cy+j;if(X<0||Y<0||X>=BW||Y>=BH)continue;const f=rad?1-Math.hypot(k,j)/(rad+1):1;if(f<=0)continue;const q=Y*BW+X;LR[q]+=r*i*f;LG[q]+=g*i*f;LB[q]+=b*i*f}}
let LBX=[0,0,-1,-1],PBX=null;const lbx=(x,y)=>{if(LBX[2]<0){LBX=[x,y,x,y];return}if(x<LBX[0])LBX[0]=x;if(y<LBX[1])LBX[1]=y;if(x>LBX[2])LBX[2]=x;if(y>LBX[3])LBX[3]=y};
function blurL(a,x0,y0,x1,y1){for(let p=0;p<3;p++){for(let Y=y0;Y<=y1;Y++){let acc=0;const o=Y*BW;for(let X=x0-2;X<=x1+2;X++){if(X+2<=x1)acc+=a[o+X+2];if(X-3>=x0)acc-=a[o+X-3];if(X>=x0&&X<=x1)LT[o+X]=acc/5}}for(let X=x0;X<=x1;X++){let acc=0;for(let Y=y0-2;Y<=y1+2;Y++){if(Y+2<=y1)acc+=LT[(Y+2)*BW+X];if(Y-3>=y0)acc-=LT[(Y-3)*BW+X];if(Y>=y0&&Y<=y1)a[Y*BW+X]=acc/5}}}}
function lightPass(){if(PBX){const[x0,y0,x1,y1]=PBX;for(let Y=y0;Y<=y1;Y++){const o=Y*BW;LR.fill(0,o+x0,o+x1+1);LG.fill(0,o+x0,o+x1+1);LB.fill(0,o+x0,o+x1+1)}PBX=null}LBX=[0,0,-1,-1];let any=false;
 for(let i=0;i<NB;i++){const v=Math.max(FX.fire[i],TF[i],FH[i]*.6);if(v>.05){const f=Math.min(1.2,v)*1.7*(.85+.15*Math.sin(tick*.3+i));LR[i]+=f;LG[i]+=f*.5;LB[i]+=f*.16;any=true;lbx(i%BW,i/BW|0)}}
 for(const p of parts){const c=p.c,l=(c&255)+(c>>8&255)+(c>>16&255);if(l<420)continue;let k=p.life!==undefined?1:p.em!==undefined?p.em/p.em0:0;if(k<=0)continue;const q=(p.y>>1)*BW+(p.x>>1);if(q<0||q>=NB)continue;lbx(p.x>>1,p.y>>1);k*=1.1;LR[q]+=(c&255)/255*k;LG[q]+=(c>>8&255)/255*k;LB[q]+=(c>>16&255)/255*k;any=true}
 for(const z of zaps){addL(z.x1,z.y1,z.b?.45:.75,z.b?.75:.45,1,.8);any=true}
 const pul=.85+.15*Math.sin(tick*.12);for(const b of bodies){if(unseen(b))continue;if(b.kind==='arc'){addL(b.x,b.y,.62,.66,1,1.6);any=true}else if(b.kind==='sspear'&&!b.spent){const[x,y]=spearTip(b);addL(x,y,.62,.66,1,b.timer>0?.6+.7*(1-b.timer/b.timer0):b.fizz>0?.3+.4*b.fizz/150:.9*pul,2);any=true}
  else if(b.type==='token'&&b.held&&b.held.k==='rod'&&(b.held.heat||0)>.15&&b.status!=='dead'){const t=tipOf(b),h=b.held.heat;addL(t[0],t[1],1,.6+Math.min(.35,h*.3),.28+Math.max(0,h-.7)*.6,h*1.3,1.5+h);any=true}
  else if(b.type==='token'&&b.held&&b.held.k==='sspear'&&!b.held.spent&&b.status!=='dead'){const t=tipOf(b),h=b.held.heat||0;addL(t[0],t[1],.62,.66,1,pul*.7+h*1.3,2+h*1.5);any=true}
  if(b.kind==='rodp'&&b.glw>.05){addL(b.x,b.y,1,.6,.28,b.glw*1.3,2);any=true}if(b.surge>0){addL(b.x,b.y,.5,.75,1,(1-b.surge/240)*2,4);any=true}if(b.burn>.04){addL(b.x,b.y,1,.6,.25,b.burn*.8,3);any=true}}
 for(const t of tls){addL(t.x,t.y,t.r,t.g,t.b,t.i,t.rad);t.i*=t.d}tls=tls.filter(t=>t.i>.03);if(tls.length)any=true;
 if(!any||LBX[2]<0)return;const bx0=Math.max(0,LBX[0]-8),by0=Math.max(0,LBX[1]-8),bx1=Math.min(BW-1,LBX[2]+8),by1=Math.min(BH-1,LBX[3]+8);PBX=[bx0,by0,bx1,by1];blurL(LR,bx0,by0,bx1,by1);blurL(LG,bx0,by0,bx1,by1);blurL(LB,bx0,by0,bx1,by1)
 const ch=(v,l)=>{l*=2.4;const a=v*Math.min(1.8,AMB+l*1.3),k=Math.min(.85,l*.38);return cl(255-(255-Math.min(255,a))*(1-k))};
 for(let qy=by0;qy<=by1;qy++)for(let qx=bx0;qx<=bx1;qx++){const q=qy*BW+qx,lr=LR[q],lg=LG[q],lb=LB[q];if(lr+lg+lb<.01)continue;const j0=(qy*2)*W+qx*2;
  for(const j of [j0,j0+1,j0+W,j0+W+1]){const c=out[j];out[j]=rgb(ch(c&255,lr),ch(c>>8&255,lg),ch(c>>16&255,lb))}}}
const PICK=new Set(['musket','blunder','pistol','spear','sspear','grenade','bomb','rod','gold','rbox']);
const ONE=new Set(['musket','pistol','blunder']);
function slotFor(t,k,draw){const free=i=>slotOK(t,i)&&!t.inv[i];if(k==='note'){for(let i=4;i<t.inv.length;i++)if(!t.inv[i])return i;return -1}
 if(SEC.has(k)){if(free(1)||k==='pistol'&&!t.inv[1]&&t.inv[0]&&t.inv[0].k==='pistol')return 1;if(free(0))return 0;if(draw&&t.unit==='cmd'&&t.inv[1]&&t.inv[1].k==='pistol'&&t.inv[0]&&t.inv[0].k!=='pistol')return 0;return -1}
 if(CAP[k])return free(0)?0:-1;if(WP[k]&&WP[k].melee&&free(0))return 0;if(GREN.has(k)&&free(2))return 2;if(k==='bomb'&&free(3))return 3;
 for(let i=4;i<t.inv.length;i++)if(free(i))return i;return -1}
function addItem(t,it){if(!t.inv)return false;while(t.type==='token'&&t.inv.length<6)t.inv.push(null);{const g=Object.keys(BOX).find(k=>BOX[k]===it.k);if(g&&addRes(t,g,RCAP(g)*(it.n||1)))return true}if(ONE.has(it.k)&&t.inv.filter(z=>z&&z.k===it.k).length>=(it.k==='pistol'?2:1))return false;const m=!CAP[it.k]&&it.k!=='note'&&t.inv.find(z=>z&&z.k===it.k);const gcap=k=>(k==='grenade'?3:1)*(t.unit==='cmd'?2:1);if((it.k==='grenade'||it.k==='bomb')&&t.type==='token')it={...it,n:Math.min(it.n||1,gcap(it.k))};if(m){if(m.k==='spear'||m.k==='sspear'){if(m.n>=4)return false;m.n=Math.min(4,m.n+it.n);return true}if(t.type==='token'&&(m.k==='grenade'||m.k==='bomb')){if(m.n>=gcap(m.k))return false;m.n=Math.min(gcap(m.k),m.n+it.n);return true}m.n+=it.n;return true}
 const j=slotFor(t,it.k,it.draw);if(j<0)return false;if(t.inv[j]){const was=t.si===j,ph=t.held,ps=t.si;t.si=j;t.held=t.inv[j];dropHeld(t);if(!was){t.held=ph;t.si=ps;t.hc=null}}t.inv[j]={...it};delete t.inv[j].draw;if(it.k==='pistol')evenRes(t,'pistol');if(!t.held&&it.k!=='gold'&&!GREN.has(it.k)&&it.k!=='bomb'&&j<4||t.unit==='cmd'&&it.k==='pistol'&&it.draw&&!(t.held&&t.held.k==='pistol')){t.si=j;t.held=t.inv[j];t.hc=null}return true}
// an item handed to a unit that already carries one tops that one up instead
const gunsOf=(t,k)=>(t.inv||[]).filter(z=>z&&z.k===k);
function evenRes(t,k){const g=gunsOf(t,k);if(g.length<2)return;const tot=g.reduce((a,z)=>a+(z.res||0),0);g.forEach((z,i)=>z.res=(tot/g.length|0)+(i<tot%g.length?1:0))}
function addRes(t,k,n){const g=gunsOf(t,k);if(!g.length)return false;g[0].res=(g[0].res||0)+n;evenRes(t,k);return true}
// scavenging: a gun the unit can't carry gives up its rounds instead
const needRes=(t,k)=>{const g=gunsOf(t,k);return g.length&&g.reduce((a,z)=>a+(z.res||0),0)<fullRes(t,k)*g.length};
function strip(t,k,ammo,res){if(!CAP[k]||!needRes(t,k))return false;const n=(ammo||0)+(res||0);if(n<=0)return false;addRes(t,k,n);sfx('reload');return true}
const fullRes=(t,k)=>RCAP(k)*(t.unit==='guard'||t.unit==='cmd'?2:1)*(k==='pgun'&&t.unit==='cmd'?1.75:1)|0,fullN=(t,k)=>k==='spear'||k==='sspear'?4:k==='grenade'||k==='bomb'?(k==='grenade'?3:1)*(t.unit==='cmd'?2:1):1;
function refill(t,k){const h=t.inv.find(z=>z&&z.k===k);if(!h||k==='gold')return false;if(k==='pistol'&&gunsOf(t,k).length<2&&slotFor(t,k)>=0)return false;if(k==='pistol'&&gunsOf(t,k).length>1){for(const z of gunsOf(t,k)){z.ammo=CAP[k];z.res=Math.max(z.res||0,fullRes(t,k))}t.hc=null;return true}if(CAP[k]){h.ammo=CAP[k];h.res=Math.max(h.res||0,RCAP(k)*(t.unit==='guard'||t.unit==='cmd'?2:1)*(k==='pgun'&&t.unit==='cmd'?1.75:1)|0);h.spent=false;delete h.mode}else if(k==='spear'||k==='sspear')h.n=4;else h.n=Math.max(h.n||1,fullN(t,k));if(t.held===h)t.hc=null;return true}
// civilians and units that start unarmed don't scoop up weapons unless switched on
const autoOff=t=>t.noAuto??(t.noAuto=t.unit==='civ');
const mayTake=(t,k)=>!autoOff(t)||k==='gold'||k==='cell'||k.endsWith('box')||!CAP[k]&&gunsOf(t,k).length>0;
function autoPick(){for(const t of bodies){if(t.type!=='token'||!t.inv)continue;autoOff(t);if(t.status!=='free'||inDrag(t))continue;
  for(const w of [...bodies]){if(w.type!=='weapon'||!PICK.has(w.kind)||w.stuck||w.att||w.fuse||inDrag(w)||(w.noPick&&w.noPick>tick)||Math.hypot(w.vx,w.vy)>.3||Math.hypot(w.x-t.x,w.y-t.y)>13)continue;
   if(w.byHand&&refill(t,w.kind)){remove(w);sfx('reload');continue}
   if(w.byHand&&w.kind!=='gold'&&addItem(t,{k:w.kind,n:fullN(t,w.kind),ammo:CAP[w.kind]||undefined,res:CAP[w.kind]?fullRes(t,w.kind):undefined})){remove(w);sfx('flick');continue}
   if((w.byHand||mayTake(t,w.kind))&&addItem(t,{k:w.kind,n:w.kind==='gold'?(w.amt||50):1,ammo:CAP[w.kind]?(w.ammo??CAP[w.kind]):undefined,res:CAP[w.kind]?(w.res||0):undefined,spent:w.spent||undefined,mode:w.spent?'throw':undefined,draw:w.kind==='pistol'||undefined})){remove(w);sfx('flick')}else if(!w.byHand&&strip(t,w.kind,w.ammo??CAP[w.kind],w.res))remove(w)}
  for(const c of bodies){if(c.kind!=='crate'||!c.open||Math.hypot(c.x-t.x,c.y-t.y)>20)continue;{let tk=false;for(let i=0;i<c.inv.length&&!tk;i++){const q=c.inv[i];if(!q||q.k==='note')continue;const one={k:q.k,n:q.k==='gold'?q.n:1};if(CAP[q.k]){one.ammo=q.ammo??CAP[q.k];one.res=q.res||0}if(mayTake(t,q.k)&&addItem(t,one)){q.n-=one.n;if(q.n<=0)c.inv[i]=null;sfx('flick');tk=true}}if(tk)continue}
   for(let i=0;i<c.inv.length;i++){const q=c.inv[i];if(!q)continue;const g=Object.keys(BOX).find(k=>BOX[k]===q.k);if(g&&needRes(t,g)&&addRes(t,g,RCAP(g))){sfx('reload');if(--q.n<=0)c.inv[i]=null;break}if(strip(t,q.k,q.ammo??CAP[q.k],q.res)){if(--q.n<=0)c.inv[i]=null;break}}}}}
const inZone=(b,p)=>{if(b.fa===undefined||b.fw>=3.1&&b.fd>=8)return true;const r2=p[0]*p[0]+p[1]*p[1],d=8.3-b.fd;if(r2<d*d)return false;if(b.fw>=3.1)return true;const a=Math.atan2(p[1],p[0]);return Math.abs(Math.atan2(Math.sin(a-b.fa),Math.cos(a-b.fa)))<=b.fw};
function ignite(b,a,w,d){if(!(b.burn>.05)||b.fa===undefined){b.fa=a;b.fw=w;b.fd=d}else{b.fw=Math.min(3.15,b.fw+.008);b.fd=Math.min(8.3,b.fd+.008)}}
function fireTick(){for(const b of [...bodies]){if((b.type!=='token'&&b.type!=='part')||!bodies.includes(b))continue;
  let v=0,ka=0,kc=0;for(let k=0;k<9;k++){const a=k*.785,r=k===8?0:8,X=Math.round(b.x+Math.cos(a)*r),Y=Math.round(b.y+Math.sin(a)*r);if(X<0||Y<0||X>=W||Y>=H)continue;const q=(Y>>1)*BW+(X>>1),f=Math.max(TF[q],FX.fire[q]);if(k===8)kc=f;else if(f>v){v=f;ka=a}}
  if(kc>.3){ignite(b,ka,.5,1.5);b.fw=Math.min(3.15,b.fw+.03);b.fd=Math.min(8.3,b.fd+.03)}else if(v>.3)ignite(b,ka,.45,1.5);v=Math.max(v,kc);
  if(v>.3)b.burn=Math.min(1.5,(b.burn||0)+v*.12);
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
const hasKey=(o,tm)=>{if(!tm)return false;const k=o.keys||o.pair&&o.pair.keys;if(k)return k===tm;try{return MAPOWN()===tm}catch(e){return false}};
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
const navLine=(x0,y0,x1,y1)=>{const L=Math.hypot(x1-x0,y1-y0);for(let i=0;i<=L;i+=2){const m=nodeAt(x0+(x1-x0)*i/L,y0+(y1-y0)*i/L);if(m<0||!NV[m])return false}return true};
// the most open node close by: where a unit caught on a corner should slide to
function navOpen(x,y){navEnsure();const gx=Math.round(x/G),gy=Math.round(y/G);let best=-1,bs=-1e9;for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const X=gx+i,Y=gy+j;if(X<0||Y<0||X>=GW||Y>=GH)continue;const m=Y*GW+X;if(!NV[m])continue;const sc=Math.min(NC[m],12)-Math.hypot(X*G-x,Y*G-y)*.4;if(sc>bs){bs=sc;best=m}}return best}
const compAt=(x,y)=>{navEnsure();const n=navNear(x,y);return n<0?-1:NCOMP[n]};
// route: A* over the nodes, a little dearer close to walls so units keep to the middle; a door locked against this team is shut unless anyLock. If the goal can't be reached the route ends as close as it gets, marked partial
function aiPath(b,tx,ty,anyLock){navEnsure();const tm=teamOf(b),LK=new Set();if(!anyLock)for(const o of doorsNow())if(o.locked&&!o.lockBroken&&!hasKey(o,tm)){if(o.dt)for(const c of o.dt)LK.add(c);else LK.add((o.y/T|0)*CW+(o.x/T|0))}
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
 for(const o of DL)if(isDoor(o)&&o.locked&&!o.lockBroken&&hasKey(o,teamOf(b))&&Math.hypot(o.x-b.x,o.y-b.y)<24&&(onDoor(o,x,y)||onDoor(o,b.x,b.y))){for(const q of o.pair?[o,o.pair]:[o])q.locked=false;sfx('lock')}
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
 const kh=bodies.find(o=>o.type==='token'&&o.status==='free'&&teamOf(o)===tm&&hasKey(d,tm)&&Math.hypot(o.x-d.x,o.y-d.y)<70);if(kh){for(const q of lv)q.locked=false;sfx('lock');a.door=null;a.path=null;return}
 turnTo(b,Math.atan2(d.y-b.y,d.x-b.x));if(--a.cd>0)return;const h=b.held;if(h&&CAP[h.k]&&h.ammo>0&&facing(b,d.x,d.y)){fire(b,d.x,d.y);a.cd=50}else{sfx('thunk');shake=Math.max(shake,2);a.cd=40}
 d.kicks=(d.kicks||0)+1;hear(d.x,d.y,120,b);if(d.kicks>=8){for(const q of lv){q.lockBroken=true;q.locked=false}sfx('door');for(let i=0;i<8;i++)spark(d.x,d.y,rgb(214,176,70),0,0,2.4);a.door=null;a.path=null}}
function aiLock(b,e,home){const d=e.d,lv=d.pair?[d,d.pair]:[d];let tgt=[d.x,d.y];if(d.dt)for(const c of d.dt){const cx=c%CW,cy=c/CW|0;for(const[a,q]of[[1,0],[-1,0],[0,1],[0,-1]]){const f=(cy+q)*CW+cx+a;if(ROOMS.R[f]===home&&aiOpen(cx+a,cy+q)){tgt=aiOpen(cx+2*a,cy+2*q)&&ROOMS.R[(cy+2*q)*CW+cx+2*a]===home?[(cx+2*a)*T+8,(cy+2*q)*T+8]:[(cx+a)*T+8,(cy+q)*T+8]}}}const dd=Math.hypot(tgt[0]-b.x,tgt[1]-b.y);if(dd>6){aiGo(b,tgt[0],tgt[1]);return false}turnTo(b,Math.atan2(d.y-b.y,d.x-b.x));
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
 const us=bodies.filter(b=>b.ai&&b.status==='free'&&!inDrag(b));if(tick%30===0)shareTick();for(const b of bodies)if(b.type==='token'&&!b.ai&&teamOf(b)===aiMe&&b.status==='free'&&!inDrag(b)){if(bombFlee(b,bodies.filter(o=>o.type==='token'&&o.status==='free'&&foe(b,o)&&!o.fogH)))continue;ordTick(b);if(!b.direct)autoFire(b)}if(tick%6===0)for(const b of us)aiSense(b);
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
function ordGive(g,x,y){const cx=(x/T|0)*T+8,cy=(y/T|0)*T+8,mx=g.reduce((s,b)=>s+b.x,0)/g.length,my=g.reduce((s,b)=>s+b.y,0)/g.length;let n=0;
 for(const b of g){let X=cx,Y=cy;if(g.length>1){X+=Math.max(-T,Math.min(T,(b.x-mx)*.5));Y+=Math.max(-T,Math.min(T,(b.y-my)*.5));if(!wOpen(X,Y)){X=cx;Y=cy}}
  ensureRooms();const q=(Y>>1)*BW+(X>>1),ok=X>=0&&Y>=0&&X<W&&Y<H&&wOpen(X,Y)&&(!fogOn()||SEEN[q]>-1e8)&&(P=>!!P&&!P.partial)(aiPath(b,X,Y));ORDL.push({x0:b.x,y0:b.y,x1:X,y1:Y,t:tick,ok});if(ok){b.ord={x:X,y:Y};b.oa={};n++;say(b,'Moving',true)}}sfx(n?'flick':'dry')}
function lookGive(g,x,y,same){if(!g.length)return;const mx=g.reduce((s,b)=>s+b.x,0)/g.length,my=g.reduce((s,b)=>s+b.y,0)/g.length,a=Math.atan2(y-my,x-mx);
 for(const b of g){const X=same?b.x+Math.cos(a)*120:x,Y=same?b.y+Math.sin(a)*120:y;b.lookAt={x:X,y:Y,t:tick+240};ORDL.push({x0:b.x,y0:b.y,x1:b.x+(X-b.x)*Math.min(1,40/(Math.hypot(X-b.x,Y-b.y)||1)),y1:b.y+(Y-b.y)*Math.min(1,40/(Math.hypot(X-b.x,Y-b.y)||1)),t:tick,ok:true,look:true})}sfx('flick')}
// a look order holds until a new order or an enemy; autonomous units return to their own business after 4 s
function lookTick(b){const L=b.lookAt;if(!L||b.ord||b.direct)return false;if(b.ai&&tick>L.t){b.lookAt=null;return false}turnTo(b,Math.atan2(L.y-b.y,L.x-b.x));return true}
function ordDraw(){ORDL=ORDL.filter(l=>tick-l.t<90);for(const l of ORDL){const k=1-(tick-l.t)/90,c=l.look?rgb(150,200,240):l.ok?rgb(242,239,230):rgb(224,83,63),L=Math.hypot(l.x1-l.x0,l.y1-l.y0)||1;for(let i=0;i<=L;i++){const X=Math.round(l.x0+(l.x1-l.x0)*i/L),Y=Math.round(l.y0+(l.y1-l.y0)*i/L);if(X>=0&&Y>=0&&X<W&&Y<H)out[Y*W+X]=mix(out[Y*W+X],c,.35*k)}}}
function ensureRooms(){if(!ROOMS||ROOMS.R.length!==CW*CH||(NAVD||ROOMS.nv!==NAVV)&&tick-ROOMS.t>=15||tick-ROOMS.t>300)aiRooms()}
function ordTick(b){if(!b.ord)return;{const o=b.oa||(b.oa={}),d=Math.hypot(b.ord.x-b.x,b.ord.y-b.y);if(o.best===undefined||d<o.best-3){o.best=d;o.bt=tick}else if(tick-o.bt>75){b.ord=null;return}}if(b.status!=='free'||!b.oa||(b.oa.stk||0)>45||Math.hypot(b.ord.x-b.x,b.ord.y-b.y)<10||bodies.some(o=>o!==b&&o.type==='token'&&o.status!=='dead'&&Math.hypot(o.x-b.ord.x,o.y-b.ord.y)<12&&Math.hypot(b.ord.x-b.x,b.ord.y-b.y)<30)){b.ord=null;return}if(aiGo(b,b.ord.x,b.ord.y,b.oa))b.ord=null}
// your unselected units with a gun drawn fire at enemies they can see
function autoFire(b){const a=b.pa||(b.pa={cd:30}),rng=k=>!k?110:WP[k].melee?110:WP[k].range||200,usable=q=>q&&WP[q.k]&&!WP[q.k].hide&&!(CAP[q.k]&&empty(q));let tg=null,td=1e9,seen=null,sd=200;
 for(const o of bodies){if(o.type!=='token'||o.status!=='free'||!foe(b,o)||!armedOf(o))continue;const d=Math.hypot(o.x-b.x,o.y-b.y);if(canSee(b,o)){if(d<td){td=d;tg=o}}else if(!o.fogH&&d<sd&&losClear(b.x,b.y,o.x,o.y,b.crouch,o.crouch)){sd=d;seen=o}}
 a.tg=tg;if(!tg){if(!lookTick(b)&&seen)turnTo(b,Math.atan2(seen.y-b.y,seen.x-b.x));a.cd=Math.max(a.cd,20);return}b.lookAt=null;
 if(!usable(b.held)){let i=b.inv.findIndex((q,i)=>i<2&&usable(q));if(i<0)i=b.inv.findIndex(q=>q&&(q.k==='grenade'||q.k==='bomb'));if(i<0)return;if(b.si!==i){selectSlot(b,i);a.cd=Math.max(a.cd,20)}}
 const k=b.held&&b.held.k;if(!k)return;
 if(k==='grenade'||k==='bomb'){turnTo(b,Math.atan2(tg.y-b.y,tg.x-b.x));if(--a.cd>0)return;const np=nadePlan(b,tg,true);if(np){throwNade(b,np.i,np.tg);a.cd=120}else a.cd=20;return}
 if(td>rng(k)+40){turnTo(b,Math.atan2(tg.y-b.y,tg.x-b.x));return}aiShoot(b,tg,a)}
// grenades: anyone in the blast who can see it runs, away from the bomb and from known enemies
function bombFlee(b,enemies){if(b.direct||b.status!=='free')return false;if(b.flee){if(tick>b.flee.t||!bodies.includes(b.flee.g)){b.flee=null;return false}if(((b.fls||{}).stk||0)>5){b.fleeBad=Math.atan2(b.flee.y-b.y,b.flee.x-b.x);b.flee=null}else{aiGo(b,b.flee.x,b.flee.y,b.fls||(b.fls={}));return true}}
 for(const g of bodies){if(!(g.fuse>0)||g.kind!=='grenade'&&g.kind!=='bomb')continue;const R=g.kind==='bomb'?60:44,d=Math.hypot(g.x-b.x,g.y-b.y);if(d>R||!losClear(b.x,b.y,g.x,g.y,false,false))continue;
  let best=null,bs=-1e9;for(let k=0;k<16;k++){const an=k*.3927,X=b.x+Math.cos(an)*(R+8-d+8),Y=b.y+Math.sin(an)*(R+8-d+8);if(!wOpen(X,Y)||!losClear(b.x,b.y,X,Y,false,false))continue;let sc=Math.hypot(X-g.x,Y-g.y);if(b.fleeBad!==undefined&&Math.cos(an-b.fleeBad)>.7)sc-=60;for(const o of bodies){if(o===b||o.type!=='token'||o.status==='dead')continue;const tx=o.flee?o.flee.x:o.x,ty=o.flee?o.flee.y:o.y,dd=Math.hypot(tx-X,ty-Y);if(dd<24)sc-=(24-dd)*2;const vx=X-b.x,vy=Y-b.y,L=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((o.x-b.x)*vx+(o.y-b.y)*vy)/L));if(Math.hypot(b.x+vx*t-o.x,b.y+vy*t-o.y)<12)sc-=40}for(const e of enemies){const ed=Math.hypot(e.x-X,e.y-Y);if(ed<80)sc-=(80-ed)*1.5}if(sc>bs){bs=sc;best=[X,Y]}}
  if(best){b.flee={x:best[0],y:best[1],t:tick+g.fuse+20,g};say(b,'Run!',true);b.fls={};b.crouch=false;if(Math.hypot(best[0]-g.x,best[1]-g.y)>R&&dashUnit(b,best[0]-b.x,best[1]-b.y))sfx('dash');return true}}return false}
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
let VS=new Uint8Array(1),VSF=new Float32Array(1),fSel=false,VIS=new Uint8Array(1),SEEN=new Float32Array(1),SNAP=new Uint32Array(1),VF=new Float32Array(1),VT=new Float32Array(1);
const fogOn=()=>aiOn&&!!aiMe&&dirOn(); // fog only while you're driving a unit yourself (E); commanding from above sees everything
let DIRT=-1,DIRV=false;const dirOn=()=>{if(DIRT!==tick){DIRT=tick;DIRV=bodies.some(b=>b.direct&&b.type==='token'&&b.status!=='dead')}return DIRV};
function fogTick(){if(VIS.length!==NB){VIS=new Uint8Array(NB);SEEN=new Float32Array(NB).fill(-1e9)}if(SNAP.length!==W*H)SNAP=new Uint32Array(W*H);VIS.fill(0);
 const me=bodies.filter(b=>b.type==='token'&&teamOf(b)===aiMe&&b.status!=='dead');
 if(VS.length!==NB){VS=new Uint8Array(NB);VSF=new Float32Array(NB)}VS.fill(0);fSel=me.some(b=>sel.has(b));
 for(const b of me){const sb=sel.has(b);sight(b,me.length<=6?130:Math.max(40,780/me.length|0),q=>{VIS[q]=1;if(sb)VS[q]=1})}
 for(let y=1;y<BH-1;y++)for(let x=1;x<BW-1;x++){const q=y*BW+x;if(!VIS[q]&&(VIS[q-1]&1&&VIS[q+1]&1||VIS[q-BW]&1&&VIS[q+BW]&1))VIS[q]=2}
 for(let q=0;q<NB;q++)if(VIS[q])SEEN[q]=tick;
 // soft edge: blur the view mask a few cells
 if(VF.length!==NB){VF=new Float32Array(NB);VT=new Float32Array(NB)}for(let q=0;q<NB;q++)VF[q]=VIS[q]?1:0;blurMask(VF);if(fSel){for(let q=0;q<NB;q++)VSF[q]=VS[q]?1:0;blurMask(VSF)}
 for(const o of bodies)if(o.type==='token')o.fogH=relOf(aiMe,teamOf(o))!=='self'&&relOf(aiMe,teamOf(o))!=='ally'&&o.status!=='dead'&&(!VIS[(Math.round(o.y)>>1)*BW+(Math.round(o.x)>>1)]||!me.some(b=>canSee(b,o)))}
// a unit under direct control shows what it can see: the cone, cut by walls and, when crouched, by furniture
// what a unit sees: a cone plus a small circle; rays look a little way into walls but never out the other side
function sight(b,nr,f){const low=!!b.crouch,cast=(a,R)=>{const c=Math.cos(a),s=Math.sin(a);let wd=0;for(let r=0;r<R;r+=2){const X=Math.round(b.x+c*r),Y=Math.round(b.y+s*r);if(X<0||Y<0||X>=W||Y>=H)return;const j=Y*W+X,wl=sol[j]||slabG[j];if(wd&&!wl)return;f((Y>>1)*BW+(X>>1));if(wl&&(wd+=2)>8)return;if(low&&OBJ[j]&&r>5)return}};
 for(let i=0;i<=nr;i++)cast(b.ang-.96+1.92*i/nr,VR);for(let i=0;i<24;i++)cast(i/24*6.283,22)}
// a unit under direct control shows what it sees; what its allies see stays lighter than the rest
let DSV=null,DSA=null;function sightTick(){const me=EM?[]:bodies.filter(b=>b.direct&&b.type==='token'&&b.status==='free');if(!me.length){DSV=null;return}if(!DSV||DSV.length!==NB){DSV=new Float32Array(NB);DSA=new Float32Array(NB)}if(VT.length!==NB)VT=new Float32Array(NB);DSV.fill(0);DSA.fill(0);
 for(const b of me)sight(b,160,q=>DSV[q]=1);const t=teamOf(me[0]);for(const o of bodies)if(o.type==='token'&&o.status==='free'&&!o.direct&&/self|ally/.test(relOf(t,teamOf(o))))sight(o,60,q=>DSA[q]=1);blurMask(DSV);blurMask(DSA)}
function sightPass(){const sm=v=>{v=Math.min(1,v*1.6);return v*v*(3-2*v)};for(let Y=0,j=0;Y<H;Y++){const r=(Y>>1)*BW;for(let X=0;X<W;X++,j++){const q=r+(X>>1),w=Math.max(sm(DSV[q]),.49*sm(DSA[q]));if(w<1)out[j]=mul(out[j],.55+.45*w)}}}
function blurMask(A){for(let pass=0;pass<2;pass++){for(let y=0;y<BH;y++){const o=y*BW;let sum=0;for(let k=0;k<=2&&k<BW;k++)sum+=A[o+k];for(let x=0;x<BW;x++){const n=Math.min(BW-1,x+2)-Math.max(0,x-2)+1;VT[o+x]=sum/n;if(x+3<BW)sum+=A[o+x+3];if(x-2>=0)sum-=A[o+x-2]}}
  for(let x=0;x<BW;x++){let sum=0;for(let k=0;k<=2&&k<BH;k++)sum+=VT[k*BW+x];for(let y=0;y<BH;y++){const n=Math.min(BH-1,y+2)-Math.max(0,y-2)+1;A[y*BW+x]=sum/n;if(y+3<BH)sum+=VT[(y+3)*BW+x];if(y-2>=0)sum-=VT[(y-2)*BW+x]}}}}
// with one of your units selected, what the others see is dimmed slightly
function fogPass(){const sl=!DSV&&fSel&&[...sel].some(b=>b.type==='token'&&teamOf(b)===aiMe);const F=rgb(6,6,8);for(let Y=0,j=0;Y<H;Y++){const r=(Y>>1)*BW;for(let X=0;X<W;X++,j++){const q=r+(X>>1),v=Math.min(1,VF[q]*1.6);if(VIS[q])SNAP[j]=out[j];if(sl&&v>0){const w=Math.min(1,VSF[q]*1.6);if(w<1)out[j]=mul(out[j],.8+.2*w*w*(3-2*w))}if(v>=1)continue;const age=(tick-SEEN[q])/300,m=age>=1?F:mix(mul(SNAP[j],.6),F,Math.max(0,age));out[j]=v<=0?m:mix(m,out[j],v*v*(3-2*v))}}
 for(const z of RINGS){const k=(tick-z.t)/40,rad=2+k*7;for(let i=0;i<28;i++){const X=Math.round(z.x+Math.cos(i*.2244)*rad),Y=Math.round(z.y+Math.sin(i*.2244)*rad);if(X>=0&&Y>=0&&X<W&&Y<H){const j=Y*W+X;out[j]=mix(out[j],rgb(230,226,214),.5*(1-k))}}}RINGS=RINGS.filter(z=>tick-z.t<40)}
function ringFor(z){if(!fogOn()||z.src&&teamOf(z.src)===aiMe||z.src&&!z.src.fogH)return;const me=bodies.filter(b=>b.type==='token'&&teamOf(b)===aiMe&&b.status==='free');if(me.some(b=>heardBy(b,z))&&!RINGS.some(r=>tick-r.t<12&&Math.hypot(r.x-z.x,r.y-z.y)<10))RINGS.push({x:z.x,y:z.y,t:tick})}
// a crouched unit hides behind low furniture: a low shot hits any desk; a high shot hits one beside a crouched unit
function lowHit(b){const X=Math.round(b.x),Y=Math.round(b.y);if(X<0||Y<0||X>=W||Y>=H||!OBJ[Y*W+X]){b.inO=false;return false}
 if(!b.low&&!bodies.some(t=>t.type==='token'&&t.crouch&&t.status!=='dead'&&Math.hypot(t.x-b.x,t.y-b.y)<26&&(t.x-b.x)*b.vx+(t.y-b.y)*b.vy>0))return false;
 const s=Math.hypot(b.vx,b.vy)||1,j=Y*W+X,m=OBJ[j],pel=b.kind==='pel';
 // a low shot marks the furniture by its material; only wood lets a strong shot through
 const r=m===3?1:m===4?(pel?1.6:2.6):(pel?1:1.6)*(m===1?.7:1);for(let y=Math.floor(Y-r);y<=Y+r;y++)for(let x=Math.floor(X-r);x<=X+r;x++){const q=y*W+x;if(x<0||y<0||x>=W||y>=H||!OBJ[q]||Math.hypot(x-X,y-Y)>r)continue;if(m===3){OBJC[q]=mul(OBJC[q],.72);SHN[q]=0;continue}OBJ[q]=0;SHN[q]=0;floor[q]=mix(floor[q],mul(OBJC[q],.45),.7)}ds0Need=true;{const c=bodies.find(o=>o.hidden&&o.box&&X>=o.box[0]&&X<=o.box[2]&&Y>=o.box[1]&&Y<=o.box[3]);if(c)cShot(c,X,Y,r,b)}
 if(b.inO)return false;b.inO=true;hitFx(X,Y,m,b.vx/s,b.vy/s,pel);b.pen=(b.pen||0)+1;
 if(m!==2||pel||b.pen>2||s<7){remove(b);return true}b.vx*=.6;b.vy*=.6;return false}
function update(){tick++;SND&&SND.near();SND&&SND.fireTick();for(const b of bodies)if(b.type==='token'&&b.status==='captured')b.ang=-Math.PI/2;// captives face up so their cuffs read
 for(const b of bodies)if(b.type==='token'&&(b.matA!==b.ang||b.matN!==lookOf(b)))tokMat(b);if(!aiOn)for(const b of bodies){if(b.ord){ensureRooms();ordTick(b)}else if(b.lookAt)lookTick(b)}if(tick%30===0)leaderTick();turnTick();try{aiTick();if(fogOn()&&tick%3===0)fogTick();if(tick%3===0)sightTick()}catch(e){console.warn(e)}if(aiOn&&tick%20===0)for(const b of bodies)if(b.type==='token'&&b.status==='free'&&b.mv>0&&!b.crouch)hear(b.x,b.y,UNITS[b.unit].arm>=2?90:60,b,'step');markSlabs();if(drag)dragStep();if(tick%3===0)fireTick();if(tick%10===0)autoPick();for(const b of bodies){if(b.mw){if(b.status==='free')moveToward(b,b.x+b.mw.dx,b.y+b.mw.dy);if(--b.mw.n<=0)b.mw=null}if(b.raised&&tick-b.rT>12&&tick%4===0){b.raised=false;b.hc=null;b.pull=8;if(heldBlocked(b,0,0)){b.raised=true;b.pull=0;b.hc=null}else{b.rT=tick;rustle(b,.5)}}if(!b.raised&&b.pull>0&&tick%3===0){b.pull--;if(heldBlocked(b,0,0))b.pull++}if(b.cock>0)b.cock--;if(b.type==='token'&&b.status==='free'&&b.held&&CAP[b.held.k]&&b.held.ammo===0&&b.held.res>0&&!b.burst&&!b.bq&&!(b.cock>0)){if(++b.rlT>20){b.rlT=0;reload(b)}}else b.rlT=0;burstTick(b);if(b.dash)dashStep(b)}aiDodge();if(tick%6===0)hud();wasd();doors();shockTick();for(const b of bodies)if(b.held)melee(b);rodTick();
 for(const b of [...bodies])if((b.kind==='grenade'||b.kind==='bomb')&&b.fuse>0&&--b.fuse===0&&bodies.includes(b))detonate(b)
 for(const b of bodies)b.wind=0;if(charge){const pr=Math.min(1,(performance.now()-charge.t)/charge.need);for(const b of armed()){const i=srcInfo(b);if(i&&i.throw)b.wind=i.heat?Math.min(1,.35+(slot(b).heat||0)*.65):pr*pr}}
 if(charge&&performance.now()-charge.t>=charge.need){fireGroup(mouse.x,mouse.y);if(holdFire&&armed().length&&armed().every(o=>{const i=srcInfo(o);return i&&!i.throw&&!i.heat}))charge={...charge,t:performance.now()};else charge=null}
 for(const b of [...bodies])if(bodies.includes(b))step(b);tetherTick();if(tick%4===0)exitTick();if(curMap==='air'&&tick%5===0)overboard();stepParts();cool();fxTick()}
let lastT=performance.now(),acc=0,slowMo=false,holdFire=false;
function loop(){const now=performance.now();acc+=Math.min(120,now-lastT)*(slowMo?.3:1);lastT=now;let n=0;while(acc>=16.667&&n<6){update();acc-=16.667;n++}if(n)render();requestAnimationFrame(loop)}

const toBoard=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H]};
const inBoard=e=>{const r=cv.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom};
function startDrag(b,x,y,fromPanel,free){if(b.wedged)return;if(b.type==='weapon')b.byHand=true;const grp=!fromPanel&&sel.has(b)&&sel.size>1&&b.type==='token'?[...sel].filter(o=>o.type==='token'&&o.status!=='dead'):[b];
 drag={b,group:grp,offs:grp.map(o=>[o.x-b.x,o.y-b.y]),ox:fromPanel?0:b.x-x,oy:fromPanel?0:b.y-y,tx:x,ty:y,smp:[[performance.now(),x,y]],panel:fromPanel,free};
 for(const o of grp){o.vx=o.vy=0;o.glide=null;if(o.pinned)o.pinned=false;if(o.stuck||fromPanel||free||solidHits(o,0,0))o.ghost=true;o.stuck=false;o.att=null;o.timer=0;o.fizz=0;o.charge=null;if(o.snd){o.snd.stop();o.snd=null}}sfx('flick')}
function dragStep(){const b=drag.b;if(!bodies.includes(b)){drag=null;return}const tx=drag.tx+drag.ox,ty=drag.ty+drag.oy;
 if(drag.panel){b.x=tx;b.y=ty;b.ghost=true;return}
 if(drag.free){drag.group.forEach((o,i)=>{o.x=tx+drag.offs[i][0];o.y=ty+drag.offs[i][1];o.ghost=true;o.mv=6;leash(o)});return}
 drag.group.forEach((o,i)=>{if(!bodies.includes(o))return;const md=moveToward(o,tx+drag.offs[i][0],ty+drag.offs[i][1]);if(md>.5)o.mv=6;leash(o)})}
function nudge(b){const x0=b.x,y0=b.y;for(let r=1;r<=24;r++)for(let k=0;k<16;k++){const a=k/16*6.283;b.x=x0+Math.cos(a)*r;b.y=y0+Math.sin(a)*r;if(!solidHits(b,0,0))return true}b.x=x0;b.y=y0;return false}
let lastClick=null;
function clickBody(b,add){if(b.status==='dead')return;if(b.hidden){openCrate=openCrate===b?null:b;sfx('door');return}if(b.kind==='crate'){b.open=!b.open;sfx('door');return}if(b.type==='slab'&&b.free){if(!add)sel.clear();if(add&&sel.has(b))sel.delete(b);else sel.add(b);sfx('flick');return}if(b.type==='slab'){if(b.fallen)return;const lv=b.pair?[b,b.pair]:[b];let hp=null;if(lastClick){for(let j=-1;j<=1&&!hp;j++)for(let i=-1;i<=1&&!hp;i++)hp=b.set.get(K(lastClick.X+i-Math.round(b.x),lastClick.Y+j-Math.round(b.y)))||null}
 if(b.tgt!==0||b.ang!==0){for(const q of lv)q.tgt=0;sfx('door')}else if(hp&&hp[8]<=6){if(b.locked)sfx('lock');else{openGroup(b,null);sfx('door')}}else if(!b.lockBroken&&!(b.pair&&b.pair.lockBroken)){b.locked=!b.locked;if(b.pair)b.pair.locked=b.locked;sfx('lock')}return}
 if(b.type==='weapon'&&!sel.has(b)){const now=performance.now(),dbl=lastW&&lastW.id===b.id&&now-lastW.t<400;lastW={id:b.id,t:now};if(!dbl)return}
 if(!add)sel.clear();if(add&&sel.has(b))sel.delete(b);else sel.add(b);sfx('flick')}
let lastW=null;
cv.addEventListener('contextmenu',e=>e.preventDefault());
const boardDown=e=>{au();closeMenu();if(panKey||e.button===1){pan={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y};cv.setPointerCapture(e.pointerId);e.preventDefault();return}const[x,y]=toBoard(e),X=x|0,Y=y|0;
 if(e.button===2){const b=bodyAt(X,Y,1)||bodyAt(X,Y,1,null,o=>o.type==='token'&&o.status==='dead');if(!b&&[...sel].some(canOrder)){ordGive([...sel].filter(canOrder),x,y);return}if(b)openMenu(b,e);else if(![...sel].some(o=>o.direct)){sel.clear();moveSel=null;charge=null}return}
 cv.setPointerCapture(e.pointerId);
 {
  if(moveSel){const k=(y/T|0)*CW+(x/T|0);if(!e.shiftKey&&moveSel.cells.has(k)){const b=moveSel.b;b.glide=[(x/T|0)*T+8,(y/T|0)*T+8];b.ghost=true;b.stuck=false;b.vx=b.vy=0;moveSel=null;sfx('flick');return}moveSel=null}
  const b=bodyAt(X,Y,1)||(X>=0&&Y>=0&&X<W&&Y<H?containerAt(X,Y):null);lastClick={X,Y};
  if(e.shiftKey){if(b&&b.type!=='slab')startDrag(b,x,y,false,true);return}
  const ar=armed();
  if(ar.length&&!(b&&(sel.has(b)||b.kind==='crate'))){charge={t:performance.now(),need:Math.max(...ar.map(o=>srcInfo(o).hold)),x,y,b};holdFire=true;return}
  if(b){if(b.status==='dead'||b.kind==='crate'){clickBody(b,e.ctrlKey||e.metaKey);return}pend={b,x,y,add:e.ctrlKey||e.metaKey};return}
  box={x0:x,y0:y,x1:x,y1:y}}
};
cv.addEventListener('pointerdown',e=>{const a=document.activeElement;if(a&&/INPUT|SELECT/.test(a.tagName))a.blur();boardDown(e)});
// the dark space around the board works like the board: box-select, pan, aim
stage.parentElement.addEventListener('pointerdown',e=>{if(e.target===stage.parentElement||e.target===stage)boardDown(e)});
window.addEventListener('pointermove',e=>{if(pan){cam.x=pan.cx+e.clientX-pan.x;cam.y=pan.cy+e.clientY-pan.y;applyCam();return}const[x,y]=toBoard(e);mouse.x=x;mouse.y=y;mouse.in=inBoard(e);
 hover=mouse.in&&!drag?bodyAt(x|0,y|0,1):null;hoverC=!hover&&mouse.in&&!drag&&(x|0)>=0&&(y|0)>=0&&(x|0)<W&&(y|0)<H?containerAt(x|0,y|0):null;
 if(!drag)for(const b of sel){if(b.type==='slab'||cmdMode(b))continue;if(!srcInfo(b)&&!(b.type==='token'&&b.status==='free'))continue;const a=b.type==='token'?aimA(b,x,y):Math.atan2(y-b.y,x-b.x);if(b.type==='token')turnTo(b,a);else b.faceT=a}
 if(pend&&Math.hypot(x-pend.x,y-pend.y)>2){startDrag(pend.b,pend.x,pend.y);pend=null}
 if(box){box.x1=x;box.y1=y}
 if(drag){drag.tx=x;drag.ty=y;const t=performance.now();drag.smp.push([t,x,y]);while(drag.smp.length>2&&t-drag.smp[0][0]>90)drag.smp.shift();
  const b=drag.b;if(b.type==='weapon'&&!WP[b.kind].gun){const s0=drag.smp[0],dx=x-s0[1],dy=y-s0[2];if(Math.hypot(dx,dy)>3){const a=Math.atan2(dy,dx);let d=a-b.ang;d=Math.atan2(Math.sin(d),Math.cos(d));if(Math.abs(d)>.2)reshape(b,b.ang+d*.6)}}return}
});
window.addEventListener('pointerup',e=>{holdFire=false;if(pan){pan=null;return}if(spinning){spinning=false;return}const add=e.ctrlKey||e.metaKey;
 if(cellDrag){const cd=cellDrag;cellDrag=null;const k=(mouse.y/T|0)*CW+(mouse.x/T|0);if(moveSel&&moveSel.b===cd.b&&moveSel.cells.has(k)){const b=cd.b;b.glide=[(mouse.x/T|0)*T+8,(mouse.y/T|0)*T+8];b.ghost=true;b.stuck=false;b.vx=b.vy=0;moveSel=null;sfx('flick')}return}
 if(charge&&armed().some(o=>{const i=srcInfo(o);return i&&i.heat})&&(performance.now()-charge.t>120||armed().some(o=>o.held&&o.held.k==='sspear'))){fireGroup(mouse.x,mouse.y);charge=null;return}
 if(charge){if(charge.b&&charge.b.type!=='slab'&&charge.b.kind!=='crate'&&Math.hypot(mouse.x-charge.x,mouse.y-charge.y)<3)clickBody(charge.b,add);charge=null;return}
 if(box){const x0=Math.min(box.x0,box.x1),x1=Math.max(box.x0,box.x1),y0=Math.min(box.y0,box.y1),y1=Math.max(box.y0,box.y1);box=null;
  if(x1-x0<3&&y1-y0<3){if(![...sel].some(o=>o.direct)){sel.clear();openCrate=null}return}if(!add)sel.clear();for(const b of bodies)if(b.type==='token'&&b.status!=='dead'&&b.x>=x0&&b.x<=x1&&b.y>=y0&&b.y<=y1)sel.add(b);if(sel.size)sfx('flick');return}
 if(pend){clickBody(pend.b,pend.add);pend=null;return}
 if(!drag)return;const b=drag.b,[x,y]=toBoard(e),grp=drag.group.length>1;
 if(drag.panel){if(!inBoard(e)){remove(b);drag=null;return}b.ghost=false;if(solidHits(b,0,0)&&!nudge(b)){remove(b);drag=null;return}}
 if(drag.free){const g=drag.group;drag=null;if(!inBoard(e)){for(const o of g)remove(o);sfx('whoosh');return}if(EM&&g.length===1&&edGive(g[0]))return;for(const o of g){o.ghost=false;if(solidHits(o,0,0)&&!nudge(o))o.ghost=true}sfx('drop');return}
 const t=performance.now(),s=drag.smp.filter(q=>t-q[0]<80);let vx=0,vy=0;if(s.length>1){const a=s[0],z=s[s.length-1],dt=Math.max(8,z[0]-a[0]);vx=(z[1]-a[1])/dt*23;vy=(z[2]-a[2])/dt*23}
 let sp=Math.hypot(vx,vy);drag=null;if(grp||b.type==='slab')return;
 const onTok=()=>bodyAt(Math.round(x),Math.round(y),2,b,o=>o.type==='token'&&o.status!=='dead');
 if(b.type==='weapon'&&b.kind!=='crate'&&PICK.has(b.kind)&&sp<=1.4){const X=Math.round(x),Y=Math.round(y),c=bodyAt(X,Y,3,b,o=>o.kind==='crate'&&!o.hidden)||(OBJ[Y*W+X]?boxAt(X,Y):null);if(c&&b.fuse){NOPE();b.vx=b.vy=0;return}if(c){cNorm(c);const it={k:b.kind,n:b.kind==='gold'?(b.amt||50):1};if(CAP[b.kind]){it.ammo=b.ammo??CAP[b.kind];it.res=b.res||0}if(cAdd(c,it,X,Y)){remove(b);lastHud='';storeSnd(it.k)}else{NOPE();b.vx=b.vy=0}return}}
 if(b.type==='weapon'&&(WP[b.kind].gun||WP[b.kind].tool||b.kind==='shield'||(WP[b.kind].melee&&sp<=1.4))){const tk=onTok();if(tk){give(tk,b.kind,b.ammo,b.res);remove(b)}return}
 const max=b.type==='weapon'?WP[b.kind].max:24;
 if(sp>1.4){if(sp>max){vx*=max/sp;vy*=max/sp}sfx('whoosh');b.vx=vx;b.vy=vy;b.thrown=true;if(b.type==='weapon')reshape(b,Math.atan2(vy,vx))}});
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(k===' '){if(![...sel].some(o=>o.direct))panKey=true;e.preventDefault();return}
 if(k==='z'){if(!e.repeat)toggleSlow();return}
 if(k==='v'){if(!e.repeat)lookGive([...sel].filter(canOrder),mouse.x,mouse.y,e.shiftKey);return}
 if(k==='shift'){if(!e.repeat)dash();return}
 if(k==='c'){if(!e.repeat)for(const b of sel)if(b.type==='token'&&b.status==='free'){b.crouch=true;b.pc=true}return}
 if((k==='q'||k==='e')&&[...sel].some(o=>o.type==='slab'&&o.free)){keys.add(k);e.preventDefault();return}
 if(k==='q'){for(const b of sel){if(b.type!=='token'||b.status!=='free'||!b.inv)continue;if(b.held){b.psi=b.si;b.si=-1;b.held=null;b.hc=null}else if(b.psi>=0&&b.inv[b.psi])selectSlot(b,b.psi)}sfx('flick');return}
 if(k==='e'&&[...sel].some(b=>b.type==='token'&&b.status==='free'&&(!aiOn||teamOf(b)===aiMe))){const on=![...sel].some(b=>b.direct);for(const b of sel)if(b.type==='token'){b.direct=on;b.ord=null}sfx('flick');return}
 if(k==='escape'||k==='e'){sel.clear();openCrate=null;moveSel=null;charge=null;box=null;closeMenu();return}
 if(k.length===1&&'wasd'.includes(k)){keys.add(k);e.preventDefault();return}
 if(k==='r'){for(const b of sel){const h=b.type==='token'&&b.status!=='free'?null:slot(b);if(h&&CAP[h.k]&&h.ammo<CAP[h.k])reload(b)}return}
 if(k>='1'&&k<='6'){for(const b of sel)if(b.type==='token'&&b.status==='free'&&b.inv)selectSlot(b,+k-1);return}
 if(k==='g'){for(const b of sel)if(b.type==='token'&&b.held)dropHeld(b);return}
 if(k==='t'){sfx('flick');return}
 if(k==='f'){for(const b of sel)if(b.type==='token'){b.side=-(b.side||1);b.hc=null}sfx('flick');return}
 if(k==='delete'||k==='backspace'){for(const b of [...sel])remove(b);e.preventDefault()}});
window.addEventListener('keyup',e=>{if(e.key.toLowerCase()==='c')for(const b of bodies)if(b.pc){b.crouch=false;b.pc=false}if(e.key===' ')panKey=false;keys.delete(e.key.toLowerCase())});
window.addEventListener('blur',()=>{keys.clear();panKey=false;for(const b of bodies)if(b.pc){b.crouch=false;b.pc=false}});

// menu
let menu=null;function closeMenu(){if(menu){menu.remove();menu=null}}
const NAMEP=["Aldo","Bram","Cass","Dell","Edric","Fenn","Gale","Hob","Ivor","Jory","Kell","Lorn","Marl","Ned","Osric","Pike","Quill","Reed","Sim","Tobin","Ulf","Vance","Wat","Yorick","Abel","Brock","Corr","Dunstan","Ewan","Flint","Garth","Hale","Jem","Kit","Lyle","Merrick","Nash","Orrin","Perrin","Rook","Silas","Tam","Wren","Hugh","Bastian","Colm","Davin","Rowan"];
function randName(){const used=new Set(bodies.map(b=>b.name));const f=NAMEP.filter(n=>!used.has(n));const L=f.length?f:NAMEP;return L[Math.random()*L.length|0]}
function dupUnit(b){const c=token(randName(),b.nat,b.unit,b.x+18,b.y,b.guard,b.held?b.held.k:null);c.ang=b.ang;c.look=b.look;c.tone=b.tone;c.auto=b.auto;if(b.held&&b.held.mode)c.held.mode=b.held.mode;c.inv=JSON.parse(JSON.stringify(b.inv||[]));c.si=b.si;c.held=c.si>=0?c.inv[c.si]:null;c.hc=null;if(b.status==='captured'){c.status='captured';c.held=null}if(solidHits(c,0,0)||bodies.some(o=>o!==c&&o.type==='token'&&Math.hypot(o.x-c.x,o.y-c.y)<17)){c.x=b.x;c.y=b.y;for(let r=18;r<60;r+=4){let ok=false;for(let k=0;k<12;k++){const a=k/12*6.283;c.x=b.x+Math.cos(a)*r;c.y=b.y+Math.sin(a)*r;if(!solidHits(c,0,0)&&!bodies.some(o=>o!==c&&o.type==='token'&&Math.hypot(o.x-c.x,o.y-c.y)<17)){ok=true;break}}if(ok)break}}return c}
const setStatus=(b,st)=>{if(st==='free')b.status='free';else if(st==='captured'){b.status='captured';b.held=null;b.inv=[null,null,null,null,null,null];b.si=-1}else{b.status='dead';if(b.held)dropHeld(b)}};
// several units selected: one menu for all of them
function groupMenu(g,e){closeMenu();const r=$('sm').getBoundingClientRect();menu=document.createElement('div');menu.className='menu';menu.style.left=(e.clientX-r.left+4)+'px';menu.style.top=(e.clientY-r.top+4)+'px';
 const it=(t,on,f)=>{const bt=document.createElement('button');bt.textContent=t;if(on)bt.classList.add('on');bt.onclick=()=>{f();closeMenu();lastHud=''};menu.appendChild(bt)};
 const h=document.createElement('div');h.className='mh';h.textContent=g.length+' units';menu.appendChild(h);
 {const tt=g.filter(b=>b.tether&&!b.tether.broken);if(tt.length)it('Untether',0,()=>{for(const b of tt)b.tether=null;sfx('flick')})}
 for(const[st,t]of[['free','Free'],['captured','Captured'],['dead','Dead']])it(t,g.every(b=>b.status===st),()=>{for(const b of g)setStatus(b,st)});
 it('Restore health',0,()=>{for(const b of g)restore(b)});it('Refill ammo',0,()=>{for(const b of g)rearm(b);sfx('reload')});
 it('Duplicate',0,()=>{const cs=g.map(dupUnit);sel.clear();for(const c of cs)sel.add(c)});
 it('Delete',0,()=>{for(const b of g)remove(b)});$('sm').appendChild(menu)}
function openMenu(b,e){if(b.type==='token'&&sel.has(b)&&[...sel].filter(o=>o.type==='token').length>1)return groupMenu([...sel].filter(o=>o.type==='token'),e);closeMenu();const r=$('sm').getBoundingClientRect();menu=document.createElement('div');menu.className='menu';menu.style.left=(e.clientX-r.left+4)+'px';menu.style.top=(e.clientY-r.top+4)+'px';
 const it=(t,on,f,keep)=>{const bt=document.createElement('button');bt.textContent=t;if(on)bt.classList.add('on');bt.onclick=()=>{f(bt);if(!keep)closeMenu()};menu.appendChild(bt);return bt};
 if(b.type==='token'){if(b.tether&&!b.tether.broken)it('Untether',0,()=>{b.tether=null;sfx('flick')});if(b.status==='captured')it('Free',0,()=>b.status='free');else if(b.status!=='dead')it('Capture',0,()=>{b.status='captured';b.held=null;b.inv=[null,null,null,null,null,null];b.si=-1});if(b.status!=='dead')it('Kill',0,()=>{b.status='dead';if(b.held)dropHeld(b)});it('Restore health',0,()=>restore(b));it('Refill ammo',0,()=>{rearm(b);sfx('reload')});it('Delete inventory',0,()=>{b.inv=[null,null,null,null,null,null];b.held=null;b.si=-1;b.hc=null;lastHud='';sfx('flick')});it('Duplicate',0,()=>{const c=dupUnit(b);sel.clear();sel.add(c)});
  it('Rename',0,bt=>{const i=document.createElement('input');i.value=b.name;bt.replaceWith(i);i.focus();i.select();i.onkeydown=ev=>{if(ev.key==='Enter'){b.name=i.value||b.name;b.lab.textContent=b.name;closeMenu()}}},true);
  if(b.held)it('Drop weapon',0,()=>dropHeld(b))}
 if(b.hidden&&b.inv){it('Delete inventory',0,()=>{b.inv=b.inv.map(()=>null);lastHud='';sfx('flick')});$('sm').appendChild(menu);return}
 if((b.kind==='grenade'||b.kind==='bomb')&&!b.fuse)it('Pull pin',0,()=>{b.fuse=150;sfx('pin')});
 if(b.type==='slab'&&!b.free&&!b.fallen){const lv=b.pair?[b,b.pair]:[b];it('Locked',b.locked,()=>{for(const q of lv)q.locked=!b.locked;sfx('lock')});const s=document.createElement('select');for(const n of ['',...Object.keys(NAT)]){const o=document.createElement('option');o.value=n;o.textContent=n?n+' keys':'Auto keys';if((b.keys||'')===n)o.selected=true;s.appendChild(o)}s.onchange=()=>{for(const q of lv)q.keys=s.value||undefined;closeMenu()};menu.appendChild(s)}
 if(b.type==='slab')it('Rotate',0,()=>{b.rot=(b.rot+1)%4;orient(b)});
 it('Delete',0,()=>remove(b));$('sm').appendChild(menu)}
document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target)&&e.target!==cv)closeMenu()});

// ui
const bar=$('bar');
const btn=(t,f)=>{const b=document.createElement('button');b.textContent=t;b.onclick=f;bar.appendChild(b);return b};


const TITLE={bank:'Goldbank · Back room',vault:'Goldbank · The Aurum',count:'Goldbank · Counting house',range:'Astia · Proving yard',council:'Sanctis · Council chamber',road:'Portsbridge · Old road',alley:'Great Keys · Guild alley',stock:"Emperor's Dock · Stockyard"};
btn('Reset',()=>reset());{const sb=btn('Slow-mo (Z)',()=>{slowMo=!slowMo;sb.classList.toggle('on',slowMo)});window.toggleSlow=()=>sb.onclick();setTimeout(()=>bar.appendChild(sb),0)}{const ab=btn('AI',()=>{aiOn=!aiOn;aiMe=null;ab.classList.toggle('on',aiOn);if(!aiOn)for(const b of bodies){b.fogH=false;b.ai=null}aiSetup()})}{const ms=document.createElement('select');for(const[v,n]of[['bank','Goldbank back room'],['vault','Goldbank Aurum heist'],['count','Goldbank counting house'],['range','Astia proving yard'],['council','Sanctis council chamber'],['road','Portsbridge road ambush'],['alley','Great Keys guild alley'],['stock',"Emperor's Dock stockyard"],['blast','Fluoria blast yard'],['pits','The Pits']]){const o=document.createElement('option');o.value=v;o.textContent=n;ms.appendChild(o)}ms.id='msel';ms.onchange=()=>goMap(ms.value);bar.appendChild(ms)}

function icon(px,scale){const c=document.createElement('canvas');c.width=28;c.height=20;const g=c.getContext('2d'),id=g.createImageData(28,20),u=new Uint32Array(id.data.buffer);
 let mx=0,my=0;for(const p of px){mx+=p[0];my+=p[1]}mx/=px.length;my/=px.length;
 for(const p of px){const X=Math.round(14+(p[0]-mx)*scale),Y=Math.round(10+(p[1]-my)*scale);if(X>=0&&Y>=0&&X<28&&Y<20)u[Y*28+X]=p[2]}g.putImageData(id,0,0);return c}
function panelItem(host,name,ic,make){const d=document.createElement('div');d.appendChild(ic);d.appendChild(document.createTextNode(name));
 d.addEventListener('pointerdown',e=>{au();e.preventDefault();const[x,y]=toBoard(e);charge=null;const b=make(x,y);startDrag(b,x,y,true)});host.appendChild(d)}
for(const k of ['rod','pgun','sspear','musket','blunder','pistol','spear','bomb','grenade']){const w=WP[k];panelItem($('wp'),w.n,icon(shape(k,0),k==='spear'?.6:1),(x,y)=>weapon(k,x,y,0))}
panelItem($('cov'),'Wood slab',icon(slabPix(2),1),(x,y)=>barricade(2,x,y));for(const mat of['pine','teak'])panelItem($('cov'),memb('Wood',mat).n+' slab',icon(slabPix(2).map(q=>{const w=woodT(q[8]+93,q[9],memb('Wood',mat).c,13);return[q[0],q[1],rgb(cl(w[0]),cl(w[1]),cl(w[2]))]}),1),(x,y)=>barricade(2,x,y,16,8,mat));
for(const mat in ELEM.Metal.mats){const n=memb('Metal',mat).n,tint=px=>mat==='steel'?px:px.map(q=>{q=q.slice();q[2]=toneC(mat,q[2]);return q});panelItem($('cov'),n+' slab',icon(tint(slabPix(3)),1),(x,y)=>barricade(3,x,y,16,8,mat));panelItem($('cov'),'Heavy '+n.toLowerCase()+' slab',icon(tint(slabPix(3,32,8)),.8),(x,y)=>barricade(3,x,y,32,8,mat))}

// people
const fu=$('fu'),fnat=$('fnat'),fw=$('fw'),tp=$('tp');
// marker roster: civilians first, then each class under its own side's name
const CIVS=['Peasant','Merchant','Priest','Noble'];
const CLSU={Civilian:'civ',Base:'home',Riflemen:'rifle',Heavy:'guard',Shock:'shock',Commando:'cmd',Rogue:'home','Tier 1':'home','Tier 2':'rifle','Tier 3':'guard',Guard:'home'};
const ROSTER={};for(const[f,L]of Object.entries(WARD.FACTIONS))ROSTER[f]=L.map(n=>[n,CLSU[WARD.CLS[n]]||'civ',WARD.nm(n)!==n?WARD.nm(n):undefined]);
// neutrals reuse faction civilian looks under plain trade names (worn in muted colours)
ROSTER.Neutrals=[...CIVS.map(n=>[n,'civ']),['Townsman','civ','Commoner'],['Fisherman','civ','Sailor'],['Labourer','civ','Dockhand'],['Sea captain','civ','Harbourmaster'],['Trader','civ','Merchant'],['Bookkeeper','civ','Company Clerk'],['Scribe','civ','Clerk'],['Steward','civ','Head Clerk'],['Moneylender','civ','Banker'],['Magnate','civ','Bank Lord']].map(([n,u,l])=>[l||n,u,n]);
{const o=document.createElement('option');o.value='';o.textContent='Unarmed';fw.appendChild(o)}for(const[gn,ks]of[['Spears',['spear','sspear']],['Firearms',['pistol','blunder','musket']],['Heavy arms',['pgun','rod']]]){const g=document.createElement('optgroup');g.label=gn;for(const k of ks){const o=document.createElement('option');o.value=k;o.textContent=WP[k].n;g.appendChild(o)}fw.appendChild(g)}
for(const n of ['Neutrals',...Object.keys(ROSTER).filter(n=>n!=='Neutrals')]){const o=document.createElement('option');o.textContent=n;fnat.appendChild(o)}
const fnatv=()=>fnat.value==='Neutrals'?null:fnat.value,fsel=()=>(ROSTER[fnat.value]||[])[+fu.value]||['Peasant','civ'];
function fillTypes(){fu.innerHTML='';const R=ROSTER[fnat.value]||[];for(const[gn,civ]of[['Military',false],['Civilians',true]]){const ix=R.map((e,i)=>i).filter(i=>(R[i][1]==='civ')===civ);if(!ix.length)continue;const g=document.createElement('optgroup');g.label=gn;for(const i of ix){const o=document.createElement('option');o.value=i;o.textContent=R[i][2]||R[i][0];g.appendChild(o)}fu.appendChild(g)}fu.value=fu.options[0]?fu.options[0].value:0;setArms()}
function setArms(){const[l,u]=fsel(),nat=fnatv(),lk=lookOf({look:l,nat,unit:u});let k=LOOKKIT[l]!==undefined?LOOKKIT[l]:KITL[lk]?KITL[lk][0]:KIT[nat]&&KIT[nat][u];if(typeof k==='function')k=k({})||'spear';fw.value=k!==undefined?k||'':UNITS[u].w||'';fw.dataset.def=fw.value;preview()}
function preview(){const[l,un]=fsel(),g=tp.getContext('2d'),id=g.createImageData(17,17),u=new Uint32Array(id.data.buffer),t={type:'token',ang:Math.PI/2,look:l,unit:un,nat:fnatv(),guard:false,tone:pTone},px=tokPixels(t),set=new Set(px.map(p=>K(p[0],p[1])));
 for(const p of px){let c=pcol(t,p);if(c===0)continue;if(!sprG(lookOf(t))&&(!set.has(K(p[0]+1,p[1]))||!set.has(K(p[0]-1,p[1]))||!set.has(K(p[0],p[1]+1))||!set.has(K(p[0],p[1]-1))))c=mul(c,.36);u[(p[1]+8)*17+p[0]+8]=c}g.putImageData(id,0,0)}
let pTone=Math.random()*NHUE.length|0;function rollTone(){let n;do n=Math.random()*NHUE.length|0;while(n===pTone);pTone=n;preview()}
{const dc=$('dice'),g=dc.getContext('2d');g.fillStyle='#d8d4c8';g.fillRect(0,0,9,9);g.fillStyle='#262626';for(const[x,y]of[[1,1],[6,1],[3.5,3.5],[1,6],[6,6]]){g.fillRect(Math.round(x),Math.round(y),2,2)}dc.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();rollTone()})}
const diceVis=()=>{$('dice').style.display=fnatv()?'none':''};
let mkSynced=null;
function syncMarker(b){const f=SIDE[b.nat]||b.nat||'Neutrals';if(!ROSTER[f])return;fnat.value=f;fillTypes();diceVis();const R=ROSTER[f],l=lookOf(b)||b.look;let i=R.findIndex(e=>e[0]===l&&e[1]===b.unit);if(i<0)i=R.findIndex(e=>e[0]===l);if(i<0)i=R.findIndex(e=>e[1]===b.unit);if(i>=0){fu.value=i;setArms()}
 const w=b.inv&&b.inv[0]&&b.inv[0].k;fw.value=w&&[...fw.options].some(o=>o.value===w)?w:'';$('fn').value=b.name;if(!b.nat)pTone=(b.tone??((b.id||0)*5+3))%NHUE.length;preview()}
fu.onchange=setArms;fw.onchange=preview;fillTypes();fnat.onchange=()=>{fillTypes();diceVis()};diceVis();
$('tpr').addEventListener('pointerdown',e=>{au();e.preventDefault();const[x,y]=toBoard(e);charge=null;const[l,un]=fsel(),b=token($('fn').value||'Unnamed',fnatv(),un,x,y,false,fw.value===fw.dataset.def&&fw.value?undefined:fw.value||null,l);b.tone=pTone;rollTone();startDrag(b,x,y,true)});
for(const sc of document.querySelectorAll('#sm .sec')){const k='bsx:'+sc.dataset.k;try{if(localStorage.getItem(k)==='1')sc.classList.add('closed')}catch(e){}sc.querySelector('.sh').onclick=()=>{sc.classList.toggle('closed');try{localStorage.setItem(k,sc.classList.contains('closed')?'1':'0')}catch(e){}}}

function dbl(m,x1,y1,x2,y2,r1,r2,lk,len,th){const a=slab(m,x1,y1,r1,len,th),b=slab(m,x2,y2,r2,len,th);a.pair=b;b.pair=a;a.locked=b.locked=lk;return[a,b]}
function goldify(d){d.gold=true;for(const p of d.px)p[2]=toneC('gold',p[2])}
const MAPSZ={council:[24,16],road:[30,18],alley:[22,10],stock:[26,16],count:[44,26],vault:[30,47],range:[40,40],air:[34,20]};
function reset(){ds0Need=true;EDG.clear();{const sz=MAPSZ[curMap]||[18,14];if(sz[0]!==CW||sz[1]!==CH){alloc(sz[0],sz[1]);LR=new Float32Array(NB);LG=new Float32Array(NB);LB=new Float32Array(NB);LT=new Float32Array(NB);camInit=true}setTimeout(fit,0)}for(const b of bodies)if(b.lab)b.lab.remove();bodies=[];parts=[];drag=null;charge=null;box=null;moveSel=null;sel.clear();build();HZ.fill(0);hzOn=false;if(NUM[curMap]){NUM[curMap]();for(const t of bodies)if(t.type==='token')t.hc=null;return}if(curMap==='air'){unitsAir();for(const t of bodies)if(t.type==='token')t.hc=null;return}if(curMap==='range'){unitsRange();for(const t of bodies)if(t.type==='token')t.hc=null;return}if(curMap==='count'){unitsCount();for(const t of bodies)if(t.type==='token')t.hc=null;return}if(curMap==='vault'){unitsVault();for(const t of bodies)if(t.type==='token')t.hc=null;return}
 token('Aldric','Goldbank','guard',36,40,true);token('Bryn','Goldbank','rifle',62,40);token('Pell','Goldbank','rifle',88,40);
 token('Orla','Goldbank','home',28,82);token('Rook','Goldbank','cmd',28,150).leader=true;token('Tam','Goldbank','shock',150,150);token('Hask','Goldbank','shock',150,186);
 const c=token('Corin',null,'civ',90,180);c.status='captured';c.held=null;
 const v=token('Varn','Imperium','shock',226,56);v.ang=Math.PI;const k=token('Kade','Imperium','shock',262,72);k.ang=Math.PI;
 const m=token('Mira','Imperium','cmd',228,150);m.ang=Math.PI;const i=token('Ivo','Imperium','civ',206,196,false,'pistol');i.look='Officer';i.leader=true;i.ang=Math.PI;const se=token('Sela','Imperium','home',258,196);se.ang=Math.PI;
 const d=token('Dunn','Imperium','rifle',262,136,false,null);d.status='dead';weapon('musket',248,124,2.4);
 slab(2,180,32,1);dbl(3,180,96,187,127,1,3,false);dbl(3,224,171,255,164,0,2,true);
 weapon('grenade',120,196,0);weapon('bomb',60,200,0);weapon('sspear',236,104,.3);
 for(const t of bodies)if(t.type==='token')t.hc=null}
const NAMED={count:{'Lord Vane':'Bank Lord','Archivist Lell':'Head Clerk','Master Orsk':'Banker',Corvo:'Reaper'},vault:{'Master Corwin':'Banker','Manager Vance':'Bank Lord',Dorran:'Merchant',Lyse:'Noble',Sora:'Noble',Merrit:'Merchant'},bank:{}};
{const r0=reset;reset=function(){r0();setTimeout(aiSetup,0);for(const t of bodies)if(t.type==='token'&&NAMED[curMap]&&NAMED[curMap][t.name])t.look=NAMED[curMap][t.name];snapDoors();sills();arrivals();exitLabels();alarm=curMap==='range';if(!alarm)for(const t of bodies)if(t.type==='token'&&t.held){t.psi=t.si;t.si=-1;t.held=null;t.hc=null}}}
reset();loop();
