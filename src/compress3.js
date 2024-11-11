/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
import sharp from 'sharp';
import redirect from './redirect.js';

sharp.cache({memory: 200});
sharp.concurrency(0);

//const sharpStream = () => sharp({ unlimited: true });

function compress(req, res, input) {
  const format = 'webp';
 
  input.pipe(sharp()
    .resize(864, 12480,
            {
    //  fit: 'inside',
      withoutEnlargement: true
    //  withoutReduction: true
    })
    .grayscale(req.params.grayscale)
    .toFormat(format, {
      quality: req.params.quality
     // effort: 1
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
