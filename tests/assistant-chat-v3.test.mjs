import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAssistantText } from '../src/assistant-chat-v3.js';

test('assistant display cleanup removes markdown bullets and markdown links', () => {
  const input = '* **相关经文**\n* 约翰福音 6:9：[https://evkerk.nl/bible?book=42&chapter=6&verse=9](https://evkerk.nl/bible?book=42\\&chapter=6\\&verse=9)';
  const output = normalizeAssistantText(input);
  assert.equal(output, '• 相关经文\n• 约翰福音 6:9：https://evkerk.nl/bible?book=42&chapter=6&verse=9');
  assert.doesNotMatch(output, /\*|\[[^\]]+\]\(/);
});

test('plain URLs remain plain URLs', () => {
  const input = '查看经文：https://evkerk.nl/bible?book=3&chapter=14&verse=33';
  assert.equal(normalizeAssistantText(input), input);
});
