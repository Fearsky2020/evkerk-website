import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../src/organization.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../migrations/0036_group_weekly_scripture.sql',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../public/team/groups/app.js',import.meta.url),'utf8');

test('weekly group scripture migration adds the three group-level fields',()=>{
  for(const field of ['weekly_scripture_reference','weekly_scripture_text','discussion_theme']){
    assert.match(migration,new RegExp('ADD COLUMN '+field+'\\b'));
  }
});

test('group settings allow the three weekly scripture fields to be updated',()=>{
  for(const field of ['weekly_scripture_reference','weekly_scripture_text','discussion_theme']){
    assert.match(api,new RegExp('GROUP_FIELDS=.*'+field));
  }
});

test('weekly scripture text uses an extended safe length budget',()=>{
  assert.match(api,/weekly_scripture_text'\?10000/);
});

test('my-group payload selects weekly scripture and discussion theme',()=>{
  assert.match(api,/weekly_scripture_reference,g\.weekly_scripture_text,g\.discussion_theme/);
});

test('team group editor exposes welcome weekly scripture and discussion fields',()=>{
  for(const field of ['welcome_message','weekly_scripture_reference','weekly_scripture_text','discussion_theme']){
    assert.ok(ui.includes(field),field);
  }
});
