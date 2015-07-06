// ### Bibliotecas Usadas ###

var http = require('http');
var express = require('express');
var serveStatic = require('serve-static');
var sql = require('mssql');
var fileSystem = require('fs');
var propertiesReader = require('properties-reader');
var log4js = require('log4js');

// ### Propriedades do Servidor ###

var domain = null;
var port = null;
var host = null;
var app = express();
var properties = null;
var logger = log4js.getLogger();

// ### Propriedades para Autenticação ###

var appName = "Activities";

var databaseConfig = {
    user: null,
    password: null,
    server: null,
    database: null
};

// ### Estruturas de dados ###

var queryTasks;
var queryTaskStatus;

var labelsPriority = ["blue", "blue", "orange", "red"];

var databaseTasks = [];
var taskStatus;

// ### Lê arquivos de configurações ###

log4js.configure('log_configuration.json', { reloadSecs: 300 });

fileSystem.readFile('./tasks.sql', 'utf8', function (error, data) {
	if (error) {
		logger.error(error);
	} else {
		logger.info('Query das tarefas carregado com sucesso do arquivo "tasks.sql"');
		queryTasks = data;	
	}
});

fileSystem.readFile('./taskstatus.sql', 'utf8', function (error, data) {
	if (error) {
		logger.error(error);
	} else {
		logger.info('Query do status da tarefa carregado com sucesso do arquivo "taskstatus.sql"');
		queryTaskStatus = data;	
	}
});

properties = propertiesReader('./configuration.properties');

databaseConfig.user = properties.get('com.synchronizer.database.user');
databaseConfig.password = properties.get('com.synchronizer.database.password');
databaseConfig.server = properties.get('com.synchronizer.database.host');
databaseConfig.database = properties.get('com.synchronizer.database.databaseName');

domain = properties.get('com.synchronizer.server.domain');
port = properties.get('com.synchronizer.server.port');
host = "http://" + domain + ":" + port;

// ### Funções Auxiliares ###

app.use(serveStatic('./public_html', {'index': ['index.html']}));

var toTask = function(record, aId) {	
	if (record.descricao.indexOf("#MNT.ANALISE#") != -1) {	
		logger.info("Análise");
		return {
		  description : "Análise",
		  username: record.usuario
		};		
	} else if (record.descricao.indexOf("#MNT.PROGRAMACAO#") != -1) {
		logger.info("Program");
		return {
		  description : "Programação",
		  username: record.usuario
		};			
	} else if (record.descricao.indexOf("#REVISAO_CODIGO#") != -1) {
		logger.info("Revision");
		return {
		  description : "Revisão de código",
		  username: record.usuario
		};	
	} else if (record.descricao.indexOf("#DOCUMENTACAO#") != -1) {
		return {
		  description : "Documentação",
		  username: record.usuario
		};		
	} else if (record.descricao.indexOf("#ATUALIZAR TESTWARE#") != -1) {
		logger.info("Autom Test");
		return {
		  description : "Automação de Testes",
		  username: record.usuario
		};	
	} else if (record.descricao.indexOf("#EXECUCAO DE TESTES") != -1) {
		logger.info("Exec Test");
		return {
		  description : "Execução de Testes",
		  username: record.usuario
		};		
	} else {	//depois dá de colocar isso num log, para saber quais atividades mais teve a tarefa
		return {
		  description : "Sem Auto Texto",//record.descricao
		  username: record.usuario
		};
	}
};

// ### Tratadores das requisições ###

app.use(function(error, req, res, next) {
	if (error) {
		logger.error(error);
	}
});

app.get('/', function(req, res) {

	res.writeHead(301, {
	  'Location':  host + "/index.html"
	});
	
    return res.end();
	
});

app.get('/getIsMnt/:tarefa_id', function(req, res) {
	var tarefaId = parseInt(req.params.tarefa_id);
	var connection = new sql.Connection(databaseConfig, function(error) {		
		if (error) {
			logger.error(error);
			res.status(500).send(error);
			return;
		}
		var taskStatus = '';
		var request = new sql.Request(connection); 
		request.input('taskId', sql.Int, tarefaId);
		var queryLog = 'select l.LogId from Log l, Tarefa t where t.Natureza = \'Erro\' and t.TarId = l.LogTarId and l.LogTarId = @taskId and CharIndex(\'1134\', l.LogDescricao) > 0 and CharIndex(\'(MANUTENÇÃO)\', l.LogDescricao) > 0';
		request.query(queryLog, function(error, recordset) {

			if (error !== undefined) {

				logger.error(error);
				res.status(500).send(error);
			} else {
				if ( recordset.length > 0 ) {
					logger.info('é da MNT');
					taskStatus = 'Tarefa é da Manutenção';
				} else {
					taskStatus = 'Tarefa não é da Manutenção';
				}
				res.status(200).send(taskStatus);
			}
		});
	});
});

app.get('/loadActivities/:tarefa_id', function(req, res) {

	var tarefaId = parseInt(req.params.tarefa_id);
	var connection = new sql.Connection(databaseConfig, function(error) {
		
		if (error) {
			logger.error(error);
			res.status(500).send(error);
			return;
		}

		databaseTasks = [];

		var request = new sql.Request(connection); 
		request.input('tarefaId', sql.Int, tarefaId);
		request.query(queryTasks, function(error, recordset) {

			if (error !== undefined) {

				logger.error(error);
				res.status(500).send(error);
			} else {

				for (var i = 0; i < recordset.length; i++) {
					databaseTasks.push(toTask(recordset[i], i));
				}
				logger.info(recordset.length +  ' tarefas carregadas');
				logger.info(tarefaId);			
				res.status(200).send(databaseTasks);
			}
		});
	});

});

app.get('/getTaskStatus/:tarefa_id', function(req, res) {
	var tarefaId = parseInt(req.params.tarefa_id);
	var connection = new sql.Connection(databaseConfig, function(error) {		
		if (error) {
			logger.error(error);
			res.status(500).send(error);
			return;
		}
		logger.info('chegou até aqui 1');
		taskStatus = '';
		var request = new sql.Request(connection); 
		request.input('tarefaId', sql.Int, tarefaId);
		request.query(queryTaskStatus, function(error, recset) {
			if (error !== undefined) {
				logger.error(error);
				res.status(500).send(error);
			} else {
				logger.info('antes do if');
				if ( recset.length > 0 ) {
					logger.info('chegou até aqui');
					if (recset[0].localizacao == 'Liberada' && recset[0].fechamento != ''){
						taskStatus = 'Tarefa Fechada';
					} else {
						taskStatus = 'Tarefa Aberta';
					}
					logger.info('chegou até aqui 2');
				}
				logger.info(recset.length +  ' tarefas carregadas');
				logger.info(tarefaId);			
				res.status(200).send(taskStatus);
			}
		});

	});

});

// ### Inicia Servidor ###

app.listen(port);

logger.info("Server running at " + domain + ":" + port + "; hit " + domain + ":" + port + "/login");
logger.info('Configurações carregadas com sucesso do arquivo "configuration.properties"');