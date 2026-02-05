import { Router } from 'express';
import { feed } from '../services/mock-data.js';

export const feedRouter = Router();

feedRouter.get('/', (_, res) => {
  res.json(feed);
});
