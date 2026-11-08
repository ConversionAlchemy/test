// screen: map with a brass clock corner, tool panel on the right, popups for occasional work
const UI={tool:LS.get('bs.tool','hand'),st:LS.get('bs.st','units'),tt:'tiles',drop:null,pop:null};let PAUSED=true;const MNAME={};
const UKEY={hand:'Esc',spawn:'B',tile:'N',paint:'P',sign:'L',teth:'K',wand:'M',vac:'U',sponge:'O'};
const UT=[['hand','Command',null],['spawn','Spawner',null],['tile','Tiler','map'],['sign','Note','map'],['paint','Painter','map'],['vac','Vacuum','map'],['sponge','Sponge','map'],['wand','Wand','map'],['teth','Tether',null]];
const UIC={
 hand:[['....kk.kk...','...kwwkwwk..','...kwwkwwkk.','.kkkwwkwwkwk','kwwkwwwwwkwk','kwwwwwwwwwwk','.kwwwwwwwwwk','..kwwwwwwwk.','...kwwwwwk..','....kkkkk...'],{k:'#111',w:'#e8d2b0'}],
 spawn:[['....kkkk....','...kggggk...','...kgyygk...','...kggggk...','....kkkk..yy','...kggggk.yy','..kggggggkyy','..kggggggk..','..kggggggk..','...kkkkkk...'],{k:'#111',g:'#2f5f45',y:'#ffd84a'}],
 tile:[['kkkkkkkkkkkk','kaakaakbbkbk','kaakaakbbkbk','kkkkkkkkkkkk','kbbkbbkaakak','kbbkbbkaakak','kkkkkkkkkkkk','kaakaakbbkbk','kaakaakbbkbk','kkkkkkkkkkkk'],{k:'#2e2c28',a:'#b5a27c',b:'#8a857c'}],
 sign:[['.kkkkkkkkkk.','kwwwwwwwwwwk','kwssswssswwk','kwwwwwwwwwwk','kwsswssswswk','kwwwwwwwwwwk','.kkkkkkkkkk.'],{k:'#3a2a18',w:'#d8b878',s:'#8a6a3e'}],
 paint:[['.........kk.','........kgk.','.......kgk..','......kgk...','.....kgk....','....bbk.....','...rrbb.....','..rrrb......','.rrr........','.rr.........'],{k:'#111',g:'#b08a5a',b:'#5a3c22',r:'#b02a2a'}],
 vac:[['y...........','kk..........','.kgk........','..kgk.......','...kgk......','....kggk....','.....kgggk..','......kgggk.','.......kgggk','........kggk'],{y:'#ffd84a',k:'#111',g:'#8c9298'}],
 sponge:[['.kkkkkkkkkk.','kyyyyyyyyyyk','kyoyyyyoyyyk','kyyyyoyyyyyk','kyoyyyyyoyyk','kyyyoyyyyyyk','.kkkkkkkkkk.'],{y:'#f2d04a',o:'#c79a26',k:'#3a2e10'}],
 wand:[['w.w.........','.y..........','w.k.........','...k........','....k.......','.....b......','......b.....','.......b....','........b...','.........b..'],{y:'#ffe066',w:'#fff6c8',k:'#d8d0c0',b:'#5a3c22'}],
 teth:[['...kkkkk....','..kbbbbbk...','.kbk...kbk..','.kbk...kbk..','..kbbbbbk...','...kkkbk....','......kbk...','.......kbk..','........kbk.','.........kk.'],{k:'#2a1c10',b:'#a07848'}],
 bin:[['...wwww...','wwwwwwwwww','.wkkkkkkw.','.wkwkwkkw.','.wkwkwkkw.','.wkwkwkkw.','.wkwkwkkw.','.wkkkkkkw.','..wwwwww..'],{k:'#8a2a2e',w:'#f2efe6'}],
 drop:[['........bbb.','.......bbbbb','.......bbbbb','......kbbbb.','.....kwkbb..','....kwk.....','...kwk......','..kwk.......','.kk.........','k...........','............','d...........','dd..........'],{b:'#b23a3a',w:'#a8d0e0',k:'#c9c5b8',d:'#5f8ad0'}],
 glass:[['kkkkkkkkk','.kyyyyyk.','..kyyyk..','...kyk...','....k....','...kyk...','..k.y.k..','.k.yyy.k.','kkkkkkkkk'],{k:'#b89654',y:'#e6bc69'}],
 grid:[['wwwwwwwwww','w..w..w..w','w..w..w..w','wwwwwwwwww','w..w..w..w','w..w..w..w','wwwwwwwwww','w..w..w..w','w..w..w..w','wwwwwwwwww'],{w:'#d8d0c0'}],
 undo:[['...k........','..kwk.......','.kwwkkkkk...','kwwwwwwwwk..','.kwwkkkkwwk.','..kwk...kwwk','...k.....kwk','.........kwk','........kwk.','.......kwk..'],{k:'#111',w:'#e8e4da'}],
 reset:[['..kkkkk..','.k.....k.','k.......k','k......kkk','k.......k.','k.........','.k.....k..','..kkkkk...'],{k:'#fff'}]};
function pix(rows,pal,s=2){const c=mk('canvas'),w=Math.max(...rows.map(r=>r.length));c.width=w;c.height=rows.length;c.style.cssText=`width:${w*s}px;height:${rows.length*s}px;image-rendering:pixelated`;const g=c.getContext('2d');rows.forEach((r,y)=>[...r].forEach((ch,x)=>{if(pal[ch]){g.fillStyle=pal[ch];g.fillRect(x,y,1,1)}}));return c}
const uicon=k=>pix(...UIC[k]);
const ubtn=(t,cls,f)=>{const b=mk('button',cls,t);if(f)b.onclick=f;return b};

// clock: brass rim (the game's brass texture), an earth face, hour notches; the hands tick while time runs
function clockSvg(){const N=29,c=14,o=[],K=[1.3,1.12,.92,.72,.5,.34],BR=K.map(k=>'#'+[200,146,88].map(v=>Math.min(255,v*k|0).toString(16).padStart(2,'0')).join('')),nrm=(x,y)=>Math.max(Math.abs(x),Math.abs(y),(Math.abs(x)+Math.abs(y))/1.3),
  land=(x,y)=>Math.sin(x*.8+1.3)+Math.cos(y*.95-.4)+Math.sin((x+y)*.5)>.9,r=(x,y,f)=>o.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${f}"/>`),
  lit=(x,y)=>{const a=Math.round(Math.atan2(y-c,x-c)/(Math.PI/4))*Math.PI/4;return-(Math.cos(a)+Math.sin(a))/Math.SQRT2},
  tone=l=>l>.9?1:l>.5?2:l>-.5?3:l>-.9?4:5,mix=(h,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(h.slice(i,i+2),16)*(1-t)+255*t).toString(16).padStart(2,'0')).join('');
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const d=nrm(x-c,y-c);if(d>14.4)continue;const l=lit(x,y);let f;
  if(d>13.6)f='#1a1208';
  else if(d>12.8)f=BR[Math.max(0,tone(l)-1-(l>.5))];
  else if(d>11.4)f=BR[tone(l)];
  else if(d>10.6)f=BR[tone(-l)];
  else if(d>9.8)f='#1c140a';
  else{f=land(x,y)?((x+y)%3?'#4f7a3a':'#8a7a3a'):((x*7+y*3)%5?'#123a6a':'#1e5a9a');if(d>8.4&&(x*3+y)%4===0)f='#2f8ac0';
   const u=x-c+y-c,v=x-y;if((u===-7||u===-6)&&Math.abs(v)<4)f=mix(f,u===-7?.45:.25)}
  r(x,y,f)}
 for(let k=0;k<12;k++){const a=k*Math.PI/6,dx=Math.sin(a),dy=-Math.cos(a),q=7.8/nrm(dx,dy);for(const s of k%3?[q]:[q,q-1])r(Math.round(c+s*dx),Math.round(c+s*dy),'#fff')}
 return`<svg class="clk" viewBox="0 0 ${N} ${N}" width="116" height="116" shape-rendering="crispEdges">${o.join('')}<g class="h1"><rect x="14" y="7" width="1" height="7" fill="#fff"/><rect x="14" y="7" width="1" height="1" fill="#e0533f"/></g><g class="h2"><rect x="14" y="10" width="1" height="4" fill="#d8d4c8"/></g><rect x="14" y="14" width="1" height="1" fill="${BR[0]}"/></svg>`}

// ui sounds: soft tick on hover, deep click on press, lighter click on release
const US={};{const R=(a,b)=>a+Math.random()*(b-a);
 const burst=(t,d,f,q,g,ty='bandpass')=>{const a=au(),n=a.createBuffer(1,a.sampleRate*d|0,a.sampleRate),x=n.getChannelData(0);for(let i=0;i<x.length;i++)x[i]=(Math.random()*2-1)*Math.pow(1-i/x.length,4);const s=a.createBufferSource(),fl=a.createBiquadFilter(),v=a.createGain();s.buffer=n;fl.type=ty;fl.frequency.value=f;fl.Q.value=q;v.gain.value=g;s.connect(fl).connect(v).connect(a.destination);s.start(a.currentTime+t)};
 const tn=(t,f,d,g)=>{const a=au(),o=a.createOscillator(),v=a.createGain(),T0=a.currentTime+t;o.type='triangle';o.frequency.setValueAtTime(f,T0);o.frequency.exponentialRampToValueAtTime(f*.6,T0+d);v.gain.setValueAtTime(g,T0);v.gain.exponentialRampToValueAtTime(.0001,T0+d);o.connect(v).connect(a.destination);o.start(T0);o.stop(T0+d)};
 const ok=()=>typeof gest==='undefined'||gest;
 US.hover=()=>{if(AC)burst(0,.01,R(2200,3000),R(1.5,3),R(.008,.016))};
 US.press=()=>{burst(0,.025,R(700,900),1,.05,'lowpass');tn(0,R(160,190),.04,.03)};
 US.release=()=>{burst(0,.015,R(1400,1800),1.5,.03);tn(0,R(440,520),.02,.012)};
 US.none=()=>{burst(0,.06,380,.8,.06,'lowpass');tn(0,110,.09,.02)};
 US.clock=()=>{burst(0,.02,2000,2.5,.07);burst(.035,.018,2600,3,.05);burst(.07,.04,1100,1.2,.05,'lowpass');tn(.03,1400,.12,.015)};
 let held=null;const key=e=>e.target.closest&&e.target.closest('#sm button,#sm select,#sm .ub');
 document.addEventListener('pointerover',e=>{const b=key(e);if(b&&!b.contains(e.relatedTarget))US.hover()});
 document.addEventListener('pointerdown',e=>{const b=key(e);if(!b)return;held=b;if(!b.classList.contains('clkb'))US.press()},true);
 document.addEventListener('pointerup',()=>{if(held){if(!held.classList.contains('clkb'))US.release();held=null}},true)}

// layout
const SM=$('sm'),SIDE0=document.querySelector('#sm .side'),VIEW=$('stage').parentElement;
// the board only counts as under the cursor where the map view is actually showing
window.addEventListener('pointermove',e=>{if(!VIEW.contains(e.target)||e.target.closest('.zone,.pw,.corner')){mouse.in=false;hover=null;hoverC=null}});
const ZT=mk('div','zone zt'),ZC=mk('div','zone zc'),ZS=mk('div','zone zs');
{const g=mk('div','tgrid');for(const[k,n]of UT){const b=ubtn('','tb'+(k==='hand'?' lite':''),()=>pickTool(k));b.dataset.k=k;const t=mk('span',null,n);t.append(mk('i','kb','('+UKEY[k]+')'));b.append(uicon(k),t);g.append(b)}ZT.append(g)}
const TH=mk('div','ch');ZC.append(TH,...SIDE0.children);SIDE0.append(ZT,ZC,ZS);
VIEW.append(mk('div','frame'));
// tool header with optional dropper
function head(k){TH.innerHTML='';if(k==='hand')return;const n=UT.find(t=>t[0]===k)[1],G=mk('div','hb');TH.append(uicon(k),mk('span',null,n),G);
 if(k==='paint'){const z=ubtn(PNT.size>1?'2×2':'1×1','sq sz',()=>{PNT.size=PNT.size>1?1:2;z.textContent=PNT.size>1?'2×2':'1×1'});const un=ubtn('','sq',()=>{if(!puUndo())NOPE()});un.title='Undo';un.append(uicon('undo'));G.append(z,un)}
 if(k==='vac'||k==='sponge'){const z=ubtn(CLSZ[k]>1?'2×2':'1×1','sq sz',()=>{CLSZ[k]=CLSZ[k]>1?1:2;z.textContent=CLSZ[k]>1?'2×2':'1×1'});G.append(z)}
 if(k==='tile'){const z=ubtn(edSize>1?'2×2':'1×1','sq sz',()=>{edSize=edSize>1?1:2;z.textContent=edSize>1?'2×2':'1×1'});const gr=ubtn('','sq'+(GRID?' on':''),()=>{GRID=!GRID;LS.set('bs.grid',GRID);gr.classList.toggle('on',GRID)});gr.append(uicon('grid'));const er=ubtn('','sq red'+(UI.erase?' on':''),()=>setErase(!UI.erase));er.append(uicon('bin'));const un=ubtn('','sq',()=>{if(!edStep(false))NOPE()});un.title='Undo';un.append(uicon('undo'));G.append(z,un,gr,er)}
 if(k==='tile'||k==='spawn'){const d=ubtn('','sq',()=>{UI.del=false;armDrop(k)});d.append(uicon('drop'));d.classList.toggle('on',UI.drop===k);G.append(d)}
 if(k==='spawn'){const x=ubtn('','sq red',()=>{UI.del=!UI.del;if(UI.del&&UI.drop)armDrop(k);else head(k);cv.style.cursor=UI.del?'crosshair':CUR.arrow});x.append(uicon('bin'));x.classList.toggle('on',!!UI.del);G.append(x)}}

// settings zone: map, save, popups
{const ms=$('msel');ms.classList.add('wide');const sv=mk('div','g2'),sm=ubtn('Save map','',()=>{mapSave(false);flashB(sm,'Saved')}),gm=ubtn('Games','',()=>togglePop('games'));sv.append(sm,gm);
 const ae=ubtn('Asset Editor','lite',()=>togglePop('ae')),st=ubtn('Map settings','lite',()=>togglePop('map'));ae.id='bae';st.id='bms';
 const r=mk('div','g2');r.append(ae,st);ZS.append(ms,sv,r)}

// corner: clock, reset, slow-mo, map sigil
const CORN=mk('div','corner');{
 const ck=mk('div','ub clkb oct');ck.innerHTML=clockSvg();ck.onclick=()=>{US.clock();if(EM){aiWas=true;pickTool('hand');return}setPlay(PAUSED)};
 const rs=mk('div','ub sq red');rs.append(uicon('reset'));rs.onclick=()=>reset();
 const sl=mk('div','ub sq slow');sl.append(pix(...UIC.glass));sl.onclick=()=>window.toggleSlow();
 const sg=mk('div','ub sq sig');sg.onclick=()=>togglePop('map');
 CORN.append(ck,rs,sl,sg);VIEW.append(CORN)}
function setPlay(on){PAUSED=!on;if(!EM&&on!==aiOn)aiBtn().click();syncCorner()}
function sigil(){const o=MAPOWN(),c=NAT[o]||'#8a8580',h=n=>parseInt(c.slice(n,n+2),16),s=CORN.querySelector('.sig');s.innerHTML='';s.append(pix(['gggggggg','gggggggg','ggyyyygg','gyyddyyg','gydyydyg','gydyydyg','gyyddyyg','ggyyyygg','gggggggg','gg.gg.gg','g......g'],{g:css(mix(rgb(26,26,26),rgb(h(1),h(3),h(5)),.55)),y:c,d:css(mix(rgb(26,26,26),rgb(h(1),h(3),h(5)),.3))},2));s.title=o}
function syncCorner(){CORN.classList.toggle('paused',PAUSED);CORN.classList.toggle('slowing',slowMo);const s=CORN.querySelector('.slow');s.classList.toggle('on',slowMo);s.title=slowMo?'Slow':'Normal'}
setInterval(syncCorner,200);


// map owner: the sigil, and who holds the keys to doors with no keys of their own
const OWN={};function MAPOWN(){if(OWN[curMap])return OWN[curMap];const m=MODS.maps[curMap];if(m&&m.owner)return m.owner;const t=(TITLE[curMap]||'').split(' · ')[0];return NAT[t]!==undefined?t:/Emperor/.test(t)?'Imperium':'Neutral'}
{const s0=serMap;serMap=function(){const d=s0();{const a=CHM[curMap];if(a&&a.length===N){const L=[];for(let j=0;j<N;j++)if(a[j])L.push(j);if(L.length)d.ch=L}}d.owner=MAPOWN();d.signs=(SIGNS[curMap]||[]).map(s=>({...s}));return d}}

// tools
function pickTool(k){if(k!=='spawn')UI.del=false;UI.erase=false;if(k!=='hand'){for(const b of bodies)b.direct=false;sel.clear();openCrate=null;keys.clear()}if(UI.pop==='ae'||UI.pop==='sign')closePop();UI.tool=k;LS.set('bs.tool',k);UI.drop=null;const m=UT.find(t=>t[0]===k)[2];setMode(m);SM.dataset.tool=k;
 for(const b of ZT.querySelectorAll('.tb'))b.classList.toggle('on',b.dataset.k===k);
 if(k==='vac'||k==='sponge'||k==='wand')edBrush={t:'clean',k};else if(k==='tile')edBrush=UI.tile?{...UI.tile}:null;else if(m)edBrush=null;
 head(k);if(k==='tile')tilerCtx();if(k==='spawn')spawnCtx();if(k==='paint')paintCtx();if(k==='sign')signCtx();if(k==='teth'){TQ.a=null;tetherCtx()}cv.style.cursor=k==='vac'||k==='sponge'||k==='wand'?TOOLCUR[k]||'crosshair':m?'crosshair':CUR.arrow}
{const s0=setMode;setMode=function(m){s0(m);SM.dataset.tool=UI.tool;PAUSED=!aiOn;syncCorner()}}

// tiler: element tabs, a swatch per material and variation, name and floor or wall
const TCX=mk('div','tcx');ZC.append(TCX);
function tilerCtx(){TCX.innerHTML='';if((!edBrush||edBrush.t==='clean')&&UI.tile&&EM==='map')edBrush={...UI.tile};if(!['floor','wall','furn','door'].includes(UI.tt))UI.tt=PK.w?'wall':'floor';PK.w=UI.tt==='wall'?1:0;
 const tabs=mk('div','tabs');for(const[t,n]of[['floor','Floor'],['wall','Wall'],['furn','Furniture'],['door','Doors']])tabs.append(ubtn(n,UI.tt===t?'on':'',()=>{UI.tt=t;tilerCtx()}));TCX.append(tabs);SM.dataset.tt=UI.tt;
 // every tab gives sub-tabs and rows of keys (null leaves a gap); one grid draws them all
 const sub=(list,on,f)=>{const et=mk('div','tabs');for(const[v,n]of list)et.append(ubtn(n,on===v?'on':'',()=>{f(v);tilerCtx()}));TCX.append(et)},rows=[],four=L=>{for(let i=0;i<L.length;i+=4)rows.push(L.slice(i,i+4))};let pref=null;
 if(UI.tt==='floor'||UI.tt==='wall'){const mods=Object.keys(MODS.tex).filter(k=>!furnK(k)&&(KIND[k]==='wall')===!!PK.w),els=[...EORDER.filter(e=>!PK.w||Object.keys(ELEM[e].mats).some(m=>!mprop(e,m).nowall)),...(mods.length?['Mods']:[])];if(!els.includes(PK.el))PK.el='Stone';
  sub(els.map(e=>[e,e]),PK.el,e=>{PK.el=e;if(e!=='Mods'){PK.mat=Object.keys(ELEM[e].mats)[0];PK.v=Object.keys(varsOf(e,PK.mat))[0]}else PK.mat=mods[0]});
  if(PK.el==='Mods'){four(mods);pref=PK.mat}else{const e=PK.el.toLowerCase(),sf=PK.w?'.w':'';for(const m of Object.keys(ELEM[PK.el].mats).filter(m=>!PK.w||!mprop(PK.el,m).nowall))four(Object.keys(varsOf(PK.el,m)).map(v=>e+'.'+m+'.'+v+sf).filter(validK));pref=e+'.'+PK.mat+'.'+PK.v+sf}}
 else if(UI.tt==='furn'){const wk=sh=>Object.keys(WPIECE).filter(k=>WPIECE[k][1]===sh),mods=modKeys('furn'),FT={chest:['Chests',wk('chest'),Object.keys(MCHEST)],table:['Tables',wk('table'),Object.keys(MTABLE)],seat:['Chairs',wk('seat'),[]],plant:['Plants',['hedge'],[]],...(mods.length?{mods:['Mods',mods,[]]}:{})};
  if(!FT[UI.ft])UI.ft='chest';sub(Object.entries(FT).map(([t,v])=>[t,v[0]]),UI.ft,t=>UI.ft=t);const[,wl,ml]=FT[UI.ft];
  // wood down the first column, metal down the second
  if(UI.ft==='mods')four(wl);else for(let i=0;i<Math.max(wl.length,ml.length);i++)rows.push([wl[i]||null,ml[i]||null,null,null])}
 else{const wd=Object.keys(DOORK).filter(k=>DOORK[k][1]===2),md=Object.keys(DOORK).filter(k=>DOORK[k][1]!==2),id=(k,f)=>k?'door:'+k+(f?'!':''):null;
  // wood, metal, then the same two as full-tile doors
  for(let i=0;i<Math.max(wd.length,md.length);i++)rows.push([id(wd[i]),id(md[i]),id(wd[i],1),id(md[i],1)])}
 const all=rows.flat().filter(Boolean),isDoor=k=>String(k).startsWith('door:');let cur=UI.erase?null:edBrush&&edBrush.t!=='clean'?edBrush.k:UI.tile&&UI.tile.k;
 // a tab always has something chosen: the remembered pick if it is here, else the first
 if(!UI.erase&&!all.includes(cur)&&all.length){const k=all.includes(pref)?pref:all[0];UI.tile={t:isDoor(k)?'door':'tile',k};if(EM==='map')edBrush={...UI.tile};if(!isDoor(k))pkFrom(k);cur=k}
 const pick=k=>{if(UI.erase)setErase(false);if(isDoor(k)){UI.tile={t:'door',k};edBrush={...UI.tile};tilerCtx()}else setTile(k)};
 const pic=k=>{if(!isDoor(k))return swatch(bake(k),30,30);const f=k.endsWith('!'),dk=k.slice(5).replace('!',''),th=f?16:8,c=mk('canvas');c.width=16;c.height=th;const x=c.getContext('2d'),im=x.createImageData(16,th),u=new Uint32Array(im.data.buffer);
  for(const[px,py,col]of doorIcon(dk,f))if(px>=0&&px<16&&py+th>=0&&py+th<th)u[(py+th)*16+px]=col;x.putImageData(im,0,0);c.style.cssText='width:52px;height:'+(f?52:26)+'px';return c};
 const g=mk('div','swg'+(UI.tt==='door'?' big':''));g.style.gridTemplateColumns='repeat(4,1fr)';for(const r of rows)for(let i=0;i<4;i++){const k=r[i];if(!k){g.append(mk('span'));continue}const s=mk('span','sw'+(k===cur?' on':''));s.append(pic(k));s.onclick=()=>pick(k);g.append(s)}
 const nm=!cur?'':isDoor(cur)?(d=>DOORK[d]?(cur.endsWith('!')?DOORK[d][0].replace(' door',' large door'):DOORK[d][0]):'')(cur.slice(5).replace('!','')):tName(cur);
 TCX.append(g,mk('div','tname',nm));if(UI.pop==='ae'&&cur&&!isDoor(cur)&&cur!==AE.key)aeLoad(cur)}
function setTile(k){if(!validK(k))return;pkFrom(k);UI.erase=false;cv.style.cursor='crosshair';UI.tile={t:'tile',k};edBrush={t:'tile',k};addRecent(k);UI.tt=furnK(k)?'furn':CATN[k]&&CATN[k][3]||KIND[k]==='wall'?'wall':'floor';if(UI.tt==='furn')UI.ft=WPIECE[k]?(WPIECE[k][1]==='desk'?'table':WPIECE[k][1]):MCHEST[k]?'chest':MTABLE[baseK(k)]?'table':k==='hedge'?'plant':'mods';tilerCtx()}
{const p0=fillMapTools;fillMapTools=function(){p0();if(edBrush&&edBrush.t!=='clean')UI.tile={...edBrush}}}

// small form helpers
function dsel(opts,v,f){const s=mk('select');for(const[k,n]of opts){const o=mk('option',null,n);o.value=k;s.append(o)}s.value=v;s.onchange=()=>f(s.value);return s}
function tbox(v,f,type='text'){const i=mk('input');i.type=type;i.value=v;i.onchange=()=>f(i.value);return i}
function chk(on,f){const c=mk('span','ck ub'+(on?' on':''));c.onclick=()=>{c.classList.toggle('on');f(c.classList.contains('on'))};return c}
function form(rows){const f=mk('div','frm');for(const[l,c]of rows)f.append(mk('span','fl',l),c);return f}

// spawner: tabs, side, unit list with the arms drop-down in the chosen row
for(const g of [...fw.querySelectorAll('optgroup')]){g.replaceWith(...g.children)}
const SCX=mk('div','scx');ZC.append(SCX);
function unitPx(i){const R=ROSTER[fnat.value]||[],[l,un]=R[i]||['Peasant','civ'],c=mk('canvas');c.width=c.height=17;const g=c.getContext('2d'),id=g.createImageData(17,17),u=new Uint32Array(id.data.buffer),t={type:'token',ang:Math.PI/2,look:l,unit:un,nat:fnatv(),guard:false,tone:pTone},px=tokPixels(t),set=new Set(px.map(p=>K(p[0],p[1])));
 for(const p of px){let q=pcol(t,p);if(q===0)continue;if(!sprG(lookOf(t))&&(!set.has(K(p[0]+1,p[1]))||!set.has(K(p[0]-1,p[1]))||!set.has(K(p[0],p[1]+1))||!set.has(K(p[0],p[1]-1))))q=mul(q,.36);u[(p[1]+8)*17+p[0]+8]=q}g.putImageData(id,0,0);return c}
function spawnCtx(){SCX.innerHTML='';SM.dataset.st=UI.st;const tabs=mk('div','tabs');for(const[t,n]of[['units','Units'],['wp','Weapons'],['it','Items'],['cov','Cover']])tabs.append(ubtn(n,UI.st===t?'on':'',()=>{UI.st=t;LS.set('bs.st',t);spawnCtx()}));SCX.append(tabs);
 if(UI.st!=='units')return;fnat.classList.add('wide');SCX.append(fnat);const L=mk('div','ulist');
 for(const o of fu.options){const i=+o.value,r=mk('div','urow'+(String(i)===fu.value?' on':''));r.append(unitPx(i),mk('span','n',o.textContent));
  if(String(i)===fu.value)r.append(fw);r.onpointerdown=e=>{if(e.target===fw||e.button)return;if(fu.value!==String(i)){fu.value=i;setArms();spawnCtx()}e.preventDefault();$('tpr').dispatchEvent(new PointerEvent('pointerdown',{clientX:e.clientX,clientY:e.clientY,bubbles:true}))};L.append(r)}
 SCX.append(L)}
{const f0=fnat.onchange;fnat.onchange=()=>{f0();spawnCtx()}}

// dropper: Tiler copies a tile, Spawner copies a unit and places copies until Esc
const GHO=mk('canvas','ghost');GHO.width=GHO.height=17;document.body.append(GHO);
// erasing: no swatch is chosen while it is on, the cursor is a hammer, picking a swatch turns it off
const HAMMER=(()=>{const c=pix(['..kkkkk.....','.kwwwwgk....','kwwgggggk...','kwggggggk...','.kkggggk....','...kkkhk....','.....khhk...','......khhk..','.......khhk.','........khhk','.........kk.'],{k:'#111',w:'#e8e4da',g:'#9a9690',h:'#9a6a3a'},1),d=mk('canvas');d.width=24;d.height=22;const g=d.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(c,0,0,24,22);return`url(${d.toDataURL()}) 4 4, crosshair`})();
function setErase(on){UI.erase=on;cv.style.cursor=on?HAMMER:'crosshair';if(UI.tool==='tile'){head('tile');tilerCtx()}}
function armDrop(k){UI.drop=UI.drop===k?null:k;UI.place=false;GHO.style.display='none';head(k);cv.style.cursor=UI.drop?'copy':k==='tile'?'crosshair':CUR.arrow}
VIEW.addEventListener('pointerdown',e=>{if(panKey||!UI.drop||e.button||!inBoard(e))return;const[x,y]=toBoard(e);e.stopPropagation();e.preventDefault();
 if(UI.drop==='tile'){const cx=x/T|0,cy=y/T|0,d=bodies.find(o=>o.type==='slab'&&!o.free&&slabCell(o)===cy*CW+cx);
  // a door under the dropper picks that door; otherwise the tile, switching to its tab
  if(d){const k=d.dk||(d.umbra?'umbra':d.gold?'gold':d.mat===3?'steel':'wood');UI.erase=false;UI.tt='door';UI.tile={t:'door',k:'door:'+k};edBrush={...UI.tile};tilerCtx()}
  else{const s=srcNow(),k=s[cy]&&s[cy][cx];if(k)setTile(k)}armDrop('tile');return}
 if(UI.place){$('tpr').dispatchEvent(new PointerEvent('pointerdown',{clientX:e.clientX,clientY:e.clientY,bubbles:true}));return}
 const b=bodyAt(x|0,y|0,6,null,o=>o.type==='token');if(!b)return;syncMarker(b);UI.st='units';spawnCtx();UI.place=true;GHO.getContext('2d').drawImage(tp,0,0);GHO.style.display='block'},true);
window.addEventListener('pointermove',e=>{if(GHO.style.display==='block'){GHO.style.left=e.clientX-17*S/2+'px';GHO.style.top=e.clientY-17*S/2+'px';GHO.style.width=GHO.style.height=17*S+'px'}});

// painter: decals on the floor
// painter: blood and scorch (the same layers fighting leaves), condition wear, and the floor chisel
const PNT={k:LS.get('bs.dec','blood'),size:1,mir:false,mx:true,my:true,box:null,t:0,last:null},DEC=[['blood','Blood','#7a0a10'],['scorch','Scorch','#2a2018'],['cond','Condition','#8a7a62'],['chisel','Floor chisel','#3a3836']];if(!DEC.some(d=>d[0]===PNT.k))PNT.k='blood';
const PCX=mk('div','pcx');ZC.append(PCX);
function paintCtx(){PCX.innerHTML='';const L=mk('div','ulist');for(const[k,n,c]of DEC){const r=mk('div','urow'+(PNT.k===k?' on':''));const s=mk('span','swd');s.style.background=c;r.append(s,mk('span','n',n));r.onclick=()=>{PNT.k=k;LS.set('bs.dec',k);paintCtx()};L.append(r)}
 PCX.append(L);if(PNT.k==='chisel'){const r=mk('div','tabs');r.append(ubtn('Mirror',PNT.mir?'on':'',()=>{PNT.mir=!PNT.mir;PNT.box=null;paintCtx()}));if(PNT.mir)r.append(ubtn('X',PNT.mx?'on':'',()=>{PNT.mx=!PNT.mx;paintCtx()}),ubtn('Y',PNT.my?'on':'',()=>{PNT.my=!PNT.my;paintCtx()}));PCX.append(r)}}
let PDN=false;
// undo: each stroke saves what it can change
const PU=[];function puPush(){const k=PNT.k,e=k==='cond'?{ed:snapEd()}:k==='chisel'?{ch:chis().slice(),cb:new Map(chb()),fl:floor.slice(),pr:prOK()?[PR.floor.slice(),PR.floor0.slice()]:null}:{fx:[FX.blood.slice(),BURN.slice()]};e.map=curMap;PU.push(e);if(PU.length>30)PU.shift()}
function puUndo(){const e=PU.pop();if(!e||e.map!==curMap)return false;if(e.ed){edSrc=e.ed;if(e.ed.und)UND=e.ed.und.map(r=>r&&r.slice());refinish()}else if(e.ch){CHM[curMap]=e.ch;CHB[curMap]=e.cb;floor.set(e.fl);if(e.pr&&prOK()){PR.floor.set(e.pr[0]);PR.floor0.set(e.pr[1])}}else{FX.blood.set(e.fx[0]);BURN.set(e.fx[1])}ds0Need=true;fxDirty=true;solDirty=true;return true}
function daub(x,y){const R=3+PNT.size*4,a=PNT.size*.12;
 for(let Y=Math.floor((y-R)/2);Y<=(y+R)/2;Y++)for(let X=Math.floor((x-R)/2);X<=(x+R)/2;X++){if(X<0||Y<0||X>=BW||Y>=BH)continue;const d=Math.hypot(X*2+1-x,Y*2+1-y)/R;if(d>1)continue;const q=Y*BW+X,f=a*(1-d*d)*(.6+Math.random()*.8);
  if(PNT.k==='blood')FX.blood[q]=Math.min(1,FX.blood[q]+f);else BURN[q]=Math.min(1,BURN[q]+f)}
 ds0Need=true;fxDirty=true}
// condition: holding on a tile wears it a step at a time, the same steps the Tiler and battle damage use
function wearAt(x,y){const s=srcNow(),o=PNT.size>1?0:0,cx0=(x/T|0)-(PNT.size>1&&x%T<8?1:0),cy0=(y/T|0)-(PNT.size>1&&y%T<8?1:0);let ch=false;
 for(let cy=cy0;cy<cy0+PNT.size;cy++)for(let cx=cx0;cx<cx0+PNT.size;cx++){const k=s[cy]&&s[cy][cx];if(!k)continue;const c=condK(k);if(c<=1)continue;const n=baseK(k)+'~'+(c-1);if(!validK(n))continue;s[cy][cx]=n;ch=true}
 if(ch){refinish();sfx('thunk')}}
// floor chisel: darkens floor pixels for good (wand and sponge leave it); a mirror box repeats each cut across it
const CHM={},CHB={};function chis(){let a=CHM[curMap];if(!a||a.length!==N)a=CHM[curMap]=new Uint8Array(N);return a}const chb=()=>CHB[curMap]||(CHB[curMap]=new Map());
// a cut is a faint 14% darkening, with a shadow under its top and left lip and a lighter bottom and right edge, so it reads as sunk into the stone
function chShade(j){const a=chis(),base=chb().get(j);if(!a[j]||base===undefined)return;const f=!a[j-W]?.7:!a[j-1]?.76:!a[j+W]||!a[j+1]?.94:.86;floor[j]=mul(base,f);if(prOK()){PR.floor[j]=floor[j];PR.floor0[j]=floor[j]}}
function chSet(j){const a=chis();if(a[j]||sol[j]||OBJ[j])return;chb().set(j,floor[j]);a[j]=1;for(const k of[j,j-1,j+1,j-W,j+W])if(k>=0&&k<N)chShade(k)}
function chiselPt(X,Y){const pts=[[X,Y]],b=PNT.mir&&PNT.box;if(b&&X>=b[0]&&X<b[2]&&Y>=b[1]&&Y<b[3]){const mx=b[0]+b[2]-1-X,my=b[1]+b[3]-1-Y;if(PNT.mx)pts.push([mx,Y]);if(PNT.my)pts.push([X,my]);if(PNT.mx&&PNT.my)pts.push([mx,my])}
 for(const[px,py]of pts)for(let v=0;v<PNT.size;v++)for(let u=0;u<PNT.size;u++){const x=px+u,y=py+v;if(x>=0&&y>=0&&x<W&&y<H)chSet(y*W+x)}}
function chiselLine(x,y){const p=PNT.last||[x,y],n=Math.max(1,Math.ceil(Math.hypot(x-p[0],y-p[1])*2));for(let i=0;i<=n;i++)chiselPt(Math.floor(p[0]+(x-p[0])*i/n),Math.floor(p[1]+(y-p[1])*i/n));PNT.last=[x,y];ds0Need=true;solDirty=true}
function chApply(){const a=CHM[curMap];if(!a||a.length!==N)return;const m=CHB[curMap]=new Map();for(let j=0;j<N;j++)if(a[j]){if(sol[j]||OBJ[j])a[j]=0;else m.set(j,floor[j])}for(const j of m.keys())chShade(j)}
{const b0=build;build=function(){b0();if(curMap==='vault'&&!CHM.vault)vaultRose();else chApply()}}
// the Aurum hall's floor star, cut with the chisel: one quarter drawn inside a 6 by 5 tile mirror box
function vaultRose(){delete CHB.vault;const keep={...PNT};Object.assign(PNT,{mir:true,mx:true,my:true,size:1,box:[192,368,288,448]});const R=40;
 for(let Y=368;Y<408;Y++)for(let X=192;X<240;X++){const dx=X-239.5,dy=Y-407.5,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx),st=R*.42+R*.36*Math.pow(Math.abs(Math.cos(4*a)),3);if(r<3||r>=st*.55&&r<st-.8||r>R*.82+.7&&r<R-.7)chiselPt(X,Y)}
 Object.assign(PNT,{mir:keep.mir,mx:keep.mx,my:keep.my,size:keep.size,box:keep.box})}
// the map on screen was built before this file ran
if(curMap==='vault'&&!CHM.vault){vaultRose();snapPR();ds0Need=true;solDirty=true}{const r0=refinish;refinish=function(){r0();chApply();snapPR()}}
{const r0=reset;reset=function(){delete CHM[curMap];delete CHB[curMap];PU.length=0;r0()}}
function paintDown(x,y){if(PNT.k==='chisel'&&PNT.mir&&(!PNT.box||x<PNT.box[0]||y<PNT.box[1]||x>=PNT.box[2]||y>=PNT.box[3])){const cx=x/T|0,cy=y/T|0;PNT.drag=[cx,cy];PNT.box=[cx*T,cy*T,cx*T+T,cy*T+T];return}
 puPush();PDN=true;PNT.last=null;PNT.t=0;if(PNT.k==='chisel')chiselLine(x,y);else if(PNT.k!=='cond')daub(x,y)}
VIEW.addEventListener('pointerdown',e=>{if(panKey||UI.tool!=='paint'||UI.drop||e.button||!inBoard(e))return;e.stopPropagation();e.preventDefault();const[x,y]=toBoard(e);paintDown(x|0,y|0)},true);
window.addEventListener('pointermove',e=>{if(UI.tool!=='paint')return;const[x,y]=toBoard(e);
 // the mirror box: up to 6 by 6 tiles, snapped to tiles
 if(PNT.drag){const[a,b]=PNT.drag,cx=Math.max(0,Math.min(CW-1,x/T|0)),cy=Math.max(0,Math.min(CH-1,y/T|0)),x0=Math.max(Math.min(a,cx),a-5),x1=Math.min(Math.max(a,cx),a+5),y0=Math.max(Math.min(b,cy),b-5),y1=Math.min(Math.max(b,cy),b+5);PNT.box=[x0*T,y0*T,x1*T+T,y1*T+T];return}
 if(!PDN)return;if(PNT.k==='chisel')chiselLine(x|0,y|0);else if(PNT.k!=='cond')daub(x,y)});
window.addEventListener('pointerup',()=>{PDN=false;PNT.drag=null;PNT.last=null});

// signs: a marker with a note; hover shows it, double-click edits
const SMAT={wood:['Wood','#b08a5a','#4a3018'],stone:['Stone','#a6a096','#4e4a44'],marble:['Marble','#e6e4dc','#7a776e'],iron:['Iron','#8c969a','#2e3438'],brass:['Brass','#c9a660','#4a3a18']};UI.smat=LS.get('bs.smat','wood');
const SQP=['.kkkkkkkk.','kwwwwwwwwk','kwsswssswk','kwwwwwwwwk','kwssswsswk','kwwwwwwwwk','kwswssswwk','kwwwwwwwwk','kwsswswwwk','.kkkkkkkk.'];
const plate=m=>{const[,w,k]=SMAT[m]||SMAT.wood;return pix(SQP,{k,w,s:css(mix(rgb(parseInt(w.slice(1,3),16),parseInt(w.slice(3,5),16),parseInt(w.slice(5,7),16)),rgb(parseInt(k.slice(1,3),16),parseInt(k.slice(3,5),16),parseInt(k.slice(5,7),16)),.55))},2)};
const SIGNS={};const SL=mk('div','signs');$('stage').append(SL);let sgS=0,sgM='';
function drawSigns(){SL.innerHTML='';for(const s of SIGNS[curMap]||[]){const m=mk('div','sgn');m.style.left=s.x*S+'px';m.style.top=s.y*S+'px';m.append(plate(s.m));if(s.t){const t=mk('div','sgt',s.t);m.append(t)}m.ondblclick=e=>{e.stopPropagation();editSign(s)};m.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();signMenu(s,e)};m.onpointerdown=e=>e.stopPropagation();SL.append(m)}sgS=S;sgM=curMap}
// ui overlays drawn after each frame
const OVL=[];{const r0=render;render=function(){r0();for(const f of OVL)f()}}
OVL.push(()=>{if(sgS!==S||sgM!==curMap)drawSigns()});
{const s0=spawnMap;spawnMap=function(d){s0(d);if(d.ch&&d.CW===CW)for(const j of d.ch)chSet(j);if(d.signs)SIGNS[curMap]=d.signs.map(s=>({...s}));if(d.owner)OWN[curMap]=d.owner;sgM=''}}
function signCtx(){const L=mk('div','ulist');for(const[k,[n,c]]of Object.entries(SMAT)){const r=mk('div','urow'+(UI.smat===k?' on':''));const sw=mk('span','swd');sw.style.background=c;r.append(sw,mk('span','n',n));r.onclick=()=>{UI.smat=k;LS.set('bs.smat',k);signCtx();sgP()};L.append(r)}SNX.innerHTML='';SNX.append(L)}
const SNX=mk('div','snx');ZC.append(SNX);const SGP=mk('div','sgn sgp');SL.append(SGP);function sgP(){SGP.innerHTML='';SGP.dataset.m='';SGP.append(plate(UI.smat))}
// signs sit on cell centres; placing one puffs dust like a laid tile
const snapC=v=>(Math.floor(v/T)+.5)*T,SGK={wood:'wood',stone:'stone',marble:'marble',iron:'iron',brass:'brass'};
function signFx(s){const k=SGK[s.m]||'wood';puff(s.x/T|0,s.y/T|0,k);edSnd(matOf(k),1,.6,false)}
VIEW.addEventListener('pointermove',e=>{const mv=UI.mv,on=(UI.tool==='sign'||mv)&&!UI.pop&&inBoard(e);SGP.style.display=on?'block':'none';if(!on)return;const[x,y]=toBoard(e);if(SGP.parentElement!==SL)SL.append(SGP);if(mv&&SGP.dataset.m!==mv.m){SGP.innerHTML='';SGP.append(plate(mv.m));SGP.dataset.m=mv.m}SGP.style.left=snapC(x)*S+'px';SGP.style.top=snapC(y)*S+'px'});
window.addEventListener('pointerdown',e=>{if(!UI.mv||panKey)return;e.stopImmediatePropagation();e.preventDefault();const s=UI.mv;UI.mv=null;sgP();if(!e.button&&inBoard(e)){const[x,y]=toBoard(e);s.x=snapC(x);s.y=snapC(y);signFx(s)}drawSigns()},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&UI.mv){UI.mv=null;sgP();SGP.style.display='none';e.stopImmediatePropagation()}},true);
VIEW.addEventListener('pointerdown',e=>{if(panKey||UI.tool!=='sign'||e.button||!inBoard(e))return;e.stopPropagation();e.preventDefault();const[x,y]=toBoard(e),s={x:snapC(x),y:snapC(y),t:'',m:UI.smat};(SIGNS[curMap]=SIGNS[curMap]||[]).push(s);drawSigns();signFx(s);editSign(s)},true);
function signMenu(s,e){closeMenu();const r=SM.getBoundingClientRect();menu=mk('div','menu');menu.style.left=(e.clientX-r.left+4)+'px';menu.style.top=(e.clientY-r.top+4)+'px';
 const it=(n,f)=>{const b=mk('button',null,n);b.onclick=()=>{closeMenu();f()};menu.append(b)},L=()=>SIGNS[curMap]=SIGNS[curMap]||[];
 {const t=[...sel].find(o=>o.type==='token'&&o.status==='free'&&o.inv&&Math.hypot(o.x-s.x,o.y-s.y)<24);if(t)it('Take',()=>takeNote(t,s))}it('Edit',()=>editSign(s));it('Move',()=>{UI.mv=s});it('Duplicate',()=>{const c={...s};L().push(c);drawSigns();UI.mv=c});it('Delete',()=>{SIGNS[curMap]=L().filter(q=>q!==s);drawSigns()});SM.append(menu)}
function editSign(s){UI.sign=s;const t=mk('textarea','tbox');t.value=s.t;const ms=dsel(Object.entries(SMAT).map(([k,v])=>[k,v[0]]),s.m||'wood',v=>{s.m=v;drawSigns()});const del=ubtn('Delete','',()=>{SIGNS[curMap]=(SIGNS[curMap]||[]).filter(q=>q!==s);closePop();drawSigns()}),ok=ubtn('Done','lite',()=>{s.t=t.value.trim();closePop();if(!s.t)del.onclick();else drawSigns()});
 const r=mk('div','g2');r.append(del,ok);openPop('sign','Note',[t,form([['Material',ms]]),r]);setTimeout(()=>t.focus(),0)}

// spawner eraser: click or drag over units, items and cover to delete them
{let er=false;const zap=e=>{const[x,y]=toBoard(e);for(const b of [...bodies]){if(b.hidden||!b.set||b.type==='slab'&&!b.free)continue;const bx=Math.round(b.x),by=Math.round(b.y);let hit=false;for(let j=-3;j<=3&&!hit;j++)for(let i=-3;i<=3;i++)if(i*i+j*j<=9&&b.set.has(K(Math.round(x+i)-bx,Math.round(y+j)-by))){hit=true;break}if(hit){remove(b);sfx('drop')}}};
 VIEW.addEventListener('pointerdown',e=>{if(UI.tool!=='spawn'||!UI.del||e.button||panKey||!inBoard(e))return;e.stopImmediatePropagation();e.preventDefault();er=true;zap(e)},true);
 window.addEventListener('pointermove',e=>{if(er&&inBoard(e))zap(e)});window.addEventListener('pointerup',()=>er=false)}
// notes in a pack: hover shows the text, a click opens it to read or rewrite
function takeNote(t,s){if(!addItem(t,{k:'note',t:s.t,m:s.m})){sfx('dry');return}SIGNS[curMap]=(SIGNS[curMap]||[]).filter(q=>q!==s);drawSigns();sfx('flick');lastHud='';hbK=''}
function placeNote(q,x,y){const s={x:snapC(x),y:snapC(y),t:q.t||'',m:q.m||'wood'};(SIGNS[curMap]=SIGNS[curMap]||[]).push(s);drawSigns()}
function readNote(t,i){const q=t.inv[i];if(!q)return;const a=mk('textarea','tbox');a.value=q.t||'';const drop=ubtn('Drop','',()=>{closePop();dropSlot(t,i);lastHud='';hbK=''}),ok=ubtn('Done','lite',()=>{q.t=a.value.trim();closePop();lastHud='';hbK=''});const r=mk('div','g2');r.append(drop,ok);openPop('note','Note',[a,r]);setTimeout(()=>a.focus(),0)}

// popups: notched, draggable, kept on screen; ✕ or Esc closes
const PW=mk('div','pw');PW.innerHTML='<div class="pin"><div class="wt"><span></span><button class="x">✕</button></div><div class="pb"></div></div>';SM.append(PW);
PW.querySelector('.x').onclick=()=>closePop();
{let dg=null;PW.querySelector('.wt').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=PW.getBoundingClientRect();dg=[e.clientX-r.left,e.clientY-r.top];e.preventDefault()});
 window.addEventListener('pointermove',e=>{if(!dg)return;place(e.clientX-dg[0],e.clientY-dg[1])});window.addEventListener('pointerup',()=>dg=null)}
function place(x,y){const r=PW.getBoundingClientRect();PW.style.left=Math.max(0,Math.min(innerWidth-r.width,x))+'px';PW.style.top=Math.max(0,Math.min(innerHeight-r.height,y))+'px'}
function openPop(id,title,body){if(UI.pop==='ae'&&id!=='ae')closePop();UI.pop=id;PW.dataset.id=id;PW.querySelector('.wt span').textContent=title;const b=PW.querySelector('.pb');b.innerHTML='';b.append(...body);PW.style.display='block';
 const r=PW.getBoundingClientRect(),vr=VIEW.getBoundingClientRect();place(vr.left+(vr.width-r.width)/2,vr.top+Math.max(60,(vr.height-r.height)/2));$('bae').classList.toggle('on',id==='ae');$('bms').classList.toggle('on',id==='map');CORN.querySelector('.sig').classList.toggle('on',id==='map')}
function closePop(){if(!UI.pop)return;const was=UI.pop;UI.pop=null;PW.style.display='none';if(was==='sign'&&UI.sign&&!UI.sign.t){const q=UI.sign;SIGNS[curMap]=(SIGNS[curMap]||[]).filter(o=>o!==q);drawSigns()}if(was==='ae'){aeStash();AU.naming=false;PW.querySelector('.pb').innerHTML='';setMode(UT.find(t=>t[0]===UI.tool)[2])}for(const b of [$('bae'),$('bms'),CORN.querySelector('.sig')])b.classList.remove('on')}
function togglePop(id){if(UI.pop===id){closePop();return}if(id==='map')mapPop();else if(id==='games')gamesPop();else aePop()}
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&!PW.contains(e.target))return;if(UI.place||UI.drop){armDrop(UI.drop||'spawn');e.stopImmediatePropagation()}else if(UI.pop){closePop();e.stopImmediatePropagation()}},true);
function mapPop(){const mod=MODS.maps[curMap],own=Object.keys(NAT);
 const nm=tbox(mod?mod.name:(TITLE[curMap]||'Map'),v=>{if(MODS.maps[curMap]){MODS.maps[curMap].name=v;TITLE[curMap]=v;saveMods();fillMapSel()}else MNAME[curMap]=v});nm.id='mname';
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
  const r=mk('div','nmr');r.append(n,cls);const g=mk('div','g2');g.append(ubtn('Cancel','',()=>{AU.naming=false;aeBottom()}),ubtn('Save','lite',()=>{aeSave(true);AU.naming=false;aeBottom();PW.querySelector('.wt span').textContent='Asset Editor · '+tName(AE.key)}));ABT.append(r,g);setTimeout(()=>{n.focus();n.select()},0);return}
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


// hand of god: hotbar under the chosen unit, chest bar when it stands by one, camera follows a unit under direct control
const HCX=mk('div','hcx'),HB=mk('div','hbar'),CB=mk('div','hbar cbar'),HCO=mk('div','callout');$('stage').append(HCO);ZC.append(HCX);let hbK='',cbK='',hbSi=null,hbId=null,hbAm=null,hbHeld=false;
const STK=/^(grenade|bomb|spear|sspear|gold)$/,cnt=q=>!q?null:CAP[q.k]?(q.ammo??CAP[q.k])+'/'+(q.res||0):STK.test(q.k)?String(q.n||1):null,cntV=q=>!q?null:CAP[q.k]?(q.ammo??CAP[q.k])*1000+(q.res||0):STK.test(q.k)?q.n||1:null;
function callout(q,dim){HCO.innerHTML='';HCO.classList.remove('lo');const c=dim===undefined||dim===null?cnt(q):null,a=dim===''?'':dim||c||'';HCO.append(a||itemName(q));HCO.classList.toggle('am',!!a);HCO.classList.remove('go');void HCO.offsetWidth;HCO.classList.add('go')}
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()!=='r'||e.repeat||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const tk=[...sel].find(o=>o.type==='token'),q=tk&&tk.inv[tk.si];if(q&&CAP[q.k]&&!q.res&&(q.ammo??CAP[q.k])<CAP[q.k])callout(q,'no spare ammo');else if(q&&CAP[q.k]&&(q.ammo??CAP[q.k])>=CAP[q.k])callout(q)});
const SILK=['musket','pistol','grenade','rod'];
function sicon(k,w=42,h=30,n){const px=k==='gold'?solPx(n||100):shape(k,0,n||1),c=mk('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),id=g.createImageData(w,h),u=new Uint32Array(id.data.buffer);let mx=0,my=0,x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const p of px){mx+=p[0];my+=p[1];x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])}mx/=px.length;my/=px.length;if(k==='gold'){x0=y0=-7;x1=y1=7;mx=my=0}
 const k2=Math.max(1,Math.min(3,Math.floor(Math.min((w-4)/(x1-x0+1),(h-4)/(y1-y0+1)))));for(const p of px)for(let a=0;a<k2;a++)for(let b=0;b<k2;b++){const X=Math.round(w/2+(p[0]-mx)*k2)+a,Y=Math.round(h/2+(p[1]-my)*k2)+b;if(X>=0&&Y>=0&&X<w&&Y<h)u[Y*w+X]=p[2]}g.putImageData(id,0,0);return c}
// side-view icons for the hotbar
const HIC={musket:[['...................','..........bbbbbbbbb','wwwwwwwwwwbbbbbbbbb','wwwwww.............','wwww...............'],{w:'#7a4a2a',b:'#9aa0a6'},2],
 blunder:[['................bb','..........bbbbbbbb','wwwwwwwwwwbbbbbbbb','wwwwww..........bb','wwww..............'],{w:'#6a4428',b:'#b08a3a'},2],
 pistol:[['..........','wwwbbbbbbb','wwwbbbbbbb','ww........','ww........','ww........'],{w:'#6a4428',b:'#8c9298'},2],
 spear:[['...................bb.','wwwwwwwwwwwwwwwwwwbbbb','...................bb.'],{w:'#9a6a3e',b:'#c9ced2'},2],
 sspear:[['..................bbb.','wwwwwwwwwwwwwwwwwbbbbb','..................bbb.'],{w:'#4a4e54',b:'#e8ecef'},2],
 pgun:[['....pppp......','kkkkkkkkkkkkpp','kggggggggggkpp','kkkkkkkkkkkk..','kkk...........','kkk...........'],{k:'#2e3238',g:'#8e5cc0',p:'#c8a0ff'},2],
 rod:[['..kkkkkkkkkk...','kkkkkkkkkkkkkkk','kkkkggkkkkkkkkk','kkk............','kkk............'],{k:'#3a3e44',g:'#c9a227'},2],
 grenade:[['...kk...','..kggk..','.kggggk.','kggggggk','kggggggk','kggggggk','.kggggk.','..kkkk..'],{k:'#111',g:'#5f6a4a'},3],
 bomb:[['.....y..','....k...','..kkkk..','.kggggk.','kggggggk','kggggggk','.kggggk.','..kkkk..'],{k:'#111',g:'#3a3a3a',y:'#ffd84a'},3],
 gold:[['..kkkk..','.kyyyyk.','kyyddyyk','kydyydyk','kydyydyk','kyyddyyk','.kyyyyk.','..kkkk..'],{k:'#5a4410',y:'#e2c46a',d:'#b8942e'},3],
 box:[['kkkkkkkk','kwwwwwwk','kwyyyywk','kwwwwwwk','kkkkkkkk'],{k:'#3a2a18',w:'#8a6038',y:'#d8c08a'},3],
 cell:[['.kkkk.','kbbbbk','kbccbk','kbccbk','kbbbbk','.kkkk.'],{k:'#1a2a3a',b:'#3a6a9a',c:'#9ad8ff'},3]};
HIC.note=[['rrrrrrrrrrrrrr','spppppppppppps','spppppppppppps','spppppppppppps','spppppppppppps','sppppippipppps','spppppiippppps','spppppiippppps','sppppippipppps','spppppppppppps','spppppppppppps','spppppppppppps','spppppppppppps','qqqqqqqqqqqqqq'],{i:'#4a3524',p:'#ebdfc2',q:'#c4b28c',r:'#f6eed8',s:'#ddcea9'},2];
const hic=(k,n)=>k==='note'?pix(...HIC.note):sicon(k,42,30,k==='gold'?n:undefined);// every icon is the item's top-down sprite
function slotEl(q,sil,on,big=true){const d=mk('div','slot'+(on?' on':'')+(big?'':' sm'));if(q){if(q.k==='gold')d.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();if(!SCAR)splitInv(q)};const c=hic(q.k,q.n);d.append(c);const v=CAP[q.k]?q.ammo??CAP[q.k]:q.k!=='gold'&&(q.n>1||/^(grenade|bomb|spear|sspear)$/.test(q.k))?q.n||1:q.k==='gold'?q.n:'';if(v!==''){d.append(mk('b',null,v))}d.title=WP[q.k]?WP[q.k].n:q.k==='gold'?'Solari':q.k==='note'?q.t||'Note':q.k}
 else if(sil){const c=hic(sil);c.className='sil';d.append(c)}return d}
const itemName=q=>q?WP[q.k]?WP[q.k].n:q.k==='gold'?'Solari':q.k==='note'?'Note':q.k.endsWith('box')?'Ammo':q.k:'';
// selection rings: white under what is chosen, green while a unit is under direct control
function selRings(){for(const b of sel){if(b.hidden||!bodies.includes(b)||b.type==='slab'||b.status==='dead')continue;const tok=b.type==='token';let r=11.5;
 if(!tok){r=3;for(const p of b.px||[])r=Math.max(r,Math.hypot(p[0],p[1]));r=Math.min(10,r+2)}const c=tok&&b.direct?rgb(111,211,106):rgb(242,239,230),cx=b.x,cy=b.y,n=Math.ceil(r*7);
 for(let i=0;i<n;i++){const a=i/n*6.283,X=Math.round(cx+Math.cos(a)*r),Y=Math.round(cy+Math.sin(a)*r);if(X>=0&&Y>=0&&X<W&&Y<H&&!sol[Y*W+X])out[Y*W+X]=c}}}
// a chosen weapon or item: name and ammo above it and in the panel
let isK='';function itemSel(){const w=sel.size===1?[...sel][0]:!sel.size&&!openCrate&&hover;if(!w||w.type!=='weapon'||!WP[w.kind]||!bodies.includes(w)){if(isK){isK='';if(UI.tool==='hand')head('hand')}return false}
 const q={k:w.kind,ammo:w.ammo,res:w.res,n:w.kind==='gold'?w.amt:1},k=JSON.stringify([w.id,w.ammo,w.res,w.amt]);HCO.style.left=Math.round(w.x*S)+'px';HCO.style.top=Math.round((w.y-8)*S)+'px';if(k===isK)return true;isK=k;
 if(hbK){HCX.innerHTML='';hbK=''}callout(q,'');if(UI.tool==='hand'){TH.innerHTML='';TH.append(hic(w.kind),mk('span',null,itemName(q)));const a=CAP[w.kind]?(w.ammo??CAP[w.kind])+' / '+(w.res||0):w.kind==='gold'?'§'+(w.amt||0):'';if(a)TH.append(mk('i','dim',a))}return true}
function hotbar(){const tk=UI.tool==='hand'&&([...sel].filter(o=>o.type==='token')[0]||!sel.size&&!openCrate&&hover&&hover.type==='token'&&hover);const one=tk&&sel.size<=1&&tk.status!=='dead'&&bodies.includes(tk);if(!one&&!sel.size&&storePanel())return;
 if(!one&&itemSel())return;if(!one){if(hbK){HCX.innerHTML='';hbK='';if(UI.tool==='hand')head('hand')}hbId=null;return}
 const cs=tk.status==='free'?bodies.filter(o=>o.hidden&&o.inv&&near(tk,o)):[],c=cs[0]||null,k=JSON.stringify([tk.id,tk.si,tk.inv,tk.noAuto,tk.vip,tk.auto,tk.leader,tk.nat,cs.map(o=>[o.id,o.inv])]);
 if(k!==hbK){hbK=k;HCX.innerHTML='';
  const near0=[];for(const c of cs){cNorm(c);const h=mk('div','hlab',c.name||'Chest');const g=mk('div','hg g4');if(cT(c))for(const z of chSlots(c)){const d=slotEl(z&&z.q||null,null,false);if(z&&z.link)d.style.opacity=.35;if(z&&z.q)d.onpointerdown=e=>{e.preventDefault();moveItem(c,z.i,tk);lastHud='';hbK=''};g.append(d)}else{c.inv.forEach((q,i)=>{if(!q&&!c.table)return;const d=slotEl(q,null,false);if(q)d.onpointerdown=e=>{e.preventDefault();moveItem(c,i,tk);lastHud='';hbK=''};g.append(d)});padSlots(c,g)}const cp=mk('div','hpan wide');cp.append(g);near0.push(h,cp)}
  TH.innerHTML='';{const ic=tokIcon(tk),nn=mk('span',null,tk.name);nn.style.color=natLabel(tk);TH.append(ic,nn)}const n=mk('i');const g1=mk('div','hg g4'),g2=mk('div','hg g4'),hp=mk('div','hpan wide');
  const g3=mk('div','hg g4');for(let i=0;i<INVN;i++){const d=slotEl(tk.inv[i],i<4?SILK[i]:null,i===tk.si);d.onpointerdown=e=>{e.preventDefault();if(!e.shiftKey&&tk.inv[i])SPD={tk,i,x:e.clientX,y:e.clientY};if(e.shiftKey){if(c)moveItem(tk,i,c);else dropSlot(tk,i)}else if(tk.inv[i]&&tk.inv[i].k==='note')readNote(tk,i);else selectSlot(tk,i);lastHud='';hbK=''};(i<4?g1:g3).append(d)}
  hp.style.cssText='flex-direction:column;align-items:stretch;gap:2px';hp.append(mk('div','hlab','Weapons'),g1,mk('div','hlab','Pack'),g3);
  const tg=(v,f)=>chk(v,()=>{f();sfx('flick');lastHud='';hbK=''});
  HCX.append(n,hp,...near0,form([['Side',dsel(Object.keys(NAT).map(n=>[n,n]),tk.nat||'Neutral',v=>{tk.nat=v==='Neutral'?null:v;lastHud='';hbK=''})],['Auto pick-up',tg(!tk.noAuto,()=>tk.noAuto=!tk.noAuto)],['Protect',tg(!!tk.vip,()=>tk.vip=!tk.vip)],['Autonomous',tg(!!tk.auto,()=>{tk.auto=!tk.auto;if(tk.auto)say(tk,'On it',true);tk.ord=null})],['Leader',tg(!!tk.leader,()=>{const on=!tk.leader;for(const o of bodies)if(o.type==='token'&&teamOf(o)===teamOf(tk))o.leader=false;tk.leader=on})]]))}
 const q=tk.inv[tk.si],am=cntV(q);if(hbId===tk.id&&q){if(am!==null&&hbAm!==null&&am!==hbAm&&tk.si===hbSi){const lo=CAP[q.k]?Math.floor(am/1000)<Math.floor(hbAm/1000):am<hbAm;callout(q);HCO.classList.toggle('lo',lo)}else if(tk.held&&(hbSi!==tk.si||!hbHeld))callout(q,'')}hbId=tk.id;hbSi=tk.si;hbAm=am;hbHeld=!!tk.held;
 HCO.style.left=Math.round(tk.x*S)+'px';HCO.style.top=Math.round((tk.y-14)*S)+'px'}
// storage icon: the piece as it looks on the map, its top-left tile
function pieceIcon(c){if(c.vchest){const e=mk('canvas');e.width=e.height=T;const g=e.getContext('2d'),id=g.createImageData(T,T),o=new Uint32Array(id.data.buffer),P=vChestPx(MCHEST[c.ck][0]);for(let i=0;i<T*T;i++)o[i]=P[i]|0xff000000;g.putImageData(id,0,0);e.style.cssText='width:32px;height:32px;image-rendering:pixelated;flex:none';return e}const[cx,cy]=c.cells.reduce((a,b)=>b[1]<a[1]||b[1]===a[1]&&b[0]<a[0]?b:a),e=mk('canvas');e.width=e.height=T;const g=e.getContext('2d'),id=g.createImageData(T,T),o=new Uint32Array(id.data.buffer);for(let y=0;y<T;y++)for(let x=0;x<T;x++){const j=(cy*T+y)*W+cx*T+x;o[y*T+x]=(OBJ[j]?OBJC[j]:floor[j])|0xff000000}g.putImageData(id,0,0);e.style.cssText='width:32px;height:32px;image-rendering:pixelated;flex:none';return e}
function tokIcon(b){const c=mk('canvas');c.width=c.height=17;const g=c.getContext('2d'),id=g.createImageData(17,17),u=new Uint32Array(id.data.buffer),t={type:'token',ang:Math.PI/2,look:b.look,unit:b.unit,nat:b.nat,guard:b.guard,tone:b.tone},px=tokPixels(t),set=new Set(px.map(p=>K(p[0],p[1])));for(const p of px){let q=pcol(t,p);if(q===0)continue;if(!sprG(lookOf(t))&&(!set.has(K(p[0]+1,p[1]))||!set.has(K(p[0]-1,p[1]))||!set.has(K(p[0],p[1]+1))||!set.has(K(p[0],p[1]-1))))q=mul(q,.36);u[(p[1]+8)*17+p[0]+8]=q}g.putImageData(id,0,0);c.style.cssText='width:34px;height:34px;image-rendering:pixelated';return c}
// the camera follows a unit under direct control only when it's the one unit selected
function follow(){const ts=[...sel].filter(o=>o.type==='token'),tk=UI.tool==='hand'&&ts.length===1&&ts[0].direct&&ts[0].status!=='dead'&&ts[0];CAMF=!!tk;if(!tk)return;const v=VIEW,tx=v.clientWidth/2-tk.x*S,ty=v.clientHeight/2-tk.y*S;if(Math.abs(tx-cam.x)<.5&&Math.abs(ty-cam.y)<.5)return;cam.x+=(tx-cam.x)*.12;cam.y+=(ty-cam.y)*.12;applyCam()}
OVL.push(()=>{hotbar();follow()});
// spawner looks vary on their own: some conscripts turn out in the striped guard
const VARIANT={};
$('tpr').addEventListener('pointerdown',()=>{const b=bodies[bodies.length-1],v=b&&b.type==='token'&&VARIANT[b.look];if(v&&Math.random()<v[1]){b.look=v[0];b.px=tokPixels(b);mkSet(b)}});
{const c0=cleanUp;cleanUp=function(){const c=CL;c0();if(c&&c.k==='wand'&&!c.cells.length)US.none()}}
for(const sc of ZC.querySelectorAll('.sec'))sc.classList.remove('closed');
// tether: hover shows a green node (a unit, a wall face or a floor centre); click one, stretch, click the other
const TQ={kind:LS.get('bs.tk','rope'),a:null,hov:null,lastL:0,lastT:0},REACH=96;const TQX=mk('div','qcx');ZC.append(TQX);
function tetherCtx(){TQX.innerHTML='';const L=mk('div','ulist');for(const[k,n,c]of[['rope','Rope','#a07848'],['chain','Chain','#8c969a']]){const r=mk('div','urow'+(TQ.kind===k?' on':''));const sw=mk('span','swd');sw.style.background=c;r.append(sw,mk('span','n',n));r.onclick=()=>{TQ.kind=k;LS.set('bs.tk',k);tetherCtx()};L.append(r)}TQX.append(L)}
function clearTo(a,x,y){const d=Math.hypot(x-a.x,y-a.y),n=Math.ceil(d*2);let lx=a.x,ly=a.y;for(let i=1;i<=n;i++){const t=i/n,px=a.x+(x-a.x)*t,py=a.y+(y-a.y)*t;if(t*d>2.5&&(1-t)*d>2.5&&sol[(py|0)*W+(px|0)])return{x:lx,y:ly,hit:true};lx=px;ly=py}return{x,y,hit:false}}
function tNode(x,y){const u=bodyAt(x|0,y|0,7,null,o=>o.type==='token'&&o.status!=='dead');if(u)return{u,x:u.x,y:u.y};const cx=x/T|0,cy=y/T|0,k=map[cy]&&map[cy][cx];if(!k)return null;const isW=(a,b)=>{const n=map[b]&&map[b][a];return !!n&&!!WMAT[n]};
 let best=null;for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const wall=isW(cx,cy);if(wall===isW(cx+a,cy+b))continue;const px=cx*T+T/2+a*T/2,py=cy*T+T/2+b*T/2,d=Math.hypot(px-x,py-y);if(!wall&&d>6)continue;const s=wall?1:-1;if(!best||d<best.d)best={x:px,y:py,d,ix:Math.round(px-a*1.5*s),iy:Math.round(py-b*1.5*s)}}
 if(best)return{x:best.x,y:best.y,aj:best.iy*W+best.ix};if(WMAT[k])return null;return{x:cx*T+T/2,y:cy*T+T/2,aj:-1}}
VIEW.addEventListener('pointerdown',e=>{if(panKey||UI.tool!=='teth'||e.button||!inBoard(e))return;e.stopPropagation();e.preventDefault();const[x,y]=toBoard(e),n=tNode(x,y);if(!n)return;
 if(!TQ.a){TQ.a=n;TQ.lastL=0;sfx('flick');return}const a=TQ.a,u=a.u||n.u,w=a.u?n:a;if(!u||w.u||clearTo(a,n.x,n.y).hit)return;TQ.a=null;
 const d=Math.hypot(u.x-w.x,u.y-w.y);u.tether={kind:TQ.kind,x:w.x,y:w.y,aj:w.aj,s0:w.aj>=0?shp[w.aj]:0,len:Math.max(10,Math.min(REACH,d))+2,hp:TETH[TQ.kind].hp};sfx(TQ.kind==='chain'?'chink':'twang');lastHud=''},true);
window.addEventListener('pointermove',e=>{if(UI.tool!=='teth')return;const[x,y]=toBoard(e);TQ.hov=inBoard(e)?tNode(x,y):null;TQ.cx=x;TQ.cy=y;const a=TQ.a;if(!a)return;
 if(a.u){const d=Math.hypot(x-a.u.x,y-a.u.y);if(d>REACH){const tx=x-(x-a.u.x)/d*REACH,ty=y-(y-a.u.y)/d*REACH;if(!sol[(ty|0)*W+(tx|0)]){a.u.x=tx;a.u.y=ty;a.u.vx=a.u.vy=0}}a.x=a.u.x;a.y=a.u.y}
 const L=Math.min(REACH,Math.hypot(x-a.x,y-a.y)),t=performance.now();if(Math.abs(L-TQ.lastL)>5&&t-TQ.lastT>90){TQ.lastL=L;TQ.lastT=t;sfx(TQ.kind==='chain'?'chink':'creak')}});
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||UI.tool!=='teth'||UI.pop)return;e.stopImmediatePropagation();if(TQ.a)TQ.a=null;else pickTool('hand')},true);
OVL.push(()=>{if(UI.tool!=='teth')return;const a=TQ.a;ctx.save();
 if(a){let ex=TQ.cx,ey=TQ.cy;const d=Math.hypot(ex-a.x,ey-a.y);if(d>REACH&&!a.u){ex=a.x+(ex-a.x)/d*REACH;ey=a.y+(ey-a.y)/d*REACH}const sn=TQ.hov&&(!!TQ.hov.u!==!!a.u)&&!clearTo(a,TQ.hov.x,TQ.hov.y).hit;if(sn){ex=TQ.hov.x;ey=TQ.hov.y}else{const c=clearTo(a,ex,ey);ex=c.x;ey=c.y}
  ctx.strokeStyle=TQ.kind==='chain'?'#9aa0a6':'#a07848';ctx.lineWidth=1.5;if(TQ.kind==='chain')ctx.setLineDash([2,1.5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(ex,ey);ctx.stroke();ctx.setLineDash([])}
 const dot=(p,c)=>{ctx.fillStyle='#000';ctx.beginPath();ctx.arc(p.x,p.y,3.2,0,6.283);ctx.fill();ctx.fillStyle=c;ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,6.283);ctx.fill()};
 if(TQ.hov&&(!a||!!TQ.hov.u!==!!a.u&&!clearTo(a,TQ.hov.x,TQ.hov.y).hit))dot(TQ.hov,'#5ec45e');if(a)dot(a,'#f0a040');ctx.restore()});
// Esc on any tool returns to Command; letter keys pick tools
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||UI.pop==='ae')return;
 if(e.key==='Escape'){if(UI.pop||UI.drop||UI.place||UI.tool==='hand'||UI.tool==='teth'&&TQ.a)return;pickTool('hand');return}
 const k=Object.keys(UKEY).find(t=>UKEY[t].toLowerCase()===e.key.toLowerCase()&&UKEY[t].length===1);if(k&&!e.repeat){pickTool(k);e.preventDefault()}});
// painter: brush cursor and its reach on the map
const PCUR=(()=>{const c=pix(...UIC.paint,1),d=mk('canvas');d.width=24;d.height=20;const g=d.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(c,0,0,24,20);return`url(${d.toDataURL()}) 2 18, crosshair`})();
OVL.push(()=>{if(UI.tool!=='paint')return;const now=performance.now();if(PDN&&PNT.k==='cond'&&now-PNT.t>260){PNT.t=now;wearAt(mouse.x,mouse.y)}
 ctx.save();ctx.lineWidth=1;const box=(x,y,w,h,c)=>{ctx.strokeStyle='#000';ctx.strokeRect(x-.5,y-.5,w+1,h+1);ctx.strokeStyle=c;ctx.strokeRect(x+.5,y+.5,w-1,h-1)};
 if(PNT.k==='chisel'&&PNT.mir&&PNT.box){const b=PNT.box;box(b[0],b[1],b[2]-b[0],b[3]-b[1],'#d8b860');ctx.strokeStyle='rgba(216,184,96,.6)';ctx.beginPath();if(PNT.mx){const m=(b[0]+b[2])/2;ctx.moveTo(m,b[1]);ctx.lineTo(m,b[3])}if(PNT.my){const m=(b[1]+b[3])/2;ctx.moveTo(b[0],m);ctx.lineTo(b[2],m)}ctx.stroke()}
 if(mouse.in){if(PNT.k==='cond'){const cx=(mouse.x/T|0)-(PNT.size>1&&mouse.x%T<8?1:0),cy=(mouse.y/T|0)-(PNT.size>1&&mouse.y%T<8?1:0);box(cx*T,cy*T,T*PNT.size,T*PNT.size,'#fff')}
  else if(PNT.k==='chisel')box(mouse.x|0,mouse.y|0,PNT.size,PNT.size,'#fff');
  else{const R=3+PNT.size*4;ctx.strokeStyle='#000';ctx.beginPath();ctx.arc(mouse.x,mouse.y,R+.5,0,6.283);ctx.stroke();ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(mouse.x,mouse.y,R-.5,0,6.283);ctx.stroke()}}
 ctx.restore();if(cv.style.cursor!==PCUR)cv.style.cursor=PCUR});
// storage: glows on hover, click to open it here and drop things out of it, right-click to empty it
let stK='';function storePanel(){const c=openCrate||(!sel.size&&hoverC);if(UI.tool!=='hand'||!c||!c.inv||!bodies.includes(c)){if(stK){stK='';HCX.innerHTML='';head('hand')}return false}cNorm(c);
 const k=JSON.stringify([c.id,c.inv]);if(k===stK)return true;stK=k;hbK='';HCX.innerHTML='';TH.innerHTML='';TH.append(pieceIcon(c),mk('span',null,c.name||'Storage'));
 const g=mk('div','hg g4');if(cT(c))for(const z of chSlots(c)){const d=slotEl(z&&z.q||null,null,false);if(z&&z.link)d.style.opacity=.35;if(z&&z.q)d.onpointerdown=e=>{e.preventDefault();dropSlot(c,z.i);lastHud='';stK=''};g.append(d)}else{c.inv.forEach((q,i)=>{if(!q&&!c.table)return;const d=slotEl(q,null,false);if(q)d.onpointerdown=e=>{e.preventDefault();dropSlot(c,i);lastHud='';stK=''};g.append(d)});padSlots(c,g)}const cp=mk('div','hpan wide');cp.append(g);HCX.append(cp);return true}
// a container shows its room as empty slots: one per tile on a table, four per tile in a chest
function padSlots(c,g){const n=c.table?c.cells.length:Math.max(4,(c.cells?c.cells.length:2)*4);while(g.children.length<n)g.append(slotEl(null,null,false))}
window.addEventListener('pointermove',()=>{if(hoverC||!mouse.in||drag)return;const X=mouse.x|0,Y=mouse.y|0,k=OM[Y/T|0]&&OM[Y/T|0][X/T|0];if(k&&(PCK.has(k)||isTbl(k))&&!bodyAt(X,Y,1))hoverC=boxAt(X,Y)});
VIEW.addEventListener('contextmenu',e=>{if(EM||!inBoard(e))return;const[x,y]=toBoard(e),X=x|0,Y=y|0;if(bodyAt(X,Y,3))return;const k=OM[Y/T|0]&&OM[Y/T|0][X/T|0];if(!k||!PCK.has(k)&&!isTbl(k))return;const c=boxAt(X,Y);if(!c)return;e.preventDefault();e.stopPropagation();openMenu(c,e)},true);
// right-click a Solari stack (on a table, the floor or a panel slot) to lift half of it; right- or left-click a unit, table or the floor to set it down; Esc puts it back
var SCAR=null;const SCEL=mk('div','carry');SCEL.style.cssText='position:fixed;pointer-events:none;z-index:999;display:none;align-items:flex-end;gap:2px;font:12px monospace;color:#f4e6b0;text-shadow:0 1px 2px #000';document.body.append(SCEL);
function carryShow(){if(!SCAR||SCAR.n<=0){SCAR=null;SCEL.style.display='none';return}SCEL.innerHTML='';SCEL.append(hic('gold',SCAR.n),mk('b',null,String(SCAR.n)));SCEL.style.display='flex';lastHud='';hbK='';stK=''}
// where carried solari would go: the unit, crate, chest or table under it (look: test only, never makes a container)
function carryInto(X,Y,look){const t=bodyAt(X,Y,4,null,b=>b.type==='token'&&b.status!=='dead')||bodyAt(X,Y,3,null,b=>b.kind==='crate'&&!b.hidden);if(t||X<0||Y<0||X>=W||Y>=H)return t;const c=containerAt(X,Y);if(c||!OBJ[Y*W+X])return c;
 if(!look)return boxAt(X,Y);const k=OM[Y/T|0]&&OM[Y/T|0][X/T|0];return k&&(PCK.has(k)||isTbl(k))?{inv:1}:null}
window.addEventListener('pointermove',e=>{if(!SCAR)return;SCEL.style.left=e.clientX+8+'px';SCEL.style.top=e.clientY+4+'px';});
const lift=(n,from)=>{const t=Math.floor(n/2);if(t<1){NOPE();return 0}SCAR={n:t,from};carryShow();storeSnd('gold');return t};
function splitAt(X,Y){const p=bodies.find(b=>b.type==='weapon'&&b.kind==='gold'&&Math.abs(b.x-X)<=7&&Math.abs(b.y-Y)<=7);if(p){const t=lift(p.amt,{x:p.x,y:p.y});if(t){p.amt-=t;if(p.amt<=0)remove(p)}return true}
 const c=containerAt(X,Y);if(c&&c.table){const i=tCell(c,X,Y),q=c.inv[i];if(q&&q.k==='gold'){const t=lift(q.n,{c,i});if(t){q.n-=t;if(q.n<=0)c.inv[i]=null}return true}}return false}
function splitInv(q){for(const o of bodies){const i=o.inv?o.inv.indexOf(q):-1;if(i<0)continue;const t=lift(q.n,{c:o,i});if(t){q.n-=t;if(q.n<=0){o.inv[i]=null;if(o.si===i){o.held=null;o.si=-1}}}return}}
function putGold(o,X,Y){const it={k:'gold',n:SCAR.n};if(o.type==='token'){if(!addItem(o,it))return 0;return it.taken??SCAR.n}const g0=goldIn(o);cNorm(o);cAdd(o,it,X,Y);return goldIn(o)-g0}
function carryDrop(X,Y,into){if(!SCAR)return;let mv=0;const o=into||carryInto(X,Y);
 if(o&&o.inv)mv=putGold(o,X,Y);else if(!o&&X>=0&&Y>=0&&X<W&&Y<H&&!sol[Y*W+X]&&!OBJ[Y*W+X]){const w=weapon('gold',X,Y);w.amt=SCAR.n;w.noPick=tick+120;mv=SCAR.n}
 if(!mv){NOPE();return}SCAR.n-=mv;storeSnd('gold');carryShow()}
function carryBack(){if(!SCAR)return;const f=SCAR.from;if(f.c&&bodies.includes(f.c)){const q=f.c.inv[f.i];if(q&&q.k==='gold')q.n+=SCAR.n;else if(!q)f.c.inv[f.i]={k:'gold',n:SCAR.n};else{const w=weapon('gold',f.c.x,f.c.y);w.amt=SCAR.n}}else{const w=weapon('gold',f.x??mouse.x,f.y??mouse.y);w.amt=SCAR.n}SCAR=null;carryShow()}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&SCAR){e.stopImmediatePropagation();carryBack()}},true);
window.addEventListener('contextmenu',e=>{if(EM||UI.tool!=='hand')return;if(SCAR){e.preventDefault();e.stopImmediatePropagation();if(HCX.contains(e.target)){const o=openCrate||[...sel].find(b=>b.type==='token')||hoverC;if(o)carryDrop(-1,-1,o);return}if(inBoard(e)){const[x,y]=toBoard(e);carryDrop(x|0,y|0)}return}
 if(!inBoard(e))return;const[x,y]=toBoard(e);if(splitAt(x|0,y|0)){e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('pointerdown',e=>{if(!SCAR||e.button!==0)return;if(HCX.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();const o=openCrate||[...sel].find(b=>b.type==='token')||hoverC;if(o)carryDrop(-1,-1,o);return}if(!inBoard(e))return;e.preventDefault();e.stopImmediatePropagation();const[x,y]=toBoard(e);carryDrop(x|0,y|0)},true);
// drag a slot from the inventory panel out onto the board
let SPD=null;window.addEventListener('pointermove',e=>{if(SPD&&Math.hypot(e.clientX-SPD.x,e.clientY-SPD.y)>6){SDR={c:SPD.tk,i:SPD.i};SPD=null}});
// press an item inside a shown container and drag it to a unit, another container, a new spot or the floor
VIEW.addEventListener('pointerdown',e=>{if(UI.tool!=='hand'||e.button||panKey||!inBoard(e))return;const[x,y]=toBoard(e),h=storeHit(x|0,y|0);if(!h)return;e.stopImmediatePropagation();e.preventDefault();SDR=h;sfx('flick')},true);
window.addEventListener('pointerup',e=>{if(SPD){SPD=null;return}if(!SDR)return;const{c,i}=SDR;SDR=null;const q=c.inv[i];if(!q||!inBoard(e))return;const[x,y]=toBoard(e),X=x|0,Y=y|0;lastHud='';hbK='';stK='';
 const tk=bodyAt(X,Y,4,null,o=>o.type==='token'&&o.status!=='dead');if(tk){if(tk!==c)moveItem(c,i,tk);return}
 const to=bodyAt(X,Y,3,null,o=>o.kind==='crate'&&!o.hidden)||(OBJ[Y*W+X]?boxAt(X,Y):null);if(c.type==='token'){if(to)moveItem(c,i,to,x,y);else dropSlot(c,i);return}
 if(to===c&&cT(c)){const t=chAt(c,X,Y),sp=chSpots(c,q.k).filter(s=>s.includes(t)&&chRoom(c,s,q.k,q)>0).sort((a,b)=>a[0]===t?-1:1)[0];if(sp&&!same(sp,q.t)){const z=c.inv.find(e=>e&&e!==q&&e.k===q.k&&e.t&&same(e.t,sp));if(z&&amtK(q.k)){const m=Math.min(q.n,tcap(q.k)-c.inv.filter(e=>e&&e.t&&same(e.t,sp)).reduce((a,e)=>a+e.n,0));z.n+=m;q.n-=m;if(q.n<=0)c.inv[i]=null}else q.t=sp;storeSnd(q.k)}else if(!sp)NOPE();return}
 if(to===c&&c.table){const j=tCell(c,X,Y);if(j===i||j<0){openCrate=openCrate===c?null:c;sfx('door');return}const z=c.inv[j];if(!z){c.inv[j]=q;c.inv[i]=null;storeSnd(q.k);return}if(z.k==='gold'&&q.k==='gold'&&z.n<SOLMAX){const t=Math.min(SOLMAX-z.n,q.n);z.n+=t;q.n-=t;if(q.n<=0)c.inv[i]=null;storeSnd('gold');return}NOPE();return}
 if(to===c){const sn=cAt(c,q.k,x,y,q);if(sn){Object.assign(q,sn);storeSnd(q.k)}else NOPE();return}
 if(to){moveItem(c,i,to,x,y);return}
 if(X<0||Y<0||X>=W||Y>=H||sol[Y*W+X]||OBJ[Y*W+X]){NOPE();return}c.inv[i]=null;if(q.k==='note'){placeNote(q,X,Y);sfx('drop');return}if(!WP[q.k])return;const w=weapon(q.k,X,Y,q.r?Math.PI/2:0);if(q.k==='gold')w.amt=q.n;if(CAP[q.k]){w.ammo=q.ammo??CAP[q.k];w.res=q.res||0}w.noPick=tick+120;sfx('drop')});
// units are only controlled with Command: other tools drop control, and clicking a unit switches back
const freeCtl=e=>{if(panKey||UI.tool==='hand'||UI.drop||UI.place||e.button||!inBoard(e))return;const[x,y]=toBoard(e),b=bodyAt(x|0,y|0,1);if(b&&b.type==='token'&&b.status!=='dead'){pickTool('hand');return}if(!EM){e.stopImmediatePropagation();e.preventDefault()}};
cv.addEventListener('pointerdown',freeCtl,true);stage.parentElement.addEventListener('pointerdown',e=>{if(e.target===stage.parentElement||e.target===stage)freeCtl(e)},true);
window.addEventListener('keydown',e=>{if(UI.tool==='hand'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey)return;if(/^[wasdqecrvth1-4]$/i.test(e.key)||e.key==='Shift')e.stopImmediatePropagation()},true);
// space: tap to run or pause time, hold for slow-mo while held (space + drag still pans)
{let SP=null;const typing=e=>/INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
 window.addEventListener('keydown',e=>{if(e.code!=='Space'||e.repeat||typing(e)||SP)return;SP={t:performance.now(),pan:false,slow:false};SP.h=setTimeout(()=>{if(SP&&!SP.pan&&!slowMo){window.toggleSlow();SP.slow=true}},250)});
 window.addEventListener('pointerdown',()=>{if(!SP||[...sel].some(o=>o.direct))return;SP.pan=true;if(SP.slow){window.toggleSlow();SP.slow=false}},true);
 window.addEventListener('keyup',e=>{if(e.code!=='Space'||!SP)return;const p=SP;SP=null;clearTimeout(p.h);if(p.slow){if(slowMo)window.toggleSlow()}else if(!p.pan&&performance.now()-p.t<250&&!typing(e)){US.clock();setPlay(PAUSED)}});
 window.addEventListener('blur',()=>{if(SP&&SP.slow&&slowMo)window.toggleSlow();SP=null})}
sigil();sgP();pickTool(UT.some(t=>t[0]===UI.tool)?UI.tool:'hand');syncCorner();
objMat();
// double-click a unit: its squad from the last form-up, or units of its kind close by
VIEW.addEventListener('dblclick',e=>{if(UI.tool!=='hand'||EM||!inBoard(e))return;const[x,y]=toBoard(e),b=bodyAt(x|0,y|0,4,null,o=>o.type==='token'&&o.status==='free');if(!b)return;sel.clear();for(const o of bodies)if(o.type==='token'&&o.status==='free'&&!o.vseat&&(b.sq?o.sq===b.sq:o.unit===b.unit&&teamOf(o)===teamOf(b)&&Math.hypot(o.x-b.x,o.y-b.y)<6*T))sel.add(o)});
})();

