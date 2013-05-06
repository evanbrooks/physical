// (function(){

  // Constants
  var fric_constant = 0.85;
  var spring_constant = 0.0008;
  var targ_spring_constant = 0.0015;
  var stretch_constant = 0.1;
  var FPS = 30;
  var inset = {x: 30, y: 50};

  // Utilities
  var doc = document;
  var reset = {x:0, y:0};
  var wind = {w: window.innerWidth, h: window.innerHeight};
  var mouse = {x:0, y:0};
  var pmouse = {x:0, y:0};
  var tick = 1000 / FPS;
  var box1, gravitator;
  var this_is_an_iphone = isiPhone();

  $(function(){
    if (this_is_an_iphone) x = 1; //$("body").on("touchmove", finger);
    else                   doc.body.addEventListener("mousemove", cursor, false);
    box1 = new Physical("box1");
    closer = new Physical("close");

    closer.move({x: wind.w + 200, y: wind.h*2/3}).coast();
    box1.move({x: -200, y: wind.h/3}).coast();

    window.onresize = resize;
  });

  function cursor(e) {
    pmouse = mouse;
    mouse = { x: e.pageX, y: e.pageY };
    //$("nav").html(mouse.x + " | " + mouse.y);
  }

  function finger(e) {
    e.preventDefault();
    if (e.changedTouches) {
      pmouse = mouse;
      mouse = { x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
      //$("nav").html(mouse.x + " | " + mouse.y);
    }
  }

  function resize() {
    wind = {w: window.innerWidth, h: window.innerHeight};
  }

  function Physical(selector) {
    var i = this;
    i.move = function(go) {
      i.pos = { x: go.x,
                y: go.y };
      //$("#log").html(build_tform(i.pos.x, i.pos.y, i.pos.vel));
      i.el.style.webkitTransform = build_tform(i.pos.x, i.pos.y, i.pos.vel);
      return i;
    };
    i.make_draggable = function(phys) {
      i.physics = phys;
      //i.$el.mousedown(i.start);
      //$html.mouseup(i.end);
      //$html.mousemove(i.drag);
      if (this_is_an_iphone) {
        doc.body.addEventListener('touchmove',i.drag,false);
        i.el.addEventListener('touchstart',i.start,false);
        doc.body.addEventListener('touchend',i.end,false);
      }
      else {
        i.el.addEventListener('mousedown',i.start,false);
        doc.body.addEventListener('mouseup',i.end,false);
        doc.body.addEventListener('mousemove',i.drag,false);
      }
    };
    i.start = function(e) {
      e.preventDefault();
      if (this_is_an_iphone) finger(e);

      // If animating right now
      i.el.style.webkitAnimationPlayState = "paused";
      i.move({x: i.$el.offset().left, y: i.$el.offset().top});
      i.el.style.webkitAnimationName = "";
      i.inner.style.webkitAnimationName = "";
      i.vel = {x:0, y:0};

      // Begin drag
      i.off = {x: mouse.x - i.pos.x, y: mouse.y - i.pos.y};
      i.am_dragging = true;
      i.didnt_move = true;
    };
    i.drag = function(e) {
      if (this_is_an_iphone) finger(e);
      if (i.am_dragging) {
        i.didnt_move = false;
        if (i.chatting) $("body").removeClass("open");
        i.currT = get_time();
        // console.log(i.currT);
        i.T =  i.currT - i.lastT;
        i.vel = {x: (mouse.x - pmouse.x)/i.T, y: (mouse.y - pmouse.y)/i.T};
        i.move({ x:mouse.x - i.off.x, y: mouse.y - i.off.y });
        i.lastT = i.currT;
        if (i.pos.y > 0.7 * wind.h) $("html").addClass("closable");
        else $("html").removeClass("closable");
      }
    };
    i.end = function() {
      if (i.chatting) $("body").addClass("open");
      i.el.style.webkitAnimationPlayState = "running";
      if (i.am_dragging) {
        i.am_dragging = false;
        if (i.physics) {
          i.anim_list = [];
          i.coast();
          if (i.didnt_move) i.chat();
        }
      }
    };
    function reachedWall() {
        return ( Math.abs(i.vel.x) < 0.1 && Math.abs(i.vel.y) < 0.1 &&
             (Math.abs(i.pos.x - inset.x) < 0.5 || Math.abs(i.pos.x - (wind.w - inset.x)) < 0.5));
    }

    function reachedTarget() {
        return ( Math.abs(i.vel.x) + Math.abs(i.vel.y) < 0.5 &&
                 Math.abs(i.xdist) + Math.abs(i.ydist) < 0.5 );
    }
    i.coast = function() {
      var counter = 0;
      while ( (  i.chatting && !reachedTarget() ) ||
              ( !i.chatting && !reachedWall()   ) ) {
        // spring towards center of gravity

        i.ydist = Math.abs(i.targ.y - i.pos.y);
        i.xdist = Math.abs(i.targ.x - i.pos.x);
        i.dist = Math.sqrt(i.xdist*i.xdist + i.ydist*i.ydist);
        if (!i.chatting) {
          if (i.pos.x < wind.w/2) {
            springwall(i, true); // left
          }
          else if (i.pos.x > wind.w/2) {
            springwall(i, false); // right
          }
        }
        else {
          gravitate(i);
        }

        i.vel.x *= fric_constant;
        i.vel.y *= fric_constant;

        i.pos.x += i.vel.x * tick;
        i.pos.y += i.vel.y * tick;

        var copied = {x: i.pos.x, y: i.pos.y, vel: {x:i.vel.x, y:i.vel.y}};
        i.anim_list.push(copied);

        counter++;
        if (counter > 1000) {
          console.log("Looped more than 1000 times: cancelling!");
          break;
        }
      }

      //$head.append(build_css(i, i.anim_list));

      var css = build_css(i, i.anim_list);
      insert_css(i.anim_id, css);

      var t = (i.anim_list.length)/60;
      //i.$el.css("-webkit-animation", i.anim_id +" "+ t +"s linear 1");
      i.el.style.webkitAnimationName = i.anim_id;
      i.el.style.webkitAnimationDuration = t +"s";
      i.el.style.webkitAnimationTimingFunction = "linear";
      i.inner.style.webkitAnimationName = i.anim_counter_id;
      i.inner.style.webkitAnimationDuration = t +"s";
      i.inner.style.webkitAnimationTimingFunction = "linear";

      // Move to end position for when animation has completed
      i.move(i.pos);

    };
    i.chat = function() {
      if (!i.chatting) {
        i.chatting = true;
        i.stash = i.pos;
        i.targ = {x: wind.w - 50, y: 50};
        i.coast();
      }
      else {
        i.targ = i.stash;
        i.coast();
        i.chatting = false;
        i.coast();
      }
      $("body").toggleClass("open");
    };
    i.initiate = function() {
      i.selector = selector;
      i.$el = $("#" + selector);
      i.el = doc.getElementById(selector);
      i.inner = i.el.getElementsByClassName("inner")[0];
      i.physics = false;
      i.size = {w: i.el.offsetWidth, h: i.el.offsetHeight};
      i.pos = {x:0, y:0};
      i.vel = {x:0, y:0};
      i.targ = {x:0, y:0};
      i.T = 0;
      i.anim_list = [];
      i.lastT = 0;
      i.currT = 0;
      i.anim_id = "anim_0";
      i.chatting = false;
      i.el.addEventListener("webkitAnimationEnd", function(){
        i.el.style.webkitAnimationName = "";
        remove_node(i.anim_id);
      });
      i.inner.addEventListener("webkitAnimationEnd", function(){
        i.inner.style.webkitAnimationName = "";
      });
      i.make_draggable(true);
      //i.$el.on("click", i.chat);
    };
    i.initiate();
  }
  function gravitate(i, targ) {
    var springiness = i.dist * targ_spring_constant;
    var ypercent = (i.targ.y - i.pos.y)/(i.xdist + i.ydist);
    var xpercent = (i.targ.x - i.pos.x)/(i.xdist + i.ydist);
    i.vel.x += xpercent * springiness;
    i.vel.y += ypercent * springiness ;
  }

  function springwall(i, left) {
    var springiness = 0;
    var yspring = 0;
    var xdist, ydist;
    if (left) {
      xdist = inset.x - i.pos.x;
      springiness = xdist * spring_constant;
    }
    else {
      xdist = wind.w - inset.x - i.pos.x;
      springiness = xdist * spring_constant;
    }
    if (i.pos.y < inset.y ) {
      ydist = inset.y - i.pos.y;
      yspring = ydist * spring_constant;
    }
    else if (i.pos.y > wind.h - inset.y ) {
       ydist = wind.h - i.pos.y - inset.y;
       yspring = ydist * spring_constant;
    }
    i.vel.x += springiness;
    i.vel.y += yspring;
  }

  // Reset
  // -----
  function reset(obj) {
    obj.x = 0;
    obj.y = 0;
  }


  // Time utility functions
  // ----------------------
  function get_time() {
    if (window.performance) return performance.now();
    else return Date.now();
  }


  // Transformation Utility functions
  // --------------------------------

  function build_tform(x,y,vel) {
    vel = typeof vel !== 'undefined' ? vel : {x: 0, y: 0};
    var v = 1 + stretch_constant*(Math.sqrt(vel.x*vel.x + vel.y*vel.y));
    var a = Math.atan2(vel.x,vel.y);
      return "translate3d("+
        ~~(x * 1000)/1000 +"px,"+
        ~~(y * 1000)/1000 +"px,0) "+
        //"rotate("+ ~~(-a*100)/100 +"rad) " +
        //"scale(1,"+ ~~(v*100)/100 +")"+
        " ";
  }

  function build_counter_tform(vel) {
    vel = typeof vel !== 'undefined' ? vel : {x: 0, y: 0};
    var a = Math.atan2(vel.x,vel.y);
      return "rotate("+ ~~(a*100)/100 +"rad) ";
  }



  // CSS Utility functions
  // ---------------------

  function build_css(thing, list) {
    var len = list.length;
    thing.anim_id = thing.selector + "-anim_" + (parseInt(thing.anim_id.split("_")[1], 10) + 1);
    thing.anim_counter_id = thing.selector + "-counter_" + (parseInt(thing.anim_id.split("_")[1], 10) + 1);

    // Build first css
    var css = "";
    css += "@-webkit-keyframes "+thing.anim_id+" {";
    for (i = 0; i < len; i++) {
      css += ~~(i/len * 10000)/100 + "% {";
      css += "-webkit-transform: " + build_tform(list[i].x, list[i].y, list[i].vel)+";}\n ";
    }
    css += "}\n";

    // Build counter-rotate css
    // css += "@-webkit-keyframes "+thing.anim_counter_id+" {";
    // for (i = 0; i < len; i++) {
    //   css += ~~(i/len * 10000)/100 + "% {";
    //   css += "-webkit-transform: " + build_counter_tform(list[i].vel)+";}\n ";
    // }
    // css += "}";

    return css;
  }

  function insert_css(id, css) {
          var style = doc.createElement('style');
      style.type = 'text/css';
      style.id = id;
      if (style.styleSheet){
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(doc.createTextNode(css));
      }
      doc.head.appendChild(style);
  }

  function remove_node(id) {
    n = doc.getElementById(id);
    if (n) n.parentNode.removeChild(n);
  }

  function isiPhone(){
    return (
        //Detect iPhone
        (navigator.platform.indexOf("iPhone") != -1) ||
        //Detect iPod
        (navigator.platform.indexOf("iPod") != -1)
    );
  }

// })();
