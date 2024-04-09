const config = require('../../../config');
const axios = require('axios');

/**
 * Array of IPFS base URLs.
 * If `config.IPFS_BASE_URLS` is defined, it will be split by comma (',') to form the array.
 * Otherwise, a default array of IPFS base URLs will be used.
 */
const IPFS_BASE_URLS = config.IPFS_BASE_URLS ? config.IPFS_BASE_URLS.split(',') : [
  'https://w3s.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.fileverse.io/ipfs/',
];

/**
 * Fetches metadata from IPFS for a given hash.
 * @param {string} hash - The IPFS hash to fetch metadata for.
 */
async function fetchMetadataFromIPFS(hash) {
  const fetchPromises = IPFS_BASE_URLS.map(url => axios.get(url + hash));
  const result = await Promise.any(fetchPromises);
  return result?.data;
}

module.exports = fetchMetadataFromIPFS;