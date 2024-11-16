import _ from "lodash";
import axios from "axios";
import { randomDesktopUA } from './ua.js';
import shouldCompress from "./shouldCompress.js";
import redirect from "./redirect.js";
import compress from "./compress1.js";
import copyHeaders from "./copyHeaders.js";
const { pick } = _;

async function proxy(req, res) {
  const userAgent = randomDesktopUA();
  const axiosConfig = {
    method: 'get',
    url: req.params.url,
    responseType: 'stream',
    headers: {
      ...pick(req.headers, ["dnt"]),
      "user-agent": userAgent,
      "x-forwarded-for": req.socket.localAddress,
      via: "1.1 2e9b3ee4d534903f433e1ed8ea30e57a.cloudfront.net (CloudFront)",
    },
    maxRedirects: 4, // Handles redirections
    validateStatus: null, // Do not throw errors for non-2xx responses
  };

 await axios(axiosConfig)
    .then((axiosResponse) => {
      if (axiosResponse.status !== 200) {
        // Redirect if the status is not 200
        return redirect(req, res);
      }

      // Set originType and originSize parameters
      req.params.originType = axiosResponse.headers['content-type'] || '';
      req.params.originSize = axiosResponse.headers['content-length'] || 0;

      // Copy headers and set necessary response headers
      copyHeaders(axiosResponse.headers, res);
      res.setHeader('content-encoding', 'identity');

      // Bypass compression if the response is not an image or should not be compressed
      if (!req.params.originType.startsWith('image') || !shouldCompress(req)) {
        res.setHeader("x-proxy-bypass", 1);
        // Set specific headers for bypassed content
        for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
          if (headerName in axiosResponse.headers) res.setHeader(headerName, axiosResponse.headers[headerName]);
        }
        axiosResponse.data.pipe(res); // Pipe non-compressed response directly
      } else {
        compress(req, res, axiosResponse); // Send stream to compression
      }
    })
    .catch((err) => {
      console.error('Proxy error:', err.message || err);
      // Redirect if an error occurs
      redirect(req, res);
    });
}

export default proxy;