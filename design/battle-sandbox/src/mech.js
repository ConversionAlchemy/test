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
// when an enemy slips out of sight, a soft streak at the spot points the way they were heading, longer the faster they moved, fading over ~2.5 s
function trackTick(){if(tick%6)return;for(const b of bodies)if(b.type==='token'){b.trk=b.trk||[];b.trk.push([b.x,b.y]);if(b.trk.length>3)b.trk.shift()}}
function lostSight(o){const h=o.trk&&o.trk[0];if(!h)return;const dx=o.x-h[0],dy=o.y-h[1],v=Math.hypot(dx,dy);if(v<2)return;STRK.push({x:o.x,y:o.y,ux:dx/v,uy:dy/v,L:Math.min(26,6+v*1.2),t:tick})}
function drawStreaks(){STRK=STRK.filter(z=>tick-z.t<150);for(const z of STRK){const a=1-(tick-z.t)/150;for(let s=0;s<z.L;s+=.5){const f=s/z.L,w=Math.round(2*(1-f)),X0=z.x+z.ux*s,Y0=z.y+z.uy*s;
  for(let k=-w;k<=w;k++){const X=Math.round(X0-z.uy*k),Y=Math.round(Y0+z.ux*k);if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;out[j]=mix(out[j],rgb(176,112,100),.55*a*(1-f*.7)*(1-Math.abs(k)/(w+1)))}}}}
{const u0=update;update=function(){u0();trackTick()}}
{const r0=reset;reset=function(){r0();STRK=[]}}
