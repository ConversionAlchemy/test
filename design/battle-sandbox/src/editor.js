// editors: base content is read-only; every save is a mod kept apart from it
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
const MODS={tex:LS.get('bs.tex',{}),pat:LS.get('bs.pat',{}),maps:LS.get('bs.maps',{})};EDOK=true;
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
const TNAME={grass:'Grass',dirt:'Dirt',sky:'Sky',sill:'Sill',msill:'Marble sill',crop:'Wheat',berm:'Earth bank',rail:'Fence',bush:'Hedge'};
for(const k in WPIECE)TNAME[k]=WPIECE[k][2];TNAME.hedge='Hedge';for(const k in MCHEST)TNAME[k]=MCHEST[k][1];
const catName=k=>{const c=CATN[k];if(!c)return null;const[el,mat,v,w,cd]=c;return memb(el,mat).n+' · '+(varsOf(el,mat)[v]||v)+(w?' wall':'')+(cd?' · '+CONDN[cd]:'')};
const tName=k=>MODS.tex[k]?MODS.tex[k].name:catName(k)||TNAME[k]||k;
const TS=32,enc=a=>{let s='';for(const v of a)s+=(v<16?'0':'')+v.toString(16);return s},dec=s=>{const a=new Uint8ClampedArray(s.length/2);for(let i=0;i<a.length;i++)a[i]=parseInt(s.substr(i*2,2),16);return a};
const rootOf=k=>MODS.tex[k]?MODS.tex[k].from:k;
const furnK=k=>OBJK.has(rootOf(k))||wshape(rootOf(k))==='seat';
const BAKE=new Map();
function bake(k){if(BAKE.has(k))return BAKE.get(k);const a=new Uint8ClampedArray(TS*TS*3);for(let cy=0;cy<2;cy++)for(let cx=0;cx<2;cx++){const d=tilePix(k,cx,cy);for(let y=0;y<T;y++)for(let x=0;x<T;x++){const i=(y*T+x)*4,o=((cy*T+y)*TS+cx*T+x)*3;a[o]=d[i];a[o+1]=d[i+1];a[o+2]=d[i+2]}}BAKE.set(k,a);return a}
// layered textures: base colour, material, layout, variation, wear, stamp; drawn in world space so they join across cells
const MATS={stone:'Stone',marble:'Marble',wood:'Wood',metal:'Metal',plaster:'Plaster',cloth:'Cloth',grass:'Grass',soil:'Soil',flat:'Flat'};
const LAYS={none:'None',planks:'Planks',slabs:'Slabs',flags:'Flagstones',bricks:'Bricks',tiles:'Tiles'};
const FLB=[[0,6,[0,7]],[6,11,[3,10]],[11,16,[1,9,13]]];
function recTex(r){const s=r.seed|0,B=r.base,jw=r.jw||1,jd=r.jd??.8,v=r.vary??.3,we=r.wear||{},st=r.stamp?dec(r.stamp):null;
 const mat=(X,Y)=>{switch(r.mat){case'stone':return stoneT(X,Y,B,s);case'marble':return mx(stoneT(X,Y,B,11+s),sc(B,1.06),.4);case'wood':return woodT(X,Y,B,s);case'metal':{const m=metalCore(X,Y);return sc(B,(m[0]+m[1]+m[2])/396)}case'plaster':return sc(B,.92+fbm(X/6,Y/6,30+s)*.14+(hh(X,Y,31+s)-.5)*.04);case'cloth':return sc(B,(.9+fbm(X/8,Y/8,32+s)*.16)*((X+Y)&1?.97:1.03));case'grass':{const g=grassT(X,Y);return sc(B,(g[0]+g[1]+g[2])/229)}case'soil':{const g=soilT(X,Y);return sc(B,(g[0]+g[1]+g[2])/260)}default:return B.slice()}};
 const lay=(X,Y)=>{const L=r.lay||'none';
  if(L==='planks'){const y=Y&7;return[y>=8-jw?jd:y===0?1.05:1,Y>>3]}
  if(L==='slabs'){const x=X&15,y=Y&15;return[x<jw||y<jw?jd:x===jw||y===jw?1.07:x===15||y===15?.94:1,(Y>>4)*977+(X>>4)]}
  if(L==='tiles'){const x=X&7,y=Y&7;return[x<jw||y<jw?jd:1,(Y>>3)*977+(X>>3)]}
  if(L==='bricks'){const row=Y>>3,xx=X+(row&1?8:0);return[(Y&7)<jw||(xx&15)<jw?jd:1,row*977+(xx>>4)]}
  if(L==='flags'){const x=X&15,y=Y&15,cx=X>>4,cy=Y>>4;for(let b=0;b<3;b++){const[a,e,cu]=FLB[b];if(y<a||y>=e)continue;let k=0;for(const c of cu)if(x>=c)k++;const j=y-a<jw||cu.some(c=>x>=c&&x<c+jw);return[j?jd:1,((cy*977+cx)*3+b)*5+(k%cu.length)]}return[1,0]}
  if(L.startsWith('pat:')){const p=patGrid(L.slice(4)),t=p.g[(((Y%p.h)+p.h)%p.h)*p.w+(((X%p.w)+p.w)%p.w)]??2;return[TONE[t][0],0]}
  return[1,0]};
 return(X,Y)=>{let c=mat(X,Y);const[sh,pid]=lay(X,Y);let f=sh*(1+(hh(pid%9973,pid/9973|0,s+5)-.5)*v*.35);
  if(we.edge&&sh>=1&&(lay(X-1,Y)[0]<1||lay(X,Y-1)[0]<1))f*=1-we.edge*.14;if(we.scuff&&fbm(X/5,Y/5,40+s)>1-we.scuff*.38)f*=.9;if(we.crack&&vn(X/7,Y/7,54+s)>.55&&Math.abs(vn(X/11,Y/11,52+s)-.5)<we.crack*.025)f*=.8;
  c=sc(c,f);if(st){const i=((Y&15)*16+(X&15))*4;if(st[i+3])c=[st[i],st[i+1],st[i+2]]}return c}}
const BASEREC={grass:[GRASS,'grass','none'],dirt:[SOIL,'soil','none'],bush:[GDARK,'grass','none'],rail:[WOOD.rail,'wood','none'],berm:[[104,86,64],'wood','none']};
for(const k in WPIECE)BASEREC[k]=[memb('Wood',WPIECE[k][0]).c,'wood','none'];
function baseRec(k){k=modK(k);if(CATN[k]&&!BASEREC[k]){const[el,mat,v]=CATN[k],M=memb(el,mat),lay={flags:'flags',slabs:'slabs',paving:'slabs',planks:'planks',boards:'planks',panel:el==='Metal'?'tiles':'slabs',rivet:'slabs'}[v]||'none';BASEREC[k]=el==='Earth'?[mat==='dirt'?SOIL:mat==='hedge'?GDARK:mat==='wheat'?[196,166,84]:GRASS,mat==='dirt'||mat==='wheat'?'soil':'grass','none']:el==='Metal'?[M.c?mx([126,140,146],M.c,.55).map(v=>v|0):[130,142,140],'metal',lay]:[M.c.slice(),mprop(el,mat).cls,lay]}const b=BASEREC[k];if(b)return{base:b[0].slice(),mat:b[1],lay:b[2],jw:1,jd:.8,vary:.3,seed:0,wear:{edge:0,scuff:0,crack:0},stamp:null};const p=bake(k);let r=0,g=0,bl=0;for(let i=0;i<p.length;i+=3){r+=p[i];g+=p[i+1];bl+=p[i+2]}const n=p.length/3;return{base:[r/n|0,g/n|0,bl/n|0],mat:matK(k),lay:'none',jw:1,jd:.8,vary:.3,seed:0,wear:{edge:0,scuff:0,crack:0},stamp:null}}
function regTex(id){const m=MODS.tex[id],p=m.from;BAKE.delete(id);if(m.rec){TEX[id]=recTex(m.rec);if(m.rec.lay==='planks')PLK.add(id);else PLK.delete(id)}else{const d=dec(m.px);TEX[id]=(X,Y)=>{const i=((((Y%TS)+TS)%TS)*TS+(((X%TS)+TS)%TS))*3;return[d[i],d[i+1],d[i+2]]}}KIND[id]=KIND[p]||'floor';if(WMAT[p])WMAT[id]=hitCls(matK(id));if(SHINE[p])SHINE[id]=SHINE[p];if(OBJK.has(p)){OBJK.add(id);ONAME[id]=m.name}for(const S of[NOB,PCK,RUG,NODK,POLT])if(S.has(p))S.add(id);if(PLK.has(p)&&!m.rec)PLK.add(id)}
for(const id in MODS.tex)try{regTex(id)}catch(e){delete MODS.tex[id]}
const validK=k=>!!k&&(!!TEX[k]||/[HNS]$/.test(k)&&!!WMAT[k.slice(0,-1)]);
function swatch(px,w=28,h=20){const c=mk('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),id=g.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=(y*TS+x)*3,i=(y*w+x)*4;id.data[i]=px[o];id.data[i+1]=px[o+1];id.data[i+2]=px[o+2];id.data[i+3]=255}g.putImageData(id,0,0);return c}
// retired furniture stays drawable for older maps but is not offered
const RETIRED=new Set(['books','shelf','rack','wagon']);
const baseKeys=kind=>Object.keys(KIND).filter(k=>!MODS.tex[k]&&!CATN[k]&&TNAME[k]&&!RETIRED.has(k)&&k!=='sky'&&k!=='sill'&&k!=='msill'&&(kind==='furn'?furnK(k):!furnK(k)&&KIND[k]===kind));
const modKeys=kind=>Object.keys(MODS.tex).filter(k=>kind==='furn'?furnK(k):!furnK(k)&&KIND[k]===kind);
// tile picker: element > material > variation, floor or wall, plus recent tiles
const PK={el:'Stone',mat:'grey',v:'block',w:0},EORDER=['Earth','Metal','Stone','Wood','Cloth'];let RECENT=LS.get('bs.recent',[]).filter(k=>TEX[k]);
const pkKey=()=>PK.el==='Mods'?PK.mat:PK.el.toLowerCase()+'.'+PK.mat+'.'+PK.v+(PK.w?'.w':'');
function pkFrom(k){if(CATN[k]){const[el,mat,v,w]=CATN[k];Object.assign(PK,{el,mat,v,w})}else if(MODS.tex[k]&&!furnK(k))Object.assign(PK,{el:'Mods',mat:k})}
function addRecent(k){RECENT=[k,...RECENT.filter(q=>q!==k)].slice(0,8);LS.set('bs.recent',RECENT)}
function tilePicker(host,onPick,isOn){host.innerHTML='';host.classList.add('mk');const row=(t,opts,cur,f)=>{const d=mk('div'),s=mk('select');for(const[v,n]of opts){const o=mk('option',null,n);o.value=v;s.appendChild(o)}s.value=cur;s.onchange=()=>{f(s.value);tilePicker(host,onPick,isOn);onPick(pkKey(),true)};d.append(mk('span','ml',t),s,mk('span','c','▾'));host.appendChild(d)};
 const mods=Object.keys(MODS.tex).filter(k=>!furnK(k)),els=[...EORDER,...(mods.length?['Mods']:[])];
 row('Element',els.map(e=>[e,e]),PK.el,v=>{PK.el=v;if(v==='Mods')PK.mat=mods[0];else{PK.mat=Object.keys(ELEM[v].mats)[0];PK.v=Object.keys(ELEM[v].vars)[0]}});
 if(PK.el==='Mods'){if(!MODS.tex[PK.mat])PK.mat=mods[0];row('Texture',mods.map(k=>[k,MODS.tex[k].name]),PK.mat,v=>PK.mat=v)}
 else{const E=ELEM[PK.el];if(!E.mats[PK.mat])PK.mat=Object.keys(E.mats)[0];if(!varsOf(PK.el,PK.mat)[PK.v])PK.v=Object.keys(E.vars)[0];row('Material',Object.entries(E.mats).map(([k,m])=>[k,m[0]]),PK.mat,v=>PK.mat=v);row('Variation',Object.entries(varsOf(PK.el,PK.mat)),PK.v,v=>PK.v=v);
  const d=mk('div');d.append(mk('span','ml','Type'));const tb=mk('span');tb.style.cssText='display:flex;gap:3px';for(const[w,n]of[[0,'Floor'],[1,'Wall']]){const b=mk('button',null,n);b.style.cssText='font-size:15px;padding:0 6px;line-height:18px';if(PK.w===w)b.classList.add('on');b.onclick=()=>{PK.w=w;tilePicker(host,onPick,isOn);onPick(pkKey(),true)};tb.appendChild(b)}d.append(tb,mk('span'));host.appendChild(d)}
 const k=pkKey(),pv=mk('div');pv.id='tpv';pv.style.cssText='height:74px;display:flex;align-items:center;justify-content:center;cursor:var(--c-grab)';const c=swatch(bake(k),32,32);c.style.cssText='width:64px;height:64px;image-rendering:pixelated;outline:'+(isOn(k)?'2px solid #e0a040':'1px solid #000');pv.appendChild(c);pv.onpointerdown=e=>{e.preventDefault();onPick(k,false)};host.appendChild(pv);
 if(RECENT.length){const r=mk('div');r.style.cssText='display:flex;gap:3px;justify-content:center;height:auto;padding:3px 0;cursor:var(--c-arrow)';for(const q of RECENT){const sw=swatch(bake(q),16,16);sw.title=tName(q);sw.style.cssText='width:24px;height:24px;image-rendering:pixelated;cursor:pointer;outline:'+(isOn(q)?'2px solid #e0a040':'1px solid #000');sw.onpointerdown=e=>{e.preventDefault();pkFrom(q);tilePicker(host,onPick,isOn);onPick(q,true)};r.appendChild(sw)}host.appendChild(r)}}
function texRows(host,kind,click,isOn,badge){host.innerHTML='';const add=(k,mod)=>{const d=mk('div');d.dataset.k=k;d.append(swatch(bake(k)),mk('span','n',tName(k)),mk('span','c '+(mod?'md':'lk'),badge(k,mod)));if(isOn(k))d.classList.add('on');d.onpointerdown=e=>{e.preventDefault();click(k,d)};host.appendChild(d)};
 for(const k of baseKeys(kind))add(k,false);const mods=modKeys(kind);if(mods.length){host.appendChild(mk('div','isep'));for(const k of mods)add(k,true)}}

// maps
// interior maps hide the inside of thick walls; outdoor maps (and the editor's wall-tops view) show their tops
const ENVSET={};let edTops=true;
const natK=k=>matK(k)==='grass';// bare soil can be a cellar floor, so only grass makes a map read as outdoors
function autoOut(){let nat=0,open=0,cells=0,bd=0,bo=0;for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){const k=map[y][x],w=!!WMAT[k]||/[HNS]$/.test(k)&&!!WMAT[k.slice(0,-1)];if(!w){open++;if(natK(k))nat++}if(x===0||y===0||x===CW-1||y===CH-1){bd++;if(!w||k==='bush')bo++}}return nat/(open||1)>.3||bo/(bd||1)>.3}
function envCalc(){const e=ENVSET[curMap]||'auto';OUTD=e==='out'||e==='auto'&&autoOut()}
// the Atelier: every element's materials in alcoves, walls above floors, with doors and furniture
const ATL=(()=>{const rows=EORDER.map(el=>{const E=ELEM[el],mats=Object.keys(E.mats),vars=mats.map(m=>Object.keys(varsOf(el,m)));return{el,mats,vars,w:vars.reduce((a,v)=>a+v.length+1,0)}});return{rows,CW:Math.max(...rows.map(r=>r.w))+3,CH:2+rows.length*4+7}})();
MAPSZ.atelier=[ATL.CW,ATL.CH];TITLE.atelier='Fluoria · The Atelier';
NBM.atelier=()=>{const g=Array.from({length:ATL.CH},(_,y)=>Array.from({length:ATL.CW},(_,x)=>x===0||y===0||x===ATL.CW-1||y===ATL.CH-1?'stone.grey.block.w':'stone.lime.paving'));
 ATL.rows.forEach((r,i)=>{const y0=2+i*4;let x=2;r.mats.forEach((m,mi)=>{const vs=r.vars[mi];vs.forEach((v,j)=>{const b=r.el.toLowerCase()+'.'+m+'.'+v;g[y0][x+j]=b+'.w';g[y0+1][x+j]=b;g[y0+2][x+j]=b});x+=vs.length+1})});
 let fx=2,fy=ATL.CH-6;for(const[k,n]of[...Object.keys(WPIECE).filter(k=>!RETIRED.has(k)).map(k=>[k,/table|desk/.test(WPIECE[k][1])?2:1]),...Object.keys(MCHEST).map(k=>[k,1])]){if(fx+n>ATL.CW-2){fx=2;fy+=2}if(fy>ATL.CH-2)break;for(let i=0;i<n;i++)g[fy][fx+i]=k;fx+=n+1}
 const dy=2+4,dx=ATL.rows[1].w+3;for(let x=dx;x<dx+Object.keys(DOORK).length*2+1&&x<ATL.CW-1;x++)g[dy][x]=(x-dx)%2?'stone.lime.paving':'stone.grey.block.w';paintAll((cx,cy)=>g[cy][cx])};
NUM.atelier=()=>{const dy=2+4,dx=ATL.rows[1].w+3;Object.keys(DOORK).forEach((k,i)=>{const cx=dx+1+i*2;if(cx<ATL.CW-1)mkDoor(k,cx*T,dy*T+T/2+4,0)});const t=U('Curator',null,'civ',2,1.5,0,null,'Clerk')};
ENVSET.atelier='out';
{const o=mk('option',null,'Fluoria atelier');o.value='atelier';$('msel').appendChild(o)}
const MAPBASE=[...$('msel').options].map(o=>[o.value,o.textContent]);
function regMap(id){const d=MODS.maps[id];ENVSET[id]=d.env||'auto';MAPSZ[id]=[d.CW,d.CH];TITLE[id]=d.name;NBM[id]=()=>{UND=d.und?d.und.map(r=>r.map(modK)):[];paintAll((cx,cy)=>{let k=d.map[cy]&&d.map[cy][cx];if(!validK(k))k=validK(d.tex&&d.tex[k])?d.tex[k]:'flag';return k})};NUM[id]=()=>spawnMap(d)}
for(const id in MODS.maps)regMap(id);
function fillMapSel(){const ms=$('msel');ms.innerHTML='';const g1=mk('optgroup');g1.label='Base';for(const[v,n]of MAPBASE){const o=mk('option',null,n);o.value=v;g1.appendChild(o)}ms.appendChild(g1);const ids=Object.keys(MODS.maps);if(ids.length){const g2=mk('optgroup');g2.label='Mods';for(const id of ids){const o=mk('option',null,MODS.maps[id].name);o.value=id;g2.appendChild(o)}ms.appendChild(g2)}ms.value=curMap}
fillMapSel();
const r1=v=>Math.round(v*10)/10,cp=o=>o==null?o:JSON.parse(JSON.stringify(o));
function serMap(){const src=map.map((r,y)=>r.map((k,x)=>OM[y]&&OM[y][x]||k)),tex={};for(const r of src)for(const k of r)if(MODS.tex[k])tex[k]=MODS.tex[k].from;
 const sl=bodies.filter(b=>b.type==='slab'&&!b.fallen),B=[];
 for(const b of bodies){if(b.type==='token')B.push({t:'u',name:b.name,nat:b.nat,unit:b.unit,x:r1(b.x),y:r1(b.y),ang:r1(b.ang||0),look:b.look,wseed:b.wseed,tone:b.tone,status:b.status,guard:b.guard||undefined,leader:b.leader||undefined,auto:b.auto,neutral:b.neutral||undefined,inv:cp(b.inv),si:b.si>=0?b.si:b.psi??-1,teth:b.tether&&!b.tether.broken?b.tether.kind:undefined});
  else if(b.type==='slab'){if(b.fallen)continue;const a=b.ang;if(a){b.ang=0;orient(b)}B.push({t:'s',mat:b.mat,x:r1(b.x),y:r1(b.y),rot:b.rot,len:b.len,th:b.th,free:b.free||undefined,locked:b.locked||undefined,keys:b.keys||undefined,gold:b.gold||undefined,pair:b.pair?sl.indexOf(b.pair):undefined,col:b.src.map(q=>q[2])});if(a){b.ang=a;orient(b)}}
  else if(b.type==='weapon'){if(WP[b.kind]&&WP[b.kind].bullet)continue;if(b.hidden){B.push({t:'c',cx:b.cells[0][0],cy:b.cells[0][1],name:b.name,inv:cp(b.inv)});continue}B.push({t:'w',kind:b.kind,x:r1(b.x),y:r1(b.y),ang:r1(b.ang||0),ammo:b.ammo,res:b.res,amt:b.amt,inv:cp(b.inv),long:b.long||undefined})}}
 return{v:1,CW,CH,env:ENVSET[curMap]||'auto',map:src,und:UND.some(r=>r&&r.some(Boolean))?UND.map(r=>r?r.slice():[]):undefined,tex,bodies:B}}
function spawnMap(d){const sl=[];for(const o of d.bodies)try{
 if(o.t==='u'){const b=token(o.name,o.nat,o.unit,o.x,o.y,o.guard,null,o.look);Object.assign(b,{ang:o.ang||0,look:o.look,wseed:o.wseed??b.wseed,tone:o.tone,status:o.status||'free',leader:o.leader,auto:o.auto!==false,neutral:o.neutral});b.inv=cp(o.inv)||[];while(b.inv.length<6)b.inv.push(null);b.si=o.si>=0&&b.inv[o.si]?o.si:-1;b.held=b.si>=0?b.inv[b.si]:null;b.hc=null;if(o.teth)tie(b,o.teth)}
 else if(o.t==='s'){const s=slab(o.mat,o.x,o.y,o.rot,o.len,o.th);if(o.free)s.free=true;s.locked=!!o.locked;if(o.keys)s.keys=o.keys;if(o.gold)s.gold=true;if(o.col&&o.col.length===s.src.length){o.col.forEach((c,i)=>s.src[i][2]=c);s.used=null;s.px=[];orient(s)}sl.push([s,o.pair])}
 else if(o.t==='c'){const c=container(o.cx,o.cy,[],o.name);if(c)cFill(c,cp(o.inv)||[])}
 else if(o.t==='w'&&o.kind==='crate')crate(o.x,o.y,cp(o.inv)||[],o.long)
 else if(o.t==='w'&&WP[o.kind]){const w=weapon(o.kind,o.x,o.y,o.ang||0);for(const f of['ammo','res','amt'])if(o[f]!==undefined)w[f]=o[f];if(o.inv)w.inv=cp(o.inv)}}catch(e){console.warn(e)}
 for(const[s,p]of sl)if(p!==undefined&&sl[p])s.pair=sl[p][0]}

// modes
let aiWas=false;const aiBtn=()=>[...bar.children].find(b=>b.textContent==='AI');
const MB={};{const sep=mk('span','sep');const add=(m,t)=>{const b=mk('button',null,t);b.onclick=()=>setMode(m);MB[m||'play']=b;return b};bar.prepend(add(null,'Play'),add('map','Map Editor'),add('asset','Asset Editor'),sep);MB.play.classList.add('on');
 setTimeout(()=>{for(const b of bar.children)if(/^(AI|Slow-mo)/.test(b.textContent))b.classList.add('play-only')},0)}
function setMode(m){if(m===EM)return;const was=EM;if(was==='asset')aeStash();EM=m;$('sm').dataset.mode=m||'play';for(const k in MB)MB[k].classList.toggle('on',k===(m||'play'));
 if(!was&&m){aiWas=aiOn;if(aiOn)aiBtn().click()}if(was&&!m&&aiWas&&!aiOn)aiBtn().click();
 sel.clear();drag=null;charge=null;box=null;moveSel=null;openCrate=null;closeMenu();edBrush=null;edStroke=null;lastHud='';
 TOPS=m==='map'&&edTops;$('hint').textContent='';if(m==='map'){edSrc=null;fillMapTools()}if(m==='asset')aeOpen();setTimeout(fit,0)}
{const u0=update;update=function(){if(!EM)return u0();tick++;if(drag)dragStep();if(tick%6===0)hud();doors();dustTick();plopTick();edPan();cleanTick();wandTick()}}
// placing tiles: a soft puff from the tile's own colours and a quiet sound for its material
const DUST=[];
function matOf(k){const m=matK(k);return m==='marble'?'tile':m==='grass'||m==='soil'?'soft':m==='wood'&&furnK(k)?'furn':m}
function puff(cx,cy,k,delay=0){if(DUST.length>600)return;const m=matOf(k),n=m==='metal'?3:m==='cloth'?5:8;for(let i=0;i<n;i++){const x=cx*T+2+Math.random()*12,y=cy*T+2+Math.random()*12,j=(y|0)*W+(x|0);let c=sol[j]?scol[j]:OBJ[j]?OBJC[j]:floor[j];c=m==='metal'?rgb(240,244,246):mix(c,rgb(255,250,240),.5);const a=Math.random()*6.283,s=.12+Math.random()*.3,wall=WMAT[rootOf(k)];
 DUST.push({x,y,vx:Math.cos(a)*s,vy:wall?.1+Math.random()*.2:Math.sin(a)*s-.12,g:wall?.025:0,c,l:0,L:(m==='metal'?10:22)+Math.random()*16,d:delay,z:1,a:.9})}
 if(m!=='metal')for(let i=0;i<3;i++){const a=Math.random()*6.283,j=(cy*T+8)*W+cx*T+8;DUST.push({x:cx*T+5+Math.random()*6,y:cy*T+5+Math.random()*6,vx:Math.cos(a)*.18,vy:Math.sin(a)*.18-.05,g:0,c:mix(sol[j]?scol[j]:floor[j],rgb(255,250,240),.6),l:0,L:26+Math.random()*10,d:delay,z:3,a:.3})}}
function dustTick(){for(const d of DUST){if(d.d>0){d.d--;continue}d.x+=d.vx;d.y+=d.vy;d.vy+=d.g;d.vx*=.93;if(!d.g)d.vy*=.93;d.l++}for(let i=DUST.length-1;i>=0;i--)if(DUST[i].l>DUST[i].L)DUST.splice(i,1)}
let sndT=0,sndRun=0;
// sounds follow the in-game hits for each material, softened; heavy walls add a low muffled thud
function edSnd(m,p=1,v=1,heavy){if(mute||!gest)return;const t=performance.now();if(t-sndT<35)return;sndT=t;p*=.94+Math.random()*.12;try{SVOL=v;
 if(m==='stone'){noise(.09,900*p,1.2,.16,'bandpass');noise(.16,240*p,.8,.16,'lowpass');noise(.03,4200,.7,.04,'highpass')}
 else if(m==='tile'){noise(.03,3600*p,1.2,.12,'bandpass');tone(880*p,.05,.02);noise(.08,500*p,1,.06,'lowpass')}
 else if(m==='wood'){tone((190+Math.random()*60)*p,.08,.09);noise(.05,1300*p,2.5,.16,'bandpass');noise(.03,4200,1,.04,'highpass')}
 else if(m==='furn'){tone(140*p,.12,.1);noise(.07,700*p,1.5,.15,'bandpass')}
 else if(m==='metal'){const f=(700+Math.random()*200)*p;noise(.04,3200*p,1.5,.12,'bandpass');tone(f,.07,.03);tone(f*1.73,.05,.012);tone(f*.5,.09,.025)}
 else if(m==='cloth'){noise(.12,420*p,.7,.22,'lowpass')}
 else if(m==='soft'){noise(.08,1800*p,.8,.1,'bandpass');noise(.06,500*p,1,.08,'lowpass')}
 else if(m==='erase'){noise(.1,2400*p,.6,.06,'highpass')}
 if(heavy){tone(64*p,.2,.09);noise(.18,160*p,.7,.2,'lowpass')}}catch(e){}SVOL=1}
const heavyK=k=>{const r=/[HNS]$/.test(k)&&WMAT[k.slice(0,-1)]?k.slice(0,-1):k;return!!WMAT[r]&&hitCls(matK(r))!==2};
// strokes show a grey plan first, then the tiles go down one by one on release
let PLOP=null;const GHOST=new Map();
function ghostOf(k){if(GHOST.has(k))return GHOST.get(k);const p=bake(k),c=mk('canvas');c.width=c.height=T;const g=c.getContext('2d'),im=g.createImageData(T,T);for(let y=0;y<T;y++)for(let x=0;x<T;x++){const o=(y*TS+x)*3,i=(y*T+x)*4,l=lum(p[o],p[o+1],p[o+2])*.7+60;im.data[i]=im.data[i+1]=im.data[i+2]=l;im.data[i+3]=255}g.putImageData(im,0,0);GHOST.set(k,c);return c}
function edCells(cx,cy){const o=Math.floor((edSize-1)/2),r=[];for(let y=cy-o;y<cy-o+edSize;y++)for(let x=cx-o;x<cx-o+edSize;x++)if(x>=0&&y>=0&&x<CW&&y<CH)r.push([x,y]);return r}
function addPend(st,cx,cy){for(const c of edCells(cx,cy)){const id=c[1]*CW+c[0];if(!st.seen.has(id)){st.seen.add(id);st.cells.push(c)}}}
function plop(cells,k,er){flushPlop();const s=srcNow();cells=cells.filter(([x,y])=>s[y][x]!==k);if(!cells.length)return;PLOP={k,er,q:cells,per:Math.min(12,Math.max(1,Math.ceil(cells.length/60))),run:0,next:0,heavy:!er&&heavyK(k),m:er?'erase':matOf(k)}}
// one sound per plop; plops speed up from 70 ms to 30 ms apart, and big areas place up to 12 tiles per plop
function plopTick(){const p=PLOP;if(!p)return;const t=performance.now();if(t<p.next)return;const s=srcNow();for(let i=0;i<p.per&&p.q.length;i++){const[x,y]=p.q.shift(),was=s[y][x],cover=k=>furnK(k)||!!WMAT[k]||/[HNS]$/.test(k)&&!!WMAT[k.slice(0,-1)],U=()=>UND[y]||(UND[y]=[]);
  if(!p.er&&!cover(p.k)&&cover(was)){U()[x]=p.k;if(!furnK(was))paintCell(x,y,was);puff(x,y,p.k);continue}
  let k=p.k;if(p.er&&cover(was)&&undAt(x,y)){k=undAt(x,y);UND[y][x]=null}else if(!p.er&&cover(k)&&!cover(was))U()[x]=was;
  s[y][x]=k;paintCell(x,y,k);puff(x,y,k)}p.run++;sndT=0;edSnd(p.m,1+Math.min(.25,p.run*.012),.75,p.heavy);p.next=t+Math.max(30,70-p.run*4);if(!p.q.length){PLOP=null;refinish()}}
function flushPlop(){const p=PLOP;if(!p)return;PLOP=null;const s=srcNow();for(const[x,y]of p.q)s[y][x]=p.k;refinish()}
{const s0=startDrag;startDrag=function(...a){s0(...a);if(EM&&drag)drag.free=true}}
{const r0=reset;reset=function(){PLOP=null;WQ=null;edSrc=null;edUndo=[];edRedo=[];r0();snapPR();envCalc();if(EM==='map')fillMapTools()}}
{const PRS={};const g0=goMap;goMap=function(v){flushPlop();WQ=null;if(PR)PRS[curMap]=PR;edSrc=null;edUndo=[];edRedo=[];g0(v);PR=PRS[v]&&PRS[v].CW===CW&&PRS[v].CH===CH?PRS[v]:PR;if(!prOK())snapPR();envCalc();if(EM==='map')fillMapTools()}}
envCalc();

// map editor
let edBrush=null,edSize=1,edStroke=null,edSrc=null,edUndo=[],edRedo=[];
const srcNow=()=>edSrc&&edSrc.length===CH&&edSrc[0].length===CW?edSrc:(edSrc=map.map((r,y)=>r.map((k,x)=>OM[y]&&OM[y][x]||k)));
const isWallK=k=>!!k&&!!WMAT[k];
function edFloor(){const n={};for(const r of srcNow())for(const k of r)if(!isWallK(k)&&!furnK(k)&&KIND[k]==='floor'&&k!=='sill'&&k!=='msill')n[k]=(n[k]||0)+1;return Object.entries(n).sort((a,b)=>b[1]-a[1])[0]?.[0]||'flag'}
function floorNear(cx,cy){const s=srcNow();for(const[a,b]of[[0,1],[0,-1],[1,0],[-1,0]]){const k=s[cy+b]&&s[cy+b][cx+a];if(k&&!isWallK(k)&&!furnK(k)&&k!=='sill'&&k!=='msill')return k}return edFloor()}
function edPush(){edUndo.push(srcNow().map(r=>r.slice()));if(edUndo.length>60)edUndo.shift();edRedo=[]}
function refinish(){const s=srcNow();map=s.map(r=>r.slice());for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)paintCell(cx,cy,map[cy][cx]);resill();EDG.clear();blendGround();objects();boards();borders();regions();polish();cracks();
 for(const c of bodies.filter(o=>o.hidden))if(!c.cells.every(([a,b])=>OM[b]&&OM[b][a]))remove(c);snapDoors();sills();ds0Need=true;solDirty=true;fxDirty=true;if(ROOMS)ROOMS.t=-1e9;envCalc();snapPR()}
const slabCell=d=>{let x=0,y=0;for(const p of d.px){x+=p[0];y+=p[1]}const n=d.px.length||1,X=Math.round(d.x)+x/n,Y=Math.round(d.y)+y/n;return(Y/T|0)*CW+(X/T|0)};
const DOORK={wood:['Wood door',2],pine:['Pine door',2],teak:['Teak door',2],steel:['Steel door',3],iron:['Iron door',3],brass:['Brass door',3],gold:['Aurum door',3],umbra:['Umbra door',3],ebony:['Ebony door',2],mahog:['Mahogany door',2]};
// what each material makes beyond walls and floors: furniture, doors and cover slabs
const FURN={Earth:{grass:{furn:['hedge']}},Wood:{oak:{doors:['wood'],slabs:[[2,'Wood slab']]},pine:{doors:['pine'],slabs:[[2,'Pine slab',16,8,'pine']]},teak:{doors:['teak'],slabs:[[2,'Teak slab',16,8,'teak']]},mahog:{doors:['mahog']},ebony:{doors:['ebony']}},
 Metal:{steel:{furn:['schest'],doors:['steel']},iron:{furn:['mchest'],doors:['iron']},brass:{furn:['bchest'],doors:['brass']},gold:{furn:['gchest'],doors:['gold']},umbra:{furn:['uchest'],doors:['umbra']}}},FW={hedge:4,books:2,shelf:2,rack:2,wagon:2};
for(const k in WPIECE){const[m,sh]=WPIECE[k];if(sh==='table'||sh==='desk')FW[k]=2;if(!RETIRED.has(k))(FURN.Wood[m].furn=FURN.Wood[m].furn||[]).push(k)}
// every metal gives a slab and a heavy slab as cover
for(const mat in FURN.Metal){const n=memb('Metal',mat).n;FURN.Metal[mat].slabs=[[3,n+' slab',16,8,mat],[3,'Heavy '+n.toLowerCase()+' slab',32,8,mat]]}
const umbraC=c=>toneC('umbra',c);
// a door is its material's slab plus a hinge and a lock
const doorMarks=(q,L=16,th=8)=>{const x=q[8],y=q[9];if(x===2&&(y===-th+1||y===-th+2||y===-3||y===-2))q[2]=mul(q[2],.62);else if(x===L-4&&(y===-5||y===-4))q[2]=toneC('brass',rgb(220,220,220))};
function mkDoor(k0,x,y,rot){const k=baseK(k0),d=slab(DOORK[k][1],x,y,rot);if(k==='umbra'){for(const q of d.src)q[2]=umbraC(q[2]);d.umbra=true;d.mass*=.6}else if(k==='gold'||k==='iron'||k==='brass'){for(const q of d.src)q[2]=toneC(k,q[2]);if(k==='gold')d.gold=true}else if(ELEM.Wood.mats[k])mahogany(d,memb('Wood',k).c,k==='mahog'||k==='ebony');for(const q of d.src)doorMarks(q);d.used=null;d.px=[];orient(d);wearSrc(d,ELEM.Metal.mats[k]?'Metal':'Wood',k==='wood'?'oak':k,condK(k0));return d}
function doorIcon(k){const s=slabPix(DOORK[k][1]);for(const q of s){const c=q[2];if(k==='umbra')q[2]=umbraC(c);else if(k==='gold'||k==='iron'||k==='brass')q[2]=toneC(k,c);else if(ELEM.Wood.mats[k]){const x=q[8],y=q[9],e=Math.min(x,15-x,y+8,-1-y),w=woodT(x+93,y,memb('Wood',k).c,13);q[2]=e===2&&(k==='mahog'||k==='ebony')?rgb(cl(w[0]*.6+84),cl(w[1]*.6+67),cl(w[2]*.6+40)):rgb(cl(w[0]),cl(w[1]),cl(w[2]))}doorMarks(q)}return s.map(q=>[q[8],q[9],q[2]])}
function clearDoor(cx,cy){for(const d of bodies.filter(o=>o.type==='slab'&&!o.free&&slabCell(o)===cy*CW+cx)){if(d.pair)d.pair.pair=null;remove(d)}}
function placeDoor(k,cx,cy){const s=srcNow(),w=(x,y)=>isWallK(s[y]&&s[y][x]);clearDoor(cx,cy);const L=w(cx-1,cy),R=w(cx+1,cy),U=w(cx,cy-1),D=w(cx,cy+1),hz=L&&R||!(U&&D)&&(L||R);
 if(isWallK(s[cy][cx])){s[cy][cx]=floorNear(cx,cy);refinish()}if(hz)mkDoor(k,cx*T,cy*T+T/2+4,0);else mkDoor(k,cx*T+T/2-5,cy*T,1);snapDoors();sills();solDirty=true;puff(cx,cy,k==='iron'||k==='gold'?'iron':'wood');sndT=0;edSnd(k==='iron'||k==='gold'?'metal':'furn',.85)}
function edResize(nw,nh){nw=Math.max(6,Math.min(64,nw|0));nh=Math.max(6,Math.min(64,nh|0));if(nw===CW&&nh===CH)return;edPush();const s=srcNow(),f=edFloor(),ns=Array.from({length:nh},(_,y)=>Array.from({length:nw},(_,x)=>s[y]&&s[y][x]||f));
 alloc(nw,nh);LR=new Float32Array(NB);LG=new Float32Array(NB);LB=new Float32Array(NB);LT=new Float32Array(NB);MAPSZ[curMap]=[nw,nh];edSrc=ns;for(const b of [...bodies])if(b.x<0||b.y<0||b.x>=W||b.y>=H)remove(b);refinish();camInit=true;fit()}
function edGive(w){if(w.type!=='weapon'||w.hidden)return false;if(w.fuse){const X=Math.round(w.x),Y=Math.round(w.y);if(boxAt(X,Y)||bodyAt(X,Y,3,w,o=>o.kind==='crate'&&!o.hidden))NOPE();return false}const X=Math.round(w.x),Y=Math.round(w.y),tk=bodyAt(X,Y,4,w,o=>o.type==='token'&&o.status!=='dead');
 if(tk){const ok=CAP[w.kind]||WP[w.kind].melee||WP[w.kind].gun?(give(tk,w.kind,w.ammo,w.res),true):addItem(tk,{k:w.kind,n:w.kind==='gold'?w.amt||50:1});if(ok){remove(w);lastHud='';sfx('flick');return true}return false}
 const c=boxAt(X,Y)||bodyAt(X,Y,3,w,o=>o.kind==='crate'&&!o.hidden);if(!c)return false;if(!putIn(c,w.kind,w.kind==='gold'?w.amt||50:1,w)){NOPE();return false}remove(w);if(c.hidden)openCrate=c;lastHud='';storeSnd(w.kind);return true}
function boxAt(X,Y){if(X<0||Y<0||X>=W||Y>=H||!OBJ[Y*W+X])return null;const c=containerAt(X,Y);if(c)return c;const cx=X/T|0,cy=Y/T|0;return OM[cy]&&OM[cy][cx]?container(cx,cy,[],null):null}
function putIn(c,k,n,w){cNorm(c);const it={k,n:k==='gold'?n:1};if(CAP[k]){it.ammo=w&&w.ammo!==undefined?w.ammo:CAP[k];it.res=w&&w.res||RCAP(k)}let ok=false;for(let i=0;i<(k==='gold'?1:n);i++){if(!cAdd(c,{...it}))break;ok=true}return ok}

function fillMapTools(){}
function usedTex(d){const t={};for(const r of d.map)for(const k of r)if(MODS.tex[k])t[k]=MODS.tex[k];return t}
function mapSave(asNew){const nm=($('mname')&&$('mname').value.trim())||MNAME[curMap]||TITLE[curMap]||'Map',d=serMap();d.name=nm;let id=curMap;
 if(!asNew&&MODS.maps[id])d.from=MODS.maps[id].from;else{d.from=MODS.maps[curMap]?MODS.maps[curMap].from:curMap;id='mod:'+uidS();curMap=id}
 MODS.maps[id]=d;saveMods();regMap(id);fillMapSel();$('sm').querySelector('header span').textContent=nm;fillMapTools()}
function mapNew(){const cw=20,ch=14,id='mod:'+uidS(),n=Object.values(MODS.maps).filter(m=>/^New map/.test(m.name)).length;MODS.maps[id]={v:1,name:'New map'+(n?' '+(n+1):''),from:null,CW:cw,CH:ch,map:Array.from({length:ch},(_,y)=>Array.from({length:cw},(_,x)=>x===0||y===0||x===cw-1||y===ch-1?'stone':'flag')),tex:{},bodies:[]};saveMods();regMap(id);fillMapSel();goMap(id)}
function importPack(o){const ids=[];if(!o||typeof o!=='object')return ids;if((o.px||o.rec)&&o.from){o={tex:{['m_'+uidS()]:o}}}else if(o.map&&o.CW){o={maps:{['mod:'+uidS()]:o}}}
 for(const[id,t]of Object.entries(o.tex||{}))if(t&&(t.px||t.rec)&&t.from&&TEX[t.from]){MODS.tex[id]=t;regTex(id)}
 for(const[id0,m]of Object.entries(o.maps||{}))if(m&&m.map&&m.CW){const id=id0.startsWith('mod:')?id0:'mod:'+uidS();MODS.maps[id]=m;regMap(id);ids.push(id)}
 for(const[id,p]of Object.entries(o.pat||{}))if(p&&p.g)MODS.pat[id]=p;
 saveMods();fillMapSel();if(EM==='map')fillMapTools();if(EM==='asset')aeLists();return ids.length?ids:Object.keys(o.tex||{})}

// painting on the board
const view=stage.parentElement;view.style.position='relative';
view.addEventListener('pointerdown',e=>{if(EM!=='map'||panKey||e.button===1)return;if(!edBrush){if(e.button===0&&inBoard(e)){const[x,y]=toBoard(e),X=x|0,Y=y|0;if(!bodyAt(X,Y,1))boxAt(X,Y)}return}if(!inBoard(e))return;e.stopImmediatePropagation();e.preventDefault();closeMenu();
 const[x,y]=toBoard(e),cx=x/T|0,cy=y/T|0;if(edBrush.t==='clean'){if(e.button===0)cleanDown(edBrush.k,e);return}const er=e.button===2||e.button===0&&UI.erase;if(edBrush.t==='door'){if(er)clearDoor(cx,cy);else placeDoor(edBrush.k.slice(5),cx,cy);return}
 flushPlop();const k=er?'dirt':edBrush.k;// erasing leaves the floor under a wall, else bare soil
 edPush();if(e.shiftKey){const c=fillCells(cx,cy);plop(c,k,er);return}
 edStroke={k,er,rect:e.ctrlKey||e.metaKey,x0:cx,y0:cy,x1:cx,y1:cy,last:[cx,cy],cells:[],seen:new Set()};if(!edStroke.rect)addPend(edStroke,cx,cy)},true);
window.addEventListener('pointermove',e=>{if(CL&&CL.k==='wand'){wandAdd(mouse.x/T|0,mouse.y/T|0);return}if(!edStroke)return;const[x,y]=toBoard(e),cx=Math.max(0,Math.min(CW-1,x/T|0)),cy=Math.max(0,Math.min(CH-1,y/T|0));edStroke.x1=cx;edStroke.y1=cy;if(edStroke.rect)return;const[a,b]=edStroke.last,n=Math.max(Math.abs(cx-a),Math.abs(cy-b));for(let i=1;i<=n;i++)addPend(edStroke,Math.round(a+(cx-a)*i/n),Math.round(b+(cy-b)*i/n));edStroke.last=[cx,cy]});
const rectCells=s=>{const c=[];for(let y=Math.min(s.y0,s.y1);y<=Math.max(s.y0,s.y1);y++)for(let x=Math.min(s.x0,s.x1);x<=Math.max(s.x0,s.x1);x++)c.push([x,y]);return c.sort((a,b)=>Math.abs(a[0]-s.x0)+Math.abs(a[1]-s.y0)-Math.abs(b[0]-s.x0)-Math.abs(b[1]-s.y0))};
function fillCells(cx,cy){const s=srcNow(),k0=s[cy][cx],seen=new Set([cy*CW+cx]),q=[[cx,cy]],out=[];while(q.length){const c=q.shift();out.push(c);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=c[0]+dx,y=c[1]+dy;if(x<0||y<0||x>=CW||y>=CH||seen.has(y*CW+x)||s[y][x]!==k0)continue;seen.add(y*CW+x);q.push([x,y])}}return out}
window.addEventListener('pointerup',()=>{cleanUp();if(!edStroke)return;const s=edStroke;edStroke=null;plop(s.rect?rectCells(s):s.cells,s.k,s.er)});
window.addEventListener('keydown',e=>{if(!EM||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase(),z=(e.ctrlKey||e.metaKey)&&k==='z',y=(e.ctrlKey||e.metaKey)&&k==='y';
 if(EM==='asset'){if(z||y){aeUndo(y||e.shiftKey);e.preventDefault();e.stopImmediatePropagation()}else if(k.startsWith('arrow')){aeShift(k==='arrowleft'?-1:k==='arrowright'?1:0,k==='arrowup'?-1:k==='arrowdown'?1:0);e.preventDefault();e.stopImmediatePropagation()}return}
 if(z||y){flushPlop();const a=y||e.shiftKey?edRedo:edUndo,b=a===edRedo?edUndo:edRedo;if(a.length){b.push(srcNow().map(r=>r.slice()));edSrc=a.pop();refinish()}e.preventDefault();e.stopImmediatePropagation();return}
 if('wasd'.includes(k)&&k.length===1&&!e.ctrlKey&&!e.metaKey){PANK.add(k);e.preventDefault();e.stopImmediatePropagation();return}
 if(k==='escape'&&edBrush){edBrush=null;fillMapTools()}},true);
const PANK=new Set();window.addEventListener('keyup',e=>PANK.delete(e.key.toLowerCase()),true);window.addEventListener('blur',()=>PANK.clear());
function edPan(){if(EM!=='map'||!PANK.size)return;const v=9;cam.x+=(PANK.has('a')?v:0)-(PANK.has('d')?v:0);cam.y+=(PANK.has('w')?v:0)-(PANK.has('s')?v:0);applyCam()}
window.addEventListener('pointermove',e=>{if(EM!=='map')return;const h=$('hint');if(!mouse.in){h.textContent='';return}const cx=mouse.x/T|0,cy=mouse.y/T|0,k=(OM[cy]&&OM[cy][cx])||(map[cy]&&map[cy][cx]);const n=k?(ONAME[k]&&OM[cy]&&OM[cy][cx]?ONAME[k]:tName(OLDK[k]||k)):'';if(h.textContent!==n)h.textContent=n});
let GRID=LS.get('bs.grid',true);
{const rn0=render;render=function(){rn0();if(EM!=='map')return;ctx.save();ctx.fillStyle='rgba(120,120,120,.32)';if(GRID){for(let x=T;x<W;x+=T)ctx.fillRect(x,0,1,H);for(let y=T;y<H;y+=T)ctx.fillRect(0,y,W,1)}
 for(const d of DUST){if(d.d>0)continue;ctx.globalAlpha=Math.max(0,1-d.l/d.L)*d.a;ctx.fillStyle=css(d.c);const z=d.z>1?d.z+(d.l/d.L*2|0):1;ctx.fillRect((d.x|0)-(z>>1),(d.y|0)-(z>>1),z,z)}ctx.globalAlpha=1;
 const box2=(x,y,w,h)=>{ctx.strokeStyle='#000';ctx.strokeRect(x-.5,y-.5,w+1,h+1);ctx.strokeStyle='#fff';ctx.strokeRect(x+.5,y+.5,w-1,h-1)};for(const p of VP){ctx.fillStyle=css(p.c);ctx.fillRect(p.x|0,p.y|0,1,1)}for(const[q,v]of WET){ctx.globalAlpha=Math.min(1,v)*.16;ctx.fillStyle='#0a1218';ctx.fillRect((q%BW)*2,(q/BW|0)*2,2,2)}ctx.globalAlpha=1;
 if(edBrush&&edBrush.t==='clean'&&edBrush.k==='wand'&&mouse.in&&!CL){const o=Math.floor((edSize-1)/2),c0=(mouse.x/T|0)-o,r0=(mouse.y/T|0)-o;ctx.fillStyle='rgba(255,250,235,.16)';for(let y=r0;y<r0+edSize;y++)for(let x=c0;x<c0+edSize;x++)if(x>=0&&y>=0&&x<CW&&y<CH)ctx.fillRect(x*T,y*T,T,T)}
 {const c=edBrush&&edBrush.t==='clean'?TOOLCUR[edBrush.k]:null;if(c&&cv.style.cursor!==c)cv.style.cursor=c}
 for(const p of SPK){const a=Math.min(1,p.l/8)*Math.max(0,1-p.l/p.L)*(.55+.45*Math.sin(p.l*.35+p.tw));ctx.globalAlpha=a;ctx.fillStyle=`hsl(${(p.h+p.l*3)%360},95%,78%)`;ctx.fillRect(p.x|0,p.y|0,1,1);if(a>.7&&p.l%20<4){ctx.globalAlpha=a*.4;ctx.fillRect((p.x|0)-1,p.y|0,3,1);ctx.fillRect(p.x|0,(p.y|0)-1,1,3)}}ctx.globalAlpha=1;
 if(CL&&CL.k==='wand'){ctx.strokeStyle='rgba(200,170,255,.9)';for(const[x,y]of CL.cells)ctx.strokeRect(x*T+.5,y*T+.5,T-1,T-1)}if(WQ){ctx.strokeStyle='rgba(200,170,255,.6)';for(const[x,y]of WQ.q)ctx.strokeRect(x*T+.5,y*T+.5,T-1,T-1)}
 if(edBrush&&edBrush.t==='clean'&&edBrush.k!=='wand'&&mouse.in){const R=edBrush.k==='vac'?7+edSize*4:4+edSize*3;ctx.lineWidth=1;ctx.strokeStyle='#000';ctx.beginPath();ctx.arc(mouse.x,mouse.y,R+.5,0,6.283);ctx.stroke();ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(mouse.x,mouse.y,R-.5,0,6.283);ctx.stroke()}
 ctx.globalAlpha=.72;const gh=(cells,k)=>{const g=ghostOf(k);for(const[x,y]of cells)ctx.drawImage(g,x*T,y*T)};if(PLOP)gh(PLOP.q,PLOP.k);if(edStroke)gh(edStroke.rect?rectCells(edStroke):edStroke.cells,edStroke.k);ctx.globalAlpha=1;
 ctx.lineWidth=1;const s=edStroke;if(s&&s.rect){const x0=Math.min(s.x0,s.x1),y0=Math.min(s.y0,s.y1);box2(x0*T,y0*T,(Math.abs(s.x1-s.x0)+1)*T,(Math.abs(s.y1-s.y0)+1)*T)}
 else if(edBrush&&mouse.in&&!(edBrush.t==='clean'&&edBrush.k!=='wand')){const n=edBrush.t==='door'?1:edSize,o=Math.floor((n-1)/2),cx=(mouse.x/T|0)-o,cy=(mouse.y/T|0)-o;box2(cx*T,cy*T,n*T,n*T)}ctx.restore()}}

// polished wood: the furniture finish (dark rim, light bevel, inlay line), measured from the edge of each area
// a crack never leaves its 16px stone, whatever the pattern
// cracks: a layer over each connected block of one material, sized to the block and to how battered its tiles are
function cracks(){const seen=new Set(),key=k=>{const c=CATN[k];return c&&AGE[c[0]]&&c[0]!=='Metal'&&c[0]!=='Cloth'?c[0]+c[1]+c[3]:null};
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k0=map[cy][cx],g=key(k0);if(!g||seen.has(cy*CW+cx)||OM[cy]&&OM[cy][cx])continue;
  const comp=new Set(),q=[[cx,cy]];seen.add(cy*CW+cx);while(q.length){const[a,b]=q.pop();comp.add(b*CW+a);for(const[da,db]of[[1,0],[-1,0],[0,1],[0,-1]]){const na=a+da,nb=b+db,i=nb*CW+na;if(na<0||nb<0||na>=CW||nb>=CH||seen.has(i)||key(map[nb][na])!==g||OM[nb]&&OM[nb][na])continue;seen.add(i);q.push([na,nb])}}
  let s0=(cx*73856093^cy*19349663)>>>0;const R=()=>(s0=(s0*1664525+1013904223)>>>0)/4294967296,worn=[...comp].filter(i=>{const c=CATN[map[i/CW|0][i%CW]];return c[4]&&c[4]<=2});if(!worn.length)continue;
  let n=0;for(const i of worn)n+=CATN[map[i/CW|0][i%CW]][4]===1?.95:.5;n=Math.floor(n+R());const wall=CATN[k0][3],JF={slabs:.9,quarter:.82,block:.84,rubble:.8,crazy:.85}[CATN[k0][2]]||.86,JC=rgb(...(memb(CATN[k0][0],CATN[k0][1]).c||[120,116,108]).map(v=>Math.round(v*JF*.9))),LC=rgb(...(memb(CATN[k0][0],CATN[k0][1]).c||[120,116,108]).map(v=>Math.min(255,Math.round(v*1.06)))),hit=new Set(),L0=Math.min(42,7+Math.sqrt(comp.size)*6);
  const wd=CATN[k0][0]==='Wood';if(wd)n=Math.round(n*(mprop('Wood',CATN[k0][1]).split||1)*1.4);
  let bx=0,by=0,bs=16;const walk=(x,y,ang,len,fork)=>{if(wd){ang=R()<.5?0:Math.PI;len=Math.min(len,4+R()*7|0);fork=false}ang=Math.round(ang/.785)*.785;let run=0;for(let t=0;t<len;t++){if(!wd&&++run>2+R()*4){run=0;ang+=(R()<.5?-1:1)*.785*(R()<.7?.5:1)}x+=Math.cos(ang);y+=Math.sin(ang);const X=Math.round(x),Y=Math.round(y),ci=(Y>>4)*CW+(X>>4);if(X<1||Y<1||X>=W-1||Y>=H-1||!comp.has(ci)||Math.floor(X/bs)!==bx||Math.floor(Y/bs)!==by)return;
    if(R()<.18)continue;const j=Y*W+X;if(hit.has(j))continue;hit.add(j);const lj=j+(Math.abs(Math.cos(ang))>.5?W:1),lit=t%3===1&&!hit.has(lj);if(wall){if(!sol[j])return;scol[j]=mix(scol[j],JC,.85);shp[j]=1;if(lit&&sol[lj])scol[lj]=mix(scol[lj],LC,.4)}else{floor[j]=mix(floor[j],JC,.85);if(lit)floor[lj]=mix(floor[lj],LC,.4)}if(fork&&t===len>>1&&R()<.3)walk(x,y,ang+(R()<.5?-.785:.785),len>>1,false)}};
  for(let m=0;m<n;m++){const i=worn[(R()*worn.length)|0];bs=16;bx=Math.floor((i%CW)*T/bs);by=Math.floor((i/CW|0)*T/bs);const ex=R()<.5,X0=(i%CW)*T+(ex?(R()<.5?1:T-2):2+R()*(T-4)),Y0=(i/CW|0)*T+(ex?2+R()*(T-4):(R()<.5?1:T-2));walk(X0,Y0,R()*6.283,(R()<.75?5+R()*6:L0*(.6+R()*.6))|0,true)}}}
// lozenge floors frame their own edges, so repaint them once the whole map is known
function relink(){for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=map[cy][cx];const c=k&&CATN[k];if(c&&(CONNV.has(c[2])||c[3]&&memb(c[0],c[1]).cut||c[0]==='Metal'))paintCell(cx,cy,k)}}
function polish(){const st=(x,y,k)=>map[y]&&map[y][x]===k;for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=map[cy][cx];if(!POLT.has(k))continue;const L=!st(cx-1,cy,k),R=!st(cx+1,cy,k),U=!st(cx,cy-1,k),D=!st(cx,cy+1,k);if(!L&&!R&&!U&&!D)continue;
 const mat=CATN[k][1],F=woodFin(mat),gl=rgb(...F.gl),gt=F.gt;
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.min(L?x:99,R?15-x:99,U?y:99,D?15-y:99);if(d>3)continue;const j=(cy*T+y)*W+cx*T+x,w=!!sol[j];let c=w?scol[j]:floor[j];
  if(d===0)c=mul(c,F.rim);else if(d===1)c=mul(c,L&&x===1||U&&y===1?1.12:.82);else if(d===3)c=mix(c,gl,gt);else continue;if(w)scol[j]=c;else floor[j]=c}}}
// cleaning: vacuum lifts debris, sponge scrubs blood and scorch, wand restores damaged cells one by one
let PR=null,CL=null;const SPK=[],VP=[];
// tool cursors: the yellow pixel is the working tip
const TOOLCUR=(()=>{const mkC=(rows,pal,hx,hy)=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');rows.forEach((r,y)=>[...r].forEach((ch,x)=>{if(pal[ch]){g.fillStyle=pal[ch];g.fillRect(x*2,y*2,2,2)}}));return`url(${c.toDataURL()}) ${hx} ${hy}, crosshair`};
 return{vac:mkC(['y...........','kk..........','.kgk........','..kgk.......','...kgk......','....kggk....','.....kgggk..','......kgggk.','.......kgggk','........kggk','.........kk.'],{y:'#ffd84a',k:'#111',g:'#8c9298'},0,0),
  sponge:mkC(['.kkkkkkkk.','kyyyyyyyyk','kyoyyyoyyk','kyyyyoyyyk','kyoyyyyoyk','kyyyoyyyyk','.kkkkkkkk.'],{y:'#f2d04a',o:'#c79a26',k:'#3a2e10'},10,7),
  wand:mkC(['w.w.........','.y..........','w.k.........','...k........','....k.......','.....b......','......b.....','.......b....','........b...','.........b..'],{y:'#ffe066',w:'#fff6c8',k:'#d8d0c0',b:'#5a3c22'},2,2)}})();
function snapPR(){PR={CW,CH,sol:sol.slice(),shp:shp.slice(),scol:scol.slice(),crk:crk.slice(),floor:floor.slice(),GT:GT.slice(),OBJ:OBJ.slice(),OBJC:OBJC.slice(),SHN:SHN.slice(),GOLD:GOLD.slice(),NOD:NOD.slice()}}
const prOK=()=>PR&&PR.CW===CW&&PR.CH===CH&&PR.floor.length===N;snapPR();
const chDiff=(a,b)=>Math.abs((a&255)-(b&255))+Math.abs((a>>8&255)-(b>>8&255))+Math.abs((a>>16&255)-(b>>16&255));
function cellIdx(cx,cy,f){for(let y=0;y<T;y++)for(let x=0;x<T;x++)if(f((cy*T+y)*W+cx*T+x))return true;return false}
function stainBad(cx,cy){if(!prOK())return false;if(cellIdx(cx,cy,j=>SCH[j]&&!sol[j]&&!PR.sol[j]&&(OBJ[j]?chDiff(OBJC[j],PR.OBJC[j])>14:chDiff(floor[j],PR.floor[j])>14)))return true;for(let y=cy*8;y<cy*8+8;y++)for(let x=cx*8;x<cx*8+8;x++){const q=y*BW+x;if(FX.blood[q]>.04||BURN[q]>.04||FX.fire[q]>.05)return true}return false}
function cellBad(cx,cy){return prOK()&&(stainBad(cx,cy)||cellIdx(cx,cy,j=>sol[j]!==PR.sol[j]||shp[j]!==PR.shp[j]||crk[j]!==PR.crk[j]||OBJ[j]!==PR.OBJ[j]))}
function repairCell(cx,cy){for(let y=0;y<T;y++)for(let x=0;x<T;x++){const j=(cy*T+y)*W+cx*T+x;for(const k of['sol','shp','scol','crk','floor','GT','OBJ','OBJC','SHN','GOLD','NOD'])({sol,shp,scol,crk,floor,GT,OBJ,OBJC,SHN,GOLD,NOD})[k][j]=PR[k][j];EDG.delete(j);SCH[j]=0}
 for(let y=cy*8;y<cy*8+8;y++)for(let x=cx*8;x<cx*8+8;x++){const q=y*BW+x;FX.blood[q]=0;BURN[q]=0;FX.fire[q]=0;FX.smoke[q]=0}solDirty=true;fxDirty=true;sparkle(cx,cy,14)}
function sparkle(cx,cy,n){for(let i=0;i<n;i++)SPK.push({x:cx*T+Math.random()*T,y:cy*T+Math.random()*T,vx:(Math.random()-.5)*.12,vy:-.05-Math.random()*.1,h:Math.random()*360,l:0,L:90+Math.random()*90,tw:Math.random()*6})}
// recorded clips: water squelch while scrubbing, rubber squeaks on clean tiles
const SBUF={};function sample(n,vol,rate){if(mute||!gest)return;try{const a=au(),go=bufs=>{const b=bufs[Math.random()*bufs.length|0],s=a.createBufferSource(),g=a.createGain();s.buffer=b;s.playbackRate.value=rate||(.92+Math.random()*.16);g.gain.value=vol;s.connect(g).connect(MS);s.start()};
 if(SBUF[n]){if(SBUF[n].length)go(SBUF[n]);return}SBUF[n]=[];Promise.all(SND64[n].map(b64=>{const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return a.decodeAudioData(u.buffer)})).then(bs=>{SBUF[n]=bs;go(bs)}).catch(()=>{})}catch(e){}}
let sqT=0;function squeak(force){const n=performance.now();if(!force&&n-sqT<230)return;sqT=n;sample(force||Math.random()<.6?'tube':'shoe',force?.32:.22)}
let hsT=0;function douse(x,y,R,n){for(let i=0;i<Math.min(8,2+n);i++)DUST.push({x:x+(Math.random()-.5)*R*1.6,y:y+(Math.random()-.5)*R*1.6,vx:(Math.random()-.5)*.15,vy:-.25-Math.random()*.3,g:0,c:rgb(236,240,244),l:0,L:30+Math.random()*25,d:0,z:2+(Math.random()*2|0),a:.45});
 const t=performance.now();if(mute||!gest||t-hsT<110)return;hsT=t;try{noise(.32+Math.random()*.2,4200+Math.random()*1500,.5,.07,'highpass');noise(.18,2200,1.2,.04,'bandpass')}catch(e){}}
let scrT=0;function scrub(){const t=performance.now();if(t-scrT<140)return;scrT=t;sample('water',.5)}
let chT=0;function chime(p){if(mute||!gest)return;try{tone(1180*p,.28,.02);tone(1770*p,.22,.012);tone(2360*p,.16,.006);noise(.05,6000,1,.015,'highpass')}catch(e){}}
let VAC=null;function vacOn(){if(VAC||mute||!gest)return;try{const a=au(),len=a.sampleRate|0,buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;const n=a.createBufferSource();n.buffer=buf;n.loop=true;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=420;const o=a.createOscillator();o.type='sawtooth';o.frequency.value=92;const of=a.createBiquadFilter();of.type='lowpass';of.frequency.value=260;const g=a.createGain();g.gain.value=0;g.gain.linearRampToValueAtTime(.06,a.currentTime+.15);const og=a.createGain();og.gain.value=.25;n.connect(f).connect(g);o.connect(of).connect(og).connect(g);g.connect(MS);n.start();o.start();VAC={g,f,o,n}}catch(e){}}
function vacOff(){if(!VAC)return;const v=VAC;VAC=null;try{const t=AC.currentTime;v.g.gain.cancelScheduledValues(t);v.g.gain.setValueAtTime(v.g.gain.value,t);v.g.gain.linearRampToValueAtTime(0,t+.15);v.n.stop(t+.2);v.o.stop(t+.2)}catch(e){}}
const clR=()=>CL&&CL.k==='vac'?7+edSize*4:4+edSize*3;
const WET=new Map();function wetAt(x,y,R){for(let Y=Math.floor((y-R)/2);Y<=(y+R)/2;Y++)for(let X=Math.floor((x-R)/2);X<=(x+R)/2;X++){if(X<0||Y<0||X>=BW||Y>=BH||Math.hypot(X*2+1-x,Y*2+1-y)>R)continue;const q=Y*BW+X;if(sol[(Y*2)*W+X*2])continue;WET.set(q,Math.max(WET.get(q)||0,1))}}
function cleanTick(){for(let i=VP.length-1;i>=0;i--){const p=VP[i],dx=mouse.x-p.x,dy=mouse.y-p.y,d=Math.hypot(dx,dy);if(d<2||!CL){VP.splice(i,1);continue}const v=Math.min(d,2+d*.15);p.x+=dx/d*v;p.y+=dy/d*v}for(const[q,v]of WET){const n=v*.985-.002;if(n<=0)WET.delete(q);else WET.set(q,n)}for(const p of SPK){p.x+=p.vx;p.y+=p.vy;p.l++}for(let i=SPK.length-1;i>=0;i--)if(SPK[i].l>SPK[i].L)SPK.splice(i,1);
 if(!CL)return;const mx=mouse.x,my=mouse.y,R=clR();
 if(CL.k==='vac'){let got=0,air=0;for(let Y=Math.floor((my-R*1.3)/2);Y<=(my+R*1.3)/2;Y++)for(let X=Math.floor((mx-R*1.3)/2);X<=(mx+R*1.3)/2;X++){if(X<0||Y<0||X>=BW||Y>=BH)continue;const q=Y*BW+X;for(const A of[SF,SS,ST,FX.smoke])if(A[q]>0){air+=A[q];A[q]=A[q]<.02?0:A[q]*.82}}if(air>.05)fxDirty=true;for(let i=parts.length-1;i>=0;i--){const p=parts[i],dx=mx-p.x,dy=my-p.y,d=Math.hypot(dx,dy);if(d>R*1.7)continue;if(d<2.5){parts.splice(i,1);got++;continue}const v=Math.min(d,1.2+(R*1.7-d)*.12);p.x+=dx/d*v;p.y+=dy/d*v}
  for(const b of [...bodies])if(b.type==='weapon'&&WP[b.kind]&&WP[b.kind].bullet&&Math.hypot(b.x-mx,b.y-my)<R){remove(b);got++}
  if(prOK()){let n=0;for(let Y=Math.floor(my-R);Y<=my+R&&n<30;Y++)for(let X=Math.floor(mx-R);X<=mx+R&&n<30;X++){if(X<0||Y<0||X>=W||Y>=H||Math.hypot(X-mx,Y-my)>R)continue;const j=Y*W+X;if(sol[j]||OBJ[j]||floor[j]===PR.floor[j])continue;const q=(Y>>1)*BW+(X>>1);if(BURN[q]>.12||FX.blood[q]>.05)continue;if(chDiff(floor[j],PR.floor[j])<10){floor[j]=PR.floor[j];GT[j]=PR.GT[j];continue}
   VP.push({x:X,y:Y,c:floor[j]});floor[j]=PR.floor[j];GT[j]=PR.GT[j];n++;got++}}
  if(VAC)try{VAC.f.frequency.setTargetAtTime(got?900:air>.3?650:420,AC.currentTime,.05)}catch(e){}if(got&&!mute&&gest&&performance.now()-scrT>22){scrT=performance.now();try{noise(.02,2600+Math.random()*2400,2,.05,'bandpass');if(Math.random()<.5)tone(1800+Math.random()*1600,.02,.006)}catch(e){}}return}
 if(CL.k==='sponge'){if(Math.hypot(mx-CL.lx,my-CL.ly)<1.5||!prOK())return;CL.lx=mx;CL.ly=my;let did=false,fire=0;wetAt(mx,my,R);for(let i=parts.length-1;i>=0;i--){const p=parts[i];if(p.em!==undefined&&Math.hypot(p.x-mx,p.y-my)<R+2){parts.splice(i,1);fire++}}
  for(let Y=Math.floor(my-R);Y<=my+R;Y++)for(let X=Math.floor(mx-R);X<=mx+R;X++){if(X<0||Y<0||X>=W||Y>=H||Math.hypot(X-mx,Y-my)>R)continue;const j=Y*W+X;if(sol[j]||PR.sol[j])continue;
   if(!SCH[j]){}else if(OBJ[j]&&PR.OBJ[j]){if(OBJC[j]!==PR.OBJC[j]){OBJC[j]=chDiff(OBJC[j],PR.OBJC[j])<10?PR.OBJC[j]:mix(OBJC[j],PR.OBJC[j],.3);did=true}}else if(!OBJ[j]&&floor[j]!==PR.floor[j]){floor[j]=chDiff(floor[j],PR.floor[j])<10?PR.floor[j]:mix(floor[j],PR.floor[j],.3);if(floor[j]===PR.floor[j]){GT[j]=PR.GT[j];SCH[j]=0}did=true}
   const q=(Y>>1)*BW+(X>>1);if(FX.fire[q]>.02||TF[q]>.02)fire++;if(FX.fire[q]>0||FX.smoke[q]>0||TF[q]>0){FX.fire[q]=0;TF[q]=0;FX.smoke[q]*=.5;did=true;fxDirty=true}if(FX.blood[q]>0||BURN[q]>0){FX.blood[q]*=.55;BURN[q]*=.55;if(FX.blood[q]<.03)FX.blood[q]=0;if(BURN[q]<.03)BURN[q]=0;did=true;fxDirty=true}}
  if(fire)douse(mx,my,R,fire);scrub();if(!did){squeak();return}const c0=Math.floor((mx-R)/T),c1=Math.floor((mx+R)/T),r0=Math.floor((my-R)/T),r1=Math.floor((my+R)/T);
  for(let cy=r0;cy<=r1;cy++)for(let cx=c0;cx<=c1;cx++){if(cx<0||cy<0||cx>=CW||cy>=CH)continue;const id=cy*CW+cx;if(stainBad(cx,cy))CL.dirty.add(id);else if(CL.dirty.has(id)){CL.dirty.delete(id);squeak(true);sparkle(cx,cy,5)}}}}
function cleanDown(k,e){const[x,y]=toBoard(e);if(k==='wand'){CL={k,cells:[],seen:new Set()};wandAdd(x/T|0,y/T|0);return}CL={k,lx:-99,ly:-99,dirty:new Set()};if(k==='vac')vacOn()}
function wandAdd(cx,cy){const o=Math.floor((edSize-1)/2);for(let y=cy-o;y<cy-o+edSize;y++)for(let x=cx-o;x<cx-o+edSize;x++){if(x<0||y<0||x>=CW||y>=CH)continue;const id=y*CW+x;if(CL.seen.has(id))continue;CL.seen.add(id);if(cellBad(x,y))CL.cells.push([x,y])}}
function cleanUp(){if(!CL)return;const c=CL;CL=null;vacOff();if(c.k==='wand'&&c.cells.length)WQ={q:c.cells,next:0,run:0}}
let WQ=null;function wandTick(){const w=WQ;if(!w)return;const t=performance.now();if(t<w.next)return;const[x,y]=w.q.shift();repairCell(x,y);w.run++;chime(1+Math.min(.4,w.run*.03));w.next=t+Math.max(45,110-w.run*6);if(!w.q.length){WQ=null;ds0Need=true;if(ROOMS)ROOMS.t=-1e9}}

// items
const ITEMS=[['gold','Solari'],['mbox','Musket balls'],['pbox','Pistol shot'],['sbox','Shells'],['rbox','Bolter rods'],['cell','Plasma cells']];let itDrag=null;
{const host=$('items');for(const[k,n]of ITEMS){const d=mk('div');d.append(icon(shape(k,0),1),mk('span','n',n));let amt=null;if(k==='gold'){amt=mk('input');amt.type='number';amt.value=50;amt.min=1;amt.style.cssText='width:56px;background:transparent;border:0;padding:0;font-size:16px';amt.onpointerdown=e=>e.stopPropagation();d.append(amt)}else d.append(mk('span','c',''));
 d.onpointerdown=e=>{au();e.preventDefault();const g=icon(shape(k,0),2);g.className='ghost';g.style.left=e.clientX-28+'px';g.style.top=e.clientY-20+'px';$('sm').appendChild(g);itDrag={k,n:amt?Math.max(1,+amt.value||50):1,g}};host.appendChild(d)}}
window.addEventListener('pointermove',e=>{if(itDrag){itDrag.g.style.left=e.clientX-28+'px';itDrag.g.style.top=e.clientY-20+'px'}});
window.addEventListener('pointerup',e=>{if(!itDrag)return;const d=itDrag;itDrag=null;d.g.remove();if(!inBoard(e))return;const[x,y]=toBoard(e),X=x|0,Y=y|0;
 const tk=bodyAt(X,Y,3,null,o=>o.type==='token'&&o.status!=='dead');if(tk){sfx(addItem(tk,{k:d.k,n:d.n})?'flick':'dry');lastHud='';return}
 const c=boxAt(X,Y)||bodyAt(X,Y,3,null,o=>o.kind==='crate'&&!o.hidden);if(c){if(!putIn(c,d.k,d.n)){NOPE();return}if(c.hidden)openCrate=c;lastHud='';storeSnd(d.k);return}if(WP[d.k]){const w=weapon(d.k,x,y,0);if(d.k==='gold')w.amt=d.n;sfx('drop')}});

// asset editor
const AE={key:null,px:null,from:null,mod:false,tool:'pen',col:[200,180,140],mx:false,my:false,undo:[],redo:[],drafts:{},sel:null,adj:null,cmp:false,pat:{mode:'Overlay',sc:1,vary:0}};const ZM=12;
const aeEl=mk('div');aeEl.id='ae';view.appendChild(aeEl);
const aec=mk('canvas');aec.id='aec';aec.width=TS*ZM;aec.height=TS*ZM;const ag=aec.getContext('2d');
const atb=mk('div','at'),apal=mk('div','pal'),asl=mk('div','ef'),apv=mk('div','pv'),colIn=mk('input'),curSw=mk('span','cur');colIn.type='color';
const atab=mk('div','at'),aly=mk('div','ef'),am=mk('div','am');am.append(aec,apal);aeEl.append(atab,atb,am,asl,aly,apv,colIn);asl.style.width=aly.style.width=TS*ZM+'px';
function aeTabs(){atab.innerHTML='';for(const[m,t]of[['layers','Layers'],['paint','Paint']]){const b=mk('button',null,t);if(AE.mode===m)b.classList.add('on');b.onclick=()=>aeMode(m);atab.appendChild(b)}const lay=AE.mode==='layers';atb.style.display=am.style.display=asl.style.display=lay?'none':'';aly.style.display=lay?'':'none'}
function aeMode(m){if(m===AE.mode)return;aeBake();aeSnap();if(m==='paint'){const f=recTex(AE.rec);AE.px=new Uint8ClampedArray(TS*TS*3);for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const c=f(x,y),o=(y*TS+x)*3;AE.px[o]=c[0];AE.px[o+1]=c[1];AE.px[o+2]=c[2]}}else if(!AE.rec)AE.rec=baseRec(AE.from);AE.mode=m;aeTabs();aeSliders();aeLayers();aePatOpts();aeDirty()}
const aeF=()=>AE.mode==='layers'?(AE.recF||(AE.recF=recTex(AE.rec))):(X,Y)=>tilePx(AE.px,X,Y);
// stamp: one 16x16 motif per cell, transparent where unpainted
const asc=mk('canvas');asc.width=asc.height=16*12;asc.id='aes';asc.style.cssText='image-rendering:pixelated;border:1px solid #000;cursor:crosshair;touch-action:none;background:repeating-conic-gradient(#2a2a2a 0 25%,#222 0 50%) 0 0/24px 24px';
let stTool='pen',stDrag=null;
function stGet(){return AE.rec.stamp?dec(AE.rec.stamp):new Uint8ClampedArray(16*16*4)}
function stPlot(a,x,y,c){const pts=[[x,y]];if(AE.mx)pts.push([15-x,y]);if(AE.my)pts.push([x,15-y]);if(AE.mx&&AE.my)pts.push([15-x,15-y]);for(const[u,v]of pts){const i=(v*16+u)*4;if(c){a[i]=c[0];a[i+1]=c[1];a[i+2]=c[2];a[i+3]=255}else a[i]=a[i+1]=a[i+2]=a[i+3]=0}}
function stDraw(){const g=asc.getContext('2d');g.clearRect(0,0,192,192);if(!AE.rec)return;const a=stGet();for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4;if(!a[i+3])continue;g.fillStyle=`rgb(${a[i]},${a[i+1]},${a[i+2]})`;g.fillRect(x*12,y*12,12,12)}g.fillStyle='rgba(0,0,0,.25)';for(let i=1;i<16;i++){g.fillRect(i*12,0,1,192);g.fillRect(0,i*12,192,1)}}
const stXY=e=>{const r=asc.getBoundingClientRect();return[Math.max(0,Math.min(15,(e.clientX-r.left)/r.width*16|0)),Math.max(0,Math.min(15,(e.clientY-r.top)/r.height*16|0))]};
function stApply(e){const[x,y]=stXY(e),a=stGet();if(stTool==='pick'||e.altKey){const i=(y*16+x)*4;if(a[i+3]){AE.col=[a[i],a[i+1],a[i+2]];aeLayers()}return}const p=stDrag&&stDrag.last||[x,y],n=Math.max(Math.abs(x-p[0]),Math.abs(y-p[1]))||1;for(let i=0;i<=n;i++)stPlot(a,Math.round(p[0]+(x-p[0])*i/n),Math.round(p[1]+(y-p[1])*i/n),stTool==='erase'||e.buttons===2?null:AE.col);if(stDrag)stDrag.last=[x,y];AE.rec.stamp=a.some(v=>v)?enc(a):null;AE.recF=null;aeDirty()}
asc.addEventListener('pointerdown',e=>{if(!AE.rec)return;e.preventDefault();asc.setPointerCapture(e.pointerId);if(stTool!=='pick'&&!e.altKey)aeSnap();stDrag={last:null};stApply(e)});
asc.addEventListener('pointermove',e=>{if(stDrag&&e.buttons)stApply(e)});asc.addEventListener('pointerup',()=>stDrag=null);asc.addEventListener('contextmenu',e=>e.preventDefault());
function aeLayers(){aly.innerHTML='';if(AE.mode!=='layers'||!AE.rec)return;const r=AE.rec,row=(t)=>{const d=mk('div','er');d.append(mk('span',null,t));d.firstChild.style.minWidth='84px';aly.appendChild(d);return d};
 const set=(f,re)=>{aeBake();aeSnap();f();AE.recF=null;if(re)aeLayers();aeDirty()};
 const btns=(host,opts,cur,f)=>{for(const[k,t]of Object.entries(opts)){const b=mk('button',null,t);if(cur===k)b.classList.add('on');b.onclick=()=>set(()=>f(k),1);host.appendChild(b)}};
 {const d=row('Base'),sw=mk('span','cur');sw.style.background=`rgb(${r.base.map(v=>v|0)})`;sw.onclick=()=>{colIn.value=toHex(r.base);let snap=false;colIn.oninput=()=>{if(!snap){aeBake();aeSnap();snap=true}r.base=fromHex(colIn.value);sw.style.background=colIn.value;AE.recF=null;aeDirty()};colIn.click()};d.appendChild(sw)}
 const sl=mk('div','ef');aly.appendChild(sl);aeSliders(sl);
 btns(row('Material'),MATS,r.mat,k=>r.mat=k);
 const lays={...LAYS};if(r.lay&&r.lay.startsWith('pat:'))lays[r.lay]=MODS.pat[r.lay.slice(4)]?.name||PNAME[r.lay.slice(4)]||'Pattern';btns(row('Layout'),lays,r.lay,k=>r.lay=k);
 {const d=row('Joints');btns(d,{1:'1',2:'2'},String(r.jw||1),k=>r.jw=+k);const i=mk('input');i.type='range';i.min=40;i.max=100;i.value=Math.round((r.jd??.8)*100);let sn=false;i.oninput=()=>{if(!sn){aeSnap();sn=true}r.jd=+i.value/100;AE.recF=null;aeDirty()};i.onchange=()=>sn=false;d.appendChild(i)}
 const rng=(t,get,put,max=100)=>{const d=row(t),i=mk('input');i.type='range';i.min=0;i.max=max;i.value=Math.round(get()*100);let sn=false;i.oninput=()=>{if(!sn){aeSnap();sn=true}put(+i.value/100);AE.recF=null;aeDirty()};i.onchange=()=>sn=false;d.appendChild(i);return d};
 const vd=rng('Variation',()=>r.vary??.3,v=>r.vary=v);{const b=mk('button',null,'Shuffle');b.onclick=()=>set(()=>r.seed=(r.seed|0)+1+(Math.random()*97|0));vd.appendChild(b)}
 r.wear=r.wear||{};rng('Edge wear',()=>r.wear.edge||0,v=>r.wear.edge=v);rng('Scuffs',()=>r.wear.scuff||0,v=>r.wear.scuff=v);rng('Cracks',()=>r.wear.crack||0,v=>r.wear.crack=v);
 {const d=row('Stamp');for(const[k,t]of[['pen','Pen'],['erase','Erase'],['pick','Pick']]){const b=mk('button',null,t);if(stTool===k)b.classList.add('on');b.onclick=()=>{stTool=k;aeLayers()};d.appendChild(b)}for(const[k,t]of[['mx','Mirror X'],['my','Mirror Y']]){const b=mk('button',null,t);if(AE[k])b.classList.add('on');b.onclick=()=>{AE[k]=!AE[k];aeLayers()};d.appendChild(b)}
  const sw=mk('span','cur');sw.style.background=`rgb(${AE.col})`;sw.onclick=()=>{colIn.value=toHex(AE.col);colIn.oninput=()=>{AE.col=fromHex(colIn.value);sw.style.background=colIn.value};colIn.click()};const cl=mk('button',null,'Clear');cl.onclick=()=>set(()=>r.stamp=null);d.append(sw,cl)}
 const sd=mk('div','er');sd.appendChild(asc);aly.appendChild(sd);stDraw()}
const TOOLS2=[['pen','Pen'],['fill','Fill'],['line','Line'],['rect','Rect'],['pick','Pick'],['sel','Select']];
function aeToolbar(){atb.innerHTML='';for(const[k,t]of TOOLS2){const b=mk('button',null,t);if(AE.tool===k)b.classList.add('on');b.onclick=()=>{AE.tool=k;aeToolbar()};atb.appendChild(b)}atb.appendChild(mk('span','sep'));
 for(const[k,t]of[['mx','Mirror X'],['my','Mirror Y']]){const b=mk('button',null,t);if(AE[k])b.classList.add('on');b.onclick=()=>{AE[k]=!AE[k];aeToolbar()};atb.appendChild(b)}atb.appendChild(mk('span','sep'));
 const u=mk('button',null,'Undo'),r=mk('button',null,'Redo');u.onclick=()=>aeUndo(false);r.onclick=()=>aeUndo(true);atb.append(u,r,mk('span','sep'),curSw);curSw.style.background=`rgb(${AE.col})`;curSw.onclick=()=>{colIn.value=toHex(AE.col);colIn.oninput=()=>{AE.col=fromHex(colIn.value);curSw.style.background=colIn.value;aePalette()};colIn.click()}}
const toHex=c=>'#'+c.map(v=>(v|0).toString(16).padStart(2,'0')).join(''),fromHex=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b),l=(M+m)/2;if(M===m)return[0,0,l];const d=M-m,s=l>.5?d/(2-M-m):d/(M+m);let h=M===r?(g-b)/d+(g<b?6:0):M===g?(b-r)/d+2:(r-g)/d+4;return[h/6,s,l]}
function hsl2rgb(h,s,l){if(!s)return[l*255,l*255,l*255];const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,f=t=>{t=(t%1+1)%1;return(t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p)*255};return[f(h+1/3),f(h),f(h-1/3)]}
function aeSliders(host){host=host||asl;host.innerHTML='';for(const[k,t,mn,mx]of[['h','Hue',-180,180],['s','Saturation',-100,100],['l','Light',-50,50]]){const r=mk('div','er'),i=mk('input');i.type='range';i.min=mn;i.max=mx;i.value=AE.adj?AE.adj[k]:0;i.oninput=()=>{if(!AE.adj){aeSnap();AE.adj={h:0,s:0,l:0,base:AE.mode==='layers'?AE.rec.base.slice():AE.px.slice()}}AE.adj[k]=+i.value;aeAdjust()};r.append(mk('span',null,t),i);r.firstChild.style.minWidth='84px';host.appendChild(r)}}
function aeAdjust(){const a=AE.adj,b=a.base,p=AE.mode==='layers'?AE.rec.base:AE.px;for(let i=0;i<b.length;i+=3){let[h,s,l]=rgb2hsl(b[i],b[i+1],b[i+2]);h+=a.h/360;s=Math.max(0,Math.min(1,s*(1+a.s/100)));l=Math.max(0,Math.min(1,l+a.l/100*(a.l>0?1-l:l)));const c=hsl2rgb(h,s,l);p[i]=c[0];p[i+1]=c[1];p[i+2]=c[2]}if(AE.mode==='layers'){AE.recF=null;const sw=aly.querySelector('.cur');if(sw)sw.style.background=`rgb(${p.map(v=>v|0)})`}aeDirty()}
const aeBake=()=>{if(AE.adj){AE.adj=null;if(AE.mode==='layers')aeLayers();else aeSliders()}};
const aeState=()=>AE.mode==='layers'?{rec:JSON.stringify(AE.rec)}:{px:AE.px.slice()};
function aeSnap(){AE.undo.push(aeState());if(AE.undo.length>80)AE.undo.shift();AE.redo=[]}
function aeUndo(re){const a=re?AE.redo:AE.undo,b=re?AE.undo:AE.redo;if(!a.length)return;aeBake();b.push(aeState());const s=a.pop();if(s.rec){AE.rec=JSON.parse(s.rec);AE.mode='layers'}else{AE.px=s.px;AE.mode='paint'}AE.recF=null;aeTabs();aeLayers();aeDirty()}
function aeShift(dx,dy){if(AE.mode!=='paint'||!AE.px||!dx&&!dy)return;aeBake();aeSnap();const o=AE.px.slice();for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const s=((((y-dy)%TS)+TS)%TS*TS+(((x-dx)%TS)+TS)%TS)*3,d=(y*TS+x)*3;AE.px[d]=o[s];AE.px[d+1]=o[s+1];AE.px[d+2]=o[s+2]}aeDirty()}
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
function aePreview(){apv.innerHTML='';if(!AE.px&&!AE.rec)return;const F=aeF();const kind=furnK(AE.from)?'furn':KIND[AE.from],N=96,mkC=()=>{const c=mk('canvas');c.width=c.height=N;return c};
 const put=(c,f)=>{const g=c.getContext('2d'),im=g.createImageData(N,N);for(let Y=0;Y<N;Y++)for(let X=0;X<N;X++){const v=f(X,Y),i=(Y*N+X)*4;im.data[i]=v[0];im.data[i+1]=v[1];im.data[i+2]=v[2];im.data[i+3]=255}g.putImageData(im,0,0);apv.appendChild(c);return g};
 put(mkC(),F);
 const wall=bake('stone'),flo=bake('flag'),sc2=(c,k)=>[c[0]*k,c[1]*k,c[2]*k],isW=(X,Y)=>{const cx=X>>4,cy=Y>>4;return kind==='wall'?cy===2||cx===2&&cy>2:kind==='floor'?cx===0||cy===0||cx===5||cy===5:false},isF=(X,Y)=>kind==='furn'&&(X>>4)>=1&&(X>>4)<=2&&(Y>>4)>=1&&(Y>>4)<=2;
 const room=(X,Y)=>{if(isW(X,Y))return sc2(kind==='wall'?F(X,Y):tilePx(wall,X,Y),isW(X,Y-1)?.9:1.08);if(isF(X,Y)){const x=X-16,y=Y-16,e=Math.min(x,y,31-x,31-y);const c=F(X,Y);return e===0?sc2(c,.5):e===1&&(x===1||y===1)?sc2(c,1.12):c}
  let c=kind==='floor'?F(X,Y):tilePx(flo,X,Y);if(isW(X,Y-1)||isW(X-1,Y))c=sc2(c,.66);else if(isW(X,Y-2)||isW(X-2,Y))c=sc2(c,.82);if(kind==='furn'&&(isF(X,Y-1)||isF(X,Y-2))&&!isF(X,Y))c=sc2(c,.6);return c};
 const g=put(mkC(),room),t={type:'token',ang:-Math.PI/2,look:'Watchman',unit:'home',nat:'Goldbank',guard:false,tone:0};try{const px=tokPixels(t),set=new Set(px.map(p=>K(p[0],p[1]))),cx=kind==='furn'?64:kind==='wall'?24:56,cy=kind==='wall'?20:58;for(const p of px){let c=pcol(t,p);if(c===0)continue;if(!sprG(lookOf(t))&&(!set.has(K(p[0]+1,p[1]))||!set.has(K(p[0]-1,p[1]))||!set.has(K(p[0],p[1]+1))||!set.has(K(p[0],p[1]-1))))c=mul(c,.36);g.fillStyle=css(c);g.fillRect(cx+p[0],cy+p[1],1,1)}}catch(e){}
 put(mkC(),(X,Y)=>{const c=room(X,Y);return[c[0]*.4,c[1]*.42,c[2]*.52]});
 if(AE.cmp)put(mkC(),(X,Y)=>tilePx(bake(AE.from),X,Y))}
function aeDirty(keepPal){AE.dirty=true;AE.recF=null;if(AE.mode==='paint'){aeDraw();if(!keepPal)aePalette()}else stDraw();aePreview();const r=document.querySelector(`#sm [id^=ae-] [data-k="${AE.key}"] .c`);if(r&&!r.textContent.includes('•'))r.textContent='• '+r.textContent}
function aeStash(){if(AE.key&&AE.dirty)AE.drafts[AE.key]={mode:AE.mode,px:AE.px&&AE.px.slice(),rec:cp(AE.rec),undo:AE.undo,redo:AE.redo}}
function aeLoad(k){aeStash();aeBake();const d=AE.drafts[k],m=MODS.tex[k];AE.key=k;AE.mod=!!m;AE.from=rootOf(k);AE.recF=null;if(d){AE.mode=d.mode;AE.px=d.px?d.px.slice():bake(k).slice();AE.rec=cp(d.rec)}else{AE.px=bake(k).slice();AE.rec=m?cp(m.rec)||null:baseRec(k);AE.mode=AE.rec?'layers':'paint'}AE.undo=d?d.undo:[];AE.redo=d?d.redo:[];AE.dirty=!!d;AE.sel=null;aeTabs();aeLayers();aeSliders();aePatOpts();aeLists();aeAsset();aeDraw();aePreview();aePalette()}
function aeOpen(){aeToolbar();if(!AE.key)aeLoad('stone.sand.flags');else{aeTabs();aeLayers();aeSliders();aePatOpts();aeLists();aeAsset();aeDraw();aePreview();aePalette()}}
function aeLists(){const badge=(k,m)=>(AE.drafts[k]&&k!==AE.key||k===AE.key&&AE.dirty?'• ':'')+(m?'Mod':'🔒');if(AE.key&&!AE.mod)pkFrom(AE.key);tilePicker($('ae-fl'),k=>aeLoad(k),k=>k===AE.key);texRows($('ae-fu'),'furn',k=>aeLoad(k),k=>k===AE.key,badge);
 const h=$('ae-wl');h.innerHTML='';for(const k of Object.keys(MODS.tex)){const d=mk('div');d.dataset.k=k;d.append(swatch(bake(k)),mk('span','n',tName(k)),mk('span','c md',badge(k,true)));if(k===AE.key)d.classList.add('on');d.onpointerdown=e=>{e.preventDefault();aeLoad(k)};h.appendChild(d)}aePatList()}
function aeAsset(){const h=$('ae-as');h.innerHTML='';const r1=mk('div','er'),ni=mk('input');ni.type='text';ni.id='aen';ni.value=AE.mod?MODS.tex[AE.key].name:tName(AE.key)+' (mod)';r1.append(ni);
 const r0=mk('div','er');r0.append(mk('span',null,AE.mod?'From':'Base'),mk('span',null,tName(AE.from)));r0.lastChild.style.color='#c9c5b8';
 const r2=mk('div','er'),b=(t,f,host=r2)=>{const x=mk('button',null,t);x.onclick=()=>f(x);host.appendChild(x);return x};
 b('Save',x=>{aeSave(false);flashB(x,'Saved')});b('Save as',x=>{aeSave(true);flashB(x,'Saved')});if(AE.mod)b('Delete',x=>confirmB(x,()=>aeDelete()));if(AE.dirty||AE.mod)b('Revert',()=>{delete AE.drafts[AE.key];AE.dirty=false;AE.key=null;aeLoad(AE.mod?AE.from:AE.from)});
 const cb=b('Compare',()=>{AE.cmp=!AE.cmp;cb.classList.toggle('on',AE.cmp);aePreview()});cb.classList.toggle('on',AE.cmp);
 const r3=mk('div','er'),ta=mk('textarea');ta.spellcheck=false;r3.appendChild(ta);const r4=mk('div','er');
 b('Copy code',x=>{ta.value='// Fluoria texture\nFLUORIA_TEX('+JSON.stringify({name:ni.value,from:AE.from,kind:furnK(AE.from)?'furniture':KIND[AE.from],...(AE.mode==='layers'?{rec:AE.rec}:{s:TS,px:enc(AE.px)})})+')';ta.select();try{navigator.clipboard.writeText(ta.value).catch(()=>{})}catch(e){}try{document.execCommand('copy')}catch(e){}flashB(x,'Copied')},r4);
 b('Copy all mods',x=>{ta.value='// Fluoria mods\nFLUORIA_MODS('+JSON.stringify({tex:MODS.tex,pat:MODS.pat,maps:MODS.maps})+')';ta.select();try{navigator.clipboard.writeText(ta.value).catch(()=>{})}catch(e){}try{document.execCommand('copy')}catch(e){}flashB(x,'Copied')},r4);
 b('Load code',x=>{const s=ta.value,i=s.indexOf('{'),j=s.lastIndexOf('}');try{const ids=importPack(JSON.parse(s.slice(i,j+1)));if(ids.length&&MODS.tex[ids[0]])aeLoad(ids[0]);flashB(x,'Loaded')}catch(e){flashB(x,'Bad code')}},r4);
 const r5=mk('div','er');b('Export mods',()=>download('fluoria-mods.json',{fluoria:1,tex:MODS.tex,pat:MODS.pat,maps:MODS.maps}),r5);b('Import mods',x=>pickFile(o=>{importPack(o);flashB(x,'Loaded')}),r5);
 h.append(r1,r0,r2,r3,r4,r5)}
function aeSave(asNew){aeBake();const nm=($('aen').value||'').trim()||tName(AE.key)+' (mod)';let id=AE.key;const body=AE.mode==='layers'?{rec:cp(AE.rec)}:{s:TS,px:enc(AE.px)};if(AE.mod&&!asNew){const m=MODS.tex[id];delete m.px;delete m.rec;Object.assign(m,{name:nm},body)}else{delete AE.drafts[AE.key];id='m_'+uidS();MODS.tex[id]={name:nm,from:AE.from,kind:KIND[AE.from],...body}}
 delete AE.drafts[id];saveMods();regTex(id);AE.key=id;AE.mod=true;AE.dirty=false;aeLists();aeAsset();retex(id)}
function aeDelete(){const id=AE.key,p=AE.from;delete MODS.tex[id];delete AE.drafts[id];saveMods();BAKE.delete(id);if(map.some(r=>r.includes(id))||OM.some(r=>r&&r.includes(id))){edSrc=srcNow().map(r=>r.map(k=>k===id?p:k));refinish();edSrc=null}AE.key=null;aeLoad(p)}
function retex(id){if(!(map.some(r=>r.includes(id))||OM.some(r=>r&&r.includes(id))))return;srcNow();refinish();edSrc=null}
// patterns: five tones; base ones are the patterns behind the built-in textures
// the asset editor's pattern library: each pattern gives a shade index per pixel of a 16px cell
const wrap=v=>((v%T)+T)%T;
const PAT={
 marble:(x,y,c)=>{const v=Math.sin((x*.9+y*.35)+Math.sin(y*.5+c.s)*2.2);let t=v>.92?1:v>.8?2:3;if(hh(Math.floor(x/2),Math.floor(y/2),c.s)>.88)t=4;if((c.cx%2===1&&x===T-1)||(c.cy%2===1&&y===T-1))t=1;return t},
 dmarble:(x,y,c)=>PAT.marble(x,y,c),
 flag:(x,y)=>{const rows=[[0,6,[0,7]],[6,11,[3,10]],[11,16,[1,9,13]]];for(const[a,b,cuts] of rows)if(y>=a&&y<b){const xs=[...cuts,T+cuts[0]];let k=0;while(wrap(x-xs[0])>=xs[k+1]-xs[0])k++;const l=xs[k],r=xs[k+1];const lx=wrap(x-l);if(y===a||lx===0)return 0;if(y===a+1||lx===1)return 3;if(y===b-1||lx===r-l-1)return 1;return hh(x,y,9)>.85?1:hh(x,y,10)>.9?3:2}},
 planks:(x,y,c)=>{const b=Math.floor(y/4),yy=y%4,j=(b*7+3+(c.cy%3)*5)%T;if(yy===3)return 0;if(x===j)return 0;if(yy===0)return 3;if((x===wrap(j+1)||x===wrap(j-2))&&yy===1)return 1;return hh(Math.floor(x/3),y,b+c.cx)>.82?1:hh(x,y,b)>.9?3:2},
 stone:(x,y)=>{const r=Math.floor(y/5),yy=y%5,xx=wrap(x+(r%2?5:0))%10;if(yy===0||xx===0)return 0;if(yy===1)return 3;if(yy===4)return 1;return hh(x,y,3)>.87?1:2},
 table:(x,y,c)=>{const v=hh(x,y,c.cx*7+c.cy*3);return v>.94?1:v>.9?3:2},
 carpet:(x,y)=>((x+y)%8===0||(x-y+16)%8===0)?3:hh(x,y,41)>.9?1:2,
 gfloor:(x,y)=>x===0||y===0?1:x===T-1||y===T-1?0:(x+y)%7===0?4:3,
 gstone:(x,y,c)=>PAT.stone(x,y,c),
 pillar:x=>x===0||x===T-1?0:x%4===1?1:x%4===3?4:3,
 grass:(x,y,c)=>{const X=x+c.cx*T,Y=y+c.cy*T,v=hh(X,Y,5);return hh(X,Y>>1,6)>.92?(y%2?1:4):v>.86?3:v<.15?1:2},
 dirt:(x,y,c)=>{const X=x+c.cx*T,Y=y+c.cy*T,v=hh(X,Y,8);return v>.96?4:v>.84?3:v<.1?1:hh(X>>1,Y>>1,9)>.86?1:2},
 berm:(x,y,c)=>{const X=x+c.cx*T,Y=y+c.cy*T,v=hh(X>>1,Y>>1,12);return y%5===0&&hh(X>>2,Y,13)>.55?0:v>.85?3:v<.15?1:2},
 sky:(x,y,c)=>{const X=x+c.cx*T,Y=y+c.cy*T,v=hh(X>>3,Y>>2,21)*.6+hh(X>>2,Y>>1,22)*.4;return v>.78?4:v>.64?3:v<.22?1:2},
 rail:(x,y,c)=>{const X=x+c.cx*T,Y=y+c.cy*T;if(X%8===0&&Y%8===0)return 4;if(Y%4===0)return 0;if(Y%4===1)return 3;return hh(X>>2,Y,23)>.8?1:2},
 seat:(x,y)=>{if(x===0||y===0||x===T-1||y===T-1)return 0;if(x===1||y===1||x===T-2||y===T-2)return 1;if(y<=4)return 3;return (x+y)%4===0?1:(x-y+16)%4===2?3:2}};
const PNAME={marble:'Veins',flag:'Flagstones',planks:'Planks',stone:'Brick bond',table:'Speckle',carpet:'Diamond weave',gfloor:'Bevel',pillar:'Fluting',grass:'Tufts',dirt:'Grit',berm:'Strata',sky:'Cloud',rail:'Rails',seat:'Cushion',key:'Key motif'};
function patGrid(k){if(MODS.pat[k])return MODS.pat[k];const g=new Uint8Array(TS*TS);for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){let v;if(k==='key'){const X=x&15,Y=y&15,qx=X<8?X:15-X,qy=Y<8?Y:15-Y;v=KEYQ[qy][qx]==='#'||KEYQ[qx][qy]==='#'&&qx===qy?4:X===0||Y===0?1:2}else v=PAT[k](x&15,y&15,{s:7,cx:x>>4,cy:y>>4});g[y*TS+x]=v}return{w:TS,h:TS,g}}
const TONE=[[.6,.62,.66],[.8,.8,.82],[1,1,1],[1.13,1.12,1.1],[1.28,1.26,1.22]];
function patIcon(k){const p=patGrid(k),c=mk('canvas');c.width=28;c.height=20;const g=c.getContext('2d'),im=g.createImageData(28,20);for(let y=0;y<20;y++)for(let x=0;x<28;x++){const v=(p.g[(y%p.h)*p.w+(x%p.w)]??2),l=[50,92,128,168,212][v]||128,i=(y*28+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=l;im.data[i+3]=255}g.putImageData(im,0,0);return c}
function aePatList(){const h=$('ae-pt');h.innerHTML='';const add=(k,mine)=>{const d=mk('div');d.dataset.k=k;d.append(patIcon(k),mk('span','n',mine?MODS.pat[k].name:PNAME[k]),mk('span','c '+(mine?'md':'lk'),mine?'Mod':'🔒'));d.onpointerdown=e=>{e.preventDefault();if(e.button===2&&mine){patMenu(k,e);return}aePattern(k)};d.oncontextmenu=e=>e.preventDefault();h.appendChild(d)};
 for(const k in PNAME)add(k,false);const mine=Object.keys(MODS.pat);if(mine.length){h.appendChild(mk('div','isep'));for(const k of mine)add(k,true)}}
function patMenu(k,e){closeMenu();const r=$('sm').getBoundingClientRect();menu=mk('div','menu');menu.style.left=(e.clientX-r.left+4)+'px';menu.style.top=(e.clientY-r.top+4)+'px';const i=mk('input');i.value=MODS.pat[k].name;i.onkeydown=ev=>{if(ev.key==='Enter'){MODS.pat[k].name=i.value||MODS.pat[k].name;saveMods();closeMenu();aePatList()}};const d=mk('button',null,'Delete');d.onclick=()=>{delete MODS.pat[k];saveMods();closeMenu();aePatList()};menu.append(i,d);$('sm').appendChild(menu);i.focus();i.select()}
function aePatOpts(){const h=$('ae-po');h.innerHTML='';if(AE.mode==='layers')return;const r=mk('div','er');for(const m of['Overlay','Fill']){const b=mk('button',null,m);if(AE.pat.mode===m)b.classList.add('on');b.onclick=()=>{AE.pat.mode=m;aePatOpts()};r.appendChild(b)}r.appendChild(mk('span','sep'));for(const s of[1,2]){const b=mk('button',null,s+'×');if(AE.pat.sc===s)b.classList.add('on');b.onclick=()=>{AE.pat.sc=s;aePatOpts()};r.appendChild(b)}
 const r2=mk('div','er'),v=mk('input');v.type='range';v.min=0;v.max=40;v.value=AE.pat.vary;v.oninput=()=>AE.pat.vary=+v.value;r2.append(mk('span',null,'Vary'),v);
 const r3=mk('div','er'),sb=mk('button',null,'Save selection as pattern');sb.disabled=!AE.sel;sb.style.opacity=AE.sel?1:.4;sb.onclick=()=>{patFromSel();flashB(sb,'Saved')};r3.appendChild(sb);h.append(r,r2,r3)}
const lum=(r,g,b)=>r*.3+g*.59+b*.11;
function patFromSel(){const s=AE.sel;if(!s)return;const x0=Math.min(s.x0,s.x1),y0=Math.min(s.y0,s.y1),w=Math.abs(s.x1-s.x0)+1,h=Math.abs(s.y1-s.y0)+1,L=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)L.push(lum(...pget(x0+x,y0+y)));const q=[...L].sort((a,b)=>a-b),th=[.1,.35,.65,.9].map(f=>q[Math.min(q.length-1,f*q.length|0)]);
 const g=L.map(l=>l<th[0]?0:l<th[1]?1:l<=th[2]?2:l<=th[3]?3:4),n=Object.keys(MODS.pat).length+1;MODS.pat['p_'+uidS()]={name:'Pattern '+n,w,h,g};saveMods();aePatList()}
function aePattern(k){if(AE.mode==='layers'){aeBake();aeSnap();AE.rec.lay='pat:'+k;AE.recF=null;aeLayers();aeDirty();return}if(!AE.px)return;aeBake();aeSnap();const p=patGrid(k),sc=AE.pat.sc,vary=AE.pat.vary/100,px=AE.px;let ramp=null;
 if(AE.pat.mode==='Fill'){const ls=[];for(let i=0;i<px.length;i+=3)ls.push([lum(px[i],px[i+1],px[i+2]),i]);ls.sort((a,b)=>a[0]-b[0]);ramp=[.04,.25,.5,.75,.96].map(f=>{const i=ls[Math.min(ls.length-1,f*ls.length|0)][1];return[px[i],px[i+1],px[i+2]]})}
 for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const u=(x/sc|0)%p.w,v0=(y/sc|0)%p.h,t=p.g[v0*p.w+u]??2,o=(y*TS+x)*3,f=1+(hh(x,y,77)-.5)*2*vary;
  if(ramp){const c=ramp[t];px[o]=c[0]*f;px[o+1]=c[1]*f;px[o+2]=c[2]*f}else{const m=TONE[t];px[o]*=m[0]*f;px[o+1]*=m[1]*f;px[o+2]*=m[2]*f}}aeDirty()}
