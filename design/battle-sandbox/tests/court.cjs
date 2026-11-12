// Court and war rules: land all owned, one ruler and governors only, seat holders on their chairs, war-only movement, capture, capitulation, no ally fire, income, and all of it surviving a reload. Run: node tests/court.cjs
const {chromium}=require(process.env.PW||'playwright'),fs=require('fs'),path=require('path');
(async()=>{const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8'),i=html.lastIndexOf('})();',html.lastIndexOf('})();')-1),f=path.join(__dirname,'.court.html');fs.writeFileSync(f,html.slice(0,i)+'window.__T=x=>eval(x);\n'+html.slice(i));
 const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1400,height:900}}),p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));
 const T=s=>p.evaluate(s=>window.__T(s),s);let fails=0;const ok=(name,v,info)=>{if(!v)fails++;console.log((v?'pass ':'FAIL ')+name+(info!==undefined?' · '+info:''))};
 await p.goto('file://'+f);await p.waitForTimeout(2500);
 const J=async s=>JSON.parse(await T(`JSON.stringify((()=>{${s}})())`));

 // load invariants
 let r=await J(`const un=D.cells.filter((c,i)=>land(c)&&!OWN[i]).length,rul={},gv={};for(const p of R.PP){if(p.ruler)rul[p.nat]=(rul[p.nat]||0)+1;if(p.gov)gv[p.cell]=(gv[p.cell]||0)+1}
  const badR=Object.keys(NATS).filter(n=>rul[n]!==1||R.PP.find(p=>p.ruler&&p.nat===n).cell!==capCell(n)),seats=Object.values(R.prov).filter(p=>p.cc!==capCell(p.nat)),
  badG=seats.filter(p=>gv[p.cc]!==1).map(p=>p.n),other=R.PP.filter(p=>!p.ruler&&!p.gov).length,provOwn=Object.values(R.prov).filter(p=>p.c.some(c=>OWN[c]!==p.nat)).length,
  noProv=D.cells.filter((c,i)=>land(c)&&!PROV[i]).length;return{un,badR,badG,other,provOwn,noProv,n:R.PP.length}`);
 ok('every land cell owned',r.un===0,r.un);ok('one ruler per nation, in its capital',!r.badR.length,r.badR.join());ok('one governor per province seat',!r.badG.length,r.badG.join());
 ok('no other civilians',r.other===0,r.other);ok('provinces match their land',r.provOwn===0,r.provOwn);ok('every land cell in a province',r.noProv===0,r.noProv);

 // every capital and a fort: enter, ruler/governor on the chair, no stray civilians
 const caps=await J(`return Object.keys(NATS).map(n=>[n,capCell(n)])`);
 for(const[n,c]of caps){r=await J(`open();settle(${c});enterSD();const h=holderOf(${c}),bd=bodies.find(b=>b.rid===h.id),ch=findChair();
   return{map:curMap,gen:/^mod:/.test(curMap),w:CW,h:CH,on:!!(bd&&ch&&Math.abs(bd.x-(ch[0]+.5)*T)<1&&Math.abs(bd.y-(ch[1]+.5)*T)<1),chair:!!ch,civ:bodies.filter(b=>b.type==='token'&&b.unit==='civ'&&!b.rid).length}`);
  ok(`${n}: ruler on his chair`,r.on,`${r.map} ${r.w}x${r.h} chair:${r.chair}`);ok(`${n}: no stray civilians`,r.civ===0,r.civ)}
 r=await J(`const p=Object.values(R.prov).find(p=>p.cc!==capCell(p.nat)&&!(R.cm[p.cc]||[]).length);open();settle(p.cc);enterSD();const h=holderOf(p.cc),bd=bodies.find(b=>b.rid===h.id),ch=findChair();
  return{n:p.n,w:CW,h:CH,on:!!(bd&&ch&&Math.abs(bd.x-(ch[0]+.5)*T)<1)}`);ok('fort generated with governor on chair',r.on&&r.w===24&&r.h===18,r.n+' '+r.w+'x'+r.h);
 r=await J(`const ps=new Set(Object.values(R.prov).map(p=>p.cc)),c=D.cells.findIndex((x,i)=>land(x)&&OWN[i]&&!ps.has(i)&&!(R.cm[i]||[]).length);open();settle(c);enterSD();return{w:CW,h:CH,grass:map.every(r=>r.every(k=>k==='grass'))}`);
 ok('hamlet map is open grass',r.grass&&r.w===30,r.w+'x'+r.h);
 // re-entering does not duplicate the holder
 r=await J(`const c=capCell('Hoverlands');open();settle(c);enterSD();open();settle(c);enterSD();const h=holderOf(c);return bodies.filter(b=>b.rid===h.id).length`);ok('re-entering keeps one ruler body',r===1,r);

 // movement: peace blocks, ally and war allow, own land always
 r=await J(`open();const a='Astria',o='Old Kingdoms',k=relKey(a,o),f=R.F.find(f=>f.nat===a&&f.t==='squad'&&soldiers(f)),c0=f.cell,to=D.cells.findIndex((c,i)=>OWN[i]===o&&!seatCell(i)&&nb[i].some(j=>OWN[j]===o));
  const out={};R.rel[k]='peace';moveF(f,to);out.peace=f.cell===to;R.rel[k]='ally';moveF(f,to);out.ally=f.cell===to;moveF(f,c0);out.home=f.cell===c0;R.rel[k]='war';moveF(f,to);out.war=f.cell===to;moveF(f,c0);R.rel[k]='peace';return out`);
 ok('peace blocks a move',!r.peace);ok('ally allows a move',r.ally);ok('own land always open',r.home);ok('war allows a move',r.war);
 r=await J(`open();const a='Astria',o='Hoverlands',k=relKey(a,o);R.rel[k]='peace';const f=R.F.find(f=>f.nat===a&&f.t==='squad'&&soldiers(f)),c=capCell(o);f.cell=c;nation='all';settle(c);for(const m of men(f))sdPick.add(m.id);const was=curMap;enterSD();const blocked=OV.hidden===false;f.cell=near([BURG[NATS.Astria.seat].x,BURG[NATS.Astria.seat].y]);return{blocked}`);
 ok('peace blocks entering a foreign map',r.blocked);

 // capture: blocked while defenders stand, the province flips when they are gone, the governor is taken, income follows the governor
 r=await J(`open();const a='Astria',o='Hoverlands';R.rel[relKey(a,o)]='war';const p=Object.values(R.prov).find(p=>p.nat===o&&p.cc!==capCell(o)),c=p.cc;
  const d={id:'fD',t:'squad',nat:o,cell:c,n:'Def',men:[{id:'mD1',k:'Townsman',n:'D',h:100}]};R.F.push(d);const f=R.F.find(f=>f.nat===a&&f.t==='squad'&&soldiers(f));const inc0=incomeOf(o),incA0=incomeOf(a);
  moveF(f,c);const held=p.nat===o;for(const x of R.F)if(x.cell===c&&x.nat===o)for(const m of x.men)m.dead=1;capture(f);const flip=p.nat===a,gov=R.PP.some(q=>q.cell===c&&q.nat===o),own=p.c.every(x=>OWN[x]===a);
  return{held,flip,gov,own,ungov:!governed(c),inc:[inc0,incomeOf(o),incA0,incomeOf(a)]}`);
 ok('defenders hold a province',r.held);ok('no defenders: province flips',r.flip&&r.own);ok('their governor is taken',!r.gov);ok('new owner earns nothing until governed',r.ungov&&r.inc[3]===r.inc[2],r.inc.join(' '));ok('loser income drops',r.inc[1]<r.inc[0],r.inc.join(' '));

 // the map's own garrison counts even if nobody opened the map yet
 r=await J(`open();const a='Astria',o='Portsbridge',gb=Object.values(R.prov).find(p=>p.cap==='Goldbank');if(!gb)return{skip:1};R.rel[relKey(a,o)]='war';const c=gb.cc;for(const x of R.F)if(x.cell===c&&x.nat===o)for(const m of x.men)m.dead=1;
  const f=R.F.find(f=>f.nat===a&&f.t==='squad'&&soldiers(f));f.cell=c;capture(f);return{held:gb.nat===o,maps:R.cm[c]}`);
 ok('map garrison holds the province',r.skip||r.held,JSON.stringify(r.maps));

 // the ruler killed in his map: his nation goes to the side in the map with him
 r=await J(`open();const a='Astria',o='Lindale'.length&&'Whitecoast',c=capCell(o);R.rel[relKey(a,o)]='war';const d={id:'fD2',t:'squad',nat:o,cell:c,n:'Def',men:[{id:'mD2',k:'Townsman',n:'D',h:100}]};R.F.push(d);
  const f=R.F.find(f=>f.nat===a&&f.t==='squad'&&soldiers(f)&&!inMap(f));moveF(f,c);const stillOwn=OWN[c]===o;settle(c);sdPick.clear();for(const m of men(f))sdPick.add(m.id);enterSD();
  const h=R.PP.find(p=>p.ruler&&p.nat===o),bd=bodies.find(b=>b.rid===h.id);bd.status='dead';sync();const left=D.cells.filter((x,i)=>OWN[i]===o).length;
  return{stillOwn,inMap:!!bd,left,by:R.fallen&&R.fallen[o],sq:R.F.filter(x=>x.nat===o).length,pp:R.PP.filter(x=>x.nat===o).length}`);
 ok('defended capital holds on entry',r.stillOwn);ok('ruler killed: nation capitulates to the killer',r.left===0&&r.by==='Astria',JSON.stringify(r));ok('its squads and court are gone',r.sq===0&&r.pp===0);

 // no friendly or allied fire, enemies still hit
 r=await J(`goMap('road');for(const x of bodies.filter(x=>x.type==='token'))remove(x);const k=['Goldbank','Imperium'].sort().join('|'),old=REL[k];
  const shoot=(rel,tn)=>{REL[k]=rel;const s=token('S','Imperium','rifle',200,200,false,null),t=token('T',tn,'rifle',260,200,false,null),n0=t.px.length;
   for(let i=0;i<3;i++){const w=weapon('ball',212,200,0);w.vx=12;w.vy=0;w.from=s.id;w.thrown=true;w.range=400;w.E=WP.musket.E;for(let j=0;j<30;j++)update()}const hurt=t.px.length<n0||t.status!=='free';remove(s);remove(t);return hurt};
  const out={self:shoot('enemy','Imperium'),ally:shoot('ally','Goldbank'),enemy:shoot('enemy','Goldbank')};REL[k]=old;return out`);
 ok('own side not hit',!r.self);ok('ally not hit',!r.ally);ok('enemy hit',r.enemy);

 // economy: small treasuries, turn pay, manpower cap
 r=await J(`const t=Object.keys(NATS).filter(alive).map(n=>R.tres[n]);return{max:Math.max(...t),min:Math.min(...t),mpOk:Object.keys(NATS).filter(alive).every(n=>R.mp[n]<=mpCap(n)),ars:R.ars.Astria}`);
 ok('treasuries in the hundreds',r.max<=700&&r.min>=0,r.min+'–'+r.max);ok('manpower within its cap',r.mpOk);ok('arsenal starts stocked',r.ars===100,r.ars);
 r=await J(`const n='Hoverlands',t0=R.tres[n],g=incomeOf(n),tu=R.turn;R.mp[n]=0;R.auto[n]=false;R.cur=n;endTurn();const one=R.tres[n]-t0,m1=R.mp[n];for(let i=0;i<9;i++){R.cur=n;endTurn()}return{one,g,m1,gain:mpGain(n),cap:mpCap(n),mp:R.mp[n],turns:R.turn-tu,fallenPaid:Object.keys(R.fallen||{}).some(k=>incomeOf(k)>0&&R.tres[k]>0)}`);
 ok('end turn pays the income',r.one===r.g&&r.g>0,r.one+' / '+r.g);ok('manpower grows by its gain',r.m1===r.gain,r.m1);ok('manpower stops at its cap',r.mp===r.cap,r.mp+' / '+r.cap);
 // recruiting: own capital or governed seat only, paid in Solari and men
 r=await J(`const n='Hoverlands',c=capCell(n);R.tres[n]=200;R.mp[n]=40;const f=recruit(n,c,'rifle');const out={ok:!!f,men:f&&f.men.length,tres:R.tres[n],mp:R.mp[n],look:f&&f.men[0].k};
  out.poor=(R.tres[n]=10,!recruit(n,c,'guard'));R.tres[n]=500;out.foreign=!recruit(n,capCell('Astria'),'home');const seat=Object.values(R.prov).find(p=>p.nat===n&&p.cc!==c);const hp=holderOf(seat.cc);R.PP=R.PP.filter(q=>q!==hp);out.ungov=!recruit(n,seat.cc,'home');R.PP.push(hp);out.gov=!!recruit(n,seat.cc,'home');
  out.lookOk=!!(WARD.has(out.look)||SPR[out.look]);return out`);
 ok('recruit a Line squad at the capital',r.ok&&r.men===8&&r.tres===200-90&&r.mp===32,JSON.stringify(r));ok('recruits wear a real look',r.lookOk,r.look);ok('too poor: refused',r.poor);ok('foreign land: refused',r.foreign);ok('ungoverned seat: refused',r.ungov);ok('governed seat: allowed',r.gov);
 r=await J(`const out={};for(const n of Object.keys(NATS).filter(alive))for(const t of['home','rifle','guard','civ']){const k=lookFor(n,t);if(!(WARD.has(k)||SPR[k]))out[n+':'+t]=k}return out`);ok('every nation has a look for every tier',!Object.keys(r).length,JSON.stringify(r));
 // a civilian walked onto an empty seat of his own becomes its governor; civilians never take land
 r=await J(`const n='Hoverlands',c=capCell(n);R.tres[n]=100;R.mp[n]=10;const seat=Object.values(R.prov).find(p=>p.nat===n&&p.cc!==c),hp=holderOf(seat.cc);R.PP=R.PP.filter(q=>q!==hp);const inc0=incomeOf(n);
  const v=recruit(n,c,'civ');const civSoldier=soldiers(v);moveF(v,seat.cc);const h=holderOf(seat.cc);const o='Astria';R.rel[relKey(n,o)]='war';const v2=recruit(n,c,'civ');const ap=Object.values(R.prov).find(p=>p.nat===o&&p.cc!==capCell(o)&&!R.F.some(x=>x.cell===p.cc&&soldiers(x)));let took=null;if(ap){moveF(v2,ap.cc);took=ap.nat===n}
  return{civSoldier,gov:!!h&&h.n===v.men[0].n,inF:R.F.includes(v),inc:[inc0,incomeOf(n)],took}`);
 ok('civilian is not a soldier',r.civSoldier===0);ok('civilian becomes governor of an empty seat',r.gov&&!r.inF);ok('governing restores income',r.inc[1]>r.inc[0],r.inc.join(' → '));ok('civilians cannot take land',r.took!==true,String(r.took));
 // ammunition: rounds spent in a map follow the man out, resupply draws them from the arsenal, auto buys crates
 r=await J(`const n='Hoverlands',c=capCell(n);nation='all';const f=R.F.find(x=>x.nat===n&&x.tier==='rifle');open();settle(c);sdPick.clear();for(const m of men(f))sdPick.add(m.id);enterSD();
  const tk=bodies.filter(b=>b.rid&&men(f).some(m=>m.id===b.rid));for(const b of tk)for(const z of b.inv||[])if(z&&z.ammo!==undefined&&z.k!=='gold'){z.ammo=0;z.res=0}
  withdraw(f);const sp=shortOf(f);R.ars[n]=1000;const a0=R.ars[n];const used=resupply(f,false);const full=men(f).every(m=>!m.spent)&&men(f).every(m=>!m.carry||spentOf(m.carry)===0);
  for(const m of men(f)){m.spent=12;delete m.carry}R.ars[n]=0;R.tres[n]=100;R.auto[n]=true;R.cur=n;endTurn();const auto=men(f).every(m=>!m.spent),crates=100+incomeOf(n)-R.tres[n];
  for(const m of men(f))m.spent=5;nation='all';open();settle(c);sdPick.clear();for(const m of men(f))sdPick.add(m.id);enterSD();const b2=bodies.find(b=>b.rid===men(f)[0].id),drained=spentOf(b2);withdraw(f);
  return{tk:tk.length,sp,used,a:a0-R.ars[n],full,auto,crates,drained}`);
 ok('spent rounds counted on leaving a map',r.tk===8&&r.sp>0,r.sp);ok('resupply draws exactly what was spent',r.used===r.sp,r.used+' / '+r.sp);ok('resupplied men are full',r.full);
 ok('auto resupply buys crates at end turn',r.auto&&r.crates>0,'crates §'+r.crates);ok('a fresh deploy keeps the shortfall',r.drained>=4&&r.drained<=6,r.drained);
 // the bar
 r=await J(`open();nation='all';list2();const h0=TB.hidden;nation='Hoverlands';list2();const h1=TB.hidden;const K=Object.keys(NATS).filter(alive);R.cur=K[0];const c0=R.cur;CORN.querySelector('.slow').click();const nx=R.cur,nat1=nation;R.cur=K[K.length-1];const t=R.turn;CORN.querySelector('.slow').click();return{h0,h1,c0,nx,nat:nation,K,next:c0!==nx&&nx===K[1]&&nat1===nx,t:R.turn-t,wrap:R.cur===K[0],items:TB.querySelectorAll('.ti').length}`);
 ok('bar shows whose turn it is',!r.h0&&!r.h1);ok('hourglass passes the turn to the next nation',r.next,JSON.stringify(r));ok('a full round counts one turn',r.t===1&&r.wrap);ok('bar shows its items',r.items===5,r.items);

 // selection with the mouse: right click takes a cell's forces, a right drag boxes them, dragging one moves them all
 r=await J(`FREE=false;open();R.cur='Astria';for(const f of R.F)delete f.mv;nation='Astria';list2();const c=capCell('Astria'),ed=near([BURG["Emperor's Dock"].x,BURG["Emperor's Dock"].y]);const[x,y]=cellXY(ed);view.k=3;view.x=VW/2-x*view.k;view.y=VH/2-y*view.k;draw();const[X,Y]=W2S(x,y),r=cv.getBoundingClientRect();
  const to=nb[ed].find(j=>OWN[j]==='Astria'&&land(D.cells[j])&&!R.F.some(f=>f.cell===j));const[tx,ty]=W2S(...cellXY(to));
  return{X:X+r.left,Y:Y+r.top,ed,to,TX:tx+r.left,TY:ty+r.top,n:R.F.filter(f=>f.cell===ed&&f.nat==='Astria'&&!fallen(f)&&f.show!==false).length}`);
 await p.mouse.move(r.X,r.Y);await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});
 let r2=await J(`return{sel:SELS.size}`);ok('right click on a cell selects its forces',r2.sel===r.n,r2.sel+' / '+r.n);
 r2=await J(`const b=cv.getBoundingClientRect(),f=R.F.find(f=>SELS.has(f.id)&&f.R);if(f)return{x:f.X+b.left,y:f.Y+b.top};const G=GROUPS.find(G=>G.R&&stackOf(G).some(f=>SELS.has(f.id)));return G?{x:(G.R[0]+G.R[2])/2+b.left,y:(G.R[1]+G.R[3])/2+b.top}:null`);
 if(r2){await p.mouse.move(r2.x,r2.y);await p.mouse.down();await p.mouse.move(r2.x+20,r2.y+10,{steps:4});await p.mouse.move(r.TX,r.TY,{steps:8});await p.mouse.up();await p.waitForTimeout(900)}
 r2=await J(`return{moved:R.F.filter(f=>SELS.has(f.id)&&f.cell===${r.to}).length,sel:SELS.size}`);ok('dragging one selected marker moves them all',r2.moved===r2.sel&&r2.sel>1,r2.moved+' / '+r2.sel);
 await p.mouse.move(r.TX-80,r.TY-80);await p.mouse.down({button:'right'});await p.mouse.move(r.TX+80,r.TY+80,{steps:6});await p.mouse.up({button:'right'});
 r2=await J(`return{sel:SELS.size,inBox:R.F.filter(f=>f.cell===${r.to}).length}`);ok('right drag box selects what it covers',r2.sel>=r2.inBox&&r2.inBox>1,r2.sel+' ≥ '+r2.inBox);
 r2=await J(`const f=R.F.find(f=>SELS.has(f.id));return{mv:mvOf(f),rch:[...reach(f).keys()].length}`);ok('marching spends a move',r2.mv===1,r2.mv);
 // right click marches the selection one cell at a time, no further than its moves
 r2=await J(`SELS.clear();const f=R.F.find(f=>f.cell===${r.to}&&f.nat==='Astria');SELS.add(f.id);rsel=f.id;f.mv=2;const rc=reach(f);let far=-1;for(const[c,o]of rc)if(o.d===2){far=c;break}let out=-1;for(const c of D.cells.keys())if(land(D.cells[c])&&!rc.has(c)&&OWN[c]==='Astria'){out=c;break}
  const[x,y]=W2S(...cellXY(far)),[ox,oy]=W2S(...cellXY(out)),b=cv.getBoundingClientRect();return{id:f.id,far,X:x+b.left,Y:y+b.top,OX:ox+b.left,OY:oy+b.top,in:ox>=0&&oy>=0&&ox<VW&&oy<VH}`);
 await p.mouse.click(r2.X,r2.Y,{button:'right'});await p.waitForTimeout(60);let r3=await J(`const f=R.F.find(f=>f.id==='${r2.id}');return{cell:f.cell,mv:mvOf(f)}`);
 ok('march goes one cell at a time',r3.cell!==r2.far,r3.cell);await p.waitForTimeout(700);r3=await J(`const f=R.F.find(f=>f.id==='${r2.id}');return{cell:f.cell,mv:mvOf(f)}`);
 ok('march arrives and spends its moves',r3.cell===r2.far&&r3.mv===0,JSON.stringify(r3));
 r3=await J(`const f=R.F.find(f=>f.id==='${r2.id}');const c=f.cell;march([f],nb[c].find(j=>land(D.cells[j])&&!blocked(j)));return f.cell===c`);ok('no moves left: stays put',r3);
 r3=await J(`const f=R.F.find(f=>f.nat==='Hoverlands'&&soldiers(f))||recruit('Hoverlands',capCell('Hoverlands'),'home');const c=f.cell;march([f],nb[c].find(j=>OWN[j]==='Hoverlands'&&!blocked(j)));return f.cell===c`);ok('not your turn: stays put',r3);
 await p.keyboard.press('Escape');r2=await J(`return SELS.size`);ok('Esc clears the selection',r2===0,r2);
 // a click selects without opening anything; a double click opens the place
 r2=await J(`const f=R.F.find(f=>f.R&&!fallen(f));const b=cv.getBoundingClientRect();return{x:f.X+b.left,y:f.Y+b.top,id:f.id}`);await p.mouse.click(r2.x,r2.y);await p.waitForTimeout(300);
 r3=await J(`return{sel:SELS.has('${r2.id}'),dlg:!SDL.hidden}`);ok('click selects a unit',r3.sel);ok('click opens no dialog',!r3.dlg);
 await p.mouse.dblclick(r2.x,r2.y);await p.waitForTimeout(300);r3=await J(`const o=!SDL.hidden;unsettle();return o`);ok('double click opens the place',r3);

 // battle: marching into an enemy's cell opens the battle; auto-resolve, retreat and fight
 const setup=`open();nation='all';R.cur='Astria';const o='Havenport';R.rel[relKey('Astria',o)]='war';const a=R.F.filter(f=>f.nat==='Astria'&&f.t==='squad'&&soldiers(f)&&!inMap(f));const f=a[0];f.mv=2;for(const m of f.men){m.dead=0;m.h=100;m.spent=0}
  const to=nb[f.cell].find(j=>land(D.cells[j])&&!blocked(j)&&OWN[j]==='Astria'&&!R.F.some(x=>x.cell===j));const e={id:'fE'+Math.random(),t:'squad',nat:o,cell:to,n:'Raiders',men:Array.from({length:8},(_,i)=>({id:'mE'+i+Math.random(),k:'Marine',n:'E'+i,h:100}))};R.F.push(e);`;
 r=await J(setup+`window.__b={f:f.id,e:e.id,to,from:f.cell};march([f],to);return 1`);await p.waitForTimeout(800);
 r=await J(`const b=BT;return{open:!!b&&!BDL.hidden,cell:b&&b.c,btns:[...BDL.querySelectorAll('.sdf button')].map(x=>x.textContent)}`);ok('marching into an enemy opens the battle',r.open,JSON.stringify(r.btns));
 await J(`[...BDL.querySelectorAll('.sdf button')].find(x=>x.textContent==='Auto-resolve').click();return 1`);await p.waitForTimeout(6000);
 r=await J(`const b=BT,f=R.F.find(x=>x.id===__b.f),e=R.F.find(x=>x.id===__b.e);return{done:b&&b.done,rounds:b&&b.round,fl:f.men.filter(m=>m.dead).length,el:e.men.filter(m=>m.dead).length,fc:f.cell,ec:e.cell,to:__b.to,sp:men(f).concat(men(e)).some(m=>m.spent>0),
   apart:!(soldiers(f)&&soldiers(e)&&f.cell===e.cell)}`);
 ok('auto-resolve ends with a winner',!!r.done,r.done+' after '+r.rounds+' rounds');ok('both sides take losses',r.fl+r.el>0,r.fl+' / '+r.el);ok('the loser leaves the field',r.apart,JSON.stringify(r));ok('fighting spends rounds',r.sp);
 await J(`[...BDL.querySelectorAll('.sdf button')].find(x=>x.textContent==='Close').click();return 1`);
 r=await J(setup+`window.__b={f:f.id,e:e.id,to,from:f.cell};march([f],to);return 1`);await p.waitForTimeout(800);
 await J(`[...BDL.querySelectorAll('.sdf button')].find(x=>x.textContent==='Retreat').click();return 1`);r=await J(`const f=R.F.find(x=>x.id===__b.f);return{back:f.cell===__b.from,closed:BDL.hidden}`);ok('retreat goes back where it came from',r.back&&r.closed);
 r=await J(`const f=R.F.find(x=>x.id===__b.f);f.mv=2;march([f],__b.to);return 1`);await p.waitForTimeout(800);
 await J(`[...BDL.querySelectorAll('.sdf button')].find(x=>x.textContent==='Fight').click();return 1`);await p.waitForTimeout(500);
 r=await J(`const f=R.F.find(x=>x.id===__b.f),e=R.F.find(x=>x.id===__b.e),tf=bodies.filter(b=>men(f).some(m=>m.id===b.rid)),te=bodies.filter(b=>men(e).some(m=>m.id===b.rid));
   return{map:curMap,inCell:(R.cm[__b.to]||[]).includes(curMap),nf:tf.length,ne:te.length,west:tf.every(b=>b.x<W/2),east:te.every(b=>b.x>W/2),region:!OV.hidden}`);
 ok('fight opens the cell map with both sides',r.inCell&&r.nf>0&&r.ne>0&&!r.region,JSON.stringify(r));ok('attackers west, defenders east',r.west&&r.east);
 r=await J(`open();const f=R.F.find(x=>x.id===__b.f),e=R.F.find(x=>x.id===__b.e);return{inMap:inMap(f)&&inMap(e),noBattle:!contested(__b.to,'Astria')}`);ok('armies in the map stay out of new battles',r.inMap&&r.noBattle);
 r=await J(`return{mi:Math.round((bx1-bx0)*MI)}`);ok('region is fifty miles across',r.mi===50,r.mi);

 // panning only with Space, the middle button or the map's edge; a left drag on open ground boxes forces
 r=await J(`open();BT=null;drawBT();SELS.clear();R.cur='Astria';nation='Astria';const ed=near([BURG["Emperor's Dock"].x,BURG["Emperor's Dock"].y]);const[x,y]=cellXY(ed);view.k=2;view.x=VW/2-x*view.k;view.y=VH/2-y*view.k;draw();const b=cv.getBoundingClientRect(),[X,Y]=W2S(x,y);
  return{X:X+b.left,Y:Y+b.top,L:b.left,T:b.top,W:VW,H:VH,vx:view.x,n:R.F.filter(f=>f.cell===ed&&f.nat==='Astria'&&!fallen(f)&&f.show!==false&&!f.civ).length}`);
 await p.mouse.move(r.X-60,r.Y-60);await p.mouse.down();await p.mouse.move(r.X+60,r.Y+60,{steps:6});await p.mouse.up();
 let q=await J(`return{sel:SELS.size,vx:view.x}`);ok('left drag on open ground boxes forces',q.sel>0,q.sel);ok('left drag does not pan',Math.abs(q.vx-r.vx)<1);
 await p.keyboard.down('Space');await p.mouse.move(r.X,r.Y);await p.mouse.down();await p.mouse.move(r.X+80,r.Y,{steps:5});await p.mouse.up();await p.keyboard.up('Space');
 q=await J(`return{vx:view.x,slow:typeof slowMo!=='undefined'?slowMo:null}`);ok('Space and drag pans',Math.abs(q.vx-r.vx-80)<2,(q.vx-r.vx).toFixed(1));ok('Space on the region does not slow time',!q.slow);
 const v0=await J(`return view.x`);await p.mouse.move(r.L+r.W/2,r.T+r.H/2);await p.mouse.move(r.L+4,r.T+r.H/2,{steps:3});await p.waitForTimeout(400);const v1=await J(`return view.x`);await p.mouse.move(r.L+r.W/2,r.T+r.H/2);
 ok('cursor at the left edge scrolls the map',v1-v0>20,(v1-v0).toFixed(0));
 const y1=await J(`return view.x`);await p.waitForTimeout(300);const y2=await J(`return view.x`);ok('scrolling stops off the edge',y1===y2);

 await J(`FREE=true;return 1`);
 r=await J(`const f=R.F.find(f=>f.nat==='Hoverlands'&&soldiers(f)&&!inMap(f));R.cur='Astria';const far=[...reach(f).entries()].reduce((a,[c,o])=>Math.max(a,o.d),0);return{far}`);ok('with turn rules off any nation marches without a limit',r.far>2,r.far);
 // spawner: a nation and a kind, then a click on a cell
 r=await J(`open();BT=null;drawBT();SELS.clear();setTool('spawn');snat='Lindale'in NATS?'Lindale':'Whitecoast';sk='guard';spawnUI();const c=near([BURG.Templewood.x,BURG.Templewood.y]),[wx,wy]=cellXY(c);view.k=2;view.x=VW/2-wx*2;view.y=VH/2-wy*2;draw();const[x,y]=W2S(wx,wy),b=cv.getBoundingClientRect();return{x:x+b.left,y:y+b.top,c,n0:R.F.length}`);
 await p.mouse.click(r.x,r.y);q=await J(`const f=R.F[R.F.length-1];setTool('cmd');return{n:R.F.length,cell:f.cell,nat:f.nat,t:f.t,tier:f.tier,men:f.men.length,k:f.men[0].k}`);
 ok('spawner places a squad where clicked',q.n===r.n0+1&&q.cell===r.c&&q.tier==='guard'&&q.men===8,JSON.stringify(q));
 r=await J(`SELS.clear();const b=cv.getBoundingClientRect();return{x:b.left+VW/2,y:b.top+VH/2,vx:view.x}`);await p.mouse.move(r.x,r.y);await p.mouse.down({button:'right'});await p.mouse.move(r.x+90,r.y,{steps:5});await p.mouse.up({button:'right'});
 q=await J(`return{vx:view.x}`);ok('right drag pans with nothing selected',Math.abs(q.vx-r.vx-90)<2,(q.vx-r.vx).toFixed(0));
 r=await J(`const a='Astria',o='Hoverlands';R.rel[relKey(a,o)]='war';const f=R.F.find(f=>f.nat===a&&soldiers(f)&&!inMap(f)),c=D.cells.findIndex((x,i)=>OWN[i]===o&&land(x)&&!seatCell(i));const c0=f.cell;f.cell=c;const on=occMap()[c];R.rel[relKey(a,o)]='peace';const off=occMap()[c];f.cell=c0;return{on,off}`);
 ok('enemy soldiers at war mark a cell occupied',r.on==='Astria'&&!r.off,JSON.stringify(r));

 // everything survives a reload
 const before=await J(`save();return{pp:R.PP.length,fallen:R.fallen,own:OWN.filter(x=>x==='Astria').length}`);
 await p.reload();await p.waitForTimeout(2500);
 r=await J(`return{pp:R.PP.length,fallen:R.fallen,own:OWN.filter(x=>x==='Astria').length,rul:R.PP.filter(p=>p.ruler).length}`);
 ok('court kept across reload',r.pp===before.pp,before.pp+' → '+r.pp);ok('capitulation kept',JSON.stringify(r.fallen)===JSON.stringify(before.fallen));ok('conquests kept',r.own===before.own,before.own+' → '+r.own);

 fs.unlinkSync(f);ok('no page errors',!errs.length,errs.slice(0,4).join(' | '));console.log(fails?fails+' failed':'all passed');await b.close();process.exit(fails?1:0)})();
