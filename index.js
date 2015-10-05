var mp = require('multipass-torrent');
var express = require('express');
var http = require('http'),
	url = require('url');

var addon = require('multipass-torrent/stremio-addon/addon').service;

// Default scraping sources TODO: changable by GUI
mp.importQueue.push({ url: 'http://torrentz.eu/search?q=' });
mp.importQueue.push({ url: 'http://torrentz.eu/search?q=?f=&p=1' });
mp.importQueue.push({ url: 'http://kat.cr/movies/?rss=1' });
mp.importQueue.push({ url: 'http://kat.cr/tv/?rss=1' });
// Note: we can add full dumps here

app = express();
app.use(addon.middleware);
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

