## Lloyd's algorith, but in the GPU
this is [Lloyd's algorithm](https://en.wikipedia.org/wiki/Lloyd%27s_algorithm) implimented with [WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API). The implimentation is similar to the one used in the [Swingline Voronoi Stippling Library](https://www.mattkeeter.com/projects/swingline/). More explanation to come.

# dependencies
The project is built with TypeScript, [Webpack](https://webpack.js.org/) and [Yarn](https://yarnpkg.com/). You will also need a [browser that supports WebGpu](https://caniuse.com/webgpu)

# usage
To run this project locally use `yarn develop` and then visit `http://localhost:4000/`.