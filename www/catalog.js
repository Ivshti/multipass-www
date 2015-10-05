var Catalog = angular.module('catalog', []);

Catalog.config([ '$compileProvider', function($compileProvider) {   
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|stremio):/);
}]);

Catalog.factory('Movies', [ '$q', function Movies($q) {
	var Client = require("stremio-addons").Client;
	var addons = new Client();

	addons.setAuth("http://api8.herokuapp.com","2a240788ce82492744cdd42ca434fc26848ec616");

	addons.add("http://cinemeta-backup.herokuapp.com");
	addons.add("http://stremio-cinemeta.herokuapp.com");

	return {
		get: function (opts, method) {
			method = method || 'find';
			var options = $.extend({query: {}, limit: 20, skip: 0, complete: true, popular: true,
				sort: { popularity: -1 }
			}, opts);
			var deferred = $q.defer();
			addons.meta[method](options,
				function(err, items) {
					if(err) deferred.reject(err); 
					else deferred.resolve(items);
				})
			return deferred.promise;
		}
	};
}]);

Catalog.controller('CatalogController', ['Movies', '$timeout', '$window', '$q', function CatalogController(Movies, $timeout, $window, $q) {
	var self = this;
	var lastCheckForPlayer = 0;

	var imdb_proxy = '/poster/';

	self.loading = false;
	self.player = false;
	self.player_seen = !!localStorage.stremioPlayerSeen;
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
		return Movies.get(parameters, self.query ? 'search' : 'find').then(function(result) {
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
				self.smovie = result[0];
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
		self.smovie = movie;
	};

	self.startSearch = function startSearch() {
		self.query = self.query.trim();
		self.movies = [];
		self.loadCatalog();
	};

	self.playMovie = function playMovie(movie) {
		var deferred = $q.defer();
		deferred.promise.then(updatePlayerPresence);
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
	pullPlayerPresense();

	// A single query to load the movies and series categories
	Movies.get({limit: 600, query: {}, popular: true, projection:{ type: 1, genre:1 } }).then(function(result) {
		result.forEach(function(res) {
			var type = res.type || 'movie';
			res.genre && res.genre.forEach(function(genre) {
				self.catTypes[type].genres[genre] = 1;
			});
		});
	});
	return self;

	// Check if the player is running
	function pullPlayerPresense() {
		var deferred = $q.defer();
		deferred.promise.then(updatePlayerPresence);
		var now = new Date().getTime();
		if(now - lastCheckForPlayer < 10000) return;
		lastCheckForPlayer = now;
		//$.stremioPlay.checkPlayer(deferred.resolve);
		if(! self.player) $timeout(pullPlayerPresense, 10000);
	}

	function updatePlayerPresence(status) {
		if(status) {
			self.player = true;
			self.player_seen = localStorage.stremioPlayerSeen = true;
		} else {
			self.player = false;
			pullPlayerPresense();
		}
	}
}]); 

