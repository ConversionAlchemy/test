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
  moveF(f,c);const held=p.nat===o;d.men[0].dead=1;capture(f);const flip=p.nat===a,gov=R.PP.some(q=>q.cell===c&&q.nat===o),own=p.c.every(x=>OWN[x]===a);
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

 // everything survives a reload
 const before=await J(`save();return{pp:R.PP.length,fallen:R.fallen,own:OWN.filter(x=>x==='Astria').length}`);
 await p.reload();await p.waitForTimeout(2500);
 r=await J(`return{pp:R.PP.length,fallen:R.fallen,own:OWN.filter(x=>x==='Astria').length,rul:R.PP.filter(p=>p.ruler).length}`);
 ok('court kept across reload',r.pp===before.pp,before.pp+' → '+r.pp);ok('capitulation kept',JSON.stringify(r.fallen)===JSON.stringify(before.fallen));ok('conquests kept',r.own===before.own,before.own+' → '+r.own);

 fs.unlinkSync(f);ok('no page errors',!errs.length,errs.slice(0,4).join(' | '));console.log(fails?fails+' failed':'all passed');await b.close();process.exit(fails?1:0)})();
