export default function createCone(edges: number) {
    const vertices = new Array();
    vertices[0] = 0;
    vertices[1] = 0;
    vertices[2] = 0;
    for (let i = 0; i <= edges; i++) {
        const angle = 2 * Math.PI * i / edges;
        vertices[i * 3 + 3] = Math.cos(angle);
        vertices[i * 3 + 4] = Math.sin(angle);
        vertices[i * 3 + 5] = 1;
    }
    return vertices;
}