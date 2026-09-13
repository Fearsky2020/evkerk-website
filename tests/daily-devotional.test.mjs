import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DAILY_TIMEZONE, amsterdamDate, fallbackDailyDevotional, handleDailyDevotionalApi, validDailyDate } from '../src/daily-devotional.js';

const migration=fs.readFileSync(new URL('../migrations/0027_daily_devotionals.sql',import.meta.url),'utf8');
const enhanced=fs.readFileSync(new URL('../src/worker-enhanced.js',import.meta.url),'utf8');
const services=fs.readFileSync(new URL('../src/team-services.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../public/team/devotionals/index.html',import.meta.url),'utf8');
const uiJs=fs.readFileSync(new URL('../public/team/devotionals/app.js',import.meta.url),'utf8');

function env(row=null){
  return{DB:{prepare(sql){let args=[];return{bind(...v){args=v;return this},async first(){
    if(sql.includes("FROM daily_devotionals WHERE devotional_date=? AND status='published'"))return row&&row.devotional_date===args[0]&&row.status==='published'?row:null;
    return null;
  }}}}};
}
async function get(path,row=null){return handleDailyDevotionalApi(new Request('https://evkerk.nl'+path),env(row),new URL('https://evkerk.nl'+path))}

test('daily devotional date uses Europe Amsterdam across UTC midnight',()=>{
  assert.equal(DAILY_TIMEZONE,'Europe/Amsterdam');
  assert.equal(amsterdamDate(new Date('2026-01-01T23:30:00Z')),'2026-01-02');
  assert.equal(amsterdamDate(new Date('2026-07-01T22:30:00Z')),'2026-07-02');
});
test('daily date validation rejects impossible calendar dates',()=>{
  assert.equal(validDailyDate('2026-02-29'),false);
  assert.equal(validDailyDate('2026-09-13'),true);
});
test('public API returns the exact published date contract',async()=>{
  const row={devotional_date:'2026-09-13',reference:'约翰福音 3:16',scripture_text:'神爱世人。',reflection_prompt:'我怎样回应？',share_text:'分享文字',updated_at:'2026-09-13 08:00:00',status:'published'};
  const r=await get('/api/app/daily-devotional?date=2026-09-13',row),body=await r.json();
  assert.equal(r.status,200);
  assert.deepEqual(Object.keys(body),['date','timezone','reference','scripture_text','reflection_prompt','share_text','updated_at']);
  assert.equal(body.timezone,'Europe/Amsterdam');
  assert.equal(body.reference,row.reference);
});
test('unpublished or missing date receives stable server fallback',async()=>{
  const draft={devotional_date:'2026-09-14',reference:'草稿',scripture_text:'不可见',reflection_prompt:'不可见',share_text:'不可见',updated_at:'2026-09-13',status:'draft'};
  const body=await (await get('/api/app/daily-devotional?date=2026-09-14',draft)).json();
  assert.deepEqual(body,fallbackDailyDevotional('2026-09-14'));
  assert.deepEqual(body,fallbackDailyDevotional('2026-09-14'));
  assert.deepEqual(fallbackDailyDevotional('2026-09-14'),fallbackDailyDevotional('2026-09-14'));
  assert.notEqual(fallbackDailyDevotional('2026-09-14').reference,fallbackDailyDevotional('2026-09-15').reference);
});
test('invalid requested date returns 400',async()=>assert.equal((await get('/api/app/daily-devotional?date=2026-02-30')).status,400));
test('migration enforces one row per date, statuses, audit and service catalog',()=>{
  assert.match(migration,/devotional_date TEXT NOT NULL UNIQUE/);
  assert.match(migration,/CHECK \(status IN \('draft','published'\)\)/);
  assert.match(migration,/daily_devotional_audit_log/);
  assert.match(migration,/VALUES\('daily_devotional'/);
});
test('daily devotional admin page edits required fields and never deletes history',()=>{
  for(const id of ['devotionalDate','devotionalReference','devotionalScripture','devotionalReflection','devotionalStatus','updatedLabel'])assert.match(ui,new RegExp('id="'+id+'"'));
  assert.match(uiJs,/\/api\/admin\/daily-devotionals/);
  assert.doesNotMatch(uiJs,/method:'DELETE'/);
  assert.match(services,/daily_devotional/);
});
test('enhanced worker exposes the shared API handler',()=>{
  assert.match(enhanced,/handleDailyDevotionalApi/);
  assert.match(enhanced,/dailyDevotionalResponse/);
});
