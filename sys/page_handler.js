var fs = require("fs");
var async = require("async");
require("string.prototype.endswith");
var jade = require("jade");

var logf = require("./log.js").logf;
var config = require("../config.json");

const PAGE_DIRECTORY = "pages";
const PAGE_EXTENSION = ".jade";
const PAGE_LAYOUT_DIRECTORY = "layout";
const PAGE_LAYOUT_PATH = "layout/layout.jade";

const page_rehash_timeout = config.page_rehash_timeout || 1000;
const rehash_on_page_change = config.rehash_on_page_change || true;
const rehash_on_layout_change = config.rehash_on_rehash_change || true;

var handle_map;
var page_rehash_queued = false;
var layout_rehash_queued = false;

function parsePages()
{
	logf("Parsing page directory '%s'", PAGE_DIRECTORY);

	page_rehash_queued = false;
	layout_rehash_queued = false;

	var new_handle_map = {};

	fs.readdir(PAGE_DIRECTORY, function(err, files) {
		if(err)
		{
			logf("Error reading page directory '%s': '%s'",
				PAGE_DIRECTORY,
				err.toString()
			);

			throw err;
		}
		else
		{
			files = files.filter(function(v) {
				return v.endsWith(PAGE_EXTENSION);
			});

			logf("Found %d '%s' files in page directory",
				files.length,
				PAGE_EXTENSION
			);

			async.each(files, function(filename, callback) {
				parsePage(filename, new_handle_map, callback);
			}, function() {
				logf("Finished parsing page directory; found %d pages",
					Object.keys(new_handle_map).length
				);

				handle_map = new_handle_map;
			});
		}
	});
}

function parsePage(filename, new_handle_map, callback) {
	var path = PAGE_DIRECTORY + "/" + filename;

	fs.readFile(path, "utf8", function(err, data) {
		if(err)
		{
			logf("Error reading page file '%s': '%s'",
				path,
				err.toString()
			);
		}
		else
		{
			var page_vars = {};
			var index = data.indexOf("\n\n");

			if(index !== -1)
			{
				try
				{
					page_vars =
						JSON.parse(data.substring(0, index));
				}
				catch(e)
				{
					logf(
						"Error parsing page file '%s': " +
						"malformed JSON header; " +
						"defaulting to empty header", path
					);
				}

				data = data.substring(index);
			}


			var pretty_name = filename.substring(
				0, filename.length - PAGE_EXTENSION.length
			);

			page_vars.id = pretty_name;

			data = "extends ./" + PAGE_LAYOUT_PATH + "\n" + data;

			var content = null;
			try
			{
				content = jade.render(data, {
					filename: "./asdf" + PAGE_EXTENSION,
					page: page_vars
				});
			}
			catch(e)
			{
				logf(
					"Error parsing page file '%s': " +
					"jade error '%s'", path, e.toString()
				);
			}

			if(content !== null)
			{
				new_handle_map[pretty_name] = new Buffer(content);
				logf(
					"Successfully parsed page '%s' " +
					"with Content-Length %d",
					pretty_name,
					new_handle_map[pretty_name].length
				);
			}
		}

		callback();
	});
}

parsePages();

if(rehash_on_page_change)
{
	fs.watch(PAGE_DIRECTORY, function() {
		if(!page_rehash_queued)
		{
			logf("Change detected within page directory '%s'; rehashing in %ds",
				PAGE_DIRECTORY,
				Math.floor(page_rehash_timeout / 1000)
			);

			setTimeout(parsePages, page_rehash_timeout);
			page_rehash_queued = true;
		}
	});
}

if(rehash_on_layout_change)
{
	fs.watch(PAGE_LAYOUT_DIRECTORY, function() {
		if(!layout_rehash_queued)
		{
			logf("Change detected within layout directory '%s'; rehashing in %ds",
				PAGE_LAYOUT_DIRECTORY,
				Math.floor(page_rehash_timeout / 1000)
			);

			setTimeout(parsePages, page_rehash_timeout);
			layout_rehash_queued = true;
		}
	});
}

module.exports = {
	handle: function(url) {
		if(url[0] == '/')
			url = url.substring(1);

		if(url in handle_map)
		{
			return {
				type: "text/html",
				data: handle_map[url]
			};
		}
		else
		{
			return null;
		}
	}
};
