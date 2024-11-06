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
        ...pick(req.headers, ["dnt"]),
        "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "x-forwarded-for": req.socket.localAddress,
        via: "HTTP/1.1 GWA",
      },
      maxRedirects: 4, // Handles redirections
      throwHttpErrors: false, // Do not throw errors for non-2xx responses
     // timeout: 5000, // Timeout for the request (in ms)
    });

    // Handle stream errors by attaching the error handler upfront
    responseStream.on('error', (err) => {
    //  console.error('Stream error:', err);
     // redirect(req, res); // Redirect the client on error
      responseStream.destroy(); // Clean up the stream
    });

    // Handle the response before streaming
    responseStream.once('response', (httpResponse) => {
      if (httpResponse.statusCode !== 200) {
        // If the response status is not 200, redirect the client
        redirect(req, res);
       // responseStream.destroy(); // Destroy the stream after redirect
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
        // Bypass compression and pipe the response directly
        res.setHeader("x-proxy-bypass", 1);
        // Set specific headers
        for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
          if (headerName in httpResponse.headers) res.setHeader(headerName, httpResponse.headers[headerName]);
        }
        responseStream.pipe(res);
      }
    });

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
