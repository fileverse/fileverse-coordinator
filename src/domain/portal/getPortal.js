const { Portal } = require("../../infra/database/models");

const InitialMetadata = {
  name: "My Fileverse Portal",
  description:
    "Coming sooooon! I'm exploring the decentralised whiteboards and collaborative documents right now. :)",
  logo: "https://pbs.twimg.com/profile_images/1547472224726450176/dno3PYB6_400x400.jpg",
  cover: "https://s3.fileverse.io/assets/fileversePreview.png",
  socials: {
    twitter: "",
    discord: "",
  },
};

const InititalIPFSHash =
  "bafybeien7z7z4jy2lbtv5oba47s5lu2ttjokbxu7euz2xrnfcgmhbluqji/metadata.json";

async function getPortal({ portalAddress }) {
  let portal = await Portal.findOne({ portalAddress });
  if (!portal) {
    portal = new Portal({
      portalAddress,
      ipfsHash: InititalIPFSHash,
      name: InitialMetadata.name,
      description: InitialMetadata.description,
      logo: InitialMetadata.logo,
      cover: InitialMetadata.cover,
    });
    await portal.save();
  }
  return portal;
}

module.exports = getPortal;
