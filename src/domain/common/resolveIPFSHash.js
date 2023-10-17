const axios = require('axios');

const IPFS_BASE_URLS = [
  'https://w3s.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.fileverse.io/ipfs/',
];

async function fetchMetadataFromIPFS(hash) {
  const fetchPromises = IPFS_BASE_URLS.map(url => axios.get(url + hash));
  
  const result = await Promise.any(fetchPromises);
  
  return result?.data;
}

module.exports = fetchMetadataFromIPFS;
