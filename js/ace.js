define(function(require, exports, module) { 
/**
 * This code is mostly from the old Etherpad. Please help us to comment this code. 
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

/**
 * Copyright 2009 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// requires: top
// requires: plugins
// requires: undefined

Ace2Editor.registry = {
  nextId: 1
};

var plugins = require('plugins').plugins;

function Ace2Editor()
{
  var ace2 = Ace2Editor;

  var editor = {};
  var info = {
    editor: editor,
    id: (ace2.registry.nextId++)
  };
  var loaded = false;

  var actionsPendingInit = [];

  function pendingInit(func, optDoNow)
  {
    return function()
    {
      var that = this;
      var args = arguments;
      var action = function()
      {
        func.apply(that, args);
      }
      if (optDoNow)
      {
        optDoNow.apply(that, args);
      }
      if (loaded)
      {
        action();
      }
      else
      {
        actionsPendingInit.push(action);
      }
    };
  }

  function doActionsPendingInit()
  {
    $.each(actionsPendingInit, function(i,fn){
      fn()
    });
    actionsPendingInit = [];
  }
  
  ace2.registry[info.id] = info;

  // The following functions (prefixed by 'ace_')  are exposed by editor, but
  // execution is delayed until init is complete
  var aceFunctionsPendingInit = ['importText', 'importAText', 'focus',
  'setEditable', 'getFormattedCode', 'setOnKeyPress', 'setOnKeyDown',
  'setNotifyDirty', 'setProperty', 'setBaseText', 'setBaseAttributedText',
  'applyChangesToBase', 'applyPreparedChangesetToBase',
  'setUserChangeNotificationCallback', 'setAuthorInfo',
  'setAuthorSelectionRange', 'callWithAce', 'execCommand', 'replaceRange'];
  
  $.each(aceFunctionsPendingInit, function(i,fnName){
    var prefix = 'ace_';
    var name = prefix + fnName;
    editor[fnName] = pendingInit(function(){
      info[prefix + fnName].apply(this, arguments);
    });
  });
  
  editor.exportText = function()
  {
    if (!loaded) return "(awaiting init)\n";
    return info.ace_exportText();
  };
  
  editor.getFrame = function()
  {
    return info.frame || null;
  };
  
  editor.getDebugProperty = function(prop)
  {
    return info.ace_getDebugProperty(prop);
  };

  // prepareUserChangeset:
  // Returns null if no new changes or ACE not ready.  Otherwise, bundles up all user changes
  // to the latest base text into a Changeset, which is returned (as a string if encodeAsString).
  // If this method returns a truthy value, then applyPreparedChangesetToBase can be called
  // at some later point to consider these changes part of the base, after which prepareUserChangeset
  // must be called again before applyPreparedChangesetToBase.  Multiple consecutive calls
  // to prepareUserChangeset will return an updated changeset that takes into account the
  // latest user changes, and modify the changeset to be applied by applyPreparedChangesetToBase
  // accordingly.
  editor.prepareUserChangeset = function()
  {
    if (!loaded) return null;
    return info.ace_prepareUserChangeset();
  };

  editor.getUnhandledErrors = function()
  {
    if (!loaded) return [];
    // returns array of {error: <browser Error object>, time: +new Date()}
    return info.ace_getUnhandledErrors();
  };



  function sortFilesByEmbeded(files) {
    var embededFiles = [];
    var remoteFiles = [];

    if (Ace2Editor.EMBEDED) {
      for (var i = 0, ii = files.length; i < ii; i++) {
        var file = files[i];
        if (Object.prototype.hasOwnProperty.call(Ace2Editor.EMBEDED, file)) {
          embededFiles.push(file);
        } else {
          remoteFiles.push(file);
        }
      }
    } else {
      remoteFiles = files;
    }

    return {embeded: embededFiles, remote: remoteFiles};
  }
  function pushRequireScriptTo(buffer) {
    var KERNEL_SOURCE = '/js/require-kernel.js';
    var KERNEL_BOOT = 'require.setRootURI("/js/");\nrequire.setGlobalKeyPath("require");'
    if (Ace2Editor.EMBEDED && Ace2Editor.EMBEDED[KERNEL_SOURCE]) {
      buffer.push('<script type="text/javascript">');
      buffer.push(Ace2Editor.EMBEDED[KERNEL_SOURCE]);
      buffer.push(KERNEL_BOOT);
      buffer.push('<\/script>');
    }
  }
  function pushScriptsTo(buffer) {
    /* Folling is for packaging regular expression. */
    /* $$INCLUDE_JS("/js/ace2_inner.js?callback=require.define"); */
    var ACE_SOURCE = '/js/ace2_inner.js?callback=require.define';
    if (Ace2Editor.EMBEDED && Ace2Editor.EMBEDED[ACE_SOURCE]) {
      buffer.push('<script type="text/javascript">');
      buffer.push(Ace2Editor.EMBEDED[ACE_SOURCE]);
      buffer.push('require("ace2_inner");');
      buffer.push('<\/script>');
    } else {
      buffer.push('<script type="application/javascript" src="' + ACE_SOURCE + '"><\/script>');
      buffer.push('<script type="text/javascript">');
      buffer.push('require("ace2_inner");');
      buffer.push('<\/script>');
    }
  }
  function pushStyleTagsFor(buffer, files) {
    var sorted = sortFilesByEmbeded(files);
    var embededFiles = sorted.embeded;
    var remoteFiles = sorted.remote;

    if (embededFiles.length > 0) {
      buffer.push('<style type="text/css">');
      for (var i = 0, ii = embededFiles.length; i < ii; i++) {
        var file = embededFiles[i];
        buffer.push(Ace2Editor.EMBEDED[file].replace(/<\//g, '<\\/'));
      }
      buffer.push('<\/style>');
    }
    for (var i = 0, ii = remoteFiles.length; i < ii; i++) {
      var file = remoteFiles[i];
      buffer.push('<link rel="stylesheet" type="text/css" href="' + file + '"\/>');
    }
  }

  editor.destroy = pendingInit(function()
  {
    info.ace_dispose();
    info.frame.parentNode.removeChild(info.frame);
    delete ace2.registry[info.id];
    info = null; // prevent IE 6 closure memory leaks
  });

  editor.init = function(containerId, initialCode, doneFunc)
  {

    editor.importText(initialCode);

    info.onEditorReady = function()
    {
      loaded = true;
      doActionsPendingInit();
      doneFunc();
    };

    (function()
    {
      var doctype = "<!doctype html>";

      var iframeHTML = [];

      iframeHTML.push(doctype);
      iframeHTML.push("<html><head>");

      // For compatability's sake transform in and out.
      for (var i = 0, ii = iframeHTML.length; i < ii; i++) {
        iframeHTML[i] = JSON.stringify(iframeHTML[i]);
      }
      plugins.callHook("aceInitInnerdocbodyHead", {
        iframeHTML: iframeHTML
      });
      for (var i = 0, ii = iframeHTML.length; i < ii; i++) {
        iframeHTML[i] = JSON.parse(iframeHTML[i]);
      }

      // calls to these functions ($$INCLUDE_...)  are replaced when this file is processed
      // and compressed, putting the compressed code from the named file directly into the
      // source here.
      // these lines must conform to a specific format because they are passed by the build script:      
      var includedCSS = [];
      var $$INCLUDE_CSS = function(filename) {includedCSS.push(filename)};
      $$INCLUDE_CSS("/css/iframe_editor.css");
      $$INCLUDE_CSS("/css/pad.css");
      $$INCLUDE_CSS("/custom/pad.css");
      pushStyleTagsFor(iframeHTML, includedCSS);

      var includedJS = [];
      var $$INCLUDE_JS = function(filename) {includedJS.push(filename)};
      pushRequireScriptTo(iframeHTML);
      // Inject my plugins into my child.
      iframeHTML.push('\
<script type="text/javascript">\
  require.define("/plugins", null);\n\
  require.define("/plugins.js", function (require, exports, module) {\
    module.exports = parent.parent.require("plugins");\
  });\
</script>\
');
      pushScriptsTo(iframeHTML);

      iframeHTML.push('<style type="text/css" title="dynamicsyntax"></style>');
      iframeHTML.push('</head><body id="innerdocbody" class="syntax" spellcheck="false">&nbsp;</body></html>');

      // Expose myself to global for my child frame.
      var thisFunctionsName = "ChildAccessibleAce2Editor";
      (function () {return this}())[thisFunctionsName] = Ace2Editor;

      var outerScript = 'editorId = "' + info.id + '"; editorInfo = parent.' + thisFunctionsName + '.registry[editorId]; ' + 'window.onload = function() ' + '{ window.onload = null; setTimeout' + '(function() ' + '{ var iframe = document.createElement("IFRAME"); ' + 'iframe.scrolling = "no"; var outerdocbody = document.getElementById("outerdocbody"); ' + 'iframe.frameBorder = 0; iframe.allowTransparency = true; ' + // for IE
      'outerdocbody.insertBefore(iframe, outerdocbody.firstChild); ' + 'iframe.ace_outerWin = window; ' + 'readyFunc = function() { editorInfo.onEditorReady(); readyFunc = null; editorInfo = null; }; ' + 'var doc = iframe.contentWindow.document; doc.open(); var text = (' + JSON.stringify(iframeHTML.join('\n')) + ');doc.write(text); doc.close(); ' + '}, 0); }';

      var outerHTML = [doctype, '<html><head>']

      var includedCSS = [];
      var $$INCLUDE_CSS = function(filename) {includedCSS.push(filename)};
      $$INCLUDE_CSS("/css/iframe_editor.css");
      $$INCLUDE_CSS("/css/pad.css");
      $$INCLUDE_CSS("/custom/pad.css");
      pushStyleTagsFor(outerHTML, includedCSS);

      // bizarrely, in FF2, a file with no "external" dependencies won't finish loading properly
      // (throbs busy while typing)
      outerHTML.push('<link rel="stylesheet" type="text/css" href="data:text/css,"/>', '\x3cscript>\n', outerScript.replace(/<\//g, '<\\/'), '\n\x3c/script>', '</head><body id="outerdocbody"><div id="sidediv"><!-- --></div><div id="linemetricsdiv">x</div><div id="overlaysdiv"><!-- --></div></body></html>');

      var outerFrame = document.createElement("IFRAME");
      outerFrame.frameBorder = 0; // for IE
      info.frame = outerFrame;
      document.getElementById(containerId).appendChild(outerFrame);

      var editorDocument = outerFrame.contentWindow.document;

      editorDocument.open();
      editorDocument.write(outerHTML.join(''));
      editorDocument.close();
    })();
  };

  return editor;
}

exports.Ace2Editor = Ace2Editor;
;
Ace2Editor.EMBEDED = Ace2Editor.EMBEDED || {};
Ace2Editor.EMBEDED["/js/require-kernel.js"] = "var require = (function () {\n/*!\n\n  require-kernel\n\n  Created by Chad Weider on 01/04/11.\n  Released to the Public Domain on 17/01/12.\n\n*/\n\n  /* Storage */\n  var main = null; // Reference to main module in `modules`.\n  var modules = {}; // Repository of module objects build from `definitions`.\n  var definitions = {}; // Functions that construct `modules`.\n  var loadingModules = {}; // Locks for detecting circular dependencies.\n  var definitionWaiters = {}; // Locks for clearing duplicate requires.\n  var fetchRequests = []; // Queue of pending requests.\n  var currentRequests = 0; // Synchronization for parallel requests.\n  var maximumRequests = 2; // The maximum number of parallel requests.\n  var deferred = []; // A list of callbacks that can be evaluated eventually.\n  var deferredScheduled = false; // If deferred functions will be executed.\n\n  var syncLock = undefined;\n  var globalKeyPath = undefined;\n\n  var rootURI = undefined;\n  var libraryURI = undefined;\n\n  var JSONP_TIMEOUT = 60 * 1000;\n\n  function CircularDependencyError(message) {\n    this.name = \"CircularDependencyError\";\n    this.message = message;\n  };\n  CircularDependencyError.prototype = Error.prototype;\n  function ArgumentError(message) {\n    this.name = \"ArgumentError\";\n    this.message = message;\n  };\n  ArgumentError.prototype = Error.prototype;\n\n  /* Utility */\n  function hasOwnProperty(object, key) {\n    // Object-independent because an object may define `hasOwnProperty`.\n    return Object.prototype.hasOwnProperty.call(object, key);\n  }\n\n  /* Deferral */\n  function defer(f_1, f_2, f_n) {\n    deferred.push.apply(deferred, arguments);\n  }\n\n  function _flushDefer() {\n    // Let exceptions happen, but don't allow them to break notification.\n    try {\n      while (deferred.length) {\n        var continuation = deferred.shift();\n        continuation();\n      }\n      deferredScheduled = false;\n    } finally {\n      deferredScheduled = deferred.length > 0;\n      deferred.length && setTimeout(_flushDefer, 0);\n    }\n  }\n\n  function flushDefer() {\n    if (!deferredScheduled && deferred.length > 0) {\n      if (syncLock) {\n        // Only asynchronous operations will wait on this condition so schedule\n        // and don't interfere with the synchronous operation in progress.\n        deferredScheduled = true;\n        setTimeout(_flushDefer, 0);\n      } else {\n        _flushDefer();\n      }\n    }\n  }\n\n  function flushDeferAfter(f) {\n    try {\n      deferredScheduled = true;\n      f();\n      deferredScheduled = false;\n      flushDefer();\n    } finally {\n      deferredScheduled = false;\n      deferred.length && setTimeout(flushDefer, 0);\n    }\n  }\n\n  // See RFC 2396 Appendix B\n  var URI_EXPRESSION =\n      /^(([^:\\/?#]+):)?(\\/\\/([^\\/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?/;\n  function parseURI(uri) {\n    var match = uri.match(URI_EXPRESSION);\n    var location = match && {\n      scheme: match[2],\n      host: match[4],\n      path: match[5],\n      query: match[7],\n      fragment: match[9]\n    };\n    return location;\n  }\n\n  function joinURI(location) {\n    var uri = \"\";\n    if (location.scheme)\n      uri += location.scheme + ':';\n    if (location.host)\n      uri += \"//\" + location.host\n    if (location.host && location.path && location.path.charAt(0) != '/')\n      url += \"/\"\n    if (location.path)\n      uri += location.path\n    if (location.query)\n      uri += \"?\" + location.query\n    if (uri.fragment)\n      uri += \"#\" + location.fragment\n\n    return uri;\n  }\n\n  function isSameDomain(uri) {\n    var host_uri =\n      (typeof location == \"undefined\") ? {} : parseURI(location.toString());\n    var uri = parseURI(uri);\n\n    return (!uri.scheme && !uri.host)\n        || (uri.scheme === host_uri.scheme) && (uri.host === host_uri.host);\n  }\n\n  function mirroredURIForURI(uri) {\n    var host_uri =\n      (typeof location == \"undefined\") ? {} : parseURI(location.toString());\n    var uri = parseURI(uri);\n\n    uri.scheme = host_uri.scheme;\n    uri.host = host_uri.host;\n    return joinURI(uri);\n  }\n\n  function normalizePath(path) {\n    var pathComponents1 = path.split('/');\n    var pathComponents2 = [];\n\n    var component;\n    for (var i = 0, ii = pathComponents1.length; i < ii; i++) {\n      component = pathComponents1[i];\n      switch (component) {\n        case '':\n          if (i == ii - 1) {\n            pathComponents2.push(component);\n            break;\n          }\n        case '.':\n          if (i == 0) {\n            pathComponents2.push(component);\n          }\n          break;\n        case '..':\n          if (pathComponents2.length > 1\n            || (pathComponents2.length == 1\n              && pathComponents2[0] != ''\n              && pathComponents2[0] != '.')) {\n            pathComponents2.pop();\n            break;\n          }\n        default:\n          pathComponents2.push(component);\n      }\n    }\n\n    return pathComponents2.join('/');\n  }\n\n  function fullyQualifyPath(path, basePath) {\n    var fullyQualifiedPath = path;\n    if (path.charAt(0) == '.'\n      && (path.charAt(1) == '/'\n        || (path.charAt(1) == '.' && path.charAt(2) == '/'))) {\n      if (!basePath) {\n        basePath = '/';\n      } else if (basePath.charAt(basePath.length-1) != '/') {\n        basePath += '/';\n      }\n      fullyQualifiedPath = basePath + path;\n    }\n    return fullyQualifiedPath;\n  }\n\n  function setRootURI(URI) {\n    if (!URI) {\n      throw new ArgumentError(\"Invalid root URI.\");\n    }\n    rootURI = (URI.charAt(URI.length-1) == '/' ? URI.slice(0,-1) : URI);\n  }\n\n  function setLibraryURI(URI) {\n    libraryURI = (URI.charAt(URI.length-1) == '/' ? URI : URI + '/');\n  }\n\n  function URIForModulePath(path) {\n    var components = path.split('/');\n    for (var i = 0, ii = components.length; i < ii; i++) {\n      components[i] = encodeURIComponent(components[i]);\n    }\n    path = components.join('/')\n\n    if (path.charAt(0) == '/') {\n      if (!rootURI) {\n        throw new Error(\"Attempt to retrieve the root module \"\n          + \"\\\"\"+ path + \"\\\" but no root URI is defined.\");\n      }\n      return rootURI + path;\n    } else {\n      if (!libraryURI) {\n        throw new Error(\"Attempt to retrieve the library module \"\n          + \"\\\"\"+ path + \"\\\" but no libary URI is defined.\");\n      }\n      return libraryURI + path;\n    }\n  }\n\n  function _compileFunction(code, filename) {\n    return new Function(code);\n  }\n\n  function compileFunction(code, filename) {\n    var compileFunction = rootRequire._compileFunction || _compileFunction;\n    return compileFunction.apply(this, arguments);\n  }\n\n  /* Remote */\n  function setRequestMaximum (value) {\n    value == parseInt(value);\n    if (value > 0) {\n      maximumRequests = value;\n      checkScheduledfetchDefines();\n    } else {\n      throw new ArgumentError(\"Value must be a positive integer.\")\n    }\n  }\n\n  function setGlobalKeyPath (value) {\n    globalKeyPath = value;\n  }\n\n  var XMLHttpFactories = [\n    function () {return new XMLHttpRequest()},\n    function () {return new ActiveXObject(\"Msxml2.XMLHTTP\")},\n    function () {return new ActiveXObject(\"Msxml3.XMLHTTP\")},\n    function () {return new ActiveXObject(\"Microsoft.XMLHTTP\")}\n  ];\n\n  function createXMLHTTPObject() {\n    var xmlhttp = false;\n    for (var i = 0, ii = XMLHttpFactories.length; i < ii; i++) {\n      try {\n        xmlhttp = XMLHttpFactories[i]();\n      } catch (error) {\n        continue;\n      }\n      break;\n    }\n    return xmlhttp;\n  }\n\n  function getXHR(uri, async, callback, request) {\n    var request = request || createXMLHTTPObject();\n    if (!request) {\n      throw new Error(\"Error making remote request.\")\n    }\n\n    function onComplete(request) {\n      // Build module constructor.\n      if (request.status == 200) {\n        callback(undefined, request.responseText);\n      } else {\n        callback(true, undefined);\n      }\n    }\n\n    request.open('GET', uri, !!(async));\n    if (async) {\n      request.onreadystatechange = function (event) {\n        if (request.readyState == 4) {\n          onComplete(request);\n        }\n      };\n      request.send(null);\n    } else {\n      request.send(null);\n      onComplete(request);\n    }\n  }\n\n  function getXDR(uri, callback) {\n    var xdr = new XDomainRequest();\n    xdr.open('GET', uri);\n    xdr.error(function () {\n      callback(true, undefined);\n    });\n    xdr.onload(function () {\n      callback(undefined, request.responseText);\n    });\n    xdr.send();\n  }\n\n  function fetchDefineXHR(path, async) {\n    // If cross domain and request doesn't support such requests, go straight\n    // to mirroring.\n\n    var _globalKeyPath = globalKeyPath;\n\n    var callback = function (error, text) {\n      if (error) {\n        define(path, null);\n      } else {\n        if (_globalKeyPath) {\n          compileFunction(text, path)();\n        } else {\n          var definition = compileFunction(\n              'return (function (require, exports, module) {'\n            + text + '\\n'\n            + '})', path)();\n          define(path, definition);\n        }\n      }\n    }\n\n    var uri = URIForModulePath(path);\n    if (_globalKeyPath) {\n      uri += '?callback=' + encodeURIComponent(globalKeyPath + '.define');\n    }\n    if (isSameDomain(uri)) {\n      getXHR(uri, async, callback);\n    } else {\n      var request = createXMLHTTPObject();\n      if (request && request.withCredentials !== undefined) {\n        getXHR(uri, async, callback, request);\n      } else if (async && (typeof XDomainRequest != \"undefined\")) {\n        getXDR(uri, callback);\n      } else {\n        getXHR(mirroredURIForURI(uri), async, callback);\n      }\n    }\n  }\n\n  function fetchDefineJSONP(path) {\n    var head = document.head\n      || document.getElementsByTagName('head')[0]\n      || document.documentElement;\n    var script = document.createElement('script');\n    if (script.async !== undefined) {\n      script.async = \"true\";\n    } else {\n      script.defer = \"true\";\n    }\n    script.type = \"application/javascript\";\n    script.src = URIForModulePath(path)\n      + '?callback=' + encodeURIComponent(globalKeyPath + '.define');\n\n    // Handle failure of JSONP request.\n    if (JSONP_TIMEOUT < Infinity) {\n      var timeoutId = setTimeout(function () {\n        timeoutId = undefined;\n        define(path, null);\n      }, JSONP_TIMEOUT);\n      definitionWaiters[path].unshift(function () {\n        timeoutId === undefined && clearTimeout(timeoutId);\n      });\n    }\n\n    head.insertBefore(script, head.firstChild);\n  }\n\n  /* Modules */\n  function fetchModule(path, continuation) {\n    if (hasOwnProperty(definitionWaiters, path)) {\n      definitionWaiters[path].push(continuation);\n    } else {\n      definitionWaiters[path] = [continuation];\n      schedulefetchDefine(path);\n    }\n  }\n\n  function schedulefetchDefine(path) {\n    fetchRequests.push(path);\n    checkScheduledfetchDefines();\n  }\n\n  function checkScheduledfetchDefines() {\n    if (fetchRequests.length > 0 && currentRequests < maximumRequests) {\n      var fetchRequest = fetchRequests.pop();\n      currentRequests++;\n      definitionWaiters[fetchRequest].unshift(function () {\n        currentRequests--;\n        checkScheduledfetchDefines();\n      });\n      if (globalKeyPath\n        && typeof document !== 'undefined'\n          && document.readyState\n            && /^loaded|complete$/.test(document.readyState)) {\n        fetchDefineJSONP(fetchRequest);\n      } else {\n        fetchDefineXHR(fetchRequest, true);\n      }\n    }\n  }\n\n  function fetchModuleSync(path, continuation) {\n    fetchDefineXHR(path, false);\n    continuation();\n  }\n\n  function moduleIsLoaded(path) {\n    return hasOwnProperty(modules, path);\n  }\n\n  function loadModule(path, continuation) {\n    // If it's a function then it hasn't been exported yet. Run function and\n    //  then replace with exports result.\n    if (!moduleIsLoaded(path)) {\n      if (hasOwnProperty(loadingModules, path)) {\n        throw new CircularDependencyError(\"Encountered circular dependency.\");\n      } else if (!moduleIsDefined(path)) {\n        throw new Error(\"Attempt to load undefined module.\");\n      } else if (definitions[path] === null) {\n        continuation(null);\n      } else {\n        var definition = definitions[path];\n        var _module = {id: path, exports: {}};\n        var _require = requireRelativeTo(path);\n        if (!main) {\n          main = _module;\n        }\n        try {\n          loadingModules[path] = true;\n          definition(_require, _module.exports, _module);\n          modules[path] = _module;\n          delete loadingModules[path];\n          continuation(_module);\n        } finally {\n          delete loadingModules[path];\n        }\n      }\n    } else {\n      var module = modules[path];\n      continuation(module);\n    }\n  }\n\n  function _moduleAtPath(path, fetchFunc, continuation) {\n    var suffixes = ['', '.js', '/index.js'];\n    if (path.charAt(path.length - 1) == '/') {\n      suffixes = ['index.js'];\n    }\n\n    var i = 0, ii = suffixes.length;\n    var _find = function (i) {\n      if (i < ii) {\n        var path_ = path + suffixes[i];\n        var after = function () {\n          loadModule(path_, function (module) {\n            if (module === null) {\n              _find(i + 1);\n            } else {\n              continuation(module);\n            }\n          });\n        }\n\n        if (!moduleIsDefined(path_)) {\n          fetchFunc(path_, after);\n        } else {\n          after();\n        }\n\n      } else {\n        continuation(null);\n      }\n    };\n    _find(0);\n  }\n\n  function moduleAtPath(path, continuation) {\n    defer(function () {\n      _moduleAtPath(path, fetchModule, continuation);\n    });\n  }\n\n  function moduleAtPathSync(path) {\n    var module;\n    var oldSyncLock = syncLock;\n    syncLock = true;\n    try {\n      _moduleAtPath(path, fetchModuleSync, function (_module) {\n        module = _module;\n      });\n    } finally {\n      syncLock = oldSyncLock;\n    }\n    return module;\n  }\n\n  /* Definition */\n  function moduleIsDefined(path) {\n    return hasOwnProperty(definitions, path);\n  }\n\n  function defineModule(path, module) {\n    if (typeof path != 'string'\n      || !((module instanceof Function) || module === null)) {\n      throw new ArgumentError(\n          \"Definition must be a (string, function) pair.\");\n    }\n\n    if (moduleIsDefined(path)) {\n      // Drop import silently\n    } else {\n      definitions[path] = module;\n    }\n  }\n\n  function defineModules(moduleMap) {\n    if (typeof moduleMap != 'object') {\n      throw new ArgumentError(\"Mapping must be an object.\");\n    }\n    for (var path in moduleMap) {\n      if (hasOwnProperty(moduleMap, path)) {\n        defineModule(path, moduleMap[path]);\n      }\n    }\n  }\n\n  function define(fullyQualifiedPathOrModuleMap, module) {\n    var moduleMap;\n    if (arguments.length == 1) {\n      moduleMap = fullyQualifiedPathOrModuleMap;\n      defineModules(moduleMap);\n    } else if (arguments.length == 2) {\n      var path = fullyQualifiedPathOrModuleMap;\n      defineModule(fullyQualifiedPathOrModuleMap, module);\n      moduleMap = {};\n      moduleMap[path] = module;\n    } else {\n      throw new ArgumentError(\"Expected 1 or 2 arguments, but got \"\n          + arguments.length + \".\");\n    }\n\n    // With all modules installed satisfy those conditions for all waiters.\n    for (var path in moduleMap) {\n      if (hasOwnProperty(moduleMap, path)\n        && hasOwnProperty(definitionWaiters, path)) {\n        defer.apply(this, definitionWaiters[path]);\n        delete definitionWaiters[path];\n      }\n    }\n\n    flushDefer();\n  }\n\n  /* Require */\n  function _designatedRequire(path, continuation) {\n    if (continuation === undefined) {\n      var module = moduleAtPathSync(path);\n      if (!module) {\n        throw new Error(\"The module at \\\"\" + path + \"\\\" does not exist.\");\n      }\n      return module.exports;\n    } else {\n      if (!(continuation instanceof Function)) {\n        throw new ArgumentError(\"Continuation must be a function.\");\n      }\n\n      flushDeferAfter(function () {\n        moduleAtPath(path, function (module) {\n          continuation(module && module.exports);\n        });\n      });\n    }\n  }\n\n  function designatedRequire(path, continuation) {\n    var designatedRequire =\n        rootRequire._designatedRequire || _designatedRequire;\n    return designatedRequire.apply(this, arguments);\n  }\n\n  function requireRelative(basePath, qualifiedPath, continuation) {\n    qualifiedPath = qualifiedPath.toString();\n    var path = normalizePath(fullyQualifyPath(qualifiedPath, basePath));\n    return designatedRequire(path, continuation);\n  }\n\n  function requireRelativeN(basePath, qualifiedPaths, continuation) {\n    if (!(continuation instanceof Function)) {\n      throw new ArgumentError(\"Final argument must be a continuation.\");\n    } else {\n      // Copy and validate parameters\n      var _qualifiedPaths = [];\n      for (var i = 0, ii = qualifiedPaths.length; i < ii; i++) {\n        _qualifiedPaths[i] = qualifiedPaths[i].toString();\n      }\n      var results = [];\n      function _require(result) {\n        results.push(result);\n        if (qualifiedPaths.length > 0) {\n          requireRelative(basePath, qualifiedPaths.shift(), _require);\n        } else {\n          continuation.apply(this, results);\n        }\n      }\n      for (var i = 0, ii = qualifiedPaths.length; i < ii; i++) {\n        requireRelative(basePath, _qualifiedPaths[i], _require);\n      }\n    }\n  }\n\n  var requireRelativeTo = function (basePath) {\n    basePath = basePath.replace(/[^\\/]+$/, '');\n    function require(qualifiedPath, continuation) {\n      if (arguments.length > 2) {\n        var qualifiedPaths = Array.prototype.slice.call(arguments, 0, -1);\n        var continuation = arguments[arguments.length-1];\n        return requireRelativeN(basePath, qualifiedPaths, continuation);\n      } else {\n        return requireRelative(basePath, qualifiedPath, continuation);\n      }\n    }\n    require.main = main;\n\n    return require;\n  }\n\n  var rootRequire = requireRelativeTo('/');\n\n  /* Private internals */\n  rootRequire._modules = modules;\n  rootRequire._definitions = definitions;\n  rootRequire._designatedRequire = _designatedRequire;\n  rootRequire._compileFunction = _compileFunction;\n\n  /* Public interface */\n  rootRequire.define = define;\n  rootRequire.setRequestMaximum = setRequestMaximum;\n  rootRequire.setGlobalKeyPath = setGlobalKeyPath;\n  rootRequire.setRootURI = setRootURI;\n  rootRequire.setLibraryURI = setLibraryURI;\n\n  return rootRequire;\n}());\n";
});
