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

const { pick } = _;

const validateResponse = (res) => {
  if (res.statusCode >= 400 || !res.headers['content-type'].startsWith('image') || (res.statusCode >= 300 && res.headers.location)) {
  //  throw Error(`content-type was ${res.headers['content-type']} expected content type "image/*" , status code ${res.statusCode}`)
   return redirect(req, res);
  };
}

export default function proxy(req, res) {
  /*
   * Avoid loopback that could cause server hang.
   */
  if (
    req.headers["127.0.0.1", "::1"].includes(req.headers["x-forwarded-for"] || req.ip)
  )
    return redirect(req, res);
  
  

  try {
    const url = req.params.url;
  const options = {
    headers: {
      ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.3",
    },
      maxRedirects: 4,
   followRedirect: false, // We handle redirects manually
      https: {
        rejectUnauthorized: false,
      },
      cookieJar,
      timeout: {
        response: 6600 // ms
      },
   throwHttpErrors: false, 
  };
    
    let origin = got.stream(url, options);

    

    origin.on('response', (originResponse) => {

      validateResponse(originResponse)
      
      if (originResponse.statusCode >= 400 || (originResponse.statusCode >= 300 && originResponse.headers.location)) {
        // Redirect if status is 4xx or redirect location is present
        return redirect(req, res);
      }

      // Copy headers to response
      copyHeaders(originResponse, res);
      res.setHeader("content-encoding", "identity");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
      req.params.originType = originResponse.headers["content-type"] || "";
      req.params.originSize = originResponse.headers["content-length"] || "0";

      origin.on("error", (err) => {
      req.socket.destroy(); // Clean up the request socket on error
    });


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
     return redirect(req, res);
     // console.log(error);
    //  return res.status(503).end('request time out', 'ascii');
    }
   // console.log("some error on " + req.path + "\n", error, '\n');
   return redirect(req, res);
    //return res.status(503).end('request time out', 'ascii');
  }
}
