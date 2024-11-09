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

 function proxy(req, res) {
  try {
  // Define the common options for `got`
  const options = {
    headers: {
      ...pick(req.headers, ["dnt"]),
      "user-agent": randomDesktopUA(),
      "x-forwarded-for": req.socket.localAddress,
      via: "1.1 2e9b3ee4d534903f433e1ed8ea30e57a.cloudfront.net (CloudFront)",
    },
    decompress: false,
    maxRedirects: 4,
    throwHttpErrors: false, // Allow handling of non-2xx responses
  };

  // Make the request using `got`, spreading `options` and adding `isStream: true`
  let responseStream = got(req.params.url, { ...options, isStream: true });

  // Listen for the response event to check status and set headers
  responseStream.on('response', (httpResponse) => {
    if (httpResponse.statusCode >= 400) {
     // req.socket.destroy(); // Close the socket if there's an error status
      return redirect(req, res);  // Redirect on any 4xx/5xx error
    }

    // Copy headers from the origin and set additional response headers
    copyHeaders(httpResponse, res);
    res.setHeader('content-encoding', 'identity');
    req.params.originType = httpResponse.headers['content-type'] || '';
    req.params.originSize = httpResponse.headers['content-length'] || 0;

    // Decide whether to compress the response or pass it through
    if (shouldCompress(req)) {
      compress(req, res, responseStream); // Send through compression pipeline
    } else {
      res.setHeader("x-proxy-bypass", 1);
      for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
        if (headerName in httpResponse.headers) {
          res.setHeader(headerName, httpResponse.headers[headerName]);
        }
      }
      responseStream.pipe(res); // Pipe directly if bypassing compression
    }
  });

  // Handle any errors in the stream and close the socket
  responseStream.on('error', (err) => {
   // console.error('Stream error:', err);
    req.socket.destroy(); // Close the socket on error
   // redirect(req, res); // Redirect or handle the error gracefully
  });

} catch (err) {
  // Catch any synchronous errors from got setup
//  console.error('Request setup error:', err);
//  req.socket.destroy(); // Close the socket on setup error
  redirect(req, res); // Redirect on general errors
}

}


export default proxy;
