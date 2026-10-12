import type { GitHubAccount } from '../types/github';

export interface PersistentAuthVault {
  version: number;
  accounts: GitHubAccount[];
  activeAccountId: string | null;
  savedAt: number;
}

const ACCOUNTS_STORAGE_KEY = 'gh_accounts';
const ACTIVE_ACCOUNT_KEY = 'gh_active_account_id';
const LEGACY_TOKEN_KEY = 'github_manager_token';

const SERVICE_ID = 'github_manager_auth';
const KEYCHAIN_VAULT_KEY = 'accounts_vault';
const KEYCHAIN_TOKEN_KEY = 'access_token';
const KEYCHAIN_ACTIVE_KEY = 'active_account_id';

const VAULT_FILE_NAME = '.github_manager_auth_vault.json';
const SETTINGS_VAULT_KEY = '__gh_manager_vault';

function getDataStorage(): string | null {
  if (typeof (window as any).DATA_STORAGE === 'string') return (window as any).DATA_STORAGE;
  if (typeof DATA_STORAGE !== 'undefined' && DATA_STORAGE) return DATA_STORAGE;
  return null;
}

function getFsOperation(): any {
  if (typeof acode !== 'undefined') {
    if ((acode as any).fsOperation) return (acode as any).fsOperation;
    if (typeof acode.require === 'function') {
      try {
        return acode.require('fsOperation');
      } catch {}
    }
  }
  return null;
}

function getKeychain(): any {
  if (typeof acode !== 'undefined' && typeof acode.require === 'function') {
    try {
      return acode.require('keychain');
    } catch {}
  }
  return null;
}

function getAppSettings(): any {
  if (typeof acode !== 'undefined' && typeof acode.require === 'function') {
    try {
      return acode.require('settings');
    } catch {}
  }
  return null;
}

async function readFileFromDataStorage(filename: string): Promise<string | null> {
  const dataStorage = getDataStorage();
  const fs = getFsOperation();
  if (!dataStorage || !fs) return null;

  try {
    const fileUrl = (acode as any).joinUrl
      ? (acode as any).joinUrl(dataStorage, filename)
      : `${dataStorage}/${filename}`;
    const fileFs = fs(fileUrl);
    if (await fileFs.exists()) {
      const content = await fileFs.readFile('utf-8');
      if (typeof content === 'string' && content.trim().length > 0) {
        return content;
      }
    }
  } catch {}
  return null;
}

async function writeFileToDataStorage(filename: string, content: string): Promise<boolean> {
  const dataStorage = getDataStorage();
  const fs = getFsOperation();
  if (!dataStorage || !fs) return false;

  try {
    const fileUrl = (acode as any).joinUrl
      ? (acode as any).joinUrl(dataStorage, filename)
      : `${dataStorage}/${filename}`;
    const fileFs = fs(fileUrl);
    if (await fileFs.exists()) {
      await fileFs.writeFile(content);
      return true;
    } else {
      const dirFs = fs(dataStorage);
      await dirFs.createFile(filename, content);
      return true;
    }
  } catch {
    try {
      const fileUrl = (acode as any).joinUrl
        ? (acode as any).joinUrl(dataStorage, filename)
        : `${dataStorage}/${filename}`;
      await fs(fileUrl).writeFile(content);
      return true;
    } catch {
      return false;
    }
  }
}

async function deleteFileFromDataStorage(filename: string): Promise<void> {
  const dataStorage = getDataStorage();
  const fs = getFsOperation();
  if (!dataStorage || !fs) return;

  try {
    const fileUrl = (acode as any).joinUrl
      ? (acode as any).joinUrl(dataStorage, filename)
      : `${dataStorage}/${filename}`;
    const fileFs = fs(fileUrl);
    if (await fileFs.exists()) {
      await fileFs.delete();
    }
  } catch {}
}

async function readFromKeychain(key: string): Promise<string | null> {
  const keychain = getKeychain();
  if (!keychain) return null;
  try {
    const val = await keychain.get(SERVICE_ID, key);
    return typeof val === 'string' && val.length > 0 ? val : null;
  } catch {
    return null;
  }
}

async function writeToKeychain(key: string, value: string): Promise<void> {
  const keychain = getKeychain();
  if (!keychain) return;
  try {
    await keychain.set(SERVICE_ID, key, value);
  } catch {}
}

async function deleteFromKeychain(key: string): Promise<void> {
  const keychain = getKeychain();
  if (!keychain) return;
  try {
    await keychain.delete(SERVICE_ID, key);
  } catch {}
}

function readFromSettings(key: string): string | null {
  const settings = getAppSettings();
  if (!settings || !settings.value) return null;
  const val = settings.value[key];
  return typeof val === 'string' ? val : null;
}

function writeToSettings(key: string, value: string): void {
  const settings = getAppSettings();
  if (!settings || !settings.value) return;
  try {
    settings.value[key] = value;
    if (typeof settings.update === 'function') {
      settings.update(false);
    }
  } catch {}
}

function deleteFromSettings(key: string): void {
  const settings = getAppSettings();
  if (!settings || !settings.value) return;
  try {
    delete settings.value[key];
    if (typeof settings.update === 'function') {
      settings.update(false);
    }
  } catch {}
}

export class AuthVault {
  static getLocalAccounts(): GitHubAccount[] {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static getLocalActiveId(): string | null {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  }

  static async recover(): Promise<{
    accounts: GitHubAccount[];
    activeAccountId: string | null;
    token: string | null;
  }> {
    let accounts = this.getLocalAccounts();
    let activeId = this.getLocalActiveId();
    let token = localStorage.getItem(LEGACY_TOKEN_KEY);

    if (accounts.length > 0) {
      const active = accounts.find((a) => a.id === activeId || a.login === activeId) || accounts[0];
      return {
        accounts,
        activeAccountId: active.id,
        token: active.token || token
      };
    }

    let vaultData: PersistentAuthVault | null = null;

    const fileContent = await readFileFromDataStorage(VAULT_FILE_NAME);
    if (fileContent) {
      try {
        const parsed = JSON.parse(fileContent);
        if (parsed && Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
          vaultData = parsed;
        }
      } catch {}
    }

    if (!vaultData) {
      const kcVal = await readFromKeychain(KEYCHAIN_VAULT_KEY);
      if (kcVal) {
        try {
          const parsed = JSON.parse(kcVal);
          if (parsed && Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
            vaultData = parsed;
          }
        } catch {}
      }
    }

    if (!vaultData) {
      const setVal = readFromSettings(SETTINGS_VAULT_KEY);
      if (setVal) {
        try {
          const parsed = JSON.parse(setVal);
          if (parsed && Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
            vaultData = parsed;
          }
        } catch {}
      }
    }

    if (vaultData && vaultData.accounts.length > 0) {
      accounts = vaultData.accounts;
      activeId = vaultData.activeAccountId || accounts[0]?.id || null;
      const active = accounts.find((a) => a.id === activeId || a.login === activeId) || accounts[0];
      token = active?.token || null;

      await this.save(accounts, activeId, token);

      return { accounts, activeAccountId: activeId, token };
    }

    const kcToken = await readFromKeychain(KEYCHAIN_TOKEN_KEY);
    if (kcToken) {
      token = kcToken;
      localStorage.setItem(LEGACY_TOKEN_KEY, kcToken);
    }

    return { accounts: [], activeAccountId: null, token: token || null };
  }

  static async save(
    accounts: GitHubAccount[],
    activeAccountId: string | null,
    activeToken: string | null
  ): Promise<void> {
    const payload: PersistentAuthVault = {
      version: 1,
      accounts,
      activeAccountId,
      savedAt: Date.now()
    };
    const json = JSON.stringify(payload);

    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
      if (activeAccountId) {
        localStorage.setItem(ACTIVE_ACCOUNT_KEY, activeAccountId);
      } else {
        localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      }
      if (activeToken) {
        localStorage.setItem(LEGACY_TOKEN_KEY, activeToken);
      }
    } catch {}

    try {
      await writeToKeychain(KEYCHAIN_VAULT_KEY, json);
      if (activeToken) {
        await writeToKeychain(KEYCHAIN_TOKEN_KEY, activeToken);
      }
      if (activeAccountId) {
        await writeToKeychain(KEYCHAIN_ACTIVE_KEY, activeAccountId);
      }
    } catch {}

    try {
      await writeFileToDataStorage(VAULT_FILE_NAME, json);
    } catch {}

    try {
      writeToSettings(SETTINGS_VAULT_KEY, json);
    } catch {}
  }

  static async clearAll(): Promise<void> {
    localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);

    await deleteFromKeychain(KEYCHAIN_VAULT_KEY);
    await deleteFromKeychain(KEYCHAIN_TOKEN_KEY);
    await deleteFromKeychain(KEYCHAIN_ACTIVE_KEY);

    await deleteFileFromDataStorage(VAULT_FILE_NAME);

    deleteFromSettings(SETTINGS_VAULT_KEY);
  }
}
