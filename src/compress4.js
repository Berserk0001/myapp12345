"use strict";
/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
import sharp from 'sharp';
import { availableParallelism } from 'os'; // Import availableParallelism from os
import redirect from './redirect.js';

// Configure sharp settings
//sharp.cache(false); // Disable cache
//sharp.simd(true); // Enable SIMD (Single Instruction, Multiple Data)
//sharp.concurrency(availableParallelism()); // Set concurrency based on system resources


export default function compress(req, res, input) {
  const format = 'webp';
  const sharpStream = _ => sharp({ animated: false, unlimited: true });


  input.data.pipe(
    sharpStream()
      .resize(null, 12480, {
        withoutEnlargement: true
      })
      .grayscale(false)
      .toFormat(format, {
        quality: req.params.quality,
        effort: 0
      })
  )
    .on('info', info => {
      // Set headers dynamically after compression info is available
      res.setHeader('content-type', `image/${format}`);
      res.setHeader('content-length', info.size);
      res.setHeader('x-original-size', req.params.originSize);
      res.setHeader('x-bytes-saved', req.params.originSize - info.size);
      
      // Set HTTP status code (200 OK) after setting headers
      res.status(200);
    })
    .on('error', () => redirect(req, res)) // Redirect if an error occurs
    .pipe(res); // Directly pipe the output to the response
}
