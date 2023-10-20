import createCone from "./static/createCone";
import coneShader from "./static/shaders/coneShader";
import vornoiShader from "./static/shaders/columnSumShader";
import computeShader from "./static/shaders/computeShader";
import computeShader2 from "./static/shaders/computeRowSumShader";
import stencilShader from "./static/shaders/stencilShader";
import { arc } from "d3-shape";
import getPoints from "./static/getPoints";
import earcut from "earcut";

//TO DO: Manually impliment stencil testing:
//plan: render the stencil to a red texture. make it avaiblale to the voroni pipeline, through a bind group, and only render from the frament shader
//if the stencil texture value is 1 (or 0 ?) at that location

const main = async () => {

  const ringHeight = 700;
  const pathData = {
      startAngle: 0,
      endAngle: (300 * Math.PI) / 180,
      innerRadius: 100,
      outerRadius: ringHeight / 2,
    },
    path = arc()(pathData) || "",
    num_points = 100,
    points = getPoints(num_points, path),
    centroi =  arc().centroid(pathData)
    const numData = 1000,
    clearValue = numData + 1;
  //seed the vornoi cell sites
  const coords: number[] = [];
  for (let i = 0; i < numData; ++i) {
    const { startAngle, endAngle, innerRadius, outerRadius } = pathData;
    const randomClampedR =
        Math.random() * (outerRadius - innerRadius) + innerRadius,
      randomClampedTheta =
        Math.random() * (endAngle - startAngle) + startAngle - Math.PI / 2,
      x = Math.cos(randomClampedTheta) * randomClampedR,
      y = Math.sin(randomClampedTheta) * randomClampedR;
    coords.push(x / 512, y / 512);
  }
  const ears = earcut(points), //<--returns the indexes of the x coordinates of the triangle vertices in the points array
    //fetch the coordiantes of the triangle vertices from the points array
    stencilVerticies = ears.reduce<number[]>((acc, index) => { 
      const i = index * 2;
      return [...acc, points[i]! / 512, points[i + 1]! / 512];
    }, []),
    stencilArray = new Float32Array(stencilVerticies);
  const canvas = document.querySelector("canvas");
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter && canvas) {
   
    //@ts-ignore
    const ctx = canvas.getContext("webgpu") as GPUCanvasContext;
    const device = await adapter.requestDevice();
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    if (ctx) {
      ctx.configure({
        device: device,
        format: canvasFormat,
      });
    }
    const tex1 = device.createTexture({
      size: [ctx.canvas.width, ctx.canvas.height],
      format: "r32uint",
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING,
    });
    const tex2 = device.createTexture({
      size: [numData, ctx.canvas.height],
      format: "rgba32float",
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING,
    });
    const stencilTex = device.createTexture({
      size: [ctx.canvas.width, ctx.canvas.height],
      format: "r16uint",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    });

    //data
    const sizeData = new Uint32Array([numData]);
    const quad = new Float32Array([
      // First triangle:
      1.0, 1.0, -1.0, 1.0, -1.0, -1.0,
      // Second triangle:
      -1.0, -1.0, 1.0, -1.0, 1.0, 1.0,
    ]);
    // const offsetArray = new Float32Array(
    //   [...Array(numData * 2)].map((n, i) => {
    //     const jitter = getRandomArbitrary(-.05, .05)
    //     return i % 2 === 0 ? (centroi[0] / 512) + jitter : (centroi[1] / 512) + jitter
    //     // return n % 2 === 0 ?  : 0
    //     // return getRandomArbitrary()
    //   })
    // );
    const offsetArray = new Float32Array(coords)
    // console.log({ offsetArray });
    const colors = [];
    for (let i = 0; i < numData; i++) {
      colors.push(Math.random(), Math.random(), Math.random(), Math.random());
    }
    colors.push(0, 0, 0, 1); //<--a color for the background
    const vertexData = createCone(36);
    const indexData: number[] = [];
    for (let i = 0; i < vertexData.length; i++) {
      indexData.push(i + 1, 0, i + 2);
    }
    indexData[indexData.length - 1] = 1;

    //buffers
    const vertices = new Float32Array(vertexData);
    const indicies = new Uint32Array(indexData);
    const colorArray = new Float32Array(colors);
    const storage = new Float32Array(numData * tex1.height);
    const clearValueArray = new Float32Array([clearValue])

    const celarValueUnifromBuffer = device.createBuffer({
      label:"clear value unifrom buffer",
      size:clearValueArray.byteLength,
      usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    const offsetBuffer = device.createBuffer({
      label: "Offset Buffer",
      size: offsetArray.byteLength,
      usage:
        GPUBufferUsage.VERTEX |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC,
    });
    const vertexBuffer = device.createBuffer({
      label: "Cone buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const indexBuffer = device.createBuffer({
      label: "Cone Index Buffer",
      size: indicies.byteLength,
      usage:
        GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
    });
    const stencilBuffer = device.createBuffer({
      label: "Color buffer",
      size: stencilArray.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const colorStorage = device.createBuffer({
      label: "Color Storage buffer",
      size: colorArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const quadBuffer = device.createBuffer({
      label: "quad buffer",
      size: quad.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    const uniformBuffer = device.createBuffer({
      label: "Size Uniforms",
      size: sizeData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const stagingBuffer = device.createBuffer({
      size: offsetArray.byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(offsetBuffer, 0, offsetArray);
    device.queue.writeBuffer(uniformBuffer, 0, sizeData);
    device.queue.writeBuffer(vertexBuffer, 0, vertices);
    device.queue.writeBuffer(indexBuffer, 0, indicies);
    device.queue.writeBuffer(stencilBuffer, 0, stencilArray);
    device.queue.writeBuffer(colorStorage, 0, colorArray);
    device.queue.writeBuffer(celarValueUnifromBuffer, 0, clearValueArray)
    device.queue.writeBuffer(quadBuffer, 0, quad);

    //buffer layouts
    const vertexBufferLayout: GPUVertexBufferLayout = {
      arrayStride: 12,
      stepMode: "vertex",
      attributes: [{ format: "float32x3", offset: 0, shaderLocation: 0 }],
    };
    const offsetBufferLayout: GPUVertexBufferLayout = {
      arrayStride: 8,
      stepMode: "instance",
      attributes: [{ format: "float32x2", offset: 0, shaderLocation: 1 }],
    };
    const centroidStorageLayout: GPUVertexBufferLayout = {
      arrayStride: 8,
      stepMode: "instance",
      attributes: [{ format: "float32x2", offset: 0, shaderLocation: 3 }],
    };
    const stencilStorageLayout: GPUVertexBufferLayout = {
      arrayStride: 8,
      attributes: [{ format: "float32x2", offset: 0, shaderLocation: 0 }],
    };
    

    const quadBufferLayout: GPUVertexBufferLayout = {
      arrayStride: 8,
      attributes: [{ format: "float32x2", offset: 0, shaderLocation: 4 }],
    };

    //textures and samplers

    const depthTexture = device.createTexture({
      size: [ctx.canvas.width, ctx.canvas.height],
      format: "depth24plus",
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST,
    });

    //bind groups and pipelin
    const bindGroupLayout = device.createBindGroupLayout({
      label: "bind group layout",
      entries: [
        {
          // for a texture_2d<u32> variable in the fragment shader
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: "uint", // Texel values are unsigned integers.
            // (Yes, it's called sampleType even though you can't sample it!)
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "storage" },
        },
      ],
    });

    const coneBindGroupLayout = device.createBindGroupLayout({
      label:"cone bindgroup layout",
      entries:[
        {binding:0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType:"uint" }},
        {binding:1, visibility:GPUShaderStage.FRAGMENT, buffer:{type:"uniform"}}
      ]
    })

    const conePipelineLayout = device.createPipelineLayout({
      label:"cone pipeline layout",
      bindGroupLayouts:[coneBindGroupLayout]
    })

    let computeBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          // for a texture_2d<u32> variable in the fragment shader
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          texture: {
            sampleType: "uint", // Texel values are unsigned integers.
            // (Yes, it's called sampleType even though you can't sample it!)
          },
        },
        {
          // for a texture_storage_2d<r32uint,write> in the fragment shader
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            format: "rgba32float",
            access: "write-only", // This is the only possible value.
            viewDimension: "2d", // This is the default.
          },
        },
      ],
    });

    let computeBindGroupLayout2 = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          texture: {
            sampleType: "unfilterable-float",
          },
        },
        {
          //now we are writing to the offset buffer.
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });
    const pipelineLayout = device.createPipelineLayout({
      label: "Vornoi pipeline layout",
      bindGroupLayouts: [bindGroupLayout],
    });
    const bindGroup = device.createBindGroup({
      label: "render bind group layout",
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: tex1.createView() },
        { binding: 1, resource: { buffer: colorStorage } },
      ],
    });

    const computePipelineLayout = device.createPipelineLayout({
      label: "compute pipeline layout",
      bindGroupLayouts: [computeBindGroupLayout],
    });

    const computePipelineLayout2 = device.createPipelineLayout({
      label: "compute pipeline layout 2",
      bindGroupLayouts: [computeBindGroupLayout2],
    });

    const coneBindGroup = device.createBindGroup({
      label:"cone bind group",
      layout:coneBindGroupLayout,
      entries:[
        {binding: 0, resource: stencilTex.createView()},
        {binding: 1, resource: {buffer:celarValueUnifromBuffer}}
      ]
    })

    const computeBindGroup = device.createBindGroup({
      label: "compute bind group",
      layout: computeBindGroupLayout,
      entries: [
        { binding: 0, resource: tex1.createView() },
        { binding: 1, resource: tex2.createView() },
      ],
    });

    const computeBindGroup2 = device.createBindGroup({
      label: "compute bind group 2",
      layout: computeBindGroupLayout2,
      entries: [
        { binding: 0, resource: tex2.createView() },
        { binding: 1, resource: { buffer: offsetBuffer } },
      ],
    });

    const computeShaderModule = device.createShaderModule(computeShader);
    const computePipline = device.createComputePipeline({
      label: "compute pipeline",
      compute: {
        module: computeShaderModule,
        entryPoint: "main",
      },
      layout: computePipelineLayout,
    });

    const computeShaderModule2 = device.createShaderModule(computeShader2);
    const compute2Pipeline = device.createComputePipeline({
      label: "compute 2 pipeline",
      compute: {
        module: computeShaderModule2,
        entryPoint: "main",
      },
      layout: computePipelineLayout2,
    });

    const coneShaderModule = device.createShaderModule(coneShader);
    const conePipeline = device.createRenderPipeline({
      label: "Cone pipeline",
      layout: conePipelineLayout,
      vertex: {
        module: coneShaderModule,
        entryPoint: "vertexMain",
        buffers: [vertexBufferLayout, offsetBufferLayout],
      },
      fragment: {
        module: coneShaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: tex1.format }],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "front",
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    });
    const vornoiShaderModule = device.createShaderModule(vornoiShader);
    const vornoiPipeline = device.createRenderPipeline({
      label: "vornoi pipeline",
      layout: pipelineLayout,
      vertex: {
        module: vornoiShaderModule,
        entryPoint: "vertexMain",
        buffers: [quadBufferLayout],
      },
      fragment: {
        module: vornoiShaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: canvasFormat }],
      },
    });
    const setncilShaderModule = device.createShaderModule(stencilShader);
    const stencilPipeline = device.createRenderPipeline({
      label: 'pipeline for rendering the mask',
      layout: "auto",
      vertex: {
        module: setncilShaderModule,
        entryPoint: "vertexMain",
        buffers: [stencilStorageLayout],
      },
      fragment: {
        module: setncilShaderModule,
        entryPoint: "fragmentMain",
        targets: [stencilTex],
      }
    });

    // setInterval(render, 400)
    requestAnimationFrame(render);
    // // render!
    // render();
    // window.addEventListener("click", () => {
      // render();
      // stagingBuffer
      //   .mapAsync(
      //     GPUMapMode.READ,
      //     0, // Offset
      //     offsetArray.byteLength // Length
      //   )
      //   .then(() => {
      //     const copyArrayBuffer = stagingBuffer.getMappedRange(
      //       0,
      //       offsetArray.byteLength
      //     );
      //     const data = copyArrayBuffer.slice(0);
      //     stagingBuffer.unmap();
      //     console.log(new Float32Array(data));
      //   });
    // });

    function render() {
      const encoder = device.createCommandEncoder();
      //draw the stencil on the texture
      const stencilRenderPass = encoder.beginRenderPass({
        colorAttachments: [{
          view:stencilTex.createView(),
          loadOp: "clear",
          clearValue: [0, 0, 0, 1],
          storeOp:"store"
        }],
      });
      stencilRenderPass.setPipeline(stencilPipeline);
      stencilRenderPass.setVertexBuffer(0, stencilBuffer);
      stencilRenderPass.draw(stencilArray.length / 2);
      stencilRenderPass.end();


      const renderPass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: tex1.createView(),
            loadOp: "clear",
            clearValue: { r: clearValue, g: 0.0, b: 0.0, a: 1 }, //<-- make the clear value some shade of red that will not be assigned to cell
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: depthTexture.createView(),
          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        }
        ,
      });

      renderPass.setPipeline(conePipeline);
      renderPass.setVertexBuffer(0, vertexBuffer);
      renderPass.setVertexBuffer(1, offsetBuffer);
      renderPass.setBindGroup(0, coneBindGroup)
      renderPass.setIndexBuffer(indexBuffer, "uint32");
      renderPass.drawIndexed(indexData.length, offsetArray.length / 2);
      renderPass.end();

      const computePass = encoder.beginComputePass();
      computePass.setPipeline(computePipline);
      computePass.setBindGroup(0, computeBindGroup);
      let workgroupCountX = Math.ceil(tex1.width / 8);
      let workgroupCountY = Math.ceil(tex1.height / 8);
      computePass.dispatchWorkgroups(workgroupCountX, workgroupCountY);
      computePass.end();

      const computePass2 = encoder.beginComputePass();
      computePass2.setPipeline(compute2Pipeline);
      computePass2.setBindGroup(0, computeBindGroup2);
      console.log(tex2.width);
      let workgroup2CountX = Math.ceil(numData + 1 / 64);
      // let workgroup2CountY = Math.ceil(tex2.height / 8);
      computePass2.dispatchWorkgroups(workgroup2CountX); //the shader only needs to make one pass accross the width of the texture
      computePass2.end();

      const renderPass2 = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: ctx.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1 },
            storeOp: "store",
          },
        ]
      });
      renderPass2.setPipeline(vornoiPipeline);
      renderPass2.setBindGroup(0, bindGroup);
      renderPass2.setVertexBuffer(0, quadBuffer);
      renderPass2.draw(quad.length / 2);
      renderPass2.end();
      encoder.copyBufferToBuffer(
        offsetBuffer,
        0,
        stagingBuffer,
        0,
        offsetArray.byteLength
      );
      device.queue.submit([encoder.finish()]);
      requestAnimationFrame(render)
    }
  }
};

main();

function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
