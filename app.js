/* Toggle development or production */
process.env.environment = "development";

var Sequencer = require("./Sequencer"),
	Sequence = require('./Sequence'),
	SwitchAllLightsOffAction = require('./Action/SwitchAllLightsOff'),
	
	express = require('express'),
	http = require('http'),
	path = require('path'),
	LightsController = require('./Controller/LightsController'),
	CronjobHandler = require('./CronjobHandler');

// Init the sequencer
var sequencer = new Sequencer();
sequencer.setLights(require('./lights'));
sequencer.addSequences(require('./sequences'));

var cronjobHandler = new CronjobHandler(sequencer);
cronjobHandler.addCronjobs(require('./cronjobs'));

/*
 * Web app
 */
var app = express(),
	server = http.createServer(app);

// all environments
app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
//app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
//app.use(express.methodOverride());
app.use(app.router);
app.use(require('less-middleware')( path.join(__dirname, 'public') ));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Create controller and add routes
var controller = new LightsController(sequencer, cronjobHandler);
app.get('/', controller.index.bind(controller));
app.get('/status', controller.status.bind(controller));
app.get('/startSequence/:sequenceId', controller.startSequence.bind(controller));
app.get('/toggleLight/:lightId', controller.toggleLight.bind(controller));
app.get('/toggleEventedSequences', controller.toggleEventedSequences.bind(controller));
app.get('/getNextCronTicks', controller.getNextCronTicks.bind(controller));

// Switch off all lights and create web server and start the cronjobs
sequencer.startSequence(new Sequence('switchAllOff').addAction(new SwitchAllLightsOffAction()), function() {

	server.listen(app.get('port'), function(){
		  console.log('Express server listening on port ' + app.get('port'));
		});
	
	cronjobHandler.start();
});
	
