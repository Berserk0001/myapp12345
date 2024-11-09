#!/usr/bin/env node
"use strict";

import express from 'express';
import params from './src/params.js';
import proxy from './src/proxy2.js';
const PORT = process.env.PORT || 8080;
const app = express();
app.disable('x-powered-by');
// Uncomment the next line if you want to trust the proxy
// app.enable('trust proxy');

app.get('/', params, proxy);
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
