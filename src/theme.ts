import { createTheme, type Theme } from '@mui/material/styles';

const STORAGE_KEY_THEME = 'rentabilidad-alquiler-theme';

export type ThemeVariant = 'actual' | 'anterior';

export const getStoredTheme = (): ThemeVariant => {
  try {
    const v = localStorage.getItem(STORAGE_KEY_THEME);
    if (v === 'anterior' || v === 'actual') return v;
  } catch { /* ignore */ }
  return 'actual';
};

export const setStoredTheme = (variant: ThemeVariant) => {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, variant);
  } catch { /* ignore */ }
};

/**
 * Tema anterior: azul MUI, semáforo con colores más intensos.
 */
export const themeAnterior: Theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#fff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#fff',
    },
    warning: {
      main: '#f9a825',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#000',
    },
    error: {
      main: '#c62828',
      light: '#ef5350',
      dark: '#b71c1c',
      contrastText: '#fff',
    },
    background: {
      default: '#fafafa',
      paper: '#fff',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    button: { fontWeight: 500 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          outline: 'none',
          '&:focus': { outline: 'none', boxShadow: 'none' },
          '&:focus-visible': { outline: 'none', boxShadow: 'none' },
          '&:active': { outline: 'none', boxShadow: 'none' },
        },
      },
      defaultProps: {
        disableElevation: true,
        disableRipple: true,
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          outline: 'none',
          '&:focus': { outline: 'none', boxShadow: 'none' },
          '&:focus-visible': { outline: 'none', boxShadow: 'none' },
          '&:active': { outline: 'none', boxShadow: 'none' },
        },
      },
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

/**
 * Tema actual: azul primary, paleta slate, semáforo con fondos suaves.
 */
export const themeActual: Theme = createTheme({
  palette: {
    mode: 'light',

    primary: {
      main: '#1E3A8A',
      light: '#1D4ED8',
      dark: '#1E40AF',
      contrastText: '#FFFFFF',
    },

    success: {
      main: '#166534',
      light: '#DCFCE7',
      dark: '#14532D',
    },

    warning: {
      main: '#92400E',
      light: '#FEF3C7',
      dark: '#78350F',
    },

    error: {
      main: '#7F1D1D',
      light: '#FEE2E2',
      dark: '#450A0A',
    },

    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },

    text: {
      primary: '#0F172A',
      secondary: '#475569',
    },
  },

  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',

    h1: {
      fontSize: '2rem',
      fontWeight: 700,
    },

    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },

    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },

    body1: {
      fontSize: '0.95rem',
    },

    button: {
      textTransform: 'none',
      fontWeight: 600,
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
          padding: '10px 16px',
          outline: 'none',
          '&:focus': { outline: 'none', boxShadow: 'none' },
          '&:focus-visible': { outline: 'none', boxShadow: 'none' },
          '&:active': { outline: 'none', boxShadow: 'none' },
        },
      },
      defaultProps: {
        disableElevation: true,
        disableRipple: true,
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          outline: 'none',
          '&:focus': { outline: 'none', boxShadow: 'none' },
          '&:focus-visible': { outline: 'none', boxShadow: 'none' },
          '&:active': { outline: 'none', boxShadow: 'none' },
        },
      },
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow:
            '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

/** Compatibilidad: tema por defecto = actual */
export const theme = themeActual;
