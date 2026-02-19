import { Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import { useThemeSwitcher } from '../context/ThemeSwitcherContext';

export function Footer() {
  const { variant, setVariant } = useThemeSwitcher();

  return (
    <footer
      className="app-footer"
      style={{
        marginTop: 'auto',
        padding: '24px 16px',
        borderTop: '1px solid #eee',
        backgroundColor: '#fafafa',
      }}
    >
      <Box sx={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '8px 16px' }}>
          <Link to="/legal/aviso" style={{ color: '#1976d2', textDecoration: 'none' }}>
            <Typography variant="body2" component="span" color="primary">Aviso legal</Typography>
          </Link>
          <Link to="/legal/privacidad" style={{ color: '#1976d2', textDecoration: 'none' }}>
            <Typography variant="body2" component="span" color="primary">Privacidad</Typography>
          </Link>
          <Link to="/legal/cookies" style={{ color: '#1976d2', textDecoration: 'none' }}>
            <Typography variant="body2" component="span" color="primary">Cookies</Typography>
          </Link>
          <Link to="/legal/disclaimer" style={{ color: '#1976d2', textDecoration: 'none' }}>
            <Typography variant="body2" component="span" color="primary">Disclaimer</Typography>
          </Link>
          <Link to="/contacto" style={{ color: '#1976d2', textDecoration: 'none' }}>
            <Typography variant="body2" component="span" color="primary">Contacto</Typography>
          </Link>
          <Tooltip title="Cambiar tema para comparar">
            <ToggleButtonGroup
              value={variant}
              exclusive
              onChange={(_, v) => v && setVariant(v)}
              size="small"
              sx={{ ml: 1 }}
            >
              <ToggleButton value="actual">Actual</ToggleButton>
              <ToggleButton value="anterior">Anterior</ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary">
          © 2026 Rentabilidad Alquiler
        </Typography>
      </Box>
    </footer>
  );
}
