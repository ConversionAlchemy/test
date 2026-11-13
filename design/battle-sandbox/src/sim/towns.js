// painting a map; the bank, council, road, alley and stock maps
// mini maps for each side: one room or stretch, opening onto the void or a corridor
const fxClear=()=>{for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,TRK,FH])a.fill(0);WH.fill(0);fxDirty=true};
// doorways draw from both neighbours, so they are redrawn once the whole map is laid
function resill(){for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++){const k=map[cy][cx];if(k==='sill'||k==='msill')paintCell(cx,cy,k)}}
function paintAll(f){FLC=null;map=Array.from({length:CH},()=>Array(CW).fill('stone'));for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)paintCell(cx,cy,f(cx,cy));fxClear()}
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
// Crossroads: the old road crosses Miller's brook by a stone bridge; guardhouse and cottages to the west, the mill below the road, the north road at the junction
const lerpP=(P,y)=>{for(let i=1;i<P.length;i++)if(y<=P[i][0]){const t=(y-P[i-1][0])/(P[i][0]-P[i-1][0]);return P[i-1][1]+(P[i][1]-P[i-1][1])*t}return P[P.length-1][1]};
const XDOORS=[[16,25,'stone.grey.flags~3'],[19,22,'stone.grey.flags~3'],[22,29,'stone.grey.flags~3'],[12,28,'wood.oak.planks~3'],[30,29,'wood.mahog.planks~3'],[35,29,'wood.mahog.planks~3'],[33,26,'wood.mahog.planks~3'],[51,29,'wood.pine.planks~2'],[17,34,'wood.oak.planks~3'],[18,40,'wood.pine.planks~2']];
const XRIV=y=>lerpP([[0,38.5],[6,41.5],[12,44.5],[18,45.5],[24,44],[30,44.5],[36,45],[42,44],[47,45.5],[52,48]],y)+Math.sin(y*.7)*.35,XNOR=y=>lerpP([[0,49],[12,49.5],[22,50.5],[31,50],[40,49.5],[52,52.5]],y);
function xrGrid(){const G=Array.from({length:CH},()=>Array(CW).fill('grass')),R=(x0,y0,x1,y1,k)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(G[y]&&x>=0&&x<CW)G[y][x]=k},box=(x0,y0,x1,y1,w,f)=>{R(x0,y0,x1,y1,w);R(x0+1,y0+1,x1-1,y1-1,f)};
 // woods along the top and the east edge
 for(const[x,y,r]of[[2,2,5],[8,0,4],[1,9,4],[12,2,3],[38,1,4],[42,0,3],[60,7,4],[62,13,4],[59,19,3.5],[63,3,3],[61,24,3]])for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)if(Math.hypot(cx-x,cy-y)<r+hh(cx,cy,61)*1.2-.4)G[cy][cx]='bush';
 for(let cy=0;cy<CH;cy++){const rc=XRIV(cy),nc=XNOR(cy);for(let cx=0;cx<CW;cx++){const d=Math.abs(cx-rc);if(d<=.75)G[cy][cx]='water.deep';else if(d<=1.9)G[cy][cx]='water';if(Math.abs(cx-nc)<=1&&G[cy][cx]!=='water'&&G[cy][cx]!=='water.deep')G[cy][cx]='dirt'}}
 for(let cy=0;cy<CH;cy++)for(let cx=0;cx<CW;cx++)if(G[cy][cx]==='grass'&&[-1,0,1].some(b=>[-1,0,1].some(a=>/^water(\.deep)?$/.test((G[cy+b]||[])[cx+a]||''))))G[cy][cx]='water.bank';
 // the old road and the bridge: a cobbled causeway with half walls where it crosses the water
 const rb=Math.round(XRIV(31));R(0,30,CW-1,32,'dirt');R(32,30,rb+4,32,'stone.grey.setts');R(rb-3,29,rb+3,29,'parapet');R(rb-3,33,rb+3,33,'parapet');
 R(11,18,26,29,'dirt');R(33,33,40,35,'dirt');R(27,29,38,29,'dirt');
 // guardhouse: an L of rubble stone, two rooms
 const sw='stone.grey.rubble.w';R(13,19,24,19,sw);R(13,19,13,25,sw);R(13,25,19,25,sw);R(19,19,19,29,sw);R(19,29,24,29,sw);R(24,19,24,29,sw);R(14,20,18,24,'stone.grey.flags~3');R(20,20,23,28,'stone.grey.flags~3');
 // cottages, the two-room house, the sheds and the mill
 box(7,24,12,30,'wood.oak.logs.w','wood.oak.planks~3');box(28,23,33,29,'stone.grey.block.w','wood.mahog.planks~3');box(33,22,37,29,'stone.grey.block.w','wood.mahog.planks~3');
 box(50,26,53,29,'wood.pine.logs.w','wood.pine.planks~2');box(15,34,20,38,'wood.oak.logs.w','wood.oak.planks~3');box(17,40,19,42,'wood.pine.logs.w','wood.pine.planks~2');
 // furniture
 G[21][22]=G[21][23]='table';G[20][20]=G[20][21]='chest';G[24][14]='chest~3';G[21][14]='seat~3';G[25][9]=G[25][10]='table';G[26][9]='seat~3';G[24][29]=G[24][30]='desk.oak';G[25][30]='seat~4';G[23][36]='chest~3';
 G[27][52]='pchest~2';
 // doorways take the floor of the room they open into
 for(const[x,y,f]of XDOORS)G[y][x]=f;
 return G}
// a building at any angle: its own small grid of tiles, turned about its centre and laid into the map pixel by pixel; walls stay solid where they land
function stampRot(G,cx,cy,ang){const h=G.length,w=G[0].length,PW=w*T,PH=h*T,ca=Math.cos(ang),sa=Math.sin(ang),R=Math.hypot(PW,PH)/2+2,L0=LINK;LINK=(x,y)=>G[y]&&G[y][x];
 try{for(let Y=Math.max(0,cy-R|0);Y<Math.min(H,cy+R);Y++)for(let X=Math.max(0,cx-R|0);X<Math.min(W,cx+R);X++){const dx=X+.5-cx,dy=Y+.5-cy,lx=dx*ca+dy*sa+PW/2,ly=-dx*sa+dy*ca+PH/2;if(lx<0||ly<0||lx>=PW||ly>=PH)continue;
  const tx=lx/T|0,ty=ly/T|0,k=G[ty][tx];if(!k||!TEX[k])continue;const c=TEX[k](lx|0,ly|0,tx,ty);if(!c)continue;const j=Y*W+X,col=rgb(cl(c[0]),cl(c[1]),cl(c[2])),m=WMAT[k]||0;
  if(m){sol[j]=m;shp[j]=CATN[k]?mprop(CATN[k][0],CATN[k][1]).hp:3;scol[j]=col;floor[j]=mul(col,.42)}else{sol[j]=0;floor[j]=col}}}finally{LINK=L0}solDirty=true;NAVD=true;fxDirty=true}
const MILL=(()=>{const w='wood.oak.logs.w',f='wood.oak.planks~2',G=Array.from({length:7},(_,y)=>Array.from({length:10},(_,x)=>y===0||y===6||x===0||x===9?w:f));G[6][4]=G[6][5]=f;G[3][0]=f;return G})();
function buildRoad(){const G=xrGrid();paintAll((cx,cy)=>G[cy][cx])}
MLAB.road=[{t:'Crossroads',x:35,y:12,big:1},{t:'Guardhouse',x:18.5,y:17.4},{t:"Miller's Bridge",x:45,y:27.3},{t:"Miller's Mill",x:41.5,y:39.5}];
function unitsRoad(){stampRot(MILL,33.5*T,39*T,-.6);edSrc=null;for(const[x,y]of XDOORS)smartDoor('wood~3',x,y,false);snapDoors();sills();solDirty=true;
 carrier('steel',57*T,40*T,-Math.PI/2,'Portsbridge','new');
 U('Factor Mercer','Portsbridge','civ',31.5,26,RT,'pistol');U('Ames','Portsbridge','civ',35,25,LF,null,'Company Clerk');
 for(const[n,x,y]of[['Holt',15.5,28.6],['Pike',16.7,28.6],['Sorrel',17.9,28.6],['Wren',15.5,29.8],['Dace',16.7,29.8],['Lusk',17.9,29.8]])U(n,'Portsbridge','rifle',x,y,RT);
 U('Brannock','Portsbridge','guard',21.5,24,DN);U('Corr','Portsbridge','guard',16,22,DN);U('Ide','Portsbridge','home',7.5,31.2,RT);U('Fane','Portsbridge','home',12,31.2,RT);
 for(const[n,x,y,u,w]of[['Gull',35.5,33.6,'home','pistol'],['Mott',36.6,34,'home','spear'],['Rask',37.4,34.8,'guard'],['Teague',38.4,35.4,'shock','spear'],['Brine',39,35.6,'home','blunder']])U(n,'Marshmen',u,x,y,UP,w);
 for(const[n,x,y]of[['Skiff',48,33.5],['Bones',48,34.6],['Tull',48.6,35.7],['Weir',48,36.8]])U(n,'Marshmen',n==='Skiff'?'cmd':'rifle',x,y,LF,n==='Skiff'?'pistol':undefined);
 U('Cray','Marshmen','rifle',51.5,27.5,DN);U('Fen','Marshmen','home',30.5,25.5,RT,'spear')}
function buildAlley(){paintAll((cx,cy)=>{if(cy===0||cy===CH-1)return cy===CH-1&&cx===15?'stone.grey.quarter':cy===0?'stone.grey.block.w':'wood.oak.boards.w';
 if(cy>=1&&cy<=3)return cx===0||cx===CW-1?'stone.grey.block.w':cy===2&&cx>=4&&cx<=7?'table':cx===16&&cy===1||cx===17&&cy===1?'chest':'wood.teak.planks';
 if(cy===4)return cx===10||cx===11?'stone.grey.quarter':'stone.grey.block.w';
 if(cx===2&&cy===5||cx>=19&&cx<=20&&cy===8||cx===20&&cy===7)return 'chest';return 'stone.grey.quarter'})}
function unitsAlley(){dbl(2,160,72,191,64,0,2,false);slab(2,240,CH*T-8,0);
 container(2,5,[{k:'spear',n:2}]);container(19,8,[]);container(16,1,[{k:'gold',n:100}],'Guild chest');
 U('Aldo','Great Keys','civ',9.2,6.4,RT,null);U('Mabb','Great Keys','civ',12.6,7.4,LF,null);U('Corr','Great Keys','civ',10.4,7.8,UP,'spear','Fisher');U('Wynn','Great Keys','civ',8,5.6,DN,null,'Fisher');
 U('Gull','Marshmen','home',11,6.2,LF,null);U('Rask','Marshmen','home',13.4,6,LF,'spear');U('Pell','Havenport','civ',7.6,7.6,RT,null);
 U('Ivo','Great Keys','home',10.5,4.6,DN);U('Sten','Great Keys','home',11.6,3.2,DN);U('Dorn','Great Keys','guard',11,2,DN);U('Lark','Great Keys','rifle',20.4,6,LF);
 U('Cutter','Marshmen','rifle',1.4,7,RT,'pistol')}
function buildStock(){paintAll((cx,cy)=>{const E=cx===0||cx===CW-1||cy===0||cy===CH-1;
 if(E)return cy===CH-1&&(cx===12||cx===13)||cx===0&&cy===9?'stone.grey.slabs':'stone.grey.block.w';
 if(cy<=4)return cx===6||cx===12||cx===18?'metal.iron.rivet.w':'stone.grey.slabs';if(cy===5)return cx===3||cx===9||cx===15||cx===21?'stone.grey.slabs':'metal.iron.rivet.w';
 if(cy===11&&cx>=3&&cx<=5)return 'table';if(cy===13&&cx>=1&&cx<=2)return 'chest';if(cx===24&&cy>=10&&cy<=11)return 'chest';if(cx>=20&&cx<=21&&cy>=13&&cy<=14)return 'chest';return 'wood.oak.planks'})}
function unitsStock(){for(const x of [3,9,15,21]){const d=slab(3,x*T,5*T+8,0);d.locked=true}dbl(3,192,248,223,240,0,2,true);slab(2,8,9*T,1);
 container(1,13,[{k:'musket',n:2,ammo:12,res:12}]);container(24,10,[{k:'musket',n:3,ammo:12,res:24},{k:'spear',n:3}]);container(20,13,[{k:'gold',n:100}],'Bond chest');container(3,11,[]);
 cap(U('Tobin','Havenport','civ',2,2,DN,null),'chain');cap(U('Wynn','Great Keys','civ',4.6,3.4,UP,null,'Fisher'));
 cap(U('Gull','Marshmen','home',8,2,DN,null),'chain');cap(U('Rask','Marshmen','rifle',10.8,2.2,DN,null),'chain');cap(U('Crow','Marshmen','home',9.5,4,UP,null));
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
 for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,TRK,FH])a.fill(0);fxDirty=true}

