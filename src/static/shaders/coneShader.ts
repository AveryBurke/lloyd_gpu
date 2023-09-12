export default {
  label: "Cone shader",
  code: `

  @group(0) @binding(0) var stencil_tex : texture_2d<u32>;
  @group(0) @binding(1) var<uniform> clearValue : u32;

  struct thisOutput {
    @builtin(position) position: vec4f,
    @location(0) @interpolate(flat) id: u32,
  };

  @vertex
  fn vertexMain(@location(0) pos: vec3f, @location(1) offset: vec2f, @builtin(instance_index) instance: u32) ->
    thisOutput {
      var vsOutput: thisOutput;
      vsOutput.position = vec4f(pos.xy + vec2(offset.x, -offset.y), pos.z , 1);
      vsOutput.id = instance;
      return vsOutput;
  }
  
  @fragment
  fn fragmentMain(fsInput: thisOutput) -> @location(0) vec4<u32>{
    let texelValue : vec4u = textureLoad( stencil_tex, vec2u(fsInput.position.xy), 0); 
    if (texelValue.x > 0){
      return vec4<u32>(fsInput.id, 0, 0, 1);
    }
    return vec4<u32>(clearValue, 0, 0, 1);
  }
`,
};
