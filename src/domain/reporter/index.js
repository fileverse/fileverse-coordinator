const Slack = require('./slack');

// write a function that takes in a logger type and returns the corresponding logger
// if the logger type is not supported, return null
const Reporter = (loggerType) => {
    if (loggerType === 'slack' || loggerType === undefined) {
        return Slack;
    }

    throw new Error('Logger type not supported');
};

module.exports = Reporter;