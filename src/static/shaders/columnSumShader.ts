export default {
  label: "column shader",
  code: `
  
    @group(0) @binding(0) var red_tex: texture_2d<u32>;
    @group(0) @binding(1) var<storage, read_write> color: array<vec4f>;

    @vertex
    fn vertexMain(@location(4) pos: vec2f) -> @builtin(position) vec4f{
        return vec4f(pos.xy, 0, 1);
    }
    
    @fragment
    fn fragmentMain(@builtin(position) position : vec4f) -> @location(0) vec4f {
        let cell = vec2u(position.xy);
        let id = textureLoad( red_tex, cell, 0).r;
        return color[id];
    }
`,
};
