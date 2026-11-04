// screen: map with a brass clock corner, tool panel on the right, popups for occasional work
const UI={tool:LS.get('bs.tool','hand'),st:LS.get('bs.st','units'),tt:'tiles',drop:null,pop:null};let PAUSED=true;
const UT=[['hand','Hand of God',null],['spawn','Spawner',null],['tile','Tiler','map'],['sign','Sign','map'],['paint','Painter','map'],['vac','Vacuum','map'],['sponge','Sponge','map'],['wand','Wand','map'],['teth','Tether',null]];
const UIC={
 hand:[['....kk.kk...','...kwwkwwk..','...kwwkwwkk.','.kkkwwkwwkwk','kwwkwwwwwkwk','kwwwwwwwwwwk','.kwwwwwwwwwk','..kwwwwwwwk.','...kwwwwwk..','....kkkkk...'],{k:'#111',w:'#e8d2b0'}],
 spawn:[['....kkkk....','...kggggk...','...kgyygk...','...kggggk...','....kkkk..yy','...kggggk.yy','..kggggggkyy','..kggggggk..','..kggggggk..','...kkkkkk...'],{k:'#111',g:'#2f5f45',y:'#ffd84a'}],
 tile:[['kkkkkkkkkkkk','kaakaakbbkbk','kaakaakbbkbk','kkkkkkkkkkkk','kbbkbbkaakak','kbbkbbkaakak','kkkkkkkkkkkk','kaakaakbbkbk','kaakaakbbkbk','kkkkkkkkkkkk'],{k:'#2e2c28',a:'#b5a27c',b:'#8a857c'}],
 sign:[['.kkkkkkkkkk.','kwwwwwwwwwwk','kwwkwwwwwwwk','kwkwkwkkwwwk','kwkwwkwwkwkk','kwwwwwwwwkwk','.kkkkkkkkkk.','.....kk.....','.....kk.....','.....kk.....'],{k:'#3a2a18',w:'#d8b878'}],
 paint:[['.........kk.','........kgk.','.......kgk..','......kgk...','.....kgk....','....bbk.....','...rrbb.....','..rrrb......','.rrr........','.rr.........'],{k:'#111',g:'#b08a5a',b:'#5a3c22',r:'#b02a2a'}],
 vac:[['y...........','kk..........','.kgk........','..kgk.......','...kgk......','....kggk....','.....kgggk..','......kgggk.','.......kgggk','........kggk'],{y:'#ffd84a',k:'#111',g:'#8c9298'}],
 sponge:[['.kkkkkkkkkk.','kyyyyyyyyyyk','kyoyyyyoyyyk','kyyyyoyyyyyk','kyoyyyyyoyyk','kyyyoyyyyyyk','.kkkkkkkkkk.'],{y:'#f2d04a',o:'#c79a26',k:'#3a2e10'}],
 wand:[['w.w.........','.y..........','w.k.........','...k........','....k.......','.....b......','......b.....','.......b....','........b...','.........b..'],{y:'#ffe066',w:'#fff6c8',k:'#d8d0c0',b:'#5a3c22'}],
 teth:[['...kkkkk....','..kbbbbbk...','.kbk...kbk..','.kbk...kbk..','..kbbbbbk...','...kkkbk....','......kbk...','.......kbk..','........kbk.','.........kk.'],{k:'#2a1c10',b:'#a07848'}],
 drop:[['........bbb.','.......bbbbb','.......bbbbb','......kbbbb.','.....kwkbb..','....kwk.....','...kwk......','..kwk.......','.kk.........','k...........','............','d...........','dd..........'],{b:'#b23a3a',w:'#a8d0e0',k:'#c9c5b8',d:'#5f8ad0'}],
 reset:[['..kkkkk..','.k.....k.','k.......k','k......kkk','k.......k.','k.........','.k.....k..','..kkkkk...'],{k:'#fff'}]};
function pix(rows,pal,s=2){const c=mk('canvas'),w=Math.max(...rows.map(r=>r.length));c.width=w;c.height=rows.length;c.style.cssText=`width:${w*s}px;height:${rows.length*s}px;image-rendering:pixelated`;const g=c.getContext('2d');rows.forEach((r,y)=>[...r].forEach((ch,x)=>{if(pal[ch]){g.fillStyle=pal[ch];g.fillRect(x,y,1,1)}}));return c}
const uicon=k=>pix(...UIC[k]);
const ubtn=(t,cls,f)=>{const b=mk('button',cls,t);if(f)b.onclick=f;return b};

// clock: brass rim (the game's brass texture), an earth face, hour notches; the hands tick while time runs
function clockSvg(){const N=25,c=12,R=12,o=[],B=['#e6bc69','#b89654','#81693b','#534426'],nrm=(x,y)=>Math.max(Math.abs(x),Math.abs(y),(Math.abs(x)+Math.abs(y))/1.3),
  land=(x,y)=>Math.sin(x*.8+1.3)+Math.cos(y*.95-.4)+Math.sin((x+y)*.5)>.9,r=(x,y,f)=>o.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${f}"/>`);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const d=nrm(x-c,y-c);if(d>R+.4)continue;let f;
  if(d>R-2.2){const l=-Math.cos(Math.atan2(y-c,x-c)+Math.PI/4);f=l>.45?B[0]:l>-.3?B[1]:l>-.75?B[2]:B[3]}else if(d>R-3)f='#2a2010';
  else{f=land(x,y)?((x+y)%3?'#4f7a3a':'#8a7a3a'):((x*7+y*3)%5?'#123a6a':'#1e5a9a');if(d>R-4.4&&(x*3+y)%4===0)f='#2f8ac0'}r(x,y,f)}
 for(let k=0;k<12;k++){const a=k*Math.PI/6,dx=Math.sin(a),dy=-Math.cos(a),q=(R-4.2)/nrm(dx,dy);for(const s of k%3?[q]:[q,q-1])r(Math.round(c+s*dx),Math.round(c+s*dy),'#fff')}
 return`<svg class="clk" viewBox="0 0 ${N} ${N}" width="75" height="75" shape-rendering="crispEdges">${o.join('')}<g class="h1"><rect x="12" y="5" width="1" height="7" fill="#fff"/><rect x="12" y="5" width="1" height="1" fill="#e0533f"/></g><g class="h2"><rect x="12" y="8" width="1" height="4" fill="#d8d4c8"/></g><rect x="12" y="12" width="1" height="1" fill="${B[0]}"/></svg>`}

// ui sounds: soft tick on hover, deep click on press, lighter click on release
const US={};{const R=(a,b)=>a+Math.random()*(b-a);
 const burst=(t,d,f,q,g,ty='bandpass')=>{const a=au(),n=a.createBuffer(1,a.sampleRate*d|0,a.sampleRate),x=n.getChannelData(0);for(let i=0;i<x.length;i++)x[i]=(Math.random()*2-1)*Math.pow(1-i/x.length,4);const s=a.createBufferSource(),fl=a.createBiquadFilter(),v=a.createGain();s.buffer=n;fl.type=ty;fl.frequency.value=f;fl.Q.value=q;v.gain.value=g;s.connect(fl).connect(v).connect(a.destination);s.start(a.currentTime+t)};
 const tn=(t,f,d,g)=>{const a=au(),o=a.createOscillator(),v=a.createGain(),T0=a.currentTime+t;o.type='triangle';o.frequency.setValueAtTime(f,T0);o.frequency.exponentialRampToValueAtTime(f*.6,T0+d);v.gain.setValueAtTime(g,T0);v.gain.exponentialRampToValueAtTime(.0001,T0+d);o.connect(v).connect(a.destination);o.start(T0);o.stop(T0+d)};
 const ok=()=>typeof gest==='undefined'||gest;
 US.hover=()=>{if(AC)burst(0,.012,R(3200,4800),R(2,4),R(.03,.06))};
 US.press=()=>{burst(0,.03,R(900,1200),1.2,.18,'lowpass');tn(0,R(170,200),.05,.12)};
 US.release=()=>{burst(0,.018,R(1800,2400),2,.1);tn(0,R(520,600),.025,.04)};
 US.clock=()=>{burst(0,.02,2600,3,.2);burst(.035,.018,3400,4,.16);burst(.07,.04,1400,1.5,.12,'lowpass');tn(.03,1650,.14,.05)};
 let held=null;const key=e=>e.target.closest&&e.target.closest('#sm button,#sm select,#sm .ub');
 document.addEventListener('pointerover',e=>{const b=key(e);if(b&&!b.contains(e.relatedTarget))US.hover()});
 document.addEventListener('pointerdown',e=>{const b=key(e);if(!b)return;held=b;if(!b.classList.contains('clkb'))US.press()},true);
 document.addEventListener('pointerup',()=>{if(held){if(!held.classList.contains('clkb'))US.release();held=null}},true)}

// layout
const SM=$('sm'),SIDE0=document.querySelector('#sm .side'),VIEW=$('stage').parentElement;
const ZT=mk('div','zone zt'),ZC=mk('div','zone zc'),ZS=mk('div','zone zs');
{const g=mk('div','tgrid');for(const[k,n]of UT){const b=ubtn('','tb',()=>pickTool(k));b.dataset.k=k;b.append(uicon(k),mk('span',null,n));g.append(b)}ZT.append(g)}
const TH=mk('div','ch');ZC.append(TH,...SIDE0.children);SIDE0.append(ZT,ZC,ZS);
VIEW.append(mk('div','frame'));
// tool header with optional dropper
function head(k){TH.innerHTML='';const n=UT.find(t=>t[0]===k)[1];TH.append(uicon(k),mk('span',null,n));if(k==='tile'||k==='spawn'){const d=ubtn('','drp',()=>armDrop(k));d.append(uicon('drop'));d.classList.toggle('on',UI.drop===k);TH.append(d)}}

// settings zone: map, save, popups
{const ms=$('msel');ms.classList.add('wide');const sv=ubtn('Save','',x=>{mapSave(false);flashB(sv,'Saved')});
 const ae=ubtn('Asset Editor','lite',()=>togglePop('ae')),st=ubtn('Map settings','lite',()=>togglePop('map'));ae.id='bae';st.id='bms';
 const r=mk('div','g2');r.append(ae,st);ZS.append(ms,sv,r)}

// corner: clock, reset, slow-mo, map sigil
const CORN=mk('div','corner');{
 const ck=mk('div','ub clkb oct');ck.innerHTML=clockSvg();ck.onclick=()=>{US.clock();setPlay(PAUSED)};
 const rs=mk('div','ub sq red');rs.append(uicon('reset'));rs.onclick=()=>reset();
 const sl=mk('div','ub sq slow','1×');sl.onclick=()=>window.toggleSlow();
 const sg=mk('div','ub sq sig');sg.onclick=()=>togglePop('map');
 CORN.append(ck,rs,sl,sg);VIEW.append(CORN)}
function setPlay(on){PAUSED=!on;if(on&&!aiOn&&!EM)aiBtn().click();syncCorner()}
function sigil(){const o=MAPOWN(),c=NAT[o]||'#8a8580',h=n=>parseInt(c.slice(n,n+2),16),s=CORN.querySelector('.sig');s.innerHTML='';s.append(pix(['gggggggg','gggggggg','ggyyyygg','gyyddyyg','gydyydyg','gydyydyg','gyyddyyg','ggyyyygg','gggggggg','gg.gg.gg','g......g'],{g:css(mix(rgb(26,26,26),rgb(h(1),h(3),h(5)),.55)),y:c,d:css(mix(rgb(26,26,26),rgb(h(1),h(3),h(5)),.3))},2));s.title=o}
function syncCorner(){CORN.classList.toggle('paused',PAUSED);CORN.classList.toggle('slowing',slowMo);const s=CORN.querySelector('.slow');s.textContent=slowMo?'½×':'1×';s.classList.toggle('on',slowMo)}
setInterval(syncCorner,200);
{const u1=update;let hc=0;update=function(){if(PAUSED&&!EM){if(drag)dragStep();if(++hc%6===0)hud();return}u1()}}

// map owner: the sigil, and who holds the keys to doors with no keys of their own
const OWN={};function MAPOWN(){if(OWN[curMap])return OWN[curMap];const m=MODS.maps[curMap];if(m&&m.owner)return m.owner;const t=(TITLE[curMap]||'').split(' · ')[0];return NAT[t]!==undefined?t:/Emperor/.test(t)?'Imperium':'Neutral'}
{const s0=serMap;serMap=function(){const d=s0();d.owner=MAPOWN();d.signs=(SIGNS[curMap]||[]).map(s=>({...s}));return d}}

// tools
function pickTool(k){if(UI.pop==='ae')closePop();UI.tool=k;LS.set('bs.tool',k);UI.drop=null;const m=UT.find(t=>t[0]===k)[2];setMode(m);SM.dataset.tool=k;
 for(const b of ZT.querySelectorAll('.tb'))b.classList.toggle('on',b.dataset.k===k);
 if(k==='vac'||k==='sponge'||k==='wand')edBrush={t:'clean',k};else if(k==='tile')edBrush=UI.tile?{...UI.tile}:null;else if(m)edBrush=null;
 head(k);if(k==='tile')tilerCtx();if(k==='spawn')spawnCtx();if(k==='paint')paintCtx();if(k==='sign')signCtx();cv.style.cursor=k==='vac'||k==='sponge'||k==='wand'?TOOLCUR[k]||'crosshair':m?'crosshair':CUR.arrow}
{const s0=setMode;setMode=function(m){s0(m);SM.dataset.tool=UI.tool;if(m==='map')for(const id of['ed-fu','ed-dr'])$(id)&&TCX.append($(id))}}

// tiler: element tabs, a swatch per material and variation, name and floor or wall
const TCX=mk('div','tcx');ZC.append(TCX);
function tilerCtx(){TCX.innerHTML='';const tabs=mk('div','tabs');for(const[t,n]of[['tiles','Tiles'],['furn','Furniture'],['door','Doors']]){const b=ubtn(n,UI.tt===t?'on':'',()=>{UI.tt=t;tilerCtx()});tabs.append(b)}TCX.append(tabs);SM.dataset.tt=UI.tt;
 if(UI.tt==='tiles'){const mods=Object.keys(MODS.tex).filter(k=>!furnK(k)),els=[...EORDER,...(mods.length?['Mods']:[])],et=mk('div','tabs');
  for(const e of els)et.append(ubtn(e,PK.el===e?'on':'',()=>{PK.el=e;if(e!=='Mods'){PK.mat=Object.keys(ELEM[e].mats)[0];PK.v=Object.keys(varsOf(e,PK.mat))[0]}else PK.mat=mods[0];tilerCtx()}));TCX.append(et);
  const g=mk('div','swg'),cur=UI.tile&&UI.tile.k,cell=k=>{const s=mk('span','sw'+(k===cur?' on':''));if(k&&validK(k)){s.append(swatch(bake(k),30,30));s.onclick=()=>{setTile(k)}}else s.classList.add('no');return s};
  if(PK.el==='Mods')for(const k of mods)g.append(cell(k));else for(const mat of Object.keys(ELEM[PK.el].mats))for(const v of Object.keys(varsOf(PK.el,mat)).slice(0,7))g.append(cell(PK.el.toLowerCase()+'.'+mat+'.'+v+(PK.w?'.w':'')));
  TCX.append(g);const r=mk('div','nm'),nb=mk('div','tbox',cur?tName(cur):''),w=dsel([['0','Floor'],['1','Wall']],String(PK.w||0),v=>{PK.w=+v;if(cur&&CATN[cur]){const[el,mat,vv]=CATN[cur];setTile(el.toLowerCase()+'.'+mat+'.'+vv+(PK.w?'.w':''),true)}else tilerCtx()});r.append(nb,w);TCX.append(r)}
 TCX.append(...['ed-fu','ed-dr'].map(id=>$(id)).filter(Boolean));
 TCX.append(form([['Brush',dsel([['1','1×1'],['2','2×2'],['3','3×3']],String(edSize),v=>edSize=+v)]]))}
function setTile(k,keep){if(!validK(k))return;pkFrom(k);UI.tile={t:'tile',k};edBrush={t:'tile',k};addRecent(k);if(!keep)UI.tt='tiles';tilerCtx()}
{const p0=fillMapTools;fillMapTools=function(){p0();if(edBrush&&edBrush.t!=='clean')UI.tile={...edBrush}}}

// small form helpers
function dsel(opts,v,f){const s=mk('select');for(const[k,n]of opts){const o=mk('option',null,n);o.value=k;s.append(o)}s.value=v;s.onchange=()=>f(s.value);return s}
function tbox(v,f,type='text'){const i=mk('input');i.type=type;i.value=v;i.onchange=()=>f(i.value);return i}
function chk(on,f){const c=mk('span','ck ub'+(on?' on':''));c.onclick=()=>{c.classList.toggle('on');f(c.classList.contains('on'))};return c}
function form(rows){const f=mk('div','frm');for(const[l,c]of rows)f.append(mk('span','fl',l),c);return f}

// spawner: tabs, side, unit list with the arms drop-down in the chosen row
for(const g of [...fw.querySelectorAll('optgroup')]){g.replaceWith(...g.children)}
const SCX=mk('div','scx');ZC.append(SCX);
function unitPx(i){const R=ROSTER[fnat.value]||[],[l,un]=R[i]||['Peasant','civ'],c=mk('canvas');c.width=c.height=17;const g=c.getContext('2d'),id=g.createImageData(17,17),u=new Uint32Array(id.data.buffer),t={type:'token',ang:-Math.PI/2,look:l,unit:un,nat:fnatv(),guard:false,tone:pTone},px=tokPixels(t),set=new Set(px.map(p=>K(p[0],p[1])));
 for(const p of px){let q=pcol(t,p);if(q===0)continue;if(!sprG(lookOf(t))&&(!set.has(K(p[0]+1,p[1]))||!set.has(K(p[0]-1,p[1]))||!set.has(K(p[0],p[1]+1))||!set.has(K(p[0],p[1]-1))))q=mul(q,.36);u[(p[1]+8)*17+p[0]+8]=q}g.putImageData(id,0,0);return c}
function spawnCtx(){SCX.innerHTML='';SM.dataset.st=UI.st;const tabs=mk('div','tabs');for(const[t,n]of[['units','Units'],['wp','Weapons'],['it','Items'],['cov','Cover']])tabs.append(ubtn(n,UI.st===t?'on':'',()=>{UI.st=t;LS.set('bs.st',t);spawnCtx()}));SCX.append(tabs);
 if(UI.st!=='units')return;fnat.classList.add('wide');SCX.append(fnat);const L=mk('div','ulist');
 for(const o of fu.options){const i=+o.value,r=mk('div','urow'+(String(i)===fu.value?' on':''));r.append(unitPx(i),mk('span','n',o.textContent));
  if(String(i)===fu.value)r.append(fw);r.onpointerdown=e=>{if(e.target===fw||e.button)return;if(fu.value!==String(i)){fu.value=i;setArms();spawnCtx()}e.preventDefault();$('tpr').dispatchEvent(new PointerEvent('pointerdown',{clientX:e.clientX,clientY:e.clientY,bubbles:true}))};L.append(r)}
 SCX.append(L)}
{const f0=fnat.onchange;fnat.onchange=()=>{f0();spawnCtx()}}

// dropper: Tiler copies a tile, Spawner copies a unit and places copies until Esc
const GHO=mk('canvas','ghost');GHO.width=GHO.height=17;document.body.append(GHO);
function armDrop(k){UI.drop=UI.drop===k?null:k;UI.place=false;GHO.style.display='none';head(k);cv.style.cursor=UI.drop?'copy':k==='tile'?'crosshair':CUR.arrow}
VIEW.addEventListener('pointerdown',e=>{if(!UI.drop||e.button||!inBoard(e))return;const[x,y]=toBoard(e);e.stopPropagation();e.preventDefault();
 if(UI.drop==='tile'){const s=srcNow(),k=s[y/T|0]&&s[y/T|0][x/T|0];if(k){if(furnK(k)){UI.tt='furn';UI.tile={t:'tile',k};edBrush={t:'tile',k};tilerCtx()}else setTile(k)}armDrop('tile');return}
 if(UI.place){$('tpr').dispatchEvent(new PointerEvent('pointerdown',{clientX:e.clientX,clientY:e.clientY,bubbles:true}));return}
 const b=bodyAt(x|0,y|0,6,null,o=>o.type==='token');if(!b)return;syncMarker(b);UI.st='units';spawnCtx();UI.place=true;GHO.getContext('2d').drawImage(tp,0,0);GHO.style.display='block'},true);
window.addEventListener('pointermove',e=>{if(GHO.style.display==='block'){GHO.style.left=e.clientX-17*S/2+'px';GHO.style.top=e.clientY-17*S/2+'px';GHO.style.width=GHO.style.height=17*S+'px'}});

// painter: decals on the floor
const PNT={k:LS.get('bs.dec','blood'),size:2,str:2},DEC=[['blood','Blood','#7a0a10'],['scorch','Scorch','#2a2018'],['soot','Soot','#4a4a4a'],['dirt','Dirt','#6a5a3a'],['water','Water','#3a5a7a'],['paint','Paint','#b5a27c']];
const PCX=mk('div','pcx');ZC.append(PCX);
function paintCtx(){PCX.innerHTML='';const L=mk('div','ulist');for(const[k,n,c]of DEC){const r=mk('div','urow'+(PNT.k===k?' on':''));const s=mk('span','swd');s.style.background=c;r.append(s,mk('span','n',n));r.onclick=()=>{PNT.k=k;LS.set('bs.dec',k);paintCtx()};L.append(r)}
 PCX.append(L,form([['Size',dsel([['1','1×1'],['2','2×2'],['3','3×3']],String(PNT.size),v=>PNT.size=+v)],['Strength',dsel([['1','Light'],['2','Medium'],['3','Heavy']],String(PNT.str),v=>PNT.str=+v)]]))}
let PDN=false;
function daub(x,y){const R=3+PNT.size*4,a=PNT.str*.12,c={dirt:rgb(84,66,44),paint:rgb(181,162,124),soot:rgb(30,28,26)}[PNT.k];
 if(PNT.k==='water'){wetAt(x,y,R);return}
 for(let Y=Math.floor((y-R)/2);Y<=(y+R)/2;Y++)for(let X=Math.floor((x-R)/2);X<=(x+R)/2;X++){if(X<0||Y<0||X>=BW||Y>=BH)continue;const d=Math.hypot(X*2+1-x,Y*2+1-y)/R;if(d>1)continue;const q=Y*BW+X,f=a*(1-d*d)*(.6+Math.random()*.8);
  if(PNT.k==='blood')FX.blood[q]=Math.min(1,FX.blood[q]+f);else if(PNT.k==='scorch')BURN[q]=Math.min(1,BURN[q]+f);
  else for(let j=0;j<4;j++){const p=(Y*2+(j>>1))*W+X*2+(j&1);if(sol[p])continue;if(OBJ[p])OBJC[p]=mix(OBJC[p],c,f*.6);else floor[p]=mix(floor[p],c,f*.6)}}
 ds0Need=true;fxDirty=true;solDirty=true}
VIEW.addEventListener('pointerdown',e=>{if(UI.tool!=='paint'||UI.drop||e.button||!inBoard(e))return;e.stopPropagation();e.preventDefault();PDN=true;const[x,y]=toBoard(e);daub(x,y)},true);
window.addEventListener('pointermove',e=>{if(PDN&&UI.tool==='paint'){const[x,y]=toBoard(e);daub(x,y)}});window.addEventListener('pointerup',()=>PDN=false);

// signs: a marker with a note; hover shows it, double-click edits
const SIGNS={};const SL=mk('div','signs');$('stage').append(SL);let sgS=0,sgM='';
function drawSigns(){SL.innerHTML='';for(const s of SIGNS[curMap]||[]){const m=mk('div','sgn');m.style.left=s.x*S+'px';m.style.top=s.y*S+'px';m.append(uicon('sign'));if(s.t){const t=mk('div','sgt',s.t);m.append(t)}m.ondblclick=e=>{e.stopPropagation();editSign(s)};m.onpointerdown=e=>e.stopPropagation();SL.append(m)}sgS=S;sgM=curMap}
{const r0=render;render=function(){r0();if(sgS!==S||sgM!==curMap)drawSigns()}}
{const s0=spawnMap;spawnMap=function(d){s0(d);if(d.signs)SIGNS[curMap]=d.signs.map(s=>({...s}));if(d.owner)OWN[curMap]=d.owner;sgM=''}}
function signCtx(){}
VIEW.addEventListener('pointerdown',e=>{if(UI.tool!=='sign'||e.button||!inBoard(e))return;e.stopPropagation();e.preventDefault();const[x,y]=toBoard(e),s={x:Math.round(x),y:Math.round(y),t:''};(SIGNS[curMap]=SIGNS[curMap]||[]).push(s);drawSigns();editSign(s)},true);
function editSign(s){const t=mk('textarea','tbox');t.value=s.t;const del=ubtn('Delete','',()=>{SIGNS[curMap]=(SIGNS[curMap]||[]).filter(q=>q!==s);closePop();drawSigns()}),ok=ubtn('Done','',()=>{s.t=t.value.trim();closePop();if(!s.t)del.onclick();else drawSigns()});
 const r=mk('div','g2');r.append(del,ok);openPop('sign','Sign',[t,r]);setTimeout(()=>t.focus(),0)}

// popups: notched, draggable, kept on screen; ✕ or Esc closes
const PW=mk('div','pw');PW.innerHTML='<div class="pin"><div class="wt"><span></span><button class="x">✕</button></div><div class="pb"></div></div>';SM.append(PW);
PW.querySelector('.x').onclick=()=>closePop();
{let dg=null;PW.querySelector('.wt').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=PW.getBoundingClientRect();dg=[e.clientX-r.left,e.clientY-r.top];e.preventDefault()});
 window.addEventListener('pointermove',e=>{if(!dg)return;place(e.clientX-dg[0],e.clientY-dg[1])});window.addEventListener('pointerup',()=>dg=null)}
function place(x,y){const r=PW.getBoundingClientRect();PW.style.left=Math.max(0,Math.min(innerWidth-r.width,x))+'px';PW.style.top=Math.max(0,Math.min(innerHeight-r.height,y))+'px'}
function openPop(id,title,body){if(UI.pop==='ae'&&id!=='ae')closePop();UI.pop=id;PW.dataset.id=id;PW.querySelector('.wt span').textContent=title;const b=PW.querySelector('.pb');b.innerHTML='';b.append(...body);PW.style.display='block';
 const r=PW.getBoundingClientRect(),vr=VIEW.getBoundingClientRect();place(vr.left+(vr.width-r.width)/2,vr.top+Math.max(60,(vr.height-r.height)/2));$('bae').classList.toggle('on',id==='ae');$('bms').classList.toggle('on',id==='map');CORN.querySelector('.sig').classList.toggle('on',id==='map')}
function closePop(){if(!UI.pop)return;const was=UI.pop;UI.pop=null;PW.style.display='none';if(was==='ae'){AEH.append(...PW.querySelector('.pb').children);setMode(UT.find(t=>t[0]===UI.tool)[2])}for(const b of [$('bae'),$('bms'),CORN.querySelector('.sig')])b.classList.remove('on')}
function togglePop(id){if(UI.pop===id){closePop();return}if(id==='map')mapPop();else aePop()}
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(UI.place||UI.drop){armDrop(UI.drop||'spawn');e.stopImmediatePropagation()}else if(UI.pop){closePop();e.stopImmediatePropagation()}},true);
function mapPop(){const mod=MODS.maps[curMap],own=Object.keys(NAT);
 const nm=tbox(mod?mod.name:(TITLE[curMap]||'Map'),v=>{if(MODS.maps[curMap]){MODS.maps[curMap].name=v;TITLE[curMap]=v;saveMods();fillMapSel()}});nm.id='mname';
 const sz=mk('div','szr'),wi=tbox(CW,v=>edResize(+v,CH),'number'),hi=tbox(CH,v=>edResize(CW,+v),'number');sz.append(wi,mk('span','fl','×'),hi);
 const f=form([['Name',nm],['Location',dsel([['auto','Auto'],['in','Interior'],['out','Outdoor']],ENVSET[curMap]||'auto',v=>{ENVSET[curMap]=v;envCalc()})],
  ['Owner',dsel(own.map(n=>[n,n]),MAPOWN(),v=>{OWN[curMap]=v;if(MODS.maps[curMap]){MODS.maps[curMap].owner=v;saveMods()}sigil()})],['Size',sz],['Wall tops',chk(edTops,v=>{edTops=v;TOPS=EM==='map'&&v})]]);
 const g=mk('div','g2');g.append(ubtn('New map','',()=>{closePop();mapNew()}),ubtn('Delete map',mod?'':'dim',x=>{if(mod)confirmB(x,()=>{closePop();const id=curMap;goMap(mod.from&&!mod.from.startsWith('mod:')&&TITLE[mod.from]?mod.from:'bank');delete MODS.maps[id];delete STATE[id];saveMods();fillMapSel()})}),
  ubtn('Export','',()=>{const d=serMap();d.name=nm.value;download((nm.value||'map').replace(/\W+/g,'-')+'.json',{fluoria:1,maps:{[MODS.maps[curMap]?curMap:'mod:'+uidS()]:d},tex:usedTex(d)})}),ubtn('Import','',()=>pickFile(o=>{const ids=importPack(o);if(ids.length){closePop();goMap(ids[0])}})));
 openPop('map','Map settings',[f,g])}
const AEH=mk('div');AEH.style.display='none';SM.append(AEH);
function aePop(){setMode('asset');const secs=[...ZC.querySelectorAll('.sec[data-m="asset"]')];openPop('ae','Asset Editor',[$('ae'),...secs])}
{const g0=goMap;goMap=function(v){if(UI.pop==='map')closePop();g0(v);sigil();sgM=''}}
{const r0=reset;reset=function(){r0();sigil();sgM=''}}

sigil();pickTool(UT.some(t=>t[0]===UI.tool)?UI.tool:'hand');syncCorner();
})();
