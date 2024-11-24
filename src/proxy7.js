"use strict";
/*
 * proxy.js
 * The bandwidth hero proxy handler.
 * proxy(httpRequest, httpResponse);
 */
import _ from "lodash";
import axios from "axios";
import { randomDesktopUA } from './ua.js'
import shouldCompress from "./shouldCompress.js";
import redirect from "./redirect.js";
import compress from "./compress6.js";
import copyHeaders from "./copyHeaders.js";
const { pick } = _;

async function proxy(req, res) {
  // Avoid loopback that could cause server hang.
  if (
    req.headers["via"] === "1.1 bandwidth-hero" &&
    ["127.0.0.1", "::1"].includes(req.headers["x-forwarded-for"] || req.ip)
  ) {
    return redirect(req, res);
  }

  try {
    // Fetch the resource using axios.
    let origin = await axios.get(req.params.url, {
      headers: {
        ..._.pick(req.headers, ["cookie", "dnt", "referer", "range"]),
        "user-agent": "Bandwidth-Hero Compressor",
        "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
        via: "1.1 bandwidth-hero",
      },
      responseType: "stream",
      maxRedirections: 4,
    });

    // Handle successful response.
    if (origin.status >= 400 || (origin.status >= 300 && origin.headers.location)) {
      return redirect(req, res);
    }

    copyHeaders(origin, res);
    res.setHeader("content-encoding", "identity");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    req.params.originType = origin.headers["content-type"] || "";
    req.params.originSize = origin.headers["content-length"] || "0";

    if (shouldCompress(req)) {
      return compress(req, res, origin);
    } else {
      res.setHeader("x-proxy-bypass", 1);
      ["accept-ranges", "content-type", "content-length", "content-range"].forEach(header => {
        if (origin.headers[header]) {
          res.setHeader(header, origin.headers[header]);
        }
      });

      return origin.data.pipe(res);
    }
  } catch (err) {
    // Inline error handling.
    if (err.code === "ERR_INVALID_URL") {
      return res.status(400).send("Invalid URL");
    }
    console.error(err);
    redirect(req, res);
  }
}



export default proxy;
