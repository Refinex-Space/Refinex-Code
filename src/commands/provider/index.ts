import type { Command } from '../../commands.js'

export default {
  type: 'local-jsx',
  name: 'provider',
  description: 'Manage model providers and switch between Anthropic and Codex',
  load: () => import('./provider.js'),
} satisfies Command
