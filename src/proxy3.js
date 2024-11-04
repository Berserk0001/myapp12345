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

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Request} res 
 */
async function proxy(req, res) {
  try {
    const gotOptions = {
      headers: {
        ...pick(req.headers, ["cookie", "dnt", "referer"]),
        "user-agent": randomMobileUA(),
        "x-forwarded-for": req.headers["x-forwarded-for"] || req.ip,
        via: "1.1 bandwidth-hero",
      },
      https: {
        rejectUnauthorized: false,
      },
      maxRedirects: 5,
      cookieJar,
      timeout: {
        response: 6600, // ms
      },
    };

    const fetchImgStream = got.stream(req.params.url, { ...gotOptions });

    fetchImgStream.on("response", (response) => {
      console.log("[DOWNLOAD] fetch Image from server " + req.path, response.statusCode >= 400 ? response.statusMessage : response.statusCode);

      // Clean-up CF response headers
      console.log("[CLEAN] cleaning up cf-headers " + req.path);
      const cfHeaders = [
        "cf-cache-status",
        "cf-ray",
        "cf-request-id",
        "date",
        "server",
        "report-to",
        "nel",
        "report-policy",
        "cf-polished",
        "cf-bgj",
        "age",
        "strict-transport-security",
        "etag",
        "expires",
        "last-modified",
        "transfer-encoding",
      ];

      cfHeaders.forEach((k) => {
        if (response.headers && response.headers[k]) {
          delete response.headers[k];
        }
      });

      console.log("[CLEANED] cf-headers cleaned " + req.path);

      validateResponse(response);
      copyHeaders(response, res);

      res.setHeader("content-encoding", "identity");
      req.params.originType = response.headers["content-type"] || "";

      if (shouldCompress(req)) {
        compress(req, res, fetchImgStream);
      } else {
        // Bypass compression
        res.setHeader("x-proxy-bypass", 1);

        // Set specific headers
        for (const headerName of ["accept-ranges", "content-type", "content-length", "content-range"]) {
          if (headerName in response.headers) {
            res.setHeader(headerName, response.headers[headerName]);
          }
        }

        return fetchImgStream.pipe(res);
      }
    });

    fetchImgStream.on("error", (error) => {
      console.log("Error while fetching image from server " + req.path + "\n", error, "\n");

      if (error instanceof RequestError) {
        return res.status(503).end("request time out", "ascii");
      }

      redirect(req, res);
    });
  } catch (error) {
    console.log("Some error on " + req.path + "\n", error, "\n");
    redirect(req, res);
  }
}

const validateResponse = (res) => {
  if (res.statusCode >= 400 || !res.headers["content-type"].startsWith("image")) {
    throw Error(
      `Content-type was ${res.headers["content-type"]}, expected content type "image/*", status code ${res.statusCode}`
    );
  }
};

export default proxy;
