const Sketch = require('sketch');
const Settings = require('sketch/settings');
const SESSIONVAR = "last-updated-marked-artboards";
const SESSIONVAR_IMAGES = "last-updated-images-seeds";
const SESSIONVAR_INCREMENT = "last-updated-increment-artboards";
const SESSIONVAR_DOCUMENTSAVED = "last-updated-artboards-document-saved";
const SESSIONVAR_PAGINATIONINDEX = "last-updated-pagination-index";
const verbose = false;
var savedArtboardsObject;
var savedImagesSeedsMap;
var savedIncrementArtboardsSet;
var savedArtboardsForDocumentSavedObject;
var savedPaginationIndexObject;

function leadingZero(object, targetLength = 2, padString = "0") {
    return (object + "").padStart(targetLength, padString);
}

class Lastupdated {
    #replacements;

    // Constructor will be run on every Document change
    constructor(eventName = "OnDocumentChanged") {
        this.eventName = eventName;
        // Throttle changes per artboard for performance. When doing a change, wait a few seconds to change all placeholders, to
        // let the system process all code in the background.
        // When a placeholder is changed, the DocumentChange event will fire, this time with the placeholder as detected change.
        // If the throttle time is too low (eg 2000ms), the original event will be merged with this placeholder and the event
        // will fire again. This causes a loop.
        this.throttleTime = (eventName === "OnDocumentChanged"? 5000 : 0);

        this.document = {};     // Should be filled by every event
        this.sizeBytes = "";    // Should be filled for event onDocumentSaved
        this.autoSaved = "";    // Should be filled for event onDocumentSaved

        this.isPaginationUpdateNeeded = false; // Is updating of all pagination placeholders needed? Triggered when artboards change or if pagination placeholder is added


        let d, date, time;
        let self = this;
        let type = "OnDocumentChanged";
        this.#replacements = {};
        this.#replacements[type] = new Map([
            ["[lastupdated]", {type, value: (d) => getFormattedDate(d) + " " + getFormattedTime(d)}],
            ["[lastupdatedus]", {type, value: (d) => (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear() + " " + getFormattedTime(d)}],
            ["[lastupdated-full-date]", {type, value: (d) => getFormattedDate(d)}],
            ["[lastupdated-full-dateus]", {type, value: (d) => (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear()}],
            ["[lastupdated-time]", {type, value: (d) => getFormattedTime(d)}],
            ["[lastupdated-year]", {type, value: (d) => d.getFullYear().toString()}],
            ["[lastupdated-month]", {type, value: (d) => (d.getMonth()+1).toString()}],
            ["[lastupdated-month-str]", {type, value: (d) => ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"][d.getMonth()]}],
            ["[lastupdated-date]", {type, value: (d) => d.getDate().toString()}],
            ["[lastupdated-day]", {type, value: (d) => d.getDay().toString()}],
            ["[lastupdated-day-str]", {type, value: (d) => ["mon","tue","wed","thu","fri","sat","sun"][d.getDay()]}],
            ["[lastupdated-hour]", {type, value: (d) => d.getHours().toString()}],
            ["[lastupdated-minute]", {type, value: (d) => leadingZero(d.getMinutes())}],
            ["[lastupdated-second]", {type, value: (d) => leadingZero(d.getSeconds())}],
            ["[lastupdated-image]", {type, value: (seed, layerId, d, artboard, artboardId, object, overridePoint) => {
                if (verbose) console.log('Generate a new image with seed:', seed);

                // Save new seed first, to prevent timing issues (another change is incoming while still drawing new image)
                let savedImages = self.#savedImagesSeeds;
                savedImages.set(layerId,{seed})
                self.#savedImagesSeeds = savedImages;

                let image = generateImage(seed);
                return image;
            }}],
            ["[lastupdated-increment]", {type, value: (d, artboard, artboardId, object, overridePoint) => {
                let curValue = this.#getCurrentValue(object, overridePoint);
                let increments = self.#savedIncrementArtboards;
                
                // If increment is already increased before saving, do nothing
                if (increments.has(artboardId)) return curValue;

                // Add artboardId to the list, so it won't be updated next documentChanged and will be deleted on save
                increments.add(artboardId);
                self.#savedIncrementArtboards = increments;
            
                // In case of an unknown value, just return the current value
                return isNaN(curValue) || isNaN(parseInt(curValue))? curValue : (parseInt(curValue)+1).toString()
            }}],
            ["[lastupdated-artboard-title]", {type, value: (d, artboard) => artboard.name().toString()}],
            ["[lastupdated-artboard-title-nodash]", {type, value: (d, artboard) => {
                let title = artboard.name().toString();
                // Remove a dash if it is the first character
                // This is a prefix for Invision artboards which prevents them for exporting
                if (title.charAt(0) === "-") title = title.substring(1);
                return title;    
            }}]
        ])
        type = "OnDocumentSaved";
        this.#replacements[type] = new Map([
            ["[lastupdated-size-bytes]", {type, value: () => self.sizeBytes.toString()}],
            ["[lastupdated-is-autosaved]", {type, value: () => self.autoSaved.toString()}]
        ])
        type = "OnPagination";
        this.#replacements[type] = new Map([
            ["[lastupdated-totalpages]", {type, value:() => {
                let artboards = this.document.currentPage().artboards();
                return artboards.length;
            }}],
            ["[lastupdated-totalpages-nodash]", {type, value:() => {
                // Return a new value
                let artboards = this.document.currentPage().artboards();
                let artboardTotal = 0;
                for (let artboardNr = 0; artboardNr < artboards.length; artboardNr++) {
                    if (artboards[artboardNr].name().charAt(0) !== "-") artboardTotal++;
                };
                return artboardTotal;
            }}],
            ["[lastupdated-currentpagenr]", {type, value:(artboard) => {
                // Return a new value
                let artboards = this.document.currentPage().artboards();
                let artboardIndex = null;

                for (let artboardNr = 0; artboardNr < artboards.length; artboardNr++) {
                    if (artboards[artboardNr].objectID() === artboard.objectID()) {
                        artboardIndex = artboardNr;
                        break;
                    }
                }
                return artboardIndex + 1;   // Be 1-based instead of default 0-based
            }}],
            ["[lastupdated-currentpagenr-nodash]", {type, value:(artboard) => {
                // Return a new value
                let artboards = this.document.currentPage().artboards();
                let artboardIndex = 0;
                var artboardInPage;
                for (let artboardNr = 0; artboardNr < artboards.length; artboardNr++) {
                    artboardInPage = artboards[artboardNr];
                    if (artboardInPage.name().charAt(0) !== "-") artboardIndex++;
                    if (artboardInPage.objectID() === artboard.objectID()) break;
                }
                return artboardIndex;   // Be 1-based instead of default 0-based
            }}],
            ["[lastupdated-pagenr-next]", {type, value:(artboard) => {
                // Return a new value
                let artboards = this.document.currentPage().artboards();
                let isCurrentPageFound = false;
                let artboardIndex = null;

                for (let artboardNr = 0; artboardNr < artboards.length; artboardNr++) {
                    if (isCurrentPageFound) {
                        artboardIndex = artboardNr;
                        break;
                    }
                    if (artboards[artboardNr].objectID() === artboard.objectID()) isCurrentPageFound = true;
                }
                if (isCurrentPageFound && artboardIndex !== null) return artboardIndex + 1;   // Be 1-based instead of default 0-based
                return " ";
            }}],
            ["[lastupdated-pagenr-next-nodash]", {type, value:(artboard) => {
                // Return a new value
                let artboards = this.document.currentPage().artboards();
                let isCurrentPageFound = false;
                let artboardIndex = null;
                let isNextPageFound = false;
                let artboardInPage;
                for (let artboardNr = 0; artboardNr < artboards.length; artboardNr++) {
                    artboardInPage = artboards[artboardNr];
                    if (artboardInPage.name().charAt(0) !== "-") {
                        artboardIndex++;
                        if (isCurrentPageFound) {
                            isNextPageFound = true;
                            break;
                        }
                    }
                    if (artboardInPage.objectID() === artboard.objectID()) isCurrentPageFound = true;
                }

                if (isNextPageFound) return artboardIndex;
                return " ";
            }}],
            ["[lastupdated-pagenr-prev]", {type, value:(artboard) => {
                // Return a new value
                let artboards = this.document.currentPage().artboards();
                let artboardIndex = null;
                for (let artboardNr = 0; artboardNr < artboards.length; artboardNr++) {
                    if (artboards[artboardNr].objectID() === artboard.objectID()) break;
                    artboardIndex = artboardNr;
                }
                if (artboardIndex !== null) return artboardIndex + 1;   // Be 1-based instead of default 0-based
                return " ";
            }}],
            ["[lastupdated-pagenr-prev-nodash]", {type, value:(artboard) => {
                // Return a new value
                let artboards = this.document.currentPage().artboards();
                let artboardIndex = null;
                let artboardInPage;
                for (let artboardNr = 0; artboardNr < artboards.length; artboardNr++) {
                    artboardInPage = artboards[artboardNr];
                    if (artboardInPage.objectID() === artboard.objectID()) break;
                    if (artboardInPage.name().charAt(0) !== "-") {
                        artboardIndex++;
                    }
                }

                if (artboardIndex !== null) return artboardIndex;
                return " ";
            }}]
        ])
        type = "all";
        this.#replacements[type] = new Map(
            [...this.#replacements["OnDocumentChanged"]]
            .concat([...this.#replacements["OnDocumentSaved"]])
            .concat([...this.#replacements["OnPagination"]])
        );

        function getFormattedTime(date) {
            if (!date) return "";
            return date.getHours() + ":" + leadingZero(date.getMinutes());
        }
        function getFormattedDate(date) {
            if (!date) return "";
            return date.getDate() + "-" + (date.getMonth()+1) + "-" + date.getFullYear();
        }

        function generateImage(seed) {
            const base64Image = generateImage(seed);
            var imageData = NSData.alloc().initWithBase64EncodedString_options(base64Image, NSDataBase64DecodingIgnoreUnknownCharacters);
            var image = NSImage.alloc().initWithData(imageData);
        
            return image;
        
            function generateImage(seed) {
                const Style = Sketch.Style;
                const ShapePath = Sketch.ShapePath;
                const Rectangle = Sketch.Rectangle;
                const page = Sketch.getSelectedDocument().selectedPage.sketchObject; // It is for temporary use to create the icon
        
                // Use old API to be able to export later
                // https://sketchplugins.com/d/432-insert-new-layer-underneath-other-layers/4
                const group = MSLayerGroup.new();
                group.setName("Blockie");
                page.addLayers([group]);
            
                let shapes = [];
        
                const iconData = new Blockies().renderIcon({seed});
                const iconWidth = Math.sqrt(iconData.length);
                const pixelSize = 10;
                const colors = ['', "#ffffff", "#000000"];
        
                for (let i=0; i<iconData.length && i<200; i++) {
                    const pixel = iconData[i];
                    if (pixel===0) continue;
                    
                    const row = Math.floor(i / iconWidth);
                    const col = i % iconWidth;
        
                    // Use new API where possible
                    shapes.push(new ShapePath({
                        name: "Pixel "+i,
                        frame: new Rectangle(pixelSize * row, pixelSize * col, pixelSize, pixelSize),
                        style: { fills: [{ color: colors[pixel], fillType: Style.FillType.Color }], borders: [] },
                        parent: group
                    }));
                }        
        
                var result = getBase64ImageFromSlice(group);
        
                // Clean up / remove all objects
                shapes.forEach((shape) => shape.remove());
                group.removeFromParent();
        
                return result;
            }
            
            function getBase64ImageFromSlice(slice) {
                // From: https://github.com/Ashung/Automate-Sketch/blob/master/automate-sketch.sketchplugin/Contents/Sketch/Development/Copy_Slice_As_Base64.js
                const exportRequest = MSExportRequest.exportRequestsFromExportableLayer_inRect_useIDForName(
                    slice, slice.absoluteInfluenceRect(), false
                ).firstObject();
                const exporter = MSExporter.exporterForRequest_colorSpace(exportRequest, NSColorSpace.sRGBColorSpace());
                const imageData = exporter.data();
                const base64Code = imageData.base64EncodedStringWithOptions(NSDataBase64EncodingEndLineWithLineFeed);
                return base64Code;
            }
        }
    }
    get #savedArtboards() {
        // Format:
        // {artboardId: {lastModified, ?willBeUpdated, ?artboard}}
        // Return unserialized artboards first
        return savedArtboardsObject
            || Settings.sessionVariable(SESSIONVAR) || {};
    }
    set #savedArtboards(newSavedArtboards) {
        let sessionSavedArtboards = {};
        savedArtboardsObject = newSavedArtboards;    // Save unserialized
        
        for (const [artboardId, value] of Object.entries(newSavedArtboards)) {
            sessionSavedArtboards[artboardId] = { ... value};
            delete sessionSavedArtboards[artboardId].artboard;
        }
        Settings.setSessionVariable(SESSIONVAR, sessionSavedArtboards); // Save for later use
    }

    get #savedImagesSeeds() {
        // Format:
        // Map([artboardId, seed])
        return savedImagesSeedsMap
            || new Map(Object.entries(Settings.sessionVariable(SESSIONVAR_IMAGES) || {}))
        ;
    }
    set #savedImagesSeeds(newImagesSeeds) {
        savedImagesSeedsMap = newImagesSeeds;
        Settings.setSessionVariable(SESSIONVAR_IMAGES, newImagesSeeds); // Save for later use. Only save seed, not the imagedata
    }

    get #savedIncrementArtboards() {
        // Format:
        // [artboardId]
        return savedIncrementArtboardsSet
            || new Set(Settings.sessionVariable(SESSIONVAR_INCREMENT) || [])
        ;
    }

    set #savedIncrementArtboards(newIncrementArtboards) {
        savedIncrementArtboardsSet = newIncrementArtboards;
        Settings.setSessionVariable(SESSIONVAR_INCREMENT, Array.from(newIncrementArtboards)); // Save for later use.
    }

    get #savedArtboardsForDocumentSaved() {
        // Format:
        // {artboardId: {lastModified, ?willBeUpdated, ?artboard}}
        // Return unserialized artboards first
        return savedArtboardsForDocumentSavedObject
            || Settings.sessionVariable(SESSIONVAR_DOCUMENTSAVED) || {};
    }
    set #savedArtboardsForDocumentSaved(newSavedArtboards) {
        savedArtboardsForDocumentSavedObject = newSavedArtboards;    // Save unserialized
        Settings.setSessionVariable(SESSIONVAR_DOCUMENTSAVED, newSavedArtboards); // Save for later use
    }

    #deleteSavedArtboard(artboardId) {
        let savedArtboards = this.#savedArtboards;
        delete savedArtboards[artboardId];
        this.#savedArtboards = savedArtboards;
    }

    get #savedPaginationIndex() {
        return savedPaginationIndexObject
            || Settings.sessionVariable(SESSIONVAR_PAGINATIONINDEX) || {isIndexed:false, placeholders:[]};
    }
    set #savedPaginationIndex(newPaginationIndex) {
        savedPaginationIndexObject = newPaginationIndex;    // Save unserialized
        Settings.setSessionVariable(SESSIONVAR_PAGINATIONINDEX, newPaginationIndex); // Save for later use
    }


    // Adds merges savedArtboards with session
    mergeChangedArtboardsWith(changedArtboards) {
        let savedArtboards = this.#savedArtboards;
        changedArtboards.forEach(changedObject => {
            let artboardId = changedObject.artboard.objectID();
            savedArtboards[artboardId] = Object.assign(savedArtboards[artboardId] || {}, changedObject);
        });
        this.#savedArtboards = savedArtboards;
    }

    // Returns an array with objects: {lastModified, artboard}
    getChangedArtboardsFromChanges(changes, document) {
        let changesArray = [];
        // Convert changes to a JavaScript array
        for (let i=0; i<changes.length; i++) changesArray.push(changes[i]);

        return changesArray
            // Ignore property changes of placeholder objects (this could cause a loop)
            // Only ignore when a non-placeholder object
            // This prevents library updates to trigger 
            .filter(change => (this.isChangeAPlaceholder(change.object(),change.fullPath(), document) === false))
            // Check if pagination is needed
            .filter(change => this.checkEnablePagination(change))
            // Get the artboards of valid changes
            .map(change => this.getArtboardFromObject(change.object()))
            // Clean up array
            .filter(artboard => (typeof artboard !== "undefined" && artboard !== null))
            // Add metadata
            .map(artboard => ({
                "lastModified": new Date(),
                "artboard": artboard
            }))
        ;
    }

    checkEnablePagination(change) {
        let object = change.object();
        let objClass = object.class();
        if (objClass.toString() == "MSOverrideValue") return true;   // Changes in Override Values cannot trigger pagination

        if (!object.name) {
            console.log(object);
            return true;
        }

        let objName =  object.name();
        if (!objClass || !objName) return true;
        
        // Two changes that trigger a pagination reindex:
        // 1. Mutation of artboards
        // 2. Addition of a pagination placeholder - will be triggered when detecting placeholders

        // Check if addition of a pagination placeholder (dirty way)
        let replacements = this.#replacements["OnPagination"];
        let changeType = change.type();
        let isChanged = (changeType === 1);
        let isDeleted = (changeType === 2);
        let isAdded = (changeType === 3);

        // When a Pagination placeholder is added
        // Trigger on renaming a placeholder is not possible, because this will trigger a loop.
        // It is not possible to distinguish a rename from a value change
        if (isAdded && !!replacements.get(objName.toLowerCase())) {
            this.isPaginationUpdateNeeded = true;
            return true;
        }

        // If this change involved an artboard, it might cause a repagination
        if (objClass != "MSArtboardGroup"
           && objClass != "MSImmutableArtboardGroup") {
           return true; // Do not affect the changes array

        } else {
            // Changes to trigger pagination:
            // - When artboard is added (type=2)
            // - When artboard is removed (type=3)
            // - When artboard moves in the tree it is removed and readded (type=2 or type=3 and isMove=true)
            // - When artboard is renamed (type=1)

            // Don't trigger double change when moved
            if (isAdded && change.isMove()) return true;
            
            // Enable pagination update in next update cycle
            this.isPaginationUpdateNeeded = true;
        }
        return true;
    }

    getArtboardFromObject(objRef) {
        let artboardToSelect = null;
        let layerParentGroup = objRef;

        //  Get the parent artboard if a layer is selected by the user
        while (layerParentGroup) {
            if (layerParentGroup.class() == "MSArtboardGroup") {
                artboardToSelect = layerParentGroup;
                break;
            }
            if (typeof layerParentGroup.parentGroup === "undefined") break;
            layerParentGroup = layerParentGroup.parentGroup();
        };
        return artboardToSelect;
    }

    isChangeAPlaceholder(objRef, fullPath, document, chtype) {
        let isPlaceholderChanged = false;
        let layerParentGroup = objRef;
        var self = this;

        // Detect if reference is an override point
        if (typeof objRef.parentGroup === "undefined") {

            // Don't update when override is updated by the plugin itself
            // Otherwise we will be in a loop

            // Apparently for MSImmutableRectangleShape there is no 'parentGroup' function
            layerParentGroup = getObjectFromFullPath(fullPath, document);

            // If no object is found, return neither true or false
            if (layerParentGroup === null) return undefined;

            // Skip change when it is a [lastupdated] placeholder
            if (objRef.class().toString() == "MSOverrideValue") {    // === doesn't work for some reason
                isPlaceholderChanged = detectPlaceholderInOverride(objRef, layerParentGroup);
                if (isPlaceholderChanged) {
                    if (verbose) console.log("This change is caused by this plugin, ignore change to prevent a loop.");
                    return true;
                }
            }
        }

        if (verbose) console.log("Is this a placeholder?",  isNameAPlaceholder(layerParentGroup.name(), this), fullPath, layerParentGroup, layerParentGroup.name());
        return isNameAPlaceholder(layerParentGroup.name(), this);

        // Try to get parent based on fullpath
        // Solution from: https://sketchplugins.com/d/1886-ondocumentchange-fullpath/4
        function getObjectFromFullPath(fullPath, document) {
            if (verbose) console.log("Change from:", fullPath);
            let path = fullPath.split('.');

            // Prevent exceptions
            // eg. foreignSymbols[61]
            if (path.length === 0) return null;
            if (path[0].indexOf("foreignSymbols") === 0) return null;

            // Remove item after last . to get parent
            path = path.slice(0, -1);

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
            // Returns object of string. Eg. ["pages[2]", "layers[3]"] becomes document["pages"][2]["layers"][3]
            let parent =  path.reduce(
                (acc, cur) => acc[cur.match(/\w*/)[0]][cur.match(/\d+/)[0]], document)
            ;
            
            return parent.sketchObject;
        }
        
        function detectPlaceholderInOverride(overrideValueReference, object) {
            let isPlaceholder = false;
            let refPaths = overrideValueReference.pathComponents();
            if (refPaths.length === 0) return false;

            // Find matching overridePoint
            let overrideValueId = refPaths[refPaths.length-1].toString();
            let matchingOverridePoint = object.overridePoints().find(function (overridePoint) {
                
                // Match by path, a cumbersome way to match the IDs.
                let overridePointPath = overridePoint.pathComponents();
                if (overridePointPath.length === 0) return false;
                let overridePointId = overridePointPath[overridePointPath.length-1];
                return overridePointId === overrideValueId;
            });

            // Check if overridePoint matches a placeholder name
            if (matchingOverridePoint) {
                isPlaceholder = self.#getPlaceholderNameFromOverridePoint(matchingOverridePoint, self.#replacements["all"]) !== null;
            }

            return isPlaceholder;
        }

        function isNameAPlaceholder(name) {
            return self.#replacements["all"].has(name.toLowerCase());
        }
    }

    updatePlaceholdersInChangedArtboards(context) {
        let changedArtboards = (this.eventName === "OnDocumentChanged"? this.#savedArtboards: this.#savedArtboardsForDocumentSaved);
        if (verbose) console.log("updatePlaceholdersInChangedArtboards2:", changedArtboards, this.document, this.document.getLayerWithID);
        for (const [artboardId, lastUpdatedProps] of Object.entries(changedArtboards)) {
            if (!lastUpdatedProps.artboard) {
                // Get artboard from artboardId
                lastUpdatedProps.artboard = this.document.documentData().layerWithID(artboardId);
            }
            if (!lastUpdatedProps.willBeUpdated) {
                this.updatePlaceholdersInArtboard(artboardId, lastUpdatedProps, context);
            }
            changedArtboards[artboardId].willBeUpdated = true;
            this.#savedArtboards = changedArtboards;
        };
    }

    updatePlaceholdersInArtboard(artboardId, lastUpdatedProps) {
        var self = this;
        if (verbose) console.log("updatePlaceholdersInArtboard, Wait", self.throttleTime);
        return new Promise((resolve) => {
            setTimeout(() => {
                // In the meantime a parallel change could be finished, or something.
                if (typeof self.#savedArtboards[artboardId] === "undefined") { resolve(); return; }

                self.applyLastUpdatedOnArtboard(lastUpdatedProps.artboard, self.#savedArtboards[artboardId].lastModified, artboardId);
                self.#deleteSavedArtboard(artboardId);
                resolve();
            }, self.throttleTime);
        });
    }

    applyLastUpdatedOnArtboard(artboard, lastUpdatedDate, artboardId, eventName = this.eventName) {
        // Ignore artboards not on this document
        if (artboard === null) return;
        if (verbose) console.log("applyLastUpdatedOnArtboard, for artboard: ", artboard, "Last updated date: "+ lastUpdatedDate);
        
        // Loop to iterate on children
        let replacementGroup = {
            "OnDocumentChanged": "all",
            "OnDocumentSaved": "OnDocumentSaved"
        }
        let replacements = this.#replacements[replacementGroup[eventName]];

        this.#traverseArtboard(artboard, replacements, (object, overridePoint, key) => {
            // First check OnDocumentChanged placeholders
            let replacement = this.#replacements["all"].get(key);
            let keytype = replacement.type;

            switch (keytype) {
                case "OnDocumentChanged":
                    let isImage = (key === "[lastupdated-image]");
                    if (!isImage) {
                        let value = replacement.value(new Date(lastUpdatedDate), artboard, artboardId, object, overridePoint);
                        this.#replaceStringValue(object, overridePoint, value);
                    } else { 
                        this.#replaceImageValue(object, overridePoint, replacement.value, lastUpdatedDate);
                    }
                    break;

                case "OnDocumentSaved":
                    if (eventName === "OnDocumentSaved") {
                        let value = replacement.value(lastUpdatedDate, artboardId);
                        this.#replaceStringValue(object, overridePoint, value);
                    } else {   
                        let artboards = this.#savedArtboardsForDocumentSaved;
                        artboards[artboardId] = {};
                        this.#savedArtboardsForDocumentSaved = artboards;
                        if (verbose) console.log('applyLastUpdatedOnArtboard Found DocumentSavedPlaceholder! Save artboards for document saved', object, this.#savedArtboardsForDocumentSaved);
                    }
                    break;

                case "OnPagination":
                    // If it is a pagination placeholder, add it to the index. Only if the index won't be generated anyways this cycle (isIndexed:false)
                    if (this.#savedPaginationIndex.isIndexed) {
                        // Add to paginationIndex
                        let pagIndex = this.#savedPaginationIndex;
                        let objectID = object.objectID();
                        // Don't add an object multiple times
                        if (pagIndex.placeholders.indexOf(objectID + "") === -1) {       
                            pagIndex.placeholders.push(objectID + "");
                            this.#savedPaginationIndex = pagIndex;
                        }
                    }
                    break;
            }
        });

        // Prevent another update when an artboard is not changed
        if (eventName === "OnDocumentSaved") {
            let artboards = this.#savedArtboardsForDocumentSaved;
            delete artboards[artboardId];
            this.#savedArtboardsForDocumentSaved = artboards;
        }
        return Promise.resolved;
    }

    updatePagination() {
        // TODO: Prevent multiple changes on the same time
        this.isPaginationUpdateNeeded = false;

        let self = this;
        let replacements = this.#replacements["OnPagination"];
        
        // Check if pagination placeholders are indexed
        let isPaginationIndexNeeded = !this.#savedPaginationIndex.isIndexed;
        if (verbose) console.log("Update pagination, " + (isPaginationIndexNeeded?"and reindex":"but don't reindex"), this.#savedPaginationIndex);
        if (isPaginationIndexNeeded) {
            let paginationPlaceholders = [];

            // Loop through all artboards
            // Detect only pagination placeholders
            this.#traverseArtboards(replacements, (artboard, object, overridePoint, key) => {
                // Save detected object to index
                paginationPlaceholders.push({
                    key, 
                    objectid: object.objectID() +"",
                    artboardid: artboard.objectID()
                });

                // Now we are there, update the value as well
                let newValue = replacements.get(key).value(artboard);
                this.#replaceStringValue(object, overridePoint, newValue);
            });

            this.#savedPaginationIndex = {
                placeholders: paginationPlaceholders,
                isIndexed: true
            };
        
        } else {
            let doc = Sketch.getSelectedDocument();
            // Only replace values of saved placeholders
            this.#savedPaginationIndex.placeholders.forEach((placeholderInfo) => {
                let key = placeholderInfo.key;
                let object = doc.getLayerWithID(placeholderInfo.objectid);
                let artboard = doc.getLayerWithID(placeholderInfo.artboardid);

                // Add some robustness. Don't crash when objects are not found.
                // Continue the loop and for the next cycle make sure to update the index.
                if (!object || !artboard) {
                    let pagIndex = this.#savedPaginationIndex;
                    pagIndex.isIndexed = false;
                    this.#savedPaginationIndex = pagIndex; // And regenerate the index next time
                    return;
                }

                // Continue finding placeholders and updating values
                object = object.sketchObject;
                artboard = artboard.sketchObject;

                this.#traverseObject(object, new Map([[key]]), (object, overridePoint, key) => {
                    let newValue = replacements.get(key).value(artboard);
                    this.#replaceStringValue(object, overridePoint, newValue);
                });
            });
        }
    }

    resetIncrements() {
        // Remove from the list, so it will be updated on next documentChanged
        this.#savedIncrementArtboards = [];
    }

    #traverseArtboards(replacements, onDetectEvent) {
        this.document.currentPage().artboards().forEach((artboard)=> {
            this.#traverseArtboard(artboard, replacements, (object, overridePoint, key) => {
                onDetectEvent(artboard, object, overridePoint, key);
            });
        });
    }

    #traverseArtboard(artboard, placeholderKeys, onDetectEvent) {
        for (let i = 0; i < artboard.children().length; i++) {
            let sublayer = artboard.children()[i];
            this.#traverseObject(sublayer, placeholderKeys, onDetectEvent);
        }
    }

    #traverseObject(sublayer, placeholderKeys, onDetectEvent) {
        let sublayerName = sublayer.name().toLowerCase();

        // First check if object is a placeholder
        let findReplacementValue = placeholderKeys.has(sublayerName);
        if (findReplacementValue) {
            onDetectEvent(sublayer, undefined, sublayerName);
            return;
        }

        // Check if object has overridePoints with a placeholder
        let hasOverridePoints = sublayer.hasOwnProperty("overrides");
        if (!hasOverridePoints) return;

        sublayer.overridePoints().forEach((overridePoint) => {

            let overrideName = this.#getPlaceholderNameFromOverridePoint(overridePoint, placeholderKeys);
            if (overrideName === null) return;

            onDetectEvent(sublayer, overridePoint, overrideName);
        });
    }

    #replaceStringValue(object, overridePoint, value) {
        if (verbose) console.log(`Replace value to ${value}, for object:`, object, overridePoint);
        let self = this;
        if (!overridePoint) {
            return replaceObjectValue(object, value);
        } else {
            return replaceOverrideValue(object, overridePoint, value);
        }

        function replaceObjectValue(object, newValue) {
            newValue += ""; // Make sure it is a string
            return new Promise((resolve) => {
                let curValue = self.#getCurrentValue(object);
                if (curValue !== newValue) { 
                    object.setStringValue(newValue); 
                }
                resolve();
            });
        }
        function replaceOverrideValue(object, overridePoint, newValue) {
            // Some code how to set overrides: https://sketchplugins.com/d/385-viewing-all-overrides-for-a-symbol/7
            newValue += ""; // Make sure it is a string
            return new Promise((resolve) => {
                let curValue = self.#getCurrentValue(object, overridePoint);
                if (curValue!==newValue) {
                    object.setValue_forOverridePoint_(newValue, overridePoint); 
                }
                resolve();
            });
        }
    }

    #replaceImageValue(object, overridePoint, getValue, seedDate) {
        if (verbose) console.log(`Replace image to hash ${seedDate}, for object:`, object, overridePoint);

        let self = this;
        let layerId = object.objectID();

        return new Promise(function (resolve) {
            let seed = generateImageSeed(seedDate);
            // Validate
            // Don't do anything if image result will be the same. Performance optimization
            if (!isSeedChanged.apply(self, [layerId, seed])) { return; }
            
            if (!overridePoint) {
                // It is not possible to set fills on Images
                var layerFill = object.style().fills();
                if (!layerFill.length) { return; }
                layerFill = layerFill.firstObject();
                layerFill.setFillType(4);
                layerFill.setPatternFillType(1);
                let newImageData = getValue(seed, layerId);
                layerFill.setImage(MSImageData.alloc().initWithImage(newImageData));
            } else {
                let newValue = getValue(seed, layerId);
                // Some code how to replace image overrides: https://sketchplugins.com/d/794-how-do-you-update-an-override-with-a-new-image/6    
                let imageData = MSImageData.alloc().initWithImage(newValue);
                object.setValue_forOverridePoint(imageData, overridePoint);
            }
            resolve();            
        });

        // Generate a seed to summarize the contents of the image
        // Because it takes a while to process a change, use an image based on minutes instead of seconds
        function generateImageSeed(seedDate) {
            let d = new Date(seedDate);
            let date = d.getDate() + "-" + (d.getMonth()+1) + "-" + d.getFullYear();
            let time = d.getHours() + ":" + leadingZero(d.getMinutes());
            return date +" "+ time;
        }

        function isSeedChanged(layerId, newSeed) {
            let savedImagesSeeds = this.#savedImagesSeeds;
            if (verbose) {
                if (!savedImagesSeeds.has(layerId)) {
                    console.log("isSeedChanged? No old seed", layerId);
                } else {
                    console.log("isSeedChanged?", (savedImagesSeeds.get(layerId).seed !== newSeed) ,"Old seed and new seed:", savedImagesSeeds.get(layerId).seed, newSeed, layerId)
                }
            }
    
            return !savedImagesSeeds.has(layerId) 
                || savedImagesSeeds.get(layerId).seed !== newSeed
            ;
        }
    }

    #getCurrentValue(object, overridePoint) {
        let curValue;
        if (!overridePoint) {
            curValue = object.stringValue();
        } else {
            let id = overridePoint.name().split("_")[0];
            curValue = object.overrides()[id];
        }
        return curValue;
    }

    // A cumbersome way to get the name of the overridePoint
    #getPlaceholderNameFromOverridePoint(overridePoint, placeholderKeys) {
        let overrideProperty = overridePoint.property();
        if (["stringvalue", "image"].indexOf(overrideProperty.toLowerCase()) === -1) return null;

        let overrideName = overridePoint.layer().description(); // Example: <MSImmutableTextLayer: 0x7faa485c90> [lastupdated-artboard-title] (76E452B9-C5FE-487F-B7BA-C9D79DE644)
        let expectedPropertyName = ["[lastupdated-image]"].indexOf(overrideName) === -1? "stringValue" : "image";
        if (overridePoint.property() != expectedPropertyName) return null;

        var hasALastUpdatedPlaceholder = false;
        for (const placeholderKey of placeholderKeys.keys()) {
            if (overrideName.indexOf(placeholderKey) > -1) {
                hasALastUpdatedPlaceholder = true;
                overrideName = placeholderKey;
                break;
            }
        }
        if (hasALastUpdatedPlaceholder) {
            return overrideName;
        } else {
            return null;
        }
    }
}

class Blockies {
    constructor() {
        // The random number is a js implementation of the Xorshift PRNG
        this.randseed = new Array(4); // Xorshift: [x, y, z, w] 32 bit values
    }
    seedrand(seed) {
        this.randseed.fill(0);

        for (let i = 0; i < seed.length; i++) {
            this.randseed[i % 4] = ((this.randseed[i % 4] << 5) - this.randseed[i % 4]) + seed.charCodeAt(i);
        }
    }

    rand() {
        // based on Java's String.hashCode(), expanded to 4 32bit values
        const t = this.randseed[0] ^ (this.randseed[0] << 11);

        this.randseed[0] = this.randseed[1];
        this.randseed[1] = this.randseed[2];
        this.randseed[2] = this.randseed[3];
        this.randseed[3] = (this.randseed[3] ^ (this.randseed[3] >> 19) ^ t ^ (t >> 8));

        return (this.randseed[3] >>> 0) / ((1 << 31) >>> 0);
    }

    createColor() {
        //saturation is the whole color spectrum
        const h = Math.floor(this.rand() * 360);
        //saturation goes from 40 to 100, it avoids greyish colors
        const s = ((this.rand() * 60) + 40) + '%';
        //lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
        const l = ((this.rand() + this.rand() + this.rand() + this.rand()) * 25) + '%';

        return 'hsl(' + h + ',' + s + ',' + l + ')';
    }

    createImageData(size) {
        const width = size; // Only support square icons for now
        const height = size;

        const dataWidth = Math.ceil(width / 2);
        const mirrorWidth = width - dataWidth;

        const data = [];
        for (let y = 0; y < height; y++) {
            let row = [];
            for (let x = 0; x < dataWidth; x++) {
                // this makes foreground and background color to have a 43% (1/2.3) probability
                // spot color has 13% chance
                row[x] = Math.floor(this.rand() * 2.3);
            }
            const r = row.slice(0, mirrorWidth);
            r.reverse();
            row = row.concat(r);

            for (let i = 0; i < row.length; i++) {
                data.push(row[i]);
            }
        }

        return data;
    }

    buildOpts(opts) {
        const newOpts = {};

        newOpts.seed = opts.seed || Math.floor((Math.random() * Math.pow(10, 16))).toString(16);

        this.seedrand(newOpts.seed);

        newOpts.size = opts.size || 8;
        newOpts.scale = opts.scale || 4;
        newOpts.color = opts.color || this.createColor();
        newOpts.bgcolor = opts.bgcolor || this.createColor();
        newOpts.spotcolor = opts.spotcolor || this.createColor();

        return newOpts;
    }

    renderIcon(opts, canvas) {
        opts = this.buildOpts(opts || {});
        const imageData = this.createImageData(opts.size);
        
        return imageData;

        // Original Blockies code
        canvas.width = canvas.height = opts.size * opts.scale;

        const cc = canvas.getContext('2d');
        cc.fillStyle = opts.bgcolor;
        cc.fillRect(0, 0, canvas.width, canvas.height);
        cc.fillStyle = opts.color;

        for (let i = 0; i < imageData.length; i++) {

            // if data is 0, leave the background
            if (imageData[i]) {
                const row = Math.floor(i / width);
                const col = i % width;

                // if data is 2, choose spot color, if 1 choose foreground
                cc.fillStyle = (imageData[i] == 1) ? opts.color : opts.spotcolor;

                cc.fillRect(col * opts.scale, row * opts.scale, opts.scale, opts.scale);
            }
        }

        return canvas;
    }
}

module.exports = Lastupdated;