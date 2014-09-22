var infoScreenApp = angular.module('infoScreenApp', ['angularMoment']);

infoScreenApp.service('TrelloService', function($rootScope) {
	Trello.authorize();

	return {
		getCards: function(listId, success) {
			Trello.get("lists/" + listId + "/cards", { members: true }).success(function(result) {
				$rootScope.$apply(function() {
					success(result);
				});
			});
		}
	};
});

infoScreenApp.service('GitHubService', function($http) {
	var GITHUB_ROOT = 'https://api.github.com';

	return {
		getCommits: function(owner, repo) {
			return $http.get(GITHUB_ROOT + '/repos/' + owner + '/' + repo + '/commits');
		}
	};
});

infoScreenApp.controller('InfoScreenCtrl', function ($scope, $interval, TrelloService, GitHubService) {
	$scope.doingCards = [];
	$scope.moocCards = [];
	$scope.todoCards = [];
	$scope.cbBackendCommits = [];

	function update() {
		TrelloService.getCards("53f47cc6966bb91ba14291b7", function(res) {
			$scope.doingCards = res;
		});

		TrelloService.getCards("53fa168af8454125a3d17e12", function(res) {
			$scope.moocCards = res;
		});

		TrelloService.getCards("53f47cc6966bb91ba14291b6", function(res) {
			$scope.todoCards = res;
		});

		GitHubService.getCommits("kesapojat", "codebrowser-back-end").success(function(res) {
			$scope.cbBackendCommits = res;
		});
	}

	$interval(update, 1000 * 60 * 5);
	update();
});

infoScreenApp.directive('trellocards', function() {
	return {
		restrict: 'E',
	    scope: {
	    	cards: '='
	    },
	    templateUrl: 'partials/trelloCards.html'
	};
});

infoScreenApp.directive('transitionpages', function() {
	return {
		restrict: 'E',
		scope: {
			transitionInterval: '=transitionInterval'
		},
		transclude: true,
		template: '<div ng-transclude></div>',

		link: function(scope, element, attrs) {
			element.addClass("pt-perspective");
		},
		
		controller: function($scope, $interval) {
			var pages = [];
			var currentPage = 0;

			this.addPage = function(elem) {
				pages.push(elem);
			};

			this.isPages = function() {
				return pages.length !== 0;
			};

			function changeToNextPage() {
				oldPage = currentPage;
				currentPage = (currentPage + 1) % pages.length;

				pages[currentPage].addClass("pt-page-current")
					.addClass("pt-page-moveFromRight")
					.removeClass("pt-page-moveToLeft");

				pages[oldPage].addClass("pt-page-moveToLeft")
					.removeClass("pt-page-moveFromRight");
			}

			timeoutId = $interval(function() {
		        changeToNextPage();
		    }, parseInt($scope.transitionInterval));
		}
	};
});

infoScreenApp.directive('transitionpage', function() {
	function link(scope, element, attrs, pagesCtrl) {
		if (!pagesCtrl.isPages()) {
			element.addClass("pt-page-current");
		}
		element.addClass("pt-page");
		pagesCtrl.addPage(element);
	}

	return {
		require: '^transitionpages',
		restrict: 'E',
		transclude: true,
		template: '<div ng-transclude></div>',
		link: link
	};
});