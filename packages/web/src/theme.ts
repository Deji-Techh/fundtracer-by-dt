import { createTheme } from '@mui/material/styles';

// Professional color palette - no neon/AI look
export const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#fafafa', // Off-white background
      paper: '#ffffff', // Pure white for cards
    },
    primary: {
      main: '#2563eb', // Muted blue
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b', // Slate gray
      light: '#94a3b8',
      dark: '#475569',
      contrastText: '#ffffff',
    },
    success: {
      main: '#16a34a', // Forest green
      light: '#22c55e',
      dark: '#15803d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#d97706', // Amber/orange
      light: '#f59e0b',
      dark: '#b45309',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc2626', // Dark red
      light: '#ef4444',
      dark: '#b91c1c',
      contrastText: '#ffffff',
    },
    info: {
      main: '#0ea5e9', // Sky blue
      light: '#38bdf8',
      dark: '#0284c7',
      contrastText: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
      disabled: '#999999',
    },
    divider: '#e5e5e5',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '0.875rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e5e5e5',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          maxWidth: 'none',
          padding: 0,
        },
      },
    },
  },
});

// Risk level colors (subtle, not neon)
export const riskColors = {
  safe: '#16a34a', // Green
  low: '#22c55e', // Light green
  medium: '#d97706', // Amber
  high: '#dc2626', // Red
  critical: '#991b1b', // Dark red
};

// Custom shadows (subtle, not flashy)
export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 1px 3px rgba(0,0,0,0.1)',
  lg: '0 4px 6px rgba(0,0,0,0.05)',
  xl: '0 10px 15px rgba(0,0,0,0.05)',
};

export default theme;
