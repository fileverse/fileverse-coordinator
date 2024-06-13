const jobs = require("../jobs");
const agenda = require("../index");
const mintHandler = require('./contractEvents/mint');
const addedFileHandler = require('./contractEvents/addedFiles');
const editedFilesHandler = require('./contractEvents/editedFiles');
const addedCollaboratorHandler = require('./contractEvents/addedCollaborator');
const removedCollaboratorHandler = require('./contractEvents/removedCollaborator');
const updatedPortalMetadataHandler = require('./contractEvents/updatedPortalMetadata');
const registeredCollaboratorKeyHandler = require('./contractEvents/registeredCollaboratorKey');

agenda.define(jobs.CONTRACT_EVENTS, async (job, done) => {
    console.log("Running job", jobs.CONTRACT_EVENTS);
    try {
        await mintHandler();
        await addedFileHandler();
        await editedFilesHandler();
        await addedCollaboratorHandler();
        await removedCollaboratorHandler();
        await updatedPortalMetadataHandler();
        await registeredCollaboratorKeyHandler();
        done();
    } catch (err) {
        await Reporter().alert(jobs.CONTRACT_EVENTS + "::" + err.message, err.stack);
        console.error("Error in job", jobs.CONTRACT_EVENTS, err.message);
        done(err);
    } finally {
        console.log("Job done", jobs.CONTRACT_EVENTS);
    }
});