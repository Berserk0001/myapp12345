import _ from "lodash";
import axios from "axios";
import { randomDesktopUA } from './ua.js';
import shouldCompress from "./shouldCompress.js";
import redirect from "./redirect.js";
import compress from "./compress1.js";
import copyHeaders from "./copyHeaders.js";
const { pick } = _;


async function proxy(req, res) {
  

  try {
    let response = await axios.get(req.params.url, {
      headers: {
        ...pick(req.headers, ["cookie", "dnt", "referer", "range"]),
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
        "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
        via: "1.1 myapp-hero",
      },
      responseType: "stream",
      timeout: 10000,
      decompress: false,
      maxRedirects: 4,
    });

    if (response.status !== 200) {
     // throw new Error(`Unexpected response status: ${response.status}`);
      redirect(req, res);
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
    }
   catch (err) {
  //  console.error("Proxy error:", err.message || err);
    redirect(req, res);
  }
}


export default proxy;
