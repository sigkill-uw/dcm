# dcm

dcm is a Dumb Content Manager, by Adam `sigkill` Richardson, for use on my
personal resume site. It serves simple, static content, either HTML generated
from Jade templates ("pages") or files read verbatim from the disk
("static files"). It automatically indexes, precompiles, and caches these
resources, rehashing when a change to either of the content directories 
is detected.

dcm is written in node.js and is licensed under the MIT-Zero license.

## Deployment

Run `npm install` from within the root directory to install all dependencies
(as listed in `package.json`). Run `start.js` to instantiate the HTTP server.

## File/Directory Structure

`start.js` - Run this through node to start the HTTP server.

`config.json` - Configuration file, documented below.

`sys/*` - Internal source directory for the engine

`pages/*` - Directory for Jade templates representing the pages of your site.
Files within this directory (at top level) with the extension `.jade`
are considered to be pages, and are assigned an identifier corresponding
to their filename without the `.jade` extension.

These files are furthermore parsed as follows:

1. The initial lines of the file, up to and including a single blank line,
are extracted and parsed as a JSON object. This object will be provided to
the templating engine under the name `page`, with the addition of the field
`page.id` (containing the the page's identifier).
2. The remainder of the file is extracted, and prepended with the string
`extends ./layout/layout.jade` - your pages are expected to inter-operate with
this template file.
3. The resultant string is compiled, with the `page` paramater provided;
final compiled output is cached by the engine to be served when the URL
`/{identifier}` is requested.

`static/*` - Directory for static content to be served verbatim. Files within
this directory are recursively processed and added to a whitelist, and are
thereafter served from URLs of the form `/static/{filename}` or simply
`/{filename}`. Smaller files are cached in memory, whereas larger files are
read directory from the disk, according to `max_cached_size`.

`layout/*` - Directory for layout templates. The file `layout/layout.jade`
must be provided, and is intended to interoperate with the templates specified
in the `pages` directory.

## Configuration Options

Configuration for the engine is done via `config.json` in the root directory.
`config.json` specifies a single object with the following optional properties:

`port`: Number, default 80. The port on which to listen for HTTP requests.

`max_cached_size`: Number, default 8192. A threshold, in bytes, specifying
which static resources are to be cached in memory and which are to be
retrieved from the disk on request. If the file size exceeds `max_cached_size`,
the given file will not be cached.

`rehash_on_page_change`: Boolean, default true. Specifies whether the engine
should watch the page directory for changes, re-compiling when a change is
detected. `rehash_on_layout_change` and `rehash_on_static_change` are
defined analagously, for changes in the layout and static directories
respectively.

`page_rehash_timeout`: Number, default 1000. Specifies the interval between
a detected change in the page directory and the re-compilation of the pages
therein, in millseconds. `static_rehash_timeout` is defined analagously for
changes to the static directory; changes to the layout operate off the same
timer as changes to the pages.
