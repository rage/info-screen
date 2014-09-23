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

infoScreenApp.controller('InfoScreenCtrl', function ($scope, $interval, TrelloService, GitHubService) {
    $scope.doingCards = [];
    $scope.moocCards = [];
    $scope.gitHubEvents = [];

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

        GitHubService.getEvents("kesapojat").success(function(res) {
            $scope.gitHubEvents = res;
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