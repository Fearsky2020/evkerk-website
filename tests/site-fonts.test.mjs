import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const stack = 'system-ui,-apple-system,"PingFang SC","Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei UI","Microsoft YaHei",sans-serif';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('public site uses one clean sans font stack', () => {
  const css = read('public/styles.css');
  assert.match(css, new RegExp(stack.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(css, /button,input,textarea,select,a\{font:inherit\}/);
});

test('Bible text uses the same clean sans font stack', () => {
  assert.ok(read('public/bible.css').includes(`font-family:${stack}`));
});

test('team and admin interfaces use the same clean sans font stack', () => {
  for (const file of ['public/team/styles.css', 'public/admin/index.html', 'public/admin/media.html']) {
    const content = read(file);
    assert.ok(content.includes(`font-family:${stack}`), file);
  }
});
