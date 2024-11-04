"use strict";

const DEFAULT_QUALITY = 40;

export default function params(req, res, next) {
  const encodedUrl = req.query.url;
  
  if (!encodedUrl) {
    return res.send("bandwidth-hero-proxy");
  }

  // Decode the URL
  let url = decodeURIComponent(encodedUrl);

  // Remove proxy prefix and ensure HTTPS
  const cleanedUrl = url.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, 'https://');
  
  // Assign to req.params
  req.params.url = cleanedUrl;
  req.params.webp = !req.query.jpeg;
  req.params.grayscale = req.query.bw !== "0";
  req.params.quality = parseInt(req.query.l, 10) || DEFAULT_QUALITY;

  next();
}
