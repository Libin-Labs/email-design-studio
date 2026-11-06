# @lp-labs/email-design-studio

Define a small, validated email block set and serialize it to escaped, inline-styled table HTML.
The output uses familiar layout-table markup but is not a promise of compatibility with every email
client, inbox, sanitizer, or rendering engine.

## Install and quickstart

```sh
npm install @lp-labs/email-design-studio
```

```js
import { renderEmailHtml } from '@lp-labs/email-design-studio';

const html = renderEmailHtml([
  { type: 'text', text: 'A new collection is here.', color: '#222222' },
  {
    type: 'button',
    label: 'Shop now',
    href: 'https://shop.example.com/new',
    backgroundColor: '#2345aa',
    textColor: '#ffffff',
  },
]);
console.log(html);
```

## API and types

- `EmailBlock`: `TextBlock`, `ButtonBlock`, `ImageBlock`, or `DividerBlock`.
- `validateEmailBlocks(blocks)` validates, normalizes, and copies a maximum of 500 blocks. Unknown
  fields and accessor properties are rejected.
- `renderEmailHtml(blocks)` validates its input, escapes text/attribute values, and returns complete
  HTML containing a 600px maximum-width presentation table, nested block tables, and inline styles.
- `TextBlock`: literal `text`; optional six-digit `color`, `backgroundColor`, `align` (`left`,
  `center`, `right`), `fontSize` integer 10..72. Defaults: `#222222`, `#ffffff`, `left`, 16px.
  Newlines become `<br>`.
- `ButtonBlock`: nonempty literal `label`, `href`, six-digit `backgroundColor` and `textColor`.
- `ImageBlock`: HTTPS `src`, literal `alt`, integer `width` 1..1,200px; optional safe `href`.
- `DividerBlock`: six-digit `color`, optional integer `thickness` 1..12px (default 1).

## Customization, errors, and limits

Create reusable blocks in your application, pass those blocks to render, and deliver the resulting
HTML through your own email service. HTTP, HTTPS, and mailto links are allowed; images must use
HTTPS. URLs with credentials, whitespace, quote/angle characters, or unsupported schemes are
rejected. Colors must be `#RRGGBB`. Text is escaped, not interpreted as HTML; unsupported C0
controls are rejected. This package does not fetch assets, sanitize arbitrary markup, inline CSS,
generate responsive media queries, render previews, or validate remote link availability.

Invalid schemas, unsafe records, colors, or URLs throw `TypeError`; string, block, image width,
font size, and divider bounds throw `RangeError`. Text is bounded to 20,000 UTF-16 units and output
is linear in total input text plus markup. Test exported HTML in your own supported email clients.

## Modules and development

Independent ESM and CommonJS builds with declarations; no runtime or peer dependencies.
CommonJS: `const { renderEmailHtml } = require('@lp-labs/email-design-studio')`.
TypeScript `^5.9.3` and Prettier `^3.6.2` are development-only. Run `npm run build`,
`npm run typecheck`, `npm test`, `npm run format`, and `npm run format:check`.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
