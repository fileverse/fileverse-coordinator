const Logger = require('../../../domain/logger');
const config = require("../../../../config");
const agenda = require("../index");
const jobs = require("../jobs");

const xApiKey = config.STORAGE_SECRET_KEY ? config.STORAGE_SECRET_KEY : "";
const storageEndpoint = config.STORAGE_ENDPOINT
  ? config.STORAGE_ENDPOINT
  : "http://127.0.0.1:8001";

agenda.define(jobs.PORTAL_INDEX, async (job, done) => {
  console.log("Running job", jobs.PORTAL_INDEX);
  const url = storageEndpoint + "/portal/index/trigger";
  const myHeaders = new Headers();
  myHeaders.append("x-secret-key", xApiKey);

  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  try {
    fetch(url, requestOptions)
      .then((response) => response.text())
      .then((result) => {
        console.log(result);
      })
      .catch((error) => {
        console.error(error);
      });

    done();
  } catch (err) {
    await Logger.alert(jobs.PORTAL_INDEX + "::" + err.message, err.stack);
    console.error("Error in job", jobs.PORTAL_INDEX, err);
    done(err);
  } finally {
    console.log("Job done", jobs.PORTAL_INDEX);
  }
});
