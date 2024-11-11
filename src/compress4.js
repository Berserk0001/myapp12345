/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
import sharp from 'sharp';
import redirect from './redirect.js';
sharp.cache(false);
sharp.concurrency(1);

const sharpStream = (format, quality, resizeOptions) => {
  let pipeline = sharp({ unlimited: true }).toFormat(format, { quality });
  if (resizeOptions) {
    pipeline = pipeline.resize(resizeOptions);
  }
  return pipeline;
};

function compress(req, res, input) {
  let format = 'jpeg';
  let compressionQuality = req.params.quality || 80;
  let resizeOptions = null;
  const imgWidth = req.params.imgWidth;
  const imgHeight = req.params.imgHeight;

  // Adjust format, compression quality, and resizing based on image dimensions
  if (imgHeight > 12480) { // Longstrip image
    format = 'webp';
    compressionQuality *= 0.5;
    resizeOptions = { height: 12480 };
  } else if (imgWidth > 1280 && imgHeight < 9360) {
    format = 'webp';
    compressionQuality *= 0.5;
    resizeOptions = { width: 960 };
  } else if (imgWidth > 960 && imgHeight < 2880) {
    format = 'webp';
    compressionQuality *= 0.5;
    resizeOptions = { width: 864 };
  } else {
    format = 'webp';
    compressionQuality *= 0.5;
  }

  input.pipe(sharpStream(format, compressionQuality, resizeOptions)
    .grayscale(req.params.grayscale)
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
