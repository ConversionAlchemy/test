// Melee test for the Pits: spear jab (click) and throw (hold), sword jab (click, held keeps jabbing) and slash (F), shields worn on the off side and raised by holding right-click
WP.sword={n:'Sword',sharp:1,melee:1,fr:.98,max:24,m:1,tip:10,hide:1};// swords paused
WP.pbox={n:'Shot',hide:1,fr:.8,max:10,m:1};
WP.shield.n='Iron shield';delete WP.shield.hide;
WP.wshield={n:'Wooden shield',fr:.9,max:16,m:1.4,tip:1};HOFF.wshield=9;
var MREACH={spear:26,sword:20};
var SHK=new Set(['shield','wshield']),SHOK=new Set(['pistol','sword','spear','sspear','grenade','bomb','pot','sbomb']);
function shCap(it){return it.k==='wshield'?3:7}
// sim draws bodies before this file has run, so these are hoisted and wait for SHK
function offShield(b){return!!SHK&&b.type==='token'&&b.status!=='dead'&&b.inv&&(!b.held||SHOK.has(b.held.k))?b.inv.find(z=>z&&z!==b.held&&SHK.has(z.k))||null:null}
function shOf(o){if(o.type!=='token')return null;if(o.held&&SHK.has(o.held.k))return{it:o.held,hp:heldPix(o)};const it=offShield(o);return it?{it,hp:shieldPix(o)}:null}
// 13 by 3 pixels: along the flank when lowered, across the front when raised
function shieldPix(b){const it=offShield(b);if(!it)return[];const c=Math.cos(b.ang),s=Math.sin(b.ang),ss=sideOf(b)>0?-1:1,up=!!b.shUp,dm=it.dmg||{},cap=shCap(it),wd=it.k==='wshield',bx=Math.round(b.x),by=Math.round(b.y),r=[];let i=0;
 for(let t=0;t<3;t++)for(let u=-6;u<=6;u++,i++){if((dm[i]||0)>=cap)continue;const f=up?10+t:u*.9,l=up?u+ss*2:ss*(8+t),edge=Math.abs(u)===6||t===2;
  let col=wd?(edge?C.woodD:u&1?C.wood:C.woodH):(edge?C.ironD:Math.abs(u)<=1&&t===1?C.ironH:C.iron);if(dm[i])col=mul(col,1-dm[i]/cap*.4);
  r.push([bx+Math.round(c*f-s*l),by+Math.round(s*f+c*l),col,i])}
 return r}
function jab(b){if(b.jab||b.slashT||!b.held||!MREACH[b.held.k]&&b.held.k!=='sspear'||(b.atkT||0)>tick||b.status!=='free')return;b.jab=1;b.atkT=tick+14;sfx('whoosh')}
function slash(b){if(b.jab||b.slashT||!b.held||b.held.k!=='sword'||(b.atkT||0)>tick||b.status!=='free')return;b.slashT=1;b.slashDir=-(b.slashDir||1);b.atkT=tick+10;sfx('swish')}
// AI with a blade: strike in reach, otherwise the move-in happens in the AI loop; spearmen sometimes throw from range
function aiMelee(b,tg,a,td){const k=b.held.k,R=MREACH[k];
 if(td<=R+4){if(k==='sword'&&(UNITS[tg.unit].arm>=2||Math.random()<.3))jab(b);else if(k==='sword')slash(b);else jab(b);a.cd=24+(Math.random()*20|0);return}
 if(k==='spear'&&td>80&&td<130&&Math.random()<.05){fire(b,tg.x,tg.y);a.cd=60;return}a.cd=6}
function meleeTick(){for(const b of bodies){if(b.type!=='token')continue;
  if(b.jab){b.jab++;b.lunge=12*Math.sin(Math.PI*(b.jab-1)/6);if(b.jab>=7){b.jab=0;b.lunge=0}}
  if(b.slashT){b.slashT++;const p=(b.slashT-1)/5;b.swA=b.slashDir*(1.3-2.6*p);if(b.slashT>=6){b.slashT=0;b.swA=0}}
  if(jabHold&&sel.has(b)&&b.held&&b.held.k==='sword'&&!EM)jab(b);
  if(b.ai&&aiOn&&!b.direct&&!sel.has(b)&&b.status==='free'&&offShield(b)){const tg=b.ai.tg&&b.ai.tg.status==='free'?b.ai.tg:null,td=tg?Math.hypot(tg.x-b.x,tg.y-b.y):1e9,gun=tg&&tg.held&&WP[tg.held.k].gun,mr=b.held&&MREACH[b.held.k]||0;
   const up=!!tg&&!b.jab&&!b.slashT&&(gun?td>mr+6:td<44&&(b.atkT||0)<tick+4)&&(!b.held||!WP[b.held.k].gun||b.ai.cd>20||!(b.held.ammo>0));if(b.shUp&&!up)b.shDown=tick;b.shUp=up}
  else if(b.status!=='free')b.shUp=false}}
{const u0=update;update=function(){u0();meleeTick()}}
// raising the shield is a held right-click on the fighter you're driving (in sim's pointer handlers)
// walking over shot refills your pistol; walking over a shield takes it if it beats yours (iron over wood, then the less damaged), dropping the old one
function pitPick(){const val=it=>(it.k==='shield'?100:50)-Object.values(it.dmg||{}).reduce((s,v)=>s+v,0);
 for(const t of bodies){if(t.type!=='token'||t.status!=='free'||!t.inv)continue;
  for(const w of [...bodies]){if(w.type!=='weapon'||w.att||w.stuck||(w.noPick&&w.noPick>tick)||Math.hypot(w.vx,w.vy)>.3||Math.hypot(w.x-t.x,w.y-t.y)>13)continue;
   if(w.kind==='pbox'){if(addRes(t,'pistol',RCAP('pistol'))){remove(w);sfx('reload')}continue}
   if(!SHK.has(w.kind))continue;const nw={k:w.kind,dmg:w.dmg},i=t.inv.findIndex(z=>z&&SHK.has(z.k));
   if(i<0){const j=t.inv.findIndex((z,j)=>!z&&j>=2&&slotOK(t,j));if(j>=0){t.inv[j]=nw;remove(w);sfx('flick')}continue}
   if(val(nw)>val(t.inv[i])){const old=t.inv[i];t.inv[i]=nw;remove(w);const d=weapon(old.k,t.x,t.y,t.ang);d.dmg=old.dmg;d.noPick=tick+90;sfx('flick')}}}}
{const a0=autoPick;autoPick=function(){a0();pitPick()}}
