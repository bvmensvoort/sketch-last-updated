# Last-updated

Sketch plugin to update placeholders with with metadata about last save, such as timestamp or increment

<br>

# Installation

1. Download  
[latest .zip file](https://github.com/bvmensvoort/sketch-last-updated/releases/download/v1.2.0/sketch-last-updated-1.2.0.zip) or via [releases page](https://github.com/bvmensvoort/sketch-last-updated/releases).
2. Unzip and double click to install it.

<br>

# Introduction

When updating your shared design, it is hard to keep track of versions. Then it is handy to show a version indicator.
This plugin will update this indicator automatically on every save.

For the version indicator, you can use date/time, use a generated image or use an increment.

![Screenshot Sketch with features displayed](https://github.com/bvmensvoort/sketch-last-updated/raw/master/lastupdated-features.png)

## Installation

1. Open the .sketchplugin-file
2. Sketch will open and tell you the plugin is installed

## Getting started

1. Open a sketch file, or create a new one
2. Insert an artboard
3. Insert a text layer inside this artboard
3. Name it `[lastupdated]` (or one of the other supported strings)
4. Select a different element on the artboard
5. The text layer will update its value

## Usage
The plugin will update text or images in placeholder layers.
So you can design your own version indicator.

Placeholders which the plugin monitors (on January, 31st 2020 at 3:31:59 PM):
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
* `[lastupdated-image]` :  [Blockies](https://github.com/download13/blockies) image,
* `[lastupdated-increment]` :  1
* `[lastupdated-size-bytes]` :  237234
* `[lastupdated-is-autosaved]` :  0

The placeholders are updated on elements or symbol overrides inside an artboard.
Note: `[lastupdated-image]` can only be used on shapes (like a rectangle) on the artboard, or on images within a symbol.

## Credits
This plugin didn't exist for some great inspiration:
- [Rachit Gupta - Sketch-timestamp](https://github.com/rachit91/sketch-timestamp)
- Great questons on the Sketch plugins forum of [@perrysmotors](https://sketchplugins.com/d/794-how-do-you-update-an-override-with-a-new-image)

<br>

# Releases
## current
- Supports artboard title: `[artboard-title]`
- The placeholders will be updated onDocumentChanged, after 5 seconds
- The document is no longer marked as changed after saving

## v1.2.0
- Marks document as changed on document change instead of selection change (finally). This will prevent unnecessary saves and might be a bit faster.
- Add [size-bytes] and [autosaved] to possible placeholders
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