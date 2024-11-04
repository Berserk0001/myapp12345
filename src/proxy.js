"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
import _ from "lodash";
import got from "got";
import { randomMobileUA } from "./ua.js"
import shouldCompress from "./shouldCompress.js";
import redirect from "./redirect.js";
import compress from "./compress.js";
import copyHeaders from "./copyHeaders.js";
import { CookieJar } from "tough-cookie";

const cookieJar = new CookieJar();

const { pick } = _;


export default async function proxy(req, res) {
  /*
   * Avoid loopback that could cause server hang.
   */
  const clientIP = req.headers["x-forwarded-for"] || req.ip;
  if (["127.0.0.1", "::1"].includes(clientIP)) {
    return redirect(req, res);
  }
  

  try {

    const gotoptions = {
    headers: {
      ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
      "user-agent": randomMobileUA(),
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
     // decompress: true,
    throwHttpErrors: false, // We handle errors based on status code
 //   retry: { limit: 2 }, // Optionally, define retry limits (if needed)
//    timeout: { request: 10000 }
  };
    
    let origin = await got.stream(req.params.url, gotoptions);

    origin.on('response', (originResponse) => {
      
    if (originResponse.statusCode >= 400)
    return redirect(req, res);

  // handle redirects
  if (originResponse.statusCode >= 300 && originResponse.headers.location)
    return redirect(req, res);

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
  } catch (err) {
    // Handle error directly
    if (err.code === "ERR_INVALID_URL") {
      return res.status(400).send("Invalid URL");
    }

    // Redirect on other errors
    redirect(req, res);
    console.error(err);
  }
}
