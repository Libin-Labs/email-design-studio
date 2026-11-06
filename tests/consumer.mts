import { renderEmailHtml, type EmailBlock } from '@lp-labs/email-design-studio';

const blocks: EmailBlock[] = [{ type: 'text', text: 'Hello' }];
renderEmailHtml(blocks).startsWith('<!doctype html>') satisfies boolean;
