//In the manifest, we told Sketch that every time the `onDocumentChanged` action finishes, we want it
// to run the onDocumentChanged handler in our `document-changed.js` script file.
//const Settings = require('sketch/settings');
const Sketch = require('sketch');
const Lastupdated = require('./lastupdated-api');
const lastupdated = new Lastupdated("OnDocumentChanged");
const verbose = false;

var onDocumentChanged = function (context) {
    if (verbose) console.log("--- Begin of change ---", context.actionContext)
    var document = Sketch.getSelectedDocument();

    lastupdated.document = document.sketchObject;

    let changes = context.actionContext;
    let changedArtboards = lastupdated.getChangedArtboardsFromChanges(changes, document);
    if (verbose) console.log("Get changed artboard from changes, result: ", changedArtboards, lastupdated);
    
    lastupdated.mergeChangedArtboardsWith(changedArtboards);
    if (verbose) console.log("Merge changed artboards with, result: ", changedArtboards, lastupdated);
    
    lastupdated.updatePlaceholdersInChangedArtboards(context);

    if (verbose) console.log("Pagination is " + (lastupdated.isPaginationUpdateNeeded? "": "not ") + "needed.");
    if (lastupdated.isPaginationUpdateNeeded) {
        setTimeout(()=>{lastupdated.updatePagination()}, 5000);
    }

    if (verbose) console.log("--- End of change ---")
    return;
};