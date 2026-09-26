import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyContactSpam } from '../src/contact-form.js';

test('blocks known directory inspector spam', () => {
  const result = classifyContactSpam({
    name: 'Wentcher',
    contact: '887946558',
    message: 'This you? directoryinspector.com/evkerk.nl',
  });
  assert.equal(result.blocked, true);
  assert.ok(result.reasons.includes('blocked_domain'));
});

test('blocks aggressive multi-link promotion', () => {
  const result = classifyContactSpam({
    name: 'Alec',
    contact: 'N/A',
    message: 'Reach more customers with automated daily classified promotion https://a.example https://b.example https://c.example',
  });
  assert.equal(result.blocked, true);
});

test('allows ordinary church question', () => {
  const result = classifyContactSpam({
    name: 'Jan',
    contact: 'jan@example.nl',
    message: 'Ik wil zondag voor het eerst komen. Is er zondagsschool voor kinderen?',
  });
  assert.equal(result.blocked, false);
});

test('allows one ordinary link without marketing language', () => {
  const result = classifyContactSpam({
    name: 'Li',
    contact: '+31612345678',
    message: 'Is dit de juiste locatie? https://maps.google.com/example',
  });
  assert.equal(result.blocked, false);
});
