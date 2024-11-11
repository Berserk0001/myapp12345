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
  let format = 'webp';
  let compressionQuality = req.params.quality;
  const imgWidth = req.params.imgWidth;
  const imgHeight = req.params.imgHeight;
  let resizeWidth = null;
  let resizeHeight = null;
  let effortCPU = 1;

  if (imgHeight > 12480) {
    // damn longstrip image
    format = 'webp';
    compressionQuality *= 0.5;
    resizeHeight = 12480;
    effortCPU = 6;
  } else if (imgWidth > 1280 && imgHeight < 9360) {
    format = 'webp';
    compressionQuality *= 0.5;
    resizeWidth = 960;
    effortCPU = 6;
  } else if (imgWidth > 960 && imgHeight < 2880) {
    format = 'webp';
    compressionQuality *= 0.5;
    resizeWidth = 864;
    effortCPU = 6;
  } else {
    format = 'webp';
    compressionQuality *= 0.5;
    effortCPU = 6;
  }

  input.pipe(sharpStream()
    .resize(resizeWidth, resizeHeight)
    .grayscale(req.params.grayscale)
    .toFormat(format, {
      quality: compressionQuality,
      effort: effortCPU
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
