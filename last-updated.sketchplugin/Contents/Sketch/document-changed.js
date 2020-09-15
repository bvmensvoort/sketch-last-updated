//In the manifest, we told Sketch that every time the `onDocumentChanged` action finishes, we want it
// to run the onDocumentChanged handler in our `document-changed.js` script file.
const Settings = require('sketch/settings');
const Sketch = require('sketch');
const verbose = false;
var onDocumentChanged = function (context) {
    
    if (verbose) console.log("On document changed", context.actionContext);
    var document = Sketch.getSelectedDocument();

    var changes = context.actionContext;
    for (i = 0; i < changes.length; i++) {
        var change = changes[i];
        if (verbose) console.log("The change", change.fullPath());
        
        var artboard = getArtboard(change.object(), change.fullPath(), document);
        if (artboard) markForUpdate(artboard, new Date());
    }
    return;
 
    function getArtboard(objRef, fullPath, document) {
        var artboardToSelect = null;
        layerParentGroup = objRef;

        if (typeof objRef.parentGroup === "undefined") {
            // Don't update when override is updated by the plugin itself
            // Otherwise we will be in a loop
            if (objRef.class() === "MSOverrideValue") {
                // Work to do here
                console.log("ObjectRef", objRef.layerName());
            }
            // Apparently for MSImmutableRectangleShape there is no 'parentGroup' function
            layerParentGroup = getArtboardFallback(fullPath, document);
        }
        
        //get the parent artboard if a layer is selected by the user
        while (layerParentGroup) {
            if (layerParentGroup.class() == "MSArtboardGroup") {
                artboardToSelect = layerParentGroup;
                break;
            }
            layerParentGroup = layerParentGroup.parentGroup();
        };
        return artboardToSelect;

        // Try to get parent based on fullpath
        // Solution from: https://sketchplugins.com/d/1886-ondocumentchange-fullpath/4
        function getArtboardFallback(fullPath, document) {
            // Remove item after last . to get parent
            let path = fullPath.split('.').slice(0, -1);

            // If a style is changed
            // eg. pages[0].layers[0].layers[1].style.fills[0].pattern.image
            let styleIndex = path.indexOf("style");
            if (styleIndex > -1) {
                path = path.slice(0, styleIndex);
            }

            // If overrideValues are mentioned. Remove last item as well
            // eg. pages[0].layers[0].layers[0].overrideValues[9].value
            if (path[path.length-1].indexOf("overrideValues") !== -1) {
                path = path.slice(0, path.length-1);
            }

            // Stitch it together and parse the object
            let parent =  path.reduce(
                (acc, cur) => acc[cur.match(/\w*/)[0]][cur.match(/\d+/)[0]], document)
            
            return parent.sketchObject;
        }
    }

    // Update date in artboard meta info
    function markForUpdate(artboard, date) {
        if (verbose) console.log ("Mark for update", artboard.objectID(), date);
        var changedArtboards = Settings.documentSettingForKey(document, 'last-updated-marked-artboards') || {};
        changedArtboards[artboard.objectID()] = date;
        Settings.setDocumentSettingForKey(document, 'last-updated-marked-artboards', changedArtboards);
    }
};