const _errorHandler = require('../infra/errorHandler');
const config = require('./../../config');
const { validator } = require('./../interface/middleware');
const { Joi, validate } = validator;
const ucans = require('ucans');

const loginValidation = {
  params: Joi.object({
    address: Joi.string().required(),
  }),
  body: Joi.object({
    signature: Joi.string().required(),
    message: Joi.string().required(),
  }),
};

async function createToken(address) {
  const secret = config.DID_SECRET;
  const keypair = ucans.EdKeypair.fromSecretKey(secret.trim());
  const ucan = await ucans.build({
    audience: config.SERVICE_DID,
    issuer: keypair,
    lifetimeInSeconds: 7 * 86400,
    capabilities: [
      {
        with: {
          scheme: 'auth',
          hierPart: address.toLowerCase(),
        },
        can: { namespace: 'token', segments: ['CREATE'] },
      },
    ],
  });
  const token = ucans.encode(ucan);
  return token;
}

async function verifySignature({ address, message, signature }) {
  const adr = await ethers.utils.verifyMessage(message, signature);
  return adr.toLowerCase() === address.toLowerCase();
}

async function login(req, res) {
  const { address } = req.params;
  const { message, signature } = req.body;
  const isSignatureValid = await verifySignature({
    address,
    message,
    signature,
  });
  if (!isSignatureValid) {
    return _errorHandler.throwError({
      code: 400,
      message: `Signature is not valid for address: ${address}`,
    });
  }
  const token = await createToken(address);
  res.json({ token });
}

module.exports = [validate(loginValidation), login];
