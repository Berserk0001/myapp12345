import sharp from 'sharp';
import redirect from './redirect.js';

sharp.cache(false);
sharp.concurrency(1);

function compress(req, res, input) {
  let format = 'webp';

  input.data
    .pipe(
      sharp()
        .resize(null, 12480, {
          withoutEnlargement: true,
        })
        .grayscale(req.params.grayscale)
        .toFormat(format, {
          quality: req.params.quality,
          effort: 0,
        })
        .on('error', (err) => {
          console.error('Sharp error:', err.message || err);
          input.destroy(); // Clean up input on error
          return redirect(req, res);
        })
        .on('info', (info) => {
          res.setHeader('content-type', 'image/' + format);
          res.setHeader('content-length', info.size);
          res.setHeader('x-original-size', req.params.originSize);
          res.setHeader('x-bytes-saved', req.params.originSize - info.size);
          res.status(200);
        })
    )
    .pipe(res)
    .on('finish', () => {
      // Clean up the stream after the response is sent
      input.destroy();
    })
    .on('close', () => {
      // Additional safety cleanup in case of early termination
      input.destroy();
    });
}

export default compress;
