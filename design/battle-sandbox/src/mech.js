// Rotating pillars: each listed pillar carries one arm of wall that swings a quarter turn clockwise on a shared 18 s cycle while the clock runs; 2 s of grinding dust warn first
const MECH={pits:[[6,8,0],[13,13,2],[13,8,1],[6,13,3]]},MDIR=[[1,0],[0,1],[-1,0],[0,-1]],MCYC=1080,MWARN=120,MFLOOR='earth.dirt.worn';
let MECHS=null,MT=0;
const mechCell=(m,d)=>[m.x+MDIR[d][0],m.y+MDIR[d][1]];
function mechSet(m,d,on){const[cx,cy]=mechCell(m,d),s=srcNow(),k=on?m.k:MFLOOR;s[cy][cx]=k;paintCell(cx,cy,k);
 if(on)for(const b of bodies){if(b.type!=='token'&&b.type!=='weapon'||(b.x/T|0)!==cx||(b.y/T|0)!==cy)continue;b.x+=MDIR[d][0]*18;b.y+=MDIR[d][1]*18;b.vx+=MDIR[d][0];b.vy+=MDIR[d][1]}}
function mechBuild(){MECHS=null;MT=0;const L=MECH[curMap];if(!L)return;MECHS=L.map(([x,y,d])=>({x,y,d,k:map[y][x]}));for(const m of MECHS)mechSet(m,m.d,true);solDirty=true;NAVD=true}
function mechTick(){if(!MECHS||!aiOn||EM)return;MT++;const ph=MT%MCYC;
 if(ph>=MCYC-MWARN&&ph%20===0){for(const m of MECHS){const[cx,cy]=mechCell(m,(m.d+1)%4);puff(cx,cy,m.k)}sfx('creak')}
 if(ph===0){for(const m of MECHS){mechSet(m,m.d,false);m.d=(m.d+1)%4;mechSet(m,m.d,true)}solDirty=true;NAVD=true;fxDirty=true;sfx('thunk');shake=Math.max(shake,2)}}
{const r0=reset;reset=function(){r0();setTimeout(mechBuild,0)}}
{const u0=update;update=function(){u0();mechTick()}}
