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
function setTile(k,keep){if(!validK(k))return;pkFrom(k);UI.tile={t:'tile',k};edBrush={t:'tile',k};addRecent(k);if(!keep)UI.tt='tiles';tilerCtx();if(UI.pop==='ae')aeLoad(k)}
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
function closePop(){if(!UI.pop)return;const was=UI.pop;UI.pop=null;PW.style.display='none';if(was==='ae'){aeStash();AU.naming=false;PW.querySelector('.pb').innerHTML='';setMode(UT.find(t=>t[0]===UI.tool)[2])}for(const b of [$('bae'),$('bms'),CORN.querySelector('.sig')])b.classList.remove('on')}
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
// asset editor: canvas and tools on the left, layers and the chosen layer's settings on the right, code below
const AEH=mk('div');AEH.style.display='none';SM.append(AEH);
const AU={layer:'pattern',stash:{},naming:false};const AL=mk('div','ael'),AR=mk('div','aer'),ATB=mk('div','atr'),ACODE=mk('textarea','acode'),ABT=mk('div','abt'),APAL=mk('div','apal');
ACODE.spellcheck=false;AL.append(ATB,aec,APAL,ACODE,ABT);SM.append(colIn);
function aePop(){setMode('asset');const k=UI.tile&&UI.tile.k;if(k&&k!==AE.key)aeLoad(k);aeUI();const w=mk('div','aew');w.append(AL,AR);openPop('ae','Asset Editor · '+tName(AE.key),[w])}
const aeRec=()=>AE.mode==='layers'&&AE.rec;
function aeRender(){if(!aeRec()){aeDraw();return}const F=aeF(),im=ag.createImageData(TS,TS);for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const c=F(x,y),j=(y*TS+x)*4;im.data[j]=c[0];im.data[j+1]=c[1];im.data[j+2]=c[2];im.data[j+3]=255}
 const tc=mk('canvas');tc.width=tc.height=TS;tc.getContext('2d').putImageData(im,0,0);ag.imageSmoothingEnabled=false;ag.drawImage(tc,0,0,TS*ZM,TS*ZM);ag.fillStyle='rgba(0,0,0,.14)';for(let i=1;i<TS;i++){ag.fillRect(i*ZM,0,1,TS*ZM);ag.fillRect(0,i*ZM,TS*ZM,1)}ag.fillStyle='rgba(255,255,255,.24)';ag.fillRect(T*ZM,0,1,TS*ZM);ag.fillRect(0,T*ZM,TS*ZM,1)}
function aeCode(){return'FLUORIA_TEX('+JSON.stringify({name:tName(AE.key),from:AE.from,kind:furnK(AE.from)?'furniture':KIND[AE.from],...(aeRec()?{rec:AE.rec}:{s:TS,px:enc(AE.px)})})+')'}
{const d0=aeDirty;aeDirty=function(k){d0(k);aeRender();if(document.activeElement!==ACODE)ACODE.value=aeCode()}}
aeTabs=()=>{};aePreview=()=>{};aeLayers=()=>{if(UI.pop==='ae')aeRight()};aeAsset=()=>{if(UI.pop==='ae')aeBottom()};
aeToolbar=function(){ATB.innerHTML='';const tb=(k,n)=>{const b=ubtn(n,AE.tool===k?'on':'',()=>{AE.tool=k;aeToolbar()});return b},ib=(k,on,f)=>{const b=ubtn('','ib'+(on?' on':''),f);b.append(pix(PIC[k][0],on?Object.fromEntries(Object.keys(PIC[k][1]).map(c=>[c,'#111'])):PIC[k][1],2));return b};
 ATB.append(tb('pen','Pen'),tb('fill','Fill'),tb('line','Line'),tb('rect','Rect'),tb('pick','Pick'),mk('i','gap'),ib('mx',AE.mx,()=>{AE.mx=!AE.mx;aeToolbar()}),ib('my',AE.my,()=>{AE.my=!AE.my;aeToolbar()}),mk('i','gap'),ib('undo',0,()=>aeUndo(false)),ib('redo',0,()=>aeUndo(true)))};
const PIC={mx:[['..k.....k...','.kk.....kk..','kkkkkkkkkkk.','.kk.....kk..','..k.....k...'],{k:'#c9c5b8'}],my:[['..k..','.kkk.','kkkkk','..k..','..k..','..k..','kkkkk','.kkk.','..k..'],{k:'#c9c5b8'}],
 undo:[['...k........','..kk........','.kkkkkkkk...','..kk.....k..','...k......k.','..........k.','.........k..','.....kkkk...'],{k:'#c9c5b8'}],redo:[['........k...','........kk..','...kkkkkkkk.','..k.....kk..','.k......k...','.k..........','..k.........','...kkkk.....'],{k:'#c9c5b8'}]};
// thumbnails drawn from the texture's own recipe with one layer isolated
function recThumb(rec,n=34){const F=recTex(rec),c=mk('canvas');c.width=c.height=16;const g=c.getContext('2d'),im=g.createImageData(16,16);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const v=F(x,y),j=(y*16+x)*4;im.data[j]=v[0];im.data[j+1]=v[1];im.data[j+2]=v[2];im.data[j+3]=255}g.putImageData(im,0,0);c.style.cssText=`width:${n}px;height:${n}px;image-rendering:pixelated;display:block`;return c}
const LAYN={paint:'Paint',wear:'Wear',pattern:'Pattern',material:'Material',colour:'Colour'};
function layOn(k){const r=AE.rec;return k==='paint'?!!r.stamp:k==='wear'?Object.values(r.wear||{}).some(v=>v>0):k==='pattern'?(r.lay||'none')!=='none':k==='material'?r.mat!=='flat':true}
function layVal(k){const r=AE.rec;return k==='paint'?(r.stamp?'stamp':'none'):k==='wear'?(layOn('wear')?'on':'none'):k==='pattern'?(r.lay&&r.lay.startsWith('pat:')?MODS.pat[r.lay.slice(4)]?.name||PNAME[r.lay.slice(4)]||'pattern':LAYS[r.lay||'none']).toLowerCase():k==='material'?MATS[r.mat].toLowerCase():toHex(r.base)}
function layToggle(k,on){const r=AE.rec,S=AU.stash;aeBake();aeSnap();if(k==='paint'){if(on)r.stamp=S.stamp||null;else{S.stamp=r.stamp;r.stamp=null}}else if(k==='wear'){if(on)r.wear=S.wear||{edge:.3,scuff:.2};else{S.wear=r.wear;r.wear={}}}
 else if(k==='pattern'){if(on)r.lay=S.lay||'flags';else{S.lay=r.lay;r.lay='none'}}else if(k==='material'){if(on)r.mat=S.mat||'stone';else{S.mat=r.mat;r.mat='flat'}}AE.recF=null;aeDirty();aeRight()}
function aeRight(){AR.innerHTML='';if(!aeRec()){const L=mk('div','lays'),r=mk('div','lay on');r.append(mk('span','th'),mk('span','ln','Pixels'));L.append(r);AR.append(L);const st=mk('div','zone lst');st.append(mk('div','lt','Colour'));aeSliders(st);AR.append(st);return}
 const r0=AE.rec,L=mk('div','lays');for(const k of['paint','wear','pattern','material','colour']){const row=mk('div','lay'+(AU.layer===k?' on':''));const th=mk('span','th');
  th.append(k==='colour'?Object.assign(mk('span','csw'),{style:`background:${toHex(r0.base)}`}):k==='paint'?stThumb():recThumb(k==='wear'?{...r0,base:[90,88,84],mat:'flat',lay:'none',stamp:null}:k==='pattern'?{...r0,base:[120,116,110],mat:'flat',wear:{},stamp:null}:{...r0,lay:'none',wear:{},stamp:null}));
  const ln=mk('span','ln');ln.append(LAYN[k],mk('i',null,layVal(k)));row.append(th,ln);if(k!=='colour')row.append(chk(layOn(k),v=>layToggle(k,v)));row.onclick=e=>{if(e.target.closest('.ck'))return;AU.layer=k;aeRight()};L.append(row)}
 const st=mk('div','zone lst');st.append(mk('div','lt',LAYN[AU.layer]));layerSet(AU.layer,st);AR.append(L,st)}
function stThumb(){const c=mk('canvas');c.width=c.height=16;const g=c.getContext('2d');g.fillStyle='#262626';g.fillRect(0,0,16,16);if(AE.rec.stamp){const a=dec(AE.rec.stamp);for(let i=0;i<256;i++)if(a[i*4+3]){g.fillStyle=`rgb(${a[i*4]},${a[i*4+1]},${a[i*4+2]})`;g.fillRect(i%16,i/16|0,1,1)}}c.style.cssText='width:34px;height:34px;image-rendering:pixelated;display:block';return c}
function rng(label,v,min,max,f,fmt=x=>x){const d=mk('div','rng'),i=mk('input'),o=mk('span',null,fmt(v));i.type='range';i.min=min;i.max=max;i.value=v;let sn=false;i.oninput=()=>{if(!sn){aeBake();aeSnap();sn=true}f(+i.value);o.textContent=fmt(+i.value);AE.recF=null;aeDirty()};i.onchange=()=>{sn=false;aeRight()};d.append(i,o);return[label,d]}
function pickGrid(opts,cur,mkRec,set){const g=mk('div','pg');for(const k of opts){const s=mk('span','sw'+(k===cur?' on':''));s.append(recThumb(mkRec(k),44));s.onclick=()=>{aeBake();aeSnap();set(k);AE.recF=null;aeDirty();aeRight()};g.append(s)}return g}
function layerSet(k,st){const r=AE.rec;
 if(k==='pattern'){const opts=[...Object.keys(LAYS),...Object.keys(PNAME).map(p=>'pat:'+p),...Object.keys(MODS.pat).map(p=>'pat:'+p)];st.append(pickGrid(opts,r.lay||'none',l=>({...r,lay:l,wear:{},stamp:null}),l=>r.lay=l),mk('div','tbox',layVal('pattern').replace(/^./,c=>c.toUpperCase())));
  st.append(form([['Joints',dsel([['1','Thin'],['2','Thick']],String(r.jw||1),v=>{aeSnap();r.jw=+v;AE.recF=null;aeDirty();aeRight()})],rng('Depth',Math.round((r.jd??.8)*100),40,100,v=>r.jd=v/100,v=>v+'%'),rng('Variation',Math.round((r.vary??.3)*100),0,100,v=>r.vary=v/100,v=>v+'%')]));
  const g=mk('div','g2');g.append(ubtn('Shuffle','',()=>{aeSnap();r.seed=(r.seed|0)+1+(Math.random()*97|0);AE.recF=null;aeDirty()}));st.append(g)}
 else if(k==='material'){st.append(pickGrid(Object.keys(MATS),r.mat,m=>({...r,mat:m,lay:'none',wear:{},stamp:null}),m=>r.mat=m),mk('div','tbox',MATS[r.mat]))}
 else if(k==='wear'){r.wear=r.wear||{};const w=r.wear;st.append(form([rng('Edges',Math.round((w.edge||0)*100),0,100,v=>w.edge=v/100,v=>v+'%'),rng('Scuffs',Math.round((w.scuff||0)*100),0,100,v=>w.scuff=v/100,v=>v+'%'),rng('Cracks',Math.round((w.crack||0)*100),0,100,v=>w.crack=v/100,v=>v+'%')]))}
 else if(k==='colour'){const sw=ubtn('','csb');sw.style.background=toHex(r.base);sw.onclick=()=>{colIn.value=toHex(r.base);let sn=false;colIn.oninput=()=>{if(!sn){aeBake();aeSnap();sn=true}r.base=fromHex(colIn.value);sw.style.background=colIn.value;AE.recF=null;aeDirty()};colIn.onchange=()=>aeRight();colIn.click()};const hs=mk('div');st.append(form([['Base',sw]]),hs);aeSliders(hs)}
 else if(k==='paint'){const g=mk('div','g2');g.append(ubtn('Clear','',()=>{aeSnap();r.stamp=null;AE.recF=null;aeDirty();aeRight()}));st.append(g)}}
function aeBottom(){ABT.innerHTML='';if(AU.naming){const n=tbox(AE.mod?MODS.tex[AE.key].name:tName(AE.key)+' (mod)',()=>{});n.id='aen';const cls=mk('span','fl',furnK(AE.from)?'Furniture':KIND[AE.from]==='wall'?'Wall':'Floor');
  const r=mk('div','nmr');r.append(n,cls);const g=mk('div','g2');g.append(ubtn('Cancel','',()=>{AU.naming=false;aeBottom()}),ubtn('Save','',()=>{aeSave(true);AU.naming=false;aeBottom();PW.querySelector('.wt span').textContent='Asset Editor · '+tName(AE.key)}));ABT.append(r,g);setTimeout(()=>{n.focus();n.select()},0);return}
 const g=mk('div','g3');g.append(ubtn('Copy code','',x=>{ACODE.value=aeCode();ACODE.select();try{navigator.clipboard.writeText(ACODE.value).catch(()=>{})}catch(e){}try{document.execCommand('copy')}catch(e){}flashB(x,'Copied')}),
  ubtn('Paste code','',x=>{const go=t=>{const i=t.indexOf('{'),j=t.lastIndexOf('}');try{const ids=importPack(JSON.parse(t.slice(i,j+1)));if(ids.length&&MODS.tex[ids[0]])aeLoad(ids[0]);flashB(x,'Loaded')}catch(e){ACODE.focus();ACODE.select();flashB(x,'Paste in box')}};try{navigator.clipboard.readText().then(go,()=>go(ACODE.value))}catch(e){go(ACODE.value)}}),
  ubtn(AE.mod?'Save':'Save as new…','',x=>{if(AE.mod){aeSave(false);flashB(x,'Saved')}else{AU.naming=true;aeBottom()}}));ABT.append(g)}
ACODE.addEventListener('paste',()=>setTimeout(()=>{const t=ACODE.value,i=t.indexOf('{'),j=t.lastIndexOf('}');try{const ids=importPack(JSON.parse(t.slice(i,j+1)));if(ids.length&&MODS.tex[ids[0]])aeLoad(ids[0])}catch(e){}},0));
{const l0=aeLoad;aeLoad=function(k){l0(k);AU.stash={};if(UI.pop==='ae'){PW.querySelector('.wt span').textContent='Asset Editor · '+tName(k);aeUI()}}}
function aeUI(){APAL.innerHTML='';APAL.append(apal);aeToolbar();aePalette();aeRight();aeBottom();aeRender();ACODE.value=aeCode()}
// painting in layer mode draws into the paint layer (one 16×16 motif per cell)
{let sd=null;const xy=e=>{const r=aec.getBoundingClientRect();return[Math.max(0,Math.min(TS-1,(e.clientX-r.left)/r.width*TS|0)),Math.max(0,Math.min(TS-1,(e.clientY-r.top)/r.height*TS|0))]};
 aec.addEventListener('pointerdown',e=>{if(!aeRec())return;e.preventDefault();e.stopImmediatePropagation();aec.setPointerCapture(e.pointerId);const[x,y]=xy(e),t=e.altKey||e.button===2?'pick':AE.tool;
  if(t==='pick'){const c=aeF()(x,y);AE.col=c.map(v=>v|0);aeToolbar();return}aeBake();aeSnap();const a=stGet(),u=x&15,v=y&15;
  if(t==='fill'){const k0=a.slice((v*16+u)*4,(v*16+u)*4+4)+'',q=[[u,v]],seen=new Set([v*16+u]);while(q.length){const[p,o]=q.pop();stPlot(a,p,o,AE.col);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const P=p+dx,O=o+dy;if(P<0||O<0||P>15||O>15||seen.has(O*16+P)||a.slice((O*16+P)*4,(O*16+P)*4+4)+''!==k0)continue;seen.add(O*16+P);q.push([P,O])}}AE.rec.stamp=enc(a);AE.recF=null;aeDirty();aeRight();return}
  sd={t,u0:u,v0:v,last:[u,v],snap:a.slice()};if(t==='pen'){stPlot(a,u,v,AE.col);AE.rec.stamp=enc(a);AE.recF=null;aeDirty()}},true);
 aec.addEventListener('pointermove',e=>{if(!sd||!aeRec())return;e.stopImmediatePropagation();const[x,y]=xy(e),u=x&15,v=y&15,a=sd.t==='pen'?stGet():sd.snap.slice(),line=(p0,q0,p1,q1)=>{const n=Math.max(Math.abs(p1-p0),Math.abs(q1-q0))||1;for(let i=0;i<=n;i++)stPlot(a,Math.round(p0+(p1-p0)*i/n),Math.round(q0+(q1-q0)*i/n),AE.col)};
  if(sd.t==='pen'){line(sd.last[0],sd.last[1],u,v);sd.last=[u,v]}else if(sd.t==='line')line(sd.u0,sd.v0,u,v);else if(sd.t==='rect'){const x0=Math.min(sd.u0,u),x1=Math.max(sd.u0,u),y0=Math.min(sd.v0,v),y1=Math.max(sd.v0,v);for(let q=y0;q<=y1;q++)for(let p=x0;p<=x1;p++)if(e.shiftKey||p===x0||p===x1||q===y0||q===y1)stPlot(a,p,q,AE.col)}
  AE.rec.stamp=enc(a);AE.recF=null;aeDirty()},true);
 aec.addEventListener('pointerup',e=>{if(sd){sd=null;aeRight()}},true)}
{const g0=goMap;goMap=function(v){if(UI.pop==='map')closePop();g0(v);sigil();sgM=''}}
{const r0=reset;reset=function(){r0();sigil();sgM=''}}

sigil();pickTool(UT.some(t=>t[0]===UI.tool)?UI.tool:'hand');syncCorner();
})();
