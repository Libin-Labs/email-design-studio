export interface TextBlock {
  type: 'text';
  text: string;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
}

export interface ButtonBlock {
  type: 'button';
  label: string;
  href: string;
  backgroundColor: string;
  textColor: string;
}

export interface ImageBlock {
  type: 'image';
  src: string;
  alt: string;
  width: number;
  href?: string;
}

export interface DividerBlock {
  type: 'divider';
  color: string;
  thickness?: number;
}

export type EmailBlock = TextBlock | ButtonBlock | ImageBlock | DividerBlock;

const MAX_BLOCKS = 500;
const MAX_TEXT = 20_000;
const HEX_COLOR = /^#[\da-fA-F]{6}$/;

function assertPlain(value: unknown): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError('Email blocks must be plain records.');
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !descriptor?.enumerable || !('value' in descriptor)) {
      throw new TypeError('Blocks require enumerable string-keyed data fields.');
    }
  }
}

function exactKeys(block: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(block).some((key) => !allowed.includes(key))) {
    throw new TypeError('Block has unsupported fields.');
  }
}

function text(value: unknown, name: string, allowEmpty = true): string {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string.`);
  }
  if ((!allowEmpty && value.length === 0) || value.length > MAX_TEXT) {
    throw new RangeError(
      `${name} must be a${allowEmpty ? '' : ' nonempty'} string up to ${MAX_TEXT} UTF-16 units.`,
    );
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new TypeError(`${name} contains unsupported control characters.`);
  }
  return value;
}

function color(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
    throw new TypeError(`${name} must be a six-digit hex color.`);
  }
  return value.toLowerCase();
}

function safeUrl(value: unknown, name: string, httpsOnly = false): string {
  if (typeof value !== 'string' || value.length > 2_048 || /[\u0000-\u0020<>"]/u.test(value)) {
    throw new TypeError(`${name} must be a valid absolute URL.`);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`${name} must be a valid absolute URL.`);
  }
  const allowed = httpsOnly ? ['https:'] : ['https:', 'http:', 'mailto:'];
  if (
    !allowed.includes(url.protocol) ||
    (url.protocol !== 'mailto:' && (url.username || url.password))
  ) {
    throw new TypeError(`${name} uses an unsupported URL scheme or credentials.`);
  }
  return url.href;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}

export function validateEmailBlocks(blocks: readonly EmailBlock[]): EmailBlock[] {
  if (!Array.isArray(blocks) || blocks.length > MAX_BLOCKS) {
    throw new RangeError(`Blocks must be an array of at most ${MAX_BLOCKS} items.`);
  }
  return Array.from(blocks, (candidate) => {
    assertPlain(candidate);
    switch (candidate.type) {
      case 'text': {
        exactKeys(candidate, ['type', 'text', 'color', 'backgroundColor', 'align', 'fontSize']);
        const align = candidate.align ?? 'left';
        const fontSize = candidate.fontSize ?? 16;
        if (!['left', 'center', 'right'].includes(String(align)))
          throw new TypeError('Unsupported text alignment.');
        if (!Number.isInteger(fontSize) || Number(fontSize) < 10 || Number(fontSize) > 72) {
          throw new RangeError('fontSize must be an integer from 10 to 72.');
        }
        return {
          type: 'text',
          text: text(candidate.text, 'Text block'),
          color: color(candidate.color ?? '#222222', 'Text color'),
          backgroundColor: color(candidate.backgroundColor ?? '#ffffff', 'Text background color'),
          align: align as NonNullable<TextBlock['align']>,
          fontSize: Number(fontSize),
        };
      }
      case 'button':
        exactKeys(candidate, ['type', 'label', 'href', 'backgroundColor', 'textColor']);
        return {
          type: 'button',
          label: text(candidate.label, 'Button label', false),
          href: safeUrl(candidate.href, 'Button href'),
          backgroundColor: color(candidate.backgroundColor, 'Button background color'),
          textColor: color(candidate.textColor, 'Button text color'),
        };
      case 'image': {
        exactKeys(candidate, ['type', 'src', 'alt', 'width', 'href']);
        if (
          !Number.isInteger(candidate.width) ||
          Number(candidate.width) < 1 ||
          Number(candidate.width) > 1_200
        ) {
          throw new RangeError('Image width must be an integer from 1 to 1200.');
        }
        return {
          type: 'image',
          src: safeUrl(candidate.src, 'Image src', true),
          alt: text(candidate.alt, 'Image alt'),
          width: Number(candidate.width),
          ...(candidate.href === undefined ? {} : { href: safeUrl(candidate.href, 'Image href') }),
        };
      }
      case 'divider': {
        exactKeys(candidate, ['type', 'color', 'thickness']);
        const thickness = candidate.thickness ?? 1;
        if (!Number.isInteger(thickness) || Number(thickness) < 1 || Number(thickness) > 12) {
          throw new RangeError('Divider thickness must be an integer from 1 to 12.');
        }
        return {
          type: 'divider',
          color: color(candidate.color, 'Divider color'),
          thickness: Number(thickness),
        };
      }
      default:
        throw new TypeError(`Unsupported email block type: ${String(candidate.type)}.`);
    }
  });
}

function cell(content: string, style: string): string {
  return `<tr><td style="${style}">${content}</td></tr>`;
}

export function renderEmailHtml(blocks: readonly EmailBlock[]): string {
  const normalized = validateEmailBlocks(blocks);
  const body = normalized
    .map((block) => {
      switch (block.type) {
        case 'text':
          return cell(
            escapeHtml(block.text).replace(/\r\n|\r|\n/g, '<br>'),
            `padding:16px;color:${block.color};background-color:${block.backgroundColor};font-family:Arial,sans-serif;font-size:${block.fontSize}px;text-align:${block.align};`,
          );
        case 'button':
          return cell(
            `<a href="${escapeHtml(block.href)}" style="display:inline-block;padding:12px 20px;background-color:${block.backgroundColor};color:${block.textColor};font-family:Arial,sans-serif;text-decoration:none;">${escapeHtml(block.label)}</a>`,
            'padding:16px;text-align:center;',
          );
        case 'image': {
          const image = `<img src="${escapeHtml(block.src)}" width="${block.width}" alt="${escapeHtml(block.alt)}" style="display:block;width:100%;max-width:${block.width}px;height:auto;border:0;">`;
          return cell(
            block.href === undefined ? image : `<a href="${escapeHtml(block.href)}">${image}</a>`,
            'padding:0;text-align:center;',
          );
        }
        case 'divider':
          return cell(
            `<div style="height:${block.thickness}px;line-height:${block.thickness}px;background-color:${block.color};font-size:0;">&nbsp;</div>`,
            'padding:12px 16px;',
          );
      }
    })
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">${body}</table></td></tr></table></body></html>`;
}
