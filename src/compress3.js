/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
import sharp from 'sharp';
import redirect from './redirect.js';

/*sharp.cache({memory: 200});
sharp.concurrency(0);*/

function compress(req, res, input) {
  const format = 'webp';

  try {
    input.body.pipe(sharp()
      .resize(null, 16383, {
        withoutEnlargement: true
      })
      .grayscale(req.params.grayscale)
      .toFormat(format, {
        quality: req.params.quality,
        effort: 0
      })
      .on('info', (info) => {
        res.setHeader('content-type', 'image/' + format);
        res.setHeader('content-length', info.size);
        res.setHeader('x-original-size', req.params.originSize);
        res.setHeader('x-bytes-saved', req.params.originSize - info.size);
        res.status(200);
      })
      .on('error', (err) => {
        console.error('Sharp error:', err.message || err);
        redirect(req, res);
      })
    ).pipe(res);
  } catch (err) {
    console.error('Synchronous error:', err.message || err);
    redirect(req, res);
  }
}

export default compress;
