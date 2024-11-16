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
sharp.cache(false); // Disable cache
sharp.simd(true); // Enable SIMD (Single Instruction, Multiple Data)
sharp.concurrency(availableParallelism()); // Set concurrency based on system resources

const sharpStream = () => sharp({
  animated: false, // Optional: if animated images should be handled
  unlimited: true, // Allows large images without restrictions
  failOn: 'none', // Do not fail on invalid images
  limitInputPixels: false, // Disable input pixel size limitation
});
export default function compress(req, res, input) {
  const format = req.params.webp ? 'webp' : 'jpeg';

  input.data.pipe(
    sharpStream()
      .grayscale(req.params.grayscale)
      .toFormat(format, {
        quality: req.params.quality,
        progressive: true,
        optimizeScans: true,
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
