// World layers: one height value per pixel, terrain read off height (sand at the shore, rock up high, snow on peaks), forest as a soft mask, provinces as ids; everything paintable
const N=3200,cv=document.getElementById('v'),g=cv.getContext('2d'),prog=document.getElementById('prog');
let WW=N,HH=N,ICE=null,H,F,MS,DY,P,NI,IMG,base,bctx,ov,octx,BURGS=[],NATS=[],NLAB=[],mode='world',tool='pan',size=1,busy=false;
const view={x:0,y:0,k:1},tick=()=>new Promise(r=>setTimeout(r,0));
const hsh=(x,y,s)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s,1442695041);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296};
function vn(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=hsh(xi,yi,s),b=hsh(xi+1,yi,s),c=hsh(xi,yi+1,s),d=hsh(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm(x,y,s,o){let t=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){t+=vn(x*f,y*f,s+i*7)*a;n+=a;a*=.5;f*=2.03}return t/n}
const sst=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)},mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
function blur(a,w,h,r,passes=3){const t=new Float32Array(a.length),k=1/(2*r+1);for(let p=0;p<passes;p++){
 for(let y=0;y<h;y++){const o=y*w;let s=0;for(let x=-r;x<=r;x++)s+=a[o+Math.min(w-1,Math.max(0,x))];for(let x=0;x<w;x++){t[o+x]=s*k;s+=a[o+Math.min(w-1,x+r+1)]-a[o+Math.max(0,x-r)]}}
 for(let x=0;x<w;x++){let s=0;for(let y=-r;y<=r;y++)s+=t[Math.min(h-1,Math.max(0,y))*w+x];for(let y=0;y<h;y++){a[y*w+x]=s*k;s+=t[Math.min(h-1,y+r+1)*w+x]-t[Math.max(0,y-r)*w+x]}}}}
const bar=p=>{prog.style.width=(p*100)+'%';prog.style.opacity=p>=1?0:1};

// terrain from height: the same rules for the converted world, the sketch and every brush stroke
const SEA=[[200,222,224],[164,198,206],[120,160,178],[92,134,156]],LOW=[156,164,102],MID=[132,142,86],DRY=[178,170,112],MARSH=[112,132,104],SAND=[216,200,152],ROCK=[142,130,114],SNOW=[238,238,234],TREE=[84,108,60],TREED=[66,88,48];
// pixel style: height falls into flat terraces with a few colours each; terrace edges catch the light or drop a hard line, and high ground casts a dithered shadow to the south-east
const STEP=.045,LAND=[[218,202,150],[164,170,104],[152,160,96],[140,150,88],[128,138,82],[132,128,96],[138,126,110],[128,116,102],[150,140,128],[236,236,232],[246,246,242]];
const WAT=[[168,204,210],[136,180,194],[112,158,180],[94,140,166],[82,126,154]],FOAM=[214,232,232];
const GRN=[[170,176,108],[160,168,100],[150,160,94],[140,152,88],[130,142,82],[120,132,78],[112,122,74],[106,114,72]],RCK=[[134,124,104],[126,116,100],[118,110,96],[112,104,94],[106,100,92],[100,96,92]],SNW=[[226,228,226],[238,238,236],[246,246,244]];
const landCol=b=>b===0?LAND[0]:b<=8?GRN[b-1]:b<=14?RCK[b-9]:SNW[Math.min(2,b-15)];
const bandOf=e=>e<0?-1:e<.022?0:Math.min(17,1+Math.floor((e-.022)/STEP));
function colorAt(i,x,y){const e=H[i];let c;
 if(e<0){if(ICE&&ICE[i])return(x+y)&1?[226,232,234]:[214,222,226];
  let coast=0;for(let d=1;d<=3&&!coast;d++)if(H[i-d]>=0||H[i+d]>=0||H[i-d*WW]>=0||H[i+d*WW]>=0)coast=d;
  if(coast===1)return FOAM;if(coast&&((x+y)&1))return mix(FOAM,WAT[0],.5);const k=Math.min(WAT.length-1,Math.floor(-e/.09));c=WAT[k];if(k<WAT.length-1&&-e>(k+.7)*.09&&((x^y)&1))c=WAT[k+1];if(hsh(x>>2,y,4)>.985)c=mix(c,FOAM,.35);return c}
 const b=Math.max(0,bandOf(e+(vn(x/9,y/9,5)-.5)*.012));c=landCol(b);
 if(b>0&&b<9){if(DY&&DY[i]>.5)c=mix(c,[184,172,112],.5);if(MS&&MS[i]>.5)c=(x%4||y%4)?mix(c,[104,124,100],.5):[120,152,150]}
 // tree crowns on a jittered 4px grid: lit top-left, shaded bottom-right
 if(F&&e<.6&&F[i]+(fbm(x/45,y/45,61,3)-.5)*.9>.5){const gx=x>>2,gy=y>>2,cx=gx*4+1.5+(hsh(gx,gy,8)-.5)*1.5,cy=gy*4+1.5+(hsh(gx,gy,9)-.5)*1.5,dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy);
  c=r<1.7?(dx+dy<-1?[106,132,74]:dx+dy>1?[62,84,46]:[82,106,58]):[54,74,40]}
 // terrace edges
 const bu=bandOf(H[i-WW-1]),bd=bandOf(H[i+WW+1]);if(bu>=0&&bu<b)c=mix(c,[255,250,236],.18);else if(bd>=0&&bd<b)c=mix(c,[30,26,22],.28);
 // cast shadow from higher ground to the north-west, dithered so it reads soft
 let sh=0;for(let d=2;d<=14;d+=2){const j=i-d*(WW+1);if(j<0)break;if(H[j]>e+d*.004){sh=d<8?2:1;break}}
 if(sh===2)c=mix(c,[40,36,44],(x+y)&1?.3:.22);else if(sh===1&&((x+y)&1))c=mix(c,[40,36,44],.2);
 if(P&&P[i]>=0&&NI){const nc=NATS[NI[P[i]]];if(nc)c=mix(c,nc.rgb,.12)}return c}
function recolor(x0,y0,x1,y1){x0=Math.max(1,x0|0);y0=Math.max(1,y0|0);x1=Math.min(WW-2,x1|0);y1=Math.min(HH-2,y1|0);const d=IMG.data;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*WW+x,c=colorAt(i,x,y),j=i*4;d[j]=c[0];d[j+1]=c[1];d[j+2]=c[2];d[j+3]=255}
 if(P)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*WW+x;if(H[i]<0||P[i]<0)continue;const a=P[i],r=P[i+1]<0?a:P[i+1],b=P[i+WW]<0?a:P[i+WW];if(a===r&&a===b)continue;
  const nat=NI[a],other=r!==a?NI[r]:NI[b],j=i*4,nc=NATS[nat];if(nat!==other&&nc){const k=mix(nc.rgb,[30,26,22],.35);d[j]=k[0];d[j+1]=k[1];d[j+2]=k[2];const j2=(r!==a?i+1:i+WW)*4;{d[j2]=k[0];d[j2+1]=k[1];d[j2+2]=k[2]}}
  else{d[j]*=.84;d[j+1]*=.84;d[j+2]*=.84}}
 bctx.putImageData(IMG,0,0,x0,y0,x1-x0+1,y1-y0+1)}

// roads join at the midpoints of their edges, so every bend and junction comes out round
function drawRoads(edges,pts){const adj=new Map();for(const[a,b,m]of edges){(adj.get(a)||adj.set(a,[]).get(a)).push([b,m]);(adj.get(b)||adj.set(b,[]).get(b)).push([a,m])}
 const mid=(a,b)=>[(pts[a][0]+pts[b][0])/2,(pts[a][1]+pts[b][1])/2];
 for(const pass of[0,1])for(const[v,L]of adj){const P0=pts[v];const seg=(a,b,main)=>{octx.lineWidth=main?(pass?2.4:4.4):(pass?1.4:3);octx.strokeStyle=pass?(main?'#efe6cc':'#e2d6b4'):'rgba(70,56,40,.55)';octx.beginPath();const A=mid(v,a);octx.moveTo(A[0],A[1]);if(b==null)octx.lineTo(P0[0],P0[1]);else{const B=mid(v,b);octx.quadraticCurveTo(P0[0],P0[1],B[0],B[1])}octx.stroke()};
  if(L.length===1)seg(L[0][0],null,L[0][1]);else for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++)seg(L[i][0],L[j][0],L[i][1]&&L[j][1])}}
function newLayers(w,h){WW=w;HH=h;H=new Float32Array(w*h);base=document.createElement('canvas');base.width=w;base.height=h;bctx=base.getContext('2d');ov=document.createElement('canvas');ov.width=w;ov.height=h;octx=ov.getContext('2d');octx.lineCap=octx.lineJoin='round';IMG=bctx.createImageData(w,h)}

async function fromWorld(){const D=DATA,[[bx,by],[bx1,by1]]=D.box,s=N/(bx1-bx),X=q=>(q[0]-bx)*s,Y=q=>(q[1]-by)*s;newLayers(N,Math.round((by1-by)*s));bar(.05);await tick();
 const cc=document.createElement('canvas');cc.width=WW;cc.height=HH;const x=cc.getContext('2d'),nc=D.cells.length;
 D.cells.forEach((cl,i)=>{const id=i+1,r=id>>8,gg=id&255,b=(r*37+gg*11+91)&255;x.fillStyle=`rgb(${r},${gg},${b})`;x.beginPath();cl[0].forEach((q,j)=>j?x.lineTo(X(q),Y(q)):x.moveTo(X(q),Y(q)));x.closePath();x.fill()});
 const d=x.getImageData(0,0,WW,HH).data,C=new Int16Array(WW*HH);for(let i=0,j=0;i<C.length;i++,j+=4){const r=d[j],gg=d[j+1],b=d[j+2],id=r*256+gg;C[i]=id>0&&id<=nc&&b===((r*37+gg*11+91)&255)?id-1:-1}
 for(let i=1;i<C.length;i++)if(C[i]<0)C[i]=C[i-1];if(C[0]<0)C[0]=0;bar(.15);await tick();
 F=new Float32Array(WW*HH);MS=new Float32Array(WW*HH);DY=new Float32Array(WW*HH);ICE=new Uint8Array(WW*HH);
 for(let i=0;i<C.length;i++){const cl=D.cells[C[i]],h=cl[1];H[i]=h<20?(h-20)/20:(h-20)/80;F[i]=cl[2];MS[i]=cl[4]===12?1:0;DY[i]=cl[4]>=1&&cl[4]<=3?1:0;ICE[i]=cl[3]}
 blur(H,WW,HH,15);bar(.3);await tick();blur(F,WW,HH,18);blur(MS,WW,HH,7);blur(DY,WW,HH,14);bar(.45);await tick();
 for(let y=0;y<HH;y++){for(let x=0;x<WW;x++){const i=y*WW+x,e=H[i];let v=e+(fbm(x/150,y/150,1,4)-.5)*.13;const m=sst(.3,.7,e);if(m>0){const r=1-Math.abs(2*fbm(x/70,y/70,11,4)-1);v+=m*(r-.45)*.55}H[i]=v}if(y%200===0){bar(.45+.3*y/HH);await tick()}}
 // provinces: each pixel takes its cell's province through a gentle warp, so borders wander like real ones
 P=new Int16Array(WW*HH);NI=[];NATS=[];const nk=Object.keys(D.nats);for(const n of nk)NATS.push({n:D.nats[n].n,rgb:hex(D.nats[n].c)});for(const p of D.provs)NI.push(nk.indexOf(p.nat));
 for(let y=0;y<HH;y++){for(let x=0;x<WW;x++){const i=y*WW+x;if(H[i]<0){P[i]=-1;continue}const dx=(fbm(x/90,y/90,21,3)-.5)*70,dy=(fbm(x/90,y/90,41,3)-.5)*70,X=Math.min(WW-1,Math.max(0,x+dx|0)),Y=Math.min(HH-1,Math.max(0,y+dy|0));P[i]=D.cells[C[Y*WW+X]][5]}if(y%400===0){bar(.75+.1*y/HH);await tick()}}
 for(let k=0;k<2;k++){for(let i=1;i<P.length;i++)if(P[i]<0&&H[i]>=0)P[i]=P[i-1];for(let i=P.length-2;i>=0;i--)if(P[i]<0&&H[i]>=0)P[i]=P[i+1]}
 recolor(0,0,WW,HH);bar(.92);await tick();
 const pts=D.cen.map(q=>[X(q),Y(q)]);drawRoads(D.roads,pts);
 octx.strokeStyle='rgba(96,138,152,.9)';for(const r of D.rivers){if(r.length<2)continue;octx.lineWidth=1.6;octx.beginPath();r.forEach((q,j)=>j?octx.lineTo(X(q),Y(q)):octx.moveTo(X(q),Y(q)));octx.stroke()}
crisp(0,0,WW,HH);
 BURGS=D.burgs.map(b=>({n:b[0],x:X([b[1]]),y:Y([0,b[2]]),g:b[3]}));
 const sum=NATS.map(()=>[0,0,0]);for(let y=0;y<HH;y+=8)for(let x=0;x<WW;x+=8){const p=P[y*WW+x];if(p>=0&&H[y*WW+x]>=0){const q=sum[NI[p]];q[0]+=x;q[1]+=y;q[2]++}}
 NLAB=sum.map((q,i)=>q[2]>40?{n:NATS[i].n,x:q[0]/q[2],y:q[1]/q[2]}:null).filter(Boolean);bar(1)}

// a sketched outline becomes land: the inside rises away from the coast, peaks where it is deepest
async function fromSketch(){const im=new Image();im.src=SKETCH;await im.decode();const w=N,h=Math.round(N*im.height/im.width);newLayers(w,h);bar(.05);await tick();
 const cc=document.createElement('canvas');cc.width=w;cc.height=h;const x=cc.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);const d=x.getImageData(0,0,w,h).data;
 const L=new Float32Array(w*h);for(let i=0,j=0;i<L.length;i++,j+=4)L[i]=d[j]+d[j+1]+d[j+2]<300?1:0;blur(L,w,h,16,1);
 const sea=new Uint8Array(w*h),st=new Int32Array(w*h);let sp=0;const push=i=>{if(!sea[i]&&L[i]<.008){sea[i]=1;st[sp++]=i}};
 for(let X=0;X<w;X++){push(X);push((h-1)*w+X)}for(let Y=0;Y<h;Y++){push(Y*w);push(Y*w+w-1)}
 while(sp){const i=st[--sp],X=i%w;if(X>0)push(i-1);if(X<w-1)push(i+1);if(i>=w)push(i-w);if(i<w*(h-1))push(i+w)}bar(.2);await tick();
 for(let i=0;i<H.length;i++)H[i]=sea[i]?0:1;blur(H,w,h,26);bar(.35);await tick();const D2=Float32Array.from(H);blur(D2,w,h,70,2);bar(.5);await tick();
 F=new Float32Array(w*h);P=null;NI=null;MS=null;DY=null;ICE=null;
 for(let y=0;y<h;y++){for(let X=0;X<w;X++){const i=y*w+X,c=H[i]-.5,deep=sst(.6,.98,D2[i]),rng=sst(.52,.68,fbm(X/420,y/420,51,3));let v=c<0?c*.9:c*.2+deep*.1+deep*rng*.5;v+=(fbm(X/150,y/150,1,4)-.5)*.12;const m=sst(.3,.7,v);if(m>0){const r=1-Math.abs(2*fbm(X/70,y/70,11,4)-1);v+=m*(r-.45)*.6}H[i]=v;F[i]=v>.03&&v<.4?sst(.5,.6,fbm(X/140,y/140,31,4)):0}if(y%200===0){bar(.5+.4*y/h);await tick()}}
 blur(F,w,h,6,2);recolor(0,0,w,h);BURGS=[];NLAB=[];bar(1)}

// overlay pixels are either there or not, like everything else on the map
function crisp(x0,y0,w,h){x0=Math.max(0,x0|0);y0=Math.max(0,y0|0);w=Math.min(WW-x0,w|0);h=Math.min(HH-y0,h|0);if(w<=0||h<=0)return;const im=octx.getImageData(x0,y0,w,h),d=im.data;for(let j=3;j<d.length;j+=4)d[j]=d[j]>110?255:0;octx.putImageData(im,x0,y0)}
// view
const fitView=()=>{const k=Math.min(cv.width/WW,cv.height/HH);view.k=k;view.x=(cv.width-WW*k)/2;view.y=(cv.height-HH*k)/2};
function size2(){const r=devicePixelRatio||1;cv.width=innerWidth*r;cv.height=innerHeight*r}
const S2W=(x,y)=>[(x-view.x)/view.k,(y-view.y)/view.k];
function draw(){g.setTransform(1,0,0,1,0,0);g.fillStyle='#1b1c1d';g.fillRect(0,0,cv.width,cv.height);if(!base)return;g.imageSmoothingEnabled=view.k<1;g.setTransform(view.k,0,0,view.k,view.x,view.y);g.drawImage(base,0,0);g.drawImage(ov,0,0);g.setTransform(1,0,0,1,0,0);
 const r=devicePixelRatio||1,z=view.k;
 if(z<.9)for(const l of NLAB){const[X,Y]=[l.x*z+view.x,l.y*z+view.y];g.font=`${Math.round(15*r)}px 'IM Fell English SC',serif`;g.textAlign='center';g.fillStyle='rgba(40,32,26,.55)';g.fillText(l.n.toUpperCase().split('').join(' '),X,Y)}
 for(const b of BURGS){const show=b.g==='capital'||z>.45&&b.g==='town'||z>.9;if(!show)continue;const X=b.x*z+view.x,Y=b.y*z+view.y,q=(b.g==='capital'?5:b.g==='town'?3.5:2.5)*r;
  if(b.g==='capital'){g.fillStyle='#2a1a16';g.fillRect(X-q-1.5*r,Y-q-1.5*r,2*q+3*r,2*q+3*r);g.fillStyle='#8e2a22';g.fillRect(X-q,Y-q,2*q,2*q)}else if(b.g==='town'){g.fillStyle='#2a221c';g.fillRect(X-q-r,Y-q-r,2*q+2*r,2*q+2*r);g.fillStyle='#f2ecdc';g.fillRect(X-q,Y-q,2*q,2*q)}else{g.fillStyle='#211c18';g.fillRect(X-q,Y-q,2*q,2*q)}
  g.font=`${Math.round((b.g==='capital'?15:12)*r)}px 'IM Fell English',serif`;g.textAlign='left';g.lineWidth=3*r;g.strokeStyle='rgba(242,236,220,.75)';g.strokeText(b.n,X+q+4*r,Y+4*r);g.fillStyle='#2a221c';g.fillText(b.n,X+q+4*r,Y+4*r)}}

// brushes: raise and lower move height with a soft falloff, so slopes stay smooth; forest and roads paint their own layers
const RAD=[14,30,60];let last=null;
function brush(wx,wy){const R=RAD[size],x0=Math.max(1,wx-R*2|0),x1=Math.min(WW-2,wx+R*2|0),y0=Math.max(1,wy-R*2|0),y1=Math.min(HH-2,wy+R*2|0),s2=2*R*R;
 if(tool==='road'){if(last){octx.lineWidth=[1.6,2.6,4][size]+2;octx.strokeStyle='rgba(70,56,40,.55)';octx.beginPath();octx.moveTo(last[0],last[1]);octx.lineTo(wx,wy);octx.stroke();octx.lineWidth=[1.6,2.6,4][size];octx.strokeStyle='#efe6cc';octx.stroke();crisp(Math.min(last[0],wx)-8,Math.min(last[1],wy)-8,Math.abs(wx-last[0])+16,Math.abs(wy-last[1])+16)}last=[wx,wy];return}
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const w=Math.exp(-((x-wx)**2+(y-wy)**2)/s2);if(w<.01)continue;const i=y*WW+x;
  if(tool==='raise')H[i]+=.018*w;else if(tool==='lower')H[i]-=.018*w;else if(tool==='forest'){if(!F)F=new Float32Array(WW*HH);F[i]=Math.min(1.2,F[i]+.12*w)}else if(tool==='clear'&&F)F[i]=Math.max(-.3,F[i]-.15*w)}
 recolor(x0-1,y0-1,x1+1,y1+1)}

// controls
const B=document.getElementById('bar');
function ui(){B.innerHTML='';const add=(t,on,fn)=>{const b=document.createElement('button');b.textContent=t;if(on)b.classList.add('on');b.onclick=fn;B.append(b)},sep=()=>{const s=document.createElement('span');s.className='sep';B.append(s)};
 add('World',mode==='world',()=>go('world'));add('Sketch',mode==='sketch',()=>go('sketch'));sep();
 for(const[k,n]of[['pan','Pan'],['raise','Raise'],['lower','Lower'],['forest','Forest'],['clear','Clear'],['road','Road']])add(n,tool===k,()=>{tool=k;cv.style.cursor=k==='pan'?'grab':'crosshair';ui()});sep();
 ['S','M','L'].forEach((n,i)=>add(n,size===i,()=>{size=i;ui()}))}
async function go(m){if(busy)return;busy=true;mode=m;ui();base=null;draw();try{if(m==='world')await fromWorld();else await fromSketch()}catch(e){console.error(e)}fitView();draw();busy=false}
let drag=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);const r=devicePixelRatio||1,x=e.offsetX*r,y=e.offsetY*r;if(tool==='pan'||e.button!==0){drag={x,y,vx:view.x,vy:view.y};cv.style.cursor='grabbing'}else{drag={paint:1};last=null;const[wx,wy]=S2W(x,y);brush(wx,wy);draw()}});
cv.addEventListener('pointermove',e=>{if(!drag)return;const r=devicePixelRatio||1,x=e.offsetX*r,y=e.offsetY*r;if(drag.paint){const[wx,wy]=S2W(x,y);brush(wx,wy);draw();return}view.x=drag.vx+x-drag.x;view.y=drag.vy+y-drag.y;draw()});
cv.addEventListener('pointerup',()=>{drag=null;last=null;cv.style.cursor=tool==='pan'?'grab':'crosshair'});
cv.addEventListener('wheel',e=>{e.preventDefault();const r=devicePixelRatio||1,x=e.offsetX*r,y=e.offsetY*r,f=Math.exp(-e.deltaY*.0015),k=Math.min(12,Math.max(.05,view.k*f));view.x=x-(x-view.x)*k/view.k;view.y=y-(y-view.y)*k/view.k;view.k=k;draw()},{passive:false});
addEventListener('resize',()=>{size2();draw()});
size2();ui();go('world');document.fonts&&document.fonts.ready.then(draw);
