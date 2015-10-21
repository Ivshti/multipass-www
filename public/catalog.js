var Catalog = angular.module('catalog', []);

Catalog.config([ '$compileProvider', function($compileProvider) {   
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|stremio):/);
}]);

/*
	Concept: 
	- get the index of IMDB IDs against seeders, start with top
	- get metadata form Cinemeta in chunks of 200, until we collect around 1000 - in memory?
	- display them in Discover, 100 on a page, with category filter optional & filtering within that dataset
*/

Catalog.factory('Items', [ '$q', '$rootScope', '$location', function($q, $scope, $location) {
	var Client = require("stremio-addons").Client;
	var addons = new Client();

	var self = { addons: addons };

	addons.setAuth("http://api8.herokuapp.com","2a240788ce82492744cdd42ca434fc26848ec616");

	addons.add("http://cinemeta-backup.herokuapp.com");
	addons.add("http://stremio-cinemeta.herokuapp.com");

	var addonUrl = $location.search().addon || window.location.origin;
	console.log("Add-on URL: "+addonUrl);
	addons.add(addonUrl); // multipass add-on

	var genres = self.genres = {};
	var items = [];
	// NOTE: refresh sometimes
	var popularities = { };
	addons.call("stream.popularities", { }, function(err, res) {
		if (! (res && res.popularities)) return;

		popularities = res.popularities;

		var p = Object.keys(popularities)
			.map(function(k) { return [k, popularities[k]] })
			.sort(function(a,b) { return b[1] - a[1] }).map(function(x) { return x[0] });
		addons.meta.find({ query: { imdb_id: { $in: p } }, limit: 500, skip: 0, complete: true, popular: true, projection: "lean" }, function(err, r) {
			if (!r) return;

			items = r;
			items.forEach(function(x) { 
				if (! genres[x.type]) genres[x.type] = { };
				if (x.genre) x.genre.forEach(function(g) { genres[x.type][g] = 1 });
			});
			$scope.$apply();
		});
	});
	self.all = function() { return items };
	self.popularities = function() { return popularities };

	return self;
}]);

Catalog.controller('CatalogController', ['Items', '$scope', '$timeout', '$window', '$q', function CatalogController(Items, $scope, $timeout, $window, $q) {
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
	self.genres = Items.genres;

	$scope.$watch(function() { return Items.loading }, function(loading) { self.loading = loading });
	$scope.$watchCollection(function() { return [self.showType, self.showGenre, Items.all().length] }, function() {
		self.items = Items.all().filter(function(x) { 
			return (x.type == self.showType) && 
				(!self.showGenre || (x.genre.indexOf(self.showGenre) > -1))
		});
		self.selected = self.items[0];
	});
	$scope.$watch(function() { return self.selected && self.selected.imdb_id }, function() {
		if (! self.selected) return;
		Items.addons.stream.find({ query: { imdb_id: self.selected.imdb_id } }, function(err, res) { 
			self.selected.streams = res;
			self.selected.stream = res[0];
			console.log(self.selected.stream)
			$scope.$apply();
		});
	});

	self.formatImgURL = function formatImgURL(url, width, height) {
		if (!url || -1 === url.indexOf("imdb.com")) return url;

		var splitted = url.split("/").pop().split(".");

		if (1 === splitted.length) return url;

		return imdb_proxy + encodeURIComponent(url.split("/").slice(0,-1).join("/") + "/" + splitted[0] + "._V1._SX" + width + "_CR0,0," + width + "," + height + "_.jpg");
	};


	self.selectGenre = function selectGenre(genre) {
		if(self.showGenre === genre) return;
		self.showGenre = genre;
	};

	self.selectType = function selectType(type) {
		if (self.showType === type) return;
		self.showType = type;
		self.showGenre = '';
	};

	self.selectMovie = function selectMovie(movie) {
		self.selected = movie;
	};

	self.playMovie = function playMovie(movie) {
		/*
		var deferred = $q.defer();
		deferred.promise.then(updatePlayerPresence);
		$.stremioPlay.info(movie.imdb_id, function(status) {
			deferred.resolve(status);
			if(! status) {
				$window.location = 'stremio://info/'+movie.imdb_id;
			}
		});
		*/
	};

	self.downloadLink = function(banner) {
		// TODO
	};

	return self;
}]); 

