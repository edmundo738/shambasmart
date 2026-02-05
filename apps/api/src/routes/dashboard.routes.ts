import { Router } from 'express';
import { dashboardSnapshot } from '../services/mock-data.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', (_, res) => {
  res.json(dashboardSnapshot);
});
