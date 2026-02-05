import express from 'express';
import cors from 'cors';
import { dashboard, feed, marketplace, logistics, courses } from './data.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'shambasmart-api' });
});

app.get('/api/dashboard', (_, res) => {
  res.json(dashboard);
});

app.get('/api/feed', (_, res) => {
  res.json(feed);
});

app.get('/api/marketplace', (_, res) => {
  res.json(marketplace);
});

app.get('/api/logistics', (_, res) => {
  res.json(logistics);
});

app.get('/api/courses', (_, res) => {
  res.json(courses);
});

app.post('/api/sync/offline-actions', (req, res) => {
  const actions = req.body?.actions ?? [];
  res.json({ accepted: actions.length, syncedAt: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`ShambaSmart API em execução na porta ${port}`);
});
