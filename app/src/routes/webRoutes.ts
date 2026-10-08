import { Router } from 'express';
import { SearchController } from '../controllers/SearchController';
import { PharmacyAuthController } from '../controllers/PharmacyAuthController';
import { MedicineStockController } from '../controllers/MedicineStockController';
import { AdminController } from '../controllers/AdminController';
import { authRequired, adminAuthRequired } from '../middlewares/authMiddleware';

const router = Router();

// --- ROTAS PÚBLICAS (PACIENTE) ---
router.get('/', SearchController.search);
router.get('/api/search', SearchController.search);

// --- ROTAS ADMINISTRATIVAS (GESTÃO EXCLUSIVA DE FARMÁCIAS) ---
router.get('/admin/login', AdminController.showLogin);
router.post('/admin/login', AdminController.login);
router.get('/admin/logout', AdminController.logout);
router.get('/admin', adminAuthRequired, AdminController.dashboard);
router.post('/admin/pharmacies/add', adminAuthRequired, AdminController.addPharmacy);
router.post('/admin/pharmacies/:id/update', adminAuthRequired, AdminController.updatePharmacy);
router.post('/admin/pharmacies/:id/delete', adminAuthRequired, AdminController.deletePharmacy);

// --- ROTAS DE AUTENTICAÇÃO DA FARMÁCIA ---
router.get('/login', PharmacyAuthController.showLogin);
router.post('/login', PharmacyAuthController.login);
router.get('/logout', PharmacyAuthController.logout);

// Bloqueio de auto-registo de farmácia (Exclusivo do Admin)
router.get('/register', PharmacyAuthController.showRegister);
router.post('/register', PharmacyAuthController.register);

// --- ROTAS PRIVADAS DA FARMÁCIA (PAINEL E STOCK) ---
router.get('/dashboard', authRequired as any, MedicineStockController.dashboard as any);
router.post('/pharmacy/update-profile', authRequired as any, PharmacyAuthController.updateProfile as any);
router.post('/medicines/add', authRequired as any, MedicineStockController.addMedicine as any);
router.post('/medicines/:id/update', authRequired as any, MedicineStockController.updateStock as any);
router.post('/medicines/:id/decrement', authRequired as any, MedicineStockController.quickDecrement as any);
router.post('/medicines/:id/delete', authRequired as any, MedicineStockController.deleteMedicine as any);

export default router;
