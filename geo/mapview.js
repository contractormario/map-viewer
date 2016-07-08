const RAD = Math.PI / 180; // radians = degrees * RAD
const DEG = 180 / Math.PI; // degrees = radians * DEG
const TILE_SIZE = 256; // width/height in pixels
const MAX_LAT = function() {
    function sinh(x) {
        return (Math.exp(x) - Math.exp(-x)) / 2;
    }
    return Math.atan(sinh(Math.PI)) * DEG;
}();

class MapView {
    constructor(zoom, cll, w, h) {
        this.zoom = zoom;
        this.cll = cll;
        this.w = w;
        this.h = h;

        this.mapwh = this.mapwh(zoom);
        this.xPerDeg = this.xperdeg(this.mapwh[1]);
        this._bbox = this.bbox(cll, [w,h]);
    }

    mapwh(zoom) {
        var w = TILE_SIZE * Math.pow(2, zoom);
        return [w, w];
    }
    /*
    * cll - center as [lon,lat]
    * mapwh - map size as [w,h]
    * a - top left corner
    * b - bottom right corner
    * c - center
    * each one is [px,ll]
    * where px is [x,y]
    * and ll is [lon,lat]
    * */
    bbox(cll, mapwh) {
        var cpx = this.px(cll);
        var apx = [cpx[0] - mapwh[0] / 2, cpx[1] - mapwh[1] / 2];
        var bpx = [cpx[0] + mapwh[0] / 2, cpx[1] + mapwh[1] / 2];
        var all = this.ll(apx);
        var bll = this.ll(bpx);

        return {
            a: [apx, all],
            b: [bpx, bll],
            c: [cpx, cll]
        };
    }

    /* Precompute x-per-degree for fast lon->x x->lon conversion */
    xperdeg(mapw) {
        var float1 = (Math.PI + (-180) * RAD) / (2 * Math.PI); // float = 0 .. 1
        var float2 = (Math.PI + (-179) * RAD) / (2 * Math.PI); // float = 0 .. 1
        var floatXPerDeg = - (float1 - float2);
        var xPerDeg = floatXPerDeg * mapw;
        return xPerDeg;
    }

    /* Convert Mercator [x,y] to [lon,lat] */
    ll(px) {
        /* Lon */
        var floatX = px[0] / this.mapwh[0];
        var rad = ((floatX * 2) - 1) * Math.PI;
        var lon = rad * DEG;

        /* Lat */
        var floatY = px[1] / this.mapwh[1];
        var _nor = floatY; // 0-1, increases down the Y axis
        var _nor = (_nor * 2) - 1;
        var _nor = -_nor;
        var _nor = _nor * Math.PI;
        var _nor = Math.sinh(_nor);
        var _rad = Math.atan(_nor);
        var lat = _rad * (180 / Math.PI);

        return [lon, lat];
    }

    /* Convert [lon,lat] to Mercator [x,y] */
    px(ll) {
        /* Lon */
        var lon = ll[0] + 180;
        var x = Math.floor(this.xPerDeg * lon);

        /* Lat */
        var rad = ll[1] * RAD;
        var nor = Math.log(Math.tan(rad) + (1 / Math.cos(rad)));
        var y = Math.floor((this.mapwh[1] * (Math.PI - nor)) / (2 * Math.PI));

        return [x, y];
    }
    /* Convert relative coords [x,y] within bbox to Mercator [x,y] */
    relpx(bbox, px) {
        var ret = [bbox.a[0][0] + px[0], bbox.a[0][1] + px[1]];
        return ret;
    }

    /* Get tile [x,y,dx,dy] (on-server) from Mercator [x,y]
     * x - tile X identifier on server
     * y - tile Y identifier on server
     * dx - x within tile
     * dy - y within tile
     * */
    tile(px) {
        var x = Math.floor( (px[0] / this.mapwh[0]) * (this.mapwh[0] / 256) );
        var y = Math.floor( (px[1] / this.mapwh[1]) * (this.mapwh[1] / 256) );

        var dx = px[0] % 256;
        var dy = px[1] % 256;

        return [x, y, dx, dy];
    }

    /* Get tile() but within bbox() */
    bboxtile(px) {
        var rpx = this.relpx(this._bbox, px);
        return this.tile(rpx);
    }
}

export { RAD, DEG, TILE_SIZE, MAX_LAT, MapView };