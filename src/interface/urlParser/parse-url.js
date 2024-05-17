
const urlMetadata = require('url-metadata');
const warpcast = require('./warpcast');


async function parser(url) {
    if (url.match(/^https?:\/\/(www\.)?warpcast.com\/\d+\/\w+/)) {
        return ["warpcast::cast", await warpcast.getCastMetadata(url)];
    } else if (url.match(/^https?:\/\/(www\.)?warpcast.com\/~\/.+/)) {
        return ["warpcast::channel", await warpcast.getChannelMetadata(url)];
    } else if (url.match(/^https?:\/\/(www\.)?warpcast.com\/.+/)) {
        return ["warpcast::profile", await warpcast.getProfileMetadata(url)];
    } else {
        return ["unidentified", await urlMetadata(url)];
    }
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