import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../lib/database';

export class AdminController {
  public static showLogin(req: Request, res: Response) {
    if (req.cookies?.admin_session === 'admin-authenticated-token') {
      return res.redirect('/admin');
    }
    res.render('pages/admin_login', {
      title: 'Portal do Administrador | FarmaLocal Pemba',
      error: req.query.error
    });
  }

  public static async login(req: Request, res: Response) {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.render('pages/admin_login', {
        title: 'Portal do Administrador | FarmaLocal Pemba',
        error: 'Informe o e-mail e a palavra-passe do administrador.'
      });
    }

    const db = DatabaseService.getInstance();
    const result = db.validateAdmin(email, senha);

    if (!result.success) {
      return res.render('pages/admin_login', {
        title: 'Portal do Administrador | FarmaLocal Pemba',
        error: 'Credenciais de administrador inválidas. Acesso restrito.'
      });
    }

    res.cookie('admin_session', 'admin-authenticated-token', {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });

    res.redirect('/admin');
  }

  public static logout(req: Request, res: Response) {
    res.clearCookie('admin_session');
    res.redirect('/admin/login');
  }

  public static dashboard(req: Request, res: Response) {
    const db = DatabaseService.getInstance();
    const rawPharmacies = db.getAllPharmacies();

    const farmacias = rawPharmacies.map(f => ({
      ...f,
      total_medicamentos: db.getMedicinesCountByPharmacy(f.id)
    }));

    const totalMedicamentos = db.medicamentos.length;

    res.render('pages/admin_dashboard', {
      title: 'Painel de Gestão de Farmácias | Administração FarmaLocal',
      farmacias,
      totalMedicamentos,
      error: req.query.error,
      success: req.query.success
    });
  }

  public static async addPharmacy(req: Request, res: Response) {
    try {
      const { 
        nome, 
        telefone, 
        email, 
        senha, 
        bairro, 
        cidade, 
        provincia, 
        endereco_detalhado, 
        horario_funcionamento, 
        latitude, 
        longitude 
      } = req.body;

      if (!nome || !telefone || !email || !senha || !bairro) {
        return res.redirect('/admin?error=campos_obrigatorios');
      }

      const db = DatabaseService.getInstance();
      if (db.findPharmacyByEmail(email)) {
        return res.redirect('/admin?error=email_duplicado');
      }

      // Validação Estrita de Localização Exata
      if (!latitude || !longitude) {
        return res.redirect('/admin?error=coordenadas_obrigatorias');
      }

      const latNum = parseFloat(latitude);
      const lonNum = parseFloat(longitude);

      if (isNaN(latNum) || isNaN(lonNum) || (latNum === 0 && lonNum === 0)) {
        return res.redirect('/admin?error=coordenadas_invalidas');
      }

      // Validação de intervalo geográfico (Latitude e Longitude válidas)
      if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
        return res.redirect('/admin?error=coordenadas_fora_limites');
      }

      const salt = bcrypt.genSaltSync(10);
      const senha_hash = bcrypt.hashSync(senha, salt);

      db.addPharmacy({
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim().toLowerCase(),
        senha_hash,
        provincia: provincia?.trim() || 'Cabo Delgado',
        cidade: cidade?.trim() || 'Pemba',
        bairro: bairro.trim(),
        endereco_detalhado: endereco_detalhado?.trim() || '',
        horario_funcionamento: horario_funcionamento?.trim() || '08h00 às 20h00',
        latitude: parseFloat(latNum.toFixed(6)),
        longitude: parseFloat(lonNum.toFixed(6))
      });

      res.redirect('/admin?success=farmacia_cadastrada');
    } catch (err: any) {
      console.error('Erro ao cadastrar farmácia pelo administrador:', err);
      res.redirect('/admin?error=erro_servidor');
    }
  }

  public static deletePharmacy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const db = DatabaseService.getInstance();
      
      const removed = db.deletePharmacy(id);
      if (removed) {
        return res.redirect('/admin?success=farmacia_removida');
      } else {
        return res.redirect('/admin?error=farmacia_nao_encontrada');
      }
    } catch (err: any) {
      console.error('Erro ao remover farmácia pelo administrador:', err);
      res.redirect('/admin?error=erro_servidor');
    }
  }

  public static async updatePharmacy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        nome,
        telefone,
        email,
        senha,
        bairro,
        cidade,
        provincia,
        endereco_detalhado,
        horario_funcionamento,
        latitude,
        longitude
      } = req.body;

      const db = DatabaseService.getInstance();
      const farmaciaExistente = db.findPharmacyById(id);
      if (!farmaciaExistente) {
        return res.redirect('/admin?error=farmacia_nao_encontrada');
      }

      // Se mudou o e-mail, verificar se não colide com outra farmácia
      if (email && email.trim().toLowerCase() !== farmaciaExistente.email.toLowerCase()) {
        const outroComMesmoEmail = db.findPharmacyByEmail(email.trim());
        if (outroComMesmoEmail && outroComMesmoEmail.id !== id) {
          return res.redirect('/admin?error=email_duplicado');
        }
      }

      const updates: any = {};
      if (nome) updates.nome = nome.trim();
      if (telefone) updates.telefone = telefone.trim();
      if (email) updates.email = email.trim().toLowerCase();
      if (bairro) updates.bairro = bairro.trim();
      if (cidade) updates.cidade = cidade.trim();
      if (provincia) updates.provincia = provincia.trim();
      if (endereco_detalhado !== undefined) updates.endereco_detalhado = endereco_detalhado.trim();
      if (horario_funcionamento) updates.horario_funcionamento = horario_funcionamento.trim();

      if (latitude && longitude) {
        const latNum = parseFloat(latitude);
        const lonNum = parseFloat(longitude);
        if (!isNaN(latNum) && !isNaN(lonNum) && !(latNum === 0 && lonNum === 0)) {
          if (latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180) {
            updates.latitude = parseFloat(latNum.toFixed(6));
            updates.longitude = parseFloat(lonNum.toFixed(6));
          }
        }
      }

      if (senha && senha.trim().length >= 6) {
        const salt = bcrypt.genSaltSync(10);
        updates.senha_hash = bcrypt.hashSync(senha.trim(), salt);
      }

      const updated = db.updatePharmacy(id, updates);
      if (updated) {
        return res.redirect('/admin?success=farmacia_atualizada');
      } else {
        return res.redirect('/admin?error=erro_ao_atualizar');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar farmácia pelo administrador:', err);
      res.redirect('/admin?error=erro_servidor');
    }
  }
}
