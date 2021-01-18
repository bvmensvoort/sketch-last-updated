//In the manifest, we told Sketch that every time the `onDocumentChanged` action finishes, we want it
// to run the onDocumentChanged handler in our `document-changed.js` script file.
//const Settings = require('sketch/settings');
const Sketch = require('sketch');
const Lastupdated = require('./lastupdated-api');
const lastupdated = new Lastupdated("OnDocumentChanged");
const verbose = false;

var onDocumentChanged = function (context) {
    if (verbose) console.log("On document changed", context.actionContext, lastupdated);

    var document = Sketch.getSelectedDocument();

    let changes = context.actionContext;
    let changedArtboards = lastupdated.getChangedArtboardsFromChanges(changes, document);
    if (verbose) console.log("2nd", changedArtboards, lastupdated);
    
    lastupdated.mergeChangedArtboardsWith(changedArtboards);
    if (verbose) console.log("3rd", changedArtboards, lastupdated);
    lastupdated.updatePlaceholdersInChangedArtboards(context);
    return;
};