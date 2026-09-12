import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('third and fourth cluster confirmed postcodes are durable migration data', async () => {
  const sql = await readFile(new URL('../migrations/0022_third_fourth_cluster_postcodes.sql', import.meta.url), 'utf8');
  const expected = new Map([
    [2, '2285JD'],
    [3, '2522NC'],
    [6, '2274CE'],
    [10, '2596CS'],
    [21, '2545GL'],
    [22, '2493VC'],
    [24, '2285GB'],
    [25, '2282AE'],
    [28, '2712AH'],
    [29, '2523CG'],
    [30, '2724NA'],
  ]);
  for (const [number, postcode] of expected) {
    assert.match(sql, new RegExp("postcode='" + postcode + "'.*group_number=" + number + "\\b"));
  }
  assert.equal((sql.match(/is_demo=0/g) || []).length, expected.size);
});
