var mp = require('multipass-torrent');
var express = require('express');
var http = require('http'),
	url = require('url');

app = express();
app.use(express.static('www'));

app.set('port', process.env.PORT || 7000);
app.get('/poster/:url', function(req, res) {
	var req = http.get(url.parse(decodeURIComponent(req.params.url)), function(resp) {
		resp.headers['cache-control'] = "public, max-age=2592000";
		res.writeHead(resp.statusCode, resp.headers);
		resp.pipe(res);
	});
	req.on('error', function(err) { console.error(err) });
});
app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

