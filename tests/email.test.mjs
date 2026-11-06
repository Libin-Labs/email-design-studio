import test from 'node:test';
import assert from 'node:assert/strict';
import { renderEmailHtml, validateEmailBlocks } from '../dist/esm/index.js';

test('exports real table markup with inline styles and escaped text, URLs, and attributes', () => {
  const html = renderEmailHtml([
    { type: 'text', text: '<Hello & "friends">' },
    {
      type: 'button',
      label: "Read 'now'",
      href: 'https://example.com/a?x=1&y=2',
      backgroundColor: '#123ABC',
      textColor: '#ffffff',
    },
    { type: 'image', src: 'https://cdn.example.com/a.png', alt: '"logo"&', width: 120 },
    { type: 'divider', color: '#dddddd' },
  ]);
  assert.match(html, /<table role="presentation"/);
  assert.match(html, /style="[^"]+"/);
  assert.doesNotMatch(html, /<table[^>]*><table/);
  assert.equal((html.match(/<tr>/g) ?? []).length, (html.match(/<\/tr>/g) ?? []).length);
  assert.match(html, /&lt;Hello &amp; &quot;friends&quot;&gt;/);
  assert.match(html, /href="https:\/\/example\.com\/a\?x=1&amp;y=2"/);
  assert.match(html, /alt="&quot;logo&quot;&amp;"/);
  assert.doesNotMatch(html, /<style/i);
});

test('snapshots normalized blocks and supports text alignment, color, and font options', () => {
  const original = [
    { type: 'text', text: 'Sale', align: 'center', color: '#ABCDEF', fontSize: 24 },
  ];
  const blocks = validateEmailBlocks(original);
  original[0].text = 'mutated';
  assert.equal(blocks[0].text, 'Sale');
  assert.equal(blocks[0].color, '#abcdef');
  assert.match(renderEmailHtml(blocks), /text-align:center/);
});

test('rejects unsafe link protocols, URL credentials, and non-HTTPS images', () => {
  for (const href of ['javascript:alert(1)', '//example.com', 'https://user:pass@example.com']) {
    assert.throws(
      () =>
        renderEmailHtml([
          { type: 'button', label: 'go', href, backgroundColor: '#000000', textColor: '#ffffff' },
        ]),
      TypeError,
    );
  }
  assert.throws(
    () =>
      validateEmailBlocks([{ type: 'image', src: 'http://example.com/a.png', alt: 'x', width: 3 }]),
    TypeError,
  );
});

test('rejects invalid colors, bounds, controls, unknown fields, and malformed records', () => {
  assert.throws(
    () =>
      validateEmailBlocks([
        {
          type: 'button',
          label: 'x',
          href: 'mailto:a@b.test',
          backgroundColor: 'red',
          textColor: '#ffffff',
        },
      ]),
    TypeError,
  );
  assert.throws(
    () => validateEmailBlocks([{ type: 'divider', color: '#000000', thickness: 13 }]),
    RangeError,
  );
  assert.throws(() => validateEmailBlocks([{ type: 'text', text: '\u0001' }]), TypeError);
  assert.throws(
    () => validateEmailBlocks([{ type: 'text', text: 'x', onclick: 'alert(1)' }]),
    TypeError,
  );
  const getter = Object.defineProperty({}, 'type', {
    enumerable: true,
    get() {
      throw new Error('must not run');
    },
  });
  assert.throws(() => validateEmailBlocks([getter]), TypeError);
});

test('enforces image dimensions, block capacity, and allowed empty text', () => {
  assert.equal(validateEmailBlocks([{ type: 'text', text: '' }])[0].text, '');
  assert.throws(() => validateEmailBlocks(new Array(1)), TypeError);
  assert.throws(
    () => validateEmailBlocks([{ type: 'image', src: 'https://x.test/a.png', alt: '', width: 0 }]),
    RangeError,
  );
  assert.throws(
    () =>
      validateEmailBlocks(
        Array.from({ length: 501 }, () => ({ type: 'divider', color: '#000000' })),
      ),
    RangeError,
  );
});
