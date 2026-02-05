import { Router } from 'express';
import { marketplaceListings } from '../services/mock-data.js';

export const marketplaceRouter = Router();

marketplaceRouter.get('/listings', (_, res) => {
  res.json(marketplaceListings);
});

marketplaceRouter.post('/interest', (req, res) => {
  // offline-first: cliente envia itens pendentes ao reconectar.
  res.status(202).json({ accepted: true, payload: req.body });
});
