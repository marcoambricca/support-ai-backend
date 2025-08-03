import axios from 'axios';
import { updateRowByFields } from './supabase.js';

export default class TiendaNubeService {
  saveUser = async (user_id, access_token) => {
    try {
      // Llamar a la API de Tiendanube para obtener datos de la tienda
      const tiendaResponse = await axios.get(
        `https://api.tiendanube.com/2025-03/${user_id}/store`,
        {
          headers: {
            'Authentication': `bearer ${access_token}`
          }
        }
      );

      const email = tiendaResponse.data.email;

      const updatedUser = await updateRowByFields(
        'users',
        { email }, // filters: WHERE email = ...
        {
          store_id: user_id,
          access_token: access_token
        } // updates: SET store_id = ..., access_token = ...
      );

      if (!updatedUser) {
        throw new Error('No se encontró ninguna tienda con ese email');
      }

    } catch (error) {
      console.error('Error al vincular tienda:', error);
    }
  };
}

