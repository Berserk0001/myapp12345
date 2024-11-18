"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
import _ from "lodash";
import got from "got";
import { randomDesktopUA } from './ua.js'
import shouldCompress from "./shouldCompress.js";
import redirect from "./redirect.js";
import compress from "./compress1.js";
import copyHeaders from "./copyHeaders.js";
const { pick } = _;

function proxy(req, res) {
  try {
    // Fetch the image as a stream using `got`
    let userAgent = randomDesktopUA();
    let responseStream = got.stream(req.params.url, {
      headers: {
        ...pick(req.headers, ["dnt"]),
        "user-agent": userAgent,
        "x-forwarded-for": req.socket.localAddress,
        via: "1.1 2e9b3ee4d534903f433e1ed8ea30e57a.cloudfront.net (CloudFront)",
      },
      decompress: true,
      maxRedirects: 4, // Handles redirections
      throwHttpErrors: false // Do not throw errors for non-2xx responses
    });

    // Handle the response before streaming
    responseStream.on('response', (httpResponse) => {
      if (httpResponse.statusCode !== 200) {
        // Redirect if the status is not 200
        return redirect(req, res);
      }

      // Set originType and originSize parameters
      req.params.originType = httpResponse.headers['content-type'] || '';
      req.params.originSize = httpResponse.headers['content-length'] || 0;

      // Copy headers and set necessary response headers
      copyHeaders(httpResponse, res);
      res.setHeader('content-encoding', 'identity');

      // Bypass compression if the response is not an image or should not be compressed
      if (!req.params.originType.startsWith('image') || !shouldCompress(req)) {
        res.setHeader("x-proxy-bypass", 1);
        // Set specific headers for bypassed content
        for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
          if (headerName in httpResponse.headers) res.setHeader(headerName, httpResponse.headers[headerName]);
        }
        responseStream.pipe(res); // Pipe non-compressed response directly
      } else {
        compress(req, res, responseStream); // Send stream to compression
      }
    });

    // Handle stream errors by attaching the error handler upfront
    responseStream.on('error', () => req.socket.destroy());

  } catch (err) {
    console.error('Proxy error:', err.message || err);
    // Redirect if an error occurs in the try-catch
    return redirect(req, res);
  }
}

export default proxy;
