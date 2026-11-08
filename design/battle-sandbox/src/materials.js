// The material table. ELEM (tiles.js) holds every material by element (Earth, Stone, Wood, Metal, Cloth), each with its look, strength and wear;
// CLS below is what a class of materials shares in play: its hit class, sounds and the debris it throws. Every surface (wall, floor, furniture,
// door, carrier hull, armour) names a material, and asks here how it behaves rather than deciding for itself. See README, "Materials".
// place: the editor's sound for laying it; rubble: how blast debris sounds on it; dust: puffs the editor raises (count, colour, life,
// clean: no lingering haze). heat.ignite: heat past this starts a fire
// blast: how a blast treats it. glow and flick: how bright fresh heat glows and whether it flickers; reach and wear: how far a
// blast wears walls and furniture of it and how hard; floor: how far it wears floors; crater: the floor crater style (chips,
// planks, dent, cloth); ignite: a blast sets it alight; firm: it does not soften the blast's reach
// heat: how the class marks under heat, as stops [heat, colour, mix] from cold to hottest (approved in the lab); metal uses the temper
// colours instead. spall, craze, glaze, ember, hole: extra marks past that heat; grain, soft, fade: char follows the grain, the edge fades
// out, the stops scale the fabric's own faded colour (as it ages) rather than replace it
const CLS={
 stone:{n:1,step:'stone',hit:'stonehit',debris:'chips',heat:{s:[[0,[0,0,0],0],[.18,[214,206,192],.18],[.42,[96,88,80],.38],[.68,[52,48,46],.62],[.9,[28,27,27],.8]],spall:.6},blast:{glow:.5},place:'stone',rubble:'stone',dust:{n:8}},
 marble:{n:1,step:'marble',hit:'stonehit',debris:'chips',heat:{s:[[0,[0,0,0],0],[.2,[226,206,150],.22],[.45,[200,184,150],.3],[.7,[232,230,222],.32],[.9,[244,243,238],.46]],craze:.6},blast:{glow:.5},place:'tile',rubble:'stone',dust:{n:8}},
 soil:{n:1,step:'dirt',hit:'stonehit',debris:'dust',heat:{s:[[0,[0,0,0],0],[.25,[64,48,34],.3],[.6,[38,30,24],.6],[.9,[30,30,36],.75]],glaze:.82},blast:{glow:.5},place:'soft',rubble:'stone',dust:{n:8}},
 grass:{n:2,step:'grass',hit:'woodhit',debris:'dust',heat:{ignite:0.75,s:[[0,[0,0,0],0],[.18,[160,150,62],.45],[.42,[120,92,48],.62],[.7,[72,58,40],.85],[.9,[32,28,24],.9]]},blast:{glow:.5},place:'soft',rubble:'stone',dust:{n:8}},
 wood:{n:2,step:'wood',hit:'woodhit',debris:'splinters',heat:{ignite:0.7,s:[[0,[0,0,0],0],[.22,[178,120,62],.2],[.46,[104,60,32],.48],[.7,[52,34,22],.68],[.92,[34,24,18],.8]],grain:1,ember:.82,soft:1},blast:{glow:.8,flick:1,reach:1.6,wear:40,floor:1.5,crater:'planks'},place:'wood',rubble:'wood',dust:{n:8}},
 metal:{n:3,step:'metal',hit:'mhit',debris:'sparks',heat:{temper:[[0,[1,1,1]],[.14,[1.02,.94,.78]],[.3,[.82,.66,.56]],[.46,[.56,.56,.7]],[.66,[.32,.33,.39]],[.9,[.15,.15,.17]]],max:.85},blast:{glow:1,crater:'dent',firm:1},place:'metal',rubble:'metal',dust:{n:3,c:[240,244,246],life:10,clean:1}},
 cloth:{n:2,step:'carpet',hit:'woodhit',debris:'lint',heat:{ignite:0.55,s:[[0,[1,1,1],0],[.12,[1,1,1],.85],[.4,[1,1,1],1],[.7,[.66,.66,.66],1],[.86,[.42,.42,.42],1]],hole:.88,fade:1,soft:1},blast:{glow:.75,floor:1.6,crater:'cloth',ignite:1},place:'cloth',rubble:'cloth',dust:{n:5}},
 foliage:{n:4,step:'grass',hit:'rustle',debris:'leaves',heat:{ignite:0.6,s:[[0,[0,0,0],0],[.25,[150,130,50],.5],[.6,[90,64,34],.75],[.9,[30,24,20],.9]]},blast:{glow:.5},place:'soft',rubble:'stone',dust:{n:8}}};
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
const hitCls=m=>(CLS[m]||{}).n||2;
// one material, everything known about it: its element's defaults, its own values and its class
const matInfo=(el,mat)=>{const m=mprop(el,mat);return{el,mat,...CLS[m.cls],...m}};
// a metal by name (steel, iron, brass...) as a hit class, for things built of it like doors and hulls
const metalCls=name=>hitCls(mprop('Metal',name).cls);
