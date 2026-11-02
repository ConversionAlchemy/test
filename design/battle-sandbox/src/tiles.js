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
const KIND={marble:'floor',dmarble:'floor',flag:'floor',planks:'floor',stone:'wall',table:'floor',seat:'floor',gstone:'wall',pillar:'wall',carpet:'floor',gfloor:'floor',grass:'floor',dirt:'floor',berm:'wall',sky:'floor',rail:'wall'};
const PALOF={planks:'oak',seat:'oak',table:'teak'};
const cache=new Map();
function tile(key,sig,cx,cy){const ck=key+(cx%2)+(cy%2)+(cy%3);if(cache.has(ck))return cache.get(ck);const cv=document.createElement('canvas');cv.width=cv.height=T;const g=cv.getContext('2d');const pal=PAL[PALOF[key]||key],c={s:7,cx,cy};
 for(let y=0;y<T;y++)for(let x=0;x<T;x++){const t=P[key](x,y,c);g.fillStyle=`rgb(${pal[t]})`;g.fillRect(x,y,1,1)}
 cache.set(ck,cv);return cv}
