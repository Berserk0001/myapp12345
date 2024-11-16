/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
import sharp from 'sharp';
import redirect from './redirect.js';
import { availableParallelism } from 'os';



function compress(req, res, input) {
  const format = 'webp';

sharp.cache(false);
sharp.simd(true);
sharp.concurrency(availableParallelism());

  // Set up the sharp instance with the desired options
  const sharpInstance = sharp({
    unlimited: true,
    failOn: 'none',
    limitInputPixels: false
  });
  

  input.body.pipe(
    sharpInstance
      .resize(null, 16383, {
        withoutEnlargement: true
      })
      .grayscale(req.params.grayscale)
      .toFormat(format, {
        quality: req.params.quality,
        effort: 0
      })
      .on('error', (err) => {
        console.error('Sharp error:', err.message || err);
        return redirect(req, res);
      })
      .on('info', (info) => {
        res.setHeader('content-type', 'image/' + format);
        res.setHeader('content-length', info.size);
        res.setHeader('x-original-size', req.params.originSize);
        res.setHeader('x-bytes-saved', req.params.originSize - info.size);
        res.status(200);
      })
  ).pipe(res);
}

export default compress;
