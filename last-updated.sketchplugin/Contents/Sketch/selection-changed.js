//In the manifest, we told Sketch that every time the `SelectionChanged` action finishes, we want it
// to run the onSelectionChanged handler in our `selection-changed.js` script file.

const sketch = require('sketch');

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
    let date = d.getDate() + "-" + d.getMonth() + "-" + d.getFullYear();
    let time = d.getHours() + ":" + z(d.getMinutes());

    function z(object, targetLength = 2, padString = "0") {
        return (object + "").padStart(targetLength, padString);
    }

    // get the selection count.
    count = selection.count();

    // Don't try to update if nothing is selected
    if (count == 0) { return; }

    var layerParentGroup = selection[0];
    var artboardToSelect = null;

    //get the parent artboard if a layer is selected by the user
    while (layerParentGroup) {
        if (layerParentGroup.class() == "MSArtboardGroup")) {
            artboardToSelect = layerParentGroup;
            break;
        }

        layerParentGroup = layerParentGroup.parentGroup();
    };

    let lastupdatedImages = new Map();

    function getLastupdatedImage(seed, layerId) {
        // Don't generate image if seed is not changed (for performance)
        if (lastupdatedImages.has(layerId) && lastupdatedImages.get(layerId).seed===seed) { return lastupdatedImages.get(layerId).image; }

        // Generate image
        let image = getImage(seed);
        lastupdatedImages.set(layerId,{seed, image});
        return image;
    }

    var replacements = new Map([
        ["[lastupdated]", () => date + " " + time],
        ["[lastupdatedus]", () => d.getMonth() + "/" + d.getDate() + "/" + d.getFullYear() + " " + time],
        ["[lastupdated-full-date]", () => date],
        ["[lastupdated-full-dateus]", () => d.getMonth() + "/" + d.getDate() + "/" + d.getFullYear()],
        ["[lastupdated-time]", () => time],
        ["[lastupdated-year]", () => d.getFullYear().toString()],
        ["[lastupdated-month]", () => d.getMonth().toString()],
        ["[lastupdated-month-str]", () => ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"][d.getMonth()]],
        ["[lastupdated-date]", () => d.getDate().toString()],
        ["[lastupdated-day]", () => d.getDay().toString()],
        ["[lastupdated-day-str]", () => ["mon","tue","wed","thu","fri","sat","sun"][d.getDay()]],
        ["[lastupdated-hour]", () => d.getHours().toString()],
        ["[lastupdated-minute]", () => z(d.getMinutes())],
        ["[lastupdated-second]", () => z(d.getSeconds())],
        ["[lastupdated-image]", getLastupdatedImage],
        ["[lastupdated-increment]", (curValue) => isNaN(curValue) || isNaN(parseInt(curValue))? curValue : (parseInt(curValue)+1).toString()]
    ]);

    //loop to iterate on children
    for (let i = 0; i < artboardToSelect.children().length; i++) {
        let sublayer = artboardToSelect.children()[i];
        let layerId = sublayer.objectID();

        replacements.forEach((replacementValue, replacementKey) => {
            if (sublayer.name().toLowerCase() === replacementKey) {
                if (replacementKey === "[lastupdated-image]") {
                    // Validate
                    // Don't do anything if image result will be the same
                    let seed = date + " " + time;
                    if (lastupdatedImages.has(layerId) && lastupdatedImages.get(layerId).seed===seed) { return; }

                    // It is not possible to set fills on Images
                    var layerFill = sublayer.style().fills();
                    if (!layerFill.length) { return; }

                    layerFill = layerFill.firstObject();
                    layerFill.setFillType(4);
                    layerFill.setPatternFillType(1);
                    layerFill.setImage(MSImageData.alloc().initWithImage(replacementValue(seed, layerId)));
                } else {
                    let curValue = sublayer.stringValue();
                    let newValue = replacementValue(curValue);
                    if (curValue!==newValue) { sublayer.setStringValue(newValue); }
                }
            }
            else if (sublayer.hasOwnProperty("overrides")) {
                sublayer.overridePoints().forEach(function (overridePoint) {
                    // Some code how to set overrides: https://sketchplugins.com/d/385-viewing-all-overrides-for-a-symbol/7
                    if (overridePoint.layerName().toLowerCase() === replacementKey) {
                        if (replacementKey === "[lastupdated-image]") {
                            // Don't do anything if image result will be the same
                            let seed = date + " " + time;
                            if (lastupdatedImages.has(layerId) && lastupdatedImages.get(layerId).seed===seed) { return; }

                            // Some code how to replace image overrides: https://sketchplugins.com/d/794-how-do-you-update-an-override-with-a-new-image/6    
                            let imageData = MSImageData.alloc().initWithImage(replacementValue(seed, layerId));
                            sublayer.setValue_forOverridePoint(imageData, overridePoint);                       
                        } else {
                            let id = overridePoint.name().split("_")[0];
                            let curValue = sublayer.overrides()[id];
                            let newValue = replacementValue(curValue)
                            if (curValue!==newValue) { sublayer.setValue_forOverridePoint_(newValue, overridePoint); }
                        }
                    }
                });
            }
        });
    };
};

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

function getImage(seed) {
    const base64Image = generateImage(seed);
    var imageData = NSData.alloc().initWithBase64EncodedString_options(base64Image, NSDataBase64DecodingIgnoreUnknownCharacters);
    var image = NSImage.alloc().initWithData(imageData);

    return image;

    function generateImage(seed) {
        const Style = sketch.Style;
        const ShapePath = sketch.ShapePath;
        const Rectangle = sketch.Rectangle;
        const page = sketch.getSelectedDocument().selectedPage.sketchObject; // It is for temporary use to create the icon

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