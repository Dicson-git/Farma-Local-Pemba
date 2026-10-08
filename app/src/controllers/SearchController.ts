import { Request, Response } from 'express';
import { DatabaseService } from '../lib/database';
import { calculateDistanceKm, formatDistance } from '../lib/haversine';
import { SearchResultItem } from '../types';

export class SearchController {
  /**
   * Renderiza a página inicial pública ou retorna JSON com os resultados
   */
  public static async search(req: Request, res: Response) {
    const q = (req.query.q as string) || '';
    const userLat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const userLon = req.query.lon ? parseFloat(req.query.lon as string) : null;
    const isAjax = req.xhr || req.headers.accept?.includes('application/json');

    const db = DatabaseService.getInstance();
    const availableItems = db.searchAvailableMedicines(q);

    let results: SearchResultItem[] = availableItems.map(({ medicamento, farmacia }) => {
      let distancia_km = 0;
      let distancia_formatada = 'Localização não informada';

      if (userLat !== null && userLon !== null && !isNaN(userLat) && !isNaN(userLon)) {
        distancia_km = calculateDistanceKm(userLat, userLon, farmacia.latitude, farmacia.longitude);
        distancia_formatada = formatDistance(distancia_km);
      }

      return {
        medicamento,
        farmacia: {
          id: farmacia.id,
          nome: farmacia.nome,
          telefone: farmacia.telefone,
          bairro: farmacia.bairro,
          cidade: farmacia.cidade,
          provincia: farmacia.provincia,
          horario_funcionamento: farmacia.horario_funcionamento,
          latitude: farmacia.latitude,
          longitude: farmacia.longitude
        },
        distancia_km,
        distancia_formatada
      };
    });

    // Se temos coordenadas válidas, ordenar estritamente da MENOR para a MAIOR distância
    if (userLat !== null && userLon !== null && !isNaN(userLat) && !isNaN(userLon)) {
      results.sort((a, b) => a.distancia_km - b.distancia_km);
    }

    if (isAjax) {
      return res.json({
        total: results.length,
        hasLocation: userLat !== null && userLon !== null,
        results
      });
    }

    const currentPharmacyId = req.cookies?.farmacia_session;
    const currentPharmacy = currentPharmacyId ? db.findPharmacyById(currentPharmacyId) : null;

    res.render('pages/index', {
      title: 'FarmaLocal Pemba | Central de Disponibilidade de Medicamentos',
      query: q,
      userLat,
      userLon,
      results,
      currentPharmacy
    });
  }
}
