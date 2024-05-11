
const urlMetadata = require('url-metadata');

async function parseUrl(req, res) {
    const { url } = req.query;
    try {
        const metadata = await urlMetadata(url);

        let resp = {
            favicons: metadata?.favicons,
            url: metadata?.url,
            title: metadata?.title,
            description: metadata?.description,
        }

        Object.entries(metadata).map(([key, value]) => {
            if (key.startsWith('og:')) {
                resp[key] = value
            }
        });

        return res.json(resp);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Error parsing url: ' + err.message });
    }

}

module.exports = parseUrl;