const fs=require('node:fs');
const path=require('node:path');

function isObject(value){return value&&typeof value==='object'&&!Array.isArray(value)}
function displayName(row={}){
  const name=row.name;
  if(typeof name==='string')return name;
  if(isObject(name))return String(name.en||name.ar||name.tr||'');
  return'';
}
function isResearchComplete(row={}){
  return Object.hasOwn(row,'fields')&&Array.isArray(row.fields)
    &&Object.hasOwn(row,'officialPaths')&&Array.isArray(row.officialPaths)
    &&Object.hasOwn(row,'pathResearch')&&isObject(row.pathResearch)
    &&typeof row.pathResearch.lastVerified==='string'&&row.pathResearch.lastVerified.trim()!=='';
}
function parseRange(raw,total){
  if(raw===undefined||raw===null||raw==='')return{start:0,end:total};
  const match=/^(\d+):(\d+)$/.exec(String(raw).trim());
  if(!match)throw new Error('Range must use START:END');
  const first=Number(match[1]),last=Number(match[2]);
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last<first||last>total){
    throw new Error(`Range must be between 1 and ${total} with START <= END`);
  }
  return{start:first-1,end:last};
}
function summarize(platforms,range={start:0,end:Array.isArray(platforms)?platforms.length:0}){
  const list=Array.isArray(platforms)?platforms:[];
  const selected=list.slice(range.start,range.end).map((row,index)=>{
    const complete=isResearchComplete(row);
    return{
      position:range.start+index+1,id:String(row&&row.id||''),name:displayName(row),
      status:complete?'COMPLETE':'INCOMPLETE',
      fields:Array.isArray(row&&row.fields)?row.fields.length:null,
      paths:Array.isArray(row&&row.officialPaths)?row.officialPaths.length:null,
      verified:row&&isObject(row.pathResearch)&&row.pathResearch.lastVerified?String(row.pathResearch.lastVerified):''
    };
  });
  return{
    rows:selected,
    complete:selected.filter(row=>row.status==='COMPLETE').length,
    incomplete:selected.filter(row=>row.status==='INCOMPLETE').length
  };
}
function parseArgs(argv){
  let rangeRaw='',requireComplete=false;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--range'){
      if(!argv[i+1])throw new Error('--range requires START:END');
      rangeRaw=argv[++i];
    }else if(argv[i]==='--require-complete')requireComplete=true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return{rangeRaw,requireComplete};
}
function formatCount(value){return value===null?'?':String(value)}
function runCli(argv=process.argv.slice(2)){
  const {rangeRaw,requireComplete}=parseArgs(argv);
  const data=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data.json'),'utf8'));
  const platforms=Array.isArray(data.platforms)?data.platforms:[];
  const range=parseRange(rangeRaw,platforms.length);
  const result=summarize(platforms,range);
  for(const row of result.rows){
    console.log(`${String(row.position).padStart(3,'0')} ${row.id} ${row.name} ${row.status} fields=${formatCount(row.fields)} paths=${formatCount(row.paths)} verified=${row.verified||'-'}`);
  }
  console.log(`Research audit: ${result.complete} complete, ${result.incomplete} incomplete, ${result.rows.length} selected`);
  if(requireComplete&&result.incomplete>0)process.exitCode=1;
  return result;
}

if(require.main===module){
  try{runCli()}catch(error){console.error(error.message);process.exitCode=1}
}

module.exports={isResearchComplete,parseRange,summarize,runCli};
