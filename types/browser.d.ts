declare global {
  const ym: (...args: any[]) => void;
  interface Window {
    Sortable?: any;
    FilePond?: any;
    FilePondPluginImagePreview?: any;
  }
}

export {};
