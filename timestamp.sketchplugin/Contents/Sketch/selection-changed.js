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

        var image;
        var lastGenerated;

        function getTimestampDate() {
            return date;
        }
        function getTimestampTime() {
            return time;
        }
        function getTimestamp() {
            return date + " " + time;
        }
        function getTimestampImage(context) {
            if (!image) { 
                image = getImage(context); 
            }
            return image;
        }

        var replacements = new Map([
            ["[timestamp-date]", getTimestampDate],
            ["[timestamp-time]", getTimestampTime],
            ["[timestamp]", getTimestamp],
            ["[timestamp-image]", getTimestampImage]
        ]);

        //loop to iterate on children
        for (var i = 0; i < artboardToSelect.children().length; i++) {

            var sublayer = artboardToSelect.children()[i];

            replacements.forEach((replacementValue, replacementKey) => {
                if (sublayer.name().toLowerCase() === replacementKey) {
                    if (replacementKey === "[timestamp-image]") {
                        // Validate
                        // It is not possible to set fills on Images
                        var layerFill = sublayer.style().fills();
                        if (!layerFill.length) { return; }

                        layerFill = layerFill.firstObject();
                        layerFill.setFillType(4);
                        layerFill.setPatternFillType(1);
                        layerFill.setImage(MSImageData.alloc().initWithImage(replacementValue(context)));
                    } else {
                        sublayer.setStringValue(replacementValue());
                    }
                }
                else if (sublayer.hasOwnProperty("overrides")) {
                    sublayer.overridePoints().forEach(function (overridePoint) {
                        // Some code how to set overrides: https://sketchplugins.com/d/385-viewing-all-overrides-for-a-symbol/7
                        if (overridePoint.layerName().toLowerCase() === replacementKey) {
                            console.log(replacementKey);
                            if (replacementKey === "[timestamp-image]") {
                                //renderImage(sublayer);

                                try {
                                    //let image = NSImage.alloc().initWithData(imageData);
                                    //sublayer.setValue_forOverridePoint_(imageData, overridePoint);
                                    //var k = new ImageData();
                                    //console.log(k)
                                    //console.log(image.sketchObject, imageData, imageData.sketchObject);
                                    //sublayer.setValue_forOverridePoint(imageData, overridePoint);
                                } catch (e) {
                                    console.log(e);
                                }
                            } else {
                                sublayer.setValue_forOverridePoint_(replacementValue(), overridePoint);
                            }
                        }
                    });
                }
            });
        };
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

function createIcon(opts) {
    var canvas = document.createElement('canvas');

    renderIcon(opts, canvas);

    return canvas;
}

function getImage(context, artboard) {

    base64Image = generateImage(context, artboard);

    //var base64Image2 = "iVBORw0KGgoAAAANSUhEUgAAAFUAAAA2CAYAAAC2ldWuAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAVaADAAQAAAABAAAANgAAAADTPCIuAAADXUlEQVR4Ae3ab0/aQBwH8G9ZdRhFNmEs2aJmBjUjUSFRt2XJnuzhXogvSR/7FvYW9kDizP7hRJkKGP4OHH8UKKXt7rqcaZYsQ7eTlt4ll19pz8v1kx/tcScgihAQAkJACAgBISAEhIAQEAJCQAjcTEDq9882NzeNftu6vZ18HYC3ypvrNHdtW49r75zjjQtUDrgCVaByEODQpchUgcpBgEOXIlMFKgcBDl2KTBWoHAQ4dCkyVaByEODQpchUgcpBgEOXIlN5oJLF5/Xt7e0Qh75d26Xs8/ninU4HW1tbLaJwSmqa1BNSP5Aa39jYSEqSpJNjUfoUkJLJpLlNomkaKG673TZjs9lEvV6nnxsEddcwjNe76ip+GPegGHf77N6dza5Q/3T7qqqCAjcaDRPZxO7KqOhBFPWHJD6ABvFotvr9FdXamB23Wi1Uq9VftdZEWQuiRIBLeohk8Shr5tp4I1SrVq/XM3ErlQoqBLqiTpoZnNMeowOvtalrjv8Z1Sql6zpqtRoocKFYQl4NIqPN4Dt5RLhpf/u/olqB6YuvXC4jl8uh3NQI7jTOSO244CXHDdUKfHFxgXw+b2ZvrhvEqfYEVWPK2mSojm8FlYnR7C2VSshmszi7HMehtoBz/T67PDTxVlGZGpnzolgsIp1OI9uawGFvETUy/x2WMhBUhkdfbBQ3k8kg05rEEcncmu5nlx0bB4rK1BguzdzTdgAJ9SkUB0/HbIFqxaVZe5zJ46u6QGYMs46citkKleHSX2xkTQLpmoTPvWU0dB+75IhoS1QmVygUkPp2jENlGke9BbLGcIddsnW0NSqVows6qVQK6VITe90oWSWz/xTM9qgsJekCTmL/AF+UME60OXbaltExa3aBQADP1lfxYiqHtZE9yFBtCUoH5RhUOliv14tYLIbVGRmvRt/BL9XpaduVa/3Pvx1G7/F4MD8/D7+/jImDOD4pi8jos3YY2tUYHIfKRh4KhUD21zCeSGCifon9XoRdGnh01Nf/d62xsTHzcRCbOkdU/gjJJj8VHI1KkWVZRjQaRTTUwZr8nsxkB7/x63hUCkufs0tLS1h+JOH5SHzgM4OhQKWwZBsdkUgEK7PjeDm6A6+k0NMDKUODyvTC4TBW5gIkY3cwgi47favxJ1G1cSyCOX+iAAAAAElFTkSuQmCC";
    //const base64Image = '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'
    var imageData = NSData.alloc().initWithBase64EncodedString_options(base64Image, NSDataBase64DecodingIgnoreUnknownCharacters);
    var image = NSImage.alloc().initWithData(imageData);

    return image;

    function generateImage(context) {
        var sketch = require('sketch');
        var Style = sketch.Style;
        var ShapePath = sketch.ShapePath;
        var Rectangle = sketch.Rectangle;
        var Slice = sketch.Slice;
        var page = document.selectedPage;
        page = sketch.getSelectedDocument().selectedPage;


        let iconData = new Blockies().renderIcon({seed: "randString"});
        // let iconData = generateIconData({ // All options are optional
        //     seed: 'randstring', // seed used to generate icon data, default: random
        //     color: '#dfe', // to manually specify the icon color, default: random
        //     bgcolor: '#aaa', // choose a different background color, default: white
        //     size: 15, // width/height of the icon in blocks, default: 10
        //     scale: 3 // width/height of each block in pixels, default: 5
        // });

        const iconWidth = Math.sqrt(iconData.length);
        const pixelSize = 10;

        var shapes = [];
        console.log(iconData);
        
        for (var i=0; i<iconData.length && i<200; i++) {
            var pixel = iconData[i];
            if (pixel===0) continue;
            

            var colors = ['', "#c0ffee", "#dfedfe"];
            const row = Math.floor(i / iconWidth);
            const col = i % iconWidth;

            shapes.push(new ShapePath({
                name: "my shape"+i,
                frame: new Rectangle(pixelSize * row, pixelSize * col, pixelSize, pixelSize),
                style: { fills: [{ color: colors[pixel], fillType: Style.FillType.Color }], borders: [] },
                parent: page
            }));
        }
        
        let slice = new Slice({
            name: "my slice",
            frame: new Rectangle(0, 0, iconWidth*pixelSize, iconWidth*pixelSize),
            parent: page
        });
        console.log(slice)

        var result = getBase64ImageFromSlice(slice, context);

        // Clean up

        return result;
    }
    //     let mySquare = new Shape({
    //         parent: parentLayer, 
    //         frame: { x: 53, y: 213, width: 122, height: 122 },
    //         style: { fills: ['#35E6C9']}
    //     })

    var icon = createIcon({ // All options are optional
        seed: 'randstring', // seed used to generate icon data, default: random
        color: '#dfe', // to manually specify the icon color, default: random
        bgcolor: '#aaa', // choose a different background color, default: white
        size: 15, // width/height of the icon in blocks, default: 10
        scale: 3 // width/height of each block in pixels, default: 5
    });

    function getBase64ImageFromSlice(slice) {

console.log(slice)

        base64Code = "iVBORw0KGgoAAAANSUhEUgAAAFUAAAA2CAYAAAC2ldWuAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAVaADAAQAAAABAAAANgAAAADTPCIuAAADXUlEQVR4Ae3ab0/aQBwH8G9ZdRhFNmEs2aJmBjUjUSFRt2XJnuzhXogvSR/7FvYW9kDizP7hRJkKGP4OHH8UKKXt7rqcaZYsQ7eTlt4ll19pz8v1kx/tcScgihAQAkJACAgBISAEhIAQEAJCQAjcTEDq9882NzeNftu6vZ18HYC3ypvrNHdtW49r75zjjQtUDrgCVaByEODQpchUgcpBgEOXIlMFKgcBDl2KTBWoHAQ4dCkyVaByEODQpchUgcpBgEOXIlN5oJLF5/Xt7e0Qh75d26Xs8/ninU4HW1tbLaJwSmqa1BNSP5Aa39jYSEqSpJNjUfoUkJLJpLlNomkaKG673TZjs9lEvV6nnxsEddcwjNe76ip+GPegGHf77N6dza5Q/3T7qqqCAjcaDRPZxO7KqOhBFPWHJD6ABvFotvr9FdXamB23Wi1Uq9VftdZEWQuiRIBLeohk8Shr5tp4I1SrVq/XM3ErlQoqBLqiTpoZnNMeowOvtalrjv8Z1Sql6zpqtRoocKFYQl4NIqPN4Dt5RLhpf/u/olqB6YuvXC4jl8uh3NQI7jTOSO244CXHDdUKfHFxgXw+b2ZvrhvEqfYEVWPK2mSojm8FlYnR7C2VSshmszi7HMehtoBz/T67PDTxVlGZGpnzolgsIp1OI9uawGFvETUy/x2WMhBUhkdfbBQ3k8kg05rEEcncmu5nlx0bB4rK1BguzdzTdgAJ9SkUB0/HbIFqxaVZe5zJ46u6QGYMs46citkKleHSX2xkTQLpmoTPvWU0dB+75IhoS1QmVygUkPp2jENlGke9BbLGcIddsnW0NSqVows6qVQK6VITe90oWSWz/xTM9qgsJekCTmL/AF+UME60OXbaltExa3aBQADP1lfxYiqHtZE9yFBtCUoH5RhUOliv14tYLIbVGRmvRt/BL9XpaduVa/3Pvx1G7/F4MD8/D7+/jImDOD4pi8jos3YY2tUYHIfKRh4KhUD21zCeSGCifon9XoRdGnh01Nf/d62xsTHzcRCbOkdU/gjJJj8VHI1KkWVZRjQaRTTUwZr8nsxkB7/x63hUCkufs0tLS1h+JOH5SHzgM4OhQKWwZBsdkUgEK7PjeDm6A6+k0NMDKUODyvTC4TBW5gIkY3cwgi47favxJ1G1cSyCOX+iAAAAAElFTkSuQmCC";
        
        // console.log("hi2", selection.count(), selection.firstObject().class())
        // if (selection.count() == 1 && selection.firstObject().class() == "MSSliceLayer") {

        //     var slice = selection.firstObject();
        // var exportRequest = MSExportRequest.exportRequestsFromExportableLayer_inRect_useIDForName(
        //     slice, slice.absoluteInfluenceRect(), false
        // ).firstObject();
        // var format = exportRequest.format();
        // var exporter = MSExporter.exporterForRequest_colorSpace(exportRequest, NSColorSpace.sRGBColorSpace());
        // var imageData = exporter.data();
        // var base64Code = imageData.base64EncodedStringWithOptions(NSDataBase64EncodingEndLineWithLineFeed);

        return base64Code;
        // var base64Preview = base64Code.substr(0, 8) + "..." + base64Code.substr(-8, 8);

        //     switch (format + "") {
        //         case "png":
        //             base64Code = "data:image/png;base64," + base64Code;
        //             break;
        //         case "jpg":
        //             base64Code = "data:image/jpeg;base64," + base64Code;
        //             break;
        //         case "tif":
        //             base64Code = "data:image/tiff;base64," + base64Code;
        //             break;
        //         case "webp":
        //             base64Code = "data:image/webp;base64," + base64Code;
        //             break;
        //         case "svg":
        //             base64Code = "data:image/svg+xml;base64," + base64Code;
        //             break;
        //     }
        //     console.log(base64Code);
        // }
    }

}