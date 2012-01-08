/*
 * Small helper module for loading supported audio files
 *
 * loadFile: loads first file in fileList and calls
 * callback after success and onerror after an error
 * occured
 *
 * requestFile: loads file given in parameter url
 * via XMLHttp request and calls callback after success
 * and onerror after an error occured
 *
 * @author bekre
 */

var Loader = (function() {

    var loader = {};

    loader.loadFile = function(fileList, callback, onerror) {
        var reader;
        for (var i=0; i < fileList.length; i++) {
            if (fileList[i].type.match('audio.*')) {
                reader = new FileReader();
                reader.onload = function(e) {
                    if (callback)
                        callback(e.target.result);
                }
                reader.onerror = function() {
                    if (onerror)
                        onerror("Error while reading audio file: " + reader.error);
                }
                reader.readAsArrayBuffer(fileList[i]);
                return;
            }
        }
        if (onerror)
            onerror("Error: Not a valid audio file");
    }

    loader.requestFile = function(url, callback, onerror) {

        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer"
        request.onload = function() {
            if (callback)
                callback(request.response);
        }
        request.onerror = function() {
            if (onerror)
                onerror("Error while requesting audio file");
        }

        request.send();

    }

    return loader;

}());

