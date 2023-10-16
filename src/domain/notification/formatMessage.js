function formatMessage({ message, forAddress, by, messageVars = [] }) {
  let resultMessage = message;
  messageVars.map((elem) => {
    const identifier = `${elem.name}`;
    resultMessage = resultMessage.replace(identifier, elem.value);
  });
  return { message: resultMessage, forAddress };
}

module.exports = formatMessage;
