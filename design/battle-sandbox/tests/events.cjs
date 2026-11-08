// Material events smoke test: hits, debris, heat and blasts on every class, doors shot apart, lances into walls, then the wand repairing every damaged cell, on every map; fails on any page error. Run: node tests/events.cjs
const {chromium}=require(process.env.PW||'playwright'),fs=require('fs'),path=require('path');
(async()=>{const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8'),i=html.lastIndexOf('})();'),f=path.join(__dirname,'.events.html');fs.writeFileSync(f,html.slice(0,i)+'window.__T=x=>eval(x);\n'+html.slice(i));
 const b=await chromium.launch(),p=await b.newPage({viewport:{width:1400,height:900}});const errs=[];p.on('pageerror',x=>errs.push(x.message));await p.goto('file://'+f);await p.waitForTimeout(1500);
 const T=s=>p.evaluate(s=>window.__T(s),s);
 for(const m of ['bank','council','alley','stock','vault','range','road','circuit']){const r=await T(`(()=>{goMap('${m}');mute=true;
  for(const n of[1,2,3,4]){hitParts(60,60,n,1,0);hitFx(60,60,n,1,0);chipC(n,0)}for(const c in CLS)heatTint(rgb(120,110,100),c,.5,3,4);
  const ds=bodies.filter(o=>o.type==='slab');for(const d of ds.slice(0,4)){explode(d.x+6,d.y+6,.8);for(const q of [...d.set.values()].slice(0,4))damagePixel(Math.round(d.x)+q[8],Math.round(d.y)+q[9],99,1,0)}
  for(let i=0;i<16;i++){const x=40+Math.random()*(W-80),y=40+Math.random()*(H-80);heatMark(x,y,10,.95);carve(x,y,4,3,1,0)}
  const t=bodies.find(o=>o.type==='token');if(t)for(const k of['rod','ball']){const w=weapon(k,t.x,t.y,Math.random()*6.28);w.vx=Math.cos(w.ang||0)*9;w.vy=Math.sin(w.ang||0)*9}
  for(let i=0;i<200;i++)update();let wd=0;for(let y=0;y<CH;y++)for(let x=0;x<CW;x++)if(cellBad(x,y)){repairCell(x,y);wd++}for(let i=0;i<5;i++)update();render();return ds.length+' wand '+wd})()`);console.log(m,'doors',r)}
 fs.unlinkSync(f);console.log(errs.length?'FAIL '+errs.slice(0,5).join(' | '):'ok');await b.close();process.exit(errs.length?1:0)})();
