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
function metalCore(X,Y,tint){const t=.52+(vn(X/30,Y/30,60)-.5)*.14+(hh(X>>2,Y>>1,61)-.5)*.025;let c=mx([64,66,72],[206,210,218],t);return tint?mx(c,tint,.55):c}
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
function shelfT(X,Y,cx,cy){const[x,y]=cE(X,Y,cx,cy),c=metalOf('steel',X,Y);if(y%5===0)return sc(c,.62);if(x%4===3)return sc(c,.8);return metalOf('gold',X,Y)}
function chestT(X,Y){return woodT(X,Y,WOOD.oak,19)}
function rackT(X,Y){return woodT(X,Y,WOOD.walnut,20)}
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
// one chest per metal, fully built in that metal: key → [member, name]
const MCHEST={schest:['steel','Steel chest'],mchest:['iron','Iron chest'],bchest:['brass','Brass chest'],gchest:['gold','Aurum chest'],uchest:['umbra','Umbra chest']};
const TEX={bkmarble:bkmarbleT,bkslab:bkslabT,gtile:gtileT,gcarpet:gcarpetT,books:booksT,edesk:(X,Y)=>woodT(X,Y,EBONY,22),ewood:(X,Y)=>woodT(X,Y,EBONY,24),omarble:omarbleT,mpanel:mpanelT,sill:(X,Y,cx,cy)=>sillT(X,Y,cx,cy,0),msill:(X,Y,cx,cy)=>sillT(X,Y,cx,cy,1),pave:paveT,bush:bushT,shelf:shelfT,chest:chestT,rack:rackT,desk:(X,Y)=>woodT(X,Y,MAHOG,13),table:(X,Y)=>woodT(X,Y,WOOD.teak,7),seat:seatT,carpet:carpetT,gfloor:goldT,stone:(X,Y,cx,cy)=>stoneT(X,Y,STONE),marble:(X,Y)=>mx(stoneT(X,Y,[236,234,228],11),[250,249,245],.45),dmarble:(X,Y)=>mx(stoneT(X,Y,[84,112,104],12),[150,168,160],.12),pillar:(X,Y)=>mx(stoneT(X,Y,[232,230,224],11),[250,249,245],.4),gstone:(X,Y)=>mx(stoneT(X,Y,STONE),[214,180,96],.55),flag:(X,Y)=>flagT(X,Y,FLAG),
 wood:(X,Y)=>woodT(X,Y,WOOD.oak),dwood:(X,Y)=>woodT(X,Y,WOOD.walnut,5),rail:(X,Y)=>woodT(X,Y,WOOD.rail,9),berm:(X,Y)=>woodT(X,Y,[104,86,64],2),
 planks:(X,Y)=>plankT(X,Y,WOOD.oak),pplanks:(X,Y)=>plankT(X,Y,WOOD.pine,3),dplanks:(X,Y)=>plankT(X,Y,WOOD.teak,6),
 metal:(X,Y,cx,cy)=>metalT(X,Y,cx,cy,'panel'),mplate:(X,Y,cx,cy)=>metalT(X,Y,cx,cy,'rivet'),iron:(X,Y,cx,cy)=>metalT(X,Y,cx,cy,'rivet',[70,78,82]),brass:(X,Y,cx,cy)=>metalT(X,Y,cx,cy,'rivet',[184,150,84]),mfloor:(X,Y,cx,cy)=>metalT(X,Y,cx,cy,'floor'),grass:grassT,dirt:soilT};
const KIND={marble:'floor',dmarble:'floor',flag:'floor',planks:'floor',stone:'wall',table:'floor',seat:'floor',gstone:'wall',pillar:'wall',carpet:'floor',gfloor:'floor',grass:'floor',dirt:'floor',berm:'wall',sky:'floor',rail:'wall',wood:'wall',dwood:'wall',metal:'wall',mplate:'wall',iron:'wall',brass:'wall',mfloor:'floor',desk:'floor',sill:'floor',msill:'floor',omarble:'floor',gtile:'floor',bkmarble:'floor',bkslab:'floor',gcarpet:'floor',books:'floor',edesk:'floor',ewood:'wall',mpanel:'wall',pave:'floor',bush:'wall',shelf:'floor',chest:'floor',rack:'floor',pplanks:'floor',dplanks:'floor'};
// purple council carpet, wheat rows, wagon bed
function pcarpetT(X,Y){const f=fbm(X/8,Y/8,32);let c=sc([58,30,78],.9+f*.16);const u=((X+Y)%8+8)%8,v=((X-Y)%8+8)%8;if(u===0||v===0)c=mx(c,[196,190,214],.22);else if(u===4&&v===4)c=mx(c,[226,222,236],.4);return c}
function cropT(X,Y){const r=((X%6)+6)%6,f=fbm(X/5,Y/3,33);let c=r<2?sc([92,72,44],.85+f*.2):sc([196,166,84],.78+f*.3+vn(X/2,Y/1.5,34)*.2);if(r>=2&&hh(X,Y,35)>.9)c=sc(c,1.15);return c}
function wagonT(X,Y){let c=woodT(X,Y,WOOD.ash,27);if(((X%5)+5)%5===0)c=sc(c,.7);return c}
Object.assign(TEX,{pcarpet:pcarpetT,crop:cropT,wagon:wagonT});Object.assign(KIND,{pcarpet:'floor',crop:'floor',wagon:'floor'});
// stone slabs: one bevelled slab per cell
function slabT(X,Y){let c=sc(stoneT(X,Y,[150,144,132],18),.94+hh(X>>4,Y>>4,48)*.12);const x=X&15,y=Y&15;if(x===0||y===0)c=sc(c,.76);else if(x===1||y===1)c=sc(c,1.08);else if(x===15||y===15)c=sc(c,.93);return c}
TEX.slab=slabT;KIND.slab='floor';
const PALOF={planks:'oak',seat:'oak',table:'teak'};
const cache=new Map();
function tile(key,sig,cx,cy){if(TEX[key]){const ck=key+','+cx+','+cy;if(cache.has(ck))return cache.get(ck);const cv=document.createElement('canvas');cv.width=cv.height=T;const g=cv.getContext('2d'),im=g.createImageData(T,T);
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const c=TEX[key](cx*T+x,cy*T+y,cx,cy),i=(y*T+x)*4;im.data[i]=c[0];im.data[i+1]=c[1];im.data[i+2]=c[2];im.data[i+3]=255}g.putImageData(im,0,0);cache.set(ck,cv);return cv}
 const ck=key+(cx%2)+(cy%2)+(cy%3);if(cache.has(ck))return cache.get(ck);const cv=document.createElement('canvas');cv.width=cv.height=T;const g=cv.getContext('2d');const pal=PAL[PALOF[key]||key],c={s:7,cx,cy};
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const t=P[key](x,y,c);g.fillStyle=`rgb(${pal[t]})`;g.fillRect(x,y,1,1)}
 cache.set(ck,cv);return cv}
// tile catalogue: element > material > variation, each as floor and wall ('.w'); old keys point at their new tile
const FLB2=[[0,6,[0,7]],[6,11,[3,10]],[11,16,[1,9,13]]];
let LINK=()=>null;const CONNV=new Set(['lozenge','sheet']);
// distance (px) from this pixel to the edge of its connected area on each side, then to an inner (concave) corner; 99 where the area continues
const regionD=(X,Y,cx,cy)=>{const kid=q=>q&&q.replace(/~\d$/,''),me=kid(LINK(cx,cy)),o=(a,b)=>!me||kid(LINK(cx+a,cy+b))!==me,x=X&15,y=Y&15;let c=99;for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])if(!o(a,0)&&!o(0,b)&&o(a,b))c=Math.min(c,Math.max(a<0?x:15-x,b<0?y:15-y));return[o(-1,0)?x:99,o(1,0)?15-x:99,o(0,-1)?y:99,o(0,1)?15-y:99,c]};
const POLT=new Set();const NODK=new Set(['bush']),RUG=new Set(['carpet','gcarpet','pcarpet']),KEYT=new Set();
// materials: a family shares its properties and three patterns; each member adds its colour, one special pattern, and any property it changes
const ELEM={
 Earth:{p:{cls:'grass',hp:2,nowall:1},vars:{plain:'Plain',worn:'Worn'},mats:{grass:{n:'Grass'},dirt:{n:'Soil',cls:'soil',hp:3}},old:{wheat:{n:'Wheat',cls:'soil'},hedge:{n:'Hedge'}}},
 Stone:{p:{cls:'stone',hp:3},vars:{block:'Block',quarter:'Quartered',slabs:'Slabs'},mats:{grey:{n:'Greystone',c:[124,119,111],sp:'rubble'},gran:{n:'Highland granite',c:[146,132,128],hp:4,speck:1,sp:'crazy'},
  aur:{n:'Astian marble',c:[222,220,214],cls:'marble',hp:4,shine:28,vein:[255,255,252],sp:'chequer'},gold:{n:'Goldstone',c:[200,170,100],vein:[252,234,168],sp:'lozenge'},night:{n:'Sanctis obsidian',c:[35,28,46],cls:'marble',hp:5,shine:40,vein:'flow',jc:[96,82,150],as:{block:'knapped',slabs:'mirror'},sp:'vent',cut:1}},
  old:{lime:{n:'Limestone',c:[208,204,194],sp:'herring'},sand:{n:'Sandstone',c:[172,154,122],hp:2,sp:'crazy'},ver:{n:'Verdant marble',c:[92,124,110],cls:'marble',hp:4,shine:28,sp:'quatre'}}},
 Wood:{p:{cls:'wood',hp:2,burn:1},vars:{planks:'Planks',boards:'Boards',panel:'Polished'},mats:{oak:{n:'Oak',c:WOOD.oak,sp:'herring'},pine:{n:'Pine',c:WOOD.pine,hp:1,sp:'rough'},teak:{n:'Teak',c:WOOD.teak,sp:'deck'},mahog:{n:'Mahogany',c:MAHOG,sp:'parquet'},ebony:{n:'Ebony',c:EBONY,hp:3,sp:'marq'}},old:{walnut:{n:'Walnut',c:WOOD.walnut,sp:'chevron'}}},
 Metal:{p:{cls:'metal',hp:6,shine:60},vars:{rivet:'Riveted plate',quarter:'Quartered',panel:'Panels'},mats:{steel:{n:'Steel',c:[145,148,151],hp:7,w:1,age:'tinge',tint:[[104,132,118],[88,118,100]],sp:'louvre'},iron:{n:'Iron',c:[118,116,112],hp:6,w:1.3,age:'tinge',tint:[[132,100,72],[116,82,56]],shine:45,sp:'treadplate'},
  brass:{n:'Brass',c:[200,146,88],hp:5,w:.9,age:'verdigris',shine:80,sp:'fluted'},gold:{n:'Aurum',c:[226,186,96],hp:8,w:.8,age:'dents',shine:80,sp:'fluted'},umbra:{n:'Umbra',c:[59,69,64],hp:10,w:.5,age:'dark tinge',dk:.57,shine:25,sp:'runes'}}},
 Cloth:{p:{cls:'cloth',hp:1,burn:1,nowall:1},vars:{plain:'Plain',border:'Bordered',diamond:'Diamond weave'},mats:{crimson:{n:'Crimson',c:[128,34,38]},verdant:{n:'Verdant',c:[34,82,56]},purple:{n:'Imperial purple',c:[58,30,78]}}}};
const SPN={rubble:'Cobble',crazy:'Crazy paving',herring:'Herringbone',gvein:'Gold vein',mvein:'Gold vein',chequer:'Imperial chequer',knapped:'Knapped',sheen:'Rainbow sheen',mirror:'Mirror glass',treadplate:'Tread plate',fluted:'Fluted',coffer:'Coffered',coffer2:'Coffered ceiling',vent:'Glow panel',lozenge:'Aurum lozenge',wvein:'White vein',medallion:'Medallion',quatre:'Quatrefoil',stars:'Starfield',rough:'Rough sawn',deck:'Ship deck',chevron:'Chevron',parquet:'Versailles',marq:'Marquetry',louvre:'Vents',grate:'Grating',filigree:'Sunburst',engraved:'Engraved',runes:'Runed'};
// retired members stay drawable so older maps still load
const memb=(el,mat)=>ELEM[el].mats[mat]||(ELEM[el].old||{})[mat],mprop=(el,mat)=>({...ELEM[el].p,...memb(el,mat)});
const varsOf=(el,mat)=>{const M=memb(el,mat),o={...ELEM[el].vars};if(M.sp)o[M.sp]=SPN[M.sp];for(const a of[].concat(M.alt||[]))o[a]=SPN[a];return o};
// retired patterns stay drawable so older maps still load
const OLDV={Stone:['gvein','stars','quartero','flags','medallion','paving','key','setts','ashlar','basket','rosette','lattice','checker','band','sectile'],Wood:['logs','pegged','basket','brick','inlay','fret'],Metal:['sheet','slabs','coffer','coffer2','smooth','grate','filigree','engraved','hammer','tread','grille','scale','veined']};
const CATN={};
const GOLDL=[214,176,96],VOID=[110,150,220];
function vor(X,Y,S,s){const gx=Math.floor(X/S),gy=Math.floor(Y/S);let d1=1e9,d2=1e9,id=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=gx+i,cy=gy+j,px=(cx+.15+hh(cx,cy,s)*.7)*S,py=(cy+.15+hh(cx,cy,s+1)*.7)*S,d=Math.hypot(X+.5-px,Y+.5-py);if(d<d1){d2=d1;d1=d;id=cx*977+cy}else if(d<d2)d2=d}return[d2-d1,id]}
const tone=(id,s,a)=>1+(hh(id%9973,(id/9973|0)+s,s)-.5)*a;
// herringbone of 8x4 blocks in staggered 8-wide columns
function herring(X,Y){const c=X>>3,x=X&7,d=Y+(c&1?7-x:x)+(c&1?2:0);return[(d&3)===0||x===0,c*977+(d>>2)]}
function basket(X,Y){const q=((X>>3)+(Y>>3))&1,x=X&7,y=Y&7;return[x===0||y===0||(q?y===4:x===4),((Y>>3)*977+(X>>3))*2+(q?y>>2:x>>2)]}
function special(el,mat,v,c,s,wall){const A=(X,Y)=>[X&15,Y&15];
 if(el==='Stone'){const M=memb('Stone',mat),m=M.cls==='marble',S=(X,Y)=>{let k=softStone(X,Y,c,s,m);if(M.speck)k=speck(k,X,Y,s);return veinOf(M,k,X,Y,s)};
  if(v==='rubble')return(X,Y)=>{const[e,id]=vor(X,Y,5,s);return sc(S(X,Y),e<.8?.8:e<1.6?.92:tone(id,s,.18))};
  if(v==='setts')return(X,Y)=>{const r=Math.floor(Y/5),o=(hh(r,0,s)*6)|0,xx=X+o,cw=6,sx=Math.floor(xx/cw);return sc(S(X,Y),Y%5===0||xx%cw===0?.7:tone(r*977+sx,s,.2))};
  if(v==='ashlar')return(X,Y)=>{const r=Y>>3,xx=X+(r&1?8:0),y=Y&7,x=xx&15;return sc(S(X,Y),y===0||x===0?.8:y===1||x===1?1.07:tone(r*977+(xx>>4),s,.08))};
  if(v==='crazy')return(X,Y)=>{const[e,id]=vor(X,Y,10,s);return sc(S(X,Y),e<1.1?1.12:tone(id,s,.12))};
  if(v==='herring')return(X,Y)=>{const[j,id]=herring(X,Y);return sc(S(X,Y),j?.86:tone(id,s,.08))};
  if(v==='basket')return(X,Y)=>{const[j,id]=basket(X,Y);return sc(S(X,Y),j?.86:tone(id,s,.08))};
  if(v==='mvein'||v==='wvein'){const VC=v==='mvein'?[226,196,128]:[168,164,158],VL=v==='mvein'?[240,220,170]:[200,196,190];return(X,Y)=>{const k=S(X,Y),d=Math.abs(vn(X/11,Y/11,s+52)-.5),d2=Math.abs(vn(X/5,Y/7,s+53)-.5);if(d<.016)return mx(k,VC,v==='mvein'?.42:.65);if(d<.035)return mx(k,VL,v==='mvein'?.16:.25);if(d2<.012)return mx(k,VL,.3);return k}}
  if(v==='lozenge'){const kid=k=>k&&k.replace(/~\d$/,''),key='stone.'+mat+'.lozenge';return(X,Y,cx,cy)=>{let k=S(X,Y);const x=X&15,y=Y&15,me=kid(LINK(cx,cy)),o=(a,b)=>kid(LINK(a,b))!==me,e=Math.min(o(cx-1,cy)?x:99,o(cx+1,cy)?15-x:99,o(cx,cy-1)?y:99,o(cx,cy+1)?15-y:99);
   if(me&&me.startsWith(key)&&e<4)return sc(k,e===0?.86:e===1?1.06:e===3?.88:1);const u=(X+Y)&15,w=(X-Y)&15;return sc(k,u===0||w===0?.86:u===1||w===1?1.05:tone(((X+Y)>>4)*977+((X-Y)>>4),s,.14))}}
  if(v==='knapped')return(X,Y)=>{const S9=16,gx=Math.floor(X/S9),gy=Math.floor(Y/S9);let d1=1e9,d2=1e9,px=0,py=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=gx+i,cy=gy+j,qx=(cx+hh(cx,cy,s+90))*S9,qy=(cy+hh(cx,cy,s+91))*S9,d=Math.hypot(X+.5-qx,Y+.5-qy);if(d<d1){d2=d1;d1=d;px=qx;py=qy}else if(d<d2)d2=d}
   const e=d2-d1;return sc(S(X,Y),e<.8?1.2:e<1.6?.8:.92+tone(px*977+py,s,.1)-1)};
  if(v==='mirror')return(X,Y)=>{const x=X&15,y=Y&15;let k=flowVein(softStone(X,Y,c,s,m),X,Y,s,1);if(x===0||y===0)return cutJ(k,M);k=sc(k,(1+(hh(X>>4,Y>>4,s+1)-.5)*.1)*(.95+(hh(X,Y,s+101)-.5)*.08));return x===0||y===0?cutJ(k,M,X,Y,s):k};
  if(v==='vent')return(X,Y)=>{const x=X&15,y=Y&15;let k=sc(flowVein(softStone(X,Y,c,s,m),X,Y,s,1),(1+(hh(X>>4,Y>>4,s+1)-.5)*.1)*(.95+(hh(X,Y,s+101)-.5)*.08));if(x===0||y===0)return cutJ(k,M,X,Y,s);const i=Math.min(x-4,y-4,11-x,11-y);
   if(i===0)return x===4||y===4?sc(k,.5):mx(k,M.jc,.3);if(i>0&&i<4)k=sc(k,.88);if((x===7||x===8)&&(y===7||y===8))return mx(opal(vn(X/40,Y/40,s+85)*1.5),[240,240,250],x===7&&y===7?.25:0);return k};
  if(v==='chequer')return(X,Y)=>{const q=((X>>4)+(Y>>4))&1,x=X&15,y=Y&15;let k=softStone(X,Y,c,s,m);if(q)k=mx(k,[52,52,58],.8);k=q?mx(k,vein(k,X,Y,s,[255,255,252]),.55):vein(k,X,Y,s,[255,255,252]);return x===0||y===0?sc(k,.9):k};
  if(v==='gvein')return(X,Y)=>vein(softStone(X,Y,c,s,m),X,Y,s,[252,234,168]);
  if(v==='rosette')return(X,Y)=>{const[x,y]=A(X,Y),dx=x-7.5,dy=y-7.5,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);let k=S(X,Y);if(x===0||y===0)return sc(k,.86);if(Math.abs(r-6)<.6)return mx(k,GOLDL,.35);if(r<5.5&&Math.cos(a*6)>.2)return mx(k,[252,236,170],.3+(r<2?.2:0));return k};
  if(v==='lattice')return(X,Y)=>{const u=((X+Y)%8+8)%8,w=((X-Y)%8+8)%8;let k=S(X,Y);if(u===0&&w===0)return mx(k,GOLDL,.6);if(u===0||w===0)return sc(k,.84);return k};
  if(v==='checker')return(X,Y)=>{const a=Math.floor((X+Y)/8),b=Math.floor((X-Y)/8),q=(a+b)&1,u=((X+Y)%8+8)%8,w=((X-Y)%8+8)%8;let k=S(X,Y);if(q)k=sc(mx(k,[200,198,192],.5),.96);if(u===0||w===0)k=mx(k,GOLDL,.25);return k};
  if(v==='medallion')return(X,Y)=>{const x=X&31,y=Y&31,dx=x-15.5,dy=y-15.5,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);let k=S(X,Y);if(Math.abs(r-12)<.7||Math.abs(r-9.5)<.6)return mx(k,GOLDL,.38);if(r<9&&Math.abs(Math.cos(a*4))*9>r*1.4)return mx(k,[214,190,150],.28);if(r<1.5)return mx(k,GOLDL,.5);return k};
  if(v==='quatre')return(X,Y)=>{const[x,y]=A(X,Y);let k=S(X,Y),inn=false,ring=false;for(const[a,b]of[[8,4.5],[8,11.5],[4.5,8],[11.5,8]]){const d=Math.hypot(x+.5-a,y+.5-b);if(d<3.4)inn=true;else if(d<4.2)ring=true}if(inn)return mx(k,[232,230,222],.3);if(ring)return mx(k,GOLDL,.28);return x===0||y===0?sc(k,.88):k};
  if(v==='band')return(X,Y)=>{const y=Y&15;let k=S(X,Y);if(y>=6&&y<=9)return y===6||y===9?mx(k,GOLDL,.28):mx(k,[232,230,222],.3);return k};
  if(v==='stars')return(X,Y)=>{const[x,y]=A(X,Y),dx=Math.abs(x-7.5),dy=Math.abs(y-7.5);let k=S(X,Y);if((X&31)===0||(Y&31)===0)return mx(k,GOLDL,.3);if(dx<.6&&dy<2.6||dy<.6&&dx<2.6)return mx(k,GOLDL,.6);return k};
  if(v==='sectile')return(X,Y)=>{const[x,y]=A(X,Y),dx=Math.abs(x-7.5),dy=Math.abs(y-7.5);let k=S(X,Y);if(Math.max(dx,dy)<2.6)return mx(k,[232,230,222],.35);if(dx+dy<7)return mx(k,[92,124,110],.4);if(Math.abs(dx+dy-7)<.6)return mx(k,GOLDL,.3);return x===0||y===0?sc(k,.85):k}}
 if(el==='Wood'){const W0=(X,Y,q)=>woodT(X,Y,c,s+q);
  if(v==='rough')return(X,Y)=>{const r=Math.floor((Y+Math.floor(hh(X>>5,Y>>3,s)*3))/6),y=(Y+Math.floor(hh(X>>5,Y>>3,s)*3))%6;let k=sc(W0(X,Y,r*5),tone(r,s,.2));if(y===0)k=sc(k,.62);if(hh(X>>1,Y,s+9)>.985)k=sc(k,.7);return k};
  if(v==='logs')return(X,Y)=>{const y=Y&7,f=Math.sin(Math.PI*(y+.5)/8);let k=sc(W0(X,Y,(Y>>3)*7),.72+.36*f);if(y===0)k=mx(k,[52,36,24],.6);return k};
  if(v==='herring')return(X,Y)=>{const[j,id]=herring(X,Y);return sc(W0(X,Y,id%7),j?.72:tone(id,s,.12))};
  if(v==='pegged')return(X,Y)=>{const r=Y>>4,y=Y&15,xx=(X+r*11)&31;let k=sc(W0(X,Y,r*3),tone(r,s,.08));if(y===15)return sc(k,.74);if(xx===0)return sc(k,.76);if((xx===2||xx===29)&&(y===4||y===11))return sc(k,.5);return k};
  if(v==='deck')return(X,Y)=>{const r=Y>>3,y=Y&7,xx=(X+r*13)&31;let k=sc(W0(X,Y,r*3),tone(r*31+((X+r*13)>>5),s,.1));if(y===7||xx===0)return mx(k,[24,20,16],.75);return k};
  if(v==='basket')return(X,Y)=>{const[j,id]=basket(X,Y);return sc(W0(X,Y,id%5),j?.72:tone(id,s,.12))};
  if(v==='chevron')return(X,Y)=>{const cc=X>>3,x=X&7,d=Y+(cc&1?7-x:x);return sc(W0(X,Y,(d>>2)%9),(d&3)===0||x===0&&cc&1?.72:tone(cc*977+(d>>2),s,.12))};
  if(v==='brick')return(X,Y)=>{const r=Y>>2,xx=X+(r&1?4:0);return sc(W0(X,Y,(xx>>3)%7),(Y&3)===0||(xx&7)===0?.72:tone(r*977+(xx>>3),s,.12))};
  if(v==='inlay')return(X,Y)=>{const y=Y&15;let k=sc(W0(X,Y,(Y>>3)*3),tone(Y>>3,s,.06));if((Y&7)===7)k=sc(k,.8);if(y===2||y===13)k=mx(k,[220,186,126],.45);return k};
  if(v==='parquet')return(X,Y)=>{const[x,y]=A(X,Y),e=Math.min(x,y,15-x,15-y),u=((X+Y)%8+8)%8,w=((X-Y)%8+8)%8;let k=W0(X,Y,((X>>4)+(Y>>4))*3);if(e===0)return sc(k,.66);if(e===1)return mx(k,[220,186,126],.3);if(u===0||w===0)return sc(k,.8);return k};
  if(v==='marq')return(X,Y)=>{const x=X&15,y=Y&15,dx=Math.abs(x-7.5),dy=Math.abs(y-7.5),d=dx+dy;let k=W0(X,Y,0);if(Math.abs(d-6)<.6)return mx(k,GOLDL,.5);if(d<6)return(dx<.6||dy<.6)?mx(k,GOLDL,.35):mx(woodT(X,Y,WOOD.pine,s+3),k,.25);return x===0||y===0?sc(k,.7):k};
  if(v==='fret')return(X,Y)=>{const x=X&15,y=Y&15,qx=x<8?x:15-x,qy=y<8?y:15-y,on=KEYQ[qy][qx]==='#'||KEYQ[qx][qy]==='#'&&qx===qy;let k=W0(X,Y,0);if(on)return mx(woodT(X,Y,WOOD.ash,s+4),k,.35);return x===0||y===0?sc(k,.72):k}}
 if(el==='Metal'){const M=(X,Y)=>metalOf(mat,X,Y);
  if(v==='grate')return(X,Y)=>{const x=X&3,y=Y&3;let k=M(X,Y);if(x===0||y===0)return sc(k,x===0&&y===0?1.25:1.08);return sc(k,x===3||y===3?.32:.45)};
  if(v==='hammer')return(X,Y)=>{const d=vn(X/2.6,Y/2.6,s+40),k=M(X,Y),e=Math.min(X&31,Y&31);if(e===0)return sc(k,.62);return sc(k,.84+d*.3+(hh(X,Y,s)>.96?.1:0))};
  if(v==='tread')return(X,Y)=>{const b=((X>>2)+(Y>>2))&1,x=X&3,y=Y&3,k=M(X,Y),lug=b?x===y:x+y===3;return lug?sc(k,1.28):(b?x===y+1:x+y===4)?sc(k,.78):k};
  // steel vents: horizontal louvres inside a framed margin; 1px openings on rows 2, 6, 9 and 13 of each tile mirror in any size
  // connected specials: each area keeps a plain margin m in from its edge
  if(v==='treadplate')return(X,Y,cx,cy)=>{const k=M(X,Y),[dl,dr,du,dd,dc]=regionD(X,Y,cx,cy);if(Math.min(dl,dr,du,dd,dc)<(wall?4:2))return k;const lx=X&3,ly=Y&3,t=.92+hh(X>>2,Y>>2,s+110)*.16;if(lx===3||ly===3)return sc(k,.9*t);return sc(k,(lx===ly||lx+ly===2?(lx===1?1.32:1.18):.96)*t)};
  if(v==='fluted')return(X,Y,cx,cy)=>{const k=M(X,Y),[dl,dr,du,dd,dc]=regionD(X,Y,cx,cy),m=wall?5:3,e=Math.min(dl,dr,du,dd,dc);if(e<m)return k;if(e===m&&(du===m||dd===m||dc===m))return sc(k,.9);return sc(k,[.8,1.16,1.05,.95][X&3])};
  // aurum ceiling: each tile a sunken coffer with a boss, framed by the area's raised band
  if(v==='coffer2')return(X,Y,cx,cy)=>{const k=M(X,Y),[dl,dr,du,dd]=regionD(X,Y,cx,cy),m=wall?4:2,e=Math.min(dl,dr,du,dd);if(e<m)return k;if(e<=m+1)return sc(k,e===m?(dl===e||du===e?1.2:.84):1.05);const x=X&15,y=Y&15,i=Math.min(x,y,15-x,15-y),r=Math.hypot(x-7.5,y-7.5);if(i<=1)return sc(k,i===0?1.12:1.04);if(i===2)return sc(k,x===2||y===2?.74:1.16);if(r<1.6)return sc(k,1.3);if(r<2.4)return sc(k,.84);return sc(k,.94)};
  if(v==='coffer')return(X,Y,cx,cy)=>{const k=M(X,Y),[dl,dr,du,dd]=regionD(X,Y,cx,cy),m=wall?4:2,e=Math.min(dl,dr,du,dd);if(e<m)return k;if(e<=m+2)return sc(k,e===m?(dl===e||du===e?1.2:.86):e===m+2?(dl===e||du===e?.8:1.15):1.05);const u=((X+Y)%6+6)%6===0,w=((X-Y)%6+6)%6===0;return u&&w?sc(k,1.22):u||w?sc(k,.88):k};
  if(v==='louvre')return(X,Y,cx,cy)=>{const k=M(X,Y),[dl,dr,du,dd,dc]=regionD(X,Y,cx,cy),m=wall?5:3,e=Math.min(dl,dr,du,dd,dc);if(e<m)return k;if(e===m)return sc(k,dl===m||du===m?.8:1.12);return sc(k,[1.04,.9,.38,1.2,1.04,.9,.38,1.2,.9,.38,1.2,1.04,.9,.38,1.2,1.04][Y&15])};
  if(v==='filigree')return(X,Y)=>{const[x,y]=A(X,Y),k=M(X,Y),qx=x<8?0:15,qy=y<8?0:15;if(Math.abs(Math.hypot(x-qx,y-qy)-4.2)<.5)return sc(k,.72);if(Math.hypot(x-7.5,y-7.5)<1.6)return sc(k,1.3);return k};
  if(v==='grille')return(X,Y)=>{const u=((X+Y)%6+6)%6,w=((X-Y)%6+6)%6,k=M(X,Y);if(u===0&&w===0)return sc(k,1.4);if(u===0||w===0)return sc(k,.74);return k};
  if(v==='engraved')return(X,Y)=>{const[x,y]=A(X,Y),k=sc(M(X,Y),1.03),dx=x-7.5,dy=y-7.5,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);if(Math.abs(r-5.5)<.5)return sc(k,.82);if(r>2&&r<5&&(((a/Math.PI*8)%1+1)%1)<.18)return sc(k,.84);return k};
  if(v==='scale')return(X,Y)=>{const r=Y>>2,u=(X+(r&1?3:0))%6,y=Y&3,d=Math.hypot(u-2.5,y+.5),k=M(X,Y);if(Math.abs(d-2.7)<.55)return sc(k,.72);if(d<2)return sc(k,1.1);return k};
  if(v==='runes')return(X,Y)=>{const[x,y]=A(X,Y),k=M(X,Y),gx=X>>4,gy=Y>>4;const a=4,b=11,c0=4,d=11,mid=Math.round((c0+d)/2),inX=x>=a&&x<=b,inY=y>=c0&&y<=d,seg=i=>hh(gx*7+i,gy*5,s)>.45;
   const on=inY&&(x===a&&seg(0)||x===b&&seg(1))||inX&&(y===c0&&seg(2)||y===d&&seg(3)||y===mid&&seg(6))||inX&&inY&&(x-a===y-c0&&seg(4)||(x-a)+(y-c0)===b-a&&seg(5));return on?sc(k,1.4):k};
  if(v==='veined')return(X,Y)=>{const k=M(X,Y),d=Math.abs(vn(X/9,Y/9,s+50)-.5);return d<.018?mx(k,VOID,.45):d<.04?mx(k,VOID,.15):k}}
 return null}
const cellE=(X,Y)=>{const x=X&15,y=Y&15;return[x,y,Math.min(x,y,15-x,15-y)]};
// obsidian: purple-black glass, glitter, and folded iridescent flow bands
const OPAL=[[146,156,180],[117,142,188],[104,170,176],[207,178,112],[93,85,107],[146,156,180]],opal=p=>{p=(p%1+1)%1*5;const i=p|0;return OPAL[i].map((v,j)=>v+(OPAL[i+1][j]-v)*(p-i))};
// obsidian: purple-black base, the goldstone vein in iridescent hues
// one vein for every veined stone: a thin bright line with a soft edge, a faint shade on one side and the odd flake; members choose its colour
const vein=(k,X,Y,s,col,fl=1)=>{const v=vn(X/9,Y/9,s+50)-.5,d=Math.abs(v);if(d<.02)return mx(k,col,.8);if(d<.045)return mx(k,col,.3);if(d<.055&&v>0)return sc(k,.93);return fl&&hh(X,Y,s+51)>.978?mx(k,col,.6):k};
// obsidian: purple-black base with plum and near-black patches; its vein is iridescent, or muted (mu) on cut patterns, with no flakes
const flowVein=(k,X,Y,s,mu=0)=>{k=mx(k,[75,47,76],Math.max(0,vn(X/22,Y/22,s+84)-.5)*1.3);k=mx(k,[21,6,12],Math.max(0,vn(X/26,Y/26,s+89)-.55)*1.4);k=sc(k,.92+fbm(X/3,Y/4,s+87)*.16);return vein(k,X,Y,s,mu?[92,86,132]:opal(vn(X/40,Y/40,s+85)*1.5),0)};
// a polished cut: a faint line
const cutJ=()=>[52,41,71];// #2A2139 once floors darken
const veinOf=(M,k,X,Y,s)=>M.vein==='flow'?flowVein(k,X,Y,s):M.vein?vein(k,X,Y,s,M.vein):k;
const speck=(k,X,Y,s)=>{const v=hh(X,Y,s+70);return v>.965?sc(k,.8):v>.92?mx(k,[190,164,160],.22):v<.025?mx(k,[236,228,222],.22):k};
const softStone=(X,Y,c,s,m)=>m?mx(stoneT(X,Y,c,11+s),sc(c,1.04),.45):mx(stoneT(X,Y,c,s),sc(c,.93+fbm(X/14,Y/14,s+60)*.14),.4);
// one metal table: tiles and armour share colour, strength, weight and wear (w and age are for armour)
// flat tiles show a metal at its lit tone, as armour plate reads in the light
function metalOf(mat,X,Y){const m=metalCore(X,Y);return sc(metalLit(mat),(m[0]+m[1]+m[2])/420)}
const metalLit=mat=>{const M=memb('Metal',mat);return M.dk?sc(M.c,M.dk):sc(M.c,Math.min(1.32,235/Math.max(...M.c)))};
// a metal at relative brightness l (0 dark .. 1 bright), for recolouring furniture and doors
const metalTone=(mat,l)=>sc(metalLit(mat),.45+l*1.05);
const cutEdge=f=>(X,Y,cx,cy)=>{const k=f(X,Y,cx,cy),kid=q=>q&&q.replace(/~\d$/,''),me=kid(LINK(cx,cy));if(!k||!me)return k;const x=X&15,y=Y&15,o=(a,b)=>kid(LINK(a,b))!==me,e=Math.min(o(cx-1,cy)?x:99,o(cx+1,cy)?15-x:99,o(cx,cy-1)?y:99,o(cx,cy+1)?15-y:99);return e===0?mx(k,[156,146,190],.6):e===1?mx(k,[118,108,156],.25):k};
// cut stone: walls get a light cut edge, floors sit darker beneath them
// metal floor plates: a lit edge inside each joint, a softer copy of the wall bevel
const bevel=f=>(X,Y,cx,cy)=>{const k=f(X,Y,cx,cy);if(!k)return k;const[dl,dr,du,dd]=regionD(X,Y,cx,cy),e=Math.min(dl,dr,du,dd);return e===0?sc(k,.82):e===1?sc(k,dl===1||du===1?1.1:.92):k};
function genTex(el,mat,v,wall){const f=genTex0(el,mat,v,wall);if(el==='Metal'&&!wall)return bevel(f);return!memb(el,mat).cut?f:wall?cutEdge(f):(X,Y,cx,cy)=>{const k=f(X,Y,cx,cy);return k&&sc(k,.8)}}
function genTex0(el,mat,v,wall){const E=ELEM[el],M=memb(el,mat),c=M.c,s=([...Object.keys(E.mats),...Object.keys(E.old||{})].indexOf(mat)+1)*7;{const f=special(el,mat,M.as&&M.as[v]||v,c,s,wall);if(f)return f}
 if(el==='Earth'){const worn=v==='worn';
  if(mat==='grass')return wall?(X,Y)=>bushT(X,Y):(X,Y)=>{const g=grassT(X,Y);if(!worn)return g;const f=fbm(X/9,Y/9,64);return f>.56?mx(g,soilT(X,Y),Math.min(1,(f-.56)*5)):g};
  if(mat==='dirt')return wall?(X,Y)=>{let k=soilT(X,Y);k=sc(k,.86);return Y%5===0&&hh(X>>2,Y,13)>.5?sc(k,.85):k}:(X,Y)=>{const k=soilT(X,Y);if(!worn)return k;const f=fbm(X/11,Y/11,65);if(f>.55){const t=mx(k,sc(SOIL,.76),Math.min(1,(f-.55)*6)*.8);return hh(X,Y,66)>.985?sc(t,1.25):t}return hh(X>>1,Y>>1,67)>.97?mx(k,[150,140,120],.5):k};
  if(mat==='wheat')return wall?(X,Y)=>sc(cropT(Y,X),.82):(X,Y)=>{const k=cropT(X,Y);return worn&&fbm(X/8,Y/8,66)>.58?mx(k,soilT(X,Y),.6):k};
  return wall?(X,Y)=>{const b=bushT(X,Y);return worn&&fbm(X/6,Y/6,67)>.62?sc(b,.8):b}:(X,Y)=>{const b=mx(bushT(X,Y),grassT(X,Y),.45);return worn&&fbm(X/7,Y/7,68)>.6?mx(b,soilT(X,Y),.5):b}}
 if(el==='Stone'){const m=M.cls==='marble';return(X,Y)=>{let k=softStone(X,Y,c,s,m);if(M.speck)k=speck(k,X,Y,s);k=M.vein==='flow'?flowVein(k,X,Y,s,1):veinOf(M,k,X,Y,s);const[x,y,e]=cellE(X,Y);if(M.jc&&(v==='slabs'||v==='quarter')){const P=v==='quarter'?7:15,qx=X&P,qy=Y&P;if(qx===0||qy===0)return cutJ(k,M,X,Y,s)}
  if(v==='flags'){const fx=(X>>1)&15,fy=(Y>>1)&15,cx=X>>5,cy=Y>>5,ex=!(X&1),ey=!(Y&1);for(let b=0;b<3;b++){const[a,z,cu]=FLB2[b];if(fy<a||fy>=z)continue;let n=0;for(const q of cu)if(fx>=q)n++;const j=fy===a&&ey||cu.includes(fx)&&ex;k=sc(k,j?.84:1+(hh(cx*7+n,cy*3+b,s)-.5)*.09);if(!j&&(fy===a&&!ey||cu.includes(fx)&&!ex))k=sc(k,1.04)}}
  else if(v==='slabs'){k=sc(k,(x===0||y===0?.9:x===1||y===1?1.03:x===15||y===15?.97:1)*(1+(hh(X>>4,Y>>4,s+1)-.5)*.1))}
  else if(v==='quarter'){const qx=X&7,qy=Y&7,t=1+(hh(X>>3,Y>>3,s+4)-.5)*.1;k=sc(k,(qx===0||qy===0?.82:qx===1||qy===1?1.08:qx===7||qy===7?.9:1)*t)}
  else if(v==='quartero'){const qx=X&7,qy=Y&7,ex=Math.min(qx,7-qx),ey=Math.min(qy,7-qy),jt=qx===0||qy===0,cn=ex+ey<=1,nick=(qx===1||qy===1)&&hh(X,Y,s+5)>.86,t=1+(hh(X>>3,Y>>3,s+4)-.5)*.12;k=sc(k,(jt||cn?.86:nick?.93:ex===0&&qx===7||ey===0&&qy===7?.95:1)*t)}
  else if(v==='paving'){const u=X&31,w=Y&31;k=sc(k,(u===0||w===0?.88:u===1||w===1?1.04:1)*(1+(hh(X>>5,Y>>5,s+2)-.5)*.07))}
  else if(v==='key'){k=sc(k,x===0||y===0?.95:1)}
  else if(wall)k=sc(k,1+(hh(X>>4,Y>>3,s+3)-.5)*.05);return k}}
 if(el==='Wood'){return(X,Y)=>{const[x,y,e]=cellE(X,Y);
  if(v==='planks')return wall?sc(plankT(X,Y,c,s),1):plankT(X,Y,c,s);
  if(v==='boards'){let k=woodT(X,Y,c,s+(Y>>4)*3);k=sc(k,1+(hh(Y>>4,s,9)-.5)*.08);if((Y&15)===15)k=sc(k,.84);else if((Y&15)===0)k=sc(k,1.04);return k}
  return woodT(X,Y,c,s+13)}}
 if(el==='Metal'){const I=wall?5:4;return(X,Y,cx,cy)=>{const x=X&15,y=Y&15,k=metalOf(mat,X,Y),[dl,dr,du,dd]=regionD(X,Y,cx,cy),e=Math.min(dl,dr,du,dd);
  // a connected area is one plate: details sit I px in from its outer edge (walls lose 3px to their rim)
  if(v==='sheet')return k;
  // quartered: 8px plates, each with a dark seam and a bright top-left lip
  if(v==='quarter'){const a=X&7,b=Y&7;return a===0||b===0?sc(k,.76):a===1||b===1?sc(k,1.18):a===7||b===7?sc(k,.92):k}
  if(v==='slabs'){const r=Y>>3,a=(X+(r&1?8:0))&15,b=Y&7;return a===0||b===0?sc(k,.84):a===1||b===1?sc(k,1.06):k}
  if(v==='rivet')return(dl===I||dr===I)&&(du===I||dd===I)?sc(k,1.3):k;
  if(v==='panel'){if(e!==I||Math.min(dl,dr,du,dd)<I)return k;return dl===I||du===I?sc(k,.78):sc(k,1.18)}
  if(v==='smooth')return k;
  if(mat==='brass'){if((x===3||x===12)&&(y===3||y===12))return sc(k,1.35);return sc(k,1+.06*Math.sin((x+y)/3))}
  if(mat==='gold')return sc(k,1.04);
  return k}}
 return(X,Y)=>{let k=sc(c,(.9+fbm(X/8,Y/8,32+s)*.14)*((X+Y)&1?.98:1.02));
  if(wall)return sc(k,.86+.14*Math.sin(X/2.4));if(v==='diamond'){const u=((X+Y)%8+8)%8,w=((X-Y)%8+8)%8;if(u===0||w===0)k=mx(k,[176,140,82],.22);else if(u===4&&w===4)k=mx(k,[196,160,96],.3)}return k}}
for(const el in ELEM)for(const mat of[...Object.keys(ELEM[el].mats),...Object.keys(ELEM[el].old||{})])for(const v of[...Object.keys(varsOf(el,mat)),...(OLDV[el]||[])])for(const w of[0,1]){const k=el.toLowerCase()+'.'+mat+'.'+v+(w?'.w':'');TEX[k]=genTex(el,mat,v,w);KIND[k]=w?'wall':'floor';CATN[k]=[el,mat,v,w];
 if(w&&el==='Earth'&&(mat==='hedge'||mat==='grass'))NODK.add(k);if(!w&&el==='Cloth'&&v!=='plain')RUG.add(k);if(!w&&v==='key')KEYT.add(k);if(el==='Wood'&&v==='panel')POLT.add(k)}
// condition: 5 new, 4 used, 3 worn, 2 battered, 1 ruined. One wear look per family spreads in patches and deepens as condition drops
let WEARF=0;const CONDN={5:'New',4:'Used',3:'Worn',2:'Battered',1:'Ruined'};
const WEAR={Stone:(el,mat)=>{const mb=memb(el,mat).cls==='marble',B=(memb(el,mat).c||[120,120,120]).reduce((p,q)=>p+q,0)/3,ob=!!memb(el,mat).cut,lt=!mb&&B>150,G=lt?memb(el,mat).c.map(v=>v*.66|0):[104,104,82],sd=([...Object.keys(ELEM[el].mats),...Object.keys(ELEM[el].old||{})].indexOf(mat)+3)*11;
 return(f,t)=>(X,Y,cx,cy)=>{let k=f(X,Y,cx,cy);if(!k)return k;const m=fbm(X/13,Y/13,sd)*.7+hh(X>>2,Y>>2,sd+1)*.3,cov=t*.66,a=Math.max(0,Math.min(1,(cov-m)/.14))*(.4+.6*t);if(lt&&k){const L=(k[0]+k[1]+k[2])/3;k=mx(k,[L,L,L],t*.25)}if(ob){let c=a>0?mx(k,[78,68,92],a*.32):k;const L=(c[0]+c[1]+c[2])/3;c=mx(c,[L,L,L],t*.5);if(a>.5)WEARF=1;return t>=.5&&a>.35&&hh(X>>1,Y>>1,sd+13)>.982?sc(c,(X+Y)&1?1.12:.9):c}if(a<=0)return k;
  let c=mx(k,mb?[188,176,150]:G,a*(mb?.22:.32));if(a>.5)WEARF=1;if(t>=.5&&a>.35&&hh(X>>1,Y>>1,sd+13)>.982)c=sc(c,(X+Y)&1?1.07:.9);
  const L=(k[0]+k[1]+k[2])/3;if(!mb&&L<B*(lt?.72:.88)&&a>.3)c=mx(c,[78,100,52],.6*a);else if(!mb&&!lt&&hh(X,Y,sd+4)>.93-.1*t)c=mx(c,[86,108,56],.6*a);return c}}};
for(const k in MCHEST){TEX[k]=(X,Y)=>metalOf(MCHEST[k][0],X,Y);KIND[k]='floor'}
for(const el in WEAR)for(const k of Object.keys(CATN)){const[e,mat,v,w]=CATN[k];if(e!==el)continue;const W=WEAR[el](el,mat),f=TEX[k];for(let c=1;c<=4;c++){const n=k+'~'+c;TEX[n]=W(f,(5-c)/4);KIND[n]=KIND[k];CATN[n]=[e,mat,v,w,c];if(NODK.has(k))NODK.add(n);if(RUG.has(k))RUG.add(n);if(KEYT.has(k))KEYT.add(n);if(POLT.has(k))POLT.add(n)}}
// old tile names from earlier maps: each is now a member of the material table
for(const[k,a]of Object.entries({metal:'metal.steel.smooth.w',mplate:'metal.steel.rivet.w',mpanel:'metal.steel.smooth.w',iron:'metal.iron.rivet.w',brass:'metal.brass.smooth.w',mfloor:'metal.steel.smooth',gfloor:'metal.gold.smooth'})){TEX[k]=TEX[a];KIND[k]=KIND[a];CATN[k]=CATN[a]}
const OLDK={marble:'stone.aur.block',dmarble:'stone.ver.block',flag:'stone.sand.flags',stone:'stone.grey.block.w',gstone:'stone.gold.block.w',pillar:'stone.aur.block.w',pave:'stone.lime.paving',omarble:'stone.aur.key',gtile:'stone.ver.key',bkmarble:'stone.night.block',bkslab:'stone.night.slabs',slab:'stone.grey.slabs',
 planks:'wood.oak.planks',pplanks:'wood.pine.planks',dplanks:'wood.teak.planks',wood:'wood.oak.boards.w',dwood:'wood.walnut.boards.w',ewood:'wood.ebony.boards.w',metal:'metal.steel.smooth.w',mplate:'metal.steel.rivet.w',iron:'metal.iron.rivet.w',brass:'metal.brass.rivet.w',mpanel:'metal.steel.panel.w',mfloor:'metal.steel.rivet',gfloor:'metal.gold.panel',
 carpet:'cloth.crimson.diamond',gcarpet:'cloth.verdant.diamond',pcarpet:'cloth.purple.diamond',crop:'earth.wheat.plain',berm:'earth.dirt.plain.w',bush:'earth.hedge.plain.w'};
TEX.hedge=(X,Y)=>{const g=vn(X/2.2,Y/2.2,19);if(g<.27&&hh(X,Y,20)>.3)return null;return bushT(X,Y)};KIND.hedge='floor';
for(const[o,n]of Object.entries(OLDK)){TEX[o]=TEX[n];if(KEYT.has(n))KEYT.add(o)}
