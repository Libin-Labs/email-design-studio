import email = require('@lp-labs/email-design-studio');

const html: string = email.renderEmailHtml([{ type: 'divider', color: '#cccccc' }]);
email.validateEmailBlocks([{ type: 'text', text: html }]) satisfies email.EmailBlock[];
