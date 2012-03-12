
require.config({
  baseUrl: '/js'
});
var clientVars = {};
require(['pad'], function (pad) {
  //require('/pad').init();

  // var padutils = require('/pad_utils').padutils;

  // padutils.setupGlobalExceptionHandler();

  $(document).ready(function()
    {
      // require('/pad').getParams();
      pad.handshake('http://surf.unhosted.org:82','socket.io', 'azul@5apps.com$testing-things');
    });

  /* TODO: These globals shouldn't exist. */
  chat = require('/chat').chat;
  padeditbar = require('/pad_editbar').padeditbar;
  padimpexp = require('/pad_impexp').padimpexp;
});
