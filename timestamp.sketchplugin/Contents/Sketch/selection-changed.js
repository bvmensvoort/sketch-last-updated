//In the manifest, we told Sketch that every time the `SelectionChanged` action finishes, we want it
// to run the onSelectionChanged handler in our `selection-changed.js` script file.


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

    //capturing the date and formatting it
    var d = new Date();
    var date = d.getDate() + "-" + d.getMonth() + "-" + d.getFullYear();
    var time = z(d.getHours()) + ":" + z(d.getMinutes());

    function z(object, targetLength = 2, padString = "0") {
        return (object + "").padStart(targetLength, padString);
    }

    // get the selection count.
    count = selection.count();

    if (count == 0) {
        console.log("Hide message");
        // If nothing is selected, we just want to hide any previous message that might have been shown.
        //document.hideMessage();

    } else {

        var layerParentGroup = selection[0];
        var artboardToSelect = null;
        //var names = ["last changed", "lastchanged", "date", "Date", "timestamp", "Timestamp"]

        //get the parent artboard if a layer is selected by the user
        while (layerParentGroup) {
            if (layerParentGroup.class() == "MSArtboardGroup")) {
                artboardToSelect = layerParentGroup;
                break;
            }

            layerParentGroup = layerParentGroup.parentGroup();
        };

        //loop to iterate on children
        for (var i = 0; i < artboardToSelect.children().length; i++) {

            var sublayer = artboardToSelect.children()[i];

            var replacements = new Map([
                ["[timestamp-date]", date],
                ["[timestamp-time]", time],
                ["[timestamp]", date + " " + time],
                ["[timestamp-image]"]
            ]);

            replacements.forEach((replacementValue, replacementKey) => {
                if (sublayer.name().toLowerCase() === replacementKey) {
                    sublayer.setStringValue(replacementValue);
                }
                else if (sublayer.hasOwnProperty("overrides")) {
                    sublayer.overridePoints().forEach(function(overridePoint){
                        // Some code how to set overrides: https://sketchplugins.com/d/385-viewing-all-overrides-for-a-symbol/7
                        if (overridePoint.layerName().toLowerCase() === replacementKey) {
                            sublayer.setValue_forOverridePoint_(replacementValue, overridePoint);
                        }
                    });
                }
            });
        };
    };
};