import MapView from './geo/mapview';
import MapViewer from './geo/mapviewer';

var [windowW, windowH] = [window.innerWidth, window.innerHeight];
var center = [-0.105842, 51.532740];
var mv = new MapViewer('viewer1', 0, 0, windowW, windowH, 13, center);
mv.onResize(function(windowW, windowH) {
    this.x = 0;
    this.y = 0;
    this.w = windowW;
    this.h = windowH;
    this.renderer.view.style.width = this.w + "px";
    this.renderer.view.style.height = this.h + "px";
    this.renderer.resize(this.w, this.h);
});
document.mv = mv; // so I can use chrome console

mv.render();
