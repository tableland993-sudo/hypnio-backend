require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const audioRoutes = require('./routes/audio');
const subscriptionRoutes = require('./routes/subscription');
const webhookRoutes = require('./routes/webhook');

const app = express();

// Stripe webhooks need raw body — must come before express.json()
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', app: 'Hypnio' }));

// Routes
app.use('/auth', authRoutes);
app.use('/audio', audioRoutes);
app.use('/subscription', subscriptionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hypnio backend running on port ${PORT}`);
});
