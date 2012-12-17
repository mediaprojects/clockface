/**
Clockface timepicker

Confusion with noon and midnight: 
http://en.wikipedia.org/wiki/12-hour_clock
In clockface considered '00:00 am' as midnight and '12:00 pm' as noon.

**/
(function ($) {

    var Clockface = function (element, options) {
        this.$element = $(element);
        this.options = $.extend({}, $.fn.clockface.defaults, options);
        this.init();  
     };

    Clockface.prototype = {
        constructor: Clockface, 
        init: function () {
          var that = this;

          //iquery objects
          this.$clockface = $($.fn.clockface.template);
          this.$cells = this.$clockface.find('.cell'); 
          this.$hour = this.$clockface.find('input[name="hour"]'); 
          this.$minute = this.$clockface.find('input[name="minute"]'); 
          this.$ampm = this.$clockface.find('.ampm');
          
          this.parseFormat();

          if(this.is24) {
             this.options.am = '12-23';
             this.options.pm = '0-11';
          } 

          //click am/pm 
          this.$ampm.click($.proxy(this.clickAmPm, this));

          //click cell
          this.$clockface.on('click', '.cell', $.proxy(this.clickCell, this));

          //focus + keyup hour
          this.$hour.focus($.proxy(this.focusHour, this))
                    .keyup($.proxy(this.keyupHour, this));

          //focus + keyup minute 
          this.$minute.focus($.proxy(this.focusMinute, this))
                      .keyup($.proxy(this.keyupMinute, this));


          this.isInline = this.$element.is('div');
         
        },

        show: function(value) {
            if(this.isInline) {
                this.$element.empty().append(this.$clockface);
            }
            this.setTime(value);
        },

        /*
        render values around clockface and highlight.
        Uses actual ampm and view param: hour / minute
        and highlight value if possible
        */
        render: function(view) {
          //make viewmode: hour-am, hour-pm, minute
          var viewmode = view === 'hour' ? view + '-' + this.ampm : view,
              values, index, value;

          //fill values if needed
          if(viewmode !== this.viewmode) {
            this.viewmode = viewmode;

            //set css class of view
            this.$clockface.removeClass('hour minute').addClass(view);

            //get values to fill around clockface
            values = this.getValues();
            this.fill(values, viewmode === 'minute');
          } 

          //read value from input
          value = this.viewmode === 'minute' ? this.$minute.val() : this.$hour.val();
          value = parseInt(value, 10);

          //clear current
          this.$cells.filter('.active').removeClass('active');

          //get values for highlight
          values = values || this.getValues();

          //find cell index and highlight
          index = $.inArray(value, values);
          if(index >= 0) {
            this.$cells.eq(index).addClass('active');
          }

          //show (hide) ampm links for 24h 
          if(this.is24) {
            if(viewmode === 'minute') {
               this.$ampm.hide();
            } else {
               this.$ampm.show();
            }
          }          
        },

        /*
        returns values, depending on viewmode (0-11, 12-23, 00-55, etc)
        */
        getValues: function() {
          var values = [11, 0, 1, 10, 2, 9, 3, 8, 4, 7, 6, 5],
              result = [];

          switch(this.viewmode) {
            case 'minute': 
              $.each(values, function(i, v) { result[i] = v*5; });
            break;
            case 'hour-pm': 
              if(this.is24) {
                $.each(values, function(i, v) { result[i] = v+12; });
              } else {
                result = values.slice();
                result[1] = 12; //need this to show '12' instead of '0' for pm
              }
            break;            
            case 'hour-am': 
              result = values;
            break;            
          }

          return result;
        },

        /*
        Just fill any values around clockface
        */ 
        fill: function(values, leadZero) {
          this.$cells.each(function(i){
            var v = values[i];
            if(leadZero && v < 10) {
              v = '0' + v;
            }
            $(this).text(v);
          });
        },

        /*
        Focus hour handler. Does not chnage ampm.
        It just fills values and highlights hour
        */
        focusHour: function() {
            this.render('hour');
        },

        /*
        Keyup hour handler.
        */
        keyupHour: function() {
          clearTimeout(this.timer);
          this.timer = setTimeout($.proxy(function() {
            this.setAmPmByHour();
            this.render('hour');
          }, this), 400);
        }, 

        /*
        Set ampm by hiur value in the input sothat it will be 100% highlighted
        May correct value in input (e.g. 23 --> 11 pm)
        */
        setAmPmByHour: function() {
            value = parseInt(this.$hour.val(), 10);

            //'24' always '0'
            if(value === 24) {
              value = 0;
              this.$hour.val(value);
            }

            if(value > 11 && value < 24) {
              this.setAmPm('pm');
              //for 12h format correct value in input
              if(!this.is24 && value > 12) {
                this.$hour.val(value-12);
              }
            } else if(value >= 0 && value < 11) {
              //always set am for 24h and for '0' in 12h 
              if(this.is24 || value === 0) {
                 this.setAmPm('am');
              } 
              //otherwise do nothing with ampm
            }            
        },        

        /*
        Click cell handler.
        Writes new value and set focus. Focus will automatically highlight cell.
        */
        clickCell: function(e) {
          if(this.viewmode === 'minute') {
            this.$minute.val($(e.target).text()).focus();
          } else {
            this.$hour.val($(e.target).text()).focus();
          } 
        },

        /*
        Click handler on ampm links
        Highlights ampm and set focus on input. Focus will automatically re-fill values if needed.
        */
        clickAmPm: function(e) {
           e.preventDefault();
           this.setAmPm(this.ampm === 'am' ? 'pm' : 'am');

           if(this.viewmode === 'minute') {
              this.$minute.focus(); 
           } else {
              this.$hour.focus();
           }
        },
        
        /*
        Fous minute handler.
        It just fills values and highlights minute
        */
        focusMinute: function() {
            this.render('minute');
        },

        /*
        Keyup minute handler.
        */
        keyupMinute: function() {
          clearTimeout(this.timer);
          this.timer = setTimeout($.proxy(function() {
            this.render('minute');
          }, this), 400);
        }, 

        /*
        Highlight am / pm links
        */
        setAmPm: function(value) {
          if(value === this.ampm) {
             return;
          } else {
             this.ampm = value;
          }

          this.$ampm.text(this.ampm === 'am' ? this.options.am : this.options.pm);
        },

        /*
        Parse format from options and set this.is24
        */
        parseFormat: function() {
          var format = this.options.format,
              hFormat = 'HH',
              mFormat = 'mm';

          //hour format    
          $.each(['HH', 'hh', 'H', 'h'], function(i, f){
            if(format.indexOf(f) !== -1) {
              hFormat = f;
              return false;
            }
          });

          //minute format
          $.each(['mm', 'm'], function(i, f){
            if(format.indexOf(f) !== -1) {
              mFormat = f;
              return false;
            }
          });          

          //is 24 hour format
          this.is24 = hFormat.indexOf('H') !== -1; 

          this.hFormat = hFormat;
          this.mFormat = mFormat;
        },

        /*
        Parse value passed as string or Date object
        */
        parseTime: function(value) {
          var d = new Date(),
              hour = d.getHours(), 
              minute = '00', 
              ampm = 'am', 
              parts;

          if(value instanceof Date) {
            hour = value.getHours();
            minute = value.getMinutes();
          } else if(typeof value === 'string' && value.length) {
            //parse from string
            //see http://stackoverflow.com/questions/141348/what-is-the-best-way-to-parse-a-time-into-a-date-object-from-user-input-in-javas
            parts = value.match(/(\d\d?)([:\-\.]?(\d\d?))?\s*(a|p)?/i);
            if(parts.length) {
                hour = parseInt(parts[1], 10);
                minute = parseInt(parts[3], 10);
                if(parts[4]) {
                  ampm = parts[4].toLowerCase() === 'a' ? 'am' : 'pm';
                }
            }
          } 

          if(minute < 10) {
            minute = '0' + minute;
          } 

          return {hour: hour, minute: minute, ampm: ampm};
        },

        /*
        Returns time as string in specified format
        */
        getTime: function() {
          var hour = parseInt(this.$hour.val(), 10),
              minute = parseInt(this.$minute.val(), 10),
              result = this.options.format;

          if(this.hFormat.length > 1 && hour < 10) {
            hour = '0' + hour;
          }   

          if(this.mFormat.length > 1 && minute < 10) {
            minute = '0' + minute;
          }

          result = result.replace(this.hFormat, hour).replace(this.mFormat, minute);
          if(!this.is24) {
            if(result.indexOf('A') !== -1) {
               result = result.replace('A', this.ampm.toUpperCase());
            } else {
               result = result.replace('a', this.ampm);
            }
          }

          return result;
        },

        /*
        Set time of clockface.
        Value can be Date object or string
        */
        setTime: function(value) {
            //initial hour and minute
            var res = this.parseTime(value);

            this.$hour.val(res.hour);
            this.$minute.val(res.minute);

            //for 12h and hour <= 11 set ampm manually from value
            if(!this.is24 && res.hour <= 11) {
              this.setAmPm(res.ampm);
            } else { //calc ampm automatically
              this.setAmPmByHour();
            }

            this.$hour.focus();
        }
    };

    $.fn.clockface = function ( option ) {
        var args = Array.apply(null, arguments);
        args.shift();
        return this.each(function () {
            var $this = $(this),
            data = $this.data('clockface'),
            options = typeof option == 'object' && option;
            if (!data) {
                $this.data('clockface', (data = new Clockface(this, options)));
            }
            if (typeof option == 'string' && typeof data[option] == 'function') {
                data[option].apply(data, args);
            }
        });
    };  
    
    $.fn.clockface.defaults = {
        //see http://momentjs.com/docs/#/displaying/format/
        format: 'H:mm',
        am: 'AM',
        pm: 'PM'
    };
   

 $.fn.clockface.template = ''+
      '<div class="clockface">' +
          '<div class="l1">' +
              '<div class="cell"></div>' +
              '<div class="cell"></div>' +
              '<div class="cell"></div>' +
          '</div>' +
          '<div class="l2">' +
                '<div class="cell left"></div>' +
                '<div class="cell right"></div>' +
                // '<div class="center"><a href="#" class="am active">am</a><a href="#" class="pm">pm</a></div>' +
                '<div class="center"><a href="#" class="ampm"></a></div>' +
          '</div>'+
          '<div class="l3">' +
                '<div class="cell left"></div>' +
                '<div class="cell right"></div>' +
                '<div class="center"><input type="text" name="hour" maxlength="2"><span>:</span><input type="text" name="minute" maxlength="2"></div>' +
          '</div>'+
          '<div class="l4">' +
                '<div class="cell left"></div>' +
                '<div class="cell right"></div>' +
                // '<div class="center"><button class="btn btn-mini" type="button">ok</button></div>' +
                '<div class="center"></div>' +
          '</div>'+
          '<div class="l5">' +
                '<div class="cell"></div>' +
                '<div class="cell"></div>' +
                '<div class="cell"></div>' +
          '</div>'+
      '</div>';  

}(window.jQuery));