const formatAddress = require('./formatAddress');

function formatMessage({ message, messageVars = [] }) {
  let resultMessage = message;
  messageVars.map((elem) => {
    if (elem.type === 'address') elem.value = formatAddress(elem.value);
    const identifier = `{{${elem.name}}}`;
    resultMessage = resultMessage.replace(identifier, elem.value);
  });
  return resultMessage;
}

module.exports = formatMessage;
