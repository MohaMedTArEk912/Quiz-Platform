import express from 'express';
import * as shopController from '../controllers/shopController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/items', shopController.getShopItems); // GET /api/shop/items (Public? - Logic seeds it, so yes)
router.post('/items', verifyAdmin, shopController.createShopItem); // POST /api/shop/items
router.put('/items/:itemId', verifyAdmin, shopController.updateShopItem); // PUT /api/shop/items/:itemId
router.delete('/items/:itemId', verifyAdmin, shopController.deleteShopItem); // DELETE /api/shop/items/:itemId
router.post('/purchase', verifyUser, shopController.purchaseItem); // POST /api/shop/purchase

// What about powerups usage? It was /api/powerups/use. 
// I should add it here or in a separate controller?
// Let's add it to shopController for now as 'economy' logic.
// Or create a new route. The plan matched 'Shop' with related powerups.
// Let's add usePowerUp to shopController.js and map it here?
// But the route is /api/powerups/use.
// I can mount this router at /api/shop, so the route would be /api/shop/powerups/use?
// Original was /api/powerups/use.
// I will create a separate Powerups route/controller or just export it from shopController and mount it in index.js under /api/powerups.

export default router;
