import cors from 'cors';
import express from 'express';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { feedRouter } from './routes/feed.routes.js';
import { logisticsRouter } from './routes/logistics.routes.js';
import { marketplaceRouter } from './routes/marketplace.routes.js';
import { profileRouter } from './routes/profile.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true, service: 'chamba-api' }));

app.use('/dashboard', dashboardRouter);
app.use('/marketplace', marketplaceRouter);
app.use('/logistics', logisticsRouter);
app.use('/feed', feedRouter);
app.use('/profiles', profileRouter);

app.listen(4000, () => {
  console.log('CHAMBA API running on :4000');
});
