import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../lib/database';

export class PharmacyAuthController {
  public static showRegister(req: Request, res: Response) {
    // Regra de Negócio: A farmácia não pode se cadastrar por conta própria. Apenas o Administrador pode cadastrar.
    return res.redirect('/login?error=cadastro_exclusivo_admin');
  }

  public static async register(req: Request, res: Response) {
    // Bloqueio rigoroso de auto-cadastro
    return res.status(403).render('pages/login_pharmacy', {
      title: 'Aceder ao Painel da Farmácia | FarmaLocal Pemba',
      error: 'O credenciamento de estabelecimentos é restrito ao Administrador. Contacte a Administração do FarmaLocal para solicitar o seu registo.'
    });
  }

  public static showLogin(req: Request, res: Response) {
    if (req.cookies?.farmacia_session) {
      return res.redirect('/dashboard');
    }
    res.render('pages/login_pharmacy', {
      title: 'Aceder ao Painel da Farmácia | FarmaLocal Pemba',
      error: req.query.error
    });
  }

  public static async login(req: Request, res: Response) {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.render('pages/login_pharmacy', {
        title: 'Aceder ao Painel | FarmaLocal Pemba',
        error: 'Informe o e-mail e a senha cadastrados.'
      });
    }

    const db = DatabaseService.getInstance();
    const farmacia = db.findPharmacyByEmail(email);

    if (!farmacia || !bcrypt.compareSync(senha, farmacia.senha_hash)) {
      return res.render('pages/login_pharmacy', {
        title: 'Aceder ao Painel | FarmaLocal Pemba',
        error: 'Credenciais inválidas. Verifique o e-mail e a senha.'
      });
    }

    res.cookie('farmacia_session', farmacia.id, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect('/dashboard');
  }

  public static logout(req: Request, res: Response) {
    res.clearCookie('farmacia_session');
    res.redirect('/login');
  }

  public static async updateProfile(req: any, res: Response) {
    try {
      const farmaciaId = req.currentPharmacy?.id;
      if (!farmaciaId) {
        return res.redirect('/login');
      }

      const {
        nome,
        telefone,
        horario_funcionamento,
        bairro,
        cidade,
        provincia,
        endereco_detalhado,
        latitude,
        longitude,
        nova_senha
      } = req.body;

      if (!nome || !telefone || !bairro) {
        return res.redirect('/dashboard?error=campos_obrigatorios');
      }

      const db = DatabaseService.getInstance();
      const updates: any = {
        nome: nome.trim(),
        telefone: telefone.trim(),
        horario_funcionamento: horario_funcionamento?.trim() || '08h00 às 20h00',
        bairro: bairro.trim(),
        cidade: cidade?.trim() || 'Pemba',
        provincia: provincia?.trim() || 'Cabo Delgado',
        endereco_detalhado: endereco_detalhado?.trim() || ''
      };

      if (latitude && longitude) {
        const latNum = parseFloat(latitude);
        const lonNum = parseFloat(longitude);
        if (!isNaN(latNum) && !isNaN(lonNum) && !(latNum === 0 && lonNum === 0)) {
          updates.latitude = latNum;
          updates.longitude = lonNum;
        }
      }

      if (nova_senha && nova_senha.trim().length >= 6) {
        const salt = bcrypt.genSaltSync(10);
        updates.senha_hash = bcrypt.hashSync(nova_senha.trim(), salt);
      }

      const updated = db.updatePharmacy(farmaciaId, updates);
      if (updated) {
        return res.redirect('/dashboard?success=perfil_atualizado');
      } else {
        return res.redirect('/dashboard?error=farmacia_nao_encontrada');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar dados da farmácia:', err);
      return res.redirect('/dashboard?error=erro_servidor');
    }
  }
}
