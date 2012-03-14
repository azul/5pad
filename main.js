
require.config({
  baseUrl: '/js'
});

var server = localStorage.etherpadServer;
var padName = localStorage.padName;
// set some defaults - http port 80
// TODO: use url for this.
if(server.indexOf('http') != 0) server = "http://" + server;
if(server.lastIndexOf(':') < 7) server = server + ':80';

var clientVars = {};
var socket_lib = server + '/socket.io/socket.io.js';

require([socket_lib, 'pad', 'jquery'], function (io, pad, $) {
  //require('/pad').init();

  // var padutils = require('/pad_utils').padutils;

  // padutils.setupGlobalExceptionHandler();

  $(document).ready(function()
    {
      // require('/pad').getParams();
      pad.handshake(server, 'socket.io', padName);
    });

  /* TODO: These globals shouldn't exist. */
  chat = require('chat').chat;
  padeditbar = require('pad_editbar').padeditbar;
  padimpexp = require('pad_impexp').padimpexp;
});