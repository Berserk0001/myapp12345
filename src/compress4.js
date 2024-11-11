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
  const compressionQuality = req.params.quality;

  // Extract metadata from the image
  sharp(input)
    .metadata()
    .then(metadata => {
      let format = 'webp';
      let resizeWidth = null;
      let resizeHeight = null;
      let effortCPU = 1;
      let quality = compressionQuality;

      if (metadata.height > 12480) {
        // damn longstrip image
        format = 'webp';
        quality *= 0.5;
        resizeHeight = 12480;
        effortCPU = 6;
      } else if (metadata.width > 1280 && metadata.height < 9360) {
        format = 'webp';
        quality *= 0.5;
        resizeWidth = 960;
        effortCPU = 6;
      } else if (metadata.width > 960 && metadata.height < 2880) {
        format = 'webp';
        quality *= 0.5;
        resizeWidth = 864;
        effortCPU = 6;
      } else {
        format = 'webp';
        quality *= 0.5;
        effortCPU = 6;
      }
      const width = resizeWidth
      const height = resizeHeight

      input.pipe(sharpStream()
        .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    })
        .grayscale(req.params.grayscale)
        .toFormat(format, {
          quality: quality
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
    })
    .catch(err => {
      console.error('Metadata extraction error:', err.message || err);
      return redirect(req, res);
    });
}

export default compress;
