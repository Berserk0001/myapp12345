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
import compress from "./compress3.js";
import copyHeaders from "./copyHeaders.js";
const { pick } = _;

async function proxy(req, res) {
  try {
  // Use `got` with `isStream: true` to get a streamable response
  const responseStream = got(req.params.url, {
    headers: {
      ...pick(req.headers, ["dnt"]),
      "user-agent": randomDesktopUA(),
      "x-forwarded-for": req.socket.localAddress,
      via: "1.1 2e9b3ee4d534903f433e1ed8ea30e57a.cloudfront.net (CloudFront)",
    },
    decompress: false,
    maxRedirects: 4,
    throwHttpErrors: false, // Non-2xx responses won't throw
    isStream: true, // Enables streaming behavior
  });

  // Listen to the `response` event to check for the status code and headers
  responseStream.on('response', (httpResponse) => {
    if (httpResponse.statusCode >= 300 || httpResponse.statusCode >= 400 || httpResponse.statusCode >= 500 ) {
     // req.socket.destroy(); // Ensure the socket is destroyed on error
      return redirect(req, res);  // Redirect on any 4xx/5xx error
    }

    // Copy headers and set additional headers if compression is bypassed
    copyHeaders(httpResponse, res);
    res.setHeader('content-encoding', 'identity');
    req.params.originType = httpResponse.headers['content-type'] || '';
    req.params.originSize = httpResponse.headers['content-length'] || 0;

    // Check if compression should be applied
    if (shouldCompress(req)) {
      compress(req, res, responseStream); // Apply compression
    } else {
      res.setHeader("x-proxy-bypass", 1);
      for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
        if (headerName in httpResponse.headers) {
          res.setHeader(headerName, httpResponse.headers[headerName]);
        }
      }
      responseStream.pipe(res); // Directly pipe to response if no compression
    }
  });

  // Catch any errors that occur in the stream and handle them
  responseStream.on('error', (err) => {
   // console.error('Stream error:', err);
    req.socket.destroy(); // Destroy the socket to terminate the connection
  //  redirect(req, res); // Redirect on any error
  });

} catch (err) {
  // Catch any synchronous errors from got setup
 // console.error('Request setup error:', err);
  //req.socket.destroy(); // Destroy the socket to terminate the connection on error
  redirect(req, res); // Redirect on general errors
}
}


export default proxy;
