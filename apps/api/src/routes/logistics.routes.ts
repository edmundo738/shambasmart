import { Router } from 'express';

export const logisticsRouter = Router();

logisticsRouter.post('/request', (req, res) => {
  const basePrice = 4500;
  const distanceKm = Number(req.body.distanceKm ?? 10);
  const suggestedPrice = basePrice + distanceKm * 220;
  res.json({ suggestedPrice, status: 'pending_match' });
});
