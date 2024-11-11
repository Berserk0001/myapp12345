/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
import sharp from 'sharp';
import redirect from './redirect.js';

sharp.cache(false);
sharp.concurrency(1);

const sharpStream = () => sharp({ unlimited: true });

function compress(req, res, input) {
  const format = 'webp';
  let maxWidth = null;
  let maxHeight = 16383;
  const width = maxWidth; // Default width to maxWidth if not provided
  const height = maxHeight; // Default height to maxHeight if not provided

  input.pipe(sharpStream()
    .resize(width, height, {
      fit: 'inside',
     // withoutEnlargement: true
    })
    .grayscale(req.params.grayscale)
    .toFormat(format, {
      quality: req.params.quality,
      preset: 'picture',
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
