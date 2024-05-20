
const urlMetadata = require('url-metadata');
const warpcast = require('./warpcast');


async function parser(url) {
    url.endsWith('/') ? url = url.slice(0, -1) : null;
    if (url.indexOf('warpcast.com') === -1) {
        return ["unidentified", await urlMetadata(url)];
    }

    let endpoint = url.split('warpcast.com')[1];
    if (endpoint === '/' || endpoint === '') {
        return ["unidentified", await urlMetadata(url)];
    }

    endpoint.startsWith('/') ? endpoint = endpoint.slice(1) : null;

    endpoint = endpoint.split('/');
    if (endpoint.length === 1) {
        return ["warpcast::profile", await warpcast.getProfileMetadata(url)];
    } else if (endpoint[0] === '~' && endpoint[1] === 'channel') {
        return ["warpcast::channel", await warpcast.getChannelMetadata(url)];
    }

    return ["warpcast::cast", await warpcast.getCastMetadata(url)];

}

async function parseUrl(req, res) {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'url is required' });
    }

    let resp = {
        urlType: "",
        data: {},
        error: null,
    }

    try {
        const [urlType, data] = await parser(url);
        resp.data = data;
        resp.urlType = urlType;
        return res.status(200).json(resp);
    } catch (err) {
        console.log(err);
        resp.error = 'Error parsing url: ' + err.message
        return res.status(500).json(resp);
    }

}

module.exports = parseUrl;