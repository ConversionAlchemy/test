// test maps and switching between maps
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
 for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,TRK,FH])a.fill(0);WH.fill(0);fxDirty=true}
const EXITS={vault:[{dir:'w',cell:[0,25],to:'count',arrive:[22,408],label:'Counting house',lx:3,ly:392}],count:[{dir:'e',cell:[43,12],to:'vault',arrive:[664,200],label:'The Aurum',lx:640,ly:182},{dir:'w',cell:[0,18],label:'Back alley',lx:2,ly:278}]};
const STATE={},PEND={};
function saveMap(){for(const b of bodies)if(b.lab)b.lab.remove();for(const e of document.querySelectorAll('#sm .xlab'))e.remove();
 STATE[curMap]={VEH,rep:[...REP],wear:{tw:[...TW],ht:[...HT]},CW,CH,map,UND,OM,DS0,alarm,bodies,parts,FX:{...FX},whOn,hzOn,a:{SH,GOLD,floor,sol,shp,scol,crk,slabG,GT,SHN,DS,NOD,OBJ,OBJC,SCH,DMG,TF,SF,SS,ST,BURN,TRK,FH,FV,SV,DV,TMP,WH,fxLow,fxTop,fxA,HZ,OPEN,LR,LG,LB,LT}}}
function loadMap(m){const q=STATE[m];delete STATE[m];CW=q.CW;CH=q.CH;W=CW*T;H=CH*T;BW=W/2;BH=H/2;N=W*H;NB=BW*BH;cv.width=W;cv.height=H;img=ctx.createImageData(W,H);out=new Uint32Array(img.data.buffer);
 ({SH,GOLD,floor,sol,shp,scol,crk,slabG,GT,SHN,DS,NOD,OBJ,OBJC,SCH,DMG=new Uint8Array(N),TF,SF,SS,ST,BURN,TRK=new Float32Array(NB),FH=new Float32Array(NB),FV,SV,DV,TMP,WH,fxLow,fxTop,fxA,HZ,OPEN,LR,LG,LB,LT}=q.a);TW.clear();HT.clear();if(q.wear&&q.wear.tw){for(const[k,v]of q.wear.tw)TW.set(k,v);for(const[k,v]of q.wear.ht)HT.set(k,v)}for(const k in q.FX)FX[k]=q.FX[k];
 map=q.map;UND=q.UND||[];OM=q.OM;DS0=q.DS0;ds0Need=false;alarm=q.alarm;bodies=q.bodies;VEH=q.VEH||[];parts=q.parts;whOn=q.whOn;hzOn=q.hzOn;solDirty=true;fxDirty=true;camInit=true;REP.clear();for(const v of q.rep||[])REP.add(v);edgeMask();setTimeout(fit,0);
 for(const b of bodies)if(b.lab)stage.appendChild(b.lab);arrivals();exitLabels()}
function goMap(v){if(v===curMap)return;saveMap();curMap=v;const ms=$('msel');if(ms)ms.value=v;$('sm').querySelector('header span').textContent=TITLE[v]||'';sel.clear();openCrate=null;drag=null;charge=null;box=null;moveSel=null;lastHud='';if(STATE[v])loadMap(v);else{camInit=true;CW=-1;reset()}}
function arrivals(){const q=PEND[curMap];if(!q)return;delete PEND[curMap];for(const b of q){bodies.push(b);if(b.lab)stage.appendChild(b.lab)}}
function exitLabels(){for(const e of document.querySelectorAll('#sm .xlab'))e.remove();(EXITS[curMap]||[]).forEach((x,i)=>{if(!x.cell||!x.label)return;const l=document.createElement('div');l.className='xlab';l.dataset.i=i;l.textContent=x.label;stage.appendChild(l)})}
// the passage fades to black towards the map it leads to
function exitFade(){for(const x of EXITS[curMap]||[]){if(!x.cell)continue;const L=28,[cx,cy]=x.cell;for(let i=0;i<L;i++){const f=Math.pow(i/L,1.4);if(x.dir==='w'||x.dir==='e'){const X=x.dir==='w'?i:W-1-i;for(let Y=cy*T-6;Y<cy*T+T+6;Y++)if(Y>=0&&Y<H)out[Y*W+X]=mul(out[Y*W+X],f)}else{const Y=x.dir==='n'?i:H-1-i;for(let X=cx*T-6;X<cx*T+T+6;X++)if(X>=0&&X<W)out[Y*W+X]=mul(out[Y*W+X],f)}}}}
function exitTick(){for(const x of EXITS[curMap]||[]){if(!x.to||!x.cell)continue;const back=(EXITS[x.to]||[]).find(e=>e.to===curMap)||{};for(const b of [...bodies]){if(b.type!=='token'||b.status!=='free'||inDrag(b)||b.tether&&!b.tether.broken)continue;if((b.x/T|0)!==x.cell[0]||(b.y/T|0)!==x.cell[1])continue;
 const was=sel.has(b);bodies=bodies.filter(o=>o!==b);if(b.lab)b.lab.remove();sel.delete(b);if(back.arrive){b.x=back.arrive[0];b.y=back.arrive[1]}else b.linkFrom=curMap;b.vx=b.vy=0;b.glide=null;b.hc=null;sfx('door');
 if(STATE[x.to])STATE[x.to].bodies.push(b);else(PEND[x.to]||(PEND[x.to]=[])).push(b);if(was){goMap(x.to);if(bodies.includes(b))sel.add(b);return}}}}
function unitsCount(){const up=-Math.PI/2,dn=Math.PI/2,face=(t,a)=>{t.ang=a;return t},X=x=>(x+CO)*16,eb=d=>{mahogany(d,EBONY);return d};
 const hd=(x,y,m)=>slab(m,X(x),y*16+11,0),vd=(x,y,m,th)=>slab(m,X(x)+4,y*16,1,16,th||8);
 for(const d of [vd(7,4,2),vd(29,4,2),hd(18,2,2),hd(18,7,2),hd(12,10,2),hd(24,10,2),hd(21,14,2),vd(-1,17,2)])eb(d);
 hd(3,14,3);hd(11,14,3);const c1=hd(1,20,3),c2=hd(5,20,3),out=vd(-3,17,3,16),vault=vd(27,19,3,16);c1.locked=c2.locked=out.locked=vault.locked=true;
 const cc=(x,y,items,n)=>{const c=container(x+CO,y,items);if(c&&n)c.name=n;return c};
 cc(14,3,[{k:'gold',n:100}],'Counting shelf');cc(22,3,[{k:'gold',n:100}],'Counting shelf');cc(15,4,[{k:'gold',n:100}],'Counting table');
 cc(9,1,[{k:'gold',n:40}],'Bookshelf');cc(20,18,[{k:'gold',n:100},{k:'pistol',n:1,ammo:18,res:18}],'Ledger desk');cc(16,23,[{k:'gold',n:100}],'Ledger chest');
 cc(8,16,[{k:'musket',n:6,ammo:12,res:24},{k:'pistol',n:4,ammo:18,res:18}],'Rifle rack');cc(14,16,[{k:'grenade',n:6}],'Grenade chest');cc(14,18,[{k:'bomb',n:2}],'Heavy chest');cc(14,20,[{k:'mbox',n:6},{k:'pbox',n:4}],'Ammo chest');cc(14,22,[{k:'blunder',n:2,ammo:8,res:16}],'Chest');
 cc(0,15,[{k:'musket',n:2,ammo:12,res:12}],'Guard rack');cc(6,15,[{k:'grenade',n:2}],'Guard chest');cc(2,16,[],'Guard table');cc(32,3,[{k:'gold',n:100}],'Red room table');cc(2,3,[],'Green room table');
 cc(29,15,[{k:'gold',n:100}],'Black shelf');cc(29,23,[{k:'gold',n:100}],'Black shelf');cc(31,19,[{k:'gold',n:100},{k:'sspear',n:1,ammo:4,res:4},{k:'rod',n:1,ammo:3,res:9}],'Black deals');
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
 for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,TRK,FH])a.fill(0);WH.fill(0);fxDirty=true}
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
  if(cy>=2&&cy<=6&&cx>=8)return cy>=4&&cy<=5&&cx>=13?'gtable':cx===10&&cy===4?'stone.aur.block.w':cy===2&&(cx<=10||cx>=13)?'schest':'stone.aur.block';if(cy===7)return cx>=13?'stone.aur.block':'stone.gold.block.w';
  if(cy>=8&&cy<=18){if(cx>=11)return cx===12&&(cy===10||cy===16)?'stone.aur.block.w':'stone.aur.chequer';if(cx===10)return cy===13?'stone.aur.block':'stone.gold.block.w';if(cx>=3&&cy>=9&&cy<=17)return cy===10&&cx>=5&&cx<=7?'desk':cx>=4&&cx<=8&&cy>=11&&cy<=16?'cloth.crimson.diamond':'stone.aur.block';return 'stone.gold.block.w'}
  if(cy===19)return cx>=13?'stone.aur.block':'stone.gold.block.w';
  if(cy>=20&&cy<=30){if((cx===6||cx===10)&&(cy===22||cy===28))return 'stone.aur.block.w';if(cy===25&&cx>=5&&cx<=9)return 'table';return 'stone.aur.block'}
  if(cy===31)return cx>=13?'stone.aur.block':'stone.gold.block.w';
  if(cy>=32&&cy<=37){if(cx>=11)return cx===12&&(cy===33||cy===36)?'stone.aur.block.w':'stone.aur.block';if(cx===10)return cy===34?'stone.aur.block':'stone.gold.block.w';if(cx>=3)return cy===33&&cx>=5&&cx<=7?'desk':cx>=4&&cx<=8&&cy>=34&&cy<=36?'cloth.crimson.diamond':'stone.aur.block';return 'stone.gold.block.w'}
  return 'stone.gold.block.w'};
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)paintCell(cx,cy,cx<=14?F(cx,cy):F(29-cx,cy));for(const cx of [0,1,2])paintCell(cx,25,'stone.aur.block');
 for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){if(map[Y/T|0][X/T|0]!=='metal.gold.panel')continue;const e=(x,y)=>!map[y/T|0]||map[y/T|0][x/T|0]!=='metal.gold.panel';if(e(X+1,Y)||e(X-1,Y)||e(X,Y+1)||e(X,Y-1))floor[Y*W+X]=mul(floor[Y*W+X],.5)}
 for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,TRK,FH])a.fill(0);WH.fill(0);fxDirty=true}
function unitsVault(){const up=-Math.PI/2,dn=Math.PI/2,face=(t,a)=>{t.ang=a;return t};slab(3,36,400,1);
 dbl(3,208,128,271,111,0,2,true,32,16);dbl(3,208,316,271,307,0,2,true,32,8);dbl(3,208,508,271,499,0,2,false,32,8);dbl(3,208,620,271,611,0,2,false,32,8);
 const s1=slab(3,164,208,1),s2=slab(3,315,223,3);s1.locked=s2.locked=true;slab(3,164,544,1);slab(3,315,559,3);
 container(8,2,[{k:'grenade',n:2},{k:'gold',n:100}]);container(19,2,[{k:'bomb',n:1},{k:'gold',n:100}]);for(let x=13;x<=16;x++)for(let y=4;y<=5;y++)container(x,y,[{k:'gold',n:100}]);container(5,25,[{k:'gold',n:100}]);container(20,25,[{k:'gold',n:100}]);
 container(22,10,[{k:'gold',n:100},{k:'grenade',n:3}]);container(5,10,[]);container(5,33,[]);container(22,33,[{k:'gold',n:100}]);for(const o of bodies){if(o.type==='slab')goldify(o);if(o.kind==='crate')o.metal=true}
 // the crew: a commando with a blunderbuss, grenades and heavy grenades, two riflemen, and two heavier hands in front of them
 for(const[n,u,x,y,w,k,l]of[['Rask','cmd',240,640,'blunder',[{k:'grenade',n:4},{k:'bomb',n:3}],undefined],['Mott','rifle',205,640,'musket',[{k:'grenade',n:2}],undefined],['Hook','rifle',275,640,'musket',[{k:'grenade',n:2}],undefined],
  ['Brann','guard',222,668,'blunder',[{k:'grenade',n:2}],'Raider'],['Cole','shock',258,668,'spear',[],'Blademaster']]){const t=face(token(n,'Reapers',u,x,y,false,w,l),up);t.inv=[t.inv[0],t.inv[1]||null,k[0]||null,k[1]||null,...t.inv.slice(4)];kitSnap(t)}{const r=bodies.find(o=>o.name==='Rask');sel.clear();sel.add(r);r.direct=true}
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
 for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,TRK,FH])a.fill(0);WH.fill(0);fxDirty=true}
function unitsAir(){const face=(t,a)=>{t.ang=a;return t},E=0,Wd=Math.PI;
 const C=[['Kade','pistol',2],['Vos','pistol',2],['Ash','blunder'],['Rook','blunder'],['Sere','pgun'],['Holt','rod']];
 C.forEach(([n,w,dual],i)=>{const t=face(token(n,'Imperium','cmd',56+(i%2)*28,104+(i>>1)*36,false,w),E);if(dual)addItem(t,{k:'pistol',n:1,ammo:18,res:18})});
 container(2,6,[{k:'grenade',n:6}]);container(2,9,[{k:'pbox',n:4}]);
 const P=[['Cpt. Marrow','guard',428,150,'musket'],['Sly','guard',380,96,'musket'],['Gant','rifle',330,80,'musket'],['Hobb','rifle',330,224,'musket'],['Pell','rifle',344,150,'musket'],['Wick','rifle',236,232,'musket'],
  ['Brine','home',236,72,'blunder'],['Tarr','home',270,150,'pistol'],['Crabb','home',200,120,'spear'],['Lugg','home',200,176,'blunder'],['Nim','civ',196,150,'pistol'],['Fitch','civ',460,150,'spear']];
 for(const[n,u,x,y,w]of P)face(token(n,'Pirates',u,x,y,false,w),Wd);
 container(16,7,[{k:'gold',n:100}]);container(20,12,[{k:'gold',n:100}]);for(const y of [132,164]){const d=barricade(2,232,y);d.rot=1;orient(d)}}
function overboard(){for(const b of [...bodies]){if(b.type==='weapon'&&WP[b.kind].bullet||inDrag(b)||Math.hypot(b.vx,b.vy)>1.5&&b.type!=='token')continue;const r=map[b.y/T|0],k=r&&r[b.x/T|0];if(k!=='sky')continue;
 if(b.type==='token'&&b.held)dropHeld(b);dab(SF,b.x,b.y,.4,2);sfx('whoosh');remove(b)}}
