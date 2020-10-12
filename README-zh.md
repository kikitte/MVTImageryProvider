在CesiumJS中提供矢量瓦片渲染，支持Mapbox Style Specification. 项目很简单，复杂的渲染工作由mapbox-gl-js完成，详情请见[https://github.com/landtechnologies/Mapbox-vector-tiles-basic-js-renderer].

### 如何使用

将项目克隆下来，把src里边的文件放置到合适的地方。

1. 构建ImageryProvider
   ```javascript
   let options = {
     style: Object // 样式对象，必选．
     cesiumViewer: Cesium.Viewer // Cesium Viewer实例，必选．
   }
   let provider = new ImageryProvider(options)
   ```
2. 给cesium viewer实例添加ImageryProvider实例
   ```javascript
   cesiumViewer.imageryLayer.addProvider(provider)
   ```

### 例子
提供了一个简单的例子，见cesium-webpack-example文件夹。
运行：
```shell
git clone https://github.com/kikitte/MVTImageryProvider.git
cd MVTImageryProvider/cesium-webpack-example
npm i
npm start
```

### 已知问题
1. 不支持类型为background, raster的图层。
  
### 感谢
https://github.com/landtechnologies/Mapbox-vector-tiles-basic-js-renderer