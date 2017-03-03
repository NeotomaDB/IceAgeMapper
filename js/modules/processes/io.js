//functions to deal with data loading and communication with the server(s)
var io = (function(){

  //get a saved map configuration from the server
  var getConfiguration = function (configID, callback, host){
    if (host === undefined){
      endpoint = "http://grad.geography.wisc.edu:8080/mapConfigs?configID=" + configID
    }else{
      endpoint = host + configID
    }
    $.ajax("endpoint", {
        type:"GET",
        success: function(data){
          //make sure data came back successfully from neotoma
          if ((data['success']) && data['data'].length > 0){
            //this is the configuration that was returned
            var remoteConfig = data['data'][0]['configdata']
            //combine the defaults in the config module with the
            //specific configuration that was just loaded
            //this future-proofs the application
            //we can add more configuration settings while maintaining old configurations -- hopefully
            config = Object.assign({}, config, remoteConfig)
            //do a one-level deep copy
            for (key in config){
              config[key] = Object.assign({}, config[key], remoteConfig[key])
            }
          }else{
            config = defaultConfiguration
          }
          callback(null) //done with function --> null is passed to a queue awaiting completion
        },
        error: function(xhr, status, err){
          if (err) throw err;
          console.log(xhr.responseText);
          toastr.error(status, "Failed to get configuration")
        }
    }) //end of ajax
  };//end of getConfiguration

  //get a list of taxa from Neotomadb
  var loadTaxa = function(callback){
    //loads the taxa file specified in the configuration object
    //runs the callback specified in the arguments
    $.getJSON(config.dataSources.taxa, function(data){
      callback(data)
    })
  }; //end of loadTaxa

  //get a list of ecological groups from Neotomadb
  var loadEcolGroups = function(callback){
    //load the ecological groups from the file specified in the configuration object
    $.getJSON(config.dataSources.ecolGroups, function(data){
      callback(data )
    })
  }; //end of loadEcolGroups

  //get IceSheet geojson for overlay
 var loadIceSheets =function(callback){
    $.ajax(config.dataSources.icesheets, {
      success: function(d){
        callback(data)
      },
      error: function(xhr, status, error){
        console.log(xhr.reponseText)
        toastr.error(status)
      }
    })
  }; //end of loadIceSheets

  //get information about a specific taxon from Neotoma
  var getTaxonInfo = function(callback){
    if (state.searchSwitch == "browse"){
      query = "?taxonid=" + state.taxonid
    }else if (state.searchSwitch == "search"){
      query = "?taxonname=" + state.taxonname
    }
    endpoint = config.dataSources.taxonInfo + query
    $.getJSON(endpoint, function(data){
      callback(data)
    })
  }; //end of getTaxonInfo

  //get SampleData/Occurrences from Neotoma
  var getOccurrenceData = function(callback){
    //make an AJAX call to Neotoma API
    //get SampleData for the taxon specified by the user
    //search by neotoma id number or by taxonname, depending on search strategy (search vs. browse)
    endpoint = config.dataSources.occurrences
    if (state.searchSwitch == "browse"){
      //this is browse mode
      //the user was using the browse dropdowns
      query = "?taxonids=" + state.taxonid
      state.taxonsearch = state.taxonid
    }else if(state.searchSwitch == "search"){
      //this is search mode
      //the user was using the search text entry
      //use the text instead of the id to support wildcard characters
      query = "?taxonname=" + state.taxonname
      state.taxonsearch = state.taxonname
    }
    endpoint += query
    //limit to bounding box set in configuration object
    endpoint += "&loc=" + config.searchGeoBounds[0] + "," + config.searchGeoBounds[1] + "," + config.searchGeoBounds[2] + "," + config.searchGeoBounds[3]
    //limit to ages set in configuration object
    endpoint += "&ageold=" + config.searchAgeBounds[1]
    endpoint += "&ageyoung=" + config.searchAgeBounds[0]
    $.ajax(endpoint, {
      success: function(data){
        //on success of Neotoma query
        //check to make sure Neotoma returned okay, often it doesn't
        if (data['success']){
          toastr.success("Received " + data['data'].length + " occurrences from Neotoma.", "Occurrences Received.")
          callback(data)
        }else{
            toastr.error("Unexpected Neotoma Server Error. It's their fault. Please come back later.", "Server Error")
            callback(null)
        }
      },
      error: function(xhr, status, error){
        toastr.error("Unable to get data at this time", "Client-Server Communication Error")
        console.log(xhr.reponseText)
      }
    })
  }; // end get occurrence data

  //get dataset metadata from the Neotoma server
  function getDatasets(callback){
    //this gets dataset metdata
    //useful for some analytics since more is returned, and taxonname/taxonid is a parameter
    endpoint = config.dataSources.datasets
    if (state.searchSwitch == "browse"){
      //this is browse mode
      //the user was using the browse dropdowns
      query = "?taxonids=" + globals.state.taxonid
    }else if(state.searchSwitch == "search"){
      //this is search mode
      //the user was using the search text entry
      //use the text instead of the id to support wildcard characters
      query = "?taxonname=" + state.taxonname
    }
    //geoBounds
    endpoint += query + "&loc=" + config.searchGeoBounds[0] + "," + config.searchGeoBounds[1] + "," + config.searchGeoBounds[2] + "," + config.searchGeoBounds[3]
    //limit to ages set in configuration object
    endpoint += "&ageold=" + config.searchAgeBounds[1]
    endpoint += "&ageyoung=" + config.searchAgeBounds[0]
    $.getJSON(endpoint, function(data){
      //check neotoma server success
      if (data['success']){
        callback(data['data'])
        toastr.success("Received " + data['data'].length + " datasets from Neotoma.", "Datasets Recevied.")
      }else{
        toastr.error("Unexpected Neotoma Server Error.", "Server Error")
        callback(error)
      }
    })
  };

  var getTemperatureData = function(callback){
    d3.csv(config.dataSources.NHTemp, function(err, data){
      if (err) throw err;
      callback(data)
    })
  };

  //serialize the state and send it to the server 
  function sendShareRequest(){
    //post the share request to the server
    //return the shareid

    //this is the map configuration
    dat = {
      config: globals.config,
      state: globals.state
    }
    datString = JSON.stringify(dat)

    //get metadata
    author = $("#authorName").val();
    org = $("#authorOrg").val();
    mapTitle = $("#mapTitle").val();
    mapDesc = $("#mapDescription").val();

    if (author == ""){
      toastr.warning("Please enter your name as the map author!")
      return
    }
    if(org == ""){
      //not required at this time
      org = null
    }
    if(mapTitle == ""){
      toastr.warning("Please enter a title for your map!")
      return
    }
    if(mapDesc == ""){
      //not required at this time
      mapDesc = null
    }

    host = globals.config.dataSources.configStore + "?author=" + encodeURIComponent(author) + "&organization=" + encodeURIComponent(org)
    host += "&title=" + encodeURIComponent(mapTitle) + "&description=" + encodeURIComponent(mapDesc)

    console.log(host)

    //send the request
    $.ajax(host, {
      beforeSend: function(){
        console.log("Sharing your map.")
      },
      type: "POST",
      data: datString,
      dataType: "json",
      contentType: "application/json",
      success: function(data){
        console.log("Success!")
        if (data.success){
          toastr.success("Configuration Storage Complete!")
          hash = data['configHash']
          urlString = globals.config.baseURL +"?shareToken="+ hash
          globals.state.shareToken = hash
          $("#shareURL").html("<a href='" + urlString + "'>" + hash + "</a>")
        }else{
          toastr.error("Failed to share map.")
        }
      },
      error: function(xhr, status,err){
        console.log(xhr)
        console.log(status)
        console.log(err)
      }
    })
  }

  return {
    getOccurrenceData: getOccurrenceData,
    getTaxonInfo: getTaxonInfo,
    loadTaxa: loadTaxa,
    loadEcolGroups: loadEcolGroups,
    loadIceSheets: loadIceSheets,
    getConfiguration: getConfiguration,
    getDatasets: getDatasets
  }
})(); //end io module
