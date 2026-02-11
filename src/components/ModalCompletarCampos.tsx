import { useState } from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { CODIGOS_COMUNIDADES, NOMBRE_COMUNIDAD_POR_CODIGO } from '../constants/comunidades';
import type { IdealistaAutofill } from '../types/autofill';

interface ModalCompletarCamposProps {
  open: boolean;
  onClose: () => void;
  url: string;
  autofillData: IdealistaAutofill;
  camposFaltantes: {
    habitaciones?: boolean;
    metrosCuadrados?: boolean;
    banos?: boolean;
    codigoComunidadAutonoma?: boolean;
    ciudad?: boolean;
    precioCompra?: boolean;
    alquilerMensual?: boolean;
  };
  onCompletar: (datos: {
    habitaciones: number;
    metrosCuadrados: number;
    banos: number;
    codigoComunidadAutonoma: number;
    ciudad: string;
    precioCompra: number;
    alquilerMensual: number;
  }) => void;
}

export function ModalCompletarCampos({
  open,
  onClose,
  autofillData,
  camposFaltantes,
  onCompletar,
}: ModalCompletarCamposProps) {
  const [habitaciones, setHabitaciones] = useState<string>(autofillData.rooms?.toString() || '');
  const [metrosCuadrados, setMetrosCuadrados] = useState<string>(autofillData.sqm?.toString() || '');
  const [banos, setBanos] = useState<string>(autofillData.banos?.toString() || '');
  const [codigoComunidadAutonoma, setCodigoComunidadAutonoma] = useState<number>(
    autofillData.codigoComunidadAutonoma && autofillData.codigoComunidadAutonoma >= 1 && autofillData.codigoComunidadAutonoma <= 19
      ? autofillData.codigoComunidadAutonoma
      : 0
  );
  const [ciudad, setCiudad] = useState<string>(autofillData.ciudad || '');
  const [precioCompra, setPrecioCompra] = useState<string>(autofillData.buyPrice?.toString() || '');
  const [alquilerMensual, setAlquilerMensual] = useState<string>('');

  // (modal no usado actualmente) ciudades se completan manualmente

  const handleSubmit = () => {
    // Validar que todos los campos obligatorios estén completos
    if (!habitaciones || !metrosCuadrados || !banos || !codigoComunidadAutonoma || !ciudad || !precioCompra || !alquilerMensual) {
      return;
    }

    const datos = {
      habitaciones: parseInt(habitaciones, 10),
      metrosCuadrados: parseInt(metrosCuadrados, 10),
      banos: parseInt(banos, 10),
      codigoComunidadAutonoma,
      ciudad,
      precioCompra: parseFloat(precioCompra),
      alquilerMensual: parseFloat(alquilerMensual),
    };

    onCompletar(datos);
    onClose();
  };

  const todosLosCamposCompletos = 
    habitaciones && 
    metrosCuadrados && 
    banos && 
    codigoComunidadAutonoma >= 1 && 
    codigoComunidadAutonoma <= 19 && 
    ciudad && 
    precioCompra && 
    alquilerMensual;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-completar-campos-title"
      aria-describedby="modal-completar-campos-description"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 600,
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <Typography id="modal-completar-campos-title" variant="h6" component="h2" sx={{ mb: 2 }}>
          Completa los datos faltantes
        </Typography>
        <Typography id="modal-completar-campos-description" variant="body2" sx={{ mb: 3, color: '#666' }}>
          Necesitamos algunos datos adicionales para analizar este inmueble.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Inmueble */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Inmueble</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {camposFaltantes.habitaciones && (
                <TextField
                  label="Habitaciones"
                  type="number"
                  value={habitaciones}
                  onChange={(e) => setHabitaciones(e.target.value)}
                  required
                  error={!habitaciones}
                  sx={{ flex: 1 }}
                />
              )}
              {camposFaltantes.metrosCuadrados && (
                <TextField
                  label="Metros cuadrados"
                  type="number"
                  value={metrosCuadrados}
                  onChange={(e) => setMetrosCuadrados(e.target.value)}
                  required
                  error={!metrosCuadrados}
                  sx={{ flex: 1 }}
                />
              )}
              {camposFaltantes.banos && (
                <TextField
                  label="Baños"
                  type="number"
                  value={banos}
                  onChange={(e) => setBanos(e.target.value)}
                  required
                  error={!banos}
                  sx={{ flex: 1 }}
                />
              )}
            </Box>
          </Box>

          {/* Comunidad autónoma */}
          {camposFaltantes.codigoComunidadAutonoma && (
            <FormControl fullWidth required error={!codigoComunidadAutonoma || codigoComunidadAutonoma < 1}>
              <InputLabel>Comunidad autónoma</InputLabel>
              <Select
                value={codigoComunidadAutonoma}
                onChange={(e) => setCodigoComunidadAutonoma(e.target.value as number)}
                label="Comunidad autónoma"
              >
                <MenuItem value={0}>Selecciona una comunidad</MenuItem>
                {CODIGOS_COMUNIDADES.map((codigo) => (
                  <MenuItem key={codigo} value={codigo}>
                    {NOMBRE_COMUNIDAD_POR_CODIGO[codigo]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Ciudad */}
          {camposFaltantes.ciudad && (
            <TextField
              label="Ciudad"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              required
              error={!ciudad}
              fullWidth
              // TODO: Añadir autocompletado con ciudades filtradas por comunidad autónoma
            />
          )}

          {/* Precio compra */}
          {camposFaltantes.precioCompra && (
            <TextField
              label="Precio compra (€)"
              type="number"
              value={precioCompra}
              onChange={(e) => setPrecioCompra(e.target.value)}
              required
              error={!precioCompra}
              fullWidth
              inputProps={{ min: 0, step: 1000 }}
            />
          )}

          {/* Alquiler mensual */}
          {camposFaltantes.alquilerMensual && (
            <TextField
              label="Alquiler estimado (€/mes)"
              type="number"
              value={alquilerMensual}
              onChange={(e) => setAlquilerMensual(e.target.value)}
              required
              error={!alquilerMensual}
              fullWidth
              inputProps={{ min: 0, step: 50 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!todosLosCamposCompletos}
          >
            Crear tarjeta
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
