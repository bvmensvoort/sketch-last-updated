# Last-updated

Sketch plugin to update placeholders with with metadata about last save, such as timestamp or increment

<br>

# Installation

1. Download  
[latest .zip file](https://github.com/bvmensvoort/sketch-last-updated/releases/download/v1.4.0/sketch-last-updated-1.4.0.zip) or via [releases page](https://github.com/bvmensvoort/sketch-last-updated/releases).
2. Unzip and double click to install it.

<br>

# Introduction

When updating your shared design, it is handy to have some meta information. Think of versioning, titles or page numbers. But it is often hard to keep track of this information.

This plugin will update this information automatically.

For the version indicator, you can use date/time, use a generated image or use an increment. For a title you can use the artboard title. And for documents with multiple pages, you can use page numbering.

![Screenshot Sketch with features displayed](https://github.com/bvmensvoort/sketch-last-updated/raw/master/lastupdated-features.png)

## Installation

1. Open the .sketchplugin-file
2. Sketch will open and tell you the plugin is installed

## Getting started

1. Open a sketch file, or create a new one
2. Insert an artboard
3. Insert a text layer inside this artboard
3. Name it `[lastupdated]` (or one of the other supported strings)
4. Create or move a different element on the artboard
5. The text layer will update its value after a few seconds

## Usage
The plugin will update text or images in placeholder layers.
So you can design your own version indicator.

Placeholders which the plugin monitors (this example is on January, 31st 2020 at 3:31:59 PM):
* `[lastupdated]` :  31-1-2020 15:31
* `[lastupdatedUS]` :  1/31/2020 15:31
* `[lastupdated-full-date]` :  31-1-2020
* `[lastupdated-full-dateUS]` :  1/31/2020
* `[lastupdated-time]` :  15:31
* `[lastupdated-year]` :  2020
* `[lastupdated-month]` :  1
* `[lastupdated-day]` :  4
* `[lastupdated-day-str]` :  thu
* `[lastupdated-hour]` : 15
* `[lastupdated-minute]` :  31
* `[lastupdated-second]` :  59
* `[lastupdated-image]` :  [Blockies](https://github.com/download13/blockies) image. can only be used on shapes (like a rectangle) on the artboard, or on images within a symbol.
* `[lastupdated-artboard-title]` : -Artboard Wizzy3
* `[lastupdated-artboard-title-nodash]` : Artboard Wizzy3
* `[lastupdated-increment]` :  1 - this is updated once per document save
* `[lastupdated-size-bytes]` :  237234 - this is updated on document save
* `[lastupdated-is-autosaved]` :  0 - this is updated on document save

And for page numbering:
These are updated when adding, removing or changing an artboard, or when adding a page number placeholder.
* `[lastupdated-totalpages]` :  5 - total number of artboards on the page
* `[lastupdated-currentpagenr]` :  3 - artboard number, using the order of the layers on the page. Count starts at 1
* `[lastupdated-pagenr-next]` :  4 - artboard number of the next artboard. It is empty when there is no following artboard
* `[lastupdated-pagenr-prev]` :  2 - artboard number of the previous artboard. It is empty when there is no previous artboard
* `[lastupdated-totalpages-nodash]`, `[lastupdated-currentpagenr-nodash]`, `[lastupdated-pagenr-next-nodash]`, `[lastupdated-pagenr-prev-nodash]` : The suffix of `-nodash` excludes artboards with titles starting with '-'

The placeholders are updated on elements as well as symbol overrides inside an artboard.

## Credits
This plugin didn't exist for some great inspiration:
- [Rachit Gupta - Sketch-timestamp](https://github.com/rachit91/sketch-timestamp)
- Great questons on the Sketch plugins forum of [@perrysmotors](https://sketchplugins.com/d/794-how-do-you-update-an-override-with-a-new-image)

<br>

# Releases
## 1.4.0
- Supports artboard title: `[lastupdated-artboard-title-nodash]`
- Supports page numbering: `[lastupdated-totalpages]`, `[lastupdated-currentpagenr]`, `[lastupdated-pagenr-next]`, `[lastupdated-pagenr-prev]` and its `-nodash` variant.

## v1.3.0
- Supports artboard title: `[lastupdated-artboard-title]`
- Most placeholders will be updated onDocumentChanged, after 5 seconds
- Only [lastupdated-size-bytes] and [lastupdated-autosaved] are updated onDocumentSaved
- An update is not triggered anymore when changing placeholders (to prevent loops)
- The document is no longer marked as changed after saving (except when using [size-bytes] and [autosaved])

## v1.2.0
- Marks document as changed on document change instead of selection change (finally). This will prevent unnecessary saves and might be a bit faster.
- Add [lastupdated-size-bytes] and [lastupdated-autosaved] to possible placeholders
Unfortunately, a double save is needed to save the updated placeholders in the Sketch file.

## v1.1.0
- Updates the placeholders when saving the document. This makes selecting stuff much faster.
- Now the correct month number is used in month-placeholders

## V0.0.1
- Automatically updates on select
- Supports date and time: `[lastupdated]`, `[lastupdatedUS]`, `[lastupdated-full-date]`, `[lastupdated-full-dateUS]`, `[lastupdated-time]`, `[[lastupdated-year]`, `[lastupdated-month]`, `[lastupdated-day]`, `[lastupdated-day-str]`, `[lastupdated-hour]`, `[lastupdated-minute]`, `[lastupdated-second]`
- Supports Blockies: `[lastupdated-image]`
- Supports increment: `[lastupdated-increment]`

<br>

# Have suggestions?

Feel free to add a pull request or mention the plugin.
Thanks for using it (if so)!