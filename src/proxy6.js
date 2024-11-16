import _ from "lodash";
import axios from "axios";
import { randomDesktopUA } from './ua.js';
import shouldCompress from "./shouldCompress.js";
import redirect from "./redirect.js";
import compress from "./compress4.js";
import copyHeaders from "./copyHeaders.js";
const { pick } = _;

function proxy(req, res) {
  let userAgent = randomDesktopUA();

  axios.get(req.params.url, {
    headers: {
      ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
      "user-agent": userAgent,
      "x-forwarded-for": req.socket.localAddress,
      via: "1.1 2e9b3ee4d534903f433e1ed8ea30e57a.cloudfront.net (CloudFront)",
    },
    responseType: "stream",
    timeout: 10000,
    decompress: true,
    maxRedirects: 4
  })
    .then(response => {
      if (response.status !== 200) {
        // If the status is not 200, handle the redirect
        return redirect(req, res);
      }

      copyHeaders(response, res);
      res.setHeader("content-encoding", "identity");
      req.params.originType = response.headers["content-type"] || "";
      req.params.originSize = parseInt(response.headers["content-length"], 10) || 0;

      // Handle streaming response
      response.data.on('error', () => req.socket.destroy());

      if (shouldCompress(req)) {
        return compress(req, res, response);
      } else {
        // Bypass compression
        res.setHeader("x-proxy-bypass", 1);

        // Set specific headers
        for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
          if (headerName in response.headers) res.setHeader(headerName, response.headers[headerName]);
        }

        return response.data.pipe(res);
      }
    })
    .catch(err => {
      // Log error if needed, otherwise redirect on failure
      console.error("Proxy error:", err.message || err);
      redirect(req, res);
    });
}

export default proxy;
