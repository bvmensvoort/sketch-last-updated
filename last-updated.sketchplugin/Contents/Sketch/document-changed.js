//In the manifest, we told Sketch that every time the `onDocumentChanged` action finishes, we want it
// to run the onDocumentChanged handler in our `document-changed.js` script file.
const Settings = require('sketch/settings');
const Sketch = require('sketch');
const verbose = false;
const placeholders = [
    "[lastupdated]", 
    "[lastupdatedus]", 
    "[lastupdated-full-date]",
    "[lastupdated-full-dateus]",
    "[lastupdated-time]",
    "[lastupdated-year]",
    "[lastupdated-month]",
    "[lastupdated-month-str]",
    "[lastupdated-date]",
    "[lastupdated-day]",
    "[lastupdated-day-str]",
    "[lastupdated-hour]",
    "[lastupdated-minute]",
    "[lastupdated-second]",
    "[lastupdated-image]",
    "[lastupdated-increment]",
    "[lastupdated-size-bytes]",
    "[lastupdated-is-autosaved]"
];
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
        let artboardToSelect = null;
        let layerParentGroup = objRef;
        let isPlaceholderChanged = false;

        if (typeof objRef.parentGroup === "undefined") {
            // Don't update when override is updated by the plugin itself
            // Otherwise we will be in a loop
            

            // Apparently for MSImmutableRectangleShape there is no 'parentGroup' function
            layerParentGroup = getObjectFromFullPath(fullPath, document);

            // Skip change when it is a [lastupdated] placeholder
            if (objRef.class().toString() == "MSOverrideValue") {    // === doesn't work for some reason
                isPlaceholderChanged = detectPlaceholderInOverride(objRef, layerParentGroup);
                if (isPlaceholderChanged) {
                    if (verbose) console.log("This change is caused by this plugin, ignore change to prevent a loop.");
                    return artboardToSelect;
                }
            }
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
        function getObjectFromFullPath(fullPath, document) {
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

        function detectPlaceholderInOverride(overrideValueReference, object) {
            let isPlaceholder = false;
            let overrideId = overrideValueReference.overrideName().toString();

            // Find overridePoint in order to get the name of the changed overrideValue
            let matchingOverridePoint = object.overridePoints().find(function (overridePoint) {
                return overridePoint.name().toString()+"" == overrideId;
            });

            // Check if overridePoint matches a placeholder name
            if (matchingOverridePoint) {
                isPlaceholder = placeholders.includes(matchingOverridePoint.layerName().toLowerCase());
            }

            return isPlaceholder;
        }
    }

    // Update date in artboard meta info
    function markForUpdate(artboard, date) {
        if (verbose) console.log ("Mark for update", artboard.objectID(), date);
        var changedArtboards = Settings.documentSettingForKey(document, 'last-updated-marked-artboards') || {};
        changedArtboards[artboard.objectID()] = date;
        
        applyWithoutUndo()
            .then(() =>{
                Settings.setDocumentSettingForKey(document, 'last-updated-marked-artboards', changedArtboards);
            })
        ;
    }

    function applyWithoutUndo() {
        return new Promise((resolve)=> {
            document.sketchObject.historyMaker().ignoreDocumentChangesInBlock(
                __mocha__.createBlock_function('v8@?0', () => {
                    // do stuff here that you don't want in the undo stack
                    resolve();
                })
            )
        });
    }
};