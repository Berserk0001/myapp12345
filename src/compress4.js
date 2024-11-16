"use strict";
/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
import sharp from 'sharp';
import redirect from './redirect.js';

const sharpStream = () => sharp({ animated: false, unlimited: true });

function compress(req, res, input) {
  const format = 'webp';

  input.pipe(
    sharpStream()
      .grayscale(req.params.grayscale)
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
export default compress;
