import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/home.css',import.meta.url),'utf8');
test('latest sermon card is inside hero above weekly gathering CTA',()=>{
  const hero=html.indexOf('<section class="home-cover"');
  const sermon=html.indexOf('<div class="sermon-placeholder">',hero);
  const actions=html.indexOf('<div class="home-cover-actions">',hero);
  const heroEnd=html.indexOf('</section>',hero);
  assert.ok(hero>=0&&sermon>hero&&actions>sermon&&heroEnd>actions);
  assert.equal((html.match(/class="sermon-placeholder"/g)||[]).length,1);
  assert.doesNotMatch(html,/class="sermons section shell"/);
  assert.ok(html.includes('/home.css?v=17'));
  assert.ok(css.includes('Latest sermon inside homepage hero'));
});
