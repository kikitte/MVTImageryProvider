import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import MVTImageryProvider from "cesium-mvtimageryprovider";
import { exampleStyle } from "./example-style";

Cesium.Ion.defaultServer = "";
const cesiumViewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: undefined,
  imageryProvider: new Cesium.GridImageryProvider(),
});

/**
 * Example 1:
 */
const provider = new MVTImageryProvider({
  style: exampleStyle,
});
provider.readyPromise.then(() => {
  cesiumViewer.imageryLayers.addImageryProvider(provider);
});

/**
 * Example 2:
 */

/* const provider2 = new MVTImageryProvider({
  style: 'https://demotiles.maplibre.org/style.json',
}); 
provider2.readyPromise.then(() => {
  cesiumViewer.imageryLayers.addImageryProvider(provider2);
}); */
