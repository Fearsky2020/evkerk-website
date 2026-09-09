import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../public/bible.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/bible.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../public/bible.js',import.meta.url),'utf8');
const index=JSON.parse(fs.readFileSync(new URL('../public/data/bible-cuvs-search.json',import.meta.url),'utf8'));

test('web Bible exposes keyword search controls',()=>{
  assert.match(html,/id="searchButton"/);
  assert.match(html,/id="searchDialog"/);
  assert.match(js,/bible-cuvs-search\.json/);
});

test('Bible search index contains the full CUVS corpus',()=>{
  assert.ok(index.rows.length>30000);
  assert.ok(index.rows.some(row=>String(row[3]).includes('不要惧怕')));
});
test('Bible reading copy clears selected highlights after success',()=>{
  assert.match(js,/navigator\.clipboard\.writeText\(text\);selected\.clear\(\);renderVerses\(\);toast\('经文已复制'\)/);
});

test('Bible body uses the App-style readable sans stack',()=>{
  assert.match(css,/PingFang SC/);
  assert.match(css,/Noto Sans CJK SC/);
  assert.doesNotMatch(css,/\.verse-flow\{font-family:"Songti SC"/);
});
