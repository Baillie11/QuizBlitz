require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = parseInt(process.env.PORT) || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Sync models: creates missing tables without altering existing ones.
    // For production, run the SQL migration file instead and set sync: false.
    await sequelize.sync({ alter: false });
    console.log('✅ Models synced.');

    app.listen(PORT, () => {
      console.log(`🚀 TriviaApp backend running on http://localhost:${PORT}`);
    });

    // Start the room scheduler
    const { startScheduler } = require('./services/scheduler');
    startScheduler();
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
