import { Response } from 'express';
import { MedicineStockModel, PharmacyModel } from '../models';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class MedicineStockController {
  public static async dashboard(req: AuthenticatedRequest, res: Response) {
    const farmaciaId = req.currentPharmacy!.id;
    const farmacia = PharmacyModel.findById(farmaciaId);
    const medicamentos = MedicineStockModel.getByPharmacy(farmaciaId);

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
    try {
      const farmaciaId = req.currentPharmacy!.id;
      const { nome_comercial, principio_ativo, dosagem, quantidade_stock, preco } = req.body;

      if (!nome_comercial || !dosagem || quantidade_stock === undefined || !preco) {
        return res.redirect('/dashboard?error=preencha_todos_os_campos');
      }

      // Regra Crítica: O sistema não deve permitir o cadastro de medicamentos com nomes iguais na mesma farmácia
      if (MedicineStockModel.existsByNameInPharmacy(farmaciaId, nome_comercial)) {
        return res.redirect('/dashboard?error=medicamento_duplicado');
      }

      await MedicineStockModel.create({
        farmacia_id: farmaciaId,
        nome_comercial: nome_comercial.trim(),
        principio_ativo: (principio_ativo || '').trim(),
        dosagem: dosagem.trim(),
        quantidade_stock: Math.max(0, parseInt(quantidade_stock, 10) || 0),
        preco: Math.max(0, parseFloat(preco) || 0)
      });

      res.redirect('/dashboard?success=medicamento_adicionado');
    } catch (err: any) {
      console.error('Erro ao adicionar medicamento:', err);
      if (err.message?.includes('MEDICINE_NAME_DUPLICATED') || err.message?.includes('Já existe')) {
        return res.redirect('/dashboard?error=medicamento_duplicado');
      }
      res.redirect('/dashboard?error=erro_servidor');
    }
  }

  public static async updateStock(req: AuthenticatedRequest, res: Response) {
    try {
      const farmaciaId = req.currentPharmacy!.id;
      const medicineId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { quantidade_stock, preco } = req.body;

      const updated = await MedicineStockModel.update(medicineId, farmaciaId, {
        quantidade_stock: quantidade_stock !== undefined ? parseInt(quantidade_stock, 10) : undefined,
        preco: preco !== undefined ? parseFloat(preco) : undefined
      });

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: !!updated, item: updated });
      }

      res.redirect('/dashboard?success=stock_atualizado');
    } catch (err: any) {
      console.error('Erro ao atualizar stock:', err);
      res.redirect('/dashboard?error=erro_servidor');
    }
  }

  public static async quickDecrement(req: AuthenticatedRequest, res: Response) {
    const farmaciaId = req.currentPharmacy!.id;
    const medicineId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const updated = await MedicineStockModel.quickDecrement(medicineId, farmaciaId, 1);

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: !!updated, remaining: updated?.quantidade_stock });
    }

    res.redirect('/dashboard?success=baixa_realizada');
  }

  public static async deleteMedicine(req: AuthenticatedRequest, res: Response) {
    const farmaciaId = req.currentPharmacy!.id;
    const medicineId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    await MedicineStockModel.delete(medicineId, farmaciaId);

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true });
    }

    res.redirect('/dashboard?success=medicamento_removido');
  }
}
