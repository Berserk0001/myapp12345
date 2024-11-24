"use strict";
/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
import sharp from 'sharp';
//import { availableParallelism } from 'os'; // Import availableParallelism from os
import redirect from './redirect.js';

  

//sharp.simd(true);


export default function compress(req, res, input) {
  const format = 'jpeg';

  // Configure sharp settings
sharp.cache(false); // Disable cache
sharp.simd(true); // Enable SIMD (Single Instruction, Multiple Data)
sharp.concurrency(0); // Set concurrency based on system resources
  
const sharpStream = _ => sharp({ animated: false, unlimited: true });



  input.data.pipe(
    sharpStream()
      .resize(null, 12480, {
        withoutEnlargement: true
      })
      .grayscale(false)
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
  )
    .on('info', info => {
      // Set headers dynamically after compression info is available
      res.setHeader('content-type', `image/${format}`);
      res.setHeader('content-length', info.size);
      res.setHeader('x-original-size', req.params.originSize);
      res.setHeader('x-bytes-saved', req.params.originSize - info.size);
    })
    .on('error', () => redirect(req, res)) // Redirect if an error occurs
    .pipe(res); // Directly pipe the output to the response
}
