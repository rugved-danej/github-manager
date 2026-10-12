import { handleQuickCommit } from '../repos/quickCommit';
import { handleCreateGistFromActiveFile, handleCreateGistFromSelection } from '../gists/create';
import { logger } from '../utils/logger';
import type { RepoManager } from '../repos/manager';
import type { GistManager } from '../gists/manager';

const COMMAND_NAMES = {
  quickCommit: 'Github Manager: Quick Commit',
  gistActiveFile: 'Github Manager: Create Gist from Active File',
  gistSelection: 'Github Manager: Create Secret Gist from Selection'
};

export function registerCommands(
  getRepoManager: () => RepoManager | null,
  getGistManager: () => GistManager | null
): void {
  try {
    const editorManager = window.editorManager || acode.require('editorManager');
    if (editorManager?.editor?.commands) {
      const commands = editorManager.editor.commands;

      commands.addCommand({
        name: COMMAND_NAMES.quickCommit,
        bindKey: { win: 'Ctrl-Shift-G', mac: 'Command-Shift-G' },
        exec: () => handleQuickCommit(getRepoManager())
      });

      commands.addCommand({
        name: COMMAND_NAMES.gistActiveFile,
        exec: () => {
          const gm = getGistManager();
          if (gm) handleCreateGistFromActiveFile(gm, false);
        }
      });

      commands.addCommand({
        name: COMMAND_NAMES.gistSelection,
        exec: () => {
          const gm = getGistManager();
          if (gm) handleCreateGistFromSelection(gm, false);
        }
      });
    }
  } catch (e) {
    logger.error('Failed to register editor commands:', e);
  }
}

export function unregisterCommands(): void {
  try {
    const editorManager = window.editorManager || acode.require('editorManager');
    if (editorManager?.editor?.commands) {
      const commands = editorManager.editor.commands;
      Object.values(COMMAND_NAMES).forEach((name) => {
        try {
          commands.removeCommand(name);
        } catch (_) {}
      });
    }
  } catch (e) {
    logger.error('Failed to unregister editor commands:', e);
  }
}
