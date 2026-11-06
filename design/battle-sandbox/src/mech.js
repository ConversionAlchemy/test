// Rising pillars: diagonal pairs swap every 9 s while the clock runs, one pair sinking flush with the floor as the other rises, so two always stand; 2 s of shaking and grinding warn first
const MECH={pits:[[6,8,1],[13,13,1],[13,8,0],[6,13,0]]},MCYC=540,MWARN=120,MDOWN='stone.grey.rubble';
let MECHS=null,MT=0;
function mechSet(m,up){const s=srcNow(),k=up?m.k:MDOWN;m.up=up;s[m.y][m.x]=k;paintCell(m.x,m.y,k);
 // a pillar rising under someone shoves them clear
 if(up)for(const b of bodies){if(b.type!=='token'&&b.type!=='weapon'||Math.abs(b.x-(m.x*T+8))>14||Math.abs(b.y-(m.y*T+8))>14)continue;const dx=b.x-(m.x*T+8),dy=b.y-(m.y*T+8),l=Math.hypot(dx,dy)||1;b.x=m.x*T+8+dx/l*19;b.y=m.y*T+8+dy/l*19;b.vx+=dx/l;b.vy+=dy/l}}
function mechBuild(){MECHS=null;MT=0;VIB=[];const L=MECH[curMap];if(!L)return;MECHS=L.map(([x,y,u])=>({x,y,k:map[y][x],up:true}));L.forEach(([,,u],i)=>{if(!u)mechSet(MECHS[i],false)});solDirty=true;NAVD=true}
function mechTick(){if(!MECHS||!aiOn||EM){VIB=[];return}MT++;const ph=MT%MCYC;
 VIB=ph>=MCYC-MWARN?MECHS.map(m=>[m.x,m.y,m.up]):[];
 if(ph>=MCYC-MWARN&&ph%24===0){for(const m of MECHS)puff(m.x,m.y,m.k);sfx('creak')}
 if(ph===0){for(const m of MECHS)mechSet(m,!m.up);solDirty=true;NAVD=true;fxDirty=true;sfx('thunk');shake=Math.max(shake,2)}}
// shaking: the cell's pixels jitter a pixel side to side
function vibCells(){const dx=(tick>>1)&1?1:-1;for(const[cx,cy]of VIB){for(let y=0;y<T;y++){const r=(cy*T+y)*W+cx*T,row=out.slice(r,r+T);for(let x=0;x<T;x++){const sx=x-dx;if(sx>=0&&sx<T)out[r+x]=row[sx]}}}}
{const r0=reset;reset=function(){r0();setTimeout(mechBuild,0)}}
{const u0=update;update=function(){u0();mechTick()}}
