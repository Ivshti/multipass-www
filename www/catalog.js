var Catalog = angular.module('catalog', []);

Catalog.config([ '$compileProvider', function($compileProvider) {   
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|stremio):/);
}]);

Catalog.factory('Items', [ '$q', function($q) {
	var Client = require("stremio-addons").Client;
	var addons = new Client();

	addons.setAuth("http://api8.herokuapp.com","2a240788ce82492744cdd42ca434fc26848ec616");

	addons.add("http://cinemeta-backup.herokuapp.com");
	addons.add("http://stremio-cinemeta.herokuapp.com");
	addons.add(window.location.origin); // multipass add-on

	// NOTE: refresh sometimes
	var popularities = { }
	addons.call("stream.popularities", { }, function(err, res) {
		if (res && res.popularities) popularities = res.popularities;
	});

	return {
		get: function (opts, method) {
			method = method || 'find';
			var p = Object.keys(popularities)
				.map(function(k) { return [k, popularities[k]] })
				.sort(function(a,b) { return b[1] - a[1] }).map(function(x) { return x[0] });
			console.log(p)
			var options = $.extend(true, { query: { imdb_id: { $in: p } }, limit: 40, skip: 0, complete: true, popular: true,
				sort: { popularity: -1 }
			}, opts);
			var deferred = $q.defer();
			addons.meta[method](options,
				function(err, items) {
					if(err) deferred.reject(err); 
					else deferred.resolve(items);
				})
			return deferred.promise;
		},
		popularities: function() {
			return popularities;
		}
	};
}]);

Catalog.controller('CatalogController', ['Items', '$timeout', '$window', '$q', function CatalogController(Items, $timeout, $window, $q) {
	var self = this;

	var imdb_proxy = '/poster/';

	self.loading = false;
	self.query = '';
	self.showType = 'movie';
	self.showGenre = '';
	self.catTypes = {
		movie: { name: 'Movies', genres: {} },
		series: { name: 'TV Shows', genres: {} }
	};

	self.formatImgURL = function formatImgURL(url, width, height) {
		if (!url || -1 === url.indexOf("imdb.com")) return url;

		var splitted = url.split("/").pop().split(".");

		if (1 === splitted.length) return url;

		return imdb_proxy + encodeURIComponent(url.split("/").slice(0,-1).join("/") + "/" + splitted[0] + "._V1._SX" + width + "_CR0,0," + width + "," + height + "_.jpg");
	};


	self.loadCatalog = function loadCatalog(more) {
		if(self.loading || (self.query && more)) return false;

		var parameters = {query: {type: self.showType}};

		if(self.showGenre) {
			parameters.query.genre = self.showGenre;
		}
		if(self.query) {
			parameters.query = self.query;
			// There's no infinite scroll here, so we pull a bit more results
			parameters.limit = 50;
		}
		if(more) {
			parameters.skip = self.movies.length;
		} else {
			self.movies = [];
		}
		self.loading = true;
		return Items.get(parameters, self.query ? 'search' : 'find').then(function(result) {
			var i;
			if(self.query) {
				result = result.results || [];
				self.showType = 'search';
			}
			self.loading = false;
			for(i = 0; i < result.length;i++) {
				self.movies.push(result[i]);
			}
			if( ! more) {
				self.selected = result[0];
			}
		}, function() {
			self.loading = false;
		});
	};

	self.selectGenre = function selectGenre(genre) {
		if(self.showGenre === genre) return;
		self.showGenre = genre;
		self.loadCatalog();
	};

	self.selectType = function selectType(type) {
		if(self.showType === type) return;
		self.showType = type;
		self.query = '';
		self.showGenre = '';
		self.loadCatalog();
	};

	self.selectMovie = function selectMovie(movie) {
		self.selected = movie;
	};

	self.startSearch = function startSearch() {
		self.query = self.query.trim();
		self.movies = [];
		self.loadCatalog();
	};

	self.playMovie = function playMovie(movie) {
		var deferred = $q.defer();
		//deferred.promise.then(updatePlayerPresence);
		$.stremioPlay.info(movie.imdb_id, function(status) {
			deferred.resolve(status);
			if(! status) {
				$window.location = 'stremio://info/'+movie.imdb_id;
			}
		});
	};

	self.downloadLink = function(banner) {
		// TODO
	};
	self.loadCatalog();

	// A single query to load the movies and series categories
	Items.get({limit: 600, query: {}, popular: true, projection:{ type: 1, genre:1 } }).then(function(result) {
		result.forEach(function(res) {
			var type = res.type || 'movie';
			res.genre && res.genre.forEach(function(genre) {
				self.catTypes[type].genres[genre] = 1;
			});
		});
	});
	return self;

}]); 

