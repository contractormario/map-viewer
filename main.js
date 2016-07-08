import MapView from './geo/mapview';
import MapViewer from './geo/mapviewer';

var [windowW, windowH] = [window.innerWidth, window.innerHeight];
var center = [-0.105842, 51.532740];
var mv = new MapViewer('viewer1', 0, 0, windowW, windowH, 13, center);
document.mv = mv; // so I can use chrome console

/* Fired when browser window gets resized */
window.addEventListener('resize', () => {
    var [w, h] = [window.innerWidth, window.innerHeight];
    mv.onResize(w, h);
}, true);

mv.render();