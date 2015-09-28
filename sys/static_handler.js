var fs = require("fs");
var async = require("async");
var mime = require("mime-types");
var readdir = require("recursive-readdir");

var logf = require("./log.js").logf;
var config = require("../config.json");

function contentTypeLookup(path)
{
	return mime.lookup(path) || "text/plain";
}

function createCachedCallback(filename, content)
{
	var mime = contentTypeLookup(filename);

	return function(response) {
		response.writeHead(200, {
			"Content-Length": content.length,
			"Content-Type": mime
		});

		response.end(content);
	};
}

function createUncachedCallback(filename)
{
	var mime = contentTypeLookup(filename);
	var path = STATIC_DIRECTORY + "/" + filename;

	return function(response) {
		fs.stat(path, function(err, stats) {
			if(err)
			{
				logf("Couldn't stat static file '%s': '%s'",
					filename,
					err.toString()
				);
			}
			else
			{
				response.writeHead(200, {
					"Content-Length": stats.size,
					"Content-Type": mime
				});

				var stream = fs.createReadStream(path);

				stream.on("data", function(chunk) {
					response.write(chunk);
				});

				stream.on("end", function() {
					response.end();
				});

				stream.on("error", function(err) {
					logf("Error reading static file '%s': '%s'",
						filename,
						err.toString()
					);

					response.end();
				});
			}
		});
	};
}

const STATIC_DIRECTORY = "static";

const static_rehash_timeout = config.static_rehash_timeout || 1000;
const rehash_on_static_change = config.rehash_on_static_change || true;
const max_cached_size = config.max_cached_size || 8192;

var handle_map = {};
var rehash_queued = false;

function parseStaticDirectory()
{
	logf("Parsing static file directory '%s'", STATIC_DIRECTORY);

	var new_handle_map = {};

	readdir(STATIC_DIRECTORY, function(err, files) {
		if(err)
		{
			logf("Error reading static file directory '%s': '%s'",
				STATIC_DIRECTORY,
				err.toString()
			);

			throw err;
		}
		else
		{
			logf("Found %d files in static directory", files.length);

			files = files.map(function(name) {
				return name.substring(STATIC_DIRECTORY.length + 1);
			});

			async.each(files, function(filename, callback) {
				var path = STATIC_DIRECTORY + "/" + filename;

				fs.stat(path, function(err, stats) {
					if(err)
					{
						logf("Error statting static file '%s': '%s'",
							filename,
							err.toString()
						);

						callback();
					}
					else if(stats.size <= max_cached_size)
					{
						logf("Static file '%s' has size %d <= %d; caching",
							filename,
							stats.size,
							max_cached_size
						);

						fs.readFile(path, function(err, data) {
							if(err)
							{
								logf("Error reading static file '%s': '%s'",
									filename,
									err.toString()
								);
							}
							else
							{
								logf("Successfully cached static file '%s'",
									filename
								);

								new_handle_map[filename] =
									createCachedCallback(filename, data);

								callback();
							}
						});
					}
					else if(stats.size > max_cached_size)
					{
						logf("Static file '%s' has size %d > %d; not caching",
							filename,
							stats.size,
							max_cached_size
						);

						new_handle_map[filename] =
							createUncachedCallback(filename);

						callback();
					}
				});
			}, function() {
				logf("Finished parsing static directory; found %d files",
					Object.keys(new_handle_map).length
				);

				handle_map = new_handle_map;
				rehash_queued = false;
			});
		}

	});
}

parseStaticDirectory();

if(rehash_on_static_change)
{
	fs.watch(STATIC_DIRECTORY, function() {
		if(!rehash_queued)
		{
			logf(
				"Change detected within static file directory '%s'; " +
				"rehashing in %ds",
				STATIC_DIRECTORY,
				Math.floor(static_rehash_timeout / 1000)
			);

			setTimeout(parseStaticDirectory, static_rehash_timeout);
			rehash_queued = true;
		}
	});
}

module.exports = {
	handle: function(url) {
		if(url.substring(0, 8) === "/static/")
			url = url.substring(8);
		else if(url[0] === '/')
			url = url.substring(1);

		if(url in handle_map)
		{
			return handle_map[url];
		}
		else
		{
			return null;
		}
	}
};
