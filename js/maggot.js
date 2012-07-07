var Analyzer = (function() {
    
    var DEBUG = 0;
    
    var audioCtx;
    var mucke;
    var nodes;
    
    var renderer;
    var scene;
    var camera;
    
    var setSize = function(area) {
        var size = Math.min(window.innerWidth  * 0.8, window.innerHeight * 0.8);
        renderer.setSize(size, size);
        area.style.width  = size + "px";
        area.style.height = size + "px";
        area.style.left   = ((window.innerWidth - size) / 2.0) + "px";
    }
    
    var init = function() {
        
        var audioCtx = typeof webkitAudioContext != "undefined" ? new webkitAudioContext() : null;
        var mucke = null;
        var nodes = new Array;

        window.addEventListener('dragover', function(event) {
            event.preventDefault();
        }, false);

        window.addEventListener('drop', function(event) {
            event.stopPropagation();
            event.preventDefault();
            Loader.loadFile(event.dataTransfer.files, play, printErrorMessage);
        }, false);

        var area = document.getElementById("renderArea");
        renderer = new THREE.WebGLRenderer();
        renderer.setClearColorHex(0xdadce9, 1);
        setSize(area);
        area.appendChild(renderer.domElement);
                
        // create a scene
        scene = new THREE.Scene();
        //var camera = new THREE.PerspectiveCamera( 45, 1.0, 1.0, 3000 );
        camera = new THREE.Camera( 45, 1.0, 1.0, 3000 );
        camera.position.z = 25;
        scene.addChild(camera);
        
       // create mesh
        
        var attributes = {
            displacement: {
                type: 'f', // a float
                value: [] // an empty array
            }
        };
        
       var sphereGeometry = new THREE.SphereGeometry(5, 32, 32);
       var vCount = sphereGeometry.vertices.length;
       var myVertexShader = document.getElementById("vertexshader").innerHTML;
       var myFragmentShader = document.getElementById("fragmentshader").innerHTML;
       var material = new THREE.MeshShaderMaterial(
          { attributes     : attributes,
            vertexShader   : myVertexShader,
            fragmentShader : myFragmentShader
          }
        );
       
       for (var i = 0; i < vCount; i++) {
            attributes.displacement.value[i] = Math.random();
       }
       
       window.onresize = function() {
          var area = document.getElementById("renderArea");
          setSize(area);
          renderer.render(scene, camera);
       }
       
       var sphere = new THREE.Mesh(sphereGeometry, material);
       //sphere.scale.set(1.0, 1.0, 1.0);
       //sphere.position.set(0.0, 0.0, -25.0);
       sphere.overdraw = true;
       sphere.dynamic = true;
       scene.addChild(sphere);
        
       renderer.render(scene, camera);
        
    }

    function processAudioData() {

        var analyzerNode = audioCtx.createAnalyser();
        analyzerNode.fftSize = 2048;
        analyzerNode.smoothingTimeConstant = 0.75;
        nodes.push(analyzerNode); 
        
        //bins: the sphere's vertices
        var runTo = 512;
        var binSize = Math.ceil(runTo / vCount);
        
        // Cases:
        // 1) one bin for multiple coefficients
        // 2) one coefficient stretches over multiple bins (bin size = 1)
        // Displacement map can be bigger than vertices list, but we dismiss the last values
        var stretch = Math.ceil(vCount / runTo);
        
        //var loop = 0;

        window.setInterval(function() {

            var displacements = attributes.displacement.value;
            var data = new Uint8Array(runTo);
            var sum  = 0, len = 0, n = 0;
            analyzerNode.getByteFrequencyData(data);
            for (var j=0; j < data.length; j++) {
                sum += data[j];
                if (j % binSize === 0) {
                    len = sum / (binSize * 255);
                    displacements[n] = len * 4.0;
                    for (var k = 1; k < stretch; k++) {
                        displacements[++n] = len * 4.0;
                    }
                    sum = 0;
                    n++;
                }

            }
        
            if (DEBUG) {
                console.log("Stretch: " + stretch + "; binSize: " + binSize);
                console.log("attributes.displacement.value.length: " + attributes.displacement.value.length + "; sphere.vertices.length: " + vCount);
            }
            
            attributes.displacement.needsUpdate = true;
            sphere.rotation.y += 0.01;
            //sphere.rotation.x += 0.01;
            sphere.rotation.z += 0.01;
            renderer.render(scene, camera);
            sum = 0;
            n = 0;
            //loop++;
        }, 50);
    }
    
    function play(rawBuffer) {
        var mucke = audioCtx.createBuffer(rawBuffer, false);
        var source = audioCtx.createBufferSource();
        source.buffer = mucke;
        nodes.push(source);
        
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
    
    function printErrorMessage(msg) {
        console.log(msg);
    }
    
    return init;
    
})();