'use strict';
exports.handler = (event, context, callback) => {
    
//Get contents of response
const response = event.Records[0].cf.response;
const headers = response.headers;

// Set Content Security Policy header
const img_src = [
  "'self'",
  "data:",
].join(" ");

let script_src = [
  "'self'"
].join(" ");

// Allowing unsafe-eval for development environment
if (event.Records[0].cf.config.distributionId === "E1TU2EGCZDDALR"){
  script_src += " 'unsafe-eval'";
}

const style_src = [
  "'self'",
  "'unsafe-inline'",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/all.min.css"
].join(" ");

const object_src = [
  "'none'",
].join(" ");

const child_src = [
  "'none'",
].join(" ");

const font_src = [
  "'self'",
  "data:",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/webfonts/"
].join(" ");

const frame_ancestors = [
  "'self'",
].join(" ");

const connect_src = [
 "'self'",
 "https://*.amazonaws.com"
].join(" ");

const header_csp_val = [
  "default-src 'none'",
  "img-src " + img_src,
  "script-src " + script_src,
  "style-src " + style_src,
  "object-src " + object_src,
  "child-src " + child_src,
  "font-src " +  font_src,
  "frame-ancestors " + frame_ancestors,
  "connect-src " + connect_src
].join(";");

const header_csp = [{key: 'Content-Security-Policy', value: header_csp_val}];


//Set new headers 
 headers['strict-transport-security'] = [{key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubdomains; preload'}]; 
 headers['content-security-policy'] = header_csp;

 headers['x-content-type-options'] = [{key: 'X-Content-Type-Options', value: 'nosniff'}]; 
 headers['x-frame-options'] = [{key: 'X-Frame-Options', value: 'DENY'}]; 
 headers['x-xss-protection'] = [{key: 'X-XSS-Protection', value: '1; mode=block'}]; 
 headers['referrer-policy'] = [{key: 'Referrer-Policy', value: 'same-origin'}]; 
    
    //Return modified response
    callback(null, response);
};
