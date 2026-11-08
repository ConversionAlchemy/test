// Material conformance: fails when code decides behaviour by material outside src/materials.js, by hit class number (mat===3, sol[j]!==3)
// or by hand-picked surface sound ('stonehit', 'mhit', 'rico'...). Known sites still to move are listed in ALLOW with the audit phase that
// removes them; the list only shrinks. Run: node tests/materials.cjs
const fs=require('fs'),path=require('path'),SRC=path.join(__dirname,'../src');
const RULES=[['class number',/(?:sol\[[^\]]*\]|\.mat\b|\bmx\b|\bpm\b|\bm\b)\s*[!=]==\s*[1-4]\b/g],['element branch',/[!=]==\s*'(?:Stone|Wood|Metal|Cloth|Earth)'|'(?:Stone|Wood|Metal|Cloth|Earth)'\s*[!=]==/g],['surface sound',/'(?:stonehit|woodhit|mhit|rustle|rico|ricos|chink)'/g]];
const SKIP=new Set(['materials.js','sounds.js','space.js','tiles.js','countmap.js']);
const ALLOW={// file:function rule → reason
 'editor.js:legacyDoor class number':'old saves'};
const fnAt=(s,i)=>{let n='-';for(const m of s.slice(0,i).matchAll(/function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>/g))n=m[1]||m[2];return n};
let bad=0;const seen=new Set();
for(const f of fs.readdirSync(SRC).filter(f=>f.endsWith('.js')&&!SKIP.has(f))){const s=fs.readFileSync(path.join(SRC,f),'utf8');
 for(const[name,re]of RULES)for(const m of s.matchAll(re)){const key=`${f}:${fnAt(s,m.index)} ${name}`;seen.add(key);if(ALLOW[key])continue;bad++;
  const ln=s.slice(0,m.index).split('\n').length;console.log(`${f}:${ln} ${name}: …${s.slice(Math.max(0,m.index-60),m.index+40).replace(/\n/g,' ')}…`)}}
for(const k of Object.keys(ALLOW))if(!seen.has(k))console.log(`gone, take it off ALLOW: ${k}`);
console.log(bad?`${bad} material decisions outside the matrix`:`ok, ${Object.keys(ALLOW).length} known sites left`);process.exit(bad?1:0);
