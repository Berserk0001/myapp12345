#!/usr/bin/env node
"use strict";

import express from 'express';
import params from './src/params.js';
import proxy from './src/proxy5.js';

const app = express();

// Uncomment the next line if you want to trust the proxy
// app.enable('trust proxy');

app.get('/', params, proxy);
app.get('/favicon.ico', (req, res) => res.status(204).end());

export default app;
