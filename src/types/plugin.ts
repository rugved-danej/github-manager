export interface PluginSettings {
  showPrivate?: boolean;
  defaultCloneDir?: string;
}

export type DiffChoice = 'remote' | 'local' | 'merge' | null;

export interface LocalFileEntry {
  path: string;
  content: string;
}
