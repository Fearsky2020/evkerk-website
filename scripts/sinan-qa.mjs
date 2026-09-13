import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import os from "node:os";

const root=process.cwd();
const config=JSON.parse(readFileSync(resolve(root,".sinan/qa/website.config.json"),"utf8"));
const startedAt=new Date().toISOString();

function run(program,args){
  const r=spawnSync(program,args,{cwd:root,encoding:"utf8",shell:false});
  return {command:[program,...args].join(" "),exitCode:Number.isInteger(r.status)?r.status:1,stdout:(r.stdout||"").trim(),stderr:(r.stderr||r.error?.message||"").trim()};
}
function npm(args){
  if(process.platform==="win32") return run(process.env.ComSpec||"cmd.exe",["/d","/s","/c",["npm.cmd",...args].join(" ")]);
  return run("npm",args);
}
function walk(dir,out=[]){
  if(!existsSync(dir)) return out;
  for(const name of readdirSync(dir)){
    const p=join(dir,name); const s=statSync(p);
    if(s.isDirectory()) walk(p,out); else out.push(p);
  }
  return out;
}

const branchRun=run("git",["branch","--show-current"]);
const commitRun=run("git",["rev-parse","HEAD"]);
const statusRun=run("git",["status","--porcelain"]);
const changed=(statusRun.stdout?statusRun.stdout.split("\n"):[]).filter(Boolean);
const relevantChanged=changed.filter(x=>!x.replaceAll("\\","/").includes(".sinan/qa-reports/"));

const results=[];
results.push({id:"syntax",required:true,...npm(["run","check"])});
results.push({id:"tests",required:true,...npm(["test"])});

const markerFiles=["src/welcome-normalization.js","tests/welcome-intake-quality.test.mjs","tests/welcome-photos.test.mjs"];
const missingMarkers=markerFiles.filter(x=>!existsSync(join(root,x)));
const markerText=markerFiles.filter(x=>existsSync(join(root,x))).map(x=>readFileSync(join(root,x),"utf8")).join("\n");
const contractOk=missingMarkers.length===0 && /海牙福音教会/.test(markerText) && /faith_status|信主/.test(markerText);
results.push({id:"contract-markers",required:true,exitCode:contractOk?0:1,stdout:contractOk?"Newcomer normalization and faith-status markers present":"",stderr:contractOk?"":"Missing/incomplete contract markers: "+missingMarkers.join(", ")});

const sourceFiles=[...walk(join(root,"src")),...walk(join(root,"public"))].filter(p=>/\.(?:js|mjs)$/.test(p));
const sensitive=/console\.(?:log|info|debug|warn|error)\s*\([^\n]*(?:phone|email|postcode|address|token|authorization|photo_key|object_key|note|display_name)/i;
const sensitiveHits=[];
for(const file of sourceFiles){
  const lines=readFileSync(file,"utf8").split(/\r?\n/);
  lines.forEach((line,i)=>{if(sensitive.test(line))sensitiveHits.push(relative(root,file)+":"+(i+1))});
}
results.push({id:"sensitive-log-scan",required:true,exitCode:sensitiveHits.length?1:0,stdout:sensitiveHits.length?"":"No obvious sensitive-field console logging found",stderr:sensitiveHits.length?"Review sensitive log candidates: "+sensitiveHits.join(", "):""});

const probes=[];
for(const endpoint of ["/api/app/daily-devotional","/api/admin/daily-devotionals","/api/welcome/cases","/api/organization/members"]){
  try{
    const response=await fetch(config.publicBaseUrl+endpoint,{redirect:"manual",signal:AbortSignal.timeout(15000)});
    let body=null; try{body=await response.json()}catch{}
    probes.push({endpoint,status:response.status,body});
  }catch(error){probes.push({endpoint,status:0,error:error.message})}
}
const daily=probes[0];
const privateProbes=probes.slice(1);
const publicOk=daily.status===200 && daily.body?.timezone==="Europe/Amsterdam" && ["date","timezone","reference","scripture_text","reflection_prompt","share_text","updated_at"].every(k=>Object.hasOwn(daily.body||{},k));
const privateOk=privateProbes.every(x=>x.status===401||x.status===403);
results.push({id:"production-readonly",required:true,exitCode:publicOk&&privateOk?0:1,stdout:JSON.stringify(probes.map(x=>({endpoint:x.endpoint,status:x.status,timezone:x.body?.timezone}))),stderr:publicOk&&privateOk?"":"Public contract or anonymous private-endpoint denial failed"});

const blockers=[];
if(branchRun.stdout!==config.canonicalBranch)blockers.push("Branch is "+(branchRun.stdout||"(unknown)")+", expected "+config.canonicalBranch);
if(relevantChanged.length)blockers.push("Git worktree contains release-relevant changes");
for(const r of results)if(r.required&&r.exitCode!==0)blockers.push("Required check failed: "+r.id);

const report={schemaVersion:1,project:config.project,verdict:blockers.length?"BLOCKED":"PASS",scope:"automated-readonly",startedAt,finishedAt:new Date().toISOString(),host:os.hostname(),branch:branchRun.stdout,commit:commitRun.stdout,changedPaths:changed,blockers,results,productionMutation:false};
const dir=resolve(root,".sinan/qa-reports");mkdirSync(dir,{recursive:true});
const reportPath=join(dir,"evkerk-website-qa-"+report.finishedAt.replace(/[:.]/g,"-")+".json");
writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n","utf8");
console.log("SINAN_QA_VERDICT="+report.verdict);
for(const r of results)console.log(r.id+": "+(r.exitCode===0?"PASS":"FAIL"));
for(const b of blockers)console.log("BLOCKER: "+b);
console.log("REPORT="+reportPath);
process.exit(report.verdict==="PASS"?0:2);
