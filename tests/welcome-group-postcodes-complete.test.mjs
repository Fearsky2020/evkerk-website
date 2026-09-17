import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function collect(sql){
  const out=new Map();
  const re=/postcode='([0-9]{4}[A-Z]{2})'.*?group_number=(\d+)\b/g;
  for(const m of sql.matchAll(re))out.set(Number(m[2]),m[1]);
  return out;
}

test('all 33 real groups have durable postcode migration data', async()=>{
  const files=['0020_first_cluster_postcodes.sql','0021_second_cluster_postcodes.sql','0022_third_fourth_cluster_postcodes.sql','0030_complete_group_postcodes.sql'];
  const merged=new Map();
  for(const file of files){
    const sql=await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8');
    for(const [n,pc] of collect(sql))merged.set(n,pc);
  }
  assert.equal(merged.size,33);
  for(let n=1;n<=33;n++)assert.match(merged.get(n)||'',/^[0-9]{4}[A-Z]{2}$/);
  assert.equal(merged.get(1),'2594CC');
  assert.equal(merged.get(9),'3034JB');
  assert.equal(merged.get(16),'2264TR');
  assert.equal(merged.get(31),'3072MD');
  assert.equal(merged.get(32),'2286XJ');
  assert.equal(merged.get(33),'2288EA');
});
