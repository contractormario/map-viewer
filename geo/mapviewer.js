import { MapView } from './mapview';

const MOUSE_WHEEL_DELTA_MODE = {
    DOM_DELTA_PIXEL: 0,
    DOM_DELTA_LINE: 1,
    DOM_DELTA_PAGE: 2
};

/* Cache of Image() objects */
class OsmTileServerCache {
    static init() {
        OsmTileServerCache.imgs = {};
    }

    static add(x, y, z) {
        var img = new Image();   // Create new img element
        img.src = OsmTileServerCache.url(x, y, z);
        var key = OsmTileServerCache.key(x, y, z);
        OsmTileServerCache.imgs[key] = img;
        return img;
    }

    static url(x, y, z) {
        // URL format: http://[abc].tile.openstreetmap.org/zoom/x/y.png
        return 'http://a.tile.openstreetmap.org/'+z+'/'+x+'/'+y+'.png';
    }

    static key(x, y, z) {
        return `${x}-${y}-${z}`;
    }

    static get(x, y, z) {
        var key = OsmTileServerCache.key(x, y, z);
        if(OsmTileServerCache.imgs[key] !== undefined) {
            return OsmTileServerCache.imgs[key];
        } else {
            return null;
        }
    }

    static size() {
        return Object.keys(OsmTileServerCache.imgs).length;
    }
}

OsmTileServerCache.init();

class Tile {
    constructor(id, tileX, tileY, screenX1, screenY1, screenX2, screenY2, alpha, url, onLoaded, mv) {
        this.id = id;
        this.tileX = tileX;
        this.tileY = tileY;
        this.screenX1 = screenX1;
        this.screenY1 = screenY1;
        this.screenX2 = screenX2;
        this.screenY2 = screenY2;
        this.alpha = alpha;
        this.url = url;
        this.mv = mv;
        this.loading = false;

        var cached = OsmTileServerCache.get(tileX, tileY, mv.zoom);
        if(cached !== null) {
            this.img = cached;
        } else {
            this.img = OsmTileServerCache.add(tileX, tileY, mv.zoom);
        }
    }
    draw() {
        this.mv.c.drawImage(this.img, this.screenX1, this.screenY1);
    }
    drawOutline() {
        /* Draw random color outline for debugging */
        var r = Math.floor( Math.random() * 255 );
        var g = Math.floor( Math.random() * 255 );
        var b = Math.floor( Math.random() * 255 );
        this.mv.c.strokeStyle = `rgb(${r},${g},${b})`;
        this.mv.c.strokeRect(this.screenX1, this.screenY1, this.screenX2-this.screenX1-1, this.screenY2-this.screenY1-1);
    }
    drawLabel() {
        /* Draw tile number (X,Y) */
        this.mv.c.font = "24px serif";
        this.mv.c.strokeStyle = `rgb(0,0,0)`;
        var label = this.tileX+','+this.tileY;
        this.mv.c.fillText(label, this.screenX1, this.screenY1);
    }
}

class MapViewer {
    constructor(id, x, y, w, h, zoom, center) {
        this.id = id;
        this.zoom = zoom;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        this.numAxisTiles = Math.pow(2, zoom);
        this.numTotalTiles = this.numAxisTiles * this.numAxisTiles;
        this.tileSizePix = 256; // 256x256 pixels
        this.bigMapW = this.numAxisTiles * this.tileSizePix;
        this.bigMapH = this.numAxisTiles * this.tileSizePix;

        /* Init vars */
        this.mouseX = 0;
        this.mouseY = 0;
        this.dragging = false;
        this.tileSource = 2; // OSM
        this.spriteCache = {};
        // this.center = center;
        this.view = new MapView(zoom, center, w, h);
        this.center = center;
        this.cpx = this.view.px(center);
        this.cll = this.view.ll(this.cpx);

        this.updateHud();

        /* */
        this.initCanvas(x, y, w, h);

        this.tiles = this.getTileArray();

        /* Register event handlers */
        this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this), true);
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this), true);
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this), true);
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this), true);
        this.canvas.addEventListener('keydown', this.onKeyDown.bind(this), true);
        this.canvas.addEventListener('keyup', this.onKeyUp.bind(this), true);
    }

    setTileSource(source) {
        this.tileSource = source;

        this.tileContainer = [];
        this.tileArray = [];
        this.fillTiles();
    }

    isSpriteInCache(url) {
        return (this.spriteCache[url] !== undefined);
    }

    getSpriteFromCache(url) {
        if(this.spriteCache[url] !== undefined) {
            return this.spriteCache[url];
        }
        return null;
    }

    addSpriteToCache(sprite, url) {
        this.spriteCache[url] = sprite;
    }

    /* Fill in missing tiles */
    fillTiles() {
        var tiles = this.getTileArray();

        var n = Object.keys(tiles).length;
        Object.keys(tiles).forEach((tileKey) => {
            var tile = tiles[tileKey];

            if(this.tiles[tile.id] !== undefined) {
                /* New */
                /* Add to tiles */
                this.tiles[tile.id] = tile;
                tile.load();
            }
        });
    }

    isPointInView(x, y) {
        if(x >= 0 && y >= 0 && x <= this.w-1 && y <= this.h-1) {
            return true;
        }
        return false;
    }

    isTileInView(tile) {
        /* Check if any corner of the tile is in view */
        if(this.isPointInView(tile.screenX1, tile.screenY1)
        || this.isPointInView(tile.screenX2, tile.screenY1)
        || this.isPointInView(tile.screenX1, tile.screenY2)
        || this.isPointInView(tile.screenX2, tile.screenY2)) {
            return true;
        }
        return false;
    }

    /* Remove tiles outside of the viewable area */
    clipTiles() {
        Object.keys(this.tiles).forEach(tileKey => {
            var tile = this.tiles[tileKey];
            if(!this.isTileInView(tile)) {
                delete this.tiles[tileKey];
            }
        });
    }

    forEachTile(cb) {
        Object.keys(this.tiles).forEach((tileKey) => {
            cb(tileKey);
        });
    }

    /* Shift tile positions in response to mousemove/resize */
    shiftTiles(deltaX, deltaY) {
        this.forEachTile(tileKey => {
            var tile = this.tiles[tileKey];

            var oldScreenX1 = tile.screenX1;
            var oldScreenX2 = tile.screenX2;
            var oldScreenY1 = tile.screenY1;
            var oldScreenY2 = tile.screenY2;

            tile.screenX1 += deltaX;
            tile.screenX2 += deltaX;
            tile.screenY1 += deltaY;
            tile.screenY2 += deltaY;
        });
    }

    createTileSprites(tiles) {
        var n = tiles.length;
        for(var i=0; i<n; i++) {
            var tile = tiles[i];

            if(this.isSpriteInCache(tile.url)) {
                var alpha = 1;
            } else {
                var alpha = 0;
            }
            var sprite = this.createTile(tile.url, tile.screenX1, tile.screenY1, alpha, tile.url);
            this.tileContainer.push(sprite);
        }
    }

    areMapQuestTileUrlsEqual(url1, url2) {
        var parts1 = url1.match(/http:\/\/[a-z0-9]+.mqcdn.com\/tiles\/1.0.0\/map\/([0-9]+)\/([0-9]+)\/([0-9]+).png/);
        var parts2 = url2.match(/http:\/\/[a-z0-9]+.mqcdn.com\/tiles\/1.0.0\/map\/([0-9]+)\/([0-9]+)\/([0-9]+).png/);
        if(parts1[1] === parts2[1]
            && parts1[2] === parts2[2]
            && parts1[3] === parts2[3]) {
            return true;
        }
        return false;
    }

    /* Check if two OSM urls are equal (ignoring server part!) */
    areOsmTileUrlsEqual(url1, url2) {
        var parts1 = url1.match(/http:\/\/[abc].tile.openstreetmap.org\/([0-9]+)\/([0-9]+)\/([0-9]+).png/);
        var parts2 = url2.match(/http:\/\/[abc].tile.openstreetmap.org\/([0-9]+)\/([0-9]+)\/([0-9]+).png/);
        if(parts1[1] === parts2[1]
        && parts1[2] === parts2[2]
        && parts1[3] === parts2[3]) {
            return true;
        }
        return false;
    }

    osmTileUrl(x, y, zoom) {
        /* Cycle between servers (a,b,c) using a static var */
        if(this.serverIndex === undefined) {
            this.serverIndex = 0;
        } else {
            this.serverIndex++;
            if(this.serverIndex > 2) {
                this.serverIndex = 0;
            }
        }
        var server = '';
        switch(this.serverIndex) {
            case 0: server = 'a'; break;
            case 1: server = 'b'; break;
            case 2: server = 'c'; break;
        }

        // URL format: http://[abc].tile.openstreetmap.org/zoom/x/y.png
        return 'http://'+server+'.tile.openstreetmap.org/'+zoom+'/'+x+'/'+y+'.png';
    }

    mapQuestTileUrl(x, y, zoom) {
        /* Cycle between servers (a,b,c) using a static var */
        if(this.serverIndex === undefined) {
            this.serverIndex = 0;
        } else {
            this.serverIndex++;
            if(this.serverIndex > /*3*/2) {
                this.serverIndex = 0;
            }
        }
        var server = '';
        switch(this.serverIndex) {
            case 0: server = 'otile1'; break;
            case 1: server = 'otile2'; break;
            case 2: server = 'otile3'; break;
            // case 3: server = 'otile4'; break;
        }

        return 'http://'+server+'.mqcdn.com/tiles/1.0.0/map/'+zoom+'/'+x+'/'+y+'.png';
    }

    arcgisTileUrl(x, y, zoom) {
    /*
         ArcGIS Server Tiled Map Service Template:
         http://{SERVER}/tile/{ZOOM_LEVEL}/{ROW}/{COLUMN}.png

         ArcGIS Server Tiled Map Service Example:
         http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/4/6/2.png
    */
         return 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/'+zoom+'/'+y+'/'+x+'.png';
    }

    getTileArray() {
        var tiles = {};

        var x2 = this.w - 1;
        var y2 = this.h - 1;
        for(var x=0; x<=x2+256-1; x+=256) {
            var tileX1 = x;
            var tileX2 = x + 256 - 1;
            for(var y=0; y<=y2+256-1; y+=256) {
                var tileY1 = y;
                var tileY2 = y + 256 - 1;

                var tile = this.view.bboxtile([tileX1,tileY1]);
                var tileX = tile[0];
                var tileY = tile[1];

                var screenX1 = x - tile[2];
                var screenX2 = screenX1 + 256;
                var screenY1 = y - tile[3]; // + offset
                var screenY2 = screenY1 + 256; // + offset

                var url = this.osmTileUrl(tileX, tileY, this.zoom);
                var tileKey = `${this.zoom}-${tileX}-${tileY}`;
                var onLoaded = function(mv) {
                    // mv.c.drawImage(this.img, this.screenX1, this.screenY1);
                };
                var tile = new Tile(tileKey, tileX, tileY, screenX1, screenY1, screenX2, screenY2, 1, url, onLoaded, this);

                tiles[tileKey] = tile;
                // tile.load();
            }
        }

        return tiles;
    }

    /*
    * w - window width
    * h - window height
    * */
    onResize(w, h) {
        var canvas = document.getElementById('canvas');
        canvas.width = w;
        canvas.height = h;

        this.w = w;
        this.h = h;

        this.view = new MapView(this.zoom, this.cll, this.w, this.h);

        this.tiles = {};
        this.tiles = this.getTileArray();

        this.render();
    }

    initCanvas(x, y, w, h) {
        var canvas = document.createElement('canvas');
        this.canvas = canvas;
        this.c = canvas.getContext('2d');

        canvas.id = "canvas";
        canvas.width = w;
        canvas.height = h;
        canvas.style.backgroundColor = 'blue';
        canvas.style.zIndex = 8;
        canvas.style.position = "absolute";
        canvas.style.left = x + 'px';
        canvas.style.top = y + 'px';
        canvas.style.border = "1px solid red";

        canvas.draggable = 'true';

        document.body.appendChild(canvas);
        document.documentElement.style.overflow = 'hidden';
    }

    drawHud() {
        // console.count('drawHud()');
        this.c.font = "16px Consolas";
        this.c.fillStyle = "rgb(255,0,0)";

        var y = 20;
        this.hudText.forEach(el => {
            this.c.fillText(el, 10, y);
            y += 20;
        });

        y += 20;

        var d = OsmTileServerCache.size();
        this.c.fillText(`OsmTileServerCache.length: ${d}`, 10, y);

        y += 20;

        this.c.fillText(`bboxA ${this.view._bbox.a[0][0]} ,${this.view._bbox.a[0][1]}, ${this.view._bbox.a[1][0]}, ${this.view._bbox.a[1][1]}`, 10, y);
        y += 20;
        this.c.fillText(`bboxB ${this.view._bbox.b[0][0]} ,${this.view._bbox.b[0][1]}, ${this.view._bbox.b[1][0]}, ${this.view._bbox.b[1][1]}`, 10, y);

        y += 20;
        this.c.font = "12px Consolas";
        Object.keys(this.tiles).forEach(tileKey => {
            var tile = this.tiles[tileKey];
            var text = `
            ${tile.tileX}, ${tile.tileX},
            ${tile.screenX1}, ${tile.screenY1},
            ${tile.url},
            ${tile.loading}
            `;
            this.c.fillText(text, 10, y);
            y += 12;
        });
    }

    updateHud() {
        var text = [];
        text.push( 'zoom: ' + this.zoom + "\n" );
        text.push( 'mouseX: ' + this.mouseX + "\n" );
        text.push( 'mouseY: ' + this.mouseY + "\n" );
        text.push( 'dragging: ' + this.dragging + "\n" );
        text.push( 'cll: ' + this.cll[0] + ', ' + this.cll[1] + "\n" );
        text.push( 'cpx: ' + this.cpx[0] + ', ' + this.cpx[1] + "\n" );
        text.push( 'viewerW: ' + this.w + "\n" );
        text.push( 'viewerH: ' + this.h + "\n" );
        this.hudText = text;
    }

    drawBackground() {
        this.c.fillStyle = "rgb(0,0,255)";
        this.c.fillRect(this.x, this.y, this.w, this.h);
    }

    drawTiles() {
        Object.keys(this.tiles).forEach((tileKey) => {
            var tile = this.tiles[tileKey];
            tile.draw();
        });
    }

    render() {
        //this.drawBackground();
        this.drawTiles();
        //this.drawHud();
    }

    setZoom(zoomLevel) {
        this.zoomLevel = zoomLevel;
    }
    getZoom() {
        return this.zoomLevel;
    }

    onMouseWheel(event) {
        event.preventDefault(); // Cancels the event if it is cancelable, without stopping further propagation of the event.
        event.stopPropagation(); // Prevents further propagation of the current event.

        if(event.deltaMode == MOUSE_WHEEL_DELTA_MODE.DOM_DELTA_LINE) { /* Firefox */
            var delta = event.deltaY;

            if(delta > 0) {
                this.zoomOut();
            }
            else if(delta < 0) {
                this.zoomIn();
            }
        }

        if(event.deltaMode == MOUSE_WHEEL_DELTA_MODE.DOM_DELTA_PIXEL) { /* Chrome */
            var delta = event.deltaY;

            if(delta > 0) {
                this.zoomOut();
            }
            else if(delta < 0) {
                this.zoomIn();
            }
        }
    }

    zoomIn() {
        return;
        if(this.zoom <= 17) {
            this.zoom++;
            this.view = new MapView(this.zoom, this.cll, this.w, this.h);

            this.tiles = {};
            this.tiles = this.getTileArray();

            this.render();
        }
    }

    zoomOut() {
        return;
        if(this.zoom >= 4) {
            this.zoom--;

            this.view = new MapView(this.zoom, this.cll, this.w, this.h);

            this.tiles = {};
            this.tiles = this.getTileArray();

            this.render();
        }
    }

    onMouseDrag(deltaX, deltaY) {
        this.cpx[0] -= deltaX;
        this.cpx[1] -= deltaY;
        this.cll = this.view.ll(this.cpx);
        this.view = new MapView(this.zoom, this.cll, this.w, this.h);

        this.tiles = {};
        this.tiles = this.getTileArray();

        this.render();
    }

    onMouseMove(event) {
        event.preventDefault(); // Cancels the event if it is cancelable, without stopping further propagation of the event.
        event.stopPropagation(); // Prevents further propagation of the current event.

        /* Use event.layer for coordinates relative to this element */
        this.mouseX = event.layerX;
        this.mouseY = event.layerY;

        if(this.dragging) {
            var lastX = this.draggingLastX;
            var lastY = this.draggingLastY;

            var deltaX = event.clientX - lastX;
            var deltaY = event.clientY - lastY;

            this.draggingLastX = event.clientX;
            this.draggingLastY = event.clientY;

            this.onMouseDrag(deltaX, deltaY);
        }
    }

    onMouseDown(event) {
        event.preventDefault(); // Cancels the event if it is cancelable, without stopping further propagation of the event.
        event.stopPropagation(); // Prevents further propagation of the current event.

        this.dragging = true;
        this.draggingOriginX = event.clientX;
        this.draggingOriginY = event.clientY;
        this.draggingLastX = event.clientX;
        this.draggingLastY = event.clientY;
    }

    onMouseUp(event) {
        event.preventDefault(); // Cancels the event if it is cancelable, without stopping further propagation of the event.
        event.stopPropagation(); // Prevents further propagation of the current event.

        this.dragging = false;
    }

    onKeyDown(event) {
        //event.preventDefault(); // Cancels the event if it is cancelable, without stopping further propagation of the event.
        //event.stopPropagation(); // Prevents further propagation of the current event.
    }

    onKeyUp(event) {
        //event.preventDefault(); // Cancels the event if it is cancelable, without stopping further propagation of the event.
        //event.stopPropagation(); // Prevents further propagation of the current event.

        var keyCode = event.keyCode;

        switch(keyCode) {
            // case 81: {
            //     mario.onKeyUpQ();
            //     break;
            // }
        }
    }
} /* class */

export default MapViewer;
