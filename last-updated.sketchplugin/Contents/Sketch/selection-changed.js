//In the manifest, we told Sketch that every time the `SelectionChanged` action finishes, we want it
// to run the onSelectionChanged handler in our `selection-changed.js` script file.
const Settings = require('sketch/settings')
var onSelectionChanged = function (context) {
    
    // ### Extracting Context Information
    // Whenever sketch calls a handler in one of our plugins, it passes in a single context argument.
    // This dictionary is our connection with Sketch itself, and contains all the information that
    // we need to work out which document was open, perform whatever task we want to on it, and so on.

    action = context.actionContext;

    // The context information for each action will be different. For the SelectionChanged action,
    // we are passed three interesting values: which document the selection has changed in,
    // what the old selection was, what the new selection is (or will be).

    document = action.document;
    selection = action.newSelection;

    // get the selection count.
    count = selection.count();

    // Don't try to update if nothing is selected
    if (count == 0) { return; }

    var layerParentGroup = selection[0];
    var artboardToSelect = null;

    //get the parent artboard if a layer is selected by the user
    while (layerParentGroup) {
        if (layerParentGroup.class() == "MSArtboardGroup") {
            artboardToSelect = layerParentGroup;
            break;
        }
        layerParentGroup = layerParentGroup.parentGroup();
    };
    if (artboardToSelect === null) return;

    // Update date in artboard meta info
    var changedArtboards = Settings.documentSettingForKey(document, 'last-updated-marked-artboards') || {};
    changedArtboards[artboardToSelect.objectID()] = new Date();
    Settings.setDocumentSettingForKey(document, 'last-updated-marked-artboards', changedArtboards);
};