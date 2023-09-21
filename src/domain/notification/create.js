const axios = require('axios');
const config = require('./../../../config');
const { PassThrough } = require('stream');
const request = require('request');
const { Notification } = require('../../infra/database/models');

function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

async function getDataFromIpfs(ipfsHash) {
  const url = `https://dweb.link/${ipfsHash}`;
  const stream = new PassThrough();
  request(url).pipe(stream);
  const data = await streamToString(stream);
  console.log(data);
}

async function createPortalInviteNotifications() {
  const apiURL = config.SUBGRAPH_API;
  const eventName = 'addedCollaborators';
  const notificationType = 'portalInvite';
  let lastBlockTimestamp = 0;
  const latestNotification = await Notification.aggregate([
    { $match: { type: notificationType } },
    {
      $sort: { blockTimestamp: -1 },
    },
    { $limit: 1 },
  ]);

  if (latestNotification.length !== 0) {
    lastBlockTimestamp = latestNotification[0].blockTimestamp;
  }

  const result = await axios.post(apiURL, {
    query: `{
              ${eventName}(first: 1000, orderDirection: asc, orderBy: blockTimestamp, where: {blockTimestamp_gt: ${lastBlockTimestamp}} ) {
                portalAddress,
                account, 
                blockTimestamp,
                by,
              }
            }`,
  });
  const data = result?.data?.data;
  const events = data[eventName];
  let addNotifPromises = [];
  events.map((event) => {
    const notification = new Notification({
      portalAddress: event.portalAddress,
      audience: 'individuals',
      forAddress: event.account,
      content: {
        by: event.by,
      },
      blockTimestamp: event.blockTimestamp,
      type: 'portalInvite',
    });
    addNotifPromises.push(notification.save());
  });
  await Promise.all(addNotifPromises);
}

async function createPortalJoinNotifications() {}

async function createFileAddNotifications() {
  getDataFromIpfs('QmTcWuNWfoNfD3txLgwu2SLuQWXUZHvLtwnUPj9JK6qnXC');
  return 'hello';
  const apiURL = config.SUBGRAPH_API;
  const eventName = 'addedFiles';
  const notificationType = 'addFile';
  let lastBlockTimestamp = 0;
  const latestNotification = await Notification.aggregate([
    { $match: { type: notificationType } },
    {
      $sort: { blockTimestamp: -1 },
    },
    { $limit: 1 },
  ]);

  if (latestNotification.length !== 0) {
    lastBlockTimestamp = latestNotification[0].blockTimestamp;
  }

  const result = await axios.post(apiURL, {
    query: `{
              ${eventName}(first: 1000, orderDirection: asc, orderBy: blockTimestamp, where: {blockTimestamp_gt: ${lastBlockTimestamp}} ) {
                portalAddress,
                fileType,
                fileId,
                by,
                metadataIPFSHash
              }
            }`,
  });
  const data = result?.data?.data;
  const events = data[eventName];
  let addNotifPromises = [];
  events.map((event) => {
    let audience = '';
    let forAddress = [];
    switch (event.fileType) {
      case '0': {
        audience = 'public';
        break;
      }
      case '1': {
        audience = 'collaborators_only';

        break;
      }
      case '2': {
        audience = 'gated';
        break;
      }
      case '3': {
        audience = 'members_only';
        break;
      }
      default: {
        audience = '';
        break;
      }
    }
    console.log(event, 'audience', audience);
    const notification = new Notification({
      portalAddress: event.portalAddress,
      audience: audience,
      forAddress: [],
      content: {
        by: event.by,
        metadataIPFSHash: event.metadataIPFSHash,
        fileType: event.fileType,
      },
      blockTimestamp: event.blockTimestamp,
      type: 'addFile',
    });
    addNotifPromises.push(notification.save());
  });
  await Promise.all(addNotifPromises);
}

async function createFileEditNotifications() {
  const apiURL = config.SUBGRAPH_API;
  const eventName = 'editedFiles';
  const notificationType = 'editFile';
  let lastBlockTimestamp = 0;
  const latestNotification = await Notification.aggregate([
    { $match: { type: notificationType } },
    {
      $sort: { blockTimestamp: -1 },
    },
    { $limit: 1 },
  ]);

  if (latestNotification.length !== 0) {
    lastBlockTimestamp = latestNotification[0].blockTimestamp;
  }

  const result = await axios.post(apiURL, {
    query: `{
              ${eventName}(first: 1000, orderDirection: asc, orderBy: blockTimestamp, where: {blockTimestamp_gt: ${lastBlockTimestamp}} ) {
                portalAddress,
                fileType,
                fileId,
                by,
                metadataIPFSHash
              }
            }`,
  });
  const data = result?.data?.data;
  const events = data[eventName];
  let addNotifPromises = [];
  events.map((event) => {
    let audience = '';
    switch (event.fileType) {
      case 0: {
        audience = 'public';
        break;
      }
      case 1: {
        audience = 'individuals';
        break;
      }
      case 2: {
        audience = 'collaborators_only';
        break;
      }
      case 3: {
        audience = 'members_only';
        break;
      }
      default:
    }
    const notification = new Notification({
      portalAddress: event.portalAddress,
      audience: audience,
      forAddress: event.account,
      content: {
        by: event.by,
        metadataIPFSHash: event.metadataIPFSHash,
        fileType: event.fileType,
      },
      blockTimestamp: event.blockTimestamp,
      type: 'addFile',
    });
    addNotifPromises.push(notification.save());
  });
  await Promise.all(addNotifPromises);
}

async function createAll() {
  const events = [
    {
      eventName: 'addedCollaborators',
      notificationType: 'addCollaborator',
    },
  ];
  createPortalInviteNotifications();
  createFileAddNotifications();
}

module.exports = createAll;
