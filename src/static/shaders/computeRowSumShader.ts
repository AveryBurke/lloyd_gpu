export default {
    label: "Column shader",
    code: `
  
    @group(0) @binding(0) var column_tex : texture_2d<f32>;
    @group(0) @binding(1) var<storage, read_write> cellStateOut: array<vec2f>;

    @compute @workgroup_size(64)
    fn main( @builtin(global_invocation_id) id: vec3u) {
        let tex_size = textureDimensions(column_tex);
        var pos = vec2f(0);
        var count : f32 = 0;
        for (var y : u32 = 0; y < tex_size.y; y++ ){
            var coord = vec2u(id.x, y);
            var color = textureLoad(column_tex, coord, 0);
            pos.x += color.x;
            pos.y += color.y;
            count += color.z;
        }
        /* 
         * these coordinates are normalized betwen 0 and 1 by the previous shader. 
         * but they're being put into a storage buffer for use by a vertex shader
         * so they need to be re-normalized to vertex coords (between -1 and 1)
         */
        if (count > 0){
            cellStateOut[id.x] = (pos.xy / count) * 2 - 1; 
        }
               
    }
    `,
};