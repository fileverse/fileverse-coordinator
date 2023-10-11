function formatAddress(address) {
  if (!address) return '';
  return address.slice(0, 4) + '...' + address.slice(address.length - 4);
}

module.exports = formatAddress;
