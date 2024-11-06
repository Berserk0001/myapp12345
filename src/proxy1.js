"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
import _ from "lodash";
import got from "got";
import shouldCompress from "./shouldCompress.js";
import redirect from "./redirect.js";
import compress from "./compress.js";
import copyHeaders from "./copyHeaders.js";
const { pick } = _;


async function proxy(req, res) {


  try {
    // Fetch the image as a stream using `got.stream()`
    let response = await got(req.params.url, {
      headers: {
        ...pick(req.headers, ['cookie', 'dnt', 'referer', 'range']),
        'user-agent': 'Bandwidth-Hero Compressor',
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
        via: '1.1 bandwidth-hero',
      },
      maxRedirects: 4, // Handles redirections
      throwHttpErrors: false, // Do not throw errors for non-2xx responses
    });

    // Check if the response is successful by inspecting the status code
    if (response.statusCode !== 200) {
      //console.error(`Unexpected response status: ${response.statusCode}`);
      redirect(req, res);
     // response.destroy(); // Destroy the stream after redirect
      return;
    }

    // Copy headers and set necessary response headers
    copyHeaders(response, res);
    res.setHeader('content-encoding', 'identity');

    req.params.originType = response.headers['content-type'] || '';
    req.params.originSize = parseInt(response.headers['content-length'], 10) || 0;

    // Check if the response should be compressed
    if (shouldCompress(req)) {
      compress(req, res, response); // Send the response stream to compression
    } else {
      // Bypass compression
      res.setHeader('x-proxy-bypass', 1);

      // Set specific headers
      for (const headerName of ['accept-ranges', 'content-type', 'content-length', 'content-range']) {
        if (headerName in response.headers) res.setHeader(headerName, response.headers[headerName]);
      }

      // Pipe the response stream directly to the response object
      response.pipe(res);
    }

  } catch (err) {
    console.error('Proxy error:', err.message || err);

    // Redirect if an error occurs in the try-catch
    redirect(req, res);
  }
}

export default proxy;
