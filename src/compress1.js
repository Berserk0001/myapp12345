/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
import sharp from 'sharp';
import redirect from './redirect.js';
//import { availableParallelism } from 'os';



function compress(req, res, input) {
  let format = 'jpeg';

sharp.cache(false);
sharp.simd(true);
sharp.concurrency(0);

  // Set up the sharp instance with the desired options
  const sharpInstance = sharp({
    unlimited: true
  });
  

  input.pipe(
    sharpInstance
      .resize(null, 12480, {
        withoutEnlargement: true
      })
      .grayscale(req.params.grayscale)
      .toFormat(format, {
        quality: req.params.quality,
        progressive: true, // Enable progressive JPEG
      chromaSubsampling: '4:2:0', // Default chroma subsampling
      optimiseCoding: true, // Optimise Huffman coding tables
      trellisQuantisation: false, // Disable trellis quantisation to reduce CPU usage
      overshootDeringing: false, // Disable overshoot deringing to reduce CPU usage
      optimiseScans: false, // Disable optimisation of progressive scans to reduce CPU usage
      quantisationTable: 0
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
