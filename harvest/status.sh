#!/usr/bin/env bash
# SPEC 63 HV-1 (bash twin of status.ps1): items and bytes per harvester, PID alive?, why stopped. Usage: bash harvest/status.sh
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
exec node -e '
const fs=require("fs"),path=require("path");
const out="data/raw/harvest";let pids={};
try{pids=JSON.parse(fs.readFileSync(out+"/pids.json","utf8").replace(/^﻿/,""))}catch{}
const rows=[];
for(const d of fs.existsSync(out)?fs.readdirSync(out,{withFileTypes:true}).filter(e=>e.isDirectory()):[]){
  const dir=path.join(out,d.name);let n=0,b=0;
  try{for(const l of fs.readFileSync(dir+"/index.jsonl","utf8").split("\n")){if(!l)continue;n++;const m=/"bytes":(\d+)/.exec(l);if(m)b+=+m[1]}}catch{}
  let disk=0;try{for(const f of fs.readdirSync(dir+"/items"))disk+=fs.statSync(dir+"/items/"+f).size}catch{}
  let alive=false;const p=pids[d.name];if(p){try{process.kill(p,0);alive=true}catch{}}
  let stop="";try{stop=JSON.parse(fs.readFileSync(dir+"/STOPPED.json","utf8")).reason||""}catch{}
  rows.push({source:d.name,items:n,payloadMB:+(b/1048576).toFixed(1),diskMB:+(disk/1048576).toFixed(1),pid:p||"",alive,stopped:stop});
}
console.table(rows);
try{console.log("r2u dump total lookups: "+fs.readFileSync("data/raw/r2u/index.jsonl","utf8").split("\n").filter(Boolean).length)}catch{}
'
