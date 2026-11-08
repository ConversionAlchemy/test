// damage: pixels, cuts, blasts, blades, arcs, shots, lances, armour
function mkLabel(b){const l=b.lab=document.createElement('div');l.className='lab';l.textContent=b.name;l.oncontextmenu=e=>{e.preventDefault();openMenu(b,e)};l.onpointerdown=e=>{if(e.button===0){e.stopPropagation();if([...sel].some(o=>o.direct)){boardDown(e);return}clickBody(b,e.ctrlKey||e.metaKey)}};stage.appendChild(l)}
function remove(b){if(b.snd){b.snd.stop();b.snd=null}bodies=bodies.filter(o=>o!==b);if(b.lab)b.lab.remove();if(drag&&drag.b===b)drag=null;sel.delete(b);if(hover===b)hover=null}

// geometry
function markSlabs(){slabG.fill(0);if(VOB)VOB.fill(0);for(const v of VEH)vMark(v);for(const b of bodies)if(b.type==='slab'&&!b.fallen&&!(!b.free&&Math.abs(b.ang)>.2)){const bx=Math.round(b.x),by=Math.round(b.y);for(const p of b.px){const X=bx+p[0],Y=by+p[1];if(X>=0&&Y>=0&&X<W&&Y<H)slabG[Y*W+X]=b.id}}}
function solidHits(b,ox,oy){const bx=Math.round(b.x+ox),by=Math.round(b.y+oy),tk=b.type==='token';let h=null;
 for(const p of b.px){if(tk&&p[0]*p[0]+p[1]*p[1]>45)continue;const X=bx+p[0],Y=by+p[1];if(X<0||Y<0||X>=W||Y>=H){(h||(h=[])).push([X,Y]);continue}const j=Y*W+X;if(sol[j]||(slabG[j]&&slabG[j]!==b.id)||tk&&(OBJ[j]||VOB&&VOB[j]))(h||(h=[])).push([X,Y])}return h}
const byId=id=>bodies.find(o=>o.id===id)||VEH.find(o=>o.id===id);
function matAt(X,Y){if(X<0||Y<0||X>=W||Y>=H)return 1;const j=Y*W+X;if(sol[j])return sol[j];const s=slabG[j]&&byId(slabG[j]);return s?s.mat:0}
function bodyAt(X,Y,r=1,skip,filter){for(let i=bodies.length-1;i>=0;i--){const b=bodies[i];if(b===skip||(filter&&!filter(b))||(!filter&&b.status==='dead'))continue;const bx=Math.round(b.x),by=Math.round(b.y);for(let j=-r;j<=r;j++)for(let k=-r;k<=r;k++)if(b.set.has(K(X+k-bx,Y+j-by)))return b}
 if(filter)return null;for(const b of bodies)if(b.held&&heldPix(b).some(p=>Math.abs(p[0]-X)<=r&&Math.abs(p[1]-Y)<=r))return b;return null}
function doorPart(d,X,Y){if(d.fallen||d.free||d.veh)return;const p=d.set.get(K(X-Math.round(d.x),Y-Math.round(d.y)));const dl=d.len||16,dt=d.th||8;if(!p||p[9]<-(dt>>1)-2||p[9]>-(dt>>1)+1)return;
 if(p[8]<=4){d.fallen=true;for(let i=0;i<8;i++)spark(X,Y,rgb(150,152,156),0,0,2.4);sfx('drop');sfx(snd('metal','hit'));return}
 if(p[8]>=dl-6&&p[8]<=dl-3&&!d.lockBroken){d.lockBroken=true;for(const q of d.pair?[d,d.pair]:[d]){q.locked=false;if(!q.fallen&&q.ang===0&&q.tgt===0)q.tgt=openDir(q)}if(d.pair)d.pair.lockBroken=true;for(let i=0;i<8;i++)spark(X,Y,rgb(240,140,40),0,0,2.4);sfx(snd('metal','hit'));sfx('door')}}
function rubble(j){const c=scol[j];floor[j]=Math.random()<.3?mul(c,.32):mul(c,.5)}
function hitPix(o,X,Y,pow){const k=K(X-Math.round(o.x),Y-Math.round(o.y)),p=o.set.get(k);if(!p)return 0;p[3]-=pow;if(p[3]<=0){o.set.delete(k);if(p[7]==='h'||p[7]==='k')o.coreHit=true;return 2}return 1}
function settle(o){if(o.veh){vSettle(o);return}o.px=o.px.filter(p=>o.set.has(K(p[0],p[1])));if(o.type!=='slab'){split(o);return}if(!o.px.length){remove(o);return}if(o.fallen)return;
 const seen=new Set(),comps=[];for(const p of o.px){const k=K(p[0],p[1]);if(seen.has(k))continue;const cp=[],q=[p];seen.add(k);while(q.length){const c=q.pop();cp.push(c);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const kk=K(c[0]+dx,c[1]+dy),z=o.set.get(kk);if(z&&!seen.has(kk)){seen.add(kk);q.push(z)}}}comps.push(cp)}
 const hinge=o.free?comps.reduce((a,c)=>c.length>a.length?c:a):comps.find(cp=>cp.some(p=>p[8]<=1));
 if(!hinge){o.fallen=true;sfx('drop');return}
 if(comps.length<2)return;o.px=hinge;mkSet(o);
 for(const cp of comps)if(cp!==hinge){const f={id:uid++,type:'slab',mat:o.mat,x:o.x,y:o.y,vx:0,vy:0,rot:o.rot,ang:o.ang,tgt:o.ang,fallen:true,mass:9,px:cp};mkSet(f);bodies.push(f);sfx('drop')}}
function damagePixel(X,Y,pow,dx=0,dy=0){if(X<1||Y<1||X>=W-1||Y>=H-1)return 1;const j=Y*W+X;
 if(sol[j]){const m=sol[j];if(shp[j]>pow){shp[j]-=pow;scol[j]=mul(scol[j],.9);wallHit(X,Y,.25);return m}sol[j]=0;solDirty=true;NAVD=true;rubble(j);wallHit(X,Y,1);if(Math.random()<.45)spark(X,Y,scol[j],dx,dy);return m}
 const s=slabG[j]&&byId(slabG[j]);if(s){doorPart(s,X,Y);const r=hitPix(s,X,Y,pow);if(s.veh)vScar(s,X,Y,Math.min(1.2,pow*.15));if(r===2){slabG[j]=0;if(Math.random()<.5)spark(X,Y,chipC(s.mat,C.iron),dx,dy);settle(s)}return s.mat}return 0}
function carve(cx,cy,r,pow,dx,dy){const R=Math.ceil(r*1.7)+1;for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const X=Math.round(cx+i),Y=Math.round(cy+j),m=matAt(X,Y);if(!m)continue;const rm=r*hcl(m).carve;if(Math.hypot(i,j)+hh(X,Y,4)*1.2>rm)continue;damagePixel(X,Y,pow,dx,dy)}}
let BLU=false;const swb=c=>{const r=c&255,g=c>>8&255,b=c>>16&255;return b>=r&&b>g+30?rgb(g,r,b):c};
function spark(x,y,c,dx=0,dy=0,sp=2.2,life,mn=0){if(BLU)c=swb(c);if(parts.length>1200)return;const a=Math.random()*6.283,s=sp*(mn+(1-mn)*Math.random());parts.push({x,y,vx:Math.cos(a)*s-dx*.35,vy:Math.sin(a)*s-dy*.35,c,life})}
function dab(a,px,py,amt=1,R=8){for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){const X=Math.floor(px/2+i),Y=Math.floor(py/2+j);if(X<0||Y<0||X>=BW||Y>=BH)continue;const d=Math.hypot(i,j)/R;if(d>1)continue;a[Y*BW+X]=Math.min(4,a[Y*BW+X]+amt*(1-d)*(0.55+0.45*hh(X,Y,R)))}fxDirty=true}

// colours
const glow=h=>h>.6?mix(rgb(242,122,40),rgb(255,232,160),Math.min(1,(h-.6)/.5)):h>.25?mix(rgb(150,34,16),rgb(242,122,40),(h-.25)/.35):rgb(150,34,16);
const frontOf=(o,p)=>p[8]*Math.cos(o.ang||0)+p[9]*Math.sin(o.ang||0)>Math.hypot(p[8],p[9])*.7;
function drawCape(b,lift){const a=b.ang||0,c=Math.cos(a),s=Math.sin(a),bx=Math.round(b.x),by=Math.round(b.y),o=lift?3:0,da=Math.abs(Math.atan2(Math.sin(a-(b.capeA0??a)),Math.cos(a-(b.capeA0??a))));b.capeA0=a;
 b.capeS=(b.capeS||0)+(((b.mv>0?1:0)+Math.min(1,da*10))-(b.capeS||0))*.08;const sw=b.capeS*1.1*Math.sin(tick*.18+b.id);
 for(let f=-10;f<=-5;f+=.5)for(let u=-6.5;u<=6.5;u+=.5){const uu=u+sw*(-5-f)/5,X=Math.round(bx+c*f-s*uu)+o,Y=Math.round(by+s*f+c*uu)+o;if(X<0||Y<0||X>=W||Y>=H||b.set.has(K(X-bx-o,Y-by-o)))continue;
  let col=mul(rgb(42,94,62),.8+.2*Math.cos(u*1.4));if(Math.abs(u)>6||f<-9.5)col=mul(col,.6);if(b.status==='dead')col=grey(col);out[Y*W+X]=col}}
const cape=(ox,oy)=>{const v=vn(ox/2,oy*1.5,77);return mul(rgb(42,94,62),.82+v*.3)};
function pcol(b,p){const c=pcol0(b,p);return c&&b.wear&&b.type==='token'?uWear(b,p,c):c}
// worn armour, in the unit's own frame so marks turn with it: aged metal, scuffs, dents, heat and soot, chips off the rim. age runs 0 fresh to 3 battleworn and grows with use;
// hits dent, blasts soot and heat, fire scorches, all through the armour's metal in the material table. Some veterans go bare-headed
const uMetal=b=>(UNITS[b.unit]||{}).metal||'steel';
// a metal's shine from the material table, by name
const MSH=new Map(),metShine=m=>{let v=MSH.get(m);if(v===undefined){v=ELEM.Metal.mats[m]?mprop('Metal',m).shine||60:70;MSH.set(m,v)}return v};
function uMarks(b){const W=b.wear||(b.wear={lv:0,seed:b.id*13});if(W.age==null)W.age=W.lv||0;if(!W.marks){const lv=W.lv||0;let z=(W.seed||0)*9301+49297;const r=()=>(z=(z*9301+49297)%233280)/233280,pt=k=>[(r()-.5)*10,(r()-.5)*10,k];
  W.marks={dents:Array.from({length:[0,0,1,2][lv]},()=>pt(2.5+r())),heat:Array.from({length:[0,0,r()<.5?1:0,2][lv]},()=>[...pt(2.5+r()*1.5),.45+r()*.4]),soot:Array.from({length:[0,0,1,3][lv]},()=>[...pt(3+r()*2),.5+r()*.25])}}return W}
// a mark at a world point on the unit, kept to a handful of each kind (the oldest goes)
function uMark(b,kind,X,Y,r,k){if(b.type!=='token')return;const W=uMarks(b),a=b.ang||0,dx=X-b.x,dy=Y-b.y,fa=dx*Math.cos(a)+dy*Math.sin(a),sa=-dx*Math.sin(a)+dy*Math.cos(a),L=W.marks[kind==='dent'?'dents':kind];
 const near=L.find(m=>Math.hypot(m[0]-fa,m[1]-sa)<r*.7);if(near){if(kind==='dent')near[2]=Math.min(4,near[2]+.4);else near[3]=Math.min(.85,near[3]+k*.5)}else{L.push(kind==='dent'?[fa,sa,r]:[fa,sa,r,k]);if(L.length>8)L.shift()}W.v=(W.v||0)+1}
// a blast nearby: soot and heat on the side that faced it
function uBlast(x,y,s){for(const b of bodies){if(b.type!=='token'||b.status==='dead')continue;const d=Math.hypot(b.x-x,b.y-y);if(d>34*s)continue;const a=Math.atan2(y-b.y,x-b.x),k=1-d/(34*s);uMark(b,'soot',b.x+Math.cos(a)*5,b.y+Math.sin(a)*5,3.5+2*k,.35+.4*k);if(d<18*s)uMark(b,'heat',b.x+Math.cos(a)*5,b.y+Math.sin(a)*5,3,.5*k);uMarks(b).age=Math.min(3,b.wear.age+.15*k)}}
// hard use: distance marched slowly ages the armour
function uUse(){for(const b of bodies){if(b.type!=='token'||b.status==='dead')continue;const lx=b.ux??b.x,ly=b.uy??b.y;b.ux=b.x;b.uy=b.y;const d=Math.hypot(b.x-lx,b.y-ly);if(d<1)continue;b.uw=(b.uw||0)+d;if(b.uw>3000){b.uw=0;const W=uMarks(b);if(W.age<3){W.age=Math.min(3,W.age+.05);W.v=(W.v||0)+1}}}}
function uWear(b,p,c0){const W=b.wear,ag=W.age??W.lv??0,lv=Math.floor(ag),sd=W.seed||0;uMarks(b);
 const ox=p[8],oy=p[9],a=b.ang||0,fa=ox*Math.cos(a)+oy*Math.sin(a),sa=-ox*Math.sin(a)+oy*Math.cos(a),d=Math.hypot(ox,oy),u=Math.round(fa),v=Math.round(sa),n=hh(u+40,v+40,sd),n2=hh(u+40>>1,v+40>>1,sd+3);
 if(W.bare&&d<3.6){if(d>2.7&&fa>0||d>3.1)return mul(rgb(198,152,120),fa>0?1:.85);return mul(W.hair||rgb(96,70,52),.75+.4*hh(Math.round(fa*2),v,sd+9))}
 if(lv>=3&&d>6.6&&n<.12)return 0;
 const R=c0&255,G=c0>>8&255,B=c0>>16&255,lum=(R*.3+G*.59+B*.11)/255;let c=c0;
 if(Math.max(R,G,B)-Math.min(R,G,B)<30&&lum>.2){if(ag>.2&&n2>1-ag*.27){const A=ageOf('Metal',uMetal(b),ag>=2.5?1:ag>=1.5?2:3);if(A){const q=A([R,G,B],u*3+sd,v*3,()=>9);c=rgb(cl(q[0]),cl(q[1]),cl(q[2]))}}
  if(ag>=2&&n>.9)c=mix(c,rgb(236,238,242),.35);
  for(const[dx,dy,r]of W.marks.dents){const e=Math.hypot(fa-dx,sa-dy);if(e<r)c=mul(c,1+.22*((fa-dx)+(sa-dy))/r*(1-e/r))}
  for(const[dx,dy,r,k]of W.marks.heat){const e=Math.hypot(fa-dx,sa-dy)/r;if(e<1)c=heatTint(c,'metal',k*(1-e))}}
 else{if(ag>=2&&n2>.55)c=mul(c,.82);if(n>1-ag*.075-.0001&&ag>.5)c=mix(c,rgb(150,150,156),.2)}
 for(const[dx,dy,r,k]of W.marks.soot){const e=Math.hypot(fa-dx,sa-dy)/r;if(e<1)c=mix(c,rgb(26,24,22),k*(1-e*e)*(.6+.6*n))}
 return lv>=3&&d>5.8&&n<.22?mul(c,.55):c}
function pcol0(b,p){let c;const r=p[7],ox=p[8],oy=p[9],u=UNITS[b.unit]||UNITS.civ;
 if(b.type==='token'){const q=sprAt(b,p);if(q!==undefined){if(!q)return 0;c=neutralTone(b,r==='x'?mul(q[0],.7):q[0],p);if(p[3]<p[6])c=mul(c,.6+.4*p[3]/p[6]);if(p[5]>.01)c=mix(c,glow(p[5]),Math.min(1,p[5]*1.6));return c}}
 if(r==='x'||b.type==='weapon'){c=p[2];const hw=b.long?15:5;if(b.kind==='crate'&&b.metal&&!(b.open&&Math.abs(ox)<hw&&Math.abs(oy)<5))c=mix(grey(c),rgb(152,158,170),.45);if(b.kind==='crate'&&b.open&&Math.abs(ox)<hw&&Math.abs(oy)<5)c=Math.abs(ox)===hw-1||Math.abs(oy)===4?mul(C.woodD,.75):(oy+5)%3===0?mul(C.woodD,.45):mul(C.woodD,.6);const sth=b.th||8,sln=b.len||16;if(b.type==='slab'&&!b.free&&ox>=0&&oy>=-(sth>>1)-1&&oy<=-(sth>>1)){if(ox>=1&&ox<=2)c=hcl(b.mat).metal?rgb(62,64,70):rgb(170,172,176);else if(ox>=sln-5&&ox<=sln-4&&!b.lockBroken)c=b.locked?rgb(240,140,40):rgb(150,92,44)}}
 else if(r==='a'){if(u.leather){c=u.ac;const v=hh(ox,oy,3);c=mul(c,.96+v*.08);if(ox+oy<-5)c=mul(c,1.14);else if(ox+oy>5)c=mul(c,.84)}else{const q=metalCore(ox*2+b.id*13,oy*2),d=Math.hypot(ox,oy);const gb=b.nat==='Goldbank';c=gb?mix(rgb(cl(q[0]),cl(q[1]),cl(q[2])),b.unit==='shock'?rgb(178,140,64):b.unit==='guard'?rgb(222,186,96):rgb(200,164,84),.66):mix(rgb(cl(q[0]),cl(q[1]),cl(q[2])),u.ac,u.dark?.75:.45);c=mul(c,1+(-(ox+oy)/16)*(u.dark?.12:.22));if(d>7.8)c=mul(c,.72);else if(d>7.4-u.arm+.6&&d<7.4-u.arm+1.4)c=mul(c,1.12)}
  const fa=ox*Math.cos(b.ang||0)+oy*Math.sin(b.ang||0),sa=-ox*Math.sin(b.ang||0)+oy*Math.cos(b.ang||0);
  if(u.rivet&&hh(ox,oy,21)>.86)c=b.nat==='Goldbank'?rgb(250,226,150):rgb(201,164,70);
  if(u.seg&&b.nat==='Goldbank'){if(fa<-2)c=cape(ox,oy);else{if(Math.abs(Math.round(fa*1.2)%3)===0)c=mul(c,.72);if(Math.abs(sa)<.6)c=mul(c,1.18)}}
  else{if(u.seg&&(ox===0||oy===0||Math.abs(ox)===Math.abs(oy)))c=mul(c,.68);if(u.seg&&hh(ox,oy,22)>.9)c=mul(c,1.35);if(u.seg&&fa<-2)c=mul(UNITS.guard.ac,(.9+hh(ox,oy,3)*.08)*(ox+oy<-5?1.08:ox+oy>5?.86:1))}}
 else if(r==='f')c=frontOf(b,p)?mul(u.ac,hh(ox,oy,5)>.8?1.6:1.3):mul(natc(b),u.dark?.5:.8);
 else if(r==='c'){c=natc(b);if(u.arm)c=mul(c,u.dark?.5:.8);if((ox+oy)&1)c=mul(c,.94);if(u.seg&&b.nat==='Goldbank'&&ox*Math.cos(b.ang||0)+oy*Math.sin(b.ang||0)<-1.5)c=cape(ox,oy)}
 else if(r==='k')c=rgb(24,22,22);
 else if(r==='h'){c=b.unit==='civ'?rgb(214,184,150):natc(b);if(u.pips){const xs=u.pips===1?[0]:u.pips===2?[-1,1]:[-2,0,2];if(oy===0&&xs.includes(ox))c=rgb(240,238,230)}
  if(u.mark==='bar'&&oy===0&&Math.abs(ox)<=2)c=rgb(20,20,22);if(u.mark==='x'&&Math.abs(ox)===Math.abs(oy)&&Math.abs(ox)<=2)c=rgb(20,20,22)}
 else c=rgb(34,22,20);
 if(b.guard&&Math.abs(ox)<=1&&r==='c')c=mul(c,.6);
 if(p[3]<p[6])c=mul(c,.6+.4*p[3]/p[6]);
 if(p[5]>.01)c=mix(c,glow(p[5]),Math.min(1,p[5]*1.6));
 return c}
// damage
function cut(o,X,Y,r,blood,pow=1){let n=0,a=0;const R=Math.ceil(r);
 for(let j=-R;j<=R;j++)for(let i=-R;i<=R;i++){if(Math.hypot(i,j)+(r>1.6?hh(X+i,Y+j,7)*1.1:0)>r)continue;const q=hitPix(o,X+i,Y+j,pow);if(q===2){n++;if(Math.random()<.4)spark(X+i,Y+j,grey(STEEL),0,0,1.4)}else if(q===1)a++}
 if((n||a)&&o.type==='token')uMark(o,'dent',X,Y,2+Math.min(2,r*.6));
 if(n){if(blood&&o.type!=='slab'){dab(FX.blood,X,Y,Math.min(1.6,.4+n*.08),Math.min(6,2+n*.25|0));sfx('squish')}settle(o)}return{n,a}}
function split(b){if(b.type==='weapon'||b.type==='slab')return;if(b.px.length<3){remove(b);return}
 const seen=new Set(),comps=[];for(const p of b.px){const k=K(p[0],p[1]);if(seen.has(k))continue;const comp=[],q=[p];seen.add(k);
  while(q.length){const c=q.pop();comp.push(c);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const kk=K(c[0]+dx,c[1]+dy),z=b.set.get(kk);if(z&&!seen.has(kk)){seen.add(kk);q.push(z)}}}comps.push(comp)}
 comps.sort((a,c)=>c.length-a.length);
 if(b.type==='token'&&b.status!=='dead'&&(b.coreHit||(comps.length>1&&comps[1].length>=5)||b.px.length<b.n0*.45)){b.status='dead';if(b.held)dropHeld(b);sfx('squish');dab(FX.blood,b.x,b.y,1.4,5)}
 if(comps.length<2)return;b.px=comps[0];mkSet(b);
 for(const cp of comps.slice(1)){if(cp.length<3)continue;
  const mx=Math.round(cp.reduce((s,p)=>s+p[0],0)/cp.length),my=Math.round(cp.reduce((s,p)=>s+p[1],0)/cp.length);
  const o={id:uid++,type:'part',parent:b.parent||b.id,unit:b.unit,nat:b.nat,guard:b.guard,status:'dead',x:b.x+mx,y:b.y+my,vx:b.vx*.6+mx*.18,vy:b.vy*.6+my*.18,mass:cp.length/200,px:cp.map(p=>{const z=p.slice();z[0]-=mx;z[1]-=my;return z})};
  mkSet(o);bodies.push(o)}
 b.vx*=.6;b.vy*=.6}
// refill: what the unit was last kitted with comes back (or its default kit), every gun at full ammo
const cpI=o=>JSON.parse(JSON.stringify(o));
function kitSnap(t){if(t&&t.type==='token'&&t.inv&&t.inv.some(z=>z))t.kit=cpI(t.inv)}
function rearm(b){if(b.type!=='token')return;while(b.inv.length<6)b.inv.push(null);
 if(!b.kit&&!b.inv.some(z=>z)){const l=b.look,c=token(b.name,b.nat,b.unit,b.x,b.y,b.guard,l&&LOOKKIT[l]!==undefined?LOOKKIT[l]:undefined,l);b.kit=c.kit;remove(c)}
 for(const[i,q]of(b.kit||[]).entries()){if(!q)continue;const h=b.inv.find(z=>z&&z.k===q.k);if(!h){if(!b.inv[i])b.inv[i]=cpI(q);else addItem(b,cpI(q))}else if(!CAP[q.k]&&(q.n||1)>(h.n||1))h.n=q.n}
 for(const k of new Set(b.inv.filter(z=>z).map(z=>z.k)))refill(b,k);
 if(b.status==='captured'){b.si=-1;b.held=null}else if(!b.held){b.si=b.inv.findIndex(z=>z&&WP[z.k]&&(WP[z.k].gun||WP[z.k].melee||CAP[z.k]));b.held=b.si>=0?b.inv[b.si]:null}b.hc=null;lastHud=''}
{const g0=give;give=function(t,...a){const r=g0(t,...a);kitSnap(t);return r}}
{const a0=addItem;addItem=function(t,...a){const r=a0(t,...a);if(r)kitSnap(t);return r}}
function restore(b){b.px=tokPixels(b);mkSet(b);b.status='free';b.coreHit=false;b.stuck=false;b.vx=b.vy=0;for(const o of bodies.filter(o=>o.parent===b.id||(o.att&&o.att.id===b.id)))remove(o)}
// shock bomb: radius varies; one in ten only fizzes
function shockBurst(b){if(!bodies.includes(b))return;remove(b);const x=b.x,y=b.y,dud=Math.random()<.1,s=dud?.3+Math.random()*.2:.6+Math.random()*.7;sfx('crack');sfx('zap');BLU=true;arcBlast(x,y,dud?1:1+s*1.5);for(let i=0;i<(dud?6:16);i++)spark(x,y,i%2?plasC(Math.random()):rgb(240,226,255),0,0,dud?1.5:3,8+(Math.random()*10|0));BLU=false;if(!dud)explode(x,y,s);else for(const q of [...bodies])if(q.type==='token'&&Math.hypot(q.x-x,q.y-y)<10)cut(q,Math.round(x),Math.round(y),2,true,3)}
// the lob (hold Alt, click): a grenade or bomb arcs over walls and people to the aim point, a little off with distance, and lands
// there: on a carrier roof it stays on the roof and bursts there (crew inside are spared); on a wall top it drops to the nearest floor
let LOBK=false,ROOFV=null;const LOBT={grenade:1,bomb:1,sbomb:1};
const lobRange=(b,inf)=>inf.range*(THR[b.unit]||.7)/.8;
function lobAim(b,x,y,inf){const d=Math.hypot(x-b.x,y-b.y)||1,R=lobRange(b,inf),k=Math.min(1,R/d);return[b.x+(x-b.x)*k,b.y+(y-b.y)*k]}
function lobStart(p,b,x,y,inf){const[tx,ty]=lobAim(b,x,y,inf),d=Math.hypot(tx-p.x,ty-p.y),e=d*inf.spread*1.4;
 const X=tx+gauss()*e,Y=ty+gauss()*e;p.lob={x0:p.x,y0:p.y,x1:X,y1:Y,t:0,T:Math.max(14,d/3.4|0),h:Math.min(34,6+d*.16)};p.vx=p.vy=0;p.ghost=true}
function lobStep(b){const L=b.lob;if(L.roof){const v=L.roof.v;if(!VEH.includes(v)||v.dead){b.lob=null;b.ghost=!!solidHits(b,0,0);return}const[x,y]=vL2W(v,L.roof.lx,L.roof.ly);b.x=x;b.y=y;b.z=0;return}
 L.t++;const u=Math.min(1,L.t/L.T);b.x=L.x0+(L.x1-L.x0)*u;b.y=L.y0+(L.y1-L.y0)*u;b.z=4*L.h*u*(1-u);b.mv=6;if((L.t&3)===0&&b.kind!=='bomb')reshape(b,(b.ang||0)+.9);if(u<1)return;
 b.z=0;const X=Math.round(b.x),Y=Math.round(b.y);
 for(const v of VEH){if(v.dead)continue;const[lx,ly]=vW2L(v,b.x,b.y);if(lx<0||ly<0||lx>=VC.LW||ly>=VC.H)continue;vRW(v);if(!v.roofL[(ly|0)*VC.LW+(lx|0)])continue;L.roof={v,lx,ly};sfx(snd('metal','knock'));return}
 b.lob=null;const blk=(x,y)=>x<1||y<1||x>=W-1||y>=H-1||sol[y*W+x]||slabG[y*W+x];
 if(blk(X,Y)){let best=null;for(let r=1;r<20&&!best;r++)for(let a=0;a<16;a++){const x=Math.round(X+Math.cos(a/16*6.283)*r),y=Math.round(Y+Math.sin(a/16*6.283)*r);if(!blk(x,y)){best=[x,y];break}}if(best){b.x=best[0];b.y=best[1]}}
 const dx=L.x1-L.x0,dy=L.y1-L.y0,dl=Math.hypot(dx,dy)||1;b.vx=dx/dl*1.1;b.vy=dy/dl*1.1;b.ghost=!!solidHits(b,0,0);sfx(hcl((CLS[clsAt(Math.round(b.x),Math.round(b.y),1)]||CLS.stone).n).knock)}
function detonate(b){remove(b);ROOFV=b.lob&&b.lob.roof?b.lob.roof.v:null;try{explode(b.x,b.y,b.kind==='bomb'?1.95:1.3)}finally{ROOFV=null}}
let alarm=false;function raiseAlarm(){if(alarm)return;alarm=true;setTimeout(()=>{for(const t of bodies)if(t.type==='token'&&t.status==='free'&&!t.held&&t.psi>=0&&t.inv&&t.inv[t.psi])selectSlot(t,t.psi)},250)}
function explode(x,y,s=1){raiseAlarm();hear(x,y,520*s,null,'boom');SND&&SND.at(s>1.5?'bomb':'grenade',x,y);flash(x,y,1,.62,.25,2.2*s,9*s,.9);shake=10*s;carve(x,y,6.5*s,3+(s>1?1:0),0,0);blastWear(x,y,s);if(ROOFV)vHeatMark(x,y,15*s,.45*s);else{crater(x,y,s);heatMark(x,y,15*s,.45*s)}{const c=!ROOFV&&CATN[map[Math.round(y)>>4]&&map[Math.round(y)>>4][Math.round(x)>>4]];if(c&&clsB(c[0],c[1]).ignite){emberPatch(x,y,16,9*s);dab(TF,x,y,.7*s,4)}}wreck(x,y,s);for(const c of bodies.filter(o=>o.kind==='crate'&&!o.hidden&&o.inv&&Math.hypot(o.x-x,o.y-y)<14*s))cShot(c,Math.round(c.x),Math.round(c.y),20,null);scorchRays(x,y,s*blastSoft(x,y));blastTethers(x,y,s);lockBlast(x,y,12*s);const R=30*s,F=26*s;
 for(const o of [...bodies]){if(!bodies.includes(o))continue;const dx=o.x-x,dy=o.y-y,d=Math.hypot(dx,dy);if(d>R||ROOFV&&o.type==='token'&&vHas(ROOFV,o))continue;
  if(o.kind==='grenade'||o.kind==='bomb'){if(!o.fuse)o.fuse=4+(Math.random()*8|0);continue}if(o.type==='slab'&&!o.fallen){blastSlab(o,x,y,s);continue}
  if(o.type==='token'||o.type==='part'){if(d<28*s){const k=1-d/(28*s);for(let i=0;i<Math.round(13*s*k)+3;i++){const tx=o.x+(Math.random()-.5)*12,ty=o.y+(Math.random()-.5)*12,dd=Math.hypot(tx-x,ty-y)||1,ux=(tx-x)/dd,uy=(ty-y)/dd,b0=Math.max(0,dd-12);pierce(o,x+ux*b0,y+uy*b0,ux,uy,8+20*k,.7)}if(d<10*s)cut(o,Math.round(o.x),Math.round(o.y),3+4*k,true,4);dab(FX.blood,o.x,o.y,.3+.6*k,3);settle(o)}}
  if(!bodies.includes(o)||o.type==='slab'||o.hidden)continue;const f=(F-Math.min(d,F))*.45/(o.mass||1);o.vx+=dx/(d||1)*f;o.vy+=dy/(d||1)*f;o.stuck=false;o.ghost=!!solidHits(o,0,0)}
 // steel barely crumbles: 40% of the grit on metal floors
 const mtl=clsB(...(CATN[map[Math.round(y)>>4]&&map[Math.round(y)>>4][Math.round(x)>>4]]||['Stone','grey'])).firm?.4:1;
 for(let i=0;i<70*s*mtl;i++)spark(x,y,Math.random()<.5?rgb(40,36,34):rgb(90,80,70),0,0,4*s,undefined,s>1.5?.35:.15);
 // bombs always leave fire; a grenade does 40% of the time, in a tighter patch
 if(ROOFV);else if(s>1.5)for(let i=0;i<5*s;i++){const a=Math.random()*6.283,rr=4+Math.random()*12*s;dab(TF,x+Math.cos(a)*rr,y+Math.sin(a)*rr,1.4+Math.random()*.9,2+(Math.random()*2|0))}
 else if(Math.random()<.4)for(let i=0;i<4;i++){const a=Math.random()*6.283,rr=3+Math.random()*7;dab(TF,x+Math.cos(a)*rr,y+Math.sin(a)*rr,1.2+Math.random()*.7,2)}
 if(s>1.5){dab(SF,x,y,3,11);dab(SF,x+6,y-5,1.6,8)}else dab(SF,x,y,1.6,7);if(!ROOFV)scorch(x,y,16*s*blastSoft(x,y),s>1.5?.3:.13);
 if(s>1){embers(x,y,70);for(let i=0;i<60*mtl;i++){const a=Math.random()*6.283,rr=Math.random()*12,X=Math.round(x+Math.cos(a)*rr),Y=Math.round(y+Math.sin(a)*rr);if(X>=0&&Y>=0&&X<W&&Y<H)spark(x,y,mul(sol[Y*W+X]?scol[Y*W+X]:floor[Y*W+X],.8),0,0,6,undefined,s>1.5?.35:.15)}
  if(s>1.5){for(let i=0;i<7;i++){const a=Math.random()*6.283,rr=6+Math.random()*16;dab(SF,x+Math.cos(a)*rr,y+Math.sin(a)*rr,2,7)}dab(SS,x,y,2.6,14);room(x,y,.12)}
  // grenade: a thin ring of powder mist that clears in about 7 s
  else for(let i=0;i<12;i++){const a=i/12*6.283+Math.random()*.4,rr=10+Math.random()*8;dab(GM,x+Math.cos(a)*rr,y+Math.sin(a)*rr,1.1+Math.random()*.5,4+(Math.random()*2|0))}}}
// hollow: the blast scours the middle, leaving the char darkest in a ring (size as a share of the radius)
function scorch(x,y,R,hollow=0){const r=R/2,cx=x/2,cy=y/2,sd=Math.random()*99;for(let j=-Math.ceil(r);j<=r;j++)for(let i=-Math.ceil(r);i<=r;i++){const X=Math.floor(cx+i),Y=Math.floor(cy+j);if(X<0||Y<0||X>=BW||Y>=BH)continue;
  const d=Math.hypot(i,j),k=Math.floor((Math.atan2(j,i)+Math.PI)/6.2832*44),len=r*(.6+.4*hh(k,0,sd)),core=r*.3,t=Math.min(1,d/Math.max(1,len)),v=(.36*Math.pow(1-t*t*(3-2*t),1.2)+.56*Math.exp(-((d/core)**2)))*(hollow?1-.7*Math.exp(-((d/(r*hollow))**2)):1);if(v<=.02)continue;const q=Y*BW+X;BURN[q]=Math.min(.92,Math.max(BURN[q],v*(.85+.15*hh(X,Y,sd+1))));bDirty(q);const h=Math.min(1,R/16)*Math.exp(-((d/(core*1.4))**2));if(h>.05)FH[q]=Math.max(FH[q],h)}fxDirty=true}
function embers(x,y,n,blue){for(let i=0;i<n&&parts.length<1500;i++){const a=Math.random()*6.283,s=1+Math.random()*5,c=blue&&Math.random()<.4?rgb(170,220,255):Math.random()<.5?rgb(255,214,120):rgb(255,140,50),e=120+(Math.random()*200|0);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,c,c0:c,em:e,em0:e})}}
function shatter(b){sfx('crash');for(let i=0;i<4;i++)dab(TF,b.x+(Math.random()-.5)*14,b.y+(Math.random()-.5)*14,2,4);dab(TF,b.x,b.y,2.6,6);dab(SF,b.x,b.y-4,1.6,9);
 for(let i=0;i<24;i++)spark(b.x,b.y,Math.random()<.5?C.clay:C.clayD,0,0,3);remove(b)}

// held weapons
const HOFF={pgun:7,sbomb:9,grenade:9,bomb:9,sspear:10,spear:10,sword:7,musket:8,blunder:7,pistol:6,crossbow:9,rod:8,shield:9};
const sideOf=b=>b.held&&b.held.k==='shield'?0:5*(b.side||1);
// the weapon sits to one side, so turn a little further for its line to pass through the target
const aimA=(b,x,y)=>{const dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy),sd=b.held?sideOf(b):0;return Math.atan2(dy,dx)-(sd&&d>Math.abs(sd)+1?Math.asin(sd/d):0)};
const RAISEC={};
function raiseCol(k){if(RAISEC[k]===undefined){const p=shape(k,0).filter(q=>q[2]);p.sort((a,b)=>a[0]-b[0]);RAISEC[k]=p.length?mix(p[p.length*.6|0][2],rgb(236,232,222),.3):rgb(150,150,150)}return RAISEC[k]}
function rustle(b,v){if(fogOn()&&b.fogH||tick-(b.rsT||-1e9)<30||mute||!gest)return;b.rsT=tick;SVOL=v;try{SFX.rustle()}catch(e){}SVOL=1}
// near a wall the weapon is first drawn back towards the body; only if that isn't enough is it raised
function pullFit(b,hx=0,hy=0){if(!b.held)return false;const p0=b.pull||0;for(let p=p0;p<=8;p++){b.pull=p;if(!heldBlocked(b,hx,hy))return true}b.pull=p0;return false}
function raise(b){if(b.raised||b.type!=='token')return;if(pullFit(b))return;b.pull=0;b.raised=true;b.rT=tick;b.hc=null;rustle(b,1)}
function heldPix(b){if(b.raised){const c=Math.cos(b.ang),s=Math.sin(b.ang),sd=sideOf(b)||5,X=Math.round(b.x+c*6-s*sd),Y=Math.round(b.y+s*6+c*sd),col=raiseCol(b.held.k);return[[X,Y,col,0],[X+1,Y,mul(col,.85),1],[X,Y+1,mul(col,.85),2],[X+1,Y+1,mul(col,.65),3]]}const a=b.ang,k=b.held.k,sd=sideOf(b),wd=Math.round((b.wind||0)*9+(b.cock>0?4*Math.sin(Math.PI*b.cock/14):0))+(b.pull||0);const fl=rodFill(b.held),ht=Math.round((b.held.heat||0)*48)/48;if(!b.hc||b.hc.a!==a||b.hc.k!==k||b.hc.sd!==sd||b.hc.wd!==wd||b.hc.fl!==fl||b.hc.ht!==ht){const o=HOFF[k]-wd,c=Math.cos(a),s=Math.sin(a),ox=Math.round(c*o-s*sd),oy=Math.round(s*o+c*sd);b.hc={a,k,sd,wd,fl,ht,px:shape(k,a,fl,ht).map((p,i)=>[p[0]+ox,p[1]+oy,b.held.spent?spentCol(p[2]):p[2],i])}}
 const bx=Math.round(b.x),by=Math.round(b.y),dm=b.held.dmg;return b.hc.px.filter(p=>!dm||!(dm[p[3]]>=7)).map(p=>[bx+p[0],by+p[1],dm&&dm[p[3]]?mul(p[2],1-dm[p[3]]*.06):p[2],p[3]])}
function tipOf(b){if(b.type==='weapon'){const c=Math.cos(b.ang),s=Math.sin(b.ang),f=WP[b.kind].tip;return[b.x+c*f,b.y+s*f]}const k=b.held.k,a=b.ang,c=Math.cos(a),s=Math.sin(a),f=HOFF[k]+WP[k].tip-(b.pull||0);const sd=sideOf(b);return[b.x+c*f-s*sd,b.y+s*f+c*sd]}
function shieldAt(o,pts){if(!o.held||o.held.k!=='shield')return false;const hp=heldPix(o);return pts.some(([X,Y])=>hp.some(q=>q[0]===X&&q[1]===Y))}
function melee(b){if(b.raised||!b.held||!WP[b.held.k].melee||b.status==='dead')return;const t=tipOf(b),pv=b.tp||t;b.tp=t;const mx=t[0]-pv[0],my=t[1]-pv[1],v=Math.hypot(mx,my);if(v<3.2)return;
 const k=b.held.k,c=Math.cos(b.ang),s=Math.sin(b.ang),along=Math.abs(mx*c+my*s)/v,blade=heldPix(b).filter(p=>(p[0]-b.x)*c+(p[1]-b.y)*s>(k==='spear'||k==='sspear'?14:8));
 for(const o of bodies){if(o===b||o.type==='weapon'||o.type==='slab'||o.status==='dead'||(b.nat&&o.nat===b.nat)||Math.abs(o.x-b.x)>48||Math.abs(o.y-b.y)>48)continue;if(o.cool&&o.cool>tick)continue;
  if(o.type==='token'&&shieldAt(o,blade.slice(-4))){o.cool=tick+10;const dm=o.held.dmg||(o.held.dmg={});const q=heldPix(o)[0];if(q)dm[q[3]]=(dm[q[3]]||0)+1;sfx(snd('metal','hit'));o.vx+=Math.cos(b.ang)*v*.08;o.vy+=Math.sin(b.ang)*v*.08;continue}
  const ox=Math.round(o.x),oy=Math.round(o.y),ov=blade.filter(p=>o.set.has(K(p[0]-ox,p[1]-oy)));if(!ov.length)continue;o.cool=tick+10;
  if(along>.7){const r=pierce(o,t[0],t[1],c,s,v*(k==='sword'?.8:1.1),1);if(r.blood){dab(FX.blood,r.x,r.y,.7,3);sfx('squish')}else sfx(k==='spear'?'wedge':'clink');o.vx+=c*v*.15/o.mass;o.vy+=s*v*.15/o.mass;
   if(r.stop&&(r.p[7]==='h'||r.p[7]==='k'||r.p[7]==='c')&&Math.random()<.3){const w=weapon(k,0,0,b.ang);w.x=r.x-c*WP[k].tip;w.y=r.y-s*WP[k].tip;w.att={id:o.id,dx:w.x-o.x,dy:w.y-o.y};w.stuck=true;wedgeIn(w);consume(b)}
   settle(o)}
  else{sfx(snd('metal','hit'));o.vx+=(mx/v)*.4/o.mass;o.vy+=(my/v)*.4/o.mass}}
 for(const[X,Y]of blade.slice(-3)){const m=matAt(X,Y);if(m&&Math.random()<hcl(m).blade){damagePixel(X,Y,1);sfx(hcl(m).knock)}}}
const TIPA=plasC(Math.random()),TIPB=rgb(240,226,255),TIPC=rgb(150,90,220);
const spentCol=c=>c===TIPA?C.iron:c===TIPB?C.ironH:c===TIPC?mul(C.iron,.72):c;
function spend(b){b.spent=true;for(const p of b.px)p[2]=spentCol(p[2])}
let zaps=[];
const isVol=o=>o.kind==='grenade'||o.kind==='bomb';
function primeNear(x,y,r){for(const o of bodies)if(isVol(o)&&!o.fuse&&Math.hypot(o.x-x,o.y-y)<r)o.fuse=4+(Math.random()*10|0)}
function arcWeld(x,y,rad,pw){const a=Math.random()*6.283,r=1+Math.random()*rad,X=Math.round(x+Math.cos(a)*r),Y=Math.round(y+Math.sin(a)*r);if(X<1||Y<1||X>=W-1||Y>=H-1)return;const j=Y*W+X;{const v=bodyAt(X,Y,1,null,isVol);if(v){zaps.push({x0:x,y0:y,x1:X,y1:Y,l:3,b:BLU});detonate(v);return}}
 if(sol[j]){WH[j]=Math.min(1.1,WH[j]+.25);whOn=true;if(Math.random()<pw)damagePixel(X,Y,1)}
 else{const o=bodyAt(X,Y,0,null,q=>q.type!=='weapon'&&!q.fallen);const p=o&&o.set.get(K(X-Math.round(o.x),Y-Math.round(o.y)));if(!p||p[4]!==3)return;p[5]=Math.min(1.2,p[5]+.2);if(Math.random()<pw&&hitPix(o,X,Y,1)===2)settle(o)}
 zaps.push({x0:x,y0:y,x1:X,y1:Y,l:3,b:BLU});spark(X,Y,Math.random()<.5?plasC(Math.random()):rgb(240,226,255),0,0,1.4,6+(Math.random()*6|0));sfx('sizzle')}
function shieldBurst(o,b){const[x,y]=b.kind==='sspear'?spearTip(b):[b.x,b.y];sfx('sblast');sfx('zap');shake=Math.max(shake,7);
 for(const q of heldPix(o))for(let i=0;i<2;i++)spark(q[0],q[1],Math.random()<.5?plasC(Math.random()):C.iron,0,0,3.5,Math.random()<.5?14:undefined);
 o.held=null;o.hc=null;const s=Math.hypot(b.vx,b.vy)||1;o.vx+=b.vx/s*1.5;o.vy+=b.vy/s*1.5;cut(o,Math.round(x),Math.round(y),3.5,true,3);if(bodies.includes(o))for(const p of o.px)if(p[4]===3)p[5]=Math.min(1.2,p[5]+.6);arcHit(x,y);dab(SF,x,y,1,5);
 if(b.kind==='sspear'){b.vx*=.15;b.vy*=.15}else remove(b)}
function blastSlab(d,x,y,s){const R=16*s,bx=Math.round(d.x),by=Math.round(d.y);let md=1e9,hit=0;
 for(const p of [...d.px]){const X=bx+p[0],Y=by+p[1],dp=Math.hypot(X-x,Y-y);md=Math.min(md,dp);const pw=Math.round(14*(1-dp/R)*(.7+.6*Math.random()));if(pw>0&&hitPix(d,X,Y,pw)===2){hit++;if(Math.random()<.4)spark(X,Y,chipC(d.mat,C.iron),x-X,y-Y,2.5)}}
 if(hit)settle(d);if(!bodies.includes(d)||d.fallen)return;if(md<10*s){for(const q of d.pair?[d,d.pair]:[d]){q.locked=false;if(!q.fallen&&q.ang===0&&q.tgt===0)q.tgt=openDir(q)}sfx('door')}}
function lockBlast(x,y,r){for(const d of bodies){if(d.type!=='slab'||!d.locked||d.fallen)continue;const Lq=swingPt(d,(d.len||16)-4.5,-((d.th||8)>>1)-.5,d.ang||0),lx=d.x+Lq[0],ly=d.y+Lq[1];if(Math.hypot(lx-x,ly-y)>r)continue;
 for(const q of d.pair?[d,d.pair]:[d]){q.locked=false;if(!q.fallen&&q.ang===0&&q.tgt===0)q.tgt=openDir(q)}for(let i=0;i<10;i++)spark(lx,ly,Math.random()<.5?rgb(214,176,70):rgb(255,226,140),0,0,2.6);sfx('door');sfx(snd('metal','hit'))}}
function arcBlast(x,y,big=1){flash(x,y,.62,.66,1,1.4*big,4+big,.82);carve(x,y,2.6*(1+(big-1)*.6),4,0,0);lockBlast(x,y,3*big);primeNear(x,y,7*big);arcHit(x,y);if(big>1){for(const q of [...bodies])if((q.type==='token'||q.type==='part')&&Math.hypot(q.x-x,q.y-y)<6+big*4)cut(q,Math.round(x),Math.round(y),2+big,true,3);embers(x,y,12*big,true)}dab(SF,x,y,.7*big,3+big);for(let i=0;i<10*big;i++)spark(x,y,Math.random()<.5?plasC(Math.random()):rgb(255,226,140),0,0,2.6,Math.random()<.5?10:undefined);sfx(big>1.2?'sblast':'pthud');shake=Math.max(shake,3)}
function spearTip(b){const c=Math.cos(b.ang),s=Math.sin(b.ang);return[b.x+c*11,b.y+s*11]}
function arcHit(x,y){for(const o of [...bodies,...VEH]){if(o.type==='weapon'||!o.veh&&(Math.abs(o.x-x)>14||Math.abs(o.y-y)>14))continue;const ox=Math.round(o.x),oy=Math.round(o.y);for(const p of o.px)if(p[4]===3&&Math.hypot(ox+p[0]-x,oy+p[1]-y)<4)p[5]=Math.min(1.2,p[5]+.7)}
 for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){const X=Math.round(x)+i,Y=Math.round(y)+j;if(X<0||Y<0||X>=W||Y>=H)continue;const jj=Y*W+X;if(hcl(sol[jj]).arcGlow&&sol[jj]&&Math.hypot(i,j)<3.5){WH[jj]=Math.min(1.1,WH[jj]+.5);whOn=true}}
 for(let i=0;i<8;i++)spark(x,y,Math.random()<.5?plasC(Math.random()):rgb(240,220,255),0,0,2,8+(Math.random()*8|0));sfx('zap')}
function shockBlast(b){if(b.snd){b.snd.stop();b.snd=null}const[x,y]=spearTip(b),o=b.att&&byId(b.att.id);flash(x,y,.62,.66,1,2,7,.88);sfx('sblast');shake=Math.max(shake,6);carve(x,y,4,8,0,0);lockBlast(x,y,8);primeNear(x,y,16);
 if(o){const dx=o.x-x,dy=o.y-y,d=Math.hypot(dx,dy)||1;pierce(o,x,y,dx/d,dy/d,26,.6);dab(FX.blood,x,y,1,4);settle(o)}
 for(const q of [...bodies]){if(q===o||(q.type!=='token'&&q.type!=='part')||Math.hypot(q.x-x,q.y-y)>14)continue;cut(q,Math.round(x),Math.round(y),5,true,3)}
 arcHit(x,y);for(let i=0;i<44;i++)spark(x,y,[plasC(Math.random()),rgb(150,90,255),rgb(242,225,255)][i%3],0,0,4,8+(Math.random()*16|0));for(let i=0;i<10;i++)spark(x,y,rgb(150,154,162),0,0,3);embers(x,y,26,true);dab(SF,x,y,.9,4);
 for(const q of bodies){if(q===o||q===b||q.type==='weapon'||Math.hypot(q.x-x,q.y-y)>22)continue;if(q.px.some(p=>p[4]===3)){for(let i=0;i<6;i++)spark(x+(q.x-x)*i/6,y+(q.y-y)*i/6,rgb(200,230,255),0,0,.3,6);arcHit(q.x,q.y);break}}
 remove(b)}
function shockTick(){for(const b of [...bodies]){if(!bodies.includes(b))continue;
  if(b.kind==='sspear'){lancerCool(b);const[x,y]=spearTip(b);{const ho=b.att&&byId(b.att.id);b.glw=b.timer>0?1-b.timer/b.timer0:0}
   if(b.fizz>0){b.fizz--;if(Math.random()<b.fizz/300)spark(x,y,plasC(Math.random()),0,0,1.2,8)}
   else if(b.timer>0){b.timer--;const pr=1-b.timer/b.timer0,o=b.att&&byId(b.att.id);if(Math.random()<.4)arcWeld(x,y,5,.03+pr*.06);if(Math.random()<.2+pr*.6)spark(x,y,Math.random()<.5?plasC(Math.random()):rgb(255,255,255),0,0,1+pr*2,8);
    for(const q of o?[o]:bodies.filter(q=>q.type==='slab'&&Math.hypot(q.x-x,q.y-y)<24)){const qx=Math.round(q.x),qy=Math.round(q.y);for(const p of q.px)if(p[4]===3&&Math.hypot(qx+p[0]-x,qy+p[1]-y)<3+pr*4)p[5]=Math.min(1.2,p[5]+.012)}
    if(b.timer===0)shockBlast(b)}
   else if(!b.spent&&!b.att&&!b.stuck&&tick%12===0&&Math.random()<.6)spark(x,y,Math.random()<.5?TIPA:TIPB,0,0,.8,6)}
  if(b.type==='token'&&b.held&&b.held.k==='sspear'&&!b.held.spent&&b.status==='free'&&Math.random()<.3){const t=tipOf(b);arcWeld(t[0],t[1],3,.015)}
  if(b.type==='token'&&b.held&&b.held.k==='sspear'&&!b.held.spent&&tick%24===0&&Math.random()<.5){const t=tipOf(b);spark(t[0],t[1],plasC(Math.random()),0,0,.8,6)}}}
function give(t,k,am,rs){if(!t.inv)t.inv=[];while(t.inv.length<6)t.inv.push(null);if(refill(t,k)){sfx('reload');return}const it={k,n:fullN(t,k),ammo:CAP[k]||undefined,res:CAP[k]?fullRes(t,k):undefined};while(t.inv.length<6)t.inv.push(null);let i=slotFor(t,k);if(i<0)i=SEC.has(k)&&slotOK(t,1)?1:CAP[k]||WP[k].melee?0:GREN.has(k)?2:k==='bomb'?3:4;t.inv[i]=it;if(k==='pistol')evenRes(t,k);t.si=i;t.held=it;t.hc=null;sfx('flick')}
function dropHeld(t){const w=weapon(t.held.k,t.x+Math.cos(t.ang)*14,t.y+Math.sin(t.ang)*14,t.ang);w.ghost=!!solidHits(w,0,0);w.noPick=tick+120;w.ammo=t.held.ammo;w.res=t.held.__b?0:t.held.res;reshape(w,w.ang);if(t.held.spent)spend(w);consume(t)}

// physics
let shake=0;

// how much harder this wall pixel is than its family's usual, from the material table's hit points (worn pixels hold fewer)
const hpF=(X,Y)=>{const j=Y*W+X,m=X>=0&&Y>=0&&X<W&&Y<H&&sol[j];return m?Math.max(.3,shp[j]/([0,3,2,6][m]||3)):1};
function impact(b,h,axis){const s=Math.hypot(b.vx,b.vy),dx=b.vx/(s||1),dy=b.vy/(s||1);let cx=0,cy=0,mx=0;for(const[X,Y]of h){cx+=X;cy+=Y;mx=Math.max(mx,matAt(X,Y))}cx/=h.length;cy/=h.length;
 if(b.knock>0&&b.type!=='weapon'){pinTo(b,cx,cy,mx);return true}
 const bounce=k=>{if(axis){b.vy*=-k;b.vx*=.65}else{b.vx*=-k;b.vy*=.65}};
 if(b.type==='weapon'){const w=WP[b.kind];
  if(b.kind==='arc'){BLU=!!b.blue;arcBlast(cx,cy,b.big||1);if(b.pg){const l=Math.hypot(dx,dy)||1;for(let i=0;i<=12;i+=.5)damagePixel(Math.round(cx+dx/l*i),Math.round(cy+dy/l*i),3,dx/l,dy/l)}if(hcl(mx).metal){sfx('boltmetal');metalSparks(cx,cy,dx,dy,true);heatMark(cx,cy,4+2*(b.big||1),.5+.15*(b.big||1))}BLU=false;remove(b);return true}if(w.rod)return rodWall(b,h,axis,mx,cx,cy,dx,dy);if(w.bullet){const cos=Math.abs(axis?dy:dx);
   const pl=b.kind==='pel',M=hcl(mx);if(M.deflect&&cos<.45){bounce(.6);hitFx(cx,cy,mx,dx,dy,pl);pl?sfxP(M.glance,.4):sfx(M.glance);return true}
   // stone and metal: a pistol ball bites one pixel, a musket ball two (one from far off); wood is cut through by energy
   let E=b.E||0;const lim=b.kind==='pball'?1:b.kind==='ball'?(Math.hypot(b.x-(b.sx??b.x),b.y-(b.sy??b.y))>160?1:2):1e9;for(const[X,Y]of h){const eff=M.dig*hpF(X,Y)/Math.max(cos,.35);const hard=hcl(matAt(X,Y)).hard;if(hard&&(b.dug||0)>=lim){E=0;break}if(E>=eff){E-=eff;if(hard)b.dug=(b.dug||0)+1;damagePixel(X,Y,99,dx,dy)}else{damagePixel(X,Y,1,dx,dy);E=0}}
   hitFx(cx,cy,mx,dx,dy,pl);if(b.kind==='arc')arcHit(cx,cy);b.E=E;if(E<=.01){remove(b)}return true}
  if(b.kind==='sspear'&&b.live){lancerBlast(b);return true}
  if(w.sharp){const cosn=Math.abs(axis?dy:dx),M=hcl(mx);
   if(cosn<.4&&s>2){if(axis){b.vy*=-.35;b.vx*=.75}else{b.vx*=-.35;b.vy*=.75}b.tang=Math.atan2(b.vy,b.vx);damagePixel(h[0][0],h[0][1],1,dx,dy);if(M.metal)metalSparks(cx,cy,dx,dy,b.kind==='sspear'&&!b.spent);else hitFx(cx,cy,mx,dx,dy);sfx(M.glance);return true}
   if((s>3&&!M.metal)||s>(b.kind==='sspear'?8:16)){for(const[X,Y]of h)damagePixel(X,Y,1,dx,dy);const pen=Math.min(b.kind==='sspear'?15.6:9,s*.45*M.pen*(b.kind==='sspear'?1.82:1))*Math.max(.4,cosn),ca=Math.cos(b.ang),sa=Math.sin(b.ang);if(b.kind==='sspear'){const tx=b.x+ca*w.tip,ty=b.y+sa*w.tip;for(let i=0;i<=pen+1;i+=.5)damagePixel(Math.round(tx+ca*i),Math.round(ty+sa*i),3,ca,sa)}b.x+=ca*pen;b.y+=sa*pen;b.vx=b.vy=0;b.stuck=true;wedgeIn(b);b.tang=undefined;
    if(M.debris==='chips')for(let i=0;i<Math.min(12,s*.6);i++)spark(cx,cy,scol[Math.round(cy)*W+Math.round(cx)]||rgb(140,136,128),dx,dy,2.4);sfx(M.knock);return true}
   if(s>3)for(const[X,Y]of h)damagePixel(X,Y,1,dx,dy);bounce(.3);sfx(M.glance);return true}
  if(b.kind==='cannon'){carve(cx,cy,Math.min(10,s*.7),3,dx,dy);sfx('boom');shake=Math.max(shake,5);if(s<3.5){bounce(.2);return true}b.vx*=.55;b.vy*=.55;return true}
  if(b.kind==='pot'){shatter(b);return true}if(b.kind==='sbomb'){shockBurst(b);return true}
  if(s>1.5)sfx(hcl(mx).knock);bounce(.4);return true}
 if(s>2.5){carve(cx,cy,Math.min(5,s*.3),1,dx,dy);cut(b,Math.round(cx-dx),Math.round(cy-dy),Math.min(5,s*.3),true);sfx('thunk');if(!bodies.includes(b))return true;
  if(s>9&&!hcl(mx).metal){const pen=Math.min(5,s*.3);b.x+=dx*pen;b.y+=dy*pen;b.vx=b.vy=0;b.stuck=true;return true}bounce(.35);return true}
 if(axis)b.vy=0;else b.vx=0;return true}
// what flies off a hit: the hit class's debris
function hitParts(x,y,m,dx,dy,k=.55){const M=hcl(m),d=M.debris;if(d==='sparks')sparkBurst(x,y,dx,dy,k)
 else if(M.chipH){const a=rgb(...M.chip),b=rgb(...M.chipH);for(let i=0;i<5;i++)spark(x,y,Math.random()<.5?a:b,-dx*2,-dy*2,1.8)}
 else{dab(SF,x-dx*2,y-dy*2,.6,2);for(let i=0;i<4;i++)spark(x,y,rgb(150,146,138),-dx*2,-dy*2,1.6)}}
function hitFx(x,y,m,dx,dy,pel){const S=k=>pel?sfxP(k):sfx(k);hitParts(x,y,m,dx,dy,pel?.25:.55);S(hcl(m).hit)}
const FALL={ball:[120,300,.6],pball:[50,170,.45],pel:[24,140,.2]};
function fall(b){const F=FALL[b.kind];if(!F||b.sx===undefined)return 1;const d=Math.hypot(b.x-b.sx,b.y-b.sy);if(b.kind==='pel'&&d<26)return 1.8;return d<=F[0]?1:Math.max(F[2],1-(1-F[2])*(d-F[0])/(F[1]-F[0]))}
// rods
const HOTD=150;
const rodHot=b=>b.hot&&(b.dist||0)<(b.hotd||HOTD)&&!b.stuck;
function rodPx(b,a){b.ang=a;b.px=shape('rodp',a,b.salvo?2:1);mkSet(b);for(const p of b.px)p[5]=(b.glw||0)*1.2}
function rodHeat(b){b.glw=b.hot?Math.min(1,Math.max(0,1.3-(b.dist||0)/(b.hotd||HOTD))):0;for(const p of b.px)p[5]=b.glw*1.2}
const HUM=new Map();
function hum(b,k,h){if(mute||!gest)return;const a=au(),t=a.currentTime;let n=HUM.get(b);
 if(!n){const o=a.createOscillator(),o2=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();o.type='sawtooth';o2.type='sine';f.type='lowpass';f.Q.value=.7;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g).connect(MS);const w=a.createGain();w.gain.value=.3;g.connect(w).connect(RV);o.start();o2.start();n={o,o2,f,g,k};HUM.set(b,n)}
 n.seen=tick;const pg=k==='pgun',lo=k==='rod'?48:pg?66:82,hi=k==='rod'?150:pg?112:250,p=Math.min(h,1.1),wob=h>1?Math.sin(tick*.9)*(h-1)*40:0;
 n.o.frequency.setTargetAtTime(lo+(hi-lo)*p*p+wob,t,.08);n.o2.frequency.setTargetAtTime((lo+(hi-lo)*p*p)*2.01,t,.08);n.f.frequency.setTargetAtTime(pg?260+p*900:220+p*p*2200,t,pg?.2:.1);n.g.gain.setTargetAtTime(pg?.008+.03*p:.015+.075*p,t,pg?.2:.12)}
function humEnd(){for(const[b,n]of HUM)if(n.seen!==tick){const t=au().currentTime;n.g.gain.setTargetAtTime(0,t,.06);n.o.stop(t+.4);n.o2.stop(t+.4);HUM.delete(b)}}
function heatTick(){const ch=charge?new Set(armed()):null;
 for(const b of [...bodies]){const gw=b.type==='weapon'&&sel.has(b);if(!gw&&(b.type!=='token'||!b.held)||!bodies.includes(b))continue;const h=slot(b),k=h.k;if(k!=='rod'&&k!=='pgun'&&k!=='sspear')continue;if(b.burst){if(--b.burst.t<=0){b.burst.n--;b.burst.t=7;b.inB=1;fire(b,b.burst.x,b.burst.y);b.inB=0;if(b.burst&&b.burst.n<=0)b.burst=null}continue}if(k==='pgun'){h.heat=0;if(ch&&ch.has(b)&&(gw||b.status==='free')&&!h.vent&&(h.ammo??CAP[k])>0)hum(b,k,Math.min(1,(performance.now()-charge.t)/charge.need));continue}
  const on=ch&&ch.has(b)&&(gw||b.status==='free')&&(k==='sspear'||(h.ammo??CAP[k])>0);
  if(!on){if(h.heat>0)h.heat=Math.max(0,h.heat-1/240);continue}
  const t=tipOf(b);if(!gw&&!(b.unit==='guard'||b.unit==='shock'||b.unit==='cmd')){h.heat=0;continue}
  h.heat=(h.heat||0)+1/210;
  if(h.heat>1&&(Math.random()<(h.heat-1)*.035||h.heat>1.4)){overcharge(b);continue}
  if(Math.random()<h.heat*.25)spark(t[0],t[1],k==='rod'?(h.heat>.95?rgb(255,250,236):rgb(255,170,70)):(Math.random()<.5?plasC(Math.random()):rgb(240,226,255)),0,0,.6+h.heat,6);
  hum(b,k,h.heat);if(h.heat>1)shake=Math.max(shake,(h.heat-1)*6)}humEnd()}
function overcharge(b){if(b.type==='weapon'){const t=tipOf(b);if(sel.has(b))charge=null;arcBlast(t[0],t[1],2.5);if(b.kind==='rod')rodBurst(b.x,b.y);remove(b);return}const h=b.held,t=tipOf(b),c=Math.cos(b.ang),s=Math.sin(b.ang),sd=sideOf(b),gx=b.x+c*6-s*sd,gy=b.y+s*6+c*sd;
 if(h.k==='pgun'){h.heat=0;h.ammo=0;b.hc=null;arcBlast(t[0],t[1],2.5);cut(b,Math.round(gx),Math.round(gy),3,true,3);settle(b);return}
 if(h.k==='sspear'){h.heat=0;b.hc=null;if(sel.has(b))charge=null;arcBlast(t[0],t[1],2.5);lancerDebris(t[0],t[1],3);consume(b);cut(b,Math.round(gx),Math.round(gy),3,true,3);settle(b);return}
 flash(gx,gy,1,.6,.3,3,8,.86);embers(gx,gy,60);for(let i=0;i<50;i++)spark(gx,gy,i<10?rgb(255,250,236):Math.random()<.5?rgb(255,200,90):rgb(255,120,40),0,0,4,8+(Math.random()*16|0));
 emberPatch(gx,gy,18,12);scorch(gx,gy,16);dab(SS,gx,gy,3,8);sfx('crash');sfx('boom');shake=Math.max(shake,12);
 for(let i=0;i<(h.ammo||0);i++){const r=weapon('rodp',gx+(Math.random()-.5)*16,gy+(Math.random()-.5)*16,Math.random()*6.283);r.stuck=true;r.glw=1;for(const p of r.px)p[5]=1.2}
 for(let i=0;i<4;i++)cut(b,Math.round(gx+(Math.random()-.5)*5),Math.round(gy+(Math.random()-.5)*5),3.5,true,3);ignite(b,Math.atan2(gy-b.y,gx-b.x),.8,2.5);b.burn=Math.max(b.burn||0,.8);b.vx-=c*3;b.vy-=s*3;
 consume(b);b.hc=null;if(bodies.includes(b))settle(b)}
function rodTick(){heatTick();for(const b of bodies){if(b.kind==='rodp'){if(b.stuck){if(b.glw>0){b.glw=Math.max(0,b.glw-.0012-b.glw*.004);for(const p of b.px)p[5]=b.glw*1.2;if(Math.random()<b.glw*.3){const X=b.x>>1,Y=b.y>>1;if(X>=0&&Y>=0&&X<BW&&Y<BH){ST[Y*BW+X]+=.8;fxDirty=true}}}}else{{const f=Math.max(.3,1-Math.max(0,(b.dist||0)-90)/360);b.E*=f/(b.fl||1);b.fl=f}rodHeat(b);if(b.glw>.05&&b.lx!==undefined){const L=Math.hypot(b.x-b.lx,b.y-b.ly);for(let i=0;i<=L;i++){const X=(b.lx+(b.x-b.lx)*i/(L||1))/2|0,Y=(b.ly+(b.y-b.ly)*i/(L||1))/2|0;if(X<0||Y<0||X>=BW||Y>=BH)continue;const q=Y*BW+X;BURN[q]=Math.min(.75,Math.max(BURN[q],.55*b.glw));bDirty(q)}for(let i=0;i<=L;i+=6){const k=Math.max(0,1-((b.dist||0)-L+i)/(HOTD*1.2));if(k>.05)dab(SS,b.lx+(b.x-b.lx)*i/(L||1),b.ly+(b.y-b.ly)*i/(L||1),.4+1.6*k,Math.max(1,Math.round(1+3*k)))}fxDirty=true}b.lx=b.x;b.ly=b.y;if(b.glw>.3&&Math.random()<.6)spark(b.x-b.vx*.3,b.y-b.vy*.3,Math.random()<.5?rgb(255,200,110):rgb(255,140,50),0,0,.5,4)}}
 if(b.knock>0)b.knock--;if(b.pinned){if(!b.stuck)b.pinned=false;else if(b.status!=='dead'&&--b.pinT<=0)unpin(b)}}}
function rodWall(b,h,axis,mx,cx,cy,dx,dy){const cos=Math.abs(axis?dy:dx);
 if(rodHot(b)&&b.E>0){if(!b.lw||Math.hypot(cx-b.lw[0],cy-b.lw[1])>4){emberPatch(cx-dx*6,cy-dy*6,8,6);debris(cx-dx*2,cy-dy*2,scol[Math.round(cy)*W+Math.round(cx)]||rgb(130,126,118),6,-dx,-dy);scorch(cx-dx*2,cy-dy*2,6);dab(SS,cx-dx*6,cy-dy*6,3,8);dab(ST,cx-dx*4,cy-dy*4,1.6,4)}b.lw=[cx,cy];if(b.wb===undefined)b.wb=(16+Math.round(16*(.2+Math.random()*.2)))*(b.salvo?2:1);
  let hc=0;for(const[X,Y]of h){const m=matAt(X,Y);hc+=hcl(m).rodWear*hpF(X,Y)}if((b.wb-=hc/h.length)<0){emberPatch(cx-dx*6,cy-dy*6,12,8);dab(SS,cx-dx*5,cy-dy*5,3.2,9);dab(ST,cx-dx*3,cy-dy*3,2,5);b.hot=0;b.vx=b.vy=0;b.stuck=true;b.x+=dx*2;b.y+=dy*2;for(let i=0;i<8;i++)spark(cx,cy,Math.random()<.5?rgb(255,226,150):rgb(255,140,50),-dx*2,-dy*2,2,8+(Math.random()*8|0));sfx('sizzle');sfx('crack');return true}
  for(const[X,Y]of h)for(const[i,j]of[[0,0],[-dy,dx]]){const x=Math.round(X+i),y=Math.round(Y+j);damagePixel(x,y,99,dx,dy);for(let v=-1;v<=1;v++)for(let u=-1;u<=1;u++){const q=(y+v)*W+x+u;if(x+u>0&&y+v>0&&x+u<W&&y+v<H&&sol[q]){WH[q]=Math.min(1.1,WH[q]+.4);whOn=true}}}
  heatMark(cx,cy,b.salvo?7:5,b.salvo?.85:.65);b.E-=hcl(mx).rodE;if(Math.random()<.5)spark(cx,cy,Math.random()<.5?rgb(255,226,150):rgb(255,140,50),-dx*1.5,-dy*1.5,1.8,8+(Math.random()*8|0));if(Math.random()<.2)sfx('sizzle');return true}
 const M=hcl(mx);if(M.deflect&&cos<.4){if(axis){b.vy*=-.8;b.vx*=.9}else{b.vx*=-.8;b.vy*=.9}b.x-=dx*2;b.y-=dy*2;rodPx(b,Math.atan2(b.vy,b.vx));b.E*=.75;sfx(M.glance);dab(SF,cx,cy,1.4,4);for(let i=0;i<8;i++)spark(cx,cy,Math.random()<.5?rgb(255,226,140):rgb(255,170,70),-dx*2,-dy*2,2.2,6+(Math.random()*8|0));sfx(snd('metal','glance'));return true}
 for(const[X,Y]of h){const eff=M.rod*hpF(X,Y)/Math.max(cos,.4);if(b.E>=eff){b.E-=eff;damagePixel(X,Y,99,dx,dy)}else{damagePixel(X,Y,2,dx,dy);b.E=0}}
 if(M.metal){const sl=slabG[Math.round(cy)*W+Math.round(cx)]&&byId(slabG[Math.round(cy)*W+Math.round(cx)]);if(sl)heatAt(sl,cx,cy,3,.8);if(Math.random()<.3)emberPatch(cx-dx*5,cy-dy*5,7,5);metalSparks(cx,cy,dx,dy,false);if(!b.mchk){b.mchk=1;if(Math.random()<.1){rodBurst(cx-dx*2,cy-dy*2);remove(b);return true}}}
 hitFx(cx,cy,mx,dx,dy);if(!b.lw||Math.hypot(cx-b.lw[0],cy-b.lw[1])>4){debris(cx-dx*2,cy-dy*2,chipC(mx,scol[Math.round(cy)*W+Math.round(cx)]||rgb(130,126,118)),M.metal?6:16,-dx,-dy);dab(SF,cx-dx*4,cy-dy*4,M.metal?1.4:2.6,M.metal?4:6);if(!M.metal)for(let i=0;i<6;i++)spark(cx,cy,scol[Math.round(cy)*W+Math.round(cx)]||rgb(150,146,138),-dx*2,-dy*2,1.8,8+(Math.random()*8|0))}b.lw=[cx,cy];if(b.E<=.01){b.vx=b.vy=0;b.stuck=true;b.x+=dx*2;b.y+=dy*2;for(let i=0;i<6;i++)spark(cx,cy,M.metal?rgb(255,220,140):scol[Math.round(cy)*W+Math.round(cx)]||rgb(150,146,138),-dx*2,-dy*2,2.2);sfx(M.knock);shake=Math.max(shake,2)}return true}
function rodBody(b,o,s){const dx=b.vx/(s||1),dy=b.vy/(s||1),u=UNITS[o.unit]||UNITS.civ;const rx0=b.x-o.x,ry0=b.y-o.y,t0=rx0*dx+ry0*dy,d=Math.min(8.3,Math.abs(rx0*dy-ry0*dx)),cos=Math.sqrt(1-(d/8.3)**2),ex=rx0-t0*dx-dx*8.3*cos,ey=ry0-t0*dy-dy*8.3*cos,nx=ex/8.3,ny=ey/8.3,hot=rodHot(b);
 const held=hot&&o.unit==='shock'&&Math.random()<.2,met=metalAt(o,b.x,b.y,dx,dy);
 if(hot&&!held){let n=0;for(const k of b.salvo?[-2,-1,0,1,2]:[-1,0,1]){const r=pierce(o,b.x-dy*k,b.y+dx*k,dx,dy,999,1);n+=r.removed}
  if(n){scorch(b.x,b.y,3);dab(SS,b.x,b.y,2.4,7);ignite(o,Math.atan2(-dy,-dx),.5,2);o.burn=Math.max(o.burn||0,.6);emberPatch(b.x+dx*12,b.y+dy*12,6,6);dab(FX.blood,b.x+dx*8,b.y+dy*8,.4+n*.02,3);for(let i=0;i<6;i++)spark(b.x,b.y,Math.random()<.5?rgb(255,220,140):rgb(255,140,50),dx*2,dy*2,1.8,8);sfx('sizzle');sfx('squish')}
  o.vx+=dx*.8/o.mass;o.vy+=dy*.8/o.mass;settle(o);b.vx*=.94;b.vy*=.94;return false}
 if(!hot&&met&&cos<.6){const d=dx*nx+dy*ny,rx=dx-2*d*nx,ry=dy-2*d*ny,v=s*.8;ripArmour(o,Math.round(ex),Math.round(ey),rx,ry,b.E);debris(o.x+ex,o.y+ey,u.ac,6,rx,ry);if(!u.leather&&Math.random()<.3){ignite(o,Math.atan2(ey,ex),.4,1.5);o.burn=Math.max(o.burn||0,.4)}heatAt(o,o.x+ex,o.y+ey,3,.6);settle(o);b.vx=rx*v;b.vy=ry*v;b.E*=.7;b.x+=nx*2;b.y+=ny*2;rodPx(b,Math.atan2(ry,rx));
  metalSparks(b.x,b.y,-rx,-ry,false);sfx(snd('metal','glance'));o.vx+=dx*.6/o.mass;o.vy+=dy*.6/o.mass;return true}
 if(!hot&&met){heatAt(o,o.x+ex,o.y+ey,3,.7);debris(o.x+ex,o.y+ey,u.ac,8,-dx,-dy);if(Math.random()<.3){ignite(o,Math.atan2(ey,ex),.4,1.5);o.burn=Math.max(o.burn||0,.4)}metalSparks(o.x+ex,o.y+ey,dx,dy,false);if(!b.mchk){b.mchk=1;if(Math.random()<.1){rodBurst(o.x+ex,o.y+ey);o.vx+=dx*1.2/o.mass;o.vy+=dy*1.2/o.mass;remove(b);return true}}}
 const plate=!hot&&met,caught=plate&&Math.random()>=.07;
 const r=pierce(o,b.x,b.y,dx,dy,caught?10:held?28:plate?60:b.E,1,caught?4:9);if(caught&&Math.random()<.4)ripArmour(o,Math.round(ex),Math.round(ey),-dx,-dy,b.E*.5);
 if(r.blood){dab(FX.blood,r.x,r.y,.7+r.removed*.05,3);sfx('squish')}else sfx(snd('metal','hit'));dab(SF,r.x-dx*4,r.y-dy*4,.7,3);for(let i=0;i<4;i++)spark(r.x,r.y,rgb(255,200,120),-dx*2,-dy*2,1.6,5);
 const kb=(b.kb||4)*(b.fl||1)/o.mass*(r.stop?caught?.55:1:.4);if(caught)for(let i=0;i<8;i++)spark(r.x,r.y,Math.random()<.5?rgb(255,226,140):rgb(255,170,70),-dx*2,-dy*2,2,6+(Math.random()*8|0));o.vx+=dx*kb;o.vy+=dy*kb;o.stuck=false;shake=Math.max(shake,3);
 if(!r.stop){b.E=r.E;b.vx*=.7;b.vy*=.7;settle(o);return false}
 b.x=r.x-dx*2;b.y=r.y-dy*2;b.vx=b.vy=0;b.stuck=true;b.dir=[dx,dy];b.att={id:o.id,dx:b.x-o.x,dy:b.y-o.y};o.knock=22;o.rod=b.id;settle(o);return true}
function pinTo(b,cx,cy){const sp=Math.hypot(b.vx,b.vy);b.vx=b.vy=0;b.knock=0;crush(b,cx,cy,sp);const r=b.rod&&byId(b.rod);if(!r||!r.att||r.att.id!==b.id)return;
 b.stuck=true;b.pinned=true;b.pinT=240;r.att.dx+=r.dir[0]*4;r.att.dy+=r.dir[1]*4;dab(SF,cx,cy,.5,2);for(let i=0;i<6;i++)spark(cx,cy,rgb(150,146,138),0,0,1.6);sfx('thunk');sfx(snd('metal','hit'));shake=Math.max(shake,3)}
const CRUSH={civ:4,home:3,rifle:2.5,cmd:2,guard:1.6,shock:1.1};
function crush(b,cx,cy,sp){if(b.type!=='token')return;let nx=cx-b.x,ny=cy-b.y;const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;const d=(CRUSH[b.unit]||2)*Math.min(1.5,.6+sp/3),u=UNITS[b.unit];let n=0;
 const sink=Math.min(4,1+sp*.6)*(u.arm>=2?.6:1);carve(cx+nx*sink*.5,cy+ny*sink*.5,3+sink,1,nx,ny);
 for(let j=-7;j<=7;j++)for(let i=-7;i<=7;i++){const X=Math.round(cx+nx*2+i),Y=Math.round(cy+ny*2+j),q=Y*W+X;if(X<1||Y<1||X>=W-1||Y>=H-1||!sol[q])continue;const r=Math.hypot(i,j);if(r>6+hh(X,Y,5)*2)continue;if(r<4+hh(X,Y,8)*3&&hh(X,Y,b.id)>.25)scol[q]=mix(scol[q],rgb(96,14,12),.55+.3*hh(X,Y,9));if(hh(X,Y,7)>.7)crk[q]=Math.min(40,crk[q]+20);solDirty=true}
 b.x+=nx*sink;b.y+=ny*sink;
 for(const p of [...b.px]){const t=p[0]*nx+p[1]*ny;if(t<8.3-d-sink)continue;if((p[7]==='a'||p[7]==='f')&&p[3]>=7&&Math.random()<.5){p[3]-=3;p[2]=mul(u.ac||p[2],.7);p[7]='x';continue}
  if(t>8.3-sink*1.6){b.set.delete(K(p[0],p[1]));n++}else{p[7]='x';p[2]=Math.random()<.6?rgb(120,18,16):rgb(70,12,10);n++}if(p[7]==='h'||p[7]==='k')b.coreHit=true}
 if(n){dab(FX.blood,b.x+nx*6,b.y+ny*6,.6+n*.04,4);for(let i=0;i<Math.min(14,n);i++)spark(b.x+nx*8,b.y+ny*8,rgb(120,18,16),-nx*1.5,-ny*1.5,1.6,10);sfx('crack');sfx('thunk');if(n>6)sfx('squish');shake=Math.max(shake,3);settle(b)}}
function debris(x,y,c,n,dx,dy){for(let i=0;i<n&&parts.length<1500;i++){const a=Math.atan2(dy,dx)+(Math.random()-.5)*2.2,v=1+Math.random()*3.2;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c:mul(c,.75+Math.random()*.4)})}}
function emberPatch(x,y,n,r){for(let i=0;i<n&&parts.length<1500;i++){const a=Math.random()*6.283,d=Math.random()*r,X=Math.round(x+Math.cos(a)*d),Y=Math.round(y+Math.sin(a)*d);if(X<0||Y<0||X>=W||Y>=H||sol[Y*W+X])continue;const c=Math.random()<.3?rgb(255,214,120):Math.random()<.6?rgb(255,140,50):rgb(210,70,24),e=300+(Math.random()*600|0);parts.push({x:X,y:Y,vx:0,vy:0,c,c0:c,em:e,em0:e})}}
// one spark burst for every metal hit, sized by k (pellet .25, ball .55, Bolter 1): white-hot core, hot sparks, embers that cool to black grit, and a scorch for big ones
function sparkBurst(x,y,dx,dy,k=1,blue){const K=k*(.7+Math.random()*.6),q=Math.sqrt(K);flash(x,y,blue?.6:1,.82,blue?1:.5,1.2*q,3,.7*Math.min(1,q+.2));
 for(let i=0,n=Math.round(34*K);i<n&&parts.length<1500;i++){const c=i<n*.2?rgb(255,255,255):blue&&i%2?rgb(200,150,255):Math.random()<.5?rgb(255,226,140):rgb(255,170,70);spark(x,y,c,-dx*2.6*q,-dy*2.6*q,3.4*q*(.5+Math.random()),6+(Math.random()*16*q|0))}
 embers(x,y,Math.max(1,Math.round(10*K)),blue);if(K>.45&&Math.random()<K*.4)emberPatch(x-dx*5,y-dy*5,4+3*K,3+2*K)}
function metalSparks(x,y,dx,dy,blue){sparkBurst(x,y,dx,dy,1,blue)}
// Lancer: a plasma-heated iron tip. Charge drives penetration, burst and shove; plate is its target, flesh barely
function lancerDebris(x,y,n){for(let i=0;i<n;i++){const r=weapon('rodp',x+(Math.random()-.5)*14,y+(Math.random()-.5)*14,Math.random()*6.283);r.stuck=true;r.glw=.6;for(const p of r.px)p[5]=.7}}
function lancerHit(b,o){const v=Math.hypot(b.vx,b.vy)||1,dx=b.vx/v,dy=b.vy/v,[x,y]=spearTip(b),c=b.chg||0,ox=Math.round(o.x),oy=Math.round(o.y);b.live=false;raiseAlarm();
 let plate=false;for(let i=-2;i<10;i++){const p=o.set.get(K(Math.round(x+dx*i)-ox,Math.round(y+dy*i)-oy));if(p){plate=p[4]===3;break}}
 if(plate){arcBlast(x,y,1);pierce(o,x,y,dx,dy,60+60*c,1,1.5+2*c);cut(o,Math.round(x),Math.round(y),1.5+1.5*c,true,9);const k=(1.2+3*c)/(o.mass||1);o.vx+=dx*k;o.vy+=dy*k;sfx('wedge');sfx('sizzle');shake=Math.max(shake,4+c*5)}
 else{const r=pierce(o,x,y,dx,dy,8+8*c,1);if(r&&r.blood){dab(FX.blood,r.x,r.y,.35,2);sfx('squish')}const k=(.5+c)/(o.mass||1);o.vx+=dx*k;o.vy+=dy*k;sfx('hiss');sfx('sizzle')}
 b.heat=.6+.4*c;b.plate=plate;b.vx=b.vy=0;b.stuck=true;b.att={id:o.id,dx:b.x-o.x,dy:b.y-o.y};wedgeIn(b);settle(o)}
// a wedged or dropped Lancer cools: its tip glows, burns the plate round it, then goes dark for good
function lancerCool(b){if(!(b.heat>0))return;b.heat=Math.max(0,b.heat-1/170);const c=Math.cos(b.ang),s=Math.sin(b.ang);for(const p of b.px)p[5]=p[0]*c+p[1]*s>6?b.heat*1.25:0;
 const o=b.att&&byId(b.att.id);if(o&&o.type==='token'){const[x,y]=spearTip(b),ox=Math.round(o.x),oy=Math.round(o.y),R=b.plate?3.5:2;for(const p of o.px){if(Math.hypot(ox+p[0]-x,oy+p[1]-y)>R)continue;p[5]=Math.max(p[5],b.heat*(p[4]===3?1.3:.9));if(b.heat>.3&&Math.random()<(p[4]===3?.03:.008)*b.heat)hitPix(o,ox+p[0],oy+p[1],2)}if(tick%9===0)spark(x,y,Math.random()<.5?rgb(255,170,70):rgb(255,240,200),0,0,.8,6)}
 if(b.heat<=0){for(const p of b.px)p[5]=0;spend(b)}}
function lancerBlast(b){const[x,y]=spearTip(b),n=1+(b.chg||0)*3;b.live=false;arcBlast(x,y,1+n*.5);metalSparks(x,y,0,0,true);for(const q of [...bodies])if((q.type==='token'||q.type==='part')&&bodies.includes(q)&&Math.hypot(q.x-x,q.y-y)<12+n*3)cut(q,Math.round(x),Math.round(y),2+n,true,3);shake=Math.max(shake,5+n);lancerDebris(x,y,2);remove(b)}
function rodBurst(x,y){flash(x,y,1,.75,.35,2.4,6,.82);embers(x,y,36);for(let i=0;i<30;i++)spark(x,y,Math.random()<.3?rgb(255,246,210):Math.random()<.6?rgb(255,200,90):rgb(255,130,40),0,0,3.2,8+(Math.random()*14|0));
 scorch(x,y,12);emberPatch(x,y,16,10);dab(SF,x,y,2.2,5);sfx('crash');sfx('crack');shake=Math.max(shake,4)}
function heatAt(o,X,Y,r,h){const ox=Math.round(o.x),oy=Math.round(o.y);for(const p of o.px)if(p[4]===3&&Math.hypot(ox+p[0]-X,oy+p[1]-Y)<=r)p[5]=Math.min(1.2,p[5]+h*(1-Math.hypot(ox+p[0]-X,oy+p[1]-Y)/(r+1)))}
function ripArmour(o,ex,ey,rx,ry,E){const R=2.4+Math.random()*1.2+E/40,cp=o.px.filter(p=>(p[7]==='a'||p[7]==='f')&&Math.hypot(p[0]-ex,p[1]-ey)<=R);if(cp.length<2)return;
 for(const p of cp)o.set.delete(K(p[0],p[1]));const mx=Math.round(cp.reduce((s,p)=>s+p[0],0)/cp.length),my=Math.round(cp.reduce((s,p)=>s+p[1],0)/cp.length);
 const f={id:uid++,type:'part',parent:o.id,unit:o.unit,nat:o.nat,status:'dead',x:o.x+mx,y:o.y+my,vx:rx*2.6+mx*.15,vy:ry*2.6+my*.15,mass:cp.length/200,px:cp.map(p=>{const z=p.slice();z[0]-=mx;z[1]-=my;z[5]=.5;return z})};mkSet(f);bodies.push(f);
 o.px=o.px.filter(p=>o.set.has(K(p[0],p[1])));mkSet(o);sfx(snd('metal','hit'))}
function unpin(b){b.pinned=false;b.stuck=false;const r=b.rod&&byId(b.rod);if(r&&r.att&&r.att.id===b.id){r.att=null;r.stuck=true}sfx(snd('metal','hit'))}
function recoilHurt(b,c,s){const u=UNITS[b.unit];if(b.type!=='token'||!(u.arm===0||u.leather))return;const sd=Math.sign(sideOf(b))||1,px=-s*sd,py=c*sd;
 const cand=b.px.filter(p=>(p[7]==='c'||p[7]==='a')&&Math.hypot(p[0],p[1])>6.3&&p[0]*px+p[1]*py>3);for(let i=0;i<(u.arm?6:9)&&cand.length;i++){const p=cand.splice((Math.random()*cand.length)|0,1)[0];b.set.delete(K(p[0],p[1]))}
 dab(FX.blood,b.x+px*7,b.y+py*7,.35,2);sfx('squish');settle(b)}
const metalAt=(o,x,y,dx,dy)=>{const ox=Math.round(o.x),oy=Math.round(o.y);for(let i=-6;i<12;i++){const p=o.set.get(K(Math.round(x+dx*i)-ox,Math.round(y+dy*i)-oy));if(p)return p[4]===3}return false};
function pierce(o,x,y,dx,dy,E,ap,maxD){const ox=Math.round(o.x),oy=Math.round(o.y);let ex=null,ey=0;
 for(let i=0;i<24&&o.set.has(K(Math.round(x)-ox,Math.round(y)-oy));i++){x-=dx;y-=dy}
 let last=null,inside=false,removed=0,blood=false,miss=0;
 for(let i=0;i<60;i++){x+=dx*.5;y+=dy*.5;const k=K(Math.round(x)-ox,Math.round(y)-oy);if(k===last)continue;last=k;const p=o.set.get(k);
  if(!p){if(inside&&++miss>3)break;continue}if(ex===null){ex=x;ey=y}if(maxD&&Math.hypot(x-ex,y-ey)>maxD)return{stop:true,p,x,y,blood,removed};inside=true;miss=0;const ra=o.type!=='token'||p[7]==='f'||p[10]===undefined?p[7]:p[4]===3?'a':p[7]==='a'?'s':p[7],hp=ra==='s'?Math.min(p[3],p[10]==='l'?2:1):p[3],f=ra==='f'?(frontOf(o,p)?ap:1/p[3]):ra==='a'?ap:1,cost=hp*f*((ra==='a'||ra==='f')&&f>=ap*.9?1/Math.max(.45,Math.abs(dx*p[8]+dy*p[9])/(Math.hypot(p[8],p[9])||1)):1);
  if(E>=cost){E-=cost;o.set.delete(k);removed++;if(p[7]==='h'||p[7]==='k')o.coreHit=true;if(ra!=='a')blood=true}
  else{p[3]-=Math.max(1,Math.floor(E/f));if(p[3]<=0){o.set.delete(k);removed++}if(ra!=='a')blood=true;if(p[3]<=0&&(p[7]==='h'||p[7]==='k'))o.coreHit=true;return{stop:true,p,x,y,blood,removed}}}
 return{stop:false,E,x,y,blood,removed}}
const aimedAt=(b,o)=>b.ax!==undefined&&Math.hypot(o.x-b.ax,o.y-b.ay)<12;
function hitBodies(b,s){const bx=Math.round(b.x),by=Math.round(b.y);
 for(const o of bodies){if(o===b||(o.type==='weapon'&&o.kind!=='crate')||o.type==='slab'||o.status==='dead'||o.id===b.from||inDrag(o))continue;if(Math.abs(o.x-b.x)>30||Math.abs(o.y-b.y)>30)continue;if(b.vol&&o.type==='token'&&(o.nat||'-')===b.vol&&Math.hypot(o.x-b.sx,o.y-b.sy)<b.vr&&!aimedAt(b,o))continue;
  const ox=Math.round(o.x),oy=Math.round(o.y);const ov=[];for(const p of b.px){if(o.set.has(K(bx+p[0]-ox,by+p[1]-oy)))ov.push([bx+p[0],by+p[1]])}if(!ov.length)continue;
  if(b.type==='weapon'){const w=WP[b.kind];
   if(w.rod&&o.type==='token'){if(b.hit&&b.hit.has(o.id))continue;(b.hit||(b.hit=new Set())).add(o.id);if(rodBody(b,o,s))return true;continue}
   if(b.kind==='sspear'&&b.live){lancerHit(b,o);return true}
   if(w.bullet||w.sharp){if(b.hit&&b.hit.has(o.id))continue;(b.hit||(b.hit=new Set())).add(o.id);
    const dx=b.vx/(s||1),dy=b.vy/(s||1),tip=w.tip||0;let E=w.bullet?b.E:(b.kind==='spear'||b.kind==='sspear'?s*.5:b.kind==='sword'?s*.4:(b.E||s*.22));const fo=w.bullet?fall(b):1;E*=fo*(b.ep||1);
    const pm=o.kind==='crate'?(o.metal?metalCls('iron'):2):o.type==='token'?(metalAt(o,b.x+dx*tip,b.y+dy*tip,dx,dy)?metalCls(uMetal(o)):0):o.mat||0,pM=pm?hcl(pm):null;
    const r=pierce(o,b.x+dx*tip,b.y+dy*tip,dx,dy,E,b.ap||w.ap||1);if(pM&&pM.metal&&r.blood&&b.kind!=='arc')b.kind==='pel'?sfxP(pM.hit,.4):sfx(pM.hit);if(pM&&(pM.metal||!r.blood)&&b.kind!=='arc')hitParts(r.x,r.y,pm,dx,dy,b.kind==='pel'?.25:b.kind==='pball'?.4:.55);
    if(o.kind==='crate'){sfx(pM.metal?'ping':pM.knock);cShot(o,Math.round(r.x),Math.round(r.y),1.5,b)}else if(r.blood){dab(FX.blood,r.x,r.y,.6+r.removed*.05,3);b.kind==='pel'?sfxP('squish'):sfx('squish')}else if(w.bullet&&b.kind!=='arc'){if(o.type==='token'&&!(pM&&pM.metal))(b.kind==='pel'?sfxP('thunk',.4):sfx('thunk'));else{const k=(pM||hcl(2)).hit;b.kind==='pel'?sfxP(k,o.type==='token'?.4:undefined):sfx(k)}}else sfx(b.kind==='spear'||b.kind==='sspear'?'wedge':'clink');
    o.vx+=dx*.5*b.mass/o.mass;o.vy+=dy*.5*b.mass/o.mass;
    if(b.kind==='arc'){BLU=!!b.blue;if(!r.blood){sfx('boltmetal');metalSparks(r.x,r.y,dx,dy,true)}arcHit(r.x,r.y);cut(o,Math.round(r.x),Math.round(r.y),2*(b.big?1+b.big*.5:1),true,3);if(b.big)arcBlast(r.x,r.y,b.big);BLU=false}
    if(r.stop){if(w.bullet){if(o.set.has(K(r.p[0],r.p[1])))r.p[7]=r.p[7]==='a'?'a':'o';remove(b)}else{b.att={id:o.id,dx:b.x-o.x,dy:b.y-o.y};b.vx=b.vy=0;b.stuck=true;wedgeIn(b);}settle(o);return true}
    if(w.bullet)b.E=r.E/fo;b.vx*=.8;b.vy*=.8;settle(o);continue}
   if(b.kind==='cannon'){let n=0;for(const[X,Y]of ov)if(hitPix(o,X,Y,3)===2)n++;if(n){dab(FX.blood,ov[0][0],ov[0][1],.5+n*.03,3);sfx('squish');settle(o)}if(bodies.includes(o)){o.vx+=b.vx*.2;o.vy+=b.vy*.2}continue}
   if(b.kind==='pot'){shatter(b);return true}if(b.kind==='sbomb'){shockBurst(b);return true}
   // grenades bounce off people rather than sticking to them
   if(b.kind==='grenade'||b.kind==='bomb'){const s=Math.hypot(b.vx,b.vy)||1,nx=(b.x-o.x)/(Math.hypot(b.x-o.x,b.y-o.y)||1),ny=(b.y-o.y)/(Math.hypot(b.x-o.x,b.y-o.y)||1);b.vx=nx*s*.35;b.vy=ny*s*.35;b.x+=nx*2;b.y+=ny*2;sfx('thunk');return true}
   b.vx*=-.3;b.vy*=-.3;sfx(snd('metal','hit'));return true}
  const m1=b.mass||1,m2=o.mass||1,f=m1/(m1+m2);o.vx+=b.vx*f*1.3;o.vy+=b.vy*f*1.3;o.stuck=false;b.vx*=.3;b.vy*=.3;sfx('thunk');
  if(s>6){const[X,Y]=ov[0];cut(o,X,Y,1.5,true);if(bodies.includes(b))cut(b,X,Y,1.2,true)}return true}
 return false}
function step(b){if(b.type==='slab'||b.hidden||inDrag(b))return;if(b.lob){lobStep(b);return}
 if(b.att){const o=byId(b.att.id);if(!o){b.att=null;b.stuck=false}else{const A=b.att;if(o.type==='token'){if(A.la===undefined){const c=Math.cos(-(o.ang||0)),s=Math.sin(-(o.ang||0));A.lx=A.dx*c-A.dy*s;A.ly=A.dx*s+A.dy*c;A.la=b.ang-(o.ang||0)}const c=Math.cos(o.ang||0),s=Math.sin(o.ang||0);A.dx=A.lx*c-A.ly*s;A.dy=A.lx*s+A.ly*c;const na=(o.ang||0)+A.la;if(Math.abs(Math.atan2(Math.sin(na-b.ang),Math.cos(na-b.ang)))>.04)reshape(b,na)}b.x=o.x+A.dx;b.y=o.y+A.dy;return}}
 if(b.glide){const dx=b.glide[0]-b.x,dy=b.glide[1]-b.y,d=Math.hypot(dx,dy);if(d<3){b.x=b.glide[0];b.y=b.glide[1];b.glide=null;b.ghost=false}else{b.x+=dx/d*3;b.y+=dy/d*3;b.mv=6}return}
 if(b.stuck)return;
 let s=Math.hypot(b.vx,b.vy);if(s<.06){b.vx=b.vy=0;if(b.kind==='pot'&&b.thrown)shatter(b);if(b.kind==='sbomb'&&b.thrown)shockBurst(b);if(b.kind==='sspear'&&b.live&&!b.stuck&&!b.att){b.live=false;b.heat=Math.max(b.heat||0,.3+.4*(b.chg||0))}return}
 b.mv=6;const n=Math.ceil(s);
 for(let i=0;i<n;i++){for(let axis=0;axis<2;axis++){const d=(axis?b.vy:b.vx)/n;if(!d)continue;const ox=axis?0:d,oy=axis?d:0;
   const h=b.ghost?null:solidHits(b,ox,oy);
   if(!h){b.x+=ox;b.y+=oy;if(b.type==='weapon'&&WP[b.kind].bullet&&b.vx*b.vx+b.vy*b.vy>16&&lowHit(b))return;if((b.range||b.thrown)&&hitVolatile(b))return;if(hitBodies(b,s)){b.x-=ox;b.y-=oy}if(!bodies.includes(b))return;continue}
   if(impact(b,h,axis)&&(b.stuck||!bodies.includes(b)))return}
  if(b.ghost&&!solidHits(b,0,0))b.ghost=false}
 if(b.tang!==undefined&&!b.stuck){const d=Math.atan2(Math.sin(b.tang-b.ang),Math.cos(b.tang-b.ang)),a0=b.ang,na=Math.abs(d)<.18?b.tang:b.ang+Math.sign(d)*.18;reshape(b,na);if(b.ghost&&solidHits(b,0,0)){reshape(b,a0);b.ghost=false;b.tang=undefined}else if(na===b.tang)b.tang=undefined}
 let fr=b.type==='weapon'?WP[b.kind].fr:.9;if(b.range){b.dist=(b.dist||0)+s;if(b.dist>b.range)fr=.72}b.vx*=fr;b.vy*=fr;
 if(b.type==='weapon'&&Math.hypot(b.vx,b.vy)<1.2&&WP[b.kind].sharp){b.vx*=.7;b.vy*=.7}}
function hitVolatile(b){if(!WP[b.kind])return false;const bx=Math.round(b.x),by=Math.round(b.y);for(const o of bodies){if(o===b||(o.kind!=='grenade'&&o.kind!=='pot'&&o.kind!=='bomb')||Math.abs(o.x-b.x)>9||Math.abs(o.y-b.y)>9)continue;const ox=Math.round(o.x),oy=Math.round(o.y);if(!b.px.some(p=>o.set.has(K(bx+p[0]-ox,by+p[1]-oy))))continue;
  if(o.kind==='grenade'){remove(b);detonate(o);return true}
  if(o.kind==='bomb'&&b.kind==='arc'){remove(b);detonate(o);return true}if(o.kind==='bomb'){if(b.hit&&b.hit.has(o.id))continue;(b.hit||(b.hit=new Set())).add(o.id);const s=Math.hypot(b.vx,b.vy)||1,dx=b.vx/s,dy=b.vy/s,w=WP[b.kind],r=pierce(o,b.x,b.y,dx,dy,w.bullet?b.E:s*.5,w.ap||1);o.px=o.px.filter(p=>o.set.has(K(p[0],p[1])));hitFx(r.x,r.y,3,dx,dy);
   if(o.coreHit){remove(b);detonate(o);return true}if(r.stop){if(w.bullet)remove(b);else{b.vx*=-.2;b.vy*=-.2}sfx(snd('metal','glance'));return true}if(w.bullet)b.E=r.E;continue}
  shatter(o)}
 const w=WP[b.kind];if(!w.bullet&&!w.sharp)return false;
 for(const o of bodies){if(o.type!=='token'||!o.held||o.held.k!=='shield'||o.id===b.from||Math.abs(o.x-b.x)>40||Math.abs(o.y-b.y)>40||(b.vol&&(o.nat||'-')===b.vol&&Math.hypot(o.x-b.sx,o.y-b.sy)<b.vr&&!aimedAt(b,o)))continue;
  const hp=heldPix(o),hit=hp.filter(q=>b.px.some(p=>bx+p[0]===q[0]&&by+p[1]===q[1]));if(!hit.length)continue;if(b.kind==='sspear'||b.kind==='arc'){shieldBurst(o,b);return true}
  const s=Math.hypot(b.vx,b.vy)||1;let E=w.bullet?b.E:s*.5;const dm=o.held.dmg||(o.held.dmg={});
  for(const q of hit){const left=7-(dm[q[3]]||0);if(E>=left){E-=left;dm[q[3]]=7}else{dm[q[3]]=(dm[q[3]]||0)+Math.max(1,Math.floor(E));E=0}}
  hitFx(b.x,b.y,3,b.vx/s,b.vy/s);o.vx+=b.vx/s*.4;o.vy+=b.vy/s*.4;
  if(E<=0){if(w.bullet)remove(b);else{b.vx*=-.25;b.vy*=-.25}sfx(snd('metal','glance'));return true}
  if(w.bullet)b.E=E;return false}
 return false}
function stepParts(){for(const p of parts){p.x+=p.vx;p.y+=p.vy;const X=Math.round(p.x),Y=Math.round(p.y);if(X<0||Y<0||X>=W||Y>=H||sol[Y*W+X]||slabG[Y*W+X]){p.x-=p.vx;p.y-=p.vy;p.vx*=-.3;p.vy*=-.3}p.vx*=.84;p.vy*=.84;
  if(p.em!==undefined){if(Math.abs(p.vx)+Math.abs(p.vy)<.15){p.vx=p.vy=0;p.em--;p.c=mix(p.c0,rgb(56,36,28),Math.min(1,(1-p.em/p.em0)*1.15));if(p.em<=0){const X2=Math.round(p.x),Y2=Math.round(p.y);if(X2>=0&&Y2>=0&&X2<W&&Y2<H&&!sol[Y2*W+X2])floor[Y2*W+X2]=mul(floor[Y2*W+X2],.28);{const j2=Y2*W+X2+(Math.random()<.5?1:W);if(j2<N&&!sol[j2])floor[j2]=mul(floor[j2],.5)}p.dead=1}}continue}
  if(p.life!==undefined){if(--p.life<=0)p.dead=1;continue}
  if(Math.abs(p.vx)+Math.abs(p.vy)<.12){const X2=Math.round(p.x),Y2=Math.round(p.y);if(X2>=0&&Y2>=0&&X2<W&&Y2<H&&!sol[Y2*W+X2])floor[Y2*W+X2]=mul(p.c,.85);p.dead=1}}
 parts=parts.filter(p=>!p.dead)}
function cool(){for(const b of [...bodies,...VEH]){if(b.type==='weapon'||b.cold&&tick-b.cold<30)continue;let hot=false;for(const p of b.px)if(p[5]>0){p[5]=Math.max(0,p[5]-1/600);hot=true}b.cold=hot?0:tick}if(whOn&&tick%2===0){let any=false;for(let j=0;j<N;j++)if(WH[j]>0){WH[j]=Math.max(0,WH[j]-.0007-WH[j]*.0022);any=true;if(WH[j]>.06&&Math.random()<WH[j]*.02){const X=j%W,Y=j/W|0;ST[(Y>>1)*BW+(X>>1)]+=.9;fxDirty=true}}whOn=any}}

// effects
const FXC={b0:hx('#5a0a0e'),b1:hx('#76121a'),b2:hx('#8e161c'),b3:hx('#b8343a'),f:['#c86a26','#a8541e','#d8782a','#eea036','#f7c654','#ffe08a','#fff6c8'].map(hx)};
