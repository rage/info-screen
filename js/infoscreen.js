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
        getEvents: function(org) {
            return $http.get(GITHUB_ROOT + '/orgs/' + org + '/events');
        }
    };
});

infoScreenApp.service('LunchService', function(
    JsonProxy) {
    var LUNCH_URL = 'http://lounasaika.net/api/v1/menus.json';

    return {
        getLunches: function() {
            return JsonProxy.get(LUNCH_URL);
        }
    };
});

infoScreenApp.service('JsonProxy', function($http) {
    return {
        get: function(url) {
            var query = {
                q:      "select * from json where url=\"" + url + "\"",
                format: "json"
            };

            return $http
                .get("https://query.yahooapis.com/v1/public/yql", { params: query })
                .then(function(res) { return res.data.query.results.json.json; });
        }
    };
});

infoScreenApp.controller('InfoScreenCtrl', function ($scope, $interval, TrelloService, GitHubService, LunchService) {
    $scope.doingCards = [];
    $scope.moocCards = [];
    $scope.gitHubEvents = [];
    $scope.lunches = {};

    $scope.extractRepoName = function(name) {
        return name.split('/')[1];
    };

    function update() {
        TrelloService.getCards("53f47cc6966bb91ba14291b7", function(res) {
            $scope.doingCards = res;
        });

        TrelloService.getCards("53fa168af8454125a3d17e12", function(res) {
            $scope.moocCards = res;
        });

        GitHubService.getEvents("rage").success(function(res) {
            $scope.gitHubEvents = res;
        });

        LunchService.getLunches().then(function(res) {
            var today = (new Date().getDay() + 6) % 7;
            $scope.lunches.exactum = _.find(res, function(n) { return n.name == "Unicafe Exactum"; }).meals.fi[today].json;
            $scope.lunches.chemicum = _.find(res, function(n) { return n.name == "Unicafe Chemicum"; }).meals.fi[today].json;
        });
    }

    $interval(update, 1000 * 60 * 5);
    update();
});

infoScreenApp.directive('trelloCards', function() {
    return {
        restrict: 'E',
        scope: {
            cards: '='
        },
        templateUrl: 'partials/trelloCards.html'
    };
});


infoScreenApp.directive('currentTime', ['$interval', 'dateFilter', function($interval, dateFilter) {
    function link(scope, element, attrs) {
        var timeoutId;

        function updateTime() {
            element.text(dateFilter(new Date(), scope.format));
        }

        scope.$watch(attrs.myCurrentTime, function(value) {
            format = value;
            updateTime();
        });

        element.on('$destroy', function() {
           $interval.cancel(timeoutId);
        });

        // start the UI update process; save the timeoutId for canceling
        timeoutId = $interval(function() {
            updateTime(); // update DOM
        }, 1000);
    }

    return {
        link: link,
        scope: {
            format: "@"
        }
    };
}]);

infoScreenApp.directive('transitionPages', function() {
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

/*
 * From http://codepen.io/WinterJoey/pen/sfFaK
 */
infoScreenApp.filter('capitalize', function() {
    return function(input, all) {
        return (!!input) ? input.replace(/([^\W_]+[^\s-]*) */g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) : '';
    };
});

infoScreenApp.directive('transitionPage', function() {
    function link(scope, element, attrs, pagesCtrl) {
        if (!pagesCtrl.isPages()) {
            element.addClass("pt-page-current");
        }
        element.addClass("pt-page");
        pagesCtrl.addPage(element);
    }

    return {
        require: '^transitionPages',
        restrict: 'E',
        transclude: true,
        template: '<div ng-transclude></div>',
        link: link
    };
});