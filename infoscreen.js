var LIST_ID = "53f47cc6966bb91ba14291b7";

var infoScreenApp = angular.module('infoScreenApp', []);

infoScreenApp.controller('InfoScreenCtrl', function ($scope, $timeout) {
	$scope.cards = [];

	function update() {
		Trello.get("lists/" + LIST_ID + "/cards", { members: true }).success(function(result) {
			$scope.$apply(function() {
				$scope.cards = result;
			});
		});

		$timeout(update, 1000 * 60 * 5);
	}

	update();
});

Trello.authorize();