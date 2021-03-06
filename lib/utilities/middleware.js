'use strict';
const PathRegExp = require('path-to-regexp');
const Promisie = require('promisie');
const ROUTE_MAP = new Map();

function preTransforms(periodic) {
  return transformRequest.call(periodic, 'pre', periodic.transforms);
}

function postTransforms(periodic) {
  return transformRequest.call(periodic, 'post', periodic.transforms);
}

const transformRequest = (type, tranforms) => (req, res, next) => {
  let transformsObj = tranforms || this.tranforms;
  let transformType = (type === 'pre') ? transformsObj.pre : transformsObj.post;
  let transformsFilters = (transformType[req.method]) ?
    findMatchingRoute(transformType[req.method], (req._parsedOriginalUrl) ? req._parsedOriginalUrl.pathname : req._parsedUrl.pathname) :
    false;
  if (transformsFilters && transformsFilters.length > 0) {
    Promisie.pipe(transformType[req.method][transformsFilters])(req)
      .then(newreq => {
        if (req.redirectResponse) {
          res.redirect(req.redirectResponse);
        } else if (req.sendResponse) {
          res.send(req.sendResponse);
        } else if (req.error) {
          res.status(500).send({
            result: 'error',
            data: {
              error: req.error,
            },
          });
        } else if (!req.sentResponse) {
          req = newreq;
          next();
        }
      })
      .catch(next);
  } else {
    next();
  }
};

function getParameterized(route) {
  if (ROUTE_MAP.has(route)) return ROUTE_MAP.get(route);
  else {
    let keys = [];
    let result = new PathRegExp(route, keys);
    ROUTE_MAP.set(route, {
      re: result,
      keys,
    });
    return { keys, re: result, };
  }
}

function findMatchingRoute(routes, location) {
  let matching;
  location = (/\?[^\s]+$/.test(location)) ? location.replace(/^([^\s\?]+)\?[^\s]+$/, '$1') : location;
  Object.keys(routes).forEach(key => {
    let result = getParameterized(key);
    if (result.re.test(location) && !matching) matching = key;
  });
  return matching;
}

function jsonReq(req) {
  if (req && req.headers && req.headers.accept) {
    return req.headers.accept.indexOf('json') > -1 || req.is('json') || req.query.format === 'json' || /^json$/i.test(req.query.format);
  } else if (req && req.headers && req.headers.accepts) {
    return req.headers.accepts.indexOf('json') > -1 || req.is('json') || req.query.format === 'json' || /^json$/i.test(req.query.format);
  } else {
    return req.is('json') || req.query.format === 'json' || /^json$/i.test(req.query.format);
  }
}

module.exports = {
  preTransforms,
  postTransforms,
  transformRequest,
  getParameterized,
  findMatchingRoute,
  jsonReq,
};