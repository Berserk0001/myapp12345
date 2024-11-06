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

  let responseStream;

  try {
    // Fetch the image as a stream using `got`
    responseStream = got.stream(req.params.url, {
      headers: {
        ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
        "user-agent": "Bandwidth-Hero Compressor",
        "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
        via: "1.1 bandwidth-hero",
      },
     // method: 'GET',
      maxRedirects: 4, // Handles redirections
      throwHttpErrors: false, // Do not throw errors for non-2xx responses
    });

    // Set up immediate handling based on the initial status code and headers
    const httpResponse = await responseStream;

    if (httpResponse.statusCode !== 200) {
      console.error(`Unexpected response status: ${httpResponse.statusCode}`);
      redirect(req, res);
      responseStream.destroy(); // Destroy the stream after redirect
      return;
    }

    // Copy headers and set necessary response headers
    copyHeaders(httpResponse, res);
    res.setHeader('content-encoding', 'identity');

    req.params.originType = httpResponse.headers['content-type'] || '';
    req.params.originSize = parseInt(httpResponse.headers['content-length'], 10) || 0;

    // Check if the response should be compressed
    if (shouldCompress(req)) {
      compress(req, res, responseStream); // Send stream to compression
    } else {
      // Bypass compression
      res.setHeader("x-proxy-bypass", 1);

      // Set specific headers
      for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
        if (headerName in httpResponse.headers) res.setHeader(headerName, httpResponse.headers[headerName]);
      }

      responseStream.pipe(res);
    }

    // Stream error handling: redirect first, then destroy the stream if errors occur
  /*  responseStream.on('error', (err) => {
      console.error('Stream error:', err);
      redirect(req, res); // Redirect first
      responseStream.destroy(); // Destroy the stream after redirect
    });*/

  } catch (err) {
    console.error('Proxy error:', err.message || err);

    // Redirect if an error occurs in the try-catch
    redirect(req, res);

   /* if (responseStream) {
      responseStream.destroy(); // Destroy the response stream if it was initialized
    }*/
  }
}

export default proxy;
