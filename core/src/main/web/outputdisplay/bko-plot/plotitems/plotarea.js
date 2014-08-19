/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils) {

    var PlotArea = function(data){
      this.elements = data.elements;
      delete data.elements;
      $.extend(true, this, data);
      this.format();

      this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
    };

    PlotArea.prototype.respw = 5;
    PlotArea.prototype.respminh = 5;
    PlotArea.prototype.respclass = "plot-resp plot-respstem";

    PlotArea.prototype.render = function(scope){
      if (this.shown === false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      if (this.vlength === 0) {
        this.clear(scope);
      } else {
        this.draw(scope);
      }
    };

    PlotArea.prototype.getRange = function(){
      var eles = this.elements;
      var range = {
        xl : 1E100,
        xr : -1E100,
        yl : 1E100,
        yr : -1E100
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        range.xl = Math.min(range.xl, ele.x);
        range.xr = Math.max(range.xr, ele.x);
        range.yl = Math.min(range.yl, ele.y);
        range.yr = Math.max(range.yr, ele.y2);
      }
      return range;
    };

    PlotArea.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        ele.x = xAxis.getPercent(ele.x);
        ele.y = yAxis.getPercent(ele.y);
        ele.y2 = yAxis.getPercent(ele.y2);
      }
    };

    PlotArea.prototype.createTip = function(ele) {
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var valx = plotUtils.getTipString(ele._x, xAxis, true),
          valy = plotUtils.getTipString(ele._y, yAxis, true),
          valy2 = plotUtils.getTipString(ele._y2, yAxis, true);

      var tip = {};
      if (this.legend != null) {
        tip.title = this.legend;
      }
      tip.x = valx;
      tip.y = valy;
      tip.y2 = valy2;
      return plotUtils.createTipString(tip);
    };

    PlotArea.prototype.format = function(){
      this.itemProps = {
        "id" : this.id,
        "cls" : "plot-area",
        "fi" : this.color,
        "fi_op": this.color_opacity,
        "st": this.stroke,
        "st_w": this.stroke_width,
        "st_op": this.stroke_opacity,
        "pts" : ""
      };
      this.elementProps = [];
      /*
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        var point = {
          "id" : this.id + "_" + i,
          "cls" : "plot-resp plot-respstem",
          "isresp" : true,
          "t_txt" : ele.tip_text,
          "t_clr" : this.color == null ? "gray" : this.color,
          "w" : 5
        };
        this.elementProps.push(point);
      }

      this.resppipe = [];
      */
    };

    PlotArea.prototype.filter = function(scope) {
      var eles = this.elements;
      var l = plotUtils.upper_bound(eles, "x", scope.focus.xl),
          r = plotUtils.upper_bound(eles, "x", scope.focus.xr) + 1;

      l = Math.max(l, 0);
      r = Math.min(r, eles.length - 1);

      if (l > r || l == r && eles[l].x < scope.focus.xl) {
        // nothing visible, or all elements are to the left of the svg, vlength = 0
        l = 0;
        r = -1;
      }
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };

    PlotArea.prototype.prepare = function(scope) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var pstr = "", skipped = false;
      var mapX = scope.data2scrX,
          mapY = scope.data2scrY;

      eleprops.length = 0;

      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];
        var x = mapX(ele.x), y = mapY(ele.y), y2 = mapY(ele.y2);
        if (Math.abs(ele.x) > 1E6 || Math.abs(ele.y) > 1E6) {
          skipped = true;
          break;
        }
        if (this.interpolation === "linear") {
          pstr += x + "," + y + " ";
        } else if (this.interpolation === "none" && i < this.vindexR) {
          var ele2 = eles[i + 1];
          var x2 = mapX(ele2.x);
          if (Math.abs(x2) > 1E6) {
            skipped = true;
            break;
          }
          pstr += x + "," + y + " " + x2 + "," + y + " ";
        }

        if (ele.y <= focus.yr && ele.y2 >= focus.yl) {
          var id = this.id + "_" + i;
          var prop = {
            "id" : id,
            "gid" : this.index,
            "cls" : this.respclass,
            "isresp" : true,
            "w" : this.respw,
            "x" : x - this.respw / 2,
            "y" : y2,
            "h" : Math.max(y - y2, this.respminh),  // min height to be hoverable
            "t_x" : x,
            "t_y" : (y + y2) / 2,
            "op" : scope.tips[id] == null ? 0 : 1,
            "ele" : ele
          };
          eleprops.push(prop);
        }
      }

      for (var i = this.vindexR; i >= this.vindexL; i--) {
        var ele = eles[i];
        var x = mapX(ele.x), y2 = ele.y2 == null ? mapY(focus.yl) : mapY(ele.y2);
        if (Math.abs(y2) > 1E6) { // x is already checked above
          skipped = true;
          break;
        }
        if (this.interpolation === "linear") {
          pstr += x + "," + y2 + " ";
        } else if (this.interpolation === "none" && i < this.vindexR) {
          var ele2 = eles[i + 1];
          var x2 = mapX(ele2.x);
          pstr += x2 + "," + y2 + " " + x + "," + y2 + " ";
        }
      }

      if (skipped === true) {
        console.error("data not shown due to too large coordinate");
      }

      if (pstr.length > 0) {
        this.itemProps.pts = pstr;
      }
    };

    PlotArea.prototype.draw = function(scope) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d){ return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var itemsvg = svg.select("#" + this.id);

      itemsvg.selectAll("polygon")
        .data([props]).enter().append("polygon")
        .attr("class", function(d) { return d.cls; })
        .style("fill", function(d) { return d.fi; })
        .style("fill-opacity", function(d) { return d.fi_op; })
        .style("stroke", function(d) { return d.st; })
        .style("stroke-opacity", function(d) { return d.st_op; })
        .style("stroke-width", function(d) { return d.st_w; });
      itemsvg.select("polygon")
        .attr("points", props.pts);

      var item = this;
      if (scope.stdmodel.useToolTip === true) {
        itemsvg.selectAll("rect")
          .data(eleprops, function(d) { return d.id; }).exit().remove();
        itemsvg.selectAll("rect")
          .data(eleprops, function(d) { return d.id; }).enter().append("rect")
          .attr("id", function(d) { return d.id; })
          .attr("class", function(d) { return d.cls; })
          .attr("width", function(d) { return d.w; })
          .style("stroke", item.tip_color);

        itemsvg.selectAll("rect")
          .data(eleprops, function(d) { return d.id; })
          .attr("x", function(d) { return d.x; })
          .attr("y", function(d) { return d.y; })
          .attr("height", function(d) { return d.h; })
          .style("opacity", function(d) { return d.op; });
      }
    };

    PlotArea.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).remove();
    };

    return PlotArea;
  };
  beaker.bkoFactory('PlotArea', ['plotUtils', retfunc]);
})();