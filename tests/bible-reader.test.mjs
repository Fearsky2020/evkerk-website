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
  assert.match(js,/navigator\.clipboard\.writeText\(text\).*selected\.clear\(\);renderVerses\(\)/);
});

test('Bible body uses the App-style readable sans stack',()=>{
  assert.match(css,/PingFang SC/);
  assert.match(css,/Noto Sans CJK SC/);
  assert.doesNotMatch(css,/\.verse-flow\{font-family:"Songti SC"/);
});


test('selection action bar is fully hidden after copy or cancel',()=>{
  assert.match(css,/\.selection-bar\[hidden\]\{display:none!important\}/);
  assert.match(js,/\$\('clearSelection'\)\.onclick=\(\)=>\{selected\.clear\(\);renderVerses\(\)\}/);
});


test('selected Bible verse uses bold underline only, without color or frame',()=>{
  assert.ok(css.includes('.verse-unit.selected{background:transparent;color:inherit;box-shadow:none;font-weight:800;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}')); 
  assert.ok(css.includes('.verse-unit.selected sup{color:inherit;font-weight:800}'));
});


test('Bible copy lets readers choose verse-numbered or continuous text',()=>{
  assert.match(html,/id="copyDialog"/);
  assert.match(html,/id="copyWithVerseNumbers"/);
  assert.match(html,/id="copyPlainText"/);
  assert.match(js,/function copyText\(withVerseNumbers\)/);
  assert.match(js,/join\('\\n'\)/);
  assert.match(js,/\.trim\(\)\)\.join\(''\)/);
});


test('Bible toolbar uses a clear search icon and compact passage selector',()=>{
  assert.match(html,/class="font-button search-button"/);
  assert.match(html,/<circle cx="10\.5" cy="10\.5" r="6\.5"><\/circle>/);
  assert.match(html,/<path d="M15\.5 15\.5 21 21"><\/path>/);
  assert.match(css,/\.passage-button\{flex:0 1 230px/);
  assert.match(css,/@media\(max-width:720px\).*\.bible-toolbar\{top:66px;flex-wrap:nowrap/);
});
