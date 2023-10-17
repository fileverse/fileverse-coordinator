const formatAddress = require('./formatAddress');

function formatMessage({ message, messageVars = [], portalName }) {
  let resultMessage = message;
  messageVars.map((elem) => {
    if (elem.type === 'address') elem.value = formatAddress(elem.value);
    if (elem.name === 'portalAddress') {
      elem.value = portalName;
    }
    const identifier = `{{${elem.name}}}`;
    resultMessage = resultMessage.replace(identifier, elem.value);
  });
  return resultMessage;
}

module.exports = formatMessage;
