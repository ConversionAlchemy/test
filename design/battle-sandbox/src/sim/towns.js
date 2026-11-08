// painting a map; the bank, council, road, alley and stock maps
// mini maps for each side: one room or stretch, opening onto the void or a corridor
const fxClear=()=>{for(const a of [...Object.values(FX),TF,SF,SS,GM,ST,BURN,FH])a.fill(0);WH.fill(0);fxDirty=true};
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
function buildRoad(){paintAll((cx,cy)=>{if(cx>=13&&cx<=15&&cy>=8&&cy<=9)return 'chest';if(cy>=8&&cy<=10)return 'dirt';
 if(cy===6&&cx>=1&&cx<=14&&cx!==7||(cx===1||cx===14)&&cy>=1&&cy<=6)return 'rail';if(cx>=2&&cx<=13&&cy>=1&&cy<=5)return 'crop';
 const B=[[6,12],[7,12],[8,12],[7,13],[15,12],[16,12],[17,12],[16,13],[22,13],[23,13],[24,13],[23,14],[25,12],[20,4],[21,4],[22,4],[21,5],[24,3],[25,3],[26,3],[25,2]];return B.some(([a,b])=>a===cx&&b===cy)?'bush':'grass'})}
function unitsRoad(){container(13,8,[{k:'gold',n:100},{k:'musket',n:3,ammo:12,res:24},{k:'grenade',n:4}],'Company wagon');
 U('Factor Mercer','Portsbridge','civ',16.6,9,RT,'pistol');U('Ames','Portsbridge','civ',12.4,9.5,RT,null,'Company Clerk');
 U('Holt','Portsbridge','home',13.5,7.4,RT);U('Pike','Portsbridge','home',14.5,10.6,RT);U('Sorrel','Portsbridge','rifle',11.2,8.2,RT);U('Wren','Portsbridge','rifle',18.4,10.2,RT);U('Brannock','Portsbridge','guard',19.6,8.4,RT);
 U('Gull','Reapers','home',7.5,14.4,UP,'pistol');U('Mott','Reapers','home',6.2,13.6,UP,'spear');U('Rask','Reapers','guard',16.5,14.2,UP);U('Teague','Reapers','shock',17.8,13.6,UP,'spear');U('Brine','Reapers','home',23.5,15.4,UP,'blunder');
 U('Skiff','Reapers','cmd',21.5,3.2,DN,'pistol');U('Bones','Reapers','rifle',25.5,1.6,DN)}
function buildAlley(){paintAll((cx,cy)=>{if(cy===0||cy===CH-1)return cy===CH-1&&cx===15?'stone.grey.quarter':cy===0?'stone.grey.block.w':'wood.oak.boards.w';
 if(cy>=1&&cy<=3)return cx===0||cx===CW-1?'stone.grey.block.w':cy===2&&cx>=4&&cx<=7?'table':cx===16&&cy===1||cx===17&&cy===1?'chest':'wood.teak.planks';
 if(cy===4)return cx===10||cx===11?'stone.grey.quarter':'stone.grey.block.w';
 if(cx===2&&cy===5||cx>=19&&cx<=20&&cy===8||cx===20&&cy===7)return 'chest';return 'stone.grey.quarter'})}
function unitsAlley(){dbl(2,160,72,191,64,0,2,false);slab(2,240,CH*T-8,0);
 container(2,5,[{k:'spear',n:2}]);container(19,8,[]);container(16,1,[{k:'gold',n:100}],'Guild chest');
 U('Aldo','Great Keys','civ',9.2,6.4,RT,null);U('Mabb','Great Keys','civ',12.6,7.4,LF,null);U('Corr','Great Keys','civ',10.4,7.8,UP,'spear','Fisher');U('Wynn','Great Keys','civ',8,5.6,DN,null,'Fisher');
 U('Gull','Reapers','home',11,6.2,LF,null);U('Rask','Reapers','home',13.4,6,LF,'spear');U('Pell','Havenport','civ',7.6,7.6,RT,null);
 U('Ivo','Great Keys','home',10.5,4.6,DN);U('Sten','Great Keys','home',11.6,3.2,DN);U('Dorn','Great Keys','guard',11,2,DN);U('Lark','Great Keys','rifle',20.4,6,LF);
 U('Cutter','Reapers','rifle',1.4,7,RT,'pistol')}
function buildStock(){paintAll((cx,cy)=>{const E=cx===0||cx===CW-1||cy===0||cy===CH-1;
 if(E)return cy===CH-1&&(cx===12||cx===13)||cx===0&&cy===9?'stone.grey.slabs':'stone.grey.block.w';
 if(cy<=4)return cx===6||cx===12||cx===18?'metal.iron.rivet.w':'stone.grey.slabs';if(cy===5)return cx===3||cx===9||cx===15||cx===21?'stone.grey.slabs':'metal.iron.rivet.w';
 if(cy===11&&cx>=3&&cx<=5)return 'table';if(cy===13&&cx>=1&&cx<=2)return 'chest';if(cx===24&&cy>=10&&cy<=11)return 'chest';if(cx>=20&&cx<=21&&cy>=13&&cy<=14)return 'chest';return 'wood.oak.planks'})}
function unitsStock(){for(const x of [3,9,15,21]){const d=slab(3,x*T,5*T+8,0);d.locked=true}dbl(3,192,248,223,240,0,2,true);slab(2,8,9*T,1);
 container(1,13,[{k:'musket',n:2,ammo:12,res:12}]);container(24,10,[{k:'musket',n:3,ammo:12,res:24},{k:'spear',n:3}]);container(20,13,[{k:'gold',n:100}],'Bond chest');container(3,11,[]);
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

