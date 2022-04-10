在CesiumJS中提供矢量瓦片渲染，支持Mapbox Style Specification. 项目很简单，复杂的渲染工作由mapbox-gl-js完成，详情请见[Mapbox-vector-tiles-basic-js-renderer](https://github.com/landtechnologies/Mapbox-vector-tiles-basic-js-renderer).

### 如何使用

将项目克隆下来，把src里边的文件放置到合适的地方。

1. 构建ImageryProvider
   ```javascript
   let options = {
     style: Object // 样式对象，必选．
   }
   let provider = new ImageryProvider(options)
   ```
   
2. 给cesium viewer实例添加ImageryProvider实例
   ```javascript
   cesiumViewer.imageryLayer.addProvider(provider)
   ```
   
3. 不使用时销毁provider

   ```javascript
   provider.destroy()
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

### 截图

![Screenshot_20201012_172140](screenshots/Screenshot_20201012_172140.png)

![Screenshot_20201012_172222](screenshots/Screenshot_20201012_172222.png)



### 已知问题
1. 不支持类型为background, raster的图层。

2. WARNING: Too many active WebGL contexts. Oldest context will be lost

   Chrome浏览器支持的webgl context数量最多为16个,每MVTImageryProvider实例会创建一个webgl context用于渲染。如果过多MVTImageryProvider实例被创建，以上警告将会出现并导致Cesium渲染错误。所以**首先移除没有使用的provider并且确保webgl context总数量没有超过浏览器限制**。

### 感谢
https://github.com/landtechnologies/Mapbox-vector-tiles-basic-js-renderer