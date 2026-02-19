const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '..', '..', 'Prompts', 'system_prompt.txt'),
  'utf-8'
);

module.exports = { SYSTEM_PROMPT };
