var http = require("http");
var config = require("../config.json");
var logf = require("./log.js").logf;

logf("dcm starting up");

var page_handler = require("./page_handler.js");
var static_handler = require("./static_handler.js");

var server = http.createServer(function(request, response) {
	logf("Received request to URL '%s' from client IP '%s'",
		request.url,
		request.connection.remoteAddress
	);

	request.url = decodeURI(request.url);
	if("index_page" in config && (request.url == "" || request.url == "/"))
		request.url = "/" + config.index_page;

	var page = page_handler.handle(request.url);
	if(page)
	{
		logf("Handling request to '%s' via page handler", request.url);

		response.writeHead(200, {
			"Content-Length": page.data.length,
			"Content-Type": page.type
		});

		response.end(page.data);
	}
	else
	{
		var static_file_callback = static_handler.handle(request.url);
		if(static_file_callback)
		{
			static_file_callback(response);
		}
		else
		{
			logf("Unable to fill request to '%s' - serving 404", request.url);
			response.writeHead(404, {
				"Content-Length": 18,
				"Content-Type": "text/plain"
			});
			response.end("404 File Not Found");
		}
	}
});

server.on("error", function(err) {
	logf("Error from HTTP server: '%s'", err.toString());
});

var port = config.port || 80;
server.listen(port, function() {
	logf("HTTP server listening on port %d", port);
});
