import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleGroup, rankGroupRecommendations } from '../src/group-recommendation.js';

function group(n, lat, lon, extra={}) {
  return {
    id:`group-${n}`,
    group_number:n,
    name:`Group ${n}`,
    is_demo:0,
    status:'active',
    accepting_newcomers:1,
    reception_status:'open',
    latitude:lat,
    longitude:lon,
    ...extra,
  };
}

test('closed paused inactive and full groups are excluded', () => {
  assert.equal(eligibleGroup(group(1,52.1,4.3)), true);
  assert.equal(eligibleGroup(group(2,52.1,4.3,{status:'inactive'})), false);
  assert.equal(eligibleGroup(group(3,52.1,4.3,{reception_status:'closed'})), false);
  assert.equal(eligibleGroup(group(4,52.1,4.3,{reception_status:'paused'})), false);
  assert.equal(eligibleGroup(group(5,52.1,4.3,{accepting_newcomers:0})), false);
  assert.equal(eligibleGroup(group(6,52.1,4.3,{current_size:12,capacity_max:12})), false);
});

test('recommendations return at most three eligible groups', () => {
  const person={latitude:52.07,longitude:4.30,preferred_days:'',family_status:'',children_note:'',occupation_stage:'',language_note:''};
  const groups=[
    group(1,52.071,4.301),group(2,52.072,4.302),group(3,52.073,4.303),group(4,52.074,4.304),
    group(5,52.0705,4.3005,{reception_status:'closed'}),
  ];
  const ranked=rankGroupRecommendations(person,groups,3);
  assert.equal(ranked.length,3);
  assert.ok(ranked.every(item=>item.group.reception_status==='open'));
  assert.ok(ranked[0].distance_km<=ranked[2].distance_km);
});

test('near-full group receives a ranking penalty', () => {
  const person={latitude:52.07,longitude:4.30,preferred_days:'',family_status:'',children_note:'',occupation_stage:'',language_note:''};
  const open=group(1,52.071,4.301);
  const nearFull=group(2,52.071,4.301,{reception_status:'near_full'});
  const ranked=rankGroupRecommendations(person,[nearFull,open],3);
  assert.equal(ranked[0].group.id,open.id);
});
