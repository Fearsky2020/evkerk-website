import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('first cluster real postcodes are durable migration data', async () => {
  const sql = await readFile(new URL('../migrations/0020_first_cluster_postcodes.sql', import.meta.url), 'utf8');
  const expected = new Map([
    [4, '2512BA'],
    [11, '2511EC'],
    [13, '2522RM'],
    [19, '2522AT'],
    [20, '2264VL'],
    [23, '2521XV'],
    [26, '2511EC'],
  ]);
  for (const [number, postcode] of expected) {
    assert.match(sql, new RegExp("postcode='" + postcode + "'.*group_number=" + number + "\\b"));
  }
  assert.equal((sql.match(/is_demo=0/g) || []).length, expected.size);
});

test('recommendation API hydrates missing real-group coordinates through PDOK', async () => {
  const source = await readFile(new URL('../src/welcome.js', import.meta.url), 'utf8');
  assert.match(source, /async function hydrateGroupCoordinates/);
  assert.match(source, /validPostcode\(group\.postcode\)/);
  assert.match(source, /WELCOME_GROUP_GEOCODE_FAILED/);
  assert.match(source, /UPDATE church_groups SET postcode=\?,latitude=\?,longitude=\?/);
  assert.match(source, /const groups=await hydrateGroupCoordinates\(env,rows\.results\|\|\[\]\)/);
});
