declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.scss" {
  const content: string;
  export default content;
}

declare module "*.json" {
  const content: any;
  export default content;
}

declare namespace Acode {
  interface Prompt {
    (
      message: string,
      defaultValue?: string,
      type?: PromptType | string,
      options?: PromptOptions<string>
    ): Promise<string | null>;
  }

  interface FileSystem {
    createFile(name: string, content?: string | ArrayBuffer): Promise<string>;
  }
}

interface Window {
  toast: (message: string, duration?: number) => void;
  acode: Acode.Acode;
  editorManager?: any;
  system?: any;
  cordova?: any;
}

declare const toast: (message: string, duration?: number) => void;
