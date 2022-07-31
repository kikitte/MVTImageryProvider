import Mapbox from "./mapbox-gl";
import * as Cesium from "cesium";

class MVTImageryProvider {
  /**
   *
   * @param {Object} options
   * @param {Object} options.style - mapbox style object
   * @param {Function} [options.sourceFilter] - sourceFilter is used to filter which source participate in pickFeature process.
   * @param {Number} [options.maximumLevel] - if cesium zoom level exceeds maximumLevel, layer will be invisible.
   * @param {Number} [options.minimumLevel] - if cesium zoom level belows minimumLevel, layer will be invisible.
   * @param {Number} [options.tileSize=512] - can be 256 or 512.
   * @param {Boolean} [options.hasAlphaChannel] -
   * @param {String} [options.credit] -
   *
   */
  constructor(options) {
    this.mapboxRenderer = new Mapbox.BasicRenderer({ style: options.style });
    this.ready = false;
    this.readyPromise = this.mapboxRenderer._style.loadedPromise.then(
      () => (this.ready = true)
    );
    this.tilingScheme = new Cesium.WebMercatorTilingScheme();
    this.rectangle = this.tilingScheme.rectangle;
    this.tileSize = this.tileWidth = this.tileHeight = options.tileSize || 512;
    this.maximumLevel = options.maximumLevel || Number.MAX_SAFE_INTEGER;
    this.minimumLevel = options.minimumLevel || 0;
    this.tileDiscardPolicy = undefined;
    this.errorEvent = new Cesium.Event();
    this.credit = new Cesium.Credit(options.credit || "", false);
    this.proxy = new Cesium.DefaultProxy("");
    this.hasAlphaChannel =
      options.hasAlphaChannel !== undefined ? options.hasAlphaChannel : true;
    this.sourceFilter = options.sourceFilter;
  }

  getTileCredits(x, y, level) {
    return [];
  }

  createTile() {
    let canv = document.createElement("canvas");
    canv.width = this.tileSize;
    canv.height = this.tileSize;
    canv.style.imageRendering = "pixelated";
    canv.getContext("2d").globalCompositeOperation = "copy";
    return canv;
  }

  _getTilesSpec(coord, source) {
    const { x, y, zoom } = coord
    const TILE_SIZE = this.tileSize
    // 3x3 grid of source tiles, where the region of interest is that corresponding to the central source tile
    let ret = [];
    const maxTile = (1 << zoom) - 1
    for (let xx = -1; xx <= 1; xx++) {
      let newx = x + xx
      if (newx < 0) newx = maxTile
      if (newx > maxTile) newx = 0
      for (let yy = -1; yy <= 1; yy++) {
        let newy = y + yy
        if (newy < 0) continue
        if (newy > maxTile) continue
        ret.push({
          source: source,
          z: zoom,
          x: newx,
          y: newy,
          left: 0 + xx * TILE_SIZE,
          top: 0 + yy * TILE_SIZE,
          size: TILE_SIZE
        });
      }
    }
    return ret
  }

  requestImage(x, y, zoom, releaseTile = true) {
    if (zoom > this.maximumLevel || zoom < this.minimumLevel)
      return Promise.reject(undefined);

    this.mapboxRenderer.filterForZoom(zoom);
    const tilesSpec = this.mapboxRenderer
      .getVisibleSources()
      .reduce((a, s) => a.concat(this._getTilesSpec({ x, y, zoom }, s)), []);

    return new Promise((resolve, reject) => {
      const canv = this.createTile();
      const ctx = canv.getContext("2d");
      const renderRef = this.mapboxRenderer.renderTiles(
        ctx,
        {
          srcLeft: 0,
          srcTop: 0,
          width: this.tileSize,
          height: this.tileSize,
          destLeft: 0,
          destTop: 0,
        },
        tilesSpec,
        (err) => {
          /**
           * In case of err ends with 'tiles not available', the canvas will still be painted.
           * relate url: https://github.com/landtechnologies/Mapbox-vector-tiles-basic-js-renderer/blob/master/src/basic/renderer.js#L341-L405
           */
          if (typeof err === 'string' && !err.endsWith('tiles not available')) {
            reject(undefined);
          } else if (releaseTile) {
            renderRef.consumer.ctx = undefined;
            resolve(canv);
            // releaseTile默认为true，对应Cesium请求图像的情形
            this.mapboxRenderer.releaseRender(renderRef);
          } else {
            // releaseTile为false时在由pickFeature手动调用，在渲染完成之后在pickFeature里边手动释放tile
            resolve(renderRef);
          }
        }
      );
    });
  }

  pickFeatures(x, y, zoom, longitude, latitude) {
    return this.requestImage(x, y, zoom, false).then((renderRef) => {
      let targetSources = this.mapboxRenderer.getVisibleSources();
      targetSources = this.sourceFilter
        ? this.sourceFilter(targetSources)
        : targetSources;

      const queryResult = [];

      longitude = Cesium.Math.toDegrees(longitude);
      latitude = Cesium.Math.toDegrees(latitude);

      targetSources.forEach((s) => {
        queryResult.push({
          data: this.mapboxRenderer.queryRenderedFeatures({
            source: s,
            renderedZoom: zoom,
            lng: longitude,
            lat: latitude,
            tileZ: zoom,
          }),
        });
      });

      // release tile
      renderRef.consumer.ctx = undefined;
      this.mapboxRenderer.releaseRender(renderRef);
      return queryResult;
    });
  }

  destroy() {
    this.mapboxRenderer._cancelAllPendingRenders();
    Object.values(this.mapboxRenderer._style.sourceCaches).forEach(cache => cache._tileCache.reset());
    this.mapboxRenderer._gl.getExtension('WEBGL_lose_context').loseContext();
  }
}

export default MVTImageryProvider;
