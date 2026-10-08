import { Response } from 'express';
import { DatabaseService } from '../lib/database';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class MedicineStockController {
  public static async dashboard(req: AuthenticatedRequest, res: Response) {
    const farmaciaId = req.currentPharmacy!.id;
    const db = DatabaseService.getInstance();
    const farmacia = db.findPharmacyById(farmaciaId);
    const medicamentos = db.getMedicinesByPharmacy(farmaciaId);

    res.render('pages/dashboard', {
      title: `Painel de Stock | ${farmacia?.nome || 'Farmácia'}`,
      farmacia,
      medicamentos,
      welcome: req.query.welcome === '1',
      success: req.query.success,
      error: req.query.error
    });
  }

  public static async addMedicine(req: AuthenticatedRequest, res: Response) {
    const farmaciaId = req.currentPharmacy!.id;
    const { nome_comercial, principio_ativo, dosagem, quantidade_stock, preco } = req.body;

    if (!nome_comercial || !dosagem || quantidade_stock === undefined || !preco) {
      return res.redirect('/dashboard?error=preencha_todos_os_campos');
    }

    const db = DatabaseService.getInstance();
    db.addMedicine({
      farmacia_id: farmaciaId,
      nome_comercial: nome_comercial.trim(),
      principio_ativo: (principio_ativo || '').trim(),
      dosagem: dosagem.trim(),
      quantidade_stock: Math.max(0, parseInt(quantidade_stock, 10) || 0),
      preco: Math.max(0, parseFloat(preco) || 0)
    });

    res.redirect('/dashboard?success=medicamento_adicionado');
  }

  public static async updateStock(req: AuthenticatedRequest, res: Response) {
    const farmaciaId = req.currentPharmacy!.id;
    const medicineId = req.params.id;
    const { quantidade_stock, preco } = req.body;

    const db = DatabaseService.getInstance();
    const updated = db.updateMedicineStock(medicineId, farmaciaId, {
      quantidade_stock: quantidade_stock !== undefined ? parseInt(quantidade_stock, 10) : undefined,
      preco: preco !== undefined ? parseFloat(preco) : undefined
    });

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: !!updated, item: updated });
    }

    res.redirect('/dashboard?success=stock_atualizado');
  }

  public static async quickDecrement(req: AuthenticatedRequest, res: Response) {
    const farmaciaId = req.currentPharmacy!.id;
    const medicineId = req.params.id;

    const db = DatabaseService.getInstance();
    const updated = db.decrementMedicineStock(medicineId, farmaciaId, 1);

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: !!updated, remaining: updated?.quantidade_stock });
    }

    res.redirect('/dashboard?success=baixa_realizada');
  }

  public static async deleteMedicine(req: AuthenticatedRequest, res: Response) {
    const farmaciaId = req.currentPharmacy!.id;
    const medicineId = req.params.id;

    const db = DatabaseService.getInstance();
    db.deleteMedicine(medicineId, farmaciaId);

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true });
    }

    res.redirect('/dashboard?success=medicamento_removido');
  }
}
