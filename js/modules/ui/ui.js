var mapModule = require('./map.js');
var layoutModule = require('./layout.js');
var temperatureChartModule = require("./charts/temperatureChart.js");
var IO = require("./../processes/io.js");
var UIUtils = require("./ui-utils.js");
var process = require("./../processes/process.js");
var utils = require("./../processes/utils.js");
var analytics = require("./charts/charts.js");
var dc = require("dc");
var UIEvents = require("./events.js")
var dataTable = require("./dataTable.js");
var sitePanel = require("./sitePanel.js");
var icesheets = require("./icesheets.js");


var ui = (function(){
  var layout, mapChart, map, initialize, temperatureChart;

  var loadWalkthrough = function(){
    console.log("Loading walkthrough...")
    var config = require("./../config/config.js");
    var state = require("./../config/state.js");
    var i = require("intro.js");
    var introJs = i.introJs() //configure so it's recognized as a module
    if (config.walkthrough.loadClean){
      initialize(config, state);
    }else{
      loadFromTaxonName(config.walkthrough.defaultTaxonName)
    }

    introJs.setOption("nextLabel", " > ");
    introJs.setOption("prevLabel", " < ");
    introJs.setOption('overlayOpacity', 0.8);
    introJs.setOption('showProgress', false);
    introJs.start();
  }

  //load a configuration from the database
  var loadFromToken = function(configToken){
    IO.getConfiguration(configToken, initialize)
  };

  var loadFromTaxonName = function(taxonname){
    var config = require("./../config/config.js");
    var state = require("./../config/state.js");
    state.doSearch = true;
    state.searchSwitch = "search"
    state.taxonname = taxonname;
    initialize(config, state)
  }

  var loadFromTaxonID = function(taxonid){
    var config = require("./../config/config.js");
    var state = require("./../config/state.js");
    state.doSearch = true;
    state.searchSwitch = "browse"
    state.taxonid = taxonid;
    initialize(config, state)
  }


  //create a new default configuration
  var loadClean = function(){
    var config = require("./../config/config.js");
    var state = require("./../config/state.js");
    initialize(config, state);
  }

  var create = function(){

    //see if the user passed in any url parameters
    var shareToken = utils.getParameterByName('shareToken');
    var taxonName = utils.getParameterByName('taxonname');
    var taxonID = utils.getParameterByName('taxonid');
    var doWalkthrough = utils.getParameterByName('walkthrough')


    //load preferentially off those parameters --> only one will happen
    if (utils.isValidToken(shareToken)){
      loadFromToken(shareToken)
    }else if(utils.isValidTaxonName(taxonName)){
      loadFromTaxonName(taxonName)
    }else if (utils.isValidTaxonID(taxonID)){
      loadFromTaxonID(taxonID);
    }else if (utils.isValidWalkthroughParameterValue(doWalkthrough)){
      loadWalkthrough();
    }else{
      loadClean();
    }
  }

  var startSessionTimer = function(){
    if (window.config.timer === undefined){
      window.config.timer = {}
    }
     window.config.timer.sessionStart = new Date();
  }

  //initialize a new UI session using the configuration either default or remote
  var  initialize = function(config, state){
    window.config = config;
    window.state = state;

    //check to see if webgl is enabled
    var webGLSupported = UIUtils.checkForWebGLSupport();
    if(!webGLSupported){
      //webgl is not supported
      //possibly engineer fallback here
      //for now, error
       UIUtils.displayWebGLError();
    }
    //keep track of how long user spends on interface
    startSessionTimer();


    //create UI components
    //make the map and its dc container
    mapChart = mapModule.create();
    map = mapChart.map();
    window.map = map; //this is lazy but I'm not sure of another way to enable events

    //render the layout
    layout = layoutModule.create(config, state);

    //create the bottom temperature distribution
    temperatureChartModule.create(config);

    //load some extra components
    UIUtils.createLoadDataWindowComponents(config);

    //get the data from neotoma
    if (state.doSearch){
      IO.getNeotomaData(config, state, onNeotomDataReceipt)
    }
    //make the state record map movements
    UIEvents = require("./events.js");
    UIEvents.enableMapViewLogging(map, state);
    UIEvents.enableSiteDetailsOnMapClick(map);

    UIEvents.enableMapSizeChangeOnWindowResize();

    window.layout = layout;

    icesheets.init();

    icesheets.filter(18000);

  } // end initialize

  function onNeotomDataReceipt(error, occurrences, datasets){
    if (error){
      UIUtils.displayError(error)
      throw error
    }
    //check if there's actually data in there
    if (occurrences.length == 0){
      handleEmptyResponse();
      return
    }

    //get the data ready to plot
    processedData = process.mergeMetadata(occurrences, datasets);
    crossfilteredData = process.crossfilterIt(processedData)

    //assign data to plots
    var charts = analytics.create(crossfilteredData.dimensions, crossfilteredData.groups)
    mapChart.dimension(crossfilteredData.dimensions.geoDimension)
    mapChart.group(crossfilteredData.groups.geoGroup)
    temperatureChart = window.tempChart
    window.charts = charts
    window.charts.temperatureChart = temperatureChart
    window.charts.mapChart = mapChart;

    temperatureChart.dimension(crossfilteredData.dimensions.ageDimension)
    temperatureChart.group(crossfilteredData.groups.ageGroup)

    //generate the data table
    var dt = dataTable.create(crossfilteredData.groups.taxaGroup);

    //go
    UIUtils.applyFilters(state, window.charts);
    window.appData.occurrences = processedData //store references to dimensions and groups

    //open the site panel if requested in the state
    if (state.openSite){
      sitePanel.triggerOpen(state.activeSiteID);
    }
  }

  function handleEmptyResponse(){
    UIUtils.displayEmptySet();
  }

  function render(){
    dc.renderAll();
  }


  return {
    create:create,
    layout: layout,
    mapChart: mapChart,
    map: map,
    temperatureChart: temperatureChart,
    onNeotomDataReceipt: onNeotomDataReceipt
  }
})();

module.exports = ui;
