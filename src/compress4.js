import sharp from 'sharp';
import redirect from './redirect.js';
sharp.cache(false);
sharp.concurrency(1);

const sharpStream = () => sharp({ unlimited: true });

async function compress(req, res, input) {
  const quality = req.params.quality || 80;
  let compressionQuality = quality;
  let resizeWidth = null;
  let resizeHeight = null;
  let effortCPU = 6;
  let format = webp ? 'webp' : 'jpeg';

  try {
    const metadata = await sharp(input).metadata();
    const imgHeight = metadata.height;
    const imgWidth = metadata.width;

    // Apply compression logic based on image dimensions
    if (imgHeight > 12480) {
      format = 'webp';
      compressionQuality *= 0.5;
      resizeHeight = 12480;
    } else if (imgWidth > 1280 && imgHeight < 9360) {
      format = 'webp';
      compressionQuality *= 0.5;
      resizeWidth = 960;
    } else if (imgWidth > 960 && imgHeight < 2880) {
      format = 'webp';
      compressionQuality *= 0.5;
      resizeWidth = 864;
    } else {
      format = 'webp';
      compressionQuality *= 0.5;
    }

    input.pipe(
      sharpStream()
        .resize({
          width: resizeWidth,
          height: resizeHeight
        })
        .grayscale(req.params.grayscale)
        .toFormat(format, { quality: compressionQuality, effort: effortCPU })
        .on('info', (info) => {
          res.setHeader('content-type', `image/${format}`);
          res.setHeader('content-length', info.size);
          res.setHeader('x-original-size', req.params.originSize);
          res.setHeader('x-bytes-saved', req.params.originSize - info.size);
          res.status(200);
        })
    ).pipe(res);

  } catch (error) {
    console.error('Error processing image:', error);
    redirect(req, res);
  }
}

export default compress;
