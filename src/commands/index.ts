import { handleQuickCommit } from '../repos/quickCommit';
import type { RepoManager } from '../repos/manager';

const COMMAND_NAME = 'Github Manager: Quick Commit';

export function registerCommands(getRepoManager: () => RepoManager | null): void {
  try {
    const editorManager = window.editorManager || acode.require('editorManager');
    if (editorManager?.editor?.commands) {
      editorManager.editor.commands.addCommand({
        name: COMMAND_NAME,
        bindKey: { win: 'Ctrl-Shift-G', mac: 'Command-Shift-G' },
        exec: () => handleQuickCommit(getRepoManager())
      });
    }
  } catch (e) {
    console.warn('Failed to register editor command:', e);
  }
}

export function unregisterCommands(): void {
  try {
    const editorManager = window.editorManager || acode.require('editorManager');
    if (editorManager?.editor?.commands) {
      editorManager.editor.commands.removeCommand(COMMAND_NAME);
    }
  } catch (e) {
    console.warn('Failed to unregister editor command:', e);
  }
}
