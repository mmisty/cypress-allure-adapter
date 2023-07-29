import express from 'express';

export const startTestServer = (port = 3000) => {
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

  const server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });

  return server;
};
