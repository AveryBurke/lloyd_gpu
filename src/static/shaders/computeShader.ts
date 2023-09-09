export default {
  label: "Column shader",
  code: `

    @group(0) @binding(0) var red_tex : texture_2d<u32>;
    @group(0) @binding(1) var nextGen : texture_storage_2d< rgba32float, write>;
    
    @compute @workgroup_size(8,8)
    fn main( @builtin(global_invocation_id) id: vec3u) {
        let tex_size = textureDimensions(red_tex);
        var res = vec4f(0, 0, 0, 1);
        let cell = id.xy; // Row and column for the cell that is being processed.
        let my_column = id.x;

        for (var x : u32 = 0; x < tex_size.x; x++){
          var coord = vec2u(x, id.y);
          let r = textureLoad(red_tex, coord, 0).r;
          if (my_column == r){
            res.x += f32(coord.x) + .5;
            res.y += f32(coord.y) + .5;
            res.z += 1;
          }
        }
        res.x /= f32(tex_size.x);
        res.y /= f32(tex_size.y);

        textureStore( nextGen, vec2u(my_column, cell.y),  res);
    }
  `,
};
