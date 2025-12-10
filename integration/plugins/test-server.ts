import express from 'express';
import { Server } from 'http';

const getRandomPort = () => 40000 + Math.round(Math.random() * 25000);

export const startTestServer = (port?: number, maxRetries = 30): Promise<{ server: Server; port: number }> => {
  return new Promise((resolve, reject) => {
    const tryStart = (currentPort: number, attempt: number) => {
      const app = express();

      app.get('/', (req, res) => {
        res.send('Hello World!');
      });

      app.post('/hello', (req, res) => {
        res.send({ result: 'hello world' });
      });

      app.post('/mirror', (req, res) => {
        res.send({ result: req.body });
      });

      const server = app.listen(currentPort);

      server.on('listening', () => {
        console.log(`Test server listening on port ${currentPort}`);
        resolve({ server, port: currentPort });
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attempt < maxRetries) {
          const nextPort = getRandomPort();
          console.log(`Port ${currentPort} in use, trying ${nextPort} (attempt ${attempt + 1}/${maxRetries})`);
          tryStart(nextPort, attempt + 1);
        } else {
          reject(err);
        }
      });
    };

    tryStart(port ?? getRandomPort(), 0);
  });
};
