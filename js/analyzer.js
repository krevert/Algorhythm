var Analyzer = (function() {

    var audioCtx, ctx;
    var width, height;

    var nodes;
    var intervalId;

    var settings;
    
    var initialized = false;
    
    var dirtyFlag = true;

    var init = function(s) {

        if (initialized)
            return;
        
        initialized = true;
        
        settings = s;

        var canvas = document.getElementById("paintdevice");
        ctx = canvas.getContext('2d');
        width = canvas.width  = window.innerWidth  * 0.95;
        height = canvas.height = window.innerHeight * 0.95;

        audioCtx = typeof webkitAudioContext != 'undefined' ? new webkitAudioContext() : null;

        if (!(ctx && audioCtx)) {
            return browserError;
        }

        window.addEventListener('dragover', function(event) {
            event.preventDefault();
        }, false);

        window.addEventListener('drop', function(event) {
            event.stopPropagation();
            event.preventDefault();
            if (!reset()) {
                return;
            }
            Loader.loadFile(event.dataTransfer.files, play, printErrorMessage);
        }, false);

        //document.getElementById('openSoundFile').addEventListener('change', function(event) {
        //    if (!reset()) {
        //        return;
        //    }
        //    Loader.loadFile(event.target.files, play, printErrorMessage);
        //}, false);

        nodes = new Array;

        ctx.strokeStyle = "hsl(720, 100%, 50%)";
        ctx.fillStyle = document.body.style.backgroundColor;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
     
        window.onresize = function() {
            width = canvas.width  = window.innerWidth  * 0.95;
            height = canvas.height = window.innerHeight * 0.95;
            if (ctx) {
                ctx.clearRect(0, 0, width, height);
            }
            ctx.lineWidth = 3;
            dirtyFlag = true;
        }
        
        return loadDefaultFile;

    }
    
    var loadDefaultFile = function() {
        Loader.requestFile("content/CloudCompany.mp3", play, printErrorMessage);
    }
    
    var browserError = function() {
         printErrorMessage("Missing canvas and/or audio api =(");
    }

    var printErrorMessage = function(msg) {
        console.log("Error!");
        var errorElement = document.getElementById('errorMessage');
        errorElement.innerHTML = msg;
        var errorStyle = errorElement.style;
        errorStyle.transform = errorStyle.webkitTransform = errorStyle.MozTransform = 'scale(1.0)';
        errorStyle.opacity = 0.6;
        window.setTimeout(function() {
            errorStyle.transform = errorStyle.webkitTransform = errorStyle.MozTransform = 'scale(0.0)';
            errorStyle.opacity = 0.1;
        }, 3500);
    }

    var reset = function() {

        if (nodes) {
            for (var i=0; i < nodes.length; i++) {
                nodes[i].disconnect();
            }
        }

        // it seems that the following lines improve memory footprint,
        // but I have to investigate further here
        delete nodes;
        delete audioCtx;
        nodes = new Array();
        audioCtx = webkitAudioContext ? new webkitAudioContext() : null;
        if (!audioCtx) {
            return false;
        }

        if (ctx) {
            ctx.clearRect(0, 0, width, height);
        }

        if (intervalId) {
            window.clearInterval(intervalId);
            intervalId = undefined;
        }

        return true;

    }

    var processAudioData = function() {

        var analyzerNode = audioCtx.createAnalyser();

        var hue;
        var oldHue = -1;

        var fftSize = 2048;
        //we don't draw all fft samples, just some interesting ones
        var usedFftSize = fftSize * 0.25;

        var data = new Uint8Array(fftSize);

        analyzerNode.fftSize = fftSize;
        analyzerNode.smoothingTimeConstant = 0.75;
        nodes.push(analyzerNode);

        intervalId = window.setInterval(function() {

            var sum  = 0, len = 0, rot = 0;

            var lines = settings.lines;
            var samplesPerLine = Math.floor(usedFftSize / lines);
            var step = (Math.PI * 2 * settings.circles) / lines;

            ctx.beginPath();

            ctx.globalAlpha = settings.exposure;
            ctx.rect(0, 0, width, height);
            ctx.fill();
            ctx.globalAlpha = settings.brightness;

            ctx.beginPath();
            analyzerNode.getByteFrequencyData(data);

            ctx.save();
            ctx.moveTo(width * 0.5, height * 0.5);
            for (var j=0; j < usedFftSize; j++) {
                sum += data[j];
                if ((j + 1) % samplesPerLine === 0) {
                    len = sum / samplesPerLine;
                    var scaledLenX = (len / 255) * (width * 0.75);
                    var scaledLenY = (len / 255) * (height);
                    var x = (width * 0.5) - (scaledLenX * Math.cos(rot));
                    var y = (height  * 0.5) - (scaledLenY * Math.sin(rot));
                    if ((j + 1) === samplesPerLine) {
                        ctx.moveTo(x, y);
                        hue = (len / 255) * 360;
                        if (dirtyFlag || (((hue - oldHue) < settings.coloring))) {
                            ctx.strokeStyle = "hsl(" + hue + ", 100%, 50%)";
                            ctx.shadowColor = "hsl(" + hue + ", 100%, 50%)";;
                            ctx.shadowOffsetX = settings.shadowOffset;
                            ctx.shadowOffsetY = settings.shadowOffset;
                            ctx.shadowBlur    = settings.shadowBlur;
                            dirtyFlag = false;
                        }
                    oldHue = hue;
                    } else {
                        ctx.lineTo(x, y);
                    }
                    sum = 0;
                    rot += step;
                }
            }
            ctx.stroke();
            ctx.restore();

        }, 50);  //setInterval

    }

    var play = function(rawBuffer) {

        document.getElementById('greetBox').style.opacity = 0.0;

        var mucke = audioCtx.createBuffer(rawBuffer, false);
        mucke.gain = 1.0;
        //console.log("Sample Rate: " + mucke.sampleRate);
        //console.log("length: " + mucke.length);
        //console.log("duration: " + mucke.duration);
        //console.log("channels: " + mucke.numberOfCannels);

        var source = audioCtx.createBufferSource();
        source.buffer = mucke;
        nodes.push(source);

        //var filter = audioCtx.createBiquadFilter();
        //filter.type = 0;
        //filter.frequency.value = 880;
        //nodes.push(filter);

        processAudioData();

        for (var i=0; i<nodes.length; i++) {
            if (i === nodes.length - 1) {
                nodes[i].connect(audioCtx.destination);
            } else {
                nodes[i].connect(nodes[i + 1]);
            }
        }

        nodes[0].noteOn(0);

    }

    return init;
})();
