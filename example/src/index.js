import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import MVTImageryProvider from "cesium-mvtimageryprovider";
import maplibreStyle from "./styles/maplibre";
import mapboxBasicV8Style from './styles/mapbox-basic-v8'

Cesium.Ion.defaultServer = "";
const cesiumViewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: undefined,
  imageryProvider: new Cesium.GridImageryProvider(),
});

/**
 * Example 1: use existing style object
 */
const provider = new MVTImageryProvider({
  style: maplibreStyle,
  requestTransformFn: (url) => {
    console.log('request tile at: ' + url);
    return {url: url, headers: {'Accept-Language': 'zh-cn'}, credentials: ''};
  }
});
provider.readyPromise.then(() => {
  cesiumViewer.imageryLayers.addImageryProvider(provider);
});

/**
 * Example 2: fetch online style object from the Internet
 */

// fetch("https://api.maptiler.com/maps/basic/style.json?key=pSHUA9sSkNny3iqoWG4P")
//   .then((res) => res.json())
//   .then((style) => {
//     const provider = new MVTImageryProvider({
//       style,
//     });
//     provider.readyPromise.then(() => {
//       cesiumViewer.imageryLayers.addImageryProvider(provider);
//     });
//   });

/**
 * Example 3: use mapbox official style with access token
 */
// const provider = new MVTImageryProvider({
//   style: mapboxBasicV8Style,
//   mapboxAccessToken: 'pk.eyJ1Ijoia2lraXR0ZWxlZSIsImEiOiJja254eDZ5MGUwdmZvMndveTM2ZGlxY202In0.QTDE0VZFKtcWic6eY1q_jA'
// });
// provider.readyPromise.then(() => {
//   cesiumViewer.imageryLayers.addImageryProvider(provider);
// });