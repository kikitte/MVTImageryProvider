import Mapbox from "./mapbox-gl";
import * as Cesium from "cesium";

class MVTImageryProvider {
  /**
   * create a MVTImageryProvider Object
   * @param {MVTImageryProviderOptions} options MVTImageryProvider options as follow:
   * @param {Resource | string | Object} options.style - mapbox style object or url Resource.
   * @param {string} options.accessToken - mapbox style accessToken.
   * @param {RequestTransformFunction} options.transformRequest - use transformRequest to modify tile requests.
   * @param {Function} [options.sourceFilter] - sourceFilter is used to filter which source participate in pickFeature process.
   * @param {Number} [options.maximumLevel] - if cesium zoom level exceeds maximumLevel, layer will be invisible.
   * @param {Number} [options.minimumLevel] - if cesium zoom level belows minimumLevel, layer will be invisible.
   * @param {Number} [options.tileSize=512] - can be 256 or 512.
   * @param {Boolean} [options.enablePickFeatures = true] - enable pickFeatures or not, defaults to true.
   * @param {Cesium.WebMercatorTilingScheme | Cesium.GeographicTilingScheme} [options.tilingScheme = Cesium.WebMercatorTilingScheme] - Cesium tilingScheme, defaults to WebMercatorTilingScheme(EPSG: 3857).
   * @param {Boolean} [options.hasAlphaChannel] -
   * @param {Credit} options.credit - A credit contains data pertaining to how to display attributions/credits for certain content on the screen.
   * @example
   * const imageryProvider = new MVTImageryProvider({
        style: 'https://demotiles.maplibre.org/style.json',
        accessToken: MAPBOX_TOKEN,
        transformRequest: function(url, resourceType) {
          if (resourceType === 'Source' && url.indexOf('http://myHost') > -1) {
            return {
              url: url.replace('http', 'https'),
              headers: { 'my-custom-header': true },
              credentials: 'include'  // Include cookies for cross-origin requests
            }
          }
        }
      });
   */
  constructor(options) {
    this.tilingScheme = options.tilingScheme ? options.tilingScheme : new Cesium.WebMercatorTilingScheme();
    this.rectangle = this.tilingScheme.rectangle;
    this.tileSize = this.tileWidth = this.tileHeight = options.tileSize || 512;
    this.maximumLevel = options.maximumLevel || Number.MAX_SAFE_INTEGER;
    this.minimumLevel = options.minimumLevel || 0;
    this.tileDiscardPolicy = undefined;
    this.enablePickFeatures = options.enablePickFeatures ? options.enablePickFeatures : true
    this.errorEvent = new Cesium.Event();
    this.credit = new Cesium.Credit(options.credit || "", false);
    this.proxy = new Cesium.DefaultProxy("");
    this.hasAlphaChannel =
      options.hasAlphaChannel !== undefined ? options.hasAlphaChannel : true;
    this.sourceFilter = options.sourceFilter;
    this.ready = false;

    this._accessToken = options.accessToken;
    this.readyPromise = this._preLoad(options.style).then(style => {
      this._style = style
      this.mapboxRenderer = new Mapbox.BasicRenderer({
        style,
        token: this._accessToken,
        transformRequest: options.transformRequest
      })
      return this.mapboxRenderer
    }).then(renderObj => {
      renderObj._style.loadedPromise.then(() => {
        this.ready = true
      });
    })
  }

  _preLoad(data) {
    let promise = data
    if (typeof data === 'string') {
      data = new Cesium.Resource({
        url: data,
        queryParameters: {
          access_token: this._accessToken
        }
      })
    }
    if (data instanceof Cesium.Resource) {
      const prefix = "https://api.mapbox.com/";
      if (data.url.startsWith("mapbox://"))
        data.url = data.url.replace("mapbox://", prefix);
      if(this._accessToken)
        data.appendQueryParameters({
          access_token: this._accessToken
        })
      promise = data.fetchJson()
    }
    return Promise.resolve(promise)
      .catch( error => {
        this.errorEvent.raiseEvent(error);
        throw error;
      });
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
    const maxX = this.tilingScheme.getNumberOfXTilesAtLevel(zoom) - 1
    const maxY = this.tilingScheme.getNumberOfYTilesAtLevel(zoom) - 1
    for (let xx = -1; xx <= 1; xx++) {
      let newx = x + xx
      if (newx < 0) newx = maxX
      if (newx > maxX) newx = 0
      for (let yy = -1; yy <= 1; yy++) {
        let newy = y + yy
        if (newy < 0 || newy > maxY) continue
        ret.push({
          source,
          z: zoom,
          x: newx,
          y: newy,
          left: 0 + xx * TILE_SIZE,
          top: 0 + yy * TILE_SIZE,
          size: TILE_SIZE
        });
      }
    }
    return ret;
  }

  requestImage(x, y, zoom, releaseTile = true) {
    if (zoom > this.maximumLevel || zoom < this.minimumLevel)
      return Promise.reject(undefined);

    this.mapboxRenderer.filterForZoom(zoom);
    const tilesSpec = this.mapboxRenderer
      .getVisibleSources()
      .reduce((a, s) => a.concat(this._getTilesSpec({ x, y, zoom }, s)), [])

    return new Promise((resolve, reject) => {
      const canv = this.createTile();
      const ctx = canv.getContext("2d")
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
    if (!this.enablePickFeatures) return undefined
    
    return this.requestImage(x, y, zoom, false).then((renderRef) => {
      let targetSources = this.mapboxRenderer.getVisibleSources();
      targetSources = this.sourceFilter
        ? this.sourceFilter(targetSources)
        : targetSources;

      const queryResult = [];

      const lng = Cesium.Math.toDegrees(longitude);
      const lat = Cesium.Math.toDegrees(latitude);

      targetSources.forEach((s) => {
        const featureInfo = new Cesium.ImageryLayerFeatureInfo()
        featureInfo.data = this.mapboxRenderer.queryRenderedFeatures({
          source: s,
          renderedZoom: zoom,
          lng,
          lat,
          tileZ: zoom,
        })
        const name = Object.keys(featureInfo.data)[0]
        featureInfo.name = name
        const properties = featureInfo.data[name]
        featureInfo.configureDescriptionFromProperties(properties.length === 1 ? properties[0] : properties)
        queryResult.push(featureInfo);
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
