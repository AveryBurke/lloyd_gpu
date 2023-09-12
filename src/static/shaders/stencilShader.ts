export default {
    label: "stencil mask shader",
    code: `
    // @builtin(position) position = pos;
      @vertex
      fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f{
          return vec4f(pos.x, -pos.y, 0, 1);
      }
      
      //the stencil textrue is formatted 'stencil 8uint' I don't know why the fragment shader can output a vec4f
      @fragment
      fn fragmentMain(@builtin(position) position : vec4f) -> @location(0) vec4u {
          return vec4u(1, 0, 0, 1);
      }
  `,
  };