
// save games: every visited map's pixels as changes from a fresh build, plus the whole body graph
const GSK=['SH','GOLD','floor','sol','shp','scol','crk','slabG','GT','SHN','DS','NOD','OBJ','OBJC','SCH','DMG','TF','SF','SS','ST','BURN','FV','SV','DV','TMP','WH','fxLow','fxTop','fxA','HZ','OPEN','LR','LG','LB','LT'];
const seeded=s=>()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
function gBase(m,q){const nb=NBM[m],sz=MAPSZ[m],R=Math.random,mu=mute;curMap=m;MAPSZ[m]=[q.CW,q.CH];
 if(MODS.maps[m]||m.startsWith('mod:'))NBM[m]=()=>{UND=q.UND?q.UND.map(r=>r.slice()):[];paintAll((cx,cy)=>q.map[cy][cx])};
 Math.random=seeded(7);mute=true;try{CW=-1;reset()}finally{Math.random=R;mute=mu;NBM[m]=nb;if(sz)MAPSZ[m]=sz;else delete MAPSZ[m]}
 for(const b of bodies)if(b.lab)b.lab.remove();bodies=[];parts=[];
 const a={DS0:DS};for(const k of GSK)a[k]=eval(k);for(const k in FX)a['FX.'+k]=FX[k];return a}
const gArr=q=>{const a={DS0:q.DS0};for(const k of GSK)a[k]=q.a[k];for(const k in q.FX)a['FX.'+k]=q.FX[k];return a};
function gEnc(root){const ids=new Map(),T=[],bins=[];
 const E=v=>{if(v===undefined)return{$u:1};if(v===null||typeof v!=='object'){if(typeof v==='function'||typeof v==='symbol')return undefined;if(typeof v==='number'&&!isFinite(v))return{$n:String(v)};return v}
  if(typeof Node!=='undefined'&&v instanceof Node)return undefined;if(ids.has(v))return{$r:ids.get(v)};const id=T.length;ids.set(v,id);T.push(null);let o=null;
  if(ArrayBuffer.isView(v))o={$t:v.constructor.name,b:bins.push(new Uint8Array(v.buffer,v.byteOffset,v.byteLength).slice())-1};
  else if(Array.isArray(v)){o={$a:[]};for(let i=0;i<v.length;i++){const e=E(v[i]);o.$a.push(e===undefined?null:e)}}
  else if(v instanceof Set)o={$s:[...v].map(E).filter(e=>e!==undefined)};
  else if(v instanceof Map)o={$m:[...v].map(([k,x])=>[E(k),E(x)])};
  else{const p=Object.getPrototypeOf(v);if(p===Object.prototype||p===null){o={$o:{}};for(const k in v){if(k==='lab'){if(v.lab)o.lab=1;continue}if(k==='wg'||k==='_wn')continue;const e=E(v[k]);if(e!==undefined)o.$o[k]=e}}}
  T[id]=o;return{$r:id}};
 return{root:E(root),T,bins}}
function gDec(root,T,bins){const out=[],done=[],labs=[];
 const D=x=>{if(x===null||typeof x!=='object')return x;if('$n'in x)return Number(x.$n);if('$u'in x)return undefined;const id=x.$r;if(done[id])return out[id];done[id]=1;const o=T[id];if(!o)return out[id]=null;
  if(o.$t){const b=bins[o.b];return out[id]=new self[o.$t](b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))}
  if(o.$a){const a=out[id]=[];for(let i=0;i<o.$a.length;i++)a[i]=D(o.$a[i]);return a}
  if(o.$s){const s=out[id]=new Set();for(const e of o.$s)s.add(D(e));return s}
  if(o.$m){const m=out[id]=new Map();for(const[k,e]of o.$m)m.set(D(k),D(e));return m}
  const r=out[id]={};for(const k in o.$o)r[k]=D(o.$o[k]);if(o.lab)labs.push(r);return r};
 return{v:D(root),labs}}
function gDiff(c,b,bins){if(!c)return null;const bin=x=>bins.push(new Uint8Array(x.buffer,x.byteOffset,x.byteLength).slice())-1;
 if(!b||b.length!==c.length||b.constructor!==c.constructor)return{t:c.constructor.name,raw:bin(c)};
 const n=c.length,m=new Uint8Array(n);let k=0;for(let i=0;i<n;i++)if(c[i]!==b[i]&&!(c[i]!==c[i]&&b[i]!==b[i])){m[i]=1;k++}if(!k)return{t:c.constructor.name};
 const V=new c.constructor(k);for(let i=0,j=0;i<n;i++)if(m[i])V[j++]=c[i];return{t:c.constructor.name,m:bin(m),v:bin(V)}}
function gUndiff(d,b,bins){if(!d)return null;const C=self[d.t],arr=i=>{const u=bins[i];return new C(u.buffer.slice(u.byteOffset,u.byteOffset+u.byteLength))};if(d.raw!=null)return arr(d.raw);
 if(!b||b.constructor!==C)return null;if(d.m==null)return b;const m=bins[d.m],V=arr(d.v);for(let i=0,j=0;i<m.length;i++)if(m[i])b[i]=V[j++];return b}
async function gz(u,dir){const s=new Blob([u]).stream().pipeThrough(dir?new CompressionStream('gzip'):new DecompressionStream('gzip'));return new Uint8Array(await new Response(s).arrayBuffer())}
function gPack(h,bins){const j=new TextEncoder().encode(JSON.stringify({...h,L:bins.map(b=>b.length)})),n=4+j.length+bins.reduce((a,b)=>a+b.length,0),o=new Uint8Array(n);new DataView(o.buffer).setUint32(0,j.length);o.set(j,4);let p=4+j.length;for(const b of bins){o.set(b,p);p+=b.length}return o}
function gUnpack(o){const n=new DataView(o.buffer,o.byteOffset).getUint32(0),h=JSON.parse(new TextDecoder().decode(o.subarray(4,4+n)));let p=4+n;const bins=h.L.map(l=>{const b=o.subarray(p,p+l);p+=l;return b});return{h,bins}}
async function gameSnap(){saveMap();const cur=curMap,sel0=[...sel],c0={...cam},sg={...SIGNS},own={...OWN},maps={};
 for(const m in STATE){const q=STATE[m];maps[m]={...q,a:null,FX:null,DS0:null}}
 const g=gEnc({maps,PEND,SIGNS,cur,uid,tick,sel:sel0}),D={};
 try{for(const m in STATE){const b=gBase(m,STATE[m]),c=gArr(STATE[m]);D[m]={};for(const k in c)D[m][k]=gDiff(c[k],k==='DS0'?b.DS:b[k],g.bins)}}
 finally{curMap=cur;Object.assign(OWN,own);for(const k in SIGNS)delete SIGNS[k];Object.assign(SIGNS,sg);loadMap(cur);for(const b of sel0)sel.add(b);cam=c0;camInit=false;drawSigns()}
 return gz(gPack({v:1,root:g.root,T:g.T,D},g.bins),true)}
async function gameLoad(u){const{h,bins}=gUnpack(await gz(u,false)),r=gDec(h.root,h.T,bins),G=r.v,mu=mute;
 for(const m in G.maps){const q=G.maps[m],b=gBase(m,q),d=h.D[m]||{};q.DS0=gUndiff(d.DS0,b.DS.slice(),bins);q.a={};q.FX={};
  for(const k of GSK)q.a[k]=gUndiff(d[k],b[k],bins)||b[k];for(const k in b)if(k.startsWith('FX.'))q.FX[k.slice(3)]=gUndiff(d[k],b[k],bins)||b[k]}
 for(const b of r.labs){mkLabel(b);b.lab.remove()}
 for(const k in STATE)delete STATE[k];Object.assign(STATE,G.maps);for(const k in PEND)delete PEND[k];Object.assign(PEND,G.PEND||{});for(const k in SIGNS)delete SIGNS[k];Object.assign(SIGNS,G.SIGNS||{});
 uid=Math.max(uid,G.uid||0);tick=G.tick||tick;curMap=G.cur;sel.clear();hover=null;openCrate=null;hoverC=null;drag=null;loadMap(curMap);for(const b of G.sel||[])if(bodies.includes(b))sel.add(b);
 if(typeof aiSetup==='function')aiSetup();const ms=$('msel');if(ms)ms.value=curMap;$('sm').querySelector('header span').textContent=TITLE[curMap]||'';drawSigns();setPlay(false);lastHud=''}

// storage: this browser always; the viewer's private store too when signed in
const GIDB=new Promise(r=>{try{const q=indexedDB.open('fluoria',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves',{keyPath:'id'});q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)}catch(e){r(null)}});
async function gIdb(mode,f){const d=await GIDB;if(!d)return null;return new Promise(r=>{try{const t=d.transaction('saves',mode),q=f(t.objectStore('saves'));t.oncomplete=()=>r(q&&q.result);t.onerror=()=>r(null)}catch(e){r(null)}})}
let GCL=null;const gCloud=async()=>{if(GCL!==null)return GCL;GCL=false;const db=await capUse('db'),u=await capUse('user');if(!db||!u)return GCL;try{const id=await u.id();if(id)GCL={M:db.collection('data/users/'+id+'/saves/meta'),C:db.collection('data/users/'+id+'/saves/data')}}catch(e){}return GCL};
const b64=u=>{let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)},unb64=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
const GCH=240000;
async function gList(){const L={};for(const o of await gIdb('readonly',s=>s.getAll())||[])L[o.id]={id:o.id,name:o.name,t:o.t,size:o.size,local:1};
 const c=await gCloud();if(c)try{for(const d of (await c.M.get()).docs){const v=d.data();L[d.id]={...(L[d.id]||{}),id:d.id,name:v.name,t:v.t,size:v.size,n:v.n,cloud:1}}}catch(e){}
 return Object.values(L).sort((a,b)=>b.t-a.t)}
async function gPut(id,name,u){const t=Date.now();await gIdb('readwrite',s=>s.put({id,name,t,size:u.length,data:u}));const c=await gCloud();if(!c)return;
 try{const s=b64(u),n=Math.ceil(s.length/GCH);for(let i=0;i<n;i++)await c.C.doc(id+'_'+i).set({v:s.slice(i*GCH,(i+1)*GCH)});await c.M.doc(id).set({name,t,size:u.length,n})}catch(e){console.warn('cloud save',e)}}
async function gGet(o){const l=await gIdb('readonly',s=>s.get(o.id));if(l&&l.data)return l.data;const c=await gCloud();if(!c||!o.n)return null;let s='';for(let i=0;i<o.n;i++){const d=await c.C.doc(o.id+'_'+i).get();if(!d.exists)return null;s+=d.data().v}return unb64(s)}
async function gDel(o){await gIdb('readwrite',s=>s.delete(o.id));const c=await gCloud();if(!c)return;try{await c.M.doc(o.id).delete();for(let i=0;i<(o.n||0);i++)await c.C.doc(o.id+'_'+i).delete()}catch(e){}}

const gub=(t,c,f)=>{const b=ubtn(t,c,async()=>{if(b.dataset.busy)return;b.dataset.busy=1;try{await f(b)}finally{delete b.dataset.busy}});return b},gDone=(b,t,m)=>{b.textContent=t;flashB(b,m)},gWhen=t=>{const d=new Date(t);return d.toLocaleDateString(undefined,{day:'numeric',month:'short'})+' '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})};
async function gamesPop(){const L=mk('div','glist'),nm=tbox((TITLE[curMap]||'Game'),()=>{}),sv=gub('Save game','',async x=>{x.textContent='Saving…';try{const u=await gameSnap();await gPut('g'+uidS(),nm.value.trim()||'Game',u);gDone(x,'Save game','Saved')}catch(e){console.warn(e);gDone(x,'Save game','Failed')}fill()}),
  r=mk('div','gsv');r.append(nm,sv);
 async function fill(){L.innerHTML='';const all=await gList();if(UI.pop!=='games')return;for(const o of all){const row=mk('div','grow'),t=mk('div','gt');t.append(mk('span','gn',o.name),mk('span','gd',gWhen(o.t)));
  const ld=gub('Load','',async x=>{x.textContent='Loading…';try{const u=await gGet(o);if(!u){gDone(x,'Load','Missing');return}await gameLoad(u);closePop()}catch(e){console.warn(e);gDone(x,'Load','Failed')}}),
   ow=gub('Save','',async x=>{x.textContent='Saving…';try{await gPut(o.id,o.name,await gameSnap());gDone(x,'Save','Saved')}catch(e){console.warn(e);gDone(x,'Save','Failed')}fill()}),
   dl=gub('','sq red',x=>{if(x.dataset.arm){gDel(o).then(fill);return}x.dataset.arm=1;x.classList.add('on');setTimeout(()=>{delete x.dataset.arm;x.classList.remove('on')},2500)});dl.append(uicon('bin'));
  row.append(t,ld,ow,dl);L.append(row)}}
 openPop('games','Games',[r,L]);fill()}
