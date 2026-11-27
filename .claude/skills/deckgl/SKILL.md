---
name: deckgl
description: Build interactive, GPU-rendered maps and large-data visualisations with deck.gl (vis.gl), alone or over a MapLibre basemap. Use whenever a page, artifact, dashboard or notebook needs a map with many points, polygons, flows, heatmaps, hexbins, 3D columns or raster tiles; when the user mentions deck.gl, kepler-style maps, WebGL maps, or plotting thousands to millions of geographic features; or when Leaflet would be too slow. Gives tested CDN versions, two starter templates, a layer cheat-sheet and the common pitfalls.
---

# deck.gl

deck.gl draws data as GPU layers. Each layer takes `data` (an array, a URL, or binary attributes) plus accessor functions (`getPosition`, `getFillColor`...). A `Deck` instance holds the view state and the list of layers.

## Tested versions (rendered in headless Chromium on 27 Nov 2026)

```html
<script src="https://cdn.jsdelivr.net/npm/deck.gl@9.4.1/dist.min.js"></script>
<!-- Only if you want a basemap: -->
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.1/dist/maplibre-gl.js"></script>
<link href="https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.1/dist/maplibre-gl.css" rel="stylesheet">
```

- The `deck.gl` bundle exposes everything on the global `deck` (`deck.Deck`, `deck.ScatterplotLayer`, `deck.MapboxOverlay`...), including the aggregation layers (heatmap, hexagon, grid) and the geo layers.
- **MapLibre 6 ships ES modules only** (no `dist/maplibre-gl.js`), so with plain `<script>` tags use MapLibre 5.x. With a bundler or `import`, MapLibre 6 is fine.
- Pin exact versions; never `@latest`. Before upgrading, check the new version is a couple of weeks old.
- Free basemap styles that need no key: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` (light), `.../dark-matter-gl-style/style.json` (dark). Keep the attribution MapLibre adds.

## Template A: layers over a basemap (most maps)

```html
<div id="map" style="position:absolute;inset:0"></div>
<script>
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  center: [69.3, 30.4], zoom: 4.3            // [longitude, latitude]
});
const overlay = new deck.MapboxOverlay({
  interleaved: true,                         // deck layers draw between map layers (labels stay on top)
  layers: [
    new deck.ScatterplotLayer({
      id: 'cities',
      data: [{name: 'Karachi', c: [67.01, 24.86], v: 20}],
      getPosition: d => d.c,
      getRadius: d => d.v * 3000,            // metres by default (radiusUnits: 'meters')
      radiusMinPixels: 3,
      getFillColor: [184, 67, 58, 200],      // RGBA 0–255
      pickable: true
    })
  ],
  getTooltip: ({object}) => object && object.name
});
map.addControl(overlay);
// Later, to change data or styling: overlay.setProps({layers: [...new layers]});
</script>
```

## Template B: deck.gl alone (no basemap; fastest, no network tiles)

```html
<script>
new deck.Deck({
  initialViewState: {longitude: 69.3, latitude: 28, zoom: 4.5, pitch: 0, bearing: 0},
  controller: true,                          // pan, zoom, rotate
  layers: [
    new deck.GeoJsonLayer({
      id: 'districts', data: 'districts.geojson',   // a URL is fetched and parsed for you
      filled: true, stroked: true,
      getFillColor: f => colourFor(f.properties.value),
      getLineColor: [255, 255, 255], lineWidthMinPixels: 1,
      pickable: true,
      updateTriggers: {getFillColor: [currentVariable]}   // REQUIRED when an accessor's logic changes
    })
  ],
  getTooltip: ({object}) => object && `${object.properties.name}: ${object.properties.value}`
});
</script>
```

`new deck.Deck` creates its own full-window canvas; pass `parent: element` (or `canvas`) to place it inside a container.

## Layer cheat-sheet

| Need | Layer | Key props |
|---|---|---|
| Points sized/coloured by value | `ScatterplotLayer` | `getPosition`, `getRadius`, `radiusUnits`, `radiusMinPixels`, `getFillColor`, `stroked`, `getLineColor` |
| Polygons, lines, points from GeoJSON | `GeoJsonLayer` | `data` (FeatureCollection or URL), `getFillColor`, `getLineColor`, `extruded` + `getElevation` for 3D |
| Density surface | `HeatmapLayer` | `getPosition`, `getWeight`, `radiusPixels`, `intensity`, `threshold` |
| Hexbin aggregation | `HexagonLayer` | `getPosition`, `radius` (metres), `extruded`, `elevationScale`, `colorRange` |
| Square-grid aggregation | `GridLayer` / `ScreenGridLayer` | `cellSize` / `cellSizePixels` |
| Flows origin → destination | `ArcLayer` | `getSourcePosition`, `getTargetPosition`, `getSourceColor`, `getTargetColor`, `getWidth` |
| Routes, rivers, tracks | `PathLayer` | `getPath` (array of [lng, lat]), `getWidth`, `widthMinPixels` |
| Filled polygons from arrays | `PolygonLayer` / `SolidPolygonLayer` | `getPolygon`, `extruded`, `getElevation` |
| 3D bars at points | `ColumnLayer` | `getPosition`, `getElevation`, `radius`, `diskResolution` |
| Labels | `TextLayer` | `getText`, `getPosition`, `getSize`, `getColor`, `characterSet` for non-Latin text |
| Icons | `IconLayer` | `iconAtlas` + `iconMapping`, or `getIcon` returning `{url, width, height}` |
| One georeferenced image (a raster you exported) | `BitmapLayer` | `image`, `bounds: [west, south, east, north]` |
| Tiled data or rasters (XYZ) | `TileLayer` (+ `renderSubLayers` returning a `BitmapLayer`) | `data: 'https://.../{z}/{x}/{y}.png'`, `minZoom`, `maxZoom` |
| H3 cells | `H3HexagonLayer` | `getHexagon` (H3 index strings). If it throws about h3, load the `h3-js` script before deck.gl |

## Patterns that come up often

- **Choropleth colours:** compute breaks in JS (quantiles or fixed), map value → RGBA in `getFillColor`, and add `updateTriggers` with whatever variable the colour depends on. Draw the legend in HTML; deck.gl has none built in.
- **Filtering without rebuilding data:** `DataFilterExtension` (`extensions: [new deck.DataFilterExtension({filterSize: 1})]`, `getFilterValue`, `filterRange`) filters on the GPU.
- **Highlight on hover:** `pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 120]`.
- **Click handling:** `onClick: ({object, coordinate}) => ...` on a layer or on the Deck.
- **Fit to data:** `new deck.WebMercatorViewport({width, height}).fitBounds([[w, s], [e, n]], {padding: 40})` returns `{longitude, latitude, zoom}`.
- **Animation:** keep data fixed, change a uniform-like prop (`currentTime` on `TripsLayer`, or `filterRange`) and call `deck.setProps({layers})` each frame.
- **Big data:** pass a URL (deck.gl loads it off the main thread), prefer flat arrays or binary attributes (`data: {length, attributes: {getPosition: {value: Float32Array, size: 2}}}`) over arrays of objects past ~1M rows, and set `pickable` only on layers that need tooltips.

## Pitfalls

1. **Coordinates are `[longitude, latitude]`**, not lat/lng. Swapped coordinates put Pakistan in the Indian Ocean.
2. **Changing an accessor's logic does nothing without `updateTriggers`** (deck.gl compares data by reference). Give the layer new `data` or list the dependency in `updateTriggers`.
3. **Every layer needs a stable, unique `id`**; reusing ids across different layers causes state to leak between them.
4. **Radii and widths default to metres**: a radius of 5 is invisible at country zoom. Use `radiusMinPixels`/`widthMinPixels` or `radiusUnits: 'pixels'`.
5. **Tooltips need `pickable: true`** on the layer.
6. **Colours are 0–255 arrays** (`[r, g, b, a]`), not CSS strings. Convert hex first.
7. **With MapLibre, add the overlay with `map.addControl(overlay)`**; do not create a separate `Deck` on top, or the two cameras drift.
8. **Headless screenshots** need WebGL: in Playwright/Chromium launch with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. Debug-level luma.gl messages about uniform blocks under SwiftShader are harmless.
9. **Accessibility:** a canvas is invisible to screen readers. Put the key numbers and the legend in HTML next to the map.

## Python and notebooks

`pydeck` wraps the same layers for Jupyter and Streamlit (`pip install pydeck`; `pdk.Deck(layers=[pdk.Layer("ScatterplotLayer", df, get_position=["lon", "lat"], ...)]).to_html("map.html")`). Layer names and props are the same, written in snake_case.

## Reference

- Docs and layer catalogue: https://deck.gl/docs/api-reference/layers
- Examples gallery: https://deck.gl/examples
- Source: https://github.com/visgl/deck.gl (MIT licence)
