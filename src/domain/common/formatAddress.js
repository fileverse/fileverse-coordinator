function formatAddress(address) {
  if (!address) return '';
  return truncateAddress(address, 4);
}

function truncateAddress(address, length) {
  return address.slice(0, length) + '...' + address.slice(-length);
}

module.exports = formatAddress;
