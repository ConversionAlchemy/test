const T=16;
const hh=(a,b,s)=>{const v=Math.sin(a*127.1+b*311.7+s*17.3)*43758.5453;return v-Math.floor(v)};
const wrap=v=>((v%T)+T)%T;
const PAL={sky:[[150,178,204],[172,198,220],[190,212,230],[214,228,240],[236,242,248]],rail:[[34,22,14],[66,44,26],[88,60,36],[108,76,46],[132,96,60]],grass:[[36,56,30],[56,84,40],[72,104,48],[90,126,58],[118,150,74]],dirt:[[68,50,34],[102,78,54],[122,96,68],[144,116,84],[168,142,108]],berm:[[42,34,26],[82,66,48],[102,84,62],[122,102,76],[148,126,96]],marble:[[150,146,140],[196,192,184],[222,218,210],[236,233,226],[249,247,242]],dmarble:[[22,30,28],[40,52,48],[56,70,66],[80,100,94],[118,140,132]],flag:[[86,70,50],[146,122,86],[176,150,108],[198,174,130],[222,202,160]],oak:[[62,40,24],[110,74,44],[138,96,58],[162,118,74],[188,146,98]],stone:[[34,32,30],[80,76,72],[106,102,96],[130,126,118],[162,158,150]],iron:[[28,30,34],[58,62,68],[88,94,102],[128,134,144],[180,186,196]],gstone:[[110,86,34],[196,160,74],[224,192,108],[240,214,140],[252,238,186]],teak:[[64,36,18],[112,64,34],[138,84,46],[160,104,62],[184,130,86]],carpet:[[50,8,12],[96,18,24],[124,26,32],[196,156,66],[230,200,110]],gfloor:[[120,92,30],[196,160,74],[224,192,108],[238,212,136],[250,234,180]],pillar:[[176,172,164],[214,210,202],[232,229,222],[244,242,236],[252,251,248]]};
const P={
 marble:(x,y,c)=>{const v=Math.sin((x*.9+y*.35)+Math.sin(y*.5+c.s)*2.2);let t=v>.92?1:v>.8?2:3;if(hh(Math.floor(x/2),Math.floor(y/2),c.s)>.88)t=4;if((c.cx%2===1&&x===T-1)||(c.cy%2===1&&y===T-1))t=1;return t},
 dmarble:(x,y,c)=>P.marble(x,y,c),
 flag:(x,y)=>{const rows=[[0,6,[0,7]],[6,11,[3,10]],[11,16,[1,9,13]]];for(const[a,b,cuts] of rows)if(y>=a&&y<b){const xs=[...cuts,T+cuts[0]];let k=0;while(wrap(x-xs[0])>=xs[k+1]-xs[0])k++;const l=xs[k],r=xs[k+1];const lx=wrap(x-l);if(y===a||lx===0)return 0;if(y===a+1||lx===1)return 3;if(y===b-1||lx===r-l-1)return 1;return hh(x,y,9)>.85?1:hh(x,y,10)>.9?3:2}},
 planks:(x,y,c)=>{const b=Math.floor(y/4),yy=y%4,j=(b*7+3+(c.cy%3)*5)%T;if(yy===3)return 0;if(x===j)return 0;if(yy===0)return 3;if((x===wrap(j+1)||x===wrap(j-2))&&yy===1)return 1;return hh(Math.floor(x/3),y,b+c.cx)>.82?1:hh(x,y,b)>.9?3:2},
 stone:(x,y)=>{const r=Math.floor(y/5),yy=y%5,xx=wrap(x+(r%2?5:0))%10;if(yy===0||xx===0)return 0;if(yy===1)return 3;if(yy===4)return 1;return hh(x,y,3)>.87?1:2},
 table:(x,y,c)=>{const v=hh(x,y,c.cx*7+c.cy*3);return v>.94?1:v>.9?3:2},
 carpet:(x,y)=>((x+y)%8===0||(x-y+16)%8===0)?3:hh(x,y,41)>.9?1:2,
 gfloor:(x,y)=>x===0||y===0?1:x===T-1||y===T-1?0:(x+y)%7===0?4:3,
 gstone:(x,y,c)=>P.stone(x,y,c),
 pillar:x=>x===0||x===T-1?0:x%4===1?1:x%4===3?4:3,
 grass:(x,y,c)=>{const X=x+c.cx*T,Y=y+c.cy*T,v=hh(X,Y,5);return hh(X,Y>>1,6)>.92?(y%2?1:4):v>.86?3:v<.15?1:2},
 dirt:(x,y,c)=>{const X=x+c.cx*T,Y=y+c.cy*T,v=hh(X,Y,8);return v>.96?4:v>.84?3:v<.1?1:hh(X>>1,Y>>1,9)>.86?1:2},
 berm:(x,y,c)=>{const X=x+c.cx*T,Y=y+c.cy*T,v=hh(X>>1,Y>>1,12);return y%5===0&&hh(X>>2,Y,13)>.55?0:v>.85?3:v<.15?1:2},
 sky:(x,y,c)=>{const X=x+c.cx*T,Y=y+c.cy*T,v=hh(X>>3,Y>>2,21)*.6+hh(X>>2,Y>>1,22)*.4;return v>.78?4:v>.64?3:v<.22?1:2},
 rail:(x,y,c)=>{const X=x+c.cx*T,Y=y+c.cy*T;if(X%8===0&&Y%8===0)return 4;if(Y%4===0)return 0;if(Y%4===1)return 3;return hh(X>>2,Y,23)>.8?1:2},
 seat:(x,y)=>{if(x===0||y===0||x===T-1||y===T-1)return 0;if(x===1||y===1||x===T-2||y===T-2)return 1;if(y<=4)return 3;return (x+y)%4===0?1:(x-y+16)%4===2?3:2}};

// smooth world-space textures: walls and floors join across cells without visible tiles
const sm=t=>t*t*(3-2*t);
function vn(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),fx=sm(x-xi),fy=sm(y-yi),a=hh(xi,yi,s),b=hh(xi+1,yi,s),c=hh(xi,yi+1,s),d=hh(xi+1,yi+1,s);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy}
const fbm=(x,y,s)=>vn(x,y,s)*.55+vn(x*2.1,y*2.1,s+3)*.3+vn(x*4.3,y*4.3,s+7)*.15;
const sc=(c,k)=>[c[0]*k,c[1]*k,c[2]*k],mx=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const WOOD={oak:[138,98,62],teak:[112,70,40],pine:[164,124,80],walnut:[86,58,38],ash:[150,128,98],rail:[78,52,32]};
function woodT(X,Y,base,s=0){const w=Y+(vn(X/22,Y/9,40+s)-.5)*5,g=vn(X/9,w*.9,41+s),f=fbm(X/7,Y/2.4,42+s);let k=.86+f*.26+(g-.5)*.12;
 if(vn(X/4,w*1.6,43+s)>.82)k*=.8;if(hh(X>>1,Y,44+s)>.985)k*=.85;return sc(base,k)}
function plankT(X,Y,base,s=0){let c=woodT(X,Y,base,s+(Y>>3)*3);if((Y&7)===7)c=sc(c,.86);return c}
const STONE=[118,114,108],FLAG=[150,140,122];
function stoneT(X,Y,base,s=0){const f=fbm(X/10,Y/10,50+s),d=fbm(X/3,Y/3,51+s);let k=.82+f*.3+(d-.5)*.12;const cr=Math.abs(vn(X/11,Y/11,52+s)-.5),on=vn(X/7,Y/7,54+s)>.6;if(on&&cr<.014)k*=.84;else if(on&&cr<.026)k*=.94;
 const p=hh(X,Y,53+s);if(p>.985)k*=1.12;else if(p<.015)k*=.85;return sc(base,k)}
function flagT(X,Y,base){let c=sc(stoneT(X,Y,base),.96+hh(X>>4,Y>>4,46)*.08);if((X&15)===0||(Y&15)===0)c=sc(c,.9);return c}
// metal: one cold core, variants are a tint plus an overlay
const METAL=[126,140,146];
function metalCore(X,Y,tint){const t=.52+(vn(X/26,Y*.85,60)-.5)*.24+(hh(X>>3,Y,61)-.5)*.07;let c=mx([60,72,68],[204,214,206],t);return tint?mx(c,tint,.55):c}
const BEV=(x,y,e,c)=>e===0?sc(c,.42):e===1?(x===1||y===1?sc(c,1.38):sc(c,.68)):null;
function metalT(X,Y,cx,cy,v,tint){const x=X-cx*T,y=Y-cy*T,g=v==='floor'?(15-x-y)/15:0;let c=sc(metalCore(X,Y,tint),1+g*.12);if(v==='floor'){let f=mx([150,164,174],[176,190,200],vn(X/24,Y/24,64)*.6+(15-x-y)/60);const e=Math.min(x,y,T-1-x,T-1-y);if(e===0)return sc(f,.7);if(e===1)return sc(f,x===1||y===1?1.12:.88);for(const[rx,ry]of[[3,3],[12,3],[3,12],[12,12]]){if(x===rx&&y===ry)return sc(f,1.14);if(x===rx+1&&y===ry+1||x===rx&&y===ry+1||x===rx+1&&y===ry)return sc(f,.9)}return f}
 if(v==='rivet')for(const[rx,ry]of[[3,3],[12,3],[3,12],[12,12]])if(x===rx&&y===ry)return sc(c,1.25);
 return c}
const GRASS=[73,107,49],GLITE=[100,137,62],GDRY=[136,140,79],GDARK=[52,80,38],SOIL=[112,88,60];
function grassT(X,Y){const m=fbm(X/16,Y/16,70);let c=mx(GRASS,GLITE,Math.min(1,Math.max(0,m-.42)*1.8));const dry=fbm(X/26,Y/26,73);if(dry>.6)c=mx(c,GDRY,(dry-.6)*1.6);
 const tf=vn(X/2.3,Y/1.3,71);if(tf>.68)c=mx(c,GDARK,Math.min(1,(tf-.68)*3.2));else if(tf<.2)c=sc(c,1.08);const t=hh(X,Y,72);if(t>.985)c=mx(c,GDRY,.7);return c}
function soilT(X,Y){const f=fbm(X/9,Y/9,80);let c=sc(SOIL,.86+f*.26);const t=hh(X,Y,81);if(t>.988)c=[146,124,94];else if(t<.03)c=sc(c,.72);else if(vn(X/3,Y/3,82)>.8)c=sc(c,.92);return c}
function foundT(X,Y){let c=stoneT(X,Y,[72,68,62],9);const g=hh(X,Y,99);if(g>.9)c=sc(c,1.25);else if(g<.12)c=sc(c,.7);return c}
const MAHOG=[96,44,30];
function seatT(X,Y,cx,cy){const x=X-cx*T,y=Y-cy*T,e=Math.min(x,y,T-1-x,T-1-y);let c=woodT(X,Y,WOOD.teak,8);if(e<=1)return sc(c,e?.82:.62);const r=Math.hypot(x-7.5,y-7.5)/7;return sc(mx(c,[150,92,60],.35),1.08-r*.18)}
function carpetT(X,Y){const f=fbm(X/8,Y/8,30);let c=sc([128,34,38],.9+f*.16);const u=((X+Y)%8+8)%8,v=((X-Y)%8+8)%8;if(u===0||v===0)c=mx(c,[176,126,72],.32);else if(u===4&&v===4)c=mx(c,[196,150,90],.45);return c}
function goldT(X,Y,cx,cy){const x=X-cx*T,y=Y-cy*T,e=Math.min(x,y,T-1-x,T-1-y),c=mx(metalCore(X,Y),[226,186,96],.8);return e===0?sc(c,.7):c}
const cE=(X,Y,cx,cy)=>{const x=X-cx*T,y=Y-cy*T;return[x,y,Math.min(x,y,T-1-x,T-1-y)]};
function sillT(X,Y,cx,cy,m){const[x,y,e]=cE(X,Y,cx,cy);let c=m?mx(stoneT(X,Y,[236,234,228],11),[250,249,245],.4):stoneT(X,Y,[176,170,158],14);if(e===2)c=m?mx(c,[214,176,96],.6):sc(c,.82);else if(e===3)c=sc(c,1.04);return c}
function paveT(X,Y){let c=stoneT(X,Y,[212,208,198],15);const gx=((X%32)+32)%32,gy=((Y%32)+32)%32;if(gx===0||gy===0)c=sc(c,.94);return c}
function bushT(X,Y){const b=vn(X/3,Y/3,16),f=fbm(X/9,Y/9,17);let c=mx(GDARK,GRASS,f*.9);if(b>.62)c=mx(c,GLITE,(b-.62)*2);else if(b<.3)c=sc(c,.72);if(hh(X,Y,18)>.97)c=mx(c,GDRY,.6);return c}
function shelfT(X,Y,cx,cy){const[x,y]=cE(X,Y,cx,cy),c=metalCore(X,Y,[70,78,82]);if(y%5===0)return sc(c,.62);if(x%4===3)return sc(c,.8);return mx(metalCore(X,Y),[226,186,96],.78)}
function chestT(X,Y,cx,cy){const[x,y]=cE(X,Y,cx,cy);let c=woodT(X,Y,WOOD.oak,19);if(x===3||x===12)c=sc(metalCore(X,Y,[70,78,82]),y%5===2?1.3:1);return c}
function rackT(X,Y,cx,cy){const[x,y]=cE(X,Y,cx,cy);let c=woodT(X,Y,WOOD.walnut,20);if(y===4||y===11)c=sc(c,.7);if((y===4||y===11)&&x%5===2)c=sc(metalCore(X,Y),1.2);return c}
// marble with a key-pattern overlay, one motif per cell, mirrored from one quadrant
const KEYQ=['........','.#######','.#......','.#.#####','.#.#....','.#.#.###','.#.#.#..','.#...#.#'];
function omarbleT(X,Y,cx,cy){const x=X-cx*T,y=Y-cy*T,qx=x<8?x:15-x,qy=y<8?y:15-y,k=KEYQ[qy][qx]==='#'||KEYQ[qx][qy]==='#'&&qx===qy;let c=mx(stoneT(X,Y,[236,226,200],11),[246,240,226],.35);if(k)c=mx(c,[188,150,92],.42);if(x===0||y===0)c=sc(c,.92);return c}
function mpanelT(X,Y,cx,cy){const x=X-cx*T,y=Y-cy*T,c=metalCore(X,Y),i=Math.min(x-4,y-4,11-x,11-y);return i===0?(x===4||y===4?sc(c,.78):sc(c,1.18)):c}
// the green house: green marble with gold key tiles, plush green carpet, ebony, books
const EBONY=[58,36,26];
function gtileT(X,Y,cx,cy){const x=X-cx*T,y=Y-cy*T,qx=x<8?x:15-x,qy=y<8?y:15-y,k=KEYQ[qy][qx]==='#'||KEYQ[qx][qy]==='#'&&qx===qy;let c=mx(stoneT(X,Y,[78,118,96],16),[96,140,114],.25);if(k)c=mx(c,[206,168,90],.6);if(x===0||y===0)c=sc(c,.86);return c}
function gcarpetT(X,Y){const f=fbm(X/8,Y/8,31);let c=sc([34,82,56],.9+f*.16);const u=((X+Y)%8+8)%8,v=((X-Y)%8+8)%8;if(u===0||v===0)c=mx(c,[178,142,74],.3);else if(u===4&&v===4)c=mx(c,[196,160,90],.45);return c}
function booksT(X,Y,cx,cy){const x=X-cx*T,y=Y-cy*T;if(y%8===0||y%8===7)return sc(woodT(X,Y,EBONY,21),1.15);const col=(X>>1)+(Y>>3)*7,h=hh(col,Y>>3,22),P=[[110,34,30],[40,72,52],[92,64,36],[36,46,82],[130,104,58]];let c=P[h*5|0];if(((X>>1)&1)===0)c=sc(c,.8);if(hh(col,Y>>3,23)>.9)c=[200,170,96];return c}
function bkmarbleT(X,Y){return mx(stoneT(X,Y,[44,62,54],17),[18,26,22],.25)}
function bkslabT(X,Y){let c=sc(bkmarbleT(X,Y),.95+hh(X>>4,Y>>4,47)*.1);if((X&15)===0||(Y&15)===0)c=sc(c,.78);else if((X&15)===1||(Y&15)===1)c=sc(c,1.08);return c}
const TEX={bkmarble:bkmarbleT,bkslab:bkslabT,gtile:gtileT,gcarpet:gcarpetT,books:booksT,edesk:(X,Y)=>woodT(X,Y,EBONY,22),ewood:(X,Y)=>woodT(X,Y,EBONY,24),omarble:omarbleT,mpanel:mpanelT,sill:(X,Y,cx,cy)=>sillT(X,Y,cx,cy,0),msill:(X,Y,cx,cy)=>sillT(X,Y,cx,cy,1),pave:paveT,bush:bushT,shelf:shelfT,chest:chestT,rack:rackT,desk:(X,Y)=>woodT(X,Y,MAHOG,13),table:(X,Y)=>woodT(X,Y,WOOD.teak,7),seat:seatT,carpet:carpetT,gfloor:goldT,stone:(X,Y,cx,cy)=>stoneT(X,Y,STONE),marble:(X,Y)=>mx(stoneT(X,Y,[236,234,228],11),[250,249,245],.45),dmarble:(X,Y)=>mx(stoneT(X,Y,[84,112,104],12),[150,168,160],.12),pillar:(X,Y)=>mx(stoneT(X,Y,[232,230,224],11),[250,249,245],.4),gstone:(X,Y)=>mx(stoneT(X,Y,STONE),[214,180,96],.55),flag:(X,Y)=>flagT(X,Y,FLAG),
 wood:(X,Y)=>woodT(X,Y,WOOD.oak),dwood:(X,Y)=>woodT(X,Y,WOOD.walnut,5),rail:(X,Y)=>woodT(X,Y,WOOD.rail,9),berm:(X,Y)=>woodT(X,Y,[104,86,64],2),
 planks:(X,Y)=>plankT(X,Y,WOOD.oak),pplanks:(X,Y)=>plankT(X,Y,WOOD.pine,3),dplanks:(X,Y)=>plankT(X,Y,WOOD.teak,6),
 metal:(X,Y,cx,cy)=>metalT(X,Y,cx,cy,'panel'),mplate:(X,Y,cx,cy)=>metalT(X,Y,cx,cy,'rivet'),iron:(X,Y,cx,cy)=>metalT(X,Y,cx,cy,'rivet',[70,78,82]),brass:(X,Y,cx,cy)=>metalT(X,Y,cx,cy,'rivet',[184,150,84]),mfloor:(X,Y,cx,cy)=>metalT(X,Y,cx,cy,'floor'),grass:grassT,dirt:soilT};
const KIND={marble:'floor',dmarble:'floor',flag:'floor',planks:'floor',stone:'wall',table:'floor',seat:'floor',gstone:'wall',pillar:'wall',carpet:'floor',gfloor:'floor',grass:'floor',dirt:'floor',berm:'wall',sky:'floor',rail:'wall',wood:'wall',dwood:'wall',metal:'wall',mplate:'wall',iron:'wall',brass:'wall',mfloor:'floor',desk:'floor',sill:'floor',msill:'floor',omarble:'floor',gtile:'floor',bkmarble:'floor',bkslab:'floor',gcarpet:'floor',books:'floor',edesk:'floor',ewood:'wall',mpanel:'wall',pave:'floor',bush:'wall',shelf:'floor',chest:'floor',rack:'floor',pplanks:'floor',dplanks:'floor'};
const PALOF={planks:'oak',seat:'oak',table:'teak'};
const cache=new Map();
function tile(key,sig,cx,cy){if(TEX[key]){const ck=key+','+cx+','+cy;if(cache.has(ck))return cache.get(ck);const cv=document.createElement('canvas');cv.width=cv.height=T;const g=cv.getContext('2d'),im=g.createImageData(T,T);
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const c=TEX[key](cx*T+x,cy*T+y,cx,cy),i=(y*T+x)*4;im.data[i]=c[0];im.data[i+1]=c[1];im.data[i+2]=c[2];im.data[i+3]=255}g.putImageData(im,0,0);cache.set(ck,cv);return cv}
 const ck=key+(cx%2)+(cy%2)+(cy%3);if(cache.has(ck))return cache.get(ck);const cv=document.createElement('canvas');cv.width=cv.height=T;const g=cv.getContext('2d');const pal=PAL[PALOF[key]||key],c={s:7,cx,cy};
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const t=P[key](x,y,c);g.fillStyle=`rgb(${pal[t]})`;g.fillRect(x,y,1,1)}
 cache.set(ck,cv);return cv}
