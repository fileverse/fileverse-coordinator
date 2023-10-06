function formatAddress(address) {
  if (!address) return '';
  return address.slice(0, 5) + '...' + address.slice(address.length - 5);
}

module.exports = formatAddress;
