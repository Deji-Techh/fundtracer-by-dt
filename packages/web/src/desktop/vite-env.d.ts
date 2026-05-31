/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_PRIVY_APP_ID: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  interface UserOptions {
    head?: any[][];
    body?: any[][];
    startY?: number;
    styles?: Record<string, any>;
    headStyles?: Record<string, any>;
    alternateRowStyles?: Record<string, any>;
    [key: string]: any;
  }
  function autoTable(doc: jsPDF, options: UserOptions): void;
  export default autoTable;
}
