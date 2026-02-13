import express from 'express';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

const SECRET = 'fixture-secret';

app.post('/login', (_req, res) => {
  const token = jwt.sign({ role: 'user' }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

app.get('/protected', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'missing token' });
  }

  try {
    jwt.verify(token, SECRET);
    return res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
});

export default app;
