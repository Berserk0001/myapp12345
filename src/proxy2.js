"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
import _ from "lodash";
import got, { RequestError } from "got";
import shouldCompress from "./shouldCompress.js";
import redirect from "./redirect.js";
import compress from "./compress.js";
import copyHeaders from "./copyHeaders.js";
import { CookieJar } from "tough-cookie";
const cookieJar = new CookieJar();
const { pick } = _;

function proxy(req, res) {
  

  try {
  const gotoptions = {
    headers: {
      ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.3",
    },
      https: {
        rejectUnauthorized: false,
      },
      maxRedirects: 5,
      cookieJar,
      timeout: {
        response: 6600 // ms
      }
  };
    
    let origin = got.stream(req.params.url, gotoptions);

    origin.on('response', (originResponse) => {
     /* if (originResponse.statusCode >= 300 && originResponse.headers.location) {
        // Redirect if status is 4xx or redirect location is present
        return redirect(req, res);
      }*/

      validateResponse(originResponse)

      // Copy headers to response
      copyHeaders(originResponse, res);
      res.setHeader("content-encoding", "identity");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
      req.params.originType = originResponse.headers["content-type"] || "";
      req.params.originSize = originResponse.headers["content-length"] || "0";

      // Handle streaming response
      origin.on('error', () => req.socket.destroy());

      if (shouldCompress(req)) {
        // Compress and pipe response if required
        return compress(req, res, origin);
      } else {
        // Bypass compression
        res.setHeader("x-proxy-bypass", 1);

        // Set specific headers
        for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
          if (headerName in originResponse.headers) res.setHeader(headerName, originResponse.headers[headerName]);
        }

        return origin.pipe(res);
      }
    });
  } catch (error) {
    if (error instanceof RequestError) {
      console.log(error);
      return res.status(503).end('request time out', 'ascii');
    }
    console.log("some error on ");
    return redirect(req, res);
  }
}

  const validateResponse = (res) => {
  if ( res.statusCode >= 400 || !res.headers['content-type'].startsWith('image')) {
    throw Error(`content-type was ${res.headers['content-type']} expected content type "image/*" , status code ${res.statusCode}`)
  };
  }
export default proxy;
