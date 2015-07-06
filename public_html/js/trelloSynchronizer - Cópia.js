(function () {
    'use strict';

    var app = angular.module('trelloSynchronizer', []);

    app.controller('TrelloSynchronizerController', ['$http', '$timeout', function ($http, $timeout) {
        var dashboard = this;
		
		dashboard.taskChosen = 406110;
		dashboard.taskStatus = '';

        dashboard.tasksList = [];
        dashboard.trelloBoardLists = [];
        dashboard.addedCards = [];
        dashboard.listId = 0;
	
		dashboard.getDesc = function() {
			if (dashboard.taskChosen > 0) {
				$http.get('/loadTasks/' + dashboard.taskChosen)
                    .success(function (data) {
                        console.log('Carga das tarefas bem sucedida!');
						dashboard.tasksList = data;
                    })
                    .error(function (data) {
                        console.log(data);
                });
				$http.get('/getTaskStatus/' + dashboard.taskChosen)
                    .success(function (data) {
						dashboard.taskStatus = data;
                    })
                    .error(function (data) {
                        console.log(data);
                });
			} else {
				console.log('Nenhuma tarefa informada.');
				alert('Informe uma tarefa');
			}
		};

        dashboard.getLists = function(board) {
            dashboard.listId = 0;
            console.log('Carregando listas do quadro: ' + board.id);
            $http.get('/getLists/?boardId=' + board.id)
                .success(function (data) {
                    dashboard.trelloBoardLists = data;
                })
                .error(function (data) {
                    console.log(data);
            });

        };

        //getAjax();
        //$timeout(getAjax, 300 * 1000);

    }]);
}());