require.config({
  baseUrl: '/js'
});

define("plugins", function (require, exports, module) {
  module.exports = parent.parent.require("plugins");
});

require(['ace2_inner'], function(ace2_inner) {
});
