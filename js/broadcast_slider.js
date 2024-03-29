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

 // These parameters were global, now they are injected. A reference to the
 // Timeslider controller would probably be more appropriate.
function loadBroadcastSliderJS(fireWhenAllScriptsAreLoaded)
{
  var BroadcastSlider;

  (function()
  { // wrap this code in its own namespace
    var sliderLength = 1000;
    var sliderPos = 0;
    var sliderActive = false;
    var slidercallbacks = [];
    var savedRevisions = [];
    var sliderPlaying = false;

    function disableSelection(element)
    {
      element.onselectstart = function()
      {
        return false;
      };
      element.unselectable = "on";
      element.style.MozUserSelect = "none";
      element.style.cursor = "default";
    }
    var _callSliderCallbacks = function(newval)
      {
        sliderPos = newval;
        for (var i = 0; i < slidercallbacks.length; i++)
        {
          slidercallbacks[i](newval);
        }
        }
        
        
        
        
        
    var updateSliderElements = function()
      {
        for (var i = 0; i < savedRevisions.length; i++)
        {
          var position = parseInt(savedRevisions[i].attr('pos'));
          savedRevisions[i].css('left', (position * ($("#ui-slider-bar").width() - 2) / (sliderLength * 1.0)) - 1);
        }
        $("#ui-slider-handle").css('left', sliderPos * ($("#ui-slider-bar").width() - 2) / (sliderLength * 1.0));
        }
        
        
        
        
        
    var addSavedRevision = function(position, info)
      {
        var newSavedRevision = $('<div></div>');
        newSavedRevision.addClass("star");

        newSavedRevision.attr('pos', position);
        newSavedRevision.css('position', 'absolute');
        newSavedRevision.css('left', (position * ($("#ui-slider-bar").width() - 2) / (sliderLength * 1.0)) - 1);
        $("#timeslider-slider").append(newSavedRevision);
        newSavedRevision.mouseup(function(evt)
        {
          BroadcastSlider.setSliderPosition(position);
        });
        savedRevisions.push(newSavedRevision);
        };

    var removeSavedRevision = function(position)
      {
        var element = $("div.star [pos=" + position + "]");
        savedRevisions.remove(element);
        element.remove();
        return element;
        };

    /* Begin small 'API' */

    function onSlider(callback)
    {
      slidercallbacks.push(callback);
    }

    function getSliderPosition()
    {
      return sliderPos;
    }

    function setSliderPosition(newpos)
    {
      newpos = Number(newpos);
      if (newpos < 0 || newpos > sliderLength) return;
      $("#ui-slider-handle").css('left', newpos * ($("#ui-slider-bar").width() - 2) / (sliderLength * 1.0));
      $("a.tlink").map(function()
      {
        $(this).attr('href', $(this).attr('thref').replace("%revision%", newpos));
      });
      $("#revision_label").html("Version " + newpos);

      if (newpos == 0)
      {
        $("#leftstar").css('opacity', .5);
        $("#leftstep").css('opacity', .5);
      }
      else
      {
        $("#leftstar").css('opacity', 1);
        $("#leftstep").css('opacity', 1);
      }

      if (newpos == sliderLength)
      {
        $("#rightstar").css('opacity', .5);
        $("#rightstep").css('opacity', .5);
      }
      else
      {
        $("#rightstar").css('opacity', 1);
        $("#rightstep").css('opacity', 1);
      }

      sliderPos = newpos;
      _callSliderCallbacks(newpos);
    }

    function getSliderLength()
    {
      return sliderLength;
    }

    function setSliderLength(newlength)
    {
      sliderLength = newlength;
      updateSliderElements();
    }

    // just take over the whole slider screen with a reconnect message

    function showReconnectUI()
    {
      if (!clientVars.sliderEnabled || !clientVars.supportsSlider)
      {
        $("#padmain, #rightbars").css('top', "130px");
        $("#timeslider").show();
      }
      $('#error').show();
    }

    function setAuthors(authors)
    {
      $("#authorstable").empty();
      var numAnonymous = 0;
      var numNamed = 0;
      authors.forEach(function(author)
      {
        if (author.name)
        {
          numNamed++;
          var tr = $('<tr></tr>');
          var swatchtd = $('<td></td>');
          var swatch = $('<div class="swatch"></div>');
          swatch.css('background-color', clientVars.colorPalette[author.colorId]);
          swatchtd.append(swatch);
          tr.append(swatchtd);
          var nametd = $('<td></td>');
          nametd.text(author.name || "unnamed");
          tr.append(nametd);
          $("#authorstable").append(tr);
        }
        else
        {
          numAnonymous++;
        }
      });
      if (numAnonymous > 0)
      {
        var html = "<tr><td colspan=\"2\" style=\"color:#999; padding-left: 10px\">" + (numNamed > 0 ? "...and " : "") + numAnonymous + " unnamed author" + (numAnonymous > 1 ? "s" : "") + "</td></tr>";
        $("#authorstable").append($(html));
      }
      if (authors.length == 0)
      {
        $("#authorstable").append($("<tr><td colspan=\"2\" style=\"color:#999; padding-left: 10px\">No Authors</td></tr>"))
      }
    }

    BroadcastSlider = {
      onSlider: onSlider,
      getSliderPosition: getSliderPosition,
      setSliderPosition: setSliderPosition,
      getSliderLength: getSliderLength,
      setSliderLength: setSliderLength,
      isSliderActive: function()
      {
        return sliderActive;
      },
      playpause: playpause,
      addSavedRevision: addSavedRevision,
      showReconnectUI: showReconnectUI,
      setAuthors: setAuthors
    }

    function playButtonUpdater()
    {
      if (sliderPlaying)
      {
        if (getSliderPosition() + 1 > sliderLength)
        {
          $("#playpause_button_icon").toggleClass('pause');
          sliderPlaying = false;
          return;
        }
        setSliderPosition(getSliderPosition() + 1);

        setTimeout(playButtonUpdater, 100);
      }
    }

    function playpause()
    {
      $("#playpause_button_icon").toggleClass('pause');

      if (!sliderPlaying)
      {
        if (getSliderPosition() == sliderLength) setSliderPosition(0);
        sliderPlaying = true;
        playButtonUpdater();
      }
      else
      {
        sliderPlaying = false;
      }
    }

    // assign event handlers to html UI elements after page load
    //$(window).load(function ()
    fireWhenAllScriptsAreLoaded.push(function()
    {
      disableSelection($("#playpause_button")[0]);
      disableSelection($("#timeslider")[0]);

      if (clientVars.sliderEnabled && clientVars.supportsSlider)
      {
        $(document).keyup(function(e)
        {
          var code = -1;
          if (!e) var e = window.event;
          if (e.keyCode) code = e.keyCode;
          else if (e.which) code = e.which;

          if (code == 37)
          { // left
            if (!e.shiftKey)
            {
              setSliderPosition(getSliderPosition() - 1);
            }
            else
            {
              var nextStar = 0; // default to first revision in document
              for (var i = 0; i < savedRevisions.length; i++)
              {
                var pos = parseInt(savedRevisions[i].attr('pos'));
                if (pos < getSliderPosition() && nextStar < pos) nextStar = pos;
              }
              setSliderPosition(nextStar);
            }
          }
          else if (code == 39)
          {
            if (!e.shiftKey)
            {
              setSliderPosition(getSliderPosition() + 1);
            }
            else
            {
              var nextStar = sliderLength; // default to last revision in document
              for (var i = 0; i < savedRevisions.length; i++)
              {
                var pos = parseInt(savedRevisions[i].attr('pos'));
                if (pos > getSliderPosition() && nextStar > pos) nextStar = pos;
              }
              setSliderPosition(nextStar);
            }
          }
          else if (code == 32) playpause();

        });
      }

      $(window).resize(function()
      {
        updateSliderElements();
      });

      $("#ui-slider-bar").mousedown(function(evt)
      {
        setSliderPosition(Math.floor((evt.clientX - $("#ui-slider-bar").offset().left) * sliderLength / 742));
        $("#ui-slider-handle").css('left', (evt.clientX - $("#ui-slider-bar").offset().left));
        $("#ui-slider-handle").trigger(evt);
      });

      // Slider dragging
      $("#ui-slider-handle").mousedown(function(evt)
      {
        this.startLoc = evt.clientX;
        this.currentLoc = parseInt($(this).css('left'));
        var self = this;
        sliderActive = true;
        $(document).mousemove(function(evt2)
        {
          $(self).css('pointer', 'move')
          var newloc = self.currentLoc + (evt2.clientX - self.startLoc);
          if (newloc < 0) newloc = 0;
          if (newloc > ($("#ui-slider-bar").width() - 2)) newloc = ($("#ui-slider-bar").width() - 2);
          $("#revision_label").html("Version " + Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width() - 2)));
          $(self).css('left', newloc);
          if (getSliderPosition() != Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width() - 2))) _callSliderCallbacks(Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width() - 2)))
        });
        $(document).mouseup(function(evt2)
        {
          $(document).unbind('mousemove');
          $(document).unbind('mouseup');
          sliderActive = false;
          var newloc = self.currentLoc + (evt2.clientX - self.startLoc);
          if (newloc < 0) newloc = 0;
          if (newloc > ($("#ui-slider-bar").width() - 2)) newloc = ($("#ui-slider-bar").width() - 2);
          $(self).css('left', newloc);
          // if(getSliderPosition() != Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width()-2)))
          setSliderPosition(Math.floor(newloc * sliderLength / ($("#ui-slider-bar").width() - 2)))
          self.currentLoc = parseInt($(self).css('left'));
        });
      })

      // play/pause toggling
      $("#playpause_button").mousedown(function(evt)
      {
        var self = this;

        $(self).css('background-image', 'url(/static/img/crushed_button_depressed.png)');
        $(self).mouseup(function(evt2)
        {
          $(self).css('background-image', 'url(/static/img/crushed_button_undepressed.png)');
          $(self).unbind('mouseup');
          BroadcastSlider.playpause();
        });
        $(document).mouseup(function(evt2)
        {
          $(self).css('background-image', 'url(/static/img/crushed_button_undepressed.png)');
          $(document).unbind('mouseup');
        });
      });

      // next/prev saved revision and changeset
      $('.stepper').mousedown(function(evt)
      {
        var self = this;
        var origcss = $(self).css('background-position');
        if (!origcss)
        {
          origcss = $(self).css('background-position-x') + " " + $(self).css('background-position-y');
        }
        var origpos = parseInt(origcss.split(" ")[1]);
        var newpos = (origpos - 43);
        if (newpos < 0) newpos += 87;

        var newcss = (origcss.split(" ")[0] + " " + newpos + "px");
        if ($(self).css('opacity') != 1.0) newcss = origcss;

        $(self).css('background-position', newcss)

        $(self).mouseup(function(evt2)
        {
          $(self).css('background-position', origcss);
          $(self).unbind('mouseup');
          $(document).unbind('mouseup');
          if ($(self).attr("id") == ("leftstep"))
          {
            setSliderPosition(getSliderPosition() - 1);
          }
          else if ($(self).attr("id") == ("rightstep"))
          {
            setSliderPosition(getSliderPosition() + 1);
          }
          else if ($(self).attr("id") == ("leftstar"))
          {
            var nextStar = 0; // default to first revision in document
            for (var i = 0; i < savedRevisions.length; i++)
            {
              var pos = parseInt(savedRevisions[i].attr('pos'));
              if (pos < getSliderPosition() && nextStar < pos) nextStar = pos;
            }
            setSliderPosition(nextStar);
          }
          else if ($(self).attr("id") == ("rightstar"))
          {
            var nextStar = sliderLength; // default to last revision in document
            for (var i = 0; i < savedRevisions.length; i++)
            {
              var pos = parseInt(savedRevisions[i].attr('pos'));
              if (pos > getSliderPosition() && nextStar > pos) nextStar = pos;
            }
            setSliderPosition(nextStar);
          }
        });
        $(document).mouseup(function(evt2)
        {
          $(self).css('background-position', origcss);
          $(self).unbind('mouseup');
          $(document).unbind('mouseup');
        });
      })

      if (clientVars)
      {
        if (clientVars.fullWidth)
        {
          $("#padpage").css('width', '100%');
          $("#revision").css('position', "absolute")
          $("#revision").css('right', "20px")
          $("#revision").css('top', "20px")
          $("#padmain").css('left', '0px');
          $("#padmain").css('right', '197px');
          $("#padmain").css('width', 'auto');
          $("#rightbars").css('right', '7px');
          $("#rightbars").css('margin-right', '0px');
          $("#timeslider").css('width', 'auto');
        }

        if (clientVars.disableRightBar)
        {
          $("#rightbars").css('display', 'none');
          $('#padmain').css('width', 'auto');
          if (clientVars.fullWidth) $("#padmain").css('right', '7px');
          else $("#padmain").css('width', '860px');
          $("#revision").css('position', "absolute");
          $("#revision").css('right', "20px");
          $("#revision").css('top', "20px");
        }


        if (clientVars.sliderEnabled)
        {
          if (clientVars.supportsSlider)
          {
            $("#padmain, #rightbars").css('top', "130px");
            $("#timeslider").show();
            setSliderLength(clientVars.totalRevs);
            setSliderPosition(clientVars.revNum);
            clientVars.savedRevisions.forEach(function(revision)
            {
              addSavedRevision(revision.revNum, revision);
            })
          }
          else
          {
            // slider is not supported
            $("#padmain, #rightbars").css('top', "130px");
            $("#timeslider").show();
            $("#error").html("The timeslider feature is not supported on this pad. <a href=\"/ep/about/faq#disabledslider\">Why not?</a>");
            $("#error").show();
          }
        }
        else
        {
          if (clientVars.supportsSlider)
          {
            setSliderLength(clientVars.totalRevs);
            setSliderPosition(clientVars.revNum);
          }
        }
      }
    });
  })();

  BroadcastSlider.onSlider(function(loc)
  {
    $("#viewlatest").html(loc == BroadcastSlider.getSliderLength() ? "Viewing latest content" : "View latest content");
  })

  return BroadcastSlider;
}

exports.loadBroadcastSliderJS = loadBroadcastSliderJS;
});
