var mp = require('multipass-torrent');
var express = require('express');

app = express();
app.use(express.static('www'));

app.set('port', process.env.PORT || 7000);
app.get('/poster/:url', function(req, res) {
	http.get(url.parse(decodeURIComponent(req.params.url)), function(resp) {
		resp.headers['cache-control'] = "public, max-age=2592000";
		res.writeHead(resp.statusCode, resp.headers);
		resp.pipe(res);
	});
});
app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

