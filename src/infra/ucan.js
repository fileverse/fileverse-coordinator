const config = require('../../config');
const collaboratorKey = require('./collaboratorKey');
const { v4: uuidv4 } = require('uuid');
const ucans = require('ucans');

const serviceDID = config.SERVICE_DID;

let verify = (req, res, next) => {
  req.requestId = uuidv4();
  console.log('req.requestId: ', req.requestId);
  let token = req.headers['authorization']; // Express headers are auto converted to lowercase
  if (token && token.startsWith('Bearer ')) {
    // Remove Bearer from string
    token = token.slice(7, token.length);
  }

  const invokerAddress = req.headers && req.headers.invoker;
  const chainId = req.headers && req.headers.chain;
  req.isAuthenticated = false;
  req.invokerAddress = invokerAddress;
  req.chainId = chainId;
  const invokerDID = config.ISSUER_DID;
  if (invokerDID) {
    ucans
      .verify(token, {
        // to make sure we're the intended recipient of this UCAN
        audience: serviceDID,
        // capabilities required for this invocation & which owner we expect for each capability
        requiredCapabilities: [
          {
            capability: {
              with: {
                scheme: 'auth',
                hierPart: invokerAddress.toLowerCase(),
              },
              can: { namespace: 'token', segments: ['CREATE'] },
            },
            rootIssuer: invokerDID,
          },
        ],
      })
      .then((result) => {
        console.log(result);
        if (result.ok) {
          req.isAuthenticated = true;
        }
        next();
      });
  } else {
    next();
  }
};

module.exports = { verify };
