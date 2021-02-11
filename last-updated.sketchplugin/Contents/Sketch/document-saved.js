const sketch = require('sketch');
const Settings = require('sketch/settings');
const Lastupdated = require('./lastupdated-api');
const lastupdated = new Lastupdated("OnDocumentSaved");

var sizeBytes;
var autoSaved;
const verbose = false;

var onDocumentSaved = function (context) {
    if (verbose) console.log("--- Begin of save ---")
    // The action context for this action contains three keys:
    // document: The document where the action was triggered
    // size: The filesize of the saved document, in bytes
    // autoSaved: A BOOL that is true if the document was auto saved by the operating system, and false otherwise

    document = context.actionContext.document;
    sizeBytes = context.actionContext.size;
    autoSaved = context.actionContext.autosaved;

    if (verbose) console.log("Enable all updated increments to be updated again (they are updated once per save)")
    // First delete all saved
    updateIncrements();
    
    if (verbose) console.log("Update all DocumentSaved placeholders on changed artboards")
    // Updates for [lastupdated-size-bytes] and [lastupdated-is-autosaved]
    updatedChangedArtboards();

    function updateIncrements() {
        // Remove from the list, so it will be updated on next documentChanged
        lastupdated.savedIncrementArtboards = [];
    }

    function updatedChangedArtboards() {
        lastupdated.document = document;
        // When using this feature, a resave is needed, because the values are updated only after the save
        lastupdated.sizeBytes = sizeBytes;
        lastupdated.autoSaved = autoSaved;
        lastupdated.updatePlaceholdersInChangedArtboards();
    }

    if (verbose) console.log("--- End of save ---")
};