// building a map: regions, borders, furniture, tables, chests, tethers, sills, edges
let curMap='circuit',VEH=[],VOB=null;
const NBM={council:buildCouncil,road:buildRoad,alley:buildAlley,stock:buildStock},NUM={council:unitsCouncil,road:unitsRoad,alley:unitsAlley,stock:unitsStock};
function build(){UND=[];REP.clear();TW.clear();HT.clear();MKC.clear();(NBM[curMap]||(curMap==='vault'?buildVault:curMap==='count'?buildCount:curMap==='range'?buildRange:curMap==='air'?buildAir:buildBank))();resill();relink();blendGround();objects();boards();borders();regions();polish();cracks();edgeMask()}
// grass and soil meet in a soft worn edge; GT marks which ground each pixel shows
// rugs get a border, tables and desks an edge and an inlay line
function regions(){for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const ok=OM[cy]&&OM[cy][cx],k=ok||map[cy][cx],rug=RUG.has(k);if(!rug&&!ok)continue;const L=ok?OM:map,bk=baseK(k),o=(x,y)=>!L[y]||baseK(L[y][x])!==bk&&!(rug&&OM[y]&&OM[y][x]);
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.min(o(cx-1,cy)?x:99,o(cx+1,cy)?T-1-x:99,o(cx,cy-1)?y:99,o(cx,cy+1)?T-1-y:99),j=(cy*T+y)*W+cx*T+x;let c=floor[j];
  if(rug&&!ok){const t=ageT(condK(k));if(t>.3&&d<=1&&hh(cx*T+x,cy*T+y,95)>.97-.1*t)c=mul(c,.62);else if(d===0)c=mul(c,.6);else if(d<=3)c=mix(mul(c,.9),/gcarpet|verdant/.test(k)?rgb(176,140,70):/pcarpet|purple/.test(k)?rgb(188,184,204):rgb(150,104,60),(x+y)%3?.5:.62);else if(d===4)c=mul(c,.72)}
  if(ok){const F=WPIECE[baseK(k)]&&woodFin(WPIECE[baseK(k)][0]);c=OBJC[j];if(d===0)c=mul(c,F?F.rim:.5);else if(d===1)c=mul(c,o(cx-1,cy)&&x===1||o(cx,cy-1)&&y===1?1.12:.82);else if(d===3&&F&&/^(table|desk)$/.test(wshape(k))){const l=((c&255)+(c>>8&255)+(c>>16&255))/3;c=mix(c,l<110?rgb(210,168,100):rgb(246,226,174),.42)}OBJC[j]=c}else floor[j]=c}}
}
// plank joints are laid from each floor's own edges, boards split evenly across its width
const PLK=new Set();
function boards(){const seen=new Set();for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=map[cy][cx];if(!PLK.has(k))continue;
 for(let y=0;y<T;y+=8){const Y=cy*T+y,id=Y*CW+cx;if(seen.has(id))continue;let a=cx,b=cx;while(map[cy][a-1]===k)a--;while(map[cy][b+1]===k)b++;for(let q=a;q<=b;q++)seen.add(Y*CW+q);
  const x0=a*T,w=(b-a+1)*T,n=1,row=Y>>3;for(let X=x0;X<x0+w;X++){const bi=Math.floor((X-x0)*n/w),edge=Math.floor((X-x0)*n/w)!==Math.floor((X-x0-1)*n/w)&&X>x0;
   for(let yy=0;yy<8;yy++){const j=(Y+yy)*W+X;if(sol[j])continue;let c=mul(floor[j],.95+hh(row,bi,45)*.1);if(edge&&yy<7)c=mul(c,.86);floor[j]=c}}}}}
// every laid surface gets a soft edge where it meets a different one
const NOB=new Set(['grass','dirt','sky','bush','sill','msill']);
// what each material-table key is: wall class, shine (dulled by wear), no-border and plank sets; set before the first map is built
for(const k in CATN){const[el,mat,v,w]=CATN[k];const P=mprop(el,mat),cd=CATN[k][4]||5;if(w)WMAT[k]=hitCls(P.cls);if(P.shine)SHINE[k]=Math.round(P.shine*(.4+.6*(cd-1)/4));const E=ELEM[el];if(!w&&P.nob||(E.vnob||{})[v])NOB.add(k);if(!w&&(E.vplk||{})[v])PLK.add(k)}
for(const k in MTABLE){SHINE[k]=mprop('Metal',MTABLE[k][0]).shine;for(let c=1;c<5;c++)SHINE[k+'~'+c]=Math.round(SHINE[k]*(.4+.6*(c-1)/4))}for(const k in MCHEST){SHINE[k]=mprop('Metal',MCHEST[k][0]).shine;for(let c=1;c<5;c++)SHINE[k+'~'+c]=Math.round(SHINE[k]*(.4+.6*(c-1)/4))}SHINE.mchest=60;
// tile borders follow inner corners too, so a rim turns square instead of breaking
function borders(){const F=FINBOX;for(let cy=F?F.Y0/T:0;cy<(F?F.Y1/T:CH);cy++)for(let cx=F?F.X0/T:0;cx<(F?F.X1/T:CW);cx++){const k=map[cy][cx];if(!TEX[k]||NOB.has(k)||OM[cy]&&OM[cy][cx])continue;const bk=baseK(k),o=(x,y)=>map[y]&&map[y][x]!==undefined&&baseK(map[y][x])!==bk;
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){let d=Math.min(o(cx-1,cy)?x:99,o(cx+1,cy)?T-1-x:99,o(cx,cy-1)?y:99,o(cx,cy+1)?T-1-y:99);for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])if(!o(cx+a,cy)&&!o(cx,cy+b)&&o(cx+a,cy+b))d=Math.min(d,Math.max(a<0?x:T-1-x,b<0?y:T-1-y));if(d>(WMAT[k]===3?2:1))continue;const j=(cy*T+y)*W+cx*T+x,mt=WMAT[k]===3,f=mt?[.7,1.3,.88][d]:d===0?.84:1.05;if(sol[j])scol[j]=mul(scol[j],f);else floor[j]=mul(floor[j],f)}}}
const fmat=k=>hitCls(matK(k));
function objMat(){for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=OM[cy][cx];if(!k)continue;const m=fmat(k);for(let y=0;y<T;y++)for(let x=0;x<T;x++){const j=(cy*T+y)*W+cx*T+x;if(OBJ[j])OBJ[j]=m}}}
// furniture and fixtures: above the floor, block walking, bullets pass over, blasts break them
const OBJK=new Set([...Object.keys(WPIECE).filter(k=>WPIECE[k][1]!=='seat'),'books','shelf',...Object.keys(MCHEST),...Object.keys(MTABLE),'wagon','hedge']),ONAME={...Object.fromEntries(Object.entries(MCHEST).map(([k,v])=>[k,v[1]])),...Object.fromEntries(Object.entries(MTABLE).map(([k,v])=>[k,v[1]])),...Object.fromEntries(Object.entries(WPIECE).map(([k,v])=>[k,v[2]])),hedge:'Hedge',wagon:'Wagon',books:'Shelves',shelf:'Shelf'};let OM=[];
function objects(){OM=Array.from({length:CH},()=>Array(CW).fill(null));OBJ.fill(0);const cells=[];for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)if(OBJK.has(map[cy][cx])){OM[cy][cx]=map[cy][cx];cells.push([cx,cy])}
 for(const[cx,cy]of cells){let u=null;for(const d of [2,1,3,4])for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){if(u)break;const k=(map[cy+b*d]||[])[cx+a*d];if(k&&!OBJK.has(k)&&!WMAT[k]&&!(k.endsWith('H')&&WMAT[k.slice(0,-1)])&&k!=='sky')u=k}const k=OM[cy][cx],m=fmat(k);paintCell(cx,cy,undAt(cx,cy)||u||'flag');
  for(let y=0;y<T;y++)for(let x=0;x<T;x++){const X=cx*T+x,Y=cy*T+y,j=Y*W+X,c=TEX[k](X,Y,cx,cy);if(!c)continue;OBJ[j]=m;OBJC[j]=rgb(cl(c[0]),cl(c[1]),cl(c[2]));SHN[j]=SHINE[k]||0}}pieces();furnish();brackets()}
// storage and desks come in pieces of at most 2×2, filled from the top-left; each piece has its own rim and inventory
const PCK=new Set([...Object.keys(WPIECE).filter(k=>/chest/.test(WPIECE[k][1])),...Object.keys(MCHEST),'books','shelf']);let PCS=new Map();
for(const k of[...Object.keys(MCHEST),...Object.keys(MTABLE),...Object.keys(WPIECE),'hedge'])for(let c=1;c<5;c++){const n=k+'~'+c;if(OBJK.has(k))OBJK.add(n);if(PCK.has(k))PCK.add(n);ONAME[n]=ONAME[k];BMAT[n]=BMAT[k]}
function pieces(){PCS=new Map();for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=OM[cy][cx];if(!k||!PCK.has(k)||PCS.has(cy*CW+cx))continue;const ok=(x,y)=>OM[y]&&OM[y][x]===k&&!PCS.has(y*CW+x),w=ok(cx+1,cy)?2:1,h=ok(cx,cy+1)&&(w<2||ok(cx+1,cy+1))?2:1,p={k,x0:cx,y0:cy,w,h,cells:[]};
 for(let y=cy;y<cy+h;y++)for(let x=cx;x<cx+w;x++){p.cells.push([x,y]);PCS.set(y*CW+x,p)}}}
// finishes: riveted iron band on chests and racks, book spines on a bookshelf's open edges, a riveted steel vault shelf
// wooden chests get metal corner brackets (iron on the plain woods, brass on mahogany, Aurum on ebony) that are metal to hit; dark on light wood, bright on dark wood
function brackets(){{const seen=new Set();for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=OM[cy]&&OM[cy][cx];if(!k||!MTABLE[baseK(k)]||seen.has(cy*CW+cx))continue;let x0=cx,y0=cy,x1=cx,y1=cy;const q=[[cx,cy]];seen.add(cy*CW+cx);while(q.length){const[a,b]=q.pop();x0=Math.min(x0,a);x1=Math.max(x1,a);y0=Math.min(y0,b);y1=Math.max(y1,b);for(const[da,db]of[[1,0],[-1,0],[0,1],[0,-1]]){const na=a+da,nb=b+db;if(OM[nb]&&OM[nb][na]===k&&!seen.has(nb*CW+na)){seen.add(nb*CW+na);q.push([na,nb])}}}metalTable({x0,y0,w:x1-x0+1,h:y1-y0+1})}}for(const p of new Set(PCS.values())){const W0=WPIECE[baseK(p.k)],MC=MCHEST[baseK(p.k)];if(MC){metalBrackets(p);continue}if(!W0||W0[1]!=='chest')continue;const X0=p.x0*T,Y0=p.y0*T,pw=p.w*T,ph=p.h*T,c0=OBJC[(Y0+(ph>>1))*W+X0+(pw>>1)],light=((c0&255)+(c0>>8&255)+(c0>>16&255))/3>95,mt=W0[0]==='mahog'?'brass':W0[0]==='ebony'?'gold':'iron',hi=toneC(mt,rgb(206,210,216)),lo=toneC(mt,rgb(120,124,130));
 for(const[cx,cy,sx,sy]of[[X0+2,Y0+2,1,1],[X0+pw-3,Y0+2,-1,1],[X0+2,Y0+ph-3,1,-1],[X0+pw-3,Y0+ph-3,-1,-1]])for(let i=0;i<4;i++)for(const[x,y]of[[cx+sx*i,cy],[cx,cy+sy*i]]){const j=y*W+x;OBJC[j]=i<3?hi:lo;OBJ[j]=3;SHN[j]=60}}}
// metal tables: a lighter raised lip inside the rim, a top brushed along its length, a rivet in each corner
function metalTable(p){const X0=p.x0*T,Y0=p.y0*T,pw=p.w*T,ph=p.h*T,lw=pw>=ph;for(let y=Y0;y<Y0+ph;y++)for(let x=X0;x<X0+pw;x++){const j=y*W+x;if(!OBJ[j])continue;const d=Math.min(x-X0,y-Y0,X0+pw-1-x,Y0+ph-1-y);if(d===2)OBJC[j]=mul(OBJC[j],1.12);else if(d>2)OBJC[j]=mul(OBJC[j],1+(hh(lw?y:x,(lw?x:y)>>3,41)-.5)*.07)}
 for(const[x,y]of[[X0+3,Y0+3],[X0+pw-4,Y0+3],[X0+3,Y0+ph-4],[X0+pw-4,Y0+ph-4]]){const j=y*W+x;OBJC[j]=mix(OBJC[j],rgb(255,255,255),.8);OBJC[j+W+1]=mul(OBJC[j+W+1],.62)}}
// metal chests: the same corner brackets, in a lighter cut of the chest's own metal
function metalBrackets(p){const L=rgb(255,255,255),X0=p.x0*T,Y0=p.y0*T,pw=p.w*T,ph=p.h*T;for(const[cx,cy,sx,sy]of[[X0+2,Y0+2,1,1],[X0+pw-3,Y0+2,-1,1],[X0+2,Y0+ph-3,1,-1],[X0+pw-3,Y0+ph-3,-1,-1]]){const arm=[];for(let i=0;i<4;i++)arm.push([cx+sx*i,cy,i],[cx,cy+sy*i,i]);const on=new Set(arm.map(([x,y])=>y*W+x));
 // a raised bracket: lighter metal with a thin shadow on its inner side
 for(const[x,y]of arm){const q=(y+sy)*W+x+sx;if(!on.has(q))OBJC[q]=mul(OBJC[q],.82)}for(const[x,y,i]of arm){const j=y*W+x;OBJC[j]=mix(OBJC[j],L,i<3?.5:.25)}}}
function furnish(){const done=new Set(),C=a=>rgb(cl(a[0]),cl(a[1]),cl(a[2]));
 const open=(x,y)=>{const k=map[y]&&map[y][x];return !!k&&!WMAT[k]&&!(k.endsWith('H')&&WMAT[k.slice(0,-1)])&&k!=='sky'&&!(OM[y]&&OM[y][x])};
 for(const p of PCS.values()){if(done.has(p)||wshape(p.k)==='desk')continue;done.add(p);const MC=MCHEST[baseK(p.k)],A=MC&&ageOf('Metal',MC[0],condK(p.k)),pw=p.w*T,ph=p.h*T,X0=p.x0*T,Y0=p.y0*T,B=Math.max(3,Math.round(Math.min(pw,ph)*.25));
  for(let v=0;v<ph;v++)for(let u=0;u<pw;u++){const X=X0+u,Y=Y0+v,j=Y*W+X,e=[u,v,pw-1-u,ph-1-v],d=Math.min(...e),s=e.indexOf(d),al=s===0||s===2?v:u;let c=OBJC[j];
   const cx=X/T|0,cy=Y/T|0,fl=open(cx+(s===0?-1:s===2?1:0),cy+(s===1?-1:s===3?1:0)),hi=s<2?1.15:.82;
   if(MC&&A){const r=A([c&255,c>>8&255,c>>16&255],X*2,Y*2,()=>d-1);c=C(r)}
   OBJC[j]=c}}}
// desks are tables: what either holds lies on top
function container(cx,cy,items,name){const k=OM[cy]&&OM[cy][cx];if(!k)return null;if(isTbl(k)){const ex=containerAt(cx*T+8,cy*T+8);if(ex&&ex.table){const ci=ex.cells.findIndex(q=>q[0]===cx&&q[1]===cy);for(const it of items||[]){if(!it)continue;if(isItem(it.k)){const one={...it};if(!tAdd(ex,one,ci))cSpill(ex,one)}else onTop(it,cx,cy)}return ex}}const pc=PCS.get(cy*CW+cx),cells=pc?pc.cells.slice():[],seen=new Set([cy*CW+cx]),q=pc?[]:[[cx,cy]];while(q.length){const[a,b]=q.pop();cells.push([a,b]);for(const[da,db]of[[1,0],[-1,0],[0,1],[0,-1]]){const na=a+da,nb=b+db;if(OM[nb]&&OM[nb][na]===k&&!seen.has(nb*CW+na)){seen.add(nb*CW+na);q.push([na,nb])}}}
 const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]),box=[Math.min(...xs)*T,Math.min(...ys)*T,(Math.max(...xs)+1)*T-1,(Math.max(...ys)+1)*T-1],c=weapon('crate',(box[0]+box[2])/2,(box[1]+box[3])/2,0);
 c.px=[];mkSet(c);c.hidden=true;c.mass=1e9;c.name=name||ONAME[k];c.cells=cells;c.box=box;c.chest=wshape(k)==='chest'||!!MCHEST[baseK(k)];c.table=isTbl(k);if(c.table){cells.sort((p,q)=>p[1]-q[1]||p[0]-q[0]);c.inv=Array(cells.length).fill(null);const ci=cells.findIndex(q=>q[0]===cx&&q[1]===cy);for(const it of items||[]){if(!it)continue;if(isItem(it.k)){const one={...it};if(!tAdd(c,one,ci))cSpill(c,one)}else onTop(it,cx,cy)}c.n0=cells.length*T*T;c.metal=fmat(k)===3;return c}
 for(const it of (items||[]).filter(it=>it&&!cOK(c,it.k))){const w=weapon(it.k,cx*T+4+Math.random()*8,cy*T+4+Math.random()*8,Math.random()*6.283);if(it.k==='gold')w.amt=it.n;else if(it.ammo!==undefined){w.ammo=it.ammo;w.res=it.res}}
 cFill(c,(items||[]).filter(it=>it&&cOK(c,it.k)));c.n0=cells.length*T*T;c.metal=fmat(k)===3;return c}
// tables and desks are item containers: one slot per tile, shown lying on the top; weapons put on a table just lie on it
const isTbl=k=>{const w=wshape(k||'');return w==='table'||w==='desk'};
function onTop(it,cx,cy){const w=weapon(it.k,cx*T+4+Math.random()*8,cy*T+4+Math.random()*8,Math.random()*6.283);if(it.ammo!==undefined){w.ammo=it.ammo;w.res=it.res}}
const amtIn=(o,k)=>(o.inv||[]).reduce((a,q)=>a+(q&&q.k===k?q.n||0:0),0);
const tCell=(c,X,Y)=>c.cells?c.cells.findIndex(q=>q[0]===(X/T|0)&&q[1]===(Y/T|0)):-1,goldIn=o=>(o.inv||[]).reduce((a,q)=>a+(q&&q.k==='gold'?q.n:0),0);
function tAdd(c,it,pref=-1){if(!isItem(it.k))return false;const n=c.cells.length;while(c.inv.length<n)c.inv.push(null);
 if(it.k==='gold'){const order=[pref,...c.inv.keys()].filter(i=>i>=0);for(const i of order){const q=c.inv[i];if(q&&q.k==='gold'&&q.n<SOLMAX){const t=Math.min(SOLMAX-q.n,it.n);q.n+=t;it.n-=t;if(it.n<=0)return true}}
  for(const i of order)if(!c.inv[i]){const t=Math.min(SOLMAX,it.n);c.inv[i]={k:'gold',n:t};it.n-=t;if(it.n<=0)return true}return false}
 const i=pref>=0&&!c.inv[pref]?pref:c.inv.indexOf(null);if(i<0)return false;c.inv[i]={...it,n:1};return true}
// the pile on a table: up to a 4x4 block of coin stacks, kept inside the rim
function solTop(v){const m=[],G=rgb(240,202,88),H=rgb(255,234,140),L=rgb(222,174,60),D=rgb(170,120,30),E=rgb(118,80,14),k=Math.max(1,Math.min(9,Math.ceil(v/SOLMAX*9))),cols=Math.ceil(Math.sqrt(k)),rows=Math.ceil(k/cols),y0=Math.round((9-rows*3)/2);let i=0;
 for(let r=0;r<rows;r++){const n=Math.min(cols,k-r*cols),x0=Math.round((9-n*3)/2);for(let c=0;c<n;c++,i++){const x=x0+c*3,y=y0+r*3,pt=i===k-1&&k<9&&v%(SOLMAX/9)>=1,cc=pt?[L,D,E]:[H,G,D];m.push([x,y,cc[1]],[x+1,y,cc[0]],[x+2,y,cc[1]],[x,y+1,cc[0]],[x+1,y+1,pt?G:H],[x+2,y+1,cc[2]],[x,y+2,cc[1]],[x+1,y+2,cc[2]],[x+2,y+2,E])}}return m.map(([x,y,c])=>[x-4,y-4,c])}
const TOPC=new Map();function topPix(q){const key=q.k+(q.k==='gold'?Math.ceil(q.n/SOLMAX*9)+(q.n%(SOLMAX/9)>=1?'p':''):'');if(TOPC.has(key))return TOPC.get(key);let px;if(q.k==='gold')px=solTop(q.n);else if(q.k==='note'){px=[];const P=[rgb(246,238,216),rgb(235,223,194),rgb(196,178,140),rgb(74,53,36)];for(let y=0;y<8;y++)for(let x=0;x<8;x++)px.push([x-4,y-4,y===7||x===7?P[2]:(x===2||x===5)&&(y===2||y===5)||(x===3||x===4)&&(y===3||y===4)?P[3]:y===0?P[0]:P[1]])}else px=shape(q.k,0);TOPC.set(key,px);return px}
// items on a table sit in even slots across the top inside its rim, the same gap to the rim and to each other
function tSpot(c,i){const xs=[...new Set(c.cells.map(q=>q[0]))].sort((a,b)=>a-b),ys=[...new Set(c.cells.map(q=>q[1]))].sort((a,b)=>a-b),q=c.cells[i],R=2,F=10,ax=(lo,len,n,k)=>{const g=(len-n*F)/(n+1),m=n-1-k,L=k<=m?Math.round(g*(k+1)+F*k):len-F-Math.round(g*(m+1)+F*m);return lo+L+4};
 return[ax(c.box[0]+R,c.box[2]-c.box[0]+1-2*R,xs.length,xs.indexOf(q[0])),ax(c.box[1]+R,c.box[3]-c.box[1]+1-2*R,ys.length,ys.indexOf(q[1]))]}
function drawTables(){for(const b of bodies){if(b.type!=='weapon'||b.kind!=='gold'||!b.set)continue;const X=Math.round(b.x),Y=Math.round(b.y);for(const p of b.px){const k=K(p[0]+1,p[1]+1);if(b.set.has(k))continue;const j=(Y+p[1]+1)*W+X+p[0]+1;if(j>=0&&j<W*H)out[j]=mul(out[j],.62)}}
 for(const c of bodies){if(!c.table||!c.inv)continue;c.inv.forEach((q,i)=>{const cl0=c.cells[i];if(!q||!cl0)return;const[ox,oy]=tSpot(c,i),px=topPix(q);for(const[a,b]of px){const j=(oy+b+1)*W+ox+a+1;if(j>=0&&j<W*H)out[j]=mul(out[j],.62)}for(const[a,b,col]of px){const j=(oy+b)*W+ox+a;if(j>=0&&j<W*H)out[j]=col}})}}
// chests: every tile holds one stack of one kind; long guns lie across two tiles, two to a pair
const LONGK=new Set(['musket','rod','spear','sspear','blunder','pgun']),amtK=k=>k==='gold'||!!GUNOF[k],cT=c=>!!(c&&c.box&&!c.table&&c.inv);
const tcap=k=>k==='gold'?SOLMAX:GUNOF[k]?4*(AMMOCAP[k]||24):k==='pistol'?3:k==='grenade'?4:k==='bomb'?1:isKey(k)?4:LONGK.has(k)?2:1;
const chTl=c=>c._tl||(c._tl=[...c.cells].sort((p,q)=>p[1]-q[1]||p[0]-q[0])),chAt=(c,X,Y)=>chTl(c).findIndex(q=>q[0]===(X/T|0)&&q[1]===(Y/T|0)),same=(a,b)=>a.length===b.length&&a.every((t,i)=>t===b[i]);
function chSpots(c,k){const L=chTl(c),r=[];if(LONGK.has(k)){for(let i=0;i<L.length;i++)for(let j=0;j<L.length;j++){const a=L[i],b=L[j];if(b[1]===a[1]&&b[0]===a[0]+1||b[0]===a[0]&&b[1]===a[1]+1)r.push([i,j])}}else for(let i=0;i<L.length;i++)r.push([i]);return r}
function chRoom(c,s,k,skip){const es=c.inv.filter(q=>q&&q!==skip&&q.t&&q.t.some(t=>s.includes(t)));if(!es.length)return tcap(k);if(es.some(q=>q.k!==k||!same(q.t,s)))return 0;return tcap(k)-(amtK(k)?es.reduce((a,q)=>a+q.n,0):es.length)}
const amtOf=it=>it.k==='gold'?it.n:typeof it.rd==='number'?it.rd:it.rd===true?it.n:RCAP(GUNOF[it.k])*(it.n||1);
function chAdd(c,it,pref=-1){const k=it.k;let sp=chSpots(c,k);if(pref>=0)sp=[...sp.filter(s=>s.includes(pref)),...sp.filter(s=>!s.includes(pref))];sp=[...sp.filter(s=>c.inv.some(q=>q&&q.k===k&&q.t&&same(q.t,s))),...sp];
 if(amtK(k)){let n=amtOf(it),mv=0;for(const s of sp){if(n<=0)break;const r=Math.min(chRoom(c,s,k),n);if(r<=0)continue;const q=c.inv.find(z=>z&&z.k===k&&z.t&&same(z.t,s));if(q)q.n+=r;else c.inv.push(k==='gold'?{k,n:r,t:s}:{k,n:r,rd:true,t:s});n-=r;mv+=r}it.taken=mv;if(k==='gold')it.n-=mv;return n<=0}
 for(const s of sp)if(chRoom(c,s,k)>0){const q={...it,n:1,t:s};delete q.taken;c.inv.push(q);return true}return false}
function chNorm(c){c.inv=c.inv.filter(Boolean);const loose=c.inv.filter(q=>!q.t);if(!loose.length)return;c.inv=c.inv.filter(q=>q.t);for(const q of loose){if(GUNOF[q.k]&&q.rd!==true){q.n=amtOf(q);q.rd=true}const n=amtK(q.k)?1:q.n||1;for(let i=0;i<n;i++){const one={...q,n:amtK(q.k)?q.n:1};if(!chAdd(c,one)&&(amtK(q.k)?one.n>0&&one.taken<amtOf(q):true))cSpill(c,amtK(q.k)?{...q,n:q.k==='gold'?q.n-(one.taken||0):q.n,rd:q.k==='gold'?undefined:amtOf(q)-(one.taken||0)}:one)}}}
// what a tile shows: its kind and how many (or how much)
function chSlots(c){return chTl(c).map((_,t)=>{const es=c.inv.filter(q=>q&&q.t&&q.t[0]===t);if(!es.length)return c.inv.some(q=>q&&q.t&&q.t.includes(t))?{link:1}:null;const k=es[0].k;return{q:{k,n:amtK(k)?es.reduce((a,q)=>a+q.n,0):es.length,ammo:es[es.length-1].ammo},i:c.inv.indexOf(es[es.length-1])}})}
// open chest: the inside shaded, each stack laid neatly in its tiles
const chMini=k=>{const s=shape(k,0),at=(x,y)=>{const q=s.find(z=>z[0]===x&&z[1]===y);return q?q[2]:0},E=at(-4,-4),B0=at(-2,-2),C1=at(-1,-1),C2=at(-1,0),r=[];for(let y=0;y<6;y++)for(let x=0;x<6;x++){const e=x===0||y===0||x===5||y===5,m=(x===2||x===3)&&(y===2||y===3);r.push([x-3,y-3,e?E:m?(y===2?C1:C2):B0])}return r};
const CHPX=new Map();function chPix(k){if(CHPX.has(k))return CHPX.get(k);const px=GUNOF[k]?chMini(k):k==='note'?topPix({k}):shape(k,0);let ax=1e9,bx=-1e9,ay=1e9,by=-1e9;for(const q of px){ax=Math.min(ax,q[0]);bx=Math.max(bx,q[0]);ay=Math.min(ay,q[1]);by=Math.max(by,q[1])}const r={w:bx-ax+1,h:by-ay+1,px:px.map(q=>[q[0]-ax,q[1]-ay,q[2]])};CHPX.set(k,r);return r}
const CHR=new Map();function chRot(k){if(CHR.has(k))return CHR.get(k);const S=chPix(k),r={w:S.h,h:S.w,px:S.px.map(q=>[S.h-1-q[1],q[0],q[2]])};CHR.set(k,r);return r}
function chDraw(c,hit){const L=chTl(c),b=c.box,IX0=b[0]+2,IY0=b[1]+2,IX1=b[2]-2,IY1=b[3]-2;for(let Y=IY0;Y<=IY1;Y++)for(let X=IX0;X<=IX1;X++){if(OBJ[Y*W+X])out[Y*W+X]=mul(out[Y*W+X],.32)}
 const inside=(x,y)=>x>=IX0&&x<=IX1&&y>=IY0&&y<=IY1,put=(x,y,v)=>{if(inside(x,y))out[y*W+x]=v},draw=(S,cx,cy,hv)=>{const x0=Math.round(cx-S.w/2),y0=Math.round(cy-S.h/2),set=new Set(S.px.map(q=>q[0]+','+q[1]));for(const q of S.px)if(!set.has((q[0]+1)+','+(q[1]+1))&&inside(x0+q[0]+1,y0+q[1]+1)){const j=(y0+q[1]+1)*W+x0+q[0]+1;out[j]=mul(out[j],.55)}for(const q of S.px)if(q[2])put(x0+q[0],y0+q[1],hv?mix(q[2],rgb(255,255,255),.22):q[2])};
 const groups=new Map();c.inv.forEach((q,i)=>{if(!q||!q.t||SDR&&SDR.c===c&&SDR.i===i)return;const key=q.t.join();if(!groups.has(key))groups.set(key,[]);groups.get(key).push([q,i])});
 for(const g of groups.values()){const q0=g[0][0],k=q0.k,ts=q0.t.map(t=>L[t]),x0=Math.max(IX0,Math.min(...ts.map(t=>t[0]))*T),x1=Math.min(IX1,(Math.max(...ts.map(t=>t[0]))+1)*T-1),y0=Math.max(IY0,Math.min(...ts.map(t=>t[1]))*T),y1=Math.min(IY1,(Math.max(...ts.map(t=>t[1]))+1)*T-1),cx=(x0+x1+1)/2,cy=(y0+y1+1)/2,hv=hit&&hit.c===c&&g.some(e=>e[1]===hit.i);
  if(k==='gold'){draw({w:9,h:9,px:solTop(q0.n).map(q=>[q[0]+4,q[1]+4,q[2]])},cx,cy,hv);continue}
  let S=chPix(k);const n=amtK(k)?Math.min(4,Math.ceil(q0.n/(AMMOCAP[k]||24))):g.length,vert=ts.length>1&&ts[0][0]===ts[1][0];if(vert&&S.w>S.h*2)S=chRot(k);let pos;if(S.w>S.h*2)pos=Array.from({length:n},(_,i)=>[0,(i-(n-1)/2)*(S.h+1)]);else if(S.h>S.w*2)pos=Array.from({length:n},(_,i)=>[(i-(n-1)/2)*(S.w+1),0]);else if(n===1)pos=[[0,0]];else if(isKey(k))pos=[[-1,-1],[1,1]];else{const o=k==='bomb'?1.5:k==='grenade'?2.5:S.w/2;pos=n===2?(k==='bomb'?[[-o,-o],[o,o]]:[[-o/1.6,-o/1.6],[o/1.6,o/1.6]]):n===3?[[-o,-o],[o,-o],[0,o]]:[[-o,-o],[o,-o],[-o,o],[o,o]]}
  for(const[dx,dy]of pos)draw(S,cx+dx,cy+dy,hv)}}
const containerAt=(X,Y)=>{const vc=vChestAt(X,Y);if(vc)return vc;const cx=X/T|0,cy=Y/T|0;if(!OBJ[Y*W+X])return null;return bodies.find(o=>o.hidden&&o.cells.some(c=>c[0]===cx&&c[1]===cy))||null};
const EDG=new Set();
function cutEdges(x,y,R){const x0=Math.max(1,Math.floor(x-R-3)),x1=Math.min(W-2,Math.ceil(x+R+3)),y0=Math.max(1,Math.floor(y-R-3)),y1=Math.min(H-2,Math.ceil(y+R+3)),add=[];
 for(let Y=y0;Y<=y1;Y++)for(let X=x0;X<=x1;X++){const j=Y*W+X;if(!OBJ[j]||EDG.has(j))continue;const lt=!OBJ[j-1]||!OBJ[j-W],rb=!OBJ[j+1]||!OBJ[j+W];if(!lt&&!rb)continue;
  if(Math.hypot(X-x,Y-y)>R+3)continue;EDG.add(j);const k=OM[Y/T|0]&&OM[Y/T|0][X/T|0],metal=!!k&&matK(k)==='metal';OBJC[j]=metal?mul(OBJC[j],rb?.7:1.25):mul(OBJC[j],rb?.55:1.15);
  if(!metal&&hh(X,Y,57)<.3){const sx=!OBJ[j+1]?1:!OBJ[j-1]?-1:0,len=1+(hh(X,Y,58)*2|0);if(sx)for(let i=1;i<=len;i++){const q=j+sx*i;if(OBJ[q]||sol[q])break;add.push([q,mul(OBJC[j],.8-.1*i),OBJ[j]])}}}
 for(const[q,c,m]of add){OBJ[q]=m;OBJC[q]=c;EDG.add(q)}}
function scorchRays(x,y,s){const n=8+(Math.random()*8*Math.min(1.5,s)|0),R=18*s;for(let r=0;r<n;r++){const a=Math.random()*6.283,len=R*(.5+Math.random()*.9),w0=.4+Math.random()*.7*s,c=Math.cos(a),sn=Math.sin(a),sd=Math.random()*99;
 for(let t=3;t<len;t+=.5){const f=1-t/len,w=w0*f;for(let u=-w;u<=w;u+=.5){const X=Math.round(x+c*t-sn*u),Y=Math.round(y+sn*t+c*u);if(X<1||Y<1||X>=W-1||Y>=H-1)continue;const j=Y*W+X;if(sol[j])continue;const al=.15*Math.pow(f,1.4)*(.75+.4*hh(X,Y,60));SCH[j]=1;if(OBJ[j])OBJC[j]=mix(OBJC[j],rgb(30,22,16),al);else floor[j]=mix(floor[j],rgb(26,22,20),al)}}}}
function wreck(x,y,s){const R0=10*s,R=R0*1.5;let hit=false;for(let Y=Math.floor(y-R);Y<=y+R;Y++)for(let X=Math.floor(x-R);X<=x+R;X++){if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(!OBJ[j])continue;const q=Math.hypot(X-x,Y-y)/(R0*(OBJ[j]===3?.8:1.5))*(.8+.4*hh(X,Y,88));if(q>=1)continue;OBJ[j]=0;SHN[j]=0;hit=true;NAVD=true;wearObj(X>>4,Y>>4,.12);if(hh(X,Y,89)<.55)floor[j]=mix(floor[j],mul(OBJC[j],.45),.7)}
 if(!hit)return;cutEdges(x,y,R);for(const c of bodies.filter(o=>o.hidden&&!o.vchest)){let n=0;for(const[a,b]of c.cells)for(let yy=0;yy<T;yy++)for(let xx=0;xx<T;xx++)n+=OBJ[(b*T+yy)*W+a*T+xx];if(n>=c.n0*.7)continue;
  for(const it of c.inv){if(!it)continue;if(it.k==='note'){placeNote(it,c.x,c.y);continue}for(let i=0;i<Math.min(6,it.k==='gold'?1:it.n||1);i++){const a=Math.random()*6.283;let px=c.x+Math.cos(a)*6,py=c.y+Math.sin(a)*6;const w=weapon(it.k,px,py,a);if(solidHits(w,0,0)){[px,py]=spillAt(c);w.x=px;w.y=py}if(it.k==='gold')w.amt=it.n;if(CAP[it.k]){w.ammo=it.ammo??CAP[it.k];w.res=it.res||0}if(it.k==='grenade'||it.k==='bomb')w.fuse=8+(Math.random()*30|0);w.vx=Math.cos(a)*2;w.vy=Math.sin(a)*2}}remove(c);if(openCrate===c)openCrate=null}}
// tethers: rope or chain from a ring on a wall face; a little give, then a hard stop
const TETH={rope:{give:4,hp:.5},chain:{give:1.5,hp:2.6}};
function findAnchor(x,y){let best=null;const c0=x/T|0,r0=y/T|0;for(let cy=r0-3;cy<=r0+3;cy++)for(let cx=c0-3;cx<=c0+3;cx++){const k=map[cy]&&map[cy][cx];if(!k||!WMAT[k])continue;
 for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=map[cy+b]&&map[cy+b][cx+a];if(!n||WMAT[n])continue;const ax=cx*T+T/2+a*T/2,ay=cy*T+T/2+b*T/2,d=Math.hypot(ax-x,ay-y);if(!best||d<best.d)best={x:ax,y:ay,d,ix:Math.round(ax-a*1.5),iy:Math.round(ay-b*1.5)}}}return best}
function tie(b,kind,len){const a=findAnchor(b.x,b.y);if(!a)return false;const aj=a.iy*W+a.ix;b.tether={kind,x:a.x,y:a.y,aj,s0:shp[aj],len:len||Math.max(14,a.d)+6,hp:TETH[kind].hp};sfx(kind==='chain'?snd('metal','drag'):'flick');return true}
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
function sills(){for(const d of bodies){if(d.type!=='slab'||d.free||d.vdoor)continue;const cs=new Set(),bx=Math.round(d.x),by=Math.round(d.y);for(const p of d.px)cs.add(((by+p[1])/T|0)*CW+((bx+p[0])/T|0));
 for(const k of cs){const cx=k%CW,cy=k/CW|0,key=map[cy]&&map[cy][cx];if(!key||WMAT[key]||key==='sky'||key==='dirt'||key==='grass'||key==='sill'||key==='msill')continue;const m=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>{const q=(map[cy+b]||[])[cx+a];return!!q&&matK(q)==='marble'});paintCell(cx,cy,m?'msill':'sill')}}}
// doors sit centred in the wall line and meet the wall ends
function snapDoors(){NAVD=true;for(const d of bodies){if(d.type!=='slab'||d.free||d.vdoor)continue;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const bx=Math.round(d.x),by=Math.round(d.y);for(const p of d.px){x0=Math.min(x0,bx+p[0]);x1=Math.max(x1,bx+p[0]);y0=Math.min(y0,by+p[1]);y1=Math.max(y1,by+p[1])}
 let sx,sy;if(x1-x0>y1-y0){sx=Math.round(x0/(T/2))*(T/2)-x0;sy=Math.floor((y0+y1)/2/T)*T+T/2-(d.th||8)/2-y0}else{sy=Math.round(y0/(T/2))*(T/2)-y0;sx=Math.floor((x0+x1)/2/T)*T+T/2-(d.th||8)/2-x0}d.x=bx+sx;d.y=by+sy;orient(d)}}
function blendGround(){GT.fill(0);let any=false;for(const r of map)for(const k of r)if(k==='grass'){any=true;break}if(!any)return;
 const R=6,ind=new Float32Array(N),tmp=new Float32Array(N);for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const k=map[Y/T|0][X/T|0];ind[Y*W+X]=k==='grass'?1:k==='dirt'||k.endsWith('H')?0:.5}
 for(let Y=0;Y<H;Y++){let a=0;for(let X=-R;X<W;X++){if(X+R<W)a+=ind[Y*W+X+R];if(X-R-1>=0)a-=ind[Y*W+X-R-1];if(X>=0)tmp[Y*W+X]=a}}
 for(let X=0;X<W;X++){let a=0;for(let Y=-R;Y<H;Y++){if(Y+R<H)a+=tmp[(Y+R)*W+X];if(Y-R-1>=0)a-=tmp[(Y-R-1)*W+X];if(Y>=0)ind[Y*W+X]=a/((2*R+1)*(2*R+1))}}
 const F=FINBOX;for(let Y=F?F.Y0:0;Y<(F?F.Y1:H);Y++)for(let X=F?F.X0:0;X<(F?F.X1:W);X++){const j=Y*W+X,k=map[Y/T|0][X/T|0];if(sol[j]||k!=='grass'&&k!=='dirt'&&!(k.endsWith('H')&&X%T>=T/2))continue;
  const v=ind[j]+(fbm(X/7,Y/7,90)-.5)*.5+(hh(X,Y,91)-.5)*.1,g=v>.5;let c=g?grassT(X,Y):soilT(X,Y);if(g&&v<.62&&hh(X,Y,92)>(v-.5)/.12)c=mx(GDRY,soilT(X,Y),.5);
  floor[j]=rgb(cl(c[0]),cl(c[1]),cl(c[2]));GT[j]=g?1:2}}
// blasts on open ground tear up grass, dig a soft crater and throw soil round it
// a mended tile, furniture cell or wall cell sits a little proud of damage of its own kind beside it: on each side that touches damage its top or left edge catches the light, its bottom or right edge is shaded and casts a faint shadow onto the damage. Drawn at render only
let EDGM=new Uint8Array(0);const EDF=[1,1.1,.86,.9],REP=new Set();
function edgeMask(){if(EDGM.length!==N)EDGM=new Uint8Array(N);else EDGM.fill(0);if(!REP.size)return;let P0=null;try{P0=PR&&PR.sol&&PR.sol.length===N?PR:null}catch(e){}const kind=(x,y)=>{const c=CATN[map[y][x]];return c&&c[3]?2:OM[y]&&OM[y][x]||TW.has(twK(2,y*CW+x))?1:0},
  hurt=(x,y,t)=>{if(x<0||y<0||x>=CW||y>=CH||kind(x,y)!==t)return false;const id=y*CW+x;
   if(t===2){const w=TW.get(twK(1,id));if(w&&w.a)return true;for(let v=0;v<T;v++)for(let u=0;u<T;u++){const j=(y*T+v)*W+x*T+u;if(P0&&P0.sol[j]&&(!sol[j]||shp[j]<P0.shp[j]))return true}return false}
   if(t===1){if(TW.has(twK(2,id)))return true;for(let v=0;v<T;v++)for(let u=0;u<T;u++){const j=(y*T+v)*W+x*T+u;if(P0&&P0.OBJ[j]&&!OBJ[j])return true}return false}
   const c=CATN[map[y][x]];if(!c)return false;if((c[4]||5)<5)return true;for(let v=0;v<T;v++)for(let u=0;u<T;u++)if(DMG[(y*T+v)*W+x*T+u])return true;return false},set=(j,v)=>{if(!EDGM[j]||v===2)EDGM[j]=v};
 for(const id of REP){const cx=id%CW,cy=id/CW|0,t=kind(cx,cy);for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){if(!hurt(cx+dx,cy+dy,t))continue;const near=dx<0||dy<0;
  for(let i=0;i<T;i++){const x=dx<0?0:dx>0?T-1:i,y=dy<0?0:dy>0?T-1:i;set((cy*T+y)*W+cx*T+x,near?1:2);if(!near){const ox=cx*T+x+dx,oy=cy*T+y+dy;if(ox>=0&&oy>=0&&ox<W&&oy<H)set(oy*W+ox,3)}}}}}
// blasts wear the floor in a ragged circle, strongest at the blast: how far and how hard follow the floor's toughness from the material table (soft wood further, umbra hardly at all). Each pixel takes the wear of the condition it reaches; each cell's condition is what its centre reached. The worn look becomes the cell's clean state, so cleaning keeps it and the wand undoes it
const softOf=(el,mat)=>Math.max(.3,Math.min(1.6,3/(mprop(el,mat).hp||3)));
// grass and soil wear down one ladder: grass New to Ruined, then soil Used to Ruined, each blast taking it further
const ladL=k=>{if(k==='grass')return 0;if(k==='dirt')return 4;const c=CATN[k];if(!c||c[3]||!ELEM[c[0]].mats[c[1]])return -1;const L=(CLS[mprop(c[0],c[1]).cls]||{}).ladder;return L==null?-1:L+5-(c[4]||5)},ladK=L=>L<=4?'earth.grass.plain'+(L?'~'+(5-L):''):'earth.dirt.plain~'+(9-L);
function earthWear(cx,cy,x,y,R,top,L0){const so=Math.min(1.2,softOf('Earth','grass')),Rm=R*(.55+.45*so),st=(X,Y)=>{const d=Math.hypot(X-x,Y-y)/(Rm*(.8+.4*fbm(X/7,Y/7,91)));return d>=1?0:(1-d)*top*so+.15},to=(X,Y)=>{const s=st(X,Y);if(s<=0)return L0;const r=hh(X,Y,93);return Math.min(8,Math.max(L0+Math.floor(s/2+r),Math.floor(s*1.2+r)))};
 const Lc=to(cx*T+8,cy*T+8);if(Lc>L0)map[cy][cx]=ladK(Lc);
 for(let y2=0;y2<T;y2++)for(let x2=0;x2<T;x2++){const X=cx*T+x2,Y=cy*T+y2,j=Y*W+X;if(sol[j])continue;const L=to(X,Y);if(L<=L0)continue;const q=TEX[ladK(L)](X,Y,cx,cy);if(!q)continue;floor[j]=rgb(cl(q[0]),cl(q[1]),cl(q[2]));if(PR)PR.floor[j]=floor[j]}}
