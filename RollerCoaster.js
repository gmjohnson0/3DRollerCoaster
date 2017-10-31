"use strict";

var gl;
var canvas;
var program;
var cartBuffer;
var groundBuffer;
var wheelBuffer;
var rimBuffer;
var tiesBuffer;
var railBuffer;
var headBuffer;
var eyeBuffer;
var tiePoints = []; //verticies of rail ties
var railPoints = []; //verticies of rails
var sphereVerts; //verticies of head
var eyeVerts; //verticies of eyes
var mv;


var cartmv; //mv for the cart
var wheel1mv; //mv for each outer wheel
var wheel2mv;
var wheel3mv;
var wheel4mv;
var rim1mv; //mv for each rim
var rim2mv;
var rim3mv;
var rim4mv;
var riderEyesmv; //mv for the rider's eyes
var riderHeadmv; //mv for the rider's head
var headlightmv;
var headlightcapmv;

var redOn = true;
var greenOn = false;
var blueOn = false;
var whiteOn = true;
var spotLightOn = false;
var redBallmv;
var greenBallmv;
var blueBallmv;
var whiteBallmv;


var umv;
var uproj;
var parseComplete = false;

var vAmbientDiffuseColor;

var headRotAng = 0;

var segments = 20; //How many triangles make up each wheel
var axel = 1;

var vPosition;
var vNormal;
var vColor;
var vSpecularColor;
var vSpecularExponent;
var light_position;
var light_color;
var ambient_light;

var mode = "stop"; //cart movement
var rotateAngle; //rotation of wheel rims
var count = 0; //track point count

var camNum = 1; //camera choice
var freeRoamSelect = "center";
var zoom = 45; //changing zoom
var zoomSave; //saved zoom for camera change
var dolly = 200; //dolly location
var n; //side direction
var v; //forward direction
var u; //up direction
var c; //translation matrix


var trackpoints = [];
window.onload = function init() {

    //fetch reference to the canvas element we defined in the html file
    canvas = document.getElementById("gl-canvas");
    //grab the WebGL 2 context for that canvas.  This is what we'll use to do our drawing
    gl = canvas.getContext('webgl2');
    if (!gl) {
        alert("WebGL isn't available");
    }

    //Take the vertex and fragment shaders we provided and compile them into a shader program
    program = initShaders(gl, "vshader-phong.glsl", "fshader-phong.glsl");
    gl.useProgram(program); //and we want to use that program for our rendering

    umv =(gl.getUniformLocation(program, "model_view"));
    uproj = (gl.getUniformLocation(program, "projection"));
    vPosition = (gl.getAttribLocation(program, "vPosition"));
    vNormal = (gl.getAttribLocation(program, "vNormal"));
    vAmbientDiffuseColor = (gl.getAttribLocation(program, "vAmbientDiffuseColor"));
    vSpecularColor = (gl.getAttribLocation(program, "vSpecularColor"));
    vSpecularExponent = (gl.getAttribLocation(program, "vSpecularExponent"));
    light_position = (gl.getUniformLocation(program, "light_position"));
    light_color = (gl.getUniformLocation(program, "light_color"));
    ambient_light = (gl.getUniformLocation(program, "ambient_light"));

    umv = gl.getUniformLocation(program, "model_view");
    uproj = gl.getUniformLocation(program, "projection");

    rotateAngle = 0;

    //Execute upon each indicated keystroke
    window.addEventListener("keydown" ,function(event){
        switch(event.key) {
            //rotate head right
            case "ArrowRight":
                if(headRotAng < 75)
                    headRotAng +=1;
                break;
            //rotate head left
            case "ArrowLeft":
                if(headRotAng > -75)
                    headRotAng -=1;
                break;
            //stop/start cart movement
            case "m":
                if(mode === "go")
                    mode = "stop";
                else
                    mode = "go";
                break;
            //zoom in. Set max
            case "x":
                if(camNum === 1)
                    if(zoom != 1)
                        zoom -=1;
                break;
            //soom out. Set max
            case "z":
                if(camNum === 1)
                    if(zoom != 100)
                        zoom +=1;
                break;
            //dolly in
            case "q":
                if(camNum === 1)
                    if(dolly != 1)
                        dolly -=1;
                break;
            //dolly out. Max dolly
            case "e":
                if(camNum === 1)
                    if(dolly != 225  )
                        dolly += 1;
                break;
            //switch free roam cam
            case "f":
                if (freeRoamSelect === "center") {
                    freeRoamSelect = "car";
                }
                else
                    freeRoamSelect = "center";
                break
            //rest settings
            case "r":
                dolly = 200;
                zoom = 45;
                freeRoamSelect = "center";
                break;
            //switch view profile
            case "c":
                if(camNum === 3) {
                    camNum = 1;
                    zoom = zoomSave;
                }
                else if(camNum === 1) {
                    camNum++;
                    zoomSave = zoom;
                    zoom = 45;
                } else
                    camNum++;
                break;
            case "1":
                if (redOn === false) {
                    redOn = true;
                } else {
                    redOn = false;
                }
                break;
            case "2":
                if (greenOn === false) {
                    greenOn = true;
                } else {
                    greenOn = false;
                }
                break;
            case "3":
                if (blueOn === false) {
                    blueOn = true;
                } else {
                    blueOn = false;
                }
                break;
            case "4":
                if (whiteOn === false) {
                    whiteOn = true;
                } else {
                    whiteOn = false;
                }
                break;
            case "1":
                if (spotLightOn === false) {
                    spotLightOn = true;
                } else {
                    spotLightOn = false;
                }
                break;
        }
        //we're sending over a vec4 to be used by every vertex until we change
        //to some other color.  Note the 4fv is because we have 4 float values in a vector (array)
        //take the local vec4 in the color variable, and send it to the uniform location we stored in ucolor
        requestAnimationFrame(render);//and now we need a new frame since we made a change
    });
    var fileInput = document.getElementById("fileInput");
    document.getElementById("instructDiv").innerHTML = ("Select a track file to get started.");
    fileInput.addEventListener('change', function(e){
        var file = fileInput.files[0];
        var textType = /text.*/;
        if(file.type.match(textType)){
            var reader = new FileReader();
            reader.onload = function(e){
                parseData(reader.result);
                makeTiesAndBuffer();
                makeRailsAndBuffer();
                requestAnimationFrame(render);
            };
            reader.readAsText(file);
        }else{
            console.log("File not supported: " + file.type + ".");
        }
    });
    makeCartAndBuffer(30);
    makeWheelsAndBuffer();
    makeRimsAndBuffer();
    makeGroundAndBuffer();
    makeSpheresAndBuffer(30);

    //Draw to the entire canvas
    gl.viewport(0, 0, canvas.width, canvas.height);

    //White background
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.vertexAttrib1f(vSpecularExponent, 50);

    //we need to do this to avoid having objects that are behind other objects show up anyway
    gl.enable(gl.DEPTH_TEST);

    window.setInterval(update, 16); //target 60 frames per second
};

function parseData(input){
    var numbers = input.split(/\s+/); //split on white space
    //three numbers at a time for xyz
    for(var i = 0; i < numbers.length; i+= 3){
        trackpoints.push(vec4(parseFloat(numbers[i]), parseFloat(numbers[i+1]), parseFloat(numbers[i+2]), 1));
    }
    parseComplete = true;
}
//Creating the rails for the track
function makeRailsAndBuffer(){

    railPoints.push(vec4(2, 0, -0.5, 1.0));
    railPoints.push(vec4(0, 0, -1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 1, -0.5, 1.0));
    railPoints.push(vec4(0, 0, -1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(- 2, 1, -0.5, 1.0));
    railPoints.push(vec4(0, 0, -1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(- 2, 1, -0.5, 1.0));
    railPoints.push(vec4(0, 0, -1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(- 2, 0, -0.5, 1.0));
    railPoints.push(vec4(0, 0, -1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 1, -0.5, 1.0));
    railPoints.push(vec4(0, 0, -1, 0));
    // railPoints.push(vec4(0, 0, 0, 1.0));

    //neg end
    railPoints.push(vec4(-2, 0, 0.5, 1.0));
    railPoints.push(vec4(0, 0, 1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 1, 0.5, 1.0));
    railPoints.push(vec4(0, 0, 1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 1, 0.5, 1.0));
    railPoints.push(vec4(0, 0, 1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 1, 0.5, 1.0));
    railPoints.push(vec4(0, 0, 1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 0, 0.5, 1.0));
    railPoints.push(vec4(0, 0, 1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 0, 0.5, 1.0));
    railPoints.push(vec4(0, 0, 1, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0tie
    //top
    railPoints.push(vec4(-2, 1, 0.5, 1.0));
    railPoints.push(vec4(0, 1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 1, 0.5, 1.0));
    railPoints.push(vec4(0, 1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 1, -0.5, 1.0));
    railPoints.push(vec4(0, 1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 1, -0.5, 1.0));
    railPoints.push(vec4(0, 1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 1, -0.5, 1.0));
    railPoints.push(vec4(0, 1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 1, 0.5, 1.0));
    railPoints.push(vec4(0, 1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));

    //bottom
    railPoints.push(vec4(-2, 0, 0.5, 1.0));
    railPoints.push(vec4(0, -1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2,  0, 0.5, 1.0));
    railPoints.push(vec4(0, -1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 0, -0.5, 1.0));
    railPoints.push(vec4(0, -1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 0, -0.5, 1.0));
    railPoints.push(vec4(0, -1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 0, -0.5, 1.0));
    railPoints.push(vec4(0, -1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 0, 0.5, 1.0));
    railPoints.push(vec4(0, -1, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));

    //left
    railPoints.push(vec4(-2, 1, 0.5, 1.0));
    railPoints.push(vec4(-1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 1, -0.5, 1.0));
    railPoints.push(vec4(-1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 0, -0.5, 1.0));
    railPoints.push(vec4(-1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 0, -0.5, 1.0));
    railPoints.push(vec4(-1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 0, 0.5, 1.0));
    railPoints.push(vec4(-1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(-2, 1, 0.5, 1.0));
    railPoints.push(vec4(-1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));

    //right
    railPoints.push(vec4(2, 1, 0.5, 1.0));
    railPoints.push(vec4(1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 1, -0.5, 1.0));
    railPoints.push(vec4(1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 0, -0.5, 1.0));
    railPoints.push(vec4(1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 0, -0.5, 1.0));
    railPoints.push(vec4(1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 0, 0.5, 1.0));
    railPoints.push(vec4(1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));
    railPoints.push(vec4(2, 1, 0.5, 1.0));
    railPoints.push(vec4(1, 0, 0, 0));
    // railPoints.push(vec4(0.2, 0.2, 0.2, 1.0));

    railBuffer = gl.createBuffer();
    //tell WebGL that the buffer we just created is the one we want to work with right now
    gl.bindBuffer(gl.ARRAY_BUFFER, railBuffer);
    //send the local data over to this buffer on the graphics card.  Note our use of Angel's "flatten" function
    gl.bufferData(gl.ARRAY_BUFFER, flatten(railPoints), gl.STATIC_DRAW);
    vNormalvPosition();
}

//creating railway ties
function makeTiesAndBuffer(){
    //pos end
    tiePoints.push(vec4(2, - 1, -0.5, 1.0));
    tiePoints.push(vec4(0, 0, -1, 0));
    tiePoints.push(vec4(2, 0, -0.5, 1.0));
    tiePoints.push(vec4(0, 0, -1, 0));
    tiePoints.push(vec4(- 2, 0, -0.5, 1.0));
    tiePoints.push(vec4(0, 0, -1, 0));
    tiePoints.push(vec4(- 2, 0, -0.5, 1.0));
    tiePoints.push(vec4(0, 0, -1, 0));
    tiePoints.push(vec4(- 2,  - 1, -0.5, 1.0));
    tiePoints.push(vec4(0, 0, -1, 0));
    tiePoints.push(vec4(2, - 1, -0.5, 1.0));
    tiePoints.push(vec4(0, 0, -1, 0));

    //neg end
    tiePoints.push(vec4(-2, - 1, 0.5, 1.0));
    tiePoints.push(vec4(0, 0, 1, 0));
    tiePoints.push(vec4(-2, 0, 0.5, 1.0));
    tiePoints.push(vec4(0, 0, 1, 0));
    tiePoints.push(vec4(2, 0, 0.5, 1.0));
    tiePoints.push(vec4(0, 0, 1, 0));
    tiePoints.push(vec4(2, 0, 0.5, 1.0));
    tiePoints.push(vec4(0, 0, 1, 0));
    tiePoints.push(vec4(2, - 1, 0.5, 1.0));
    tiePoints.push(vec4(0, 0, 1, 0));
    tiePoints.push(vec4(-2, - 1, 0.5, 1.0));
    tiePoints.push(vec4(0, 0, 1, 0));

    //top
    tiePoints.push(vec4(-2, 0, 0.5, 1.0));
    tiePoints.push(vec4(0, 1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2, 0, 0.5, 1.0));
    tiePoints.push(vec4(0, 1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2, 0, -0.5, 1.0));
    tiePoints.push(vec4(0, 1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2, 0, -0.5, 1.0));
    tiePoints.push(vec4(0, 1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(-2, 0, -0.5, 1.0));
    tiePoints.push(vec4(0, 1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(-2, 0, 0.5, 1.0));
    tiePoints.push(vec4(0, 1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));

    //bottom
    tiePoints.push(vec4(-2, -1, 0.5, 1.0));
    tiePoints.push(vec4(0, -1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2,  -1, 0.5, 1.0));
    tiePoints.push(vec4(0, -1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2, -1, -0.5, 1.0));
    tiePoints.push(vec4(0, -1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2, -1, -0.5, 1.0));
    tiePoints.push(vec4(0, -1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(-2, -1, -0.5, 1.0));
    tiePoints.push(vec4(0, -1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(-2, -1, 0.5, 1.0));
    tiePoints.push(vec4(0, -1, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));

    //left
    tiePoints.push(vec4(-2, 0, 0.5, 1.0));
    tiePoints.push(vec4(-1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(-2, 0, -0.5, 1.0));
    tiePoints.push(vec4(-1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(-2, -1, -0.5, 1.0));
    tiePoints.push(vec4(-1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(-2, -1, -0.5, 1.0));
    tiePoints.push(vec4(-1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(-2, -1, 0.5, 1.0));
    tiePoints.push(vec4(-1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(-2, 0, 0.5, 1.0));
    tiePoints.push(vec4(-1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));

    //right
    tiePoints.push(vec4(2, 0, 0.5, 1.0));
    tiePoints.push(vec4(1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2, 0, -0.5, 1.0));
    tiePoints.push(vec4(1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2, -1, -0.5, 1.0));
    tiePoints.push(vec4(1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2, -1, -0.5, 1.0));
    tiePoints.push(vec4(1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2,  -1, 0.5, 1.0));
    tiePoints.push(vec4(1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));
    tiePoints.push(vec4(2, 0, 0.5, 1.0));
    tiePoints.push(vec4(1, 0, 0, 0));
    // tiePoints.push(vec4(0.7, 0.49, 0.19, 1.0));

    tiesBuffer = gl.createBuffer();
    //tell WebGL that the buffer we just created is the one we want to work with right now
    gl.bindBuffer(gl.ARRAY_BUFFER, tiesBuffer);
    //send the local data over to this buffer on the graphics card.  Note our use of Angel's "flatten" function
    gl.bufferData(gl.ARRAY_BUFFER, flatten(tiePoints), gl.STATIC_DRAW);
    vNormalvPosition();
}

//creating the ground
function makeGroundAndBuffer(){
    var groundpoints = []; //array to hold the points constructing/coloring the ground

    groundpoints.push(vec4(100.0, 0.0, -100.0, 1.0)); //position
    groundpoints.push(vec4(0.0, 1.0, 0.0, 0.0)); //normal
    // groundpoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //color
    groundpoints.push(vec4(100.0, 0.0, 100.0, 1.0));
    groundpoints.push(vec4(0.0, 1.0, 0.0, 0.0));
    // groundpoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //color
    groundpoints.push(vec4(-100.0, 0.0, 100.0, 1.0));
    groundpoints.push(vec4(0.0, 1.0, 0.0, 0.0));
    // groundpoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //color
    groundpoints.push(vec4(-100.0, 0.0, 100.0, 1.0));
    groundpoints.push(vec4(0.0, 1.0, 0.0, 0.0));
    // groundpoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //color
    groundpoints.push(vec4(-100.0, 0.0, -100.0, 1.0));
    groundpoints.push(vec4(0.0, 1.0, 0.0, 0.0));
    // groundpoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //color
    groundpoints.push(vec4(100.0, 0.0, -100.0, 1.0));
    groundpoints.push(vec4(0.0, 1.0, 0.0, 0.0));
    // groundpoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //color

    //we need some graphics memory for this information
    groundBuffer = gl.createBuffer();
    //tell WebGL that the buffer we just created is the one we want to work with right now
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    //send the local data over to this buffer on the graphics card.  Note our use of Angel's "flatten" function
    gl.bufferData(gl.ARRAY_BUFFER, flatten(groundpoints), gl.STATIC_DRAW);

    vNormalvPosition();
}

//creates cart
function makeCartAndBuffer(subdiv){
    var cartPoints = []; //array to hold the points constructing/coloring the cart

    var step = (360.0 / subdiv)*(Math.PI / 180.0); //how much do we increase the angles by per triangle

    for (var lat = 0; lat <= Math.PI ; lat += step){ //latitude
        for (var lon = 0; lon + step <= 1+(2*Math.PI); lon += step){ //longitude
            //triangle 1
            cartPoints.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 1.0)); //position
            cartPoints.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 0.0)); //normal
            cartPoints.push(vec4(Math.sin(lat)*Math.cos(lon+step), Math.sin(lat)*Math.sin(lon+step), Math.cos(lat), 1.0)); //position
            cartPoints.push(vec4(Math.sin(lat)*Math.cos(lon+step), Math.sin(lat)*Math.sin(lon+step), Math.cos(lat), 0.0)); //normal
            cartPoints.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 1.0)); //etc
            cartPoints.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 0.0));

            //triangle 2
            cartPoints.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 1.0));
            cartPoints.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 0.0));
            cartPoints.push(vec4(Math.sin(lat+step)*Math.cos(lon), Math.sin(lat+step)*Math.sin(lon), Math.cos(lat+step), 1.0));
            cartPoints.push(vec4(Math.sin(lat+step)*Math.cos(lon), Math.sin(lat+step)*Math.sin(lon), Math.cos(lat+step),0.0));
            cartPoints.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 1.0));
            cartPoints.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 0.0));
        }
    }

    //For a rectangular cart
    // //front
    // cartPoints.push(vec4(1.0, 1, 2, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    // cartPoints.push(vec4(1.0, 3, 2, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    // cartPoints.push(vec4(-1.0, 3, 2, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    // cartPoints.push(vec4(-1.0, 3, 2, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    // cartPoints.push(vec4(-1.0, 1, 2, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    // cartPoints.push(vec4(1.0, 1, 2, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 1.0, 1.0)); //cyan
    //
    // //back
    // cartPoints.push(vec4(-1.0, 1, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 1.0, 1.0)); //magenta
    // cartPoints.push(vec4(-1.0, 3, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 1.0, 1.0));//magenta
    // cartPoints.push(vec4(1.0, 3, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 1.0, 1.0));//magenta
    // cartPoints.push(vec4(1.0, 3, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 1.0, 1.0));//magenta
    // cartPoints.push(vec4(1.0, 1, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 1.0, 1.0));//magenta
    // cartPoints.push(vec4(-1.0, 1, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 1.0, 1.0));//magenta
    //
    // //right
    // cartPoints.push(vec4(1.0, 3.0, 2.0, 1.0));
    // cartPoints.push(vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    // cartPoints.push(vec4(1.0, 1.0, 2.0, 1.0));
    // cartPoints.push(vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    // cartPoints.push(vec4(1.0, 1.0, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    // cartPoints.push(vec4(1.0, 1.0, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    // cartPoints.push(vec4(1.0, 3.0, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    // cartPoints.push(vec4(1.0, 3.0, 2.0, 1.0));
    // cartPoints.push(vec4(1.0, 1.0, 0.0, 1.0)); //yellow
    //
    // //left
    // cartPoints.push(vec4(-1.0, 3, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 0.0, 1.0)); //red
    // cartPoints.push(vec4(-1.0, 1.0, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 0.0, 1.0)); //red
    // cartPoints.push(vec4(-1.0, 1.0, 2.0, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 0.0, 1.0)); //red
    // cartPoints.push(vec4(-1.0, 1.0, 2.0, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 0.0, 1.0)); //red
    // cartPoints.push(vec4(-1.0, 3, 2.0, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 0.0, 1.0)); //red
    // cartPoints.push(vec4(-1.0, 3, -2.5, 1.0));
    // cartPoints.push(vec4(1.0, 0.0, 0.0, 1.0)); //red
    //
    // //top
    // cartPoints.push(vec4(1.0, 3, 2, 1.0));
    // cartPoints.push(vec4(0.0, 0.0, 1.0, 1.0)); //blue
    // cartPoints.push(vec4(1.0, 3, -2.5, 1.0));
    // cartPoints.push(vec4(0.0, 0.0, 1.0, 1.0)); //blue
    // cartPoints.push(vec4(-1.0, 3, -2.5, 1.0));
    // cartPoints.push(vec4(0.0, 0.0, 1.0, 1.0)); //blue
    // cartPoints.push(vec4(-1.0, 3, -2.5, 1.0));
    // cartPoints.push(vec4(0.0, 0.0, 1.0, 1.0)); //blue
    // cartPoints.push(vec4(-1.0, 3, 2, 1.0));
    // cartPoints.push(vec4(0.0, 0.0, 1.0, 1.0)); //blue
    // cartPoints.push(vec4(1.0, 3, 2, 1.0));
    // cartPoints.push(vec4(0.0, 0.0, 1.0, 1.0)); //blue
    //
    // //bottom
    // cartPoints.push(vec4(1.0, 1, -2.5, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //green
    // cartPoints.push(vec4(1.0, 1, 2, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //green
    // cartPoints.push(vec4(-1.0, 1, 2, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //green
    // cartPoints.push(vec4(-1.0, 1, 2, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //green
    // cartPoints.push(vec4(-1.0, 1, -2.5, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //green
    // cartPoints.push(vec4(1.0, 1, -2.5, 1.0));
    // cartPoints.push(vec4(0.0, 1.0, 0.0, 1.0)); //green

    cartBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cartBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cartPoints), gl.STATIC_DRAW);
    vNormalvPosition();
}

//creates rims
function makeRimsAndBuffer() {
    var rimpoints = []; //array to hold the points constructing and coloring the rims
    var theta = (Math.PI / 180) * (360 / segments);
    var z1;
    var y1;
    var z2;
    var y2;
    var black = true;
    var r; //red
    var g; //green
    var b; //blue

    for(var i = 0; i < segments +1; i++){
        //colors triangles alternating black and white
        // if(black === true) {
        //     r = 1.0;
        //     g = 1.0;
        //     b = 1.0;
        //     black = false;
        // } else {
        //     r = 0.0;
        //     g = 0.0;
        //     b = 0.0;
        //     black = true;
        // }
        //colors half of the wheel black and the other white
        if(i < segments/2){
            r = 1.0; //white
            g = 1.0;
            b = 1.0;
        } else{
            r = 0.0; //black
            g = 0.0;
            b = 0.0;
        }
        //Creates the rims by drawing triangles all sharing a central vertex
        z1 = (Math.cos(theta * i)*0.66);
        y1 = (Math.sin(theta * i)*0.66);
        //This is the center point
        rimpoints.push(vec4(0, 0, 0, 1.0));
        rimpoints.push(vec4(-1, 0, 0, 0));
        // rimpoints.push(vec4(r, g, b, 1.0));
        if(i < segments){
            //The outside triangle vertices
            z2 = (Math.cos(theta * (i+1))*0.66);
            y2 = (Math.sin(theta * (i+1))*0.66);
            rimpoints.push(vec4(0, y1, z1, 1.0));
            rimpoints.push(vec4(-1, 0, 0, 0));
            // rimpoints.push(vec4(r, g, b, 1.0));
            rimpoints.push(vec4(0, y2, z2, 1.0));
            rimpoints.push(vec4(-1, 0, 0, 0));
            // rimpoints.push(vec4(r, g, b, 1.0));
        }else{
            //redraws the last two points in the middle
            //This is done to avoid indexing out of bounds
            rimpoints.push(vec4(0, 1, 0, 1.0));
            rimpoints.push(vec4(-1, 0, 0, 0));
            // rimpoints.push(vec4(r, g, b, 1.0));
            rimpoints.push(vec4(0, 1, 0, 1.0));
            rimpoints.push(vec4(-1, 0, 0, 0));
            // rimpoints.push(vec4(r, g, b, 1.0));
        }
    }

    rimBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rimBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(rimpoints), gl.STATIC_DRAW);

    vNormalvPosition();
}

//create outer wheels
function makeWheelsAndBuffer() {
    var wheelpoints = []; //array to hold the points constructing/coloring the wheels
    var theta = (Math.PI / 180) * (360 / segments);
    var z1;
    var y1;
    var z2;
    var y2;

    for(var i = 0; i < segments +1; i++){

        z1 = (Math.cos(theta * i)*0.66)+axel;
        y1 = (Math.sin(theta * i)*0.66);
        if(i < segments){
            z2 = (Math.cos(theta * (i+1))*0.66)+axel;
            y2 = (Math.sin(theta * (i+1))*0.66);
            wheelpoints.push(vec4(.5, y1, z1, 1.0));
            wheelpoints.push(vec4(0.0, y1, z1-axel, 0));
            // wheelpoints.push(vec4(0.0, 0, 0.0, 1.0)); //black
            wheelpoints.push(vec4(0, y1, z1, 1.0));
            wheelpoints.push(vec4(0.0, y1, z1-axel, 0));
            // wheelpoints.push(vec4(0.0, 0, 0.0, 1.0));
            wheelpoints.push(vec4(0, y2, z2, 1.0));
            wheelpoints.push(vec4(0.0, y2, z2-axel, 0));
            // wheelpoints.push(vec4(0.0, 0, 0.0, 1.0));
            wheelpoints.push(vec4(0, y2, z2, 1.0));
            wheelpoints.push(vec4(0.0, y2, z2-axel, 0));
            // wheelpoints.push(vec4(0.0, 0, 0.0, 1.0));
            wheelpoints.push(vec4(.5, y2, z2, 1.0));
            wheelpoints.push(vec4(0.0, y2, z2-axel, 0));
            // wheelpoints.push(vec4(0.0, 0, 0.0, 1.0));
            wheelpoints.push(vec4(.5, y1, z1, 1.0));
            wheelpoints.push(vec4(0.0, y1, z1-axel, 0));
            // wheelpoints.push(vec4(0.0, 0, 0.0, 1.0));
        }else{
            //handles the last facing for the iterator on a single point.
            //This is needed to avoid indexing out of bounds.
            wheelpoints.push(vec4(.5, y1, z1, 1.0));
            wheelpoints.push(vec4(0.0, y1, z1-axel, 0));
            // wheelpoints.push(vec4(0.0, 0.0, 0.0, 1.0));
            wheelpoints.push(vec4(.5, y1, z1, 1.0));
            wheelpoints.push(vec4(0.0, y1, z1-axel, 0));
            // wheelpoints.push(vec4(0.0, 0.0, 0.0, 1.0));
            wheelpoints.push(vec4(.5, y1, z1, 1.0));
            wheelpoints.push(vec4(0.0, y1, z1-axel, 0));
            // wheelpoints.push(vec4(0.0, 0.0, 0.0, 1.0));
            wheelpoints.push(vec4(.5, y1, z1, 1.0));
            wheelpoints.push(vec4(0.0, y1, z1-axel, 0));
            // wheelpoints.push(vec4(0.0, 0.0, 0.0, 1.0));
            wheelpoints.push(vec4(.5, y1, z1, 1.0));
            wheelpoints.push(vec4(0.0, y1, z1-axel, 0));
            // wheelpoints.push(vec4(0.0, 0.0, 0.0, 1.0));
            wheelpoints.push(vec4(.5, y1, z1, 1.0));
            wheelpoints.push(vec4(0.0, y1, z1-axel, 0));
            // wheelpoints.push(vec4(0.0, 0.0, 0.0, 1.0));
        }
    }
    wheelBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wheelBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(wheelpoints), gl.STATIC_DRAW);
    vNormalvPosition();
}

//creating spheres
function makeSpheresAndBuffer(subdiv){

    var step = (360.0 / subdiv)*(Math.PI / 180.0); //how much do we increase the angles by per triangle?
    sphereVerts = [];
    eyeVerts = [];

    for (var lat = 0; lat <= Math.PI ; lat += step){ //latitude
        for (var lon = 0; lon + step <= 1+(2*Math.PI); lon += step){ //longitude
            //triangle 1
            sphereVerts.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 1.0)); //position
            sphereVerts.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 0.0)); //normal
            sphereVerts.push(vec4(Math.sin(lat)*Math.cos(lon+step), Math.sin(lat)*Math.sin(lon+step), Math.cos(lat), 1.0)); //position
            sphereVerts.push(vec4(Math.sin(lat)*Math.cos(lon+step), Math.sin(lat)*Math.sin(lon+step), Math.cos(lat), 0.0)); //normal
            sphereVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 1.0)); //etc
            sphereVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 0.0));

            //triangle 2
            sphereVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 1.0));
            sphereVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 0.0));
            sphereVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon), Math.sin(lat+step)*Math.sin(lon), Math.cos(lat+step), 1.0));
            sphereVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon), Math.sin(lat+step)*Math.sin(lon), Math.cos(lat+step),0.0));
            sphereVerts.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 1.0));
            sphereVerts.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 0.0));

            //triangle 1
            eyeVerts.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 1.0)); //position
            eyeVerts.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 0.0)); //normal
            eyeVerts.push(vec4(Math.sin(lat)*Math.cos(lon+step), Math.sin(lat)*Math.sin(lon+step), Math.cos(lat), 1.0)); //position
            eyeVerts.push(vec4(Math.sin(lat)*Math.cos(lon+step), Math.sin(lat)*Math.sin(lon+step), Math.cos(lat), 0.0)); //normal
            eyeVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 1.0)); //etc
            eyeVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 0.0));

            //triangle 2
            eyeVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 1.0));
            eyeVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon+step), Math.sin(lon+step)*Math.sin(lat+step), Math.cos(lat+step), 0.0));
            eyeVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon), Math.sin(lat+step)*Math.sin(lon), Math.cos(lat+step), 1.0));
            eyeVerts.push(vec4(Math.sin(lat+step)*Math.cos(lon), Math.sin(lat+step)*Math.sin(lon), Math.cos(lat+step),0.0));
            eyeVerts.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 1.0));
            eyeVerts.push(vec4(Math.sin(lat)*Math.cos(lon), Math.sin(lon)*Math.sin(lat), Math.cos(lat), 0.0));
        }
    }

    //and send it over to graphics memory
    headBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, headBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereVerts), gl.STATIC_DRAW);

    eyeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, eyeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(eyeVerts), gl.STATIC_DRAW);

}

//updating to assign movement data
function update() {
    if (mode === "go") {

        //alter the rotation angle
        rotateAngle += 30;
        while (rotateAngle >= 360) {
            rotateAngle -= 360;
        }
        count += 2;
        if (count === trackpoints.length - 2)
            count = 0;
    }
    //Only start rendering once the track points have been loaded
    if(parseComplete) {
        cartTransMat();
        requestAnimationFrame(render);
    }

}

//drawing a new frame
function render(){
    //clearing any previous data for both color and depth
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var p = perspective(zoom, canvas.width / canvas.height, 1.0, 400);
    gl.uniformMatrix4fv(uproj, false, flatten(p));

    //Creates ties and rails on the track points
    if(parseComplete) { //This cannot happen until the points are parsed
        var eye2;
        var at2;
        var up2;
        var n2;
        var u2;
        var v2;
        var c2;
        var headPoint;
        var orbitPoint;

        //Setting the field of view
        //free cam
        if(camNum === 1) {
            if (freeRoamSelect === "car") {
                mv = lookAt(vec3(0, 70, dolly), vec3(trackpoints[count][0], trackpoints[count][1] + 2, trackpoints[count][2]), vec3(0, 1, 0));
            }
            else
                mv = lookAt(vec3(0, 70, dolly), vec3(0, 10, 0), vec3(0, 1, 0));
        }
        //viewpoint cam
        else if(camNum === 2) {
            orbitPoint = vec4(0,0,0,1);
            orbitPoint = mult(translate(0,4.15,.5), orbitPoint);
            orbitPoint = mult(c, orbitPoint);
            headPoint = orbitPoint;
            var newV = mult(rotate(-headRotAng, u), v);
            mv = lookAt(vec3(headPoint), add(vec3(orbitPoint), scale(15, vec3(newV))), vec3(0,1,0));
        }
        //reaction cam
        else if(camNum === 3) {
            orbitPoint = vec4(0,0,0,1);
            orbitPoint = mult(translate(0,4,0), orbitPoint);
            headPoint = orbitPoint;
            orbitPoint = mult(c, orbitPoint);
            headPoint = mult(c, headPoint);
            var newV = mult(rotateY(-headRotAng, u), v);
            mv = lookAt(add(vec3(orbitPoint), scale(15, vec3(newV))), vec3(headPoint), vec3(0,1,0));
        }

        //Setting up and completing the translation matrix for rails and rail ties
        for(var i = 0; i < trackpoints.length; i++) {
            if(i >= trackpoints.length -1)
                eye2 = vec4(trackpoints[0][0], trackpoints[0][1], trackpoints[0][2], 1.0);
            else
                eye2 = vec4(trackpoints[i+1][0], trackpoints[i+1][1], trackpoints[i+1][2], 1.0);
            at2 = vec4(trackpoints[i][0], trackpoints[i][1], trackpoints[i][2], 1.0);
            up2 = vec4(0,1,0,0);
            v2 = normalize( subtract(eye2, at2));
            n2 = vec4( normalize( cross(v2, up2)), 0);
            u2 = vec4( normalize( cross(n2, v2)), 0);
            c2 = mat4(n2,u2,v2,at2);
            c2 = transpose(c2);

            //using the translation matrix to generate railway ties in the correct facing
            var trackpointsmv = mult(mv, c2);
            trackpointsmv = mult(trackpointsmv, scalem(1.25,1,1));
            gl.uniformMatrix4fv(umv, false, flatten(trackpointsmv));
            gl.bindBuffer(gl.ARRAY_BUFFER, tiesBuffer);
            gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
            gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
            gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(0.7, 0.49, 0.19, 1.0));
            gl.vertexAttrib4fv(vSpecularColor, vec4(0.05, 0.05, 0.05, 1));
            gl.drawArrays(gl.TRIANGLES, 0, tiePoints.length / 2);

            //using the translation matrix to generate rail sections perpendicular to the tie of the same point
            var railpointsmv = mult(mv, c2);
            railpointsmv = mult(railpointsmv, scalem(.15,.5,3.5));
            railpointsmv = mult(railpointsmv, translate(9,0,0));
            gl.uniformMatrix4fv(umv, false, flatten(railpointsmv));
            gl.bindBuffer(gl.ARRAY_BUFFER, railBuffer);
            gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
            gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
            gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(.7, .7, .7, 1));
            gl.vertexAttrib4fv(vSpecularColor, vec4(0.3, 0.3, 0.3, 1));
            gl.drawArrays(gl.TRIANGLES, 0, tiePoints.length / 2);

            //Creating a second rail by translating from the first
            railpointsmv = mult(railpointsmv, translate(-18,0,0));
            gl.uniformMatrix4fv(umv, false, flatten(railpointsmv));
            gl.bindBuffer(gl.ARRAY_BUFFER, railBuffer);
            gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
            gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
            gl.drawArrays(gl.TRIANGLES, 0, tiePoints.length / 2);
        }

        //Creating the ground square
        gl.uniformMatrix4fv(umv, false, flatten(mv));
        gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
        gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
        gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(.95, .95, .95, 1));
        gl.vertexAttrib4fv(vSpecularColor, vec4(0.95, 0.95, 0.95, 1));
        // gl.vertexAttrib1f(vSpecularExponent, 1.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (mode === "go") {
            document.getElementById("instructDiv").innerHTML = ("Press 'm' to stop the cart's movement.");
            fullCartDraw();
        }
        else if (mode === "stop") {
            document.getElementById("instructDiv").innerHTML = ("Press 'm' to move the cart.");
            fullCartDraw();
        }
        gl.uniform4fv(ambient_light, vec4(.2, .2, .2, 1));
        if (redOn === true) {
            gl.uniform4fv(light_color, vec4(1, 0, 0, 1));
            gl.uniform4fv(light_position, mult(mv, vec4(80, 25, 80, 1)));
        }
        // else {
        //     gl.uniform4fv(light_color, vec4(0, 0, 0, 1));
        // }
        else if (greenOn === true) {
            gl.uniform4fv(light_color, vec4(0, 1, 0, 1));
            gl.uniform4fv(light_position, mult(mv, vec4(-80, 25, 80, 1)));
        }
        // else {
        //     gl.uniform4fv(light_color, vec4(0, 0, 0, 1));
        // }
        else if (blueOn === true) {
            gl.uniform4fv(light_color, vec4(0, 0, 1, 1));
            gl.uniform4fv(light_position, mult(mv, vec4(-80, 25, -80, 1)));
        }
        // else {
        //     gl.uniform4fv(light_color, vec4(0, 0, 0, 1));
        // }
        else if (whiteOn === true) {
            gl.uniform4fv(light_color, vec4(1, 1, 1, 1));
            gl.uniform4fv(light_position, mult(mv, vec4(80, 25, 80, 1)));
        } else {
            gl.uniform4fv(light_color, vec4(0, 0, 0, 1));
        }
        if (spotLightOn === true) {

        }
    }
}

//Vertex color and position calls
function vNormalvPosition(){
//    vPosition = gl.getAttribLocation(program, "vPosition");
    //attribute location we just fetched, 4 elements in each vector, data type float, don't normalize this data,
    //each position starts 32 bytes after the start of the previous one, and starts right away at index 0
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(vPosition);

//    vNormal = gl.getAttribLocation(program, "vNormal");
    //attribute location we just fetched, 4 elements in each vector, data type float, don't normalize this data,
    //each color starts 32 bytes after the start of the previous one, and the first color starts 16 bytes into the data
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
    gl.enableVertexAttribArray(vNormal);
}

//Removes duplicate code from drawing rims
function rimDraw(){
    gl.bindBuffer(gl.ARRAY_BUFFER, rimBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
    gl.drawArrays(gl.TRIANGLES, 0, 3*segments +3);
}

function prismDraw(){
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function wheelDraw(){
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
    gl.drawArrays(gl.TRIANGLES, 0, 6 * segments + 6);
}

function sphereDraw(){
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
    gl.drawArrays(gl.TRIANGLES, 0, (sphereVerts.length/2));
}

//Translation matrix for the cart
function cartTransMat(){
    //Setting up and completing the translation matrix for the cart body
    var eye;
    if(count === trackpoints.length-2)
        eye = vec4(trackpoints[0][0], trackpoints[0][1], trackpoints[0][2], 1.0);
    else
        eye = vec4(trackpoints[count+2][0], trackpoints[count+2][1], trackpoints[count+2][2], 1.0);
    var at = vec4(trackpoints[count][0], trackpoints[count][1], trackpoints[count][2], 1.0);
    var up = vec4(0,1,0,0);
    v = normalize( subtract(eye, at));
    n = vec4( normalize( cross(v, up)), 0);
    u = vec4( normalize( cross(n, v)), 0);
    c = mat4(n,u,v,at);
    c = transpose(c);
}

//Draws the entire cart
function fullCartDraw(){
    cartmv = mult(mv,c);
    cartmv = mult(cartmv, translate(0,2.25,0));
    // gl.uniformMatrix4fv(umv, false, flatten(cartmv));
    // gl.bindBuffer(gl.ARRAY_BUFFER, cartBuffer);
    // sphereDraw();

    headlightmv = mult(cartmv, translate(-.5,0,2));
    headlightmv = mult(headlightmv, rotateY(90));
    headlightmv = mult(headlightmv, scalem(4,.5,.5));
    gl.uniformMatrix4fv(umv, false, flatten(headlightmv));
    gl.bindBuffer(gl.ARRAY_BUFFER, wheelBuffer);
    gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(1, 1, 1, 1.0));
    gl.vertexAttrib4fv(vSpecularColor, vec4(0.3, 0.3, 0.3, 1));
    // gl.vertexAttrib1f(vSpecularExponent, 30);
    wheelDraw();

    headlightcapmv = mult(headlightmv, translate(0,0,1));
    gl.uniformMatrix4fv(umv, false, flatten(headlightcapmv));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(1, 1, 1, 1.0));
    gl.vertexAttrib4fv(vSpecularColor, vec4(0.3, 0.3, 0.3, 1));
    rimDraw();


    //All wheels are generated based on the cart's position
    wheel1mv = mult(cartmv, translate(-1.5, -1, 0)); //front right
    gl.uniformMatrix4fv(umv, false, flatten(wheel1mv));
    gl.bindBuffer(gl.ARRAY_BUFFER, wheelBuffer);
    gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(0.1, 0.1, 0.1, 1.0));
    gl.vertexAttrib4fv(vSpecularColor, vec4(0.05, 0.05, 0.05, 1));
    wheelDraw();

    wheel2mv = mult(cartmv, translate(1, -1, 0)); //front left
    gl.uniformMatrix4fv(umv, false, flatten(wheel2mv));
    gl.bindBuffer(gl.ARRAY_BUFFER, wheelBuffer);
    wheelDraw();

    wheel3mv = mult(cartmv, translate(-1.5, -1, -2.5)); //rear right
    gl.uniformMatrix4fv(umv, false, flatten(wheel3mv));
    gl.bindBuffer(gl.ARRAY_BUFFER, wheelBuffer);
    wheelDraw();

    wheel4mv = mult(cartmv, translate(1, -1, -2.5)); //front left
    gl.uniformMatrix4fv(umv, false, flatten(wheel4mv));
    gl.bindBuffer(gl.ARRAY_BUFFER, wheelBuffer);
    wheelDraw();

    //All rims are drawn based on their corresponding wheel location
    rim1mv = mult(wheel1mv, translate(0, 0, 1));
    rim1mv = mult(rim1mv, rotateX(rotateAngle));
    gl.uniformMatrix4fv(umv, false, flatten(rim1mv));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(0.5, 0.5, 0.5, 1.0));
    gl.vertexAttrib4fv(vSpecularColor, vec4(0.25, 0.25, 0.25, 1));
    rimDraw();
    rim1mv = mult(rim1mv, rotateY(180));
    rim1mv = mult(rim1mv, translate(-.5, 0, 0));
    gl.uniformMatrix4fv(umv, false, flatten(rim1mv));
    rimDraw();

    rim2mv = mult(wheel2mv, translate(0, 0, 1));
    rim2mv = mult(rim2mv, rotateX(rotateAngle));
    gl.uniformMatrix4fv(umv, false, flatten(rim2mv));
    rimDraw();
    rim2mv = mult(rim2mv, rotateY(180));
    rim2mv = mult(rim2mv, translate(-.5, 0, 0));
    gl.uniformMatrix4fv(umv, false, flatten(rim2mv));
    rimDraw();

    rim3mv = mult(wheel3mv, translate(0, 0, 1));
    rim3mv = mult(rim3mv, rotateX(rotateAngle));
    gl.uniformMatrix4fv(umv, false, flatten(rim3mv));
    rimDraw();
    rim3mv = mult(rim3mv, rotateY(180));
    rim3mv = mult(rim3mv, translate(-.5, 0, 0));
    gl.uniformMatrix4fv(umv, false, flatten(rim3mv));
    rimDraw();

    rim4mv = mult(wheel4mv, translate(0, 0, 1));
    rim4mv = mult(rim4mv, rotateX(rotateAngle));
    gl.uniformMatrix4fv(umv, false, flatten(rim4mv));
    rimDraw();
    rim4mv = mult(rim4mv, rotateY(180));
    rim4mv = mult(rim4mv, translate(-.5, 0, 0));
    gl.uniformMatrix4fv(umv, false, flatten(rim4mv));
    rimDraw();

    riderHeadmv = mult(cartmv, translate(0,1.5,.5));
    riderHeadmv = mult(riderHeadmv, scalem(.75,.75,.75));
    riderHeadmv = mult(riderHeadmv, rotateY(headRotAng));
    gl.uniformMatrix4fv(umv, false, flatten(riderHeadmv));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(0.9, 0.9, 0.9, 1.0));
    gl.vertexAttrib4fv(vSpecularColor, vec4(0.1, 0.1, 0.1, 1));
    gl.bindBuffer(gl.ARRAY_BUFFER, headBuffer);
    sphereDraw();
    riderEyesmv = mult(riderHeadmv, translate(.5,.15,.75));
    riderEyesmv = mult(riderEyesmv, scalem(.25,.25,.25));
    gl.uniformMatrix4fv(umv, false, flatten(riderEyesmv));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(0.1, 0.1, 0.1, 1.0));
    gl.vertexAttrib4fv(vSpecularColor, vec4(0.2, 0.2, 0.2, 1));
    gl.bindBuffer(gl.ARRAY_BUFFER, eyeBuffer);
    sphereDraw();
    riderEyesmv = mult(riderHeadmv, translate(-.5,.15,.75));
    riderEyesmv = mult(riderEyesmv, scalem(.25,.25,.25));
    gl.uniformMatrix4fv(umv, false, flatten(riderEyesmv));
    sphereDraw();

    cartmv = mult(cartmv, scalem(1,0.75,2));
    gl.uniformMatrix4fv(umv, false, flatten(cartmv));
    gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(0.75, 0, 0, 1.0));
    gl.vertexAttrib4fv(vSpecularColor, vec4(0.3, 0.3, 0.3, 1));

    gl.bindBuffer(gl.ARRAY_BUFFER, cartBuffer);
    sphereDraw();

    // redBallmv = mult(mv, translate(80,25,80));
    // gl.uniformMatrix4fv(umv, false, flatten(riderHeadmv));
    // gl.vertexAttrib4fv(vAmbientDiffuseColor, vec4(1, 0, 0, 1.0));
    // gl.bindBuffer(gl.ARRAY_BUFFER, headBuffer);
    // sphereDraw();
}

//Draws the rider
// function riderDraw(){
//     riderHeadmv = mult(cartmv, translate(0,2,.5));
//     riderHeadmv = mult(riderHeadmv, scalem(.75,.75,.75));
//     riderHeadmv = mult(riderHeadmv, rotateY(headRotAng));
//     gl.uniformMatrix4fv(umv, false, flatten(riderHeadmv));
//     gl.bindBuffer(gl.ARRAY_BUFFER, headBuffer);
//     sphereDraw();
//     riderEyesmv = mult(riderHeadmv, translate(.5,.15,.75));
//     riderEyesmv = mult(riderEyesmv, scalem(.25,.25,.25));
//     gl.uniformMatrix4fv(umv, false, flatten(riderEyesmv));
//     gl.bindBuffer(gl.ARRAY_BUFFER, eyeBuffer);
//     sphereDraw();
//     riderEyesmv = mult(riderHeadmv, translate(-.5,.15,.75));
//     riderEyesmv = mult(riderEyesmv, scalem(.25,.25,.25));
//     gl.uniformMatrix4fv(umv, false, flatten(riderEyesmv));
//     sphereDraw();
// }
