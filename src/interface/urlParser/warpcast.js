const { NeynarAPIClient, CastParamType } = require("@neynar/nodejs-sdk");
const config = require('../../../config');

const NEYNAR_API_KEY = config.NEYNAR_API_KEY;

const client = new NeynarAPIClient(NEYNAR_API_KEY);

async function getChannelMetadata(url) {
    // channel name stays here /~/channel/<channelName>/...
    const channelName = url.split('/~/channel/')[1].split('/')[0];
    const channel = await client.lookupChannel(channelName);
    if (!channel) {
        throw new Error('Channel not found');
    }
    return channel?.channel;
}

async function getProfileMetadata(url) {
    const username = url.split('/').pop();
    const user = await client.lookupUserByUsername(username);
    if (!user) {
        throw new Error('User not found');
    }

    return user?.result?.user;
}
async function getCastMetadata(url) {
    const cast = await client.lookUpCastByHashOrWarpcastUrl(url, CastParamType.Url);
    if (!cast) {
        throw new Error('Cast not found');
    }
    return cast?.cast;
}

module.exports = { getCastMetadata, getChannelMetadata, getProfileMetadata };