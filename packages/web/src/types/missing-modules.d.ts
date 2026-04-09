// Type declarations for missing npm packages

declare module '@mui/material' {
  export const Box: any;
  export const Button: any;
  export const Card: any;
  export const CardContent: any;
  export const Typography: any;
  export const Container: any;
  export const Grid: any;
  export const Paper: any;
  export const TextField: any;
  export const Select: any;
  export const MenuItem: any;
  export const Chip: any;
  export const IconButton: any;
  export const Tooltip: any;
  export const Dialog: any;
  export const DialogTitle: any;
  export const DialogContent: any;
  export const DialogActions: any;
  export const FormControl: any;
  export const InputLabel: any;
  export const Tab: any;
  export const Tabs: any;
  export const LinearProgress: any;
  export const CircularProgress: any;
  export const Switch: any;
  export const Slider: any;
  export const Autocomplete: any;
  export const SxProps: any;
  export type SxProps<T> = any;
  export const Theme: any;
  export type Theme = any;
  export const Table: any;
  export const TableBody: any;
  export const TableCell: any;
  export const TableContainer: any;
  export const TableHead: any;
  export const TableRow: any;
  export const TablePagination: any;
  export const TableSortLabel: any;
}

declare module '@mui/material/styles' {
  export const createTheme: any;
  export const ThemeProvider: any;
  export const useTheme: any;
}

declare module 'jspdf' {
  export default class jsPDF {
    constructor(options?: any);
    constructor(orientation?: 'p' | 'l', unit?: 'mm' | 'cm' | 'in' | 'pt', format?: 'a4' | 'letter' | 'legal' | string);
    text(text: string, x: number, y: number, options?: any): jsPDF;
    save(filename: string): void;
    addPage(): jsPDF;
    setFontSize(size: number): jsPDF;
    setTextColor(r: number, g?: number, b?: number): jsPDF;
    setFillColor(r: number, g?: number, b?: number): jsPDF;
    rect(x: number, y: number, w: number, h: number, style?: string): jsPDF;
    addImage(imgData: string, format: string, x: number, y: number, w: number, h: number): jsPDF;
    splitTextToSize(text: string, maxWidth: number): string[];
    getStringUnitWidth(text: string): number;
    autoTable(options: any): jsPDF;
    internal: {
      pageSize: {
        width: number;
        height: number;
        getWidth(): number;
        getHeight(): number;
        get(prop: string): { width: number; height: number };
      };
    };
  }
  export const jsPDF: {
    new(options?: any): jsPDF;
    new(orientation?: 'p' | 'l', unit?: 'mm' | 'cm' | 'in' | 'pt', format?: 'a4' | 'letter' | 'legal' | string): jsPDF;
  };
}

declare module '@privy-io/react-auth' {
  export const PrivyProvider: React.FC<{ children?: React.ReactNode; appId: string; config?: any }>;
  export const usePrivy: any;
  export const useUser: any;
  export const useLogin: any;
  export const useLogout: any;
  export const createSiliconAuthAdapter: any;
  export const WalletProvider: any;
  export const EmbeddedWalletProvider: any;
}

declare module '@solana/wallet-adapter-react' {
  export const WalletProvider: React.FC<any>;
  export const ConnectionProvider: React.FC<{ children?: React.ReactNode; endpoint: string }>;
  export const useWallet: any;
}

declare module '@solana/wallet-adapter-react-ui' {
  export const WalletModalProvider: React.FC<{ children?: React.ReactNode }>;
  export const WalletMultiButton: any;
}

declare module 'dexie' {
  class Dexie {
    constructor(dbName: string);
    version(n: number): Version;
    tables: Table<any>[];
  }
  interface Version {
    stores(schema: string): Version;
  }
  interface Table<T = any> {
    name: string;
    add(doc: T): Promise<number>;
    put(doc: T): Promise<number>;
    get(key: any): Promise<T | undefined>;
    delete(key: any): Promise<void>;
    update(key: any, changes: Partial<T>): Promise<number>;
    clear(): Promise<void>;
    toArray(): Promise<T[]>;
    where(index: string): WhereClause<T>;
    orderBy(index: string): Query<T>;
    count(): Promise<number>;
    bulkAdd(docs: T[]): Promise<void>;
    bulkPut(docs: T[]): Promise<number>;
    bulkDelete(keys: any[]): Promise<void>;
  }
  interface WhereClause<T> {
    equals(value: any): Query<T>;
    above(value: any): Query<T>;
    below(value: any): Query<T>;
    between(lower: any, upper: any): Query<T>;
  }
  interface Query<T> {
    toArray(): Promise<T[]>;
    first(): Promise<T | undefined>;
    count(): Promise<number>;
  }
}

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    isRabby?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
    isConnected: () => boolean;
    chainId?: string;
    networkVersion?: string;
    selectedAddress?: string;
  };
}