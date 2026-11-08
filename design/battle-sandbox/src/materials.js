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
// what each hit class does to things made of it: strength, friction, how readily pieces weld back
const MAT={1:{hp:3,f:.6,weld:.05},2:{hp:2,f:.82,weld:.45},3:{hp:6,f:.42,weld:.14},4:{hp:1,f:.9,weld:.5},0:{weld:.3}};
const hitCls=m=>(CLS[m]||{}).n||2;
// one material, everything known about it: its element's defaults, its own values and its class
const matInfo=(el,mat)=>{const m=mprop(el,mat);return{el,mat,...CLS[m.cls],...m}};
// a metal by name (steel, iron, brass...) as a hit class, for things built of it like doors and hulls
const metalCls=name=>hitCls(mprop('Metal',name).cls);
