var mapUtils = require('./map.js');


var layout = (function(){
  var create = function(config, state){
    console.log(config)
    console.log(state)
    this.layout = $('body').layout({
      south: {
        size: config.layout.southPanelSize,
        resizable: config.layout.southPanelResizable,
        initClosed: !state.layout.southPanelIsOpen,
        closable: config.layout.southPanelClosable,
        onresize: function(){
          mapUtils.updateMapSize()
        },
        onclose: function(){
          mapUtils.updateMapSize()
          state.layout.southPanelIsOpen = false
        },
        onopen: function(){
          state.layout.southPanelIsOpen = true
        },
        togglerLength_open:    50,
        togglerLength_closed:  50,
        togglerContent_open:  "<button class='toggleButton'>Close</button>",
        togglerContent_closed: "Timeline"
      },
      west: {
        size: config.layout.westPanelSize,
        resizable: config.layout.westPanelResizable,
        initClosed: !state.layout.westPanelIsOpen,
        closable: config.layout.westPanelClosable,
        onresize: function(){
          mapUtils.updateMapSize()
        },
        onclose: function(){
          mapUtils.updateMapSize()
          state.layout.westPanelIsOpen = false
          state.openSite = false;
        },
        onopen: function(){
          state.layout.westPanelIsOpen = true
        },
        togglerLength_open:    50,
        togglerLength_closed:  50,
        togglerContent_open:   'Close Panel',
        togglerContent_closed: 'Site Details'
      },
      east: {
        size: config.layout.eastPanelSize,
        resizable: config.layout.eastPanelResizable,
        initClosed: !state.layout.eastPanelIsOpen,
        closable: config.layout.eastPanelClosable,
        onresize: function(){
          mapUtils.updateMapSize()
        },
        onclose: function(){
          maputils.updateMapSize()
          state.layout.eastPanelIsOpen = false
        },
        onopen: function(){
          state.layout.eastPanelIsOpen = true
        },
        togglerLength_open:    50,
        togglerLength_closed:  50,
        togglerContent_open:   'Close Panel',
        togglerContent_closed: 'Analytics'
      }
    });
    return this.layout
  }
  return {
    create: create,
    layout: this.layout
  }
})();

module.exports = layout;
