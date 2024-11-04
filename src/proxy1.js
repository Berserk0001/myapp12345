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

export default async function proxy(req, res) {
  /*
   * Avoid loopback that could cause server hang.
   */
  if (
    req.headers["via"] === "1.1 bandwidth-hero" &&
    ["127.0.0.1", "::1"].includes(req.headers["x-forwarded-for"] || req.ip)
  ) return redirect(req, res);

  try {
    const origin = got.stream(req.params.url, {
      headers: {
        ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
        "user-agent": "Bandwidth-Hero Compressor",
        "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
        via: "1.1 bandwidth-hero",
      },
      maxRedirects: 4,
      followRedirect: false, // We handle redirects manually
      https: {
        rejectUnauthorized: false,
      },
    });

    // Handle errors from the origin
    origin.on('error', (err) => {
      req.socket.destroy(); // Destroy the request socket on error
      //redirect(req, res); // Redirect on error
      //console.error(err);
    });

    // Handle the response from the origin
    origin.on('response', (response) => {
      if (response.statusCode >= 400) {
        return redirect(req, res);
      }

      // Handle redirects
      if (response.statusCode >= 300 && response.headers.location) {
        return redirect(req, res);
      }

      copyHeaders(response, res);
      res.setHeader("content-encoding", "identity");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
      req.params.originType = response.headers["content-type"] || "";
      req.params.originSize = response.headers["content-length"] || "0";

      // Handle streaming and compression
      if (shouldCompress(req)) {
        return compress(req, res, origin);
      } else {
        res.setHeader("x-proxy-bypass", 1);

        for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
          if (headerName in response.headers) {
            res.setHeader(headerName, response.headers[headerName]);
          }
        }

        return origin.pipe(res);
      }
    });

  } catch (err) {
    if (err.code === "ERR_INVALID_URL") {
      return res.status(400).send("Invalid URL");
    }
    redirect(req, res);
    console.error(err);
  }
}
