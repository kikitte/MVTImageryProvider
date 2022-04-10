Render Mapbox style in CesiumJs. This project is very simple, because the complex rendering task is compeleted by mapbox-gl-js, you should also check [Mapbox-vector-tiles-basic-js-renderer](https://github.com/landtechnologies/Mapbox-vector-tiles-basic-js-renderer) for more detail.

[中文README](README-zh.md)

### How to use

Clone the project and then place the file in src to appropriate folder.

1. construct ImageryProvider instance
   ```javascript
   let options = {
     style: Object // Mapbox Style Object, required.
   }
   let provider = new ImageryProvider(options)
   ```
   
2. add ImageryProvider instance to Cesium Viewer 
   ```javascript
   cesiumViewer.imageryLayer.addProvider(provider)
   ```
   
3. destroy provider if not in used

   ```javascript
   provider.destroy()
   ```

### Example

There is an simple example, see example folder.
run：
```shell
git clone https://github.com/kikitte/MVTImageryProvider.git
cd MVTImageryProvider/example
npm i
npm start
```

### Screenshots

![Screenshot_20201012_172140](screenshots/Screenshot_20201012_172140.png)

![Screenshot_20201012_172222](screenshots/Screenshot_20201012_172222.png)

### Known Issue

1. raster layer & background layer are not supported yet.

2. WARNING: Too many active WebGL contexts. Oldest context will be lost

   The maximum number of webgl context is 16 in chrome, and each MVTImageryProvider has its own webgl context for rendering. If too many MVTImageryProvider instance is created, the above warning may be raised and errors will occure in cesiumjs. So **destroy the unused provider first**, **ensure that the total webgl context number not exceeds the limitation of your browser**.

### Credit

https://github.com/landtechnologies/Mapbox-vector-tiles-basic-js-renderer
