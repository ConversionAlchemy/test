// The material table. ELEM (tiles.js) holds every material by element (Earth, Stone, Wood, Metal, Cloth), each with its look, strength and wear;
// CLS below is what a class of materials shares in play: its hit class, sounds and the debris it throws. Every surface (wall, floor, furniture,
// door, carrier hull, armour) names a material, and asks here how it behaves rather than deciding for itself. See README, "Materials".
const CLS={
 stone:{n:1,step:'stone',hit:'stonehit',debris:'chips'},
 marble:{n:1,step:'marble',hit:'stonehit',debris:'chips'},
 soil:{n:1,step:'dirt',hit:'stonehit',debris:'dust'},
 grass:{n:2,step:'grass',hit:'woodhit',debris:'dust'},
 wood:{n:2,step:'wood',hit:'woodhit',debris:'splinters'},
 metal:{n:3,step:'metal',hit:'mhit',debris:'sparks'},
 cloth:{n:2,step:'carpet',hit:'woodhit',debris:'lint'},
 foliage:{n:4,step:'grass',hit:'rustle',debris:'leaves'}};
// what each hit class does in play. hp, f (friction), weld; its sounds when shot (hit), struck or lodged in (knock), glanced off (glance),
// dragged (drag) and crushed (crush); the debris and chip colour it throws; metal (sparks, heats, turns blades), deflect (shots glance),
// hard (shots bite only a pixel or two), lock (doors of it lock), mass when pushed; carve, blade, pen, dig, rod, rodWear, rodE, obj tune
// how far blasts, blades, shots and lances cut into it; through: shots pass through furniture of it
const MAT={
 1:{hp:3,f:.6,weld:.05,hit:'stonehit',knock:'crack',glance:'ricos',drag:'thunk',crush:'crack',debris:'chips',chip:null,deflect:1,hard:1,lock:1,mass:1,carve:1,blade:.08,pen:.35,dig:6,rod:2.5,rodWear:1,rodE:.3,obj:[.7,1.12]},
 2:{hp:2,f:.82,weld:.45,hit:'woodhit',knock:'thunk',glance:'crack',drag:'thunk',crush:'crack',debris:'splinters',chip:[138,96,58],chipH:[162,118,74],deflect:0,hard:0,lock:0,mass:1,carve:1.7,blade:.3,pen:1.2,dig:1.6,rod:.6,rodWear:.6,rodE:.3,obj:[1,1.6],through:1},
 3:{hp:6,f:.42,weld:.14,hit:'mhit',knock:'mhit',glance:'rico',drag:'chink',crush:'clank',debris:'sparks',chip:[138,150,144],metal:1,deflect:1,hard:1,lock:1,mass:2,carve:.8,blade:.04,pen:.3,dig:7,rod:4.5,rodWear:1.4,rodE:.6,obj:[1,1]},
 4:{hp:1,f:.9,weld:.5,hit:'rustle',knock:'rustle',glance:'rustle',drag:'rustle',crush:'rustle',debris:'leaves',chip:[86,112,58],chipH:[112,138,70],deflect:0,hard:1,lock:1,mass:1,carve:1,blade:.04,pen:.35,dig:6,rod:2.5,rodWear:1,rodE:.3,obj:[1.6,2.6]},
 0:{weld:.3}};
// a hit class number (as walls, slabs and matAt store it) to its entry; anything unknown behaves as stone
const hcl=n=>MAT[n]&&MAT[n].hit?MAT[n]:MAT[1];
// a class's sound for a role: snd('metal','hit'), for metal parts that are not a surface (locks, armour plates)
const snd=(c,role)=>hcl(hitCls(c))[role];
// a class's chip colour, else the surface's own colour c
const chipC=(n,c)=>{const p=hcl(n).chip;return p?rgb(p[0],p[1],p[2]):c};
const hitCls=m=>(CLS[m]||{}).n||2;
// one material, everything known about it: its element's defaults, its own values and its class
const matInfo=(el,mat)=>{const m=mprop(el,mat);return{el,mat,...CLS[m.cls],...m}};
// a metal by name (steel, iron, brass...) as a hit class, for things built of it like doors and hulls
const metalCls=name=>hitCls(mprop('Metal',name).cls);
