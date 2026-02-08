import { createTheme } from '@mui/material/styles';

/**
 * Theme base financiero: verde inversión + semáforo (success / warning / error).
 * Tipografía Inter, bordes suaves, overrides para Button, Card, TextField.
 */
export const theme = createTheme({
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
