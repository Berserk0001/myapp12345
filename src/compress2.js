/*
 * compress.js
 * A module that compresses an image.
 * compress(httpRequest, httpResponse, ReadableStream);
 */
import sharp from 'sharp';
import redirect from './redirect.js';

const sharpStream = () => sharp({ unlimited: true });

function compress(req, res, input) {
  const format = 'jpeg';

  input.pipe(sharpStream()
    .grayscale(req.params.grayscale)
    .toFormat(format, {
      quality: req.params.quality
    })
    .on('error', (err) => _handleError(err, req, res))
    .on('info', (info) => _sendResponse(info, format, req, res))
  );
}

function _handleError(err, req, res) {
  console.error('Compression error:', err.message || err);
  redirect(req, res);
}

function _sendResponse(info, format, req, res) {
  res.setHeader('content-type', 'image/' + format);
  res.setHeader('content-length', info.size);
  res.setHeader('x-original-size', req.params.originSize);
  res.setHeader('x-bytes-saved', req.params.originSize - info.size);
  res.status(200);
  res.end();
}

export default compress;
