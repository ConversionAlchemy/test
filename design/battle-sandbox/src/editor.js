// editors: base content is read-only; every save is a mod kept apart from it
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
const MODS={tex:LS.get('bs.tex',{}),pat:LS.get('bs.pat',{}),maps:LS.get('bs.maps',{})};
// mods live in the browser and, when signed in, in the viewer's private store
let CLOUD=null;const SYNC={};
function saveMods(){const ok=LS.set('bs.tex',MODS.tex)&&LS.set('bs.pat',MODS.pat)&&LS.set('bs.maps',MODS.maps);cloudPush();return ok}
function cloudPush(){if(!CLOUD)return;const now={};for(const k of['tex','pat','maps'])for(const id in MODS[k])now[k+'~'+id]=JSON.stringify(MODS[k][id]);
 for(const d in now)if(SYNC[d]!==now[d]){SYNC[d]=now[d];CLOUD.doc(d).set({v:now[d]}).catch(()=>{delete SYNC[d]})}for(const d in SYNC)if(!(d in now)){delete SYNC[d];CLOUD.doc(d).delete().catch(()=>{})}}
setTimeout(async()=>{const db=await capUse('db'),u=await capUse('user');if(!db||!u)return;try{const id=await u.id();if(!id)return;const col=db.collection('data/users/'+id),q=await col.get();let add=false;
 for(const d of q.docs){const[k,mid]=d.id.split('~');if(!MODS[k])continue;let v;try{v=JSON.parse(d.data().v)}catch(e){continue}SYNC[d.id]=JSON.stringify(v);if(!MODS[k][mid]){MODS[k][mid]=v;add=true;if(k==='tex')regTex(mid);if(k==='maps')regMap(mid)}}
 CLOUD=col;if(add){LS.set('bs.tex',MODS.tex);LS.set('bs.pat',MODS.pat);LS.set('bs.maps',MODS.maps);fillMapSel();if(EM==='map')fillMapTools();if(EM==='asset')aeLists()}cloudPush()}catch(e){}},0);
const uidS=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const mk=(t,cls,txt)=>{const e=document.createElement(t);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
const flashB=(b,t)=>{const o=b.dataset.t||b.textContent;b.dataset.t=o;b.textContent=t;setTimeout(()=>b.textContent=o,900)};
function confirmB(b,f){if(b.dataset.arm){delete b.dataset.arm;b.textContent=b.dataset.t;f();return}b.dataset.t=b.textContent;b.dataset.arm=1;b.textContent='Sure?';setTimeout(()=>{if(b.dataset.arm){delete b.dataset.arm;b.textContent=b.dataset.t}},2500)}
const capUse=n=>window.claude&&window.claude.use?window.claude.use(n).catch(()=>null):Promise.resolve(null);
async function download(name,obj){const dl=await capUse('downloads');if(dl){try{await dl.save({filename:name,data:JSON.stringify(obj)})}catch(e){}return}try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj)],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove()}catch(e){}}
function pickFile(f){const i=document.createElement('input');i.type='file';i.accept='.json,application/json,text/plain';i.onchange=()=>{const r=new FileReader();r.onload=()=>{try{f(JSON.parse(r.result))}catch(e){}};if(i.files[0])r.readAsText(i.files[0])};i.click()}

// textures
const TNAME={marble:'White marble',dmarble:'Green marble',flag:'Flagstone',planks:'Oak planks',pplanks:'Pine planks',dplanks:'Teak planks',table:'Table',seat:'Chair',carpet:'Red carpet',gcarpet:'Green carpet',pcarpet:'Purple carpet',gfloor:'Gold floor',grass:'Grass',dirt:'Dirt',sky:'Sky',mfloor:'Metal floor',desk:'Desk',edesk:'Ebony desk',sill:'Sill',msill:'Marble sill',omarble:'Key marble',gtile:'Green key tile',bkmarble:'Black marble',bkslab:'Black slab',books:'Bookshelf',pave:'Paving',shelf:'Vault shelf',chest:'Chest',rack:'Rack',crop:'Wheat',wagon:'Wagon',
 stone:'Stone',gstone:'Gold stone',pillar:'Pillar',berm:'Earth bank',rail:'Fence',wood:'Oak',dwood:'Walnut',ewood:'Ebony',metal:'Metal',mplate:'Riveted plate',iron:'Iron',brass:'Brass',mpanel:'Metal panel',bush:'Hedge'};
const tName=k=>MODS.tex[k]?MODS.tex[k].name:TNAME[k]||k;
const TS=32,enc=a=>{let s='';for(const v of a)s+=(v<16?'0':'')+v.toString(16);return s},dec=s=>{const a=new Uint8ClampedArray(s.length/2);for(let i=0;i<a.length;i++)a[i]=parseInt(s.substr(i*2,2),16);return a};
const rootOf=k=>MODS.tex[k]?MODS.tex[k].from:k;
const furnK=k=>OBJK.has(rootOf(k))||rootOf(k)==='seat';
const BAKE=new Map();
function bake(k){if(BAKE.has(k))return BAKE.get(k);const a=new Uint8ClampedArray(TS*TS*3);for(let cy=0;cy<2;cy++)for(let cx=0;cx<2;cx++){const d=tilePix(k,cx,cy);for(let y=0;y<T;y++)for(let x=0;x<T;x++){const i=(y*T+x)*4,o=((cy*T+y)*TS+cx*T+x)*3;a[o]=d[i];a[o+1]=d[i+1];a[o+2]=d[i+2]}}BAKE.set(k,a);return a}
function regTex(id){const m=MODS.tex[id],d=dec(m.px),p=m.from;BAKE.delete(id);TEX[id]=(X,Y)=>{const i=((((Y%TS)+TS)%TS)*TS+(((X%TS)+TS)%TS))*3;return[d[i],d[i+1],d[i+2]]};KIND[id]=KIND[p]||'floor';if(WMAT[p])WMAT[id]=WMAT[p];if(SHINE[p])SHINE[id]=SHINE[p];if(OBJK.has(p)){OBJK.add(id);ONAME[id]=m.name}if(NOB.has(p))NOB.add(id);if(PLK.has(p))PLK.add(id)}
for(const id in MODS.tex)try{regTex(id)}catch(e){delete MODS.tex[id]}
const validK=k=>!!k&&(!!TEX[k]||!!P[k]||/[HNS]$/.test(k)&&!!WMAT[k.slice(0,-1)]);
function swatch(px,w=28,h=20){const c=mk('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),id=g.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=(y*TS+x)*3,i=(y*w+x)*4;id.data[i]=px[o];id.data[i+1]=px[o+1];id.data[i+2]=px[o+2];id.data[i+3]=255}g.putImageData(id,0,0);return c}
const baseKeys=kind=>Object.keys(KIND).filter(k=>!MODS.tex[k]&&TNAME[k]&&k!=='sill'&&k!=='msill'&&(kind==='furn'?furnK(k):!furnK(k)&&KIND[k]===kind));
const modKeys=kind=>Object.keys(MODS.tex).filter(k=>kind==='furn'?furnK(k):!furnK(k)&&KIND[k]===kind);
function texRows(host,kind,click,isOn,badge){host.innerHTML='';const add=(k,mod)=>{const d=mk('div');d.dataset.k=k;d.append(swatch(bake(k)),mk('span','n',tName(k)),mk('span','c '+(mod?'md':'lk'),badge(k,mod)));if(isOn(k))d.classList.add('on');d.onpointerdown=e=>{e.preventDefault();click(k,d)};host.appendChild(d)};
 for(const k of baseKeys(kind))add(k,false);const mods=modKeys(kind);if(mods.length){host.appendChild(mk('div','isep'));for(const k of mods)add(k,true)}}

// maps
const MAPBASE=[...$('msel').options].map(o=>[o.value,o.textContent]);
function regMap(id){const d=MODS.maps[id];MAPSZ[id]=[d.CW,d.CH];TITLE[id]=d.name;NBM[id]=()=>paintAll((cx,cy)=>{let k=d.map[cy]&&d.map[cy][cx];if(!validK(k))k=validK(d.tex&&d.tex[k])?d.tex[k]:'flag';return k});NUM[id]=()=>spawnMap(d)}
for(const id in MODS.maps)regMap(id);
function fillMapSel(){const ms=$('msel');ms.innerHTML='';const g1=mk('optgroup');g1.label='Base';for(const[v,n]of MAPBASE){const o=mk('option',null,n);o.value=v;g1.appendChild(o)}ms.appendChild(g1);const ids=Object.keys(MODS.maps);if(ids.length){const g2=mk('optgroup');g2.label='Mods';for(const id of ids){const o=mk('option',null,MODS.maps[id].name);o.value=id;g2.appendChild(o)}ms.appendChild(g2)}ms.value=curMap}
fillMapSel();
const r1=v=>Math.round(v*10)/10,cp=o=>o==null?o:JSON.parse(JSON.stringify(o));
function serMap(){const src=map.map((r,y)=>r.map((k,x)=>OM[y]&&OM[y][x]||k)),tex={};for(const r of src)for(const k of r)if(MODS.tex[k])tex[k]=MODS.tex[k].from;
 const sl=bodies.filter(b=>b.type==='slab'&&!b.fallen),B=[];
 for(const b of bodies){if(b.type==='token')B.push({t:'u',name:b.name,nat:b.nat,unit:b.unit,x:r1(b.x),y:r1(b.y),ang:r1(b.ang||0),look:b.look,tone:b.tone,status:b.status,guard:b.guard||undefined,leader:b.leader||undefined,auto:b.auto,neutral:b.neutral||undefined,inv:cp(b.inv),si:b.si>=0?b.si:b.psi??-1,teth:b.tether&&!b.tether.broken?b.tether.kind:undefined});
  else if(b.type==='slab'){if(b.fallen)continue;const a=b.ang;if(a){b.ang=0;orient(b)}B.push({t:'s',mat:b.mat,x:r1(b.x),y:r1(b.y),rot:b.rot,len:b.len,th:b.th,free:b.free||undefined,locked:b.locked||undefined,keys:b.keys||undefined,gold:b.gold||undefined,pair:b.pair?sl.indexOf(b.pair):undefined,col:b.src.map(q=>q[2])});if(a){b.ang=a;orient(b)}}
  else if(b.type==='weapon'){if(WP[b.kind]&&WP[b.kind].bullet)continue;if(b.hidden){B.push({t:'c',cx:b.cells[0][0],cy:b.cells[0][1],name:b.name,inv:cp(b.inv)});continue}B.push({t:'w',kind:b.kind,x:r1(b.x),y:r1(b.y),ang:r1(b.ang||0),ammo:b.ammo,res:b.res,amt:b.amt,inv:cp(b.inv)})}}
 return{v:1,CW,CH,map:src,tex,bodies:B}}
function spawnMap(d){const sl=[];for(const o of d.bodies)try{
 if(o.t==='u'){const b=token(o.name,o.nat,o.unit,o.x,o.y,o.guard,null);Object.assign(b,{ang:o.ang||0,look:o.look,tone:o.tone,status:o.status||'free',leader:o.leader,auto:o.auto!==false,neutral:o.neutral});b.inv=cp(o.inv)||[];while(b.inv.length<6)b.inv.push(null);b.si=o.si>=0&&b.inv[o.si]?o.si:-1;b.held=b.si>=0?b.inv[b.si]:null;b.hc=null;if(o.teth)tie(b,o.teth)}
 else if(o.t==='s'){const s=slab(o.mat,o.x,o.y,o.rot,o.len,o.th);if(o.free)s.free=true;s.locked=!!o.locked;if(o.keys)s.keys=o.keys;if(o.gold)s.gold=true;if(o.col&&o.col.length===s.src.length){o.col.forEach((c,i)=>s.src[i][2]=c);s.used=null;s.px=[];orient(s)}sl.push([s,o.pair])}
 else if(o.t==='c'){const c=container(o.cx,o.cy,[],o.name);if(c)c.inv=cp(o.inv)||[]}
 else if(o.t==='w'&&WP[o.kind]){const w=weapon(o.kind,o.x,o.y,o.ang||0);for(const f of['ammo','res','amt'])if(o[f]!==undefined)w[f]=o[f];if(o.inv)w.inv=cp(o.inv)}}catch(e){console.warn(e)}
 for(const[s,p]of sl)if(p!==undefined&&sl[p])s.pair=sl[p][0]}

// modes
let aiWas=false;const aiBtn=()=>[...bar.children].find(b=>b.textContent==='AI');
const MB={};{const sep=mk('span','sep');const add=(m,t)=>{const b=mk('button',null,t);b.onclick=()=>setMode(m);MB[m||'play']=b;return b};bar.prepend(add(null,'Play'),add('map','Map Editor'),add('asset','Asset Editor'),sep);MB.play.classList.add('on');
 setTimeout(()=>{for(const b of bar.children)if(/^(AI|Slow-mo)/.test(b.textContent))b.classList.add('play-only')},0)}
function setMode(m){if(m===EM)return;const was=EM;if(was==='asset')aeStash();EM=m;$('sm').dataset.mode=m||'play';for(const k in MB)MB[k].classList.toggle('on',k===(m||'play'));
 if(!was&&m){aiWas=aiOn;if(aiOn)aiBtn().click()}if(was&&!m&&aiWas&&!aiOn)aiBtn().click();
 sel.clear();drag=null;charge=null;box=null;moveSel=null;openCrate=null;closeMenu();edBrush=null;edStroke=null;lastHud='';
 if(m==='map'){edSrc=null;fillMapTools()}if(m==='asset')aeOpen();setTimeout(fit,0)}
{const u0=update;update=function(){if(!EM)return u0();tick++;if(drag)dragStep();if(tick%6===0)hud();doors()}}
{const s0=startDrag;startDrag=function(...a){s0(...a);if(EM&&drag)drag.free=true}}
{const r0=reset;reset=function(){edSrc=null;edUndo=[];edRedo=[];r0();if(EM==='map')fillMapTools()}}
{const g0=goMap;goMap=function(v){edSrc=null;edUndo=[];edRedo=[];g0(v);if(EM==='map')fillMapTools()}}

// map editor
let edBrush=null,edSize=1,edStroke=null,edSrc=null,edUndo=[],edRedo=[];
const srcNow=()=>edSrc&&edSrc.length===CH&&edSrc[0].length===CW?edSrc:(edSrc=map.map((r,y)=>r.map((k,x)=>OM[y]&&OM[y][x]||k)));
const isWallK=k=>!!k&&!!WMAT[k];
function edFloor(){const n={};for(const r of srcNow())for(const k of r)if(!isWallK(k)&&!furnK(k)&&KIND[k]==='floor'&&k!=='sill'&&k!=='msill')n[k]=(n[k]||0)+1;return Object.entries(n).sort((a,b)=>b[1]-a[1])[0]?.[0]||'flag'}
function floorNear(cx,cy){const s=srcNow();for(const[a,b]of[[0,1],[0,-1],[1,0],[-1,0]]){const k=s[cy+b]&&s[cy+b][cx+a];if(k&&!isWallK(k)&&!furnK(k)&&k!=='sill'&&k!=='msill')return k}return edFloor()}
function edPush(){edUndo.push(srcNow().map(r=>r.slice()));if(edUndo.length>60)edUndo.shift();edRedo=[]}
function refinish(){const s=srcNow();map=s.map(r=>r.slice());for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)paintCell(cx,cy,map[cy][cx]);EDG.clear();blendGround();objects();boards();borders();regions();
 for(const c of bodies.filter(o=>o.hidden))if(!c.cells.every(([a,b])=>OM[b]&&OM[b][a]))remove(c);snapDoors();sills();ds0Need=true;solDirty=true;fxDirty=true;if(ROOMS)ROOMS.t=-1e9}
function edPaint(cx,cy,k){const s=srcNow(),o=Math.floor((edSize-1)/2);for(let y=cy-o;y<cy-o+edSize;y++)for(let x=cx-o;x<cx-o+edSize;x++){if(x<0||y<0||x>=CW||y>=CH||s[y][x]===k)continue;s[y][x]=k;paintCell(x,y,k)}}
function edFill(cx,cy,k){const s=srcNow(),k0=s[cy][cx];if(k0===k)return;const q=[[cx,cy]];s[cy][cx]=k;while(q.length){const[a,b]=q.pop();for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=a+dx,y=b+dy;if(x<0||y<0||x>=CW||y>=CH||s[y][x]!==k0)continue;s[y][x]=k;q.push([x,y])}}}
const slabCell=d=>{let x=0,y=0;for(const p of d.px){x+=p[0];y+=p[1]}const n=d.px.length||1,X=Math.round(d.x)+x/n,Y=Math.round(d.y)+y/n;return(Y/T|0)*CW+(X/T|0)};
const DOORK={wood:['Wood door',2],iron:['Iron door',3],gold:['Gold door',3],ebony:['Ebony door',2],mahog:['Mahogany door',2]};
function mkDoor(k,x,y,rot){const d=slab(DOORK[k][1],x,y,rot);if(k==='gold'){goldify(d);orient(d)}else if(k==='ebony')mahogany(d,EBONY);else if(k==='mahog')mahogany(d);return d}
function doorIcon(k){const s=slabPix(DOORK[k][1]);for(const q of s){const c=q[2];if(k==='gold'){const l=((c&255)+(c>>8&255)+(c>>16&255))/765;q[2]=mix(rgb(110,84,26),rgb(252,232,160),Math.min(1,l*1.25))}else if(k==='ebony'||k==='mahog'){const x=q[8],y=q[9],e=Math.min(x,15-x,y+8,-1-y),w=woodT(x+93,y,k==='ebony'?EBONY:MAHOG,13);q[2]=e===2?rgb(cl(w[0]*.6+84),cl(w[1]*.6+67),cl(w[2]*.6+40)):rgb(cl(w[0]),cl(w[1]),cl(w[2]))}}return s.map(q=>[q[8],q[9],q[2]])}
function clearDoor(cx,cy){for(const d of bodies.filter(o=>o.type==='slab'&&!o.free&&slabCell(o)===cy*CW+cx)){if(d.pair)d.pair.pair=null;remove(d)}}
function placeDoor(k,cx,cy){const s=srcNow(),w=(x,y)=>isWallK(s[y]&&s[y][x]);clearDoor(cx,cy);const L=w(cx-1,cy),R=w(cx+1,cy),U=w(cx,cy-1),D=w(cx,cy+1),hz=L&&R||!(U&&D)&&(L||R);
 if(isWallK(s[cy][cx])){s[cy][cx]=floorNear(cx,cy);refinish()}if(hz)mkDoor(k,cx*T,cy*T+T/2+4,0);else mkDoor(k,cx*T+T/2-5,cy*T,1);snapDoors();sills();solDirty=true;sfx('door')}
function edResize(nw,nh){nw=Math.max(6,Math.min(64,nw|0));nh=Math.max(6,Math.min(64,nh|0));if(nw===CW&&nh===CH)return;edPush();const s=srcNow(),f=edFloor(),ns=Array.from({length:nh},(_,y)=>Array.from({length:nw},(_,x)=>s[y]&&s[y][x]||f));
 alloc(nw,nh);LR=new Float32Array(NB);LG=new Float32Array(NB);LB=new Float32Array(NB);LT=new Float32Array(NB);MAPSZ[curMap]=[nw,nh];edSrc=ns;for(const b of [...bodies])if(b.x<0||b.y<0||b.x>=W||b.y>=H)remove(b);refinish();camInit=true;fit()}
function edGive(w){if(w.type!=='weapon'||w.hidden)return false;const X=Math.round(w.x),Y=Math.round(w.y),tk=bodyAt(X,Y,4,w,o=>o.type==='token'&&o.status!=='dead');
 if(tk){const ok=CAP[w.kind]||WP[w.kind].melee||WP[w.kind].gun?(give(tk,w.kind,w.ammo,w.res),true):addItem(tk,{k:w.kind,n:w.kind==='gold'?w.amt||50:1});if(ok){remove(w);lastHud='';sfx('flick');return true}return false}
 const c=boxAt(X,Y);if(!c)return false;putIn(c,w.kind,w.kind==='gold'?w.amt||50:1,w);remove(w);openCrate=c;lastHud='';sfx('flick');return true}
function boxAt(X,Y){if(X<0||Y<0||X>=W||Y>=H||!OBJ[Y*W+X])return null;const c=containerAt(X,Y);if(c)return c;const cx=X/T|0,cy=Y/T|0;return OM[cy]&&OM[cy][cx]?container(cx,cy,[],null):null}
function putIn(c,k,n,w){const m=!CAP[k]&&c.inv.find(q=>q&&q.k===k);if(m){m.n=(m.n||1)+n;return}const it={k,n};if(CAP[k]){it.ammo=w&&w.ammo!==undefined?w.ammo:CAP[k];it.res=w&&w.res||RCAP(k)}const i=c.inv.indexOf(null);if(i>=0)c.inv[i]=it;else c.inv.push(it)}

function fillMapTools(){const f=$('mfile');f.innerHTML='';const mod=MODS.maps[curMap];
 const r1=mk('div','er'),ni=mk('input');ni.type='text';ni.id='mname';ni.value=mod?mod.name:(TITLE[curMap]||'Map')+' (mod)';r1.append(ni);
 const r2=mk('div','er'),b=(t,fn)=>{const x=mk('button',null,t);x.onclick=()=>fn(x);r2.appendChild(x);return x};
 b('Save',x=>{mapSave(false);flashB(x,'Saved')});b('Save as',x=>{mapSave(true);flashB(x,'Saved')});b('New',()=>mapNew());b('Export',()=>{const d=serMap();d.name=ni.value;download((ni.value||'map').replace(/\W+/g,'-')+'.json',{fluoria:1,maps:{[MODS.maps[curMap]?curMap:'mod:'+uidS()]:d},tex:usedTex(d)})});b('Import',()=>pickFile(o=>{const ids=importPack(o);if(ids.length)goMap(ids[0])}));
 if(mod)b('Delete',x=>confirmB(x,()=>{const id=curMap;goMap(mod.from&&!mod.from.startsWith('mod:')&&TITLE[mod.from]?mod.from:'bank');delete MODS.maps[id];delete STATE[id];saveMods();fillMapSel()}));
 const r3=mk('div','er');r3.append(mk('span',null,'Brush'));for(const n of[1,2,3]){const x=mk('button',null,n);if(n===edSize)x.classList.add('on');x.onclick=()=>{edSize=n;for(const y of r3.querySelectorAll('button'))y.classList.toggle('on',y===x)};r3.appendChild(x)}
 f.append(r1,r2,r3);
 const on=k=>edBrush&&edBrush.k===k,pick=(t,k,d)=>{edBrush=on(k)?null:{t,k};for(const x of document.querySelectorAll('#sm [id^=ed-] .wp>div,#sm [id^=ed-]>div'))x.classList.toggle('arm',!!edBrush&&x.dataset.k===edBrush.k)};
 texRows($('ed-fl'),'floor',(k,d)=>pick('tile',k,d),on,(k,m)=>m?'Mod':'');texRows($('ed-wl'),'wall',(k,d)=>pick('tile',k,d),on,(k,m)=>m?'Mod':'');texRows($('ed-fu'),'furn',(k,d)=>pick('tile',k,d),on,(k,m)=>m?'Mod':'');
 for(const x of document.querySelectorAll('#ed-fl>div,#ed-wl>div,#ed-fu>div'))x.classList.toggle('arm',on(x.dataset.k));
 const dr=$('ed-dr');dr.innerHTML='';for(const k in DOORK){const d=mk('div');d.dataset.k='door:'+k;const src=doorIcon(k);
  d.append(icon(src,1),mk('span','n',DOORK[k][0]),mk('span','c',''));d.classList.toggle('arm',on('door:'+k));d.onpointerdown=e=>{e.preventDefault();pick('door','door:'+k,d)};dr.appendChild(d)}
 const sz=$('ed-sz');sz.innerHTML='';const r4=mk('div','er'),wi=mk('input'),hi=mk('input');wi.type=hi.type='number';wi.value=CW;hi.value=CH;const ap=mk('button',null,'Apply');ap.onclick=()=>edResize(+wi.value,+hi.value);r4.append(mk('span',null,'Size'),wi,mk('span',null,'×'),hi,ap);r4.children[2].style.minWidth='0';sz.appendChild(r4)}
function usedTex(d){const t={};for(const r of d.map)for(const k of r)if(MODS.tex[k])t[k]=MODS.tex[k];return t}
function mapSave(asNew){const nm=($('mname')&&$('mname').value.trim())||TITLE[curMap]||'Map',d=serMap();d.name=nm;let id=curMap;
 if(!asNew&&MODS.maps[id])d.from=MODS.maps[id].from;else{d.from=MODS.maps[curMap]?MODS.maps[curMap].from:curMap;id='mod:'+uidS();curMap=id}
 MODS.maps[id]=d;saveMods();regMap(id);fillMapSel();$('sm').querySelector('header span').textContent=nm;fillMapTools()}
function mapNew(){const cw=20,ch=14,id='mod:'+uidS(),n=Object.values(MODS.maps).filter(m=>/^New map/.test(m.name)).length;MODS.maps[id]={v:1,name:'New map'+(n?' '+(n+1):''),from:null,CW:cw,CH:ch,map:Array.from({length:ch},(_,y)=>Array.from({length:cw},(_,x)=>x===0||y===0||x===cw-1||y===ch-1?'stone':'flag')),tex:{},bodies:[]};saveMods();regMap(id);fillMapSel();goMap(id)}
function importPack(o){const ids=[];if(!o||typeof o!=='object')return ids;if(o.px&&o.from){o={tex:{['m_'+uidS()]:o}}}else if(o.map&&o.CW){o={maps:{['mod:'+uidS()]:o}}}
 for(const[id,t]of Object.entries(o.tex||{}))if(t&&t.px&&t.from&&(TEX[t.from]||P[t.from])){MODS.tex[id]=t;regTex(id)}
 for(const[id0,m]of Object.entries(o.maps||{}))if(m&&m.map&&m.CW){const id=id0.startsWith('mod:')?id0:'mod:'+uidS();MODS.maps[id]=m;regMap(id);ids.push(id)}
 for(const[id,p]of Object.entries(o.pat||{}))if(p&&p.g)MODS.pat[id]=p;
 saveMods();fillMapSel();if(EM==='map')fillMapTools();if(EM==='asset')aeLists();return ids.length?ids:Object.keys(o.tex||{})}

// painting on the board
const view=stage.parentElement;view.style.position='relative';
view.addEventListener('pointerdown',e=>{if(EM!=='map'||panKey||e.button===1)return;if(!edBrush){if(e.button===0&&inBoard(e)){const[x,y]=toBoard(e),X=x|0,Y=y|0;if(!bodyAt(X,Y,1))boxAt(X,Y)}return}if(!inBoard(e))return;e.stopImmediatePropagation();e.preventDefault();closeMenu();
 const[x,y]=toBoard(e),cx=x/T|0,cy=y/T|0;if(edBrush.t==='door'){if(e.button===2)clearDoor(cx,cy);else placeDoor(edBrush.k.slice(5),cx,cy);return}
 const k=e.button===2?edFloor():edBrush.k;edPush();if(e.shiftKey){edFill(cx,cy,k);refinish();return}
 edStroke={k,rect:e.ctrlKey||e.metaKey,x0:cx,y0:cy,x1:cx,y1:cy,last:[cx,cy]};if(!edStroke.rect)edPaint(cx,cy,k)},true);
window.addEventListener('pointermove',e=>{if(!edStroke)return;const[x,y]=toBoard(e),cx=Math.max(0,Math.min(CW-1,x/T|0)),cy=Math.max(0,Math.min(CH-1,y/T|0));edStroke.x1=cx;edStroke.y1=cy;if(edStroke.rect)return;const[a,b]=edStroke.last,n=Math.max(Math.abs(cx-a),Math.abs(cy-b));for(let i=1;i<=n;i++)edPaint(Math.round(a+(cx-a)*i/n),Math.round(b+(cy-b)*i/n),edStroke.k);edStroke.last=[cx,cy]});
window.addEventListener('pointerup',()=>{if(!edStroke)return;const s=edStroke;edStroke=null;if(s.rect){const src=srcNow();for(let y=Math.min(s.y0,s.y1);y<=Math.max(s.y0,s.y1);y++)for(let x=Math.min(s.x0,s.x1);x<=Math.max(s.x0,s.x1);x++)src[y][x]=s.k}refinish()});
window.addEventListener('keydown',e=>{if(!EM||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase(),z=(e.ctrlKey||e.metaKey)&&k==='z',y=(e.ctrlKey||e.metaKey)&&k==='y';
 if(EM==='asset'){if(z||y){aeUndo(y||e.shiftKey);e.preventDefault();e.stopImmediatePropagation()}else if(k.startsWith('arrow')){aeShift(k==='arrowleft'?-1:k==='arrowright'?1:0,k==='arrowup'?-1:k==='arrowdown'?1:0);e.preventDefault();e.stopImmediatePropagation()}return}
 if(z||y){const a=y||e.shiftKey?edRedo:edUndo,b=a===edRedo?edUndo:edRedo;if(a.length){b.push(srcNow().map(r=>r.slice()));edSrc=a.pop();refinish()}e.preventDefault();e.stopImmediatePropagation();return}
 if(k==='escape'&&edBrush){edBrush=null;fillMapTools()}},true);
{const rn0=render;render=function(){rn0();if(EM!=='map')return;ctx.save();ctx.fillStyle='rgba(255,255,255,.06)';for(let x=T;x<W;x+=T)ctx.fillRect(x,0,1,H);for(let y=T;y<H;y+=T)ctx.fillRect(0,y,W,1);
 ctx.strokeStyle='rgba(242,239,230,.85)';ctx.lineWidth=1;const s=edStroke;if(s&&s.rect){const x0=Math.min(s.x0,s.x1),y0=Math.min(s.y0,s.y1);ctx.strokeRect(x0*T+.5,y0*T+.5,(Math.abs(s.x1-s.x0)+1)*T-1,(Math.abs(s.y1-s.y0)+1)*T-1)}
 else if(edBrush&&mouse.in){const n=edBrush.t==='door'?1:edSize,o=Math.floor((n-1)/2),cx=(mouse.x/T|0)-o,cy=(mouse.y/T|0)-o;ctx.strokeRect(cx*T+.5,cy*T+.5,n*T-1,n*T-1)}ctx.restore()}}

// items
const ITEMS=[['gold','Solari'],['mbox','Musket balls'],['pbox','Pistol shot'],['sbox','Shells'],['rbox','Bolter rods'],['cell','Plasma cells']];let itDrag=null;
{const host=$('items');for(const[k,n]of ITEMS){const d=mk('div');d.append(icon(shape(k,0),1),mk('span','n',n));let amt=null;if(k==='gold'){amt=mk('input');amt.type='number';amt.value=50;amt.min=1;amt.style.cssText='width:56px;background:transparent;border:0;padding:0;font-size:16px';amt.onpointerdown=e=>e.stopPropagation();d.append(amt)}else d.append(mk('span','c',''));
 d.onpointerdown=e=>{au();e.preventDefault();const g=icon(shape(k,0),2);g.className='ghost';g.style.left=e.clientX-28+'px';g.style.top=e.clientY-20+'px';$('sm').appendChild(g);itDrag={k,n:amt?Math.max(1,+amt.value||50):1,g}};host.appendChild(d)}}
window.addEventListener('pointermove',e=>{if(itDrag){itDrag.g.style.left=e.clientX-28+'px';itDrag.g.style.top=e.clientY-20+'px'}});
window.addEventListener('pointerup',e=>{if(!itDrag)return;const d=itDrag;itDrag=null;d.g.remove();if(!inBoard(e))return;const[x,y]=toBoard(e),X=x|0,Y=y|0;
 const tk=bodyAt(X,Y,3,null,o=>o.type==='token'&&o.status!=='dead');if(tk){sfx(addItem(tk,{k:d.k,n:d.n})?'flick':'dry');lastHud='';return}
 const c=boxAt(X,Y);if(c){putIn(c,d.k,d.n);openCrate=c;lastHud='';sfx('flick');return}if(WP[d.k]){const w=weapon(d.k,x,y,0);if(d.k==='gold')w.amt=d.n;sfx('drop')}});

// asset editor
const AE={key:null,px:null,from:null,mod:false,tool:'pen',col:[200,180,140],mx:false,my:false,undo:[],redo:[],drafts:{},sel:null,adj:null,cmp:false,pat:{mode:'Overlay',sc:1,vary:0}};const ZM=12;
const aeEl=mk('div');aeEl.id='ae';view.appendChild(aeEl);
const aec=mk('canvas');aec.id='aec';aec.width=TS*ZM;aec.height=TS*ZM;const ag=aec.getContext('2d');
const atb=mk('div','at'),apal=mk('div','pal'),asl=mk('div','ef'),apv=mk('div','pv'),colIn=mk('input'),curSw=mk('span','cur');colIn.type='color';
{const am=mk('div','am');am.append(aec,apal);aeEl.append(atb,am,asl,apv,colIn);asl.style.width=TS*ZM+'px'}
const TOOLS2=[['pen','Pen'],['fill','Fill'],['line','Line'],['rect','Rect'],['pick','Pick'],['sel','Select']];
function aeToolbar(){atb.innerHTML='';for(const[k,t]of TOOLS2){const b=mk('button',null,t);if(AE.tool===k)b.classList.add('on');b.onclick=()=>{AE.tool=k;aeToolbar()};atb.appendChild(b)}atb.appendChild(mk('span','sep'));
 for(const[k,t]of[['mx','Mirror X'],['my','Mirror Y']]){const b=mk('button',null,t);if(AE[k])b.classList.add('on');b.onclick=()=>{AE[k]=!AE[k];aeToolbar()};atb.appendChild(b)}atb.appendChild(mk('span','sep'));
 const u=mk('button',null,'Undo'),r=mk('button',null,'Redo');u.onclick=()=>aeUndo(false);r.onclick=()=>aeUndo(true);atb.append(u,r,mk('span','sep'),curSw);curSw.style.background=`rgb(${AE.col})`;curSw.onclick=()=>{colIn.value=toHex(AE.col);colIn.oninput=()=>{AE.col=fromHex(colIn.value);curSw.style.background=colIn.value;aePalette()};colIn.click()}}
const toHex=c=>'#'+c.map(v=>(v|0).toString(16).padStart(2,'0')).join(''),fromHex=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b),l=(M+m)/2;if(M===m)return[0,0,l];const d=M-m,s=l>.5?d/(2-M-m):d/(M+m);let h=M===r?(g-b)/d+(g<b?6:0):M===g?(b-r)/d+2:(r-g)/d+4;return[h/6,s,l]}
function hsl2rgb(h,s,l){if(!s)return[l*255,l*255,l*255];const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,f=t=>{t=(t%1+1)%1;return(t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p)*255};return[f(h+1/3),f(h),f(h-1/3)]}
function aeSliders(){asl.innerHTML='';for(const[k,t,mn,mx]of[['h','Hue',-180,180],['s','Saturation',-100,100],['l','Light',-50,50]]){const r=mk('div','er'),i=mk('input');i.type='range';i.min=mn;i.max=mx;i.value=AE.adj?AE.adj[k]:0;i.oninput=()=>{if(!AE.adj){aeSnap();AE.adj={h:0,s:0,l:0,base:AE.px.slice()}}AE.adj[k]=+i.value;aeAdjust()};r.append(mk('span',null,t),i);r.firstChild.style.minWidth='84px';asl.appendChild(r)}}
function aeAdjust(){const a=AE.adj,b=a.base,p=AE.px;for(let i=0;i<b.length;i+=3){let[h,s,l]=rgb2hsl(b[i],b[i+1],b[i+2]);h+=a.h/360;s=Math.max(0,Math.min(1,s*(1+a.s/100)));l=Math.max(0,Math.min(1,l+a.l/100*(a.l>0?1-l:l)));const c=hsl2rgb(h,s,l);p[i]=c[0];p[i+1]=c[1];p[i+2]=c[2]}aeDirty()}
const aeBake=()=>{if(AE.adj){AE.adj=null;aeSliders()}};
function aeSnap(){AE.undo.push(AE.px.slice());if(AE.undo.length>80)AE.undo.shift();AE.redo=[]}
function aeUndo(re){const a=re?AE.redo:AE.undo,b=re?AE.undo:AE.redo;if(!a.length)return;aeBake();b.push(AE.px.slice());AE.px=a.pop();aeDirty()}
function aeShift(dx,dy){if(!AE.px||!dx&&!dy)return;aeBake();aeSnap();const o=AE.px.slice();for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const s=((((y-dy)%TS)+TS)%TS*TS+(((x-dx)%TS)+TS)%TS)*3,d=(y*TS+x)*3;AE.px[d]=o[s];AE.px[d+1]=o[s+1];AE.px[d+2]=o[s+2]}aeDirty()}
const pget=(x,y)=>{const i=(y*TS+x)*3;return[AE.px[i],AE.px[i+1],AE.px[i+2]]},pset=(x,y,c)=>{const pts=[[x,y]];if(AE.mx)pts.push([TS-1-x,y]);if(AE.my)pts.push([x,TS-1-y]);if(AE.mx&&AE.my)pts.push([TS-1-x,TS-1-y]);for(const[a,b]of pts){if(a<0||b<0||a>=TS||b>=TS)continue;const i=(b*TS+a)*3;AE.px[i]=c[0];AE.px[i+1]=c[1];AE.px[i+2]=c[2]}};
function aeLine(x0,y0,x1,y1,c){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let i=0;i<=n;i++)pset(Math.round(x0+(x1-x0)*i/(n||1)),Math.round(y0+(y1-y0)*i/(n||1)),c)}
let aeDrag=null;const aeXY=e=>{const r=aec.getBoundingClientRect();return[Math.max(0,Math.min(TS-1,(e.clientX-r.left)/r.width*TS|0)),Math.max(0,Math.min(TS-1,(e.clientY-r.top)/r.height*TS|0))]};
aec.addEventListener('pointerdown',e=>{if(!AE.px)return;e.preventDefault();aec.setPointerCapture(e.pointerId);const[x,y]=aeXY(e),t=e.altKey||e.button===2?'pick':AE.tool;
 if(t==='pick'){AE.col=pget(x,y);aeToolbar();aePalette();return}if(t==='sel'){AE.sel={x0:x,y0:y,x1:x,y1:y};aeDrag={t};aeDraw();aePatOpts();return}
 aeBake();aeSnap();if(t==='fill'){const c0=pget(x,y)+'';if(c0===AE.col+'')return;const q=[[x,y]],seen=new Set([y*TS+x]);while(q.length){const[a,b]=q.pop();pset(a,b,AE.col);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const u=a+dx,v=b+dy;if(u<0||v<0||u>=TS||v>=TS||seen.has(v*TS+u)||pget(u,v)+''!==c0)continue;seen.add(v*TS+u);q.push([u,v])}}aeDirty();return}
 aeDrag={t,x0:x,y0:y,last:[x,y],snap:AE.px.slice(),fill:e.shiftKey};if(t==='pen'){pset(x,y,AE.col);aeDirty()}});
aec.addEventListener('pointermove',e=>{if(!aeDrag)return;const[x,y]=aeXY(e),d=aeDrag;if(d.t==='sel'){AE.sel.x1=x;AE.sel.y1=y;aeDraw();return}
 if(d.t==='pen'){aeLine(d.last[0],d.last[1],x,y,AE.col);d.last=[x,y]}else{AE.px.set(d.snap);if(d.t==='line')aeLine(d.x0,d.y0,x,y,AE.col);else{const x0=Math.min(d.x0,x),x1=Math.max(d.x0,x),y0=Math.min(d.y0,y),y1=Math.max(d.y0,y);for(let v=y0;v<=y1;v++)for(let u=x0;u<=x1;u++)if(d.fill||u===x0||u===x1||v===y0||v===y1)pset(u,v,AE.col)}}aeDirty()});
aec.addEventListener('pointerup',()=>{aeDrag=null});aec.addEventListener('contextmenu',e=>e.preventDefault());
function aePalette(){apal.innerHTML='';if(!AE.px)return;const n=new Map();for(let i=0;i<AE.px.length;i+=3){const k=(AE.px[i]>>3)<<10|(AE.px[i+1]>>3)<<5|AE.px[i+2]>>3;const e=n.get(k);if(e)e[0]++;else n.set(k,[1,i])}
 const top=[...n.values()].sort((a,b)=>b[0]-a[0]).slice(0,24).map(([,i])=>[AE.px[i],AE.px[i+1],AE.px[i+2]]).sort((a,b)=>rgb2hsl(...a)[2]-rgb2hsl(...b)[2]);
 for(const c of top){const s=mk('span');s.style.background=`rgb(${c})`;if(c+''===AE.col+'')s.classList.add('on');s.onclick=()=>{AE.col=c.slice();aeToolbar();aePalette()};
  s.oncontextmenu=e=>{e.preventDefault();colIn.value=toHex(c);let base=null;colIn.oninput=()=>{if(!base){aeBake();aeSnap();base=AE.px.slice()}const t=fromHex(colIn.value),d=[t[0]-c[0],t[1]-c[1],t[2]-c[2]];for(let i=0;i<base.length;i+=3){const q=Math.hypot(base[i]-c[0],base[i+1]-c[1],base[i+2]-c[2]);const f=q<20?1:q<44?(44-q)/24:0;if(f){AE.px[i]=base[i]+d[0]*f;AE.px[i+1]=base[i+1]+d[1]*f;AE.px[i+2]=base[i+2]+d[2]*f}else{AE.px[i]=base[i];AE.px[i+1]=base[i+1];AE.px[i+2]=base[i+2]}}aeDirty(true)};colIn.onchange=()=>aePalette();colIn.click()};apal.appendChild(s)}}
function aeDraw(){if(!AE.px)return;const im=ag.createImageData(TS,TS);for(let i=0,j=0;i<AE.px.length;i+=3,j+=4){im.data[j]=AE.px[i];im.data[j+1]=AE.px[i+1];im.data[j+2]=AE.px[i+2];im.data[j+3]=255}const tc=mk('canvas');tc.width=tc.height=TS;tc.getContext('2d').putImageData(im,0,0);ag.imageSmoothingEnabled=false;ag.drawImage(tc,0,0,TS*ZM,TS*ZM);
 ag.fillStyle='rgba(0,0,0,.18)';for(let i=1;i<TS;i++){ag.fillRect(i*ZM,0,1,TS*ZM);ag.fillRect(0,i*ZM,TS*ZM,1)}ag.fillStyle='rgba(255,255,255,.28)';ag.fillRect(T*ZM,0,1,TS*ZM);ag.fillRect(0,T*ZM,TS*ZM,1);
 if(AE.sel){const s=AE.sel,x0=Math.min(s.x0,s.x1),y0=Math.min(s.y0,s.y1);ag.strokeStyle='#f0a656';ag.lineWidth=2;ag.setLineDash([4,3]);ag.strokeRect(x0*ZM+1,y0*ZM+1,(Math.abs(s.x1-s.x0)+1)*ZM-2,(Math.abs(s.y1-s.y0)+1)*ZM-2);ag.setLineDash([])}}
function tilePx(src,X,Y){const i=((((Y%TS)+TS)%TS)*TS+(((X%TS)+TS)%TS))*3;return[src[i],src[i+1],src[i+2]]}
function aePreview(){apv.innerHTML='';if(!AE.px)return;const kind=furnK(AE.from)?'furn':KIND[AE.from],N=96,mkC=()=>{const c=mk('canvas');c.width=c.height=N;return c};
 const put=(c,f)=>{const g=c.getContext('2d'),im=g.createImageData(N,N);for(let Y=0;Y<N;Y++)for(let X=0;X<N;X++){const v=f(X,Y),i=(Y*N+X)*4;im.data[i]=v[0];im.data[i+1]=v[1];im.data[i+2]=v[2];im.data[i+3]=255}g.putImageData(im,0,0);apv.appendChild(c);return g};
 put(mkC(),(X,Y)=>tilePx(AE.px,X,Y));
 const wall=bake('stone'),flo=bake('flag'),sc2=(c,k)=>[c[0]*k,c[1]*k,c[2]*k],isW=(X,Y)=>{const cx=X>>4,cy=Y>>4;return kind==='wall'?cy===2||cx===2&&cy>2:kind==='floor'?cx===0||cy===0||cx===5||cy===5:false},isF=(X,Y)=>kind==='furn'&&(X>>4)>=1&&(X>>4)<=2&&(Y>>4)>=1&&(Y>>4)<=2;
 const room=(X,Y)=>{if(isW(X,Y))return sc2(kind==='wall'?tilePx(AE.px,X,Y):tilePx(wall,X,Y),isW(X,Y-1)?.9:1.08);if(isF(X,Y)){const x=X-16,y=Y-16,e=Math.min(x,y,31-x,31-y);const c=tilePx(AE.px,X,Y);return e===0?sc2(c,.5):e===1&&(x===1||y===1)?sc2(c,1.12):c}
  let c=kind==='floor'?tilePx(AE.px,X,Y):tilePx(flo,X,Y);if(isW(X,Y-1)||isW(X-1,Y))c=sc2(c,.66);else if(isW(X,Y-2)||isW(X-2,Y))c=sc2(c,.82);if(kind==='furn'&&(isF(X,Y-1)||isF(X,Y-2))&&!isF(X,Y))c=sc2(c,.6);return c};
 const g=put(mkC(),room),t={type:'token',ang:-Math.PI/2,look:'Watchman',unit:'home',nat:'Goldbank',guard:false,tone:0};try{const px=tokPixels(t),set=new Set(px.map(p=>K(p[0],p[1]))),cx=kind==='furn'?64:kind==='wall'?24:56,cy=kind==='wall'?20:58;for(const p of px){let c=pcol(t,p);if(c===0)continue;if(!sprG(lookOf(t))&&(!set.has(K(p[0]+1,p[1]))||!set.has(K(p[0]-1,p[1]))||!set.has(K(p[0],p[1]+1))||!set.has(K(p[0],p[1]-1))))c=mul(c,.36);g.fillStyle=css(c);g.fillRect(cx+p[0],cy+p[1],1,1)}}catch(e){}
 put(mkC(),(X,Y)=>{const c=room(X,Y);return[c[0]*.4,c[1]*.42,c[2]*.52]});
 if(AE.cmp)put(mkC(),(X,Y)=>tilePx(bake(AE.from),X,Y))}
function aeDirty(keepPal){AE.dirty=true;aeDraw();aePreview();if(!keepPal)aePalette();const r=document.querySelector(`#sm [id^=ae-] [data-k="${AE.key}"] .c`);if(r&&!r.textContent.includes('•'))r.textContent='• '+r.textContent}
function aeStash(){if(AE.key&&AE.dirty)AE.drafts[AE.key]={px:AE.px.slice(),undo:AE.undo,redo:AE.redo}}
function aeLoad(k){aeStash();aeBake();const d=AE.drafts[k];AE.key=k;AE.mod=!!MODS.tex[k];AE.from=rootOf(k);AE.px=d?d.px.slice():bake(k).slice();AE.undo=d?d.undo:[];AE.redo=d?d.redo:[];AE.dirty=!!d;AE.sel=null;aeLists();aeAsset();aeDraw();aePreview();aePalette()}
function aeOpen(){aeToolbar();aeSliders();aePatOpts();if(!AE.key)aeLoad('stone');else{aeLists();aeAsset();aeDraw();aePreview();aePalette()}}
function aeLists(){const badge=(k,m)=>(AE.drafts[k]&&k!==AE.key||k===AE.key&&AE.dirty?'• ':'')+(m?'Mod':'🔒');for(const[h,kind]of[['ae-fl','floor'],['ae-wl','wall'],['ae-fu','furn']])texRows($(h),kind,k=>aeLoad(k),k=>k===AE.key,badge);aePatList()}
function aeAsset(){const h=$('ae-as');h.innerHTML='';const r1=mk('div','er'),ni=mk('input');ni.type='text';ni.id='aen';ni.value=AE.mod?MODS.tex[AE.key].name:tName(AE.key)+' (mod)';r1.append(ni);
 const r0=mk('div','er');r0.append(mk('span',null,AE.mod?'From':'Base'),mk('span',null,tName(AE.from)));r0.lastChild.style.color='#c9c5b8';
 const r2=mk('div','er'),b=(t,f,host=r2)=>{const x=mk('button',null,t);x.onclick=()=>f(x);host.appendChild(x);return x};
 b('Save',x=>{aeSave(false);flashB(x,'Saved')});b('Save as',x=>{aeSave(true);flashB(x,'Saved')});if(AE.mod)b('Delete',x=>confirmB(x,()=>aeDelete()));if(AE.dirty||AE.mod)b('Revert',()=>{delete AE.drafts[AE.key];AE.dirty=false;AE.key=null;aeLoad(AE.mod?AE.from:AE.from)});
 const cb=b('Compare',()=>{AE.cmp=!AE.cmp;cb.classList.toggle('on',AE.cmp);aePreview()});cb.classList.toggle('on',AE.cmp);
 const r3=mk('div','er'),ta=mk('textarea');ta.spellcheck=false;r3.appendChild(ta);const r4=mk('div','er');
 b('Copy code',x=>{ta.value='// Fluoria texture\nFLUORIA_TEX('+JSON.stringify({name:ni.value,from:AE.from,kind:furnK(AE.from)?'furniture':KIND[AE.from],s:TS,px:enc(AE.px)})+')';ta.select();try{navigator.clipboard.writeText(ta.value).catch(()=>{})}catch(e){}try{document.execCommand('copy')}catch(e){}flashB(x,'Copied')},r4);
 b('Copy all mods',x=>{ta.value='// Fluoria mods\nFLUORIA_MODS('+JSON.stringify({tex:MODS.tex,pat:MODS.pat,maps:MODS.maps})+')';ta.select();try{navigator.clipboard.writeText(ta.value).catch(()=>{})}catch(e){}try{document.execCommand('copy')}catch(e){}flashB(x,'Copied')},r4);
 b('Load code',x=>{const s=ta.value,i=s.indexOf('{'),j=s.lastIndexOf('}');try{const ids=importPack(JSON.parse(s.slice(i,j+1)));if(ids.length&&MODS.tex[ids[0]])aeLoad(ids[0]);flashB(x,'Loaded')}catch(e){flashB(x,'Bad code')}},r4);
 const r5=mk('div','er');b('Export mods',()=>download('fluoria-mods.json',{fluoria:1,tex:MODS.tex,pat:MODS.pat,maps:MODS.maps}),r5);b('Import mods',x=>pickFile(o=>{importPack(o);flashB(x,'Loaded')}),r5);
 h.append(r1,r0,r2,r3,r4,r5)}
function aeSave(asNew){aeBake();const nm=($('aen').value||'').trim()||tName(AE.key)+' (mod)';let id=AE.key;if(AE.mod&&!asNew){Object.assign(MODS.tex[id],{name:nm,px:enc(AE.px)})}else{delete AE.drafts[AE.key];id='m_'+uidS();MODS.tex[id]={name:nm,from:AE.from,kind:KIND[AE.from],s:TS,px:enc(AE.px)}}
 delete AE.drafts[id];saveMods();regTex(id);AE.key=id;AE.mod=true;AE.dirty=false;aeLists();aeAsset();retex(id)}
function aeDelete(){const id=AE.key,p=AE.from;delete MODS.tex[id];delete AE.drafts[id];saveMods();BAKE.delete(id);if(map.some(r=>r.includes(id))||OM.some(r=>r&&r.includes(id))){edSrc=srcNow().map(r=>r.map(k=>k===id?p:k));refinish();edSrc=null}AE.key=null;aeLoad(p)}
function retex(id){if(!(map.some(r=>r.includes(id))||OM.some(r=>r&&r.includes(id))))return;srcNow();refinish();edSrc=null}
// patterns: five tones; base ones are the patterns behind the built-in textures
const PNAME={marble:'Veins',flag:'Flagstones',planks:'Planks',stone:'Brick bond',table:'Speckle',carpet:'Diamond weave',gfloor:'Bevel',pillar:'Fluting',grass:'Tufts',dirt:'Grit',berm:'Strata',sky:'Cloud',rail:'Rails',seat:'Cushion',key:'Key motif'};
function patGrid(k){if(MODS.pat[k])return MODS.pat[k];const g=new Uint8Array(TS*TS);for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){let v;if(k==='key'){const X=x&15,Y=y&15,qx=X<8?X:15-X,qy=Y<8?Y:15-Y;v=KEYQ[qy][qx]==='#'||KEYQ[qx][qy]==='#'&&qx===qy?4:X===0||Y===0?1:2}else v=P[k](x&15,y&15,{s:7,cx:x>>4,cy:y>>4});g[y*TS+x]=v}return{w:TS,h:TS,g}}
const TONE=[[.6,.62,.66],[.8,.8,.82],[1,1,1],[1.13,1.12,1.1],[1.28,1.26,1.22]];
function patIcon(k){const p=patGrid(k),c=mk('canvas');c.width=28;c.height=20;const g=c.getContext('2d'),im=g.createImageData(28,20);for(let y=0;y<20;y++)for(let x=0;x<28;x++){const v=(p.g[(y%p.h)*p.w+(x%p.w)]??2),l=[50,92,128,168,212][v]||128,i=(y*28+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=l;im.data[i+3]=255}g.putImageData(im,0,0);return c}
function aePatList(){const h=$('ae-pt');h.innerHTML='';const add=(k,mine)=>{const d=mk('div');d.dataset.k=k;d.append(patIcon(k),mk('span','n',mine?MODS.pat[k].name:PNAME[k]),mk('span','c '+(mine?'md':'lk'),mine?'Mod':'🔒'));d.onpointerdown=e=>{e.preventDefault();if(e.button===2&&mine){patMenu(k,e);return}aePattern(k)};d.oncontextmenu=e=>e.preventDefault();h.appendChild(d)};
 for(const k in PNAME)add(k,false);const mine=Object.keys(MODS.pat);if(mine.length){h.appendChild(mk('div','isep'));for(const k of mine)add(k,true)}}
function patMenu(k,e){closeMenu();const r=$('sm').getBoundingClientRect();menu=mk('div','menu');menu.style.left=(e.clientX-r.left+4)+'px';menu.style.top=(e.clientY-r.top+4)+'px';const i=mk('input');i.value=MODS.pat[k].name;i.onkeydown=ev=>{if(ev.key==='Enter'){MODS.pat[k].name=i.value||MODS.pat[k].name;saveMods();closeMenu();aePatList()}};const d=mk('button',null,'Delete');d.onclick=()=>{delete MODS.pat[k];saveMods();closeMenu();aePatList()};menu.append(i,d);$('sm').appendChild(menu);i.focus();i.select()}
function aePatOpts(){const h=$('ae-po');h.innerHTML='';const r=mk('div','er');for(const m of['Overlay','Fill']){const b=mk('button',null,m);if(AE.pat.mode===m)b.classList.add('on');b.onclick=()=>{AE.pat.mode=m;aePatOpts()};r.appendChild(b)}r.appendChild(mk('span','sep'));for(const s of[1,2]){const b=mk('button',null,s+'×');if(AE.pat.sc===s)b.classList.add('on');b.onclick=()=>{AE.pat.sc=s;aePatOpts()};r.appendChild(b)}
 const r2=mk('div','er'),v=mk('input');v.type='range';v.min=0;v.max=40;v.value=AE.pat.vary;v.oninput=()=>AE.pat.vary=+v.value;r2.append(mk('span',null,'Vary'),v);
 const r3=mk('div','er'),sb=mk('button',null,'Save selection as pattern');sb.disabled=!AE.sel;sb.style.opacity=AE.sel?1:.4;sb.onclick=()=>{patFromSel();flashB(sb,'Saved')};r3.appendChild(sb);h.append(r,r2,r3)}
const lum=(r,g,b)=>r*.3+g*.59+b*.11;
function patFromSel(){const s=AE.sel;if(!s)return;const x0=Math.min(s.x0,s.x1),y0=Math.min(s.y0,s.y1),w=Math.abs(s.x1-s.x0)+1,h=Math.abs(s.y1-s.y0)+1,L=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)L.push(lum(...pget(x0+x,y0+y)));const q=[...L].sort((a,b)=>a-b),th=[.1,.35,.65,.9].map(f=>q[Math.min(q.length-1,f*q.length|0)]);
 const g=L.map(l=>l<th[0]?0:l<th[1]?1:l<=th[2]?2:l<=th[3]?3:4),n=Object.keys(MODS.pat).length+1;MODS.pat['p_'+uidS()]={name:'Pattern '+n,w,h,g};saveMods();aePatList()}
function aePattern(k){if(!AE.px)return;aeBake();aeSnap();const p=patGrid(k),sc=AE.pat.sc,vary=AE.pat.vary/100,px=AE.px;let ramp=null;
 if(AE.pat.mode==='Fill'){const ls=[];for(let i=0;i<px.length;i+=3)ls.push([lum(px[i],px[i+1],px[i+2]),i]);ls.sort((a,b)=>a[0]-b[0]);ramp=[.04,.25,.5,.75,.96].map(f=>{const i=ls[Math.min(ls.length-1,f*ls.length|0)][1];return[px[i],px[i+1],px[i+2]]})}
 for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const u=(x/sc|0)%p.w,v0=(y/sc|0)%p.h,t=p.g[v0*p.w+u]??2,o=(y*TS+x)*3,f=1+(hh(x,y,77)-.5)*2*vary;
  if(ramp){const c=ramp[t];px[o]=c[0]*f;px[o+1]=c[1]*f;px[o+2]=c[2]*f}else{const m=TONE[t];px[o]*=m[0]*f;px[o+1]*=m[1]*f;px[o+2]*=m[2]*f}}aeDirty()}
})();
