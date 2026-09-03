const fs=require('node:fs');
const path=require('node:path');

const TOP_LEVEL_KEYS=new Set(['siteTextPlatform','platforms']);
const PLATFORM_KEYS=new Set(['id','fields','officialPaths','pathResearch']);

function isObject(value){return value&&typeof value==='object'&&!Array.isArray(value)}
function clone(value){return JSON.parse(JSON.stringify(value))}
function assert(condition,message){if(!condition)throw new Error(message)}

function mergeObject(base,patch){
  const out=isObject(base)?clone(base):{};
  for(const [key,value] of Object.entries(patch||{})){
    if(isObject(value)&&isObject(out[key]))out[key]=mergeObject(out[key],value);
    else out[key]=clone(value);
  }
  return out;
}

function applyPatch(input,patch){
  assert(isObject(input),'data must be an object');
  assert(isObject(patch),'patch must be an object');
  for(const key of Object.keys(patch))assert(TOP_LEVEL_KEYS.has(key),`Unsupported patch key: ${key}`);

  const out=clone(input);
  if(Object.hasOwn(patch,'siteTextPlatform')){
    assert(isObject(patch.siteTextPlatform),'siteTextPlatform must be an object');
    assert(isObject(out.siteText)&&isObject(out.siteText.platform),'data.siteText.platform is required');
    out.siteText.platform=mergeObject(out.siteText.platform,patch.siteTextPlatform);
  }

  if(Object.hasOwn(patch,'platforms')){
    assert(Array.isArray(patch.platforms),'platforms patch must be an array');
    assert(Array.isArray(out.platforms),'data.platforms must be an array');
    const byId=new Map(out.platforms.map((row,index)=>[String(row&&row.id||''),index]));
    const seen=new Set();
    for(const rowPatch of patch.platforms){
      assert(isObject(rowPatch),'platform patch must be an object');
      for(const key of Object.keys(rowPatch))assert(PLATFORM_KEYS.has(key),`Unsupported platform patch key: ${key}`);
      const id=String(rowPatch.id||'').trim();
      assert(id,'platform patch id is required');
      assert(!seen.has(id),`Duplicate platform patch: ${id}`);
      seen.add(id);
      assert(byId.has(id),`Unknown platform ID: ${id}`);
      const index=byId.get(id);
      const current=out.platforms[index];
      const next={...current};
      for(const key of ['fields','officialPaths','pathResearch']){
        if(Object.hasOwn(rowPatch,key))next[key]=clone(rowPatch[key]);
      }
      out.platforms[index]=next;
    }
  }
  return out;
}

function runCli(argv=process.argv.slice(2)){
  const patchFile=argv[0];
  if(!patchFile)throw new Error('Usage: node scripts/apply-platform-paths-patch.cjs <patch.json>');
  if(argv.length>1)throw new Error('Only one patch file may be supplied');
  const dataPath=path.resolve(__dirname,'../data.json');
  const patchPath=path.resolve(process.cwd(),patchFile);
  const data=JSON.parse(fs.readFileSync(dataPath,'utf8'));
  const patch=JSON.parse(fs.readFileSync(patchPath,'utf8'));
  const originalIds=(data.platforms||[]).map(row=>row.id);
  const out=applyPatch(data,patch);
  const nextIds=(out.platforms||[]).map(row=>row.id);
  assert(out.platforms.length===data.platforms.length,'patch changed platform count');
  assert(JSON.stringify(nextIds)===JSON.stringify(originalIds),'patch changed platform IDs or order');
  fs.writeFileSync(dataPath,`${JSON.stringify(out,null,2)}\n`);
  console.log(`Applied platform paths patch: ${patch.platforms?patch.platforms.length:0} platform records`);
  return out;
}

if(require.main===module){
  try{runCli()}catch(error){console.error(error.message);process.exitCode=1}
}

module.exports={applyPatch,runCli};
