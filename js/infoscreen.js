var infoScreenApp = angular.module('infoScreenApp', ['angularMoment']);
moment.locale('en');

infoScreenApp.service('TrelloService', function($rootScope) {
    Trello.authorize({'expiration': 'never'});

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

infoScreenApp.service('TravisService', function($http) {
    var TRAVIS_ROOT = 'https://api.travis-ci.org';

    return {
        getRepositories: function(org) {
            return $http.get(TRAVIS_ROOT + '/repos/' + org + '.json');
        }
    };
});

infoScreenApp.service('CoverageService', function($http) {
    var COVERAGE_ROOT = 'https://info-screen-api.herokuapp.com/coverages';

    return {
        getCoverages: function() {
            return $http.get(COVERAGE_ROOT);
        }
    }
});

infoScreenApp.service('LunchService', function($http) {
    var LUNCH_URL = 'http://hyy-lounastyokalu-production.herokuapp.com/publicapi/restaurant/';

    function lunchForToday(restaurantData) {
        var today = moment().format("ddd DD.MM");

        return _.find(restaurantData.data, function(day) {
            return day.date_en === today;
        });
    }

    return {
        getLunches: function(restaurant) {
            return $http.get(LUNCH_URL + restaurant).then(function(res) { return lunchForToday(res.data).data; });
        }
    };
});

infoScreenApp.service('NotificationService', function($http) {
    var NOTIFICATIONS_URL = 'http://info-screen-api.herokuapp.com/notifications';

    return {
        getNotifications: function() {
            return $http.get(NOTIFICATIONS_URL);
        }
    };
});

infoScreenApp.service('SoundService', function() {
    /*
     * From http://diveintohtml5.info/everything.html
     */
    function isVorbisSupported() {
        var a = document.createElement('audio');
        return !!(a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ''));
    }

    function loadAudio(filenameWithoutExtension) {
        var extension = "ogg";

        if (!isVorbisSupported()) {
            extension = "mp3";
        }

        return new Audio(filenameWithoutExtension + "." + extension);
    }

    var notificationAudio = loadAudio('sounds/notification');

    return {
        playNotificationSound: function() {
            notificationAudio.play();
        }
    };
});

infoScreenApp.controller('InfoScreenCtrl', function ($scope, $interval, TrelloService, GitHubService, TravisService, CoverageService, LunchService, NotificationService) {
    $scope.pageStack = [];
    $scope.doingCards = [];
    $scope.moocCards = [];
    $scope.gitHubEvents = [];
    $scope.travisRepositories = [];
    $scope.coverages = {};
    $scope.lunches = {};
    $scope.notifications = { data: [] };

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

        TravisService.getRepositories("rage").success(function(res) {
            $scope.travisRepositories = _.reject(res, function(repository) {
                return !repository['last_build_id'];
            });

            $scope.travisRepositories = _.sortBy($scope.travisRepositories, function(repository) {
                return new Date(repository['last_build_finished_at']);
            }).reverse();
        });

        CoverageService.getCoverages().then(function(res) {
            var data = res.data || [];

            $scope.coverages = _.inject(data, function(result, element) {
                result[element.name] = element;
                return result;
            }, {});
        });

        LunchService.getLunches(10).then(function(lunches) {
            $scope.lunches.chemicum = lunches;
        });

        LunchService.getLunches(11).then(function(lunches) {
            $scope.lunches.exactum = lunches;
        });

        NotificationService.getNotifications().then(function(res) {
            res.data.forEach(function(notification) {
                notification.timestamp = new Date(notification.timestamp);
            });

            $scope.notifications.unread = res.data ? Math.max(0, res.data.length - $scope.notifications.data.length) : 0;
            $scope.notifications.lastKnown = _.first($scope.notifications.data);
            $scope.notifications.data = res.data || [];

            if ($scope.notifications.unread > 0) {
                $scope.pageStack.push('notifications');
            }
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
            interval: '=',
            pageStack: '='
        },
        transclude: true,
        template: '<div ng-transclude></div>',

        link: function(scope, element, attrs) {
            element.addClass("pt-perspective");
        },

        controller: function($scope, $interval, SoundService) {
            var pages = [];
            var currentPage = 0;

            this.addPage = function(elem) {
                pages.push(elem);
            };

            this.isPages = function() {
                return pages.length !== 0;
            };

            function findPage(name) {
                for (var i = 0; i < pages.length; i++) {
                    if (pages[i][0].getAttribute('name') === name) {
                        return i;
                    }
                }

                return -1;
            }

            function changeToNextPage() {
                var oldPage = currentPage;

                if (!_.isEmpty($scope.pageStack)) {
                    currentPage = findPage($scope.pageStack.pop());
                    pages[currentPage].addClass("prioritised");
                    SoundService.playNotificationSound();
                } else {
                    currentPage = (currentPage + 1) % pages.length;
                    pages[currentPage].removeClass("prioritised");
                }

                pages[currentPage].addClass("pt-page-current")
                    .addClass("pt-page-moveFromRight")
                    .removeClass("pt-page-moveToLeft")

                pages[oldPage].addClass("pt-page-moveToLeft")
                    .removeClass("pt-page-moveFromRight");
            }

            timeoutId = $interval(function() {
                changeToNextPage();
            }, parseInt($scope.interval));
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
