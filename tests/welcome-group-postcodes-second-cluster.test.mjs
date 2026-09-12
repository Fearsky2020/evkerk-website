import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('second cluster real postcodes are durable migration data', async () => {
  const sql = await readFile(new URL('../migrations/0021_second_cluster_postcodes.sql', import.meta.url), 'utf8');
  const expected = new Map([
    [5, '2295KE'],
    [7, '2281GG'],
    [8, '2553CZ'],
    [12, '2522JZ'],
    [14, '2295KE'],
    [15, '2281GG'],
    [17, '2521EH'],
    [18, '2553CZ'],
    [27, '2295KE'],
  ]);
  for (const [number, postcode] of expected) {
    assert.match(sql, new RegExp("postcode='" + postcode + "'.*group_number=" + number + "\\b"));
  }
  assert.equal((sql.match(/is_demo=0/g) || []).length, expected.size);
});
