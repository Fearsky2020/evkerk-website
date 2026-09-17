import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const r=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const activitiesHtml=r('public/activities.html'),activitiesJs=r('public/activities.js');
const sermonsHtml=r('public/sermons.html'),sermonsJs=r('public/sermons.js');
const refine=r('public/subpage-refine.css'),bible=r('public/bible.js'),sermon=r('public/sermon.js');

test('visitor pages omit internal publishing workflow copy',()=>{
  assert.doesNotMatch(activitiesHtml,/后台自动加入/); assert.doesNotMatch(activitiesJs,/后台自动加入|Nieuwe activiteiten verschijnen hier automatisch/);
  assert.doesNotMatch(sermonsHtml,/核对后继续补充/); assert.doesNotMatch(sermonsJs,/核对后继续补充|Aanvullende tekst en Bijbelverwijzingen/);
});

test('subpage quick navigation matches homepage-sized controls',()=>{
  assert.match(refine,/\.subpage-quicknav a \{[\s\S]*min-height: 48px;[\s\S]*padding: 0 18px;[\s\S]*font-size: 14px;/);
  assert.match(refine,/@media \(max-width: 760px\)[\s\S]*min-height: 42px;[\s\S]*font-size: 13px;/);
});

test('Bible related sermons open the exact sermon and request playback',()=>{
  assert.match(bible,/href=\"\/sermon\?id=\$\{encodeURIComponent\(s\.id\)\}&play=1\"/);
  assert.doesNotMatch(bible,/class=\"related-item\" href=\"\/sermons\"/);
});

test('sermon detail honors play=1 for available audio',()=>{
  assert.match(sermon,/params\.get\('play'\) === '1'/);
  assert.match(sermon,/audio\.autoplay = true/);
  assert.match(sermon,/audio\.play\(\)\.catch/);
});
