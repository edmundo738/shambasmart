import { Router } from 'express';
import { farmerProfile } from '../services/mock-data.js';

export const profileRouter = Router();

profileRouter.get('/farmer/:id', (_, res) => {
  res.json(farmerProfile);
});
