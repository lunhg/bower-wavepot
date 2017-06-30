"use strict"

/*
 * WavepotRuntime
 * @param o 
 * Receives an object with a context, bufferSize and number of channels.
 * It's possible to add the option 'oneliner' === true | false to
 * bytebeat operations
 */
class WavepotRuntime{

    consturctor: function(o) {
	// this cache context
	this.config = o;
	this.scope = new Object();
	this.playing = false;
	this.node = o.context.createScriptProcessor(o.bufferSize, 0, 2);
    }

    setCode: function(code) {
	var text = code.split("\n");
	var l = text.length - 1;
	var i = l
	for(; i>=0; i--){
	    text[i] = text[i].replace(/\&gt;/, ">");
	    text[i] = text[i].replace(/<code><code\/>/, "");
	}
	var _code = code.split("function dsp(){");
	this.code = [
	    "var sampleRate = "+this.config.context.sampleRate+";",
	    "var t = 0;",
	    "var dt = "+(this.config.ratio | 1.0)+"/sampleRate",
	    "var tau = 2 * Math.PI;",
	    "var bpm = 60;",
	    "var controls = {};",
	    "var sin = function(f, a, _t) { return a * Math.sin(tau * f * (_t!==undefined?t+_t:t));};",
	    "var saw = function(f, a, _t) { return (1 - 2 * tmod(f, (_t!==undefined?t+_t:t))) * a; };",
	    "var tmod = function(f, _t) { return (_t!==undefined?t+_t:t) % (1 / f) * f; };" ,
	    "var tri = function(f, a, _t) { return ttri(f, (_t!==undefined?t+_t:t)) * a; };" ,
	    "var ttri = function(f, _t) { return Math.abs(1 - (2 * (_t!==undefined?t+_t:t) * f) % 2 * 2 - 1); };",
	    "this.set_time = function(_t){ t =_t;};",
	    "this.reset = function(){ t=0;};",
	    "this.update = function(){ t += dt; };",
	    
	    // The preload user code
	    _code[0],
	    "this.dsp = function(){ ",
	    
	    // The run code
	    _code[1]
	].join("\n")

	
	var newscope = new Object();
	var fn = new Function(this.code);
	fn.apply(newscope)
	this.scope = newscope;
	return (this.scope.dsp && typeof(this.scope.dsp) === 'function');
    }

    setOnAudioProcess: function(options){
	var that = this
	onChange = options.onChange || function(result) {
	    for (; i >= 0; i--) {
		result = that.scope.dsp();
		
		// A liitle option to bytebeat
		if(that.config.oneliner){
		    result %= that.config.context.sampleRate/4 | 32;
		    result /= that.config.context.sampleRate/2 | 64;
		}
		
		// now, we have to mirror sample if
		// we not want phase changes
		// Choose from an array result (stereo)
		// or make a stereo from the mono result
		out[0][l-i] = result[0] | result;
		out[1][l-i] = result[1] | result;
		that.scope.update();
	    }
	}

	onSame = options.onSame || function(result) {
	    for (; i >= 0; i--) {
		out[0][l-i] = result[0] | result;
		out[1][l-i] = result[1] | result;
	    }
	}

	
	this.node.onaudioprocess = function(e){
	    // Our synth output
	    var out = [e.outputBuffer.getChannelData(0), e.outputBuffer.getChannelData(1)];
	    
	    // decrement is faster than increment
	    var l = out[0].length - 1;
	    var i = l;
	    var result = 0;
	    if(that.scope && that.scope.dsp && that.playing){
		onChange(result);
	    } else {
		onSame(result);
	    }
	}
    }

    play: function(dsp){
	this.node.connect(this.config.context.destination);
	this.playing = true;
    }

    pause: function() {
	this.playing = false;
    }
}

window.WavepotRuntime = WavepotRuntime
